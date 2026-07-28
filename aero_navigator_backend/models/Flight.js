const axios = require('axios');
const { dbRun, dbGet, dbAll, generateId } = require('../database');

/**
 * Maps a flat SQLite row into the nested FlightDto structure
 * expected by the Android Retrofit models.
 */
function mapRowToFlight(row) {
    if (!row) return null;

    return {
        _id:           row.id,
        flightNumber:  row.flight_number,
        airline:       row.airline,
        airlineLogo:   row.airline_logo  || null,
        departure: {
            airportCode: row.departure_airport_code,
            airportName: row.departure_airport_name || null,
            city:        row.departure_city         || null,
            time:        row.departure_time,
            gate:        row.departure_gate         || null
        },
        arrival: {
            airportCode: row.arrival_airport_code,
            airportName: row.arrival_airport_name   || null,
            city:        row.arrival_city           || null,
            time:        row.arrival_time,
            gate:        row.arrival_gate           || null
        },
        durationMinutes: row.duration_minutes || null,
        price:           row.price,
        status:          row.status,
        liveLocation:    (row.live_lat != null && row.live_lat !== 0) ? {
            latitude:  row.live_lat,
            longitude: row.live_lng,
            altitude:  row.live_altitude,
            heading:   row.live_heading,
            speed:     row.live_speed
        } : null
    };
}

function resolveAirportCode(input) {
    if (!input) return null;
    const cleanInput = input.trim().toUpperCase();
    if (cleanInput.length === 3) return cleanInput;

    const cityToIata = {
        'CHENNAI': 'MAA', 'MADRAS': 'MAA',
        'DUBAI': 'DXB',
        'MUMBAI': 'BOM', 'BOMBAY': 'BOM',
        'DELHI': 'DEL', 'NEW DELHI': 'DEL',
        'BANGALORE': 'BLR', 'BENGALURU': 'BLR',
        'KOLKATA': 'CCU', 'CALCUTTA': 'CCU',
        'HYDERABAD': 'HYD',
        'SINGAPORE': 'SIN',
        'LONDON': 'LHR', 'HEATHROW': 'LHR',
        'NEW YORK': 'JFK', 'JFK': 'JFK', 'LAGUARDIA': 'LGA', 'NEWARK': 'EWR',
        'COCHIN': 'COK', 'KOCHI': 'COK',
        'TRIVANDRUM': 'TRV', 'THIRUVANANTHAPURAM': 'TRV',
        'GOI': 'GOI', 'GOA': 'GOI',
        'PUNE': 'PNQ',
        'AHMEDABAD': 'AMD',
        'ABU DHABI': 'AUH',
        'SHARJAH': 'SHJ',
        'DOHA': 'DOH',
        'BANGKOK': 'BKK',
        'KUALA LUMPUR': 'KUL',
        'PARIS': 'CDG',
        'TOKYO': 'HND', 'NARITA': 'NRT',
        'SYDNEY': 'SYD',
        'MELBOURNE': 'MEL',
        'COLOMBO': 'CMB',
        'MALE': 'MLE',
        'SAN FRANCISCO': 'SFO',
        'LOS ANGELES': 'LAX',
        'CHICAGO': 'ORD',
        'TORONTO': 'YYZ',
        'FRANKFURT': 'FRA',
        'DUBLIN': 'DUB',
        'AMSTERDAM': 'AMS',
        'ISTANBUL': 'IST',
        'RIYADH': 'RUH',
        'JEDDAH': 'JED',
        'MUSCAT': 'MCT',
        'KUWAIT': 'KWI',
        'BAHRAIN': 'BAH'
    };

    // 1. Exact match
    if (cityToIata[cleanInput]) {
        return cityToIata[cleanInput];
    }

    // 2. Substring/partial match
    for (const [city, code] of Object.entries(cityToIata)) {
        if (cleanInput.includes(city) || city.includes(cleanInput)) {
            return code;
        }
    }

    // 3. Database fallback with fuzzy LIKE search
    const row = dbGet(
        `SELECT departure_airport_code AS code FROM flights 
         WHERE UPPER(departure_city) LIKE ? OR UPPER(departure_airport_name) LIKE ? OR UPPER(departure_airport_code) = ?
         UNION
         SELECT arrival_airport_code AS code FROM flights 
         WHERE UPPER(arrival_city) LIKE ? OR UPPER(arrival_airport_name) LIKE ? OR UPPER(arrival_airport_code) = ?
         LIMIT 1`,
        [`%${cleanInput}%`, `%${cleanInput}%`, cleanInput, `%${cleanInput}%`, `%${cleanInput}%`, cleanInput]
    );

    return row ? row.code : cleanInput;
}

