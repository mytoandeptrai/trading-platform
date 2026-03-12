-- Migration: Create trades table
-- Created: 2026-03-12

CREATE TABLE IF NOT EXISTS matching_trade (
    id BIGSERIAL PRIMARY KEY,
    bid_order_id BIGINT NOT NULL REFERENCES matching_order(id),
    bid_account_id BIGINT NOT NULL REFERENCES account(id),
    ask_order_id BIGINT NOT NULL REFERENCES matching_order(id),
    ask_account_id BIGINT NOT NULL REFERENCES account(id),
    pair_name VARCHAR(50) NOT NULL,
    price NUMERIC(20, 8) NOT NULL,
    quantity NUMERIC(20, 8) NOT NULL,
    value NUMERIC(20, 8) NOT NULL,
    buyer_fee NUMERIC(20, 8) DEFAULT 0,
    seller_fee NUMERIC(20, 8) DEFAULT 0,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    settlement_status VARCHAR(50) DEFAULT 'PENDING' CHECK (settlement_status IN ('PENDING', 'CONFIRMED', 'FAILED')),
    settlement_time TIMESTAMP,

    CONSTRAINT check_trade_amounts CHECK (
        quantity > 0
        AND price > 0
        AND value = quantity * price
        AND buyer_fee >= 0
        AND seller_fee >= 0
    )
);

-- Trade history (for archival)
CREATE TABLE IF NOT EXISTS trade_history (
    id BIGSERIAL PRIMARY KEY,
    trade_id BIGINT NOT NULL,
    bid_order_id BIGINT NOT NULL,
    ask_order_id BIGINT NOT NULL,
    pair_name VARCHAR(50) NOT NULL,
    price NUMERIC(20, 8) NOT NULL,
    quantity NUMERIC(20, 8) NOT NULL,
    value NUMERIC(20, 8) NOT NULL,
    executed_at TIMESTAMP NOT NULL,
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_trade_bid_account ON matching_trade(bid_account_id);
CREATE INDEX idx_trade_ask_account ON matching_trade(ask_account_id);
CREATE INDEX idx_trade_pair ON matching_trade(pair_name);
CREATE INDEX idx_trade_executed ON matching_trade(executed_at DESC);
CREATE INDEX idx_trade_settlement_status ON matching_trade(settlement_status);
CREATE INDEX idx_trade_history_pair ON trade_history(pair_name);
CREATE INDEX idx_trade_history_executed ON trade_history(executed_at DESC);

-- Auto-calculate value on insert
CREATE OR REPLACE FUNCTION calculate_trade_value()
RETURNS TRIGGER AS $$
BEGIN
    NEW.value := NEW.quantity * NEW.price;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_trade_value_trigger
    BEFORE INSERT ON matching_trade
    FOR EACH ROW
    EXECUTE FUNCTION calculate_trade_value();

-- Comments
COMMENT ON TABLE matching_trade IS 'Executed trades between buyers and sellers';
COMMENT ON TABLE trade_history IS 'Historical record of archived trades';
COMMENT ON COLUMN matching_trade.value IS 'Auto-calculated: quantity × price';
COMMENT ON COLUMN matching_trade.settlement_status IS 'Trade settlement status';
