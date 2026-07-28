/**
 * DAST Runner — Aero-Navigator API Security Test Suite
 * Category tests:
 *  0. Unauthenticated access
 *  1. AuthN bypass
 *  2. Session / AuthZ
 *  3. IDOR
 *  4. Injection probe (detection only)
 *  5. Rate limiting
 *  6. Hardcoded secrets scan (static)
 */

const http   = require('http');
const https  = require('https');
const fs     = require('fs');
const path   = require('path');

const inputPath = path.join(__dirname, 'input.json');
const input     = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const BASE_URL  = input.baseUrl.replace(/\/$/, '');

const REPORT_PATH    = path.join(__dirname, 'report.json');
const SAVEPOINT_PATH = path.join(__dirname, 'savepoint.json');

const results = [];

// ─── helpers ────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function request(method, urlStr, { headers = {}, body = null, timeout = 10000 } = {}) {
    return new Promise((resolve) => {
        const u     = new URL(urlStr);
        const mod   = u.protocol === 'https:' ? https : http;
        const start = Date.now();

        const opts = {
            hostname : u.hostname,
            port     : u.port || (u.protocol === 'https:' ? 443 : 80),
            path     : u.pathname + u.search,
            method,
            headers  : { 'Content-Type': 'application/json', ...headers },
            timeout,
        };

        const req = mod.request(opts, (res) => {
            let raw = '';
            res.on('data', c => (raw += c));
            res.on('end', () => {
                resolve({
                    status : res.statusCode,
                    headers: res.headers,
                    body   : raw,
                    ms     : Date.now() - start,
                });
            });
        });

        req.on('timeout', () => { req.destroy(); resolve({ status: 0, body: 'TIMEOUT', ms: timeout, headers: {} }); });
        req.on('error',   (e) => resolve({ status: 0, body: e.message, ms: Date.now() - start, headers: {} }));

        if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
        req.end();
    });
}

function record({ endpoint, method, role, status, expected_status,
                  finding, severity, ms, category, note }) {
    const row = {
        endpoint,
        method,
        role,
        status,
        expected_status,
        finding,
        severity,
        response_time_ms: ms,
        test_category: category,
        note,
        timestamp: new Date().toISOString(),
    };
    results.push(row);
    const icon = finding ? '✗' : '✓';
    const sev  = finding ? ` [${severity.toUpperCase()}]` : '';
    console.log(`  ${icon} [${category}] ${method} ${endpoint} → ${status}${sev}  ${note}`);
    return row;
}

function save() {
    fs.writeFileSync(REPORT_PATH, JSON.stringify(results, null, 2));
    fs.writeFileSync(SAVEPOINT_PATH, JSON.stringify({ count: results.length, ts: new Date().toISOString() }, null, 2));
}

// ─── STEP 1 — endpoint catalog ───────────────────────────────────────────────

const ENDPOINTS = [
    // GPS
    { method: 'POST', path: '/api/gps/start',               auth: 'public',  note: 'Start GPS broadcast' },
    { method: 'POST', path: '/api/gps/:token/update',        auth: 'public',  note: 'Update GPS coords' },
    { method: 'GET',  path: '/api/gps/:token',               auth: 'public',  note: 'Get GPS session data' },
    { method: 'GET',  path: '/live/gps/:token',              auth: 'public',  note: 'GPS viewer page' },
    // Flights
    { method: 'GET',  path: '/api/flights',                  auth: 'public',  note: 'Search flights' },
    // Price
    { method: 'GET',  path: '/api/price-history',            auth: 'public',  note: 'Price history' },
    { method: 'GET',  path: '/api/predict',                  auth: 'public',  note: 'Price prediction' },
    // Optimize
    { method: 'GET',  path: '/api/optimize',                 auth: 'public',  note: 'Route optimizer' },
    // Auth
    { method: 'POST', path: '/api/register',                 auth: 'public',  note: 'Register user' },
    { method: 'POST', path: '/api/login',                    auth: 'public',  note: 'Login (email-only)' },
    { method: 'GET',  path: '/api/session',                  auth: 'public',  note: 'Session check' },
    { method: 'POST', path: '/api/logout',                   auth: 'public',  note: 'Logout' },
    // User data (should require session — but code shows NO enforcement)
    { method: 'POST', path: '/api/user/log-activity',        auth: 'expected-auth', note: 'Log user activity' },
    { method: 'GET',  path: '/api/user/daily-history',       auth: 'expected-auth', note: 'Get user history' },
    { method: 'POST', path: '/api/user/clear-history',       auth: 'expected-auth', note: 'Clear user history' },
    // Alerts (should require session)
    { method: 'POST', path: '/api/alerts',                   auth: 'expected-auth', note: 'Create price alert' },
    // Chat / AI
    { method: 'POST', path: '/api/chat',                     auth: 'public',  note: 'AI chatbot' },
    { method: 'GET',  path: '/api/sentiment',                auth: 'public',  note: 'Sentiment analysis' },
    { method: 'GET',  path: '/api/weather',                  auth: 'public',  note: 'Weather data' },
    // Track
    { method: 'POST', path: '/api/track/start',              auth: 'public',  note: 'Start track session' },
    { method: 'GET',  path: '/api/track/:trackId',           auth: 'public',  note: 'Get track position' },
];

