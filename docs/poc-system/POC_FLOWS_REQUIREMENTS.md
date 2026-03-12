# NestJS Trading POC - Flow Documentation Requirements

## Overview

This document outlines the complete requirements for creating comprehensive flow documentation for the Trading Engine NestJS POC. Based on stakeholder requirements, the documentation will cover all major user journeys and trading operations with detailed transaction flows.

---

## User Requirements Captured

### Scope: All Major Flows

✅ User Registration, Login, Account Creation  
✅ Order Placement (Limit & Market), Matching, Settlement  
✅ Balance Management, Deposits, Withdrawals  
✅ Market Data Updates, Tickers, Candlesticks  
✅ Order Book Snapshots, Trade History  

### Format & Structure

✅ Text descriptions + Flowcharts + Diagrams + Response examples  
✅ **Separate files per flow domain** (USER, TRADING, BALANCE, MARKET)  
✅ **NO code examples** - focus on business logic & data flow  
✅ **NO Mermaid sequence diagrams** - use text descriptions & flowcharts  

### Edge Cases & Scenarios

✅ Partial fills + Order cancellation during matching  
✅ Stop-loss triggers, Iceberg orders, Self-trade prevention  
✅ Balance insufficient, Order expired, Account frozen  
✅ All critical trading edge cases documented  

### Data Consistency Focus

✅ **Redis + PostgreSQL transactions**  
✅ **Settlement flow & Rollback scenarios**  
✅ Matching failure → Rollback  
✅ Settlement failure → Rollback  

---

## Document Structure & Files

```
docs/flows/
├── NestJS_POC_FLOWS_INDEX.md              # Master navigation & overview
├── NestJS_POC_FLOWS_USER.md               # Registration, Login, Account creation
├── NestJS_POC_FLOWS_TRADING.md            # Order placement, matching, settlement, cancel
├── NestJS_POC_FLOWS_BALANCE.md            # Deposits, withdrawals, balance tracking
└── NestJS_POC_FLOWS_MARKET.md             # Tickers, candles, order book, snapshots
```

---

## File 1: NestJS_POC_FLOWS_INDEX.md

### Purpose

Master navigation document providing overview of all flows and their relationships.

### Content Sections

#### 1.1 Flow Overview Table


| Flow Name           | File        | Purpose                    | Actors                | Typical Duration |
| ------------------- | ----------- | -------------------------- | --------------------- | ---------------- |
| User Registration   | _USER.md    | Create new account         | User, Auth Service    | < 2s             |
| User Login          | _USER.md    | Authenticate & get token   | User, Auth Service    | < 1s             |
| Place Limit Order   | _TRADING.md | Add buy/sell to order book | Trader, Matching      | < 100ms          |
| Place Market Order  | _TRADING.md | Execute at best price immediately | Trader, Matching | < 200ms          |
| Order Matching      | _TRADING.md | Match buy & sell orders    | Matching Engine       | < 50ms           |
| Trade Settlement    | _TRADING.md | Transfer coins & cash      | Settlement Service    | < 200ms          |
| Deposit             | _BALANCE.md | Add funds to account       | User, Account Service | 1-5s             |
| Withdrawal          | _BALANCE.md | Remove funds from account  | User, Account Service | 1-5s             |
| Update Ticker       | _MARKET.md  | Calculate current price    | Ticker Service        | Real-time        |
| Generate Candle     | _MARKET.md  | Create OHLCV data          | Ticker Service        | Periodic         |
| Order Book Snapshot | _MARKET.md  | Save order book state      | Ticker Service        | Every 10s        |


#### 1.2 Flow Dependencies Diagram

- User Registration → Account Creation → Order Placement
- Order Placement → Order Matching → Trade Settlement → Balance Update
- Trade Execution → Ticker Update, Candle Update, Order Book Snapshot

#### 1.3 Critical Paths

- **Path 1 (User Onboarding)**: Register → Login → Create Account → Deposit
- **Path 2 (First Trade)**: Place Limit Order → Market Execution → Settlement → Check Balance
- **Path 3 (Withdrawal)**: Request Withdrawal → Approval → Balance Update

#### 1.4 Data Consistency Guarantees

- **Trading Flows**: ACID transactions (PostgreSQL SERIALIZABLE)
- **Balance Updates**: Atomic operations (PostgreSQL transactions + Redis)
- **Market Data**: Eventually consistent (Redis cache + DB backup)

#### 1.5 Performance Targets

- Order Placement: < 100ms (P95)
- Order Matching: < 50ms per trade
- Settlement: < 200ms
- Balance Query: < 50ms
- Ticker Update: < 100ms

#### 1.6 Glossary

**Order** - Request to buy/sell quantity at specific price (Limit) or any price (Market)  
**Limit Order** - Order placed at a fixed price, waits for match  
**Market Order** - Order executed immediately at best available market price  
**Trade** - Executed match of buy & sell orders  
**Settlement** - Transfer of coins/cash between accounts  
**Locking** - Reserving balance for pending order  
**Matching** - Algorithm finding compatible orders (price-time priority)  
**Order Book** - Collection of all active buy/sell orders  
**Partial Fill** - Order matched for less than requested quantity  
**Iceberg Order** - Large order split into visible chunks  
**Stop-Loss** - Order triggered when price reaches threshold  
**Candle** - OHLCV (Open, High, Low, Close, Volume) for time period  
**Ticker** - Current market price & statistics  
**Slippage** - Difference between expected price and actual execution price (higher for market orders)  

#### 1.7 Typical User Journey Timeline

```
T+0s    → User registers
T+1s    → User logs in
T+5s    → User deposits $50,000
T+300s  → Deposit confirmed
T+310s  → User views market data (tickers)
T+320s  → User places limit order (BUY 1 BTC @ $50,000) OR market order (BUY 1 BTC ASAP)
T+350ms → Limit: Order added to book, balance locked
          Market: Order immediately matched, settled
T+500ms → Limit: Matching engine finds seller
T+600ms → Limit: Trade executed
T+800ms → Limit: Settlement completes
T+900ms → User sees: 1 BTC in account, $0 locked
          (For market order: immediate, completed by T+400ms)
```

---

## File 2: NestJS_POC_FLOWS_USER.md

### Purpose

Document user management flows: registration, authentication, account creation.

### Content Sections

#### 2.1 User Registration Flow

**Flow Name**: User Registration  
**Purpose**: Allow new users to create system account  
**Actors**: Prospective User, Authentication Service, Database  
**Preconditions**: User has valid email, unique username  
**Postconditions**: User account created, ready to login  

**Flow Steps**:

1. User submits registration form
  - Input: username, email, password
  - Validation: password strength rules (min 8 chars, uppercase, number, special)
2. System checks email uniqueness
  - Query: SELECT * FROM user_account WHERE email = ?
  - Result: Must be empty
  - Error if: Email already registered
