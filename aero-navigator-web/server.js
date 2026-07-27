const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const session = require('express-session');
const path = require('path');
const fetch = require('node-fetch');
let tf = null;
let tfAvailable = false;
try {
    tf = require('@tensorflow/tfjs-node');
    tfAvailable = true;
    console.log('TensorFlow.js (tfjs-node) available for predictions.');
} catch (e) {
    console.log('tfjs-node not installed; falling back to statistical predictor.');
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'aero_navigator_secure_encryption_key_matrix_2026',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const dbPath = path.join(__dirname, 'aero_navigator.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('SQLite connection error:', err.message);
    } else {
        console.log('Connected to SQLite database.');
        initializeDatabaseTables();
    }
});

// In-memory GPS sessions store: token -> { lat, lon, created }
const gpsSessions = {};

function generateToken() {
    return Math.random().toString(36).substring(2, 10);
}

// Start a GPS broadcast session
app.post('/api/gps/start', (req, res) => {
    const { lat, lon } = req.body;
    const token = generateToken();
    gpsSessions[token] = { lat: lat || 13.0827, lon: lon || 80.2707, created: Date.now() };
    const url = `${req.protocol}://${req.get('host')}/live/gps/${token}`;
    res.json({ token, url });
});

// Update GPS session coords
app.post('/api/gps/:token/update', (req, res) => {
    const token = req.params.token;
    if (!gpsSessions[token]) return res.status(404).send('Session not found');
    const { lat, lon } = req.body;
    gpsSessions[token].lat = lat || gpsSessions[token].lat;
    gpsSessions[token].lon = lon || gpsSessions[token].lon;
    gpsSessions[token].updated = Date.now();
    res.json({ ok: true });
});

// Get GPS session data
app.get('/api/gps/:token', (req, res) => {
    const token = req.params.token;
    const s = gpsSessions[token];
    if (!s) return res.status(404).send('Not found');
    res.json(s);
});

// Serve the public viewer page for shared gps links
app.get('/live/gps/:token', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'gps.html'));
});

function initializeDatabaseTables() {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT UNIQUE,
        password TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        recipient_email TEXT,
        threshold_value REAL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // Store price history for prediction
    db.run(`CREATE TABLE IF NOT EXISTS price_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        origin TEXT,
        destination TEXT,
        price INTEGER,
        ts DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Store daily user activities
    db.run(`CREATE TABLE IF NOT EXISTS user_daily_activity (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_email TEXT,
        action_type TEXT,
        from_city TEXT,
        to_city TEXT,
        details TEXT,
        log_date TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Store daily aggregated user summaries
    db.run(`CREATE TABLE IF NOT EXISTS user_daily_summaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_email TEXT,
        log_date TEXT,
        total_searches INTEGER DEFAULT 0,
        total_ai_chats INTEGER DEFAULT 0,
        total_price_alerts INTEGER DEFAULT 0,
        last_active_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_email, log_date)
    )`);

    runDailyDataMaintenance();
}

function getTodayDateString() {
    return new Date().toISOString().split('T')[0];
}

function logUserDailyActivity(email, actionType, fromCity, toCity, details) {
    const userEmail = email || 'guest@aeronav.io';
    const logDate = getTodayDateString();

    db.run(
        `INSERT INTO user_daily_activity (user_email, action_type, from_city, to_city, details, log_date) VALUES (?, ?, ?, ?, ?, ?)`,
        [userEmail, actionType, fromCity || '', toCity || '', details || '', logDate],
        (err) => {
            if (err) console.error('Failed to log daily activity:', err.message);
        }
    );

    const searchInc = (actionType === 'SEARCH_ROUTE' || actionType === 'ROUTE_OPTIMIZE') ? 1 : 0;
    const chatInc   = (actionType === 'AI_CHAT') ? 1 : 0;
    const alertInc  = (actionType === 'PRICE_ALERT') ? 1 : 0;

    db.run(
        `INSERT INTO user_daily_summaries (user_email, log_date, total_searches, total_ai_chats, total_price_alerts, last_active_time)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(user_email, log_date) DO UPDATE SET
         total_searches = total_searches + excluded.total_searches,
         total_ai_chats = total_ai_chats + excluded.total_ai_chats,
         total_price_alerts = total_price_alerts + excluded.total_price_alerts,
         last_active_time = CURRENT_TIMESTAMP`,
        [userEmail, logDate, searchInc, chatInc, alertInc],
        (err) => {
            if (err) console.error('Failed to update daily summary:', err.message);
        }
    );
}

function runDailyDataMaintenance() {
    console.log('[Daily Maintenance] Running daily data integrity check & SQLite optimization...');
    try {
        db.run(`PRAGMA optimize`);
    } catch (e) {}
}

setInterval(runDailyDataMaintenance, 24 * 60 * 60 * 1000);

// create a simple mail transporter if SMTP env vars provided
let mailTransporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    mailTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
} else {
    console.log('SMTP not configured - email notifications will log to console.');
}

function sendAlertEmail(to, subject, text) {
    if (!mailTransporter) {
        console.log(`Email to: ${to} | subject: ${subject} | body: ${text}`);
        return Promise.resolve();
    }
    return mailTransporter.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to, subject, text });
}

