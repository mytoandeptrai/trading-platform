# Trading Engine POC - Technical Design Document (TDD)

**Version**: 1.0
**Date**: 2026-03-12
**Status**: Design Complete - Ready for Implementation
**Authors**: Development Team

---

## 📑 Document Index

- [1. Overview & Goals](#1-overview--goals)
- [2. System Architecture](#2-system-architecture)
- [3. Database Schema Design](#3-database-schema-design)
- [4. Module Design](#4-module-design)
- [5. API Design](#5-api-design)
- [6. Real-time Architecture](#6-real-time-architecture)
- [7. Background Jobs](#7-background-jobs)
- [8. Error Handling & Logging](#8-error-handling--logging)
- [9. Security Considerations](#9-security-considerations)
- [10. Testing Strategy](#10-testing-strategy)
- [11. Implementation Plan](#11-implementation-plan)

---

## 1. Overview & Goals

### 1.1 Project Summary

A **high-performance trading platform POC** built with NestJS, featuring:
- Real-time order matching engine
- Atomic trade settlement
- WebSocket real-time updates
- Multi-currency balance management

### 1.2 Phase 1 Scope

**Build a functional trading platform supporting:**
- ✅ User registration & JWT authentication
- ✅ Account management with balance tracking
- ✅ **LIMIT & MARKET orders** (BUY/SELL)
- ✅ Asynchronous order matching with priority queue (BullMQ)
- ✅ Atomic trade settlement with slippage handling
- ✅ Order cancellation
- ✅ Market data (Tickers, Candlesticks)
- ✅ WebSocket real-time notifications

**Explicitly OUT of scope:**
- ❌ STOP_LIMIT, ICEBERG orders
- ❌ Self-trade prevention
- ❌ Order book snapshots
- ❌ Frontend implementation
- ❌ Retry mechanisms for failed settlements
- ❌ Load testing / Production deployment

### 1.3 Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Order Placement | < 100ms | P95, API response time |
| Matching Latency | < 50ms | Background worker |
| Settlement | < 200ms | Database transaction |
| Balance Query | < 50ms | With Redis cache |
| Ticker Update | < 100ms | Real-time calculation |

### 1.4 Technology Stack

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Backend** | NestJS | 10.x | API framework |
| **Language** | TypeScript | 5.x | Type safety |
| **Database** | PostgreSQL | 16+ | Persistent storage |
| **Cache** | Redis | 7.x | Order book, sessions |
| **Queue** | BullMQ | 5.x | Background jobs |
| **WebSocket** | Socket.io | 4.x | Real-time updates |
| **Logger** | Winston | 3.x | Application logs |
| **Testing** | Jest | 29.x | Unit tests |

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client (Postman/curl)                    │
│                      Testing Interface                      │
└──────────────────┬──────────────────────────────────────────┘
                   │ HTTPS/REST & WebSocket
                   ↓
┌─────────────────────────────────────────────────────────────┐
│              NestJS API Server (Port 3001)                  │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐   │
│  │ API Layer                                            │   │
│  │ - AuthController (Login/Register)                    │   │
│  │ - AccountController (Balance/Deposit/Withdraw)       │   │
│  │ - OrderController (Place/Cancel)                     │   │
│  │ - TickerController (Market Data)                     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Business Logic Layer                                 │   │
│  │ - AuthService (JWT)                                  │   │
│  │ - AccountService (Balance Management)                │   │
│  │ - OrderService (Validation, Lock Balance)            │   │
│  │ - TickerService (Price Aggregation)                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ WebSocket Gateway                                    │   │
│  │ - OrderGateway (Real-time events)                    │   │
│  │ - TickerGateway (Price updates)                      │   │
│  └──────────────────────────────────────────────────────┘   │
└───────┬────────────────────────┬─────────────────────────────┘
        │                        │
        │                        ↓
        │              ┌───────────────────┐
        │              │ BullMQ Worker     │
        │              ├───────────────────┤
        │              │ MatchingWorker    │
        │              │ - Scan order book │
        │              │ - Match orders    │
        │              │ - Call settlement │
        │              └───────────────────┘
        │                        ↓
        ↓                        ↓
┌──────────────────────────────────────────────────────────┐
│                   Data Layer                             │
├──────────────────────────────────────────────────────────┤
│  PostgreSQL (Primary Data)        Redis (Cache & Queue) │
│  - users, accounts                - Order book (ZSET)   │
│  - orders, trades                 - Session cache       │
│  - balances, transactions         - BullMQ queues       │
│  - tickers, candles               - Pub/Sub events      │
└──────────────────────────────────────────────────────────┘
```

### 2.2 Module Structure

```
apps/api/src/
├── main.ts                         # Bootstrap
├── app.module.ts                   # Root module
│
├── common/                         # Shared code
│   ├── decorators/
│   │   ├── auth.decorator.ts       # @Auth() decorator
│   │   └── user.decorator.ts       # @CurrentUser() decorator
│   ├── guards/
│   │   ├── jwt-auth.guard.ts       # JWT validation
│   │   └── roles.guard.ts          # Role-based access
│   ├── interceptors/
│   │   ├── logging.interceptor.ts  # Request logging
│   │   └── transform.interceptor.ts # Response formatting
│   ├── filters/
│   │   └── http-exception.filter.ts # Global error handler
│   ├── constants/
│   │   ├── pairs.constant.ts       # Trading pairs config
│   │   └── status.constant.ts      # Order/Account statuses
│   └── types/
│       ├── order.types.ts          # Order interfaces
│       └── account.types.ts        # Account interfaces
│
├── config/                         # Configuration
│   ├── database.config.ts          # PostgreSQL config
│   ├── redis.config.ts             # Redis config
│   ├── jwt.config.ts               # JWT secrets
│   └── websocket.config.ts         # Socket.io config
│
├── auth/                           # Authentication
│   ├── auth.module.ts
│   ├── auth.controller.ts          # POST /auth/login, /register
│   ├── auth.service.ts             # JWT logic
│   ├── jwt.strategy.ts             # Passport JWT
│   ├── entities/
│   │   └── user.entity.ts
│   └── dto/
│       ├── login.dto.ts
│       └── register.dto.ts
│
├── account/                        # Account Management
│   ├── account.module.ts
│   ├── account.controller.ts       # GET /account/balance, POST /deposit
│   ├── account.service.ts          # Balance CRUD
│   ├── balance.service.ts          # Lock/Unlock logic
│   ├── transaction.service.ts      # Transaction audit
│   ├── entities/
│   │   ├── account.entity.ts
│   │   ├── account-coin.entity.ts
│   │   ├── account-cash.entity.ts
│   │   ├── transaction.entity.ts
│   │   └── lock-record.entity.ts
│   └── dto/
│       ├── deposit.dto.ts
│       └── withdraw.dto.ts
│
├── matching/                       # Order Matching
│   ├── matching.module.ts
│   ├── order.controller.ts         # POST /orders, DELETE /orders/:id
│   ├── order.service.ts            # Order validation, placement
│   ├── orderbook.service.ts        # Redis order book management
│   ├── matching.worker.ts          # BullMQ worker (matching logic)
│   ├── settlement.service.ts       # Trade settlement
│   ├── entities/
│   │   ├── order.entity.ts
│   │   ├── trade.entity.ts
│   │   └── order-history.entity.ts
│   ├── dto/
│   │   ├── place-order.dto.ts
│   │   └── cancel-order.dto.ts
│   └── jobs/
│       └── matching.processor.ts   # BullMQ job processor
│
├── ticker/                         # Market Data
│   ├── ticker.module.ts
│   ├── ticker.controller.ts        # GET /ticker/:pair, /candles/:pair
│   ├── ticker.service.ts           # Ticker calculation
│   ├── candle.service.ts           # Candlestick generation
│   ├── entities/
│   │   ├── ticker.entity.ts
│   │   ├── candle-1m.entity.ts
│   │   ├── candle-5m.entity.ts
│   │   ├── candle-1h.entity.ts
│   │   └── candle-1d.entity.ts
│   └── dto/
│       └── ticker-response.dto.ts
│
├── websocket/                      # Real-time
│   ├── websocket.module.ts
│   ├── order.gateway.ts            # Socket.io gateway
│   └── ticker.gateway.ts           # Ticker updates
│
└── database/                       # Database
    ├── database.module.ts          # Raw SQL or ORM module
    ├── database.service.ts         # Connection pool
    ├── migrations/                 # SQL migrations
    │   ├── 001_create_users.sql
    │   ├── 002_create_accounts.sql
    │   ├── 003_create_orders.sql
    │   └── ...
    └── seeds/                      # Initial data
        ├── pairs.seed.sql
        └── test-users.seed.sql
```

### 2.3 Data Flow Diagrams

#### 2.3.1 Order Placement Flow

```
┌──────┐                                                    ┌──────────┐
│ User │                                                    │ Redis    │
└──┬───┘                                                    └────┬─────┘
   │                                                             │
   │ 1. POST /orders                                             │
   ├──────────────────────────────────►┌──────────────────┐     │
   │                                    │ OrderController  │     │
   │                                    └────────┬─────────┘     │
   │                                             │               │
   │                                             │ 2. Validate   │
   │                                             ↓               │
   │                                    ┌──────────────────┐     │
   │                                    │  OrderService    │     │
   │                                    └────────┬─────────┘     │
   │                                             │               │
   │                                             │ 3. Lock Balance
   │                                             ↓               │
   │                                    ┌──────────────────┐     │
   │                                    │ BalanceService   │     │
   │                                    └────────┬─────────┘     │
   │                                             │               │
   │                                             │ 4. Save Order │
   │                                             ↓               │
   │                                    ┌──────────────────┐     │
   │                                    │   PostgreSQL     │     │
   │                                    └────────┬─────────┘     │
   │                                             │               │
   │                                             │ 5. Add to Book│
   │                                             ├───────────────►
   │                                             │               │
   │                                             │ 6. Push Job   │
   │                                             ├───────────────►
   │ 7. 202 Accepted (order_id)                 │               │
   │◄────────────────────────────────────────────┤               │
   │                                             │               │
   │                                             ↓               │
   │                                    ┌──────────────────┐     │
   │                                    │  BullMQ Queue    │     │
   │                                    └────────┬─────────┘     │
   │                                             │               │
   │                                             │ [Async]       │
   │                                             ↓               │
   │                                    ┌──────────────────┐     │
   │                                    │ MatchingWorker   │     │
   │                                    └────────┬─────────┘     │
   │                                             │               │
   │                                             │ 8. Match      │
   │                                             ↓               │
   │                                    ┌──────────────────┐     │
   │                                    │SettlementService │     │
   │                                    └────────┬─────────┘     │
   │                                             │               │
   │                                             │ 9. WebSocket  │
   │ 10. order.matched event                    ↓               │
   │◄────────────────────────────────────────────────────────────┤
   │                                                             │
```

#### 2.3.2 Settlement Flow

```
┌──────────────────┐
│ MatchingWorker   │
│ (found match)    │
└────────┬─────────┘
         │
         │ 1. Execute trade
         ↓
┌──────────────────────────────────────────────────────┐
│            SettlementService                         │
├──────────────────────────────────────────────────────┤
│                                                      │
│  START TRANSACTION (SERIALIZABLE)                    │
│  ┌────────────────────────────────────────────────┐ │
│  │                                                │ │
│  │  2. Lock both account rows                    │ │
│  │     SELECT * FROM account WHERE id IN (?, ?)  │ │
│  │     FOR UPDATE                                │ │
│  │                                                │ │
│  │  3. Validate account statuses                 │ │
│  │     IF frozen: ROLLBACK                       │ │
│  │                                                │ │
│  │  4. Transfer coins (buyer receives)           │ │
│  │     UPDATE account_coin                       │ │
│  │     SET available = available + quantity      │ │
│  │                                                │ │
│  │  5. Transfer cash (seller receives)           │ │
│  │     UPDATE account_cash                       │ │
│  │     SET available = available + (price - fee) │ │
│  │                                                │ │
│  │  6. Unlock balances                           │ │
│  │     UPDATE account_cash                       │ │
│  │     SET locked = locked - amount              │ │
│  │                                                │ │
│  │  7. Create transaction records (audit)        │ │
│  │     INSERT INTO transaction (...)             │ │
│  │                                                │ │
│  │  8. Update order & trade status               │ │
│  │     UPDATE matching_order SET status=?        │ │
│  │     UPDATE matching_trade SET status=?        │ │
│  │                                                │ │
│  │  COMMIT                                        │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  IF ERROR:                                           │
│    - ROLLBACK transaction                            │
│    - Mark trade as FAILED                            │
│    - Log error                                       │
│                                                      │
└──────────────────┬───────────────────────────────────┘
                   │
                   │ 9. Publish events
                   ↓
┌──────────────────────────────────────────────────────┐
│              Redis Pub/Sub                           │
├──────────────────────────────────────────────────────┤
│  - trade.executed                                    │
│  - order.filled                                      │
│  - ticker.update                                     │
└──────────────────┬───────────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────────┐
│              WebSocket Gateway                       │
│  Notify connected clients                            │
└──────────────────────────────────────────────────────┘
```

---

## 3. Database Schema Design

### 3.1 Schema Overview

**Design Principles:**
- ACID transactions for all balance operations
- Pessimistic locking for concurrent order placement
- Audit trail for all transactions
- Index optimization for high-read queries

### 3.2 Entity Relationship Diagram

```
┌─────────────┐       ┌──────────────┐       ┌─────────────────┐
│    user     │──1:1──│   account    │──1:N──│  account_coin   │
└─────────────┘       └──────┬───────┘       └─────────────────┘
                             │1:1
                             ↓
                      ┌─────────────────┐
                      │  account_cash   │
                      └─────────────────┘
                             │1:N
                             ↓
                      ┌─────────────────┐
                      │  lock_record    │
                      └─────────────────┘
                             │
                             ↓
                      ┌─────────────────┐
                      │ matching_order  │──1:N──┐
                      └────────┬────────┘       │
                               │1:N             │
                               ↓                ↓
                      ┌─────────────────┐   ┌──────────────┐
                      │ matching_trade  │───│ transaction  │
                      └─────────────────┘   └──────────────┘
                               │
                               │ Triggers update
                               ↓
                      ┌─────────────────┐
                      │     ticker      │
                      └─────────────────┘
                               │1:N
                               ↓
                      ┌─────────────────┐
                      │   candle_*      │ (1m, 5m, 1h, 1d)
                      └─────────────────┘
```

### 3.3 Table Definitions

#### 3.3.1 User Management

```sql
-- Users table (authentication)
CREATE TABLE "user" (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_email ON "user"(email);
CREATE INDEX idx_user_username ON "user"(username);
```

#### 3.3.2 Account Management

```sql
-- Trading accounts
CREATE TABLE account (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL REFERENCES "user"(id),
    account_type VARCHAR(50) DEFAULT 'INDIVIDUAL',
    trading_status VARCHAR(50) DEFAULT 'ACTIVE',
    kyc_level INT DEFAULT 1,
    total_balance NUMERIC(20, 8) DEFAULT 0,
    available_balance NUMERIC(20, 8) DEFAULT 0,
    locked_balance NUMERIC(20, 8) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_account_balance CHECK (
        total_balance = available_balance + locked_balance
        AND available_balance >= 0
        AND locked_balance >= 0
    )
);

CREATE INDEX idx_account_user ON account(user_id);
CREATE INDEX idx_account_status ON account(trading_status);

-- Coin balances (BTC, ETH, etc.)
CREATE TABLE account_coin (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES account(id),
    coin_name VARCHAR(50) NOT NULL,
    available NUMERIC(20, 8) DEFAULT 0,
    locked NUMERIC(20, 8) DEFAULT 0,
    frozen NUMERIC(20, 8) DEFAULT 0,
    total NUMERIC(20, 8) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(account_id, coin_name),
    CONSTRAINT check_coin_balance CHECK (
        total = available + locked + frozen
        AND available >= 0
        AND locked >= 0
        AND frozen >= 0
    )
);

CREATE INDEX idx_account_coin_account ON account_coin(account_id);
CREATE INDEX idx_account_coin_name ON account_coin(coin_name);

-- Cash balances (USD, VND, etc.)
CREATE TABLE account_cash (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT UNIQUE NOT NULL REFERENCES account(id),
    currency_name VARCHAR(50) DEFAULT 'USD',
    available NUMERIC(20, 8) DEFAULT 0,
    locked NUMERIC(20, 8) DEFAULT 0,
    total NUMERIC(20, 8) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_cash_balance CHECK (
        total = available + locked
        AND available >= 0
        AND locked >= 0
    )
);

CREATE INDEX idx_account_cash_account ON account_cash(account_id);

-- Lock records (for order balance locks)
CREATE TABLE lock_record (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES account(id),
    order_id BIGINT,
    lock_type VARCHAR(50) NOT NULL, -- 'CASH' or 'COIN'
    asset_name VARCHAR(50) NOT NULL, -- 'USD', 'BTC', etc.
    lock_amount NUMERIC(20, 8) NOT NULL,
    status VARCHAR(50) DEFAULT 'LOCKED', -- LOCKED, UNLOCKED
    locked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    unlocked_at TIMESTAMP,

    CONSTRAINT check_lock_amount CHECK (lock_amount > 0)
);

CREATE INDEX idx_lock_account ON lock_record(account_id);
CREATE INDEX idx_lock_order ON lock_record(order_id);
CREATE INDEX idx_lock_status ON lock_record(status);
```

#### 3.3.3 Orders & Trades

```sql
-- Orders
CREATE TABLE matching_order (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES account(id),
    pair_name VARCHAR(50) NOT NULL,
    is_bid BOOLEAN NOT NULL, -- true = BUY, false = SELL
    order_type VARCHAR(50) DEFAULT 'LIMIT',
    price NUMERIC(20, 8) NOT NULL,
    amount NUMERIC(20, 8) NOT NULL,
    filled NUMERIC(20, 8) DEFAULT 0,
    remaining NUMERIC(20, 8),
    status VARCHAR(50) DEFAULT 'PENDING',
    placed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,

    CONSTRAINT check_order_amounts CHECK (
        amount > 0
        AND filled >= 0
        AND remaining >= 0
        AND filled + remaining = amount
    )
);

CREATE INDEX idx_order_account ON matching_order(account_id);
CREATE INDEX idx_order_pair_status ON matching_order(pair_name, status);
CREATE INDEX idx_order_placed ON matching_order(placed_at DESC);

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
    value NUMERIC(20, 8) NOT NULL, -- quantity * price
    buyer_fee NUMERIC(20, 8) DEFAULT 0,
    seller_fee NUMERIC(20, 8) DEFAULT 0,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    settlement_status VARCHAR(50) DEFAULT 'PENDING',
    settlement_time TIMESTAMP,

    CONSTRAINT check_trade_amounts CHECK (
        quantity > 0
        AND price > 0
        AND value = quantity * price
    )
);

CREATE INDEX idx_trade_bid_account ON matching_trade(bid_account_id);
CREATE INDEX idx_trade_ask_account ON matching_trade(ask_account_id);
CREATE INDEX idx_trade_pair ON matching_trade(pair_name);
CREATE INDEX idx_trade_executed ON matching_trade(executed_at DESC);
```

#### 3.3.4 Transactions (Audit Trail)

```sql
-- Transaction log (audit trail)
CREATE TABLE transaction (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES account(id),
    transaction_type VARCHAR(50) NOT NULL, -- DEPOSIT, WITHDRAW, TRADE, FEE
    asset_name VARCHAR(50) NOT NULL, -- USD, BTC, etc.
    amount NUMERIC(20, 8) NOT NULL,
    balance_before NUMERIC(20, 8) NOT NULL,
    balance_after NUMERIC(20, 8) NOT NULL,
    reference_id BIGINT, -- order_id or trade_id
    reference_type VARCHAR(50), -- ORDER, TRADE
    op_result VARCHAR(50) DEFAULT 'SUCCESS', -- SUCCESS, FAILED
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transaction_account ON transaction(account_id);
CREATE INDEX idx_transaction_type ON transaction(transaction_type);
CREATE INDEX idx_transaction_created ON transaction(created_at DESC);
CREATE INDEX idx_transaction_reference ON transaction(reference_type, reference_id);
```

#### 3.3.5 Market Data

```sql
-- Tickers (current price data)
CREATE TABLE ticker (
    id SERIAL PRIMARY KEY,
    pair_name VARCHAR(50) UNIQUE NOT NULL,
    last_price NUMERIC(20, 8),
    open_price NUMERIC(20, 8),
    high_price NUMERIC(20, 8),
    low_price NUMERIC(20, 8),
    volume NUMERIC(20, 8) DEFAULT 0,
    bid_price NUMERIC(20, 8),
    bid_qty NUMERIC(20, 8),
    ask_price NUMERIC(20, 8),
    ask_qty NUMERIC(20, 8),
    change_percent NUMERIC(10, 4),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ticker_pair ON ticker(pair_name);

-- Candlesticks (OHLCV data)
CREATE TABLE candle_1m (
    id BIGSERIAL PRIMARY KEY,
    pair_name VARCHAR(50) NOT NULL,
    open_time TIMESTAMP NOT NULL,
    close_time TIMESTAMP NOT NULL,
    open NUMERIC(20, 8) NOT NULL,
    high NUMERIC(20, 8) NOT NULL,
    low NUMERIC(20, 8) NOT NULL,
    close NUMERIC(20, 8) NOT NULL,
    volume NUMERIC(20, 8) DEFAULT 0,
    trades_count INT DEFAULT 0,
    is_closed BOOLEAN DEFAULT false,

    UNIQUE(pair_name, open_time)
);

CREATE INDEX idx_candle_1m_pair_time ON candle_1m(pair_name, open_time DESC);

-- Similar tables for 5m, 1h, 1d
CREATE TABLE candle_5m (LIKE candle_1m INCLUDING ALL);
CREATE TABLE candle_1h (LIKE candle_1m INCLUDING ALL);
CREATE TABLE candle_1d (LIKE candle_1m INCLUDING ALL);

CREATE INDEX idx_candle_5m_pair_time ON candle_5m(pair_name, open_time DESC);
CREATE INDEX idx_candle_1h_pair_time ON candle_1h(pair_name, open_time DESC);
CREATE INDEX idx_candle_1d_pair_time ON candle_1d(pair_name, open_time DESC);
```

### 3.4 Redis Data Structures

```
# Order Book (Sorted Sets)
orderbook:BTC/USD:bid          ZSET (score = -price, member = order_id)
orderbook:BTC/USD:ask          ZSET (score = price, member = order_id)

# Order Details Cache
order:{order_id}               HASH (order fields)
TTL: 3600s

# Account Cache
account:{account_id}           HASH (account fields)
TTL: 3600s

# Ticker Cache
ticker:BTC/USD                 HASH (last_price, volume, etc.)
TTL: 60s

# Session Cache
session:{user_id}              HASH (JWT payload)
TTL: 86400s (24h)

# BullMQ Queues
bull:matching:orders           LIST (pending jobs)
bull:matching:completed        LIST (completed jobs)
bull:matching:failed           LIST (failed jobs)

# Pub/Sub Channels
events:order:matched           CHANNEL
events:trade:executed          CHANNEL
events:ticker:update           CHANNEL
```

---

## 4. Module Design

### 4.1 Auth Module

**Responsibilities:**
- User registration & validation
- User login & JWT token generation
- Token refresh
- Password hashing (bcrypt)

**Key Methods:**

```typescript
// auth.service.ts
class AuthService {
  async register(dto: RegisterDto): Promise<{ user_id: number }>;
  async login(dto: LoginDto): Promise<{ access_token: string; refresh_token: string }>;
  async validateUser(username: string, password: string): Promise<User | null>;
  async generateJWT(user: User): Promise<string>;
  async refreshToken(refreshToken: string): Promise<{ access_token: string }>;
}
```

**Database Operations:**
- INSERT into `user` table
- SELECT user by username/email
- Bcrypt password comparison

**Error Handling:**
- 409 Conflict: Email/username already exists
- 401 Unauthorized: Invalid credentials
- 400 Bad Request: Validation errors

---

### 4.2 Account Module

**Responsibilities:**
- Account creation (after user registration)
- Balance queries (coins + cash)
- Deposit & withdrawal operations
- Balance locking/unlocking for orders
- Transaction audit logging

**Key Methods:**

```typescript
// account.service.ts
class AccountService {
  async createAccount(userId: number): Promise<Account>;
  async getBalance(accountId: number): Promise<BalanceDto>;
  async deposit(accountId: number, dto: DepositDto): Promise<Transaction>;
  async withdraw(accountId: number, dto: WithdrawDto): Promise<Transaction>;
}

// balance.service.ts
class BalanceService {
  async lockCash(accountId: number, amount: number, orderId: number): Promise<LockRecord>;
  async lockCoin(accountId: number, coinName: string, amount: number, orderId: number): Promise<LockRecord>;
  async unlockCash(lockRecordId: number): Promise<void>;
  async unlockCoin(lockRecordId: number): Promise<void>;
  async validateSufficientBalance(accountId: number, amount: number, currency: string): Promise<boolean>;
}

// transaction.service.ts
class TransactionService {
  async logTransaction(dto: CreateTransactionDto): Promise<Transaction>;
  async getTransactionHistory(accountId: number, filters: FilterDto): Promise<Transaction[]>;
}
```

**Database Operations:**
- INSERT into `account`, `account_coin`, `account_cash`
- UPDATE balance fields with row locking
- INSERT into `lock_record`
- INSERT into `transaction` (audit trail)

**Concurrency Handling:**
```sql
-- Pessimistic locking for balance updates
SELECT * FROM account WHERE id = ? FOR UPDATE;
UPDATE account_cash SET locked = locked + ?, available = available - ? WHERE account_id = ?;
```

---

### 4.3 Matching Module

**Responsibilities:**
- Order validation & placement
- Balance locking before order placement
- Order book management (Redis)
- Asynchronous order matching (BullMQ worker)
- Trade settlement
- Order cancellation

#### 4.3.1 Order Service

```typescript
// order.service.ts
class OrderService {
  async placeOrder(accountId: number, dto: PlaceOrderDto): Promise<{ order_id: number; status: string }>;
  async validateOrder(dto: PlaceOrderDto): Promise<void>;
  async cancelOrder(accountId: number, orderId: number): Promise<void>;
  async getOrderById(orderId: number): Promise<Order>;
  async getOrdersByAccount(accountId: number): Promise<Order[]>;
}
```

**Place Order Flow (LIMIT & MARKET):**
1. Validate order parameters (amount, pair, type)
   - LIMIT: Requires price field
   - MARKET: Price = null
2. Check pair trading status
3. Check account trading status
4. Calculate required balance + fees
   - LIMIT: exact amount × price + fee
   - MARKET: worst-case estimate × 1.2 (slippage buffer)
5. Call `BalanceService.lockCash()` or `lockCoin()`
6. Generate order ID (snowflake or bigserial)
7. INSERT into `matching_order` (status=PENDING, type=LIMIT/MARKET)
8. Call `OrderbookService.addOrder()` (Redis) - LIMIT orders only
9. Push job to BullMQ queue
   - LIMIT orders: priority=10 (normal)
   - MARKET orders: priority=1 (high)
10. Return 202 Accepted with order_id

#### 4.3.2 Orderbook Service (Redis)

```typescript
// orderbook.service.ts
class OrderbookService {
  async addOrder(order: Order): Promise<void>;
  async removeOrder(orderId: number, pair: string, isBid: boolean): Promise<void>;
  async getBestBid(pair: string): Promise<{ price: number; order_id: number } | null>;
  async getBestAsk(pair: string): Promise<{ price: number; order_id: number } | null>;
  async getOrderBookDepth(pair: string, levels: number): Promise<OrderBookDto>;
}
```

**Redis Operations:**
```typescript
// Add BUY order to order book
await this.redis.zadd('orderbook:BTC/USD:bid', -price, orderId);

// Add SELL order
await this.redis.zadd('orderbook:BTC/USD:ask', price, orderId);

// Get best bid (highest price)
const bestBid = await this.redis.zrange('orderbook:BTC/USD:bid', 0, 0, 'WITHSCORES');

// Get best ask (lowest price)
const bestAsk = await this.redis.zrange('orderbook:BTC/USD:ask', 0, 0, 'WITHSCORES');
```

#### 4.3.3 Matching Worker (BullMQ)

```typescript
// matching.worker.ts
@Processor('matching')
class MatchingProcessor {
  @Process('processOrder')
  async handleOrderMatching(job: Job<{ order_id: number }>): Promise<void>;

  private async matchOrder(order: Order): Promise<Trade[]>;
  private async findMatches(order: Order): Promise<Order[]>;
  private async executeTrade(buyOrder: Order, sellOrder: Order, quantity: number): Promise<Trade>;
}
```

**Matching Algorithm (LIMIT & MARKET):**
```typescript
async matchOrder(order: Order): Promise<Trade[]> {
  const trades: Trade[] = [];

  // Get opposing orders from Redis
  const opposingOrders = order.is_bid
    ? await this.orderbook.getAsks(order.pair_name)
    : await this.orderbook.getBids(order.pair_name);

  for (const opposingOrder of opposingOrders) {
    // Price compatibility check
    if (order.type === 'LIMIT') {
      // LIMIT: strict price check
      if (order.is_bid && order.price < opposingOrder.price) break;
      if (!order.is_bid && order.price > opposingOrder.price) break;
    }
    // MARKET: accept ANY price (no break condition)

    // Calculate match quantity
    const matchQty = Math.min(order.remaining, opposingOrder.remaining);

    // Execute trade at opposing order's price
    const trade = await this.executeTrade(
      order.is_bid ? order : opposingOrder,
      order.is_bid ? opposingOrder : order,
      matchQty,
      opposingOrder.price // MARKET orders take market price
    );

    trades.push(trade);

    // Update order quantities
    order.remaining -= matchQty;
    opposingOrder.remaining -= matchQty;

    // If order fully filled, break
    if (order.remaining === 0) break;
  }

  // For MARKET orders: check if partially filled
  if (order.type === 'MARKET' && order.remaining > 0) {
    this.logger.warn(`Market order ${order.id} insufficient liquidity`);
    // Mark as PARTLY_FILLED or FAILED based on policy
  }

  return trades;
}
```

#### 4.3.4 Settlement Service

```typescript
// settlement.service.ts
class SettlementService {
  async settleTrade(trade: Trade): Promise<void>;
  private async transferBalances(trade: Trade): Promise<void>;
  private async deductFees(trade: Trade): Promise<void>;
  private async unlockBalances(trade: Trade): Promise<void>;
  private async updateOrderStatus(orderId: number, filled: number, remaining: number): Promise<void>;
}
```

**Settlement Transaction:**
```typescript
async settleTrade(trade: Trade): Promise<void> {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction('SERIALIZABLE');

  try {
    // 1. Lock both account rows
    await queryRunner.query(
      'SELECT * FROM account WHERE id IN ($1, $2) FOR UPDATE',
      [trade.bid_account_id, trade.ask_account_id]
    );

    // 2. Validate account statuses
    const buyerAccount = await queryRunner.query(
      'SELECT trading_status FROM account WHERE id = $1',
      [trade.bid_account_id]
    );
    if (buyerAccount.trading_status !== 'ACTIVE') {
      throw new Error('Buyer account not active');
    }

    // 3. Transfer coins to buyer
    await queryRunner.query(
      'UPDATE account_coin SET available = available + $1 WHERE account_id = $2 AND coin_name = $3',
      [trade.quantity, trade.bid_account_id, 'BTC']
    );

    // 4. Transfer cash to seller (minus fee)
    const sellerReceives = trade.value - trade.seller_fee;
    await queryRunner.query(
      'UPDATE account_cash SET available = available + $1 WHERE account_id = $2',
      [sellerReceives, trade.ask_account_id]
    );

    // 5. Deduct fees
    await queryRunner.query(
      'UPDATE account_cash SET locked = locked - $1 WHERE account_id = $2',
      [trade.buyer_fee, trade.bid_account_id]
    );

    // 6. Unlock buyer's locked cash
    const buyerLocked = trade.quantity * trade.price + trade.buyer_fee;
    await queryRunner.query(
      'UPDATE account_cash SET locked = locked - $1 WHERE account_id = $2',
      [buyerLocked, trade.bid_account_id]
    );

    // 7. Create transaction records
    await this.transactionService.logTransaction({
      account_id: trade.bid_account_id,
      transaction_type: 'TRADE',
      asset_name: 'BTC',
      amount: trade.quantity,
      reference_id: trade.id,
      reference_type: 'TRADE'
    });

    // 8. Update order & trade status
    await queryRunner.query(
      'UPDATE matching_order SET filled = filled + $1, remaining = remaining - $1, status = $2 WHERE id = $3',
      [trade.quantity, trade.remaining === 0 ? 'COMPLETED' : 'PARTLY_FILLED', trade.bid_order_id]
    );

    await queryRunner.query(
      'UPDATE matching_trade SET settlement_status = $1, settlement_time = NOW() WHERE id = $2',
      ['CONFIRMED', trade.id]
    );

    // 9. Commit transaction
    await queryRunner.commitTransaction();

    // 10. Publish events (outside transaction)
    await this.eventEmitter.emit('trade.executed', trade);

  } catch (error) {
    await queryRunner.rollbackTransaction();

    // Mark trade as failed
    await queryRunner.query(
      'UPDATE matching_trade SET settlement_status = $1 WHERE id = $2',
      ['FAILED', trade.id]
    );

    this.logger.error(`Settlement failed for trade ${trade.id}:`, error);
    throw error;

  } finally {
    await queryRunner.release();
  }
}
```

---

### 4.4 Ticker Module

**Responsibilities:**
- Calculate current ticker data (last price, 24h stats)
- Generate candlesticks (1m, 5m, 1h, 1d)
- Update ticker on each trade
- Provide market data API endpoints

**Key Methods:**

```typescript
// ticker.service.ts
class TickerService {
  async updateTicker(trade: Trade): Promise<void>;
  async getTicker(pair: string): Promise<TickerDto>;
  async getAllTickers(): Promise<TickerDto[]>;
  private async calculate24hStats(pair: string): Promise<{ open: number; high: number; low: number; volume: number }>;
}

// candle.service.ts
class CandleService {
  async updateCandle(trade: Trade): Promise<void>;
  async getCandles(pair: string, timeframe: '1m' | '5m' | '1h' | '1d', limit: number): Promise<CandleDto[]>;
  private async upsertCandle(trade: Trade, timeframe: string): Promise<void>;
}
```

**Ticker Update Flow:**
```typescript
async updateTicker(trade: Trade): Promise<void> {
  const stats = await this.calculate24hStats(trade.pair_name);

  await this.db.query(`
    INSERT INTO ticker (pair_name, last_price, open_price, high_price, low_price, volume, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
    ON CONFLICT (pair_name) DO UPDATE SET
      last_price = $2,
      high_price = GREATEST(ticker.high_price, $4),
      low_price = LEAST(ticker.low_price, $5),
      volume = ticker.volume + $6,
      updated_at = NOW()
  `, [trade.pair_name, trade.price, stats.open, stats.high, stats.low, trade.quantity]);

  // Cache in Redis
  await this.redis.hset(`ticker:${trade.pair_name}`, {
    last_price: trade.price,
    volume: stats.volume,
    updated_at: Date.now()
  });
  await this.redis.expire(`ticker:${trade.pair_name}`, 60);

  // Publish to WebSocket
  await this.eventEmitter.emit('ticker.update', {
    pair: trade.pair_name,
    price: trade.price,
    volume: stats.volume
  });
}
```

---

## 5. API Design

### 5.1 Authentication Endpoints

#### POST /auth/register
**Request:**
```json
{
  "username": "trader1",
  "email": "trader1@example.com",
  "password": "SecurePass123!"
}
```

**Response (201 Created):**
```json
{
  "user_id": 123,
  "username": "trader1",
  "email": "trader1@example.com",
  "created_at": "2026-03-12T10:00:00Z"
}
```

**Errors:**
- 409 Conflict: Email or username already exists
- 400 Bad Request: Validation errors

---

#### POST /auth/login
**Request:**
```json
{
  "username": "trader1",
  "password": "SecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "refresh_token_here",
  "expires_in": 86400,
  "user": {
    "id": 123,
    "username": "trader1",
    "email": "trader1@example.com"
  }
}
```

**Errors:**
- 401 Unauthorized: Invalid credentials
- 403 Forbidden: Account suspended

---

### 5.2 Account Endpoints

#### GET /account/balance
**Headers:** `Authorization: Bearer {access_token}`

**Response (200 OK):**
```json
{
  "account_id": 456,
  "total_balance": 150000.00,
  "available_balance": 100000.00,
  "locked_balance": 50000.00,
  "coins": [
    {
      "coin_name": "BTC",
      "available": 0.5,
      "locked": 0.1,
      "frozen": 0,
      "total": 0.6
    }
  ],
  "cash": {
    "currency": "USD",
    "available": 100000.00,
    "locked": 50000.00,
    "total": 150000.00
  }
}
```

---

#### POST /account/deposit
**Request:**
```json
{
  "asset_name": "USD",
  "amount": 10000.00,
  "description": "Bank transfer"
}
```

**Response (201 Created):**
```json
{
  "transaction_id": 789,
  "account_id": 456,
  "asset_name": "USD",
  "amount": 10000.00,
  "balance_before": 100000.00,
  "balance_after": 110000.00,
  "created_at": "2026-03-12T10:30:00Z"
}
```

---

#### POST /account/withdraw
**Request:**
```json
{
  "asset_name": "BTC",
  "amount": 0.1,
  "destination": "bc1q..."
}
```

**Response (201 Created):**
```json
{
  "transaction_id": 790,
  "account_id": 456,
  "asset_name": "BTC",
  "amount": 0.1,
  "balance_before": 0.6,
  "balance_after": 0.5,
  "status": "PENDING",
  "created_at": "2026-03-12T10:35:00Z"
}
```

**Errors:**
- 400 Bad Request: Insufficient balance
- 403 Forbidden: Withdrawal limits exceeded

---

### 5.3 Order Endpoints

#### POST /orders
**LIMIT Order Request:**
```json
{
  "pair": "BTC/USD",
  "side": "BUY",
  "type": "LIMIT",
  "price": 50000.00,
  "amount": 1.0,
  "validity": "GTC"
}
```

**MARKET Order Request:**
```json
{
  "pair": "BTC/USD",
  "side": "BUY",
  "type": "MARKET",
  "amount": 1.0,
  "validity": "IOC"
}
```
*Note: MARKET orders do NOT require `price` field*

**Response (202 Accepted):**
```json
{
  "order_id": 123456,
  "status": "PENDING",
  "pair": "BTC/USD",
  "side": "BUY",
  "type": "LIMIT",
  "price": 50000.00,
  "amount": 1.0,
  "filled": 0,
  "remaining": 1.0,
  "placed_at": "2026-03-12T11:00:00Z",
  "message": "Order received and queued for matching"
}
```

**MARKET Order Response (202 Accepted):**
```json
{
  "order_id": 123457,
  "status": "PENDING",
  "pair": "BTC/USD",
  "side": "BUY",
  "type": "MARKET",
  "amount": 1.0,
  "filled": 0,
  "remaining": 1.0,
  "estimated_execution": "< 500ms",
  "placed_at": "2026-03-12T11:00:00Z",
  "message": "Market order queued for immediate execution (high priority)"
}
```

**Errors:**
- 400 Bad Request: Insufficient balance, invalid parameters
- 403 Forbidden: Account suspended
- 503 Service Unavailable: Trading halted for pair

---

#### GET /orders/:id
**Response (200 OK):**
```json
{
  "order_id": 123456,
  "account_id": 456,
  "pair": "BTC/USD",
  "side": "BUY",
  "type": "LIMIT",
  "price": 50000.00,
  "amount": 1.0,
  "filled": 0.5,
  "remaining": 0.5,
  "status": "PARTLY_FILLED",
  "placed_at": "2026-03-12T11:00:00Z",
  "updated_at": "2026-03-12T11:00:05Z"
}
```

---

#### DELETE /orders/:id
**Response (200 OK):**
```json
{
  "order_id": 123456,
  "status": "CANCELED",
  "canceled_quantity": 0.5,
  "filled_quantity": 0.5,
  "canceled_at": "2026-03-12T11:01:00Z"
}
```

**Errors:**
- 409 Conflict: Order already completed or canceled
- 404 Not Found: Order not found

---

#### GET /orders
**Query Params:** `?status=PENDING&limit=50&offset=0`

**Response (200 OK):**
```json
{
  "orders": [
    {
      "order_id": 123456,
      "pair": "BTC/USD",
      "side": "BUY",
      "price": 50000.00,
      "amount": 1.0,
      "filled": 0.5,
      "status": "PARTLY_FILLED",
      "placed_at": "2026-03-12T11:00:00Z"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

---

### 5.4 Market Data Endpoints

#### GET /ticker/:pair
**Example:** `GET /ticker/BTC-USD`

**Response (200 OK):**
```json
{
  "pair": "BTC/USD",
  "last_price": 50123.45,
  "open_price": 49500.00,
  "high_price": 50500.00,
  "low_price": 49000.00,
  "volume": 1234.56,
  "bid_price": 50120.00,
  "bid_qty": 2.5,
  "ask_price": 50130.00,
  "ask_qty": 3.2,
  "change_percent": 1.26,
  "updated_at": "2026-03-12T11:30:45Z"
}
```

---

#### GET /ticker
**Response (200 OK):**
```json
{
  "tickers": [
    {
      "pair": "BTC/USD",
      "last_price": 50123.45,
      "volume": 1234.56,
      "change_percent": 1.26
    },
    {
      "pair": "ETH/USD",
      "last_price": 3000.00,
      "volume": 5678.90,
      "change_percent": -0.5
    }
  ]
}
```

---

#### GET /candles/:pair/:timeframe
**Example:** `GET /candles/BTC-USD/1h?limit=24`

**Response (200 OK):**
```json
{
  "pair": "BTC/USD",
  "timeframe": "1h",
  "candles": [
    {
      "open_time": "2026-03-12T10:00:00Z",
      "close_time": "2026-03-12T11:00:00Z",
      "open": 49800.00,
      "high": 50200.00,
      "low": 49600.00,
      "close": 50123.45,
      "volume": 234.56,
      "trades": 145
    }
  ]
}
```

---

## 6. Real-time Architecture (WebSocket)

### 6.1 WebSocket Events

**Socket.io Namespaces:**
- `/orders` - Order-related events
- `/ticker` - Ticker updates

**Authentication:**
```typescript
// Client connects with JWT token
const socket = io('http://localhost:3001/orders', {
  auth: {
    token: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  }
});
```

**Server-side validation:**
```typescript
@WebSocketGateway({
  namespace: '/orders',
  cors: { origin: '*' }
})
export class OrderGateway {
  @SubscribeMessage('subscribe')
  handleSubscribe(@ConnectedSocket() client: Socket, @MessageBody() data: { pair: string }) {
    // Verify JWT
    const token = client.handshake.auth.token;
    const user = this.jwtService.verify(token);

    // Join room for specific pair
    client.join(`orders:${data.pair}`);

    return { success: true, message: `Subscribed to ${data.pair} orders` };
  }
}
```

### 6.2 Event Types

#### order.matched
**Triggered:** When user's order is matched
**Payload:**
```json
{
  "event": "order.matched",
  "data": {
    "order_id": 123456,
    "pair": "BTC/USD",
    "matched_quantity": 0.5,
    "remaining_quantity": 0.5,
    "status": "PARTLY_FILLED",
    "trade_id": 789,
    "matched_at": "2026-03-12T11:00:05Z"
  }
}
```

#### order.filled
**Triggered:** When order is fully filled
**Payload:**
```json
{
  "event": "order.filled",
  "data": {
    "order_id": 123456,
    "pair": "BTC/USD",
    "filled_quantity": 1.0,
    "status": "COMPLETED",
    "completed_at": "2026-03-12T11:00:10Z"
  }
}
```

#### order.canceled
**Triggered:** When order is canceled
**Payload:**
```json
{
  "event": "order.canceled",
  "data": {
    "order_id": 123456,
    "pair": "BTC/USD",
    "canceled_quantity": 0.5,
    "canceled_at": "2026-03-12T11:01:00Z"
  }
}
```

#### trade.executed
**Triggered:** When a trade is executed (public event)
**Payload:**
```json
{
  "event": "trade.executed",
  "data": {
    "trade_id": 789,
    "pair": "BTC/USD",
    "price": 50000.00,
    "quantity": 0.5,
    "executed_at": "2026-03-12T11:00:05Z"
  }
}
```

#### ticker.update
**Triggered:** Real-time price updates
**Payload:**
```json
{
  "event": "ticker.update",
  "data": {
    "pair": "BTC/USD",
    "last_price": 50123.45,
    "volume": 1234.56,
    "change_percent": 1.26,
    "updated_at": "2026-03-12T11:30:45Z"
  }
}
```

### 6.3 Implementation Example

```typescript
// order.gateway.ts
@WebSocketGateway({ namespace: '/orders' })
export class OrderGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    private jwtService: JwtService,
    private eventEmitter: EventEmitter2
  ) {
    // Listen to internal events
    this.eventEmitter.on('order.matched', (data) => this.handleOrderMatched(data));
    this.eventEmitter.on('trade.executed', (data) => this.handleTradeExecuted(data));
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token?.replace('Bearer ', '');
      const user = await this.jwtService.verify(token);
      client.data.user = user;

      // Join user-specific room
      client.join(`user:${user.id}`);

      this.logger.log(`Client connected: ${client.id} (user: ${user.id})`);
    } catch (error) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe:pair')
  handleSubscribePair(@ConnectedSocket() client: Socket, @MessageBody() data: { pair: string }) {
    client.join(`pair:${data.pair}`);
    return { success: true, message: `Subscribed to ${data.pair}` };
  }

  private handleOrderMatched(data: any) {
    // Send to specific user
    this.server.to(`user:${data.account_id}`).emit('order.matched', data);
  }

  private handleTradeExecuted(data: any) {
    // Broadcast to all subscribers of this pair
    this.server.to(`pair:${data.pair}`).emit('trade.executed', data);
  }
}
```

---

## 7. Background Jobs (BullMQ)

### 7.1 Queue Configuration

```typescript
// config/bullmq.config.ts
export const bullmqConfig = {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: {
      count: 1000, // Keep last 1000 completed jobs
      age: 24 * 3600 // 24 hours
    },
    removeOnFail: {
      count: 5000 // Keep last 5000 failed jobs
    },
    // Priority queue enabled
    // Lower number = higher priority
    // MARKET orders: priority=1
    // LIMIT orders: priority=10
    priority: 10 // Default priority
  }
};
```

### 7.2 Job Definitions

#### Job: processOrder
**Trigger:** After order is placed
**Purpose:** Match order against order book

**Job Data:**
```typescript
interface ProcessOrderJob {
  order_id: number;
  account_id: number;
  pair: string;
  type: 'LIMIT' | 'MARKET'; // Order type
  is_bid: boolean;
  price: number | null; // null for MARKET orders
  amount: number;
}
```

**Job Processor:**
```typescript
@Processor('matching')
export class MatchingProcessor {
  @Process('processOrder')
  async handleOrderMatching(job: Job<ProcessOrderJob>): Promise<void> {
    const { order_id, type } = job.data;

    this.logger.log(
      `Processing ${type} order ${order_id} (priority: ${job.opts.priority}, attempt ${job.attemptsMade + 1})`
    );

    try {
      // 1. Fetch order from DB
      const order = await this.orderService.getOrderById(order_id);

      // 2. Validate order status
      if (order.status !== 'PENDING' && order.status !== 'PARTLY_FILLED') {
        this.logger.warn(`Order ${order_id} is ${order.status}, skipping matching`);
        return;
      }

      // 3. Find matches
      const trades = await this.matchingService.matchOrder(order);

      // 4. Settle each trade
      for (const trade of trades) {
        await this.settlementService.settleTrade(trade);
      }

      // 5. Update order status
      if (order.remaining === 0) {
        await this.orderService.updateOrderStatus(order_id, 'COMPLETED');
      } else if (order.type === 'MARKET' && order.remaining > 0) {
        // MARKET order with insufficient liquidity
        this.logger.warn(`Market order ${order_id} only filled ${order.filled}/${order.amount}`);
        await this.orderService.updateOrderStatus(order_id, 'PARTLY_FILLED');
        // Unlock remaining balance
        await this.balanceService.unlockRemaining(order_id, order.remaining);
      } else {
        await this.orderService.updateOrderStatus(order_id, 'PARTLY_FILLED');
      }

      this.logger.log(
        `${type} order ${order_id} processed successfully. Trades: ${trades.length}, Filled: ${order.filled}/${order.amount}`
      );

    } catch (error) {
      this.logger.error(`Error processing order ${order_id}:`, error);
      throw error; // Will trigger retry
    }
  }
}
```

### 7.3 Job Failure Handling

**After 3 failed attempts:**
- Job moves to Dead Letter Queue
- Admin notification (future)
- Manual intervention required

**Failure Scenarios:**
- Database connection timeout → Retry
- Settlement failure (account frozen) → Mark order as FAILED, no retry
- Redis connection failure → Retry

---

## 8. Error Handling & Logging

### 8.1 Global Exception Filter

```typescript
// common/filters/http-exception.filter.ts
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'UnknownError';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message = typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as any).message;
      error = exception.name;
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      error,
      message
    };

    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${message}`,
      exception instanceof Error ? exception.stack : ''
    );

    response.status(status).json(errorResponse);
  }
}
```

### 8.2 Winston Logger Configuration

```typescript
// config/logger.config.ts
export const loggerConfig = {
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
      )
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ]
};
```

### 8.3 Logging Conventions

**Log Levels:**
- `error`: Settlement failures, DB errors, critical system errors
- `warn`: Order validation failures, insufficient balance, canceled orders
- `info`: Order placement, trade execution, user registration
- `debug`: Matching algorithm details, Redis operations (dev only)

**Log Format:**
```
2026-03-12T11:00:00.000Z [info]: Order placed | order_id=123456 account_id=456 pair=BTC/USD price=50000 amount=1.0
2026-03-12T11:00:05.000Z [info]: Trade executed | trade_id=789 bid_order=123456 ask_order=123457 price=50000 qty=0.5
2026-03-12T11:00:05.500Z [error]: Settlement failed | trade_id=789 error="Buyer account frozen"
```

---

## 9. Security Considerations

### 9.1 Authentication & Authorization

**JWT Configuration:**
- Secret: Stored in environment variable (min 256 bits)
- Expiration: 24 hours (access token)
- Refresh token: 7 days
- Algorithm: HS256

**Password Security:**
- Bcrypt hashing with 12 rounds
- Minimum password requirements:
  - 8 characters
  - 1 uppercase, 1 lowercase
  - 1 number, 1 special character

### 9.2 API Rate Limiting

```typescript
// main.ts
app.use(
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: 'Too many requests from this IP'
  })
);

// Stricter limits for sensitive endpoints
app.use('/auth/login',
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 login attempts
    message: 'Too many login attempts, please try again later'
  })
);
```

### 9.3 Input Validation

**All DTOs use class-validator:**
```typescript
// place-order.dto.ts
export class PlaceOrderDto {
  @IsString()
  @IsIn(['BTC/USD', 'ETH/USD'])
  pair: string;

  @IsString()
  @IsIn(['BUY', 'SELL'])
  side: string;

  @IsNumber()
  @Min(0.00000001)
  @Max(1000000)
  price: number;

  @IsNumber()
  @Min(0.00000001)
  @Max(1000)
  amount: number;
}
```

### 9.4 SQL Injection Prevention

- Use parameterized queries ONLY
- Never string concatenation for SQL
- Input sanitization via class-validator

### 9.5 CORS Configuration

```typescript
// main.ts
app.enableCors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
});
```

---

## 10. Testing Strategy

### 10.1 Unit Tests

**Coverage Target:** >80% for core modules

**Modules to Test:**
- ✅ MatchingProcessor (matching algorithm)
- ✅ SettlementService (trade settlement)
- ✅ BalanceService (lock/unlock logic)
- ❌ AccountService (basic CRUD, skip)
- ❌ TickerService (simple aggregation, skip)

**Example Test:**
```typescript
// matching.processor.spec.ts
describe('MatchingProcessor', () => {
  let processor: MatchingProcessor;
  let orderService: jest.Mocked<OrderService>;
  let orderbookService: jest.Mocked<OrderbookService>;
  let settlementService: jest.Mocked<SettlementService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MatchingProcessor,
        {
          provide: OrderService,
          useValue: { getOrderById: jest.fn(), updateOrderStatus: jest.fn() }
        },
        {
          provide: OrderbookService,
          useValue: { getBids: jest.fn(), getAsks: jest.fn() }
        },
        {
          provide: SettlementService,
          useValue: { settleTrade: jest.fn() }
        }
      ]
    }).compile();

    processor = module.get(MatchingProcessor);
    orderService = module.get(OrderService);
    orderbookService = module.get(OrderbookService);
    settlementService = module.get(SettlementService);
  });

  describe('handleOrderMatching', () => {
    it('should match buy order with sell order at same price', async () => {
      const buyOrder = {
        id: 1,
        is_bid: true,
        price: 50000,
        amount: 1.0,
        remaining: 1.0,
        status: 'PENDING'
      };

      const sellOrder = {
        id: 2,
        is_bid: false,
        price: 50000,
        amount: 1.0,
        remaining: 1.0,
        status: 'PENDING'
      };

      orderService.getOrderById.mockResolvedValue(buyOrder);
      orderbookService.getAsks.mockResolvedValue([sellOrder]);

      const job = {
        data: { order_id: 1 },
        attemptsMade: 0
      } as any;

      await processor.handleOrderMatching(job);

      expect(settlementService.settleTrade).toHaveBeenCalledTimes(1);
      expect(orderService.updateOrderStatus).toHaveBeenCalledWith(1, 'COMPLETED');
    });

    it('should handle partial fills correctly', async () => {
      const buyOrder = {
        id: 1,
        is_bid: true,
        price: 50000,
        amount: 1.5,
        remaining: 1.5,
        status: 'PENDING'
      };

      const sellOrder = {
        id: 2,
        is_bid: false,
        price: 50000,
        amount: 1.0,
        remaining: 1.0,
        status: 'PENDING'
      };

      orderService.getOrderById.mockResolvedValue(buyOrder);
      orderbookService.getAsks.mockResolvedValue([sellOrder]);

      const job = {
        data: { order_id: 1 },
        attemptsMade: 0
      } as any;

      await processor.handleOrderMatching(job);

      expect(settlementService.settleTrade).toHaveBeenCalledTimes(1);
      expect(settlementService.settleTrade).toHaveBeenCalledWith(
        expect.objectContaining({ quantity: 1.0 })
      );
      expect(orderService.updateOrderStatus).toHaveBeenCalledWith(1, 'PARTLY_FILLED');
    });

    it('should not match if price incompatible', async () => {
      const buyOrder = {
        id: 1,
        is_bid: true,
        price: 49000,
        amount: 1.0,
        remaining: 1.0,
        status: 'PENDING'
      };

      const sellOrder = {
        id: 2,
        is_bid: false,
        price: 50000,
        amount: 1.0,
        remaining: 1.0,
        status: 'PENDING'
      };

      orderService.getOrderById.mockResolvedValue(buyOrder);
      orderbookService.getAsks.mockResolvedValue([sellOrder]);

      const job = {
        data: { order_id: 1 },
        attemptsMade: 0
      } as any;

      await processor.handleOrderMatching(job);

      expect(settlementService.settleTrade).not.toHaveBeenCalled();
      expect(orderService.updateOrderStatus).toHaveBeenCalledWith(1, 'PENDING');
    });
  });
});
```

### 10.2 Integration Testing (Manual)

**Test Scenarios:**

1. **Happy Path: Place order → Match → Settle**
   - Create 2 test accounts (buyer, seller)
   - Buyer places BUY order (1 BTC @ $50,000)
   - Seller places SELL order (1 BTC @ $50,000)
   - Verify: Trade executed, balances updated, WebSocket events sent

2. **Partial Fill Scenario**
   - Buyer places BUY order (1.5 BTC @ $50,000)
   - Seller places SELL order (1.0 BTC @ $50,000)
   - Verify: Trade for 1 BTC, buyer order remains with 0.5 BTC remaining

3. **Cancel Order Before Match**
   - Place order
   - Cancel immediately
   - Verify: Balance unlocked, order status CANCELED

4. **Insufficient Balance**
   - Account has $10,000
   - Try to place order for 1 BTC @ $50,000
   - Verify: 400 Bad Request error

5. **Settlement Failure (Account Frozen)**
   - Place order, match found
   - Admin freezes buyer account before settlement
   - Verify: Trade status FAILED, balances unchanged

**Testing Tools:**
- Postman collection with all endpoints
- wscat for WebSocket testing
- pgAdmin for database verification

---

## 11. Database Seeding

### 11.1 Seed Data Requirements

**Purpose:** Initialize database with test data for development & testing

**Seed Data Categories:**

#### 11.1.1 Trading Pairs Configuration
```sql
-- apps/api/src/database/seeds/001_pairs.sql
INSERT INTO pair (id, name, base_coin, quote_currency, min_order_amount, max_order_amount, tick_size, taker_fee_rate, maker_fee_rate, is_trading_active)
VALUES
  (1, 'BTC/USD', 'BTC', 'USD', 0.001, 100, 0.01, 0.001, 0.0005, true),
  (2, 'ETH/USD', 'ETH', 'USD', 0.01, 1000, 0.01, 0.001, 0.0005, true);
