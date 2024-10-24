import { type Context, type MiddlewareHandler } from 'hono';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { createError } from './errors/s3';

interface RateLimitConfig {
  points: number;
  duration: number; // in seconds
  keyGenerator?: (c: Context) => string;
}

const createRateLimiter = (config: RateLimitConfig) => {
  const limiter = new RateLimiterMemory({
    points: config.points,
    duration: config.duration
  });

  const middleware: MiddlewareHandler = async (c, next) => {
    try {
      const key = config.keyGenerator?.(c) || c.req.header('x-forwarded-for') || 'unknown';
      await limiter.consume(key);
      return await next();
    } catch {
      return c.json(createError('RateLimit'), 429);
    }
  };

  return middleware;
};

// Default API rate limit middleware
export const apiRateLimit = createRateLimiter({
  points: 5,
  duration: 60 // 1 minute
});

// Configurable download rate limit middleware
export const createDownloadRateLimit = (config: RateLimitConfig): MiddlewareHandler => {
  return createRateLimiter(config);
};

export type { RateLimitConfig };
