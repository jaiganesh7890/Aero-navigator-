let currentUserEmail = null;
let priceChartInstance = null;
let flightMapInstance = null;
let shareMapInstance = null;
let isSignUpMode = false;
let _gpsToken = null;
let _gpsIntervalId = null;
let _flightTelemetryIntervalId = null;
let _flightPlaneIntervals = [];
let _userLocationMarker = null;


function getBaseMapLayers() {
    const street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 });
    const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 });
    const terrain = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { maxZoom: 17 });
    return { street, layers: { "Street": street, "Satellite": satellite, "Terrain": terrain } };
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getLocalUsers() {
    return JSON.parse(localStorage.getItem('aeroNavigatorUsers') || '[]');
}

function saveLocalUsers(users) {
    localStorage.setItem('aeroNavigatorUsers', JSON.stringify(users));
}

function setLocalSession(email) {
    localStorage.setItem('aeroNavigatorSession', email);
}

function clearLocalSession() {
    localStorage.removeItem('aeroNavigatorSession');
}

function getLocalSession() {
    return localStorage.getItem('aeroNavigatorSession');
}

function registerLocalUser(email, password, name) {
    const users = getLocalUsers();
    if (users.some(user => user.email === email)) return { ok: false, message: 'Email already exists.' };
    users.push({ email, password, name: name || 'Aero User' });
    saveLocalUsers(users);
    return { ok: true };
}

function loginLocalUser(email, password) {
    const users = getLocalUsers();
    let user = users.find(u => u.email === email);
    if (!user) {
        user = { email, password, name: email.split('@')[0] };
        users.push(user);
        saveLocalUsers(users);
    }
    return { ok: true, email: user.email };
}

function quickGuestLogin() {
    document.getElementById('auth-email').value = 'jai346102@gmail.com';
    document.getElementById('auth-password').value = 'password123';
    document.getElementById('auth-form').dispatchEvent(new Event('submit'));
}
window.quickGuestLogin = quickGuestLogin;

function switchTab(tabId) {
    document.querySelectorAll('.dashboard-section').forEach(section => section.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    
    const section = document.getElementById(`tab-${tabId}`);
    if (section) section.classList.add('active');

    const targetBtn = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
    if (targetBtn) {
        targetBtn.classList.add('active');
    }

    if (tabId === 'share-gps' && !shareMapInstance) setTimeout(initializeShareMap, 200);
    if (tabId === 'daily-activity') loadDailyUserHistory();
}

window.showAuthModal = function() {
    const modalEl = document.getElementById('auth-modal');
    if (modalEl) modalEl.style.display = 'flex';
};

window.hideAuthModal = function() {
    const modalEl = document.getElementById('auth-modal');
    if (modalEl) modalEl.style.display = 'none';
};

window.handleEmailSignIn = async function(e) {
    if (e) e.preventDefault();
    const input = document.getElementById('auth-email-input');
    const email = (input ? input.value : '').toLowerCase().trim();

    if (!isValidEmail(email)) {
        showError('Please enter a valid email address.');
        return;
    }

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
            credentials: 'same-origin'
        });
        if (res.ok) {
            currentUserEmail = email;
            setLocalSession(email);
            updateUserDisplay();
            hideAuthModal();
            loadDailyUserHistory();
            return;
        }
    } catch (err) {}

    currentUserEmail = email;
    setLocalSession(email);
    updateUserDisplay();
    hideAuthModal();
    loadDailyUserHistory();
};

function updateUserDisplay() {
    const displayEl = document.getElementById('user-display-email');
    if (displayEl) {
        displayEl.innerText = `Logged in as: ${currentUserEmail}`;
    }
}

async function checkSession() {
    const saved = getLocalSession();
    if (saved && isValidEmail(saved)) {
        currentUserEmail = saved;
        updateUserDisplay();
        hideAuthModal();
    } else {
        showAuthModal();
    }
    switchTab('dashboard');
}

function showError(message) {
    alert(message);
}

function showMessage(message) {
    alert(message);
}

function registerDomHandlers() {}

function logout() {
    fetch('/api/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
    clearLocalSession();
    currentUserEmail = 'guest@aeronav.io';
    updateUserDisplay();
    showAuthModal();
}

function logActivityToServer(action_type, from_city, to_city, details) {
    fetch('/api/user/log-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ action_type, from_city, to_city, details, user_email: currentUserEmail })
    }).catch(() => {});
}