```

#### 11.1.2 Test Users
```sql
-- apps/api/src/database/seeds/002_test_users.sql
-- Password: Test@1234 (bcrypt hashed)
INSERT INTO "user" (id, username, email, password_hash, is_active, created_at, updated_at)
VALUES
  (1, 'trader1', 'trader1@test.com', '$2b$12$KIXqJ9Z8W5Y7X6Q4N3M2L.O1P2Q3R4S5T6U7V8W9X0Y1Z2A3B4C5D', true, NOW(), NOW()),
  (2, 'trader2', 'trader2@test.com', '$2b$12$KIXqJ9Z8W5Y7X6Q4N3M2L.O1P2Q3R4S5T6U7V8W9X0Y1Z2A3B4C5D', true, NOW(), NOW()),
  (3, 'trader3', 'trader3@test.com', '$2b$12$KIXqJ9Z8W5Y7X6Q4N3M2L.O1P2Q3R4S5T6U7V8W9X0Y1Z2A3B4C5D', true, NOW(), NOW());
```

#### 11.1.3 Test Accounts with Balances
```sql
-- apps/api/src/database/seeds/003_test_accounts.sql
-- Create trading accounts
INSERT INTO account (id, user_id, account_type, trading_status, kyc_level, total_balance, available_balance, locked_balance)
VALUES
  (1, 1, 'INDIVIDUAL', 'ACTIVE', 1, 100000, 100000, 0),
  (2, 2, 'INDIVIDUAL', 'ACTIVE', 1, 100000, 100000, 0),
  (3, 3, 'INDIVIDUAL', 'ACTIVE', 1, 50000, 50000, 0);

