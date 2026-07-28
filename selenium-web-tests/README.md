# ✈️ Aero-Navigator Selenium Web E2E Testing Suite

This repository contains the complete End-to-End (E2E) automated testing suite for the **Aero-Navigator Web Application**, written in Node.js with Selenium and ExcelJS report generation.

---

## 📊 Features & Test Coverage

The test suite covers **31 E2E Test Cases** across **9 Application Modules**:

1. **Email Authentication Modal**: Sign-in modal trigger, email validation, session persistence, modal dismissal.
2. **Dashboard & Sidebar Navigation**: Tab active states, hero metrics, call-to-action button routing.
3. **Live Flight Status & AI Insights**: Flight route search, Leaflet interactive map, AI Weather forecast, AI Airline Sentiment analysis.
4. **AI Price Prediction & Chart**: Multi-layered neural price forecasting, 7-Day Chart canvas initialization, custom threshold price alerts.
5. **Multi-Leg Route Optimizer**: Layover route analysis, cost-benefit scoring, recommendation tags (Best Value, Budget Pick, Cheapest).
6. **Emergency GPS Broadcast**: Live coordinate packing, encryption broadcast toggle, link payload generation, copy payload action.
7. **Daily Activity & Admin Hub**: Demand trend statistics, top routes analytics, AI customer topics, live audit log stream, CSV export, SQLite maintenance.
8. **Settings & Configuration Control**: User profile context, AI sensitivity engine vector, data sync frequency clock selection.
9. **AI Chatbot Floating Assistant**: Floating widget open/close toggle, NLP conversational search, flight quote card injection.

---

## 📈 Excel Analysis Report Generation

After test execution, a multi-sheet, color-coded Excel report is generated at:
`reports/Selenium_Web_E2E_Test_Report.xlsx`

### Workbook Structure:
- **Sheet 1: Executive Summary**: Total tests, passed, failed, pass rate %, execution timestamp, total duration, and styled KPI header cards.
- **Sheet 2: Detailed Test Results**: Complete breakdown of each test step, expected vs actual results, execution time in ms, status (PASS in green, FAIL in red), and error trace logs.
- **Sheet 3: Module Analytics**: Aggregate pass/fail statistics and success rates for each web module.

---

## 🚀 How to Run

### Command Line:
```bash
cd selenium-web-tests
npm install
npm test
```

### Windows One-Click Execution:
Double-click `run_selenium_web_tests.bat`.
