const express = require('express');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all employees
router.get('/', authenticate, async (req, res) => {
  try {
    const [employees] = await db.execute(`
      SELECT e.*, u.email, u.first_name, u.last_name, u.role
      FROM employees e
      LEFT JOIN users u ON e.user_id = u.id
      ORDER BY e.created_at DESC
    `);
    res.json(employees);
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Record attendance (Site Supervisor)
router.post('/attendance', authenticate, authorize('SITE_SUPERVISOR'), async (req, res) => {
  try {
    const { employee_id, site_id, date, check_in, check_out, hours_worked, notes } = req.body;
    
    await db.execute(
      'INSERT INTO attendance (employee_id, site_id, date, check_in, check_out, hours_worked, notes) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE check_in = ?, check_out = ?, hours_worked = ?, notes = ?',
      [employee_id, site_id, date, check_in, check_out, hours_worked, notes, check_in, check_out, hours_worked, notes]
    );
    
    res.status(201).json({ message: 'Attendance recorded successfully' });
  } catch (error) {
    console.error('Record attendance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

