/**
 * GitHub Actions Step Summary Printer
 * Reads report.json and writes Markdown to stdout for $GITHUB_STEP_SUMMARY
 */

const fs   = require('fs');
const path = require('path');

const reportJson = path.join(__dirname, 'report.json');
let results = [];
try {
    results = JSON.parse(fs.readFileSync(reportJson, 'utf8'));
} catch (e) {
    console.log('> ⚠️ Could not read report.json');
    process.exit(0);
}

const findings = results.filter(r => r.finding);
const passed   = results.filter(r => !r.finding);
const bySev    = { CRITICAL: [], HIGH: [], MEDIUM: [], LOW: [] };
findings.forEach(f => { if (bySev[f.severity]) bySev[f.severity].push(f); });

const sevIcon = { CRITICAL: '🔴', HIGH: '🟠', MEDIUM: '🟡', LOW: '🟢' };

let md = '';

md += `# ✈️ Aero-Navigator — DAST Security Report\n\n`;
md += `> **${new Date().toISOString()}** · GitHub Actions CI Run\n\n`;

// Summary table
md += `## 📊 Summary\n\n`;
md += `| Metric | Count |\n|--------|-------|\n`;
md += `| ✅ Tests Run | **${results.length}** |\n`;
md += `| ✅ Passed | **${passed.length}** |\n`;
md += `| 🚨 Total Findings | **${findings.length}** |\n`;
md += `| 🔴 Critical | **${bySev.CRITICAL.length}** |\n`;
md += `| 🟠 High | **${bySev.HIGH.length}** |\n`;
md += `| 🟡 Medium | **${bySev.MEDIUM.length}** |\n`;
md += `| 🟢 Low | **${bySev.LOW.length}** |\n\n`;

// Findings by severity
['CRITICAL','HIGH','MEDIUM','LOW'].forEach(sev => {
    const list = bySev[sev];
    if (list.length === 0) return;
    md += `## ${sevIcon[sev]} ${sev} Findings (${list.length})\n\n`;
    md += `| Method | Endpoint | Category | Detail |\n|--------|----------|----------|--------|\n`;
    list.forEach(f => {
        md += `| \`${f.method}\` | \`${f.endpoint}\` | \`${f.test_category}\` | ${f.note} |\n`;
    });
    md += `\n`;
});

// Passed
md += `## ✅ Passed Tests (${passed.length})\n\n`;
md += `| Method | Endpoint | Status | Category |\n|--------|----------|--------|----------|\n`;
passed.forEach(p => {
    md += `| \`${p.method}\` | \`${p.endpoint}\` | ${p.status} | \`${p.test_category}\` |\n`;
});

md += `\n---\n_Full report available in the \`dast-security-report\` artifact (JSON + HTML)_\n`;

process.stdout.write(md);
