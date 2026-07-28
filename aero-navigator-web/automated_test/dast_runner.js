/**
 * DAST Runner — Aero-Navigator API Security Test Suite (Fixed server edition)
 * All categories calibrated against the hardened server.js.
 */

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');

const input    = JSON.parse(fs.readFileSync(path.join(__dirname, 'input.json'), 'utf8'));
const BASE_URL = input.baseUrl.replace(/\/$/, '');

const REPORT_PATH    = path.join(__dirname, 'report.json');
const SAVEPOINT_PATH = path.join(__dirname, 'savepoint.json');
const results = [];

// ─── helpers ────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function request(method, urlStr, { headers = {}, body = null, timeout = 10000 } = {}) {
    return new Promise((resolve) => {
        const u   = new URL(urlStr);
        const mod = u.protocol === 'https:' ? https : http;
        const opts = {
            hostname: u.hostname,
            port    : u.port || (u.protocol === 'https:' ? 443 : 80),
            path    : u.pathname + u.search,
            method,
            headers : { 'Content-Type': 'application/json', ...headers },
            timeout,
        };
        const req = mod.request(opts, (res) => {
            let raw = '';
            res.on('data', c => (raw += c));
            res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: raw, ms: Date.now() - (opts._start || 0) }));
        });
        opts._start = Date.now();
        req.on('timeout', () => { req.destroy(); resolve({ status: 0, body: 'TIMEOUT', ms: timeout, headers: {} }); });
        req.on('error',   (e) => resolve({ status: 0, body: e.message, ms: Date.now() - opts._start, headers: {} }));
        if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
        req.end();
    });
}

function record({ endpoint, method, role, status, expected_status, finding, severity, ms, category, note }) {
    const row = { endpoint, method, role, status, expected_status, finding, severity, response_time_ms: ms, test_category: category, note, timestamp: new Date().toISOString() };
    results.push(row);
    const icon = finding ? '✗' : '✓';
    const sev  = finding ? ` [${severity}]` : '';
    console.log(`  ${icon} [${category}] ${method} ${endpoint} → ${status}${sev}  ${note}`);
    return row;
}

function save() {
    fs.writeFileSync(REPORT_PATH, JSON.stringify(results, null, 2));
    fs.writeFileSync(SAVEPOINT_PATH, JSON.stringify({ count: results.length, ts: new Date().toISOString() }, null, 2));
}

// ─── STEP 1: Endpoint catalog ────────────────────────────────────────────────

const ENDPOINTS = [
    { method: 'POST', path: '/api/gps/start',               auth: 'public',         note: 'Start GPS broadcast (shared-link)' },
    { method: 'POST', path: '/api/gps/:token/update',        auth: 'public',         note: 'Update GPS coords' },
    { method: 'GET',  path: '/api/gps/:token',               auth: 'public',         note: 'Get GPS session (public share link)' },
    { method: 'GET',  path: '/live/gps/:token',              auth: 'public',         note: 'GPS viewer page' },
    { method: 'GET',  path: '/api/flights',                  auth: 'public',         note: 'Search flights (rate-limited)' },
    { method: 'GET',  path: '/api/price-history',            auth: 'public',         note: 'Price history' },
    { method: 'GET',  path: '/api/predict',                  auth: 'public',         note: 'Price prediction' },
    { method: 'GET',  path: '/api/optimize',                 auth: 'public',         note: 'Route optimizer' },
    { method: 'POST', path: '/api/register',                 auth: 'public',         note: 'Register user' },
    { method: 'POST', path: '/api/login',                    auth: 'public',         note: 'Login (email-only, rate-limited)' },
    { method: 'GET',  path: '/api/session',                  auth: 'public',         note: 'Session check' },
    { method: 'POST', path: '/api/logout',                   auth: 'public',         note: 'Logout' },
    { method: 'POST', path: '/api/user/log-activity',        auth: 'public',         note: 'Log activity (guest fallback)' },
    { method: 'GET',  path: '/api/user/daily-history',       auth: 'requireAuth',    note: 'User history (session required)' },
    { method: 'POST', path: '/api/user/clear-history',       auth: 'requireAuth',    note: 'Clear history (session required)' },
    { method: 'POST', path: '/api/alerts',                   auth: 'requireAuth',    note: 'Create alert (session required)' },
    { method: 'POST', path: '/api/chat',                     auth: 'public',         note: 'AI chatbot' },
    { method: 'GET',  path: '/api/sentiment',                auth: 'public',         note: 'Sentiment analysis' },
    { method: 'GET',  path: '/api/weather',                  auth: 'public',         note: 'Weather data' },
    { method: 'POST', path: '/api/track/start',              auth: 'public',         note: 'Start track session (crypto token)' },
    { method: 'GET',  path: '/api/track/:trackId',           auth: 'public',         note: 'Get track position (public link)' },
];

