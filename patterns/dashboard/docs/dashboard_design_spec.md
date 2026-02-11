# Market Dashboard Design Specification

## 1. Overall Dashboard Structure 

┌─────────────────────────────────────────────────────────────────────────┐
│ 📊 METRICS BAR (key indices, market status, time)                        │
├─────────────────────────────────────────────────────────────────────────┤
│ 🏛️ DASHBOARD HEADER & MARKET STATUS                                     │
├─────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────┐ ┌─────────────────────────────────┐ │
│ │ TRADING DAY SUMMARY             │ │                                 │ │
│ │ Advances/Declines, Volume, etc. │ │                                 │ │
│ └─────────────────────────────────┘ └─────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────┤
│ ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────────┐   │
│ │                   │ │                   │ │                        │   │
│ │ MARKET OVERVIEW   │ │  MARKET MOVERS    │ │    MARKET NEWS        │   │
│ │ - Index trends    │ │  - Top gainers    │ │    - Latest news      │   │
│ │ - Support/resist  │ │  - Top losers     │ │    - Economic events  │   │
│ │ - Market breadth  │ │  - Most active    │ │    - Announcements    │   │
│ │                   │ │                   │ │                        │   │
│ └───────────────────┘ └───────────────────┘ └───────────────────────┘   │
│                                                                         │
│ ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────────┐   │
│ │                   │ │                   │ │                        │   │
│ │   EQUITY CURVE    │ │  GLOBAL MARKETS   │ │    ACTIVE TRADES      │   │
│ │  - Performance    │ │  - US indices     │ │    - Current positions│   │
│ │  - P&L tracking   │ │  - Asian markets  │ │    - Entry/exit points│   │
│ │  - Risk metrics   │ │  - European mkts  │ │    - P&L status       │   │
│ │                   │ │                   │ │                        │   │
│ └───────────────────┘ └───────────────────┘ └───────────────────────┘   │
│                                                                         │
│ ┌───────────────────────────────────────────────────────────────────┐   │
│ │ SECTOR PERFORMANCE HEATMAP                                         │   │
│ │ - Visual representation of sector performance                      │   │
│ └───────────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────────┤
│ MARKET OPPORTUNITIES & WATCHLIST                                         │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│ │ STOCK 1  │ │ STOCK 2  │ │ STOCK 3  │ │ STOCK 4  │ │ STOCK 5  │ ➡️    │
│ │ Setup    │ │ Setup    │ │ Setup    │ │ Setup    │ │ Setup    │       │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└─────────────────────────────────────────────────────────────────────────┘ 

## 2. Color Scheme & Visual Design

