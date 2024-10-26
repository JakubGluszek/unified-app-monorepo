import { type Redis } from 'ioredis';
import { type Result, err } from 'neverthrow';
import { redisPool } from './pool';
import { withRetry } from './retry';
import { RedisConnectionError, RedisOperationError } from './errors';

export class RedisClient {
  static async withClient<T>(
    operation: (client: Redis) => Promise<T>
  ): Promise<Result<T, RedisConnectionError | RedisOperationError>> {
    const clientResult = await redisPool.acquire();
    if (clientResult.isErr()) {
      return err(clientResult.error);
    }

    const client = clientResult.value;
    try {
      return await withRetry(() => operation(client), 'customOperation');
    } finally {
      await redisPool.release(client);
    }
  }

  static async get(
    key: string
  ): Promise<Result<string | null, RedisConnectionError | RedisOperationError>> {
    return RedisClient.withClient((client) => client.get(key));
  }

  static async set(
    key: string,
    value: string,
    ttlSeconds?: number
  ): Promise<Result<'OK', RedisConnectionError | RedisOperationError>> {
    return RedisClient.withClient((client) =>
      ttlSeconds ? client.setex(key, ttlSeconds, value) : client.set(key, value)
    );
  }

  static async del(
    key: string
  ): Promise<Result<number, RedisConnectionError | RedisOperationError>> {
    return RedisClient.withClient((client) => client.del(key));
  }
}