console.log('\n══════════════════════════════════════════════════════════');
console.log(' DAST — Aero-Navigator API  |  Discovered Routes');
console.log('══════════════════════════════════════════════════════════');
ENDPOINTS.forEach((e, i) => console.log(`  ${String(i+1).padStart(2,'0')}. ${e.method.padEnd(4)} ${e.path.padEnd(38)} [${e.auth}]`));
console.log(`\n  Total: ${ENDPOINTS.length} endpoints`);
console.log('══════════════════════════════════════════════════════════\n');

// ─── CAT 0: Unauthenticated probe ────────────────────────────────────────────

async function cat0_unauthenticated() {
    console.log('\n─── CAT 0: Unauthenticated Access Probe ───');

    const tests = [
        { method: 'GET', url: `${BASE_URL}/api/flights?from=MAA&to=LHR`,        expected: [200],      mustBe401: false },
        { method: 'GET', url: `${BASE_URL}/api/price-history?from=MAA&to=LHR`,  expected: [200],      mustBe401: false },
        { method: 'GET', url: `${BASE_URL}/api/predict?from=MAA&to=LHR`,        expected: [200],      mustBe401: false },
        { method: 'GET', url: `${BASE_URL}/api/optimize?from=MAA&to=LHR`,       expected: [200],      mustBe401: false },
        { method: 'GET', url: `${BASE_URL}/api/session`,                         expected: [401],      mustBe401: false },
        { method: 'GET', url: `${BASE_URL}/api/user/daily-history`,              expected: [401],      mustBe401: true  },
        { method: 'GET', url: `${BASE_URL}/api/sentiment?from=MAA&to=LHR`,      expected: [200],      mustBe401: false },
        { method: 'GET', url: `${BASE_URL}/api/weather?to=london`,              expected: [200],      mustBe401: false },
    ];

    for (const t of tests) {
        const r = await request(t.method, t.url);
        // finding = protected endpoint is accessible without auth (returns 200 when it should 401)
        const finding = t.mustBe401 && r.status !== 401;
        record({
            endpoint: new URL(t.url).pathname,
            method  : t.method, role: 'unauthenticated',
            status  : r.status, expected_status: t.expected.join('/'),
            finding,
            severity: finding ? 'HIGH' : 'INFO',
            ms      : r.ms, category: 'CAT0_UNAUTH',
            note    : finding
                ? `Protected endpoint returned ${r.status} without auth — expected 401`
                : `Correct: status ${r.status}`,
        });
        await sleep(200);
    }
}

// ─── CAT 1: AuthN bypass ─────────────────────────────────────────────────────

async function cat1_authn_bypass() {
    console.log('\n─── CAT 1: AuthN Bypass (malformed/no tokens) ───');

    const badHeaders = [
        { label: 'no-token',      headers: {} },
        { label: 'empty-bearer',  headers: { Authorization: 'Bearer ' } },
        { label: 'garbage-token', headers: { Authorization: 'Bearer xxxxxxxx.yyyyyyyy.zzzzzzzz' } },
        { label: 'expired-jwt',   headers: { Authorization: 'Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJ0ZXN0IiwiZXhwIjoxfQ.' } },
    ];

    const protectedEndpoints = [
        { method: 'GET',  url: `${BASE_URL}/api/user/daily-history` },
        { method: 'POST', url: `${BASE_URL}/api/user/clear-history`, body: { email: 'test@test.com' } },
        { method: 'POST', url: `${BASE_URL}/api/alerts`,             body: { threshold: 5000, email: 'test@test.com' } },
    ];

    for (const ep of protectedEndpoints) {
        for (const bh of badHeaders) {
            const r = await request(ep.method, ep.url, { headers: bh.headers, body: ep.body });
            // finding = still accessible (200/201) with bad/no token
            const finding = r.status === 200 || r.status === 201;
            record({
                endpoint: new URL(ep.url).pathname,
                method  : ep.method, role: bh.label,
                status  : r.status, expected_status: '401',
                finding,
                severity: finding ? 'HIGH' : 'INFO',
                ms      : r.ms, category: 'CAT1_AUTHN',
                note    : finding
                    ? `AuthN bypass: ${ep.method} ${new URL(ep.url).pathname} returned ${r.status} with ${bh.label}`
                    : `Correct: rejected with ${r.status}`,
            });
            await sleep(150);
        }
    }
}