### 2.1 Primary Color Palette
- Background: Dark blue-gray (#1e293b)
- Cards/Containers: Slightly lighter blue-gray (#334155)
- Accents: 
  - Positive: Teal (#10b981)
  - Negative: Red (#ef4444)
  - Neutral: Light gray (#94a3b8)
  - Highlight: Light blue (#3b82f6)

### 2.2 Typography
- Font Family: Inter, Roboto, or system sans-serif
- Headings: 
  - Section Titles: 18px, semi-bold (#ffffff)
  - Card Titles: 16px, medium (#ffffff)
- Body Text: 
  - Primary: 14px (#e2e8f0)
  - Secondary: 13px (#94a3b8)
- Metrics:
  - Values: 16-18px, semi-bold (#ffffff) 
  - Labels: 12px (#94a3b8)

### 2.3 Component Styling
- Cards/Containers:
  - Background: rgba(51, 65, 85, 0.8)
  - Border Radius: 10px
  - Padding: 15px
  - Margin-bottom: 15px
  - Box Shadow: subtle 1px shadow with 5% opacity

- Charts:
  - Background: rgba(51, 65, 85, 0.4)
  - Grid Lines: rgba(148, 163, 184, 0.15)
  - Axis Labels: #94a3b8
  - Tooltips: Dark (#0f172a) with white text

## 3. Component Specifications

### 3.1 Quick Metrics Bar

┌─────────────────────────────────────────────────────────────────────────┐
│ NIFTY 50       SENSEX         BANK NIFTY      USD/INR       MARKET      │
│ 19,425.35      65,214.50      44,123.70       83.25         16 Apr 2025 │
│ +0.75%         +0.62%         -0.18%          +0.12%        17:08 IST   │
└─────────────────────────────────────────────────────────────────────────┘

**Styling:**
- Background: rgba(30, 41, 59, 0.8)
- Border Radius: 10px
- Metrics displayed in a horizontal row
- Values in larger font (18px)
- Changes in color-coded smaller font (14px)
- Positive changes in green, negative in red
- Market status indicator: color-coded pill (bullish/bearish/neutral)

### 3.2 Dashboard Header

```
┌─────────────────────────────────────────────────────────────────────┐
│ Market Dashboard                          ● Market Open • 2h:45m    │
│ Real-time market insights and trading opportunities                 │
└─────────────────────────────────────────────────────────────────────┘
```

**Styling:**
- Compact design with dashboard title on left, market status on right
- Title: 24px, bold, white
- Subtitle: 14px, light gray
- Market status: Compact pill with status indicator
- Status dot: Green when open, red when closed
- Countdown timer to open/close

### 3.3 Trading Day Summary

```
┌─────────────────────────────────────────────────────────────────────┐
│ 📊 Trading Day Summary                                 16 Apr 2025  │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────┐ │
│ │ Adv     │ │ Dec     │ │ Unch    │ │ Volume  │ │ Vol/Avg │ │ MB  │ │
│ │ 1,238   │ │ 762     │ │ 127     │ │ 95,432  │ │ +21.5%  │ │ 0.62│ │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────┘ │
│ [███████████████████████████████▒▒▒▒▒▒▒▒▒▒▒▒▒▒] 62.1%     37.9%    │
│ 52-week Highs: 45                          52-week Lows: 12        │
└─────────────────────────────────────────────────────────────────────┘
```

**Styling:**
- Background: rgba(30, 41, 59, 0.8)
- Metrics in a grid layout
- Each metric in its own mini-card
- Advance/decline bar: Horizontal progress bar
- Green portion for advances, red for declines
- 52-week stats in smaller type below the bar

### 3.4 Market Overview

```
┌─────────────────────────────────────────────┐
│ Market Overview                             │
│ ┌─────────────────────────────────────────┐ │
│ │                                         │ │
│ │              [CHART AREA]               │ │
│ │                                         │ │
│ └─────────────────────────────────────────┘ │
│ NIFTY 50                                    │
│ Support: 19,150  |  Resistance: 19,650      │
│ ┌───────────┐ ┌───────────┐ ┌───────────┐   │
│ │ Trend     │ │ Vol       │ │ RSI       │   │
│ │ SIDEWAYS  │ │ MEDIUM    │ │ NEUTRAL   │   │
│ └───────────┘ └───────────┘ └───────────┘   │
└─────────────────────────────────────────────┘
```

**Styling:**
- Main chart: Candlestick or line chart showing index
- Support/resistance levels marked
- Key indicators below in pill format
- Color-coded based on indicator values
- Interactive chart with zoom/pan capability

### 3.5 Market Movers

```
┌───────────────────────────────────────┐
│ Market Movers                         │
│                                       │
│ Top Gainers                           │
│ ┌────────┐┌────────┐┌────────┐        │
│ │STOCK A ││STOCK B ││STOCK C │        │
│ │+5.75%  ││+4.23%  ││+3.98%  │        │
│ └────────┘└────────┘└────────┘        │
│                                       │
│ Top Losers                            │
│ ┌────────┐┌────────┐┌────────┐        │
│ │STOCK X ││STOCK Y ││STOCK Z │        │
│ │-4.32%  ││-3.87%  ││-3.45%  │        │
│ └────────┘└────────┘└────────┘        │
│                                       │
│ Most Active                           │
│ ┌────────┐┌────────┐┌────────┐        │
│ │STOCK M ││STOCK N ││STOCK O │        │
│ │₹2,432Cr││₹1,876Cr││₹1,543Cr│        │
│ └────────┘└────────┘└────────┘        │
└───────────────────────────────────────┘
```

**Styling:**
- Three sections: Gainers, Losers, Most Active
- Each stock in a compact card
- Stock name and change percentage/volume
- Color-coded: Green for gainers, red for losers
- Volume in crores for most active
- Hover effect to show more details

### 3.6 Global Markets

```
┌───────────────────────────────────────┐
│ Global Markets                        │
│                                       │
│ ┌────────────┐ ┌────────────────────┐ │
│ │ S&P 500    │ │ 5,123.45  +0.85%   │ │
│ └────────────┘ └────────────────────┘ │
│                                       │
│ ┌────────────┐ ┌────────────────────┐ │
│ │ Nasdaq     │ │ 16,789.32 +1.25%   │ │
│ └────────────┘ └────────────────────┘ │
│                                       │
│ ┌────────────┐ ┌────────────────────┐ │
│ │ Dow Jones  │ │ 38,456.78 +0.45%   │ │
│ └────────────┘ └────────────────────┘ │
│                                       │
│ ┌────────────┐ ┌────────────────────┐ │
│ │ FTSE 100   │ │ 7,845.21  -0.32%   │ │
│ └────────────┘ └────────────────────┘ │
│                                       │
│ ┌────────────┐ ┌────────────────────┐ │
│ │ Nikkei 225 │ │ 36,789.56 +1.75%   │ │
│ └────────────┘ └────────────────────┘ │
└───────────────────────────────────────┘
```

**Styling:**
- List of global indices with current values
- Each index in a row with name and value/change
- Color-coded changes
- Subtle dividers between indices
- Grouped by region (optional)

### 3.7 Market News

```
┌───────────────────────────────────────┐
│ Market News                           │
│                                       │
│ ┌───────────────────────────────────┐ │
│ │ RBI Keeps Repo Rate Unchanged     │ │
│ │ Economic Times • 2 hours ago      │ │
│ │                                   │ │
│ │ The Reserve Bank of India's MPC   │ │
│ │ has decided to keep the repo rate │ │
│ │ unchanged at 6.5% for the...      │ │
│ └───────────────────────────────────┘ │
│                                       │
│ ┌───────────────────────────────────┐ │
│ │ Infosys Reports 7.1% Rise in Q2   │ │
│ │ CNBC-TV18 • 5 hours ago           │ │
│ │                                   │ │
│ │ IT major Infosys reported a 7.1%  │ │
│ │ year-on-year increase in net...   │ │
│ └───────────────────────────────────┘ │
│                                       │
│ ┌───────────────────────────────────┐ │
│ │ GST Collections Hit ₹1.72 Lakh Cr │ │
│ │ Financial Express • Yesterday     │ │
│ │                                   │ │
│ │ GST collections for September     │ │
│ │ 2023 reached ₹1.72 lakh crore... │ │
│ └───────────────────────────────────┘ │
└───────────────────────────────────────┘
```

**Styling:**
- Card-based news items
- Title in bold
- Source and time in smaller, lighter text
- Brief summary text
- Dividers or spacing between items
- Click to expand or open source

## 4. Responsiveness Guidelines

### 4.1 Desktop (>1200px)
- Full 3-column layout as described above
- All components visible
- Trading day summary in 2-column layout

### 4.2 Tablet (768px-1199px)
- Maintain 3-column layout but with narrower columns
- Reduce padding and margins
- Stack some components if needed

### 4.3 Mobile (<767px)
- Switch to single column layout
- Stack all components vertically
- Reduce metrics bar to essential information
- Use abbreviated labels where possible
- Allow horizontal scrolling for watchlist cards

## 5. Interaction & Animation Guidelines

### 5.1 Charts
- Hover tooltips with detailed information
- Click to expand/collapse detailed view
- Smooth transitions for data updates

### 5.2 Cards & Containers
- Subtle hover effect (slight brightness increase)
- Smooth height transitions for expandable sections

### 5.3 Data Refreshes
- Visual indicator during data refresh
- Subtle fade transitions for value changes
- Highlight changed values briefly

## 6. Implementation Phases

### Phase 1: Core Layout & Structure
- Implement basic dashboard grid
- Set up responsive containers
- Add placeholder content

### Phase 2: Data Integration & Components
- Implement metrics bar with real data
- Add market overview and movers
- Integrate news feed

### Phase 3: Charts & Technical Elements
- Add interactive charts
- Implement sector heatmap
- Add trading opportunities

### Phase 4: Polish & Performance
- Optimize loading performance
- Add animations and transitions
- Final styling adjustments

## 7. Component Files Reference

**Main Application Files:**
- `dashboard/app.py` - Main entry point for the dashboard application
- `dashboard/home.py` - Home page implementation

**Component Files:**
- `dashboard/components/quick_metrics_bar.py` - Top metrics display
- `dashboard/components/dashboard_header.py` - Dashboard header with status
- `dashboard/components/trading_day_summary.py` - Trading day metrics summary
- `dashboard/components/market_indices.py` - Main market indices display
- `dashboard/components/global_markets.py` - Global markets component

**Utility Files:**
- `dashboard/utils/market_utils.py` - Market-related helper functions
- `dashboard/utils/news_utils.py` - News fetching and rendering

**Styling:**
- `dashboard/styles/dashboard.css` - Main CSS for dashboard styling

Would you like me to elaborate on any specific aspect of this design, or would you prefer to start implementing certain components? 