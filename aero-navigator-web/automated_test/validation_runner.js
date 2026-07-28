/**
 * Validation Tests — Input validation, boundary conditions, error handling
 */
const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const results = [];
let passCount = 0, failCount = 0;

function req(method, url, body = null, headers = {}) {
    return new Promise(resolve => {
        const u   = new URL(url);
        const mod = u.protocol === 'https:' ? https : http;
        const t0  = Date.now();
        const opt = { hostname: u.hostname, port: u.port || 80, path: u.pathname + u.search, method, headers: { 'Content-Type': 'application/json', ...headers }, timeout: 8000 };
        const r = mod.request(opt, res => { let raw = ''; res.on('data', c => raw += c); res.on('end', () => resolve({ status: res.statusCode, body: raw, ms: Date.now() - t0 })); });
        r.on('error', e => resolve({ status: 0, body: e.message, ms: Date.now() - t0 }));
        r.on('timeout', () => { r.destroy(); resolve({ status: 0, body: 'TIMEOUT', ms: 8000 }); });
        if (body) r.write(typeof body === 'string' ? body : JSON.stringify(body));
        r.end();
    });
}

function test(suite, name, result, expected, note = '') {
    const pass = Array.isArray(expected) ? expected.includes(result.status) : result.status === expected;
    if (pass) passCount++; else failCount++;
    results.push({ suite, test: name, status: result.status, expected, pass, ms: result.ms, note, category: 'VALIDATION' });
    console.log(`  ${pass ? '✓' : '✗'} ${name} → HTTP ${result.status} (${result.ms}ms)`);
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
    console.log('\n══════════════════════════════════════════════════');
    console.log('  ✅  Validation Tests');
    console.log(`  Target: ${BASE}`);
    console.log('══════════════════════════════════════════════════');

    // ── Suite 1: Email Validation ──────────────────────────────────
    console.log('\n── Suite 1: Email Format Validation ──');
    test('EmailVal', 'Register: no @ symbol → 400',         await req('POST', `${BASE}/api/register`, { name: 'X', email: 'notanemail' }), 400);
    test('EmailVal', 'Register: empty email → 400',          await req('POST', `${BASE}/api/register`, { name: 'X', email: '' }), 400);
    test('EmailVal', 'Register: null email → 400',           await req('POST', `${BASE}/api/register`, { name: 'X', email: null }), 400);
    test('EmailVal', 'Register: missing email field → 400',  await req('POST', `${BASE}/api/register`, { name: 'X' }), 400);
    test('EmailVal', 'Register: valid email → 200/201/409',  await req('POST', `${BASE}/api/register`, { name: 'Validation', email: 'validation_suite@aeronav.io' }), [200, 201, 409]);
    test('EmailVal', 'Login: no @ symbol → 400',             await req('POST', `${BASE}/api/login`, { email: 'invalid' }), 400);
    test('EmailVal', 'Login: empty string → 400',            await req('POST', `${BASE}/api/login`, { email: '' }), 400);
    test('EmailVal', 'Login: missing email key → 400',       await req('POST', `${BASE}/api/login`, {}), 400);
    await sleep(200);

    // ── Suite 2: Body / Payload Validation ────────────────────────
    console.log('\n── Suite 2: Payload Validation ──');
    test('PayloadVal', 'POST /api/chat no message body → 200/400',    await req('POST', `${BASE}/api/chat`, {}), [200, 400]);
    test('PayloadVal', 'POST /api/chat empty message → 200/400',      await req('POST', `${BASE}/api/chat`, { message: '' }), [200, 400]);
    test('PayloadVal', 'POST /api/chat valid message → 200',          await req('POST', `${BASE}/api/chat`, { message: 'Hello' }), 200);
    test('PayloadVal', 'POST /api/gps/start no body → 200/400',       await req('POST', `${BASE}/api/gps/start`, {}), [200, 400]);
    test('PayloadVal', 'POST /api/gps/start with coords → 200',       await req('POST', `${BASE}/api/gps/start`, { lat: 13.08, lon: 80.27 }), 200);
    test('PayloadVal', 'POST /api/track/start no body → 200/400/500', await req('POST', `${BASE}/api/track/start`, {}), [200, 400, 500]);
    await sleep(200);

    // ── Suite 3: Query Param Validation ───────────────────────────
    console.log('\n── Suite 3: Query Parameter Validation ──');
    test('QueryVal', 'GET /api/flights no params → 200 (defaults)',          await req('GET', `${BASE}/api/flights`), 200);
    test('QueryVal', 'GET /api/flights empty from/to → 200 (defaults)',     await req('GET', `${BASE}/api/flights?from=&to=`), 200);
    test('QueryVal', 'GET /api/flights same origin/dest → 200',             await req('GET', `${BASE}/api/flights?from=MAA&to=MAA`), 200);
    test('QueryVal', 'GET /api/price-history no params → 200 (defaults)',   await req('GET', `${BASE}/api/price-history`), 200);
    test('QueryVal', 'GET /api/predict no params → 200 (defaults)',         await req('GET', `${BASE}/api/predict`), 200);
    test('QueryVal', 'GET /api/optimize no params → 200 (defaults)',        await req('GET', `${BASE}/api/optimize`), 200);
    test('QueryVal', 'GET /api/weather no params → 200 (defaults)',         await req('GET', `${BASE}/api/weather`), 200);
    test('QueryVal', 'GET /api/sentiment no params → 200 (defaults)',       await req('GET', `${BASE}/api/sentiment`), 200);
    await sleep(200);

    // ── Suite 4: Content-Type & Method Validation ─────────────────
    console.log('\n── Suite 4: Method & Content-Type Checks ──');
    test('MethodVal', 'POST to GET-only /api/flights → 404/405', await req('POST', `${BASE}/api/flights`, {}), [404, 405]);
    test('MethodVal', 'GET to POST-only /api/login → 404/405',   await req('GET', `${BASE}/api/login`), [404, 405]);
    test('MethodVal', 'PUT /api/flights (unsupported) → 404/405', await req('PUT', `${BASE}/api/flights`, {}), [404, 405]);
    await sleep(200);

    // ── Suite 5: Large Input / Boundary ──────────────────────────
    console.log('\n── Suite 5: Boundary & Stress Inputs ──');
    const longStr = 'A'.repeat(5000);
    test('BoundaryVal', 'Chat with 5000-char message → 200/400/413',         await req('POST', `${BASE}/api/chat`, { message: longStr }), [200, 400, 413]);
    test('BoundaryVal', 'Register with 5000-char name → 200/201/400/409',    await req('POST', `${BASE}/api/register`, { name: longStr, email: 'longname@aeronav.io' }), [200, 201, 400, 409]);
    test('BoundaryVal', 'Flight from with 500-char code → 200',              await req('GET', `${BASE}/api/flights?from=${'X'.repeat(500)}&to=LHR`), 200);
    await sleep(200);

    // ── Suite 6: GPS Token Validation ─────────────────────────────
    console.log('\n── Suite 6: GPS Token Validation ──');
    test('TokenVal', 'GET /api/gps/invalidtoken → 404/200/500',    await req('GET', `${BASE}/api/gps/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`), [200, 404, 500]);
    test('TokenVal', 'GET /api/track/invalidtoken → 404/200/500',  await req('GET', `${BASE}/api/track/yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy`), [200, 404, 500]);
    test('TokenVal', 'GET /api/gps/empty → 404',                   await req('GET', `${BASE}/api/gps/`), [404, 301, 302]);
    await sleep(200);

    // ── Suite 7: Protected Route Validation ───────────────────────
    console.log('\n── Suite 7: Protected Routes (no session) ──');
    test('AuthVal', 'GET  /api/user/daily-history no auth → 401',       await req('GET', `${BASE}/api/user/daily-history`), 401);
    test('AuthVal', 'POST /api/user/clear-history no auth → 401',       await req('POST', `${BASE}/api/user/clear-history`, { email: 'x@x.com' }), 401);
    test('AuthVal', 'POST /api/alerts no auth → 401',                   await req('POST', `${BASE}/api/alerts`, { threshold: 5000, email: 'x@x.com' }), 401);
    test('AuthVal', 'daily-history with email param no auth → 401',     await req('GET', `${BASE}/api/user/daily-history?email=victim@test.com`), 401);

    // Summary
    console.log('\n══════════════════════════════════════════════════');
    console.log(` Validation: ${passCount} passed / ${failCount} failed / ${results.length} total`);
    console.log('══════════════════════════════════════════════════\n');

    fs.writeFileSync(path.join(__dirname, 'validation_results.json'), JSON.stringify({ summary: { passed: passCount, failed: failCount, total: results.length }, results }, null, 2));
    if (failCount > 0) process.exit(1);
})();
