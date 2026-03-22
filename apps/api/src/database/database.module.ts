import { Module, Global, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DatabaseService } from './database.service';
import { LoggerModule } from '../common/logger/logger.module';

@Global()
@Module({
  imports: [
    LoggerModule,
    ConfigModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const logger = new Logger('DatabaseModule');

        const host = config.get('DB_HOST') || 'localhost';
        const port = parseInt(config.get('DB_PORT') || '5432', 10);
        const username = config.get('DB_USERNAME') || 'trading';
        const password = config.get('DB_PASSWORD') || 'trading_dev';
        const database = config.get('DB_NAME') || 'tradingengine';
        const schema = config.get('DB_SCHEMA') || 'public';
        const sslEnabledEnv = config.get('DB_SSL_ENABLED');
        const sslEnabled = sslEnabledEnv === 'true' || sslEnabledEnv === true;

        logger.log(
          `DB Config: ${host}:${port}/${database}, SSL: ${sslEnabled}`,
        );

        const baseConfig = {
          type: 'postgres' as const,
          host,
          port,
          username,
          password,
          database,
          schema,
          synchronize: false,
          logging: config.get('NODE_ENV') === 'development',
          autoLoadEntities: true,
        };

        // Add SSL config if enabled (Aiven requires this)
        if (sslEnabled) {
          const caCertPath = config.get('DB_SSL_CA_PATH');

          if (caCertPath) {
            try {
              const fullPath = join(process.cwd(), caCertPath);
              const ca = readFileSync(fullPath, 'utf8');
              logger.log(
                `SSL enabled with CA cert from ${caCertPath} (${ca.length} chars)`,
              );

              // Match Aiven's pg client example structure
              const finalConfig = {
                ...baseConfig,
                ssl: {
                  rejectUnauthorized: true,
                  ca,
                },
              };

              logger.log(`Final config has SSL: ${!!finalConfig.ssl}`);
              logger.log(
                `SSL config: ${JSON.stringify({ rejectUnauthorized: finalConfig.ssl.rejectUnauthorized, caLength: ca.length })}`,
              );

              return finalConfig;
            } catch (error) {
              const errorMsg =
                error instanceof Error ? error.message : String(error);
              logger.error(`Failed to read CA cert: ${errorMsg}`);
              throw error;
            }
          }

          // SSL without CA (shouldn't happen with Aiven)
          logger.log('SSL enabled without CA cert');
          return {
            ...baseConfig,
            ssl: {
              rejectUnauthorized: false,
            },
          };
        }

        // No SSL (local development)
        logger.log('SSL disabled');
        return baseConfig;
      },
    }),
  ],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
