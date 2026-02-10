const express = require('express');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

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

// Create expense
router.post('/', authenticate, async (req, res) => {
  try {
    const { project_id, category, description, amount, expense_date, invoice_number } = req.body;
    
    const [result] = await db.execute(
      'INSERT INTO expenses (project_id, category, description, amount, expense_date, invoice_number, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [project_id, category, description, amount, expense_date, invoice_number, req.user.id]
    );
    
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
    
    await db.execute(
      `UPDATE expenses SET payment_status = ?, approved_by = ?, ${payment_status === 'PAID' ? 'paid_by = ?, ' : ''} updated_at = NOW() WHERE id = ?`,
      payment_status === 'PAID' 
        ? [payment_status, req.user.id, req.user.id, req.params.id]
        : [payment_status, req.user.id, req.params.id]
    );
    
    res.json({ message: `Expense ${payment_status.toLowerCase()} successfully` });
  } catch (error) {
    console.error('Approve expense error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