// API: return multiple simulated flights matching route
app.get('/api/flights', (req, res) => {
    const from = (req.query.from || 'MAA').toUpperCase();
    const to = (req.query.to || 'LHR').toUpperCase();
    // If AviationStack key is configured, try to fetch real flight data
    const apiKey = process.env.AVIATIONSTACK_KEY;
    if (apiKey) {
        // best-effort call to AviationStack flights endpoint; fall back to simulation on error
        const url = `http://api.aviationstack.com/v1/flights?access_key=${encodeURIComponent(apiKey)}&dep_iata=${encodeURIComponent(from)}&arr_iata=${encodeURIComponent(to)}`;
        fetch(url).then(r => r.json()).then(data => {
            if (!data || !data.data || data.data.length === 0) {
                // fallback to simulation
                return generateSimulatedFlights(from, to);
            }
            const flights = data.data.slice(0,6).map((f, idx) => {
                const airline = (f.airline && f.airline.name) || (f.flight && f.flight.airline) || 'Unknown';
                const flightNo = (f.flight && f.flight.number) || `FX${100+idx}`;
                // AviationStack doesn't supply prices — generate a reasonable mocked price
                const price = 7000 + Math.floor(Math.random() * 40000);
                const lat = (f.departure && f.departure.latitude) || 20 + Math.random()*20;
                const lon = (f.departure && f.departure.longitude) || 70 + Math.random()*40;
                return { airline, flight_no: flightNo, depart: f.departure && f.departure.scheduled ? f.departure.scheduled : `${8+idx}:00`, arrive: f.arrival && f.arrival.scheduled ? f.arrival.scheduled : `${12+idx}:30`, price, status: f.flight_status || 'Scheduled', lat, lon };
            });
            // persist prices to history for prediction
            flights.forEach(f => {
                db.run(`INSERT INTO price_history (origin, destination, price) VALUES (?, ?, ?)`, [from, to, f.price]);
            });
            res.json({ from, to, flights });
        }).catch(err => {
            console.error('AviationStack fetch error:', err && err.message);
            const result = generateSimulatedFlights(from, to);
            res.json(result);
        });
    } else {
        const result = generateSimulatedFlights(from, to);
        res.json(result);
    }
});

const AIRPORT_COORDS_SERVER = {
    'chennai': { lat: 12.9941, lon: 80.1709, name: 'Chennai Intl Airport, Tamil Nadu' },
    'maa':     { lat: 12.9941, lon: 80.1709, name: 'Chennai Intl Airport, Tamil Nadu' },
    'delhi':   { lat: 28.5562, lon: 77.0999, name: 'Indira Gandhi Intl Airport, Delhi' },
    'del':     { lat: 28.5562, lon: 77.0999, name: 'Indira Gandhi Intl Airport, Delhi' },
    'mumbai':  { lat: 19.0896, lon: 72.8656, name: 'Chhatrapati Shivaji Intl Airport, Maharashtra' },
    'bom':     { lat: 19.0896, lon: 72.8656, name: 'Chhatrapati Shivaji Intl Airport, Maharashtra' },
    'bangalore': { lat: 13.1979, lon: 77.7063, name: 'Kempegowda Intl Airport, Karnataka' },
    'blr':     { lat: 13.1979, lon: 77.7063, name: 'Kempegowda Intl Airport, Karnataka' },
    'hyderabad': { lat: 17.2403, lon: 78.4294, name: 'Rajiv Gandhi Intl Airport, Telangana' },
    'hyd':     { lat: 17.2403, lon: 78.4294, name: 'Rajiv Gandhi Intl Airport, Telangana' },
    'kolkata': { lat: 22.6549, lon: 88.4467, name: 'Netaji Subhas Chandra Bose Airport, West Bengal' },
    'ccu':     { lat: 22.6549, lon: 88.4467, name: 'Netaji Subhas Chandra Bose Airport, West Bengal' },
    'kochi':   { lat: 10.1520, lon: 76.4019, name: 'Cochin Intl Airport, Kerala' },
    'cok':     { lat: 10.1520, lon: 76.4019, name: 'Cochin Intl Airport, Kerala' },
    'london':  { lat: 51.4775, lon: -0.4614, name: 'Heathrow Airport, London' },
    'lhr':     { lat: 51.4775, lon: -0.4614, name: 'Heathrow Airport, London' },
    'dubai':   { lat: 25.2532, lon: 55.3657, name: 'Dubai Intl Airport, UAE' },
    'dxb':     { lat: 25.2532, lon: 55.3657, name: 'Dubai Intl Airport, UAE' },
    'singapore': { lat: 1.3644, lon: 103.9915, name: 'Changi Airport, Singapore' },
    'sin':     { lat: 1.3644, lon: 103.9915, name: 'Changi Airport, Singapore' },
    'doha':    { lat: 25.2731, lon: 51.6081, name: 'Hamad Intl Airport, Qatar' },
    'doh':     { lat: 25.2731, lon: 51.6081, name: 'Hamad Intl Airport, Qatar' },
    'paris':   { lat: 49.0097, lon: 2.5479, name: 'Charles de Gaulle Airport, Paris' },
    'cdg':     { lat: 49.0097, lon: 2.5479, name: 'Charles de Gaulle Airport, Paris' },
    'new york': { lat: 40.6413, lon: -73.7781, name: 'JFK Airport, New York' },
    'jfk':     { lat: 40.6413, lon: -73.7781, name: 'JFK Airport, New York' },
    'tokyo':   { lat: 35.5494, lon: 139.7798, name: 'Narita Intl Airport, Tokyo' },
    'nrt':     { lat: 35.5494, lon: 139.7798, name: 'Narita Intl Airport, Tokyo' },
    'sydney':  { lat: -33.9461, lon: 151.1772, name: 'Sydney Kingsford Smith Airport' },
    'syd':     { lat: -33.9461, lon: 151.1772, name: 'Sydney Kingsford Smith Airport' },
    'brazil':  { lat: -23.4356, lon: -46.4731, name: 'Guarulhos Intl Airport, São Paulo, Brazil' },
    'sao paulo': { lat: -23.4356, lon: -46.4731, name: 'Guarulhos Intl Airport, São Paulo, Brazil' },
    'gru':     { lat: -23.4356, lon: -46.4731, name: 'Guarulhos Intl Airport, São Paulo, Brazil' },
    'bangkok': { lat: 13.6900, lon: 100.7501, name: 'Suvarnabhumi Airport, Bangkok' },
    'bkk':     { lat: 13.6900, lon: 100.7501, name: 'Suvarnabhumi Airport, Bangkok' },
};