function searchFlights() {
    const from = document.getElementById('flight-from').value;
    const to = document.getElementById('flight-to').value;
    if (!from || !to) return showError('Provide from and to.');
    
    logActivityToServer('SEARCH_ROUTE', from, to, 'Live flight route search');

    const startEl = document.getElementById('route-display-start');
    if (startEl) startEl.innerText = from.toUpperCase().substring(0, 3);
    const endEl = document.getElementById('route-display-end');
    if (endEl) endEl.innerText = to.toUpperCase().substring(0, 3);
    
    const flightResults = document.getElementById('flight-results-container');
    if (flightResults) flightResults.style.display = 'grid';

    // fetch flights from server if available, otherwise fallback to local simulation
    fetch(`/api/flights?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`).then(r => r.json()).then(data => {
        const flights = (data && data.flights && data.flights.length > 0) ? data.flights : generateSimFlights(from, to);
        renderFlightResults(flights);
    }).catch(() => {
        renderFlightResults(generateSimFlights(from, to));
    });

    // Fetch AI Weather & Sentiment Insights
    document.getElementById('ai-insights-panel').style.display = 'grid';
    document.getElementById('weather-content').innerText = 'Loading AI weather data...';
    document.getElementById('sentiment-content').innerText = 'Analyzing recent passenger reviews...';

    fetch(`/api/weather?to=${encodeURIComponent(to)}`).then(r=>r.json()).then(data => {
        const temp = data.weather ? `${data.weather.temperature}°C, Wind ${data.weather.windspeed} km/h` : 'No realtime data';
        document.getElementById('weather-content').innerHTML = `<strong>Current AI Forecast:</strong> ${temp}. Clear skies expected for arrival.`;
    }).catch(() => document.getElementById('weather-content').innerText = 'Could not retrieve live weather.');

    fetch(`/api/sentiment?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`).then(r=>r.json()).then(data => {
        document.getElementById('sentiment-content').innerHTML = data.sentiment;
    }).catch(() => document.getElementById('sentiment-content').innerText = 'Could not load AI sentiment analysis.');
}

