#!/usr/bin/env node

/**
 * WebSocket Test Script
 * Tests OrderGateway and TickerGateway functionality
 */

const io = require('socket.io-client');

const API_BASE = 'http://localhost:6868';

// Test credentials
const TEST_USER = {
  username: 'mytoandeptrai',
  password: 'Advanced@123',
};

let authToken = null;

/**
 * Test OrderGateway (requires JWT authentication)
 */
async function testOrderGateway() {
  console.log('\n=== Testing OrderGateway (/orders) ===\n');

  // First, login to get JWT token from cookie
  console.log('1. Logging in to get JWT token from cookie...');
  try {
    const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USER),
    });

    const loginData = await loginResponse.json();
    if (!loginData.success) {
      console.error('❌ Login failed:', loginData.message);
      return;
    }

    // Extract token from Set-Cookie header
    const setCookieHeader = loginResponse.headers.get('set-cookie');
    if (!setCookieHeader) {
      console.error('❌ No Set-Cookie header found');
      return;
    }

    // Parse access_token from cookie
    const accessTokenMatch = setCookieHeader.match(/access_token=([^;]+)/);
    if (!accessTokenMatch) {
      console.error('❌ No access_token found in cookie');
      return;
    }

    authToken = accessTokenMatch[1];
    console.log('✅ Login successful, got token from cookie');
    console.log('   Token preview:', authToken.substring(0, 20) + '...');
  } catch (error) {
    console.error('❌ Login error:', error.message);
    return;
  }

  // Connect to OrderGateway with JWT token
  console.log('\n2. Connecting to OrderGateway with JWT...');
  const orderSocket = io(`${API_BASE}/orders`, {
    auth: { token: authToken },
    transports: ['websocket'],
  });

  orderSocket.on('connect', () => {
    console.log('✅ Connected to OrderGateway');
    console.log('   Socket ID:', orderSocket.id);
  });

  orderSocket.on('connected', (data) => {
    console.log('✅ Received connected event:', data);

    // Subscribe to BTC/USD pair
    console.log('\n3. Subscribing to BTC/USD pair...');
    orderSocket.emit('subscribe:pair', 'BTC/USD');
  });

  orderSocket.on('subscribed', (data) => {
    console.log('✅ Subscribed to pair:', data);
  });

  orderSocket.on('order:matched', (data) => {
    console.log('\n📊 Order Matched:', data);
  });

  orderSocket.on('trade:executed', (data) => {
    console.log('\n💰 Trade Executed:', data);
  });

  orderSocket.on('trade:public', (data) => {
    console.log('\n🌐 Public Trade:', data);
  });

  orderSocket.on('order:filled', (data) => {
    console.log('\n✅ Order Filled:', data);
  });

  orderSocket.on('order:cancelled', (data) => {
    console.log('\n❌ Order Cancelled:', data);
  });

  orderSocket.on('error', (error) => {
    console.error('❌ Socket error:', error);
  });

  orderSocket.on('disconnect', (reason) => {
    console.log('❌ Disconnected from OrderGateway:', reason);
  });

  orderSocket.on('connect_error', (error) => {
    console.error('❌ Connection error:', error.message);
  });

  return orderSocket;
}

/**
 * Test TickerGateway (public, no authentication)
 */
async function testTickerGateway() {
  console.log('\n=== Testing TickerGateway (/ticker) ===\n');

  console.log('1. Connecting to TickerGateway (no auth)...');
  const tickerSocket = io(`${API_BASE}/ticker`, {
    transports: ['websocket'],
  });

  tickerSocket.on('connect', () => {
    console.log('✅ Connected to TickerGateway');
    console.log('   Socket ID:', tickerSocket.id);
  });

  tickerSocket.on('connected', (data) => {
    console.log('✅ Received connected event:', data);
  });

  tickerSocket.on('ticker:update', (data) => {
    console.log('\n📈 Ticker Update:', {
      pair: data.pair,
      lastPrice: data.lastPrice,
      priceChange: data.priceChange,
      priceChangePercent: data.priceChangePercent,
      volume: data.volume,
      timestamp: data.timestamp,
    });
  });

  tickerSocket.on('orderbook:update', (data) => {
    console.log('\n📊 Orderbook Update:', {
      pair: data.pair,
      bestBid: data.bids[0],
      bestAsk: data.asks[0],
      timestamp: data.timestamp,
    });
  });

  tickerSocket.on('disconnect', (reason) => {
    console.log('❌ Disconnected from TickerGateway:', reason);
  });

  tickerSocket.on('connect_error', (error) => {
    console.error('❌ Connection error:', error.message);
  });

  return tickerSocket;
}

/**
 * Main test function
 */
async function main() {
  console.log('╔═══════════════════════════════════════╗');
  console.log('║   WebSocket Test Script              ║');
  console.log('║   Testing Phase 6 Implementation     ║');
  console.log('╚═══════════════════════════════════════╝');

  try {
    // Test both gateways
    const orderSocket = await testOrderGateway();
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2s
    const tickerSocket = await testTickerGateway();

    console.log('\n=== WebSocket connections established ===');
    console.log('Listening for events...');
    console.log('(Press Ctrl+C to exit)');
    console.log('\nTo trigger events:');
    console.log('  - Place orders to see order:matched and trade:executed');
    console.log('  - Ticker updates every 5 seconds (cron job)');
    console.log('  - Trades will trigger ticker:update events\n');

    // Keep the script running
    process.on('SIGINT', () => {
      console.log('\n\nClosing connections...');
      if (orderSocket) orderSocket.close();
      if (tickerSocket) tickerSocket.close();
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

main();
