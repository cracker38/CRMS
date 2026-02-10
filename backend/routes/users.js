const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all users (System Admin only)
router.get('/', authenticate, authorize('SYSTEM_ADMIN'), async (req, res) => {
  try {
    const [users] = await db.execute(
      'SELECT id, email, first_name, last_name, role, status, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user by ID
router.get('/:id', authenticate, authorize('SYSTEM_ADMIN'), async (req, res) => {
  try {
    const [users] = await db.execute(
      'SELECT id, email, first_name, last_name, role, status, created_at FROM users WHERE id = ?',
      [req.params.id]
    );
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(users[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user
router.put('/:id', authenticate, authorize('SYSTEM_ADMIN'), async (req, res) => {
  try {
    const { email, first_name, last_name, role, status } = req.body;
    
    if (!first_name || !last_name || !role || !status) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const [users] = await db.execute('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const existingUser = users[0];

    // If email is being updated, check if it's already taken
    if (email && email !== existingUser.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }

      const [existingUsers] = await db.execute(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, req.params.id]
      );

      if (existingUsers.length > 0) {
        return res.status(400).json({ message: 'Email already in use by another user' });
      }
    }

    // Validate role
    const validRoles = ['SYSTEM_ADMIN', 'PROJECT_MANAGER', 'SITE_SUPERVISOR', 'PROCUREMENT_OFFICER', 'FINANCE_OFFICER'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Check if trying to assign System Admin role (only one allowed)
    if (role === 'SYSTEM_ADMIN' && existingUser.role !== 'SYSTEM_ADMIN') {
      const [existingAdmins] = await db.execute(
        'SELECT id FROM users WHERE role = ? AND id != ?',
        ['SYSTEM_ADMIN', req.params.id]
      );
      if (existingAdmins.length > 0) {
        return res.status(400).json({ message: 'Only one System Administrator is allowed in the system' });
      }
    }

    // Check if trying to assign Project Manager role (only one allowed)
    if (role === 'PROJECT_MANAGER' && existingUser.role !== 'PROJECT_MANAGER') {
      const [existingPMs] = await db.execute(
        'SELECT id FROM users WHERE role = ? AND id != ?',
        ['PROJECT_MANAGER', req.params.id]
      );
      if (existingPMs.length > 0) {
        return res.status(400).json({ message: 'Only one Project Manager is allowed in the system' });
      }
    }

    // Update user
    if (email && email !== existingUser.email) {
      await db.execute(
        'UPDATE users SET email = ?, first_name = ?, last_name = ?, role = ?, status = ? WHERE id = ?',
        [email, first_name, last_name, role, status, req.params.id]
      );
    } else {
      await db.execute(
        'UPDATE users SET first_name = ?, last_name = ?, role = ?, status = ? WHERE id = ?',
        [first_name, last_name, role, status, req.params.id]
      );
    }

    // Log audit
    await db.execute(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values) VALUES (?, ?, ?, ?, ?, ?)',
      [
        req.user.id, 
        'UPDATE_USER', 
        'users', 
        req.params.id, 
        JSON.stringify({
          email: existingUser.email,
          first_name: existingUser.first_name,
          last_name: existingUser.last_name,
          role: existingUser.role,
          status: existingUser.status
        }),
        JSON.stringify(req.body)
      ]
    );

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Email already in use' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset password (System Admin only)
router.post('/:id/reset-password', authenticate, authorize('SYSTEM_ADMIN'), async (req, res) => {
  try {
    const defaultPassword = 'Default@12345';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(defaultPassword, salt);

    await db.execute(
      'UPDATE users SET password = ?, must_change_password = TRUE WHERE id = ?',
      [hashedPassword, req.params.id]
    );

    // Log audit
    await db.execute(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)',
      [req.user.id, 'RESET_PASSWORD', 'users', req.params.id]
    );

    res.json({ message: 'Password reset successfully', defaultPassword });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

