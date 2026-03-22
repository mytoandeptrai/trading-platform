-- Migration: Create trading_pairs table
-- Created: 2026-03-20
-- Purpose: Store trading pair configurations and metadata

CREATE TABLE IF NOT EXISTS trading_pair (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    base_coin VARCHAR(20) NOT NULL,
    quote_currency VARCHAR(20) NOT NULL,
    min_order_amount NUMERIC(20, 8) NOT NULL,
    max_order_amount NUMERIC(20, 8) NOT NULL,
    tick_size NUMERIC(20, 8) NOT NULL,
    max_price NUMERIC(20, 8) NOT NULL,
    min_price NUMERIC(20, 8) NOT NULL,
    taker_fee_rate NUMERIC(10, 6) NOT NULL DEFAULT 0.001,
    maker_fee_rate NUMERIC(10, 6) NOT NULL DEFAULT 0.0005,
    is_trading_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_trading_pair_amounts CHECK (
        min_order_amount > 0
        AND max_order_amount > min_order_amount
    ),
    CONSTRAINT check_trading_pair_prices CHECK (
        min_price > 0
        AND max_price > min_price
        AND tick_size > 0
    ),
    CONSTRAINT check_trading_pair_fees CHECK (
        taker_fee_rate >= 0
        AND maker_fee_rate >= 0
    )
);

-- Indexes
CREATE INDEX idx_trading_pair_name ON trading_pair(name);
CREATE INDEX idx_trading_pair_active ON trading_pair(is_trading_active);

-- Updated_at trigger
CREATE TRIGGER update_trading_pair_updated_at
    BEFORE UPDATE ON trading_pair
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE trading_pair IS 'Trading pair configurations and rules';
COMMENT ON COLUMN trading_pair.name IS 'Trading pair name (e.g., BTC/USD, ETH/USD)';
COMMENT ON COLUMN trading_pair.base_coin IS 'Base currency/coin (e.g., BTC, ETH)';
COMMENT ON COLUMN trading_pair.quote_currency IS 'Quote currency (e.g., USD, USDT)';
COMMENT ON COLUMN trading_pair.min_order_amount IS 'Minimum order amount in base coin';
COMMENT ON COLUMN trading_pair.max_order_amount IS 'Maximum order amount in base coin';
COMMENT ON COLUMN trading_pair.tick_size IS 'Minimum price increment';
COMMENT ON COLUMN trading_pair.max_price IS 'Maximum allowed price per unit';
COMMENT ON COLUMN trading_pair.min_price IS 'Minimum allowed price per unit';
COMMENT ON COLUMN trading_pair.taker_fee_rate IS 'Fee rate for taker orders (e.g., 0.001 = 0.1%)';
COMMENT ON COLUMN trading_pair.maker_fee_rate IS 'Fee rate for maker orders (e.g., 0.0005 = 0.05%)';
COMMENT ON COLUMN trading_pair.is_trading_active IS 'Whether trading is currently enabled for this pair';
