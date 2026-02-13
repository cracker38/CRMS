const express = require('express');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Get equipment list / status
router.get('/', authenticate, async (req, res) => {
  try {
    // Check if equipment table exists
    try {
      await db.execute('SELECT 1 FROM equipment LIMIT 1');
    } catch (tableError) {
      // Table doesn't exist yet – treat as no equipment configured
      return res.json([]);
    }

    // Try to include site/project info if schema supports it
    let baseQuery = `
      SELECT e.*,
        s.name AS site_name,
        p.name AS project_name
      FROM equipment e
      LEFT JOIN sites s ON e.site_id = s.id
      LEFT JOIN projects p ON s.project_id = p.id
    `;

    const params = [];

    if (req.user.role === 'SITE_SUPERVISOR') {
      baseQuery += ' WHERE s.supervisor_id = ?';
      params.push(req.user.id);
    }

    baseQuery += ' ORDER BY e.name';

    try {
      const [equipment] = await db.execute(baseQuery, params);
      return res.json(equipment);
    } catch (joinError) {
      // If schema doesn't have site_id / project relation yet, fall back to plain equipment list
      if (joinError.code === 'ER_BAD_FIELD_ERROR') {
        const [equipment] = await db.execute(
          'SELECT e.*, NULL AS site_name, NULL AS project_name FROM equipment e ORDER BY e.name'
        );
        return res.json(equipment);
      }
      throw joinError;
    }
  } catch (error) {
    console.error('Get equipment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create equipment (System Admin only)
router.post('/', authenticate, authorize('SYSTEM_ADMIN'), async (req, res) => {
  try {
    const { name, type, serial_number, status, purchase_date, purchase_cost } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Equipment name is required' });
    }

    // Ensure equipment table exists
    try {
      await db.execute('SELECT 1 FROM equipment LIMIT 1');
    } catch (tableError) {
      return res.status(500).json({ message: 'Equipment table does not exist', error: tableError.message });
    }

    const [result] = await db.execute(
      'INSERT INTO equipment (name, type, serial_number, status, purchase_date, purchase_cost) VALUES (?, ?, ?, ?, ?, ?)',
      [
        name.trim(),
        type || null,
        serial_number || null,
        status || 'AVAILABLE',
        purchase_date || null,
        purchase_cost || null
      ]
    );

    // Best-effort audit log
    try {
      await db.execute(
        'INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'CREATE_EQUIPMENT', 'equipment', result.insertId, JSON.stringify(req.body)]
      );
    } catch (auditError) {
      console.error('Audit log error (equipment):', auditError);
    }

    res.status(201).json({ message: 'Equipment created successfully', equipmentId: result.insertId });
  } catch (error) {
    console.error('Create equipment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update equipment usage (Site Supervisor)
router.put('/:id/usage', authenticate, authorize('SITE_SUPERVISOR'), async (req, res) => {
  try {
    const { hours_used, status, notes } = req.body;
    
    await db.execute(
      'UPDATE equipment SET hours_used = ?, status = ?, last_used = NOW(), notes = ? WHERE id = ?',
      [hours_used, status, notes, req.params.id]
    );
    
    res.json({ message: 'Equipment usage updated successfully' });
  } catch (error) {
    console.error('Update equipment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
