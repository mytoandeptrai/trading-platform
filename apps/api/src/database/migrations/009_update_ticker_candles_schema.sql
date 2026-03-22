-- Migration: Update ticker and candles schema for Phase 5
-- Created: 2026-03-18

-- 1. Update ticker table to Binance-like schema
-- Convert id from SERIAL to UUID
ALTER TABLE ticker DROP CONSTRAINT IF EXISTS ticker_pkey CASCADE;
ALTER TABLE ticker DROP COLUMN IF EXISTS id;
ALTER TABLE ticker ADD COLUMN id UUID PRIMARY KEY DEFAULT gen_random_uuid();

-- Add missing columns
ALTER TABLE ticker ADD COLUMN IF NOT EXISTS price_change NUMERIC(20, 8) DEFAULT 0;
ALTER TABLE ticker ADD COLUMN IF NOT EXISTS price_change_percent NUMERIC(10, 4) DEFAULT 0;
ALTER TABLE ticker ADD COLUMN IF NOT EXISTS quote_volume NUMERIC(20, 8) DEFAULT 0;
ALTER TABLE ticker ADD COLUMN IF NOT EXISTS trade_count INT DEFAULT 0;
ALTER TABLE ticker ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Rename change_percent to match entity (if exists)
ALTER TABLE ticker DROP COLUMN IF EXISTS change_percent;

-- Update constraints
ALTER TABLE ticker DROP CONSTRAINT IF EXISTS check_ticker_prices;
ALTER TABLE ticker ADD CONSTRAINT check_ticker_prices CHECK (
    (last_price IS NULL OR last_price > 0)
    AND (open_price IS NULL OR open_price > 0)
    AND (high_price IS NULL OR high_price > 0)
    AND (low_price IS NULL OR low_price > 0)
    AND (bid_price IS NULL OR bid_price > 0)
    AND (ask_price IS NULL OR ask_price > 0)
    AND volume >= 0
    AND quote_volume >= 0
    AND trade_count >= 0
);

-- 2. Update candle tables: add created_at and updated_at columns
-- Convert id from BIGSERIAL to UUID
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY['candle_1m', 'candle_5m', 'candle_1h', 'candle_1d']
    LOOP
        -- Drop old id column and add UUID
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I_pkey CASCADE', tbl, tbl);
        EXECUTE format('ALTER TABLE %I DROP COLUMN IF EXISTS id', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN id UUID PRIMARY KEY DEFAULT gen_random_uuid()', tbl);

        -- Add timestamp columns
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP', tbl);

        -- Add updated_at trigger
        EXECUTE format('
            CREATE TRIGGER update_%I_updated_at
                BEFORE UPDATE ON %I
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column()
        ', tbl, tbl);
    END LOOP;
END $$;

-- Comments
COMMENT ON COLUMN ticker.price_change IS 'Absolute price change in 24h (lastPrice - openPrice)';
COMMENT ON COLUMN ticker.price_change_percent IS 'Percentage price change in 24h';
COMMENT ON COLUMN ticker.quote_volume IS 'Total quote asset volume in 24h (e.g., USD in BTC/USD)';
COMMENT ON COLUMN ticker.trade_count IS 'Number of trades in 24h';