// ─── CAT 2: User data isolation (IDOR/AuthZ) ─────────────────────────────────

async function cat2_user_data_isolation() {
    console.log('\n─── CAT 2: User Data Isolation / AuthZ ───');

    const victimEmail = 'victim@aeronav.io';

    // Plant victim activity first
    await request('POST', `${BASE_URL}/api/user/log-activity`, {
        body: { action_type: 'SEARCH_ROUTE', from_city: 'MAA', to_city: 'LHR', details: 'victim-sensitive-data', user_email: victimEmail }
    });

    // Try to read it unauthenticated with email param
    const r = await request('GET', `${BASE_URL}/api/user/daily-history?email=${victimEmail}`);
    let parsed = {};
    try { parsed = JSON.parse(r.body); } catch(_) {}
    const hasVictimData = JSON.stringify(parsed).includes('victim-sensitive-data');
    // finding = returned 200 AND leaked victim data
    const finding1 = r.status === 200 && hasVictimData;

    record({
        endpoint: '/api/user/daily-history',
        method: 'GET', role: 'unauth-with-email-param',
        status: r.status, expected_status: '401',
        finding: finding1,
        severity: finding1 ? 'HIGH' : 'INFO',
        ms: r.ms, category: 'CAT2_AUTHZ',
        note: finding1
            ? 'IDOR: Unauthenticated caller read victim history via ?email= param'
            : r.status === 401
                ? 'Correct: requireAuth blocked unauthenticated access'
                : `status=${r.status}, victim data leaked=${hasVictimData}`,
    });

    // Try to delete victim data unauthenticated
    const r2 = await request('POST', `${BASE_URL}/api/user/clear-history`, { body: { email: victimEmail } });
    const finding2 = r2.status === 200;

    record({
        endpoint: '/api/user/clear-history',
        method: 'POST', role: 'unauth-targeting-victim',
        status: r2.status, expected_status: '401',
        finding: finding2,
        severity: finding2 ? 'CRITICAL' : 'INFO',
        ms: r2.ms, category: 'CAT2_AUTHZ',
        note: finding2
            ? 'CRITICAL: Unauthenticated caller deleted another user history'
            : 'Correct: requireAuth blocked cross-user data deletion',
    });
    await sleep(200);
}

// ─── CAT 3: IDOR — Token entropy ────────────────────────────────────────────

