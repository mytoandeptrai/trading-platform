-- Seed: Initial ticker and historical candle data for trading pairs
-- Created: 2026-03-12
-- Updated: 2026-03-19 - update ticker schema to match migration 009

-- 1) Seed latest ticker snapshot (1 row per pair)
-- Updated to match new ticker schema with all required fields
INSERT INTO ticker (
  pair_name,
  last_price,
  open_price,
  high_price,
  low_price,
  price_change,
  price_change_percent,
  volume,
  quote_volume,
  bid_price,
  bid_qty,
  ask_price,
  ask_qty,
  trade_count,
  updated_at
)
VALUES
  -- BTC/USD: Base price $50,000
  (
    'BTC/USD',
    '50000.00000000',      -- last_price
    '49500.00000000',      -- open_price (24h ago)
    '50500.00000000',      -- high_price (24h)
    '49000.00000000',      -- low_price (24h)
    '500.00000000',        -- price_change (+$500)
    '1.0101',              -- price_change_percent (+1.01%)
    '125.50000000',        -- volume (BTC)
    '6275000.00000000',    -- quote_volume (USD)
    '49950.00000000',      -- bid_price (best buy)
    '0.50000000',          -- bid_qty
    '50050.00000000',      -- ask_price (best sell)
    '0.30000000',          -- ask_qty
    42,                    -- trade_count
    NOW()
  ),
  -- ETH/USD: Base price $3,000
  (
    'ETH/USD',
    '3000.00000000',
    '2950.00000000',
    '3050.00000000',
    '2900.00000000',
    '50.00000000',
    '1.6949',
    '850.75000000',
    '2552250.00000000',
    '2995.00000000',
    '5.00000000',
    '3005.00000000',
    '3.50000000',
    156,
    NOW()
  ),
  -- BTC/USDT: Base price $50,010
  (
    'BTC/USDT',
    '50010.00000000',
    '49510.00000000',
    '50510.00000000',
    '49010.00000000',
    '500.00000000',
    '1.0101',
    '98.25000000',
    '4913122.50000000',
    '49960.00000000',
    '0.45000000',
    '50060.00000000',
    '0.35000000',
    38,
    NOW()
  ),
  -- ETH/USDT: Base price $3,002
  (
    'ETH/USDT',
    '3002.00000000',
    '2952.00000000',
    '3052.00000000',
    '2902.00000000',
    '50.00000000',
    '1.6937',
    '725.80000000',
    '2178251.60000000',
    '2997.00000000',
    '4.80000000',
    '3007.00000000',
    '3.20000000',
    134,
    NOW()
  )
ON CONFLICT (pair_name) DO UPDATE SET
  last_price = EXCLUDED.last_price,
  open_price = EXCLUDED.open_price,
  high_price = EXCLUDED.high_price,
  low_price = EXCLUDED.low_price,
  price_change = EXCLUDED.price_change,
  price_change_percent = EXCLUDED.price_change_percent,
  volume = EXCLUDED.volume,
  quote_volume = EXCLUDED.quote_volume,
  bid_price = EXCLUDED.bid_price,
  bid_qty = EXCLUDED.bid_qty,
  ask_price = EXCLUDED.ask_price,
  ask_qty = EXCLUDED.ask_qty,
  trade_count = EXCLUDED.trade_count,
  updated_at = NOW();