3. System checks username uniqueness
  - Query: SELECT * FROM user_account WHERE username = ?
  - Result: Must be empty
  - Error if: Username already taken
4. System hashes password
  - Algorithm: bcrypt (rounds=12)
  - Input: raw password
  - Output: password_hash
5. System creates user record
  - Table: user_account
  - Insert: username, email, password_hash, created_at=NOW(), updated_at=NOW()
  - Transaction: BEGIN/COMMIT
6. System sends confirmation email
  - Email contains: confirmation link
  - Link expires in: 24 hours
  - Status: Email sent notification
7. User confirms email
  - User clicks link
  - System verifies token
  - Sets email_confirmed_at = NOW()
8. System returns success
  - Response status: 201 Created
  - Data: user_id, username, email
  - Client action: Redirect to login page

**Happy Path Data Flow**:

- PostgreSQL: user_account table → INSERT new user
- No Redis operations for registration

**Critical Edge Cases**:


| Case                 | Scenario                                | Detection             | Response                                          | Recovery                        |
| -------------------- | --------------------------------------- | --------------------- | ------------------------------------------------- | ------------------------------- |
| Email exists         | Email already registered                | DB constraint         | 409 Conflict, message: "Email already registered" | Suggest login or password reset |
| Weak password        | Password < 8 chars or missing uppercase | Validation logic      | 400 Bad Request, detailed rules                   | User corrects & retries         |
| Username taken       | Username already exists                 | DB query              | 409 Conflict, suggest alternative                 | User chooses different username |
| Email format invalid | Email doesn't match RFC5322             | Validation regex      | 400 Bad Request                                   | User corrects email             |
| Duplicate submission | User submits twice rapidly              | Request deduplication | Second request blocked                            | Inform user request in progress |
| Email service down   | Confirmation email fails to send        | Exception handling    | 500 error OR manual confirmation                  | Admin manually verifies         |


**Error Responses**:

- 400 Bad Request - Invalid input (weak password, bad format)
- 409 Conflict - Email/username already exists
- 500 Internal Server Error - Database or email service failure

**Concurrency Handling**:

- **Race Condition**: Two users registering same email simultaneously
- **Prevention**: Database UNIQUE constraint on email
- **Behavior**: First succeeds, second gets 409 Conflict

**Database State**:

```sql
INSERT INTO user_account (username, email, password_hash, created_at, updated_at)
VALUES ('john_trader', 'john@example.com', '$2b$12$...', NOW(), NOW());
```

---

#### 2.2 User Login Flow

**Flow Name**: User Login & JWT Token Generation  
**Purpose**: Authenticate user & issue access token  
**Actors**: User, Authentication Service, Database, JWT Service  
**Preconditions**: User account exists, email confirmed  
**Postconditions**: User has valid JWT token in cookie/header  

**Flow Steps**:

1. User submits login form
  - Input: username/email + password
  - Validation: both fields required
2. System queries user by username/email
  - Query: SELECT * FROM user_account WHERE username = ? OR email = ?
  - Result: Must return exactly 1 record
  - Error if: User not found
3. System verifies password
  - Compare: bcrypt.compare(submitted_password, stored_hash)
  - Result: true/false
  - Error if: Password mismatch (log attempt)
4. System checks account status
  - Query: SELECT account.trading_status FROM account WHERE user_id = ?
  - Validation: trading_status != 'FROZEN' AND account != NULL
  - Error if: Account suspended or not yet created
5. System generates JWT token
  - Payload: { user_id, username, roles, iat, exp }
  - Secret: process.env.JWT_SECRET
  - Expires in: 24 hours (86400 seconds)
  - Algorithm: HS256
6. System creates refresh token
  - Store: Redis
  - Key: refresh_token:{user_id}
  - Value: encrypted refresh token
  - TTL: 7 days
7. System returns tokens
  - Response: { access_token, refresh_token, expires_in }
  - Cookie: Set-Cookie with HttpOnly, Secure, SameSite flags
  - Status: 200 OK
8. Client stores token
  - In: localStorage (if SPA) or cookie (if traditional)
  - Usage: Include in Authorization header for future requests

**Happy Path Data Flow**:

- PostgreSQL: Query user_account by username/email
- PostgreSQL: Query account to check status
- Redis: Store refresh token with TTL
- Return: JWT token (no database write)

**Critical Edge Cases**:


| Case               | Scenario                               | Detection                    | Response                                        | Recovery                      |
| ------------------ | -------------------------------------- | ---------------------------- | ----------------------------------------------- | ----------------------------- |
| Wrong password     | 3+ failed attempts                     | Count login failures         | After 3: Temporarily lock account               | Email user with unlock link   |
| Account frozen     | Admin suspended account                | Check account.trading_status | 403 Forbidden, message: "Account suspended"     | Contact support               |
| No account created | User registered but no trading account | NULL result on account query | 400 Bad Request, prompt: "Create account first" | Redirect to account creation  |
| Account locked     | Previous failed logins                 | Check locked_until timestamp | 429 Too Many Requests, retry after X seconds    | Wait or use forgot password   |
| User deactivated   | User manually deactivated              | Check is_active flag         | 403 Forbidden                                   | Contact support to reactivate |
| Token expiration   | User logged in, token expired          | Verify token signature/exp   | 401 Unauthorized                                | Refresh with refresh token    |


**Error Responses**:

- 400 Bad Request - Missing/invalid input
- 401 Unauthorized - Wrong password
- 403 Forbidden - Account suspended/frozen
- 429 Too Many Requests - Too many failed login attempts
- 500 Internal Server Error - Database failure

**Concurrency Handling**:

- **Race Condition**: Two login attempts simultaneously
- **Prevention**: Database row locking during verification
- **Behavior**: Both processed independently (tokens issued to both)

**Security Considerations**:

- Don't expose whether email exists or password wrong (generic "Invalid credentials")
- Log failed login attempts (for fraud detection)
- Rate limit login endpoint (5 attempts per minute per IP)
- Use bcrypt with sufficient rounds (minimum 12)

**Database Operations**:

```sql
-- Query user
SELECT id, username, email, password_hash 
FROM user_account 
WHERE username = ? OR email = ?;

-- Check account status
SELECT trading_status FROM account WHERE user_id = ?;

-- Redis: Store refresh token
SET refresh_token:{user_id} <encrypted_token> EX 604800  -- 7 days
```

---

#### 2.3 Account Creation Flow (After Login)

**Flow Name**: Trading Account Creation  
**Purpose**: Initialize trading account & balances for authenticated user  
**Actors**: Authenticated User, Account Service, Database  
**Preconditions**: User logged in, user_account exists  
**Postconditions**: Account created, coin/cash balances initialized  

**Flow Steps**:

1. User requests account creation
  - Trigger: User submits account creation form or automatic after registration
  - Input: account_type (INDIVIDUAL/BUSINESS/VIP)
