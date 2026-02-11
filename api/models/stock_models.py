"""
Stock Trading Data Models
=========================

Pydantic models for type safety and API documentation.
Used across the automated trading system.
"""

from pydantic import BaseModel, Field, validator
from typing import List, Dict, Optional, Union, Any
from datetime import datetime, timedelta
from enum import Enum
from dataclasses import dataclass, field
import uuid

# ================================
# ENUMS
# ================================

class OrderType(str, Enum):
    MARKET = "MARKET"
    LIMIT = "LIMIT"
    STOP_LOSS = "STOP_LOSS"
    STOP_LOSS_LIMIT = "STOP_LOSS_LIMIT"

class OrderSide(str, Enum):
    BUY = "BUY"
    SELL = "SELL"

class OrderStatus(str, Enum):
    PENDING = "PENDING"
    FILLED = "FILLED"
    PARTIALLY_FILLED = "PARTIALLY_FILLED"
    CANCELLED = "CANCELLED"
    REJECTED = "REJECTED"

class SignalType(str, Enum):
    BUY = "BUY"
    SELL = "SELL"
    HOLD = "HOLD"

class TradingTheme(str, Enum):
    INTRADAY_BUY = "intraday_buy"
    SWING_BUY = "swing_buy"
    SHORT_TERM_BUY = "short_term_buy"
    LONG_TERM_BUY = "long_term_buy"

# ================================
# STOCK DATA MODELS
# ================================

class StockPrice(BaseModel):
    """Individual stock price data point."""
    timestamp: datetime
    open: float = Field(..., description="Opening price")
    high: float = Field(..., description="Highest price")
    low: float = Field(..., description="Lowest price")
    close: float = Field(..., description="Closing price")
    volume: int = Field(..., description="Trading volume")
    
    @validator('high')
    def validate_high(cls, v, values):
        if 'low' in values and v < values['low']:
            raise ValueError('High price cannot be less than low price')
        return v

class StockData(BaseModel):
    """Complete stock data with metadata."""
    symbol: str = Field(..., description="Stock symbol")
    name: str = Field(..., description="Company name")
    current_price: float = Field(..., description="Current trading price")
    change: float = Field(..., description="Price change")
    change_percent: float = Field(..., description="Percentage change")
    volume: int = Field(..., description="Current volume")
    market_cap: Optional[float] = Field(None, description="Market capitalization")
    pe_ratio: Optional[float] = Field(None, description="Price-to-earnings ratio")
    last_updated: datetime = Field(default_factory=datetime.now)
    prices: List[StockPrice] = Field(default=[], description="Historical prices")

class TechnicalIndicators(BaseModel):
    """Technical analysis indicators."""
    rsi: Optional[float] = Field(None, description="Relative Strength Index")
    macd: Optional[float] = Field(None, description="MACD value")
    macd_signal: Optional[float] = Field(None, description="MACD signal line")
    bollinger_upper: Optional[float] = Field(None, description="Bollinger upper band")
    bollinger_lower: Optional[float] = Field(None, description="Bollinger lower band")
    sma_20: Optional[float] = Field(None, description="20-day Simple Moving Average")
    sma_50: Optional[float] = Field(None, description="50-day Simple Moving Average")
    ema_12: Optional[float] = Field(None, description="12-day Exponential Moving Average")
    ema_26: Optional[float] = Field(None, description="26-day Exponential Moving Average")
    volume_sma: Optional[float] = Field(None, description="Volume Simple Moving Average")

# ================================
# TRADING SIGNAL MODELS
# ================================

class TradingSignal(BaseModel):
    """Trading signal with analysis."""
    id: str = Field(..., description="Unique signal ID")
    symbol: str = Field(..., description="Stock symbol")
    signal_type: SignalType = Field(..., description="Type of signal")
    strength: float = Field(..., ge=0, le=100, description="Signal strength (0-100)")
    price: float = Field(..., description="Price when signal generated")
    target_price: Optional[float] = Field(None, description="Target price")
    stop_loss: Optional[float] = Field(None, description="Stop loss price")
    confidence: float = Field(..., ge=0, le=1, description="Confidence level (0-1)")
    reasoning: str = Field(..., description="Reason for the signal")
    indicators: TechnicalIndicators = Field(default_factory=TechnicalIndicators)
    theme: TradingTheme = Field(..., description="Trading theme")
    generated_at: datetime = Field(default_factory=datetime.now)
    expires_at: Optional[datetime] = Field(None, description="Signal expiration")
    algorithm: str = Field(..., description="Algorithm that generated signal")

