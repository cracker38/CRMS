const express = require('express');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all materials
router.get('/', authenticate, async (req, res) => {
  try {
    // Check if materials table exists
    try {
      await db.execute('SELECT 1 FROM materials LIMIT 1');
    } catch (tableError) {
      // Return empty array if table doesn't exist
      return res.json([]);
    }

    // Check if status column exists, if not, select all materials
    let materials;
    try {
      [materials] = await db.execute(
        'SELECT * FROM materials WHERE status = "ACTIVE" ORDER BY name'
      );
    } catch (statusError) {
      // If status column doesn't exist, select all materials
      [materials] = await db.execute(
        'SELECT * FROM materials ORDER BY name'
      );
    }
    res.json(materials);
  } catch (error) {
    console.error('Get materials error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create material (System Admin and Procurement Officer only)
router.post('/', authenticate, authorize('SYSTEM_ADMIN', 'PROCUREMENT_OFFICER'), async (req, res) => {
  try {
    const { name, description, unit, category, current_stock, min_stock_level, unit_price } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ message: 'Material name is required' });
    }

    // Insert material
    const [result] = await db.execute(
      'INSERT INTO materials (name, description, unit, category, current_stock, min_stock_level, unit_price) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        name,
        description || null,
        unit || null,
        category || null,
        current_stock || 0,
        min_stock_level || 0,
        unit_price || null
      ]
    );

    // Log audit
    try {
      await db.execute(
        'INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'CREATE_MATERIAL', 'materials', result.insertId, JSON.stringify(req.body)]
      );
    } catch (auditError) {
      console.error('Audit log error:', auditError);
      // Don't fail the request if audit logging fails
    }

    res.status(201).json({ 
      message: 'Material created successfully', 
      materialId: result.insertId 
    });
  } catch (error) {
    console.error('Create material error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;




