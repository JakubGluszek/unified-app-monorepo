import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { stream } from 'hono/streaming';
import { createError } from '../errors/s3';
import { getObject } from '../services/s3';
import { getContentType } from '../utils';
import { log } from '../utils/logger';

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
    // Fetch S3 bucket
    const result = await getObject(`download/releases/${id}/${os}/${filename}`);

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

    const start = performance.now();
    return stream(
      c,
      async (streamController) => {
        // Logging
        log({ log: `Download - Started - ${filename}` });

        // Pipe the response stream
        await streamController.pipe(webStream);

        // Logging
        const end = performance.now();
        log({
          log: `Download - Finished - ${filename} `,
          duration: end - start
        });
      },
      async (_, streamController) => {
        const end = performance.now();
        log({
          log: `Download - Closing connection - ${filename} `,
          duration: end - start
        });
        // Destroy the stream
        await streamController.close();
        !streamController.closed &&
          log({ log: `Download - Error - ${filename} - Failed to close the stream controller` });
      }
    );
  }
);

export default releases;
