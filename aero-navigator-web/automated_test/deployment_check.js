/**
 * Deployment Status Check — Health checks on all 21 endpoints
 * Verifies the deployment is healthy and all routes respond correctly
 */
const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const results = [];
let passCount = 0, failCount = 0;

function req(method, url, body = null) {
    return new Promise(resolve => {
        const u   = new URL(url);
        const mod = u.protocol === 'https:' ? https : http;
        const t0  = Date.now();
        const opt = { hostname: u.hostname, port: u.port || 80, path: u.pathname + u.search, method, headers: { 'Content-Type': 'application/json' }, timeout: 8000 };
        const r = mod.request(opt, res => { let raw = ''; res.on('data', c => raw += c); res.on('end', () => resolve({ status: res.statusCode, body: raw, ms: Date.now() - t0, headers: res.headers })); });
        r.on('error', e => resolve({ status: 0, body: e.message, ms: Date.now() - t0, headers: {} }));
        r.on('timeout', () => { r.destroy(); resolve({ status: 0, body: 'TIMEOUT', ms: 8000, headers: {} }); });
        if (body) r.write(JSON.stringify(body));
        r.end();
    });
}

function check(name, result, expectedStatus, maxMs = 3000, note = '') {
    const statusOk = Array.isArray(expectedStatus) ? expectedStatus.includes(result.status) : result.status === expectedStatus;
    const timeOk   = result.ms <= maxMs;
    const pass     = statusOk && timeOk;
    if (pass) passCount++; else failCount++;
    const label = pass ? '✓' : '✗';
    const timeFlag = timeOk ? '' : ` ⚠️ SLOW (${result.ms}ms > ${maxMs}ms SLA)`;
    results.push({ test: name, status: result.status, expectedStatus, ms: result.ms, maxMs, pass, note: note + timeFlag, category: 'DEPLOYMENT' });
    console.log(`  ${label} [${result.status}] ${name} — ${result.ms}ms${timeFlag}`);
    return pass;
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
    console.log('\n══════════════════════════════════════════════════');
    console.log('  🚀  Deployment Status Check');
    console.log(`  Target: ${BASE}`);
    console.log('══════════════════════════════════════════════════');

    // ── Heartbeat ────────────────────────────────────────────────
    console.log('\n── Heartbeat / Reachability ──');
    const heartbeat = await req('GET', `${BASE}/api/session`);
    check('Server reachable (heartbeat)', heartbeat, [200, 401], 2000, 'must respond in < 2s');
    console.log(`  ℹ️  Server responded in ${heartbeat.ms}ms`);
    await sleep(100);

    // ── Public API Endpoints ──────────────────────────────────────
    console.log('\n── Public API Endpoints Health ──');
    check('GET  /api/flights',              await req('GET', `${BASE}/api/flights?from=MAA&to=LHR`), 200, 3000);
    await sleep(50);
    check('GET  /api/price-history',        await req('GET', `${BASE}/api/price-history?from=MAA&to=LHR`), 200, 3000);
    await sleep(50);
    check('GET  /api/predict',              await req('GET', `${BASE}/api/predict?from=MAA&to=LHR`), 200, 3000);
    await sleep(50);
    check('GET  /api/optimize',             await req('GET', `${BASE}/api/optimize?from=MAA&to=LHR`), 200, 3000);
    await sleep(50);
    check('GET  /api/sentiment',            await req('GET', `${BASE}/api/sentiment?from=MAA&to=LHR`), 200, 3000);
    await sleep(50);
    check('GET  /api/weather',              await req('GET', `${BASE}/api/weather?to=london`), 200, 5000);
    await sleep(100);

    // ── Auth Endpoints ─────────────────────────────────────────
    console.log('\n── Auth Endpoints Health ──');
    check('GET  /api/session  (401 expected)', await req('GET', `${BASE}/api/session`), 401, 1000);
    check('POST /api/register (create user)',  await req('POST', `${BASE}/api/register`, { name: 'Deploy Check', email: 'deploycheck@aeronav.io' }), [200, 201, 409], 2000);
    check('POST /api/login    (email login)',  await req('POST', `${BASE}/api/login`, { email: 'deploycheck@aeronav.io' }), [200, 201], 2000);
    check('POST /api/logout   (logout)',       await req('POST', `${BASE}/api/logout`), [200, 302], 1000);
    await sleep(100);

    // ── Protected Route Blocks ─────────────────────────────────
    console.log('\n── Protected Routes (must block unauthenticated) ──');
    check('GET  /api/user/daily-history  → 401', await req('GET', `${BASE}/api/user/daily-history`), 401, 1000, 'requireAuth');
    check('POST /api/user/clear-history  → 401', await req('POST', `${BASE}/api/user/clear-history`, {}), 401, 1000, 'requireAuth');
    check('POST /api/alerts              → 401', await req('POST', `${BASE}/api/alerts`, {}), 401, 1000, 'requireAuth');
    await sleep(100);

    // ── AI / Chat Endpoint ─────────────────────────────────────
    console.log('\n── AI Services Health ──');
    check('POST /api/chat (AI assistant)', await req('POST', `${BASE}/api/chat`, { message: 'deployment health check' }), 200, 5000);
    await sleep(100);

    // ── GPS / Track Services ───────────────────────────────────
    console.log('\n── GPS & Tracking Services Health ──');
    const gpsRes = await req('POST', `${BASE}/api/gps/start`, { lat: 13.08, lon: 80.27 });
    check('POST /api/gps/start', gpsRes, 200, 2000);
    let token;
    try { token = JSON.parse(gpsRes.body).token; } catch(_) {}
    if (token) {
        check(`GET  /api/gps/:token  (read)`,    await req('GET', `${BASE}/api/gps/${token}`), 200, 2000);
        check(`POST /api/gps/:token/update`,      await req('POST', `${BASE}/api/gps/${token}/update`, { lat: 13.09, lon: 80.28 }), 200, 2000);
        check(`GET  /live/gps/:token  (stream)`,  await req('GET', `${BASE}/live/gps/${token}`), [200, 206, 400, 404], 3000, 'SSE endpoint');
    }
    const trkRes = await req('POST', `${BASE}/api/track/start`, {
        flight: { airline: 'Air India', flight_no: 'AI101', status: 'In-Air', price: 5000 },
        fromCoords: { lat: 13.08, lon: 80.27 }, toCoords: { lat: 51.47, lon: -0.45 },
    });
    check('POST /api/track/start', trkRes, 200, 2000);
    let trackId;
    try { trackId = JSON.parse(trkRes.body).trackId; } catch(_) {}
    if (trackId) {
        check(`GET  /api/track/:trackId`, await req('GET', `${BASE}/api/track/${trackId}`), 200, 2000);
    }

    // ── Activity Logging ──────────────────────────────────────
    console.log('\n── Activity Logging ──');
    check('POST /api/user/log-activity', await req('POST', `${BASE}/api/user/log-activity`, {
        action_type: 'DEPLOY_CHECK', from_city: 'MAA', to_city: 'LHR', user_email: 'deploycheck@aeronav.io'
    }), 200, 2000);

    // ── SLA Performance Check ─────────────────────────────────
    console.log('\n── SLA Performance Summary ──');
    const slowTests = results.filter(r => r.ms > 2000);
    const p95ms     = [...results].sort((a, b) => a.ms - b.ms)[Math.floor(results.length * 0.95)]?.ms || 0;
    const avgMs     = Math.round(results.reduce((a, r) => a + r.ms, 0) / results.length);
    console.log(`  ⏱️  Avg response: ${avgMs}ms | P95: ${p95ms}ms | Slow endpoints: ${slowTests.length}`);
    if (slowTests.length > 0) console.log(`  ⚠️  Slow: ${slowTests.map(t => `${t.test}(${t.ms}ms)`).join(', ')}`);

    // Summary
    console.log('\n══════════════════════════════════════════════════');
    console.log(` Deployment: ${passCount} passed / ${failCount} failed / ${results.length} total`);
    console.log(` Avg: ${avgMs}ms  |  P95: ${p95ms}ms`);
    console.log('══════════════════════════════════════════════════\n');

    fs.writeFileSync(path.join(__dirname, 'deployment_results.json'), JSON.stringify({
        summary: { passed: passCount, failed: failCount, total: results.length, avgMs, p95ms },
        results
    }, null, 2));
    if (failCount > 0) process.exit(1);
})();
