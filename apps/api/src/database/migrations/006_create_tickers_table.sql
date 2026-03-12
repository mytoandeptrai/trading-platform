-- Migration: Create tickers table
-- Created: 2026-03-12

CREATE TABLE IF NOT EXISTS ticker (
    id SERIAL PRIMARY KEY,
    pair_name VARCHAR(50) UNIQUE NOT NULL,
    last_price NUMERIC(20, 8),
    open_price NUMERIC(20, 8),
    high_price NUMERIC(20, 8),
    low_price NUMERIC(20, 8),
    volume NUMERIC(20, 8) DEFAULT 0,
    bid_price NUMERIC(20, 8),
    bid_qty NUMERIC(20, 8),
    ask_price NUMERIC(20, 8),
    ask_qty NUMERIC(20, 8),
    change_percent NUMERIC(10, 4),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_ticker_prices CHECK (
        (last_price IS NULL OR last_price > 0)
        AND (open_price IS NULL OR open_price > 0)
        AND (high_price IS NULL OR high_price > 0)
        AND (low_price IS NULL OR low_price > 0)
        AND (bid_price IS NULL OR bid_price > 0)
        AND (ask_price IS NULL OR ask_price > 0)
        AND volume >= 0
    )
);

-- Indexes
CREATE INDEX idx_ticker_pair ON ticker(pair_name);
CREATE INDEX idx_ticker_updated ON ticker(updated_at DESC);

-- Updated_at trigger
CREATE TRIGGER update_ticker_updated_at
    BEFORE UPDATE ON ticker
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE ticker IS 'Real-time ticker data for trading pairs';
COMMENT ON COLUMN ticker.last_price IS 'Last traded price';
COMMENT ON COLUMN ticker.open_price IS 'Opening price for the current period (24h)';
COMMENT ON COLUMN ticker.high_price IS 'Highest price in the current period (24h)';
COMMENT ON COLUMN ticker.low_price IS 'Lowest price in the current period (24h)';
COMMENT ON COLUMN ticker.volume IS 'Total trading volume in the current period';
COMMENT ON COLUMN ticker.bid_price IS 'Best bid price (highest buy order)';
COMMENT ON COLUMN ticker.bid_qty IS 'Quantity at best bid';
COMMENT ON COLUMN ticker.ask_price IS 'Best ask price (lowest sell order)';
COMMENT ON COLUMN ticker.ask_qty IS 'Quantity at best ask';
COMMENT ON COLUMN ticker.change_percent IS 'Percentage change from open price';
