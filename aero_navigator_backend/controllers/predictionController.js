const axios = require('axios');
const Flight = require('../models/Flight');
const { dbAll, dbGet } = require('../database');

// ── Helper: compute mean & stddev of an array ────────────────────────────────
function stats(arr) {
    if (!arr.length) return { mean: 0, std: 0 };
    const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
    const std = Math.sqrt(arr.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / arr.length);
    return { mean, std };
}

// ── IATA → city name map (shared) ─────────────────────────────────────────────
const IATA_TO_CITY = {
    'MAA':'Chennai','DXB':'Dubai','BOM':'Mumbai','DEL':'Delhi',
    'BLR':'Bangalore','CCU':'Kolkata','HYD':'Hyderabad','SIN':'Singapore',
    'LHR':'London','JFK':'New York','COK':'Cochin','TRV':'Trivandrum',
    'GOI':'Goa','PNQ':'Pune','AMD':'Ahmedabad','AUH':'Abu Dhabi',
    'SHJ':'Sharjah','DOH':'Doha','BKK':'Bangkok','KUL':'Kuala Lumpur',
    'CDG':'Paris','HND':'Tokyo','NRT':'Tokyo Narita','SYD':'Sydney',
    'MEL':'Melbourne','CMB':'Colombo','MLE':'Male','SFO':'San Francisco',
    'LAX':'Los Angeles','ORD':'Chicago','YYZ':'Toronto','FRA':'Frankfurt',
    'DUB':'Dublin','AMS':'Amsterdam','IST':'Istanbul','RUH':'Riyadh',
    'JED':'Jeddah','MCT':'Muscat','KWI':'Kuwait','BAH':'Bahrain'
};

// ── Helper: map a raw DB row to the nested FlightDto used by the app ──────────
function mapRow(row) {
    if (!row) return null;
    return {
        _id: row.id,
        flightNumber: row.flight_number,
        airline: row.airline,
        airlineLogo: row.airline_logo || null,
        departure: {
            airportCode: row.departure_airport_code,
            airportName: row.departure_airport_name || null,
            city: IATA_TO_CITY[row.departure_airport_code] || row.departure_city || row.departure_airport_code,
            time: row.departure_time,
            gate: row.departure_gate || null
        },
        arrival: {
            airportCode: row.arrival_airport_code,
            airportName: row.arrival_airport_name || null,
            city: IATA_TO_CITY[row.arrival_airport_code] || row.arrival_city || row.arrival_airport_code,
            time: row.arrival_time,
            gate: row.arrival_gate || null
        },
        durationMinutes: row.duration_minutes || null,
        price: row.price,
        status: row.status,
        liveLocation: (row.live_lat && row.live_lat !== 0) ? {
            latitude: row.live_lat,
            longitude: row.live_lng,
            altitude: row.live_altitude,
            heading: row.live_heading,
            speed: row.live_speed
        } : null
    };
}

// ── Helper: DB-only search (no API call, no generation) ───────────────────────
function findCachedFlights(src, dst) {
    const rows = dbAll(
        'SELECT * FROM flights WHERE departure_airport_code = ? AND arrival_airport_code = ? ORDER BY price ASC LIMIT 5',
        [src, dst]
    );
    return rows.map(mapRow).filter(Boolean);
}

