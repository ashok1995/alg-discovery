import pandas as pd
import numpy as np

class VolumeSpikeStrategy:
    def __init__(self, volume_threshold_multiplier=2.0, lookback_period=20):
        self.name = "Volume Spike Strategy"
        self.description = "Detects abnormal volume movements and analyzes subsequent price action"
        self.parameters = {
            'volume_threshold_multiplier': volume_threshold_multiplier,
            'lookback_period': lookback_period
        }

    def generate_signals(self, data):
        """Generate trading signals based on volume spikes"""
        df = data.copy()
        
        df['avg_volume'] = df['volume'].rolling(window=self.parameters['lookback_period']).mean()
        df['volume_spike'] = df['volume'] > (df['avg_volume'] * self.parameters['volume_threshold_multiplier'])
        df['signal'] = df['volume_spike'].astype(int)
        
        return df 