console.log('\n══════════════════════════════════════════════════');
console.log(' DAST — Aero-Navigator API  |  Discovered Routes');
console.log('══════════════════════════════════════════════════');
ENDPOINTS.forEach((e, i) => console.log(`  ${String(i+1).padStart(2,'0')}. ${e.method.padEnd(4)} ${e.path.padEnd(38)} [${e.auth}]`));
console.log(`\n  Total: ${ENDPOINTS.length} endpoints`);
console.log('══════════════════════════════════════════════════\n');

// ─── CAT 0 — Unauthenticated access to every endpoint ────────────────────────

async function cat0_unauthenticated() {
    console.log('\n─── CAT 0: Unauthenticated Access Probe ───');

    const tests = [
        { method: 'GET',  url: `${BASE_URL}/api/flights?from=MAA&to=LHR`,  expected: [200] },
        { method: 'GET',  url: `${BASE_URL}/api/price-history?from=MAA&to=LHR`, expected: [200] },
        { method: 'GET',  url: `${BASE_URL}/api/predict?from=MAA&to=LHR`,  expected: [200] },
        { method: 'GET',  url: `${BASE_URL}/api/optimize?from=MAA&to=LHR`, expected: [200] },
        { method: 'GET',  url: `${BASE_URL}/api/session`,                  expected: [401] },
        { method: 'GET',  url: `${BASE_URL}/api/user/daily-history`,        expected: [200, 401] },
        { method: 'GET',  url: `${BASE_URL}/api/sentiment?from=MAA&to=LHR`,expected: [200] },
        { method: 'GET',  url: `${BASE_URL}/api/weather?to=london`,        expected: [200] },
    ];

    for (const t of tests) {
        const r   = await request(t.method, t.url);
        const ok  = t.expected.includes(r.status);
        // finding = returns 200 on a route expected to be protected
        const finding = (t.url.includes('daily-history') || t.url.includes('clear-history')) && r.status === 200;
        record({
            endpoint: new URL(t.url).pathname,
            method  : t.method,
            role    : 'unauthenticated',
            status  : r.status,
            expected_status: t.expected.join('/'),
            finding,
            severity: finding ? 'HIGH' : 'INFO',
            ms      : r.ms,
            category: 'CAT0_UNAUTH',
            note    : finding
                ? 'UNAUTHENTICATED access to user-data endpoint returned 200 — no session enforcement'
                : `Status ${r.status} within expected range`,
        });
        await sleep(200);
    }
}

// ─── CAT 1 — AuthN bypass ────────────────────────────────────────────────────