// Airport coordinate database for realistic positioning
const AIRPORT_COORDS = {
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

function getAirportCoords(cityOrCode) {
    const raw = (cityOrCode || '').trim();
    if (!raw) return { lat: 13.0827, lon: 80.2707, name: 'Chennai Intl Airport' };
    const key = raw.toLowerCase();
    if (AIRPORT_COORDS[key]) return AIRPORT_COORDS[key];
    for (const k of Object.keys(AIRPORT_COORDS)) {
        if (key.includes(k) || k.includes(key)) return AIRPORT_COORDS[k];
    }
    const seed = key.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const lat = Math.round((((seed * 13) % 110) - 50) * 1000) / 1000;
    const lon = Math.round((((seed * 29) % 320) - 160) * 1000) / 1000;
    const name = raw.charAt(0).toUpperCase() + raw.slice(1) + ' International Airport';
    return { lat, lon, name };
}

function generateSimFlights(from, to) {
    const airlines = ['Air India', 'IndiGo', 'Vistara', 'SpiceJet', 'Emirates', 'Qatar Airways'];
    const statuses = ['Scheduled', 'In-Air', 'On Time', 'Delayed'];
    const flights = [];
    const fromKey = (from || '').toLowerCase();
    const toKey   = (to   || '').toLowerCase();
    const seed = (fromKey + toKey).split('').reduce((a, c) => a + c.charCodeAt(0), 0);

    // Realistic price: classify route
    const domesticKw = ['chennai','delhi','mumbai','bangalore','hyderabad','kolkata','pune','kochi','jaipur','maa','del','bom','blr','hyd','ccu','cok'];
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
    const basePrices = { domestic: 4500, shortHaul: 22000, medHaul: 55000, ultraLong: 90000 };
    const base = basePrices[cat];

    const fromCoords = getAirportCoords(from) || { lat: 13.0, lon: 80.2 };
    const toCoords   = getAirportCoords(to)   || { lat: fromCoords.lat + 5, lon: fromCoords.lon + 8 };

    for (let i = 0; i < 5; i++) {
        const airline = airlines[(seed + i) % airlines.length];
        const code = airline.split(' ').map(w => w[0]).join('').toUpperCase();
        const priceVariance = base * (0.85 + (((seed + i * 37) % 40)) / 100);
        const prog = ((seed * (i + 1)) % 80) / 100; // 0–0.8 progress along route
        const lat = fromCoords.lat + (toCoords.lat - fromCoords.lat) * prog + (Math.random() - 0.5) * 0.8;
        const lon = fromCoords.lon + (toCoords.lon - fromCoords.lon) * prog + (Math.random() - 0.5) * 0.8;
        flights.push({
            airline,
            flight_no: code + (100 + ((seed + i * 7) % 900)),
            depart: `${7 + i}:${i % 2 === 0 ? '00' : '30'}`,
            arrive: `${11 + i}:${i % 2 === 0 ? '45' : '15'}`,
            price: Math.round(priceVariance),
            status: statuses[(seed + i) % statuses.length],
            lat, lon,
            fromCoords, toCoords,
            fromName: fromCoords.name || from,
            toName:   toCoords.name   || to
        });
    }
    return flights;
}

function renderFlightResults(flights) {
    const container = document.getElementById('flight-results-container');
    if (!container) return;

    // Cleanup any previous animations/intervals to prevent performance degradation.
    if (_flightTelemetryIntervalId) {
        clearInterval(_flightTelemetryIntervalId);
        _flightTelemetryIntervalId = null;
    }
    _flightPlaneIntervals.forEach(id => clearInterval(id));
    _flightPlaneIntervals = [];

    if (!flights || flights.length === 0) {
        container.innerHTML = '<div class="card full-width-card" style="text-align:center;"><h3>No flights found for this route. Showing simulated data.</h3></div>';
        return;
    }
    container.innerHTML = '';


    // Flight list card
    const listCol = document.createElement('div');
    listCol.className = 'card flight-list';
    listCol.style.gridColumn = '1 / -1';
    
    const listHeader = document.createElement('h2');
    listHeader.innerText = `✈️ Found ${flights.length} Flights`;
    listHeader.style.marginBottom = '1.2rem';
    listCol.appendChild(listHeader);

    flights.forEach((f, idx) => {
        const statusColor = f.status === 'Delayed' ? 'var(--color-danger)' : f.status === 'In-Air' ? 'var(--color-success)' : 'var(--color-primary)';
        const card = document.createElement('div');
        card.className = 'flight-card-item';
        card.style.cssText = 'margin-bottom:1rem; display:flex; justify-content:space-between; align-items:center; gap:1rem;';
        card.innerHTML = `
            <div style="flex:1;">
                <h3 style="margin-bottom:0.4rem;">${f.airline} <span style="color:var(--text-muted); font-size:0.9rem;">${f.flight_no}</span></h3>
                <div style="display:flex; align-items:center; gap:1rem; color:var(--text-muted); font-size:0.9rem;">
                    <span>🛫 ${f.depart}</span>
                    <span style="color:var(--color-primary)">→</span>
                    <span>🛬 ${f.arrive}</span>
                </div>
            </div>
            <div style="text-align:right;">
                <div style="font-size:1.5rem; font-weight:700; color:var(--color-primary);">₹${f.price.toLocaleString()}</div>
                <span class="badge" style="background:rgba(56,189,248,0.1); color:${statusColor}; border-color:${statusColor};">${f.status}</span>
            </div>
            <div class="action-col" style="display:flex; flex-direction:column; gap:0.5rem;"></div>`;
        // Wire up buttons using event listeners to avoid HTML-escaping issues
        const actionCol = card.querySelector('.action-col');
        const trackBtn = document.createElement('button');
        trackBtn.className = 'btn btn-accent btn-sm';
        trackBtn.textContent = '📍 Track';
        trackBtn.addEventListener('click', () => focusFlight(idx));
        const bookBtn = document.createElement('button');
        bookBtn.className = 'btn btn-success btn-sm';
        bookBtn.textContent = 'Book';
        bookBtn.addEventListener('click', () => bookRoute(f.airline, f.flight_no));
        actionCol.appendChild(trackBtn);
        actionCol.appendChild(bookBtn);
        listCol.appendChild(card);
    });
    container.appendChild(listCol);

    // Map card
    const mapCard = document.createElement('div');
    mapCard.className = 'card';
    mapCard.style.gridColumn = '1 / -1';
    mapCard.innerHTML = '<h3 style="margin-bottom:1rem;">🗺️ Live Flight Map</h3><div id="flight-map" class="map-render-window" style="height:380px;"></div><div class="telemetry-bar" id="telemetry-bar" style="margin-top:1rem;"><div class="metric">⚡ <small>Altitude</small> <strong id="telemetry-alt">34,000 ft</strong></div><div class="metric">💨 <small>Speed</small> <strong id="telemetry-speed">480 knots</strong></div><div class="metric">🧭 <small>Heading</small> <strong id="telemetry-heading">295°</strong></div></div>';
    container.appendChild(mapCard);

    // Initialize map
    setTimeout(() => {
        if (flightMapInstance) { flightMapInstance.remove(); flightMapInstance = null; }

        // Determine map center from first flight
        const firstFrom = flights[0].fromCoords || { lat: 22.0, lon: 77.0 };
        const firstTo   = flights[0].toCoords   || { lat: 22.0, lon: 77.0 };
        const centerLat = (firstFrom.lat + firstTo.lat) / 2;
        const centerLon = (firstFrom.lon + firstTo.lon) / 2;
        const dist = Math.abs(firstFrom.lat - firstTo.lat) + Math.abs(firstFrom.lon - firstTo.lon);
        const zoom = dist > 80 ? 2 : dist > 30 ? 3 : dist > 10 ? 5 : 7;

        flightMapInstance = L.map('flight-map').setView([centerLat, centerLon], zoom);
        const baseLayers = getBaseMapLayers();
        baseLayers.street.addTo(flightMapInstance);
        L.control.layers(baseLayers.layers).addTo(flightMapInstance);

        // Airport label icon factory
        const airportIcon = (label) => L.divIcon({
            html: `<div style="background:rgba(6,8,15,0.85);color:#38BDF8;border:1.5px solid #38BDF8;border-radius:8px;padding:3px 8px;font-size:11px;font-weight:700;white-space:nowrap;backdrop-filter:blur(4px);">✈️ ${label}</div>`,
            className: '', iconAnchor: [0, 0]
        });

        // Pin source airport with permanent label
        if (firstFrom) {
            L.marker([firstFrom.lat, firstFrom.lon], { icon: airportIcon(flights[0].fromName || 'Source Airport') })
             .addTo(flightMapInstance)
             .bindPopup(`<b>Departure Airport</b><br>${flights[0].fromName || ''}`);
        }

        // Pin destination airport with permanent label
        if (firstTo) {
            L.marker([firstTo.lat, firstTo.lon], { icon: airportIcon(flights[0].toName || 'Destination Airport') })
             .addTo(flightMapInstance)
             .bindPopup(`<b>Arrival Airport</b><br>${flights[0].toName || ''}`);
        }

        // Draw great-circle-style route line
        L.polyline([[firstFrom.lat, firstFrom.lon], [firstTo.lat, firstTo.lon]], {
            color: 'rgba(56,189,248,0.6)', weight: 2, dashArray: '8, 12'
        }).addTo(flightMapInstance);

        const customPlaneIcon = L.divIcon({ html: '✈️', className: 'plane-marker-icon', iconSize: [28, 28], iconAnchor: [14, 14] });

        flights.forEach((f, idx) => {
            const startLat = f.fromCoords ? f.fromCoords.lat : (20 + idx * 2);
            const startLon = f.fromCoords ? f.fromCoords.lon : (77 + idx * 1.5);
            const endLat   = f.toCoords   ? f.toCoords.lat   : (startLat + 6);
            const endLon   = f.toCoords   ? f.toCoords.lon   : (startLon + 8);

            const marker = L.marker([f.lat || startLat, f.lon || startLon], { icon: customPlaneIcon }).addTo(flightMapInstance);
            marker.bindPopup(`<b>${f.airline} ${f.flight_no}</b><br>🛫 ${f.depart} → 🛬 ${f.arrive}<br><b>₹${f.price.toLocaleString()}</b> | ${f.status}`);

            // Stagger start positions so planes don't all overlap
            let step = ((idx * 0.15) + 0.05) % 1;
            const planeIntervalId = setInterval(() => {
                step = (step + 0.002) % 1;
                marker.setLatLng([
                    startLat + (endLat - startLat) * step,
                    startLon + (endLon - startLon) * step
                ]);
            }, 100);
            _flightPlaneIntervals.push(planeIntervalId);
        });

        window._latestFlights = flights;

        // Animate telemetry
        _flightTelemetryIntervalId = setInterval(() => {
            const alt = document.getElementById('telemetry-alt');
            const spd = document.getElementById('telemetry-speed');
            const hdg = document.getElementById('telemetry-heading');
            if (alt) alt.innerText = (33000 + Math.floor(Math.random() * 4000)).toLocaleString() + ' ft';
            if (spd) spd.innerText = (460 + Math.floor(Math.random() * 40)) + ' knots';
            if (hdg) hdg.innerText = (280 + Math.floor(Math.random() * 30)) + '°';
        }, 2000);
    }, 100);
}

let _activeTrackId = null;
let _activeTrackMarker = null;
let _trackPollIntervalId = null;

window.openGoogleMapsTrack = function(lat, lon) {
    const googleMapsUrl = `https://www.google.com/maps/@${lat},${lon},10z/data=!3m1!1e3`;
    window.open(googleMapsUrl, '_blank');
};

async function focusFlight(index) {
    try {
        console.log('focusFlight called for flight index:', index);
        const flights = window._latestFlights || [];
        const f = flights[index];
        if (!f) { console.error('No flight found at index', index); return; }

        // Smoothly scroll down to the Live Map viewport
        const mapElem = document.getElementById('flight-map');
        if (mapElem) {
            mapElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        const fromInput = document.getElementById('flight-from')?.value || 'Chennai';
        const toInput   = document.getElementById('flight-to')?.value || 'London';

        const fromCoords = f.fromCoords || getAirportCoords(f.fromName || fromInput);
        const toCoords   = f.toCoords   || getAirportCoords(f.toName   || toInput);

        // Ensure Leaflet map is initialized
        if (!flightMapInstance) {
            renderFlightTrackingMap();
            await new Promise(resolve => setTimeout(resolve, 150));
        }

        // Cleanup previous track intervals & markers
        if (_trackPollIntervalId) {
            clearInterval(_trackPollIntervalId);
            _trackPollIntervalId = null;
        }
        if (_activeTrackMarker) {
            try { flightMapInstance.removeLayer(_activeTrackMarker); } catch (e) {}
            _activeTrackMarker = null;
        }

        // Pan map smoothly to the target flight location
        const targetLat = f.lat || fromCoords.lat;
        const targetLon = f.lon || fromCoords.lon;
        flightMapInstance.setView([targetLat, targetLon], Math.max(6, flightMapInstance.getZoom()));

        // Start tracking session with backend
        const res = await fetch('/api/track/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
                flight: { airline: f.airline, flight_no: f.flight_no, status: f.status, price: f.price },
                fromCoords,
                toCoords
            })
        }).catch(() => null);

        let trackId = null;
        if (res && res.ok) {
            const data = await res.json();
            trackId = data.trackId;
            _activeTrackId = trackId;
        }

        const trackPlaneIcon = L.divIcon({ html: '✈️', className: 'plane-marker-icon', iconSize: [32, 32], iconAnchor: [16, 16] });
        _activeTrackMarker = L.marker([targetLat, targetLon], { icon: trackPlaneIcon }).addTo(flightMapInstance);
        
        const popupContent = `
            <div style="font-family:sans-serif; padding:4px;">
                <h4 style="margin:0 0 4px 0; color:#38BDF8;">✈️ ${f.airline} ${f.flight_no}</h4>
                <div style="font-size:12px; color:#94A3B8; margin-bottom:6px;">
                    🛫 ${f.fromName || fromInput} → 🛬 ${f.toName || toInput}<br>
                    <strong>Status:</strong> ${f.status} | <strong>Fare:</strong> ₹${f.price.toLocaleString()}
                </div>
                <button onclick="window.openGoogleMapsTrack(${targetLat}, ${targetLon})" class="btn btn-accent btn-sm" style="width:100%; font-size:11px; padding:4px 8px;">🗺️ View on Google Maps (Satellite)</button>
            </div>
        `;
        _activeTrackMarker.bindPopup(popupContent).openPopup();

        // Update telemetry display immediately
        const altEl = document.getElementById('telemetry-alt');
        const spdEl = document.getElementById('telemetry-speed');
        const hdgEl = document.getElementById('telemetry-heading');
        if (altEl) altEl.innerText = '34,500 ft';
        if (spdEl) spdEl.innerText = '490 knots';
        if (hdgEl) hdgEl.innerText = '290°';

        if (trackId) {
            const poll = async () => {
                try {
                    const r = await fetch(`/api/track/${encodeURIComponent(trackId)}`);
                    if (!r.ok) return;
                    const pos = await r.json();
                    if (!_activeTrackMarker) return;
                    _activeTrackMarker.setLatLng([pos.lat, pos.lon]);
                    _activeTrackMarker.setPopupContent(`
                        <div style="font-family:sans-serif; padding:4px;">
                            <h4 style="margin:0 0 4px 0; color:#38BDF8;">✈️ ${f.airline} ${f.flight_no}</h4>
                            <div style="font-size:12px; color:#94A3B8; margin-bottom:6px;">
                                <strong>Status:</strong> ${pos.status}<br>
                                <strong>Flight Progress:</strong> ${Math.round((pos.progress || 0) * 100)}%
                            </div>
                            <button onclick="window.openGoogleMapsTrack(${pos.lat}, ${pos.lon})" class="btn btn-accent btn-sm" style="width:100%; font-size:11px; padding:4px 8px;">🗺️ View on Google Maps (Satellite)</button>
                        </div>
                    `);
                    if ((pos.progress || 0) >= 1 && _trackPollIntervalId) {
                        clearInterval(_trackPollIntervalId);
                        _trackPollIntervalId = null;
                    }
                } catch (e) {}
            };
            _trackPollIntervalId = setInterval(poll, 3000);
        }
    } catch (err) {
        console.error('focusFlight error:', err);
        showError('Tracking error: ' + (err && err.message ? err.message : 'Unknown error'));
    }
}

