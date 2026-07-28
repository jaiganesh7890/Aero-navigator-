@echo off
title Aero-Navigator Appium Mobile E2E Test Suite
echo ========================================================================
echo  📱  Aero-Navigator Appium Mobile E2E Test Suite & Excel Analysis
echo ========================================================================
cd /d "%~dp0"

echo Installing npm dependencies...
call npm install --no-audit

echo Running Appium Mobile E2E Test Suite...
node runner.js

pause