-- Initialize coin balances (BTC, ETH)
INSERT INTO account_coin (account_id, coin_name, available, locked, frozen, total)
VALUES
  (1, 'BTC', 10, 0, 0, 10),
  (1, 'ETH', 50, 0, 0, 50),
  (2, 'BTC', 10, 0, 0, 10),
  (2, 'ETH', 50, 0, 0, 50),
  (3, 'BTC', 5, 0, 0, 5),
  (3, 'ETH', 20, 0, 0, 20);

-- Initialize cash balances (USD)
INSERT INTO account_cash (account_id, currency_name, available, locked, total)
VALUES
  (1, 'USD', 100000, 0, 100000),
  (2, 'USD', 100000, 0, 100000),
  (3, 'USD', 50000, 0, 50000);
```

#### 11.1.4 Initial Ticker Data
```sql
-- apps/api/src/database/seeds/004_initial_tickers.sql
INSERT INTO ticker (pair_name, last_price, open_price, high_price, low_price, volume, bid_price, bid_qty, ask_price, ask_qty, change_percent, updated_at)
VALUES
  ('BTC/USD', 50000, 49500, 50500, 49000, 0, 49950, 0, 50050, 0, 1.01, NOW()),
  ('ETH/USD', 3000, 2950, 3050, 2900, 0, 2995, 0, 3005, 0, 1.69, NOW());
