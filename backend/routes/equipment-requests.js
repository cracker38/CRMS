const express = require('express');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Ensure equipment_requests table exists
async function ensureEquipmentRequestsTable() {
  try {
    await db.execute('SELECT 1 FROM equipment_requests LIMIT 1');
  } catch (err) {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS equipment_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        site_id INT NOT NULL,
        requested_by INT NOT NULL,
        equipment_id INT NULL,
        request_date DATE NOT NULL,
        status ENUM('PENDING','APPROVED','REJECTED','FULFILLED') DEFAULT 'PENDING',
        needed_from DATE NULL,
        needed_until DATE NULL,
        description TEXT,
        notes TEXT,
        rejection_reason TEXT,
        approved_by INT NULL,
        approved_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
        FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
  }
}

// Get equipment requests (filtered by role)
router.get('/', authenticate, async (req, res) => {
  try {
    await ensureEquipmentRequestsTable();

    let query = `
      SELECT 
        er.*,
        s.name AS site_name,
        p.name AS project_name,
        e.name AS equipment_name,
        u1.first_name AS requested_by_first_name,
        u1.last_name AS requested_by_last_name,
        u2.first_name AS approved_by_first_name,
        u2.last_name AS approved_by_last_name
      FROM equipment_requests er
      LEFT JOIN sites s ON er.site_id = s.id
      LEFT JOIN projects p ON s.project_id = p.id
      LEFT JOIN equipment e ON er.equipment_id = e.id
      LEFT JOIN users u1 ON er.requested_by = u1.id
      LEFT JOIN users u2 ON er.approved_by = u2.id
    `;

    const params = [];

    if (req.user.role === 'PROJECT_MANAGER') {
      query += ' WHERE p.project_manager_id = ?';
      params.push(req.user.id);
    } else if (req.user.role === 'SITE_SUPERVISOR') {
      query += ' WHERE er.requested_by = ?';
      params.push(req.user.id);
    }

    query += ' ORDER BY er.created_at DESC';

    const [rows] = await db.execute(query, params);
    res.json(rows || []);
  } catch (error) {
    console.error('Get equipment requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create equipment request (Site Supervisor)
router.post('/', authenticate, authorize('SITE_SUPERVISOR'), async (req, res) => {
  try {
    await ensureEquipmentRequestsTable();

    const { site_id, equipment_id, description, needed_from, needed_until, notes } = req.body;

    if (!site_id) {
      return res.status(400).json({ message: 'Site is required' });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({ message: 'Description is required' });
    }

    // Verify site belongs to this supervisor (best-effort, falls back to allowing)
    try {
      const [sites] = await db.execute(
        'SELECT id FROM sites WHERE id = ? AND supervisor_id = ?',
        [site_id, req.user.id]
      );
      if (sites.length === 0) {
        return res.status(403).json({ message: 'You are not allowed to request equipment for this site' });
      }
    } catch (siteError) {
      if (siteError.code !== 'ER_NO_SUCH_TABLE') {
        console.error('Site ownership check error:', siteError);
      }
    }

    const requestDate = new Date().toISOString().slice(0, 10);

    const [result] = await db.execute(
      `INSERT INTO equipment_requests 
        (site_id, requested_by, equipment_id, request_date, status, needed_from, needed_until, description, notes)
       VALUES (?, ?, ?, ?, 'PENDING', ?, ?, ?, ?)`,
      [
        site_id,
        req.user.id,
        equipment_id || null,
        requestDate,
        needed_from || null,
        needed_until || null,
        description.trim(),
        notes || null
      ]
    );

    // Audit log (best-effort)
    try {
      await db.execute(
        'INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'CREATE_EQUIPMENT_REQUEST', 'equipment_requests', result.insertId, JSON.stringify(req.body)]
      );
    } catch (auditError) {
      console.error('Audit log error (equipment_requests):', auditError);
    }

    res.status(201).json({ message: 'Equipment request created successfully', id: result.insertId });
  } catch (error) {
    console.error('Create equipment request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve equipment request (Project Manager)
router.put('/:id/approve', authenticate, authorize('PROJECT_MANAGER'), async (req, res) => {
  try {
    await ensureEquipmentRequestsTable();

    // Verify request belongs to a project managed by this PM
    const [rows] = await db.execute(
      `SELECT er.*, p.project_manager_id
       FROM equipment_requests er
       LEFT JOIN sites s ON er.site_id = s.id
       LEFT JOIN projects p ON s.project_id = p.id
       WHERE er.id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Equipment request not found' });
    }

    if (rows[0].project_manager_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await db.execute(
      `UPDATE equipment_requests 
       SET status = 'APPROVED', approved_by = ?, approved_at = NOW()
       WHERE id = ?`,
      [req.user.id, req.params.id]
    );

    // Audit log (best-effort)
    try {
      await db.execute(
        'INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'APPROVE_EQUIPMENT_REQUEST', 'equipment_requests', req.params.id, JSON.stringify({ status: 'APPROVED' })]
      );
    } catch (auditError) {
      console.error('Audit log error (approve equipment request):', auditError);
    }

    res.json({ message: 'Equipment request approved successfully' });
  } catch (error) {
    console.error('Approve equipment request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reject equipment request (Project Manager)
router.put('/:id/reject', authenticate, authorize('PROJECT_MANAGER'), async (req, res) => {
  try {
    await ensureEquipmentRequestsTable();

    const { reason } = req.body;

    const [rows] = await db.execute(
      `SELECT er.*, p.project_manager_id
       FROM equipment_requests er
       LEFT JOIN sites s ON er.site_id = s.id
       LEFT JOIN projects p ON s.project_id = p.id
       WHERE er.id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Equipment request not found' });
    }

    if (rows[0].project_manager_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await db.execute(
      `UPDATE equipment_requests 
       SET status = 'REJECTED', rejection_reason = ?, approved_by = ?, approved_at = NOW()
       WHERE id = ?`,
      [reason || null, req.user.id, req.params.id]
    );

    // Audit log (best-effort)
    try {
      await db.execute(
        'INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'REJECT_EQUIPMENT_REQUEST', 'equipment_requests', req.params.id, JSON.stringify({ status: 'REJECTED', reason })]
      );
    } catch (auditError) {
      console.error('Audit log error (reject equipment request):', auditError);
    }

    res.json({ message: 'Equipment request rejected' });
  } catch (error) {
    console.error('Reject equipment request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

