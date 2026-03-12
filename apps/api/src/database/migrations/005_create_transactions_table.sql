-- Migration: Create transactions table (audit trail)
-- Created: 2026-03-12

CREATE TABLE IF NOT EXISTS transaction (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('DEPOSIT', 'WITHDRAW', 'TRADE', 'FEE', 'LOCK', 'UNLOCK')),
    asset_name VARCHAR(50) NOT NULL,
    amount NUMERIC(20, 8) NOT NULL,
    balance_before NUMERIC(20, 8) NOT NULL,
    balance_after NUMERIC(20, 8) NOT NULL,
    reference_id BIGINT,
    reference_type VARCHAR(50) CHECK (reference_type IN ('ORDER', 'TRADE', 'TRANSFER')),
    op_result VARCHAR(50) DEFAULT 'SUCCESS' CHECK (op_result IN ('SUCCESS', 'FAILED', 'PENDING')),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_transaction_amount CHECK (amount <> 0)
);

-- Indexes
CREATE INDEX idx_transaction_account ON transaction(account_id);
CREATE INDEX idx_transaction_type ON transaction(transaction_type);
CREATE INDEX idx_transaction_created ON transaction(created_at DESC);
CREATE INDEX idx_transaction_reference ON transaction(reference_type, reference_id);
CREATE INDEX idx_transaction_asset ON transaction(asset_name);

-- Comments
COMMENT ON TABLE transaction IS 'Audit trail for all account transactions';
COMMENT ON COLUMN transaction.transaction_type IS 'Type of transaction: DEPOSIT, WITHDRAW, TRADE, FEE, LOCK, UNLOCK';
COMMENT ON COLUMN transaction.reference_id IS 'References order_id, trade_id, or transfer_id depending on reference_type';
COMMENT ON COLUMN transaction.balance_before IS 'Balance before this transaction';
COMMENT ON COLUMN transaction.balance_after IS 'Balance after this transaction';
