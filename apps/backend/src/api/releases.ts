import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';

import { listObjects } from '../services/s3';
import { parseReleasesFromS3Objects, parseReleaseFromS3Objects } from '../utils/s3';
import logger from '../helpers/logger';
import { RedisClient } from '../lib/redis/client';
import { type Variables } from '../types/context';

const releases = new Hono<{ Variables: Variables }>()
  .get('/', async (c) => {
    const result = await listObjects({ prefix: 'download/releases/', exclude: ['unpacked/'] });
    // Handle error
    if (result.isErr()) {
      logger.error('Failed to fetch all releases', {
        error: result.error,
        requestId: c.get('requestId')
      });
      throw new HTTPException(500, result.error);
    }

    const releases = parseReleasesFromS3Objects(result.value);

    return c.json({
      releases: releases.sort((a, b) => (a.timestamp! > b.timestamp! ? 1 : -1)),
      total: releases.length
    });
  })
  .get('/latest', async (c) => {
    const result = await listObjects({ prefix: 'download/releases/', exclude: ['unpacked/'] });
    // Handle error
    if (result.isErr()) {
      logger.error('Failed to fetch latest releases', {
        error: result.error,
        requestId: c.get('requestId')
      });
      throw new HTTPException(500, result.error);
    }

    const releases = parseReleasesFromS3Objects(result.value);
    const sortedReleases = releases.sort((a, b) => (a.timestamp! > b.timestamp! ? 1 : -1));

    return c.json(sortedReleases[0], 200);
  })
  .get(
    '/:id',
    zValidator(
      'param',
      z.object({
        id: z.string().min(1)
      })
    ),
    async (c) => {
      const { id } = c.req.valid('param');

      const result = await listObjects({
        prefix: 'download/releases/' + id,
        exclude: ['unpacked/']
      });

      // Handle error
      if (result.isErr()) {
        logger.error('Failed to fetch releases by id', {
          error: result.error,
          requestId: c.get('requestId')
        });
        throw new HTTPException(500, result.error);
      }

      const release = parseReleaseFromS3Objects(result.value);
      return c.json(release);
    }
  );

// Currently (and ideally) only accessible via the Github workflow
// Is to be requested after successfully releasing a new version of the desktop app
releases.post('/clear-cache', async (c) => {
  const token = c.req.header('Authorization');

  if (!token || token !== `Bearer ${process.env.AUTH_SECRET_ACCESS_KEY}`) {
    throw new HTTPException(401);
  }

  const pattern = 's3-download/releases*';
  const keysResult = await RedisClient.withClient((client) => client.keys(pattern));

  if (keysResult.isErr()) {
    logger.error('Error fetching keys from Redis:', keysResult.error);
    throw new HTTPException(500, { message: 'Failed to clear cache' });
  }

  const keys = keysResult.value;

  if (keys.length > 0) {
    const deleteResults = await Promise.all(keys.map((key) => RedisClient.del(key)));
    const deleteErrors = deleteResults.filter((result) => result.isErr());

    if (deleteErrors.length > 0) {
      logger.error('Error deleting some keys from Redis:', deleteErrors);
      throw new HTTPException(500, { message: 'Some keys could not be deleted' });
    }

    logger.info('Releases cache cleared', { pattern, entries: keys.length });
  }

  return c.text('Success', 200);
});

export default releases;
