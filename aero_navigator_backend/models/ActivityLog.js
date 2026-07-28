const { dbRun, dbAll } = require('../database');

module.exports = {
    /**
     * Log a user activity
     * @param {string} userId - ID of the user
     * @param {string} actionType - E.g., 'SEARCH_ROUTE', 'TRACK_FLIGHT', 'UPDATE_SETTINGS'
     * @param {string} details - Additional context as JSON string or text
     */
    logActivity: (userId, actionType, details = '') => {
        return dbRun(
            'INSERT INTO activity_logs (user_id, action_type, details) VALUES (?, ?, ?)',
            [userId, actionType, details]
        );
    },

    /**
     * Retrieve activity logs for a specific user
     */
    getUserActivity: (userId, limit = 50) => {
        return dbAll(
            'SELECT * FROM activity_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
            [userId, limit]
        );
    },

    /**
     * Retrieve all activity logs for admin purposes
     */
    getAllActivityForAdmin: (limit = 100) => {
        return dbAll(
            'SELECT a.*, u.name as user_name, u.email as user_email FROM activity_logs a JOIN users u ON a.user_id = u.id ORDER BY a.created_at DESC LIMIT ?',
            [limit]
        );
    }
};
