/**
 * DAST Excel Report Generator — Aero-Navigator
 * Reads automated_test/report.json and produces a rich, multi-sheet Excel report.
 * Sheets:
 *   1. Executive Summary  — KPI dashboard + risk matrix
 *   2. All Test Results   — full results table with colour-coding
 *   3. Security Findings  — findings only, prioritised
 *   4. Category Breakdown — per-category stats
 */

const ExcelJS = require('exceljs');
const fs      = require('fs');
const path    = require('path');

const REPORT_JSON  = path.join(__dirname, 'report.json');
const OUTPUT_FILE  = path.join(__dirname, 'DAST_Security_Report.xlsx');

// ── Load data ─────────────────────────────────────────────────────────────────
let results = [];
try {
    results = JSON.parse(fs.readFileSync(REPORT_JSON, 'utf8'));
} catch (e) {
    console.error('✗ Could not read report.json — run dast_runner.js first.');
    process.exit(1);
}

const findings = results.filter(r => r.finding);
const passed   = results.filter(r => !r.finding);
const bySev    = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
findings.forEach(f => { if (f.severity in bySev) bySev[f.severity]++; });

const runDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

// ── Colour palette ────────────────────────────────────────────────────────────
const COLOURS = {
    CRITICAL : { bg: 'FFDC2626', fg: 'FFFFFFFF', badge: 'FF7F1D1D' },
    HIGH     : { bg: 'FFEA580C', fg: 'FFFFFFFF', badge: 'FF7C2D12' },
    MEDIUM   : { bg: 'FFD97706', fg: 'FFFFFFFF', badge: 'FF78350F' },
    LOW      : { bg: 'FF16A34A', fg: 'FFFFFFFF', badge: 'FF14532D' },
    INFO     : { bg: 'FF6366F1', fg: 'FFFFFFFF', badge: 'FF312E81' },
    PASS     : { bg: 'FF22C55E', fg: 'FFFFFFFF', badge: 'FF14532D' },
    HEADER   : { bg: 'FF0F172A', fg: 'FFFFFFFF' },
    SUBHDR   : { bg: 'FF1E3A5F', fg: 'FFFFFFFF' },
    ALT1     : { bg: 'FFF8FAFC', fg: 'FF1E293B' },
    ALT2     : { bg: 'FFFFFFFF', fg: 'FF1E293B' },
    ACCENT   : { bg: 'FF38BDF8', fg: 'FF0F172A' },
};

function sevColour(sev)   { return COLOURS[sev] || COLOURS.INFO; }
function fillSolid(argb)  { return { type: 'pattern', pattern: 'solid', fgColor: { argb } }; }
function headerFont(size = 11) { return { name: 'Calibri', bold: true, size, color: { argb: COLOURS.HEADER.fg } }; }
function bodyFont(size = 10)   { return { name: 'Calibri', size, color: { argb: '1E293B' } }; }

function applyHeaderRow(row, bgArgb = COLOURS.HEADER.bg) {
    row.eachCell(cell => {
        cell.fill = fillSolid(bgArgb);
        cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = {
            top: { style: 'thin', color: { argb: 'FF334155' } },
            bottom: { style: 'thin', color: { argb: 'FF334155' } },
            left:  { style: 'thin', color: { argb: 'FF334155' } },
            right: { style: 'thin', color: { argb: 'FF334155' } },
        };
    });
    row.height = 30;
}

function applyDataRow(row, bgArgb) {
    row.eachCell({ includeEmpty: true }, cell => {
        cell.fill = fillSolid(bgArgb);
        cell.alignment = { vertical: 'middle', wrapText: true };
        cell.font = bodyFont();
        cell.border = {
            bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } },
            right:  { style: 'hair', color: { argb: 'FFE2E8F0' } },
        };
    });
    row.height = 22;
}

// ════════════════════════════════════════════════════════════════════════════
//  MAIN
// ════════════════════════════════════════════════════════════════════════════

