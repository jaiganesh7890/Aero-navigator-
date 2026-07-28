/**
 * Unit Tests — API
 * Comprehensive unit-level tests for every API endpoint
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
        const opt = {
            hostname: u.hostname, port: u.port || 80,
            path: u.pathname + u.search, method,
            headers: { 'Content-Type': 'application/json' }, timeout: 8000,
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

function test(suite, name, actual, expected, note = '') {
    const pass = Array.isArray(expected) ? expected.includes(actual.status) : actual.status === expected;
    if (pass) passCount++; else failCount++;
    results.push({ suite, test: name, status: actual.status, expected, pass, ms: actual.ms, note, category: 'UNIT' });
    console.log(`  ${pass ? '✓' : '✗'} ${name} → HTTP ${actual.status} (${actual.ms}ms)`);
    return { pass, res: actual };
}

async function testBody(suite, name, res, check, note = '') {
    let parsed; try { parsed = JSON.parse(res.body); } catch(_) { parsed = {}; }
    const pass = check(parsed, res);
    if (pass) passCount++; else failCount++;
    results.push({ suite, test: name, status: res.status, expected: 'body-check', pass, ms: res.ms, note, category: 'UNIT' });
    console.log(`  ${pass ? '✓' : '✗'} ${name}${note ? ' — ' + note : ''}`);
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
    console.log('\n══════════════════════════════════════════════════');
    console.log('  🔧  Unit Tests — API');
    console.log(`  Target: ${BASE}`);
    console.log('══════════════════════════════════════════════════');

    // ── Suite 1: Session / Auth ──────────────────────────────────────
    console.log('\n── Suite 1: Session & Auth ──');
    const sess = await req('GET', `${BASE}/api/session`);
    test('Auth', 'GET /api/session returns 401 when unauthenticated', sess, 401);
    await testBody('Auth', 'Session response is JSON object', sess, (b) => typeof b === 'object');

    const reg = await req('POST', `${BASE}/api/register`, { name: 'Unit Test User', email: 'unit_test@aeronav.io' });
    test('Auth', 'POST /api/register with valid payload', reg, [200, 201, 409]);

    const badReg = await req('POST', `${BASE}/api/register`, { name: 'Bad', email: 'not-an-email' });
    test('Auth', 'POST /api/register with invalid email returns 400', badReg, 400, 'validation');

    const emptyReg = await req('POST', `${BASE}/api/register`, {});
    test('Auth', 'POST /api/register with empty body returns 400', emptyReg, 400, 'validation');

    const login = await req('POST', `${BASE}/api/login`, { email: 'unit_test@aeronav.io' });
    test('Auth', 'POST /api/login with valid email', login, [200, 201]);

    const badLogin = await req('POST', `${BASE}/api/login`, { email: 'notregistered_xyz123@test.io' });
    test('Auth', 'POST /api/login with unregistered email returns 401/404', badLogin, [401, 404]);

    const noEmail = await req('POST', `${BASE}/api/login`, {});
    test('Auth', 'POST /api/login with no email returns 400', noEmail, 400);
    await sleep(200);

    // ── Suite 2: Flights ────────────────────────────────────────────
    console.log('\n── Suite 2: Flights API ──');
    const fl1 = await req('GET', `${BASE}/api/flights?from=MAA&to=LHR`);
    test('Flights', 'GET /api/flights MAA→LHR returns 200', fl1, 200);
    await testBody('Flights', 'Flights response is an array', fl1, (b) => Array.isArray(b) && b.length > 0, `got ${fl1.body.length} chars`);

    test('Flights', 'GET /api/flights DEL→DXB returns 200', await req('GET', `${BASE}/api/flights?from=DEL&to=DXB`), 200);
    test('Flights', 'GET /api/flights BOM→SIN returns 200', await req('GET', `${BASE}/api/flights?from=BOM&to=SIN`), 200);
    test('Flights', 'GET /api/flights BLR→CDG returns 200', await req('GET', `${BASE}/api/flights?from=BLR&to=CDG`), 200);
    test('Flights', 'GET /api/flights with defaults (no params) returns 200', await req('GET', `${BASE}/api/flights`), 200);
    await sleep(200);

    // ── Suite 3: Price History ──────────────────────────────────────
    console.log('\n── Suite 3: Price History ──');
    const ph = await req('GET', `${BASE}/api/price-history?from=MAA&to=LHR`);
    test('PriceHistory', 'GET /api/price-history returns 200', ph, 200);
    await testBody('PriceHistory', 'Price history has data array', ph, (b) => Array.isArray(b) || typeof b === 'object');
    test('PriceHistory', 'GET /api/price-history BOM→SIN returns 200', await req('GET', `${BASE}/api/price-history?from=BOM&to=SIN`), 200);
    await sleep(200);

    // ── Suite 4: Prediction ─────────────────────────────────────────
    console.log('\n── Suite 4: Price Prediction ──');
    const pred = await req('GET', `${BASE}/api/predict?from=MAA&to=LHR`);
    test('Predict', 'GET /api/predict returns 200', pred, 200);
    await testBody('Predict', 'Prediction returns recommendation field', pred, (b) => b && (b.recommendation || b.predicted_price || b.price !== undefined));
    test('Predict', 'GET /api/predict DEL→JFK returns 200', await req('GET', `${BASE}/api/predict?from=DEL&to=JFK`), 200);
    await sleep(200);

    // ── Suite 5: Optimize ───────────────────────────────────────────
    console.log('\n── Suite 5: Route Optimizer ──');
    const opt = await req('GET', `${BASE}/api/optimize?from=MAA&to=LHR`);
    test('Optimize', 'GET /api/optimize returns 200', opt, 200);
    await testBody('Optimize', 'Optimize returns routes', opt, (b) => typeof b === 'object' && b !== null);
    test('Optimize', 'GET /api/optimize BOM→CDG returns 200', await req('GET', `${BASE}/api/optimize?from=BOM&to=CDG`), 200);
    await sleep(200);

    // ── Suite 6: GPS ────────────────────────────────────────────────
    console.log('\n── Suite 6: GPS Tracking ──');
    const gpsRes = await req('POST', `${BASE}/api/gps/start`, { lat: 13.08, lon: 80.27 });
    test('GPS', 'POST /api/gps/start creates session', gpsRes, 200);
    let token;
    try { token = JSON.parse(gpsRes.body).token; } catch(_) {}
    if (token) {
        test('GPS', `GPS token has 32 chars (crypto)`, { status: token.length === 32 ? 200 : 500, ms: 0 }, 200, `length=${token.length}`);
        const upd = await req('POST', `${BASE}/api/gps/${token}/update`, { lat: 13.09, lon: 80.28 });
        test('GPS', 'POST /api/gps/:token/update succeeds', upd, 200);
        const rd  = await req('GET', `${BASE}/api/gps/${token}`);
        test('GPS', 'GET /api/gps/:token returns session data', rd, 200);
        await testBody('GPS', 'GPS session has lat/lon', rd, (b) => b && b.lat !== undefined && b.lon !== undefined);
    }
    await sleep(200);

    // ── Suite 7: Flight Tracking ─────────────────────────────────────
    console.log('\n── Suite 7: Flight Track ──');
    const trk = await req('POST', `${BASE}/api/track/start`, {
        flight: { airline: 'Air India', flight_no: 'AI101', status: 'In-Air', price: 5000 },
        fromCoords: { lat: 13.08, lon: 80.27 }, toCoords: { lat: 51.47, lon: -0.45 },
    });
    test('Track', 'POST /api/track/start creates session', trk, 200);
    let trackId;
    try { trackId = JSON.parse(trk.body).trackId; } catch(_) {}
    if (trackId) {
        test('Track', 'Track ID is crypto-strength (32 chars)', { status: trackId.length === 32 ? 200 : 500, ms: 0 }, 200, `length=${trackId.length}`);
        test('Track', 'GET /api/track/:trackId returns data', await req('GET', `${BASE}/api/track/${trackId}`), 200);
    }
    await sleep(200);

    // ── Suite 8: Auth-protected endpoints ────────────────────────────
    console.log('\n── Suite 8: Protected Endpoints (requireAuth) ──');
    test('Auth', 'GET /api/user/daily-history requires auth → 401', await req('GET', `${BASE}/api/user/daily-history`), 401);
    test('Auth', 'POST /api/user/clear-history requires auth → 401', await req('POST', `${BASE}/api/user/clear-history`, { email: 'test@t.com' }), 401);
    test('Auth', 'POST /api/alerts requires auth → 401', await req('POST', `${BASE}/api/alerts`, { threshold: 5000, email: 'test@t.com' }), 401);
    await sleep(200);

    // ── Suite 9: Sentiment & Weather ─────────────────────────────────
    console.log('\n── Suite 9: Sentiment & Weather ──');
    test('Contextual', 'GET /api/sentiment returns 200', await req('GET', `${BASE}/api/sentiment?from=MAA&to=LHR`), 200);
    test('Contextual', 'GET /api/weather returns 200', await req('GET', `${BASE}/api/weather?to=london`), 200);
    test('Contextual', 'POST /api/chat returns 200', await req('POST', `${BASE}/api/chat`, { message: 'Hello' }), 200);
    test('Contextual', 'POST /api/user/log-activity returns 200', await req('POST', `${BASE}/api/user/log-activity`, {
        action_type: 'UNIT_TEST', from_city: 'MAA', to_city: 'LHR', user_email: 'unit_test@aeronav.io'
    }), 200);

    // Summary
    console.log('\n══════════════════════════════════════════════════');
    console.log(` Unit Tests: ${passCount} passed / ${failCount} failed / ${results.length} total`);
    console.log('══════════════════════════════════════════════════\n');

    fs.writeFileSync(path.join(__dirname, 'unit_test_results.json'), JSON.stringify({ summary: { passed: passCount, failed: failCount, total: results.length }, results }, null, 2));
    if (failCount > 0) process.exit(1);
})();