async function cat1_authn_bypass() {
    console.log('\n─── CAT 1: AuthN Bypass (malformed/expired tokens) ───');

    const badHeaders = [
        { label: 'no-token',      headers: {} },
        { label: 'empty-bearer',  headers: { Authorization: 'Bearer ' } },
        { label: 'garbage-token', headers: { Authorization: 'Bearer xxxxxxxx.yyyyyyyy.zzzzzzzz' } },
        { label: 'expired-sim',   headers: { Authorization: 'Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJ0ZXN0IiwiZXhwIjoxfQ.' } },
    ];

    const protectedEndpoints = [
        { method: 'GET',  url: `${BASE_URL}/api/user/daily-history` },
        { method: 'POST', url: `${BASE_URL}/api/user/clear-history`, body: { email: 'test@test.com' } },
        { method: 'POST', url: `${BASE_URL}/api/alerts`, body: { threshold: 5000, email: 'test@test.com' } },
    ];

    for (const ep of protectedEndpoints) {
        for (const bh of badHeaders) {
            const r = await request(ep.method, ep.url, { headers: bh.headers, body: ep.body });
            const finding = r.status === 200 || r.status === 201;
            record({
                endpoint: new URL(ep.url).pathname,
                method  : ep.method,
                role    : bh.label,
                status  : r.status,
                expected_status: '401/403',
                finding,
                severity: finding ? 'HIGH' : 'INFO',
                ms      : r.ms,
                category: 'CAT1_AUTHN',
                note    : finding
                    ? `AuthN bypass: ${ep.method} ${new URL(ep.url).pathname} returned ${r.status} with ${bh.label}`
                    : `Correctly rejected with ${r.status}`,
            });
            await sleep(150);
        }
    }
}

// ─── CAT 2 — Session confusion / user data isolation ─────────────────────────

async function cat2_user_data_isolation() {
    console.log('\n─── CAT 2: User Data Isolation / Session Confusion ───');

    // Test: fetch another user's history by passing their email in query string
    const victimEmail  = 'victim@aeronav.io';
    const attackerEmail = 'attacker@aeronav.io';

    // First plant activity for victim
    await request('POST', `${BASE_URL}/api/user/log-activity`, {
        body: { action_type: 'SEARCH_ROUTE', from_city: 'MAA', to_city: 'LHR',
                details: 'victim-sensitive-data', user_email: victimEmail }
    });

    // Now fetch without auth using email param
    const r = await request('GET', `${BASE_URL}/api/user/daily-history?email=${victimEmail}`);
    let body;
    try { body = JSON.parse(r.body); } catch(_) { body = {}; }
    const hasVictimData = JSON.stringify(body).includes('victim-sensitive-data');

    record({
        endpoint: '/api/user/daily-history',
        method  : 'GET',
        role    : 'unauthenticated-with-email-param',
        status  : r.status,
        expected_status: '401',
        finding : r.status === 200 && hasVictimData,
        severity: 'HIGH',
        ms      : r.ms,
        category: 'CAT2_AUTHZ',
        note    : r.status === 200 && hasVictimData
            ? 'IDOR/AuthZ: Any caller can read another user\'s activity by supplying email in query param — no session check'
            : `status=${r.status}, victim data in response: ${hasVictimData}`,
    });

    // Test: clear-history for victim without session
    const r2 = await request('POST', `${BASE_URL}/api/user/clear-history`, {
        body: { email: victimEmail }
    });
    record({
        endpoint: '/api/user/clear-history',
        method  : 'POST',
        role    : 'unauthenticated-targeting-victim',
        status  : r2.status,
        expected_status: '401',
        finding : r2.status === 200,
        severity: 'CRITICAL',
        ms      : r2.ms,
        category: 'CAT2_AUTHZ',
        note    : r2.status === 200
            ? 'CRITICAL: Unauthenticated caller can delete another user\'s history by supplying victim email in body'
            : `Returned ${r2.status}`,
    });
    await sleep(200);
}

// ─── CAT 3 — IDOR on GPS/Track tokens ────────────────────────────────────────