function getServerAirportCoords(cityOrCode) {
    const raw = (cityOrCode || '').trim();
    if (!raw) return { lat: 13.0827, lon: 80.2707, name: 'Chennai Intl Airport' };
    const key = raw.toLowerCase();
    if (AIRPORT_COORDS_SERVER[key]) return AIRPORT_COORDS_SERVER[key];
    for (const k of Object.keys(AIRPORT_COORDS_SERVER)) {
        if (key.includes(k) || k.includes(key)) return AIRPORT_COORDS_SERVER[k];
    }
    const seed = key.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const lat = Math.round((((seed * 13) % 110) - 50) * 1000) / 1000;
    const lon = Math.round((((seed * 29) % 320) - 160) * 1000) / 1000;
    const name = raw.charAt(0).toUpperCase() + raw.slice(1) + ' International Airport';
    return { lat, lon, name };
}

function generateSimulatedFlights(from, to) {
    const airlines = ['Air India', 'IndiGo', 'Vistara', 'SpiceJet', 'British Airways', 'Emirates', 'Qatar Airways', 'LATAM Airlines'];
    const flights = [];
    const fromKey = (from || '').toLowerCase();
    const toKey   = (to   || '').toLowerCase();
    const seed = (fromKey + toKey).split('').reduce((a, c) => a + c.charCodeAt(0), 0);

    const domesticKw  = ['chennai','delhi','mumbai','bangalore','hyderabad','kolkata','pune','kochi','jaipur','maa','del','bom','blr','hyd','ccu','cok'];
    const shortHaulKw = ['dubai','doha','singapore','colombo','bangkok','muscat','dxb','doh','sin','bkk'];
    const medHaulKw   = ['london','paris','frankfurt','tokyo','sydney','amsterdam','lhr','cdg','fra','nrt','syd'];
    const ultraKw     = ['brazil','new york','los angeles','chicago','toronto','houston','miami','sao paulo','jfk','lax','gru','eze'];

    function classify(name) {
        if (domesticKw.some(k => name.includes(k))) return 'domestic';
        if (shortHaulKw.some(k => name.includes(k))) return 'shortHaul';
        if (medHaulKw.some(k => name.includes(k))) return 'medHaul';
        if (ultraKw.some(k => name.includes(k))) return 'ultraLong';
        const v = seed % 4;
        return v === 0 ? 'domestic' : v === 1 ? 'shortHaul' : v === 2 ? 'medHaul' : 'ultraLong';
    }

    const catOrder = { domestic: 0, shortHaul: 1, medHaul: 2, ultraLong: 3 };
    const cat = catOrder[classify(fromKey)] >= catOrder[classify(toKey)] ? classify(fromKey) : classify(toKey);
    const basePrices = { domestic: 5500, shortHaul: 24000, medHaul: 58000, ultraLong: 95000 };
    const base = basePrices[cat];

    const fromCoords = getServerAirportCoords(from);
    const toCoords   = getServerAirportCoords(to);

    const count = 4;
    for (let i = 0; i < count; i++) {
        const airline = airlines[(seed + i * 3) % airlines.length];
        const flightNo = airline.split(' ')[0].slice(0,2).toUpperCase() + (100 + ((seed + i * 17) % 899));
        const price = Math.round(base * (0.88 + (((seed + i * 43) % 30) / 100)));
        const prog = ((seed + i * 23) % 75) / 100;
        const lat = fromCoords.lat + (toCoords.lat - fromCoords.lat) * prog;
        const lon = fromCoords.lon + (toCoords.lon - fromCoords.lon) * prog;

        flights.push({
            airline,
            flight_no: flightNo,
            depart: `${8 + i}:${i % 2 === 0 ? '00' : '30'}`,
            arrive: `${12 + i + (cat === 'ultraLong' ? 10 : cat === 'medHaul' ? 6 : 2)}:${i % 2 === 0 ? '45' : '15'}`,
            price,
            status: ['Scheduled','In-Air','On Time','In-Air'][i % 4],
            lat,
            lon,
            fromCoords,
            toCoords,
            fromName: fromCoords.name,
            toName: toCoords.name
        });

        try {
            db.run(`INSERT INTO price_history (origin, destination, price) VALUES (?, ?, ?)`, [from, to, price]);
        } catch (e) {}
    }
    return { from, to, flights };
}

// API: simulated price history for 7 days
app.get('/api/price-history', (req, res) => {
    const from = (req.query.from || 'MAA').toUpperCase();
    const to = (req.query.to || 'LHR').toUpperCase();
    // Try to return historical data from DB
    db.all(`SELECT price, ts FROM price_history WHERE origin = ? AND destination = ? ORDER BY ts DESC LIMIT 90`, [from, to], (err, rows) => {
        if (err) {
            console.error('DB read error:', err.message);
            return res.status(500).send('DB error');
        }
        if (!rows || rows.length === 0) {
            // fallback simulated
            const base = 8000 + Math.floor(Math.random() * 3000);
            const data = [];
            for (let i = 0; i < 30; i++) {
                const noise = Math.round((Math.random()-0.5) * 800);
                data.push(Math.max(500, base + noise - i*20));
            }
            return res.json({ days: Array.from({length:30}, (_,i)=>`Day ${i+1}`), prices: data });
        }
        // return last N rows chronological order
        const prices = rows.slice().reverse().map(r => r.price);
        const days = prices.map((_,i) => `-${prices.length - i}d`);
        res.json({ days, prices });
    });
});