async function cat3_idor() {
    console.log('\n─── CAT 3: IDOR — Token Entropy / Guessability ───');

    // GPS is intentionally a PUBLIC shared-link feature.
    // Security concern: token must be high-entropy (crypto) so it cannot be guessed.
    const created = await request('POST', `${BASE_URL}/api/gps/start`, { body: { lat: 13.08, lon: 80.27 } });
    let victimToken = null;
    try { victimToken = JSON.parse(created.body).token; } catch(_) {}

    if (victimToken) {
        // Low-entropy = Math.random (8 chars) → finding; crypto = 32 chars → pass
        const isLowEntropy = victimToken.length < 20;
        const r = await request('GET', `${BASE_URL}/api/gps/${victimToken}`);
        record({
            endpoint: '/api/gps/:token',
            method: 'GET', role: 'token-holder',
            status: r.status, expected_status: '200 (public shared-link)',
            finding: isLowEntropy,
            severity: isLowEntropy ? 'MEDIUM' : 'INFO',
            ms: r.ms, category: 'CAT3_IDOR',
            note: isLowEntropy
                ? `GPS token is ${victimToken.length} chars (Math.random) — guessable by brute-force`
                : `GPS shared-link token is ${victimToken.length} hex chars (crypto.randomBytes) — not guessable`,
        });

        // Sample 5 more tokens and check entropy
        const tokens = [];
        for (let i = 0; i < 5; i++) {
            const resp = await request('POST', `${BASE_URL}/api/gps/start`, { body: {} });
            try { tokens.push(JSON.parse(resp.body).token); } catch(_) {}
            await sleep(50);
        }
        const lowEntropyCount = tokens.filter(t => t.length < 20).length;
        const allCryptoStrength = lowEntropyCount === 0;
        record({
            endpoint: '/api/gps/start',
            method: 'POST', role: 'unauthenticated',
            status: 200, expected_status: '200',
            finding: !allCryptoStrength,
            severity: !allCryptoStrength ? 'MEDIUM' : 'INFO',
            ms: 0, category: 'CAT3_IDOR',
            note: allCryptoStrength
                ? `All GPS tokens are crypto-strength (${tokens[0]?.length} hex chars). Sampled: ${tokens.slice(0,2).join(', ')}`
                : `GPS token uses Math.random() — low entropy (${tokens[0]?.length} chars). Sampled: ${tokens.slice(0,3).join(', ')}`,
        });
    }

    // Track sessions — same token design as GPS (public share link + crypto token)
    const trackResp = await request('POST', `${BASE_URL}/api/track/start`, {
        body: {
            flight    : { airline: 'Air India', flight_no: 'AI101', status: 'In-Air', price: 5000 },
            fromCoords: { lat: 13.08, lon: 80.27 },
            toCoords  : { lat: 51.47, lon: -0.45 },
        }
    });
    let trackId = null;
    try { trackId = JSON.parse(trackResp.body).trackId; } catch(_) {}

    if (trackId) {
        const isLowEntropyTrack = trackId.length < 20;
        const r2 = await request('GET', `${BASE_URL}/api/track/${trackId}`);
        record({
            endpoint: '/api/track/:trackId',
            method: 'GET', role: 'token-holder',
            status: r2.status, expected_status: '200 (public tracking-link)',
            finding: isLowEntropyTrack,
            severity: isLowEntropyTrack ? 'LOW' : 'INFO',
            ms: r2.ms, category: 'CAT3_IDOR',
            note: isLowEntropyTrack
                ? `Track token is ${trackId.length} chars (Math.random) — predictable`
                : `Track token is ${trackId.length} hex chars (crypto.randomBytes) — not guessable`,
        });
    }
    await sleep(200);
}

// ─── CAT 4: Injection probes ─────────────────────────────────────────────────

async function cat4_injection() {
    console.log('\n─── CAT 4: Injection Probe (Detection Only) ───');

    const sqliPayloads = [
        "' OR '1'='1",
        "'; DROP TABLE users; --",
        "\" OR \"1\"=\"1",
        "1 UNION SELECT * FROM users --",
    ];

    const targets = [
        { url: `${BASE_URL}/api/flights?from=PAYLOAD&to=LHR` },
        { url: `${BASE_URL}/api/predict?from=PAYLOAD&to=LHR` },
        { url: `${BASE_URL}/api/optimize?from=PAYLOAD&to=LHR` },
    ];

    for (const target of targets) {
        for (const payload of sqliPayloads) {
            const url = target.url.replace('PAYLOAD', encodeURIComponent(payload));
            const r   = await request('GET', url);
            const bodyLower  = (r.body || '').toLowerCase();
            const errorSigns = bodyLower.includes('sqlite') || bodyLower.includes('syntax error') || bodyLower.includes('exception');
            const timingAnomaly = r.ms > 3000;
            const finding = r.status === 500 || errorSigns || timingAnomaly;
            record({
                endpoint: new URL(url).pathname,
                method: 'GET', role: 'unauthenticated',
                status: r.status, expected_status: '200/400',
                finding,
                severity: finding ? 'HIGH' : 'INFO',
                ms: r.ms, category: 'CAT4_INJECTION',
                note: finding
                    ? `Injection signal: status=${r.status}, error_in_body=${errorSigns}, timing=${r.ms}ms`
                    : `No injection signal for payload: ${payload.substring(0, 22)}`,
            });
            await sleep(300);
        }
    }

    for (const payload of sqliPayloads.slice(0, 2)) {
        const r = await request('POST', `${BASE_URL}/api/chat`, { body: { message: payload } });
        const bodyLower = (r.body || '').toLowerCase();
        const errorSigns = bodyLower.includes('sqlite') || bodyLower.includes('sql error') || bodyLower.includes('exception');
        record({
            endpoint: '/api/chat',
            method: 'POST', role: 'unauthenticated',
            status: r.status, expected_status: '200',
            finding: errorSigns || r.status === 500,
            severity: errorSigns || r.status === 500 ? 'HIGH' : 'INFO',
            ms: r.ms, category: 'CAT4_INJECTION',
            note: errorSigns ? `SQL error in chat response for: ${payload.slice(0,22)}` : 'No injection signal in chat response',
        });
        await sleep(200);
    }
}

