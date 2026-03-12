# Trading Engine - NestJS POC

Version
NestJS
TypeScript
PostgreSQL
Redis
License

A **high-performance, microservices-based trading platform POC** built with NestJS, TypeScript, PostgreSQL, and Redis. This is a clean rewrite of the Java Spring Boot system, focusing on modern cloud-native architecture with minimal operational complexity (no Kafka/BullMQ initially).

**Key Positioning**: Modern TypeScript-first alternative to the existing Java system with simplified deployment and lower infrastructure overhead.

---

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Why NestJS + PostgreSQL + Redis](#why-nestjs--postgresql--redis)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Data Models & Schema](#data-models--schema)
- [API Endpoints](#api-endpoints)
- [Setup & Installation](#setup--installation)
- [Development Guide](#development-guide)
- [Database Initialization](#database-initialization)
- [Development Roadmap](#development-roadmap)
- [Key Design Decisions](#key-design-decisions)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## Project Overview

### What is Trading Engine - NestJS POC?

Trading Engine POC is a complete rewrite of the existing trading platform using modern cloud-native technologies. It handles:

- 🏦 **Multi-Account Management** - User accounts with role-based privileges and balance tracking
- 📊 **Order Matching Engine** - Real-time order book management and trade execution
- 💰 **Multi-Currency Portfolio** - Support for multiple assets (crypto, fiat) with transaction tracking
- 📈 **Market Data Services** - Ticker information, candlestick charts (1m, 5m, 1h, 1d)
- 🔐 **User Authentication** - JWT-based access control with role-based permissions
- 🛡️ **Order Book Snapshots** - Periodic historical data capture for analytics
- 📝 **Comprehensive Audit Trail** - Complete transaction logging and settlement records

### Why NestJS + PostgreSQL + Redis?


| Aspect                 | Justification                                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **NestJS**             | Modern TypeScript, built-in dependency injection, excellent for microservices, faster development, huge ecosystem |
| **PostgreSQL**         | ACID transactions, JSON support, excellent performance, solid production track record, open source                |
| **Redis**              | Sub-millisecond caching, order book state management, session storage, pub/sub for real-time updates              |
| **No Kafka initially** | POC focuses on simpler deployment; upgrade path clear if needed                                                   |
| **Monorepo Pattern**   | Single deployment unit for initial phase; modularized for future microservices split                              |


---

## Tech Stack

### Core Framework


| Technology     | Version  | Purpose            | Notes                                           |
| -------------- | -------- | ------------------ | ----------------------------------------------- |
| **Node.js**    | 20.x LTS | JavaScript runtime | High performance, excellent async support       |
| **NestJS**     | 10.x     | Backend framework  | TypeScript-first, dependency injection, modular |
| **TypeScript** | 5.x      | Type safety        | Compile-time error detection                    |
| **Express.js** | 4.x      | HTTP server        | NestJS default adapter                          |


### Databases & Caching


| Technology     | Version | Purpose          | Notes                                |
| -------------- | ------- | ---------------- | ------------------------------------ |
| **PostgreSQL** | 16+     | Primary database | ACID transactions, JSONB support     |
| **Redis**      | 7.x     | Cache & state    | Order book, sessions, real-time data |
| **TypeORM**    | 0.3.x   | Database ORM     | Type-safe queries, migrations        |
| **Prisma**     | 5.x     | Alternative ORM  | (Optional, for future phases)        |


### Additional Libraries


| Library               | Purpose                           |
| --------------------- | --------------------------------- |
| **@nestjs/jwt**       | JWT token generation & validation |
| **@nestjs/passport**  | Authentication strategies         |
| **class-validator**   | Request validation                |
| **class-transformer** | Data transformation               |
| **redis**             | Redis client                      |
| **ioredis**           | Advanced Redis client (optional)  |
| **@nestjs/common**    | Core utilities                    |
| **@nestjs/testing**   | Unit testing framework            |
| **jest**              | Test runner                       |
| **swagger**           | API documentation                 |


---

## Architecture

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Client Applications                       │
│              (Web, Mobile, Trading Terminals)               │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS/REST
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              API Gateway (NestJS Server)                    │
│                    Port: 3000                               │
│        ┌─────────────────────────────────────┐              │
│        │ JWT Authentication & Authorization  │              │
│        │ Request Validation & Rate Limiting  │              │
│        │ Swagger/OpenAPI Documentation      │              │
│        │ Global Exception Handling          │              │
│        └─────────────────────────────────────┘              │
└────┬──────────────────┬──────────────────────┬──────────────┘
     │ Internal Services│ Internal Services    │ Internal Services
     ↓                  ↓                      ↓
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ Account Module   │  │ Matching Module  │  │ Ticker Module    │
├──────────────────┤  ├──────────────────┤  ├──────────────────┤
│ • User accounts  │  │ • Order book     │  │ • Ticker data    │
│ • Balances       │  │ • Matching logic │  │ • Candlesticks   │
│ • Deposits       │  │ • Trades         │  │ • Statistics     │
│ • Withdrawals    │  │ • Settlement     │  │ • Snapshots      │
└──────────────────┘  └──────────────────┘  └──────────────────┘
     │                      │ Redis Events       │
     │                      ↓                    │
     │              ┌─────────────────┐         │
     │              │  Redis Pub/Sub  │         │
     │              │  (Real-time)    │         │
     │              └─────────────────┘         │
     │                      ↑                    │
     └──────────────────────┴────────────────────┘
                    ↓
         ┌──────────────────────────────────────┐
         │    Data Layer                        │
         ├──────────────────────────────────────┤
         │ • PostgreSQL (Relational data)       │
         │ • Redis (Cache & order book state)   │
         │ • TypeORM (Data access layer)        │
         └──────────────────────────────────────┘
```

### Module Structure

```
src/
├── main.ts                              # Entry point
├── app.module.ts                        # Root module
│
├── common/                              # Shared utilities
│   ├── decorators/                      # Custom decorators (@Auth, @User)
│   ├── exceptions/                      # Exception filters
│   ├── guards/                          # JWT guards, role guards
│   ├── interceptors/                    # Response formatting, logging
│   ├── middleware/                      # Request logging
│   ├── utils/                           # Utility functions
│   ├── constants/                       # System constants
│   └── types/                           # TypeScript interfaces
│
├── config/                              # Configuration
│   ├── database.config.ts               # PostgreSQL config
│   ├── redis.config.ts                  # Redis config
│   ├── jwt.config.ts                    # JWT secrets & expiry
│   └── app.config.ts                    # Global app settings
│
├── auth/                                # Authentication module
│   ├── auth.service.ts                  # JWT logic
│   ├── auth.controller.ts               # Login/register endpoints
│   ├── jwt.strategy.ts                  # Passport JWT strategy
│   ├── jwt.guard.ts                     # Route protection
│   ├── role.guard.ts                    # Role-based access
│   ├── entities/
│   │   └── user.entity.ts               # User model
│   └── dto/
│       ├── login.dto.ts                 # Login request
│       └── register.dto.ts              # Registration request
│
├── account/                             # Account Management Module
│   ├── account.service.ts               # Business logic
│   ├── account.controller.ts            # REST endpoints
│   ├── account.repository.ts            # Database queries
│   ├── balance.service.ts               # Balance management
│   ├── transaction.service.ts           # Transaction tracking
│   ├── entities/
│   │   ├── account.entity.ts            # Account model
│   │   ├── account-coin.entity.ts       # Coin balance
│   │   ├── account-cash.entity.ts       # Cash balance
│   │   ├── transaction.entity.ts        # Transaction log
│   │   └── lock-record.entity.ts        # Lock tracking
│   └── dto/
│       ├── create-account.dto.ts
│       ├── deposit.dto.ts
│       └── withdraw.dto.ts
│
├── matching/                            # Order Matching Module
│   ├── matching.service.ts              # Matching algorithm
│   ├── matching.controller.ts           # Order endpoints
│   ├── order.service.ts                 # Order management
│   ├── orderbook.service.ts             # Order book state
│   ├── trade.service.ts                 # Trade execution
│   ├── settlement.service.ts            # Trade settlement
│   ├── entities/
│   │   ├── order.entity.ts              # Order model
│   │   ├── trade.entity.ts              # Trade record
│   │   └── order-history.entity.ts      # Historical orders
│   ├── cache/
│   │   └── orderbook.cache.ts           # Redis order book
│   └── dto/
│       ├── place-order.dto.ts
│       ├── cancel-order.dto.ts
│       └── order-response.dto.ts
│
├── ticker/                              # Market Data Module
│   ├── ticker.service.ts                # Ticker data management
│   ├── ticker.controller.ts             # Market data endpoints
│   ├── candle.service.ts                # Candlestick generation
│   ├── snapshot.service.ts              # Order book snapshots
│   ├── entities/
│   │   ├── ticker.entity.ts             # Price data
│   │   ├── candle.entity.ts             # OHLCV data
│   │   └── snapshot.entity.ts           # Snapshots
│   └── dto/
│       ├── ticker-response.dto.ts
│       └── candle-response.dto.ts
│
└── database/                            # Database migrations & seeds
    ├── migrations/                      # TypeORM migrations
    ├── seeds/                           # Initial data
    └── schema.sql                       # Full schema backup
```

---

## Data Models & Schema

### PostgreSQL Schema Overview

```sql
-- Configuration Database
├── coin                    -- Cryptocurrencies/Tokens (BTC, ETH, KLDX)
├── currency                -- Fiat currencies (USD, VND, EUR)
├── pair                     -- Trading pairs (BTC/USD, ETH/VND)
├── pair_setting            -- Pair-specific fees & settings
├── blockchain_network      -- Blockchain configurations
└── general_setting         -- System-wide settings

-- Account Data
├── user_account            -- User login & profile info
├── account                 -- Trading account details
├── account_coin            -- Coin/token balances
├── account_cash            -- Cash/currency balances
├── transaction             -- Transaction audit trail
└── lock_record             -- Lock tracking for orders

-- Matching Engine
├── matching_order          -- Order records (limit/market/stop)
├── matching_trade          -- Trade execution records
├── order_history           -- Archived orders
└── trade_history           -- Archived trades

-- Market Data
├── ticker                  -- Current price data
├── candle_1m               -- 1-minute candlesticks
├── candle_5m               -- 5-minute candlesticks
├── candle_1h               -- 1-hour candlesticks
├── candle_1d               -- Daily candlesticks
└── orderbook_snapshot      -- Historical order book snapshots
```

### Key Entities

#### User & Account

```typescript
// User Account (Authentication)
interface UserAccount {
  id: bigint;                    // Primary key
  username: string;              // Unique username
  email: string;                 // Contact email
  password_hash: string;         // Bcrypt hash
  created_at: Date;
  updated_at: Date;
}

// Trading Account
interface Account {
  id: bigint;                    // Unique account ID
  user_id: bigint;               // FK to user_account
  account_type: AccountType;     // INDIVIDUAL, BUSINESS, VIP
  trading_status: TradingStatus; // ACTIVE, SUSPENDED, FROZEN
  kyc_level: number;             // 1-3 (deposit limits)
  total_balance: Decimal;        // Total portfolio value
  available_balance: Decimal;    // Unlocked balance
  locked_balance: Decimal;       // Locked in orders
  created_at: Date;
  updated_at: Date;
}

// Coin Balance
interface AccountCoin {
  id: bigint;
  account_id: bigint;
  coin_id: number;
  coin_name: string;             // Cached (BTC, ETH)
  available: Decimal;            // Not locked
  locked: Decimal;               // In active orders
  frozen: Decimal;               // Admin action
  total: Decimal;                // Sum of above
}

// Cash Balance
interface AccountCash {
  id: bigint;
  account_id: bigint;
  currency_id: number;           // USD, VND, etc.
  available: Decimal;
  locked: Decimal;
  total: Decimal;
}
```

#### Order & Trade

```typescript
// Order Record
interface MatchingOrder {
  id: bigint;                    // Order ID
  account_id: bigint;            // Who placed it
  pair_id: number;               // Trading pair
  pair_name: string;             // e.g., "BTC/USD"
  is_bid: boolean;               // true = BUY, false = SELL
  order_type: OrderType;         // LIMIT, MARKET, STOP_LIMIT
  price: Decimal;                // Limit price
  amount: Decimal;               // Total quantity
  filled: Decimal;               // Amount matched so far
  remaining: Decimal;            // Still available
  status: OrderStatus;           // PENDING, PARTLY_FILLED, COMPLETED, CANCELED
  placed_at: Date;
  updated_at: Date;
  expires_at?: Date;             // For GTD orders
}

// Trade Record
interface MatchingTrade {
  id: bigint;                    // Trade ID
  bid_order_id: bigint;          // Buyer's order
  bid_account_id: bigint;
  ask_order_id: bigint;          // Seller's order
  ask_account_id: bigint;
  pair_id: number;
  price: Decimal;                // Executed price
  quantity: Decimal;             // Amount traded
  value: Decimal;                // quantity × price
  buyer_fee: Decimal;
  seller_fee: Decimal;
  executed_at: Date;
  settlement_status: string;     // PENDING, CONFIRMED, FAILED
}
```

#### Market Data

```typescript
// Ticker (Current Price)
interface Ticker {
  id: number;
  pair_id: number;
  last_price: Decimal;           // Latest price
  open_price: Decimal;           // 24h open
  high_price: Decimal;           // 24h high
  low_price: Decimal;            // 24h low
  volume: Decimal;               // 24h volume
  bid_price: Decimal;            // Best bid
  bid_qty: Decimal;
  ask_price: Decimal;            // Best ask
  ask_qty: Decimal;
  change_percent: Decimal;       // 24h % change
  updated_at: Date;
}

// Candlestick (OHLCV)
interface Candle {
  id: bigint;
  pair_id: number;
  timeframe: "1m" | "5m" | "1h" | "1d";
  open_time: Date;               // Candle start
  close_time: Date;              // Candle end
  open: Decimal;
  high: Decimal;
  low: Decimal;
  close: Decimal;
  volume: Decimal;
  trades_count: number;
  is_closed: boolean;            // Is candle finalized?
}
```

---

## API Endpoints

### Authentication Endpoints


| Method | Endpoint         | Description               | Auth |
| ------ | ---------------- | ------------------------- | ---- |
| POST   | `/auth/register` | Create new account        | None |
| POST   | `/auth/login`    | Login & get JWT token     | None |
| POST   | `/auth/refresh`  | Refresh expiring token    | JWT  |
| GET    | `/auth/verify`   | Verify token validity     | JWT  |
| POST   | `/auth/logout`   | Logout (invalidate token) | JWT  |


**Example: Login**

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "trader1",
    "password": "secure_password"
  }'

# Response
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "refresh_token_here",
  "expires_in": 86400
}
```

### Account Management Endpoints


| Method | Endpoint                | Description                 | Auth        |
| ------ | ----------------------- | --------------------------- | ----------- |
| GET    | `/account/me`           | Get current account info    | JWT         |
| GET    | `/account/balance`      | Get account balance summary | JWT         |
| GET    | `/account/coins`        | List coin holdings          | JWT         |
| GET    | `/account/transactions` | Transaction history         | JWT         |
| POST   | `/account/deposit`      | Initiate deposit            | JWT         |
| POST   | `/account/withdraw`     | Initiate withdrawal         | JWT         |
| GET    | `/account/:id`          | Get account details         | JWT (Admin) |


**Example: Get Balance**

```bash
curl -X GET http://localhost:3000/account/balance \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Response
{
  "account_id": 123,
  "total_balance": "150000.00",
  "available_balance": "100000.00",
  "locked_balance": "50000.00",
  "coins": [
    {
      "coin_name": "BTC",
      "available": "0.5",
      "locked": "0.1",
      "total": "0.6"
    },
    {
      "coin_name": "USD",
      "available": "100000.00",
      "locked": "50000.00",
      "total": "150000.00"
    }
  ]
}
```

### Order Management Endpoints


| Method | Endpoint                            | Description         | Auth   |
| ------ | ----------------------------------- | ------------------- | ------ |
| POST   | `/market/order/place`               | Place new order     | JWT    |
| GET    | `/market/order/:id`                 | Get order details   | JWT    |
| GET    | `/market/orders`                    | List user's orders  | JWT    |
| POST   | `/market/order/:id/cancel`          | Cancel order        | JWT    |
| GET    | `/market/order-book/:pair`          | Get order book      | Public |
| GET    | `/market/order-book/:pair/snapshot` | Historical snapshot | Public |


**Example: Place Order**

```bash
curl -X POST http://localhost:3000/market/order/place \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pair": "BTC/USD",
    "side": "BUY",
    "type": "LIMIT",
    "price": "50000",
    "amount": "1.0",
    "validity": "GTC"
  }'

# Response (202 Accepted - async processing)
{
  "order_id": "456789",
  "status": "PENDING",
  "placed_at": "2024-01-15T10:30:00Z",
  "message": "Order received and queued for matching"
}
```

**Example: Cancel Order**

```bash
curl -X POST http://localhost:3000/market/order/456789/cancel \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Response
{
  "order_id": "456789",
  "status": "CANCELED",
  "canceled_at": "2024-01-15T10:31:00Z",
  "remaining_quantity": "1.0"
}
```

### Market Data Endpoints


| Method | Endpoint                          | Description       | Auth   |
| ------ | --------------------------------- | ----------------- | ------ |
| GET    | `/market/ticker/:pair`            | Get current price | Public |
| GET    | `/market/tickers`                 | List all tickers  | Public |
| GET    | `/market/candle/:pair/:timeframe` | Get candlesticks  | Public |
| GET    | `/market/trades/:pair`            | Recent trades     | Public |


**Example: Get Ticker**

```bash
curl http://localhost:3000/market/ticker/BTC/USD

# Response
{
  "pair": "BTC/USD",
  "last_price": "50123.45",
  "open_price": "49500.00",
  "high_price": "50500.00",
  "low_price": "49000.00",
  "volume": "1234.56",
  "bid_price": "50120.00",
  "bid_qty": "2.5",
  "ask_price": "50130.00",
  "ask_qty": "3.2",
  "change_percent": "1.26",
  "updated_at": "2024-01-15T10:30:45Z"
}
```

**Example: Get Candlesticks**

```bash
curl "http://localhost:3000/market/candle/BTC/USD/1h?limit=24"

# Response
{
  "pair": "BTC/USD",
  "timeframe": "1h",
  "candles": [
    {
      "open_time": "2024-01-15T09:00:00Z",
      "close_time": "2024-01-15T10:00:00Z",
      "open": "49800.00",
      "high": "50200.00",
      "low": "49600.00",
      "close": "50123.45",
      "volume": "234.56",
      "trades": 145
    }
  ]
}
```

---

## Setup & Installation

### Prerequisites

```
Node.js        20.x LTS or higher
PostgreSQL     16+
Redis          7.x
npm            10.x or yarn/pnpm
Git            for cloning
```

### Quick Start (5 minutes)

#### 1. Install Node.js

```bash
# macOS with Homebrew
brew install node@20

# Verify installation
node --version    # v20.x.x
npm --version     # 10.x.x
```

#### 2. Start Infrastructure (Docker Compose)

```bash
# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: trading
      POSTGRES_PASSWORD: trading_dev
      POSTGRES_DB: tradingengine
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
EOF

# Start services
docker-compose up -d

# Verify
docker-compose ps
```

#### 3. Clone & Setup Project

```bash
# Clone repository
git clone https://gitlab.com/your-org/trading-nestjs.git
cd trading-nestjs

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your settings:
# DATABASE_URL=postgresql://trading:trading_dev@localhost:5432/tradingengine
# REDIS_URL=redis://localhost:6379
# JWT_SECRET=your-super-secret-key-change-in-production
# JWT_EXPIRATION=86400
```

#### 4. Initialize Database

```bash
# Run migrations
npm run db:migrate

# (Optional) Seed initial data
npm run db:seed

# Verify
npm run db:status
```

#### 5. Start Development Server

```bash
npm run start:dev

# Output:
# [Nest] 12345   - 01/15/2024, 10:30:00 AM     LOG [NestFactory] Starting Nest application...
# [Nest] 12345   - 01/15/2024, 10:30:02 AM     LOG [InstanceLoader] AppModule dependencies initialized
# [Nest] 12345   - 01/15/2024, 10:30:03 AM     LOG [RouterExplorer] Mapped /auth/register ...
# [Nest] 12345   - 01/15/2024, 10:30:03 AM     LOG [NestApplication] Nest application successfully started
# Server running on http://localhost:3000
# Swagger docs: http://localhost:3000/api/docs
```

#### 6. Verify Setup

```bash
# Health check
curl http://localhost:3000/health

# Swagger documentation
open http://localhost:3000/api/docs

# Create test account
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Test@1234"
  }'
```

---

## Development Guide

### Project Structure Commands

```bash
# Generate a new module
npm run generate:module account

# Generate a service within a module
npm run generate:service account/services/balance

# Generate a controller
npm run generate:controller account/controllers/balance

# All commands use NestJS CLI
npm run generate:class auth/dto/login.dto
npm run generate:interface common/interfaces/pagination
```

### Common Development Tasks

```bash
# Start development server with hot reload
npm run start:dev

# Start production build
npm run build
npm run start:prod

# Run tests
npm run test

# Run tests with coverage
npm run test:cov

# Watch tests
npm run test:watch

# Lint code
npm run lint

# Format code
npm run format
```

### Database Operations

```bash
# Create migration
npm run db:migration -- CreateUsersTable

# Run migrations
npm run db:migrate

# Revert last migration
npm run db:revert

# Show migration status
npm run db:status

# Seed database
npm run db:seed

# Seed specific seed file
npm run db:seed -- users

# Drop & recreate (development only!)
npm run db:reset
```

### Adding New Features

**Example: Add deposit endpoint**

```bash
# 1. Create DTO
npm run generate:class account/dto/deposit.dto.ts

# 2. Add service method in account.service.ts
# 3. Add controller endpoint in account.controller.ts
# 4. Create test in account.service.spec.ts
# 5. Run tests: npm run test
```

---

## Database Initialization

### PostgreSQL Schema

```bash
# Connect to PostgreSQL
psql -h localhost -U trading -d tradingengine

# OR: Use TypeORM migrations (recommended)
npm run db:migrate
```

### Manual Schema Creation (optional)

```sql
-- Users & Authentication
CREATE TABLE user_account (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trading Accounts
CREATE TABLE account (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT UNIQUE REFERENCES user_account(id),
  account_type VARCHAR(50) NOT NULL,
  trading_status VARCHAR(50) DEFAULT 'ACTIVE',
  kyc_level INT DEFAULT 1,
  total_balance NUMERIC(20, 8) DEFAULT 0,
  available_balance NUMERIC(20, 8) DEFAULT 0,
  locked_balance NUMERIC(20, 8) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Coin Balances
CREATE TABLE account_coin (
  id BIGSERIAL PRIMARY KEY,
  account_id BIGINT NOT NULL REFERENCES account(id),
  coin_name VARCHAR(50) NOT NULL,
  available NUMERIC(20, 8) DEFAULT 0,
  locked NUMERIC(20, 8) DEFAULT 0,
  frozen NUMERIC(20, 8) DEFAULT 0,
  total NUMERIC(20, 8) DEFAULT 0,
  UNIQUE(account_id, coin_name)
);

-- Cash Balances
CREATE TABLE account_cash (
  id BIGSERIAL PRIMARY KEY,
  account_id BIGINT UNIQUE NOT NULL REFERENCES account(id),
  currency_name VARCHAR(50) NOT NULL,
  available NUMERIC(20, 8) DEFAULT 0,
  locked NUMERIC(20, 8) DEFAULT 0,
  total NUMERIC(20, 8) DEFAULT 0
);

-- Orders
CREATE TABLE matching_order (
  id BIGSERIAL PRIMARY KEY,
  account_id BIGINT NOT NULL REFERENCES account(id),
  pair_name VARCHAR(50) NOT NULL,
  is_bid BOOLEAN NOT NULL,
  order_type VARCHAR(50) NOT NULL,
  price NUMERIC(20, 8),
  amount NUMERIC(20, 8) NOT NULL,
  filled NUMERIC(20, 8) DEFAULT 0,
  remaining NUMERIC(20, 8),
  status VARCHAR(50) DEFAULT 'PENDING',
  placed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);

-- Trades
CREATE TABLE matching_trade (
  id BIGSERIAL PRIMARY KEY,
  bid_order_id BIGINT NOT NULL REFERENCES matching_order(id),
  bid_account_id BIGINT NOT NULL REFERENCES account(id),
  ask_order_id BIGINT NOT NULL REFERENCES matching_order(id),
  ask_account_id BIGINT NOT NULL REFERENCES account(id),
  pair_name VARCHAR(50) NOT NULL,
  price NUMERIC(20, 8) NOT NULL,
  quantity NUMERIC(20, 8) NOT NULL,
  value NUMERIC(20, 8) NOT NULL,
  buyer_fee NUMERIC(20, 8) DEFAULT 0,
  seller_fee NUMERIC(20, 8) DEFAULT 0,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  settlement_status VARCHAR(50) DEFAULT 'PENDING'
);

-- Create indexes for better query performance
CREATE INDEX idx_account_user_id ON account(user_id);
CREATE INDEX idx_account_coin_account ON account_coin(account_id);
CREATE INDEX idx_order_account ON matching_order(account_id);
CREATE INDEX idx_order_pair_status ON matching_order(pair_name, status);
CREATE INDEX idx_trade_account ON matching_trade(bid_account_id, ask_account_id);
CREATE INDEX idx_trade_executed ON matching_trade(executed_at);
```

### Redis Data Structures

```
# Order Book Cache (per pair)
orderbook:BTC/USD:bid        → Sorted Set (prices as scores, order IDs as members)
orderbook:BTC/USD:ask        → Sorted Set
orderbook:BTC/USD:bid:depth  → Hash (price level → quantity)
orderbook:BTC/USD:ask:depth  → Hash

# Ticker Cache
ticker:BTC/USD               → Hash (last_price, high, low, volume, etc.)
tickers:list                 → Set of all pair names

# Session Cache
session:{sessionId}          → Hash (user info, permissions, timestamp)

# Rate Limiting
ratelimit:{userId}:{endpoint} → Counter (requests count)

# Market Data
candle:BTC/USD:1h            → Sorted Set (timestamp → OHLCV JSON)
trades:BTC/USD:recent        → List (latest 100 trades)
```

---

## Development Roadmap

### Tier 1 - MVP (Weeks 1-4)

**Goal**: Fully functional trading platform with basic features

- Project setup & infrastructure
- Database schema & migrations
- User authentication (register/login)
- Account management (balance, deposits)
- Basic order placement (limit orders only)
- Simple matching algorithm
- Trade settlement
- Market data endpoints (ticker, candles)
- Swagger API documentation
- Unit tests (>80% coverage)

**Acceptance Criteria**:

- Users can register, login, and view balance
- Users can place limit orders and they get matched
- Market data endpoints return real-time data
- All critical paths covered by tests

**Estimated Effort**: 120-160 developer hours

### Tier 2 - Enhanced Features (Weeks 5-8)

**Goal**: Production-ready platform with advanced trading features

- Market orders with slippage handling
- Stop-loss & take-profit orders
- Iceberg orders (hidden quantity)
- Order validity types (GTC, GTD, IOC, FOK)
- Advanced order book snapshots
- WebSocket real-time updates
- User activity history & audit logs
- Admin dashboard APIs
- Rate limiting & DDoS protection
- Comprehensive error handling
- Integration tests
- Performance optimization (sub-100ms matching)
- Docker deployment ready
- Kubernetes manifests (optional)

**Acceptance Criteria**:

- All market order types execute correctly
- Real-time WebSocket updates work smoothly
- Latency under 100ms for order placement
- 99.5% uptime in staging
- All flows documented with examples

**Estimated Effort**: 200-280 developer hours

### Future Phases (Tier 3+)

- Multi-currency settlement
- Blockchain integration (Web3)
- Market surveillance & anomaly detection
- Kafka event streaming (high volume)
- Microservices decomposition
- GraphQL API
- Mobile app support
- Advanced charting & analytics
- Machine learning-based price prediction

---

## Key Design Decisions

### 1. **Monorepo vs Microservices**

**Decision**: Start with monorepo (single NestJS app)

**Rationale**:

- Faster initial development
- Simpler deployment for POC
- Easy to split into microservices later (already modular)
- Better performance for cross-module calls

**Migration Path**: Each module → separate NestJS app + shared library

### 2. **PostgreSQL vs MongoDB**

**Decision**: PostgreSQL for all data

**Rationale**:

- ACID transactions critical for trading (money!)
- JSONB support for flexible schemas
- Excellent performance with indexes
- Less operational overhead
- Better for auditing & compliance

**Optional**: MongoDB only for historical candles/archives if needed

### 3. **Redis for Order Book State**

**Decision**: Redis sorted sets for order book

**Rationale**:

- Sub-millisecond price-time ordering
- Atomic operations for consistency
- Easy to query best bid/ask
- Survives application restarts with persistence

**Trade-off**: Data loss if Redis crashes (mitigated by persistence + rebalance from DB)

### 4. **No Kafka in POC**

**Decision**: Skip message queue initially

**Rationale**:

- Redis pub/sub sufficient for MVP
- Reduces operational complexity
- Can add later without major refactoring
- NestJS event emitter handles most use cases

**Upgrade Path**: Drop-in Kafka integration in Tier 2

### 5. **Async Order Processing**

**Decision**: Orders accepted immediately, matching happens async

**Rationale**:

- Lower response latency (user gets order ID immediately)
- Prevents blocking on matching algorithm
- Matches real trading platforms
- Better scalability

**Implementation**: Background job worker processes matches

### 6. **Transaction Isolation**

**Decision**: Database transactions for account movements

**Rationale**:

- Ensures money doesn't disappear
- Prevents double-spending
- Audit trail for compliance

**Level**: PostgreSQL SERIALIZABLE for critical sections

---

## Deployment

### Development Deployment

```bash
# Run locally
npm run start:dev

# Access
# API: http://localhost:3000
# Swagger: http://localhost:3000/api/docs
# Database: localhost:5432
# Redis: localhost:6379
```

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm run start:prod

# Output JAR is in dist/ directory
# Run with: node dist/main.js
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application
COPY dist ./dist

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Run app
CMD ["node", "dist/main.js"]
```

```bash
# Build Docker image
docker build -t trading-engine:latest .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@postgres:5432/db" \
  -e REDIS_URL="redis://redis:6379" \
  trading-engine:latest
```

### Kubernetes Deployment (Optional)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: trading-engine
spec:
  replicas: 3
  selector:
    matchLabels:
      app: trading-engine
  template:
    metadata:
      labels:
        app: trading-engine
    spec:
      containers:
      - name: trading-engine
        image: trading-engine:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: trading-secrets
              key: database-url
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

---

## Troubleshooting

### Connection Issues

**PostgreSQL connection failed**

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check credentials in .env
cat .env | grep DATABASE_URL

# Test connection
psql -h localhost -U trading -d tradingengine -c "SELECT 1"
```

**Redis connection failed**

```bash
# Check Redis is running
docker ps | grep redis

# Test connection
redis-cli ping
# Should output: PONG
```

### Database Issues

**Migration fails**

```bash
# Check migration status
npm run db:status

# Revert failed migration
npm run db:revert

# View migration files
ls -la src/database/migrations/

# Run with verbose logging
npm run db:migrate -- --verbose
```

**Foreign key constraint errors**

```sql
-- Check table structure
\d matching_order

-- Verify foreign keys exist
SELECT constraint_name FROM information_schema.table_constraints 
WHERE table_name = 'matching_order';
```

### Application Issues

**Port already in use**

```bash
# Check what's using port 3000
lsof -i :3000

# Kill process (macOS)
kill -9 <PID>

# Or use different port
PORT=3001 npm run start:dev
```

**Memory leak during development**

```bash
# Run with increased heap
NODE_OPTIONS="--max-old-space-size=4096" npm run start:dev

# Check heap usage
node --expose-gc dist/main.js
```

### Order Matching Issues

**Orders not matching**

```bash
# Check Redis order book
redis-cli

> ZRANGE orderbook:BTC/USD:bid 0 -1 WITHSCORES
# Should see bid orders with prices

> ZRANGE orderbook:BTC/USD:ask 0 -1 WITHSCORES
# Should see ask orders with prices
```

**Stale order book state**

```bash
# Clear Redis cache (development only!)
redis-cli FLUSHDB

# Rebuild from database
npm run seeds:orderbook
```

### Logging & Debugging

```bash
# Enable debug logs
LOG_LEVEL=debug npm run start:dev

# Enable specific module debugging
DEBUG=trading:* npm run start:dev

# View application logs
pm2 logs

# Check database query logs
SET log_statement = 'all'; -- in PostgreSQL
```

---

## Performance Targets


| Metric                      | Target            | Notes                               |
| --------------------------- | ----------------- | ----------------------------------- |
| **Order Placement Latency** | < 100ms           | P95 (from API to order ID returned) |
| **Trade Execution**         | < 50ms            | Internal matching to settlement     |
| **Order Book Depth**        | < 10ms            | Retrieving top 50 levels            |
| **API Response Time**       | < 200ms           | 95th percentile                     |
| **Throughput**              | 10,000 orders/sec | Per pair                            |
| **Uptime**                  | 99.5%             | Monthly SLA                         |
| **Database Query**          | < 5ms             | Average query time                  |


---

## Monitoring & Observability

### Health Checks

```bash
# Application health
curl http://localhost:3000/health

# Database health
curl http://localhost:3000/health/db

# Redis health
curl http://localhost:3000/health/redis

# Full system status
curl http://localhost:3000/health/system
```

### Metrics Collection

```bash
# Prometheus metrics
curl http://localhost:3000/metrics

# Application metrics (custom)
curl http://localhost:3000/metrics/trading
```

### Logging

All logs are written to:

- **Console**: Development
- **Files**: `logs/` directory
- **Structured**: JSON format for parsing

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines.

## License

Proprietary - Trading Platform

## Support

For issues & questions:

- 📧 Email: [dev-team@kldx.trading](mailto:dev-team@kldx.trading)
- 💬 Slack: #trading-platform-dev
- 🐛 Issues: GitLab Issues

---

## Version History


| Version   | Date       | Notes                     |
| --------- | ---------- | ------------------------- |
| 2.0-beta  | 2024-01-15 | NestJS POC release        |
| 2.0-alpha | 2024-01-08 | Initial architecture      |
| 1.0       | 2023-12-01 | Java Spring Boot original |


---

**Last Updated**: 2026-03-12  
**Maintained by**: Development Team  
**Next Review**: 2026-04-15