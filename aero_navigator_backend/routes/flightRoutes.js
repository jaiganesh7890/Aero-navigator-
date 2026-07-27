const express = require('express');
const router = express.Router();
const { searchFlights, getLiveFlight, updateFlightStatus } = require('../controllers/flightController');

router.get('/search', searchFlights);
router.get('/live/:id', getLiveFlight);

module.exports = router;