// ── Helper: generate two placeholder flights for a hub leg ─────────────────────
function generateHubLegFlights(src, dst) {
    const ROUTE_PRICES = {
        'MAA-DXB':16000,'DXB-MAA':16000,'MAA-DOH':15000,'DOH-MAA':15000,
        'MAA-AUH':14500,'AUH-MAA':14500,'MAA-SIN':15500,'SIN-MAA':15500,
        'MAA-BOM':4000,'BOM-MAA':4000,'MAA-DEL':5200,'DEL-MAA':5200,
        'MAA-BLR':2500,'BLR-MAA':2500,'MAA-LHR':35000,'LHR-MAA':35000,
        'MAA-IST':22000,'IST-MAA':22000,'MAA-FRA':28000,'FRA-MAA':28000,
        'MAA-BKK':12000,'BKK-MAA':12000,'MAA-KUL':11000,'KUL-MAA':11000,
        'DXB-LHR':18000,'LHR-DXB':18000,'DOH-LHR':17000,'LHR-DOH':17000,
        'AUH-LHR':16500,'LHR-AUH':16500,'SIN-LHR':32000,'LHR-SIN':32000,
        'SIN-SYD':15000,'SYD-SIN':15000,'DXB-SYD':28000,'SYD-DXB':28000,
        'BOM-LHR':28000,'LHR-BOM':28000,'DEL-LHR':25000,'LHR-DEL':25000,
        'IST-LHR':12000,'LHR-IST':12000,'FRA-LHR':9000,'LHR-FRA':9000,
        'BKK-LHR':28000,'LHR-BKK':28000,'KUL-LHR':27000,'LHR-KUL':27000,
        'DEL-DXB':14000,'DXB-DEL':14000,'BOM-DXB':13000,'DXB-BOM':13000,
        'BLR-DXB':15000,'DXB-BLR':15000,'DEL-SIN':18000,'SIN-DEL':18000,
        'BOM-SIN':17500,'SIN-BOM':17500,'BLR-SIN':16000,'SIN-BLR':16000,
        'DEL-BOM':4500,'BOM-DEL':4500,'DEL-BLR':5500,'BLR-DEL':5500,
    };
    const DURATIONS = {
        'MAA-DXB':240,'DXB-LHR':420,'MAA-DOH':210,'DOH-LHR':390,
        'MAA-AUH':225,'AUH-LHR':405,'MAA-SIN':255,'SIN-LHR':720,
        'MAA-BOM':100,'BOM-LHR':540,'MAA-DEL':150,'DEL-LHR':480,
        'MAA-IST':360,'IST-LHR':210,'MAA-FRA':480,'FRA-LHR':120,
        'MAA-BKK':180,'BKK-LHR':680,'MAA-KUL':210,'KUL-LHR':690,
        'DXB-MAA':240,'DOH-MAA':210,'AUH-MAA':225,'SIN-MAA':255,
        'BOM-MAA':100,'DEL-MAA':150,'IST-MAA':360,'FRA-MAA':480,
        'BKK-MAA':180,'KUL-MAA':210,'LHR-DXB':420,'LHR-DOH':390,
        'LHR-AUH':405,'LHR-SIN':720,'LHR-BOM':540,'LHR-DEL':480,
        'LHR-IST':210,'LHR-FRA':120,'LHR-BKK':680,'LHR-KUL':690,
        'DEL-DXB':220,'BOM-DXB':200,'BLR-DXB':260,'DEL-SIN':280,
        'BOM-SIN':300,'BLR-SIN':270,'DEL-BOM':90,'BOM-DEL':90,
    };
    const route = `${src}-${dst}`;
    const price = ROUTE_PRICES[route] || 15000;
    const dur = DURATIONS[route] || 180;
    const srcCity = IATA_TO_CITY[src] || src;
    const dstCity = IATA_TO_CITY[dst] || dst;
    const now = new Date();
    const depTime = new Date(now.getTime() + 2 * 3600000).toISOString();
    const arrTime = new Date(now.getTime() + 2 * 3600000 + dur * 60000).toISOString();
    return [{
        _id: `gen-${src}-${dst}`,
        flightNumber: `AI-${Math.floor(100 + Math.random() * 900)}`,
        airline: src === 'DXB' || dst === 'DXB' ? 'Emirates' :
                 src === 'DOH' || dst === 'DOH' ? 'Qatar Airways' :
                 src === 'SIN' || dst === 'SIN' ? 'Singapore Airlines' :
                 'Air India',
        airlineLogo: null,
        departure: { airportCode: src, airportName: `${srcCity} Airport`, city: srcCity, time: depTime, gate: 'A1' },
        arrival:   { airportCode: dst, airportName: `${dstCity} Airport`, city: dstCity, time: arrTime, gate: 'B2' },
        durationMinutes: dur,
        price,
        status: 'scheduled',
        liveLocation: null
    }];
}

// ── Helper: get best cached or generated flight for a leg ─────────────────────
function getBestLeg(src, dst) {
    const cached = findCachedFlights(src, dst);
    if (cached.length > 0) return cached[0]; // cheapest cached
    // Fall back to price-table generated flight
    const gen = generateHubLegFlights(src, dst);
    return gen[0] || null;
}

