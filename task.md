# 📈 Stock Market Analysis App — Task Specification

## Tổng quan dự án

Ứng dụng phân tích thị trường chứng khoán Việt Nam gồm 2 trang chính, hỗ trợ nhà đầu tư đưa ra quyết định dựa trên dữ liệu kỹ thuật và cơ bản. Dữ liệu lấy từ thư viện **vnstock**.

---

## 🛠 Tech Stack gợi ý

- **Frontend:** React + TypeScript
- **Charting:** Recharts hoặc ApexCharts (hỗ trợ candlestick tốt)
- **Data:** vnstock (Python backend) hoặc gọi API trực tiếp
- **Styling:** Tailwind CSS

---

## Trang 1: Phân tích Kỹ thuật Giá (`/price-analysis`)

### Dữ liệu đầu vào
- Mã cổ phiếu (ticker)
- Khoảng thời gian (1M / 3M / 6M / 1Y / 3Y)
- OHLCV: Open, High, Low, Close, Volume

### Components cần xây dựng

#### 1.1 Header & Input
- [ ] Input chọn mã cổ phiếu (search autocomplete)
- [ ] Bộ chọn khoảng thời gian: 1M / 3M / 6M / 1Y / 3Y
- [ ] Thẻ thông tin nhanh: Giá hiện tại, % thay đổi, Volume hôm nay

#### 1.2 Biểu đồ Nến Nhật (Candlestick Chart) — CHÍNH
- [ ] Candlestick chart tương tác (zoom, pan)
- [ ] Overlay toggleable:
  - MA20, MA50, MA200 (Simple Moving Average)
  - EMA20
  - Bollinger Bands (20, 2)
- [ ] Crosshair tooltip hiển thị OHLCV tại điểm hover
- [ ] Đánh dấu tín hiệu mua/bán trên biểu đồ (mũi tên)

#### 1.3 Volume Panel (panel dưới candlestick)
- [ ] Volume bar chart: màu xanh (nến tăng) / đỏ (nến giảm)
- [ ] Volume Moving Average (20 phiên) overlay

#### 1.4 Indicators Panel (các panel riêng, collapsible)
- [ ] **RSI (14):** Line chart + vùng overbought (70) / oversold (30)
- [ ] **MACD (12,26,9):** MACD line + Signal line + Histogram
- [ ] **Stochastic Oscillator (14,3,3):** %K và %D lines
- [ ] **ATR (14):** Average True Range — đo volatility
- [ ] **ADX (14):** Average Directional Index — đo độ mạnh trend

#### 1.5 Bảng Tín hiệu Kỹ thuật (Signal Summary Table)
- [ ] Bảng tổng hợp tín hiệu từ tất cả chỉ báo: **MUA / TRUNG TÍNH / BÁN**
- [ ] Đồng hồ đo tổng hợp (gauge): Tổng điểm sentiment

---

## Trang 2: Phân tích Tài chính Công ty (`/fundamental-analysis`)

### Dữ liệu đầu vào (từ vnstock)
- `income`: Báo cáo kết quả kinh doanh
- `cashflow`: Báo cáo lưu chuyển tiền tệ
- `balance`: Bảng cân đối kế toán
- `ratio`: Các chỉ số tài chính

### Components cần xây dựng

#### 2.1 Header & Input
- [ ] Input chọn mã cổ phiếu
- [ ] Toggle: Quý / Năm
- [ ] Scorecard tổng thể: Xếp hạng sức khỏe tài chính A/B/C/D

#### 2.2 Nhóm Income Statement (Kết quả Kinh doanh)
- [ ] **Grouped Bar Chart** — Doanh thu thuần & Lợi nhuận ròng theo quý/năm
  - Trục X: thời gian, Trục Y: VNĐ (tỷ)
  - Tooltip hiển thị % tăng trưởng YoY
- [ ] **Line Chart** — Các biên lợi nhuận (%) theo thời gian
  - Gross Margin, EBIT Margin, Net Profit Margin
  - Giúp thấy xu hướng hiệu quả kinh doanh

#### 2.3 Nhóm Balance Sheet (Bảng Cân đối Kế toán)
- [ ] **Donut Chart** — Cơ cấu tài sản tại kỳ gần nhất
  - Tài sản ngắn hạn vs Tài sản dài hạn
- [ ] **Stacked Bar Chart** — Cơ cấu nguồn vốn qua các kỳ
  - Vốn chủ sở hữu (xanh) vs Nợ phải trả (đỏ)
- [ ] **Line Chart** — Hệ số nợ D/E Ratio theo thời gian

#### 2.4 Nhóm Cashflow (Lưu chuyển Tiền tệ)
- [ ] **Waterfall Chart** — Dòng tiền 3 hoạt động (kỳ gần nhất)
  - CFO (Hoạt động kinh doanh)
  - CFI (Hoạt động đầu tư)
  - CFF (Hoạt động tài chính)
  - Net Cash Change
- [ ] **Line Chart** — Free Cash Flow = CFO - CAPEX theo thời gian

#### 2.5 Nhóm Ratio (Chỉ số Định giá & Hiệu quả)
- [ ] **Radar / Spider Chart** — So sánh đa chiều với trung bình ngành
  - P/E, P/B, ROE, ROA, Current Ratio, Debt/Equity
- [ ] **Bar Chart** — ROE & ROA theo quý (grouped)
- [ ] **Line Chart** — EPS tăng trưởng qua các kỳ
- [ ] **Bảng chỉ số nhanh** — P/E, P/B, EV/EBITDA, Current Ratio, Quick Ratio

---

## 📁 Cấu trúc thư mục đề xuất

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
│   ├── useStockPrice.ts               # Fetch OHLCV
│   ├── useFinancials.ts               # Fetch income/cashflow/balance/ratio
│   └── useTechnicalIndicators.ts      # Tính toán MA, RSI, MACD, etc.
├── utils/
│   ├── indicators.ts                  # Logic tính chỉ báo kỹ thuật
│   └── formatters.ts                  # Format số, currency, %
└── api/
    └── vnstock.ts                     # Wrapper gọi vnstock API
```

---

## 🔢 Thứ tự ưu tiên xây dựng

| Priority | Task | Trang |
|----------|------|-------|
| P0 | Setup project, routing, layout chung | - |
| P0 | API wrapper vnstock (price + financials) | - |
| P1 | Candlestick chart cơ bản + Volume | Trang 1 |
| P1 | MA overlay + Bollinger Bands | Trang 1 |
| P1 | Revenue/Profit bar + Margin line chart | Trang 2 |
| P2 | RSI + MACD panels | Trang 1 |
| P2 | Balance sheet charts (Donut + Stacked) | Trang 2 |
| P2 | Cashflow Waterfall chart | Trang 2 |
| P3 | Signal Summary Table | Trang 1 |
| P3 | Radar chart + Scorecard | Trang 2 |
| P3 | Stochastic + ATR + ADX | Trang 1 |

---

## 📌 Ghi chú kỹ thuật

- Tất cả biểu đồ cần **responsive** (mobile-friendly)
- Hỗ trợ **dark mode**
- Loading skeleton khi fetch data
- Xử lý trường hợp **thiếu dữ liệu** (công ty mới niêm yết, chưa có đủ lịch sử)
- Chỉ báo kỹ thuật tính **client-side** bằng thư viện như `technicalindicators` (npm)