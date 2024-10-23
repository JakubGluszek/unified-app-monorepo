import { Hono } from 'hono';
import { logger } from 'hono/logger';

import releases from './releases';
import download from './download';

export const api = new Hono()
  .use('*', logger())
  .route('/releases', releases)
  .route('/download', download)
  .get('/health', async (c) => {
    return c.json({ message: 'Success' }, 200);
  });

export type ApiRouter = typeof api;
