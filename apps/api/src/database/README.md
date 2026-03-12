# Database Setup

This directory contains database migrations, seeds, and runner scripts for the Trading Engine POC.

## Directory Structure

```
database/
├── migrations/           # SQL migration files
│   ├── 001_create_users_table.sql
│   ├── 002_create_accounts_table.sql
│   ├── 003_create_orders_table.sql
│   ├── 004_create_trades_table.sql
│   ├── 005_create_transactions_table.sql
│   ├── 006_create_tickers_table.sql
│   └── 007_create_candles_tables.sql
├── seeds/                # SQL seed data files
│   ├── 001_test_users.sql
│   ├── 002_test_accounts.sql
│   └── 003_initial_tickers.sql
└── seeders/              # TypeScript runner scripts
    ├── run-migrations.ts
    └── run-seeds.ts
```

## Prerequisites

1. **Docker & Docker Compose** installed
2. **PostgreSQL 16+** and **Redis 7.x** running (via Docker Compose)
3. **Node.js 20+** and **pnpm** installed

## Quick Start

### 1. Start Docker Services

```bash
# From project root
docker-compose up -d
```

This starts:
- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`

### 2. Install Dependencies

```bash
# From apps/api directory
cd apps/api
pnpm install
```

### 3. Configure Environment

```bash
# Copy .env.example to .env
cp .env.example .env

# Update .env with your configuration if needed
```

### 4. Run Migrations

```bash
# Create all database tables
pnpm db:migrate
```

This will execute all migration files in order:
- ✅ Users table with authentication
- ✅ Accounts table with coin/cash balances
- ✅ Orders table for LIMIT and MARKET orders
- ✅ Trades table for executed trades
- ✅ Transactions table for audit trail
- ✅ Tickers table for real-time price data
- ✅ Candles tables (1m, 5m, 1h, 1d) for OHLCV data

### 5. Seed Database

```bash
# Populate database with test data
pnpm db:seed
```

This will insert:
- ✅ 4 test users (password: `Test@1234`)
- ✅ 4 test accounts with balances (BTC, ETH, USD)
- ✅ 4 initial tickers (BTC/USD, ETH/USD, BTC/USDT, ETH/USDT)

### 6. Reset Database (Optional)

```bash
# Drop all data, re-run migrations, and re-seed
pnpm db:reset
```

⚠️ **Warning**: This will delete all data in the database!

## Test Users

After seeding, you can login with these test accounts:

| Username    | Email              | Password   | Role     | Cash Balance | BTC  | ETH |
|-------------|-------------------|------------|----------|--------------|------|-----|
| `trader1`   | trader1@test.com  | Test@1234  | Trader   | $100,000     | 10   | 50  |
| `trader2`   | trader2@test.com  | Test@1234  | Trader   | $100,000     | 10   | 50  |
| `trader3`   | trader3@test.com  | Test@1234  | Trader   | $50,000      | 5    | 20  |
| `testadmin` | admin@test.com    | Test@1234  | Admin    | $500,000     | 100  | 500 |

## Manual Database Access

### Using psql

```bash
# Connect to database
docker exec -it trading-postgres psql -U trading -d tradingengine

# Common queries
\dt                                    # List all tables
SELECT * FROM "user";                  # View users
SELECT * FROM account;                 # View accounts
SELECT * FROM account_coin;            # View coin balances
SELECT * FROM ticker;                  # View tickers
```

### Using pgAdmin or DBeaver

```
Host:     localhost
Port:     5432
Database: tradingengine
Username: trading
Password: trading_dev
```

## Troubleshooting

### Connection Refused

```bash
# Check if Docker containers are running
docker ps

# Restart Docker services
docker-compose down
docker-compose up -d

# Check logs
docker logs trading-postgres
docker logs trading-redis
```

### Permission Denied

```bash
# Fix file permissions
chmod +x src/database/seeders/*.ts
```

### Migration Failed

```bash
# Drop database and start fresh
docker exec -it trading-postgres psql -U trading -c "DROP DATABASE tradingengine;"
docker exec -it trading-postgres psql -U trading -c "CREATE DATABASE tradingengine;"

# Re-run migrations
pnpm db:migrate
```

## Database Schema

### Core Tables

1. **user** - User authentication and profiles
2. **account** - Trading accounts (1:1 with user)
3. **account_coin** - Cryptocurrency balances (BTC, ETH, etc.)
4. **account_cash** - Fiat currency balances (USD, VND, etc.)
5. **lock_record** - Balance locks for pending orders
6. **matching_order** - Active orders (LIMIT, MARKET)
7. **order_history** - Completed/canceled orders archive
8. **matching_trade** - Executed trades
9. **trade_history** - Archived trades
10. **transaction** - Audit trail for all transactions
11. **ticker** - Real-time price data for trading pairs
12. **candle_1m/5m/1h/1d** - OHLCV candlestick data

### Key Features

- ✅ **Check Constraints**: Ensure data integrity (e.g., balance = available + locked)
- ✅ **Triggers**: Auto-update timestamps, auto-calculate values
- ✅ **Indexes**: Optimized for query performance
- ✅ **Foreign Keys**: Maintain referential integrity with CASCADE deletes
- ✅ **Enums via CHECK**: Order types, statuses, transaction types

## Development Workflow

```bash
# 1. Start services
docker-compose up -d

# 2. Run migrations (first time or after schema changes)
pnpm db:migrate

# 3. Seed database (first time or after reset)
pnpm db:seed

# 4. Start development server
pnpm dev

# 5. When done, stop services
docker-compose down
```

## Production Deployment

For production:

1. Use environment-specific `.env` files
2. Use managed PostgreSQL (AWS RDS, Google Cloud SQL, etc.)
3. Run migrations during deployment pipeline
4. **DO NOT** run seeds in production
5. Use SSL/TLS for database connections
6. Enable connection pooling
7. Set up database backups and monitoring

## Notes

- Migration files are numbered (001, 002, etc.) and run in order
- Seed files use `ON CONFLICT DO NOTHING` to avoid duplicates
- Seed files reset sequences after insertion
- All timestamps use `CURRENT_TIMESTAMP` (UTC)
- Numeric fields use `NUMERIC(20, 8)` for high precision
- Password hash format: `bcrypt` with 12 rounds
