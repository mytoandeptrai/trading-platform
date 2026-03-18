# WebSocket Testing Guide - Phase 6

## Overview

Phase 6 implements real-time WebSocket communication using Socket.IO with two gateways:

1. **OrderGateway** (`/orders`) - Private gateway with JWT authentication
   - Real-time order updates (matched, filled, cancelled)
   - Real-time trade notifications
   - User-specific and pair-specific rooms

2. **TickerGateway** (`/ticker`) - Public gateway (no authentication)
   - Real-time ticker updates
   - Real-time orderbook snapshots
   - Broadcast to all connected clients

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    EventEmitter2 (In-Process)               │
│                                                              │
│  SettlementService ──► order.matched    ──► OrderGateway    │
│                    ──► trade.executed   ──► OrderGateway    │
│                    ──► order.filled     ──► OrderGateway    │
│                                                              │
│  TickerService     ──► ticker.update    ──► TickerGateway   │
│                    ──► orderbook.update ──► TickerGateway   │
└─────────────────────────────────────────────────────────────┘
```

## Event Flow

### Order Events

```
User Places Order
    ↓
SettlementService.settleTrade()
    ↓
EventEmitter2.emit('trade.executed')
    ↓
OrderGateway.handleTradeExecuted()
    ↓
socket.emit() to user rooms & pair rooms
    ↓
WebSocket clients receive real-time updates
```

### Ticker Events

```
Trade Executed
    ↓
TickerService.handleTradeExecuted()
    ↓
Update ticker in database
    ↓
EventEmitter2.emit('ticker.update')
    ↓
TickerGateway.handleTickerUpdate()
    ↓
socket.broadcast() to all clients
    ↓
All connected clients receive ticker updates
```

## WebSocket Endpoints

### 1. OrderGateway: `ws://localhost:6868/orders`

**Authentication**: JWT token required

**Connect with token**:
```javascript
const socket = io('http://localhost:6868/orders', {
  auth: { token: 'your-jwt-token' },
  transports: ['websocket']
});
```

**Client Messages** (emit to server):
- `subscribe:pair` - Subscribe to pair-specific events
  ```javascript
  socket.emit('subscribe:pair', 'BTC/USD');
  ```
- `unsubscribe:pair` - Unsubscribe from pair events
  ```javascript
  socket.emit('unsubscribe:pair', 'BTC/USD');
  ```

**Server Events** (listen from server):
- `connected` - Connection established
- `subscribed` - Subscribed to pair
- `unsubscribed` - Unsubscribed from pair
- `order:matched` - Order matched with opposite order
- `trade:executed` - Trade executed (private, for your orders)
- `trade:public` - Public trade broadcast (for subscribed pair)
- `order:filled` - Order fully filled
- `order:cancelled` - Order cancelled
- `error` - Error message

### 2. TickerGateway: `ws://localhost:6868/ticker`

**Authentication**: Not required (public)

**Connect**:
```javascript
const socket = io('http://localhost:6868/ticker', {
  transports: ['websocket']
});
```

**Server Events** (listen from server):
- `connected` - Connection established
- `ticker:update` - Ticker data updated
- `orderbook:update` - Orderbook snapshot updated

## Testing

### Prerequisites

1. Start Docker services:
   ```bash
   docker-compose up -d
   ```

2. Start API server:
   ```bash
   cd apps/api
   pnpm dev
   ```

### Automated Test Script

Run the WebSocket test script:

```bash
node docs/scripts/test-websocket.js
```

This script will:
1. Login with test credentials
2. Connect to OrderGateway with JWT
3. Subscribe to BTC/USD pair
4. Connect to TickerGateway (public)
5. Listen for all events

### Manual Testing with Postman

1. **Connect to OrderGateway**:
   - Open Postman WebSocket
   - URL: `ws://localhost:6868/orders`
   - Headers: Add `token` in query params or auth
   - Connect

2. **Subscribe to pair**:
   ```json
   {
     "event": "subscribe:pair",
     "data": "BTC/USD"
   }
   ```

3. **Place orders** (via REST API) and watch real-time events

4. **Connect to TickerGateway**:
   - URL: `ws://localhost:6868/ticker`
   - No authentication needed
   - Listen for ticker:update events

### Manual Testing with wscat

Install wscat:
```bash
npm install -g wscat
```

**Test OrderGateway**:
```bash
# Get JWT token first
TOKEN="your-jwt-token"

# Connect with token in query param
wscat -c "ws://localhost:6868/orders?token=$TOKEN"

# Send subscribe message
> {"event":"subscribe:pair","data":"BTC/USD"}
```

**Test TickerGateway**:
```bash
wscat -c "ws://localhost:6868/ticker"
```

## Event Payloads

### order:matched
```json
{
  "orderId": "123",
  "pairName": "BTC/USD",
  "side": "BUY",
  "price": "50000.00",
  "quantity": "0.1",
  "matchedQuantity": "0.05",
  "remainingQuantity": "0.05",
  "oppositeOrderId": "124",
  "timestamp": "2026-03-19T10:30:00.000Z"
}
```

