/**
 * GitHub Actions DAST Report — HTML Generator
 * Reads automated_test/report.json and produces dast_report.html
 */

const fs   = require('fs');
const path = require('path');

const reportJson = path.join(__dirname, 'report.json');
const outputHtml = path.join(__dirname, 'dast_report.html');

let results = [];
try {
    results = JSON.parse(fs.readFileSync(reportJson, 'utf8'));
} catch (e) {
    console.error('No report.json found — did the DAST runner finish?', e.message);
    process.exit(1);
}

const findings   = results.filter(r => r.finding);
const passed     = results.filter(r => !r.finding);
const bySev      = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
findings.forEach(f => { if (bySev[f.severity] !== undefined) bySev[f.severity]++; });

const runDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

function sevColor(s) {
    return { CRITICAL: '#dc2626', HIGH: '#ea580c', MEDIUM: '#d97706', LOW: '#16a34a', INFO: '#6366f1' }[s] || '#64748b';
}
function sevBg(s) {
    return { CRITICAL: '#fef2f2', HIGH: '#fff7ed', MEDIUM: '#fffbeb', LOW: '#f0fdf4', INFO: '#eef2ff' }[s] || '#f8fafc';
}

function tableRows(rows) {
    return rows.map(r => `
        <tr style="border-bottom:1px solid #e2e8f0; background:${r.finding ? sevBg(r.severity) : '#ffffff'}">
            <td style="padding:10px 12px; font-size:0.78rem; color:#475569; font-family:monospace">${r.method}</td>
            <td style="padding:10px 12px; font-size:0.78rem; font-family:monospace; word-break:break-all">${r.endpoint}</td>
            <td style="padding:10px 12px; font-size:0.78rem; text-align:center">
                <span style="background:${r.finding ? sevColor(r.severity) : '#22c55e'}; color:#fff; padding:2px 8px; border-radius:9999px; font-size:0.72rem; font-weight:700">
                    ${r.finding ? r.severity : 'PASS'}
                </span>
            </td>
            <td style="padding:10px 12px; font-size:0.78rem; text-align:center; color:#64748b">${r.status}</td>
            <td style="padding:10px 12px; font-size:0.78rem; text-align:center; color:#64748b">${r.expected_status}</td>
            <td style="padding:10px 12px; font-size:0.78rem; text-align:right; color:#94a3b8">${r.response_time_ms}ms</td>
            <td style="padding:10px 12px; font-size:0.78rem; color:#334155">${r.note}</td>
            <td style="padding:10px 12px; font-size:0.75rem; color:#94a3b8">${r.test_category}</td>
        </tr>`).join('');
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Aero-Navigator — DAST Security Test Report</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background:#f1f5f9; color:#1e293b; }
  .header { background: linear-gradient(135deg,#0f172a 0%,#1e3a5f 60%,#0f172a 100%); color:#fff; padding:40px 48px; }
  .header h1 { font-size:1.9rem; font-weight:800; letter-spacing:-0.02em; }
  .header p  { margin-top:6px; color:#94a3b8; font-size:0.9rem; }
  .badge     { display:inline-block; padding:3px 12px; border-radius:9999px; font-size:0.8rem; font-weight:700; margin-left:12px; vertical-align:middle; }
  .body      { max-width:1400px; margin:0 auto; padding:32px 24px; }
  .kpi-grid  { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:16px; margin-bottom:32px; }
  .kpi-card  { background:#fff; border-radius:12px; padding:20px 22px; box-shadow:0 1px 3px rgba(0,0,0,.08); border-top:4px solid var(--accent); }
  .kpi-card .label { font-size:0.75rem; color:#64748b; text-transform:uppercase; letter-spacing:0.05em; font-weight:600; }
  .kpi-card .value { font-size:2.1rem; font-weight:800; color:var(--accent); margin-top:6px; }
  .section   { background:#fff; border-radius:12px; box-shadow:0 1px 3px rgba(0,0,0,.08); margin-bottom:24px; overflow:hidden; }
  .section-hd{ padding:18px 24px; border-bottom:1px solid #e2e8f0; font-weight:700; font-size:1rem; display:flex; align-items:center; gap:10px; }
  table      { width:100%; border-collapse:collapse; }
  thead th   { background:#0f172a; color:#fff; padding:11px 12px; font-size:0.78rem; font-weight:600; text-align:left; }
  tr:hover   { background:#f8fafc !important; }
  .cat-tag   { display:inline-block; padding:2px 8px; border-radius:4px; font-size:0.7rem; font-weight:600; background:#e2e8f0; color:#475569; }
  .footer    { text-align:center; padding:24px; font-size:0.8rem; color:#94a3b8; }
  @media (max-width:768px) { thead { display:none; } tr { display:block; margin-bottom:12px; } td { display:block; padding:6px 12px; } }
</style>
</head>
<body>

<div class="header">
  <h1>✈️ Aero-Navigator API
    <span class="badge" style="background:${bySev.CRITICAL > 0 ? '#dc2626' : bySev.HIGH > 0 ? '#ea580c' : '#16a34a'}">
      ${bySev.CRITICAL > 0 ? '🔴 CRITICAL FINDINGS' : bySev.HIGH > 0 ? '🟠 HIGH FINDINGS' : '🟢 ALL CLEAR'}
    </span>
  </h1>
  <p>DAST Security Test Report &nbsp;·&nbsp; Generated: ${runDate} &nbsp;·&nbsp; GitHub Actions CI</p>
</div>

<div class="body">

  <!-- KPI Cards -->
  <div class="kpi-grid">
    <div class="kpi-card" style="--accent:#6366f1">
      <div class="label">Tests Run</div>
      <div class="value">${results.length}</div>
    </div>
    <div class="kpi-card" style="--accent:#22c55e">
      <div class="label">Passed</div>
      <div class="value">${passed.length}</div>
    </div>
    <div class="kpi-card" style="--accent:#dc2626">
      <div class="label">🔴 Critical</div>
      <div class="value">${bySev.CRITICAL}</div>
    </div>
    <div class="kpi-card" style="--accent:#ea580c">
      <div class="label">🟠 High</div>
      <div class="value">${bySev.HIGH}</div>
    </div>
    <div class="kpi-card" style="--accent:#d97706">
      <div class="label">🟡 Medium</div>
      <div class="value">${bySev.MEDIUM}</div>
    </div>
    <div class="kpi-card" style="--accent:#16a34a">
      <div class="label">🟢 Low</div>
      <div class="value">${bySev.LOW}</div>
    </div>
    <div class="kpi-card" style="--accent:#64748b">
      <div class="label">Total Findings</div>
      <div class="value">${findings.length}</div>
    </div>
  </div>

  <!-- Findings Table -->
  <div class="section">
    <div class="section-hd">
      <span>🚨</span>
      <span>Security Findings (${findings.length})</span>
    </div>
    <div style="overflow-x:auto">
    <table>
      <thead>
        <tr>
          <th>Method</th><th>Endpoint</th><th>Severity</th>
          <th>Status</th><th>Expected</th><th>Time</th><th>Finding Detail</th><th>Category</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows(findings)}
      </tbody>
    </table>
    </div>
  </div>

  <!-- Passed Tests Table -->
  <div class="section">
    <div class="section-hd">
      <span>✅</span>
      <span>Passed Tests (${passed.length})</span>
    </div>
    <div style="overflow-x:auto">
    <table>
      <thead>
        <tr>
          <th>Method</th><th>Endpoint</th><th>Result</th>
          <th>Status</th><th>Expected</th><th>Time</th><th>Note</th><th>Category</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows(passed)}
      </tbody>
    </table>
    </div>
  </div>

  <!-- Category Breakdown -->
  <div class="section">
    <div class="section-hd"><span>📊</span><span>Test Category Breakdown</span></div>
    <div style="padding:20px 24px; display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:12px">
      ${[...new Set(results.map(r => r.test_category))].map(cat => {
          const catResults  = results.filter(r => r.test_category === cat);
          const catFindings = catResults.filter(r => r.finding).length;
          return `
          <div style="background:#f8fafc; border-radius:8px; padding:14px 16px; border:1px solid #e2e8f0">
            <div style="font-size:0.75rem; font-weight:700; color:#475569; text-transform:uppercase">${cat}</div>
            <div style="margin-top:6px; font-size:0.85rem; color:#334155">${catResults.length} tests · <span style="color:${catFindings > 0 ? '#dc2626' : '#16a34a'};font-weight:700">${catFindings} finding${catFindings !== 1 ? 's' : ''}</span></div>
          </div>`;
      }).join('')}
    </div>
  </div>

</div>

<div class="footer">
  Aero-Navigator DAST Suite · GitHub Actions Run · ${runDate}
</div>

</body>
</html>`;

fs.writeFileSync(outputHtml, html, 'utf8');
console.log(`✅ HTML report generated: ${outputHtml}`);
