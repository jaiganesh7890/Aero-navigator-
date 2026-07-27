const { dbRun, dbGet, dbAll, generateId } = require('../database');
const bcrypt = require('bcryptjs');

/**
 * User model backed by sql.js SQLite.
 */
const User = {
    /**
     * Find a single user by email.
     * Returns the user row with a matchPassword() helper attached, or null.
     */
    findOne: ({ email }) => {
        const user = dbGet(
            'SELECT * FROM users WHERE email = ? LIMIT 1',
            [email]
        );

        if (!user) return null;

        // Attach async password comparison method
        user.matchPassword = async (enteredPassword) => {
            return await bcrypt.compare(enteredPassword, user.password);
        };

        return user;
    },

    /**
     * Find a user by ID — password field is NOT returned.
     */
    findById: (id) => {
        return dbGet(
            'SELECT id, name, email, role, created_at FROM users WHERE id = ? LIMIT 1',
            [id]
        );
    },

    /**
     * Create a new user with a bcrypt-hashed password.
     * Returns the created user object (without password).
     */
    create: async ({ name, email, password }) => {
        const salt         = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const id           = generateId();

        dbRun(
            `INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, 'user')`,
            [id, name, email, hashedPassword]
        );

        return { id, _id: id, name, email, role: 'user' };
    },

    /**
     * Retrieve all saved travelers linked to a user.
     */
    getSavedTravelers: (userId) => {
        return dbAll(
            'SELECT * FROM saved_travelers WHERE user_id = ?',
            [userId]
        );
    },

    /**
     * Update an existing user's details.
     */
    update: async (id, name, email, newPassword) => {
        if (newPassword) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);
            dbRun(
                'UPDATE users SET name = ?, email = ?, password = ? WHERE id = ?',
                [name, email, hashedPassword, id]
            );
        } else {
            dbRun(
                'UPDATE users SET name = ?, email = ? WHERE id = ?',
                [name, email, id]
            );
        }
        return User.findById(id);
    }
};

module.exports = User;
