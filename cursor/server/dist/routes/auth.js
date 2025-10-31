"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }
        // Find user
        const result = await db_1.pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            console.log(`Login attempt: User not found for email: ${email}`);
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const user = result.rows[0];
        // Verify password
        const isValidPassword = await bcryptjs_1.default.compare(password, user.password);
        if (!isValidPassword) {
            console.log(`Login attempt: Invalid password for email: ${email}`);
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
        console.log(`Login success: ${email}`);
        res.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                team: user.team,
                role: user.role,
            },
            token,
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error', error: String(error) });
    }
});
// DEBUG: Check database status
router.get('/debug/db-status', async (req, res) => {
    try {
        const userCount = await db_1.pool.query('SELECT COUNT(*) FROM users');
        const users = await db_1.pool.query('SELECT id, email, name FROM users LIMIT 5');
        res.json({
            status: 'connected',
            userCount: userCount.rows[0].count,
            users: users.rows,
            jwtSecretSet: !!process.env.JWT_SECRET
        });
    }
    catch (error) {
        console.error('DB status error:', error);
        res.status(500).json({ status: 'error', error: String(error) });
    }
});
// Create user (admin only)
router.post('/users', auth_1.authMiddleware, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        const { name, email, password, team, role } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email, and password are required' });
        }
        // Hash password
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        // Insert user
        const result = await db_1.pool.query('INSERT INTO users (name, email, password, team, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, team, role, created_at', [name, email, hashedPassword, team || null, role || 'user']);
        res.json({ user: result.rows[0] });
    }
    catch (error) {
        console.error('Error creating user:', error);
        if (error.code === '23505') {
            return res.status(400).json({ message: 'Email already exists' });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Get all users (admin only)
router.get('/users', auth_1.authMiddleware, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        const result = await db_1.pool.query('SELECT id, name, email, team, role, created_at FROM users ORDER BY created_at DESC');
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Update user (admin only)
router.put('/users/:id', auth_1.authMiddleware, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        const { id } = req.params;
        const { name, email, password, team, role } = req.body;
        if (!name || !email) {
            return res.status(400).json({ message: 'Name and email are required' });
        }
        // If password is provided, hash it
        let hashedPassword = null;
        if (password) {
            hashedPassword = await bcryptjs_1.default.hash(password, 10);
        }
        // Update user
        let result;
        if (hashedPassword) {
            result = await db_1.pool.query('UPDATE users SET name = $1, email = $2, password = $3, team = $4, role = $5 WHERE id = $6 RETURNING id, name, email, team, role, created_at', [name, email, hashedPassword, team || null, role || 'user', id]);
        }
        else {
            result = await db_1.pool.query('UPDATE users SET name = $1, email = $2, team = $3, role = $4 WHERE id = $5 RETURNING id, name, email, team, role, created_at', [name, email, team || null, role || 'user', id]);
        }
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ user: result.rows[0] });
    }
    catch (error) {
        console.error('Error updating user:', error);
        if (error.code === '23505') {
            return res.status(400).json({ message: 'Email already exists' });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Delete user (admin only)
router.delete('/users/:id', auth_1.authMiddleware, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        const { id } = req.params;
        // Don't allow deleting yourself
        if (req.user.id === id) {
            return res.status(400).json({ message: 'Cannot delete your own account' });
        }
        const result = await db_1.pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ message: 'User deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map