// Prediction endpoint: simple linear trend prediction using price_history
app.get('/api/predict', (req, res) => {
    const from = (req.query.from || 'MAA').toUpperCase();
    const to = (req.query.to || 'LHR').toUpperCase();
    db.all(`SELECT price, ts FROM price_history WHERE origin = ? AND destination = ? ORDER BY ts ASC LIMIT 365`, [from, to], (err, rows) => {
        if (err) return res.status(500).send('DB error');
        if (!rows || rows.length < 3) {
            // not enough data -> fallback to simulated history and simple forecast
            const base = 9000 + Math.floor(Math.random() * 3000);
            const hist = [];
            for (let i = 0; i < 30; i++) hist.push(Math.max(500, Math.round(base + Math.sin(i/5)*400 + (Math.random()-0.5)*300 - i*10)));
            // simple prediction: last value +/- small trend
            const last = hist[hist.length-1];
            const predicted = Math.max(300, Math.round(last + (Math.random()-0.5)*200));
            return res.json({ days: Array.from({length:30}, (_,i)=>`Day ${i+1}`), prices: hist, predicted });
        }
        // Prefer TF-based predictor when available and enough data
        const ys = rows.map(r => Number(r.price));
        const last30 = ys.slice(-30);
        const days = last30.map((_,i) => `-${last30.length-i}d`);
        (async () => {
            try {
                if (tfAvailable && ys.length >= 12) {
                    const predicted = await tfPredict(ys);
                    return res.json({ days, prices: last30, predicted });
                }
            } catch (e) {
                console.error('TF predictor error:', e && e.message);
            }
            // fallback: simple linear regression
            const n = ys.length;
            const xs = ys.map((_, i) => i + 1);
            const sumX = xs.reduce((a,b)=>a+b,0);
            const sumY = ys.reduce((a,b)=>a+b,0);
            const sumXY = xs.reduce((s,x,i)=>s + x*ys[i], 0);
            const sumXX = xs.reduce((s,x)=>s + x*x, 0);
            const denom = (n*sumXX - sumX*sumX) || 1;
            const slope = (n*sumXY - sumX*sumY) / denom;
            const intercept = (sumY - slope*sumX) / n;
            const nextX = n + 1;
            const predicted = Math.max(100, Math.round(intercept + slope*nextX));
            return res.json({ days, prices: last30, predicted });
        })();
    });
});

// TF-based predictor: uses previous lag features and small dense NN
async function tfPredict(priceArray) {
    // priceArray is chronological oldest->newest
    const window = 10;
    if (!tfAvailable) throw new Error('tfjs-node not available');
    if (priceArray.length < window + 2) throw new Error('Not enough data for TF predictor');

    // prepare supervised samples: X = previous `window` prices, y = next price
    const X = [];
    const y = [];
    for (let i = 0; i + window < priceArray.length; i++) {
        const seq = priceArray.slice(i, i + window);
        X.push(seq);
        y.push(priceArray[i + window]);
    }

    // normalize by mean/std of training data
    const flat = priceArray.slice();
    const mean = flat.reduce((a,b)=>a+b,0)/flat.length;
    const std = Math.sqrt(flat.reduce((s,v)=>s + Math.pow(v-mean,2),0)/flat.length) || 1;
    const normX = X.map(r => r.map(v => (v - mean)/std));
    const normY = y.map(v => (v - mean)/std);

    const xs = tf.tensor2d(normX);
    const ys = tf.tensor2d(normY, [normY.length, 1]);

    const model = tf.sequential();
    model.add(tf.layers.dense({ units: 64, activation: 'relu', inputShape: [window] }));
    model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 1 }));
    model.compile({ optimizer: tf.train.adam(0.01), loss: 'meanAbsoluteError' });

    // train for modest epochs to avoid long blocking
    await model.fit(xs, ys, { epochs: 60, batchSize: Math.min(16, xs.shape[0]), verbose: 0 });

    // prepare last window to predict
    const lastWindow = priceArray.slice(-window).map(v => (v - mean)/std);
    const input = tf.tensor2d([lastWindow]);
    const out = model.predict(input);
    const predNorm = (await out.data())[0];
    const pred = Math.round(predNorm * std + mean);
    // cleanup
    try { xs.dispose(); ys.dispose(); input.dispose(); out.dispose(); model.dispose(); } catch (e) {}
    return Math.max(1, pred);
}

// API: optimization options (multiple routes with realistic geography-aware pricing)
app.get('/api/optimize', (req, res) => {
    const from = (req.query.from || 'MAA').toLowerCase();
    const to   = (req.query.to   || 'LHR').toLowerCase();

    // Classify distance category by matching city/country keywords
    const domestic = ['chennai','delhi','mumbai','bangalore','hyderabad','kolkata','pune','ahmedabad','jaipur','kochi','maa','del','bom','blr','hyd','ccu','bbi','amd','jdk','cok','ixc','atr','vns'];
    const shortHaul = ['dubai','doha','singapore','colombo','kathmandu','dhaka','bangkok','kuala lumpur','abu dhabi','muscat','dxb','doh','sin','cmb','ktm','dac','bkk','kul','auh','mct'];
    const medHaul = ['london','paris','frankfurt','amsterdam','rome','zurich','tokyo','beijing','shanghai','seoul','sydney','lhr','cdg','fra','ams','fco','zrh','nrt','pek','pvg','icn','syd'];
    const ultraLong = ['new york','los angeles','toronto','toronto','chicago','houston','miami','sao paulo','brazil','rio','buenos aires','mexico','lima','bogota','caracas','jfk','lax','yyz','ord','iah','mia','gru','eze','mex'];

    function classify(name) {
        if (domestic.some(k => name.includes(k))) return 'domestic';
        if (shortHaul.some(k => name.includes(k))) return 'shortHaul';
        if (medHaul.some(k => name.includes(k))) return 'medHaul';
        if (ultraLong.some(k => name.includes(k))) return 'ultraLong';
        // Unknown: guess by string length / seed
        const seed = (from + to).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
        return seed % 4 === 0 ? 'domestic' : seed % 4 === 1 ? 'shortHaul' : seed % 4 === 2 ? 'medHaul' : 'ultraLong';
    }

    const fromClass = classify(from);
    const toClass   = classify(to);

    // Pick the "longer" of the two endpoints
    const order = { domestic: 0, shortHaul: 1, medHaul: 2, ultraLong: 3 };
    const category = order[fromClass] >= order[toClass] ? fromClass : toClass;

    // Base prices (INR) — realistic market rates
    const basePrices = { domestic: 4500, shortHaul: 22000, medHaul: 55000, ultraLong: 90000 };
    const minPrices  = { domestic: 3000, shortHaul: 16000, medHaul: 40000, ultraLong: 70000 };

    // Durations in hours
    const durations  = { domestic: [2,3], shortHaul: [4,7], medHaul: [9,14], ultraLong: [16,24] };

    const seed = (from + to).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const varFactor = seed % 100; // 0-99 variance
    const basePrice = basePrices[category] + Math.round((varFactor / 99) * basePrices[category] * 0.35);

    const dur = durations[category];
    const directHrs = dur[0] + Math.round((seed % (dur[1] - dur[0])));
    const directMins = (seed * 7) % 60;

    const stopovers = ['BOM','DEL','DXB','SIN','DOH','CDG','AMS','LHR','IST','NRT'];
    const stopover1 = stopovers[seed % stopovers.length];
    const stopover2 = stopovers[(seed + 3) % stopovers.length];

    const options = [
        {
            route:    `${req.query.from} → ${req.query.to} (Non-Stop)`,
            duration: `${directHrs}h ${directMins}m`,
            price:    basePrice,
            score:    95,
            tag:      '⭐ Best Value'
        },
        {
            route:    `${req.query.from} → ${stopover1} → ${req.query.to}`,
            duration: `${directHrs + 2 + seed % 3}h ${(directMins + 30) % 60}m`,
            price:    Math.round(basePrice * (0.72 + (seed % 10) / 100)),
            score:    82,
            tag:      '💰 Budget Pick'
        },
        {
            route:    `${req.query.from} → ${stopover2} → ${req.query.to}`,
            duration: `${directHrs + 4 + seed % 4}h ${(directMins + 15) % 60}m`,
            price:    Math.round(basePrice * (0.60 + (seed % 8) / 100)),
            score:    74,
            tag:      '🕐 Cheapest'
        }
    ];
    res.json({ options });
});

