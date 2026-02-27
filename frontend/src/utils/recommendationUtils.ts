import type { DynamicRecommendationItem } from '../types/apiModels';

export interface RecommendationMetricsData {
  totalCount: number;
  avgScore: number;
  riskBreakdown: Record<string, number>;
  strategy: string;
}

/** Returns hex color for score (0-100) */
export function getScoreColor(score: number): string {
  if (score >= 80) return '#2e7d32';
  if (score >= 70) return '#4caf50';
  if (score >= 60) return '#8bc34a';
  if (score >= 50) return '#ff9800';
  return '#f44336';
}

export function applyRiskBasedFiltering(
  items: DynamicRecommendationItem[],
  _risk: 'low' | 'medium' | 'high',
  maxResults: number
): DynamicRecommendationItem[] {
  return items.slice(0, maxResults);
}

export function computeRecommendationMetrics(
  items: DynamicRecommendationItem[],
  strategy: string
): RecommendationMetricsData {
  const riskBreakdown: Record<string, number> = {};
  let totalScore = 0;
  for (const item of items) {
    const r = item.risk_level || 'medium';
    riskBreakdown[r] = (riskBreakdown[r] || 0) + 1;
    totalScore += item.score ?? 0;
  }
  return {
    totalCount: items.length,
    avgScore: items.length > 0 ? totalScore / items.length : 0,
    riskBreakdown,
    strategy
  };
}