// Helper to calculate duration in minutes
function getDuration(depTime, arrTime) {
    const d1 = new Date(depTime);
    const d2 = new Date(arrTime);
    const diff = d2 - d1;
    return diff > 0 ? Math.round(diff / 60000) : 120; // fallback 2 hours
}

// Helper to calculate dynamic ticket price representing realistic costs
function calculateDynamicPrice(source, destination, depTime, airline) {
    let base = 4000;
    const route = `${source}-${destination}`;
    const basePrices = {
        'DEL-BOM': 4500, 'BOM-DEL': 4500,
        'DEL-BLR': 5500, 'BLR-DEL': 5500,
        'DEL-MAA': 5200, 'MAA-DEL': 5200,
        'DEL-CCU': 4800, 'CCU-DEL': 4800,
        'DEL-HYD': 4200, 'HYD-DEL': 4200,
        'BOM-BLR': 3800, 'BLR-BOM': 3800,
        'BOM-MAA': 4000, 'MAA-BOM': 4000,
        'BOM-CCU': 5800, 'CCU-BOM': 5800,
        'BOM-HYD': 3500, 'HYD-BOM': 3500,
        'BLR-MAA': 2500, 'MAA-BLR': 2500,
        'BLR-CCU': 5200, 'CCU-BLR': 5200,
        'BLR-HYD': 2800, 'HYD-BLR': 2800,
        'MAA-CCU': 4400, 'CCU-MAA': 4400,
        'MAA-HYD': 3000, 'HYD-MAA': 3000,
        'CCU-HYD': 4600, 'HYD-CCU': 4600,
        'DEL-DXB': 14000, 'DXB-DEL': 14000,
        'BOM-DXB': 13000, 'DXB-BOM': 13000,
        'BLR-DXB': 15000, 'DXB-BLR': 15000,
        'MAA-DXB': 16000, 'DXB-MAA': 16000,
        'DEL-SIN': 18000, 'SIN-DEL': 18000,
        'BOM-SIN': 17500, 'SIN-BOM': 17500,
        'BLR-SIN': 16000, 'SIN-BLR': 16000,
        'MAA-SIN': 15500, 'SIN-MAA': 15500
    };

    if (basePrices[route]) {
        base = basePrices[route];
    } else {
        if (['LHR', 'JFK', 'SFO', 'LAX', 'ORD', 'YYZ', 'CDG', 'SYD', 'MEL', 'FRA', 'AMS', 'DUB', 'IST'].includes(source) || 
            ['LHR', 'JFK', 'SFO', 'LAX', 'ORD', 'YYZ', 'CDG', 'SYD', 'MEL', 'FRA', 'AMS', 'DUB', 'IST'].includes(destination)) {
            base = 45000;
        } else if (['DXB', 'SIN', 'BKK', 'KUL', 'DOH', 'AUH', 'RUH', 'JED', 'MCT', 'KWI', 'BAH', 'CMB', 'MLE'].includes(source) || 
                   ['DXB', 'SIN', 'BKK', 'KUL', 'DOH', 'AUH', 'RUH', 'JED', 'MCT', 'KWI', 'BAH', 'CMB', 'MLE'].includes(destination)) {
            base = 15000;
        } else {
            base = 4500;
        }
    }

    const now = new Date();
    const depDate = new Date(depTime);
    const daysToDeparture = Math.max(0, (depDate - now) / (1000 * 60 * 60 * 24));

    let urgency = 1.0;
    if (daysToDeparture < 3) {
        urgency = 1.45;
    } else if (daysToDeparture < 7) {
        urgency = 1.25;
    } else if (daysToDeparture > 21) {
        urgency = 0.88;
    }

    let airlineMultiplier = 1.0;
    const cleanAirline = airline.toLowerCase();
    if (cleanAirline.includes('singapore') || cleanAirline.includes('emirates')) {
        airlineMultiplier = 1.35;
    } else if (cleanAirline.includes('indigo') || cleanAirline.includes('spicejet')) {
        airlineMultiplier = 0.85;
    }

    return Math.round(base * urgency * airlineMultiplier);
}

