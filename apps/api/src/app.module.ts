import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [jwtConfig, redisConfig],
      envFilePath: '.env',
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisCfg =
          configService.get<import('./config/redis.config').RedisConfig>(
            'redis',
          );
        return {
          connection: {
            host: redisCfg?.host ?? 'localhost',
            port: redisCfg?.port ?? 6379,
            password: redisCfg?.password || undefined,
            db: redisCfg?.db ?? 0,
          },
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
    MatchingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