// ── Helper: build real price history & forecast from DB records ──────────────
function buildRealHistoryAndForecast(source, destination) {
    const today = new Date();
    const rows = dbAll(
        `SELECT price, departure_time FROM flights
         WHERE departure_airport_code = ? AND arrival_airport_code = ?
         ORDER BY departure_time ASC`,
        [source, destination]
    );
    const priceByDate = {};
    for (const row of rows) {
        const day = row.departure_time.split('T')[0];
        if (!priceByDate[day]) priceByDate[day] = [];
        priceByDate[day].push(row.price);
    }
    const dateMap = {};
    for (const [day, prices] of Object.entries(priceByDate)) {
        dateMap[day] = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
    }
    const allPrices = rows.map(r => r.price);
    const { mean, std } = stats(allPrices);
    const basePrice = mean || 4500;
    const safeStd = std || basePrice * 0.1;
    const history = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        const deterministicOffset = safeStd * (((i * 7) % 10) - 5) / 10;
        history.push({ date: key, price: dateMap[key] || Math.round(basePrice + deterministicOffset) });
    }
    const forecast = [];
    for (let i = 1; i <= 7; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        const key = d.toISOString().split('T')[0];
        const demandMultiplier = 1 + (7 - i) * 0.01;
        forecast.push({ date: key, price: dateMap[key] || Math.round(basePrice * demandMultiplier) });
    }
    return { history, forecast, basePrice, safeStd };
}