### trade:executed (private)
```json
{
  "tradeId": "trade-uuid",
  "pairName": "BTC/USD",
  "side": "BUY",
  "price": "50000.00",
  "quantity": "0.05",
  "value": "2500.00",
  "orderId": "123",
  "executedAt": "2026-03-19T10:30:00.000Z"
}
```

### trade:public
```json
{
  "tradeId": "trade-uuid",
  "pairName": "BTC/USD",
  "price": "50000.00",
  "quantity": "0.05",
  "executedAt": "2026-03-19T10:30:00.000Z"
}
```

### order:filled
```json
{
  "orderId": "123",
  "pairName": "BTC/USD",
  "side": "BUY",
  "filledQuantity": "0.1",
  "averagePrice": "50000.00",
  "status": "FILLED",
  "timestamp": "2026-03-19T10:30:00.000Z"
}
```

### ticker:update
```json
{
  "pair": "BTC/USD",
  "lastPrice": "50000.00",
  "openPrice": "48000.00",
  "highPrice": "51000.00",
  "lowPrice": "47500.00",
  "volume": "123.45",
  "quoteVolume": "6172500.00",
  "priceChange": "2000.00",
  "priceChangePercent": "4.17",
  "bidPrice": "49990.00",
  "bidQty": "0.5",
  "askPrice": "50010.00",
  "askQty": "0.3",
  "tradeCount": 42,
  "timestamp": "2026-03-19T10:30:00.000Z"
}
```

### orderbook:update
```json
{
  "pair": "BTC/USD",
  "bids": [
    { "price": "49990.00", "quantity": "0.5" },
    { "price": "49980.00", "quantity": "1.2" }
  ],
  "asks": [
    { "price": "50010.00", "quantity": "0.3" },
    { "price": "50020.00", "quantity": "0.8" }
  ],
  "timestamp": "2026-03-19T10:30:00.000Z"
}
```

## Room Architecture

### User Rooms
- Format: `user:{userId}`
- Purpose: Private events (user's own orders and trades)
- Auto-join: On connection with valid JWT
- Events: order:matched, trade:executed, order:filled, order:cancelled

### Pair Rooms
- Format: `pair:{pairName}`
- Purpose: Public events for a trading pair
- Join: Via `subscribe:pair` message
- Events: trade:public

### Broadcast
- Purpose: Global events (all tickers)
- No room needed
- Events: ticker:update, orderbook:update

## Frontend Integration

### React Example

```typescript
import { io, Socket } from 'socket.io-client';
import { useEffect, useState } from 'react';

export function useOrderWebSocket(token: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [trades, setTrades] = useState([]);

  useEffect(() => {
    const orderSocket = io('http://localhost:6868/orders', {
      auth: { token },
      transports: ['websocket'],
    });

    orderSocket.on('connect', () => {
      console.log('Connected to OrderGateway');
      // Subscribe to BTC/USD
      orderSocket.emit('subscribe:pair', 'BTC/USD');
    });

    orderSocket.on('trade:executed', (data) => {
      setTrades((prev) => [...prev, data]);
    });

    setSocket(orderSocket);

    return () => {
      orderSocket.close();
    };
  }, [token]);

  return { socket, trades };
}

export function useTickerWebSocket() {
  const [ticker, setTicker] = useState(null);

  useEffect(() => {
    const tickerSocket = io('http://localhost:6868/ticker', {
      transports: ['websocket'],
    });

    tickerSocket.on('ticker:update', (data) => {
      setTicker(data);
    });

    return () => {
      tickerSocket.close();
    };
  }, []);

  return { ticker };
}
```

## Troubleshooting

### Connection Refused
- Check if API server is running on port 6868
- Verify firewall settings

### Authentication Failed (OrderGateway)
- Ensure JWT token is valid and not expired
- Check token is passed in auth.token or query.token
- Verify JWT secret in environment variables

### No Events Received
- Check if EventEmitter2 module is imported in app.module.ts
- Verify services are emitting events via EventEmitter2
- Check browser console for WebSocket errors

### CORS Errors
- Update CORS settings in gateway decorators
- Add your frontend URL to allowed origins

## Performance Considerations

- EventEmitter2 is in-process (single server only)
- For multi-server deployment, consider Redis Adapter for Socket.IO
- Room-based architecture scales well for user-specific events
- Broadcast events should be throttled if ticker updates too frequently

## Security

- OrderGateway requires JWT authentication
- Token verification on connection
- User can only join their own user room
- Pair rooms are public but read-only
- Validate all client messages

## Next Steps

1. Test with real orders and trades
2. Monitor performance under load
3. Add error handling and reconnection logic
4. Implement Redis Adapter for horizontal scaling
5. Add rate limiting for message frequency
