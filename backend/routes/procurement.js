const express = require('express');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { notifyRole } = require('../utils/notifications');

const router = express.Router();

// Get all purchase orders
router.get('/purchase-orders', authenticate, async (req, res) => {
  try {
    let query = `
      SELECT po.*, 
        s.name as supplier_name,
        u.first_name as creator_first_name,
        u.last_name as creator_last_name
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      LEFT JOIN users u ON po.created_by = u.id
    `;
    
    if (req.user.role === 'PROCUREMENT_OFFICER') {
      query += ' WHERE po.created_by = ?';
    }
    
    query += ' ORDER BY po.created_at DESC';
    
    const [pos] = req.user.role === 'PROCUREMENT_OFFICER'
      ? await db.execute(query, [req.user.id])
      : await db.execute(query);
    
    res.json(pos);
  } catch (error) {
    console.error('Get purchase orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create purchase order
router.post('/purchase-orders', authenticate, authorize('PROCUREMENT_OFFICER'), async (req, res) => {
  try {
    const { supplier_id, order_date, expected_delivery_date, items, notes } = req.body;
    
    const connection = await db.getConnection();
    await connection.beginTransaction();
    
    try {
      // Generate PO number
      const poNumber = `PO-${Date.now()}`;
      
      // Calculate total
      const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      
      // Create PO (finance status starts as PENDING)
      const [result] = await connection.execute(
        'INSERT INTO purchase_orders (po_number, supplier_id, created_by, order_date, expected_delivery_date, total_amount, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [poNumber, supplier_id, req.user.id, order_date, expected_delivery_date, totalAmount, 'PENDING', notes]
      );
      
      const poId = result.insertId;
      
      // Insert PO items
      for (const item of items) {
        await connection.execute(
          'INSERT INTO purchase_order_items (po_id, material_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)',
          [poId, item.material_id, item.quantity, item.unit_price, item.quantity * item.unit_price]
        );
      }
      
      await connection.commit();
      try {
        await notifyRole('PROJECT_MANAGER', `New purchase order ${poNumber} created ($${totalAmount.toFixed(2)})`);
        await notifyRole('FINANCE_OFFICER', `New purchase order ${poNumber} created ($${totalAmount.toFixed(2)}) - payment tracking`);
      } catch (nErr) { console.error('Notification error:', nErr); }
      res.status(201).json({ message: 'Purchase order created successfully', poId });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Create purchase order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get suppliers
router.get('/suppliers', authenticate, async (req, res) => {
  try {
    // Check table structure to use correct column names
    const [columns] = await db.execute('DESCRIBE suppliers');
    const columnNames = columns.map(col => col.Field);
    
    // Build SELECT with proper column mapping
    let selectQuery = 'SELECT id, name';
    if (columnNames.includes('email')) {
      selectQuery += ', email as contact_email';
    } else if (columnNames.includes('contact_email')) {
      selectQuery += ', contact_email';
    }
    if (columnNames.includes('phone')) {
      selectQuery += ', phone as contact_phone';
    } else if (columnNames.includes('contact_phone')) {
      selectQuery += ', contact_phone';
    }
    selectQuery += ', address, status, created_at FROM suppliers ORDER BY name';
    
    const [suppliers] = await db.execute(selectQuery);
    res.json(suppliers || []);
  } catch (error) {
    // If table doesn't exist, return empty array
    if (error.code === 'ER_NO_SUCH_TABLE' || error.message.includes('doesn\'t exist')) {
      console.log('Suppliers table does not exist yet');
      return res.json([]);
    }
    console.error('Get suppliers error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create supplier (Procurement Officer and System Admin)
router.post('/suppliers', authenticate, authorize('PROCUREMENT_OFFICER', 'SYSTEM_ADMIN'), async (req, res) => {
  try {
    const { name, contact_email, contact_phone, address, status = 'ACTIVE' } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Supplier name is required' });
    }
    
    // Check if suppliers table exists, create if not
    let tableExists = false;
    try {
      await db.execute('SELECT 1 FROM suppliers LIMIT 1');
      tableExists = true;
    } catch (tableError) {
      // Table doesn't exist, create it
      tableExists = false;
    }
    
    if (!tableExists) {
      try {
        await db.execute(`
          CREATE TABLE IF NOT EXISTS suppliers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            contact_email VARCHAR(255),
            contact_phone VARCHAR(50),
            address TEXT,
            status VARCHAR(50) DEFAULT 'ACTIVE',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `);
        console.log('Suppliers table created successfully');
      } catch (createError) {
        console.error('Error creating suppliers table:', createError);
        return res.status(500).json({ 
          message: 'Failed to create suppliers table', 
          error: createError.message,
          code: createError.code
        });
      }
    }
    
    // Insert supplier
    try {
      // Check table structure to use correct column names
      const [columns] = await db.execute('DESCRIBE suppliers');
      const columnNames = columns.map(col => col.Field);
      
      // Map to correct column names based on existing table structure
      const emailColumn = columnNames.includes('email') ? 'email' : 'contact_email';
      const phoneColumn = columnNames.includes('phone') ? 'phone' : 'contact_phone';
      
      const [result] = await db.execute(
        `INSERT INTO suppliers (name, ${emailColumn}, ${phoneColumn}, address, status) VALUES (?, ?, ?, ?, ?)`,
        [name.trim(), contact_email?.trim() || null, contact_phone?.trim() || null, address?.trim() || null, status]
      );
      
      // Log audit if audit_logs table exists
      try {
        await db.execute(
          'INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values) VALUES (?, ?, ?, ?, ?)',
          [req.user.id, 'CREATE_SUPPLIER', 'suppliers', result.insertId, JSON.stringify(req.body)]
        );
      } catch (auditError) {
        // Audit logging failed, but continue
        console.log('Audit logging failed (non-critical):', auditError.message);
      }
      
      res.status(201).json({ message: 'Supplier created successfully', supplierId: result.insertId });
    } catch (insertError) {
      console.error('Error inserting supplier:', insertError);
      console.error('Error details:', {
        code: insertError.code,
        errno: insertError.errno,
        sqlState: insertError.sqlState,
        sqlMessage: insertError.sqlMessage,
        sql: insertError.sql
      });
      return res.status(500).json({ 
        message: 'Failed to insert supplier', 
        error: insertError.message || insertError.sqlMessage || 'Unknown database error',
        code: insertError.code,
        errno: insertError.errno,
        sqlState: insertError.sqlState
      });
    }
  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message || 'Unknown error occurred',
      code: error.code
    });
  }
});

// Get quotations
router.get('/quotations', authenticate, async (req, res) => {
  try {
    let query = `
      SELECT q.*,
        s.name as supplier_name,
        m.name as material_name
      FROM quotations q
      LEFT JOIN suppliers s ON q.supplier_id = s.id
      LEFT JOIN materials m ON q.material_id = m.id
    `;
    
    if (req.user.role === 'PROCUREMENT_OFFICER') {
      query += ' WHERE q.created_by = ?';
    }
    
    query += ' ORDER BY q.created_at DESC';
    
    try {
      const [quotations] = req.user.role === 'PROCUREMENT_OFFICER'
        ? await db.execute(query, [req.user.id])
        : await db.execute(query);
      res.json(quotations);
    } catch (tableError) {
      // Table doesn't exist, return empty array
      res.json([]);
    }
  } catch (error) {
    console.error('Get quotations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create quotation
router.post('/quotations', authenticate, authorize('PROCUREMENT_OFFICER'), async (req, res) => {
  try {
    const { supplier_id, material_id, quotation_date, quantity, unit_price, validity_period, notes } = req.body;
    
    // Check if quotations table exists, create if not
    try {
      await db.execute('SELECT 1 FROM quotations LIMIT 1');
    } catch (tableError) {
      // Create quotations table
      await db.execute(`
        CREATE TABLE IF NOT EXISTS quotations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          supplier_id INT,
          material_id INT,
          quotation_date DATE,
          quantity DECIMAL(10,2),
          unit_price DECIMAL(10,2),
          total DECIMAL(10,2),
          validity_period INT,
          status VARCHAR(50) DEFAULT 'PENDING',
          notes TEXT,
          created_by INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
          FOREIGN KEY (material_id) REFERENCES materials(id),
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `);
    }
    
    const total = quantity * unit_price;
    
    const [result] = await db.execute(
      'INSERT INTO quotations (supplier_id, material_id, quotation_date, quantity, unit_price, total, validity_period, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [supplier_id, material_id, quotation_date, quantity, unit_price, total, validity_period, notes, req.user.id]
    );
    
    res.status(201).json({ message: 'Quotation recorded successfully', quotationId: result.insertId });
  } catch (error) {
    console.error('Create quotation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve quotation (Project Manager)
router.put('/quotations/:id/approve', authenticate, authorize('PROJECT_MANAGER'), async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM quotations WHERE id = ?', [req.params.id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'Quotation not found' });
    }
    const currentStatus = (rows[0].status || 'PENDING').toString().toUpperCase();
    if (currentStatus !== 'PENDING') {
      return res.status(400).json({ message: `Quotation is already ${currentStatus}` });
    }

    const [cols] = await db.execute('DESCRIBE quotations');
    const hasApprovedBy = cols.some(c => c.Field === 'approved_by');
    const hasApprovedAt = cols.some(c => c.Field === 'approved_at');
    const hasUpdatedAt = cols.some(c => c.Field === 'updated_at');

    let query = 'UPDATE quotations SET status = ?';
    const params = ['ACCEPTED'];

    if (hasApprovedBy) {
      query += ', approved_by = ?';
      params.push(req.user.id);
    }
    if (hasApprovedAt) {
      query += ', approved_at = NOW()';
    }
    if (hasUpdatedAt) {
      query += ', updated_at = NOW()';
    }

    query += ' WHERE id = ?';
    params.push(req.params.id);

    await db.execute(query, params);

    try {
      const [q] = await db.execute('SELECT created_by FROM quotations WHERE id = ?', [req.params.id]);
      if (q && q[0] && q[0].created_by) {
        const { createNotification } = require('../utils/notifications');
        await createNotification(q[0].created_by, 'Your quotation has been approved');
      }
    } catch (nErr) { console.error('Notification error:', nErr); }

    res.json({ message: 'Quotation approved successfully' });
  } catch (error) {
    console.error('Approve quotation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reject quotation (Project Manager)
router.put('/quotations/:id/reject', authenticate, authorize('PROJECT_MANAGER'), async (req, res) => {
  try {
    const { rejection_reason } = req.body || {};
    const [rows] = await db.execute('SELECT * FROM quotations WHERE id = ?', [req.params.id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'Quotation not found' });
    }
    const currentStatus = (rows[0].status || 'PENDING').toString().toUpperCase();
    if (currentStatus !== 'PENDING') {
      return res.status(400).json({ message: `Quotation is already ${currentStatus}` });
    }

    const [cols] = await db.execute('DESCRIBE quotations');
    const hasApprovedBy = cols.some(c => c.Field === 'approved_by');
    const hasApprovedAt = cols.some(c => c.Field === 'approved_at');
    const hasRejectionReason = cols.some(c => c.Field === 'rejection_reason');
    const hasUpdatedAt = cols.some(c => c.Field === 'updated_at');

    let query = 'UPDATE quotations SET status = ?';
    const params = ['REJECTED'];

    if (hasApprovedBy) {
      query += ', approved_by = ?';
      params.push(req.user.id);
    }
    if (hasApprovedAt) {
      query += ', approved_at = NOW()';
    }
    if (hasRejectionReason && rejection_reason) {
      query += ', rejection_reason = ?';
      params.push(rejection_reason);
    }
    if (hasUpdatedAt) {
      query += ', updated_at = NOW()';
    }

    query += ' WHERE id = ?';
    params.push(req.params.id);

    await db.execute(query, params);

    try {
      const [q] = await db.execute('SELECT created_by FROM quotations WHERE id = ?', [req.params.id]);
      if (q && q[0] && q[0].created_by) {
        const { createNotification } = require('../utils/notifications');
        await createNotification(q[0].created_by, 'Your quotation has been rejected' + (rejection_reason ? `: ${rejection_reason}` : ''));
      }
    } catch (nErr) { console.error('Notification error:', nErr); }

    res.json({ message: 'Quotation rejected successfully' });
  } catch (error) {
    console.error('Reject quotation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Finance approval / draft / rejection of purchase orders
router.put('/purchase-orders/:id/finance-status', authenticate, authorize('FINANCE_OFFICER'), async (req, res) => {
  try {
    const { action, notes } = req.body; // action: 'APPROVE' | 'REJECT' | 'DRAFT'
    const allowedActions = ['APPROVE', 'REJECT', 'DRAFT'];
    const upperAction = (action || '').toString().toUpperCase();

    if (!allowedActions.includes(upperAction)) {
      return res.status(400).json({ message: 'Invalid action. Use APPROVE, REJECT or DRAFT.' });
    }

    const [rows] = await db.execute('SELECT * FROM purchase_orders WHERE id = ?', [req.params.id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }
    const po = rows[0];

    // Prevent double-approval of already delivered/cancelled orders
    const currentStatus = (po.status || 'PENDING').toString().toUpperCase();
    if (['DELIVERED', 'CANCELLED'].includes(currentStatus)) {
      return res.status(400).json({ message: `Cannot change finance status for a ${currentStatus} order.` });
    }

    // Compute global available budget in finance
    const [[projectsAgg]] = await db.execute('SELECT COALESCE(SUM(budget), 0) AS total_budget FROM projects');
    const totalBudget = parseFloat(projectsAgg.total_budget || 0);

    // Total already spent (approved or paid expenses)
    const [[expensesAgg]] = await db.execute(`
      SELECT COALESCE(SUM(amount), 0) AS total_spent
      FROM expenses
      WHERE payment_status IN ('APPROVED', 'PAID')
    `);
    const totalSpent = parseFloat(expensesAgg.total_spent || 0);

    // Committed on other purchase orders (APPROVED / DELIVERED / DRAFT)
    const [poRows] = await db.execute(
      'SELECT id, status, total_amount FROM purchase_orders WHERE status IN (\'APPROVED\', \'DELIVERED\', \'DRAFT\')'
    );

    let committedFromPOs = 0;
    for (const r of poRows) {
      let amt = parseFloat(r.total_amount || 0);
      const st = (r.status || '').toString().toUpperCase();

      // Draft only reserves half of the amount
      if (st === 'DRAFT') {
        amt = amt / 2;
      }

      // Exclude current PO for now; we add it separately based on the *new* status
      if (r.id !== po.id) {
        committedFromPOs += amt;
      }
    }

    const available = totalBudget - totalSpent - committedFromPOs;
    const poTotal = parseFloat(po.total_amount || 0);

    if (upperAction === 'APPROVE' && poTotal > available) {
      return res.status(400).json({
        message: 'Insufficient available budget to approve this purchase order',
        available,
        required: poTotal
      });
    }

    // Map actions to resulting status
    let newStatus;
    if (upperAction === 'APPROVE') newStatus = 'APPROVED';
    else if (upperAction === 'REJECT') newStatus = 'REJECTED';
    else newStatus = 'DRAFT';

    await db.execute(
      `
        UPDATE purchase_orders
        SET status = ?, notes = CONCAT(COALESCE(notes, ''), ?), updated_at = NOW()
        WHERE id = ?
      `,
      [
        newStatus,
        notes ? ` [FINANCE ${upperAction} BY USER ${req.user.id}: ${notes}]` : '',
        req.params.id
      ]
    );

    try {
      await notifyRole(
        'PROCUREMENT_OFFICER',
        `Purchase order ${po.po_number} has been marked as ${newStatus} by Finance`
      );
    } catch (nErr) {
      console.error('Notification error (finance-status):', nErr);
    }

    res.json({
      message: `Purchase order finance status set to ${newStatus}`,
      status: newStatus,
      availableBudget: available
    });
  } catch (error) {
    console.error('Finance status update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update delivery status (only allowed after finance approval)
router.put('/purchase-orders/:id/delivery', authenticate, authorize('PROCUREMENT_OFFICER'), async (req, res) => {
  try {
    const { delivery_date, status, notes } = req.body;

    const [rows] = await db.execute('SELECT * FROM purchase_orders WHERE id = ?', [req.params.id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }
    const po = rows[0];

    const currentStatus = (po.status || 'PENDING').toString().toUpperCase();
    if (currentStatus !== 'APPROVED') {
      return res.status(400).json({
        message: 'Delivery can only be updated after Finance has approved the purchase order'
      });
    }

    // Make this robust to schema differences (some DBs may not have delivery_date)
    const [columns] = await db.execute('DESCRIBE purchase_orders');
    const columnNames = columns.map(col => col.Field);

    let query;
    const params = [];

    const finalStatus = status || 'DELIVERED';

    if (columnNames.includes('delivery_date')) {
      query = `
        UPDATE purchase_orders
        SET delivery_date = ?, status = ?, notes = CONCAT(COALESCE(notes, ""), " ", ?), updated_at = NOW()
        WHERE id = ?
      `;
      params.push(delivery_date, finalStatus, notes || '', req.params.id);
    } else if (columnNames.includes('expected_delivery_date')) {
      query = `
        UPDATE purchase_orders
        SET expected_delivery_date = ?, status = ?, notes = CONCAT(COALESCE(notes, ""), " ", ?), updated_at = NOW()
        WHERE id = ?
      `;
      params.push(delivery_date, finalStatus, notes || '', req.params.id);
    } else {
      query = `
        UPDATE purchase_orders
        SET status = ?, notes = CONCAT(COALESCE(notes, ""), " ", ?), updated_at = NOW()
        WHERE id = ?
      `;
      params.push(finalStatus, notes || '', req.params.id);
    }

    await db.execute(query, params);

    try {
      const [updatedPoRows] = await db.execute(
        'SELECT po_number, status, total_amount, created_by FROM purchase_orders WHERE id = ?',
        [req.params.id]
      );
      const updatedPo = updatedPoRows && updatedPoRows[0];

      if (updatedPo && (updatedPo.status === 'DELIVERED' || finalStatus === 'DELIVERED')) {
        await notifyRole('PROJECT_MANAGER', `Purchase order ${updatedPo.po_number} has been delivered`);

        // When the order is delivered, record the full remaining price as a paid expense
        try {
          const [cols] = await db.execute('DESCRIBE expenses');
          const hasPaidBy = cols.some(c => c.Field === 'paid_by');
          await db.execute(
            hasPaidBy
              ? `INSERT INTO expenses (project_id, category, description, amount, expense_date, payment_status, created_by, paid_by)
                 VALUES (NULL, 'SUPPLIES', ?, ?, CURDATE(), 'PAID', ?, ?)`
              : `INSERT INTO expenses (project_id, category, description, amount, expense_date, payment_status, created_by)
                 VALUES (NULL, 'SUPPLIES', ?, ?, CURDATE(), 'PAID', ?)`,
            hasPaidBy
              ? [`PO ${updatedPo.po_number} delivered`, parseFloat(updatedPo.total_amount || 0), updatedPo.created_by, req.user.id]
              : [`PO ${updatedPo.po_number} delivered`, parseFloat(updatedPo.total_amount || 0), updatedPo.created_by]
          );
        } catch (expenseErr) {
          console.error('Failed to create delivery expense for PO:', expenseErr);
        }
      }
    } catch (nErr) {
      console.error('Notification error (delivery):', nErr);
    }

    res.json({ message: 'Delivery updated successfully' });
  } catch (error) {
    console.error('Update delivery error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