// Maps IATA code to a human-readable city name used everywhere
const IATA_TO_CITY = {
    'MAA': 'Chennai', 'DXB': 'Dubai', 'BOM': 'Mumbai', 'DEL': 'Delhi',
    'BLR': 'Bangalore', 'CCU': 'Kolkata', 'HYD': 'Hyderabad', 'SIN': 'Singapore',
    'LHR': 'London', 'JFK': 'New York', 'COK': 'Cochin', 'TRV': 'Trivandrum',
    'GOI': 'Goa', 'PNQ': 'Pune', 'AMD': 'Ahmedabad', 'AUH': 'Abu Dhabi',
    'SHJ': 'Sharjah', 'DOH': 'Doha', 'BKK': 'Bangkok', 'KUL': 'Kuala Lumpur',
    'CDG': 'Paris', 'HND': 'Tokyo', 'NRT': 'Tokyo Narita', 'SYD': 'Sydney',
    'MEL': 'Melbourne', 'CMB': 'Colombo', 'MLE': 'Male', 'SFO': 'San Francisco',
    'LAX': 'Los Angeles', 'ORD': 'Chicago', 'YYZ': 'Toronto', 'FRA': 'Frankfurt',
    'DUB': 'Dublin', 'AMS': 'Amsterdam', 'IST': 'Istanbul', 'RUH': 'Riyadh',
    'JED': 'Jeddah', 'MCT': 'Muscat', 'KWI': 'Kuwait', 'BAH': 'Bahrain'
};

// Fetch live schedules from Aviationstack and store in SQLite
async function fetchFlightsFromAviationstack(source, destination) {
    const apiKey = process.env.AVIATIONSTACK_API_KEY;
    if (!apiKey || apiKey === 'your_aviationstack_key_here') {
        console.warn('Aviationstack Access Key is not configured. Skipping API call.');
        return [];
    }

    try {
        console.log(`Querying Aviationstack for ${source} -> ${destination}...`);
        const response = await axios.get('http://api.aviationstack.com/v1/flights', {
            params: {
                access_key: apiKey,
                dep_iata: source,
                arr_iata: destination,
                limit: 10
            },
            timeout: 5000
        });

        const data = response.data?.data;
        if (!Array.isArray(data) || data.length === 0) {
            console.log(`No flights returned from Aviationstack for ${source} -> ${destination}.`);
            return [];
        }

        // Clean expired flights for this route first to prevent duplicates
        dbRun(
            'DELETE FROM flights WHERE departure_airport_code = ? AND arrival_airport_code = ?',
            [source, destination]
        );

        for (const f of data) {
            const flightNumber = f.flight?.iata || `${f.airline?.iata || 'AI'}-${f.flight?.number || '101'}`;
            const airlineName = f.airline?.name || 'Air India';
            const airlineLogo = `${airlineName.toLowerCase().replace(/\s+/g, '_')}_logo`;
            
            const depAirport = f.departure?.airport || `${source} Airport`;
            const depTime = f.departure?.scheduled || new Date().toISOString();
            const depGate = f.departure?.gate || 'A1';

            const arrAirport = f.arrival?.airport || `${destination} Airport`;
            const arrTime = f.arrival?.scheduled || new Date(Date.now() + 7200000).toISOString();
            const arrGate = f.arrival?.gate || 'B1';

            const duration = getDuration(depTime, arrTime);
            const price = calculateDynamicPrice(source, destination, depTime, airlineName);
            
            // Randomize status for telemetry demo purposes
            const statuses = ['scheduled', 'scheduled', 'boarding', 'in-air'];
            const status = f.flight_status || statuses[Math.floor(Math.random() * statuses.length)];

            const id = generateId();

            dbRun(`
                INSERT INTO flights (
                    id, flight_number, airline, airline_logo,
                    departure_airport_code, departure_airport_name, departure_city, departure_time, departure_gate,
                    arrival_airport_code, arrival_airport_name, arrival_city, arrival_time, arrival_gate,
                    duration_minutes, price, status,
                    live_lat, live_lng, live_altitude, live_heading, live_speed, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, datetime('now'))
            `, [
                id, flightNumber, airlineName, airlineLogo,
                source, depAirport, IATA_TO_CITY[source] || f.departure?.city || source, depTime, depGate,
                destination, arrAirport, IATA_TO_CITY[destination] || f.arrival?.city || destination, arrTime, arrGate,
                duration, price, status
            ]);
        }

        console.log(`Successfully fetched and cached ${data.length} flights from Aviationstack.`);
        return dbAll(
            'SELECT * FROM flights WHERE departure_airport_code = ? AND arrival_airport_code = ?',
            [source, destination]
        );
    } catch (e) {
        console.error('Aviationstack fetch error:', e.message);
        return [];
    }
}