2. System verifies no existing account
  - Query: SELECT * FROM account WHERE user_id = ?
  - Result: Must be NULL
  - Error if: Account already exists
3. System validates KYC level
  - Check: kyc_level from user profile
  - Requirement: kyc_level >= 1 (at least basic verification)
  - Error if: KYC not completed
4. System creates account record
  - Table: account
  - Insert: user_id, account_type='INDIVIDUAL', trading_status='ACTIVE', kyc_level=1
  - Initialize: total_balance=0, available_balance=0, locked_balance=0
  - Transaction: BEGIN/COMMIT
5. System initializes coin balances
  - For each available coin (BTC, ETH, USDC, etc.):
    - Table: account_coin
    - Insert: account_id, coin_name, available=0, locked=0, frozen=0, total=0
6. System initializes cash balance
  - Table: account_cash
  - Insert: account_id, currency_name='USD', available=0, locked=0, total=0
7. System caches account in Redis
  - Redis Key: account:{account_id}
  - Store: account object (name, type, status, balances)
  - TTL: 3600 seconds (1 hour)
8. System returns success
  - Response: Account created, account_id, ready to deposit/trade
  - Status: 201 Created

**Happy Path Data Flow**:

- PostgreSQL: Check for existing account (prevent duplicates)
- PostgreSQL: INSERT into account table
- PostgreSQL: INSERT multiple rows into account_coin table
- PostgreSQL: INSERT into account_cash table
- Redis: Cache account object
- Return: Account details

**Critical Edge Cases**:


| Case                      | Scenario                                   | Detection                    | Response                                         | Recovery                      |
| ------------------------- | ------------------------------------------ | ---------------------------- | ------------------------------------------------ | ----------------------------- |
| Account exists            | User already has trading account           | DB query returns result      | 409 Conflict, message: "Account already created" | Redirect to account dashboard |
| KYC not done              | User hasn't completed verification         | kyc_level = 0                | 403 Forbidden, prompt: "Complete KYC first"      | Redirect to KYC flow          |
| Account creation fails    | DB error during INSERT                     | Exception caught             | 500 Internal Server Error                        | Retry or contact support      |
| Concurrent creation       | Two simultaneous account creation requests | Race condition               | First succeeds, second gets 409                  | Automatic retry by client     |
| Initial data inconsistent | Coin balances not initialized              | Missing rows in account_coin | Manual data fix required                         | Admin intervention            |


**Error Responses**:

- 400 Bad Request - Invalid account_type
- 403 Forbidden - KYC not completed
- 409 Conflict - Account already exists
- 500 Internal Server Error - Database failure

**Database State After Completion**:

```sql
-- Account created
INSERT INTO account (user_id, account_type, trading_status, kyc_level)
VALUES (123, 'INDIVIDUAL', 'ACTIVE', 1);
-- account_id = 456

-- Coin balances initialized
INSERT INTO account_coin (account_id, coin_name, available, locked, frozen, total)
VALUES 
  (456, 'BTC', 0, 0, 0, 0),
  (456, 'ETH', 0, 0, 0, 0),
  (456, 'USDC', 0, 0, 0, 0);

-- Cash balance initialized
INSERT INTO account_cash (account_id, currency_name, available, locked, total)
VALUES (456, 'USD', 0, 0, 0);
```

**Redis Cache**:

```
account:456 → {
  "id": 456,
  "user_id": 123,
  "account_type": "INDIVIDUAL",
  "trading_status": "ACTIVE",
  "total_balance": 0,
  "available_balance": 0,
  "locked_balance": 0
}
```

---

## File 3: NestJS_POC_FLOWS_TRADING.md

### Purpose

Document all trading flows: order placement, matching, settlement, cancellation.

### Content Sections

#### 3.1 Place Limit Order Flow

**Flow Name**: Place Limit Order  
**Purpose**: User creates limit order (fixed price, wait to match)  
**Actors**: Trader, Order Service, Account Service, Matching Service, Order Book Cache  
**Preconditions**: User authenticated, account exists, has balance  
**Postconditions**: Order in book, balance locked, order ID returned  

**Flow Steps**:

1. User submits order request
  - Input: pair (BTC/USD), side (BUY/SELL), price (50000), amount (1.0), validity (GTC)
  - Validation: All fields required, price > 0, amount > 0
2. System validates order parameters
  - Check minimum order amount: amount >= pair.min_order_amount
  - Check maximum order amount: amount <= pair.max_order_amount
  - Check price precision: price matches pair.tick_size
  - Error if: Any validation fails
3. System calculates locked amount & fees
  - If BUY: locked_amount = amount × price + estimated_fee
  - If SELL: locked_amount = amount + estimated_fee_in_coins
  - Fee calculation: amount × price × taker_fee_rate (e.g., 0.1%)
4. System checks account balance
  - Query: SELECT account.available_balance FROM account WHERE id = ?
  - For BUY: Compare available_balance >= locked_amount (in quote currency)
  - For SELL: Compare account_coin.available >= amount (in base currency)
  - Error if: Insufficient balance
5. System checks pair trading status
  - Query: SELECT is_trading_active FROM pair WHERE name = 'BTC/USD'
  - Validation: is_trading_active = true
  - Error if: Pair trading halted
6. System checks account trading status
  - Query: SELECT trading_status FROM account WHERE id = ?
  - Validation: trading_status = 'ACTIVE' (not SUSPENDED/FROZEN)
  - Error if: Account not active
7. System locks balance (Account Service RPC call)
  - Call: lockCoin(account_id, amount, fee, pair_name)
  - Result: Returns lock_record_id OR error
  - On error: Reject order placement
  - On success: Continue to next step
8. System generates order ID
  - Algorithm: Snowflake ID (distributed unique ID)
  - Format: 18-digit unique number
9. System creates order record
  - Table: matching_order
  - Insert: account_id, pair_name, is_bid (true if BUY), order_type='LIMIT', price, amount, filled=0, status='PENDING'
  - Fields: placed_at=NOW(), updated_at=NOW()
  - Transaction: BEGIN/COMMIT
10. System adds to order book cache
  - Redis Data Structure: Sorted Set (ZSET)
    - For BUY: ZADD orderbook:BTC/USD:bid -50000 order_id_123
    - For SELL: ZADD orderbook:BTC/USD:ask 50000 order_id_123
    - (Negative price for BID so higher prices appear first)
11. System attempts immediate matching
  - Retrieve opposing orders from Redis order book
    - Check if: buy_price >= sell_price
    - If no matches: Order stays in book, complete flow
    - If matches: Submit to matching engine (asynchronous)
12. System returns success response
  - Response Status: 202 Accepted (async processing)
    - Data: { order_id, status: 'PENDING', placed_at, locked_amount }
    - Message: "Order received and queued"

