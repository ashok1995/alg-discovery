type ChipColor = 'success' | 'error' | 'warning' | 'default' | 'info' | 'primary' | 'secondary';

export function getMarketCapColor(category?: string): ChipColor {
  switch (category) {
    case 'large_cap':
      return 'success';
    case 'mid_cap':
      return 'warning';
    case 'small_cap':
      return 'info';
    case 'micro_cap':
      return 'default';
    default:
      return 'default';
  }
}

export function getInstrumentTypeColor(type: string): ChipColor {
  switch (type) {
    case 'EQ':
      return 'primary';
    case 'IND':
      return 'secondary';
    case 'FUT':
      return 'warning';
    case 'OPT':
      return 'error';
    case 'ETF':
      return 'info';
    default:
      return 'default';
  }
}
