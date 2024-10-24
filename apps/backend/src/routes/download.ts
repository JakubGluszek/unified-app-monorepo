import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { log } from '../utils/logger';
import { generateSignedUrl } from '../services/s3';
import { createError } from '../errors/s3';
import { getRedisClient } from '../redis-client';
import { HTTPException } from 'hono/http-exception';

const releases = new Hono().get(
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
      log({ cache: `Using existing signed URL from cache for "${filename}"` });
      return c.redirect(cachedSignedUrl);
    }

    // Generate signed URL if not cached
    const signedUrl = await generateSignedUrl(`download/releases/${id}/${os}/${filename}`);

    // Handle error
    if (!signedUrl) {
      log({ log: `Failed to generate signed URL for "${filename}"` });
      const error = createError('Internal')
      throw new HTTPException(error.status, { message: error.message })
    }

    // Cache the signed URL
    await redisClient.setex(cacheKey, 60, signedUrl);
    log({ cache: `Creating a new cache entry for signed URL "${cacheKey}"` });

    return c.redirect(signedUrl);
  }
);

export default releases;