class SignalFilter(BaseModel):
    """Filter criteria for signals."""
    symbols: Optional[List[str]] = Field(None, description="Filter by symbols")
    signal_types: Optional[List[SignalType]] = Field(None, description="Filter by signal types")
    min_strength: Optional[float] = Field(None, ge=0, le=100)
    min_confidence: Optional[float] = Field(None, ge=0, le=1)
    themes: Optional[List[TradingTheme]] = Field(None, description="Filter by themes")
    from_date: Optional[datetime] = Field(None, description="From date")
    to_date: Optional[datetime] = Field(None, description="To date")

# ================================
# ORDER MANAGEMENT MODELS
# ================================

class OrderRequest(BaseModel):
    """Order placement request."""
    symbol: str = Field(..., description="Stock symbol")
    side: OrderSide = Field(..., description="Buy or sell")
    order_type: OrderType = Field(..., description="Order type")
    quantity: int = Field(..., gt=0, description="Number of shares")
    price: Optional[float] = Field(None, description="Price for limit orders")
    stop_price: Optional[float] = Field(None, description="Stop price for stop orders")
    time_in_force: str = Field(default="DAY", description="Time in force")
    signal_id: Optional[str] = Field(None, description="Related signal ID")
    
    @validator('price')
    def validate_price(cls, v, values):
        order_type = values.get('order_type')
        if order_type in [OrderType.LIMIT, OrderType.STOP_LOSS_LIMIT] and v is None:
            raise ValueError(f'Price required for {order_type} orders')
        return v

class Order(BaseModel):
    """Order with status and execution details."""
    id: str = Field(..., description="Unique order ID")
    symbol: str = Field(..., description="Stock symbol")
    side: OrderSide = Field(..., description="Buy or sell")
    order_type: OrderType = Field(..., description="Order type")
    quantity: int = Field(..., description="Number of shares")
    filled_quantity: int = Field(default=0, description="Filled shares")
    remaining_quantity: int = Field(..., description="Remaining shares")
    price: Optional[float] = Field(None, description="Order price")
    filled_price: Optional[float] = Field(None, description="Average filled price")
    stop_price: Optional[float] = Field(None, description="Stop price")
    status: OrderStatus = Field(..., description="Order status")
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    filled_at: Optional[datetime] = Field(None, description="Fill timestamp")
    signal_id: Optional[str] = Field(None, description="Related signal ID")
    commission: Optional[float] = Field(None, description="Commission paid")
    error_message: Optional[str] = Field(None, description="Error if any")

# ================================
# PORTFOLIO MODELS
# ================================

class Position(BaseModel):
    """Stock position in portfolio."""
    symbol: str = Field(..., description="Stock symbol")
    quantity: int = Field(..., description="Number of shares")
    average_price: float = Field(..., description="Average purchase price")
    current_price: float = Field(..., description="Current market price")
    market_value: float = Field(..., description="Current market value")
    unrealized_pnl: float = Field(..., description="Unrealized P&L")
    unrealized_pnl_percent: float = Field(..., description="Unrealized P&L percentage")
    day_change: float = Field(..., description="Day's change in value")
    day_change_percent: float = Field(..., description="Day's change percentage")
    last_updated: datetime = Field(default_factory=datetime.now)

class Portfolio(BaseModel):
    """Complete portfolio information."""
    total_value: float = Field(..., description="Total portfolio value")
    cash_balance: float = Field(..., description="Available cash")
    invested_amount: float = Field(..., description="Total invested amount")
    unrealized_pnl: float = Field(..., description="Total unrealized P&L")
    realized_pnl: float = Field(..., description="Total realized P&L")
    day_change: float = Field(..., description="Day's portfolio change")
    day_change_percent: float = Field(..., description="Day's change percentage")
    positions: List[Position] = Field(default=[], description="Current positions")
    last_updated: datetime = Field(default_factory=datetime.now)

class PerformanceMetrics(BaseModel):
    """Portfolio performance metrics."""
    total_return: float = Field(..., description="Total return percentage")
    annualized_return: float = Field(..., description="Annualized return percentage")
    sharpe_ratio: Optional[float] = Field(None, description="Sharpe ratio")
    max_drawdown: float = Field(..., description="Maximum drawdown percentage")
    win_rate: float = Field(..., description="Win rate percentage")
    profit_factor: Optional[float] = Field(None, description="Profit factor")
    total_trades: int = Field(..., description="Total number of trades")
    winning_trades: int = Field(..., description="Number of winning trades")
    losing_trades: int = Field(..., description="Number of losing trades")
    average_win: float = Field(..., description="Average winning trade")
    average_loss: float = Field(..., description="Average losing trade")
    largest_win: float = Field(..., description="Largest winning trade")
    largest_loss: float = Field(..., description="Largest losing trade")
    volatility: float = Field(..., description="Portfolio volatility")
    beta: Optional[float] = Field(None, description="Portfolio beta")

