const ExcelJS = require('exceljs');
const path = require('path');
const config = require('../config/selenium_config');

class SeleniumExcelReporter {
    constructor() {
        this.results = [];
        this.startTime = Date.now();
    }

    addResult(testId, moduleName, testName, stepAction, expectedResult, actualResult, status, durationMs, errorDetails = '') {
        this.results.push({
            testId,
            moduleName,
            testName,
            stepAction,
            expectedResult,
            actualResult,
            status: status.toUpperCase(),
            durationMs,
            timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            errorDetails: errorDetails || 'None'
        });
    }

    async generateReport(outputPath = config.EXCEL_REPORT_PATH) {
        const totalDuration = ((Date.now() - this.startTime) / 1000).toFixed(2);
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Selenium E2E Test Engine';
        workbook.created = new Date();

        const totalTests = this.results.length;
        const passedTests = this.results.filter(r => r.status === 'PASS').length;
        const failedTests = this.results.filter(r => r.status === 'FAIL').length;
        const passRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) + '%' : '0%';

        // -------------------------------------------------------------
        // SHEET 1: EXECUTIVE SUMMARY DASHBOARD
        // -------------------------------------------------------------
        const summarySheet = workbook.addWorksheet('Executive Summary', {
            views: [{ showGridLines: true }]
        });

        // Title Banner
        summarySheet.mergeCells('A1:F2');
        const titleCell = summarySheet.getCell('A1');
        titleCell.value = '✈️ Aero-Navigator Web - Selenium E2E Test Execution Summary Report';
        titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFF' } };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };
        titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

        // Subtitle
        summarySheet.mergeCells('A3:F3');
        const subCell = summarySheet.getCell('A3');
        subCell.value = `Execution Timestamp: ${new Date().toLocaleString()}  |  Environment: Local Node.js Chrome / Headless`;
        subCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: '64748B' } };
        subCell.alignment = { vertical: 'middle', horizontal: 'center' };

        // KPI Summary Cards Header
        summarySheet.mergeCells('A5:F5');
        const kpiHeader = summarySheet.getCell('A5');
        kpiHeader.value = '📊 Key Performance Indicators (KPIs)';
        kpiHeader.font = { name: 'Calibri', size: 12, bold: true, color: { argb: '0F172A' } };
        kpiHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2E8F0' } };

        // KPI Labels & Values
        const kpis = [
            { label: 'Total Test Cases', value: totalTests, color: '3B82F6' },
            { label: 'Passed Tests', value: passedTests, color: '10B981' },
            { label: 'Failed Tests', value: failedTests, color: 'EF4444' },
            { label: 'Pass Rate (%)', value: passRate, color: '8B5CF6' },
            { label: 'Total Execution Time', value: `${totalDuration}s`, color: '64748B' }
        ];

        let colIndex = 1;
        kpis.forEach(kpi => {
            const cellLabel = summarySheet.getCell(6, colIndex);
            cellLabel.value = kpi.label;
            cellLabel.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '475569' } };
            cellLabel.alignment = { horizontal: 'center' };

            const cellVal = summarySheet.getCell(7, colIndex);
            cellVal.value = kpi.value;
            cellVal.font = { name: 'Calibri', size: 16, bold: true, color: { argb: kpi.color } };
            cellVal.alignment = { horizontal: 'center' };
            cellVal.border = {
                top: { style: 'thin', color: { argb: 'CBD5E1' } },
                bottom: { style: 'medium', color: { argb: kpi.color } },
                left: { style: 'thin', color: { argb: 'CBD5E1' } },
                right: { style: 'thin', color: { argb: 'CBD5E1' } }
            };
            colIndex++;
        });

        // -------------------------------------------------------------
        // SHEET 2: DETAILED TEST RESULTS
        // -------------------------------------------------------------
        const detailSheet = workbook.addWorksheet('Detailed Test Results', {
            views: [{ showGridLines: true }]
        });

        detailSheet.columns = [
            { header: 'Test ID', key: 'testId', width: 12 },
            { header: 'Module', key: 'moduleName', width: 28 },
            { header: 'Test Case Name', key: 'testName', width: 32 },
            { header: 'Action / Step', key: 'stepAction', width: 38 },
            { header: 'Expected Result', key: 'expectedResult', width: 35 },
            { header: 'Actual Result', key: 'actualResult', width: 35 },
            { header: 'Status', key: 'status', width: 12 },
            { header: 'Duration (ms)', key: 'durationMs', width: 15 },
            { header: 'Timestamp', key: 'timestamp', width: 22 },
            { header: 'Error Log', key: 'errorDetails', width: 35 }
        ];

        // Format Header Row
        const headerRow = detailSheet.getRow(1);
        headerRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0F172A' } };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

        this.results.forEach(res => {
            const row = detailSheet.addRow(res);
            const statusCell = row.getCell('status');
            if (res.status === 'PASS') {
                statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D1FAE5' } };
                statusCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '065F46' } };
            } else {
                statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEE2E2' } };
                statusCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '991B1B' } };
            }
            statusCell.alignment = { horizontal: 'center' };
        });

        // -------------------------------------------------------------
        // SHEET 3: MODULE ANALYTICS
        // -------------------------------------------------------------
        const analyticsSheet = workbook.addWorksheet('Module Analytics', {
            views: [{ showGridLines: true }]
        });

        analyticsSheet.columns = [
            { header: 'Module Name', key: 'module', width: 35 },
            { header: 'Total Tests', key: 'total', width: 15 },
            { header: 'Passed', key: 'passed', width: 15 },
            { header: 'Failed', key: 'failed', width: 15 },
            { header: 'Success Rate (%)', key: 'rate', width: 20 }
        ];

        const modHeader = analyticsSheet.getRow(1);
        modHeader.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
        modHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };
        modHeader.alignment = { vertical: 'middle', horizontal: 'center' };

        config.MODULES.forEach(mod => {
            const modResults = this.results.filter(r => r.moduleName === mod);
            const total = modResults.length;
            const passed = modResults.filter(r => r.status === 'PASS').length;
            const failed = modResults.filter(r => r.status === 'FAIL').length;
            const rate = total > 0 ? ((passed / total) * 100).toFixed(1) + '%' : '0%';

            analyticsSheet.addRow({
                module: mod,
                total,
                passed,
                failed,
                rate
            });
        });

        await workbook.xlsx.writeFile(outputPath);
        console.log(`\n✅ Excel Analysis Report successfully generated at:\n   ${outputPath}\n`);
        return outputPath;
    }
}

module.exports = SeleniumExcelReporter;
