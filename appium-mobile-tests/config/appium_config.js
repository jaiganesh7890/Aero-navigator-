const path = require('path');
const fs = require('fs');

const BASE_DIR = path.dirname(__dirname);
const REPORTS_DIR = path.join(BASE_DIR, 'reports');
const SCREENSHOTS_DIR = path.join(REPORTS_DIR, 'screenshots');

if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

module.exports = {
    APPIUM_HOST: process.env.APPIUM_HOST || '127.0.0.1',
    APPIUM_PORT: parseInt(process.env.APPIUM_PORT || '4723'),
    REPORTS_DIR,
    SCREENSHOTS_DIR,
    EXCEL_REPORT_PATH: path.join(REPORTS_DIR, 'Appium_Mobile_E2E_Test_Report.xlsx'),
    
    ANDROID_CAPABILITIES: {
        platformName: 'Android',
        'appium:automationName': 'UiAutomator2',
        'appium:deviceName': process.env.ANDROID_DEVICE_NAME || 'Android Emulator',
        'appium:udid': process.env.ANDROID_UDID || 'emulator-5554',
        'appium:appPackage': 'com.simats.aero_navigator',
        'appium:appActivity': '.MainActivity',
        'appium:noReset': false,
        'appium:grantPermissions': true,
        'appium:newCommandTimeout': 300
    },

    MOBILE_MODULES: [
        "Mobile Authentication & Registration",
        "Mobile Dashboard Navigation",
        "Flight Search & Live Tracking Screen",
        "AI Price Forecasting Screen",
        "Route Layover Optimizer Screen",
        "Emergency GPS Sharing Screen",
        "AI Copilot Chat Interface",
        "User Profile & Admin Hub"
    ]
};
