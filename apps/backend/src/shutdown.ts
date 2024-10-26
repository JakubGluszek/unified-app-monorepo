import { redisPool } from './lib/redis/pool';
import logger from './helpers/logger';

export const setupShutdown = () => {
  const shutdown = async () => {
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
      // Future PostgreSQL connection clean up here
    ];

    try {
      await Promise.race([
        Promise.all(cleanupTasks),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Shutdown timeout')), 5000))
      ]);
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      process.exit(1);
    }
  };

  process.on('SIGINT', shutdown); // Handle Ctrl+C
  process.on('SIGTERM', shutdown); // Handle termination signal
};
