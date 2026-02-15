const express = require('express');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { notifyRole, createNotification } = require('../utils/notifications');

const router = express.Router();

// Get all expenses
router.get('/', authenticate, async (req, res) => {
  try {
    let query = `
      SELECT e.*, 
        p.name as project_name,
        u1.first_name as creator_first_name,
        u1.last_name as creator_last_name,
        u2.first_name as approver_first_name,
        u2.last_name as approver_last_name
      FROM expenses e
      LEFT JOIN projects p ON e.project_id = p.id
      LEFT JOIN users u1 ON e.created_by = u1.id
      LEFT JOIN users u2 ON e.approved_by = u2.id
    `;
    
    if (req.user.role === 'PROJECT_MANAGER') {
      query += ' WHERE e.project_id IN (SELECT id FROM projects WHERE project_manager_id = ?)';
    }
    
    query += ' ORDER BY e.created_at DESC';
    
    const [expenses] = req.user.role === 'PROJECT_MANAGER'
      ? await db.execute(query, [req.user.id])
      : await db.execute(query);
    
    res.json(expenses);
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create expense (Project Manager or Finance Officer)
router.post('/', authenticate, authorize('PROJECT_MANAGER', 'FINANCE_OFFICER'), async (req, res) => {
  try {
    const { project_id, category, description, amount, expense_date, invoice_number } = req.body;
    
    if (!project_id || !category || !amount || !expense_date) {
      return res.status(400).json({ message: 'Project, category, amount and date are required' });
    }

    const numericAmount = parseFloat(amount);
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ message: 'Amount must be a positive number' });
    }

    const [result] = await db.execute(
      `INSERT INTO expenses (project_id, category, description, amount, expense_date, invoice_number, created_by, payment_status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [project_id, category, description || null, numericAmount, expense_date, invoice_number || null, req.user.id]
    );
    try {
      if (req.user.role === 'PROJECT_MANAGER') {
        const [p] = await db.execute('SELECT name FROM projects WHERE id = ?', [project_id]);
        const projName = p && p[0] && p[0].name;
        await notifyRole('FINANCE_OFFICER', `New expense/invoice for ${projName || 'project'}: $${numericAmount.toFixed(2)} (pending payment)`);
      }
    } catch (nErr) { console.error('Notification error:', nErr); }
    res.status(201).json({ message: 'Expense created successfully', expenseId: result.insertId });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve/Reject expense (Finance Officer)
router.put('/:id/approve', authenticate, authorize('FINANCE_OFFICER'), async (req, res) => {
  try {
    const { payment_status } = req.body; // 'APPROVED', 'REJECTED', or 'PAID'
    
    if (!['APPROVED', 'REJECTED', 'PAID'].includes(payment_status)) {
      return res.status(400).json({ message: 'Invalid payment status' });
    }
    
    const updateData = { approved_by: req.user.id };
    if (payment_status === 'PAID') {
      updateData.paid_by = req.user.id;
    }
    
    const [expRows] = await db.execute('SELECT created_by FROM expenses WHERE id = ?', [req.params.id]);
    await db.execute(
      `UPDATE expenses SET payment_status = ?, approved_by = ?, ${payment_status === 'PAID' ? 'paid_by = ?, ' : ''} updated_at = NOW() WHERE id = ?`,
      payment_status === 'PAID' 
        ? [payment_status, req.user.id, req.user.id, req.params.id]
        : [payment_status, req.user.id, req.params.id]
    );
    try {
      const creatorId = expRows && expRows[0] && expRows[0].created_by;
      if (creatorId) {
        const msg = payment_status === 'PAID' ? 'Your expense has been marked as paid' 
          : payment_status === 'APPROVED' ? 'Your expense has been approved' 
          : 'Your expense has been rejected';
        await createNotification(creatorId, msg);
      }
    } catch (nErr) { console.error('Notification error:', nErr); }
    res.json({ message: `Expense ${payment_status.toLowerCase()} successfully` });
  } catch (error) {
    console.error('Approve expense error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

