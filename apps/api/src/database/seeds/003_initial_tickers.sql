-- Seed: Initial ticker and historical candle data for trading pairs
-- Created: 2026-03-12
-- Updated: 2026-03-13 - add ~2,000 1m candles per pair for testing

-- 1) Seed latest ticker snapshot (1 row per pair)
INSERT INTO ticker (
  pair_name,
  last_price,
  open_price,
  high_price,
  low_price,
  volume,
  bid_price,
  bid_qty,
  ask_price,
  ask_qty,
  change_percent,
  updated_at
)
VALUES
  ('BTC/USD', 50000.00, 49500.00, 50500.00, 49000.00, 0, 49950.00, 0, 50050.00, 0, 1.01, NOW()),
  ('ETH/USD', 3000.00, 2950.00, 3050.00, 2900.00, 0, 2995.00, 0, 3005.00, 0, 1.69, NOW()),
  ('BTC/USDT', 50010.00, 49510.00, 50510.00, 49010.00, 0, 49960.00, 0, 50060.00, 0, 1.01, NOW()),
  ('ETH/USDT', 3002.00, 2952.00, 3052.00, 2902.00, 0, 2997.00, 0, 3007.00, 0, 1.69, NOW())
ON CONFLICT (pair_name) DO UPDATE SET
  last_price = EXCLUDED.last_price,
  open_price = EXCLUDED.open_price,
  high_price = EXCLUDED.high_price,
  low_price = EXCLUDED.low_price,
  volume = EXCLUDED.volume,
  bid_price = EXCLUDED.bid_price,
  bid_qty = EXCLUDED.bid_qty,
  ask_price = EXCLUDED.ask_price,
  ask_qty = EXCLUDED.ask_qty,
  change_percent = EXCLUDED.change_percent,
  updated_at = NOW();

-- 2) Seed historical 1-minute candles (~2,000 rows per pair)
--    This creates synthetic OHLCV data for each pair for the last ~2,000 minutes.
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
  volume,
  change_percent,
  updated_at
FROM ticker
ORDER BY pair_name;