```

### 11.2 Seed Execution Scripts

#### 11.2.1 Development Seed Script
```typescript
// apps/api/src/database/seeders/run-seeds.ts
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

async function runSeeds() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    username: process.env.DB_USER || 'trading',
    password: process.env.DB_PASSWORD || 'trading_dev',
    database: process.env.DB_NAME || 'tradingengine'
  });

  await dataSource.initialize();

  const seedFiles = [
    '001_pairs.sql',
    '002_test_users.sql',
    '003_test_accounts.sql',
    '004_initial_tickers.sql'
  ];

  for (const file of seedFiles) {
    console.log(`Running seed: ${file}`);
    const sql = fs.readFileSync(
      path.join(__dirname, '../seeds', file),
      'utf8'
    );
    await dataSource.query(sql);
    console.log(`✓ ${file} completed`);
  }

  await dataSource.destroy();
  console.log('All seeds completed!');
}

runSeeds().catch(console.error);
```

#### 11.2.2 Package.json Scripts
```json
{
  "scripts": {
    "db:seed": "ts-node src/database/seeders/run-seeds.ts",
    "db:seed:reset": "npm run db:drop && npm run db:migrate && npm run db:seed",
    "db:drop": "ts-node src/database/seeders/drop-database.ts"
  }
}
```

### 11.3 Seed Data for Testing

**Test Scenarios Covered:**

1. ✅ **User Login**: 3 test users ready
2. ✅ **Order Placement**: Accounts with sufficient balances
3. ✅ **Matching**: Both buyers and sellers available
4. ✅ **Ticker Display**: Initial price data available
5. ✅ **Balance Queries**: Coin & cash balances initialized

**Usage:**
```bash
# Reset database and seed
npm run db:seed:reset

