-- Create schemas for each microservice
CREATE SCHEMA IF NOT EXISTS market_data;
CREATE SCHEMA IF NOT EXISTS candidate_generator;
CREATE SCHEMA IF NOT EXISTS ranking_engine;
CREATE SCHEMA IF NOT EXISTS backtesting;
CREATE SCHEMA IF NOT EXISTS trading;
CREATE SCHEMA IF NOT EXISTS sentiment_analyzer;

-- Market Data Schema Tables
CREATE TABLE IF NOT EXISTS market_data.price_data (
    symbol VARCHAR(10) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    open DECIMAL(10,2) NOT NULL,
    high DECIMAL(10,2) NOT NULL,
    low DECIMAL(10,2) NOT NULL,
    close DECIMAL(10,2) NOT NULL,
    volume BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (symbol, timestamp)
);

CREATE TABLE IF NOT EXISTS market_data.fundamental_data (
    symbol VARCHAR(10) NOT NULL,
    date DATE NOT NULL,
    pe_ratio DECIMAL(10,2),
    pb_ratio DECIMAL(10,2),
    roe DECIMAL(10,2),
    debt_to_equity DECIMAL(10,2),
    market_cap DECIMAL(20,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (symbol, date)
);

-- Candidate Generator Schema Tables
CREATE TABLE IF NOT EXISTS candidate_generator.patterns (
    pattern_id UUID DEFAULT gen_random_uuid(),
    symbol VARCHAR(10) NOT NULL,
    pattern_type VARCHAR(50) NOT NULL,
    detection_time TIMESTAMP NOT NULL,
    confidence_score DECIMAL(5,2) NOT NULL,
    parameters JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (pattern_id)
);

CREATE TABLE IF NOT EXISTS candidate_generator.candidates (
    candidate_id UUID DEFAULT gen_random_uuid(),
    symbol VARCHAR(10) NOT NULL,
    detection_time TIMESTAMP NOT NULL,
    source VARCHAR(50) NOT NULL,
    score DECIMAL(5,2) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (candidate_id)
);

-- Ranking Engine Schema Tables
CREATE TABLE IF NOT EXISTS ranking_engine.features (
    feature_id UUID DEFAULT gen_random_uuid(),
    symbol VARCHAR(10) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    feature_type VARCHAR(50) NOT NULL,
    feature_value DECIMAL(10,4) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (feature_id)
);

CREATE TABLE IF NOT EXISTS ranking_engine.rankings (
    ranking_id UUID DEFAULT gen_random_uuid(),
    symbol VARCHAR(10) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    technical_score DECIMAL(5,2) NOT NULL,
    fundamental_score DECIMAL(5,2) NOT NULL,
    sentiment_score DECIMAL(5,2) NOT NULL,
    final_score DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (ranking_id)
);

-- Backtesting Schema Tables
CREATE TABLE IF NOT EXISTS backtesting.strategies (
    strategy_id UUID DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parameters JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (strategy_id)
);

CREATE TABLE IF NOT EXISTS backtesting.backtest_results (
    result_id UUID DEFAULT gen_random_uuid(),
    strategy_id UUID NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    initial_capital DECIMAL(20,2) NOT NULL,
    final_capital DECIMAL(20,2) NOT NULL,
    sharpe_ratio DECIMAL(10,4),
    sortino_ratio DECIMAL(10,4),
    max_drawdown DECIMAL(10,4),
    win_rate DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (result_id),
    FOREIGN KEY (strategy_id) REFERENCES backtesting.strategies(strategy_id)
);

-- Trading Schema Tables
CREATE TABLE IF NOT EXISTS trading.orders (
    order_id UUID DEFAULT gen_random_uuid(),
    symbol VARCHAR(10) NOT NULL,
    order_type VARCHAR(20) NOT NULL,
    quantity INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (order_id)
);

CREATE TABLE IF NOT EXISTS trading.positions (
    position_id UUID DEFAULT gen_random_uuid(),
    symbol VARCHAR(10) NOT NULL,
    quantity INTEGER NOT NULL,
    average_price DECIMAL(10,2) NOT NULL,
    current_price DECIMAL(10,2) NOT NULL,
    pnl DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (position_id)
);

-- Sentiment Analyzer Schema Tables
CREATE TABLE IF NOT EXISTS sentiment_analyzer.sentiment_data (
    sentiment_id UUID DEFAULT gen_random_uuid(),
    symbol VARCHAR(10) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    source VARCHAR(50) NOT NULL,
    sentiment_score DECIMAL(5,2) NOT NULL,
    confidence_score DECIMAL(5,2) NOT NULL,
    raw_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (sentiment_id)
);

-- Create indexes
CREATE INDEX idx_price_data_symbol ON market_data.price_data(symbol);
CREATE INDEX idx_price_data_timestamp ON market_data.price_data(timestamp);
CREATE INDEX idx_fundamental_data_symbol ON market_data.fundamental_data(symbol);
CREATE INDEX idx_patterns_symbol ON candidate_generator.patterns(symbol);
CREATE INDEX idx_candidates_symbol ON candidate_generator.candidates(symbol);
CREATE INDEX idx_features_symbol ON ranking_engine.features(symbol);
CREATE INDEX idx_rankings_symbol ON ranking_engine.rankings(symbol);
CREATE INDEX idx_orders_symbol ON trading.orders(symbol);
CREATE INDEX idx_positions_symbol ON trading.positions(symbol);
CREATE INDEX idx_sentiment_data_symbol ON sentiment_analyzer.sentiment_data(symbol);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_price_data_updated_at
    BEFORE UPDATE ON market_data.price_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fundamental_data_updated_at
    BEFORE UPDATE ON market_data.fundamental_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidates_updated_at
    BEFORE UPDATE ON candidate_generator.candidates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_strategies_updated_at
    BEFORE UPDATE ON backtesting.strategies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON trading.orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_positions_updated_at
    BEFORE UPDATE ON trading.positions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 