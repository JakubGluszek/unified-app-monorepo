import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { listObjects } from '../services/s3';
import { parseReleasesFromS3Objects, parseReleaseFromS3Objects } from '../utils';
import { getRedisClient, redisPool } from '../redis-client';
import { log } from '../utils/logger';

const releases = new Hono()
  .get('/', async (c) => {
    // Fetch S3 storage
    const result = await listObjects('download/releases/');
    // Handle error
    if (result.isErr()) return c.json(result.error, result.error.status);
    // Parse releases
    const releases = parseReleasesFromS3Objects(result.value);

    return c.json({
      releases: releases.sort((a, b) => (a.timestamp! > b.timestamp! ? 1 : -1)),
      total: releases.length
    });
  })
  .get('/latest', async (c) => {
    // Fetch S3 bucket
    const result = await listObjects('download/releases/');
    // Handle error
    if (result.isErr()) return c.json(result.error, result.error.status);
    // Parse releases
    const releases = parseReleasesFromS3Objects(result.value);
    // Sort by the most recent release date
    const sortedReleases = releases.sort((a, b) => (a.timestamp! > b.timestamp! ? 1 : -1));
    // Return most recent release
    return c.json(sortedReleases[0]);
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
      // Fetch S3 bucket
      const result = await listObjects('download/releases/' + id);
      // Handle error
      if (result.isErr()) return c.json(result.error, result.error.status);
      // Parse releases
      const release = parseReleaseFromS3Objects(result.value);

      return c.json(release);
    }
  )
  .post('/clear-cache', async (c) => {
    const token = c.req.header('Authorization');
    if (!token || token !== `Bearer ${process.env.AUTH_SECRET_ACCESS_KEY}`) {
      return c.json({ message: 'Unauthorized' }, 401);
    }

    const pattern = 's3-download/releases*';

    const redisClient = await getRedisClient();
    const keys = await redisClient.keys(pattern);

    let message = 'Clearing cache';

    if (keys.length > 0) {
      // Delete all matching keys
      const deleteResults = await Promise.all(keys.map((key) => redisClient.del(key)));

      message = `Cleared ${deleteResults.length} cache entries for keys starting with "${pattern}".`;
      log({ cache: message });
    } else {
      message = `No cache keys found matching pattern "${pattern}".`;
      log({ cache: message });
    }

    redisPool.release(redisClient);

    return c.json({ message }, 200);
  });

export default releases;
