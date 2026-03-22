# Trading Platform API

A high-performance cryptocurrency trading engine built with NestJS, featuring real-time order matching, WebSocket updates, and market data streaming.

## 🚀 Features

- **Real-time Order Matching** - In-memory matching engine with Redis-backed orderbook
- **WebSocket Updates** - Live ticker, orderbook, and trade updates
- **Market Data** - OHLCV candles at multiple timeframes (1m, 5m, 1h, 1d)
- **Account Management** - User accounts with multi-currency balances
- **Order Types** - Market and Limit orders with maker/taker fees
- **Transaction History** - Complete audit trail of all trades and transactions
- **Swagger Documentation** - Interactive API documentation at `/api`

## 🛠 Tech Stack

- **Framework**: NestJS 11
- **Language**: TypeScript
- **Database**: PostgreSQL (with TypeORM)
- **Cache/Queue**: Redis + BullMQ
- **Real-time**: Socket.IO
- **Authentication**: JWT with HTTP-only cookies
- **Documentation**: Swagger/OpenAPI

## 📋 Prerequisites

- Node.js 18+
- pnpm 8+
- PostgreSQL 14+
- Redis 6+

## 🔧 Environment Setup

### 1. Database Configuration

**Option A: Local PostgreSQL**
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=trading
DB_PASSWORD=trading_dev
DB_NAME=tradingengine
DB_SCHEMA=public
DB_SSL_ENABLED=false
```

**Option B: Aiven (Production)**
```env
DB_HOST=your-instance.aivencloud.com
DB_PORT=23298
DB_USERNAME=avnadmin
DB_PASSWORD=your-password
DB_NAME=defaultdb
DB_SCHEMA=public
DB_SSL_ENABLED=true
DB_SSL_CA_PATH=ca.pem
```

### 2. Redis Configuration

**Option A: Upstash/Production (Priority)**
```env
REDIS_URL=rediss://default:password@host:6379
```

**Option B: Local Development**
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### 3. JWT & Security
```env
JWT_SECRET=your-super-secret-jwt-key-min-256-bits
JWT_EXPIRATION=86400
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRATION=604800
```

### 4. CORS
```env
ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend.vercel.app
```

## 🚀 Getting Started

### Installation
```bash
# From monorepo root
pnpm install

# Or from apps/api
cd apps/api
pnpm install
```

### Database Setup
```bash
# Run migrations
pnpm db:migrate

# Seed initial data (optional)
pnpm db:seed

# Reset database (migrate + seed)
pnpm db:reset
```

### Development
```bash
# Start in watch mode
pnpm dev

# Or
pnpm run start:dev
```

### Production Build
```bash
# Build
pnpm build

# Start production server
pnpm run start:prod
```

## 📚 API Documentation

Access Swagger UI at: `http://localhost:6868/api`

### Key Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

#### Trading
- `POST /api/orders` - Place order (MARKET/LIMIT)
- `GET /api/orders` - List user orders
- `DELETE /api/orders/{id}` - Cancel order
- `POST /api/orders/cancel-all` - Cancel all active orders

#### Market Data
- `GET /api/ticker` - Get all tickers
- `GET /api/ticker/{pair}` - Get specific ticker
- `GET /api/ticker/candles` - Get OHLCV candles
- `GET /api/orderbook` - Get orderbook snapshot

#### Account
- `GET /api/account/balance` - Get balances
- `POST /api/account/deposit` - Deposit funds
- `POST /api/account/withdraw` - Withdraw funds
- `GET /api/account/transactions` - Transaction history

#### Development
- `DELETE /api/ticker/dev/clear-all` - Clear seeded data (dev only)

## 🔌 WebSocket Events

Connect to: `ws://localhost:6868`

### Subscribe to Pair
```javascript
socket.emit('subscribe:pair', { pair: 'BTC/USDT' });
```

### Events
- `ticker.update` - Real-time ticker updates
- `orderbook.update` - Orderbook changes
- `order.matched` - Trade execution
- `orderbook.changed` - New order placed

## 🗄 Database Schema

### Core Tables
- `users` - User accounts
- `accounts` - Trading accounts
- `balances` - Multi-currency balances
- `orders` - Active orders
- `order_history` - Historical orders
- `trades` - Executed trades
- `transactions` - Balance changes
- `ticker` - 24h ticker statistics
- `candle_1m/5m/1h/1d` - OHLCV candles
- `trading_pairs` - Supported pairs with config

## 🚢 Deployment

### Render.com

**Build Command:**
```bash
cd ../.. && pnpm install --frozen-lockfile && pnpm turbo run build --filter=api
```

**Start Command:**
```bash
pnpm run start:prod
```

**Root Directory:** `apps/api`

**Environment Variables:**
- Set `NODE_ENV=production`
- Configure database (Aiven)
- Configure Redis (Upstash)
- Update CORS origins
- Generate new JWT secrets

### Database Migrations on Deploy

Migrations are NOT run automatically. Deploy options:

**Option 1: Manual via Render Shell**
```bash
pnpm db:migrate
```

**Option 2: Add to build command**
```bash
cd ../.. && pnpm install --frozen-lockfile && pnpm turbo run build --filter=api && cd apps/api && pnpm db:migrate
```

## 🧪 Testing

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Test coverage
pnpm test:cov

# Watch mode
pnpm test:watch
```

## 📊 Architecture

```
apps/api/src/
├── auth/              # Authentication & JWT
├── account/           # Account & balance management
├── matching/          # Order matching engine
│   ├── orderbook.service.ts    # Redis-backed orderbook
│   ├── order.service.ts        # Order lifecycle
│   └── settlement.service.ts   # Trade settlement
├── ticker/            # Market data & candles
├── trading-pairs/     # Pair configuration
├── websocket/         # Socket.IO gateway
├── events/            # Event bus (Redis pub/sub)
├── database/          # Migrations & seeds
└── common/            # Shared utilities
```

## 🔐 Security

- ✅ JWT with HTTP-only cookies
- ✅ CORS configuration
- ✅ Rate limiting
- ✅ SQL injection protection (TypeORM)
- ✅ Input validation (class-validator)
- ✅ SSL/TLS for database connections
- ✅ Environment variable protection

## 📝 License

MIT

## 👥 Team

Built with ❤️ by the Trading Platform team
