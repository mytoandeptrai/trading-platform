import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseService } from './database.service';
import { LoggerModule } from '../common/logger/logger.module';

@Global()
@Module({
  imports: [
    LoggerModule,
    ConfigModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST') || 'localhost',
        port: parseInt(config.get('DB_PORT') || '5432', 10),
        username: config.get('DB_USERNAME') || 'trading',
        password: config.get('DB_PASSWORD') || 'trading_dev',
        database: config.get('DB_NAME') || 'tradingengine',
        schema: config.get('DB_SCHEMA') || 'public',
        synchronize: false, // Never use synchronize in production
        logging: config.get('NODE_ENV') === 'development',
        autoLoadEntities: true,
      }),
    }),
  ],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
