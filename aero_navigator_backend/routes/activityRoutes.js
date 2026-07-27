const express = require('express');
const router = express.Router();
const { logUserActivity, getMyActivity, getAdminActivity } = require('../controllers/activityController');
const { protect } = require('../middleware/authMiddleware');

router.post('/log', protect, logUserActivity);
router.get('/history', protect, getMyActivity);
// Additional middleware could be added here to restrict to admin only
router.get('/admin', protect, getAdminActivity);

module.exports = router;