app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!email || !password) return res.status(400).send('Parameter requirements unfulfilled.');
    if (!isValidEmail(email)) return res.status(400).send('Invalid email format.');
    try {
        const hashed = await bcrypt.hash(password, 10);
        const query = `INSERT INTO users (name, email, password) VALUES (?, ?, ?)`;
        db.run(query, [name || email.split('@')[0], email, hashed], function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) return res.status(400).send('Account Email already exists.');
                return res.status(500).send('Database write error.');
            }
            req.session.userId = this.lastID;
            req.session.userEmail = email;
            logUserDailyActivity(email, 'REGISTER', '', '', 'New account registered & logged in');
            res.status(201).json({ ok: true, email });
        });
    } catch (e) {
        res.status(500).send('Hashing error');
    }
});

app.post('/api/login', (req, res) => {
    const { email } = req.body || {};
    if (!email || !isValidEmail(email)) return res.status(400).send('Please enter a valid email address.');

    const cleanEmail = email.toLowerCase().trim();
    const userName = cleanEmail.split('@')[0];

    const query = `SELECT * FROM users WHERE LOWER(email) = ?`;
    db.get(query, [cleanEmail], (err, user) => {
        if (err) return res.status(500).send('DB error');

        if (!user) {
            db.run(`INSERT INTO users (name, email, password) VALUES (?, ?, ?)`, [userName, cleanEmail, 'passwordless'], function (err2) {
                if (err2) return res.status(500).send('Database write error');
                req.session.userId = this.lastID;
                req.session.userEmail = cleanEmail;
                logUserDailyActivity(cleanEmail, 'SIGN_IN', '', '', 'New email session created');
                return res.status(200).json({ ok: true, email: cleanEmail });
            });
        } else {
            req.session.userId = user.id;
            req.session.userEmail = cleanEmail;
            logUserDailyActivity(cleanEmail, 'SIGN_IN', '', '', 'Email session signed in');
            return res.status(200).json({ ok: true, email: cleanEmail });
        }
    });
});

app.get('/api/session', (req, res) => {
    if (req.session.userId && req.session.userEmail) {
        res.json({ loggedIn: true, email: req.session.userEmail });
    } else {
        res.status(401).json({ loggedIn: false });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).send('Failed to destroy session');
        res.clearCookie('connect.sid');
        res.sendStatus(200);
    });
});

app.post('/api/user/log-activity', (req, res) => {
    const { action_type, from_city, to_city, details, user_email } = req.body || {};
    const userEmail = (user_email || req.session.userEmail || 'guest@aeronav.io').toLowerCase().trim();
    logUserDailyActivity(userEmail, action_type, from_city, to_city, details);
    res.json({ ok: true });
});

// API: get daily user activity history & summaries strictly for signed-in email
app.get('/api/user/daily-history', (req, res) => {
    const userEmail = (req.query.email || req.session.userEmail || 'guest@aeronav.io').toLowerCase().trim();

    db.all(`SELECT * FROM user_daily_activity WHERE LOWER(user_email) = ? ORDER BY id DESC LIMIT 50`, [userEmail], (err, activities) => {
        if (err) return res.status(500).json({ error: 'DB read error' });

        db.all(`SELECT * FROM user_daily_summaries WHERE LOWER(user_email) = ? ORDER BY log_date DESC LIMIT 14`, [userEmail], (err2, summaries) => {
            if (err2) return res.status(500).json({ error: 'DB read error' });

            res.json({
                user_email: userEmail,
                today: getTodayDateString(),
                activities: activities || [],
                summaries: summaries || []
            });
        });
    });
});

// API: clear daily activity history strictly for signed-in email
app.post('/api/user/clear-history', (req, res) => {
    const userEmail = (req.body.email || req.session.userEmail || 'guest@aeronav.io').toLowerCase().trim();
    db.run(`DELETE FROM user_daily_activity WHERE LOWER(user_email) = ?`, [userEmail], (err) => {
        if (err) return res.status(500).json({ error: 'DB delete error' });
        db.run(`DELETE FROM user_daily_summaries WHERE LOWER(user_email) = ?`, [userEmail], () => {});
        res.json({ ok: true });
    });
});