# Seed only (without dropping)
npm run db:seed
```

---

## 12. Implementation Plan

### 11.1 Phase 1: Foundation (Week 1)

**Goal:** Set up project infrastructure

- [x] Project setup (NestJS in `apps/api`)
- [ ] Docker Compose (PostgreSQL + Redis)
- [ ] Database schema migration scripts
- [ ] Seed data (test users, pairs)
- [ ] Winston logger configuration
- [ ] Environment variables setup
- [ ] Health check endpoint

**Deliverable:** Running API server with `/health` endpoint

---

### 11.2 Phase 2: Authentication & Account (Week 1-2)

**Goal:** User management working

- [ ] Auth Module
  - [ ] User registration
  - [ ] User login (JWT)
  - [ ] JWT strategy & guards
- [ ] Account Module
  - [ ] Account creation
  - [ ] Balance query endpoints
  - [ ] Deposit endpoint
  - [ ] Withdrawal endpoint
- [ ] Balance Service (lock/unlock logic)
- [ ] Transaction Service (audit trail)

**Deliverable:** Users can register, login, create account, deposit/withdraw

---

### 11.3 Phase 3: Order Management (Week 2-3)

**Goal:** Order placement & Redis order book working

- [ ] Order Service
  - [ ] Order validation
  - [ ] Place order endpoint
  - [ ] Cancel order endpoint
  - [ ] Get order(s) endpoint
- [ ] Orderbook Service (Redis)
  - [ ] Add order to sorted set
  - [ ] Remove order from sorted set
  - [ ] Get best bid/ask
  - [ ] Get order book depth
- [ ] Balance locking integration

**Deliverable:** Orders can be placed, appear in order book, can be canceled

---

### 11.4 Phase 4: Matching Engine (Week 3-4)

**Goal:** Async matching working

- [ ] BullMQ setup
  - [ ] Queue configuration
  - [ ] Worker setup
- [ ] Matching Processor
  - [ ] Match algorithm (price-time priority)
  - [ ] Handle partial fills
  - [ ] Handle multiple matches
- [ ] Settlement Service
  - [ ] Database transaction logic
  - [ ] Balance transfers
  - [ ] Fee deductions
  - [ ] Error handling & rollback
- [ ] Unit tests for matching & settlement

**Deliverable:** Orders match automatically, trades execute, balances update

---

### 11.5 Phase 5: Market Data (Week 4)

**Goal:** Ticker & candlestick data

- [ ] Ticker Service
  - [ ] Update ticker on trade
  - [ ] Calculate 24h stats
  - [ ] Get ticker endpoint
- [ ] Candle Service
  - [ ] Upsert candles on trade
  - [ ] Get candles endpoint
- [ ] Redis caching for tickers

**Deliverable:** Market data endpoints returning real-time data

---

### 11.6 Phase 6: WebSocket (Week 4-5)

**Goal:** Real-time notifications

- [ ] WebSocket Gateway setup
- [ ] Order events (matched, filled, canceled)
- [ ] Ticker updates
- [ ] JWT authentication for WebSocket
- [ ] Room-based subscriptions

**Deliverable:** Real-time events pushed to clients

---

### 11.7 Phase 7: Testing & Documentation (Week 5)

**Goal:** Production-ready

- [ ] Unit tests (>80% coverage for core modules)
- [ ] Postman collection (all endpoints)
- [ ] Manual testing (all scenarios)
- [ ] API documentation (Swagger)
- [ ] Deployment guide
- [ ] Performance testing (basic)

**Deliverable:** Fully functional POC ready for demo

---

## 12. Next Steps

### 12.1 Immediate Actions

1. **Setup Development Environment**
   ```bash
   cd apps/api
   docker-compose up -d
   npm install ioredis bullmq winston
   ```

2. **Create Database Schema**
   - Write migration files in `apps/api/src/database/migrations/`
   - Run migrations: `npm run db:migrate`

3. **Start with Auth Module**
   - Generate module: `nest g module auth`
   - Generate service: `nest g service auth`
   - Generate controller: `nest g controller auth`

### 12.2 Critical Path

```
Auth Module → Account Module → Order Module → Matching Engine → Settlement → Market Data → WebSocket
```

Focus on **happy path first**, edge cases later.

### 12.3 Success Criteria

- [ ] User can register, login, create account
- [ ] User can deposit funds
- [ ] User can place LIMIT order
- [ ] Order appears in Redis order book
- [ ] Matching engine finds opposing order
- [ ] Trade is executed and settled
- [ ] Balances updated correctly
- [ ] WebSocket notification sent
- [ ] Ticker data reflects latest trade
- [ ] All unit tests pass (>80% coverage)

---

## 📚 References

- [POC_OVERVIEW.md](../POC_OVERVIEW.md)
- [POC_FLOWS_REQUIREMENTS.md](../POC_FLOWS_REQUIREMENTS.md)
- [POC_FLOWS_CLARIFY_REQUIREMENTS.md](../POC_FLOWS_CLARIFY_REQUIREMENTS.md)
- [NestJS Documentation](https://docs.nestjs.com/)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Socket.io Documentation](https://socket.io/docs/)

---

**Document Status**: ✅ **APPROVED - Implementation Ready**
**Estimated Effort**: 5 weeks (1 developer, full-time)
**Next Milestone**: Phase 1 completion (Infrastructure setup)
**Last Updated**: 2026-03-12
