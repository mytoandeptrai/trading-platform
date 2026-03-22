import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { EventEmitterModule } from '@nestjs/event-emitter';
import jwtConfig from './config/jwt.config';
import redisConfig from './config/redis.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggerModule } from './common/logger/logger.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { AccountModule } from './account/account.module';
import { DatabaseModule } from './database/database.module';
import { MatchingModule } from './matching/matching.module';
import { RedisModule } from './common/redis/redis.module';
import { EventsModule } from './events/events.module';
import { TickerModule } from './ticker/ticker.module';
import { WebSocketModule } from './websocket/websocket.module';
import { TradingPairsModule } from './trading-pairs/trading-pairs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [jwtConfig, redisConfig],
      envFilePath: '.env',
    }),
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = process.env.REDIS_URL;

        let connectionConfig: any;

        if (redisUrl) {
          // Parse REDIS_URL (Upstash, Render, etc.)
          const parsedUrl = new URL(redisUrl);
          connectionConfig = {
            host: parsedUrl.hostname,
            port: parseInt(parsedUrl.port || '6379'),
            password: parsedUrl.password || undefined,
            // Enable TLS for rediss://
            ...(redisUrl.startsWith('rediss://') && { tls: {} }),
          };
        } else {
          // Fallback to individual config (local development)
          const redisCfg =
            configService.get<import('./config/redis.config').RedisConfig>(
              'redis',
            );
          connectionConfig = {
            host: redisCfg?.host ?? 'localhost',
            port: redisCfg?.port ?? 6379,
            password: redisCfg?.password || undefined,
            db: redisCfg?.db ?? 0,
          };
        }

        return {
          connection: connectionConfig,
          defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: true,
            removeOnFail: false,
          },
        };
      },
    }),
    DatabaseModule,
    RedisModule,
    LoggerModule,
    HealthModule,
    AuthModule,
    AccountModule,
    EventsModule,
    MatchingModule,
    TickerModule,
    WebSocketModule,
    TradingPairsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