**Happy Path Data Flow**:

- PostgreSQL: Validate pair & account status
- Account Service (RPC): Lock balance
- PostgreSQL: Insert order record
- Redis: Add order to sorted set (order book)
- Redis: Trigger potential matching (async)
- Return: Order ID & confirmation

**Critical Edge Cases**:


| Case                         | Scenario                               | Detection                      | Response                                                | Recovery                                    |
| ---------------------------- | -------------------------------------- | ------------------------------ | ------------------------------------------------------- | ------------------------------------------- |
| **Insufficient Balance**     | User has $40k, needs $50.1k            | Balance check fails            | 400 Bad Request: "Insufficient balance"                 | User deposits more                          |
| **Minimum Order Size**       | Order 0.001 BTC, min is 0.01           | amount < min_order             | 400 Bad Request: "Order too small"                      | User increases amount                       |
| **Maximum Order Size**       | Order 1000 BTC, max is 100             | amount > max_order             | 400 Bad Request: "Order too large"                      | User splits into smaller orders             |
| **Insufficient Fee Reserve** | Balance enough for trade but not fee   | locked_amount > available      | 400 Bad Request: "Insufficient funds for fees"          | User deposits more                          |
| **Price Precision Mismatch** | Price $50,000.999, tick_size $0.01     | Price % tick_size != 0         | 400 Bad Request: "Invalid price precision"              | User rounds to valid price                  |
| **Pair Trading Halted**      | Pair temporarily disabled              | is_trading_active = false      | 503 Service Unavailable: "Trading halted for this pair" | Wait for trading to resume                  |
| **Account Frozen**           | Admin froze account                    | trading_status = 'FROZEN'      | 403 Forbidden: "Account suspended"                      | Contact support                             |
| **Lock Fails**               | Account service RPC fails              | Exception from lockCoin        | 500 Internal Server Error                               | Retry or manual investigation               |
| **Concurrent Order**         | Two orders same account simultaneously | Race condition on balance      | Both submitted (balance deducted from both)             | Subsequent order fails insufficient balance |
| **Stale Price**              | User submits old form with old price   | Order valid but not best price | Order accepted at submitted price                       | User may pay worse price than current       |
| **Order Expiration (GTD)**   | GTD order expires                      | expires_at < NOW()             | Order auto-canceled before matching                     | Order never added to book                   |


**Error Responses**:

- 400 Bad Request - Invalid parameters, insufficient balance, validation failed
- 403 Forbidden - Account suspended/frozen
- 409 Conflict - Concurrent balance updates
- 503 Service Unavailable - Trading halted for pair
- 500 Internal Server Error - System failure

**Concurrency Handling**:

- **Race Condition**: Two orders from same account simultaneously
- **Scenario**: User has $100k, submits two $60k orders at same time
- **Prevention**: Pessimistic locking - lock account row during balance check
- **Outcome**: First order locks $60k (balance now $40k available), second order rejected (insufficient)
- **Implementation**: PostgreSQL: SELECT ... FROM account WHERE id = ? FOR UPDATE

**Database State After Successful Order Placement**:

```sql
-- Order created
INSERT INTO matching_order (account_id, pair_name, is_bid, order_type, price, amount, filled, status, placed_at, updated_at)
VALUES (456, 'BTC/USD', true, 'LIMIT', 50000, 1.0, 0, 'PENDING', NOW(), NOW());
-- Returns: order_id = 789123

-- Lock record created (by Account Service)
INSERT INTO transaction_lock_cash (account_id, order_id, pair_name, lock_amount, is_lock_cash, status, locked_at)
VALUES (456, 789123, 'BTC/USD', 50100, true, 'LOCKED', NOW());

-- Account balance updated (by Account Service)
UPDATE account_cash SET locked = 50100, available = available - 50100 WHERE account_id = 456;
```

**Redis State**:

```
ZADD orderbook:BTC/USD:bid -50000 789123
-- Stored as sorted set with score (price) for fast retrieval
-- GET best bid: ZRANGE orderbook:BTC/USD:bid 0 0 WITHSCORES
```

---

#### 3.1.5 Place Market Order Flow

**Flow Name**: Place Market Order  
**Purpose**: User creates market order (immediate execution at best available price)  
**Actors**: Trader, Order Service, Account Service, Matching Service, Order Book Cache  
**Preconditions**: User authenticated, account exists, has balance, sufficient liquidity exists  
**Postconditions**: Order matched immediately (or PARTLY_FILLED if insufficient liquidity), settled  

**Overview**:

- **Market Order** = Execute at ANY available price, immediately (no PENDING state)
- User doesn't specify price—system uses best available market price
- Taker pays/receives whatever price is available
- Order typically COMPLETED or PARTLY_FILLED (not PENDING)
- Faster execution than Limit (1-2 trades instead of waiting)
- Higher slippage risk (might get worse price than current market)

**Flow Steps**:

1. User submits market order request
   - Input: pair (BTC/USD), side (BUY/SELL), amount (1.0), validity (IOC/FOK)
   - Validation: amount > 0, pair exists, validity in [IOC, FOK]
   - **NO price input** for market orders
2. System calculates max locked amount
   - If BUY: estimate_worst_case = amount × current_best_ask × 1.2 (20% buffer for slippage)
   - If SELL: estimate_worst_case = amount (worse case: sell all at 0)
   - Lock: max_possible_needed + estimated_fee
3. System checks account balance
   - For BUY: available_balance >= estimate_worst_case (in quote currency)
   - For SELL: available_coins >= amount (in base currency)
   - Error if: Insufficient balance/liquidity
4-6. [Same as Limit Order: validate pair/account status]
7. System locks balance (Account Service RPC call)
   - Same as Limit Order
8. System generates order ID (Snowflake)
9. System creates order record
   - Table: matching_order
   - Insert: account_id, pair_name, is_bid, order_type='**MARKET**', price=NULL, amount, filled=0, status='PENDING'
   - Note: price is NULL for market orders
10. System adds to order book cache (optional)
    - Market orders may NOT be added to Redis book (execute immediately)
    - Or stored temporarily with priority flag
11. **System pushes to BullMQ matching queue with HIGH PRIORITY**
    - Unlike Limit orders (normal priority), Market orders get priority=1
    - Market orders processed before Limit orders in queue
    - Push job to BullMQ: `{ order_id, type: 'MARKET', priority: 1 }`
12. System returns success response
    - Response Status: 202 Accepted (async processing, high priority)
    - Data: { order_id, status: 'PENDING', estimated_execution_time: '< 500ms' }
    - Message: "Market order queued for immediate execution"

**Background Worker Execution (High Priority):**

13. BullMQ worker picks up MARKET order job (priority queue)
    - Worker processes MARKET orders before LIMIT orders
    - Retrieves order details from database
