const express = require('express');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all material requests
router.get('/', authenticate, async (req, res) => {
  try {
    let query = `
      SELECT mr.*, 
        m.name as material_name,
        m.unit,
        s.name as site_name,
        p.name as project_name,
        u1.first_name as requested_by_first_name,
        u1.last_name as requested_by_last_name,
        CONCAT(u1.first_name, ' ', u1.last_name) as requested_by_name,
        u2.first_name as approved_by_first_name,
        u2.last_name as approved_by_last_name
      FROM material_requests mr
      LEFT JOIN materials m ON mr.material_id = m.id
      LEFT JOIN sites s ON mr.site_id = s.id
      LEFT JOIN projects p ON s.project_id = p.id
      LEFT JOIN users u1 ON mr.requested_by = u1.id
      LEFT JOIN users u2 ON mr.approved_by = u2.id
    `;
    
    // Project Manager sees requests for their projects
    if (req.user.role === 'PROJECT_MANAGER') {
      query += ' WHERE p.project_manager_id = ?';
    } else if (req.user.role === 'SITE_SUPERVISOR') {
      query += ' WHERE mr.requested_by = ?';
    }
    
    query += ' ORDER BY mr.created_at DESC';
    
    const [requests] = req.user.role === 'PROJECT_MANAGER'
      ? await db.execute(query, [req.user.id])
      : req.user.role === 'SITE_SUPERVISOR'
      ? await db.execute(query, [req.user.id])
      : await db.execute(query);
    
    res.json(requests);
  } catch (error) {
    console.error('Get material requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new material request (Site Supervisor / Project Manager)
router.post('/', authenticate, authorize('SITE_SUPERVISOR', 'PROJECT_MANAGER'), async (req, res) => {
  try {
    const { site_id, material_id, quantity, priority, notes } = req.body;

    // Basic validation
    if (!site_id || !material_id || !quantity) {
      return res.status(400).json({ message: 'Site, material and quantity are required' });
    }

    // Optionally verify that the site belongs to the current supervisor / manager
    if (req.user.role === 'SITE_SUPERVISOR') {
      const [sites] = await db.execute(
        'SELECT id FROM sites WHERE id = ? AND supervisor_id = ?',
        [site_id, req.user.id]
      );
      if (sites.length === 0) {
        return res.status(403).json({ message: 'You are not allowed to request materials for this site' });
      }
    }

    const [result] = await db.execute(
      'INSERT INTO material_requests (site_id, requested_by, material_id, quantity, priority, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [site_id, req.user.id, material_id, quantity, priority || 'NORMAL', notes || null]
    );

    // Log audit (best-effort)
    try {
      await db.execute(
        'INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'CREATE_MATERIAL_REQUEST', 'material_requests', result.insertId, JSON.stringify(req.body)]
      );
    } catch (auditError) {
      console.error('Audit log error (material request):', auditError);
    }

    res.status(201).json({ message: 'Material request created successfully', id: result.insertId });
  } catch (error) {
    console.error('Create material request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve material request (Project Manager)
router.put('/:id/approve', authenticate, authorize('PROJECT_MANAGER'), async (req, res) => {
  try {
    // Verify the request belongs to a project managed by this PM
    const [requests] = await db.execute(`
      SELECT mr.*, p.project_manager_id
      FROM material_requests mr
      LEFT JOIN sites s ON mr.site_id = s.id
      LEFT JOIN projects p ON s.project_id = p.id
      WHERE mr.id = ?
    `, [req.params.id]);
    
    if (requests.length === 0) {
      return res.status(404).json({ message: 'Material request not found' });
    }
    
    if (requests[0].project_manager_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    await db.execute(
      'UPDATE material_requests SET status = ?, approved_by = ?, approved_at = NOW() WHERE id = ?',
      ['APPROVED', req.user.id, req.params.id]
    );
    
    // Log audit
    await db.execute(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'APPROVE_MATERIAL_REQUEST', 'material_requests', req.params.id, JSON.stringify({ status: 'APPROVED' })]
    );
    
    res.json({ message: 'Material request approved successfully' });
  } catch (error) {
    console.error('Approve material request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reject material request (Project Manager)
router.put('/:id/reject', authenticate, authorize('PROJECT_MANAGER'), async (req, res) => {
  try {
    const { reason } = req.body;
    
    // Verify the request belongs to a project managed by this PM
    const [requests] = await db.execute(`
      SELECT mr.*, p.project_manager_id
      FROM material_requests mr
      LEFT JOIN sites s ON mr.site_id = s.id
      LEFT JOIN projects p ON s.project_id = p.id
      WHERE mr.id = ?
    `, [req.params.id]);
    
    if (requests.length === 0) {
      return res.status(404).json({ message: 'Material request not found' });
    }
    
    if (requests[0].project_manager_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    await db.execute(
      'UPDATE material_requests SET status = ?, approved_by = ?, rejection_reason = ?, approved_at = NOW() WHERE id = ?',
      ['REJECTED', req.user.id, reason || null, req.params.id]
    );
    
    // Log audit
    await db.execute(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'REJECT_MATERIAL_REQUEST', 'material_requests', req.params.id, JSON.stringify({ status: 'REJECTED', reason })]
    );
    
    res.json({ message: 'Material request rejected' });
  } catch (error) {
    console.error('Reject material request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;







