import { Hono } from 'hono';

import releases from './releases';
import download from './download';

export const api = new Hono()
  .route('/releases', releases)
  .route('/download', download)
  .get('/health', async (c) => {
    return c.json({ message: 'Success' }, 200);
  });

export type ApiRouter = typeof api;