// Fetch active global flights from Aviationstack
async function fetchActiveGlobalFlightsFromAviationstack() {
    const apiKey = process.env.AVIATIONSTACK_API_KEY;
    if (!apiKey || apiKey === 'your_aviationstack_key_here') {
        console.warn('Aviationstack Access Key is not configured. Skipping API call.');
        return [];
    }

    try {
        console.log(`Querying Aviationstack for global active flights...`);
        const response = await axios.get('http://api.aviationstack.com/v1/flights', {
            params: {
                access_key: apiKey,
                flight_status: 'active',
                limit: 50
            },
            timeout: 5000
        });

        const data = response.data?.data;
        if (!Array.isArray(data) || data.length === 0) {
            return [];
        }

        for (const f of data) {
            if (!f.departure?.iata || !f.arrival?.iata) continue;
            
            const source = f.departure.iata.toUpperCase();
            const destination = f.arrival.iata.toUpperCase();
            const flightNumber = f.flight?.iata || `${f.airline?.iata || 'AI'}-${f.flight?.number || '101'}`;
            const airlineName = f.airline?.name || 'Unknown Airline';
            const airlineLogo = `${airlineName.toLowerCase().replace(/\s+/g, '_')}_logo`;
            
            const depAirport = f.departure?.airport || `${source} Airport`;
            const depTime = f.departure?.scheduled || new Date().toISOString();
            const depGate = f.departure?.gate || 'A1';

            const arrAirport = f.arrival?.airport || `${destination} Airport`;
            const arrTime = f.arrival?.scheduled || new Date(Date.now() + 7200000).toISOString();
            const arrGate = f.arrival?.gate || 'B1';

            const duration = getDuration(depTime, arrTime);
            const price = calculateDynamicPrice(source, destination, depTime, airlineName);
            const status = 'in-air';

            const id = generateId();

            dbRun('DELETE FROM flights WHERE flight_number = ?', [flightNumber]);

            dbRun(`
                INSERT INTO flights (
                    id, flight_number, airline, airline_logo,
                    departure_airport_code, departure_airport_name, departure_city, departure_time, departure_gate,
                    arrival_airport_code, arrival_airport_name, arrival_city, arrival_time, arrival_gate,
                    duration_minutes, price, status,
                    live_lat, live_lng, live_altitude, live_heading, live_speed, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, datetime('now'))
            `, [
                id, flightNumber, airlineName, airlineLogo,
                source, depAirport, IATA_TO_CITY[source] || f.departure?.city || source, depTime, depGate,
                destination, arrAirport, IATA_TO_CITY[destination] || f.arrival?.city || destination, arrTime, arrGate,
                duration, price, status
            ]);
        }

        console.log(`Successfully fetched and cached global active flights from Aviationstack.`);
        return dbAll('SELECT * FROM flights LIMIT 50');
    } catch (e) {
        console.error('Aviationstack global fetch error:', e.message);
        return [];
    }
}


