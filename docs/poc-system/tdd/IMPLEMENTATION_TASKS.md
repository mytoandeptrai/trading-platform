# Trading Engine POC - Implementation Tasks

**Version**: 1.0
**Start Date**: 2026-03-12
**Target Completion**: 5 weeks
**Status**: 🟡 In Progress

---

## 📊 Progress Overview

| Phase | Tasks | Completed | Progress | Status |
|-------|-------|-----------|----------|--------|
| **Phase 1: Foundation** | 7 | 6 | 86% | ✅ Near Complete |
| **Phase 2: Auth & Account** | 14 | 14 | 100% | ✅ Complete |
| **Phase 3: Order Management** | 12 | 12 | 100% | ✅ Complete |
| **Phase 4: Matching Engine** | 15 | 15 | 100% | ✅ Complete |
| **Phase 5: Market Data** | 16 | 16 | 100% | ✅ Complete |
| **Phase 6: WebSocket** | 6 | 0 | 0% | ⏳ Not Started |
| **Phase 7: Testing & Docs** | 8 | 1 | 13% | 🟡 In Progress |
| **TOTAL** | **78** | **64** | **82%** | 🟢 Near Complete |

---

## 🚀 Phase 1: Foundation (Week 1)

**Goal**: Set up project infrastructure

**Duration**: 3-4 days

### Infrastructure Setup

- [x] Project setup (NestJS in `apps/api`)
- [x] Docker Compose configuration
  - [x] PostgreSQL 16+ service
  - [x] Redis 7.x service
  - [x] Volume mounts for data persistence
  - [x] Health checks
- [x] Environment variables setup
  - [x] `.env.example` template
  - [x] `.env` for local development
  - [ ] Environment validation (class-validator)

### Database Setup

- [x] Database schema design finalized
- [x] Migration scripts
  - [x] `001_create_users_table.sql`
  - [x] `002_create_accounts_table.sql`
  - [x] `003_create_orders_table.sql`
  - [x] `004_create_trades_table.sql`
  - [x] `005_create_transactions_table.sql`
  - [x] `006_create_tickers_table.sql`
  - [x] `007_create_candles_tables.sql`
- [x] Database seeding
  - [x] `001_test_users.sql` (4 users including admin)
  - [x] `002_test_accounts.sql` (accounts + balances)
  - [x] `003_initial_tickers.sql` (4 trading pairs)
- [x] Migration runner script (`run-migrations.ts`)
- [x] Seed runner script (`run-seeds.ts`)

### Configuration

- [x] Winston logger setup
  - [x] Console transport (development)
  - [x] File transport (logs directory)
  - [x] Log levels configuration
  - [x] Structured JSON logging
  - [x] Daily rotate file (error, combined, debug)
  - [x] Custom methods (logTrade, logOrder, logPerformance)
- [x] Health check endpoint (`/health`)
  - [x] `/health` - Full health check (DB + Redis)
  - [x] `/health/live` - Liveness probe
  - [x] `/health/ready` - Readiness probe
  - [x] PostgreSQL health indicator
  - [x] Redis health indicator
- [ ] Swagger/OpenAPI setup (optional - can be done later)

### Testing

- [ ] Verify Docker containers running
- [ ] Test database connection
- [ ] Test Redis connection
- [ ] Health check endpoint returns 200

---

## 🔐 Phase 2: Auth & Account (Week 1-2)

**Goal**: User management working

**Duration**: 5-6 days

### Auth Module

- [x] Generate Auth module (`nest g module auth`)
- [x] Generate Auth service (`nest g service auth`)
- [x] Generate Auth controller (`nest g controller auth`)
- [x] User entity
  - [x] Define user schema (username, email, password_hash)
  - [x] TypeORM/raw SQL implementation
- [x] Registration endpoint (`POST /auth/register`)
  - [x] Input validation (class-validator)
  - [x] Password hashing (bcrypt, 12 rounds)
  - [x] Email uniqueness check
  - [x] Username uniqueness check
  - [x] Error handling (409 Conflict, 400 Bad Request)
- [x] Login endpoint (`POST /auth/login`)
  - [x] Credential validation
  - [x] JWT token generation (HS256, 24h expiry)
  - [x] Refresh token (Redis, 7 days TTL)
  - [x] Return access_token + refresh_token
- [x] JWT Strategy (Passport)
  - [x] JWT validation middleware
  - [x] Extract user from token
- [ ] Auth Guards
  - [x] JwtAuthGuard (protect routes)
  - [ ] RolesGuard (role-based access)

### Account Module

