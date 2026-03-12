# Trading Engine API Reference

**Base URL**: `http://localhost:3001`

---

## 🔓 Public Endpoints (No Auth Required)

### Health Check

```http
GET /health
GET /health/live
GET /health/ready
```

### Auth - Register

```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "trader1",
  "email": "trader1@example.com",
  "password": "Test@1234"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "trader1",
      "email": "trader1@example.com"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "timestamp": "2026-03-13T10:00:00Z",
  "path": "/api/auth/register"
}
```

### Auth - Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "trader1",
  "password": "Test@1234"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "trader1",
      "email": "trader1@example.com"
    },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

### Auth - Refresh Token

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 🔒 Protected Endpoints (Auth Required)

**All requests must include:**
```http
Authorization: Bearer <access_token>
```

### Auth - Get Profile

```http
GET /api/auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "trader1",
    "email": "trader1@example.com"
  }
}
```

### Account - Get Balance

```http
GET /api/account/balance
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "account": {
      "id": 1,
      "accountType": "INDIVIDUAL",
      "tradingStatus": "ACTIVE",
      "kycLevel": 1
    },
    "cash": [
      {
        "currency": "USD",
        "available": 100000.00,
        "locked": 0,
        "total": 100000.00
      }
    ],
    "coins": [
      {
        "coin": "BTC",
        "available": 10.00000000,
        "locked": 0,
        "frozen": 0,
        "total": 10.00000000
      }
    ]
  }
}
```

### Account - Deposit

```http
POST /api/account/deposit
Authorization: Bearer <token>
Content-Type: application/json

{
  "asset": "USD",
  "amount": 10000
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "asset": "USD",
    "amount": 10000,
    "type": "DEPOSIT",
    "status": "SUCCESS"
  }
}
```

### Account - Withdraw

```http
POST /api/account/withdraw
Authorization: Bearer <token>
Content-Type: application/json

{
  "asset": "BTC",
  "amount": 0.5
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "asset": "BTC",
    "amount": 0.5,
    "type": "WITHDRAW",
    "status": "SUCCESS"
  }
}
```

**Error 400 (Insufficient Balance):**
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Insufficient balance",
    "details": {
      "required": 0.5,
      "available": 0.2,
      "shortage": 0.3
    }
  },
  "statusCode": 400
}
```

### Account - Transaction History

```http
GET /api/account/transactions?limit=50&offset=0
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit` (optional): Number of transactions (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": 1,
        "type": "DEPOSIT",
        "asset": "USD",
        "amount": 10000,
        "balanceBefore": 0,
        "balanceAfter": 10000,
        "status": "SUCCESS",
        "description": "Deposit via API",
        "createdAt": "2026-03-13T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 1,
      "limit": 50,
      "offset": 0
    }
  }
}
```

---

## ❌ Error Responses

### 400 Bad Request

```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Validation failed",
    "details": [
      "password must be at least 8 characters",
      "email must be a valid email"
    ]
  },
  "timestamp": "2026-03-13T10:00:00Z",
  "path": "/api/auth/register",
  "statusCode": 400
}
```

### 401 Unauthorized

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token"
  },
  "statusCode": 401
}
```

### 409 Conflict

```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_EMAIL",
    "message": "Email already exists",
    "details": {
      "email": "trader1@example.com"
    }
  },
  "statusCode": 409
}
```

---

## 🧪 cURL Examples

### Register + Login + Get Balance Flow

```bash
# 1. Register
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"trader1","email":"trader1@example.com","password":"Test@1234"}'

# 2. Login (save the access token)
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"trader1","password":"Test@1234"}' \
  | jq -r '.data.accessToken')

# 3. Get balance
curl -X GET http://localhost:3001/api/account/balance \
  -H "Authorization: Bearer $TOKEN"

# 4. Deposit
curl -X POST http://localhost:3001/api/account/deposit \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"asset":"USD","amount":10000}'

# 5. Get balance again
curl -X GET http://localhost:3001/api/account/balance \
  -H "Authorization: Bearer $TOKEN"

# 6. Withdraw
curl -X POST http://localhost:3001/api/account/withdraw \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"asset":"USD","amount":1000}'

# 7. Transaction history
curl -X GET "http://localhost:3001/api/account/transactions?limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📝 Validation Rules

### Username
- ✅ 3-50 characters
- ✅ Only letters, numbers, underscores, hyphens
- ❌ `"ab"` - Too short
- ❌ `"user@name"` - Invalid characters
- ✅ `"trader_123"` - Valid

### Email
- ✅ Valid email format
- ❌ `"notanemail"` - Invalid
- ✅ `"user@example.com"` - Valid

### Password
- ✅ 8-50 characters
- ✅ Must contain: uppercase, lowercase, digit, special char
- ❌ `"password"` - Too weak
- ❌ `"Password1"` - Missing special char
- ✅ `"Test@1234"` - Valid

### Asset
- ✅ One of: `USD`, `VND`, `BTC`, `ETH`
- ❌ `"USDT"` - Not supported
- ✅ `"BTC"` - Valid

### Amount
- ✅ Greater than 0.00000001
- ❌ `0` - Too small
- ❌ `-100` - Negative
- ✅ `0.5` - Valid

---

## 🔐 JWT Token Format

**Access Token Payload:**
```json
{
  "sub": 1,
  "username": "trader1",
  "email": "trader1@example.com",
  "iat": 1710324000,
  "exp": 1710410400
}
```

**Expiration:**
- Access Token: 24 hours (86400s)
- Refresh Token: 7 days (604800s)

---

## 📊 Response Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | OK | Login successful |
| 201 | Created | User registered |
| 400 | Bad Request | Validation failed |
| 401 | Unauthorized | Invalid token |
| 403 | Forbidden | Account frozen |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Email already exists |
| 500 | Internal Server Error | Unexpected error |

---

## 🚀 Quick Start

```bash
# 1. Start services
docker-compose up -d

# 2. Run migrations
cd apps/api
pnpm db:migrate

# 3. Seed database (optional)
pnpm db:seed

# 4. Start API
pnpm dev

# 5. Test health
curl http://localhost:3001/health

# 6. Register user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@test.com","password":"Test@1234"}'
```