14. Worker executes matching IMMEDIATELY (no waiting)
    - Retrieve all opposing orders from order book
    - Loop: Match sequentially until quantity exhausted or no more liquidity
    - Create multiple trade records if matched against multiple levels
    - Each match: Submit to settlement service
15. Worker updates order status
    - If fully matched: status='COMPLETED'
    - If partially matched (insufficient liquidity): status='PARTLY_FILLED'
    - Unlock remaining balance via Account Service
16. Worker publishes WebSocket event
    - Notify user: order.completed or order.partly_filled
    - Include execution details: filled_amount, avg_price, trades

**Key Differences from Limit Order**:

| Aspect | Limit Order | Market Order |
| ------ | ----------- | ------------ |
| API Response | 202 Accepted (< 100ms) | 202 Accepted (< 100ms) |
| Input | price + amount | amount only |
| Queue Priority | Normal (10) | **High (1)** |
| Matching | Async (waits for match) | **Async (immediate when picked up)** |
| Worker Behavior | Add to book, wait | **Execute immediately, no waiting** |
| Status After Match | PENDING → COMPLETED | Usually COMPLETED/PARTLY_FILLED |
| Execution Speed | Varies (seconds/minutes) | Fast (< 500ms in worker) |
| Price Guarantee | Specific price only | Best available price |
| Slippage Risk | None | **High (better/worse price)** |
| Order Duration | GTC/GTD/IOC | IOC/FOK (must execute now) |

**Happy Path Data Flow**:

- PostgreSQL: Validate pair & account status
- Account Service (RPC): Lock balance (worst-case estimate)
- PostgreSQL: Insert order (type=MARKET, status=PENDING)
- BullMQ: Push job to high-priority queue
- **Return 202 Accepted (user gets order_id immediately)**
- **[Background Worker - High Priority]:**
  - Worker picks up job first (priority=1)
  - Execute matching immediately against order book
  - PostgreSQL: Insert multiple trade records
  - Settlement Service: Process each trade
  - PostgreSQL: Update order status to COMPLETED
  - Account Service: Unlock unused balance (refund slippage buffer)
  - Redis: Remove matched opposite orders from order book
  - WebSocket: Notify user of completion

**Critical Edge Cases**:

| Case | Scenario | Detection | Response | Recovery |
| ---- | -------- | --------- | -------- | -------- |
| **No Liquidity** | Market BUY 10 BTC, only 2 BTC available | Liquidity check fails | 400 Bad Request: "Insufficient liquidity" | User accepts partial fill or cancels |
| **IOC Order Partial** | IOC order can't be fully filled | Remaining qty > 0 after all matches | PARTLY_FILLED order remains (not typical for IOC) | User may cancel remaining |
| **FOK Failure** | FOK requires full execution, only 60% available | Can't fill 100% | 400 Bad Request: "Cannot fill order in full" | Order rejected, no execution |
| **Price Changed** | Best ask was $50,100, now $50,500 while processing | Price slippage detected | Accept and execute (user accepted market order) | User receives worse price |
| **Concurrent Orders** | Multiple market orders same pair simultaneously | Race condition on liquidity | Both execute, first gets better price | Second gets worse price (normal) |
| **Zero Liquidity** | Market BUY with NO sellers available | No opposite orders found | 400 Bad Request: "No liquidity available" | User must place Limit order instead |

**Error Responses**:

- 400 Bad Request - No liquidity, insufficient balance, invalid parameters
- 403 Forbidden - Account suspended
- 409 Conflict - Concurrent balance updates
- 500 Internal Server Error - System failure

**Database State After Market Order Execution**:

```sql
-- Market order created
INSERT INTO matching_order (account_id, pair_name, is_bid, order_type, price, amount, filled, status, placed_at, updated_at)
VALUES (456, 'BTC/USD', true, 'MARKET', NULL, 2.0, 2.0, 'COMPLETED', NOW(), NOW());
-- Returns: order_id = 789124

-- Multiple trades created (matched against multiple ask prices)
INSERT INTO matching_trade (bid_order_id, ask_order_id, price, quantity, value)
VALUES 
  (789124, 789100, 50100, 1.0, 50100),  -- First ask
  (789124, 789101, 50150, 1.0, 50150);  -- Second ask
-- Total: 2 BTC @ average $50,125

-- Lock released (actual vs estimated)
UPDATE transaction_lock_cash 
SET lock_amount = 100250, status='RELEASED' 
WHERE order_id = 789124;

-- Account balance updated (by Settlement Service)
UPDATE account_cash SET locked = 0, available = available - 100250 WHERE account_id = 456;
UPDATE account_coin SET available = available + 2.0 WHERE account_id = 456 AND coin_name = 'BTC';
```

**Redis State**:

```
-- Market order NOT in order book (executed immediately)
-- Matched opposite orders removed
ZREM orderbook:BTC/USD:ask 789100
ZREM orderbook:BTC/USD:ask 789101

-- Order book updated
ZRANGE orderbook:BTC/USD:ask 0 0 WITHSCORES
→ Returns: 789102 with score 50200 (next best ask after execution)
```

---

#### 3.2 Order Matching Flow (Focus on Edge Cases)

**Flow Name**: Order Matching Algorithm  
**Purpose**: Execute trades when compatible buy & sell orders exist  
**Actors**: Matching Engine, Order Book Cache, Settlement Service  
**Preconditions**: Two orders in book (one BUY, one SELL) with compatible prices  
**Postconditions**: Trade record created, settlement initiated  

**Overview**:

- Matching happens ASYNCHRONOUSLY after order placement
- Matching engine continuously scans order book
- When bid_price >= ask_price → potential match
- Creates trade record & submits to settlement
- Settlement handles the money transfer

**Core Matching Algorithm**:

```
For each new BUY order:
  LOOP through all SELL orders (ascending price):
    IF buy_price >= sell_price:
      CREATE trade with:
        - price = ask_price (taker pays)
        - quantity = min(buy_remaining, sell_remaining)
        - buyer = buy_order.account
        - seller = sell_order.account
      SUBMIT to settlement queue
      UPDATE order quantities
      IF buy_order fully filled:
        BREAK loop
    ELSE:
      BREAK (no more profitable matches)
```

**Critical Edge Cases**:

##### Case 1: Partial Fills

**Scenario**: Buy 1.5 BTC @ $50,000, Sell 1 BTC @ $50,000 available

**Execution**:

1. Matching finds buy order for 1.5 BTC
2. Matching finds sell order for 1 BTC @ same price
3. Match quantity: min(1.5, 1) = 1 BTC
4. Create trade: 1 BTC @ $50,000
5. Update buy order: filled=1, remaining=0.5
6. Update sell order: filled=1, remaining=0
7. Remove sell from book, keep buy (status=PARTLY_FILLED)

**Database State**:

