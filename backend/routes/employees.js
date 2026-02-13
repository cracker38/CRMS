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

// Create employee (System Admin only)
router.post('/', authenticate, authorize('SYSTEM_ADMIN'), async (req, res) => {
  try {
    const { user_id, employee_id, phone, address, position, hire_date, status } = req.body;

    if (!employee_id || !employee_id.trim()) {
      return res.status(400).json({ message: 'Employee ID is required' });
    }

    // Ensure employee_id is unique
    const [existingByCode] = await db.execute(
      'SELECT id FROM employees WHERE employee_id = ?',
      [employee_id.trim()]
    );
    if (existingByCode.length > 0) {
      return res.status(400).json({ message: 'Employee ID already exists' });
    }

    let resolvedUserId = null;
    if (user_id) {
      // Verify user exists
      const [users] = await db.execute('SELECT id FROM users WHERE id = ?', [user_id]);
      if (users.length === 0) {
        return res.status(400).json({ message: 'Linked user not found' });
      }

      // Ensure this user is not already linked to another employee
      const [existingForUser] = await db.execute(
        'SELECT id FROM employees WHERE user_id = ?',
        [user_id]
      );
      if (existingForUser.length > 0) {
        return res.status(400).json({ message: 'This user is already linked to an employee' });
      }

      resolvedUserId = user_id;
    }

    const [result] = await db.execute(
      'INSERT INTO employees (user_id, employee_id, phone, address, position, hire_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        resolvedUserId,
        employee_id.trim(),
        phone || null,
        address || null,
        position || null,
        hire_date || null,
        status || 'ACTIVE'
      ]
    );

    // Best-effort audit log
    try {
      await db.execute(
        'INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'CREATE_EMPLOYEE', 'employees', result.insertId, JSON.stringify(req.body)]
      );
    } catch (auditError) {
      console.error('Audit log error (employees):', auditError);
    }

    res.status(201).json({ message: 'Employee created successfully', employeeId: result.insertId });
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get attendance records (used by Site Supervisor dashboard)
router.get('/attendance', authenticate, async (req, res) => {
  try {
    // Describe table to ensure it exists
    try {
      await db.execute('SELECT 1 FROM attendance LIMIT 1');
    } catch (tableError) {
      // If the attendance table doesn't exist yet, just return empty
      return res.json([]);
    }

    // Check if employees table exists and can be joined
    let hasEmployeesTable = true;
    try {
      await db.execute('DESCRIBE employees');
    } catch (e) {
      hasEmployeesTable = false;
    }

    let query;
    if (hasEmployeesTable) {
      query = `
        SELECT 
          a.*,
          s.name as site_name,
          e.employee_id,
          u.first_name,
          u.last_name
        FROM attendance a
        LEFT JOIN sites s ON a.site_id = s.id
        LEFT JOIN employees e ON a.employee_id = e.id
        LEFT JOIN users u ON e.user_id = u.id
      `;
    } else {
      // Fallback: no employees table, return raw attendance with site name only
      query = `
        SELECT 
          a.*,
          s.name as site_name
        FROM attendance a
        LEFT JOIN sites s ON a.site_id = s.id
      `;
    }

    const params = [];

    // Site supervisors only see attendance for their sites
    if (req.user.role === 'SITE_SUPERVISOR') {
      query += ' WHERE s.supervisor_id = ?';
      params.push(req.user.id);
    }

    query += ' ORDER BY a.date DESC, a.created_at DESC';

    const [rows] = await db.execute(query, params);
    res.json(rows || []);
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Record attendance (Site Supervisor)
router.post('/attendance', authenticate, authorize('SITE_SUPERVISOR'), async (req, res) => {
  try {
    const { employee_id, site_id, date, check_in, check_out, hours_worked, notes } = req.body;

    // Ensure attendance table exists
    try {
      await db.execute('SELECT 1 FROM attendance LIMIT 1');
    } catch (tableError) {
      return res.status(500).json({ message: 'Attendance table does not exist', error: tableError.message });
    }

    // Validate required fields
    if (!employee_id || !site_id || !date) {
      return res.status(400).json({ message: 'Employee, site and date are required' });
    }

    // Validate employee exists (when employees table is present)
    try {
      const [empRows] = await db.execute('SELECT id FROM employees WHERE id = ?', [employee_id]);
      if (empRows.length === 0) {
        return res.status(400).json({ message: 'Selected employee does not exist' });
      }
    } catch (empError) {
      // If employees table is missing, log and continue – DB FK will enforce if it exists
      if (empError.code !== 'ER_NO_SUCH_TABLE') {
        console.error('Employee lookup error:', empError);
      }
    }

    // Validate site exists (best-effort)
    try {
      const [siteRows] = await db.execute('SELECT id FROM sites WHERE id = ?', [site_id]);
      if (siteRows.length === 0) {
        return res.status(400).json({ message: 'Selected site does not exist' });
      }
    } catch (siteError) {
      if (siteError.code !== 'ER_NO_SUCH_TABLE') {
        console.error('Site lookup error:', siteError);
      }
    }

    // Normalize optional fields so we never pass undefined to the DB driver
    const safeCheckIn = typeof check_in === 'undefined' || check_in === '' ? null : check_in;
    const safeCheckOut = typeof check_out === 'undefined' || check_out === '' ? null : check_out;
    const safeHoursWorked =
      typeof hours_worked === 'undefined' || hours_worked === ''
        ? 0
        : Number.isNaN(Number(hours_worked))
        ? 0
        : Number(hours_worked);
    const safeNotes = typeof notes === 'undefined' ? null : notes;

    await db.execute(
      'INSERT INTO attendance (employee_id, site_id, date, check_in, check_out, hours_worked, notes) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE check_in = ?, check_out = ?, hours_worked = ?, notes = ?',
      [
        employee_id,
        site_id,
        date,
        safeCheckIn,
        safeCheckOut,
        safeHoursWorked,
        safeNotes,
        safeCheckIn,
        safeCheckOut,
        safeHoursWorked,
        safeNotes
      ]
    );
    
    res.status(201).json({ message: 'Attendance recorded successfully' });
  } catch (error) {
    console.error('Record attendance error:', error);
    res.status(500).json({ message: error.message || 'Server error', code: error.code });
  }
});

module.exports = router;