// ─── CAT 5: Rate limiting ────────────────────────────────────────────────────

async function cat5_rate_limit() {
    console.log('\n─── CAT 5: Rate Limiting (burst test) ───');

    // Flights: limit is 20 req / 15 s → 30 burst should trigger 429
    const flightStatuses = [];
    for (let i = 0; i < 30; i++) {
        const r = await request('GET', `${BASE_URL}/api/flights?from=MAA&to=LHR`);
        flightStatuses.push(r.status);
        await sleep(30);
    }
    const got429Flights = flightStatuses.includes(429);
    record({
        endpoint: '/api/flights',
        method: 'GET', role: 'burst-30-reqs',
        status: flightStatuses[flightStatuses.length - 1], expected_status: '429 after burst',
        finding: !got429Flights,
        severity: !got429Flights ? 'MEDIUM' : 'INFO',
        ms: 0, category: 'CAT5_RATE_LIMIT',
        note: got429Flights
            ? `Rate limit enforced: 429 received after ${flightStatuses.indexOf(429)+1} of 30 requests`
            : 'No 429 after 30 burst requests — DDoS amplification risk',
    });
    await sleep(2000); // reset window

    // Login: limit is 5 req / 15 s → 15 burst should trigger 429
    const loginStatuses = [];
    for (let i = 0; i < 15; i++) {
        const r = await request('POST', `${BASE_URL}/api/login`, { body: { email: 'bruteforce@test.com' } });
        loginStatuses.push(r.status);
        await sleep(50);
    }
    const got429Login = loginStatuses.includes(429);
    record({
        endpoint: '/api/login',
        method: 'POST', role: 'burst-15-reqs',
        status: loginStatuses[loginStatuses.length - 1], expected_status: '429 after burst',
        finding: !got429Login,
        severity: !got429Login ? 'HIGH' : 'INFO',
        ms: 0, category: 'CAT5_RATE_LIMIT',
        note: got429Login
            ? `Login rate limit enforced: 429 after ${loginStatuses.indexOf(429)+1} of 15 requests`
            : 'No rate limit on /api/login — credential stuffing risk',
    });
}

// ─── CAT 6: Secrets / configuration scan ────────────────────────────────────

