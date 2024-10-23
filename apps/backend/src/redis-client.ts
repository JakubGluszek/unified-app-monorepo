import Redis from 'ioredis';
import { createPool } from 'generic-pool';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Create a Redis client factory
const factory = {
  create: async () => {
    const client = new Redis(redisUrl);
    client.on('error', (err) => console.error('Redis connection error:', err));
    return client;
  },
  destroy: async (client: Redis) => {
    await client.quit();
  }
};

// Create a connection pool
export const redisPool = createPool(factory, {
  max: 10,
  min: 2,
  idleTimeoutMillis: 10
});

// Function to get a Redis client from the pool
export const getRedisClient = async () => {
  return await redisPool.acquire();
};

// Optionally handle cleanup
process.on('SIGINT', async () => {
  await redisPool.drain();
  await redisPool.clear();
});
