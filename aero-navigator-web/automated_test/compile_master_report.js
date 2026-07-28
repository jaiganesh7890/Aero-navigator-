/**
 * Master Report Compiler — Aero-Navigator Complete Test Suite
 * Reads all test result JSON files and compiles a rich multi-sheet Excel report
 */
const ExcelJS = require('exceljs');
const fs      = require('fs');
const path    = require('path');

const DIR = __dirname;
const OUT = path.join(DIR, 'Master_Test_Report.xlsx');
const NOW = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

// ── Colour palette ─────────────────────────────────────────────────────────
const C = {
    NAVY   : 'FF0F172A', WHITE  : 'FFFFFFFF', PASS   : 'FF16A34A',
    FAIL   : 'FFDC2626', WARN   : 'FFF59E0B', INFO   : 'FF6366F1',
    ALT1   : 'FFF8FAFC', ALT2   : 'FFFFFFFF', HDR    : 'FF1E3A5F',
    BLUE   : 'FF0EA5E9', PURPLE : 'FF8B5CF6', AMBER  : 'FFD97706',
};
const fill  = (a) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: a } });
const bold  = (s = 11, a = 'FFFFFFFF') => ({ name: 'Calibri', bold: true, size: s, color: { argb: a } });
const body  = (a = 'FF1E293B') => ({ name: 'Calibri', size: 10, color: { argb: a } });

// ── Load all result files ──────────────────────────────────────────────────
function loadJSON(file) {
    try { return JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8')); }
    catch(_) { return { summary: { passed: 0, failed: 0, total: 0 }, results: [] }; }
}

const DATA = {
    selenium   : loadJSON('selenium_results.json'),
    appium     : loadJSON('appium_results.json'),
    unit       : loadJSON('unit_test_results.json'),
    validation : loadJSON('validation_results.json'),
    deployment : loadJSON('deployment_results.json'),
    load       : loadJSON('load_test_results.json').results ? loadJSON('load_test_results.json') : { summary: { passed: 0, failed: 0, total: 0 }, results: [] },
    dast       : loadJSON('report.json').length ? { summary: { passed: JSON.parse(fs.readFileSync(path.join(DIR,'report.json'),'utf8')).filter(r=>!r.finding).length, failed: JSON.parse(fs.readFileSync(path.join(DIR,'report.json'),'utf8')).filter(r=>r.finding).length, total: JSON.parse(fs.readFileSync(path.join(DIR,'report.json'),'utf8')).length }, results: JSON.parse(fs.readFileSync(path.join(DIR,'report.json'),'utf8')) } : { summary: { passed: 0, failed: 0, total: 0 }, results: [] },
};

// Fix DAST data structure
try {
    const raw = JSON.parse(fs.readFileSync(path.join(DIR, 'report.json'), 'utf8'));
    DATA.dast = {
        summary: { passed: raw.filter(r => !r.finding).length, failed: raw.filter(r => r.finding).length, total: raw.length },
        results: raw.map(r => ({ ...r, pass: !r.finding, test: r.endpoint || r.test, note: r.note || '' }))
    };
} catch(_) {}

const SUITES = [
    { key: 'selenium',   name: '🌐 Selenium — Website Tests',   color: C.BLUE,   icon: '🌐' },
    { key: 'appium',     name: '📱 Appium — Android Tests',     color: C.PURPLE, icon: '📱' },
    { key: 'unit',       name: '🔧 Unit Tests — API',           color: C.INFO,   icon: '🔧' },
    { key: 'validation', name: '✅ Validation Tests',           color: C.AMBER,  icon: '✅' },
    { key: 'deployment', name: '🚀 Deployment Status',          color: C.PASS,   icon: '🚀' },
    { key: 'load',       name: '⚡ Load Testing',               color: C.WARN,   icon: '⚡' },
    { key: 'dast',       name: '🔒 Vulnerability Tests (DAST)', color: C.FAIL,   icon: '🔒' },
];

function applyHdrRow(row, bg = C.NAVY) {
    row.eachCell(c => {
        c.fill      = fill(bg);
        c.font      = bold(10);
        c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        c.border    = { bottom: { style: 'thin', color: { argb: 'FF334155' } } };
    });
    row.height = 28;
}

function applyDataRow(row, bg) {
    row.eachCell({ includeEmpty: true }, c => {
        c.fill      = fill(bg);
        c.font      = body();
        c.alignment = { vertical: 'middle', wrapText: true };
        c.border    = { bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } } };
    });
    row.height = 22;
}

