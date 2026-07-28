/**
 * Appium — Android Mobile API Simulation Tests
 * Simulates mobile app user flows with mobile User-Agents and patterns
 */
const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const results = [];

const MOBILE_HEADERS = {
    'User-Agent'    : 'AeroNavigatorApp/2.0 (Android 14; Pixel 8)',
    'X-App-Platform': 'android',
    'X-App-Version' : '2.0.1',
    'Content-Type'  : 'application/json',
};

function req(method, url, body = null, headers = {}) {
    return new Promise(resolve => {
        const u   = new URL(url);
        const mod = u.protocol === 'https:' ? https : http;
        const t0  = Date.now();
        const opt = {
            hostname: u.hostname, port: u.port || 80,
            path: u.pathname + u.search, method,
            headers: { ...MOBILE_HEADERS, ...headers }, timeout: 8000,
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
    const row  = { test: name, status: result.status, expected, pass, ms: result.ms, note, category: 'APPIUM' };
    results.push(row);
    console.log(`  ${pass ? '✓' : '✗'} [${result.status}] ${name} (${result.ms}ms)`);
    return pass;
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
    console.log('\n══════════════════════════════════════════════════');
    console.log('  📱  Appium — Android Mobile Tests');
    console.log(`  Target: ${BASE}`);
    console.log('══════════════════════════════════════════════════\n');

    // Simulate Android app launch
    console.log('── App Launch Flow (Android) ──');
    record('Session check on launch', await req('GET', `${BASE}/api/session`), 401, 'must be 401 on fresh launch');
    await sleep(100);

    // Search flow (most common mobile action)
    console.log('\n── Flight Search Flow (Mobile) ──');
    record('Search: Chennai → London', await req('GET', `${BASE}/api/flights?from=MAA&to=LHR`), 200);
    record('Search: Delhi → Dubai', await req('GET', `${BASE}/api/flights?from=DEL&to=DXB`), 200);
    record('Search: Mumbai → Singapore', await req('GET', `${BASE}/api/flights?from=BOM&to=SIN`), 200);
    record('Search: Bengaluru → New York', await req('GET', `${BASE}/api/flights?from=BLR&to=JFK`), 200);
    await sleep(100);

    // Price check flow
    console.log('\n── Price Intelligence Flow (Mobile) ──');
    record('Price history MAA→LHR', await req('GET', `${BASE}/api/price-history?from=MAA&to=LHR`), 200);
    record('Fare prediction BOM→DXB', await req('GET', `${BASE}/api/predict?from=BOM&to=DXB`), 200);
    record('Route optimize DEL→SIN', await req('GET', `${BASE}/api/optimize?from=DEL&to=SIN`), 200);
    await sleep(100);

    // Register & login flow
    console.log('\n── Auth Flow (Mobile) ──');
    const regRes = await req('POST', `${BASE}/api/register`, { name: 'Android User', email: 'android_test_appium@aeronav.io' });
    record('Register new mobile account', regRes, [200, 201, 409]);
    const loginRes = await req('POST', `${BASE}/api/login`, { email: 'android_test_appium@aeronav.io' });
    record('Login with mobile account', loginRes, [200, 201]);
    await sleep(100);

    // GPS sharing (key mobile feature)
    console.log('\n── GPS Sharing Flow (Mobile) ──');
    const gpsStart = await req('POST', `${BASE}/api/gps/start`, { lat: 12.97, lon: 77.59 }); // Bangalore
    record('Start GPS broadcast', gpsStart, 200);
    let gpsToken = null;
    try { gpsToken = JSON.parse(gpsStart.body).token; } catch(_) {}
    if (gpsToken) {
        record('Update GPS location', await req('POST', `${BASE}/api/gps/${gpsToken}/update`, { lat: 12.98, lon: 77.60 }), 200);
        record('Read GPS from another device', await req('GET', `${BASE}/api/gps/${gpsToken}`), 200, 'public shared link');
        const tokenLength = gpsToken.length;
        record('GPS token is crypto-strength', { status: tokenLength >= 32 ? 200 : 0, ms: 0 }, 200, `Token: ${tokenLength} chars`);
    }
    await sleep(100);

    // Flight tracking (real-time updates)
    console.log('\n── Flight Tracking Flow (Mobile) ──');
    const trackStart = await req('POST', `${BASE}/api/track/start`, {
        flight    : { airline: 'IndiGo', flight_no: '6E201', status: 'In-Air', price: 4800 },
        fromCoords: { lat: 12.97, lon: 77.59 },
        toCoords  : { lat: 28.55, lon: 77.10 },
    });
    record('Start live track session', trackStart, 200);
    let trackId = null;
    try { trackId = JSON.parse(trackStart.body).trackId; } catch(_) {}
    if (trackId) {
        record('Read track session', await req('GET', `${BASE}/api/track/${trackId}`), 200, 'public tracking link');
    }
    await sleep(100);

    // Weather & context
    console.log('\n── Contextual Info Flow (Mobile) ──');
    record('Weather at destination', await req('GET', `${BASE}/api/weather?to=dubai`), 200);
    record('Market sentiment analysis', await req('GET', `${BASE}/api/sentiment?from=MAA&to=LHR`), 200);
    record('AI chat assistant', await req('POST', `${BASE}/api/chat`, { message: 'Best price for MAA to LHR in October?' }), 200);

    // Summary
    const passed = results.filter(r => r.pass).length;
    const failed = results.filter(r => !r.pass).length;
    console.log('\n══════════════════════════════════════════════════');
    console.log(` Appium Android: ${passed} passed / ${failed} failed / ${results.length} total`);
    console.log('══════════════════════════════════════════════════\n');

    fs.writeFileSync(path.join(__dirname, 'appium_results.json'), JSON.stringify({ summary: { passed, failed, total: results.length }, results }, null, 2));
    if (failed > 0) process.exit(1);
})();
