/**
 * Selenium — Website E2E Tests (HTTP-based)
 * Tests all public pages and API flows end-to-end
 */
const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const results = [];

function req(method, url, body = null) {
    return new Promise(resolve => {
        const u   = new URL(url);
        const mod = u.protocol === 'https:' ? https : http;
        const t0  = Date.now();
        const opt = {
            hostname: u.hostname, port: u.port || 80,
            path: u.pathname + u.search, method,
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'Aero-E2E/1.0' },
            timeout: 8000,
        };
        const r = mod.request(opt, res => {
            let raw = '';
            res.on('data', c => raw += c);
            res.on('end', () => resolve({ status: res.statusCode, body: raw, ms: Date.now() - t0 }));
        });
        r.on('error', e => resolve({ status: 0, body: e.message, ms: Date.now() - t0 }));
        r.on('timeout', () => { r.destroy(); resolve({ status: 0, body: 'TIMEOUT', ms: 8000 }); });
        if (body) r.write(JSON.stringify(body));
        r.end();
    });
}

function record(name, result, expected, note = '') {
    const pass = Array.isArray(expected) ? expected.includes(result.status) : result.status === expected;
    const row  = { test: name, status: result.status, expected, pass, ms: result.ms, note, category: 'SELENIUM' };
    results.push(row);
    console.log(`  ${pass ? '✓' : '✗'} [${result.status}] ${name} (${result.ms}ms)${note ? ' — ' + note : ''}`);
    return pass;
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
    console.log('\n══════════════════════════════════════════════════');
    console.log('  🌐  Selenium — Website E2E Tests');
    console.log(`  Target: ${BASE}`);
    console.log('══════════════════════════════════════════════════\n');

    // Page load tests
    console.log('── Page Availability ──');
    record('Homepage loads', await req('GET', `${BASE}/`), [200, 301, 302], 'HTML root');
    await sleep(100);

    // Public API E2E flows
    console.log('\n── Flight Search Flow ──');
    const flights = await req('GET', `${BASE}/api/flights?from=MAA&to=LHR`);
    record('Flight search MAA→LHR', flights, 200);
    record('Flight search DEL→DXB', await req('GET', `${BASE}/api/flights?from=DEL&to=DXB`), 200);
    await sleep(100);

    console.log('\n── Price Intelligence Flow ──');
    record('Price history BOM→SIN', await req('GET', `${BASE}/api/price-history?from=BOM&to=SIN`), 200);
    record('Price prediction MAA→LHR', await req('GET', `${BASE}/api/predict?from=MAA&to=LHR`), 200);
    record('Route optimizer MAA→CDG', await req('GET', `${BASE}/api/optimize?from=MAA&to=CDG`), 200);
    await sleep(100);

    console.log('\n── Sentiment & Weather Flow ──');
    record('Sentiment analysis', await req('GET', `${BASE}/api/sentiment?from=MAA&to=LHR`), 200);
    record('Weather data London', await req('GET', `${BASE}/api/weather?to=london`), 200);
    await sleep(100);

    console.log('\n── Session & Auth Flow ──');
    record('Session check (unauth)', await req('GET', `${BASE}/api/session`), 401, 'should be 401');
    record('Register with valid email', await req('POST', `${BASE}/api/register`, { name: 'E2E User', email: 'e2e_test_user@selenium.io' }), [200, 201, 409], 'new or existing');
    record('Login with registered email', await req('POST', `${BASE}/api/login`, { email: 'e2e_test_user@selenium.io' }), [200, 201], 'email-only login');
    await sleep(100);

    console.log('\n── GPS Tracking Flow ──');
    const gps = await req('POST', `${BASE}/api/gps/start`, { lat: 13.08, lon: 80.27 });
    record('GPS session start', gps, 200);
    let token = null;
    try { token = JSON.parse(gps.body).token; } catch(_) {}
    if (token) {
        record('GPS update coords', await req('POST', `${BASE}/api/gps/${token}/update`, { lat: 13.09, lon: 80.28 }), 200);
        record('GPS read session', await req('GET', `${BASE}/api/gps/${token}`), 200);
    }
    await sleep(100);

    console.log('\n── Flight Track Flow ──');
    const track = await req('POST', `${BASE}/api/track/start`, {
        flight: { airline: 'Air India', flight_no: 'AI101', status: 'In-Air', price: 5000 },
        fromCoords: { lat: 13.08, lon: 80.27 }, toCoords: { lat: 51.47, lon: -0.45 }
    });
    record('Track session start', track, 200);
    let trackId = null;
    try { trackId = JSON.parse(track.body).trackId; } catch(_) {}
    if (trackId) {
        record('Track session read', await req('GET', `${BASE}/api/track/${trackId}`), 200);
    }
    await sleep(100);

    console.log('\n── AI Chatbot Flow ──');
    record('Chat: flight query', await req('POST', `${BASE}/api/chat`, { message: 'Find flights from Chennai to London' }), 200);
    record('Chat: price query', await req('POST', `${BASE}/api/chat`, { message: 'What is the best time to buy tickets?' }), 200);

    // Summary
    const passed = results.filter(r => r.pass).length;
    const failed = results.filter(r => !r.pass).length;
    console.log('\n══════════════════════════════════════════════════');
    console.log(` Selenium E2E: ${passed} passed / ${failed} failed / ${results.length} total`);
    console.log('══════════════════════════════════════════════════\n');

    fs.writeFileSync(path.join(__dirname, 'selenium_results.json'), JSON.stringify({ summary: { passed, failed, total: results.length }, results }, null, 2));
    if (failed > 0) process.exit(1);
})();
