-- Migration: Create accounts and balances tables
-- Created: 2026-03-12

-- Trading accounts
CREATE TABLE IF NOT EXISTS account (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    account_type VARCHAR(50) DEFAULT 'INDIVIDUAL' CHECK (account_type IN ('INDIVIDUAL', 'BUSINESS', 'VIP')),
    trading_status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (trading_status IN ('ACTIVE', 'SUSPENDED', 'FROZEN')),
    kyc_level INT DEFAULT 1 CHECK (kyc_level BETWEEN 0 AND 3),
    total_balance NUMERIC(20, 8) DEFAULT 0,
    available_balance NUMERIC(20, 8) DEFAULT 0,
    locked_balance NUMERIC(20, 8) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_account_balance CHECK (
        total_balance = available_balance + locked_balance
        AND available_balance >= 0
        AND locked_balance >= 0
    )
);

-- Coin balances (BTC, ETH, etc.)
CREATE TABLE IF NOT EXISTS account_coin (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    coin_name VARCHAR(50) NOT NULL,
    available NUMERIC(20, 8) DEFAULT 0,
    locked NUMERIC(20, 8) DEFAULT 0,
    frozen NUMERIC(20, 8) DEFAULT 0,
    total NUMERIC(20, 8) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(account_id, coin_name),
    CONSTRAINT check_coin_balance CHECK (
        total = available + locked + frozen
        AND available >= 0
        AND locked >= 0
        AND frozen >= 0
    )
);

-- Cash balances (USD, VND, etc.)
CREATE TABLE IF NOT EXISTS account_cash (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT UNIQUE NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    currency_name VARCHAR(50) DEFAULT 'USD',
    available NUMERIC(20, 8) DEFAULT 0,
    locked NUMERIC(20, 8) DEFAULT 0,
    total NUMERIC(20, 8) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_cash_balance CHECK (
        total = available + locked
        AND available >= 0
        AND locked >= 0
    )
);

-- Lock records (for order balance locks)
CREATE TABLE IF NOT EXISTS lock_record (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    order_id BIGINT,
    lock_type VARCHAR(50) NOT NULL CHECK (lock_type IN ('CASH', 'COIN')),
    asset_name VARCHAR(50) NOT NULL,
    lock_amount NUMERIC(20, 8) NOT NULL,
    status VARCHAR(50) DEFAULT 'LOCKED' CHECK (status IN ('LOCKED', 'UNLOCKED')),
    locked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    unlocked_at TIMESTAMP,

    CONSTRAINT check_lock_amount CHECK (lock_amount > 0)
);

-- Indexes
CREATE INDEX idx_account_user ON account(user_id);
CREATE INDEX idx_account_status ON account(trading_status);
CREATE INDEX idx_account_coin_account ON account_coin(account_id);
CREATE INDEX idx_account_coin_name ON account_coin(coin_name);
CREATE INDEX idx_account_cash_account ON account_cash(account_id);
CREATE INDEX idx_lock_account ON lock_record(account_id);
CREATE INDEX idx_lock_order ON lock_record(order_id);
CREATE INDEX idx_lock_status ON lock_record(status);

-- Updated_at triggers
CREATE TRIGGER update_account_updated_at
    BEFORE UPDATE ON account
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_account_coin_updated_at
    BEFORE UPDATE ON account_coin
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_account_cash_updated_at
    BEFORE UPDATE ON account_cash
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE account IS 'Trading account main table';
COMMENT ON TABLE account_coin IS 'Cryptocurrency balances (BTC, ETH, etc.)';
COMMENT ON TABLE account_cash IS 'Fiat currency balances (USD, VND, etc.)';
COMMENT ON TABLE lock_record IS 'Balance locks for pending orders';
