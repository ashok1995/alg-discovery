"""
Fundamental Re-ranking Service
=============================

Advanced re-ranking algorithm that combines fundamental analysis with market conditions.
Uses Yahoo Finance data for comprehensive stock evaluation and scoring.
"""

import os
import json
import asyncio
import logging
import time
import requests
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
from datetime import datetime, timedelta
import yfinance as yf
import pandas as pd
import numpy as np
import random

logger = logging.getLogger(__name__)

class MarketCondition(Enum):
    BULL_MARKET = "bull"
    BEAR_MARKET = "bear"
    SIDEWAYS = "sideways"
    VOLATILE = "volatile"

@dataclass
class FundamentalMetrics:
    """Fundamental metrics for a stock"""
    symbol: str
    pe_ratio: Optional[float] = None
    pb_ratio: Optional[float] = None
    peg_ratio: Optional[float] = None
    roe: Optional[float] = None
    roa: Optional[float] = None
    debt_to_equity: Optional[float] = None
    current_ratio: Optional[float] = None
    quick_ratio: Optional[float] = None
    dividend_yield: Optional[float] = None
    payout_ratio: Optional[float] = None
    market_cap: Optional[float] = None
    enterprise_value: Optional[float] = None
    revenue_growth: Optional[float] = None
    earnings_growth: Optional[float] = None
    profit_margin: Optional[float] = None
    operating_margin: Optional[float] = None
    gross_margin: Optional[float] = None
    book_value: Optional[float] = None
    cash_per_share: Optional[float] = None
    beta: Optional[float] = None
    forward_pe: Optional[float] = None
    price_to_sales: Optional[float] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {k: v for k, v in self.__dict__.items() if v is not None}

@dataclass
class StockScore:
    """Complete stock scoring"""
    symbol: str
    overall_score: float
    fundamental_score: float
    market_condition_score: float
    momentum_score: float
    quality_score: float
    value_score: float
    growth_score: float
    risk_score: float
    sector_score: float
    recommendations: List[str]
    confidence_level: str
    
