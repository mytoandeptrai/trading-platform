import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, QueryResult } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;
  private readonly logger = new Logger(DatabaseService.name);

  constructor(private readonly configService: ConfigService) {
    const sslEnabledEnv = this.configService.get('DB_SSL_ENABLED');
    const sslEnabled = sslEnabledEnv === 'true' || sslEnabledEnv === true;

    const poolConfig: any = {
      host: this.configService.get('DB_HOST') || 'localhost',
      port: parseInt(this.configService.get('DB_PORT') || '5432', 10),
      user: this.configService.get('DB_USERNAME') || 'trading',
      password: this.configService.get('DB_PASSWORD') || 'trading_dev',
      database: this.configService.get('DB_NAME') || 'tradingengine',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

    // Add SSL config if enabled (for Aiven, Render, etc.)
    if (sslEnabled) {
      const caCertPath = this.configService.get('DB_SSL_CA_PATH');
      if (caCertPath) {
        try {
          const fullPath = join(process.cwd(), caCertPath);
          const ca = readFileSync(fullPath, 'utf8');
          poolConfig.ssl = {
            rejectUnauthorized: true,
            ca,
          };
          this.logger.log(
            `SSL enabled for pg Pool with CA cert (${ca.length} chars)`,
          );
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          this.logger.error(`Failed to read CA cert: ${errorMsg}`);
          throw error;
        }
      } else {
        poolConfig.ssl = { rejectUnauthorized: false };
        this.logger.log('SSL enabled for pg Pool without CA cert');
      }
    }

    this.pool = new Pool(poolConfig);

    // Log pool errors
    this.pool.on('error', (err) => {
      this.logger.error('Unexpected error on idle client', err.stack);
    });
  }

  async onModuleInit() {
    try {
      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      this.logger.log('✅ Database connection pool initialized');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('❌ Failed to initialize database pool', errorMessage);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
    this.logger.log('Database connection pool closed');
  }

  /**
   * Execute a query
   */
  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
      const result = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;

      if (duration > 1000) {
        this.logger.warn(
          `Slow query detected (${duration}ms): ${text.substring(0, 100)}`,
        );
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Query error: ${errorMessage}`, text.substring(0, 100));
      throw error;
    }
  }

  /**
   * Get a client from the pool for transactions
   */
  async getClient() {
    return this.pool.connect();
  }

  /**
   * Execute a transaction
   */
  async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