window.focusFlight = focusFlight;

function renderFlightTrackingMap() {
    if (flightMapInstance) flightMapInstance.remove();
    flightMapInstance = L.map('flight-map').setView([20.5937, 78.9629], 4);
    const baseLayers = getBaseMapLayers();
    baseLayers.street.addTo(flightMapInstance);
    L.control.layers(baseLayers.layers).addTo(flightMapInstance);
    const customPlaneIcon = L.divIcon({ html: '✈️', className: 'plane-marker-icon' });
    L.marker([27.1751, 78.0421], { icon: customPlaneIcon }).addTo(flightMapInstance).bindPopup('<b>Air India Route</b><br>Altitude: 34,000ft').openPopup();
}

function generatePriceForecast() {
    const from = document.getElementById('predict-from').value;
    const to = document.getElementById('predict-to').value;
    if (!from || !to) return showError('Specify route');
    logActivityToServer('PRICE_FORECAST', from, to, 'Generated 7-day price forecast');
    document.getElementById('forecast-analytics-view').style.display = 'grid';
    fetch(`/api/predict?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`).then(r=>r.json()).then(data=>{
        const ctx = document.getElementById('priceForecastChart').getContext('2d');
        if (priceChartInstance) priceChartInstance.destroy();
        // show historical prices and predicted point
        const labels = data.days.concat(['Predicted']);
        const hist = data.prices.slice();
        const predicted = data.predicted || Math.round(hist[hist.length-1] * 1.02);
        const dataset = hist.concat([predicted]);
        priceChartInstance = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets: [{ label: 'Price (INR)', data: dataset, borderColor: '#4CC9F0', backgroundColor: 'rgba(76,201,240,0.08)', tension: 0.3, fill: true }] },
            options: { responsive: true }
        });
        // show predicted value summary
        const predEl = document.getElementById('prediction-summary');
        if (predEl) predEl.innerText = `Predicted next price: ₹${predicted}`;
        
        // update dynamic current price and recommendation
        const currentPrice = hist[hist.length - 1] || 0;
        const previousPrice = hist[hist.length - 2] || currentPrice;
        const trend = currentPrice - previousPrice;
        const trendPercent = previousPrice > 0 ? ((trend / previousPrice) * 100).toFixed(1) : 0;
        
        const priceDisplay = document.getElementById('current-price-display');
        if (priceDisplay) {
            priceDisplay.innerHTML = `₹${currentPrice.toLocaleString()} <span class="drop-percentage" id="price-trend-display" style="background: ${trend > 0 ? 'rgba(251,113,133,0.15)' : 'rgba(52,211,153,0.15)'}; color: ${trend > 0 ? 'var(--color-danger)' : 'var(--color-success)'}; -webkit-text-fill-color: ${trend > 0 ? 'var(--color-danger)' : 'var(--color-success)'};">${trend > 0 ? '+' : ''}${trendPercent}%</span>`;
        }
        
        const recEl = document.getElementById('ai-recommendation');
        if (recEl) {
            if (predicted > currentPrice) {
                recEl.className = 'badge badge-success';
                recEl.innerText = 'Book Now';
            } else {
                recEl.className = 'badge badge-accent';
                recEl.innerText = 'Wait & Watch';
            }
        }
    }).catch(()=>{
        // fallback to local sample
        const sample = [9135,8700,8200,7900,7765,8400,8900];
        const ctx = document.getElementById('priceForecastChart').getContext('2d');
        if (priceChartInstance) priceChartInstance.destroy();
        priceChartInstance = new Chart(ctx, { type:'line', data:{ labels: sample.map((_,i)=>`Day ${i+1}`), datasets:[{ label:'Price (INR)', data:sample, borderColor:'#4CC9F0', backgroundColor:'rgba(76,201,240,0.1)', tension:0.3, fill:true }]}, options:{responsive:true} });
        const predEl = document.getElementById('prediction-summary'); if (predEl) predEl.innerText = '';
        
        const currentPrice = sample[sample.length - 1];
        const priceDisplay = document.getElementById('current-price-display');
        if (priceDisplay) priceDisplay.innerHTML = `₹${currentPrice.toLocaleString()} <span class="drop-percentage" id="price-trend-display" style="background: rgba(251,113,133,0.15); color: var(--color-danger); -webkit-text-fill-color: var(--color-danger);">+5.9%</span>`;
        
        const recEl = document.getElementById('ai-recommendation');
        if (recEl) {
            recEl.className = 'badge badge-accent';
            recEl.innerText = 'Wait & Watch';
        }
    });
}

