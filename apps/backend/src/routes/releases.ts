import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { stream } from 'hono/streaming';
import { createError } from '../errors/s3';
import { listObjects, getObject } from '../services/s3';
import { parseReleasesFromS3Objects, parseReleaseFromS3Objects, getContentType } from '../utils';
import { log } from '../utils/logger';

const releases = new Hono()
  .get('/', async (c) => {
    // Fetch S3 storage
    const result = await listObjects('releases/');
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
    const result = await listObjects('releases/');
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
      const result = await listObjects('releases/' + id);
      // Handle error
      if (result.isErr()) return c.json(result.error, result.error.status);
      // Parse releases
      const release = parseReleaseFromS3Objects(result.value);

      return c.json(release);
    }
  )
  .get(
    '/:id/download/:filename',
    zValidator(
      'param',
      z.object({
        id: z.string().min(1),
        filename: z.string().min(1)
      })
    ),
    async (c) => {
      const { id, filename } = c.req.valid('param');
      // Fetch S3 bucket
      const result = await getObject(`releases/${id}/${filename}`);

      // Handle error
      if (result.isErr()) {
        console.error('Error fetching object metadata:', result.error);
        return c.json(result.error, result.error.status);
      }

      const fileMetadata = result.value;
      const contentType = getContentType(filename);

      // Update headers based on file metadata
      c.header('Content-Type', contentType);
      c.header('Content-Disposition', `attachment; filename="${filename}"`);
      c.header('Content-Length', fileMetadata.ContentLength?.toString());

      // Handle HEAD requests (curl -I was causing troubles without this)
      if (c.req.method === 'HEAD') {
        return c.text('', 200);
      }

      const fileStream = fileMetadata.Body;
      if (!fileStream) {
        log({ log: `Failed to download "${filename}", file missing a body` });
        return c.json(createError('Internal'), 500);
      }

      const webStream = fileStream.transformToWebStream();

      return stream(
        c,
        async (streamController) => {
          await streamController.pipe(webStream);
        },
        async (_, streamController) => {
          // Destroy the stream
          await streamController.close();
          log({ log: `Log: Stream closed on error: ${streamController.closed}` });
        }
      );
    }
  );

export default releases;