-- 2) Seed historical 1-minute candles (~2,000 rows per pair)
--    This creates synthetic OHLCV data for each pair for the last ~2,000 minutes (~33 hours).
WITH base_pairs AS (
  SELECT
    p AS pair_name,
    CASE
      WHEN p LIKE 'BTC%' THEN 50000.0
      WHEN p LIKE 'ETH%' THEN 3000.0
      ELSE 1000.0
    END AS base_price
  FROM unnest(ARRAY['BTC/USD','ETH/USD','BTC/USDT','ETH/USDT']) AS p
),
time_series AS (
  -- Generate 0..1999 minutes ago for each pair (≈ 2,000 candles / pair)
  SELECT
    b.pair_name,
    b.base_price,
    gs AS idx,
    (NOW() - (gs || ' minutes')::interval) AS open_time
  FROM base_pairs b,
       generate_series(0, 1999) AS gs
),
ohlcv AS (
  SELECT
    pair_name,
    open_time,
    open_time + interval '1 minute' AS close_time,
    -- Price path around base_price with small random drift
    (base_price + (random() - 0.5) * (base_price * 0.01))::numeric(20, 8) AS open,
    -- high >= open/close, low <= open/close
    (
      base_price
      + abs(random() * (base_price * 0.015))
    )::numeric(20, 8) AS high_raw,
    (
      base_price
      - abs(random() * (base_price * 0.015))
    )::numeric(20, 8) AS low_raw
  FROM time_series
),
normalized AS (
  SELECT
    pair_name,
    open_time,
    close_time,
    LEAST(open, high_raw, low_raw) AS low_bound,
    GREATEST(open, high_raw, low_raw) AS high_bound,
    open,
    high_raw,
    low_raw
  FROM ohlcv
),
candles AS (
  SELECT
    pair_name,
    open_time,
    close_time,
    open,
    -- ensure constraints: high >= open/close and low <= open/close
    GREATEST(open, high_bound)::numeric(20, 8) AS high,
    LEAST(open, low_bound)::numeric(20, 8) AS low,
    (
      LEAST(open, high_bound, low_bound)
      + (GREATEST(open, high_bound, low_bound) - LEAST(open, high_bound, low_bound))
        * random()
    )::numeric(20, 8) AS close,
    (abs(random() * 10))::numeric(20, 8) AS volume,
    (random() * 50)::int AS trades_count,
    true AS is_closed
  FROM normalized
)
INSERT INTO candle_1m (
  pair_name,
  open_time,
  close_time,
  open,
  high,
  low,
  close,
  volume,
  trades_count,
  is_closed
)
SELECT
  pair_name,
  open_time,
  close_time,
  open,
  high,
  low,
  close,
  volume,
  trades_count,
  is_closed
FROM candles
ON CONFLICT (pair_name, open_time) DO NOTHING;

-- 3) Aggregate 1m candles into 5m candles
WITH b AS (
  SELECT
    pair_name,
    (
      date_trunc('minute', open_time)
      - make_interval(mins := (EXTRACT(minute FROM open_time)::int % 5))
    ) AS bucket_start,
    open_time,
    open,
    high,
    low,
    close,
    volume,
    trades_count
  FROM candle_1m
),
agg AS (
  SELECT
    pair_name,
    bucket_start,
    MIN(open_time) AS first_open_time,
    MAX(open_time) AS last_open_time,
    MAX(high) AS high,
    MIN(low) AS low,
    SUM(volume) AS volume,
    SUM(trades_count) AS trades_count
  FROM b
  GROUP BY pair_name, bucket_start
),
o AS (
  SELECT DISTINCT ON (pair_name, bucket_start)
    pair_name,
    bucket_start,
    open
  FROM b
  ORDER BY pair_name, bucket_start, open_time
),
c AS (
  SELECT DISTINCT ON (pair_name, bucket_start)
    pair_name,
    bucket_start,
    close
  FROM b
  ORDER BY pair_name, bucket_start, open_time DESC
)
INSERT INTO candle_5m (
  pair_name,
  open_time,
  close_time,
  open,
  high,
  low,
  close,
  volume,
  trades_count,
  is_closed
)
SELECT
  agg.pair_name,
  agg.bucket_start AS open_time,
  agg.bucket_start + interval '5 minutes' AS close_time,
  o.open,
  agg.high,
  agg.low,
  c.close,
  agg.volume,
  agg.trades_count,
  true
FROM agg
JOIN o USING (pair_name, bucket_start)
JOIN c USING (pair_name, bucket_start)
ON CONFLICT (pair_name, open_time) DO NOTHING;

