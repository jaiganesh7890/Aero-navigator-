const sqlite3 = require('sqlite3').verbose();
const fetch = require('node-fetch');
const path = require('path');

// Configuration via env
const INTERVAL_SECONDS = parseInt(process.env.PRICE_SNAPSHOT_INTERVAL || '300', 10); // default 5 minutes
const ROUTES_RAW = process.env.PRICE_SNAPSHOT_ROUTES || 'MAA-LHR,DEL-LHR'; // comma separated ORIGIN-DEST
const AVIATION_KEY = process.env.AVIATIONSTACK_KEY || null;

const dbPath = path.join(__dirname, '..', 'aero_navigator.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) return console.error('Worker DB open error:', err.message);
  console.log('Price collector connected to DB.');
});

function parseRoutes(raw) {
  return raw.split(',').map(s => s.trim()).filter(Boolean).map(pair => {
    const [o,d] = pair.split('-').map(x=>x.trim().toUpperCase());
    return { origin: o, destination: d };
  });
}

async function fetchPricesForRoute(route) {
  const { origin, destination } = route;
  // If AviationStack key is present, try to fetch flights and generate price samples
  if (AVIATION_KEY) {
    try {
      const url = `http://api.aviationstack.com/v1/flights?access_key=${encodeURIComponent(AVIATION_KEY)}&dep_iata=${encodeURIComponent(origin)}&arr_iata=${encodeURIComponent(destination)}`;
      const res = await fetch(url, { timeout: 15000 });
      const json = await res.json();
      if (json && json.data && json.data.length > 0) {
        // use first few flights to create price snapshots
        const prices = json.data.slice(0,4).map(() => Math.round(7000 + Math.random()*40000));
        return prices;
      }
    } catch (e) {
      console.error('AviationStack fetch error for', origin, destination, e && e.message);
    }
  }
  // fallback simulated prices
  const base = 8000 + Math.round(Math.random()*3000);
  return [base + Math.round(Math.random()*800), base + Math.round(Math.random()*1200)];
}

function insertPrices(route, prices) {
  const stmt = db.prepare(`INSERT INTO price_history (origin, destination, price) VALUES (?, ?, ?)`);
  for (const p of prices) {
    stmt.run(route.origin, route.destination, p, (err) => {
      if (err) console.error('Failed to insert price snapshot', err.message);
    });
  }
  stmt.finalize();
}

async function snapshotOnce(routes) {
  for (const r of routes) {
    try {
      const prices = await fetchPricesForRoute(r);
      insertPrices(r, prices);
      console.log(new Date().toISOString(), 'snapshotted', r.origin, r.destination, prices.join(','));
    } catch (e) {
      console.error('Snapshot error for route', r, e && e.message);
    }
  }
}

async function main() {
  const routes = parseRoutes(ROUTES_RAW);
  if (!routes.length) {
    console.error('No routes configured to snapshot. Set PRICE_SNAPSHOT_ROUTES env var.');
    process.exit(1);
  }
  console.log('Starting price collector for routes:', routes.map(r=>`${r.origin}-${r.destination}`).join(', '), `interval=${INTERVAL_SECONDS}s`);
  // initial run
  await snapshotOnce(routes);
  setInterval(() => snapshotOnce(routes), INTERVAL_SECONDS * 1000);
}

main().catch(err => { console.error('Worker fatal error:', err && err.stack); process.exit(1); });
