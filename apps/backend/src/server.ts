import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { trpcServer } from '@hono/trpc-server';
import { HTTPException } from 'hono/http-exception';

import logger from './helpers/logger';
import { httpLoggerMiddleware } from './middleware/http-logger-middleware';
import { appRouter } from './trpc';
import { api } from './api';
import { setupShutdown } from './shutdown';

const app = new Hono<{ Variables: { requestId: string } }>()
  .use(
    cors({
      origin: [
        'http://localhost:3000',
        'http://localhost:4321',
        'http://localhost:4173',
        'http://localhost:5173',
        'https://unified-app.sentio.dev',
        'https://app.unified-app.sentio.dev'
      ],
      credentials: true
    })
  )
  .use(httpLoggerMiddleware)
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

const server = {
  fetch: app.fetch,
  port: Bun.env.PORT
};

setupShutdown();

export { type AppRouter } from './trpc';
export { type ApiRouter } from './api';

export default server;
