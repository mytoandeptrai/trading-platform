-- Seed: Test accounts with balances
-- Created: 2026-03-12

-- Create trading accounts
INSERT INTO account (id, user_id, account_type, trading_status, kyc_level, total_balance, available_balance, locked_balance, created_at, updated_at)
VALUES
  (1, 1, 'INDIVIDUAL', 'ACTIVE', 1, 100000, 100000, 0, NOW(), NOW()),
  (2, 2, 'INDIVIDUAL', 'ACTIVE', 1, 100000, 100000, 0, NOW(), NOW()),
  (3, 3, 'INDIVIDUAL', 'ACTIVE', 1, 50000, 50000, 0, NOW(), NOW()),
  (4, 4, 'BUSINESS', 'ACTIVE', 2, 500000, 500000, 0, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Initialize coin balances (BTC, ETH)
INSERT INTO account_coin (account_id, coin_name, available, locked, frozen, total, updated_at)
VALUES
  -- Trader1: 10 BTC, 50 ETH
  (1, 'BTC', 10, 0, 0, 10, NOW()),
  (1, 'ETH', 50, 0, 0, 50, NOW()),

  -- Trader2: 10 BTC, 50 ETH
  (2, 'BTC', 10, 0, 0, 10, NOW()),
  (2, 'ETH', 50, 0, 0, 50, NOW()),

  -- Trader3: 5 BTC, 20 ETH
  (3, 'BTC', 5, 0, 0, 5, NOW()),
  (3, 'ETH', 20, 0, 0, 20, NOW()),

  -- Admin: 100 BTC, 500 ETH
  (4, 'BTC', 100, 0, 0, 100, NOW()),
  (4, 'ETH', 500, 0, 0, 500, NOW())
ON CONFLICT (account_id, coin_name) DO NOTHING;

-- Initialize cash balances (USD)
INSERT INTO account_cash (account_id, currency_name, available, locked, total, updated_at)
VALUES
  (1, 'USD', 100000, 0, 100000, NOW()),
  (2, 'USD', 100000, 0, 100000, NOW()),
  (3, 'USD', 50000, 0, 50000, NOW()),
  (4, 'USD', 500000, 0, 500000, NOW())
ON CONFLICT (account_id) DO NOTHING;

-- Reset sequences
SELECT setval(pg_get_serial_sequence('account', 'id'), COALESCE(MAX(id), 1), true) FROM account;
SELECT setval(pg_get_serial_sequence('account_coin', 'id'), COALESCE(MAX(id), 1), true) FROM account_coin;
SELECT setval(pg_get_serial_sequence('account_cash', 'id'), COALESCE(MAX(id), 1), true) FROM account_cash;

-- Display seeded accounts
SELECT
  a.id,
  u.username,
  a.account_type,
  a.trading_status,
  ac.currency_name,
  ac.available as cash_available,
  (SELECT COUNT(*) FROM account_coin WHERE account_id = a.id) as coin_count
FROM account a
JOIN "user" u ON a.user_id = u.id
JOIN account_cash ac ON a.id = ac.account_id
ORDER BY a.id;