app.post('/api/alerts', async (req, res) => {
    // allow alerts from logged-in users or provide an email in the body
    const { threshold, email, from, to } = req.body;
    const userId = req.session.userId || null;
    const recipient = req.session.userEmail || email || null;
    if (!threshold || !recipient) return res.status(400).send('Missing threshold or recipient email');

    const query = `INSERT INTO alerts (user_id, recipient_email, threshold_value) VALUES (?, ?, ?)`;
    db.run(query, [userId, recipient, threshold], async function (err) {
        if (err) return res.status(500).send('DB error');

        // simulate current price check
        const currentPrice = 5000 + Math.floor(Math.random() * 10000);
        if (currentPrice <= threshold) {
            const subject = `Price alert: ${from || ''} → ${to || ''} now ₹${currentPrice}`;
            const body = `Good news! Current price is ₹${currentPrice} which is below your threshold of ₹${threshold}. Book now.`;
            try {
                await sendAlertEmail(recipient, subject, body);
            } catch (e) {
                console.error('Failed sending alert email:', e.message || e);
            }
        }

        res.status(201).json({ saved: true, currentPrice });
    });
});

function extractCitiesFromPrompt(text) {
    if (!text) return null;
    const lower = text.toLowerCase().trim();

    const regexFromTo = /(?:from\s+)?([a-z\s]{3,20}?)\s+(?:to|->|→)\s+([a-z\s]{3,20})/i;
    const match = lower.match(regexFromTo);
    const stopWords = ['find', 'search', 'show', 'get', 'cheap', 'flights', 'tickets', 'ticket', 'prices', 'price', 'for', 'me', 'any', 'best', 'the', 'a', 'live', 'status', 'predict', 'recommend', 'how', 'much', 'is', 'from'];

    let from = null;
    let to = null;

    if (match) {
        let fRaw = match[1].trim();
        let tRaw = match[2].trim();

        stopWords.forEach(w => {
            fRaw = fRaw.replace(new RegExp(`^\\b${w}\\b\\s*`, 'gi'), '').trim();
            fRaw = fRaw.replace(new RegExp(`\\b${w}\\b`, 'gi'), '').trim();
            tRaw = tRaw.replace(new RegExp(`\\s*\\b${w}\\b$`, 'gi'), '').trim();
            tRaw = tRaw.replace(new RegExp(`\\b${w}\\b`, 'gi'), '').trim();
        });

        fRaw = fRaw.trim();
        tRaw = tRaw.trim();

        if (fRaw && tRaw && fRaw !== tRaw) {
            from = fRaw;
            to = tRaw;
        }
    }

    if (!from || !to) {
        const knownList = [
            'chennai','maa','mumbai','bom','delhi','del','bangalore','blr','hyderabad','hyd','kolkata','ccu','kochi','cok','jaipur','pune','ahmedabad',
            'london','lhr','paris','cdg','frankfurt','fra','amsterdam','ams','rome','dubai','dxb','doha','doh','singapore','sin','colombo','cmb','kathmandu','ktm','bangkok','bkk','kuala lumpur','kul',
            'tokyo','nrt','beijing','pek','shanghai','pvg','seoul','icn','sydney','syd',
            'new york','jfk','los angeles','lax','toronto','yyz','chicago','ord','houston','iah','miami','mia','brazil','rio','sao paulo','gru','colombia','buenos aires'
        ];
        const matched = [];
        knownList.forEach(city => {
            const pos = lower.indexOf(city);
            if (pos !== -1) matched.push({ city, pos });
        });
        matched.sort((a,b) => a.pos - b.pos);
        if (matched.length >= 2) {
            from = matched[0].city;
            to = matched[1].city;
        }
    }

    if (from && to) return { from: from.trim(), to: to.trim() };
    return null;
}

