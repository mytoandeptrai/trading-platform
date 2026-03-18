#!/usr/bin/env node

/**
 * Matching Engine Test Script
 * Tests order matching functionality with various scenarios
 *
 * Usage: node test-matching-engine.js
 *
 * Prerequisites:
 * 1. API running on http://localhost:6868
 * 2. User account: mytoandeptrai / Advanced@123
 * 3. Account must have sufficient USD and BTC balance
 */

const BASE_URL = 'http://localhost:6868/api';
const USERNAME = 'mytoandeptrai';
const PASSWORD = 'Advanced@123';

let cookies = '';
let testResults = [];

// Utility: Sleep function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Utility: Extract cookies from Set-Cookie headers
function extractCookies(headers) {
  const setCookieHeader = headers.get('set-cookie');
  if (!setCookieHeader) return '';

  // Parse multiple Set-Cookie headers
  const cookieStrings = setCookieHeader.split(',').map(cookie => {
    // Extract just the cookie name=value part (before first semicolon)
    const match = cookie.match(/^([^;]+)/);
    return match ? match[1].trim() : '';
  }).filter(Boolean);

  return cookieStrings.join('; ');
}

// Utility: API request with cookie handling
async function apiRequest(method, endpoint, body = null, auth = true) {
  const headers = {
    'Content-Type': 'application/json',
  };

  // Send cookies with authenticated requests
  if (auth && cookies) {
    headers['Cookie'] = cookies;
  }

  const options = {
    method,
    headers,
    credentials: 'include', // Important for cookie handling
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);

    // Update cookies from response
    const newCookies = extractCookies(response.headers);
    if (newCookies) {
      cookies = newCookies;
    }

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(responseData)}`);
    }

    // Unwrap API response format { success: true, data: {...} }
    return responseData.data || responseData;
  } catch (error) {
    console.error(`❌ API Error [${method} ${endpoint}]:`, error.message);
    throw error;
  }
}

// Step 1: Login
async function login() {
  console.log('\n🔐 Step 1: Login');
  console.log('─'.repeat(60));

  try {
    const response = await apiRequest('POST', '/auth/login', {
      username: USERNAME,
      password: PASSWORD,
    }, false);

    console.log('✅ Login successful');
    console.log('Response:', JSON.stringify(response, null, 2));
    console.log('🍪 Cookies set:', cookies ? 'Yes' : 'No');

    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    return false;
  }
}

// Step 2: Check and setup balance
async function checkBalance() {
  console.log('\n💰 Step 2: Check Balance');
  console.log('─'.repeat(60));

  try {
    const balance = await apiRequest('GET', '/account/balance');
    console.log('📊 Current Balance:');
    console.log('  Cash:', JSON.stringify(balance.cash, null, 2));
    console.log('  Coins:', JSON.stringify(balance.coins, null, 2));

    // Check if we have enough balance
    const usdBalance = balance.cash?.find(c => c.currency === 'USD');
    const btcBalance = balance.coins?.find(c => c.coin === 'BTC');

    if (!usdBalance || parseFloat(usdBalance.available) < 10000) {
      console.log('⚠️  Insufficient USD. Depositing 100,000 USD...');
      await apiRequest('POST', '/account/deposit', {
        asset: 'USD',
        amount: 100000,
      });
    }

    if (!btcBalance || parseFloat(btcBalance.available) < 1) {
      console.log('⚠️  Insufficient BTC. Depositing 10 BTC...');
      await apiRequest('POST', '/account/deposit', {
        asset: 'BTC',
        amount: 10,
      });
    }

    // Refresh balance
    const updatedBalance = await apiRequest('GET', '/account/balance');
    console.log('✅ Balance ready for testing');
    return updatedBalance;
  } catch (error) {
    console.error('❌ Balance check failed:', error.message);
    return null;
  }
}

// Step 3: Cancel all existing orders
async function cancelAllOrders() {
  console.log('\n🧹 Step 3: Clean Up Existing Orders');
  console.log('─'.repeat(60));

  try {
    const result = await apiRequest('POST', '/orders/cancel-all');
    console.log(`✅ Canceled ${result.canceled} orders`);
    await sleep(1000); // Wait for cancellations to process
    return true;
  } catch (error) {
    console.error('❌ Cancel all failed:', error.message);
    return false;
  }
}

// Test Case 1: Basic Limit Order Matching
async function testBasicMatching() {
  console.log('\n📝 Test Case 1: Basic Limit Order Matching');
  console.log('─'.repeat(60));

  try {
    // Place SELL order
    console.log('  → Placing LIMIT SELL 0.01 BTC @ $50,000...');
    const sellOrder = await apiRequest('POST', '/orders', {
      pair: 'BTC/USD',
      side: 'SELL',
      type: 'LIMIT',
      price: 50000,
      amount: 0.01,
      validity: 'GTC',
    });
    console.log('  📝 SELL Response:', JSON.stringify(sellOrder, null, 2));
    console.log(`  ✅ SELL Order ID: ${sellOrder.orderId || sellOrder.orderId}`);

    await sleep(2000); // Wait for order to be processed

    // Place matching BUY order
    console.log('  → Placing LIMIT BUY 0.01 BTC @ $50,000...');
    const buyOrder = await apiRequest('POST', '/orders', {
      pair: 'BTC/USD',
      side: 'BUY',
      type: 'LIMIT',
      price: 50000,
      amount: 0.01,
      validity: 'GTC',
    });
    console.log(`  ✅ BUY Order ID: ${buyOrder.orderId}`);

    await sleep(3000); // Wait for matching to complete

    // Check order status
    const sellStatus = await apiRequest('GET', `/orders/${sellOrder.orderId}`);
    const buyStatus = await apiRequest('GET', `/orders/${buyOrder.orderId}`);

    console.log(`  📊 SELL Order Status: ${sellStatus.status} (filled: ${sellStatus.filled})`);
    console.log(`  📊 BUY Order Status: ${buyStatus.status} (filled: ${buyStatus.filled})`);

    const passed = sellStatus.status === 'COMPLETED' && buyStatus.status === 'COMPLETED';
    testResults.push({
      test: 'Basic Limit Order Matching',
      passed,
      details: `SELL: ${sellStatus.status}, BUY: ${buyStatus.status}`,
    });

    return passed;
  } catch (error) {
    console.error('  ❌ Test failed:', error.message);
    testResults.push({ test: 'Basic Limit Order Matching', passed: false, error: error.message });
    return false;
  }
}

// Test Case 2: Partial Fill
async function testPartialFill() {
  console.log('\n📝 Test Case 2: Partial Fill');
  console.log('─'.repeat(60));

  try {
    // Place larger SELL order
    console.log('  → Placing LIMIT SELL 0.1 BTC @ $50,100...');
    const sellOrder = await apiRequest('POST', '/orders', {
      pair: 'BTC/USD',
      side: 'SELL',
      type: 'LIMIT',
      price: 50100,
      amount: 0.1,
      validity: 'GTC',
    });

    await sleep(2000);

    // Place smaller matching BUY order
    console.log('  → Placing LIMIT BUY 0.05 BTC @ $50,100...');
    const buyOrder = await apiRequest('POST', '/orders', {
      pair: 'BTC/USD',
      side: 'BUY',
      type: 'LIMIT',
      price: 50100,
      amount: 0.05,
      validity: 'GTC',
    });

    await sleep(3000);

    // Check order status
    const sellStatus = await apiRequest('GET', `/orders/${sellOrder.orderId}`);
    const buyStatus = await apiRequest('GET', `/orders/${buyOrder.orderId}`);

    console.log(`  📊 SELL: ${sellStatus.status} (filled: ${sellStatus.filled}/${sellStatus.amount})`);
    console.log(`  📊 BUY: ${buyStatus.status} (filled: ${buyStatus.filled}/${buyStatus.amount})`);

    const passed =
      sellStatus.status === 'PARTLY_FILLED' &&
      parseFloat(sellStatus.filled) === 0.05 &&
      buyStatus.status === 'COMPLETED';

    testResults.push({
      test: 'Partial Fill',
      passed,
      details: `SELL: ${sellStatus.status} (${sellStatus.filled}), BUY: ${buyStatus.status}`,
    });

    // Clean up remaining order
    await apiRequest('DELETE', `/orders/${sellOrder.orderId}`);

    return passed;
  } catch (error) {
    console.error('  ❌ Test failed:', error.message);
    testResults.push({ test: 'Partial Fill', passed: false, error: error.message });
    return false;
  }
}

// Test Case 3: Market Order Execution
async function testMarketOrder() {
  console.log('\n📝 Test Case 3: Market Order Execution');
  console.log('─'.repeat(60));

  try {
    // Place LIMIT SELL to create liquidity
    console.log('  → Placing LIMIT SELL 0.02 BTC @ $50,200...');
    const sellOrder = await apiRequest('POST', '/orders', {
      pair: 'BTC/USD',
      side: 'SELL',
      type: 'LIMIT',
      price: 50200,
      amount: 0.02,
      validity: 'GTC',
    });

    await sleep(2000);

    // Place MARKET BUY
    console.log('  → Placing MARKET BUY 0.01 BTC...');
    const buyOrder = await apiRequest('POST', '/orders', {
      pair: 'BTC/USD',
      side: 'BUY',
      type: 'MARKET',
      amount: 0.01,
    });

    await sleep(3000);

    // Check status
    const sellStatus = await apiRequest('GET', `/orders/${sellOrder.orderId}`);
    const buyStatus = await apiRequest('GET', `/orders/${buyOrder.orderId}`);

    console.log(`  📊 SELL: ${sellStatus.status} (filled: ${sellStatus.filled})`);
    console.log(`  📊 MARKET BUY: ${buyStatus.status} (filled: ${buyStatus.filled})`);

    const passed = buyStatus.status === 'COMPLETED' || buyStatus.status === 'PARTLY_FILLED';

    testResults.push({
      test: 'Market Order Execution',
      passed,
      details: `MARKET BUY: ${buyStatus.status} (${buyStatus.filled})`,
    });

    // Clean up
    if (sellStatus.status !== 'COMPLETED') {
      await apiRequest('DELETE', `/orders/${sellOrder.orderId}`);
    }

    return passed;
  } catch (error) {
    console.error('  ❌ Test failed:', error.message);
    testResults.push({ test: 'Market Order Execution', passed: false, error: error.message });
    return false;
  }
}

// Test Case 4: Orderbook Display and Updates
async function testOrderbookDisplay() {
  console.log('\n📝 Test Case 4: Orderbook Display & Updates');
  console.log('─'.repeat(60));

  try {
    // Step 1: Place multiple orders at different price levels
    console.log('  → Placing multiple SELL orders...');
    const sell1 = await apiRequest('POST', '/orders', {
      pair: 'BTC/USD',
      side: 'SELL',
      type: 'LIMIT',
      price: 50300,
      amount: 0.05,
      validity: 'GTC',
    });
    console.log(`    - SELL 0.05 BTC @ $50,300 (ID: ${sell1.orderId})`);

    const sell2 = await apiRequest('POST', '/orders', {
      pair: 'BTC/USD',
      side: 'SELL',
      type: 'LIMIT',
      price: 50300, // Same price to test aggregation
      amount: 0.03,
      validity: 'GTC',
    });
    console.log(`    - SELL 0.03 BTC @ $50,300 (ID: ${sell2.orderId})`);

    const sell3 = await apiRequest('POST', '/orders', {
      pair: 'BTC/USD',
      side: 'SELL',
      type: 'LIMIT',
      price: 50400,
      amount: 0.02,
      validity: 'GTC',
    });
    console.log(`    - SELL 0.02 BTC @ $50,400 (ID: ${sell3.orderId})`);

    console.log('  → Placing multiple BUY orders...');
    const buy1 = await apiRequest('POST', '/orders', {
      pair: 'BTC/USD',
      side: 'BUY',
      type: 'LIMIT',
      price: 50200,
      amount: 0.04,
      validity: 'GTC',
    });
    console.log(`    - BUY 0.04 BTC @ $50,200 (ID: ${buy1.orderId})`);

    const buy2 = await apiRequest('POST', '/orders', {
      pair: 'BTC/USD',
      side: 'BUY',
      type: 'LIMIT',
      price: 50100,
      amount: 0.06,
      validity: 'GTC',
    });
    console.log(`    - BUY 0.06 BTC @ $50,100 (ID: ${buy2.orderId})`);

    await sleep(2000);

    // Step 2: Check orderbook structure BEFORE matching
    console.log('\n  📊 Orderbook BEFORE matching:');
    const orderbookBefore = await apiRequest('GET', '/orderbook?pair=BTC/USD&levels=10', null, false);
    console.log(`    Bids (${orderbookBefore.bids?.length || 0} levels):`, JSON.stringify(orderbookBefore.bids?.slice(0, 3), null, 2));
    console.log(`    Asks (${orderbookBefore.asks?.length || 0} levels):`, JSON.stringify(orderbookBefore.asks?.slice(0, 3), null, 2));

    // Verify orderbook structure
    const hasCorrectStructure =
      orderbookBefore.bids && Array.isArray(orderbookBefore.bids) &&
      orderbookBefore.asks && Array.isArray(orderbookBefore.asks) &&
      orderbookBefore.bids.length > 0 && orderbookBefore.asks.length > 0;

    // Check if our orders are in the book
    const bestBid = orderbookBefore.bids[0];
    const bestAsk = orderbookBefore.asks[0];
    console.log(`\n    Best Bid: $${bestBid?.price} (qty: ${bestBid?.quantity})`);
    console.log(`    Best Ask: $${bestAsk?.price} (qty: ${bestAsk?.quantity})`);
    console.log(`    Spread: $${bestAsk && bestBid ? (parseFloat(bestAsk.price) - parseFloat(bestBid.price)).toFixed(2) : 'N/A'}`);

    // Step 3: Execute a matching order
    console.log('\n  → Placing MARKET BUY to match with asks...');
    const marketBuy = await apiRequest('POST', '/orders', {
      pair: 'BTC/USD',
      side: 'BUY',
      type: 'MARKET',
      amount: 0.06, // Will consume part of sell1 and sell2 at 50300
    });
    console.log(`    Market BUY 0.06 BTC (ID: ${marketBuy.orderId})`);

    await sleep(3000); // Wait for matching to complete

    // Step 4: Check orderbook AFTER matching
    console.log('\n  📊 Orderbook AFTER matching:');
    const orderbookAfter = await apiRequest('GET', '/orderbook?pair=BTC/USD&levels=10', null, false);
    console.log(`    Bids (${orderbookAfter.bids?.length || 0} levels):`, JSON.stringify(orderbookAfter.bids?.slice(0, 3), null, 2));
    console.log(`    Asks (${orderbookAfter.asks?.length || 0} levels):`, JSON.stringify(orderbookAfter.asks?.slice(0, 3), null, 2));

    const bestAskAfter = orderbookAfter.asks[0];
    console.log(`\n    Best Ask After: $${bestAskAfter?.price} (qty: ${bestAskAfter?.quantity})`);

    // Step 5: Verify orderbook changes
    console.log('\n  ✓ Verifying orderbook updates...');

    // Check if quantity at $50,300 was reduced
    const ask50300After = orderbookAfter.asks?.find(a => parseFloat(a.price) === 50300);
    const expectedQty = 0.05 + 0.03 - 0.06; // 0.08 - 0.06 = 0.02 remaining

    console.log(`    Expected remaining @ $50,300: ${expectedQty} BTC`);
    console.log(`    Actual remaining @ $50,300: ${ask50300After?.quantity || 0} BTC`);

    // Check market order status
    const marketBuyStatus = await apiRequest('GET', `/orders/${marketBuy.orderId}`);
    console.log(`    Market order status: ${marketBuyStatus.status} (filled: ${marketBuyStatus.filled})`);

    // Use tolerance for floating point comparison
    const actualQty = ask50300After ? parseFloat(ask50300After.quantity) : 0;
    const qtyMatches = Math.abs(actualQty - expectedQty) < 0.00001; // 0.00001 BTC tolerance

    const passed =
      hasCorrectStructure &&
      orderbookBefore.bids.length > 0 &&
      orderbookBefore.asks.length > 0 &&
      marketBuyStatus.status === 'COMPLETED' &&
      ask50300After && qtyMatches;

    testResults.push({
      test: 'Orderbook Display & Updates',
      passed,
      details: `Structure: ${hasCorrectStructure ? 'OK' : 'FAIL'}, Updates: ${passed ? 'OK' : 'FAIL'}`,
    });

    // Cleanup remaining orders
    console.log('\n  🧹 Cleaning up test orders...');
    await cancelAllOrders();

    return passed;
  } catch (error) {
    console.error('  ❌ Test failed:', error.message);
    testResults.push({ test: 'Orderbook Display & Updates', passed: false, error: error.message });

    // Cleanup on error
    try {
      await cancelAllOrders();
    } catch (cleanupError) {
      console.error('  ⚠️  Cleanup failed:', cleanupError.message);
    }

    return false;
  }
}

// Test Case 5: Verify Market Data Updates
async function testMarketDataUpdates() {
  console.log('\n📝 Test Case 4: Verify Market Data Updates');
  console.log('─'.repeat(60));

  try {
    // Check ticker
    console.log('  → Fetching ticker for BTC/USD...');
    const ticker = await apiRequest('GET', '/ticker/BTC%2FUSD', null, false);
    console.log(`  📊 Ticker: lastPrice=${ticker.lastPrice}, volume=${ticker.volume}, tradeCount=${ticker.tradeCount}`);

    // Check candles
    console.log('  → Fetching 1m candles...');
    const candles = await apiRequest('GET', '/ticker/BTC%2FUSD/candles?timeframe=1m&limit=10', null, false);
    console.log(`  📊 Candles: ${candles.length} candles retrieved`);

    if (candles.length > 0) {
      const latestCandle = candles[0];
      console.log(`  📊 Latest Candle: open=${latestCandle.open}, close=${latestCandle.close}, volume=${latestCandle.volume}`);
    }

    const passed = ticker && ticker.lastPrice && candles && candles.length > 0;

    testResults.push({
      test: 'Market Data Updates',
      passed,
      details: `Ticker: ${ticker ? 'OK' : 'FAIL'}, Candles: ${candles?.length || 0}`,
    });

    return passed;
  } catch (error) {
    console.error('  ❌ Test failed:', error.message);
    testResults.push({ test: 'Market Data Updates', passed: false, error: error.message });
    return false;
  }
}

// Test Case 5: No Match Scenario (Wide Spread)
async function testNoMatch() {
  console.log('\n📝 Test Case 5: No Match (Wide Spread)');
  console.log('─'.repeat(60));

  try {
    // Place BUY at low price
    console.log('  → Placing LIMIT BUY @ $49,000...');
    const buyOrder = await apiRequest('POST', '/orders', {
      pair: 'BTC/USD',
      side: 'BUY',
      type: 'LIMIT',
      price: 49000,
      amount: 0.01,
      validity: 'GTC',
    });

    await sleep(2000);

    // Place SELL at high price
    console.log('  → Placing LIMIT SELL @ $51,000...');
    const sellOrder = await apiRequest('POST', '/orders', {
      pair: 'BTC/USD',
      side: 'SELL',
      type: 'LIMIT',
      price: 51000,
      amount: 0.01,
      validity: 'GTC',
    });

    await sleep(3000);

    // Check both orders should still be PENDING
    const buyStatus = await apiRequest('GET', `/orders/${buyOrder.orderId}`);
    const sellStatus = await apiRequest('GET', `/orders/${sellOrder.orderId}`);

    console.log(`  📊 BUY: ${buyStatus.status} (no match expected)`);
    console.log(`  📊 SELL: ${sellStatus.status} (no match expected)`);

    const passed = buyStatus.status === 'PENDING' && sellStatus.status === 'PENDING';

    testResults.push({
      test: 'No Match (Wide Spread)',
      passed,
      details: `BUY: ${buyStatus.status}, SELL: ${sellStatus.status}`,
    });

    // Clean up
    await apiRequest('DELETE', `/orders/${buyOrder.orderId}`);
    await apiRequest('DELETE', `/orders/${sellOrder.orderId}`);

    return passed;
  } catch (error) {
    console.error('  ❌ Test failed:', error.message);
    testResults.push({ test: 'No Match (Wide Spread)', passed: false, error: error.message });
    return false;
  }
}

// Print test summary
function printSummary() {
  console.log('\n' + '═'.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(60));

  const passed = testResults.filter(r => r.passed).length;
  const total = testResults.length;

  testResults.forEach((result, index) => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${index + 1}. ${result.test}`);
    console.log(`   ${result.details || result.error || ''}`);
  });

  console.log('─'.repeat(60));
  console.log(`Result: ${passed}/${total} tests passed`);
  console.log('═'.repeat(60) + '\n');

  return passed === total;
}

// Main execution
async function main() {
  console.log('🚀 Trading Engine Matching Test Suite');
  console.log('═'.repeat(60));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`User: ${USERNAME}`);
  console.log('═'.repeat(60));

  try {
    // Step 1: Login
    const loginSuccess = await login();
    if (!loginSuccess) {
      console.error('\n❌ Login failed. Exiting...');
      process.exit(1);
    }

    // Step 2: Check balance
    const balance = await checkBalance();
    if (!balance) {
      console.error('\n❌ Balance check failed. Exiting...');
      process.exit(1);
    }

    // Step 3: Clean up
    await cancelAllOrders();

    // Run test cases
    console.log('\n🧪 Running Test Cases...');
    console.log('═'.repeat(60));

    await testBasicMatching();
    await sleep(2000);

    await testPartialFill();
    await sleep(2000);

    await testMarketOrder();
    await sleep(2000);

    await testNoMatch();
    await sleep(2000);

    await testOrderbookDisplay();
    await sleep(2000);

    await testMarketDataUpdates();

    // Print summary
    const allPassed = printSummary();

    process.exit(allPassed ? 0 : 1);

  } catch (error) {
    console.error('\n💥 Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { main };
