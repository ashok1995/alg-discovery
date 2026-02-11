"""
Machine learning model for pattern learning
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from utils.logger import get_logger

logger = get_logger(__name__, group="shared", service="model_pattern_learner")

class PatternLearner:
    """Machine learning model for pattern learning"""
    
    def __init__(self):
        """Initialize PatternLearner"""
        self.model = RandomForestClassifier(n_estimators=100, random_state=42)
        self.features = []
        self.is_trained = False
    
    def prepare_features(self, df):
        """
        Prepare features for training
        
        Args:
            df: DataFrame with OHLCV data and indicators
        
        Returns:
            DataFrame with features
        """
        try:
            # Technical indicators as features
            features = pd.DataFrame()
            
            # Price-based features
            features['close_sma20_ratio'] = df['Close'] / df['SMA_20']
            features['close_sma50_ratio'] = df['Close'] / df['SMA_50']
            features['close_sma200_ratio'] = df['Close'] / df['SMA_200']
            features['sma20_sma50_ratio'] = df['SMA_20'] / df['SMA_50']
            features['sma50_sma200_ratio'] = df['SMA_50'] / df['SMA_200']
            
            # Momentum indicators
            features['rsi'] = df['RSI']
            features['macd'] = df['MACD']
            features['macd_signal'] = df['MACD_Signal']
            features['macd_hist'] = df['MACD'] - df['MACD_Signal']
            
            # Volatility indicators
            features['bb_width'] = df['BB_Width']
            features['atr'] = df['ATR']
            features['atr_percent'] = df['ATR'] / df['Close']
            
            # Volume indicators
            features['volume_sma20_ratio'] = df['Volume'] / df['Volume'].rolling(window=20).mean()
            
            # Trend indicators
            features['adx'] = df['ADX']
            
            # Store feature names
            self.features = features.columns.tolist()
            
            return features
        except Exception as e:
            logger.error(f"Error preparing features: {e}")
            return pd.DataFrame()
    
    def prepare_target(self, df, forward_periods=5, threshold=0.02):
        """
        Prepare target variable for training
        
        Args:
            df: DataFrame with OHLCV data
            forward_periods: Number of periods to look forward
            threshold: Price change threshold for classification
        
        Returns:
            Series with target variable
        """
        try:
            # Calculate forward returns
            df['forward_return'] = df['Close'].shift(-forward_periods) / df['Close'] - 1
            
            # Create target variable
            target = pd.Series(0, index=df.index)  # Default: no significant move
            target[df['forward_return'] > threshold] = 1  # Bullish
            target[df['forward_return'] < -threshold] = -1  # Bearish
            
            return target
        except Exception as e:
            logger.error(f"Error preparing target: {e}")
            return pd.Series()
    
    def train(self, df, forward_periods=5, threshold=0.02):
        """
        Train the model
        
        Args:
            df: DataFrame with OHLCV data and indicators
            forward_periods: Number of periods to look forward
            threshold: Price change threshold for classification
        
        Returns:
            Dictionary with training results
        """
        try:
            # Prepare features and target
            X = self.prepare_features(df)
            y = self.prepare_target(df, forward_periods, threshold)
            
            # Drop rows with NaN values
            valid_idx = ~(X.isna().any(axis=1) | y.isna())
            X = X[valid_idx]
            y = y[valid_idx]
            
            if len(X) < 100:
                logger.warning(f"Insufficient data for training: {len(X)} samples")
                return {
                    "success": False,
                    "error": "Insufficient data for training"
                }
            
            # Split data into training and testing sets
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
            
            # Train the model
            self.model.fit(X_train, y_train)
            
            # Evaluate the model
            y_pred = self.model.predict(X_test)
            
            accuracy = accuracy_score(y_test, y_pred)
            precision = precision_score(y_test, y_pred, average='weighted')
            recall = recall_score(y_test, y_pred, average='weighted')
            f1 = f1_score(y_test, y_pred, average='weighted')
            
            # Get feature importances
            feature_importances = dict(zip(self.features, self.model.feature_importances_))
            
            self.is_trained = True
            
            return {
                "success": True,
                "accuracy": accuracy,
                "precision": precision,
                "recall": recall,
                "f1": f1,
                "feature_importances": feature_importances,
                "samples": len(X)
            }
        except Exception as e:
            logger.error(f"Error training model: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def predict(self, df):
        """
        Make predictions
        
        Args:
            df: DataFrame with OHLCV data and indicators
        
        Returns:
            Series with predictions
        """
        try:
            if not self.is_trained:
                logger.warning("Model is not trained")
                return pd.Series()
            
            # Prepare features
            X = self.prepare_features(df)
            
            # Drop rows with NaN values
            valid_idx = ~X.isna().any(axis=1)
            X = X[valid_idx]
            
            if X.empty:
                logger.warning("No valid data for prediction")
                return pd.Series()
            
            # Make predictions
            predictions = self.model.predict(X)
            
            # Create Series with predictions
            pred_series = pd.Series(0, index=df.index)
            pred_series[valid_idx] = predictions
            
            return pred_series
        except Exception as e:
            logger.error(f"Error making predictions: {e}")
            return pd.Series()
    
    def predict_proba(self, df):
        """
        Make probability predictions
        
        Args:
            df: DataFrame with OHLCV data and indicators
        
        Returns:
            DataFrame with probability predictions
        """
        try:
            if not self.is_trained:
                logger.warning("Model is not trained")
                return pd.DataFrame()
            
            # Prepare features
            X = self.prepare_features(df)
            
            # Drop rows with NaN values
            valid_idx = ~X.isna().any(axis=1)
            X = X[valid_idx]
            
            if X.empty:
                logger.warning("No valid data for prediction")
                return pd.DataFrame()
            
            # Make probability predictions
            proba = self.model.predict_proba(X)
            
            # Create DataFrame with probability predictions
            proba_df = pd.DataFrame(0, index=df.index, columns=self.model.classes_)
            proba_df.loc[valid_idx, :] = proba
            
            return proba_df
        except Exception as e:
            logger.error(f"Error making probability predictions: {e}")
            return pd.DataFrame() 