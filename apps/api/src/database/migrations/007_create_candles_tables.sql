-- Migration: Create candles tables (OHLCV data)
-- Created: 2026-03-12

-- Candlestick 1-minute
CREATE TABLE IF NOT EXISTS candle_1m (
    id BIGSERIAL PRIMARY KEY,
    pair_name VARCHAR(50) NOT NULL,
    open_time TIMESTAMP NOT NULL,
    close_time TIMESTAMP NOT NULL,
    open NUMERIC(20, 8) NOT NULL,
    high NUMERIC(20, 8) NOT NULL,
    low NUMERIC(20, 8) NOT NULL,
    close NUMERIC(20, 8) NOT NULL,
    volume NUMERIC(20, 8) DEFAULT 0,
    trades_count INT DEFAULT 0,
    is_closed BOOLEAN DEFAULT false,

    UNIQUE(pair_name, open_time),
    CONSTRAINT check_candle_1m_prices CHECK (
        open > 0
        AND high > 0
        AND low > 0
        AND close > 0
        AND high >= low
        AND high >= open
        AND high >= close
        AND low <= open
        AND low <= close
        AND volume >= 0
        AND trades_count >= 0
    ),
    CONSTRAINT check_candle_1m_times CHECK (close_time > open_time)
);

-- Candlestick 5-minute
CREATE TABLE IF NOT EXISTS candle_5m (
    id BIGSERIAL PRIMARY KEY,
    pair_name VARCHAR(50) NOT NULL,
    open_time TIMESTAMP NOT NULL,
    close_time TIMESTAMP NOT NULL,
    open NUMERIC(20, 8) NOT NULL,
    high NUMERIC(20, 8) NOT NULL,
    low NUMERIC(20, 8) NOT NULL,
    close NUMERIC(20, 8) NOT NULL,
    volume NUMERIC(20, 8) DEFAULT 0,
    trades_count INT DEFAULT 0,
    is_closed BOOLEAN DEFAULT false,

    UNIQUE(pair_name, open_time),
    CONSTRAINT check_candle_5m_prices CHECK (
        open > 0
        AND high > 0
        AND low > 0
        AND close > 0
        AND high >= low
        AND high >= open
        AND high >= close
        AND low <= open
        AND low <= close
        AND volume >= 0
        AND trades_count >= 0
    ),
    CONSTRAINT check_candle_5m_times CHECK (close_time > open_time)
);

-- Candlestick 1-hour
CREATE TABLE IF NOT EXISTS candle_1h (
    id BIGSERIAL PRIMARY KEY,
    pair_name VARCHAR(50) NOT NULL,
    open_time TIMESTAMP NOT NULL,
    close_time TIMESTAMP NOT NULL,
    open NUMERIC(20, 8) NOT NULL,
    high NUMERIC(20, 8) NOT NULL,
    low NUMERIC(20, 8) NOT NULL,
    close NUMERIC(20, 8) NOT NULL,
    volume NUMERIC(20, 8) DEFAULT 0,
    trades_count INT DEFAULT 0,
    is_closed BOOLEAN DEFAULT false,

    UNIQUE(pair_name, open_time),
    CONSTRAINT check_candle_1h_prices CHECK (
        open > 0
        AND high > 0
        AND low > 0
        AND close > 0
        AND high >= low
        AND high >= open
        AND high >= close
        AND low <= open
        AND low <= close
        AND volume >= 0
        AND trades_count >= 0
    ),
    CONSTRAINT check_candle_1h_times CHECK (close_time > open_time)
);

-- Candlestick 1-day
CREATE TABLE IF NOT EXISTS candle_1d (
    id BIGSERIAL PRIMARY KEY,
    pair_name VARCHAR(50) NOT NULL,
    open_time TIMESTAMP NOT NULL,
    close_time TIMESTAMP NOT NULL,
    open NUMERIC(20, 8) NOT NULL,
    high NUMERIC(20, 8) NOT NULL,
    low NUMERIC(20, 8) NOT NULL,
    close NUMERIC(20, 8) NOT NULL,
    volume NUMERIC(20, 8) DEFAULT 0,
    trades_count INT DEFAULT 0,
    is_closed BOOLEAN DEFAULT false,

    UNIQUE(pair_name, open_time),
    CONSTRAINT check_candle_1d_prices CHECK (
        open > 0
        AND high > 0
        AND low > 0
        AND close > 0
        AND high >= low
        AND high >= open
        AND high >= close
        AND low <= open
        AND low <= close
        AND volume >= 0
        AND trades_count >= 0
    ),
    CONSTRAINT check_candle_1d_times CHECK (close_time > open_time)
);

-- Indexes
CREATE INDEX idx_candle_1m_pair_time ON candle_1m(pair_name, open_time DESC);
CREATE INDEX idx_candle_1m_closed ON candle_1m(pair_name, is_closed, open_time DESC);

CREATE INDEX idx_candle_5m_pair_time ON candle_5m(pair_name, open_time DESC);
CREATE INDEX idx_candle_5m_closed ON candle_5m(pair_name, is_closed, open_time DESC);

CREATE INDEX idx_candle_1h_pair_time ON candle_1h(pair_name, open_time DESC);
CREATE INDEX idx_candle_1h_closed ON candle_1h(pair_name, is_closed, open_time DESC);

CREATE INDEX idx_candle_1d_pair_time ON candle_1d(pair_name, open_time DESC);
CREATE INDEX idx_candle_1d_closed ON candle_1d(pair_name, is_closed, open_time DESC);

-- Comments
COMMENT ON TABLE candle_1m IS 'OHLCV candlestick data (1-minute intervals)';
COMMENT ON TABLE candle_5m IS 'OHLCV candlestick data (5-minute intervals)';
COMMENT ON TABLE candle_1h IS 'OHLCV candlestick data (1-hour intervals)';
COMMENT ON TABLE candle_1d IS 'OHLCV candlestick data (1-day intervals)';

COMMENT ON COLUMN candle_1m.open_time IS 'Candle opening time (start of period)';
COMMENT ON COLUMN candle_1m.close_time IS 'Candle closing time (end of period)';
COMMENT ON COLUMN candle_1m.open IS 'Opening price';
COMMENT ON COLUMN candle_1m.high IS 'Highest price in the period';
COMMENT ON COLUMN candle_1m.low IS 'Lowest price in the period';
COMMENT ON COLUMN candle_1m.close IS 'Closing price';
COMMENT ON COLUMN candle_1m.volume IS 'Total trading volume in the period';
COMMENT ON COLUMN candle_1m.trades_count IS 'Number of trades executed in the period';
COMMENT ON COLUMN candle_1m.is_closed IS 'Whether this candle is closed (complete)';