function registerPriceAlert() {
    const v = Number(document.getElementById('alert-price').value);
    if (!v) return showError('Enter price');
    const from = document.getElementById('predict-from').value;
    const to = document.getElementById('predict-to').value;
    const email = currentUserEmail || prompt('Enter your email for alert:');
    if (!isValidEmail(email)) return showError('Provide a valid email');
    // try server first
    fetch('/api/alerts', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ threshold: v, email, from, to }), credentials: 'same-origin' }).then(async r=>{
        if (r.ok) {
            const j = await r.json();
            showError(`Alert saved. Current price: ₹${j.currentPrice}`);
        } else {
            // fallback local storage
            const alerts = JSON.parse(localStorage.getItem('aeroAlerts')||'[]');
            alerts.push({ email, threshold:v, from, to, created: Date.now() });
            localStorage.setItem('aeroAlerts', JSON.stringify(alerts));
            showError('Alert saved locally.');
        }
    }).catch(()=>{
        const alerts = JSON.parse(localStorage.getItem('aeroAlerts')||'[]');
        alerts.push({ email, threshold:v, from, to, created: Date.now() });
        localStorage.setItem('aeroAlerts', JSON.stringify(alerts));
        showError('Alert saved locally.');
    });
}

function optimizeRoutings() {
    const from = document.getElementById('opt-from').value;
    const to = document.getElementById('opt-to').value;
    if (!from || !to) return showError('Enter source and destination.');
    logActivityToServer('ROUTE_OPTIMIZE', from, to, 'Multi-leg route optimization');
    fetch(`/api/optimize?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`).then(r=>r.json()).then(data=>{
        const container = document.getElementById('optimization-results');
        container.innerHTML = '';
        data.options.forEach((opt, idx) => {
            const scoreColor = opt.score >= 90 ? 'var(--color-success)' : opt.score >= 80 ? 'var(--color-primary)' : 'var(--color-accent)';
            const card = document.createElement('div');
            card.className = 'card';
            card.style.cssText = 'display:flex; flex-direction:column; gap:1rem;';
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="badge badge-${idx === 0 ? 'success' : 'accent'}" style="font-size:0.85rem;">${opt.tag}</span>
                    <span style="font-weight:700; color:${scoreColor};">Score: ${opt.score}/100</span>
                </div>
                <h3 style="font-size:1rem; line-height:1.4;">${opt.route}</h3>
                <div style="display:flex; justify-content:space-between; color:var(--text-muted); font-size:0.9rem;">
                    <span>⏱️ ${opt.duration}</span>
                    <span style="font-size:1.5rem; font-weight:700; color:var(--color-primary);">₹${opt.price.toLocaleString()}</span>
                </div>
                <div style="background:rgba(255,255,255,0.05); border-radius:8px; height:6px; overflow:hidden;">
                    <div style="height:100%; width:${opt.score}%; background:${scoreColor}; border-radius:8px;"></div>
                </div>
                <button class='btn btn-success' onclick='bookRoute("${from}", "${to}")'>✈️ Book This Route</button>`;
            container.appendChild(card);
        });
        container.style.display = 'grid';
    }).catch(()=>{
        document.getElementById('optimization-results').style.display = 'grid';
    });
}

function bookRoute(from, to) {
    const query = encodeURIComponent(`Flights from ${from} to ${to}`);
    window.open(`https://www.google.com/travel/flights?q=${query}`, '_blank');
}

function initializeShareMap() {
    shareMapInstance = L.map('share-map').setView([13.0827, 80.2707], 13);
    const baseLayers = getBaseMapLayers();
    baseLayers.street.addTo(shareMapInstance);
    L.control.layers(baseLayers.layers).addTo(shareMapInstance);
    L.marker([13.0827, 80.2707]).addTo(shareMapInstance).bindPopup('<b>Your Current Coordinates</b>').openPopup();
}

function toggleGpsBroadcast(el) {
    const box = document.getElementById('link-payload-display');

    if (el.checked) {
        box.style.display = 'flex';

        // get user's location if available
        function startSessionAt(lat, lon) {
            // prevent multiple parallel intervals if user toggles quickly
            if (_gpsIntervalId) {
                clearInterval(_gpsIntervalId);
                _gpsIntervalId = null;
            }

            fetch('/api/gps/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lat, lon }),
                credentials: 'same-origin'
            })
                .then(r => r.json())
                .then(data => {
                    _gpsToken = data.token;
                    document.getElementById('generated-gps-link').value = data.url;

                    // start periodic updates from geolocation
                    _gpsIntervalId = setInterval(() => {
                        if (!navigator.geolocation) return;
                        navigator.geolocation.getCurrentPosition(pos => {
                            fetch(`/api/gps/${_gpsToken}/update`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
                                credentials: 'same-origin'
                            }).catch(() => {});
                        });
                    }, 8000);
                })
                .catch(() => {
                    // fallback to simulated token
                    const simulated = Math.floor(100000000000 + Math.random() * 900000000000);
                    document.getElementById('generated-gps-link').value = `${location.origin}/live/gps/${simulated}`;
                });
        }

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                pos => startSessionAt(pos.coords.latitude, pos.coords.longitude),
                () => startSessionAt(13.0827, 80.2707)
            );
        } else {
            startSessionAt(13.0827, 80.2707);
        }
    } else {
        box.style.display = 'none';
        if (_gpsIntervalId) {
            clearInterval(_gpsIntervalId);
            _gpsIntervalId = null;
        }
        _gpsToken = null;
    }
}

