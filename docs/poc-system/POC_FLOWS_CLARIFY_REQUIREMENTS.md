# Trading Engine POC - Clarified Requirements & Decisions

**Document Version**: 1.0
**Date**: 2026-03-12
**Status**: Requirements Clarified - Ready for Implementation Planning
**Related Docs**:
- [POC_OVERVIEW.md](./POC_OVERVIEW.md)
- [POC_FLOWS_REQUIREMENTS.md](./POC_FLOWS_REQUIREMENTS.md)

---

## 📋 Document Purpose

This document captures **all clarified requirements and technical decisions** made during the requirements review phase. It serves as the **source of truth** for implementation decisions that differ from or add context to the original POC documentation.

**Target Audience**:
- Development team implementing the POC
- Future developers onboarding to the project
- AI assistants working on the codebase
- Technical leads reviewing architecture decisions

---

## 🎯 Implementation Scope - Phase 1 (POC)

### ✅ IN SCOPE

| Feature | Details | Priority |
|---------|---------|----------|
| **User Management** | Registration, Login (JWT), Account Creation | P0 |
| **Account Module** | Balance tracking, Deposits, Withdrawals | P0 |
| **Order Management** | Place **LIMIT & MARKET orders** (BUY/SELL) | P0 |
| **Matching Engine** | Price-time priority matching, priority queue for MARKET orders | P0 |
| **Trade Settlement** | Atomic balance transfers, fee deduction, slippage refunds | P0 |
| **Order Cancellation** | Cancel pending/partially filled orders | P0 |
| **Market Data** | Ticker data (last price, 24h stats) | P1 |
| **Candlesticks** | Generate OHLCV (1m, 5m, 1h, 1d) | P1 |
| **WebSocket** | Real-time updates (order matched, trades) | P1 |
| **Unit Tests** | Core modules (Matching Engine) | P1 |

### ❌ OUT OF SCOPE (Phase 1)

| Feature | Reason | Future Phase |
|---------|--------|--------------|
| **STOP_LIMIT Orders** | Complex logic | Phase 2 |
| **ICEBERG Orders** | Advanced feature | Phase 2 |
| **Self-Trade Prevention** | Edge case handling | Phase 2 |
| **Order Book Snapshots** | Not critical for POC | Phase 2 |
| **Frontend (Next.js)** | Backend-first approach | After backend complete |
| **KYC Verification Flow** | Use defaults | Phase 2 |
| **Retry Mechanism** | Settlement failures manual | Phase 2 |
| **Load Testing** | 10K orders/sec not required | Phase 2 |
| **Prometheus Monitoring** | Use Winston logging | Phase 2 |
| **Admin Panel** | Manual DB operations | Phase 2 |

---

## 🏗️ Architecture Decisions

### 1. **Project Structure**

**Decision**: Implement into existing `apps/api` (NestJS)

```
apps/api/src/
├── auth/           # JWT authentication
├── account/        # Balance, deposits, withdrawals
├── matching/       # Order book, matching engine
├── ticker/         # Market data, candlesticks
├── prisma/         # Database access (IGNORE Prisma for now)
├── common/         # Shared utilities, guards, interceptors
└── main.ts
```

**Rationale**:
- Leverage existing Turborepo structure
- Keep monorepo benefits
- Frontend (`apps/web`) will be implemented later

---

### 2. **ORM & Database**

**Decision**: **IGNORE Prisma** - Will use different ORM approach

**Original Proposal**: TypeORM
**Current Codebase**: Prisma (`@repo/database`)
**Clarification**: "Dùng ORM, Prisma kệ nó, ignore hiện tại nó đi"

**Implementation Notes**:
- Do NOT use existing `@repo/database` package
- Will decide on ORM later (likely raw SQL or TypeORM)
- PostgreSQL 16+ required
- Must support:
  - SERIALIZABLE isolation level
  - Pessimistic locking (`SELECT ... FOR UPDATE`)
  - Complex transactions

**Database Setup**:
- Development: Local PostgreSQL via Docker Compose
- Connection: `postgresql://trading:trading_dev@localhost:5432/tradingengine`

---

### 3. **Redis Configuration**

**Decision**: Use **ioredis** client

**Setup Required**:
- Redis 7.x
- Docker Compose for local development
- Connection: `redis://localhost:6379`