(async () => {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Aero-Navigator CI/CD Pipeline'; wb.created = new Date();

    // ══════════════════════════════════════════════════════════════════
    // SHEET 1 — Master Dashboard
    // ══════════════════════════════════════════════════════════════════
    const s1 = wb.addWorksheet('📊 Master Dashboard', { views: [{ showGridLines: false }] });
    s1.columns = [{ width:4 },{ width:30 },{ width:12 },{ width:12 },{ width:12 },{ width:12 },{ width:16 },{ width:4 }];

    // Title
    s1.mergeCells('B1:G1');
    const t = s1.getCell('B1');
    t.value = '✈️  AERO-NAVIGATOR — COMPLETE TEST SUITE MASTER REPORT';
    t.fill  = fill(C.NAVY); t.font = bold(14); t.alignment = { horizontal: 'center', vertical: 'middle' };
    s1.getRow(1).height = 44;

    s1.mergeCells('B2:G2');
    const sub = s1.getCell('B2');
    sub.value = `Generated: ${NOW}  ·  GitHub Actions CI/CD  ·  All Test Suites Combined`;
    sub.fill  = fill(C.HDR); sub.font = { name:'Calibri', size:9, italic:true, color:{argb:'FF94A3B8'} };
    sub.alignment = { horizontal: 'center', vertical: 'middle' };
    s1.getRow(2).height = 20;
    s1.getRow(3).height = 10;

    // Overall KPIs
    const totalPassed = SUITES.reduce((a, s) => a + (DATA[s.key].summary.passed || 0), 0);
    const totalFailed = SUITES.reduce((a, s) => a + (DATA[s.key].summary.failed || 0), 0);
    const totalTests  = totalPassed + totalFailed;
    const passRate    = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;

    s1.mergeCells('B4:G4');
    const kh = s1.getCell('B4');
    kh.value = 'OVERALL EXECUTION SUMMARY'; kh.fill = fill(C.HDR);
    kh.font = bold(11); kh.alignment = { horizontal: 'center', vertical: 'middle' };
    s1.getRow(4).height = 26;

    const kpiData = [
        ['Total Tests Run', totalTests, C.INFO],
        ['✅ Passed',       totalPassed, C.PASS],
        ['❌ Failed',       totalFailed, totalFailed === 0 ? C.PASS : C.FAIL],
        ['Pass Rate',       `${passRate}%`, passRate === 100 ? C.PASS : passRate >= 90 ? C.AMBER : C.FAIL],
        ['Test Suites',     SUITES.length, C.BLUE],
        ['CI Pipeline',     'GitHub Actions', C.PURPLE],
    ];

    kpiData.forEach((k, i) => {
        const col = i % 3 + 2;
        const row = 5 + Math.floor(i / 3);
        const lr = s1.getRow(row); lr.height = 42;

        s1.mergeCells(`${String.fromCharCode(64+col)}${row}:${String.fromCharCode(65+col)}${row}`);
        const lc = s1.getCell(row, col);
        lc.value = k[0]; lc.fill = fill('FFF8FAFC');
        lc.font = { name:'Calibri', size:9, color:{argb:'FF64748B'} };
        lc.alignment = { horizontal:'center', vertical:'bottom' };

        const vc = s1.getCell(row, col + 2);
        vc.value = k[1]; vc.fill = fill(k[2]);
        vc.font = bold(16); vc.alignment = { horizontal:'center', vertical:'middle' };
    });

    s1.getRow(7).height = 14;

    // Suite Breakdown Table
    s1.mergeCells('B8:G8');
    const bh = s1.getCell('B8');
    bh.value = 'TEST SUITE BREAKDOWN'; bh.fill = fill(C.HDR);
    bh.font = bold(11); bh.alignment = { horizontal:'center', vertical:'middle' };
    s1.getRow(8).height = 26;

    const hdr = s1.getRow(9);
    hdr.values = ['', 'Test Suite', 'Total', 'Passed', 'Failed', 'Pass Rate', 'Status', ''];
    applyHdrRow(hdr, C.NAVY); hdr.height = 26;

    SUITES.forEach((suite, i) => {
        const d    = DATA[suite.key].summary;
        const pass = d.passed || 0, fail = d.failed || 0, tot = (d.total || pass + fail);
        const rate = tot > 0 ? Math.round((pass / tot) * 100) : 0;
        const ok   = fail === 0;
        const row  = s1.addRow(['', suite.name, tot, pass, fail, `${rate}%`, ok ? '✅ PASS' : '❌ FAIL', '']);
        applyDataRow(row, i % 2 === 0 ? C.ALT1 : C.ALT2);

        const nc = row.getCell(2); nc.fill = fill(suite.color);
        nc.font = bold(10); nc.alignment = { horizontal:'left', vertical:'middle' };

        const sc = row.getCell(7);
        sc.fill = fill(ok ? 'FFF0FDF4' : 'FFFEF2F2');
        sc.font = { name:'Calibri', bold:true, size:10, color:{ argb: ok ? C.PASS : C.FAIL } };
        sc.alignment = { horizontal:'center', vertical:'middle' };

        [3,4,5,6].forEach(ci => {
            const c = row.getCell(ci); c.alignment = { horizontal:'center', vertical:'middle' };
            if (ci === 4) c.font = { name:'Calibri', bold:true, size:11, color:{ argb: C.PASS } };
            if (ci === 5 && fail > 0) c.font = { name:'Calibri', bold:true, size:11, color:{ argb: C.FAIL } };
        });
        row.height = 26;
    });

    const total = s1.addRow(['', 'GRAND TOTAL', totalTests, totalPassed, totalFailed, `${passRate}%`, passRate === 100 ? '✅ ALL PASS' : '⚠️ CHECK FAILS', '']);
    applyHdrRow(total, C.NAVY); total.height = 30;

    // ══════════════════════════════════════════════════════════════════
    // SHEETS 2-8 — Individual Suite Results
    // ══════════════════════════════════════════════════════════════════
    SUITES.forEach(suite => {
        const d  = DATA[suite.key];
        const ws = wb.addWorksheet(suite.name.substring(0, 31), {
            views: [{ showGridLines: false, state: 'frozen', ySplit: 2 }],
            properties: { tabColor: { argb: suite.color } }
        });
        ws.columns = [{ width:5 },{ width:38 },{ width:14 },{ width:12 },{ width:12 },{ width:50 },{ width:14 }];

        ws.mergeCells('A1:G1');
        const wt = ws.getCell('A1');
        wt.value = `${suite.name} — Results`;
        wt.fill = fill(C.NAVY); wt.font = bold(12);
        wt.alignment = { horizontal:'center', vertical:'middle' };
        ws.getRow(1).height = 34;

        const wh = ws.getRow(2);
        wh.values = ['#', 'Test Name', 'HTTP Status', 'Expected', 'Result', 'Note', 'Time(ms)'];
        applyHdrRow(wh, suite.color.replace('FF', 'FF'));

        (d.results || []).forEach((r, i) => {
            const pass  = r.pass !== undefined ? r.pass : !r.finding;
            const name  = r.test || r.endpoint || r.name || `Test ${i+1}`;
            const status = r.status || 0;
            const exp   = r.expected_status || r.expected || '—';
            const note  = r.note || r.detail || '';
            const ms    = r.ms || r.response_time_ms || 0;
            const row   = ws.addRow([i+1, name, status, exp, pass ? '✅ PASS' : '❌ FAIL', note, ms]);
            applyDataRow(row, i % 2 === 0 ? C.ALT1 : C.ALT2);

            const rc = row.getCell(5);
            rc.fill = fill(pass ? 'FF22C55E' : 'FFDC2626');
            rc.font = bold(9); rc.alignment = { horizontal:'center', vertical:'middle' };

            const sc = row.getCell(3);
            const mc = { 200:'FF0EA5E9', 201:'FF8B5CF6', 401:'FFEA580C', 429:'FFD97706', 404:'FF6B7280', 400:'FFD97706', 0:'FFDC2626' };
            sc.fill = fill(mc[status] || 'FF6B7280');
            sc.font = bold(9); sc.alignment = { horizontal:'center', vertical:'middle' };
        });

        ws.addRow([]);
        const sumRow = ws.addRow(['', `TOTAL: ${d.summary.total || 0} | PASSED: ${d.summary.passed || 0} | FAILED: ${d.summary.failed || 0}`, '', '', '', '', '']);
        applyHdrRow(sumRow, C.HDR); sumRow.height = 24;
        ws.mergeCells(`B${sumRow.number}:G${sumRow.number}`);
        ws.autoFilter = { from: 'A2', to: 'G2' };
    });

    await wb.xlsx.writeFile(OUT);
    console.log(`\n✅  Master Test Report: ${OUT}`);
    console.log(`    Suites: ${SUITES.length}  |  Total Tests: ${totalTests}  |  Passed: ${totalPassed}  |  Failed: ${totalFailed}  |  Pass Rate: ${passRate}%\n`);
})().catch(e => { console.error('Report error:', e); process.exit(1); });
