/**
 * database.js
 * SQLite integration using sql.js (pure WebAssembly — no native compilation required).
 *
 * Exposes:
 *   initializeDatabase() - async, must be awaited before server starts
 *   dbRun(sql, params)   - INSERT / UPDATE / DELETE
 *   dbGet(sql, params)   - SELECT single row
 *   dbAll(sql, params)   - SELECT multiple rows
 *   generateId()         - UUID v4 string for primary keys
 *   saveDatabase()       - flush in-memory DB to disk (called automatically after writes)
 */

const initSqlJs = require('sql.js');
const fs        = require('fs');
const path      = require('path');
const crypto    = require('crypto');

const DB_PATH = path.join(__dirname, 'aero_navigator.db');

let db = null; // sql.js Database instance

// ─── Public helpers ──────────────────────────────────────────────────────────

/**
 * Execute a write statement (INSERT / UPDATE / DELETE).
 * Automatically persists the database to disk after every write.
 */
function dbRun(sql, params = []) {
    if (!db) throw new Error('Database not initialized');
    db.run(sql, params);
    saveDatabase();
}

/**
 * Execute a SELECT and return the first matching row as a plain object,
 * or null if no rows match.
 */
function dbGet(sql, params = []) {
    if (!db) throw new Error('Database not initialized');
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const row = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    return row;
}

/**
 * Execute a SELECT and return ALL matching rows as an array of plain objects.
 */
function dbAll(sql, params = []) {
    if (!db) throw new Error('Database not initialized');
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
        rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
}

/**
 * Execute raw DDL (CREATE TABLE, etc.) — no parameters, no return value.
 */
function dbExec(sql) {
    if (!db) throw new Error('Database not initialized');
    db.run(sql);
}

/**
 * Write the in-memory SQLite database to disk.
 */
function saveDatabase() {
    const data   = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
}

/**
 * Generate a UUID v4 string for use as a primary key.
 */
function generateId() {
    return crypto.randomUUID();
}

// ─── Table Definitions ───────────────────────────────────────────────────────

const CREATE_TABLES = `
    CREATE TABLE IF NOT EXISTS users (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        email       TEXT UNIQUE NOT NULL,
        password    TEXT NOT NULL,
        role        TEXT NOT NULL DEFAULT 'user',
        created_at  TEXT DEFAULT (datetime('now')),
        updated_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS saved_travelers (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id         TEXT NOT NULL,
        name            TEXT,
        passport_number TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS flights (
        id                      TEXT PRIMARY KEY,
        flight_number           TEXT NOT NULL,
        airline                 TEXT NOT NULL,
        airline_logo            TEXT,
        departure_airport_code  TEXT NOT NULL,
        departure_airport_name  TEXT,
        departure_city          TEXT,
        departure_time          TEXT NOT NULL,
        departure_gate          TEXT,
        arrival_airport_code    TEXT NOT NULL,
        arrival_airport_name    TEXT,
        arrival_city            TEXT,
        arrival_time            TEXT NOT NULL,
        arrival_gate            TEXT,
        duration_minutes        INTEGER,
        price                   REAL NOT NULL,
        status                  TEXT NOT NULL DEFAULT 'scheduled',
        live_lat                REAL,
        live_lng                REAL,
        live_altitude           REAL,
        live_heading            REAL,
        live_speed              REAL,
        created_at              TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bookings (
        id           TEXT PRIMARY KEY,
        user_id      TEXT NOT NULL,
        flight_id    TEXT NOT NULL,
        total_price  REAL NOT NULL,
        status       TEXT NOT NULL DEFAULT 'confirmed',
        booking_date TEXT DEFAULT (datetime('now')),
        created_at   TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id)   REFERENCES users(id),
        FOREIGN KEY (flight_id) REFERENCES flights(id)
    );

    CREATE TABLE IF NOT EXISTS booking_passengers (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_id  TEXT NOT NULL,
        name        TEXT,
        age         INTEGER,
        seat        TEXT,
        FOREIGN KEY (booking_id) REFERENCES bookings(id)
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     TEXT NOT NULL,
        action_type TEXT NOT NULL,
        details     TEXT,
        created_at  TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
    );
`;

// ─── Initialization ──────────────────────────────────────────────────────────

/**
 * Initialize sql.js and load (or create) the SQLite database file.
 * Must be awaited before starting the Express server.
 */
async function initializeDatabase() {
    const SQL = await initSqlJs();

    if (fs.existsSync(DB_PATH)) {
        // Load existing database from disk
        const fileBuffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(fileBuffer);
        console.log('SQLite: Loaded existing database from disk.');
    } else {
        // Create a fresh in-memory database
        db = new SQL.Database();
        console.log('SQLite: Created new database.');
    }

    // Enable foreign keys and create tables
    db.run('PRAGMA foreign_keys = ON;');
    db.run(CREATE_TABLES);

    // Persist the initial schema to disk
    saveDatabase();
    console.log('SQLite: Database ready — aero_navigator.db');
}

module.exports = {
    initializeDatabase,
    saveDatabase,
    generateId,
    dbRun,
    dbGet,
    dbAll,
    dbExec
};