import { type _Object, GetObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { err, ok, ResultAsync } from 'neverthrow';

import { createS3Error } from '../errors/s3';
import logger from '../utils/logger';
import { RedisClient } from '../lib/redis/client';

const s3Client = new S3Client({
  region: Bun.env.AWS_REGION,
  credentials: {
    accessKeyId: Bun.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: Bun.env.AWS_SECRET_ACCESS_KEY
  }
});

// Generate a signed URL for a specified S3 object
// TODO: Wrap in neverthrow ResultAsync.fromPromise
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
  const cacheKey = `s3-${prefix}-${depth}`;

  // Check if cached data exists
  const cacheResult = await RedisClient.get(cacheKey);
  if (cacheResult.isErr()) return err(cacheResult.error);
  if (cacheResult.value) {
    logger.debug('Cache: Retrieving cache for listing objects', { cacheKey });
    return ok(JSON.parse(cacheResult.value) as _Object[]);
  }

  // Fetch from S3 if result is not cached
  const result = await ResultAsync.fromPromise(
    s3Client.send(
      new ListObjectsV2Command({
        Bucket: Bun.env.S3_BUCKET_NAME,
        Prefix: prefix
      })
    ),
    () => createS3Error('Internal')
  );

  if (result.isErr()) return err(result.error);

  if (!result.value.Contents) {
    return err(createS3Error('Internal'));
  }

  // Filter objects based on depth and key filter
  const filteredObjects = result.value.Contents.filter(({ Key }) => {
    if (!Key) return false;
    const keyDepth = Key.split('/').length - 1;
    return keyDepth <= depth && !exclude.some((path) => Key.includes(path));
  });

  // Cache the result for 1 hour
  await RedisClient.set(cacheKey, JSON.stringify(filteredObjects), 3600);
  logger.debug('Creating a new cache key', { cacheKey });

  return ok(filteredObjects);
};