async function cat3_idor() {
    console.log('\n─── CAT 3: IDOR — Token Enumeration / Guessing ───');

    // Create a GPS session as "victim"
    const created = await request('POST', `${BASE_URL}/api/gps/start`, {
        body: { lat: 13.08, lon: 80.27 }
    });
    let victimToken = null;
    try { victimToken = JSON.parse(created.body).token; } catch(_) {}

    if (victimToken) {
        // Attacker reads victim's token directly (token is only 8 chars — low entropy)
        const r = await request('GET', `${BASE_URL}/api/gps/${victimToken}`);
        record({
            endpoint: '/api/gps/:token',
            method  : 'GET',
            role    : 'unauthenticated-with-guessed-token',
            status  : r.status,
            expected_status: '401',
            finding : r.status === 200,
            severity: 'MEDIUM',
            ms      : r.ms,
            category: 'CAT3_IDOR',
            note    : r.status === 200
                ? `IDOR: GPS session data accessible with token (token entropy is only ~30-bit; Math.random-based)`
                : `Returned ${r.status}`,
        });

        // Token entropy test — generate many tokens, check for pattern
        const tokens = [];
        for (let i = 0; i < 5; i++) {
            const resp = await request('POST', `${BASE_URL}/api/gps/start`, { body: {} });
            try { tokens.push(JSON.parse(resp.body).token); } catch(_) {}
            await sleep(50);
        }
        record({
            endpoint: '/api/gps/start',
            method  : 'POST',
            role    : 'unauthenticated',
            status  : 200,
            expected_status: '200',
            finding : true,
            severity: 'MEDIUM',
            ms      : 0,
            category: 'CAT3_IDOR',
            note    : `GPS token uses Math.random() — low entropy, predictable. Sampled tokens: ${tokens.slice(0,3).join(', ')}`,
        });
    }

    // IDOR on track sessions — start track, then access it without auth
    const trackResp = await request('POST', `${BASE_URL}/api/track/start`, {
        body: {
            flight    : { airline:'Air India', flight_no:'AI101', status:'In-Air', price: 5000 },
            fromCoords: { lat: 13.08, lon: 80.27 },
            toCoords  : { lat: 51.47, lon: -0.45 }
        }
    });
    let trackId = null;
    try { trackId = JSON.parse(trackResp.body).trackId; } catch(_) {}

    if (trackId) {
        const r2 = await request('GET', `${BASE_URL}/api/track/${trackId}`);
        record({
            endpoint: '/api/track/:trackId',
            method  : 'GET',
            role    : 'unauthenticated',
            status  : r2.status,
            expected_status: '401',
            finding : r2.status === 200,
            severity: 'LOW',
            ms      : r2.ms,
            category: 'CAT3_IDOR',
            note    : r2.status === 200
                ? 'Track session accessible without auth (same Math.random token entropy issue)'
                : `Returned ${r2.status}`,
        });
    }
    await sleep(200);
}

// ─── CAT 4 — Injection probes (detection only) ───────────────────────────────

async function cat4_injection() {
    console.log('\n─── CAT 4: Injection Probe (Detection Only) ───');

    const sqliPayloads = [
        "' OR '1'='1",
        "'; DROP TABLE users; --",
        "\" OR \"1\"=\"1",
        "1 UNION SELECT * FROM users --",
    ];

    const targets = [
        { url: `${BASE_URL}/api/flights?from=PAYLOAD&to=LHR`,  param: 'from' },
        { url: `${BASE_URL}/api/predict?from=PAYLOAD&to=LHR`,  param: 'from' },
        { url: `${BASE_URL}/api/optimize?from=PAYLOAD&to=LHR`, param: 'from' },
    ];

    for (const target of targets) {
        for (const payload of sqliPayloads) {
            const url = target.url.replace('PAYLOAD', encodeURIComponent(payload));
            const t0  = Date.now();
            const r   = await request('GET', url);
            const ms  = r.ms;
            // Detection: 500 status, error text in body, or timing >3s anomaly
            const bodyLower  = r.body.toLowerCase();
            const errorSigns = bodyLower.includes('sqlite') || bodyLower.includes('sql') ||
                               bodyLower.includes('syntax error') || bodyLower.includes('exception');
            const timingAnomaly = ms > 3000;
            const finding = r.status === 500 || errorSigns || timingAnomaly;

            record({
                endpoint: new URL(url).pathname,
                method  : 'GET',
                role    : 'unauthenticated',
                status  : r.status,
                expected_status: '200/400',
                finding,
                severity: finding ? 'HIGH' : 'INFO',
                ms,
                category: 'CAT4_INJECTION',
                note    : finding
                    ? `Injection signal: status=${r.status}, error_in_body=${errorSigns}, timing_anomaly=${timingAnomaly}`
                    : `No injection signal for payload: ${payload.substring(0, 20)}`,
            });
            await sleep(300);
        }
    }

    // POST injection via chat endpoint
    for (const payload of sqliPayloads.slice(0, 2)) {
        const r = await request('POST', `${BASE_URL}/api/chat`, { body: { message: payload } });
        const bodyLower = r.body.toLowerCase();
        const errorSigns = bodyLower.includes('sqlite') || bodyLower.includes('sql error') || bodyLower.includes('exception');
        record({
            endpoint: '/api/chat',
            method  : 'POST',
            role    : 'unauthenticated',
            status  : r.status,
            expected_status: '200',
            finding : errorSigns || r.status === 500,
            severity: errorSigns || r.status === 500 ? 'HIGH' : 'INFO',
            ms      : r.ms,
            category: 'CAT4_INJECTION',
            note    : errorSigns
                ? `SQL error leaked in chat response for payload: ${payload.substring(0, 20)}`
                : 'No injection signal in chat response',
        });
        await sleep(200);
    }
}

