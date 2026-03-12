import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { Redis } from 'ioredis';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  private redis: Redis;

  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0'),
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          return null; // Stop retrying
        }
        return Math.min(times * 100, 3000);
      },
    });
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Try to ping Redis
      const result = await this.redis.ping();

      if (result === 'PONG') {
        return this.getStatus(key, true, {
          status: 'up',
          message: 'Redis is healthy',
        });
      }

      throw new Error('Redis ping failed');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new HealthCheckError(
        'Redis health check failed',
        this.getStatus(key, false, {
          status: 'down',
          message: errorMessage,
        }),
      );
    }
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