```sql
-- Buy order after partial fill
UPDATE matching_order SET filled=1, remaining=0.5, status='PARTLY_FILLED', updated_at=NOW()
WHERE id=789123;

-- Sell order (fully filled)
UPDATE matching_order SET filled=1, remaining=0, status='COMPLETED', updated_at=NOW()
WHERE id=789124;

-- Trade record created
INSERT INTO matching_trade (bid_order_id, ask_order_id, price, quantity, value)
VALUES (789123, 789124, 50000, 1.0, 50000);
```

**Redis State**:

```
-- Remove fully-filled sell order
ZREM orderbook:BTC/USD:ask 789124

-- Buy order remains in book (partial)
ZRANGE orderbook:BTC/USD:bid 0 0 WITHSCORES
→ Returns: 789123 with score -50000
```

**Balance Impact**:

- Buyer locked $50,100 (for 1.5 BTC), now only 1 BTC matched
- Settlement will: Transfer 1 BTC to buyer, refund partial ($1,050 remaining lock)
- Seller: 1 BTC sold, receive $50,000 minus fees

---

##### Case 2: Multiple Matches (Market Order)

**Scenario**: Market BUY for 5 BTC hits multiple price levels

**Order Book Before**:

- $50,100: SELL 2 BTC
- $50,050: SELL 3 BTC
- $50,000: SELL 4 BTC

**Market BUY for 5 BTC**:

1. Best ask: $50,100 for 2 BTC → Match 2 BTC
2. Remaining: 5 - 2 = 3 BTC needed
3. Next ask: $50,050 for 3 BTC → Match 3 BTC
4. Remaining: 3 - 3 = 0 BTC (order complete)

**Result**:

- Trade 1: 2 BTC @ $50,100 = $100,200
- Trade 2: 3 BTC @ $50,050 = $150,150
- Total: 5 BTC @ average $50,070 = $250,350

**Database State**:

```sql
-- Trade 1
INSERT INTO matching_trade (bid_order_id, ask_order_id, price, quantity)
VALUES (market_order_id, 789125, 50100, 2);

-- Trade 2
INSERT INTO matching_trade (bid_order_id, ask_order_id, price, quantity)
VALUES (market_order_id, 789126, 50050, 3);

-- Market buy order (fully filled)
UPDATE matching_order SET filled=5, status='COMPLETED' WHERE id=market_order_id;

-- Ask orders removed from book
DELETE FROM matching_order WHERE id IN (789125, 789126);
```

---

##### Case 3: Order Cancellation During Matching

**Scenario**: User cancels buy order while it's being matched

**Timeline**:

- T+0ms: Buy order in book (1 BTC @ $50,000)
- T+10ms: Matching engine finds match (sell @ $50,000)
- T+15ms: User submits cancel request
- T+20ms: Matching engine tries to execute trade
- **Race condition**: Which happens first?

**Implementation**: Database Lock

```sql
-- Step 1: Matching engine acquires lock
SELECT * FROM matching_order WHERE id=buy_order_id FOR UPDATE;
-- Holds lock until transaction commits

-- Step 2: If user tries to cancel within this lock
UPDATE matching_order SET status='CANCELED' WHERE id=buy_order_id;
-- Blocks until matching completes

-- Solution: Matching checks status before executing
IF status != 'PENDING' AND status != 'PARTLY_FILLED':
  ROLLBACK (order was canceled)
ELSE:
  PROCEED with settlement
```

**Expected Behavior**:

- If cancel request arrives BEFORE matching acquires lock: Cancel succeeds, order removed from book
- If cancel request arrives AFTER matching starts: Wait for matching to complete, then cancel remaining
- If cancel request arrives DURING matching: Matching completes, user can cancel remaining

**User Experience**:

- Cancel response: 200 OK if successful, 409 if order fully filled/completed

---

##### Case 4: Stop-Loss Order Trigger

**Scenario**: User places STOP_LIMIT order

```
User: "SELL 1 BTC when price drops to $48,000, then limit at $47,950"
- Current price: $50,000
- Stop price: $48,000 (trigger)
- Limit price: $47,950 (execute at this price or better)
```

**Matching Flow**:

1. Order created with status='PENDING' (not in order book)
2. Price updates: $50,000 → $49,500 → $48,500 → ...
3. Price reaches $48,000 (or below)
4. Trigger condition met
5. Convert order: type=LIMIT, price=$47,950
6. Add to order book (now eligible for matching)
7. Resume normal matching

**Implementation**:

```sql
-- Stop-loss order in database
INSERT INTO matching_order 
  (account_id, pair_name, is_bid, order_type, price, limit_price, status)
VALUES 
  (456, 'BTC/USD', false, 'STOP_LIMIT', 48000, 47950, 'PENDING');

-- When price update received showing $48,000 traded
UPDATE matching_order 
  SET order_type='LIMIT', price=47950, status='PENDING', triggered_at=NOW()
WHERE id=stop_order_id AND status='PENDING' AND limit_price IS NOT NULL;

-- Order now eligible for matching from order book
```

**Trigger Detection**: 

- Last trade price reaches trigger level
- OR Order book best price reaches level
- Check every trade execution and ticker update

---

##### Case 5: Iceberg Order

**Scenario**: User places ICEBERG BUY for 100 BTC, visible 10 BTC at a time

**Implementation**:

- config_iceberg: 100 (total)
- remain_iceberg: 100 (remaining)
- amount: 10 (currently visible)

**Matching Sequence**:

**Iteration 1**:

- Visible: 10 BTC @ $50,000
- Matches 5 BTC
- Update: remain_iceberg=95, filled=5, amount=10

**Iteration 2**:

- Previous 5 BTC matched
- Replenish: visible quantity = min(10, 95) = 10
- Now: Visible 10 BTC (different orders)
- Matches another 8 BTC
- Update: remain_iceberg=87, filled=13

**Continues until**: remain_iceberg=0

**User's View**:

- Never sees order for 100 BTC
- Only sees 10 BTC chunks appearing/disappearing
- Prevents market impact (order size not visible)

**Database**:

```sql
INSERT INTO matching_order 
  (account_id, pair_name, is_bid, order_type, amount, config_iceberg, remain_iceberg, iceberg)
VALUES 
  (456, 'BTC/USD', true, 'LIMIT', 10, 100, 100, true);

-- As matches happen
UPDATE matching_order 
  SET filled=13, remain_iceberg=87, amount=10
WHERE id=iceberg_order_id;
```

---

##### Case 6: Self-Trade Prevention

**Scenario**: Same account has both buy and sell orders, they would match

**Example**:

- Account 456 has: BUY 1 BTC @ $50,000 (order A)
- Account 456 has: SELL 1 BTC @ $50,000 (order B)
- These orders would match

**Policy Options** (implementation dependent):

1. **Prevent Matching** (default): Don't execute trade
2. **Prevent Order Placement**: Reject the second order
3. **Allow but Mark**: Execute but flag for compliance

