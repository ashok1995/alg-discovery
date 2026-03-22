export interface InvestmentOpportunity {
  symbol: string;
  companyName: string;
  name: string;
  sector: string;
  marketCap: number;
  peRatio: number;
  pbRatio: number;
  dividendYield: number;
  roe: number;
  debt_to_equity: number;
  currentRatio: number;
  price: number;
  targetPrice: number;
  analystRating: string;
  investmentScore: number;
  fundamentalScore: number;
  growthScore: number;
  valueScore: number;
  qualityScore: number;
  riskScore: number;
  recommendation: string;
  investmentHorizon: string;
  allocation_percentage: number;
}

export interface PortfolioAllocation {
  category: string;
  percentage: number;
  color: string;
  description: string;
  /** When set, show this amount (e.g. from Seed) instead of deriving from percentage. */
  amount?: number;
}
