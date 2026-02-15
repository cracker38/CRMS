const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { notifySystemAdmins } = require('../utils/notifications');

const router = express.Router();

// Register new user (System Admin only)
router.post('/register', authenticate, authorize('SYSTEM_ADMIN'), async (req, res) => {
  try {
    const { email, password, first_name, last_name, role, status } = req.body;
    
    if (!email || !password || !first_name || !last_name || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    // Validate role
    const validRoles = ['SYSTEM_ADMIN', 'PROJECT_MANAGER', 'SITE_SUPERVISOR', 'PROCUREMENT_OFFICER', 'FINANCE_OFFICER'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Check if System Admin already exists (only one allowed)
    if (role === 'SYSTEM_ADMIN') {
      const [existingAdmins] = await db.execute(
        'SELECT id FROM users WHERE role = ?',
        ['SYSTEM_ADMIN']
      );
      if (existingAdmins.length > 0) {
        return res.status(400).json({ message: 'Only one System Administrator is allowed in the system' });
      }
    }

    // Check if Project Manager already exists (only one allowed)
    if (role === 'PROJECT_MANAGER') {
      const [existingPMs] = await db.execute(
        'SELECT id FROM users WHERE role = ?',
        ['PROJECT_MANAGER']
      );
      if (existingPMs.length > 0) {
        return res.status(400).json({ message: 'Only one Project Manager is allowed in the system' });
      }
    }

    // Check if user already exists
    const [existingUsers] = await db.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const [result] = await db.execute(
      'INSERT INTO users (email, password, first_name, last_name, role, status, must_change_password) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [email, hashedPassword, first_name, last_name, role, status || 'ACTIVE', true]
    );

    // Log audit
    await db.execute(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'CREATE_USER', 'users', result.insertId, JSON.stringify({ email, first_name, last_name, role, status: status || 'ACTIVE' })]
    );

    try {
      await notifySystemAdmins(`New user ${first_name} ${last_name} (${role.replace(/_/g, ' ')}) was added to the system`);
    } catch (nErr) { console.error('Notification error:', nErr); }

    res.status(201).json({ 
      message: 'User created successfully',
      userId: result.insertId 
    });
  } catch (error) {
    console.error('Register error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user
    const [users] = await db.execute(
      'SELECT id, email, password, first_name, last_name, role, status, must_change_password FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = users[0];

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      return res.status(401).json({ message: 'Account is inactive' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'your_secret_key_here_change_in_production',
      { expiresIn: '24h' }
    );

    // Log audit
    await db.execute(
      'INSERT INTO audit_logs (user_id, action, table_name) VALUES (?, ?, ?)',
      [user.id, 'LOGIN', 'users']
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        must_change_password: user.must_change_password || false
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key_here_change_in_production');
    
    const [users] = await db.execute(
      'SELECT id, email, first_name, last_name, role, status, must_change_password FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'User not found' });
    }

    res.json(users[0]);
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Change password
router.post('/change-password', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key_here_change_in_production');
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    // Get user with password
    const [users] = await db.execute(
      'SELECT id, password FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'User not found' });
    }

    const user = users[0];

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password and clear must_change_password flag
    await db.execute(
      'UPDATE users SET password = ?, must_change_password = FALSE WHERE id = ?',
      [hashedPassword, decoded.userId]
    );

    // Log audit
    await db.execute(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)',
      [decoded.userId, 'CHANGE_PASSWORD', 'users', decoded.userId]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;


