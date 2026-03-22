import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') });

async function runSeeds() {
  const sslEnabled = process.env.DB_SSL_ENABLED === 'true';

  const clientConfig: any = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USERNAME || 'trading',
    password: process.env.DB_PASSWORD || 'trading_dev',
    database: process.env.DB_NAME || 'tradingengine',
  };

  // Add SSL config if enabled (for Aiven, Render, etc.)
  if (sslEnabled) {
    const caCertPath = process.env.DB_SSL_CA_PATH;
    if (caCertPath) {
      const fullPath = path.join(__dirname, '../../../', caCertPath);
      const ca = fs.readFileSync(fullPath, 'utf8');
      clientConfig.ssl = {
        rejectUnauthorized: true,
        ca,
      };
      console.log('🔐 SSL enabled with CA certificate');
    } else {
      clientConfig.ssl = { rejectUnauthorized: false };
      console.log('🔐 SSL enabled without CA certificate');
    }
  }

  const client = new Client(clientConfig);

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database');

    const seedFiles = [
      '001_test_users.sql',
      '002_test_accounts.sql',
      '003_initial_tickers.sql',
      '004_trading_pairs.sql',
    ];

    console.log('\n🌱 Running database seeds...\n');

    for (const file of seedFiles) {
      console.log(`📄 Running seed: ${file}`);
      const sqlPath = path.join(__dirname, '../seeds', file);

      if (!fs.existsSync(sqlPath)) {
        console.error(`❌ Seed file not found: ${sqlPath}`);
        continue;
      }

      const sql = fs.readFileSync(sqlPath, 'utf8');

      try {
        await client.query(sql);
        console.log(`✅ ${file} completed\n`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(`❌ Error running ${file}:`, errorMessage);
        throw error;
      }
    }

    console.log('🎉 All seeds completed successfully!\n');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

runSeeds();