async function cat6_secrets() {
    console.log('\n─── CAT 6: Hardcoded Credentials / Secrets Scan ───');

    const serverSrc = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

    const patterns = [
        // Only flag HARDCODED literal secrets (not env-var references)
        { name: 'session-secret-literal', sev: 'HIGH',
          regex: /secret\s*:\s*['"`]([^'"`]{10,})['"`]/g,
          desc: 'Hardcoded session secret' },
        { name: 'api-key-hardcoded', sev: 'HIGH',
          regex: /api[_-]?key\s*[=:]\s*['"`]([^'"`]{8,})['"`]/gi,
          desc: 'Hardcoded API key' },
        { name: 'password-hardcoded', sev: 'HIGH',
          regex: /password\s*[=:]\s*['"`](?!process\.env)([^'"`]{6,})['"`]/gi,
          desc: 'Hardcoded password' },
        // The following are env-var references — only flag if value is hardcoded (=  'literal')
        { name: 'aviationstack-key-hardcoded', sev: 'MEDIUM',
          regex: /AVIATIONSTACK_KEY\s*=\s*['"`][^'"`]{6,}/g,
          desc: 'Hardcoded AviationStack key (not env ref)' },
        { name: 'smtp-creds-hardcoded', sev: 'MEDIUM',
          regex: /SMTP_(?:HOST|USER|PASS|FROM)\s*=\s*['"`][^'"`]{2,}/g,
          desc: 'Hardcoded SMTP credential (not env ref)' },
    ];

    let anyFound = false;
    for (const p of patterns) {
        const matches = [];
        const re = new RegExp(p.regex.source, p.regex.flags);
        let m;
        while ((m = re.exec(serverSrc)) !== null) {
            const lineNum = serverSrc.substring(0, m.index).split('\n').length;
            matches.push(`line ${lineNum}`);
        }
        if (matches.length > 0) {
            anyFound = true;
            record({
                endpoint: 'server.js (static)', method: 'STATIC', role: 'N/A',
                status: 0, expected_status: 'N/A',
                finding: true, severity: p.sev, ms: 0, category: 'CAT6_SECRETS',
                note: `${p.desc} found at: ${matches.join(', ')} — value redacted`,
            });
        }
    }

    if (!anyFound) {
        record({
            endpoint: 'server.js (static)', method: 'STATIC', role: 'N/A',
            status: 0, expected_status: 'N/A',
            finding: false, severity: 'INFO', ms: 0, category: 'CAT6_SECRETS',
            note: 'No hardcoded secrets detected in server.js — all credentials use process.env',
        });
    }

    // Check secrets externalisation: .env file OR SESSION_SECRET env var
    const envFileExists  = fs.existsSync(path.join(__dirname, '..', '.env'));
    const hasSessionEnv  = !!process.env.SESSION_SECRET;
    const secretsOk      = envFileExists || hasSessionEnv;
    record({
        endpoint: '.env / env-vars', method: 'STATIC', role: 'N/A',
        status: 0, expected_status: 'N/A',
        finding: !secretsOk, severity: !secretsOk ? 'MEDIUM' : 'INFO', ms: 0, category: 'CAT6_SECRETS',
        note: secretsOk
            ? (envFileExists ? '.env file present (verify it is in .gitignore)' : 'SESSION_SECRET set via environment variable — good CI/CD practice')
            : 'Neither .env nor SESSION_SECRET env var found — secrets management not configured',
    });
}

// ─── EXTRA: Alerts open-email abuse ─────────────────────────────────────────

async function cat_extra_alerts() {
    console.log('\n─── EXTRA: Alerts — Unauthenticated Any-Email Write ───');

    const r = await request('POST', `${BASE_URL}/api/alerts`, {
        body: { threshold: 99999999, email: 'victim@example.com', from: 'MAA', to: 'LHR' }
    });
    // After fix, requireAuth should return 401
    const finding = r.status === 201 || r.status === 200;
    record({
        endpoint: '/api/alerts',
        method: 'POST', role: 'unauthenticated',
        status: r.status, expected_status: '401',
        finding,
        severity: finding ? 'HIGH' : 'INFO',
        ms: r.ms, category: 'CAT1_AUTHN',
        note: finding
            ? 'Unauthenticated caller created alert with arbitrary email — email-spam vector'
            : 'Correct: requireAuth returned 401 for unauthenticated alert creation',
    });
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

(async () => {
    try {
        const ping = await request('GET', `${BASE_URL}/api/session`);
        if (ping.status === 0) {
            console.error(`\n✗ Server unreachable at ${BASE_URL}. Start first: node server.js\n`);
            process.exit(1);
        }
        console.log(`\n✓ Server reachable at ${BASE_URL} (HTTP ${ping.status})\n`);

        await cat0_unauthenticated();   save();
        await cat1_authn_bypass();      save();
        await cat2_user_data_isolation(); save();
        await cat3_idor();              save();
        await cat4_injection();         save();
        await cat5_rate_limit();        save();
        await cat6_secrets();           save();
        await cat_extra_alerts();       save();

        const findings = results.filter(r => r.finding);
        const bySev    = { CRITICAL: [], HIGH: [], MEDIUM: [], LOW: [], INFO: [] };
        findings.forEach(f => { if (bySev[f.severity]) bySev[f.severity].push(f); });

        console.log('\n══════════════════════════════════════════════════════════');
        console.log(' DAST FINAL SUMMARY');
        console.log('══════════════════════════════════════════════════════════');
        console.log(` Total tests  : ${results.length}`);
        console.log(` Passed       : ${results.length - findings.length}`);
        console.log(` Findings     : ${findings.length}`);
        console.log(` CRITICAL     : ${bySev.CRITICAL.length}`);
        console.log(` HIGH         : ${bySev.HIGH.length}`);
        console.log(` MEDIUM       : ${bySev.MEDIUM.length}`);
        console.log(` LOW          : ${bySev.LOW.length}`);
        if (findings.length > 0) {
            console.log('──────────────────────────────────────────────────────────');
            findings.forEach((f, i) => console.log(`  ${i+1}. [${f.severity}] ${f.method} ${f.endpoint} — ${f.note}`));
        }
        console.log('══════════════════════════════════════════════════════════');
        console.log(`\n  Full report: ${REPORT_PATH}\n`);

    } catch (err) {
        console.error('Runner error:', err);
        process.exit(1);
    }
})();