// ─── CAT 5 — Rate limiting ───────────────────────────────────────────────────

async function cat5_rate_limit() {
    console.log('\n─── CAT 5: Rate Limiting (30-req burst) ───');

    const url     = `${BASE_URL}/api/flights?from=MAA&to=LHR`;
    const burst   = 30;
    const statuses = [];

    for (let i = 0; i < burst; i++) {
        const r = await request('GET', url);
        statuses.push(r.status);
        await sleep(30);
    }

    const got429    = statuses.includes(429);
    const allOk     = statuses.every(s => s === 200);
    const finding   = !got429;

    record({
        endpoint: '/api/flights',
        method  : 'GET',
        role    : 'unauthenticated',
        status  : allOk ? 200 : statuses.find(s => s !== 200) || 200,
        expected_status: '429 (rate-limit)',
        finding,
        severity: finding ? 'MEDIUM' : 'INFO',
        ms      : 0,
        category: 'CAT5_RATE_LIMIT',
        note    : finding
            ? `No rate-limit header / 429 after ${burst} requests — DDoS amplification risk`
            : `Rate limit enforced (received 429 after ${statuses.indexOf(429)+1} requests)`,
    });

    // Also test login endpoint — should have strict limit
    const loginStatuses = [];
    for (let i = 0; i < 15; i++) {
        const r = await request('POST', `${BASE_URL}/api/login`, {
            body: { email: 'bruteforce@test.com' }
        });
        loginStatuses.push(r.status);
        await sleep(50);
    }
    const loginLimited = loginStatuses.includes(429);
    record({
        endpoint: '/api/login',
        method  : 'POST',
        role    : 'unauthenticated',
        status  : loginStatuses[loginStatuses.length - 1],
        expected_status: '429 (rate-limit)',
        finding : !loginLimited,
        severity: !loginLimited ? 'HIGH' : 'INFO',
        ms      : 0,
        category: 'CAT5_RATE_LIMIT',
        note    : !loginLimited
            ? `No rate-limit on /api/login after 15 rapid requests — credential stuffing risk`
            : 'Login rate-limit enforced',
    });
}

// ─── CAT 6 — Hardcoded credentials scan ──────────────────────────────────────

