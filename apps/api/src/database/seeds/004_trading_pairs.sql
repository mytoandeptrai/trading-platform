-- Seed: Trading pairs
-- Created: 2026-03-20
-- Purpose: Insert initial trading pairs

INSERT INTO trading_pair (
    id,
    name,
    base_coin,
    quote_currency,
    min_order_amount,
    max_order_amount,
    tick_size,
    max_price,
    min_price,
    taker_fee_rate,
    maker_fee_rate,
    is_trading_active
) VALUES
(
    1,
    'BTC/USDT',
    'BTC',
    'USDT',
    0.001,          -- min 0.001 BTC
    100,            -- max 100 BTC
    0.01,           -- tick size $0.01
    1000000,        -- max price $1M
    0.01,           -- min price $0.01
    0.001,          -- 0.1% taker fee
    0.0005,         -- 0.05% maker fee
    true
),
(
    2,
    'ETH/USDT',
    'ETH',
    'USDT',
    0.01,           -- min 0.01 ETH
    1000,           -- max 1000 ETH
    0.01,           -- tick size $0.01
    100000,         -- max price $100k
    0.01,           -- min price $0.01
    0.001,          -- 0.1% taker fee
    0.0005,         -- 0.05% maker fee
    true
)
ON CONFLICT (name) DO UPDATE SET
    base_coin = EXCLUDED.base_coin,
    quote_currency = EXCLUDED.quote_currency,
    min_order_amount = EXCLUDED.min_order_amount,
    max_order_amount = EXCLUDED.max_order_amount,
    tick_size = EXCLUDED.tick_size,
    max_price = EXCLUDED.max_price,
    min_price = EXCLUDED.min_price,
    taker_fee_rate = EXCLUDED.taker_fee_rate,
    maker_fee_rate = EXCLUDED.maker_fee_rate,
    is_trading_active = EXCLUDED.is_trading_active,
    updated_at = CURRENT_TIMESTAMP;

-- Reset sequence to max id
SELECT setval('trading_pair_id_seq', (SELECT MAX(id) FROM trading_pair));
