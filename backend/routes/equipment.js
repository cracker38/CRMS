const express = require('express');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Get equipment list / status
router.get('/', authenticate, async (req, res) => {
  try {
    try {
      await db.execute('SELECT 1 FROM equipment LIMIT 1');
    } catch (tableError) {
      return res.json([]);
    }

    // Ensure equipment has site_id (add if missing for site visibility)
    let hasSiteId = false;
    try {
      const [cols] = await db.execute('DESCRIBE equipment');
      hasSiteId = cols.some(c => c.Field === 'site_id');
      if (!hasSiteId) {
        try {
          await db.execute('ALTER TABLE equipment ADD COLUMN site_id INT NULL');
        } catch (alterErr) {
          if (alterErr.code !== 'ER_DUP_FIELDNAME') throw alterErr;
        }
        hasSiteId = true;
      }
    } catch (_) {}

    if (hasSiteId) {
      const baseQuery = `
        SELECT e.*,
          COALESCE(s.name, (
            SELECT st.name FROM equipment_requests er
            INNER JOIN sites st ON er.site_id = st.id
            WHERE er.equipment_id = e.id AND er.status IN ('APPROVED','FULFILLED','PENDING')
            ORDER BY er.needed_from DESC, er.created_at DESC LIMIT 1
          )) AS site_name,
          COALESCE(p.name, (
            SELECT pt.name FROM equipment_requests er
            INNER JOIN sites st ON er.site_id = st.id
            LEFT JOIN projects pt ON st.project_id = pt.id
            WHERE er.equipment_id = e.id AND er.status IN ('APPROVED','FULFILLED','PENDING')
            ORDER BY er.needed_from DESC, er.created_at DESC LIMIT 1
          )) AS project_name
        FROM equipment e
        LEFT JOIN sites s ON e.site_id = s.id
        LEFT JOIN projects p ON s.project_id = p.id
        ORDER BY e.name
      `;
      let equipmentQuery = baseQuery.replace(/\s+/g, ' ').trim();
      let params = [];
      try {
        await db.execute('SELECT 1 FROM equipment_requests LIMIT 1');
      } catch (_) {
        equipmentQuery = `
          SELECT e.*, s.name AS site_name, p.name AS project_name
          FROM equipment e
          LEFT JOIN sites s ON e.site_id = s.id
          LEFT JOIN projects p ON s.project_id = p.id
          ORDER BY e.name
        `;
      }
      const [equipment] = await db.execute(equipmentQuery.replace(/\s+/g, ' ').trim(), params);
      return res.json(equipment);
    }

    // No site_id: return all equipment, derive site from equipment_requests when linked
    let equipmentQuery = `
      SELECT e.*,
        (SELECT s.name FROM equipment_requests er
         INNER JOIN sites s ON er.site_id = s.id
         WHERE er.equipment_id = e.id AND er.status IN ('APPROVED','FULFILLED','PENDING')
         ORDER BY er.needed_from DESC, er.created_at DESC LIMIT 1) AS site_name,
        (SELECT p.name FROM equipment_requests er
         INNER JOIN sites s ON er.site_id = s.id
         LEFT JOIN projects p ON s.project_id = p.id
         WHERE er.equipment_id = e.id AND er.status IN ('APPROVED','FULFILLED','PENDING')
         ORDER BY er.needed_from DESC, er.created_at DESC LIMIT 1) AS project_name
      FROM equipment e
      ORDER BY e.name
    `;
    try {
      await db.execute('SELECT 1 FROM equipment_requests LIMIT 1');
    } catch (_) {
      equipmentQuery = 'SELECT e.*, NULL AS site_name, NULL AS project_name FROM equipment e ORDER BY e.name';
    }
    const [equipment] = await db.execute(equipmentQuery.replace(/\s+/g, ' ').trim());
    return res.json(equipment);
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
    const { hours_used, status, notes, site_id } = req.body;
    const equipmentId = req.params.id;

    const [rows] = await db.execute('SELECT id FROM equipment WHERE id = ?', [equipmentId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    const safeHours = Number(hours_used) || 0;
    const safeStatus = status || 'AVAILABLE';
    const safeNotes = notes != null ? String(notes) : '';
    let safeSiteId = site_id ? parseInt(site_id, 10) : null;
    if (safeSiteId) {
      const [siteRows] = await db.execute('SELECT id FROM sites WHERE id = ?', [safeSiteId]);
      if (siteRows.length === 0) safeSiteId = null;
    }

    let updateSql = 'UPDATE equipment SET hours_used = ?, status = ?, last_used = NOW()';
    const updateParams = [safeHours, safeStatus];

    try {
      const [cols] = await db.execute('DESCRIBE equipment');
      if (cols.some(c => c.Field === 'notes')) {
        updateSql += ', notes = ?';
        updateParams.push(safeNotes);
      }
      if (cols.some(c => c.Field === 'site_id') && safeSiteId) {
        updateSql += ', site_id = ?';
        updateParams.push(safeSiteId);
      }
    } catch (_) {}
    updateSql += ' WHERE id = ?';
    updateParams.push(equipmentId);

    await db.execute(updateSql, updateParams);
    res.json({ message: 'Equipment usage updated successfully' });
  } catch (error) {
    console.error('Update equipment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
