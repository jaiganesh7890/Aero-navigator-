const { dbRun, dbGet, dbAll, generateId } = require('../database');
const Flight = require('./Flight');

/**
 * Booking model backed by sql.js SQLite.
 * Handles creation with passenger inserts and full population on retrieval.
 */
const Booking = {
    /**
     * Create a new booking and insert all passengers.
     * Returns the fully populated booking object.
     */
    create: async ({ user, flight, passengers, totalPrice }) => {
        const id = generateId();

        dbRun(
            `INSERT INTO bookings (id, user_id, flight_id, total_price, status)
             VALUES (?, ?, ?, ?, 'confirmed')`,
            [id, user, flight, totalPrice]
        );

        // Insert each passenger individually
        if (passengers && passengers.length > 0) {
            for (const p of passengers) {
                dbRun(
                    `INSERT INTO booking_passengers (booking_id, name, age, seat) VALUES (?, ?, ?, ?)`,
                    [id, p.name || '', p.age || null, p.seat || null]
                );
            }
        }

        return await Booking.findById(id);
    },

    /**
     * Find a single booking by ID with nested passengers and flight data.
     */
    findById: async (id) => {
        const booking = dbGet('SELECT * FROM bookings WHERE id = ? LIMIT 1', [id]);
        if (!booking) return null;

        const passengers = dbAll(
            'SELECT name, age, seat FROM booking_passengers WHERE booking_id = ?',
            [id]
        );

        const flight = await Flight.findById(booking.flight_id);

        return {
            _id:         booking.id,
            user:        booking.user_id,
            flight,
            passengers,
            totalPrice:  booking.total_price,
            status:      booking.status,
            bookingDate: booking.booking_date
        };
    },

    /**
     * Find all bookings for a given user ID, most recent first.
     */
    find: async ({ user }) => {
        const rows = dbAll(
            'SELECT id FROM bookings WHERE user_id = ? ORDER BY created_at DESC',
            [user]
        );
        
        const bookings = [];
        for (const row of rows) {
            const b = await Booking.findById(row.id);
            if (b) bookings.push(b);
        }
        return bookings;
    }
};

module.exports = Booking;