# ================================
# ANALYSIS MODELS
# ================================

class MarketSentiment(BaseModel):
    """Overall market sentiment analysis."""
    sentiment_score: float = Field(..., ge=-1, le=1, description="Sentiment score (-1 to 1)")
    sentiment_label: str = Field(..., description="Sentiment label")
    bullish_stocks: int = Field(..., description="Number of bullish stocks")
    bearish_stocks: int = Field(..., description="Number of bearish stocks")
    neutral_stocks: int = Field(..., description="Number of neutral stocks")
    market_trend: str = Field(..., description="Overall market trend")
    volatility_index: float = Field(..., description="Market volatility index")
    volume_trend: str = Field(..., description="Volume trend")
    last_updated: datetime = Field(default_factory=datetime.now)

class StockAnalysis(BaseModel):
    """Comprehensive stock analysis."""
    symbol: str = Field(..., description="Stock symbol")
    current_price: float = Field(..., description="Current price")
    price_trend: str = Field(..., description="Price trend")
    volume_trend: str = Field(..., description="Volume trend")
    technical_rating: str = Field(..., description="Technical analysis rating")
    support_levels: List[float] = Field(default=[], description="Support price levels")
    resistance_levels: List[float] = Field(default=[], description="Resistance price levels")
    indicators: TechnicalIndicators = Field(default_factory=TechnicalIndicators)
    recommendation: str = Field(..., description="Buy/Sell/Hold recommendation")
    risk_level: str = Field(..., description="Risk assessment")
    target_price: Optional[float] = Field(None, description="Target price")
    stop_loss: Optional[float] = Field(None, description="Suggested stop loss")
    analyzed_at: datetime = Field(default_factory=datetime.now)

class BacktestResult(BaseModel):
    """Backtesting results."""
    strategy_name: str = Field(..., description="Strategy name")
    start_date: datetime = Field(..., description="Backtest start date")
    end_date: datetime = Field(..., description="Backtest end date")
    initial_capital: float = Field(..., description="Initial capital")
    final_capital: float = Field(..., description="Final capital")
    total_return: float = Field(..., description="Total return percentage")
    annualized_return: float = Field(..., description="Annualized return")
    max_drawdown: float = Field(..., description="Maximum drawdown")
    sharpe_ratio: float = Field(..., description="Sharpe ratio")
    total_trades: int = Field(..., description="Total trades executed")
    win_rate: float = Field(..., description="Win rate percentage")
    profit_factor: float = Field(..., description="Profit factor")
    daily_returns: List[float] = Field(default=[], description="Daily return series")
    equity_curve: List[float] = Field(default=[], description="Equity curve")
    trade_history: List[Dict] = Field(default=[], description="Trade history")

# ================================
# WEBSOCKET MODELS
# ================================

class WebSocketMessage(BaseModel):
    """WebSocket message structure."""
    type: str = Field(..., description="Message type")
    data: Dict = Field(..., description="Message data")
    timestamp: datetime = Field(default_factory=datetime.now)
    channel: Optional[str] = Field(None, description="Channel name")

class LiveDataUpdate(BaseModel):
    """Live data update via WebSocket."""
    symbol: str = Field(..., description="Stock symbol")
    price: float = Field(..., description="Current price")
    change: float = Field(..., description="Price change")
    change_percent: float = Field(..., description="Change percentage")
    volume: int = Field(..., description="Current volume")
    timestamp: datetime = Field(default_factory=datetime.now)

# ================================
# CONFIGURATION MODELS
# ================================

class TradingParameters(BaseModel):
    """Trading system configuration parameters."""
    max_portfolio_risk: float = Field(default=0.02, ge=0, le=1, description="Max portfolio risk per trade")
    max_position_size: float = Field(default=0.1, ge=0, le=1, description="Max position size as % of portfolio")
    stop_loss_percent: float = Field(default=0.05, ge=0, le=1, description="Default stop loss percentage")
    take_profit_ratio: float = Field(default=2.0, ge=1, description="Risk:reward ratio")
    max_open_positions: int = Field(default=10, ge=1, description="Maximum open positions")
    min_signal_strength: float = Field(default=60, ge=0, le=100, description="Minimum signal strength")
    min_signal_confidence: float = Field(default=0.7, ge=0, le=1, description="Minimum signal confidence")
    trading_hours_start: str = Field(default="09:15", description="Trading start time")
    trading_hours_end: str = Field(default="15:30", description="Trading end time")
    enable_paper_trading: bool = Field(default=True, description="Enable paper trading mode")
    enable_automated_trading: bool = Field(default=False, description="Enable automated trading")