-- 4) Aggregate 1m candles into 1h candles
WITH b AS (
  SELECT
    pair_name,
    date_trunc('hour', open_time) AS bucket_start,
    open_time,
    open,
    high,
    low,
    close,
    volume,
    trades_count
  FROM candle_1m
),
agg AS (
  SELECT
    pair_name,
    bucket_start,
    MIN(open_time) AS first_open_time,
    MAX(open_time) AS last_open_time,
    MAX(high) AS high,
    MIN(low) AS low,
    SUM(volume) AS volume,
    SUM(trades_count) AS trades_count
  FROM b
  GROUP BY pair_name, bucket_start
),
o AS (
  SELECT DISTINCT ON (pair_name, bucket_start)
    pair_name,
    bucket_start,
    open
  FROM b
  ORDER BY pair_name, bucket_start, open_time
),
c AS (
  SELECT DISTINCT ON (pair_name, bucket_start)
    pair_name,
    bucket_start,
    close
  FROM b
  ORDER BY pair_name, bucket_start, open_time DESC
)
INSERT INTO candle_1h (
  pair_name,
  open_time,
  close_time,
  open,
  high,
  low,
  close,
  volume,
  trades_count,
  is_closed
)
SELECT
  agg.pair_name,
  agg.bucket_start AS open_time,
  agg.bucket_start + interval '1 hour' AS close_time,
  o.open,
  agg.high,
  agg.low,
  c.close,
  agg.volume,
  agg.trades_count,
  true
FROM agg
JOIN o USING (pair_name, bucket_start)
JOIN c USING (pair_name, bucket_start)
ON CONFLICT (pair_name, open_time) DO NOTHING;

-- 5) Aggregate 1m candles into 1d candles
WITH b AS (
  SELECT
    pair_name,
    date_trunc('day', open_time) AS bucket_start,
    open_time,
    open,
    high,
    low,
    close,
    volume,
    trades_count
  FROM candle_1m
),
agg AS (
  SELECT
    pair_name,
    bucket_start,
    MIN(open_time) AS first_open_time,
    MAX(open_time) AS last_open_time,
    MAX(high) AS high,
    MIN(low) AS low,
    SUM(volume) AS volume,
    SUM(trades_count) AS trades_count
  FROM b
  GROUP BY pair_name, bucket_start
),
o AS (
  SELECT DISTINCT ON (pair_name, bucket_start)
    pair_name,
    bucket_start,
    open
  FROM b
  ORDER BY pair_name, bucket_start, open_time
),
c AS (
  SELECT DISTINCT ON (pair_name, bucket_start)
    pair_name,
    bucket_start,
    close
  FROM b
  ORDER BY pair_name, bucket_start, open_time DESC
)
INSERT INTO candle_1d (
  pair_name,
  open_time,
  close_time,
  open,
  high,
  low,
  close,
  volume,
  trades_count,
  is_closed
)
SELECT
  agg.pair_name,
  agg.bucket_start AS open_time,
  agg.bucket_start + interval '1 day' AS close_time,
  o.open,
  agg.high,
  agg.low,
  c.close,
  agg.volume,
  agg.trades_count,
  true
FROM agg
JOIN o USING (pair_name, bucket_start)
JOIN c USING (pair_name, bucket_start)
ON CONFLICT (pair_name, open_time) DO NOTHING;

-- Display seeded tickers
SELECT
  pair_name,
  last_price,
  open_price,
  high_price,
  low_price,
  price_change,
  price_change_percent,
  volume,
  quote_volume,
  trade_count,
  bid_price,
  bid_qty,
  ask_price,
  ask_qty,
  updated_at
FROM ticker
ORDER BY pair_name;

-- Display candle counts
SELECT
  'candle_1m' AS table_name,
  pair_name,
  COUNT(*) AS candle_count,
  MIN(open_time) AS earliest,
  MAX(open_time) AS latest
FROM candle_1m
GROUP BY pair_name
UNION ALL
SELECT
  'candle_5m',
  pair_name,
  COUNT(*),
  MIN(open_time),
  MAX(open_time)
FROM candle_5m
GROUP BY pair_name
UNION ALL
SELECT
  'candle_1h',
  pair_name,
  COUNT(*),
  MIN(open_time),
  MAX(open_time)
FROM candle_1h
GROUP BY pair_name
UNION ALL
SELECT
  'candle_1d',
  pair_name,
  COUNT(*),
  MIN(open_time),
  MAX(open_time)
FROM candle_1d
GROUP BY pair_name
ORDER BY table_name, pair_name;
