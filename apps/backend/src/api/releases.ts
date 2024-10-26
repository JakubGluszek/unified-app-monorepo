import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { listObjects } from '../services/s3';
import { parseReleasesFromS3Objects, parseReleaseFromS3Objects } from '../utils/s3';
import { getRedisClient, redisPool } from '../utils/redis-client';
import logger from '../utils/logger';

const releases = new Hono()
  .get('/', async (c) => {
    const result = await listObjects({ prefix: 'download/releases/', exclude: ['unpacked/'] });
    if (result.isErr())
      throw new HTTPException(result.error.status, { message: result.error.message });

    const releases = parseReleasesFromS3Objects(result.value);

    return c.json({
      releases: releases.sort((a, b) => (a.timestamp! > b.timestamp! ? 1 : -1)),
      total: releases.length
    });
  })
  .get('/latest', async (c) => {
    const result = await listObjects({ prefix: 'download/releases/', exclude: ['unpacked/'] });
    if (result.isErr())
      throw new HTTPException(result.error.status, { message: result.error.message });

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
      if (result.isErr())
        throw new HTTPException(result.error.status, { message: result.error.message });

      const release = parseReleaseFromS3Objects(result.value);
      return c.json(release);
    }
  );

// Currently (and ideally) only accessible via the Github workflow
// Is to be requested after successfully releasing a new version of the desktop app
releases.post('/clear-cache', async (c) => {
  const token = c.req.header('Authorization');

  if (!token || token !== `Bearer ${process.env.AUTH_SECRET_ACCESS_KEY}`)
    throw new HTTPException(401);

  const redisClient = await getRedisClient();

  const pattern = 's3-download/releases*';
  const keys = await redisClient.keys(pattern);

  if (keys.length > 0) {
    // Delete all matching keys
    const deleteResults = await Promise.all(keys.map((key) => redisClient.del(key)));
    logger.info('Releases cache cleared', { pattern, entries: deleteResults.length });
  }
  // Release client back to pool
  redisPool.release(redisClient);

  return c.text('Success', 200);
});

export default releases;