class FundamentalReranker:
    """Enhanced fundamental analysis and re-ranking service"""
    
    def __init__(self, cache_duration_hours: int = 24):
        self.cache_duration = timedelta(hours=cache_duration_hours)
        self.cache_file = "data/fundamental_cache.json"
        self.cache_data = {}
        self.data_service = None
        self.last_request_time = 0
        self.request_delay = 5.0  # Increased to 5 seconds between requests
        self.daily_request_count = 0
        self.daily_request_limit = 50  # Very conservative daily limit
        self.last_reset_date = datetime.now().date()
        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
        ]
        self.enable_fundamental_analysis = False  # Start disabled to avoid 429 errors
        self.consecutive_errors = 0
        self.max_consecutive_errors = 3  # Lower threshold
        
        # Market condition weights for scoring
        self.market_weights = {
            MarketCondition.BULL_MARKET: {
                'growth': 0.35, 'momentum': 0.25, 'quality': 0.20, 'value': 0.15, 'risk': 0.05
            },
            MarketCondition.BEAR_MARKET: {
                'quality': 0.35, 'value': 0.30, 'risk': 0.20, 'growth': 0.10, 'momentum': 0.05
            },
            MarketCondition.SIDEWAYS: {
                'value': 0.30, 'quality': 0.25, 'growth': 0.20, 'momentum': 0.15, 'risk': 0.10
            },
            MarketCondition.VOLATILE: {
                'quality': 0.40, 'risk': 0.25, 'value': 0.20, 'growth': 0.10, 'momentum': 0.05
            }
        }
        
        # Create data directory if it doesn't exist
        os.makedirs("data", exist_ok=True)
        self.load_cache()
        logger.info("✅ Fundamental Re-ranker initialized (Yahoo Finance disabled by default)")

    def load_cache(self):
        """Load fundamental data from cache file"""
        try:
            if os.path.exists(self.cache_file):
                with open(self.cache_file, 'r') as f:
                    data = json.load(f)
                    self.cache_data = data.get('fundamentals', {})
                logger.info(f"📁 Loaded fundamental cache with {len(self.cache_data)} entries")
        except Exception as e:
            logger.error(f"❌ Error loading cache: {e}")

    def save_cache(self):
        """Save fundamental data to cache file"""
        try:
            os.makedirs(os.path.dirname(self.cache_file), exist_ok=True)
            data = {
                'fundamentals': self.cache_data,
                'last_updated': datetime.now().isoformat()
            }
            with open(self.cache_file, 'w') as f:
                json.dump(data, f, indent=2, default=str)
            logger.info("💾 Fundamental cache saved")
        except Exception as e:
            logger.error(f"❌ Error saving cache: {e}")

    def _convert_to_indian_symbol(self, symbol: str) -> str:
        """Convert symbol to NSE format if needed"""
        if symbol.endswith('.NS') or symbol.endswith('.BO'):
            return symbol
        return f"{symbol}.NS"

    def _reset_daily_limit_if_needed(self):
        """Reset daily request count if it's a new day"""
        current_date = datetime.now().date()
        if current_date != self.last_reset_date:
            self.daily_request_count = 0
            self.last_reset_date = current_date
            self.consecutive_errors = 0  # Reset error count on new day
            if not self.enable_fundamental_analysis:
                logger.info("🔄 Re-enabling fundamental analysis for new day")
                self.enable_fundamental_analysis = True

    async def _rate_limit_request(self):
        """Enhanced rate limiting with daily limits and error tracking"""
        self._reset_daily_limit_if_needed()
        
        # Check daily limit
        if self.daily_request_count >= self.daily_request_limit:
            logger.warning(f"📊 Daily request limit ({self.daily_request_limit}) reached. Disabling fundamental analysis.")
            self.enable_fundamental_analysis = False
            return False
            
        # Check if fundamental analysis is disabled due to errors
        if not self.enable_fundamental_analysis:
            return False
            
        # Rate limiting
        current_time = time.time()
        time_since_last_request = current_time - self.last_request_time
        
        if time_since_last_request < self.request_delay:
            sleep_time = self.request_delay - time_since_last_request
            # Add some jitter to avoid synchronized requests
            sleep_time += random.uniform(0, 2)
            logger.info(f"⏳ Rate limiting: sleeping for {sleep_time:.2f} seconds")
            await asyncio.sleep(sleep_time)
        
        self.last_request_time = time.time()
        self.daily_request_count += 1
        return True

    async def get_fundamental_data(self, symbol: str, force_refresh: bool = False) -> Optional[FundamentalMetrics]:
        """Get fundamental data with enhanced error handling and rate limiting"""
        if not self.enable_fundamental_analysis:
            logger.debug(f"📊 Fundamental analysis disabled, returning minimal data for {symbol}")
            return self._get_minimal_fundamentals(symbol)
            
        # Check cache first
        cache_key = f"{symbol}_fundamentals"
        if not force_refresh and cache_key in self.cache_data:
            cached_data = self.cache_data[cache_key]
            cache_time = datetime.fromisoformat(cached_data['timestamp'])
            if datetime.now() - cache_time < self.cache_duration:
                logger.info(f"📦 Using cached fundamental data for {symbol}")
                return FundamentalMetrics(**cached_data['data'])

        # Rate limit the request
        if not await self._rate_limit_request():
            logger.warning(f"🚫 Request rate limited for {symbol}, using minimal data")
            return self._get_minimal_fundamentals(symbol)

        # Convert to Yahoo Finance format
        yahoo_symbol = self._convert_to_indian_symbol(symbol)
        
        try:
            logger.info(f"🔍 Fetching fundamental data for {yahoo_symbol}")
            
            # Create a requests session with custom headers
            session = requests.Session()
            session.headers.update({
                'User-Agent': random.choice(self.user_agents),
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9'
            })
            
            # Create ticker with custom session
            ticker = yf.Ticker(yahoo_symbol)
            
            # Try to get info with retries and longer delays
            max_retries = 2  # Reduced retries
            for attempt in range(max_retries):
                try:
                    info = ticker.info
                    break
                except Exception as e:
                    if "429" in str(e) or "Too Many Requests" in str(e):
                        self.consecutive_errors += 1
                        logger.warning(f"Fetch attempt {attempt + 1} failed for {yahoo_symbol}: {e}")
                        
                        if attempt < max_retries - 1:
                            # Exponential backoff with longer delays
                            backoff_time = (2 ** attempt) * 10  # 10, 20 seconds
                            await asyncio.sleep(backoff_time)
                        else:
                            # If we hit too many consecutive errors, disable fundamental analysis
                            if self.consecutive_errors >= self.max_consecutive_errors:
                                logger.error(f"🚫 Too many consecutive errors ({self.consecutive_errors}). Disabling fundamental analysis.")
                                self.enable_fundamental_analysis = False
                            raise e
                    else:
                        raise e
            else:
                # If we exhausted all retries
                raise Exception("All retry attempts failed")

            # Reset consecutive errors on success
            self.consecutive_errors = 0
            
            # Extract fundamental metrics
            fundamentals = FundamentalMetrics(
                symbol=symbol,
                pe_ratio=self._safe_float(info.get('trailingPE')),
                pb_ratio=self._safe_float(info.get('priceToBook')),
                peg_ratio=self._safe_float(info.get('pegRatio')),
                roe=self._safe_float(info.get('returnOnEquity')),
                roa=self._safe_float(info.get('returnOnAssets')),
                debt_to_equity=self._safe_float(info.get('debtToEquity')),
                current_ratio=self._safe_float(info.get('currentRatio')),
                quick_ratio=self._safe_float(info.get('quickRatio')),
                dividend_yield=self._safe_float(info.get('dividendYield')),
                payout_ratio=self._safe_float(info.get('payoutRatio')),
                market_cap=self._safe_float(info.get('marketCap')),
                enterprise_value=self._safe_float(info.get('enterpriseValue')),
                revenue_growth=self._safe_float(info.get('revenueGrowth')),
                earnings_growth=self._safe_float(info.get('earningsGrowth')),
                profit_margin=self._safe_float(info.get('profitMargins')),
                operating_margin=self._safe_float(info.get('operatingMargins')),
                gross_margin=self._safe_float(info.get('grossMargins')),
                book_value=self._safe_float(info.get('bookValue')),
                cash_per_share=self._safe_float(info.get('totalCashPerShare')),
                beta=self._safe_float(info.get('beta')),
                forward_pe=self._safe_float(info.get('forwardPE')),
                price_to_sales=self._safe_float(info.get('priceToSalesTrailing12Months'))
            )
            
            # Cache the data
            self.cache_data[cache_key] = {
                'data': asdict(fundamentals),
                'timestamp': datetime.now().isoformat()
            }
            self.save_cache()
            
            logger.info(f"✅ Successfully fetched fundamental data for {symbol}")
            return fundamentals
            
        except Exception as e:
            logger.error(f"❌ Error fetching fundamental data for {symbol}: {e}")
            # Return minimal fundamentals to keep the algorithm running
            return self._get_minimal_fundamentals(symbol)

    def _get_minimal_fundamentals(self, symbol: str) -> FundamentalMetrics:
        """Return minimal fundamental metrics when data fetching fails"""
        return FundamentalMetrics(
            symbol=symbol,
            pe_ratio=20.0,  # Reasonable default
            pb_ratio=2.0,   # Reasonable default
            market_cap=10000000000,  # 10B default
            beta=1.0,        # Market beta
            roe=15.0,        # Decent ROE
            profit_margin=0.1,  # 10% margin
            debt_to_equity=0.5   # Moderate debt
        )

    def _safe_float(self, value: Any) -> Optional[float]:
        """Safely convert value to float"""
        if value is None or value == 'N/A' or str(value).lower() in ['none', 'nan', 'inf', '-inf']:
            return None
        try:
            float_val = float(value)
            # Check for reasonable bounds
            if abs(float_val) > 1e10 or float_val != float_val:  # NaN check
                return None
            return float_val
        except (ValueError, TypeError):
            return None

    async def detect_market_condition(self) -> MarketCondition:
        """Detect current market condition with fallback"""
        try:
            # Only try to fetch market data if fundamental analysis is enabled
            if not self.enable_fundamental_analysis:
                logger.info("📊 Market condition detection disabled, defaulting to SIDEWAYS")
                return MarketCondition.SIDEWAYS
                
            # Try to get Nifty data with minimal requests
            nifty_symbol = "^NSEI"
            ticker = yf.Ticker(nifty_symbol)
            
            # Get 1 month of data to determine trend
            hist = ticker.history(period="1mo")
            
            if hist.empty or len(hist) < 5:
                logger.warning("Could not fetch market data, defaulting to SIDEWAYS")
                return MarketCondition.SIDEWAYS
                
            # Simple trend analysis
            recent_close = hist['Close'].iloc[-1]
            week_ago_close = hist['Close'].iloc[-5] if len(hist) >= 5 else hist['Close'].iloc[0]
            
            change_pct = (recent_close - week_ago_close) / week_ago_close * 100
            volatility = hist['Close'].pct_change().std() * 100
            
            if change_pct > 3 and volatility < 2:
                return MarketCondition.BULL_MARKET
            elif change_pct < -3 and volatility < 2:
                return MarketCondition.BEAR_MARKET
            elif volatility > 3:
                return MarketCondition.VOLATILE
            else:
                return MarketCondition.SIDEWAYS
                
        except Exception as e:
            logger.warning(f"Could not fetch market data, defaulting to SIDEWAYS: {e}")
            return MarketCondition.SIDEWAYS

    def calculate_fundamental_scores(self, fundamentals: FundamentalMetrics) -> Dict[str, float]:
        """Calculate various fundamental scores"""
        scores = {}
        
        # Value Score (0-100)
        value_components = []
        if fundamentals.pe_ratio:
            # PE score: lower is better, optimal range 8-18
            pe_score = max(0, 100 - max(0, (fundamentals.pe_ratio - 18) * 5))
            value_components.append(pe_score)
        
        if fundamentals.pb_ratio:
            # PB score: lower is better, optimal < 2
            pb_score = max(0, 100 - max(0, (fundamentals.pb_ratio - 2) * 25))
            value_components.append(pb_score)
        
        if fundamentals.price_to_sales:
            # P/S score: lower is better, optimal < 3
            ps_score = max(0, 100 - max(0, (fundamentals.price_to_sales - 3) * 20))
            value_components.append(ps_score)
        
        scores['value'] = np.mean(value_components) if value_components else 50
        
        # Quality Score (0-100)
        quality_components = []
        if fundamentals.roe:
            # ROE score: higher is better, optimal > 15%
            roe_score = min(100, max(0, fundamentals.roe * 5))
            quality_components.append(roe_score)
        
        if fundamentals.debt_to_equity:
            # D/E score: lower is better, optimal < 0.5
            de_score = max(0, 100 - fundamentals.debt_to_equity * 100)
            quality_components.append(de_score)
        
        if fundamentals.current_ratio:
            # Current ratio: optimal range 1.2-2.5
            cr_score = 100 if 1.2 <= fundamentals.current_ratio <= 2.5 else max(0, 100 - abs(fundamentals.current_ratio - 1.5) * 30)
            quality_components.append(cr_score)
        
        if fundamentals.profit_margin:
            # Profit margin: higher is better
            pm_score = min(100, max(0, fundamentals.profit_margin * 1000))
            quality_components.append(pm_score)
        
        scores['quality'] = np.mean(quality_components) if quality_components else 50
        
        # Growth Score (0-100)
        growth_components = []
        if fundamentals.revenue_growth:
            # Revenue growth: positive is good, >10% is excellent
            rg_score = min(100, max(0, 50 + fundamentals.revenue_growth * 200))
            growth_components.append(rg_score)
        
        if fundamentals.earnings_growth:
            # Earnings growth: positive is good, >15% is excellent
            eg_score = min(100, max(0, 50 + fundamentals.earnings_growth * 150))
            growth_components.append(eg_score)
        
        if fundamentals.peg_ratio:
            # PEG ratio: lower is better, optimal < 1
            peg_score = max(0, 100 - fundamentals.peg_ratio * 50)
            growth_components.append(peg_score)
        
        scores['growth'] = np.mean(growth_components) if growth_components else 50
        
        # Risk Score (0-100, higher means lower risk)
        risk_components = []
        if fundamentals.beta:
            # Beta: closer to 1 is better, penalize high volatility
            beta_score = max(0, 100 - abs(fundamentals.beta - 1) * 50)
            risk_components.append(beta_score)
        
        if fundamentals.debt_to_equity:
            # Low debt is less risky
            debt_risk_score = max(0, 100 - fundamentals.debt_to_equity * 80)
            risk_components.append(debt_risk_score)
        
        if fundamentals.current_ratio:
            # Good liquidity reduces risk
            liquidity_score = min(100, fundamentals.current_ratio * 40)
            risk_components.append(liquidity_score)
        
        scores['risk'] = np.mean(risk_components) if risk_components else 50
        
        # Dividend Score (0-100)
        dividend_components = []
        if fundamentals.dividend_yield:
            # Dividend yield: sweet spot 2-6%
            dy_score = 100 if 0.02 <= fundamentals.dividend_yield <= 0.06 else max(0, 50 - abs(fundamentals.dividend_yield - 0.04) * 1000)
            dividend_components.append(dy_score)
        
        if fundamentals.payout_ratio:
            # Payout ratio: optimal 30-60%
            pr_score = 100 if 0.3 <= fundamentals.payout_ratio <= 0.6 else max(0, 100 - abs(fundamentals.payout_ratio - 0.45) * 200)
            dividend_components.append(pr_score)
        
        scores['dividend'] = np.mean(dividend_components) if dividend_components else 0
        
        return scores

    async def get_momentum_score(self, symbol: str) -> float:
        """Calculate momentum score based on price action"""
        try:
            indian_symbol = self._convert_to_indian_symbol(symbol)
            ticker = yf.Ticker(indian_symbol)
            hist = ticker.history(period="6mo", interval="1d")
            
            if hist.empty or len(hist) < 50:
                return 50  # Neutral score
            
            current_price = hist['Close'].iloc[-1]
            
            # Calculate various momentum indicators
            sma_20 = hist['Close'].rolling(20).mean().iloc[-1]
            sma_50 = hist['Close'].rolling(50).mean().iloc[-1]
            sma_200 = hist['Close'].rolling(200).mean().iloc[-1] if len(hist) >= 200 else sma_50
            
            # Price vs moving averages (0-40 points)
            ma_score = 0
            if current_price > sma_20:
                ma_score += 15
            if current_price > sma_50:
                ma_score += 15
            if current_price > sma_200:
                ma_score += 10
            
            # Recent performance (0-30 points)
            perf_1w = (current_price - hist['Close'].iloc[-6]) / hist['Close'].iloc[-6] if len(hist) >= 6 else 0
            perf_1m = (current_price - hist['Close'].iloc[-21]) / hist['Close'].iloc[-21] if len(hist) >= 21 else 0
            
            perf_score = min(30, max(0, (perf_1w * 100 + perf_1m * 50)))
            
            # Volume trend (0-30 points)
            avg_volume_20 = hist['Volume'].rolling(20).mean().iloc[-1]
            recent_volume = hist['Volume'].tail(5).mean()
            volume_score = min(30, max(0, ((recent_volume / avg_volume_20) - 1) * 50)) if avg_volume_20 > 0 else 15
            
            total_score = ma_score + perf_score + volume_score
            return min(100, max(0, total_score))
            
        except Exception as e:
            logger.error(f"❌ Error calculating momentum for {symbol}: {e}")
            return 50

    async def get_sector_score(self, symbol: str, fundamentals: FundamentalMetrics) -> Tuple[float, str]:
        """Calculate sector-relative score"""
        try:
            indian_symbol = self._convert_to_indian_symbol(symbol)
            ticker = yf.Ticker(indian_symbol)
            info = ticker.info
            
            sector = info.get('sector', 'Unknown')
            
            # Sector-specific scoring logic could be implemented here
            # For now, return a neutral score with sector info
            return 50.0, sector
            
        except Exception as e:
            logger.error(f"❌ Error calculating sector score for {symbol}: {e}")
            return 50.0, "Unknown"

    async def calculate_overall_score(self, symbol: str, market_condition: MarketCondition) -> Optional[StockScore]:
        """Calculate comprehensive stock score"""
        try:
            # Get fundamental data
            fundamentals = await self.get_fundamental_data(symbol)
            if not fundamentals:
                logger.warning(f"No fundamental data for {symbol}")
                return None
            
            # Calculate component scores
            fund_scores = self.calculate_fundamental_scores(fundamentals)
            momentum_score = await self.get_momentum_score(symbol)
            sector_score, sector = await self.get_sector_score(symbol, fundamentals)
            
            # Get market condition weights
            weights = self.market_weights[market_condition]
            
            # Calculate weighted overall score
            overall_score = (
                fund_scores['value'] * weights.get('value', 0.2) +
                fund_scores['quality'] * weights.get('quality', 0.25) +
                fund_scores['growth'] * weights.get('growth', 0.25) +
                fund_scores['risk'] * weights.get('risk', 0.1) +
                momentum_score * weights.get('momentum', 0.15) +
                fund_scores.get('dividend', 0) * weights.get('dividend', 0.05)
            )
            
            # Generate recommendations
            recommendations = self._generate_recommendations(fundamentals, fund_scores, momentum_score)
            
            # Determine confidence level
            confidence = self._calculate_confidence(fundamentals, fund_scores)
            
            return StockScore(
                symbol=symbol,
                overall_score=round(overall_score, 2),
                fundamental_score=round(np.mean(list(fund_scores.values())), 2),
                market_condition_score=round(sector_score, 2),
                momentum_score=round(momentum_score, 2),
                quality_score=round(fund_scores['quality'], 2),
                value_score=round(fund_scores['value'], 2),
                growth_score=round(fund_scores['growth'], 2),
                risk_score=round(fund_scores['risk'], 2),
                sector_score=round(sector_score, 2),
                recommendations=recommendations,
                confidence_level=confidence
            )
            
        except Exception as e:
            logger.error(f"❌ Error calculating overall score for {symbol}: {e}")
            return None

    def _generate_recommendations(self, fundamentals: FundamentalMetrics, scores: Dict[str, float], momentum: float) -> List[str]:
        """Generate actionable recommendations"""
        recommendations = []
        
        # Quality recommendations
        if scores['quality'] > 75:
            recommendations.append("High-quality fundamentals suggest strong long-term potential")
        elif scores['quality'] < 40:
            recommendations.append("Weak fundamentals - consider risk management")
        
        # Value recommendations
        if scores['value'] > 75:
            recommendations.append("Attractive valuation - potential value opportunity")
        elif scores['value'] < 30:
            recommendations.append("High valuation - monitor for corrections")
        
        # Growth recommendations
        if scores['growth'] > 75:
            recommendations.append("Strong growth metrics indicate expansion potential")
        elif scores['growth'] < 40:
            recommendations.append("Limited growth visibility - suitable for conservative investors")
        
        # Momentum recommendations
        if momentum > 70:
            recommendations.append("Strong momentum - consider position sizing")
        elif momentum < 30:
            recommendations.append("Weak momentum - wait for technical improvement")
        
        # Risk recommendations
        if scores['risk'] < 40:
            recommendations.append("Higher risk profile - suitable for aggressive investors only")
        elif scores['risk'] > 75:
            recommendations.append("Low risk characteristics - suitable for conservative portfolios")
        
        # Dividend recommendations
        if scores.get('dividend', 0) > 60:
            recommendations.append("Attractive dividend profile for income investors")
        
        return recommendations

    def _calculate_confidence(self, fundamentals: FundamentalMetrics, scores: Dict[str, float]) -> str:
        """Calculate confidence level based on data completeness and consistency"""
        # Count available metrics
        available_metrics = sum(1 for v in fundamentals.to_dict().values() if v is not None)
        total_possible = len(fundamentals.__dataclass_fields__)
        
        completeness = available_metrics / total_possible
        
        # Check score consistency (low standard deviation indicates consistency)
        score_values = list(scores.values())
        consistency = 1 - (np.std(score_values) / 100) if len(score_values) > 1 else 0.5
        
        overall_confidence = (completeness * 0.6 + consistency * 0.4)
        
        if overall_confidence > 0.8:
            return "High"
        elif overall_confidence > 0.6:
            return "Medium"
        else:
            return "Low"

    async def rerank_stocks(self, stocks: List[Dict[str, Any]], limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """Re-rank stocks using fundamental analysis with enhanced error handling"""
        if not stocks:
            return []
        
        logger.info(f"🔄 Re-ranking {len(stocks)} stocks using {'fundamental analysis' if self.enable_fundamental_analysis else 'technical analysis only'}...")
        
        # If fundamental analysis is disabled, use simple technical scoring
        if not self.enable_fundamental_analysis:
            return await self._rerank_stocks_fallback(stocks, limit)
        
        # Detect market condition first
        market_condition = await self.detect_market_condition()
        logger.info(f"📈 Detected market condition: {market_condition.value}")
        
        scored_stocks = []
        
        for i, stock in enumerate(stocks):
            symbol = stock.get('symbol', '')
            if not symbol:
                continue
                
            try:
                # Calculate overall score for the stock
                score = await self.calculate_overall_score(symbol, market_condition)
                
                if score:
                    enhanced_stock = stock.copy()
                    enhanced_stock.update({
                        'fundamental_score': score.fundamental_score,
                        'overall_score': score.overall_score,
                        'market_condition_score': score.market_condition_score,
                        'momentum_score': score.momentum_score,
                        'quality_score': score.quality_score,
                        'value_score': score.value_score,
                        'growth_score': score.growth_score,
                        'risk_score': score.risk_score,
                        'sector_score': score.sector_score,
                        'recommendations': score.recommendations,
                        'confidence_level': score.confidence_level
                    })
                    scored_stocks.append(enhanced_stock)
                else:
                    # Keep original stock with basic scoring
                    enhanced_stock = stock.copy()
                    enhanced_stock.update({
                        'fundamental_score': 60.0,  # Neutral score
                        'overall_score': stock.get('score', 60.0),
                        'confidence_level': 'Medium (No Fundamental Data)'
                    })
                    scored_stocks.append(enhanced_stock)
                    
            except Exception as e:
                logger.error(f"❌ Error scoring stock {symbol}: {e}")
                # Keep the original stock
                enhanced_stock = stock.copy()
                enhanced_stock.update({
                    'fundamental_score': 60.0,  # Neutral score
                    'overall_score': stock.get('score', 60.0),
                    'confidence_level': 'Medium (Error)'
                })
                scored_stocks.append(enhanced_stock)
            
            # Minimal delay between stocks since we're not making requests
            if i < len(stocks) - 1:  # Don't sleep after the last stock
                await asyncio.sleep(0.1)  # Very short delay
        
        # Sort by overall score
        scored_stocks.sort(key=lambda x: x.get('overall_score', 0), reverse=True)
        
        # Apply limit if specified
        if limit:
            scored_stocks = scored_stocks[:limit]
        
        logger.info(f"✅ Re-ranking complete. Top score: {scored_stocks[0].get('overall_score', 0):.2f}" if scored_stocks else "No stocks scored")
        return scored_stocks

    async def _rerank_stocks_fallback(self, stocks: List[Dict[str, Any]], limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """Fallback re-ranking using only technical indicators without Yahoo Finance calls"""
        logger.info("📊 Using fallback technical analysis (no external API calls)")
        
        scored_stocks = []
        
        for stock in stocks:
            try:
                # Extract technical data from stock
                price_change = stock.get('per_chg', 0)
                volume = stock.get('volume', 0)
                close_price = stock.get('close', 0)
                high = stock.get('high', close_price)
                low = stock.get('low', close_price)
                
                # Calculate basic technical scores
                momentum_score = min(max(price_change * 10 + 50, 0), 100)  # Price change to 0-100 scale
                
                # Volume-based quality score (higher volume = higher quality for this analysis)
                volume_score = min(volume / 1000000 * 10 + 40, 100) if volume > 0 else 50
                
                # Price range volatility (smaller range = higher quality)
                if high > low > 0:
                    range_volatility = ((high - low) / close_price) * 100
                    risk_score = max(100 - range_volatility * 5, 20)
                else:
                    risk_score = 60
                
                # Value score based on price change (lower change = better value)
                value_score = max(100 - abs(price_change) * 2, 30)
                
                # Growth score (positive trend gets higher score)
                growth_score = 50 + (price_change * 2) if price_change > 0 else 40
                
                # Market condition score (neutral)
                market_condition_score = 50.0
                
                # Sector score (neutral - we don't have sector data without API calls)
                sector_score = 50.0
                
                # Overall fundamental score (weighted average)
                fundamental_score = (
                    momentum_score * 0.25 +
                    volume_score * 0.20 +
                    risk_score * 0.20 +
                    value_score * 0.20 +
                    growth_score * 0.15
                )
                
                # Overall score combines base score with technical analysis
                base_score = stock.get('base_score', stock.get('score', 50))
                overall_score = (base_score * 0.4) + (fundamental_score * 0.6)
                
                # Generate recommendations based on technical scores
                recommendations = []
                if value_score > 75:
                    recommendations.append("Attractive valuation - potential value opportunity")
                if risk_score > 75:
                    recommendations.append("Low risk characteristics - suitable for conservative portfolios")
                if momentum_score > 70:
                    recommendations.append("Strong momentum - positive technical indicators")
                if volume_score > 70:
                    recommendations.append("High trading volume indicates strong interest")
                
                if not recommendations:
                    recommendations.append("Moderate technical indicators - suitable for balanced portfolios")
                
                # Update stock with scores
                enhanced_stock = stock.copy()
                enhanced_stock.update({
                    'fundamental_score': round(fundamental_score, 2),
                    'overall_score': round(overall_score, 2),
                    'market_condition_score': market_condition_score,
                    'momentum_score': round(momentum_score, 2),
                    'quality_score': round(volume_score, 2),
                    'value_score': round(value_score, 2),
                    'growth_score': round(growth_score, 2),
                    'risk_score': round(risk_score, 2),
                    'sector_score': sector_score,
                    'recommendations': recommendations,
                    'confidence_level': 'Low'  # Low confidence without fundamental data
                })
                
                scored_stocks.append(enhanced_stock)
                
            except Exception as e:
                logger.error(f"❌ Error in fallback scoring for {stock.get('symbol', 'Unknown')}: {e}")
                # Keep original stock with minimal enhancements
                enhanced_stock = stock.copy()
                enhanced_stock.update({
                    'fundamental_score': 50.0,
                    'overall_score': stock.get('base_score', 50.0),
                    'market_condition_score': 50.0,
                    'momentum_score': 50,
                    'quality_score': 50.0,
                    'value_score': 50.0,
                    'growth_score': 50,
                    'risk_score': 50.0,
                    'sector_score': 50.0,
                    'recommendations': ["Technical analysis unavailable"],
                    'confidence_level': 'Low'
                })
                scored_stocks.append(enhanced_stock)
        
        # Sort by overall score
        scored_stocks.sort(key=lambda x: x.get('overall_score', 0), reverse=True)
        
        # Apply limit if specified
        if limit:
            scored_stocks = scored_stocks[:limit]
        
        logger.info(f"✅ Fallback re-ranking complete. Top score: {scored_stocks[0].get('overall_score', 0):.2f}" if scored_stocks else "No stocks scored")
        return scored_stocks

    async def get_stock_report(self, symbol: str) -> Dict[str, Any]:
        """Get comprehensive fundamental report for a single stock"""
        try:
            market_condition = await self.detect_market_condition()
            score = await self.calculate_overall_score(symbol, market_condition)
            fundamentals = await self.get_fundamental_data(symbol)
            
            if not score or not fundamentals:
                return {"error": f"Unable to generate report for {symbol}"}
            
            return {
                "symbol": symbol,
                "report_date": datetime.now().isoformat(),
                "market_condition": market_condition.value,
                "overall_score": score.overall_score,
                "scores": {
                    "fundamental": score.fundamental_score,
                    "momentum": score.momentum_score,
                    "quality": score.quality_score,
                    "value": score.value_score,
                    "growth": score.growth_score,
                    "risk": score.risk_score,
                    "sector": score.sector_score
                },
                "fundamentals": fundamentals.to_dict(),
                "recommendations": score.recommendations,
                "confidence_level": score.confidence_level,
                "investment_thesis": self._generate_investment_thesis(score, fundamentals)
            }
            
        except Exception as e:
            logger.error(f"❌ Error generating report for {symbol}: {e}")
            return {"error": str(e)}

    def _generate_investment_thesis(self, score: StockScore, fundamentals: FundamentalMetrics) -> str:
        """Generate investment thesis based on scores and fundamentals"""
        thesis_parts = []
        
        if score.overall_score >= 75:
            thesis_parts.append("Strong investment candidate with")
        elif score.overall_score >= 60:
            thesis_parts.append("Moderate investment potential with")
        else:
            thesis_parts.append("Cautious consideration needed due to")
        
        # Add specific strengths/weaknesses
        if score.quality_score >= 70:
            thesis_parts.append("excellent fundamental quality,")
        if score.value_score >= 70:
            thesis_parts.append("attractive valuation,")
        if score.growth_score >= 70:
            thesis_parts.append("strong growth prospects,")
        if score.momentum_score >= 70:
            thesis_parts.append("positive momentum,")
        if score.risk_score >= 70:
            thesis_parts.append("low risk profile,")
        
        # Remove trailing comma and add conclusion
        thesis = " ".join(thesis_parts).rstrip(",")
        
        if score.confidence_level == "High":
            thesis += ". High confidence in analysis based on comprehensive data."
        elif score.confidence_level == "Medium":
            thesis += ". Moderate confidence - monitor for additional data points."
        else:
            thesis += ". Limited data availability affects confidence in analysis."
        
        return thesis 