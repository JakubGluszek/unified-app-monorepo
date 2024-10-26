import { type _Object, GetObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { type StatusCode } from 'hono/utils/http-status';
import { err, ok, ResultAsync } from 'neverthrow';
import { createS3Error } from '../errors/s3';
import { getRedisClient, redisPool } from '../utils/redis-client';
import logger from '../utils/logger';

const s3Client = new S3Client({
  region: Bun.env.AWS_REGION,
  credentials: {
    accessKeyId: Bun.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: Bun.env.AWS_SECRET_ACCESS_KEY
  }
});

// Generate a signed URL for a specified S3 object
export const generateSignedUrl = async (key: string, expiresIn: number = 60) => {
  const command = new GetObjectCommand({
    Bucket: Bun.env.S3_BUCKET_NAME!,
    Key: key
  });

  // Generate the signed URL
  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
  return signedUrl;
};

export const getObject = (key: string) =>
  ResultAsync.fromPromise(
    s3Client.send(
      new GetObjectCommand({
        Bucket: Bun.env.S3_BUCKET_NAME,
        Key: key
      })
    ),
    () => createS3Error('NotFound')
  );

/**
 * Retrieves S3 objects metadata by their prefix, filters by specified depth and excluded paths
 * exclude: string[] - Filter out objects which keys include any given string, e.g. ['unpacked/'] */
export const listObjects = async ({
  prefix,
  depth = 4,
  exclude = []
}: {
  prefix: string;
  depth?: number;
  exclude?: string[];
}) => {
  const redisClient = await getRedisClient();
  const cacheKey = `s3-${prefix}-${depth}`;

  // Check if cached data exists
  const cachedData: string | null = await redisClient.get(cacheKey);
  if (cachedData) {
    logger.debug('Cache: Retrieving cache for listing objects', { cacheKey });
    // Release redis client
    await redisPool.release(redisClient);
    return ok(JSON.parse(cachedData) as _Object[]);
  }

  // Fetch from S3 if no cache
  const result = await ResultAsync.fromPromise(
    s3Client.send(
      new ListObjectsV2Command({
        Bucket: Bun.env.S3_BUCKET_NAME,
        Prefix: prefix
      })
    ),
    () => createS3Error('Internal')
  );

  if (result.isErr()) {
    logger.error(result.error.message);
    return result;
  }

  if (!result.value.Contents) {
    const error = { message: 'No contents found', status: 500 as StatusCode };
    logger.error(error.message);
    return err(error);
  }

  // Filter objects based on depth and key filter
  const filteredObjects = result.value.Contents.filter(({ Key }) => {
    if (!Key) return false;
    const keyDepth = Key.split('/').length - 1;
    return keyDepth <= depth && !exclude.some((path) => Key.includes(path));
  });

  // Cache the result for 1 hour
  await redisClient.setex(cacheKey, 3600, JSON.stringify(filteredObjects));
  logger.info('Creating a new cache key', { cacheKey });

  await redisPool.release(redisClient);
  return ok(filteredObjects);
};