- [x] Generate Account module
- [x] Generate Account service
- [x] Generate Account controller
- [x] Account entities
  - [x] Account entity (main account)
  - [x] AccountCoin entity (coin balances)
  - [x] AccountCash entity (cash balances)
  - [x] Transaction entity (audit trail)
  - [x] LockRecord entity (balance locks)
- [x] Account creation endpoint (`POST /account`)
  - [x] Auto-create after registration
  - [ ] Initialize coin balances (BTC, ETH = 0)
  - [x] Initialize cash balance (USD = 0)
  - [x] Set default KYC level (1)
  - [x] Set trading_status = ACTIVE
- [x] Balance query endpoint (`GET /account/balance`)
  - [x] Return coins + cash
  - [x] Available vs locked breakdown
- [ ] Balance Service
  - [ ] `lockCash()` - Lock cash for order
  - [ ] `lockCoin()` - Lock coin for order
  - [ ] `unlockCash()` - Unlock after cancel/settlement
  - [ ] `unlockCoin()` - Unlock after cancel/settlement
  - [ ] Pessimistic locking (FOR UPDATE)
- [x] Deposit endpoint (`POST /account/deposit`)
  - [x] Validate amount > 0
  - [x] Update balance atomically
  - [x] Create transaction record
- [x] Withdrawal endpoint (`POST /account/withdraw`)
  - [x] Validate sufficient balance
  - [x] Update balance atomically
  - [x] Create transaction record
- [x] Transaction history endpoint (`GET /account/transactions`)
  - [x] Pagination support
  - [ ] Filter by type (DEPOSIT, WITHDRAW, TRADE)

### Testing

- [ ] Manual test: Register user
- [ ] Manual test: Login & get JWT
- [ ] Manual test: Create account
- [ ] Manual test: Deposit funds
- [ ] Manual test: Query balance

---

## 📦 Phase 3: Order Management (Week 2-3)

**Goal**: Order placement & Redis order book working

**Duration**: 5-6 days

### Order Module Setup

- [x] Generate Order module
- [x] Generate Order service
- [x] Generate Order controller
- [x] Order entities
  - [x] Order entity (matching_order table)
  - [x] Trade entity (matching_trade table)
  - [x] OrderHistory entity

### Order Service

- [x] Place LIMIT Order (`POST /orders`)
  - [x] Validate input (DTO with class-validator)
  - [x] Check pair trading status
  - [x] Check account trading status
  - [x] Calculate required balance + fees
  - [x] Call BalanceService.lockCash/lockCoin
  - [x] Generate order ID (snowflake/bigserial)
  - [x] INSERT into matching_order (status=PENDING)
  - [x] Add to Redis order book (ZADD)
  - [ ] Push to BullMQ queue (priority=10) — Phase 4
  - [x] Return 202 Accepted
- [x] Place MARKET Order (`POST /orders`)
  - [x] Same validation as LIMIT
  - [x] Calculate worst-case estimate (price × 1.2)
  - [x] Lock balance with slippage buffer
  - [x] INSERT with type=MARKET, price=NULL
  - [ ] Push to BullMQ queue (priority=1) — Phase 4
  - [x] Return 202 Accepted
- [x] Get Order by ID (`GET /orders/:id`)
  - [x] Query from database
  - [x] Verify ownership (user can only see own orders)
- [x] Get Orders list (`GET /orders`)
  - [x] Filter by status (PENDING, COMPLETED, etc.)
  - [x] Pagination (limit, offset)
  - [x] Sort by placed_at DESC
- [x] Cancel Order (`DELETE /orders/:id`)
  - [x] Check order status (must be PENDING or PARTLY_FILLED)
  - [x] Remove from Redis order book (ZREM)
  - [x] Calculate remaining balance to unlock
  - [x] Call BalanceService.unlock
  - [x] UPDATE order status = CANCELED
  - [x] Return 200 OK

### Orderbook Service (Redis)

- [x] `addOrder(order)` - ZADD to sorted set
  - [x] BUY: ZADD orderbook:{pair}:bid -price order_id
  - [x] SELL: ZADD orderbook:{pair}:ask price order_id
- [x] `removeOrder(orderId, pair, isBid)` - ZREM from sorted set
- [x] `getBestBid(pair)` - ZRANGE 0 0 (highest bid)
- [x] `getBestAsk(pair)` - ZRANGE 0 0 (lowest ask)
- [ ] `getAllBids(pair)` - ZRANGE 0 -1 (all bids)
- [ ] `getAllAsks(pair)` - ZRANGE 0 -1 (all asks)
- [x] `getOrderBookDepth(pair, levels)` - Top N levels