**Implementation (Prevent Matching)**:

```sql
-- During matching, check account IDs
IF bid_order.account_id == ask_order.account_id:
  AND self_trade_prevention_enabled:
    SKIP this potential match
    CONTINUE to next potential match
```

**Detection**:

- Before creating trade record
- Compare buyer_account_id vs seller_account_id
- If equal and policy enabled: Don't proceed

---

#### 3.3 Trade Settlement Flow

**Flow Name**: Trade Settlement  
**Purpose**: Execute balance transfers after trade is matched  
**Actors**: Settlement Service, Account Service, Database  
**Preconditions**: Trade record created, accounts locked  
**Postconditions**: Coins/cash transferred, balances updated, settlement confirmed  

**Flow Overview**:

- After matching creates trade record, settlement is triggered
- Buyer: Receives coins, pays cash + fees
- Seller: Pays coins, receives cash - fees
- Both account balances updated atomically
- Trade marked as CONFIRMED

**Flow Steps**:

1. Settlement service receives trade from matching
  - Input: trade_id, bid_order_id, ask_order_id, price, quantity
  - Validation: Trade record exists in DB
2. System retrieves trade details
  - Query: SELECT * FROM matching_trade WHERE id = ?
  - Query: SELECT * FROM matching_order WHERE id IN (bid_order_id, ask_order_id)
  - Extract: buyer_account, seller_account, quantity, price, fees
3. System calculates final amounts
  - Buyer payment: quantity × price + buyer_fee
  - Seller receiving: quantity × price - seller_fee
  - Verify: buyer_locked >= buyer_payment
  - Verify: seller_locked >= seller_fee + quantity
4. System begins database transaction
  - START TRANSACTION;
  - SET ISOLATION LEVEL SERIALIZABLE;
5. System locks both account rows
  - SELECT * FROM account WHERE id = buyer_account_id FOR UPDATE;
  - SELECT * FROM account WHERE id = seller_account_id FOR UPDATE;
  - Ensures exclusive access until transaction completes
6. System transfers coins to buyer
  - UPDATE account_coin SET available = available + quantity WHERE account_id = buyer_account_id AND coin_name = 'BTC';
7. System transfers cash to seller
  - UPDATE account_cash SET available = available + (quantity × price - seller_fee) WHERE account_id = seller_account_id;
8. System deducts fees
  - UPDATE account_cash SET locked = locked - buyer_fee WHERE account_id = buyer_account_id;
  - UPDATE account_coin SET locked = locked - seller_fee WHERE account_id = seller_account_id;
9. System unlocks remaining balances
  - Calculate remaining from partial fills
  - UPDATE account_cash SET locked = locked - (original_lock - used) WHERE account_id = buyer_account_id;
10. System creates transaction records (audit trail)
  - INSERT transaction logs for both accounts
    - transaction_type='TRADE', op_result='SUCCESS'
11. System updates order & trade status
  - UPDATE matching_order SET filled=filled+qty, status=updated_status;
    - UPDATE matching_trade SET settlement_status='CONFIRMED', settlement_time=NOW();
12. System commits transaction
  - COMMIT;
    - All changes atomic (all or nothing)
13. System cleans up lock records
  - UPDATE transaction_lock_cash SET status='UNLOCKED', unlocked_at=NOW();
    - DELETE FROM Redis order book cache (if fully matched)
14. System publishes event (async notification)
  - Redis pub/sub: Notify ticker service of trade
    - Message: { trade_id, price, quantity, timestamp }
15. System returns success
  - Status: 200 OK (or captured async)
    - Data: { settlement_status: 'CONFIRMED', timestamp }

**Happy Path Data Flow**:

- PostgreSQL: Query trade & order details
- PostgreSQL: Lock account rows (pessimistic)
- PostgreSQL: Update account_coin (buyer receives)
- PostgreSQL: Update account_cash (seller receives)
- PostgreSQL: Update account balances
- PostgreSQL: Create audit trail records
- PostgreSQL: Update trade status to CONFIRMED
- PostgreSQL: COMMIT transaction (all atomic)
- Redis: Publish trade event to subscribers
- Return: Settlement confirmed

**Critical Edge Cases**:

##### Case 1: Buyer Account Frozen During Settlement

**Timeline**:

- T+0ms: Trade matched
- T+10ms: Settlement starts, begins transaction
- T+15ms: Admin freezes buyer account
- T+20ms: Settlement tries to update buyer balance

**Implementation**: Settlement checks account status within transaction

```sql
SELECT trading_status FROM account WHERE id = buyer_account_id FOR UPDATE;
IF trading_status != 'ACTIVE':
  ROLLBACK;  -- Entire transaction fails
  Mark trade as SETTLEMENT_FAILED
  LOG: "Settlement failed: buyer account status changed"
```

**Outcome**:

- Trade record status: SETTLEMENT_FAILED
- Balances: Rolled back (unchanged)
- Lock records: Remain in LOCKED state
- Action: Admin needs to manually intervene or unlock

---

##### Case 2: Buyer Balance Changed (Race Condition)

**Scenario**:

- Trade settlement locked $50,100 from buyer account
- Before settlement executes, buyer uses another $30,000 (somehow)
- Now available balance is insufficient

**Prevention**: Database constraints & locks

```sql
-- During settlement transaction
SELECT * FROM account WHERE id = buyer_id FOR UPDATE;
-- Holds exclusive lock, no other transactions can modify

-- Attempt balance update
UPDATE account_cash 
  SET available = available - 50100, locked = locked + 50100
WHERE account_id = buyer_id;

-- If available < 50100: Update fails (no negative balances)
-- Or: Include CHECK constraint in schema:
ALTER TABLE account ADD CONSTRAINT check_available_non_negative 
  CHECK (available >= 0);
```

**Outcome**: Settlement fails atomically, no inconsistency

---

##### Case 3: Seller Insufficient Funds After Fee Calculation

**Scenario**:

- Sell 1 BTC @ $50,000
- Taker fee: 0.1% = 0.001 BTC
- Seller locked: 1.001 BTC
- But seller only had 1.0005 BTC (fee was underestimated)

**Prevention**: Lock more than needed upfront

```
Fee calculated at order placement: 0.002 BTC (overestimate)
Lock: 1.002 BTC
At settlement: Actual fee 0.001 BTC
Refund: 0.001 BTC unlocked
```

**Database**:

```sql
-- Order placement
INSERT INTO matching_order SET place_order_est_fee = 0.002;

-- Settlement
UPDATE account_coin 
  SET locked = locked - (estimated_fee - actual_fee)
WHERE account_id = seller_id;
-- Unlocks 0.001 BTC
```

---

##### Case 4: Settlement Partially Succeeds

**Scenario**: Update buyer balance succeeds, but update seller balance fails

**Prevention**: Single transaction (ACID)