// Fetch live telemetry from OpenSky Network
async function fetchLiveTelemetryFromOpenSky(flightNumber) {
    try {
        console.log(`Querying OpenSky Network for flight: ${flightNumber}...`);
        const iataToIcao = {
            'AI': 'AIC', // Air India
            '6E': 'IBG', // IndiGo
            'SG': 'SEJ', // SpiceJet
            'UK': 'VTI', // Vistara
            'QP': 'AKP', // Akasa Air
            'EK': 'UAE', // Emirates
            'SQ': 'SIA'  // Singapore Airlines
        };

        const prefix = flightNumber.substring(0, 2).toUpperCase();
        const number = flightNumber.split('-')[1] || flightNumber.substring(2);
        const icaoPrefix = iataToIcao[prefix] || prefix;
        const callsignToMatch = `${icaoPrefix}${number}`.trim().toUpperCase();

        const response = await axios.get('https://opensky-network.org/api/states/all', {
            timeout: 4000
        });

        const states = response.data?.states;
        if (!Array.isArray(states)) return null;

        const matchedState = states.find(s => s[1] && s[1].trim().toUpperCase() === callsignToMatch);
        
        if (matchedState) {
            console.log(`Found active OpenSky state for callsign: ${callsignToMatch}`);
            return {
                latitude: parseFloat(matchedState[6]),
                longitude: parseFloat(matchedState[5]),
                altitude: parseFloat(matchedState[7] || 32000),
                heading: parseFloat(matchedState[10] || 90),
                speed: parseFloat((matchedState[9] || 240) * 3.6) // m/s to km/h
            };
        } else {
            console.log(`No active flight found in OpenSky for callsign: ${callsignToMatch}`);
            return null;
        }
    } catch (e) {
        console.warn('OpenSky Network fetch failed, returning mock telemetry fallback:', e.message);
        return null;
    }
}