# ================================
# RESPONSE MODELS
# ================================

class APIResponse(BaseModel):
    """Standard API response wrapper."""
    success: bool = Field(..., description="Request success status")
    message: str = Field(..., description="Response message")
    data: Optional[Dict] = Field(None, description="Response data")
    timestamp: datetime = Field(default_factory=datetime.now)
    request_id: Optional[str] = Field(None, description="Request tracking ID")

class ErrorResponse(BaseModel):
    """Error response model."""
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Error message")
    details: Optional[Dict] = Field(None, description="Error details")
    timestamp: datetime = Field(default_factory=datetime.now)
    request_id: Optional[str] = Field(None, description="Request tracking ID")

# ================================
# INTRADAY MODELS
# ================================

@dataclass
class IntradaySignal:
    """Intraday trading signal with specific timing."""
    id: str
    symbol: str
    signal_type: SignalType
    entry_price: float
    target_price: float
    stop_loss: float
    confidence: float
    strength: float
    timeframe: str  # "1m", "5m", "15m", "1h"
    reasoning: str
    indicators: Dict[str, float]
    volume_spike: bool
    breakout_type: Optional[str] = None  # "resistance", "support", "consolidation"
    risk_reward_ratio: float = 0.0
    expires_at: datetime = field(default_factory=lambda: datetime.now() + timedelta(hours=1))
    generated_at: datetime = field(default_factory=datetime.now)

@dataclass
class IntradayMomentum:
    """Intraday momentum analysis."""
    symbol: str
    timeframe: str
    momentum_score: float  # -100 to +100
    price_change_percent: float
    volume_ratio: float  # Current volume vs average
    volatility_percentile: float
    trend_strength: float
    support_level: float
    resistance_level: float
    breakout_probability: float
    momentum_direction: str  # "bullish", "bearish", "neutral"
    key_levels: List[float]
    updated_at: datetime = field(default_factory=datetime.now)

@dataclass
class IntradayScreenerResult:
    """Result from intraday stock screener."""
    symbol: str
    name: str
    current_price: float
    change_percent: float
    volume_ratio: float
    market_cap: Optional[float]
    sector: Optional[str]
    
    # Technical scores
    momentum_score: float
    breakout_score: float
    volume_score: float
    volatility_score: float
    overall_score: float
    
    # Key metrics
    rsi: Optional[float]
    macd_signal: Optional[str]
    price_vs_vwap: float
    support_level: float
    resistance_level: float
    
    # Risk metrics
    risk_level: str
    avg_true_range: float
    beta: Optional[float]
    
    # Intraday specific
    gap_percent: float  # Gap up/down from previous close
    pre_market_volume: Optional[float]
    news_sentiment: Optional[str]
    
    screened_at: datetime = field(default_factory=datetime.now)

@dataclass
class IntradayWatchlist:
    """Intraday watchlist with real-time updates."""
    id: str
    name: str
    symbols: List[str]
    criteria: Dict[str, Any]
    auto_update: bool
    update_interval: int  # seconds
    created_at: datetime
    last_updated: datetime
    
@dataclass
class VWAPData:
    """Volume Weighted Average Price data."""
    symbol: str
    vwap: float
    price_vs_vwap: float
    vwap_bands: Dict[str, float]  # upper, lower bands
    volume_weighted_price: float
    cumulative_volume: int
    timeframe: str
    calculated_at: datetime = field(default_factory=datetime.now)

@dataclass
class MarketDepth:
    """Market depth/order book data."""
    symbol: str
    bid_prices: List[float]
    bid_quantities: List[int]
    ask_prices: List[float]
    ask_quantities: List[int]
    bid_ask_spread: float
    market_depth_ratio: float
    timestamp: datetime = field(default_factory=datetime.now)

@dataclass
class IntradayAlert:
    """Intraday trading alert."""
    id: str
    symbol: str
    alert_type: str  # "breakout", "breakdown", "volume_spike", "price_target"
    message: str
    price: float
    condition: str
    triggered_at: datetime
    severity: str  # "low", "medium", "high"
    action_required: bool = False 