```sql
START TRANSACTION;
  UPDATE account_coin SET available = ... WHERE id = buyer;
  UPDATE account_cash SET available = ... WHERE id = seller;
COMMIT;
```

If ANY update fails: Entire transaction rolled back (both or nothing)

**Outcome**: No partial settlement possible due to transaction atomicity

---

##### Case 5: Duplicate Settlement Execution

**Scenario**: Settlement service crashes after COMMIT

- Trade marked CONFIRMED in DB
- Notification sent
- Service restarts and reprocesses same trade

**Prevention**: Idempotency check

```sql
-- Before settlement starts
SELECT settlement_status FROM matching_trade WHERE id = trade_id;
IF settlement_status = 'CONFIRMED':
  RETURN "Already settled"  -- Idempotent response
```

**Outcome**: Settlement only executes once

---

#### 3.4 Cancel Order Flow

**Flow Name**: Cancel Order  
**Purpose**: Remove pending order from book, unlock balance  
**Actors**: User, Order Service, Account Service  
**Preconditions**: Order in PENDING or PARTLY_FILLED status  
**Postconditions**: Order status CANCELED, balance unlocked  

**Flow Steps**:

1. User submits cancel request
  - Input: order_id
  - Validation: order_id must be valid
2. System retrieves order
  - Query: SELECT * FROM matching_order WHERE id = ?
  - Verify: order belongs to authenticated user
3. System checks order status
  - Valid states for cancel: PENDING, PARTLY_FILLED
  - Invalid states: COMPLETED, CANCELED, EXPIRED
  - Error if: Order cannot be canceled
4. System begins transaction
  - START TRANSACTION;
  - SET ISOLATION LEVEL SERIALIZABLE;
5. System removes order from order book (Redis)
  - IF is_bid: ZREM orderbook:BTC/USD:bid order_id
  - IF is_sell: ZREM orderbook:BTC/USD:ask order_id
  - Redis operation is atomic
6. System calculates remaining balance to unlock
  - remaining_quantity = total_quantity - filled_quantity
  - If BUY: unlock_amount = remaining × price + (estimated_fee - deducted_fee)
  - If SELL: unlock_amount = remaining + (estimated_fee - deducted_fee)
7. System calls Account Service to unlock
  - Call: unlockCoin(account_id, unlock_amount, order_id)
  - Result: Returns success or error
  - On error: Rollback transaction
8. System updates order status
  - UPDATE matching_order SET status = 'CANCELED', updated_at = NOW() WHERE id = order_id;
9. System updates lock records
  - UPDATE transaction_lock_cash SET status = 'UNLOCKED', unlocked_at = NOW() WHERE order_id = order_id;
10. System commits transaction
  - COMMIT;
11. System publishes cancel event
  - Redis pub/sub: Notify market data service
    - Message: { order_id, original_quantity, canceled_quantity, timestamp }
12. System returns success
  - Status: 200 OK
    - Data: { order_id, status: 'CANCELED', canceled_quantity, timestamp }

**Happy Path Data Flow**:

- Redis: Remove from order book (ZREM)
- PostgreSQL: Update order status to CANCELED
- Account Service (RPC): Unlock balance
- PostgreSQL: Update lock records
- Return: Cancellation confirmed

**Critical Edge Cases**:


| Case                       | Scenario                                   | Detection                          | Response                                   | Impact                               |
| -------------------------- | ------------------------------------------ | ---------------------------------- | ------------------------------------------ | ------------------------------------ |
| **Order Fully Filled**     | Order already 100% matched                 | filled >= total_quantity           | 409 Conflict: "Cannot cancel filled order" | User must wait for settlement        |
| **Order Already Canceled** | Duplicate cancel request                   | status = 'CANCELED'                | 409 Conflict: "Order already canceled"     | Idempotent response                  |
| **Concurrent Matching**    | Order being matched while cancel requested | Race condition                     | Whichever acquires lock first wins         | Either matched or canceled, not both |
| **Order Expired**          | GTD order expiry passed                    | expires_at < NOW()                 | 410 Gone: "Order already expired"          | User can't cancel expired order      |
| **Unlock Fails**           | Account service RPC fails                  | Exception during unlockCoin        | 500 Internal Server Error                  | Retry or manual intervention         |
| **Partial Cancel**         | Cancel subset of order (not supported)     | API doesn't support quantity param | N/A                                        | Must cancel entire order             |


**Database State After Cancellation**:

```sql
-- Order status updated
UPDATE matching_order SET status='CANCELED', updated_at=NOW() WHERE id=789123;

-- Lock record updated
UPDATE transaction_lock_cash SET status='UNLOCKED', unlocked_at=NOW() WHERE order_id=789123;

-- Account balance unlocked (by Account Service)
UPDATE account_cash SET locked = locked - 50000, available = available + 50000 
WHERE account_id = 456;
```

**Redis State**:

```
-- Order removed from book
ZREM orderbook:BTC/USD:bid 789123

-- If order in cache, remove it
DEL order:789123
```

---

## File 4: NestJS_POC_FLOWS_BALANCE.md

### Purpose

Document account balance, deposits, withdrawals, and transaction management flows.

[Content structured similarly to above files with 4 major flows:

1. Deposit Flow
2. Withdrawal Flow
3. Balance Update During Trading
4. Transaction History & Audit

]

*(Due to length constraints, this would follow same detailed format)*

---

## File 5: NestJS_POC_FLOWS_MARKET.md

### Purpose

Document market data flows: tickers, candlesticks, order books, snapshots.

[Content structured similarly with 4 major flows:

1. Ticker Update Flow
2. Candlestick Generation Flow
3. Order Book Update Flow
4. Order Book Snapshot Flow

]

*(Due to length constraints, this would follow same detailed format)*

---

## Quality Assurance Checklist

Before final delivery, each flow document must:

- Include overview section (purpose, actors, preconditions)
- Include detailed step-by-step flow (5-15 steps)
- Include happy path data flow
- Document 5+ critical edge cases
- Include error responses with status codes
- Include database state examples
- Include concurrency handling explanation
- Include Redis operations (if applicable)
- Include performance considerations
- Include related flows cross-references
- Use consistent terminology
- Have clear diagrams/flowcharts
- Be implementable by developers
- Be testable by QA

---

## Success Criteria

Documentation complete when:

✅ Developer can implement flows without clarification  
✅ QA can write comprehensive test cases from documentation  
✅ Product can explain all scenarios to customers  
✅ All ACID properties documented  
✅ All edge cases & error handling explicit  
✅ Transaction consistency guaranteed  
✅ Performance targets clearly stated  
✅ Diagrams clear and implementable  

---

**Document Version**: 1.0  
**Created**: 2026-03-12  
**Status**: Requirements Complete  
**Next Phase**: Begin writing NestJS_POC_FLOWS_*.md files