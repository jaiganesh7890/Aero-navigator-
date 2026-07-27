const ActivityLog = require('../models/ActivityLog');

const logUserActivity = async (req, res) => {
    try {
        const userId = req.user.id;
        const { actionType, details } = req.body;

        if (!actionType) {
            return res.status(400).json({ message: 'Action type is required' });
        }

        ActivityLog.logActivity(userId, actionType, details ? JSON.stringify(details) : '');
        res.status(201).json({ message: 'Activity logged successfully' });
    } catch (error) {
        console.error('Error logging activity:', error);
        res.status(500).json({ message: 'Server error logging activity' });
    }
};

const getMyActivity = async (req, res) => {
    try {
        const userId = req.user.id;
        const logs = ActivityLog.getUserActivity(userId);
        res.json(logs);
    } catch (error) {
        console.error('Error fetching activity logs:', error);
        res.status(500).json({ message: 'Server error fetching activity' });
    }
};

const getAdminActivity = async (req, res) => {
    try {
        // Assuming req.user.role === 'admin' check is handled by middleware
        const logs = ActivityLog.getAllActivityForAdmin();
        res.json(logs);
    } catch (error) {
        console.error('Error fetching admin activity:', error);
        res.status(500).json({ message: 'Server error fetching admin activity' });
    }
};

module.exports = {
    logUserActivity,
    getMyActivity,
    getAdminActivity
};