### Testing

- [ ] Manual test: Place LIMIT order (verify locked balance)
- [ ] Manual test: Place MARKET order
- [ ] Manual test: Query order by ID
- [ ] Manual test: Cancel order (verify unlock)
- [ ] Manual test: Check Redis order book (redis-cli)

---

## ⚙️ Phase 4: Matching Engine (Week 3-4)

**Goal**: Async matching working

**Duration**: 7-8 days

### BullMQ Setup

- [x] Install dependencies (`bullmq`, `ioredis`)
- [x] BullMQ configuration
  - [x] Queue connection (Redis)
  - [x] Default job options (retry: 3, backoff)
  - [x] Priority queue enabled
- [x] Create OrderMatchingQueue
- [x] Create MatchingWorker

### Matching Processor

- [x] Generate MatchingProcessor
- [x] `@Process('processOrder')` handler
  - [x] Fetch order from DB
  - [x] Validate order status (PENDING or PARTLY_FILLED)
  - [x] Determine order type (LIMIT or MARKET)
  - [x] Call matching logic
  - [x] Handle MARKET order insufficient liquidity
  - [x] Update order status
  - [x] Log execution time
- [x] Matching algorithm (LIMIT orders)
  - [x] Get opposing orders from Redis
  - [x] Check price compatibility
  - [x] Loop through matches
  - [x] Calculate match quantity (min of remaining)
  - [x] Create trade record
  - [x] Update order quantities
  - [x] Break when fully filled
- [x] Matching algorithm (MARKET orders)
  - [x] Get ALL opposing orders
  - [x] Loop through all price levels
  - [x] Match until quantity exhausted
  - [x] Handle insufficient liquidity
  - [x] Mark as PARTLY_FILLED if needed

### Settlement Service

- [x] Generate SettlementService
- [x] `settleTrade(trade)` main function
  - [x] Start SERIALIZABLE transaction
  - [x] Lock both account rows (FOR UPDATE)
  - [x] Validate account statuses (ACTIVE)
  - [x] Transfer coins to buyer
  - [x] Transfer cash to seller (minus fees)
  - [x] Deduct fees from locked balances
  - [x] Unlock remaining balances
  - [x] Create transaction records (audit trail)
  - [x] Update order status (COMPLETED or PARTLY_FILLED)
  - [x] Update trade status (CONFIRMED)
  - [x] COMMIT transaction
  - [x] Publish events (Redis pub/sub)
- [x] Error handling
  - [x] ROLLBACK on any error
  - [x] Mark trade as FAILED
  - [x] Log error details
  - [x] Maintain lock records for manual cleanup
- [x] Idempotency check
  - [x] Check if trade already settled
  - [x] Return early if CONFIRMED

### Testing

- [x] Unit test: Matching algorithm (price-time priority)
- [x] Unit test: Partial fills
- [x] Unit test: Multiple matches
- [x] Unit test: Price incompatibility
- [x] Unit test: Settlement success
- [x] Unit test: Settlement rollback
- [ ] Manual test: Place 2 matching orders
- [ ] Manual test: Verify trade executed
- [ ] Manual test: Verify balances updated
- [ ] Manual test: Check transaction logs

---

## 📈 Phase 5: Market Data (Week 4) ✅ COMPLETE

**Goal**: Ticker & candlestick data

**Duration**: 2-3 days

**Completed**: 2026-03-19

### Events Infrastructure

- [x] Generate EventsModule (Global module)
- [x] Create RedisSubscriberService
  - [x] Generic pub/sub subscriber with Map<channel, Set<handlers>>
  - [x] Support multiple handlers per channel
  - [x] Auto-subscribe/unsubscribe management
  - [x] Error handling per handler
- [x] Export for reusability across modules

### Ticker Module

- [x] Generate Ticker module
- [x] Generate Ticker service
- [x] Generate Ticker controller
- [x] Ticker entity (Binance-like schema)
  - [x] lastPrice, openPrice, highPrice, lowPrice
  - [x] priceChange, priceChangePercent
  - [x] volume (base), quoteVolume (quote)
  - [x] bidPrice, bidQty, askPrice, askQty
  - [x] tradeCount
  - [x] Created/Updated timestamps
- [x] Update ticker on trade
  - [x] Subscribe to trade.executed events
  - [x] Calculate 24h stats (from DB trades)
  - [x] UPSERT ticker data (ON CONFLICT)
  - [x] Cache in Redis (TTL: 60s)
  - [x] Invalidate cache on updates
