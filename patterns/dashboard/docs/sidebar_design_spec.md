# Sidebar Design Specification

## 1. Overall Sidebar Structure

```
┌─────────────────────────────────┐
│ 📊 Market Analyzer               │
├─────────────────────────────────┤
│                                 │
│ 🏠 Dashboard                     │
│ 📈 Trading & Analysis            │
│ 📉 Backtesting                   │
│ 🔍 Stock Screener                │
│ 📰 News & Events                 │
│ ⚙️ Settings                      │
│                                 │
├─────────────────────────────────┤
│ 🟢 Market Open                   │
│ Market closes in 2h:45m         │
├─────────────────────────────────┤
│ Market Condition                │
├─────────────────────────────────┤
│                                 │
│ Trend      ┌──────────────────┐ │
│            │    NEUTRAL       │ │
│            └──────────────────┘ │
│                                 │
│ Volatility ┌──────────────────┐ │
│            │      LOW         │ │
│            └──────────────────┘ │
│                                 │
│ Momentum   ┌──────────────────┐ │
│            │     POSITIVE     │ │
│            └──────────────────┘ │
│                                 │
├─────────────────────────────────┤
│ Quick Filters                   │
├─────────────────────────────────┤
│ ○ All Stocks                    │
│ ○ Watchlist                     │
│ ○ Portfolio                     │
│                                 │
│ [ Apply Filters ]               │
│                                 │
├─────────────────────────────────┤
│ v1.2.3 • Last update: 10:30 AM  │
└─────────────────────────────────┘
```

## 2. Styling Guidelines

### 2.1 Sidebar Container
- Width: 250-300px (responsive)
- Height: 100% of viewport
- Background: Dark blue-gray (#1e293b), slightly darker than main dashboard
- Border-right: 1px solid rgba(255, 255, 255, 0.1)
- Box-shadow: Subtle right shadow to create depth

### 2.2 Typography
- Section Headers:
  - Font-size: 14px
  - Font-weight: 600
  - Color: #94a3b8
  - Text-transform: Uppercase
  - Letter-spacing: 0.5px
  - Padding: 10px 15px
  - Border-bottom: 1px solid rgba(255, 255, 255, 0.1)

- Navigation Items:
  - Font-size: 16px
  - Font-weight: 500
  - Color: #e2e8f0
  - Padding: 12px 15px
  - Border-radius: 6px
  - Margin: 2px 8px

- Status Text:
  - Font-size: 14px
  - Color: #94a3b8

### 2.3 Interactive Elements
- Navigation Item Hover:
  - Background: rgba(255, 255, 255, 0.05)
  - Transition: background 0.2s ease

- Navigation Item Active:
  - Background: rgba(59, 130, 246, 0.1)
  - Color: #3b82f6
  - Border-left: 3px solid #3b82f6

- Buttons:
  - Background: #334155
  - Border-radius: 6px
  - Padding: 8px 12px
  - Color: white
  - Font-weight: 500
  - Hover: Brightness increase by 10%

- Radio Buttons / Checkboxes:
  - Custom styled to match dashboard theme
  - Selected state: #3b82f6

## 3. Component Specifications

### 3.1 Logo and Header
- Logo positioned at top
- App name adjacent to logo
- Fixed position, always visible
- Padding: 16px

### 3.2 Navigation Menu
- Primary navigation for the app
- Icon + text for each item
- Visual indicator for current page
- Hover and active states as defined in styling
- Optional collapse functionality for small screens

### 3.3 Market Status
- Real-time market status (Open/Closed)
- Color indicator: Green for open, Red for closed
- Countdown timer to next market event (open/close)
- Compact design with high visibility

### 3.4 Market Condition
- Quick overview of market conditions
- 3-5 key metrics visualized as status indicators
- Color-coded for quick assessment:
  - Green for positive/bullish
  - Yellow for neutral
  - Red for negative/bearish
- Optional: Mini sparklines or bullet charts

### 3.5 Quick Filters
- Common filters accessible directly from sidebar
- Radio button or toggle style selection
- "Apply" button to activate selection
- Collapsible section for space efficiency

### 3.6 Footer
- Version information
- Last update timestamp
- Optional: User account info or session details

## 4. Responsiveness

### 4.1 Desktop
- Full sidebar as described
- Optional collapse to icon-only view

### 4.2 Tablet
- Collapsible sidebar with toggle button
- When expanded, overlays part of the content
- When collapsed, shows only icons

### 4.3 Mobile
- Hidden by default
- Accessible via hamburger menu
- Slides in from left, overlaying content
- Dismissible by swipe or tap outside

## 5. States and Interactions

### 5.1 Default State
- Expanded on desktop
- Shows all elements as designed

### 5.2 Collapsed State
- Shows only icons and mini-indicators
- Hover expands relevant sections temporarily
- Width reduced to approximately 60px

### 5.3 Interactive Behaviors
- Smooth transitions between states
- Hover effects on interactive elements
- Active page highlighting
- Optional: Subtle animations for status changes

## 6. Implementation Notes

- Sidebar should maintain state across page navigation
- Collapse state should be remembered in user preferences
- Ensure all interactive elements are keyboard accessible
- Consider adding keyboard shortcuts for power users 