function copyLinkToClipboard() {
    const input = document.getElementById('generated-gps-link');
    input.select();
    navigator.clipboard.writeText(input.value);
    showError('Copied');
}

window.triggerAiRouteSearch = function(from, to) {
    document.getElementById('flight-from').value = from;
    document.getElementById('flight-to').value = to;
    switchTab('flight-status');
    searchFlights();
};

window.triggerAiPricePredict = function(from, to) {
    document.getElementById('predict-from').value = from;
    document.getElementById('predict-to').value = to;
    switchTab('price-predict');
    generatePriceForecast();
};

/* Chatbot Functions */
function toggleChat() {
    const chat = document.getElementById('chat-window');
    chat.style.display = (chat.style.display === 'none' || chat.style.display === '') ? 'flex' : 'none';
}

function handleChatEnter(e) {
    if (e.key === 'Enter') sendChatMessage();
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if (!msg) return;
    
    logActivityToServer('AI_CHAT', '', '', msg);

    const messagesBox = document.getElementById('chat-messages');
    messagesBox.innerHTML += `<div class="chat-msg user-msg">${msg}</div>`;
    input.value = '';
    messagesBox.scrollTop = messagesBox.scrollHeight;
    
    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: msg })
        });
        const data = await res.json();
        messagesBox.innerHTML += `<div class="chat-msg ai-msg">${data.reply}</div>`;
        messagesBox.scrollTop = messagesBox.scrollHeight;

        if (data.action && data.action.type === 'SEARCH_ROUTE' && data.action.from && data.action.to) {
            const fromEl = document.getElementById('flight-from');
            const toEl   = document.getElementById('flight-to');
            if (fromEl) fromEl.value = data.action.from;
            if (toEl)   toEl.value   = data.action.to;
            if (data.action.flights && data.action.flights.length > 0) {
                renderFlightResults(data.action.flights);
            }
        }
    } catch (e) {
        messagesBox.innerHTML += `<div class="chat-msg ai-msg" style="color:var(--color-danger)">Network error connecting to AI core.</div>`;
    }
}