// ── Helper: derive price factors from real DB patterns ──────────────────────
function derivePriceFactors(source, destination) {
    const directCount = dbAll(
        'SELECT COUNT(*) as c FROM flights WHERE departure_airport_code = ? AND arrival_airport_code = ?',
        [source, destination]
    )[0]?.c || 0;
    const airlineCount = dbAll(
        'SELECT COUNT(DISTINCT airline) as c FROM flights WHERE departure_airport_code = ? AND arrival_airport_code = ?',
        [source, destination]
    )[0]?.c || 0;
    return {
        demand: directCount > 5 ? 'High' : directCount > 2 ? 'Medium' : 'Low',
        competition: airlineCount > 3 ? 'High' : airlineCount > 1 ? 'Medium' : 'Low',
        seasonality: 'Medium'
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// @desc  Get fare prediction from AI microservice
// @route GET /prediction/fare
// ─────────────────────────────────────────────────────────────────────────────
const getFarePrediction = async (req, res) => {
    const { source, destination, date } = req.query;
    if (!source || !destination) {
        return res.status(400).json({ message: 'source and destination are required' });
    }
    const sourceIata = Flight.resolveAirportCode(source).toUpperCase();
    const destIata   = Flight.resolveAirportCode(destination).toUpperCase();

    // Build cheapest route summary (direct vs best connecting)
    const directFlights = findCachedFlights(sourceIata, destIata);
    const directMinPrice = directFlights.length ? directFlights[0].price : null;

    // Check top 3 hubs for cheapest connection
    const TOP_HUBS = ['DXB', 'DOH', 'SIN', 'BOM', 'DEL', 'IST'].filter(h => h !== sourceIata && h !== destIata);
    let cheapestConnPrice = null;
    let cheapestConnHub   = null;
    for (const hub of TOP_HUBS) {
        const leg1 = getBestLeg(sourceIata, hub);
        const leg2 = getBestLeg(hub, destIata);
        if (leg1 && leg2) {
            const connTotal = leg1.price + leg2.price;
            if (cheapestConnPrice === null || connTotal < cheapestConnPrice) {
                cheapestConnPrice = connTotal;
                cheapestConnHub   = hub;
            }
        }
    }

    let cheapestRouteSummary = null;
    if (directMinPrice !== null || cheapestConnPrice !== null) {
        const savings = cheapestConnPrice !== null && directMinPrice !== null
            ? Math.round(directMinPrice - cheapestConnPrice)
            : 0;
        cheapestRouteSummary = {
            direct: directMinPrice ? Math.round(directMinPrice) : null,
            viaHub: cheapestConnPrice ? Math.round(cheapestConnPrice) : null,
            bestHub: cheapestConnHub,
            bestHubCity: cheapestConnHub ? IATA_TO_CITY[cheapestConnHub] : null,
            savings: Math.max(0, savings),
            recommendation: savings > 1000 ? 'Take connecting route via ' + (IATA_TO_CITY[cheapestConnHub] || cheapestConnHub) + ' to save ₹' + savings
                : 'Direct flight is your best option'
        };
    }

    try {
        const aiResponse = await axios.get('http://127.0.0.1:5001/predict/fare', {
            params: { source: sourceIata, destination: destIata, date },
            timeout: 5000
        });
        const { history, forecast, basePrice } = buildRealHistoryAndForecast(sourceIata, destIata);
        const priceFactors = derivePriceFactors(sourceIata, destIata);
        return res.json({ ...aiResponse.data, history, forecast, priceFactors, cheapestRouteSummary });
    } catch (aiError) {
        console.warn('AI Microservice unavailable, using DB-driven fallback:', aiError.message);
        const { history, forecast, basePrice, safeStd } = buildRealHistoryAndForecast(sourceIata, destIata);
        const priceFactors = derivePriceFactors(sourceIata, destIata);
        const futureFlights = dbAll(
            `SELECT price FROM flights WHERE departure_airport_code = ? AND arrival_airport_code = ?
               AND departure_time > datetime('now') ORDER BY price ASC`,
            [sourceIata, destIata]
        );
        const futurePrices = futureFlights.map(f => f.price);
        const low    = futurePrices.length ? Math.round(futurePrices[0]) : Math.round(basePrice * 0.85);
        const high   = futurePrices.length ? Math.round(futurePrices[futurePrices.length - 1]) : Math.round(basePrice * 1.2);
        const medium = futurePrices.length ? Math.round(futurePrices[Math.floor(futurePrices.length / 2)]) : Math.round(basePrice);
        const cv = basePrice > 0 ? safeStd / basePrice : 0.2;
        const confidence = Math.round(Math.max(70, Math.min(95, 100 - cv * 100)));
        const recommendation = low < medium * 0.92 ? 'wait' : 'buy';
        const dropPercent = medium > 0 ? Math.round(((medium - low) / medium) * 100) : 10;
        return res.json({
            source: sourceIata, destination: destIata, date,
            prediction: { low, medium, high, confidence, recommendation,
                predictedDropPercent: dropPercent,
                bestBookingWindow: recommendation === 'wait' ? 'Days 5-7' : 'Instant',
                priceTrend: recommendation === 'wait' ? 'dropping' : 'stable'
            },
            history, forecast, priceFactors, cheapestRouteSummary
        });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc  Get optimized routes: direct + all viable connecting routes via hubs
// @route GET /prediction/optimize
// ─────────────────────────────────────────────────────────────────────────────
const getOptimizedRoutes = async (req, res) => {
    try {
        const { source, destination, date } = req.query;
        if (!source || !destination) {
            return res.status(400).json({ message: 'source and destination are required' });
        }

        const src = Flight.resolveAirportCode(source).toUpperCase();
        const dst = Flight.resolveAirportCode(destination).toUpperCase();

        // Major global hub airports to check for 1-stop connections
        const HUB_LIST = [
            { code: 'DXB', city: 'Dubai' },
            { code: 'DOH', city: 'Doha' },
            { code: 'AUH', city: 'Abu Dhabi' },
            { code: 'SIN', city: 'Singapore' },
            { code: 'BOM', city: 'Mumbai' },
            { code: 'DEL', city: 'Delhi' },
            { code: 'LHR', city: 'London' },
            { code: 'IST', city: 'Istanbul' },
            { code: 'FRA', city: 'Frankfurt' },
            { code: 'BKK', city: 'Bangkok' },
            { code: 'KUL', city: 'Kuala Lumpur' },
            { code: 'BLR', city: 'Bangalore' },
            { code: 'CCU', city: 'Kolkata' },
            { code: 'HYD', city: 'Hyderabad' },
        ].filter(h => h.code !== src && h.code !== dst);

        const routeOptions = [];

        // ── 1. Direct flights (via full Flight.find which may trigger Aviationstack) ──
        let directFlights = [];
        try {
            directFlights = await Flight.find({
                departure_airport_code: src,
                arrival_airport_code: dst
            });
            // Only include pure direct flights matching src and dst (ignoring legs and connected flights)
            directFlights = directFlights.filter(f => 
                !f.status.includes('Stop') && 
                f.departure.airportCode === src && 
                f.arrival.airportCode === dst
            );
        } catch (e) {
            console.warn('Direct flight fetch failed:', e.message);
        }

        // Sort direct by price, take top 3 cheapest + top 1 fastest
        const directByPrice = [...directFlights].sort((a, b) => a.price - b.price);
        const directBySpeed = [...directFlights].sort((a, b) => (a.durationMinutes || 9999) - (b.durationMinutes || 9999));

        const seen = new Set();
        const topDirect = [];
        for (const f of [...directByPrice.slice(0, 3), directBySpeed[0]].filter(Boolean)) {
            if (!seen.has(f._id)) { seen.add(f._id); topDirect.push(f); }
        }

        for (const f of topDirect) {
            routeOptions.push({
                id: `direct-${f._id}`,
                type: 'direct',
                via: null,
                viaCity: null,
                totalPrice: f.price,
                totalDurationMinutes: f.durationMinutes || 0,
                stops: 0,
                layoverMinutes: 0,
                legs: [f],
                tags: [],
                savings: 0,
                score: 0
            });
        }

        // ── 2. Connecting routes via each hub ────────────────────────────────────
        for (const hub of HUB_LIST) {
            const leg1 = getBestLeg(src, hub.code);
            const leg2 = getBestLeg(hub.code, dst);
            if (!leg1 || !leg2) continue;

            const totalPrice = leg1.price + leg2.price;
            const leg1Dur    = leg1.durationMinutes || 120;
            const leg2Dur    = leg2.durationMinutes || 120;
            const layover    = 90; // minimum standard layover in minutes
            const totalDur   = leg1Dur + layover + leg2Dur;

            routeOptions.push({
                id: `via-${hub.code}`,
                type: 'connecting',
                via: hub.code,
                viaCity: hub.city,
                totalPrice,
                totalDurationMinutes: totalDur,
                stops: 1,
                layoverMinutes: layover,
                legs: [leg1, leg2],
                tags: [],
                savings: 0,
                score: 0
            });
        }

        if (routeOptions.length === 0) {
            return res.json({ routes: [], cheapestPrice: 0, bestRoute: null,
                cheapestRoute: null, fastestRoute: null,
                message: 'No routes found for this pair.' });
        }

        // ── 3. Score each route 0-100 (higher = better overall) ─────────────────
        // Weights: price 45%, duration 45%, direct bonus 10%
        const prices    = routeOptions.map(r => r.totalPrice);
        const durations = routeOptions.map(r => r.totalDurationMinutes);
        const minPrice  = Math.min(...prices);
        const maxPrice  = Math.max(...prices);
        const minDur    = Math.min(...durations.filter(d => d > 0));
        const maxDur    = Math.max(...durations);
        const priceRange = maxPrice - minPrice || 1;
        const durRange   = maxDur - minDur || 1;

        for (const r of routeOptions) {
            const priceScore = ((maxPrice - r.totalPrice) / priceRange) * 45;
            const durScore   = r.totalDurationMinutes > 0
                ? ((maxDur - r.totalDurationMinutes) / durRange) * 45
                : 22.5;
            const directBonus = r.stops === 0 ? 10 : 0;
            r.score = Math.round(priceScore + durScore + directBonus);
        }

        // ── 4. Sort by score descending ──────────────────────────────────────────
        routeOptions.sort((a, b) => b.score - a.score);

        // ── 5. Assign tags ───────────────────────────────────────────────────────
        const cheapestOpt = [...routeOptions].sort((a, b) => a.totalPrice - b.totalPrice)[0];
        const fastestOpt  = [...routeOptions].sort((a, b) => a.totalDurationMinutes - b.totalDurationMinutes)[0];
        const bestOpt     = routeOptions[0]; // highest score

        const cheapestConnOpt = routeOptions.find(r => r.type === 'connecting' &&
            r.totalPrice === Math.min(...routeOptions.filter(x => x.type === 'connecting').map(x => x.totalPrice)));
        const cheapestDirectOpt = routeOptions.find(r => r.type === 'direct' &&
            r.totalPrice === Math.min(...routeOptions.filter(x => x.type === 'direct').map(x => x.totalPrice)));

        const taggedIds = new Set();
        for (const r of routeOptions) {
            r.tags = [];
            if (r.id === bestOpt.id && !taggedIds.has('best')) {
                r.tags.push('Best Overall');
                taggedIds.add('best');
            }
            if (r.id === cheapestOpt.id && !taggedIds.has('cheapest')) {
                r.tags.push('Cheapest');
                taggedIds.add('cheapest');
            }
            if (r.id === fastestOpt.id && !taggedIds.has('fastest')) {
                r.tags.push('Fastest');
                taggedIds.add('fastest');
            }
            if (cheapestDirectOpt && r.id === cheapestDirectOpt.id && !r.tags.length) {
                r.tags.push('Best Direct');
            }
            if (cheapestConnOpt && r.id === cheapestConnOpt.id && !r.tags.length) {
                r.tags.push('Budget Connect');
            }
            r.savings = r.totalPrice > cheapestOpt.totalPrice
                ? Math.round(r.totalPrice - cheapestOpt.totalPrice)
                : 0;
        }

        // Limit to top 8 routes for performance
        const topRoutes = routeOptions.slice(0, 8);

        return res.json({
            routes: topRoutes,
            bestRoute: bestOpt.id,
            cheapestPrice: Math.round(cheapestOpt.totalPrice),
            cheapestRoute: cheapestOpt.id,
            fastestRoute: fastestOpt.id
        });

    } catch (error) {
        console.error('getOptimizedRoutes error:', error.message);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getFarePrediction, getOptimizedRoutes };
