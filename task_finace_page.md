# 📈 Stock Market Analysis App — Task Specification

## Project Overview

A Vietnamese stock market analysis application with 2 main pages, helping investors make data-driven decisions based on technical and fundamental analysis. Data is sourced from the **vnstock** library.

---

## 🛠 Suggested Tech Stack

- **Frontend:** React + TypeScript
- **Charting:** Recharts or ApexCharts (good candlestick support)
- **Data:** vnstock (Python backend) or direct API calls
- **Styling:** Tailwind CSS

---

## Page 1: Price Technical Analysis (`/price-analysis`)

### Input Data
- Stock ticker symbol
- Time range (1M / 3M / 6M / 1Y / 3Y)
- OHLCV: Open, High, Low, Close, Volume

### Components to Build

#### 1.1 Header & Input
- [ ] Stock ticker search input (autocomplete)
- [ ] Time range selector: 1M / 3M / 6M / 1Y / 3Y
- [ ] Quick info cards: Current price, % change, Today's volume

#### 1.2 Candlestick Chart — MAIN CHART
- [ ] Interactive candlestick chart (zoom, pan)
- [ ] Toggleable overlays:
  - MA20, MA50, MA200 (Simple Moving Average)
  - EMA20
  - Bollinger Bands (20, 2)
- [ ] Crosshair tooltip displaying OHLCV on hover
- [ ] Buy/sell signal markers on the chart (arrows)

#### 1.3 Volume Panel (below candlestick)
- [ ] Volume bar chart: green (bullish candle) / red (bearish candle)
- [ ] Volume Moving Average (20-period) overlay

#### 1.4 Indicators Panel (separate collapsible panels)
- [ ] **RSI (14):** Line chart + overbought (70) / oversold (30) zones
- [ ] **MACD (12,26,9):** MACD line + Signal line + Histogram
- [ ] **Stochastic Oscillator (14,3,3):** %K and %D lines
- [ ] **ATR (14):** Average True Range — measures volatility
- [ ] **ADX (14):** Average Directional Index — measures trend strength

#### 1.5 Technical Signal Summary Table
- [ ] Summary table of signals from all indicators: **BUY / NEUTRAL / SELL**
- [ ] Aggregate sentiment gauge (overall score meter)

---

## Page 2: Company Fundamental Analysis (`/fundamental-analysis`)

### Input Data (from vnstock)
- `income`: Income statement
- `cashflow`: Cash flow statement
- `balance`: Balance sheet
- `ratio`: Financial ratios

### Components to Build

#### 2.1 Header & Input
- [ ] Stock ticker search input
- [ ] Toggle: Quarterly / Annual
- [ ] Overall scorecard: Financial health rating A/B/C/D
- [ ] **Comparison mode toggle:** Enable/disable period comparison overlay

#### 2.1b Period Comparison Controls
- [ ] **QoQ toggle button** in the page header — "Compare vs Last Quarter"
- [ ] When QoQ mode is ON, all charts and metric cards update simultaneously to reflect the delta vs the immediately preceding quarter

#### 2.2 Income Statement Group
- [ ] **Grouped Bar Chart** — Net Revenue & Net Income by quarter
  - X-axis: quarters (e.g. Q1 2024, Q2 2024…), Y-axis: currency (billions VND)
  - **QoQ mode:** Each bar group shows current quarter + prior quarter side-by-side, with highlighted border on the current bar
  - Tooltip: absolute value + `▲ +8.2% QoQ` / `▼ -3.1% QoQ` with ▲▼ arrows
- [ ] **Line Chart** — Profit margins (%) over quarters
  - Gross Margin, EBIT Margin, Net Profit Margin
  - **QoQ mode:** % change badge annotation at the latest data point on each line
- [ ] **QoQ Metric Cards Row** — Revenue, Gross Profit, Net Income, each card showing:
  - Current quarter value
  - `▲ +12.4% vs last quarter` delta badge (green/red)

#### 2.3 Balance Sheet Group
- [ ] **Donut Chart** — Asset composition at the most recent quarter
  - Current Assets vs Non-current Assets
  - **QoQ mode:** Two donuts side-by-side (this quarter vs last quarter), labeled clearly
- [ ] **Stacked Bar Chart** — Capital structure over quarters
  - Equity (green) vs Total Liabilities (red)
  - **QoQ mode:** Highlight the two most recent bars with a distinct border
- [ ] **Line Chart** — Debt-to-Equity (D/E) Ratio over quarters
- [ ] **QoQ Delta badges** on metric cards: Total Assets, Total Equity, Total Debt