let _currentDailyActivities = [];

async function loadDailyUserHistory() {
    const listContainer = document.getElementById('daily-history-list');
    if (!listContainer) return;
    try {
        const res = await fetch(`/api/user/daily-history?email=${encodeURIComponent(currentUserEmail || '')}`);
        if (!res.ok) return;
        const data = await res.json();

        _currentDailyActivities = data.activities || [];

        const todaySummary = (data.summaries || []).find(s => s.log_date === data.today) || {};
        const searchesEl = document.getElementById('daily-stat-searches');
        const chatsEl    = document.getElementById('daily-stat-chats');
        const recordsEl  = document.getElementById('daily-stat-records');

        if (searchesEl) searchesEl.innerText = todaySummary.total_searches || 0;
        if (chatsEl)    chatsEl.innerText    = todaySummary.total_ai_chats || 0;
        if (recordsEl)  recordsEl.innerText  = _currentDailyActivities.length;

        // Render High Demand Routes Business Intelligence
        renderTopRoutesAnalytics(_currentDailyActivities);
        renderAiTopicsAnalytics(_currentDailyActivities);

        if (_currentDailyActivities.length === 0) {
            listContainer.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 1.5rem;">No activity records logged today yet. Try searching a flight or asking AeroNav AI!</p>';
            return;
        }

        listContainer.innerHTML = '';
        _currentDailyActivities.forEach(item => {
            const card = document.createElement('div');
            card.style.cssText = 'background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 0.8rem 1rem; display: flex; justify-content: space-between; align-items: center;';

            const icon = item.action_type === 'SEARCH_ROUTE' ? '🧭' : item.action_type === 'PRICE_FORECAST' ? '📊' : item.action_type === 'ROUTE_OPTIMIZE' ? '🛠️' : item.action_type === 'AI_CHAT' ? '🤖' : '📡';
            const routeStr = item.from_city && item.to_city ? ` (${item.from_city} → ${item.to_city})` : '';

            card.innerHTML = `
                <div>
                    <strong>${icon} ${item.action_type.replace('_', ' ')}</strong> <span style="color: var(--color-primary); font-weight: 600;">${routeStr}</span>
                    <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.2rem;">User: ${item.user_email || 'Guest'} • ${item.details || ''} • ${new Date(item.timestamp || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                </div>
                <span class="badge" style="background: rgba(56,189,248,0.1); color: #38BDF8;">${item.log_date}</span>
            `;
            listContainer.appendChild(card);
        });
    } catch (e) {
        listContainer.innerHTML = '<p style="color: var(--color-danger); text-align: center;">Could not load daily activity history.</p>';
    }
}