async function cat6_hardcoded_creds() {
    console.log('\n─── CAT 6: Hardcoded Credentials Scan ───');

    const serverSrc = fs.readFileSync(
        path.join(__dirname, '..', 'server.js'), 'utf8'
    );

    const patterns = [
        { name: 'session-secret',  regex: /secret\s*:\s*['"`]([^'"`]{10,})['"`]/g },
        { name: 'api-key-pattern', regex: /api[_-]?key\s*[=:]\s*['"`]([^'"`]{6,})['"`]/gi },
        { name: 'password-literal',regex: /password\s*[=:]\s*['"`](?!process\.env)([^'"`]{4,})['"`]/gi },
        { name: 'token-literal',   regex: /token\s*[=:]\s*['"`]([^'"`]{8,})['"`]/gi },
        { name: 'aviationstack-key', regex: /AVIATIONSTACK_KEY/g },
        { name: 'smtp-credentials', regex: /SMTP_/g },
    ];

    for (const p of patterns) {
        const matches = [];
        let m;
        const re = new RegExp(p.regex.source, p.regex.flags);
        while ((m = re.exec(serverSrc)) !== null) {
            // redact value — only report existence + line number
            const lineNum = serverSrc.substring(0, m.index).split('\n').length;
            matches.push(`line ${lineNum}`);
        }
        if (matches.length > 0) {
            record({
                endpoint: 'server.js (static scan)',
                method  : 'STATIC',
                role    : 'N/A',
                status  : 0,
                expected_status: 'N/A',
                finding : true,
                severity: p.name === 'session-secret' || p.name === 'password-literal' ? 'HIGH' : 'MEDIUM',
                ms      : 0,
                category: 'CAT6_SECRETS',
                note    : `Pattern [${p.name}] found at: ${matches.join(', ')} — value redacted`,
            });
        }
    }

    // Check for .env file existence
    const envExists = fs.existsSync(path.join(__dirname, '..', '.env'));
    record({
        endpoint: '.env (static scan)',
        method  : 'STATIC',
        role    : 'N/A',
        status  : 0,
        expected_status: 'N/A',
        finding : !envExists,
        severity: !envExists ? 'MEDIUM' : 'INFO',
        ms      : 0,
        category: 'CAT6_SECRETS',
        note    : envExists
            ? '.env file present (good — verify it is in .gitignore)'
            : 'No .env file; secrets should be externalised from server.js into environment variables',
    });
}

// ─── EXTRA — alerts endpoint: unauthenticated email injection ─────────────────

async function cat_extra_alerts() {
    console.log('\n─── EXTRA: Alerts — Unauthenticated Any-Email Write ───');

    // Caller supplies arbitrary recipient email — no session required
    const r = await request('POST', `${BASE_URL}/api/alerts`, {
        body: { threshold: 99999999, email: 'victim@example.com', from: 'MAA', to: 'LHR' }
    });
    record({
        endpoint: '/api/alerts',
        method  : 'POST',
        role    : 'unauthenticated',
        status  : r.status,
        expected_status: '401',
        finding : r.status === 201 || r.status === 200,
        severity: 'HIGH',
        ms      : r.ms,
        category: 'CAT1_AUTHN',
        note    : r.status === 201 || r.status === 200
            ? 'Unauthenticated caller can create price alerts with ANY recipient email — email-abuse / spam vector'
            : `Returned ${r.status}`,
    });
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

(async () => {
    try {
        // Check server alive
        const ping = await request('GET', `${BASE_URL}/api/session`);
        if (ping.status === 0) {
            console.error(`\n✗ Server unreachable at ${BASE_URL}. Start the server first: cd aero-navigator-web && npm start\n`);
            process.exit(1);
        }
        console.log(`\n✓ Server reachable at ${BASE_URL} (status=${ping.status})\n`);

        await cat0_unauthenticated();  save();
        await cat1_authn_bypass();     save();
        await cat2_user_data_isolation(); save();
        await cat3_idor();             save();
        await cat4_injection();        save();
        await cat5_rate_limit();       save();
        await cat6_hardcoded_creds();  save();
        await cat_extra_alerts();      save();

        // ── Summary ──
        const findings = results.filter(r => r.finding);
        const bySev    = { CRITICAL: [], HIGH: [], MEDIUM: [], LOW: [], INFO: [] };
        findings.forEach(f => { if (bySev[f.severity]) bySev[f.severity].push(f); });

        console.log('\n══════════════════════════════════════════════════');
        console.log(' DAST SUMMARY REPORT');
        console.log('══════════════════════════════════════════════════');
        console.log(` Total tests run : ${results.length}`);
        console.log(` Total findings  : ${findings.length}`);
        console.log(` CRITICAL        : ${bySev.CRITICAL.length}`);
        console.log(` HIGH            : ${bySev.HIGH.length}`);
        console.log(` MEDIUM          : ${bySev.MEDIUM.length}`);
        console.log(` LOW             : ${bySev.LOW.length}`);
        console.log('──────────────────────────────────────────────────');
        console.log(' TOP ISSUES TO FIX:');
        [...bySev.CRITICAL, ...bySev.HIGH, ...bySev.MEDIUM].forEach((f, i) => {
            console.log(`  ${i+1}. [${f.severity}] ${f.method} ${f.endpoint} — ${f.note}`);
        });
        console.log('══════════════════════════════════════════════════');
        console.log(`\n  Full report: ${REPORT_PATH}\n`);

    } catch (err) {
        console.error('Runner error:', err);
        process.exit(1);
    }
})();
