require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const http       = require('http');
const { Server } = require('socket.io');

const { initializeDatabase } = require('./database');
const Flight = require('./models/Flight');

// ─── App & HTTP Server ────────────────────────────────────────────────────────

const app    = express();
const server = http.createServer(app);

// ─── Socket.IO ────────────────────────────────────────────────────────────────

const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
});

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());

// ─── Health Check ─────────────────────────────────────────────────────────────

app.get('/', (req, res) => {
    res.send('Aero Navigator Backend — SQLite Edition ✈️');
});

// ─── API Routes ───────────────────────────────────────────────────────────────

app.use('/auth',       require('./routes/authRoutes'));
app.use('/flights',    require('./routes/flightRoutes'));
app.use('/booking',    require('./routes/bookingRoutes'));
app.use('/prediction', require('./routes/predictionRoutes'));
app.use('/gps',        require('./routes/gpsRoutes'));
app.use('/activity',   require('./routes/activityRoutes'));

// ─── Socket.IO: Live Flight Tracking ─────────────────────────────────────────

const activeTrackers = {}; // flightId -> setInterval handle

io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    socket.on('joinFlightTracker', async (flightId) => {
        socket.join(flightId);
        console.log(`[Socket] ${socket.id} joined tracking room: ${flightId}`);

        // One simulator per unique flight room
        if (!activeTrackers[flightId]) {
            const existingFlight = await Flight.findById(flightId);
            let lat      = existingFlight?.liveLocation?.latitude  ?? 28.5562;
            let lng      = existingFlight?.liveLocation?.longitude ?? 77.1000;
            let altitude = existingFlight?.liveLocation?.altitude  ?? 35000;
            let heading  = existingFlight?.liveLocation?.heading   ?? 90;
            let speed    = existingFlight?.liveLocation?.speed     ?? 850;

            activeTrackers[flightId] = setInterval(() => {
                if (existingFlight && existingFlight.status === 'landed') {
                    altitude = 0;
                    speed = 0;
                } else if (existingFlight && existingFlight.status !== 'scheduled') {
                    lat      += (Math.random() - 0.5) * 0.05;
                    lng      += 0.03 + Math.random() * 0.02;
                    altitude += (Math.random() - 0.5) * 100;
                    heading   = (heading + (Math.random() - 0.5) * 2 + 360) % 360;
                    speed    += (Math.random() - 0.5) * 10;
                }

                const liveData = {
                    latitude:  parseFloat(lat.toFixed(6)),
                    longitude: parseFloat(lng.toFixed(6)),
                    altitude:  parseFloat(altitude.toFixed(0)),
                    heading:   parseFloat(heading.toFixed(1)),
                    speed:     parseFloat(speed.toFixed(1))
                };

                Flight.updateLiveLocation(
                    flightId,
                    liveData.latitude, liveData.longitude,
                    liveData.altitude, liveData.heading, liveData.speed
                );

                io.to(flightId).emit('liveFlightUpdate', liveData);
            }, 3000);
        }
    });

    socket.on('disconnect', () => {
        console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
});

// ─── Bootstrap: init DB first, then start HTTP server ────────────────────────
// sql.js requires async initialization (loads the WASM binary), so we
// await it before binding the port.

const PORT = process.env.PORT || 5000;

(async () => {
    try {
        await initializeDatabase();

        // Bind to 0.0.0.0 so Android Emulator (10.0.2.2) can reach it
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`\n✈️  Aero Navigator Backend running on port ${PORT}`);
            console.log(`📦  Database: SQLite via sql.js (aero_navigator.db)`);
            console.log(`🌐  REST API:  http://localhost:${PORT}`);
            console.log(`🔌  Socket.IO: enabled\n`);
        });
    } catch (err) {
        console.error('Failed to initialize database:', err);
        process.exit(1);
    }
})();