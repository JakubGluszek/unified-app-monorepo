import Redis from 'ioredis';
import { createPool, type Factory, type Pool } from 'generic-pool';
import { err, ok, Result } from 'neverthrow';

import { REDIS_CONFIG } from '../../config/redis';
import logger from '../../utils/logger';
import { RedisConnectionError } from './errors';

const url = new URL(REDIS_CONFIG.url);

class RedisConnectionPool {
  private pool: Pool<Redis>;
  private isShuttingDown = false;

  constructor() {
    const factory: Factory<Redis> = {
      create: async () => {
        const client = new Redis(Number(url.port), url.host, {
          reconnectOnError: (err) => {
            logger.warn('Redis reconnect triggered', { error: err.message });
            return true;
          },
          retryStrategy: (times) => {
            if (this.isShuttingDown) return null;
            const delay = Math.min(times * 50, 2000);
            logger.debug('Redis retry strategy', { attempt: times, delayMs: delay });
            return delay;
          }
        });

        client
          .on('error', (err) => {
            logger.error('Redis client error:', { error: err.message });
          })
          .on('connect', () => {
            logger.info('Redis client connected');
          })
          .on('ready', () => {
            logger.info('Redis client ready');
          })
          .on('close', () => {
            logger.info('Redis client connection closed');
          });

        return client;
      },
      destroy: async (client) => {
        try {
          await client.quit();
        } catch (error) {
          logger.error('Error destroying Redis client', {
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    };

    this.pool = createPool(factory, REDIS_CONFIG.pool);

    // Monitor pool events
    this.pool
      .on('factoryCreateError', (err) => {
        logger.error('Redis pool factory create error:', { error: err.message });
      })
      .on('factoryDestroyError', (err) => {
        logger.error('Redis pool factory destroy error:', { error: err.message });
      });
  }

  async acquire(): Promise<Result<Redis, RedisConnectionError>> {
    if (this.isShuttingDown) {
      return err(new RedisConnectionError('Redis pool is shutting down'));
    }

    try {
      const client = await this.pool.acquire();
      return ok(client);
    } catch (error) {
      return err(
        new RedisConnectionError(
          'Failed to acquire Redis connection',
          error instanceof Error ? error : undefined
        )
      );
    }
  }

  async release(client: Redis): Promise<void> {
    try {
      await this.pool.release(client);
    } catch (error) {
      logger.error('Error releasing Redis client', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    logger.info('Initiating Redis pool shutdown...');

    try {
      await this.pool.drain();
      await this.pool.clear();
      logger.info('Redis pool shutdown complete');
    } catch (error) {
      logger.error('Error during Redis pool shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const redisPool = new RedisConnectionPool();
