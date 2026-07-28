/**
 * Aero-Navigator API Baseline & Load Testing Tool with Excel Report Export
 * ------------------------------------------------------------------------
 * Configuration:
 *  - 100 Virtual Concurrent Users (VUs)
 *  - Duration: 60 Seconds (1 Minute)
 *  - Target Endpoints: /api/flights, /api/predict, /api/optimize, /api/price-history
 * 
 * Usage:
 *  node load_test_runner.js [options]
 *  e.g. node load_test_runner.js --users 100 --duration 60 --url http://localhost:3000
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');
const path = require('path');
const createLoadTestExcelReport = require('./generate_load_test_excel');

// Parse command line arguments
const args = process.argv.slice(2);
function getArg(flag, defaultValue) {
    const idx = args.indexOf(flag);
    if (idx !== -1 && args[idx + 1]) {
        return args[idx + 1];
    }
    return defaultValue;
}

const TARGET_BASE_URL = getArg('--url', 'http://localhost:3000');
const CONCURRENT_USERS = parseInt(getArg('--users', '100'), 10);
const DURATION_SECONDS = parseInt(getArg('--duration', '60'), 10);

const TEST_ENDPOINTS = [
    '/api/flights?from=MAA&to=LHR',
    '/api/flights?from=DEL&to=DXB',
    '/api/predict?from=MAA&to=SYD',
    '/api/optimize?from=MAA&to=CDG',
    '/api/price-history?from=BOM&to=SIN'
];

let totalRequestsSent = 0;
let totalResponsesReceived = 0;
let totalSuccessfulRequests = 0;
let totalFailedRequests = 0;
const responseTimes = [];
const statusCodeCounts = {};
const endpointStatsMap = {};

TEST_ENDPOINTS.forEach(route => {
    endpointStatsMap[route] = { requests: 0, success: 0, failed: 0, latencies: [] };
});

let isRunning = true;
const startTime = Date.now();

function sendHttpRequest(targetUrl, endpoint) {
    return new Promise((resolve) => {
        const parsedUrl = new URL(targetUrl);
        const transport = parsedUrl.protocol === 'https:' ? https : http;

        const reqStart = Date.now();
        totalRequestsSent++;
        if (endpointStatsMap[endpoint]) endpointStatsMap[endpoint].requests++;

        const req = transport.request(parsedUrl, { method: 'GET', timeout: 5000 }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                const latency = Date.now() - reqStart;
                totalResponsesReceived++;
                if (res.statusCode >= 200 && res.statusCode < 400) {
                    totalSuccessfulRequests++;
                    if (endpointStatsMap[endpoint]) endpointStatsMap[endpoint].success++;
                } else {
                    totalFailedRequests++;
                    if (endpointStatsMap[endpoint]) endpointStatsMap[endpoint].failed++;
                }
                responseTimes.push(latency);
                if (endpointStatsMap[endpoint]) endpointStatsMap[endpoint].latencies.push(latency);

                statusCodeCounts[res.statusCode] = (statusCodeCounts[res.statusCode] || 0) + 1;
                resolve({ statusCode: res.statusCode, latency });
            });
        });

        req.on('error', (err) => {
            const latency = Date.now() - reqStart;
            totalFailedRequests++;
            if (endpointStatsMap[endpoint]) {
                endpointStatsMap[endpoint].failed++;
                endpointStatsMap[endpoint].latencies.push(latency);
            }
            statusCodeCounts['ECONNREFUSED'] = (statusCodeCounts['ECONNREFUSED'] || 0) + 1;
            resolve({ error: err.message, latency });
        });

        req.on('timeout', () => {
            req.destroy();
            totalFailedRequests++;
            if (endpointStatsMap[endpoint]) {
                endpointStatsMap[endpoint].failed++;
                endpointStatsMap[endpoint].latencies.push(5000);
            }
            statusCodeCounts['TIMEOUT'] = (statusCodeCounts['TIMEOUT'] || 0) + 1;
            resolve({ error: 'TIMEOUT', latency: 5000 });
        });

        req.end();
    });
}

// Virtual User loop
async function runVirtualUser(workerId) {
    while (isRunning) {
        // Pick a random endpoint
        const endpoint = TEST_ENDPOINTS[Math.floor(Math.random() * TEST_ENDPOINTS.length)];
        const fullUrl = `${TARGET_BASE_URL}${endpoint}`;
        await sendHttpRequest(fullUrl, endpoint);
        // Small 20ms pace per VU to simulate realistic network think time
        await new Promise(resolve => setTimeout(resolve, 20));
    }
}

async function startLoadTest() {
    console.log(`\n========================================================================`);
    console.log(` 🚀 AERO-NAVIGATOR BASELINE / LOAD TEST RUNNER`);
    console.log(`========================================================================`);
    console.log(` Target Server : ${TARGET_BASE_URL}`);
    console.log(` Virtual Users : ${CONCURRENT_USERS} Concurrent Connections`);
    console.log(` Duration      : ${DURATION_SECONDS} Seconds`);
    console.log(` Target Routes : ${TEST_ENDPOINTS.length} API Endpoints (Randomized load)`);
    console.log(`------------------------------------------------------------------------`);
    console.log(`⏳ Test in progress... Press Ctrl+C to abort early.\n`);

    // Timer to stop test after DURATION_SECONDS
    const testTimer = setTimeout(() => {
        isRunning = false;
    }, DURATION_SECONDS * 1000);

    // Live progress logger
    const progressInterval = setInterval(() => {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        const currentRps = Math.round(totalResponsesReceived / (elapsed || 1));
        process.stdout.write(`\r⏱️  Elapsed: ${elapsed}s / ${DURATION_SECONDS}s | Sent: ${totalRequestsSent} | Success: ${totalSuccessfulRequests} | RPS: ~${currentRps} req/sec`);
    }, 1000);

    // Launch Concurrent Virtual Users
    const workerPromises = [];
    for (let i = 0; i < CONCURRENT_USERS; i++) {
        workerPromises.push(runVirtualUser(i + 1));
    }

    await Promise.all(workerPromises);

    clearInterval(progressInterval);
    clearTimeout(testTimer);

    await printAndExportResults();
}

async function printAndExportResults() {
    const totalDurationMs = Date.now() - startTime;
    const totalDurationSec = totalDurationMs / 1000;
    const rps = (totalSuccessfulRequests / totalDurationSec).toFixed(2);
    const errRateStr = ((totalFailedRequests / (totalRequestsSent || 1)) * 100).toFixed(2) + '%';

    responseTimes.sort((a, b) => a - b);
    const minLatency = responseTimes.length > 0 ? responseTimes[0] : 0;
    const maxLatency = responseTimes.length > 0 ? responseTimes[responseTimes.length - 1] : 0;
    const sumLatency = responseTimes.reduce((acc, val) => acc + val, 0);
    const avgLatency = responseTimes.length > 0 ? parseFloat((sumLatency / responseTimes.length).toFixed(2)) : 0;
    
    // Percentiles
    const p90 = responseTimes.length > 0 ? responseTimes[Math.floor(responseTimes.length * 0.90)] : 0;
    const p95 = responseTimes.length > 0 ? responseTimes[Math.floor(responseTimes.length * 0.95)] : 0;
    const p99 = responseTimes.length > 0 ? responseTimes[Math.floor(responseTimes.length * 0.99)] : 0;

    console.log(`\n\n========================================================================`);
    console.log(` 📊 LOAD TEST EXECUTION RESULTS SUMMARY`);
    console.log(`========================================================================`);
    console.log(` Total Time Elapsed     : ${totalDurationSec.toFixed(2)} seconds`);
    console.log(` Total Requests Sent    : ${totalRequestsSent}`);
    console.log(` Successful Responses   : ${totalSuccessfulRequests}`);
    console.log(` Failed/Timed Out Req   : ${totalFailedRequests}`);
    console.log(` Error Rate             : ${errRateStr}`);
    console.log(`------------------------------------------------------------------------`);
    console.log(` ⚡ THROUGHPUT (RPS)`);
    console.log(`    Requests Per Sec    : ${rps} req/sec`);
    console.log(`------------------------------------------------------------------------`);
    console.log(` ⏱️  RESPONSE TIME (LATENCY)`);
    console.log(`    Fastest (Min)       : ${minLatency} ms`);
    console.log(`    Average (Avg)       : ${avgLatency} ms`);
    console.log(`    Slowest (Max)       : ${maxLatency} ms (${(maxLatency/1000).toFixed(2)}s)`);
    console.log(`    90th Percentile (P90): ${p90} ms`);
    console.log(`    95th Percentile (P95): ${p95} ms`);
    console.log(`    99th Percentile (P99): ${p99} ms`);
    console.log(`------------------------------------------------------------------------`);
    console.log(` 🏷️  STATUS CODE BREAKDOWN`);
    for (const [code, count] of Object.entries(statusCodeCounts)) {
        console.log(`    HTTP ${code}            : ${count} responses`);
    }
    console.log(`========================================================================\n`);

    // Prepare Endpoint Stats for Excel
    const endpointStats = TEST_ENDPOINTS.map(route => {
        const stats = endpointStatsMap[route] || { requests: 0, success: 0, failed: 0, latencies: [] };
        stats.latencies.sort((a, b) => a - b);
        const eMin = stats.latencies.length > 0 ? stats.latencies[0] : 0;
        const eMax = stats.latencies.length > 0 ? stats.latencies[stats.latencies.length - 1] : 0;
        const eSum = stats.latencies.reduce((a, b) => a + b, 0);
        const eAvg = stats.latencies.length > 0 ? parseFloat((eSum / stats.latencies.length).toFixed(2)) : 0;
        const eP95 = stats.latencies.length > 0 ? stats.latencies[Math.floor(stats.latencies.length * 0.95)] : 0;
        const eRps = (stats.success / totalDurationSec).toFixed(2);

        return {
            route,
            requests: stats.requests,
            success: stats.success,
            failed: stats.failed,
            rps: eRps,
            min: eMin,
            avg: eAvg,
            max: eMax,
            p95: eP95,
            status: stats.failed === 0 ? 'PASS' : 'FAIL'
        };
    });

    const reportMetrics = {
        targetUrl: TARGET_BASE_URL,
        concurrentUsers: CONCURRENT_USERS,
        durationSeconds: DURATION_SECONDS,
        totalDurationSec,
        totalRequestsSent,
        totalSuccessfulRequests,
        totalFailedRequests,
        errorRate: errRateStr,
        rps,
        minLatency,
        avgLatency,
        maxLatency,
        p90,
        p95,
        p99,
        statusCodeCounts,
        endpointStats
    };

    const excelOutputPath = path.join(__dirname, 'Aero_Navigator_Load_Test_Report.xlsx');
    await createLoadTestExcelReport(reportMetrics, excelOutputPath);
}

startLoadTest().catch(err => {
    console.error('Fatal load test runner error:', err);
});