// Generate dynamic fallback flights on-demand to guarantee that searching any route yields flights
function generateDynamicFlights(source, destination) {
    const airlines = [
        { name: 'Air India', prefix: 'AI', logo: 'air_india_logo' },
        { name: 'IndiGo', prefix: '6E', logo: 'indigo_logo' },
        { name: 'Vistara', prefix: 'UK', logo: 'vistara_logo' },
        { name: 'SpiceJet', prefix: 'SG', logo: 'spicejet_logo' }
    ];

    if (source === 'DXB' || destination === 'DXB') {
        airlines.unshift({ name: 'Emirates', prefix: 'EK', logo: 'emirates_logo' });
    }
    if (source === 'SIN' || destination === 'SIN') {
        airlines.unshift({ name: 'Singapore Airlines', prefix: 'SQ', logo: 'singapore_airlines_logo' });
    }

    const iataToCity = {
        'MAA': 'Chennai', 'DXB': 'Dubai', 'BOM': 'Mumbai', 'DEL': 'Delhi',
        'BLR': 'Bangalore', 'CCU': 'Kolkata', 'HYD': 'Hyderabad', 'SIN': 'Singapore',
        'LHR': 'London', 'JFK': 'New York', 'COK': 'Cochin', 'TRV': 'Trivandrum',
        'GOI': 'Goa', 'PNQ': 'Pune', 'AMD': 'Ahmedabad', 'AUH': 'Abu Dhabi',
        'SHJ': 'Sharjah', 'DOH': 'Doha', 'BKK': 'Bangkok', 'KUL': 'Kuala Lumpur',
        'CDG': 'Paris', 'HND': 'Tokyo', 'NRT': 'Tokyo', 'SYD': 'Sydney',
        'MEL': 'Melbourne', 'CMB': 'Colombo', 'MLE': 'Male', 'SFO': 'San Francisco',
        'LAX': 'Los Angeles', 'ORD': 'Chicago', 'YYZ': 'Toronto', 'FRA': 'Frankfurt',
        'DUB': 'Dublin', 'AMS': 'Amsterdam', 'IST': 'Istanbul', 'RUH': 'Riyadh',
        'JED': 'Jeddah', 'MCT': 'Muscat', 'KWI': 'Kuwait', 'BAH': 'Bahrain'
    };

    const depCity = iataToCity[source] || source;
    const arrCity = iataToCity[destination] || destination;

    // Clear any expired or empty states first for this route
    dbRun(
        'DELETE FROM flights WHERE departure_airport_code = ? AND arrival_airport_code = ?',
        [source, destination]
    );

    const now = Date.now();

    // 1. Generate one direct flight
    const airlineDir = airlines[0];
    const flightNumDir = `${airlineDir.prefix}-${100 + Math.floor(Math.random() * 900)}`;
    const depTimeDir = new Date(now + 3600000).toISOString();
    const arrTimeDir = new Date(now + 18000000).toISOString();
    const idDir = generateId();
    dbRun(`
        INSERT INTO flights (
            id, flight_number, airline, airline_logo,
            departure_airport_code, departure_airport_name, departure_city, departure_time, departure_gate,
            arrival_airport_code, arrival_airport_name, arrival_city, arrival_time, arrival_gate,
            duration_minutes, price, status,
            live_lat, live_lng, live_altitude, live_heading, live_speed, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, datetime('now'))
    `, [
        idDir, flightNumDir, airlineDir.name, airlineDir.logo,
        source, `${depCity} Airport`, depCity, depTimeDir, 'T1-G2',
        destination, `${arrCity} Airport`, arrCity, arrTimeDir, 'T2-A4',
        getDuration(depTimeDir, arrTimeDir), calculateDynamicPrice(source, destination, depTimeDir, airlineDir.name), 'scheduled'
    ]);

    // 2. Generate connecting flights via DXB
    const hub = 'DXB';
    const hubCity = 'Dubai';
    const airlineLeg1 = airlines[1];
    const airlineLeg2 = airlines[2];
    
    const idLeg1 = generateId();
    const idLeg2 = generateId();
    
    const depTimeLeg1 = new Date(now + 7200000).toISOString();
    const arrTimeLeg1 = new Date(now + 21600000).toISOString();
    const depTimeLeg2 = new Date(now + 28800000).toISOString();
    const arrTimeLeg2 = new Date(now + 43200000).toISOString();

    // Leg 1 (Source -> DXB)
    dbRun(`
        INSERT INTO flights (
            id, flight_number, airline, airline_logo,
            departure_airport_code, departure_airport_name, departure_city, departure_time, departure_gate,
            arrival_airport_code, arrival_airport_name, arrival_city, arrival_time, arrival_gate,
            duration_minutes, price, status,
            live_lat, live_lng, live_altitude, live_heading, live_speed, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, datetime('now'))
    `, [
        idLeg1, `${airlineLeg1.prefix}-${Math.floor(Math.random() * 900)}`, airlineLeg1.name, airlineLeg1.logo,
        source, `${depCity} Airport`, depCity, depTimeLeg1, 'T1-G4',
        hub, `${hubCity} Airport`, hubCity, arrTimeLeg1, 'T3-B2',
        getDuration(depTimeLeg1, arrTimeLeg1), calculateDynamicPrice(source, hub, depTimeLeg1, airlineLeg1.name), 'scheduled'
    ]);

    // Leg 2 (DXB -> Destination)
    dbRun(`
        INSERT INTO flights (
            id, flight_number, airline, airline_logo,
            departure_airport_code, departure_airport_name, departure_city, departure_time, departure_gate,
            arrival_airport_code, arrival_airport_name, arrival_city, arrival_time, arrival_gate,
            duration_minutes, price, status,
            live_lat, live_lng, live_altitude, live_heading, live_speed, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, datetime('now'))
    `, [
        idLeg2, `${airlineLeg2.prefix}-${Math.floor(Math.random() * 900)}`, airlineLeg2.name, airlineLeg2.logo,
        hub, `${hubCity} Airport`, hubCity, depTimeLeg2, 'T3-B5',
        destination, `${arrCity} Airport`, arrCity, arrTimeLeg2, 'T2-C1',
        getDuration(depTimeLeg2, arrTimeLeg2), calculateDynamicPrice(hub, destination, depTimeLeg2, airlineLeg2.name), 'scheduled'
    ]);

    console.log(`Generated and cached 2 fallback flights for route: ${source} -> ${destination}`);
    return dbAll(
        'SELECT * FROM flights WHERE departure_airport_code = ? AND arrival_airport_code = ?',
        [source, destination]
    );
}

