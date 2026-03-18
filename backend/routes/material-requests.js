const express = require('express');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { notifyRole, createNotification } = require('../utils/notifications');

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

    const qty = parseFloat(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({ message: 'Quantity must be a valid number > 0' });
    }

    // Availability check (stock)
    const [materials] = await db.execute('SELECT id, name, current_stock FROM materials WHERE id = ?', [material_id]);
    if (!materials || materials.length === 0) {
      return res.status(404).json({ message: 'Material not found' });
    }
    const material = materials[0];
    const availableStock = parseFloat(material.current_stock || 0);
    if (availableStock < qty) {
      return res.status(400).json({
        message: `Insufficient stock for ${material.name || 'material'}`,
        available_stock: availableStock
      });
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
      [site_id, req.user.id, material_id, qty, priority || 'NORMAL', notes || null]
    );

    try {
      await db.execute(
        'INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'CREATE_MATERIAL_REQUEST', 'material_requests', result.insertId, JSON.stringify(req.body)]
      );
    } catch (auditError) { console.error('Audit log error (material request):', auditError); }

    try {
      const [mr] = await db.execute('SELECT m.name as material_name, s.name as site_name FROM material_requests mr LEFT JOIN materials m ON mr.material_id = m.id LEFT JOIN sites s ON mr.site_id = s.id WHERE mr.id = ?', [result.insertId]);
      const mat = mr && mr[0];
      await notifyRole('PROJECT_MANAGER', `New material request: ${mat?.material_name || 'Materials'} for ${mat?.site_name || 'site'} (pending approval)`);
    } catch (nErr) { console.error('Notification error:', nErr); }

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

    // Prevent double approval / handle only PENDING
    const currentStatus = (requests[0].status || 'PENDING').toString().toUpperCase();
    if (currentStatus !== 'PENDING') {
      return res.status(400).json({ message: `Material request is already ${currentStatus}` });
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();
    try {
      // Re-check stock and deduct
      const [matRows] = await connection.execute(
        'SELECT id, name, current_stock, unit_price FROM materials WHERE id = ? FOR UPDATE',
        [requests[0].material_id]
      );
      if (!matRows || matRows.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({ message: 'Material not found' });
      }
      const mat = matRows[0];
      const reqQty = parseFloat(requests[0].quantity || 0);
      const stock = parseFloat(mat.current_stock || 0);
      if (!Number.isFinite(reqQty) || reqQty <= 0) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ message: 'Invalid requested quantity' });
      }
      if (stock < reqQty) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({
          message: `Insufficient stock to approve (${mat.name || 'material'})`,
          available_stock: stock
        });
      }

      await connection.execute(
        'UPDATE materials SET current_stock = current_stock - ? WHERE id = ?',
        [reqQty, requests[0].material_id]
      );

      // Mark request approved
      await connection.execute(
        'UPDATE material_requests SET status = ?, approved_by = ?, approved_at = NOW() WHERE id = ?',
        ['APPROVED', req.user.id, req.params.id]
      );

      // Inventory transaction record (ISSUE)
      try {
        await connection.execute(
          'INSERT INTO inventory_transactions (material_id, transaction_type, quantity, site_id, performed_by, notes) VALUES (?, ?, ?, ?, ?, ?)',
          [requests[0].material_id, 'ISSUE', reqQty, requests[0].site_id, req.user.id, 'Issued on material request approval']
        );
      } catch (invErr) {
        // If inventory_transactions table differs, don't block approval
        console.error('Inventory transaction insert error:', invErr);
      }

      // Create an APPROVED expense so budget/remaining becomes clear immediately
      const [[projRow]] = await connection.execute(
        `SELECT p.id as project_id, p.name as project_name
         FROM sites s
         LEFT JOIN projects p ON s.project_id = p.id
         WHERE s.id = ?`,
        [requests[0].site_id]
      );
      const projectId = projRow && projRow.project_id;
      const unitPrice = parseFloat(mat.unit_price || 0);
      const amount = (Number.isFinite(unitPrice) ? unitPrice : 0) * reqQty;
      if (projectId && amount > 0) {
        await connection.execute(
          `INSERT INTO expenses (project_id, category, description, amount, expense_date, payment_status, approved_by, created_by)
           VALUES (?, 'MATERIALS', ?, ?, CURDATE(), 'APPROVED', ?, ?)`,
          [
            projectId,
            `Materials issued: ${mat.name || 'Material'} (Qty ${reqQty}) for site #${requests[0].site_id}`,
            amount,
            req.user.id,
            req.user.id
          ]
        );
      }

      // Audit log
      try {
        await connection.execute(
          'INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values) VALUES (?, ?, ?, ?, ?)',
          [req.user.id, 'APPROVE_MATERIAL_REQUEST', 'material_requests', req.params.id, JSON.stringify({ status: 'APPROVED' })]
        );
      } catch (auditError) { console.error('Audit log error (material approve):', auditError); }

      await connection.commit();
    } catch (txErr) {
      await connection.rollback();
      throw txErr;
    } finally {
      connection.release();
    }

    try { await createNotification(requests[0].requested_by, 'Your material request has been approved'); } catch (nErr) { console.error('Notification error:', nErr); }
    res.json({ message: 'Material request approved successfully (stock deducted, budget updated)' });
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
    
    await db.execute(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'REJECT_MATERIAL_REQUEST', 'material_requests', req.params.id, JSON.stringify({ status: 'REJECTED', reason })]
    );
    try {
      await createNotification(requests[0].requested_by, 'Your material request has been rejected' + (reason ? `: ${reason}` : ''));
    } catch (nErr) { console.error('Notification error:', nErr); }
    res.json({ message: 'Material request rejected' });
  } catch (error) {
    console.error('Reject material request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark material request as fulfilled (Procurement Officer)
router.put('/:id/fulfill', authenticate, authorize('PROCUREMENT_OFFICER'), async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT id, status, requested_by FROM material_requests WHERE id = ?', [req.params.id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'Material request not found' });
    }
    const status = (rows[0].status || 'PENDING').toString().toUpperCase();
    if (status !== 'APPROVED') {
      return res.status(400).json({ message: `Only APPROVED requests can be fulfilled (currently ${status})` });
    }

    await db.execute(
      'UPDATE material_requests SET status = ? WHERE id = ?',
      ['FULFILLED', req.params.id]
    );

    try {
      await db.execute(
        'INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'FULFILL_MATERIAL_REQUEST', 'material_requests', req.params.id, JSON.stringify({ status: 'FULFILLED' })]
      );
    } catch (auditError) { console.error('Audit log error (fulfill material request):', auditError); }

    try {
      await createNotification(rows[0].requested_by, 'Your material request has been fulfilled (materials issued)');
    } catch (nErr) { console.error('Notification error:', nErr); }

    res.json({ message: 'Material request fulfilled' });
  } catch (error) {
    console.error('Fulfill material request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;