**Use Cases**:
- Order book cache (Sorted Sets)
- Session storage
- Pub/Sub for real-time events
- Rate limiting (future)

**Not Configured Yet**: Requires initial setup

---

### 4. **Matching Engine - Async Architecture**

**Decision**: **Fully Asynchronous** with BullMQ

**Original Ambiguity**:
- Doc said "async processing" but also "attempts immediate matching"

**Clarification**: "async nha, dùng bullmq để nó qa bên chỗ matching module chứ ko matching ngay lập tức"

**Implementation Flow**:

```
1. User places order
   ↓
2. API validates & locks balance
   ↓
3. Order saved to DB (status=PENDING)
   ↓
4. Order added to Redis order book
   ↓
5. **Job pushed to BullMQ queue** ✅
   ↓
6. API returns 202 Accepted (order_id)
   ↓
   [Background Worker]
   ↓
7. BullMQ worker processes matching
   ↓
8. If match found → Execute trade → Settlement
   ↓
9. WebSocket notification sent to user
```

**Key Points**:
- **NO immediate matching** in API request/response cycle
- BullMQ queue: `matching:orders`
- Worker processes: Separate from API server
- User gets order ID immediately (< 100ms)
- Matching happens in background (< 50ms target)

**BullMQ Configuration**:
- Queue: `OrderMatchingQueue`
- Worker: `MatchingWorker`
- Retry: 3 attempts (with exponential backoff)
- Dead Letter Queue: For failed jobs

---

### 5. **Settlement Rollback Logic**

**Decision**: Failed orders remain FAILED, no auto-retry

**Settlement Failure Scenarios**:

| Scenario | Order Status | Balance Locks | Action |
|----------|-------------|---------------|--------|
| Account frozen | FAILED | Remain LOCKED | Manual admin unlock |
| Insufficient balance | FAILED | Remain LOCKED | Manual investigation |
| DB transaction error | FAILED | Remain LOCKED | Manual retry |
| Settlement success | COMPLETED | UNLOCKED | Automatic |

**Clarification**: "rollback về failed -> sau khi status = failed thì mới unlock, chưa implement retry bây giờ"

**Implementation**:
```sql
-- On settlement failure
UPDATE matching_order SET status='FAILED' WHERE id=?;
-- Locks remain in lock_record table with status='LOCKED'

-- Manual unlock (admin operation)
UPDATE transaction_lock_cash SET status='UNLOCKED' WHERE order_id=?;
UPDATE account_cash SET locked = locked - amount, available = available + amount;
```

**Orphaned Locks**:
- **Question**: "orphaned lock thì tôi chưa hiểu lắm về cái này"
- **Explanation**: If service crashes after locking balance but before creating order record:
  - Balance remains locked forever
  - No order_id to reference
- **Solution for Phase 1**: Manual admin intervention
- **Future**: Background job to detect & cleanup locks older than X hours

---

### 6. **Self-Trade Prevention**

**Decision**: NOT in Phase 1

**Clarification**: "pharse sau"

**Implementation**: Phase 2 (Enhanced Features)

**Current Behavior**:
- Same account can have both BUY and SELL orders
- They WILL match each other (no prevention)

---

### 7. **Real-Time Updates**

**Decision**: WebSocket for critical events, NO order book snapshots

**Architecture**: **Simple Socket.io in API** (Option 2)
- WebSocket Gateway inside NestJS API (same app)
- Direct emit from services (no Redis adapter)
- EventEmitter2 for internal event bus
- Migration path to distributed if needed (Phase 2+)

**WebSocket Events**:
- ✅ Order matched (`order.matched`)
- ✅ Trade executed (`trade.executed`)
- ✅ Order filled (`order.filled`)
- ✅ Order cancelled (`order.cancelled`)
- ✅ Ticker updates (`ticker.update`)
- ❌ Full order book snapshots (Phase 2)

**Clarification**:
- "ko cần order book snapshot"
- "mình sẽ dùng websocket để bắn lên FE đó, khi order book nó match chẳng hạn"
- "cứ keep options 2" - Simple Socket.io in API

**Implementation**:
- NestJS WebSocket Gateway (`@nestjs/websockets`)
- Socket.io library
- EventEmitter2 for internal events
- Room-based subscriptions (per trading pair, per user)
- Authentication via JWT in handshake

