import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

import logger from '../helpers/logger';
import { generateSignedUrl } from '../services/s3';
import { createS3Error } from '../errors/s3';
import { type Variables } from '../types/context';
import { RedisClient } from '../lib/redis/client';

const download = new Hono<{ Variables: Variables }>().get(
  '/:id/:os/:filename',
  zValidator(
    'param',
    z.object({
      id: z.string().min(1),
      os: z.enum(['linux', 'windows', 'mac']),
      filename: z.string().min(1)
    })
  ),
  async (c) => {
    const { id, os, filename } = c.req.valid('param');
    const cacheKey = `signed-url-download/releases/${id}/${os}/${filename}`;

    // Check if the signed URL is cached
    const cacheResult = await RedisClient.get(cacheKey);
    if (cacheResult.isErr()) throw new HTTPException(500, cacheResult.error);

    if (cacheResult.value) {
      logger.debug('Cache: Retrieving a signed URL', { filename, cacheKey });
      return c.redirect(cacheResult.value);
    }
    // Generate signed URL if not cached
    const signedUrl = await generateSignedUrl(`download/releases/${id}/${os}/${filename}`);

    // Handle error
    if (!signedUrl) {
      const error = createS3Error('Internal');
      logger.error('Failed to generate a signed download URL', {
        filename,
        requestId: c.get('requestId'),
        error
      });
      throw new HTTPException(error.status, error);
    }

    await RedisClient.set(cacheKey, signedUrl, 60);
    logger.debug('Cache: Saving new entry for a signed download URL', { cacheKey });

    return c.redirect(signedUrl);
  }
);

export default download;
