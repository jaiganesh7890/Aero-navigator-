const Booking = require('../models/Booking');

// @desc    Create a new booking
// @route   POST /booking/create
// @access  Private (requires JWT)
const createBooking = async (req, res) => {
    try {
        const { flightId, passengers, totalPrice } = req.body;

        if (!flightId || !totalPrice) {
            return res.status(400).json({ message: 'flightId and totalPrice are required' });
        }

        const booking = await Booking.create({
            user: req.user.id,   // injected by authMiddleware
            flight: flightId,
            passengers: passengers || [],
            totalPrice
        });

        res.status(201).json(booking);
    } catch (error) {
        console.error('createBooking error:', error.message);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all bookings for a specific user
// @route   GET /booking/user/:id
// @access  Private (requires JWT)
const getUserBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({ user: req.params.id });
        res.json(bookings);
    } catch (error) {
        console.error('getUserBookings error:', error.message);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { createBooking, getUserBookings };
