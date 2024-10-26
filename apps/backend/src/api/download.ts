import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import logger from '../utils/logger';
import { generateSignedUrl } from '../services/s3';
import { createS3Error } from '../errors/s3';
import { getRedisClient } from '../utils/redis-client';
import { HTTPException } from 'hono/http-exception';
import { type Variables } from '../types/context';

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
    const redisClient = await getRedisClient();
    const cacheKey = `signed-url-download/releases/${id}/${os}/${filename}`;

    // Check if the signed URL is cached
    const cachedSignedUrl: string | null = await redisClient.get(cacheKey);
    if (cachedSignedUrl) {
      logger.debug('Cache: Retrieving a signed URL', { filename, cacheKey });
      return c.redirect(cachedSignedUrl);
    }

    // Generate signed URL if not cached
    const signedUrl = await generateSignedUrl(`download/releases/${id}/${os}/${filename}`);

    // Handle error
    if (!signedUrl) {
      logger.error('Failed to generate a signed download URL', {
        filename,
        requestId: c.get('requestId')
      });
      const error = createS3Error('Internal');
      throw new HTTPException(error.status, { message: error.message });
    }

    // Cache the signed URL
    await redisClient.setex(cacheKey, 60, signedUrl);
    logger.debug('Cache: Saving new entry for a signed download URL', { cacheKey });

    return c.redirect(signedUrl);
  }
);

export default download;