#### 2.4 Cash Flow Group
- [ ] **Waterfall Chart** — Three cash flow activities for the most recent quarter
  - CFO (Operating), CFI (Investing), CFF (Financing), Net Cash Change
  - **QoQ mode:** Side-by-side grouped bars replacing the waterfall (current vs prior quarter per activity)
- [ ] **Line Chart** — Free Cash Flow = CFO - CAPEX over quarters
- [ ] **QoQ Comparison Table** — CFO / CFI / CFF: columns for This Quarter | Last Quarter | Δ | Δ%

#### 2.5 Ratio Group (Valuation & Efficiency)
- [ ] **Radar / Spider Chart** — Multi-dimensional snapshot vs industry average
  - P/E, P/B, ROE, ROA, Current Ratio, Debt/Equity
  - **QoQ mode:** Second polygon for last quarter overlaid on the same radar
- [ ] **Grouped Bar Chart** — ROE & ROA: side-by-side bars for current vs prior quarter
- [ ] **Line Chart** — EPS growth over quarters
- [ ] **Quick Metrics Table** — P/E, P/B, EV/EBITDA, Current Ratio, Quick Ratio
  - Columns: Metric | This Quarter | Last Quarter | Δ | Δ% | Trend icon ▲▼

#### 2.6 QoQ Comparison Summary Table (dedicated section)
- [ ] Full table of ALL key metrics: **This Quarter vs Last Quarter**
- [ ] Columns: Metric | This Quarter | Last Quarter | Absolute Δ | % Δ | Trend icon ▲▼
- [ ] Color coding: green (improvement) / red (deterioration) / gray (≤1% change)
- [ ] Exportable as CSV

---

## 📁 Suggested Folder Structure

```
src/
├── pages/
│   ├── PriceAnalysis/
│   │   ├── index.tsx
│   │   ├── CandlestickChart.tsx
│   │   ├── VolumePanel.tsx
│   │   ├── IndicatorPanel.tsx        # RSI, MACD, Stochastic, ATR, ADX
│   │   └── SignalSummaryTable.tsx
│   └── FundamentalAnalysis/
│       ├── index.tsx
│       ├── IncomeSection.tsx          # Revenue/Profit bar + Margin line
│       ├── BalanceSection.tsx         # Donut + Stacked bar + D/E line
│       ├── CashflowSection.tsx        # Waterfall + FCF line
│       └── RatioSection.tsx           # Radar + ROE/ROA bar + EPS line
├── components/
│   ├── StockSearch.tsx
│   ├── TimeRangeSelector.tsx
│   ├── MetricCard.tsx
│   └── ScoreCard.tsx
├── hooks/
│   ├── useStockPrice.ts               # Fetch OHLCV data
│   ├── useFinancials.ts               # Fetch income/cashflow/balance/ratio
│   └── useTechnicalIndicators.ts      # Compute MA, RSI, MACD, etc.
├── utils/
│   ├── indicators.ts                  # Technical indicator calculation logic
│   └── formatters.ts                  # Number, currency, % formatters
└── api/
    └── vnstock.ts                     # vnstock API wrapper
```

---

## 🔢 Build Priority Order

| Priority | Task | Page |
|----------|------|------|
| P0 | Project setup, routing, shared layout | - |
| P0 | vnstock API wrapper (price + financials) | - |
| P1 | Basic candlestick chart + Volume panel | Page 1 |
| P1 | MA overlays + Bollinger Bands | Page 1 |
| P1 | Revenue/Profit bar + Margin line chart | Page 2 |
| P2 | RSI + MACD panels | Page 1 |
| P2 | Balance sheet charts (Donut + Stacked) | Page 2 |
| P2 | Cashflow Waterfall chart | Page 2 |
| P3 | Signal Summary Table | Page 1 |
| P3 | Radar chart + Scorecard | Page 2 |
| P3 | Stochastic + ATR + ADX panels | Page 1 |
| P3 | QoQ toggle + side-by-side grouped bars on all chart groups | Page 2 |
| P3 | % delta badges on all metric cards | Page 2 |
| P3 | QoQ Comparison Summary Table + CSV export | Page 2 |

---

## 📌 Technical Notes

- All charts must be **responsive** (mobile-friendly)
- Support **dark mode**
- Loading skeletons while fetching data
- Handle **missing data** gracefully (newly listed companies, insufficient history)
- Technical indicators computed **client-side** using a library like `technicalindicators` (npm)