- [x] Cron job: Update bid/ask from orderbook
  - [x] @Cron every 5 seconds
  - [x] Get orderbook snapshot (best bid/ask)
  - [x] Update ticker with latest prices
- [x] Get ticker endpoint (`GET /ticker/:pair`)
  - [x] Check Redis cache first
  - [x] Fallback to database
  - [x] Return ticker data
- [x] Get all tickers endpoint (`GET /ticker`)
  - [x] Return all active pairs
  - [x] Include last price, volume, change%
  - [x] Redis cache support

### Candle Service

- [x] Generate Candle service
- [x] Candle entities (4 timeframes)
  - [x] Candle1mEntity (1-minute)
  - [x] Candle5mEntity (5-minute)
  - [x] Candle1hEntity (1-hour)
  - [x] Candle1dEntity (1-day)
  - [x] UNIQUE constraint (pair_name, open_time)
  - [x] Indexes for queries
- [x] Update candles on trade
  - [x] Subscribe to trade.executed events
  - [x] Calculate openTime for each timeframe (time bucketing)
  - [x] Lazy close strategy (close previous candles)
  - [x] UPSERT candle data (ON CONFLICT)
    - [x] open: never changes (first trade)
    - [x] high: GREATEST(high, price)
    - [x] low: LEAST(low, price)
    - [x] close: always last trade price
    - [x] volume: cumulative
    - [x] tradesCount: increment
- [x] Get candles endpoint (`GET /ticker/:pair/candles`)
  - [x] Query parameter: timeframe (1m, 5m, 1h, 1d)
  - [x] Query parameter: limit (default 100, max 1000)
  - [x] Query candles with pagination
  - [x] Sort by open_time DESC
  - [x] Return OHLCV data

### Database Migration

- [x] Migration 009: Update ticker & candles schema
  - [x] Convert id from SERIAL/BIGSERIAL to UUID
  - [x] Add missing ticker fields (price_change, quote_volume, trade_count)
  - [x] Add created_at/updated_at to candle tables
  - [x] Add triggers for updated_at
- [x] Fix TypeORM column mapping (snake_case ↔ camelCase)

### Testing

- [x] Automated test script (`test-matching-engine.js`)
  - [x] Test 1: Basic limit order matching
  - [x] Test 2: Partial fill
  - [x] Test 3: Market order execution
  - [x] Test 4: No match (wide spread)
  - [x] Test 5: Orderbook display & updates
  - [x] Test 6: Market data updates (ticker + candles)
- [x] Manual test: Execute trade → Verify ticker updated
- [x] Manual test: Query candles → Verify OHLCV data
- [x] Verify ticker cache in Redis
- [x] Verify orderbook aggregation
- [x] All 6/6 tests passing ✅

### Documentation

- [x] Mermaid flow diagram (`matching-flow.mmd`)
  - [x] Complete flow from order placement to settlement
  - [x] Redis orderbook structures
  - [x] Event-driven updates
  - [x] Ticker/Candle generation
- [x] Postman collection updated
  - [x] GET /api/ticker (all tickers)
  - [x] GET /api/ticker/:pair (single ticker)
  - [x] GET /api/ticker/:pair/candles (with timeframe & limit)
- [x] Updated MEMORY.md with Phase 5 completion

---

## 🔌 Phase 6: WebSocket (Week 4-5)

**Goal**: Real-time notifications

**Duration**: 2-3 days

### WebSocket Setup

- [ ] Install dependencies (`@nestjs/websockets`, `socket.io`)
- [ ] Install EventEmitter2 (`@nestjs/event-emitter`)
- [ ] Configure EventEmitter2 module
- [ ] Generate WebSocket module
- [ ] Generate OrderGateway
- [ ] Generate TickerGateway

### Order Gateway

- [ ] `@WebSocketGateway` decorator (namespace: '/orders')
- [ ] CORS configuration
- [ ] Connection handler
  - [ ] Verify JWT token
  - [ ] Extract user from token
  - [ ] Join user-specific room
- [ ] Disconnect handler
- [ ] Subscribe to pair events
  - [ ] `subscribe:pair` message handler
  - [ ] Join pair-specific room
- [ ] Event subscribers (EventEmitter2)
  - [ ] Subscribe to `order.matched` event
  - [ ] Subscribe to `trade.executed` event
  - [ ] Subscribe to `order.filled` event
  - [ ] Subscribe to `order.cancelled` event
- [ ] Emit events to clients
  - [ ] Emit to user room (private events)
  - [ ] Emit to pair room (public events)

### Ticker Gateway

