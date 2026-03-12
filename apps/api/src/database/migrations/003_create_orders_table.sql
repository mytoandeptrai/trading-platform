-- Migration: Create orders table
-- Created: 2026-03-12

CREATE TABLE IF NOT EXISTS matching_order (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    pair_name VARCHAR(50) NOT NULL,
    is_bid BOOLEAN NOT NULL,
    order_type VARCHAR(50) DEFAULT 'LIMIT' CHECK (order_type IN ('LIMIT', 'MARKET', 'STOP_LIMIT')),
    price NUMERIC(20, 8),
    amount NUMERIC(20, 8) NOT NULL,
    filled NUMERIC(20, 8) DEFAULT 0,
    remaining NUMERIC(20, 8),
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PARTLY_FILLED', 'COMPLETED', 'CANCELED', 'FAILED')),
    placed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,

    CONSTRAINT check_order_amounts CHECK (
        amount > 0
        AND filled >= 0
        AND remaining >= 0
        AND filled + remaining = amount
    ),
    CONSTRAINT check_limit_price CHECK (
        (order_type = 'LIMIT' AND price IS NOT NULL AND price > 0)
        OR (order_type = 'MARKET' AND price IS NULL)
    )
);

-- Order history (for completed/canceled orders)
CREATE TABLE IF NOT EXISTS order_history (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL,
    account_id BIGINT NOT NULL,
    pair_name VARCHAR(50) NOT NULL,
    is_bid BOOLEAN NOT NULL,
    order_type VARCHAR(50) NOT NULL,
    price NUMERIC(20, 8),
    amount NUMERIC(20, 8) NOT NULL,
    filled NUMERIC(20, 8) DEFAULT 0,
    status VARCHAR(50) NOT NULL,
    placed_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_order_account ON matching_order(account_id);
CREATE INDEX idx_order_pair_status ON matching_order(pair_name, status);
CREATE INDEX idx_order_placed ON matching_order(placed_at DESC);
CREATE INDEX idx_order_status ON matching_order(status);
CREATE INDEX idx_order_history_account ON order_history(account_id);
CREATE INDEX idx_order_history_completed ON order_history(completed_at DESC);

-- Updated_at trigger
CREATE TRIGGER update_matching_order_updated_at
    BEFORE UPDATE ON matching_order
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-populate remaining on insert
CREATE OR REPLACE FUNCTION set_order_remaining()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.remaining IS NULL THEN
        NEW.remaining := NEW.amount - NEW.filled;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_order_remaining_trigger
    BEFORE INSERT ON matching_order
    FOR EACH ROW
    EXECUTE FUNCTION set_order_remaining();

-- Comments
COMMENT ON TABLE matching_order IS 'Active orders in the matching engine';
COMMENT ON TABLE order_history IS 'Historical record of completed/canceled orders';
COMMENT ON COLUMN matching_order.is_bid IS 'true = BUY, false = SELL';
COMMENT ON COLUMN matching_order.price IS 'NULL for MARKET orders';
