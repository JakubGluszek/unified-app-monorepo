import { type Result, ok, err } from 'neverthrow';

import logger from '../../utils/logger';
import { REDIS_CONFIG } from '../../config/redis';
import { RedisOperationError } from './errors';

export async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<Result<T, RedisOperationError>> {
  const { maxAttempts, initialDelayMs, maxDelayMs, backoffFactor } = REDIS_CONFIG.retry;
  let delay = initialDelayMs as number;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await operation();
      if (attempt > 1) {
        logger.info(`Redis operation '${operationName}' succeeded after ${attempt} attempts`);
      }
      return ok(result);
    } catch (error) {
      if (attempt === maxAttempts) {
        return err(
          new RedisOperationError(
            `Redis operation '${operationName}' failed after ${maxAttempts} attempts`,
            operationName,
            error instanceof Error ? error : undefined
          )
        );
      }

      logger.warn(`Redis operation '${operationName}' failed (attempt ${attempt}/${maxAttempts})`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        attempt,
        nextRetryMs: delay
      });

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * backoffFactor, maxDelayMs);
    }
  }

  // This should never happen due to the return in the maxAttempts case
  return err(
    new RedisOperationError(`Unexpected retry loop exit for '${operationName}'`, operationName)
  );
}
