import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor(private readonly configService: ConfigService) {
    const redisCfg =
      this.configService.get<import('../../config/redis.config').RedisConfig>(
        'redis',
      );
    this.client = new Redis({
      host: redisCfg?.host || 'localhost',
      port: redisCfg?.port ?? 6379,
      password: redisCfg?.password || undefined,
      db: redisCfg?.db ?? 0,
      maxRetriesPerRequest: 3,
    });
  }

  getClient(): Redis {
    return this.client;
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
