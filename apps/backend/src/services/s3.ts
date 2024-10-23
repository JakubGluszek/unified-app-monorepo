import { _Object, GetObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StatusCode } from 'hono/utils/http-status';
import { err, ok, ResultAsync } from 'neverthrow';
import { createError } from '../errors/s3';
import { getRedisClient, redisPool } from '../redis-client';
import { log } from '../utils/logger';

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Generate a signed URL for a specified S3 object
export const generateSignedUrl = async (key: string, expiresIn: number = 60) => {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
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
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key
      })
    ),
    () => createError('NotFound')
  );

export const listObjects = async (prefix: string, depth: number = 4) => {
  const redisClient = await getRedisClient();
  const cacheKey = `s3-${prefix}-${depth}`;

  // Check if cached data exists
  const cachedData: string | null = await redisClient.get(cacheKey);
  if (cachedData) {
    log({ log: `Cache: Using existing cache key "${cacheKey}"` });
    return ok(JSON.parse(cachedData) as _Object[]);
  }

  // Fetch from S3 if no cache
  const result = await ResultAsync.fromPromise(
    s3Client.send(
      new ListObjectsV2Command({
        Bucket: process.env.S3_BUCKET_NAME!,
        Prefix: prefix
      })
    ),
    () => createError('Internal')
  );

  if (result.isErr()) {
    log({ error: result.error });
    return result;
  }

  if (!result.value.Contents) {
    const error = { message: 'No contents found', status: 500 as StatusCode };
    log({ error });
    return err(error);
  }

  // Filter objects based on depth
  const filteredObjects = result.value.Contents.filter(({ Key }) => {
    if (!Key) return false;

    // Count the depth (i.e., how many '/' delimiters the key contains)
    const keyDepth = Key.split('/').length - 1;

    // Only include items within the specified depth
    return keyDepth <= depth && !Key.includes('unpacked/');
  });

  // Cache the result for 1 hour
  await redisClient.setex(cacheKey, 3600, JSON.stringify(filteredObjects));
  log({ log: `Cache: Creating a new cache key "${cacheKey}"` });

  await redisPool.release(redisClient);
  return ok(filteredObjects);
};
