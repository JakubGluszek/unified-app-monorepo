export const REDIS_CONFIG = {
  url: Bun.env.REDIS_URL || 'redis://localhost:6379',
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    evictionRunIntervalMillis: 15000
  },
  retry: {
    maxAttempts: 5,
    initialDelayMs: 100,
    maxDelayMs: 2000,
    // Factor to multiply delay by on each retry
    backoffFactor: 2
  }
} as const;