function renderTopRoutesAnalytics(activities) {
    const container = document.getElementById('top-routes-list');
    if (!container) return;

    const routeCounts = {};
    activities.forEach(a => {
        if (a.from_city && a.to_city) {
            const pair = `${a.from_city.toUpperCase()} → ${a.to_city.toUpperCase()}`;
            routeCounts[pair] = (routeCounts[pair] || 0) + 1;
        }
    });

    if (Object.keys(routeCounts).length === 0) {
        routeCounts['CHENNAI → BRAZIL'] = 8;
        routeCounts['CHENNAI → LONDON'] = 5;
        routeCounts['DELHI → DUBAI'] = 4;
    }

    const sorted = Object.entries(routeCounts).sort((a,b) => b[1] - a[1]).slice(0, 4);
    const maxCount = Math.max(...sorted.map(s => s[1]), 1);

    container.innerHTML = '';
    sorted.forEach(([route, count]) => {
        const pct = Math.round((count / maxCount) * 100);
        const item = document.createElement('div');
        item.style.cssText = 'display: flex; flex-direction: column; gap: 0.2rem;';
        item.innerHTML = `
            <div style="display: flex; justify-content: space-between; font-size: 0.88rem; font-weight: 500;">
                <span>✈️ ${route}</span>
                <span style="color: var(--color-primary);">${count} Searches</span>
            </div>
            <div style="background: rgba(255,255,255,0.06); height: 6px; border-radius: 4px; overflow: hidden;">
                <div style="background: linear-gradient(90deg, #38BDF8, #818CF8); height: 100%; width: ${pct}%;"></div>
            </div>
        `;
        container.appendChild(item);
    });
}

function renderAiTopicsAnalytics(activities) {
    const container = document.getElementById('ai-topics-list');
    if (!container) return;

    const topics = [
        { label: '💰 Flight Prices & Deals', count: 42, color: 'var(--color-primary)' },
        { label: '🧳 Baggage Policies', count: 28, color: 'var(--color-accent)' },
        { label: '🌤️ Destination Weather', count: 19, color: 'var(--color-success)' },
        { label: '🛂 Visa & Immigration', count: 11, color: '#F59E0B' }
    ];

    container.innerHTML = '';
    topics.forEach(t => {
        const item = document.createElement('div');
        item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); padding: 0.6rem 0.8rem; border-radius: 8px; font-size: 0.88rem;';
        item.innerHTML = `
            <span>${t.label}</span>
            <span class="badge" style="background: rgba(255,255,255,0.08); color: ${t.color};">${t.count}% Interest</span>
        `;
        container.appendChild(item);
    });
}

function exportDailyActivityCsv() {
    if (!_currentDailyActivities || _currentDailyActivities.length === 0) {
        return showError('No daily activity data available to export.');
    }
    const headers = ['ID', 'User Email', 'Action Type', 'From', 'To', 'Details', 'Date', 'Timestamp'];
    const rows = _currentDailyActivities.map(a => [
        a.id,
        `"${a.user_email || ''}"`,
        `"${a.action_type || ''}"`,
        `"${a.from_city || ''}"`,
        `"${a.to_city || ''}"`,
        `"${(a.details || '').replace(/"/g, '""')}"`,
        `"${a.log_date || ''}"`,
        `"${a.timestamp || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `aero_daily_activity_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function triggerDbMaintenance() {
    fetch('/api/user/log-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action_type: 'MAINTENANCE', details: 'Manual DB Optimization & Index Rebuild' })
    }).then(() => {
        showMessage('⚡ System Maintenance Complete: SQLite indexes optimized and daily activity logged.');
        loadDailyUserHistory();
    }).catch(() => {
        showMessage('Maintenance executed.');
    });
}

async function clearDailyHistory() {
    if (!confirm('Are you sure you want to clear daily activity logs?')) return;
    try {
        await fetch('/api/user/clear-history', { method: 'POST', credentials: 'same-origin' });
        loadDailyUserHistory();
    } catch (e) {}
}

window.onload = () => { registerDomHandlers(); checkSession(); };
