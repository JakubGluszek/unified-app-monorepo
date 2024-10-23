import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { trpcServer } from '@hono/trpc-server';

import { appRouter } from './trpc';
import api from './routes';

const corsOrigin = {
  dev: ['http://localhost:3000', 'http://localhost:4173', 'http://localhost:5173'],
  prod: ['https://app.unified-app.sentio.dev']
};

const app = new Hono()
  .use(
    cors({
      origin: process.env.NODE_ENV === 'production' ? corsOrigin.prod : corsOrigin.dev,
      credentials: true
    })
  )
  .use('/trpc/*', trpcServer({ router: appRouter }))
  .route('/api', api);

export default {
  fetch: app.fetch,
  port: Bun.env.PORT
};

// Graceful shutdown for clean exit (optional)
const shutdown = () => {
  console.log('Shutting down server...');
  process.exit(0);
};

process.on('SIGINT', shutdown); // Handle Ctrl+C
process.on('SIGTERM', shutdown); // Handle termination signal

export type { ApiRouter } from './routes';
export type { AppRouter } from './trpc';
