const Flight = require('../models/Flight');

// @desc    Search flights by source, destination, and optional date
// @route   GET /flights/search?source=DEL&destination=BOM&date=2026-06-01
// @access  Public
const searchFlights = async (req, res) => {
    try {
        const { source, destination } = req.query;

        const query = {};
        if (source)      query['departure_airport_code'] = source.toUpperCase();
        if (destination) query['arrival_airport_code']   = destination.toUpperCase();

        const flights = await Flight.find(query);
        res.json(flights);
    } catch (error) {
        console.error('searchFlights error:', error.message);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get live tracking data for a specific flight
// @route   GET /flights/live/:id
// @access  Public
const getLiveFlight = async (req, res) => {
    try {
        const flight = await Flight.findById(req.params.id);

        if (!flight) {
            return res.status(404).json({ message: 'Flight not found' });
        }

        res.json(flight);
    } catch (error) {
        console.error('getLiveFlight error:', error.message);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { searchFlights, getLiveFlight };
