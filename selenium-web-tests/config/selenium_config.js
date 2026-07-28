const path = require('path');
const fs = require('fs');

const BASE_DIR = path.dirname(__dirname);
const REPORTS_DIR = path.join(BASE_DIR, 'reports');
const SCREENSHOTS_DIR = path.join(REPORTS_DIR, 'screenshots');

if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

module.exports = {
    BASE_URL: process.env.BASE_URL || 'http://localhost:3000',
    BROWSER: process.env.BROWSER || 'chrome',
    HEADLESS: process.env.HEADLESS !== 'false',
    DEFAULT_TIMEOUT: 15000,
    PAGE_LOAD_TIMEOUT: 20000,
    REPORTS_DIR,
    SCREENSHOTS_DIR,
    EXCEL_REPORT_PATH: path.join(REPORTS_DIR, 'Selenium_Web_E2E_Test_Report.xlsx'),
    WEB_APP_PATH: path.join(path.dirname(BASE_DIR), 'aero-navigator-web'),
    
    MODULES: [
        "Email Authentication Modal",
        "Dashboard & Sidebar Navigation",
        "Live Flight Status & AI Insights",
        "AI Price Prediction & Chart",
        "Multi-Leg Route Optimizer",
        "Emergency GPS Broadcast",
        "Daily Activity & Admin Hub",
        "Settings & Configuration Control",
        "AI Chatbot Floating Assistant"
    ]
};
