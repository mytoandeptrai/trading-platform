-- Seed realistic candle data for BTC/USDT
-- Timeframe: Last 7 days, 1-hour candles
-- Price range: 48000-52000 USDT (realistic volatility)

INSERT INTO candles (pair_name, open_time, close_time, "interval", open, high, low, close, volume, trade_count, is_closed, created_at, updated_at)
VALUES
  -- Day 1 (7 days ago) - Bullish trend starting from 48000
  ('BTC/USDT', NOW() - INTERVAL '168 hours', NOW() - INTERVAL '167 hours', '1h', '48000', '48500', '47900', '48400', '12.5', 45, true, NOW(), NOW()),
  ('BTC/USDT', NOW() - INTERVAL '167 hours', NOW() - INTERVAL '166 hours', '1h', '48400', '48900', '48300', '48750', '15.2', 52, true, NOW(), NOW()),
  ('BTC/USDT', NOW() - INTERVAL '166 hours', NOW() - INTERVAL '165 hours', '1h', '48750', '49200', '48600', '49100', '18.7', 63, true, NOW(), NOW()),
  ('BTC/USDT', NOW() - INTERVAL '165 hours', NOW() - INTERVAL '164 hours', '1h', '49100', '49400', '48950', '49250', '14.3', 48, true, NOW(), NOW()),

  -- Day 2 - Consolidation around 49000
  ('BTC/USDT', NOW() - INTERVAL '164 hours', NOW() - INTERVAL '163 hours', '1h', '49250', '49500', '49100', '49200', '11.8', 41, true, NOW(), NOW()),
  ('BTC/USDT', NOW() - INTERVAL '163 hours', NOW() - INTERVAL '162 hours', '1h', '49200', '49350', '48950', '49050', '13.4', 47, true, NOW(), NOW()),
  ('BTC/USDT', NOW() - INTERVAL '162 hours', NOW() - INTERVAL '161 hours', '1h', '49050', '49300', '48900', '49150', '16.2', 55, true, NOW(), NOW()),
  ('BTC/USDT', NOW() - INTERVAL '161 hours', NOW() - INTERVAL '160 hours', '1h', '49150', '49400', '49000', '49350', '12.9', 44, true, NOW(), NOW()),

  -- Day 3 - Breakout to 50000
  ('BTC/USDT', NOW() - INTERVAL '160 hours', NOW() - INTERVAL '159 hours', '1h', '49350', '49800', '49250', '49700', '19.5', 68, true, NOW(), NOW()),
  ('BTC/USDT', NOW() - INTERVAL '159 hours', NOW() - INTERVAL '158 hours', '1h', '49700', '50200', '49600', '50100', '25.3', 87, true, NOW(), NOW()),
  ('BTC/USDT', NOW() - INTERVAL '158 hours', NOW() - INTERVAL '157 hours', '1h', '50100', '50500', '49950', '50300', '22.1', 76, true, NOW(), NOW()),
  ('BTC/USDT', NOW() - INTERVAL '157 hours', NOW() - INTERVAL '156 hours', '1h', '50300', '50650', '50200', '50500', '18.7', 64, true, NOW(), NOW()),

  -- Day 4 - Testing resistance at 51000
  ('BTC/USDT', NOW() - INTERVAL '156 hours', NOW() - INTERVAL '155 hours', '1h', '50500', '50900', '50400', '50750', '17.3', 59, true, NOW(), NOW()),
  ('BTC/USDT', NOW() - INTERVAL '155 hours', NOW() - INTERVAL '154 hours', '1h', '50750', '51200', '50650', '51000', '21.8', 74, true, NOW(), NOW()),
  ('BTC/USDT', NOW() - INTERVAL '154 hours', NOW() - INTERVAL '153 hours', '1h', '51000', '51300', '50850', '51100', '19.4', 67, true, NOW(), NOW()),
  ('BTC/USDT', NOW() - INTERVAL '153 hours', NOW() - INTERVAL '152 hours', '1h', '51100', '51400', '50950', '51250', '16.8', 58, true, NOW(), NOW()),

  -- Day 5 - Peak at 52000
  ('BTC/USDT', NOW() - INTERVAL '152 hours', NOW() - INTERVAL '151 hours', '1h', '51250', '51700', '51150', '51600', '20.2', 70, true, NOW(), NOW()),
  ('BTC/USDT', NOW() - INTERVAL '151 hours', NOW() - INTERVAL '150 hours', '1h', '51600', '52100', '51500', '51950', '28.5', 95, true, NOW(), NOW()),
  ('BTC/USDT', NOW() - INTERVAL '150 hours', NOW() - INTERVAL '149 hours', '1h', '51950', '52200', '51800', '52000', '24.7', 84, true, NOW(), NOW()),
  ('BTC/USDT', NOW() - INTERVAL '149 hours', NOW() - INTERVAL '148 hours', '1h', '52000', '52150', '51750', '51900', '18.9', 65, true, NOW(), NOW()),

  -- Day 6 - Pullback to 50000
  ('BTC/USDT', NOW() - INTERVAL '148 hours', NOW() - INTERVAL '147 hours', '1h', '51900', '51950', '51500', '51600', '15.4', 53, true, NOW(), NOW()),
  ('BTC/USDT', NOW() - INTERVAL '147 hours', NOW() - INTERVAL '146 hours', '1h', '51600', '51700', '51200', '51300', '17.8', 61, true, NOW(), NOW()),
  ('BTC/USDT', NOW() - INTERVAL '146 hours', NOW() - INTERVAL '145 hours', '1h', '51300', '51400', '50900', '51000', '19.2', 66, true, NOW(), NOW()),
  ('BTC/USDT', NOW() - INTERVAL '145 hours', NOW() - INTERVAL '144 hours', '1h', '51000', '51100', '50600', '50700', '21.5', 73, true, NOW(), NOW()),

  -- Day 7 (recent) - Stabilizing around 50500
  ('BTC/USDT', NOW() - INTERVAL '144 hours', NOW() - INTERVAL '143 hours', '1h', '50700', '50950', '50550', '50800', '14.6', 50, true, NOW(), NOW()),
  ('BTC/USDT', NOW() - INTERVAL '143 hours', NOW() - INTERVAL '142 hours', '1h', '50800', '51000', '50650', '50900', '16.3', 56, true, NOW(), NOW()),
  ('BTC/USDT', NOW() - INTERVAL '142 hours', NOW() - INTERVAL '141 hours', '1h', '50900', '51100', '50750', '50950', '15.8', 54, true, NOW(), NOW()),
  ('BTC/USDT', NOW() - INTERVAL '141 hours', NOW() - INTERVAL '140 hours', '1h', '50950', '51150', '50800', '51050', '17.1', 59, true, NOW(), NOW()),

  -- Recent hours - Current price around 50000-51000
  ('BTC/USDT', NOW() - INTERVAL '12 hours', NOW() - INTERVAL '11 hours', '1h', '50500', '50750', '50400', '50650', '13.2', 46, true, NOW(), NOW()),
  ('BTC/USDT', NOW() - INTERVAL '11 hours', NOW() - INTERVAL '10 hours', '1h', '50650', '50900', '50550', '50800', '14.8', 51, true, NOW(), NOW()),
  ('BTC/USDT', NOW() - INTERVAL '10 hours', NOW() - INTERVAL '9 hours', '1h', '50800', '51000', '50700', '50950', '16.4', 56, true, NOW(), NOW()),
  ('BTC/USDT', NOW() - INTERVAL '9 hours', NOW() - INTERVAL '8 hours', '1h', '50950', '51100', '50850', '51000', '15.7', 54, true, NOW(), NOW()),
  ('BTC/USDT', NOW() - INTERVAL '8 hours', NOW() - INTERVAL '7 hours', '1h', '51000', '51200', '50900', '51100', '17.3', 59, true, NOW(), NOW()),
  ('BTC/USDT', NOW() - INTERVAL '7 hours', NOW() - INTERVAL '6 hours', '1h', '51100', '51250', '50950', '51150', '14.9', 51, true, NOW(), NOW()),
  ('BTC/USDT', NOW() - INTERVAL '6 hours', NOW() - INTERVAL '5 hours', '1h', '51150', '51300', '51000', '51200', '16.2', 56, true, NOW(), NOW()),
  ('BTC/USDT', NOW() - INTERVAL '5 hours', NOW() - INTERVAL '4 hours', '1h', '51200', '51350', '51050', '51250', '15.5', 53, true, NOW(), NOW()),
  ('BTC/USDT', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '3 hours', '1h', '51250', '51400', '51100', '51300', '17.8', 61, true, NOW(), NOW()),
  ('BTC/USDT', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours', '1h', '51300', '51450', '51150', '51350', '16.7', 57, true, NOW(), NOW()),
  ('BTC/USDT', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour', '1h', '51350', '51500', '51200', '51400', '18.3', 63, true, NOW(), NOW()),
  ('BTC/USDT', NOW() - INTERVAL '1 hour', NOW(), '1h', '51400', '51550', '51250', '51450', '15.9', 55, true, NOW(), NOW());