/**
 * Flight model backed by sql.js SQLite with Aviationstack and OpenSky integrations.
 */
const Flight = {
    resolveAirportCode,
    /**
     * Find all flights optionally filtered by departure / arrival airport codes.
     */
    find: async (query = {}) => {
        let depKey = query['departure_airport_code'];
        let arrKey = query['arrival_airport_code'];

        if (depKey) depKey = resolveAirportCode(depKey);
        if (arrKey) arrKey = resolveAirportCode(arrKey);

        // Global empty search
        if (!depKey && !arrKey) {
            let cachedFlights = dbAll(`SELECT * FROM flights WHERE datetime(created_at) > datetime('now', '-24 hours') LIMIT 50`);
            if (cachedFlights.length < 10) {
                console.log('Fetching active global flights...');
                const globalFlights = await fetchActiveGlobalFlightsFromAviationstack();
                if (globalFlights && globalFlights.length > 0) {
                    cachedFlights = globalFlights;
                }
            }
            if (cachedFlights.length === 0) {
                cachedFlights = dbAll('SELECT * FROM flights LIMIT 50'); // fallback to anything
            }
            return cachedFlights.map(mapRowToFlight);
        }

        // Exact route search
        if (depKey && arrKey && !depKey.includes('%') && !arrKey.includes('%')) {
            const source = depKey.toUpperCase();
            const destination = arrKey.toUpperCase();

            // 1. Check if we have cached flights for this specific route within 24 hours
            let cachedFlights = dbAll(
                `SELECT * FROM flights 
                 WHERE departure_airport_code = ? AND arrival_airport_code = ? 
                   AND datetime(created_at) > datetime('now', '-24 hours')`,
                [source, destination]
            );

            // 2. Fetch live data if cache is empty or expired
            if (cachedFlights.length === 0) {
                console.log(`Cache miss/expired for ${source} -> ${destination}. Fetching from Aviationstack...`);
                const apiFlights = await fetchFlightsFromAviationstack(source, destination);
                if (apiFlights && apiFlights.length > 0) {
                    cachedFlights = apiFlights;
                    // Seed the database with some connecting legs to ensure the UI feature can be demonstrated
                    generateDynamicFlights(source, destination);
                } else {
                    // Failover to expired cache first
                    const expired = dbAll(
                        'SELECT * FROM flights WHERE departure_airport_code = ? AND arrival_airport_code = ?',
                        [source, destination]
                    );
                    if (expired && expired.length > 0) {
                        cachedFlights = expired;
                    } else {
                        // Dynamically generate fallback flights so any route search always yields results
                        cachedFlights = generateDynamicFlights(source, destination);
                    }
                }
            }

            const directFlights = cachedFlights.map(mapRowToFlight);

            // 3. Calculate connecting flights
            const legs1 = dbAll('SELECT * FROM flights WHERE departure_airport_code = ?', [source]).map(mapRowToFlight);
            const legs2 = dbAll('SELECT * FROM flights WHERE arrival_airport_code = ?', [destination]).map(mapRowToFlight);

            const connectingFlights = [];
            for (const f1 of legs1) {
                for (const f2 of legs2) {
                    if (f1.arrival.airportCode === f2.departure.airportCode) {
                        if (f1._id === f2._id) continue;

                        const time1 = new Date(f1.arrival.time);
                        const time2 = new Date(f2.departure.time);
                        const layoverMs = time2 - time1;

                        if (layoverMs >= 30 * 60 * 1000 && layoverMs <= 12 * 60 * 60 * 1000) {
                            connectingFlights.push({
                                _id: `${f1._id}_${f2._id}`,
                                flightNumber: `${f1.flightNumber} ➔ ${f2.flightNumber}`,
                                airline: `${f1.airline} + ${f2.airline} (1 Layover)`,
                                airlineLogo: f1.airlineLogo,
                                departure: f1.departure,
                                arrival: f2.arrival,
                                durationMinutes: (f1.durationMinutes || 0) + (f2.durationMinutes || 0) + Math.round(layoverMs / 60000),
                                price: f1.price + f2.price,
                                status: `1 Stop (${f1.arrival.airportCode})`,
                                liveLocation: f1.status === 'in-air' ? f1.liveLocation : (f2.status === 'in-air' ? f2.liveLocation : null)
                            });
                        }
                    }
                }
            }

            return [...directFlights, ...connectingFlights, ...legs1, ...legs2];
        }

        // Fuzzy fallback query
        let sql = 'SELECT * FROM flights WHERE 1=1';
        const params = [];

        if (depKey) {
            const val = `%${depKey}%`;
            sql += ' AND (departure_airport_code LIKE ? OR departure_city LIKE ?)';
            params.push(val, val);
        }
        if (arrKey) {
            const val = `%${arrKey}%`;
            sql += ' AND (arrival_airport_code LIKE ? OR arrival_city LIKE ?)';
            params.push(val, val);
        }

        return dbAll(sql, params).map(mapRowToFlight);
    },

    /**
     * Find a single flight by its ID (supporting composite layout keys)
     */
    findById: async (id) => {
        if (id && id.includes('_')) {
            const ids = id.split('_');
            const f1 = mapRowToFlight(dbGet('SELECT * FROM flights WHERE id = ? LIMIT 1', [ids[0]]));
            const f2 = mapRowToFlight(dbGet('SELECT * FROM flights WHERE id = ? LIMIT 1', [ids[1]]));
            if (!f1) return null;
            if (!f2) return f1;

            const time1 = new Date(f1.arrival.time);
            const time2 = new Date(f2.departure.time);
            const layoverMs = time2 - time1;

            return {
                _id: id,
                flightNumber: `${f1.flightNumber} ➔ ${f2.flightNumber}`,
                airline: `${f1.airline} + ${f2.airline} (1 Layover)`,
                airlineLogo: f1.airlineLogo,
                departure: f1.departure,
                arrival: f2.arrival,
                durationMinutes: (f1.durationMinutes || 0) + (f2.durationMinutes || 0) + Math.round(layoverMs / 60000),
                price: f1.price + f2.price,
                status: `1 Stop (${f1.arrival.airportCode})`,
                liveLocation: f1.status === 'in-air' ? f1.liveLocation : (f2.status === 'in-air' ? f2.liveLocation : null)
            };
        }

        const flightRow = dbGet('SELECT * FROM flights WHERE id = ? LIMIT 1', [id]);
        if (!flightRow) return null;

        const flight = mapRowToFlight(flightRow);

        if (flight && flight.status === 'in-air') {
            const liveData = await fetchLiveTelemetryFromOpenSky(flight.flightNumber);
            if (liveData) {
                flight.liveLocation = liveData;
                dbRun(
                    `UPDATE flights
                     SET live_lat = ?, live_lng = ?, live_altitude = ?, live_heading = ?, live_speed = ?
                     WHERE id = ?`,
                    [liveData.latitude, liveData.longitude, liveData.altitude, liveData.heading, liveData.speed, id]
                );
            }
        }

        return flight;
    },

    /**
     * Persist live telemetry data for a flight
     */
    updateLiveLocation: (id, lat, lng, altitude, heading, speed) => {
        if (id && id.includes('_')) {
            const ids = id.split('_');
            const f1 = mapRowToFlight(dbGet('SELECT * FROM flights WHERE id = ? LIMIT 1', [ids[0]]));
            const targetId = (f1 && f1.status === 'in-air') ? ids[0] : ids[1];
            dbRun(
                `UPDATE flights
                 SET live_lat = ?, live_lng = ?, live_altitude = ?, live_heading = ?, live_speed = ?
                 WHERE id = ?`,
                [lat, lng, altitude, heading, speed, targetId]
            );
            return;
        }

        dbRun(
            `UPDATE flights
             SET live_lat = ?, live_lng = ?, live_altitude = ?, live_heading = ?, live_speed = ?
             WHERE id = ?`,
            [lat, lng, altitude, heading, speed, id]
        );
    }
};

module.exports = Flight;