**Why Simple (Not Distributed)?**:
- POC focus: functional, not high-scale
- Faster development (1 day vs 3 days)
- Easier to debug (single process)
- Clear migration path if needed
- < 1ms latency (no Redis overhead)

---

### 8. **Testing Strategy**

**Decision**: Unit tests for core modules ONLY

**Test Coverage**:
- ✅ **Matching Engine** (critical path)
  - Price-time priority algorithm
  - Partial fills
  - Multiple matches
- ✅ **Settlement Service** (critical path)
  - Balance transfers
  - Fee calculations
  - Transaction rollbacks
- ❌ Account Service (basic CRUD)
- ❌ Ticker Service (simple aggregations)
- ❌ E2E tests (Phase 2)
- ❌ Load testing (Phase 2)

**Clarification**: "unit test cho core thôi, ví dụ matching chẳng hạn, còn mấy services khác ko quan trong thì ignore"

**Tools**:
- Jest (default with NestJS)
- `@nestjs/testing` for module testing
- Target: >80% coverage for Matching + Settlement modules

---

### 9. **Trading Pairs Configuration**

**Decision**: Hardcoded, 1-2 pairs maximum

**Pairs for POC**:
- `BTC/USD`
- `ETH/USD` (optional, if time permits)

**Clarification**: "hardcoded và 1-2 pair cho dễ làm với poc"

**Implementation**:
```typescript
// src/common/constants/pairs.constant.ts
export const TRADING_PAIRS = [
  {
    id: 1,
    name: 'BTC/USD',
    base_coin: 'BTC',
    quote_currency: 'USD',
    min_order_amount: 0.001,
    max_order_amount: 100,
    tick_size: 0.01,
    taker_fee_rate: 0.001, // 0.1%
    maker_fee_rate: 0.0005, // 0.05%
    is_trading_active: true
  }
];
```

**No Admin Panel**: Pair configuration changes require code deployment

---

### 10. **Account Types & KYC**

**Decision**: Default values for all users

**Defaults**:
- `account_type`: `'INDIVIDUAL'`
- `kyc_level`: `1`
- `trading_status`: `'ACTIVE'`

**Clarification**: "mặc định đi, kyc_level = 1 cho khỏe"

**Implementation**:
- No KYC verification flow
- All registered users auto-approved
- No deposit/withdrawal limits
- Account creation automatic after user registration

---

### 11. **Deployment & Environments**

**Decision**: Local development first, staging later

**Phase 1 (POC)**:
- ✅ Local development (Docker Compose)
- ❌ Staging environment (later)
- ❌ Production (later)

**Clarification**: "local trước. staging làm sau. cicd thì set up base thôi"

**Docker Compose Services**:
```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: trading
      POSTGRES_PASSWORD: trading_dev
      POSTGRES_DB: tradingengine

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

**CI/CD**:
- Basic setup only (GitHub Actions or GitLab CI)
- Lint + Type Check + Unit Tests
- No automated deployments yet

---

### 12. **Logging & Monitoring**

**Decision**: Winston logger only, no Prometheus

**Clarification**: "winston logger là được"

**Logging Setup**:
- Winston with JSON format
- Log levels: `error`, `warn`, `info`, `debug`
- File rotation (daily)
- Console output in development

**No Metrics Collection**:
- ❌ Prometheus
- ❌ Grafana
- ❌ Custom metrics endpoints
- ✅ Simple health check endpoint

---

### 13. **Frontend Development**

**Decision**: Backend-first, frontend later

**Clarification**: "phần này chưa cần làm, chủ yếu mình sẽ làm backend trước"

**Frontend Scope (Future)**:
- Next.js 15 (already in `apps/web`)
- Pages: Login, Dashboard, Trading Interface, Order History
- Real-time updates via WebSocket
- Design system: shadcn/ui (already in `@repo/ui`)

**Phase 1 Testing**:
- Use **Postman** or **curl** for API testing
- WebSocket testing with **wscat** or Postman
- No UI required for POC validation

---

## 🚀 Implementation Readiness Checklist

### ✅ Clarified & Ready
- [x] Project structure (apps/api)
- [x] Async matching with BullMQ
- [x] Settlement failure handling
- [x] WebSocket events (no snapshots)
- [x] Hardcoded pairs (1-2 pairs)
- [x] Default KYC (level 1)
- [x] Testing scope (core modules only)
- [x] Logging (Winston)
- [x] Local development first

### ⚠️ Requires Setup
- [ ] Redis configuration (ioredis)
- [ ] BullMQ queue setup
- [ ] PostgreSQL schema migration
- [ ] WebSocket Gateway setup
- [ ] Docker Compose environment
- [ ] Winston logger configuration

### 🔄 Pending Decisions
- [ ] ORM choice (TypeORM vs raw SQL vs other)
- [ ] Exact database schema (adapt from POC_OVERVIEW.md)
- [ ] WebSocket library (Socket.io vs ws)
- [ ] Authentication strategy (JWT in cookies vs headers)

---

## 📝 Implementation Notes

### Order Status Flow

```
User submits order
    ↓
