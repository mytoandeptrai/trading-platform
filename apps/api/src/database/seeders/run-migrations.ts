import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') });

async function runMigrations() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USERNAME || 'trading',
    password: process.env.DB_PASSWORD || 'trading_dev',
    database: process.env.DB_NAME || 'tradingengine',
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database');

    const migrationFiles = [
      '001_create_users_table.sql',
      '002_create_accounts_table.sql',
      '003_create_orders_table.sql',
      '004_create_trades_table.sql',
      '005_create_transactions_table.sql',
      '006_create_tickers_table.sql',
      '007_create_candles_tables.sql',
      '008_alter_lock_record_check.sql',
    ];

    console.log('\n🚀 Running database migrations...\n');

    for (const file of migrationFiles) {
      console.log(`📄 Running migration: ${file}`);
      const sqlPath = path.join(__dirname, '../migrations', file);

      if (!fs.existsSync(sqlPath)) {
        console.error(`❌ Migration file not found: ${sqlPath}`);
        continue;
      }

      const sql = fs.readFileSync(sqlPath, 'utf8');

      try {
        await client.query(sql);
        console.log(`✅ ${file} completed\n`);
      } catch (error: unknown) {
        const err = error as { code?: string; message?: string };
        const alreadyExists =
          err.code === '42P07' || // duplicate_table, duplicate_object (relation exists)
          err.code === '42710' || // duplicate_object (index etc.)
          (err.message?.includes('already exists') ?? false);
        if (alreadyExists) {
          console.warn(
            `⚠️  ${file} skipped (object already exists). If this is a re-run, this is normal.\n`,
          );
        } else {
          console.error(`❌ Error running ${file}:`, err.message ?? error);
          throw error;
        }
      }
    }

    console.log('🎉 All migrations completed successfully!\n');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

runMigrations();