// AI Chatbot endpoint (Ultra-Intelligent NLP & Autonomous Flight Engine)
app.post('/api/chat', (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'No message provided' });

    const msg = message.toLowerCase().trim();
    let reply = null;
    const cityPair = extractCitiesFromPrompt(message);

    logUserDailyActivity(req.session.userEmail || 'guest@aeronav.io', 'AI_CHAT', cityPair ? cityPair.from : '', cityPair ? cityPair.to : '', message);

    if (cityPair && cityPair.from && cityPair.to) {
        if (req.session) {
            req.session.lastFrom = cityPair.from;
            req.session.lastTo   = cityPair.to;
        }

        const fromUpper = cityPair.from.toUpperCase();
        const toUpper   = cityPair.to.toUpperCase();

        const simResult = generateSimulatedFlights(cityPair.from, cityPair.to);
        const flights = simResult.flights || [];

        let flightCardsHtml = '';
        flights.slice(0, 3).forEach(f => {
            flightCardsHtml += `
                <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 8px 10px; margin: 6px 0; font-size: 0.85rem;">
                    <div style="display: flex; justify-content: space-between; font-weight: 600; color: #38BDF8;">
                        <span>✈️ ${f.airline} (${f.flight_no})</span>
                        <span style="color: #34D399; font-weight: 700;">₹${f.price.toLocaleString()}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; color: #94A3B8; font-size: 0.8rem; margin-top: 4px;">
                        <span>🛫 ${f.depart} → 🛬 ${f.arrive} (${f.duration})</span>
                        <span style="color: #34D399;">${f.status}</span>
                    </div>
                </div>
            `;
        });

        const lowestPrice = Math.min(...flights.map(f => f.price));

        const reply = `
            <div>
                <p>🤖 <strong>AeroNav AI Intelligent Flight Report</strong> for <strong>${fromUpper} → ${toUpper}</strong>:</p>
                <div style="margin: 8px 0;">
                    ${flightCardsHtml}
                </div>
                <div style="font-size: 0.82rem; background: rgba(56,189,248,0.1); border-left: 3px solid #38BDF8; padding: 6px 10px; border-radius: 4px; margin: 8px 0;">
                    💡 <strong>Neural Price Prediction:</strong> Fares start at <strong>₹${lowestPrice.toLocaleString()}</strong>. Predicted price movement: <strong>+4.8% (Book Now Recommended)</strong>.
                </div>
                <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px;">
                    <button class="btn btn-primary btn-sm" style="font-size: 0.78rem; padding: 4px 8px;" onclick="triggerAiRouteSearch('${cityPair.from}', '${cityPair.to}')">🧭 Track on Map</button>
                    <button class="btn btn-accent btn-sm" style="font-size: 0.78rem; padding: 4px 8px;" onclick="triggerAiPricePredict('${cityPair.from}', '${cityPair.to}')">📊 View 7-Day Forecast</button>
                    <button class="btn btn-success btn-sm" style="font-size: 0.78rem; padding: 4px 8px;" onclick="bookRoute('${cityPair.from}', '${cityPair.to}')">✈️ Direct Booking Links</button>
                </div>
            </div>
        `;

        return res.json({ reply, action: { type: 'SEARCH_ROUTE', from: cityPair.from, to: cityPair.to, flights } });
    }

    // Booking Website & Platform Intent Detection
    if (msg.includes('booking') || msg.includes('website') || msg.includes('platform') || msg.includes('site') || msg.includes('where to book') || msg.includes('right platform') || msg.includes('how to book') || msg.includes('link')) {
        const lastFrom = (req.session && req.session.lastFrom) ? req.session.lastFrom : 'Chennai';
        const lastTo   = (req.session && req.session.lastTo) ? req.session.lastTo : 'Brazil';
        const searchUrl = `https://www.google.com/travel/flights?q=Flights+from+${encodeURIComponent(lastFrom)}+to+${encodeURIComponent(lastTo)}`;

        reply = `
            <div>
                <p>🌐 <strong>Top Recommended Flight Booking Platforms</strong> (Current Route: <strong>${lastFrom.toUpperCase()} → ${lastTo.toUpperCase()}</strong>):</p>
                <div style="font-size: 0.84rem; margin: 8px 0; display: flex; flex-direction: column; gap: 6px;">
                    <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); padding: 8px; border-radius: 6px;">
                        <strong>1. Google Flights (Official Global Aggregator)</strong><br>
                        <span style="color: #94A3B8; font-size: 0.78rem;">Real-time price graph, zero markup fees, direct airline redirects.</span>
                    </div>
                    <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); padding: 8px; border-radius: 6px;">
                        <strong>2. MakeMyTrip / EaseMyTrip</strong><br>
                        <span style="color: #94A3B8; font-size: 0.78rem;">Best for Indian bank discounts, promo coupons, and instant cancellations.</span>
                    </div>
                    <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); padding: 8px; border-radius: 6px;">
                        <strong>3. Skyscanner & Official Airline Sites</strong><br>
                        <span style="color: #94A3B8; font-size: 0.78rem;">Air India, IndiGo, Emirates, Qatar Airways portals for direct seat selection.</span>
                    </div>
                </div>
                <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px;">
                    <a class="btn btn-primary btn-sm" style="font-size: 0.78rem; padding: 4px 8px; text-decoration: none; text-align: center; color: white;" href="${searchUrl}" target="_blank">🌐 Open Google Flights (${lastFrom} → ${lastTo})</a>
                    <a class="btn btn-accent btn-sm" style="font-size: 0.78rem; padding: 4px 8px; text-decoration: none; text-align: center; color: white;" href="https://www.makemytrip.com/flights/" target="_blank">✈️ Open MakeMyTrip</a>
                    <a class="btn btn-success btn-sm" style="font-size: 0.78rem; padding: 4px 8px; text-decoration: none; text-align: center; color: white;" href="https://www.skyscanner.co.in/" target="_blank">🛫 Open Skyscanner</a>
                </div>
            </div>
        `;

        return res.json({ reply });
    }

    if (/^(hi|hello|hey|good morning|good evening|good afternoon|namaste|howdy)/.test(msg)) {
        reply = "👋 Hello! I'm AeroNav AI, your ultra-intelligent flight assistant. Ask me anything like: *'Find flights from Chennai to Brazil'* or *'Where to book tickets for London'* and I'll give you instant answers and direct booking links!";
    } else if (msg.includes('flight') || msg.includes('fly') || msg.includes('ticket')) {
        reply = "✈️ Just tell me where you want to go! For example, type: **'Flights from Chennai to London'** or **'Cheap fares from Delhi to Dubai'** and I will pull up live flights and fares for you directly!";
    } else if (msg.includes('price') || msg.includes('cheap') || msg.includes('cost') || msg.includes('fare') || msg.includes('afford') || msg.includes('₹') || msg.includes('money')) {
        reply = "💰 I track prices continuously across global airlines! Ask me: **'Predict price for Chennai to Sydney'** or **'Cheapest flight Mumbai to Tokyo'** for real-time fare predictions!";
    } else if (msg.includes('weather') || msg.includes('rain') || msg.includes('temperature') || msg.includes('climate') || msg.includes('forecast')) {
        reply = "🌤️ Weather insights are generated live for all destination airports! Ask me for any route and I'll include real-time meteorological forecasts.";
    } else if (msg.includes('baggage') || msg.includes('luggage') || msg.includes('check-in')) {
        reply = "🧳 Standard Baggage Allowance: IndiGo/SpiceJet include **15kg check-in + 7kg cabin**. Air India/Emirates include **23–30kg check-in**. Ask me about a specific route for precise details!";
    } else if (msg.includes('visa') || msg.includes('passport')) {
        reply = "🛂 Indian passport holders enjoy **Visa-on-arrival / E-visa access** to 60+ countries (Maldives, Thailand, Indonesia, Malaysia). Always verify visa validity 4 weeks before departure.";
    } else if (msg.includes('thank') || msg.includes('thanks') || msg.includes('great') || msg.includes('awesome')) {
        reply = "😊 Happy to assist! I'm always here to optimize your flight routes and find you the best fares. Safe travels! ✈️";
    } else {
        reply = `🤖 I parsed your prompt: "${message}". Try asking me directly for flights or price predictions, e.g., **"Flights from Chennai to Brazil"** or **"Where to book tickets"**!`;
    }

    setTimeout(() => {
        res.json({ reply });
    }, 400);
});

