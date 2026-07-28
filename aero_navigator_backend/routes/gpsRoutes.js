// GPS Sharing routes
// Stores in-memory location sharing sessions (for demo purposes)
const express = require('express');
const router = express.Router();

const gpsSessions = {}; // sessionId -> { userId, lat, lng, sharedWith[], active }

// Start/update a GPS sharing session
router.post('/share', (req, res) => {
    try {
        const { userId, latitude, longitude, sessionId } = req.body;
        const sid = sessionId || `gps-${userId}-${Date.now()}`;
        gpsSessions[sid] = {
            sessionId: sid,
            userId,
            latitude,
            longitude,
            active: true,
            sharedWith: gpsSessions[sid]?.sharedWith || [],
            updatedAt: new Date().toISOString()
        };
        res.json({ sessionId: sid, shareLink: `https://aero-nav.app/live/${sid}`, ...gpsSessions[sid] });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// Update live location
router.put('/share/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const { latitude, longitude } = req.body;
    if (!gpsSessions[sessionId]) return res.status(404).json({ message: 'Session not found' });
    gpsSessions[sessionId].latitude = latitude;
    gpsSessions[sessionId].longitude = longitude;
    gpsSessions[sessionId].updatedAt = new Date().toISOString();
    res.json(gpsSessions[sessionId]);
});

// Get session info (for people who click the shared link)
router.get('/share/:sessionId', (req, res) => {
    const session = gpsSessions[req.params.sessionId];
    if (!session) return res.status(404).json({ message: 'Session not found or expired' });
    res.json(session);
});

// Stop sharing
router.delete('/share/:sessionId', (req, res) => {
    if (gpsSessions[req.params.sessionId]) {
        gpsSessions[req.params.sessionId].active = false;
    }
    res.json({ message: 'Sharing stopped' });
});

module.exports = router;
