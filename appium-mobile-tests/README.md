# 📱 Aero-Navigator Appium Mobile E2E Testing Suite (Node.js)

This repository contains the complete End-to-End (E2E) automated testing suite for the **Aero-Navigator Android Mobile Application** (`com.simats.aero_navigator`), written in Node.js using WebdriverIO / Appium and ExcelJS report generation.

---

## 📊 Mobile Features & Test Coverage

The test suite covers **24 E2E Test Cases** across **8 Mobile Application Screens**:

1. **Mobile Authentication & Registration**: Registration form, login validation, session storage, error prompt rendering.
2. **Mobile Dashboard Navigation**: Active screen state, 5 feature grid cards (Search, Tracking, Predict, Optimizer, GPS), floating AI Copilot trigger.
3. **Flight Search & Live Tracking Screen**: City route search (`Chennai` -> `London`), flight telemetry cards, live radar map polyline layer.
4. **AI Price Forecasting Screen**: AI trend forecasting (`Chennai` -> `Sydney`), 7-day trajectory line chart, custom price threshold alert registration.
5. **Route Layover Optimizer Screen**: Multi-leg layover route options (`Chennai` -> `Colombia`), efficiency scores, recommendation tags (Best Value, Budget Pick, Cheapest).
6. **Emergency GPS Sharing Screen**: GPS location permission & broadcast toggle, encrypted tracking link payload, clipboard copy action.
7. **AI Copilot Chat Interface**: Mobile chat conversation screen, NLP query sending, interactive route action buttons in chat.
8. **User Profile & Admin Hub**: Profile activity metrics, Admin Hub audit trail stream, mobile logout session cleanup.

---

## 📈 Excel Analysis Report Generation

After test execution, a multi-sheet, color-coded Excel report is generated at:
`reports/Appium_Mobile_E2E_Test_Report.xlsx`

### Workbook Structure:
- **Sheet 1: Executive Summary**: Total tests, passed, failed, pass rate %, execution timestamp, total duration, and styled KPI header cards.
- **Sheet 2: Detailed Test Results**: Complete breakdown of each test step, expected vs actual results, execution time in ms, status (PASS in green, FAIL in red), and error trace logs.
- **Sheet 3: Module Analytics**: Aggregate pass/fail statistics and success rates for each mobile screen module.

---

## 🚀 How to Run

### Command Line:
```bash
cd appium-mobile-tests
npm install
npm test
```

### Windows One-Click Execution:
Double-click `run_appium_tests.bat`.
