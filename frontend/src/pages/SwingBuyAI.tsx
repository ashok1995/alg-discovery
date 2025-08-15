import React, { useState } from 'react';
import { Container, Typography, Alert } from '@mui/material';
import UnifiedRecommendationTable from '../components/UnifiedRecommendationTable';
import { RecommendationType } from '../services/unifiedRecommendationService';

const SwingBuyAI: React.FC = () => {
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const handleRecommendationClick = (recommendation: any) => {
    console.log('Swing Buy AI recommendation clicked:', recommendation);
    // Handle recommendation click - could open detailed view, chart, etc.
  };

  const handleRefresh = (recommendations: any[]) => {
    console.log('Swing Buy AI recommendations refreshed:', recommendations.length);
    setNotification({
      message: `Refreshed ${recommendations.length} Swing Buy AI recommendations`,
      type: 'success'
    });
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Swing Buy AI Recommendations
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        AI-powered swing trading recommendations with real-time Zerodha price integration, 
        technical indicators, and advanced analytics.
      </Typography>

      {/* Notifications */}
      {notification && (
        <Alert 
          severity={notification.type} 
          sx={{ mb: 2 }}
          onClose={() => setNotification(null)}
        >
          {notification.message}
        </Alert>
      )}

      {/* Unified Recommendation Table */}
      <UnifiedRecommendationTable
        recommendationType={RecommendationType.SWING_AI}
        title="Swing Buy AI Recommendations"
        description="AI-powered swing trading recommendations with real-time market data"
        autoRefresh={true}
        refreshInterval={30}
        showRealTimePrices={true}
        showTechnicalIndicators={true}
        showAlerts={true}
        maxRecommendations={50}
        minScore={10}
        onRecommendationClick={handleRecommendationClick}
        onRefresh={handleRefresh}
      />
    </Container>
  );
};

export default SwingBuyAI; 