(async () => {
    const wb = new ExcelJS.Workbook();
    wb.creator  = 'Aero-Navigator DAST Suite';
    wb.created  = new Date();
    wb.modified = new Date();

    // ── SHEET 1: Executive Summary ─────────────────────────────────────────
    const s1 = wb.addWorksheet('Executive Summary', {
        properties: { tabColor: { argb: 'FF0F172A' } },
        views: [{ showGridLines: false }],
    });
    s1.columns = [
        { width: 4 }, { width: 28 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 4 }
    ];

    // Title banner
    s1.mergeCells('B1:G1');
    const titleCell = s1.getCell('B1');
    titleCell.value = '✈️  AERO-NAVIGATOR API — DAST SECURITY REPORT';
    titleCell.fill  = fillSolid(COLOURS.HEADER.bg);
    titleCell.font  = { name: 'Calibri', bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    s1.getRow(1).height = 50;

    s1.mergeCells('B2:G2');
    const subtitleCell = s1.getCell('B2');
    subtitleCell.value = `Generated: ${runDate}  ·  GitHub Actions CI  ·  Automated Security Test`;
    subtitleCell.fill  = fillSolid(COLOURS.SUBHDR.bg);
    subtitleCell.font  = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF94A3B8' } };
    subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    s1.getRow(2).height = 22;

    // Spacer
    s1.getRow(3).height = 12;

    // KPI section header
    s1.mergeCells('B4:G4');
    const kpiHdr = s1.getCell('B4');
    kpiHdr.value = 'TEST EXECUTION KPIs';
    kpiHdr.fill  = fillSolid('FF1E3A5F');
    kpiHdr.font  = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    kpiHdr.alignment = { horizontal: 'center', vertical: 'middle' };
    s1.getRow(4).height = 28;

    // KPI data rows
    const kpis = [
        ['Total Tests Run',  results.length,           'FF6366F1'],
        ['Tests Passed',     passed.length,             'FF22C55E'],
        ['Total Findings',   findings.length,           'FF0EA5E9'],
        ['🔴 Critical',      bySev.CRITICAL,            'FFDC2626'],
        ['🟠 High',          bySev.HIGH,                'FFEA580C'],
        ['🟡 Medium',        bySev.MEDIUM,              'FFD97706'],
        ['🟢 Low',           bySev.LOW,                 'FF16A34A'],
        ['Pass Rate',        `${Math.round((passed.length/results.length)*100)}%`, 'FF8B5CF6'],
    ];

    // 2 KPIs per row
    for (let i = 0; i < kpis.length; i += 2) {
        const rowNum = 5 + Math.floor(i / 2);
        const row = s1.getRow(rowNum);
        row.height = 40;

        // Left KPI
        s1.mergeCells(`B${rowNum}:C${rowNum}`);
        const lLabel = s1.getCell(`B${rowNum}`);
        lLabel.value     = kpis[i][0];
        lLabel.fill      = fillSolid('FFF8FAFC');
        lLabel.font      = { name: 'Calibri', size: 10, color: { argb: 'FF64748B' } };
        lLabel.alignment = { horizontal: 'center', vertical: 'bottom' };

        const lVal = s1.getCell(`D${rowNum}`);
        lVal.value     = kpis[i][1];
        lVal.fill      = fillSolid(kpis[i][2]);
        lVal.font      = { name: 'Calibri', bold: true, size: 18, color: { argb: 'FFFFFFFF' } };
        lVal.alignment = { horizontal: 'center', vertical: 'middle' };

        // Right KPI
        if (kpis[i + 1]) {
            s1.mergeCells(`E${rowNum}:F${rowNum}`);
            const rLabel = s1.getCell(`E${rowNum}`);
            rLabel.value     = kpis[i + 1][0];
            rLabel.fill      = fillSolid('FFF8FAFC');
            rLabel.font      = { name: 'Calibri', size: 10, color: { argb: 'FF64748B' } };
            rLabel.alignment = { horizontal: 'center', vertical: 'bottom' };

            const rVal = s1.getCell(`G${rowNum}`);
            rVal.value     = kpis[i + 1][1];
            rVal.fill      = fillSolid(kpis[i + 1][2]);
            rVal.font      = { name: 'Calibri', bold: true, size: 18, color: { argb: 'FFFFFFFF' } };
            rVal.alignment = { horizontal: 'center', vertical: 'middle' };
        }
    }

    // Risk matrix section
    const riskRow = 5 + Math.ceil(kpis.length / 2) + 1;
    s1.getRow(riskRow - 1).height = 14;
    s1.mergeCells(`B${riskRow}:G${riskRow}`);
    const riskHdr = s1.getCell(`B${riskRow}`);
    riskHdr.value = 'RISK MATRIX BY SEVERITY';
    riskHdr.fill  = fillSolid('FF1E3A5F');
    riskHdr.font  = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    riskHdr.alignment = { horizontal: 'center', vertical: 'middle' };
    s1.getRow(riskRow).height = 28;

    const riskHdrRow = s1.getRow(riskRow + 1);
    riskHdrRow.values = ['', 'Severity', 'Findings', 'Status', 'Immediate Action Required', '', ''];
    applyHeaderRow(riskHdrRow, COLOURS.SUBHDR.bg);
    riskHdrRow.height = 26;

    const sevOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    const actionMap = {
        CRITICAL: 'Fix before deploying to production — blocks release',
        HIGH    : 'Fix within 24–48 hours — significant security risk',
        MEDIUM  : 'Fix within sprint — moderate risk',
        LOW     : 'Address in next release — minor risk',
    };

    sevOrder.forEach((sev, i) => {
        const r = s1.getRow(riskRow + 2 + i);
        r.values = ['', sev, bySev[sev], bySev[sev] === 0 ? '✅ PASS' : '❌ FAIL', actionMap[sev], '', ''];
        const bgArgb = bySev[sev] === 0 ? 'FFF0FDF4' : sevColour(sev).bg;
        r.eachCell({ includeEmpty: true }, (cell) => {
            cell.fill = fillSolid(i % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF');
            cell.font = bodyFont();
            cell.alignment = { vertical: 'middle' };
            cell.border = { bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } } };
        });
        // Severity badge
        const sevCell = r.getCell(2);
        sevCell.fill  = fillSolid(sevColour(sev).bg);
        sevCell.font  = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
        sevCell.alignment = { horizontal: 'center', vertical: 'middle' };
        // Count cell
        const cntCell = r.getCell(3);
        cntCell.font  = { name: 'Calibri', bold: true, size: 14, color: { argb: bySev[sev] === 0 ? 'FF16A34A' : sevColour(sev).bg } };
        cntCell.alignment = { horizontal: 'center', vertical: 'middle' };
        // Status
        const stCell = r.getCell(4);
        stCell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: bySev[sev] === 0 ? 'FF16A34A' : 'FFDC2626' } };
        stCell.alignment = { horizontal: 'center', vertical: 'middle' };
        r.height = 26;
    });

    // ── SHEET 2: All Test Results ──────────────────────────────────────────
    const s2 = wb.addWorksheet('All Test Results', {
        properties: { tabColor: { argb: 'FF6366F1' } },
        views: [{ showGridLines: false, state: 'frozen', ySplit: 2 }],
    });
    s2.columns = [
        { header: '#',            key: 'idx',        width: 5  },
        { header: 'Method',       key: 'method',     width: 9  },
        { header: 'Endpoint',     key: 'endpoint',   width: 32 },
        { header: 'Role',         key: 'role',       width: 22 },
        { header: 'Status',       key: 'status',     width: 9  },
        { header: 'Expected',     key: 'expected',   width: 14 },
        { header: 'Result',       key: 'result',     width: 10 },
        { header: 'Severity',     key: 'severity',   width: 11 },
        { header: 'Response(ms)', key: 'ms',         width: 13 },
        { header: 'Category',     key: 'category',   width: 18 },
        { header: 'Detail Note',  key: 'note',       width: 60 },
        { header: 'Timestamp',    key: 'ts',         width: 22 },
    ];

    // Merge header title
    s2.mergeCells('A1:L1');
    const s2Title = s2.getCell('A1');
    s2Title.value = '📋  All Test Results — Aero-Navigator DAST Suite';
    s2Title.fill  = fillSolid(COLOURS.HEADER.bg);
    s2Title.font  = { name: 'Calibri', bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
    s2Title.alignment = { horizontal: 'center', vertical: 'middle' };
    s2.getRow(1).height = 36;

    const s2Hdr = s2.getRow(2);
    s2Hdr.values = ['#', 'Method', 'Endpoint', 'Role', 'Status', 'Expected', 'Result', 'Severity', 'Time(ms)', 'Category', 'Detail Note', 'Timestamp'];
    applyHeaderRow(s2Hdr);

    results.forEach((r, i) => {
        const row = s2.addRow([
            i + 1, r.method, r.endpoint, r.role, r.status,
            r.expected_status, r.finding ? 'FINDING' : 'PASS',
            r.finding ? r.severity : '—',
            r.response_time_ms, r.test_category, r.note,
            new Date(r.timestamp).toLocaleString('en-IN'),
        ]);
        const bgArgb = i % 2 === 0 ? COLOURS.ALT1.bg : COLOURS.ALT2.bg;
        applyDataRow(row, bgArgb);

        // Result badge
        const resCell = row.getCell(7);
        resCell.fill  = fillSolid(r.finding ? sevColour(r.severity).bg : 'FF22C55E');
        resCell.font  = { name: 'Calibri', bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
        resCell.alignment = { horizontal: 'center', vertical: 'middle' };

        // Severity badge
        if (r.finding) {
            const sevCell = row.getCell(8);
            sevCell.fill  = fillSolid(sevColour(r.severity).bg);
            sevCell.font  = { name: 'Calibri', bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
            sevCell.alignment = { horizontal: 'center', vertical: 'middle' };
        }

        // Method badge
        const methodCell = row.getCell(2);
        const methodColor = { GET: 'FF0EA5E9', POST: 'FF8B5CF6', PUT: 'FFF59E0B', DELETE: 'FFEF4444', STATIC: 'FF6B7280' };
        methodCell.fill  = fillSolid(methodColor[r.method] || 'FF6B7280');
        methodCell.font  = { name: 'Calibri', bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
        methodCell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    s2.autoFilter = { from: 'A2', to: 'L2' };

    // ── SHEET 3: Security Findings ─────────────────────────────────────────
    const s3 = wb.addWorksheet('Security Findings', {
        properties: { tabColor: { argb: 'FFDC2626' } },
        views: [{ showGridLines: false, state: 'frozen', ySplit: 2 }],
    });
    s3.columns = [
        { width: 5  },  // #
        { width: 11 },  // Severity
        { width: 9  },  // Method
        { width: 32 },  // Endpoint
        { width: 20 },  // Category
        { width: 9  },  // Status
        { width: 65 },  // Finding Detail
        { width: 13 },  // Response ms
    ];

    s3.mergeCells('A1:H1');
    const s3Title = s3.getCell('A1');
    s3Title.value = findings.length === 0
        ? '✅  NO SECURITY FINDINGS — All Tests Passed!'
        : `🚨  Security Findings (${findings.length}) — Review & Remediate`;
    s3Title.fill  = fillSolid(findings.length === 0 ? 'FF16A34A' : 'FF7F1D1D');
    s3Title.font  = { name: 'Calibri', bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
    s3Title.alignment = { horizontal: 'center', vertical: 'middle' };
    s3.getRow(1).height = 36;

    const s3Hdr = s3.getRow(2);
    s3Hdr.values = ['#', 'Severity', 'Method', 'Endpoint', 'Category', 'Status', 'Finding Detail', 'Time(ms)'];
    applyHeaderRow(s3Hdr, 'FF7F1D1D');

    if (findings.length === 0) {
        s3.mergeCells('A3:H3');
        const emptyCell = s3.getCell('A3');
        emptyCell.value = '🎉  Congratulations! All security tests passed. No vulnerabilities detected.';
        emptyCell.fill  = fillSolid('FFF0FDF4');
        emptyCell.font  = { name: 'Calibri', bold: true, size: 12, color: { argb: 'FF16A34A' } };
        emptyCell.alignment = { horizontal: 'center', vertical: 'middle' };
        s3.getRow(3).height = 40;
    } else {
        const sortOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
        const sorted = [...findings].sort((a, b) => (sortOrder[a.severity] || 9) - (sortOrder[b.severity] || 9));

        sorted.forEach((f, i) => {
            const row = s3.addRow([i + 1, f.severity, f.method, f.endpoint, f.test_category, f.status, f.note, f.response_time_ms]);
            applyDataRow(row, i % 2 === 0 ? 'FFFFF7ED' : 'FFFFFFFF');

            const sevCell = row.getCell(2);
            sevCell.fill  = fillSolid(sevColour(f.severity).bg);
            sevCell.font  = { name: 'Calibri', bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
            sevCell.alignment = { horizontal: 'center', vertical: 'middle' };

            const methodCell = row.getCell(3);
            const mc = { GET: 'FF0EA5E9', POST: 'FF8B5CF6', STATIC: 'FF6B7280' };
            methodCell.fill  = fillSolid(mc[f.method] || 'FF6B7280');
            methodCell.font  = { name: 'Calibri', bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
            methodCell.alignment = { horizontal: 'center', vertical: 'middle' };
        });
        s3.autoFilter = { from: 'A2', to: 'H2' };
    }

    // ── SHEET 4: Category Breakdown ────────────────────────────────────────
    const s4 = wb.addWorksheet('Category Breakdown', {
        properties: { tabColor: { argb: 'FF0EA5E9' } },
        views: [{ showGridLines: false }],
    });
    s4.columns = [
        { width: 4  }, { width: 26 }, { width: 14 }, { width: 14 }, { width: 14 },
        { width: 14 }, { width: 14 }, { width: 14 }, { width: 30 }, { width: 4 },
    ];

    s4.mergeCells('B1:I1');
    const s4Title = s4.getCell('B1');
    s4Title.value = '📊  Test Category Breakdown — Aero-Navigator DAST';
    s4Title.fill  = fillSolid(COLOURS.HEADER.bg);
    s4Title.font  = { name: 'Calibri', bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
    s4Title.alignment = { horizontal: 'center', vertical: 'middle' };
    s4.getRow(1).height = 36;

    const s4Hdr = s4.getRow(2);
    s4Hdr.values = ['', 'Category', 'Total', 'Passed', 'Findings', 'Critical', 'High', 'Medium/Low', 'Description', ''];
    applyHeaderRow(s4Hdr, COLOURS.SUBHDR.bg);
    s4Hdr.height = 26;

    const catMeta = {
        CAT0_UNAUTH    : 'Unauthenticated access to all endpoints — verifies public vs protected route separation',
        CAT1_AUTHN     : 'AuthN bypass with malformed/missing tokens — verifies session enforcement',
        CAT2_AUTHZ     : 'Cross-user data access (IDOR/AuthZ) — verifies user data isolation',
        CAT3_IDOR      : 'Token entropy analysis — verifies crypto-strength tokens for shared links',
        CAT4_INJECTION : 'SQL/command injection probes — verifies parameterised queries & input sanitisation',
        CAT5_RATE_LIMIT: 'Rate-limit enforcement — verifies protection against brute-force & DDoS',
        CAT6_SECRETS   : 'Hardcoded credentials scan — verifies secrets externalisation to env vars',
    };

    const categories = [...new Set(results.map(r => r.test_category))].sort();
    categories.forEach((cat, i) => {
        const catResults   = results.filter(r => r.test_category === cat);
        const catFindings  = catResults.filter(r => r.finding);
        const catPassed    = catResults.filter(r => !r.finding);
        const criticals    = catFindings.filter(f => f.severity === 'CRITICAL').length;
        const highs        = catFindings.filter(f => f.severity === 'HIGH').length;
        const medLow       = catFindings.filter(f => f.severity === 'MEDIUM' || f.severity === 'LOW').length;
        const allGreen     = catFindings.length === 0;

        const row = s4.addRow([
            '', cat,
            catResults.length, catPassed.length, catFindings.length,
            criticals, highs, medLow,
            catMeta[cat] || cat, ''
        ]);
        applyDataRow(row, i % 2 === 0 ? COLOURS.ALT1.bg : COLOURS.ALT2.bg);

        // Category name cell
        const catCell = row.getCell(2);
        catCell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: COLOURS.HEADER.bg.replace('FF', '') } };

        // Findings count — green if 0, red if >0
        const fCell = row.getCell(5);
        fCell.font = { name: 'Calibri', bold: true, size: 12, color: { argb: allGreen ? '16A34A' : 'DC2626' } };
        fCell.alignment = { horizontal: 'center', vertical: 'middle' };

        row.height = 28;
    });

    // Summary footer
    const footerRow = s4.addRow(['', 'TOTAL', results.length, passed.length, findings.length,
        bySev.CRITICAL, bySev.HIGH, bySev.MEDIUM + bySev.LOW, '', '']);
    applyHeaderRow(footerRow, 'FF0F172A');
    footerRow.height = 28;

    // ── Save workbook ──────────────────────────────────────────────────────
    await wb.xlsx.writeFile(OUTPUT_FILE);
    console.log(`\n✅  Excel report generated: ${OUTPUT_FILE}`);
    console.log(`    Sheets: Executive Summary | All Test Results | Security Findings | Category Breakdown`);
    console.log(`    Tests: ${results.length} total  |  ${passed.length} passed  |  ${findings.length} findings\n`);
})();
