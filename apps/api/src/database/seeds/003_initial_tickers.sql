-- Seed: Initial ticker data for trading pairs
-- Created: 2026-03-12

INSERT INTO ticker (pair_name, last_price, open_price, high_price, low_price, volume, bid_price, bid_qty, ask_price, ask_qty, change_percent, updated_at)
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