[PENDING] - Order validated, balance locked, saved to DB
    ↓
BullMQ job created
    ↓
[PENDING] - Matching worker picks up job
    ↓
[MATCHING] - Order book scan in progress
    ↓
    ├─→ [COMPLETED] - Fully matched
    ├─→ [PARTLY_FILLED] - Partial match, remains in book
    ├─→ [CANCELED] - User canceled
    └─→ [FAILED] - Settlement failed
```

### Balance Locking Logic

**Place BUY Order (1 BTC @ $50,000)**:
```typescript
const required = amount * price + estimatedFee;
// 1 * 50000 + 50 = 50,050

// Lock balance
await lockBalance({
  account_id: user.account_id,
  amount: 50050,
  currency: 'USD',
  order_id: orderId
});

// Update account
UPDATE account_cash
SET locked = locked + 50050, available = available - 50050
WHERE account_id = ?;
```

**Settlement (after match)**:
```typescript
// Buyer receives 1 BTC
UPDATE account_coin
SET available = available + 1.0
WHERE account_id = buyer_id AND coin_name = 'BTC';

// Seller receives $49,950 (minus $50 fee)
UPDATE account_cash
SET available = available + 49950, locked = locked - 50
WHERE account_id = seller_id;

// Unlock buyer's remaining balance
UPDATE account_cash
SET locked = locked - 50050
WHERE account_id = buyer_id;
```

---

## 🔗 Cross-Reference Links

- **Original POC Overview**: [POC_OVERVIEW.md](./POC_OVERVIEW.md)
- **Detailed Flow Requirements**: [POC_FLOWS_REQUIREMENTS.md](./POC_FLOWS_REQUIREMENTS.md)
- **Codebase Instructions**: [/CLAUDE.md](../../CLAUDE.md)

---

## 📌 Next Steps

1. **Setup Development Environment**
   - Docker Compose (PostgreSQL + Redis)
   - Install dependencies (ioredis, BullMQ, Winston)

2. **Database Schema Design**
   - Adapt schema from POC_OVERVIEW.md
   - Create migration files
   - Seed initial data (pairs, test users)

3. **Core Module Implementation Order**
   - [ ] Auth Module (JWT, User Registration)
   - [ ] Account Module (Balance, Deposits, Withdrawals)
   - [ ] Matching Module (Order placement, BullMQ integration)
   - [ ] Settlement Module (Balance transfers)
   - [ ] Ticker Module (Market data aggregation)
   - [ ] WebSocket Gateway (Real-time events)

4. **Testing**
   - Unit tests for Matching Engine
   - Unit tests for Settlement Service
   - Manual API testing (Postman)

---

## 💡 Key Takeaways for Implementation

| Aspect | Key Decision | Impact |
|--------|-------------|--------|
| **Matching** | Fully async with BullMQ | Better scalability, no blocking |
| **Settlement** | FAILED status, no retry | Simple error handling, manual recovery |
| **Real-time** | WebSocket for events | Modern UX, low latency |
| **Scope** | LIMIT orders only | Faster POC delivery |
| **Frontend** | Backend-first | Focus on core logic |
| **Testing** | Core modules only | Faster iteration |

---

**Document Status**: ✅ **APPROVED - Ready for Implementation Planning**
**Next Review**: After Phase 1 completion
**Maintained by**: Development Team
**Last Updated**: 2026-03-12
