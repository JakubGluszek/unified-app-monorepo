import { Hono } from 'hono';
import { trpcServer } from '@hono/trpc-server';
import { cors } from 'hono/cors';

import { appRouter } from './api/trpc';

const corsOrigin = {
  dev: ['http://localhost:3000', 'http://localhost:4173', 'http://localhost:5173'],
  prod: ['https://app.unified-app.sentio.dev']
};

console.log('production', process.env.NODE_ENV === 'production');

const app = new Hono()
  .use(
    cors({
      origin: process.env.NODE_ENV === 'production' ? corsOrigin.prod : corsOrigin.dev,
      credentials: true
    })
  )
  .use('/trpc/*', trpcServer({ router: appRouter }));

export default {
  fetch: app.fetch,
  port: Bun.env.PORT
};
