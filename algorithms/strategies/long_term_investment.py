"""
Long-Term Investment Strategy
============================

This strategy focuses on investments with horizon of more than 1 year.
Key features:
1. Fundamental analysis based stock selection
2. Value and growth investing principles
3. Quality metrics evaluation
4. Long-term trend analysis
5. Sector and industry analysis
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import logging

logger = logging.getLogger(__name__)

class LongTermInvestmentStrategy:
    """
    Long-Term Investment Strategy for 1+ year investment horizon
    
    This strategy combines:
    - Fundamental analysis
    - Value investing metrics
    - Growth potential assessment
    - Quality scoring
    - Long-term technical trends
    """
    
    def __init__(self, 
                 min_market_cap=5000000000,  # 5B minimum market cap
                 max_pe_ratio=30,
                 min_roe=15,
                 min_revenue_growth=10,
                 target_return=0.15,  # 15% annual target
                 max_risk_score=0.25):
        
        self.min_market_cap = min_market_cap
        self.max_pe_ratio = max_pe_ratio
        self.min_roe = min_roe
        self.min_revenue_growth = min_revenue_growth
        self.target_return = target_return
        self.max_risk_score = max_risk_score
        
        # Scoring weights for different criteria
        self.scoring_weights = {
            'fundamental_score': 0.4,
            'technical_score': 0.2,
            'growth_score': 0.25,
            'quality_score': 0.15
        }
        
        # Sector preferences (weights)
        self.sector_preferences = {
            'Technology': 1.2,
            'Healthcare': 1.1,
            'Consumer Discretionary': 1.0,
            'Financials': 0.9,
            'Energy': 0.8,
            'Utilities': 0.7
        }
    
    def calculate_fundamental_score(self, stock_info: Dict) -> float:
        """Calculate fundamental analysis score (0-100)"""
        score = 0
        max_score = 100
        
        try:
            # P/E Ratio scoring (lower is better, up to max_pe_ratio)
            pe_ratio = stock_info.get('trailingPE', 0)
            if pe_ratio > 0 and pe_ratio <= self.max_pe_ratio:
                pe_score = max(0, (self.max_pe_ratio - pe_ratio) / self.max_pe_ratio * 25)
                score += pe_score
            
            # P/B Ratio scoring (lower is better)
            pb_ratio = stock_info.get('priceToBook', 0)
            if pb_ratio > 0:
                pb_score = max(0, min(25, (3 - pb_ratio) / 3 * 25))
                score += pb_score
            
            # ROE scoring
            roe = stock_info.get('returnOnEquity', 0) * 100 if stock_info.get('returnOnEquity') else 0
            if roe >= self.min_roe:
                roe_score = min(25, (roe - self.min_roe) / (30 - self.min_roe) * 25)
                score += roe_score
            
            # Debt-to-Equity scoring (lower is better)
            debt_to_equity = stock_info.get('debtToEquity', 0)
            if debt_to_equity >= 0:
                de_score = max(0, min(25, (100 - debt_to_equity) / 100 * 25))
                score += de_score
            
        except Exception as e:
            logger.warning(f"Error calculating fundamental score: {e}")
            
        return min(max_score, score)
    
    def calculate_growth_score(self, stock_info: Dict) -> float:
        """Calculate growth potential score (0-100)"""
        score = 0
        max_score = 100
        
        try:
            # Revenue growth scoring
            revenue_growth = stock_info.get('revenueGrowth', 0) * 100 if stock_info.get('revenueGrowth') else 0
            if revenue_growth >= self.min_revenue_growth:
                rev_score = min(30, (revenue_growth - self.min_revenue_growth) / (50 - self.min_revenue_growth) * 30)
                score += rev_score
            
            # Earnings growth scoring
            earnings_growth = stock_info.get('earningsGrowth', 0) * 100 if stock_info.get('earningsGrowth') else 0
            if earnings_growth > 0:
                earn_score = min(30, earnings_growth / 50 * 30)
                score += earn_score
            
            # Forward P/E vs Trailing P/E (growth expectation)
            forward_pe = stock_info.get('forwardPE', 0)
            trailing_pe = stock_info.get('trailingPE', 0)
            if forward_pe > 0 and trailing_pe > 0:
                pe_improvement = (trailing_pe - forward_pe) / trailing_pe
                if pe_improvement > 0:
                    pe_score = min(20, pe_improvement * 100)
                    score += pe_score
            
            # Analyst recommendations
            recommendation_mean = stock_info.get('recommendationMean', 3)
            if recommendation_mean <= 2.5:  # Strong buy to buy
                rec_score = min(20, (3 - recommendation_mean) / 1 * 20)
                score += rec_score
            
        except Exception as e:
            logger.warning(f"Error calculating growth score: {e}")
            
        return min(max_score, score)
    
    def calculate_quality_score(self, stock_info: Dict) -> float:
        """Calculate company quality score (0-100)"""
        score = 0
        max_score = 100
        
        try:
            # Market cap scoring (larger companies get higher score)
            market_cap = stock_info.get('marketCap', 0)
            if market_cap >= self.min_market_cap:
                # Score based on market cap tiers
                if market_cap >= 100000000000:  # 100B+
                    score += 30
                elif market_cap >= 50000000000:   # 50B+
                    score += 25
                elif market_cap >= 20000000000:   # 20B+
                    score += 20
                else:
                    score += 15
            
            # Beta scoring (prefer moderate beta)
            beta = stock_info.get('beta', 1)
            if 0.5 <= beta <= 1.5:
                beta_score = 20 - abs(beta - 1) * 20
                score += beta_score
            
            # Profit margins
            profit_margin = stock_info.get('profitMargins', 0) * 100 if stock_info.get('profitMargins') else 0
            if profit_margin > 0:
                margin_score = min(25, profit_margin / 20 * 25)
                score += margin_score
            
            # Current ratio (liquidity)
            current_ratio = stock_info.get('currentRatio', 0)
            if current_ratio >= 1.2:
                liquidity_score = min(25, (current_ratio - 1) / 2 * 25)
                score += liquidity_score
            
        except Exception as e:
            logger.warning(f"Error calculating quality score: {e}")
            
        return min(max_score, score)
    
    def calculate_technical_score(self, df: pd.DataFrame) -> float:
        """Calculate long-term technical analysis score (0-100)"""
        if len(df) < 200:  # Need at least 200 days of data
            return 0
        
        score = 0
        max_score = 100
        
        try:
            # Long-term trend (200-day MA)
            df['ma_200'] = df['Close'].rolling(window=200).mean()
            current_price = df['Close'].iloc[-1]
            ma_200 = df['ma_200'].iloc[-1]
            
            if current_price > ma_200:
                trend_score = 25
                # Bonus for strong uptrend
                if current_price > ma_200 * 1.1:
                    trend_score += 10
                score += trend_score
            
            # Price momentum over 6 months
            if len(df) >= 120:
                six_month_return = (current_price - df['Close'].iloc[-120]) / df['Close'].iloc[-120]
                if six_month_return > 0:
                    momentum_score = min(25, six_month_return * 100)
                    score += momentum_score
            
            # Volume trend (increasing volume during uptrends)
            recent_volume = df['Volume'].tail(30).mean()
            older_volume = df['Volume'].tail(90).head(30).mean()
            if recent_volume > older_volume:
                volume_score = min(25, (recent_volume / older_volume - 1) * 50)
                score += volume_score
            
            # Support and resistance levels
            recent_high = df['High'].tail(60).max()
            current_level = current_price / recent_high
            if current_level > 0.9:  # Near recent highs
                score += 25
            elif current_level > 0.8:
                score += 15
            
        except Exception as e:
            logger.warning(f"Error calculating technical score: {e}")
            
        return min(max_score, score)
    
    def calculate_overall_score(self, fundamental_score: float, growth_score: float, 
                              quality_score: float, technical_score: float, 
                              sector: str = None) -> float:
        """Calculate weighted overall investment score"""
        
        # Calculate weighted score
        overall_score = (
            fundamental_score * self.scoring_weights['fundamental_score'] +
            growth_score * self.scoring_weights['growth_score'] +
            quality_score * self.scoring_weights['quality_score'] +
            technical_score * self.scoring_weights['technical_score']
        )
        
        # Apply sector preference
        if sector and sector in self.sector_preferences:
            overall_score *= self.sector_preferences[sector]
        
        return min(100, overall_score)
    
    def analyze_stock(self, symbol: str, df: pd.DataFrame, 
                     stock_info: Dict = None) -> Optional[Dict[str, Any]]:
        """
        Comprehensive analysis for long-term investment
        
        Args:
            symbol: Stock symbol
            df: Historical price data (preferably 1+ years)
            stock_info: Company fundamental information
            
        Returns:
            Analysis result with scores and recommendations
        """
        
        if len(df) < 100:  # Need at least 100 days for meaningful analysis
            return None
            
        try:
            # Calculate individual scores
            fundamental_score = self.calculate_fundamental_score(stock_info or {})
            growth_score = self.calculate_growth_score(stock_info or {})
            quality_score = self.calculate_quality_score(stock_info or {})
            technical_score = self.calculate_technical_score(df)
            
            # Get sector information
            sector = stock_info.get('sector') if stock_info else None
            
            # Calculate overall score
            overall_score = self.calculate_overall_score(
                fundamental_score, growth_score, quality_score, 
                technical_score, sector
            )
            
            # Determine investment recommendation
            if overall_score >= 80:
                recommendation = "Strong Buy"
                confidence = 90
            elif overall_score >= 70:
                recommendation = "Buy"
                confidence = 80
            elif overall_score >= 60:
                recommendation = "Hold"
                confidence = 70
            elif overall_score >= 50:
                recommendation = "Weak Hold"
                confidence = 60
            else:
                recommendation = "Avoid"
                confidence = 40
            
            # Calculate target price (simplified)
            current_price = df['Close'].iloc[-1]
            target_price = current_price * (1 + self.target_return * (overall_score / 100))
            
            # Risk assessment
            volatility = df['Close'].pct_change().std() * np.sqrt(252)  # Annualized volatility
            risk_score = min(100, volatility * 100)
            
            return {
                'symbol': symbol,
                'overall_score': round(overall_score, 2),
                'fundamental_score': round(fundamental_score, 2),
                'growth_score': round(growth_score, 2),
                'quality_score': round(quality_score, 2),
                'technical_score': round(technical_score, 2),
                'recommendation': recommendation,
                'confidence': confidence,
                'current_price': round(current_price, 2),
                'target_price': round(target_price, 2),
                'expected_return': round((target_price / current_price - 1) * 100, 2),
                'risk_score': round(risk_score, 2),
                'investment_horizon': "1+ years",
                'sector': sector,
                'analysis_date': datetime.now().isoformat(),
                'market_cap': stock_info.get('marketCap') if stock_info else None,
                'pe_ratio': stock_info.get('trailingPE') if stock_info else None,
                'roe': stock_info.get('returnOnEquity') if stock_info else None
            }
            
        except Exception as e:
            logger.error(f"Error analyzing {symbol}: {e}")
            return None
    
    def screen_stocks(self, stocks_data: Dict[str, Dict], limit: int = 20) -> List[Dict[str, Any]]:
        """
        Screen multiple stocks for long-term investment opportunities
        
        Args:
            stocks_data: Dictionary with symbol as key and {'df': DataFrame, 'info': dict} as value
            limit: Maximum number of recommendations to return
            
        Returns:
            List of top long-term investment opportunities
        """
        
        recommendations = []
        
        for symbol, data in stocks_data.items():
            df = data.get('df')
            info = data.get('info', {})
            
            if df is None or len(df) < 100:
                continue
                
            analysis = self.analyze_stock(symbol, df, info)
            if analysis and analysis['overall_score'] >= 50:  # Only include decent opportunities
                recommendations.append(analysis)
        
        # Sort by overall score
        recommendations.sort(key=lambda x: x['overall_score'], reverse=True)
        
        return recommendations[:limit] 