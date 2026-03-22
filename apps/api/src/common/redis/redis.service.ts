import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor(private readonly configService: ConfigService) {
    const redisUrl = process.env.REDIS_URL;

    if (redisUrl) {
      // Use REDIS_URL (Upstash, Render, etc.) - supports TLS
      this.logger.log(`Connecting to Redis via URL: ${redisUrl.replace(/:[^:]*@/, ':***@')}`);
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        tls: redisUrl.startsWith('rediss://') ? {} : undefined, // Enable TLS for rediss://
      });
    } else {
      // Fallback to individual config (local development)
      const redisCfg =
        this.configService.get<import('../../config/redis.config').RedisConfig>(
          'redis',
        );
      this.logger.log(`Connecting to Redis at ${redisCfg?.host}:${redisCfg?.port}`);
      this.client = new Redis({
        host: redisCfg?.host || 'localhost',
        port: redisCfg?.port ?? 6379,
        password: redisCfg?.password || undefined,
        db: redisCfg?.db ?? 0,
        maxRetriesPerRequest: 3,
      });
    }

    this.client.on('connect', () => {
      this.logger.log('✅ Redis connected successfully');
    });

    this.client.on('error', (err) => {
      this.logger.error('❌ Redis connection error:', err.message);
    });
  }

  getClient(): Redis {
    return this.client;
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
