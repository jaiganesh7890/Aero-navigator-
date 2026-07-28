const express = require('express');
const router = express.Router();
const { getFarePrediction, getOptimizedRoutes } = require('../controllers/predictionController');

router.get('/fare', getFarePrediction);
router.get('/optimize', getOptimizedRoutes);

module.exports = router;
