import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { trpcServer } from '@hono/trpc-server';

import { appRouter } from './trpc';
import { api } from './api';

import logger from './utils/logger';
import { httpLoggerMiddleware } from './middleware/http-logger-middleware';

const configureCors = () => {
  if (process.env.NODE_ENV === 'production')
    return ['https://unified-app.sentio.dev', 'https://app.unified-app.sentio.dev'];

  // Local CORS
  return [
    'http://localhost:3000',
    'http://localhost:4321',
    'http://localhost:4173',
    'http://localhost:5173'
  ];
};

const app = new Hono<{ Variables: { requestId: string } }>()
  .use(httpLoggerMiddleware)
  .use(
    cors({
      origin: configureCors(),
      credentials: true
    })
  )
  .use('/trpc/*', trpcServer({ router: appRouter }))
  .route('/api', api);

app.onError((err, c) => {
  if (err instanceof HTTPException) return err.getResponse();

  logger.error('Unhandled application error', {
    error: err.message,
    stack: err.stack,
    path: c.req.path,
    method: c.req.method
  });

  return c.json({ error: 'Internal Server Error' }, 500);
});

export { type AppRouter } from './trpc';
export { type ApiRouter } from './api';

export default {
  fetch: app.fetch,
  port: Bun.env.PORT
};

import { redisPool } from './lib/redis/pool';

function shutdown() {
  console.log('Shutting down server...');

  const cleanupTasks = [
    (async () => {
      try {
        await redisPool.shutdown();
      } catch (error) {
        logger.error('Error during Redis shutdown', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    })()
  ];

  Promise.race([
    Promise.all(cleanupTasks),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Shutdown timeout')), 5000))
  ])
    .then(() => {
      logger.info('Graceful shutdown completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Error during shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      process.exit(1);
    });
}

process.on('SIGINT', shutdown); // Handle Ctrl+C
process.on('SIGTERM', shutdown); // Handle termination signal