- [ ] `@WebSocketGateway` decorator (namespace: '/ticker')
- [ ] Connection handler (no auth required)
- [ ] Subscribe to ticker events
  - [ ] Subscribe to `ticker.update` event
- [ ] Emit ticker updates
  - [ ] Broadcast to all connected clients
  - [ ] Include pair, price, volume, change%

### Testing

- [ ] Manual test: Connect to WebSocket (wscat or Postman)
- [ ] Manual test: Subscribe to pair
- [ ] Manual test: Place order, verify WebSocket event
- [ ] Manual test: Execute trade, verify WebSocket event
- [ ] Manual test: Ticker updates received

---

## ✅ Phase 7: Testing & Documentation (Week 5)

**Goal**: Production-ready

**Duration**: 3-4 days

### Unit Tests

- [ ] Matching algorithm tests
  - [ ] Test price-time priority
  - [ ] Test partial fills
  - [ ] Test multiple matches
  - [ ] Test MARKET order execution
- [ ] Settlement service tests
  - [ ] Test successful settlement
  - [ ] Test rollback scenarios
  - [ ] Test idempotency
  - [ ] Test account frozen during settlement
- [ ] Balance service tests
  - [ ] Test lock/unlock operations
  - [ ] Test concurrent operations
  - [ ] Test insufficient balance

### Integration Tests (Automated)

- [x] Matching engine test script (`docs/scripts/test-matching-engine.js`)
  - [x] Happy path: Login → Deposit → Order → Match → Settlement
  - [x] LIMIT order flow
  - [x] MARKET order flow
  - [x] Partial fill scenario
  - [x] Orderbook display & updates
  - [x] Market data updates (ticker + candles)
  - [x] No match scenario (wide spread)

### Integration Tests (Manual - TODO)

- [ ] Order cancellation
- [ ] Insufficient balance error
- [ ] Settlement failure scenario

### API Documentation

- [ ] Swagger/OpenAPI documentation complete
- [ ] All endpoints documented
- [ ] Request/response examples
- [ ] Error codes documented

### Postman Collection

- [ ] Create Postman collection
- [ ] Auth endpoints (register, login)
- [ ] Account endpoints (balance, deposit, withdraw)
- [ ] Order endpoints (place, cancel, query)
- [ ] Ticker endpoints
- [ ] Environment variables setup

### Performance Testing

- [ ] Test order placement latency (< 100ms)
- [ ] Test matching latency (< 50ms)
- [ ] Test settlement latency (< 200ms)
- [ ] Test concurrent orders (10+ simultaneous)

### Deployment Guide

- [ ] README.md update
- [ ] Setup instructions
- [ ] Environment variables documentation
- [ ] Docker Compose usage guide
- [ ] Troubleshooting section

---

## 📋 Task Management Commands

### Start a task
```bash
# Mark task as in progress by adding 🔄 emoji before [ ]
🔄 [ ] Task name
```

### Complete a task
```bash
# Mark task as done by checking the box
- [x] Task name
```

### Track issues
```bash
# Add ⚠️ emoji for blocked tasks
⚠️ [ ] Blocked task (reason: ...)
```

---

## 🎯 Success Criteria Checklist

Before considering POC complete, verify:

### Functional Requirements
- [ ] Users can register and login
- [ ] Users can create trading account
- [ ] Users can deposit funds
- [ ] Users can place LIMIT orders
- [ ] Users can place MARKET orders
- [ ] Orders match automatically (async)
- [ ] Trades settle atomically
- [ ] Users can cancel orders
- [ ] Balance updates correctly
- [ ] WebSocket events work
- [ ] Ticker data accurate
- [ ] Candlesticks generated

### Non-Functional Requirements
- [ ] Order placement < 100ms (P95)
- [ ] Matching < 50ms
- [ ] Settlement < 200ms
- [ ] Unit tests pass (>80% coverage for core)
- [ ] No critical security vulnerabilities
- [ ] Proper error handling (no 500 errors for user mistakes)
- [ ] Logging works (Winston)
- [ ] Swagger docs complete

### Documentation
- [ ] TDD document complete
- [ ] API documentation (Swagger)
- [ ] README with setup instructions
- [ ] Postman collection
- [ ] Database schema documented

---

## 📞 Support & Questions

If stuck on any task:
1. Review TDD document section
2. Check POC_FLOWS_REQUIREMENTS.md for business logic
3. Check POC_FLOWS_CLARIFY_REQUIREMENTS.md for decisions

---

**Last Updated**: 2026-03-19
**Status**: Phase 5 Complete - Market Data (Ticker + Candles) ✅
**Next Task**: Phase 6 - WebSocket Real-time Updates
