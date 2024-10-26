import { type Context, type Next } from 'hono';
import { getConnInfo } from 'hono/bun';

import logger from '../utils/logger';

export const httpLoggerMiddleware = async (c: Context, next: Next) => {
  // Ignore CORS preflight requests
  if (c.req.method === 'OPTIONS') return await next();

  const startTime = performance.now();

  // For use to reference in other middlewares/handlers
  const requestId = crypto.randomUUID();
  c.set('requestId', requestId);

  const { remote } = getConnInfo(c);

  const requestData = {
    method: c.req.method,
    url: c.req.url,
    path: c.req.path,
    query: c.req.query(),
    headers: {
      'user-agent': c.req.header('user-agent'),
      referer: c.req.header('referer'),
      'x-forwarded-for': c.req.header('x-forwarded-for') || remote.address
    },
    requestId
  };

  logger.info('Incoming request', {
    ...requestData,
    timestamp: new Date().toISOString()
  });

  try {
    await next();

    const duration = performance.now() - startTime;

    logger.info('Request completed', {
      ...requestData,
      status: c.res.status,
      duration: `${duration.toFixed(2)}ms`,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    const duration = performance.now() - startTime;

    logger.error('Request failed', {
      ...requestData,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      status: error.status || 500,
      duration: `${duration.toFixed(2)}ms`,
      timestamp: new Date().toISOString()
    });

    throw error;
  }
};