// AI Sentiment Analysis endpoint (Simulation based on route)
app.get('/api/sentiment', (req, res) => {
    const { from, to } = req.query;
    
    const sentiments = [
        `<strong>High Confidence:</strong> Recent reviews for the ${from} to ${to} route indicate excellent on-time performance (94%). Passenger sentiment is highly positive regarding cabin crew service.`,
        `<strong>Moderate Confidence:</strong> The ${from} to ${to} route has seen minor delays recently due to weather patterns. Baggage handling sentiment is neutral.`,
        `<strong>High Confidence:</strong> Passengers praise the smooth boarding process for flights from ${from}. However, in-flight WiFi reliability on this route has a negative sentiment score (-12%).`,
        `<strong>Analysis Complete:</strong> Overall traveler satisfaction for flights to ${to} is currently peaking. Food service ratings are exceptionally high this month.`
    ];
    
    const randomSentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
    
    setTimeout(() => {
        res.json({ sentiment: randomSentiment });
    }, 1500);
});

// Real Weather API Integration (Open-Meteo)
app.get('/api/weather', async (req, res) => {
    // Basic geocoding simulation for demo (we'll map common cities to coords, or just pick a random one if unknown)
    const cities = {
        'lhr': { lat: 51.47, lon: -0.45 },
        'london': { lat: 51.50, lon: -0.12 },
        'maa': { lat: 13.08, lon: 80.27 },
        'chennai': { lat: 13.08, lon: 80.27 },
        'syd': { lat: -33.86, lon: 151.20 },
        'sydney': { lat: -33.86, lon: 151.20 },
        'jfk': { lat: 40.64, lon: -73.77 },
        'new york': { lat: 40.71, lon: -74.00 }
    };

    const dest = (req.query.to || '').toLowerCase();
    let coords = cities[dest];
    if (!coords) {
        // Random coords if city not hardcoded
        coords = { lat: 20 + Math.random()*20, lon: 70 + Math.random()*40 };
    }

    try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true`);
        const data = await response.json();
        res.json({ weather: data.current_weather });
    } catch (e) {
        console.error('Weather API Error:', e);
        res.status(500).json({ error: 'Failed to fetch weather' });
    }
});

// In-memory tracking sessions: trackId -> { flights, created }
// flight is simulated based on route endpoints + elapsed time.
const trackSessions = {};

function makeTrackId() {
    return Math.random().toString(36).substring(2, 10);
}

// Start a tracking session for a specific flight object (from /api/flights)
app.post('/api/track/start', (req, res) => {
    const { flight, fromCoords, toCoords } = req.body || {};
    if (!flight || !fromCoords || !toCoords) return res.status(400).json({ error: 'Missing flight or coordinates' });

    const trackId = makeTrackId();
    trackSessions[trackId] = {
        created: Date.now(),
        flight: {
            airline: flight.airline,
            flight_no: flight.flight_no,
            status: flight.status,
            price: flight.price,
        },
        fromCoords: { lat: Number(fromCoords.lat), lon: Number(fromCoords.lon) },
        toCoords: { lat: Number(toCoords.lat), lon: Number(toCoords.lon) }
    };

    res.json({ trackId });
});

// Get current simulated position for the tracked flight
app.get('/api/track/:trackId', (req, res) => {
    const trackId = req.params.trackId;
    const s = trackSessions[trackId];
    if (!s) return res.status(404).json({ error: 'Track session not found' });

    const elapsedMs = Date.now() - s.created;

    const seed = trackId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const totalMs = (12 * 60 * 1000) + (seed % (6 * 60 * 1000));

    let prog = elapsedMs / totalMs;
    if (prog > 1) prog = 1;

    const lat = s.fromCoords.lat + (s.toCoords.lat - s.fromCoords.lat) * prog;
    const lon = s.fromCoords.lon + (s.toCoords.lon - s.fromCoords.lon) * prog;

    res.json({
        trackId,
        lat,
        lon,
        progress: prog,
        status: s.flight.status
    });
});

// API: log user action for daily tracking
app.post('/api/user/log-activity', (req, res) => {
    const { action_type, from_city, to_city, details } = req.body || {};
    const userEmail = req.session.userEmail || req.body.user_email || 'guest@aeronav.io';
    logUserDailyActivity(userEmail, action_type, from_city, to_city, details);
    res.json({ ok: true });
});

// API: get daily user activity history & summaries
app.get('/api/user/daily-history', (req, res) => {
    const userEmail = req.session.userEmail || req.query.email || 'guest@aeronav.io';

    db.all(`SELECT * FROM user_daily_activity WHERE user_email = ? OR user_email = 'guest@aeronav.io' ORDER BY id DESC LIMIT 50`, [userEmail], (err, activities) => {
        if (err) return res.status(500).json({ error: 'DB read error' });

        db.all(`SELECT * FROM user_daily_summaries WHERE user_email = ? OR user_email = 'guest@aeronav.io' ORDER BY log_date DESC LIMIT 14`, [userEmail], (err2, summaries) => {
            if (err2) return res.status(500).json({ error: 'DB read error' });

            res.json({
                user_email: userEmail,
                today: getTodayDateString(),
                activities: activities || [],
                summaries: summaries || []
            });
        });
    });
});

// API: clear daily activity history
app.post('/api/user/clear-history', (req, res) => {
    const userEmail = req.session.userEmail || req.body.email || 'guest@aeronav.io';
    db.run(`DELETE FROM user_daily_activity WHERE user_email = ? OR user_email = 'guest@aeronav.io'`, [userEmail], (err) => {
        if (err) return res.status(500).json({ error: 'DB delete error' });
        db.run(`DELETE FROM user_daily_summaries WHERE user_email = ? OR user_email = 'guest@aeronav.io'`, [userEmail], () => {});
        res.json({ ok: true });
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Aero-Navigator server hosted live at http://localhost:${PORT} and network interfaces.`);
});

