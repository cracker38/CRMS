const express = require('express');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

function trimUnit(unit) {
  const t = (unit || '').toString().trim();
  return t || null;
}

function toNonNegativeNumber(value, fallback = 0) {
  const n = parseFloat(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

// Get all materials
router.get('/', authenticate, async (req, res) => {
  try {
    try {
      await db.execute('SELECT 1 FROM materials LIMIT 1');
    } catch (tableError) {
      return res.json([]);
    }

    let materials;
    try {
      [materials] = await db.execute(
        `
        SELECT
          m.*,
          COALESCE(pr.reserved_pending, 0) AS reserved_pending,
          (m.current_stock - COALESCE(pr.reserved_pending, 0)) AS available_stock_after_pending
        FROM materials m
        LEFT JOIN (
          SELECT material_id, COALESCE(SUM(quantity), 0) AS reserved_pending
          FROM material_requests
          WHERE status = 'PENDING'
          GROUP BY material_id
        ) pr ON pr.material_id = m.id
        WHERE m.status = 'ACTIVE'
        ORDER BY m.name
        `
      );
    } catch (statusError) {
      [materials] = await db.execute(
        `
        SELECT
          m.*,
          COALESCE(pr.reserved_pending, 0) AS reserved_pending,
          (m.current_stock - COALESCE(pr.reserved_pending, 0)) AS available_stock_after_pending
        FROM materials m
        LEFT JOIN (
          SELECT material_id, COALESCE(SUM(quantity), 0) AS reserved_pending
          FROM material_requests
          WHERE status = 'PENDING'
          GROUP BY material_id
        ) pr ON pr.material_id = m.id
        ORDER BY m.name
        `
      );
    }
    res.json(materials);
  } catch (error) {
    console.error('Get materials error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', authenticate, authorize('SYSTEM_ADMIN', 'PROCUREMENT_OFFICER'), async (req, res) => {
  try {
    const { name, description, unit, category, current_stock, min_stock_level, unit_price } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Material name is required' });
    }

    const [result] = await db.execute(
      'INSERT INTO materials (name, description, unit, category, current_stock, min_stock_level, unit_price) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        (name || '').toString().trim(),
        description || null,
        trimUnit(unit),
        category ? category.toString().trim() : null,
        toNonNegativeNumber(current_stock, 0),
        toNonNegativeNumber(min_stock_level, 0),
        unit_price === null || unit_price === undefined || unit_price === '' ? null : toNonNegativeNumber(unit_price, 0)
      ]
    );

    try {
      await db.execute(
        'INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'CREATE_MATERIAL', 'materials', result.insertId, JSON.stringify(req.body)]
      );
    } catch (auditError) {
      console.error('Audit log error:', auditError);
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

router.put('/:id', authenticate, authorize('SYSTEM_ADMIN', 'PROCUREMENT_OFFICER'), async (req, res) => {
  try {
    const { name, description, unit, category, current_stock, min_stock_level, unit_price } = req.body;

    const [rows] = await db.execute('SELECT * FROM materials WHERE id = ?', [req.params.id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'Material not found' });
    }

    const existing = rows[0];
    const newValues = {
      name: name !== undefined ? name : existing.name,
      description: description !== undefined ? description : existing.description,
      unit: unit !== undefined ? unit : existing.unit,
      category: category !== undefined ? category : existing.category,
      current_stock: current_stock !== undefined ? current_stock : existing.current_stock,
      min_stock_level: min_stock_level !== undefined ? min_stock_level : existing.min_stock_level,
      unit_price: unit_price !== undefined ? unit_price : existing.unit_price
    };

    await db.execute(
      'UPDATE materials SET name = ?, description = ?, unit = ?, category = ?, current_stock = ?, min_stock_level = ?, unit_price = ? WHERE id = ?',
      [
        (newValues.name || '').toString().trim(),
        newValues.description || null,
        trimUnit(newValues.unit),
        newValues.category ? newValues.category.toString().trim() : null,
        toNonNegativeNumber(newValues.current_stock, 0),
        toNonNegativeNumber(newValues.min_stock_level, 0),
        newValues.unit_price === null || newValues.unit_price === undefined || newValues.unit_price === '' ? null : toNonNegativeNumber(newValues.unit_price, 0),
        req.params.id
      ]
    );

    try {
      await db.execute(
        'INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values) VALUES (?, ?, ?, ?, ?, ?)',
        [
          req.user.id,
          'UPDATE_MATERIAL',
          'materials',
          req.params.id,
          JSON.stringify(existing),
          JSON.stringify(newValues)
        ]
      );
    } catch (auditError) {
      console.error('Audit log error (update material):', auditError);
    }

    res.json({ message: 'Material updated successfully' });
  } catch (error) {
    console.error('Update material error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', authenticate, authorize('SYSTEM_ADMIN', 'PROCUREMENT_OFFICER'), async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM materials WHERE id = ?', [req.params.id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'Material not found' });
    }

    try {
      const [[mrRef]] = await db.execute('SELECT COUNT(*) AS c FROM material_requests WHERE material_id = ?', [req.params.id]);
      const [[poiRef]] = await db.execute('SELECT COUNT(*) AS c FROM purchase_order_items WHERE material_id = ?', [req.params.id]);
      const [[qRef]] = await db.execute('SELECT COUNT(*) AS c FROM quotations WHERE material_id = ?', [req.params.id]);
      const [[itRef]] = await db.execute('SELECT COUNT(*) AS c FROM inventory_transactions WHERE material_id = ?', [req.params.id]);
      const totalRefs = (mrRef?.c || 0) + (poiRef?.c || 0) + (qRef?.c || 0) + (itRef?.c || 0);
      if (totalRefs > 0) {
        return res.status(400).json({
          message: 'Cannot delete material because it is already used in requests/POs/quotations/inventory transactions'
        });
      }
    } catch (refErr) {
      // ignore
    }

    await db.execute('DELETE FROM materials WHERE id = ?', [req.params.id]);

    try {
      await db.execute(
        'INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'DELETE_MATERIAL', 'materials', req.params.id, JSON.stringify(rows[0])]
      );
    } catch (auditError) {
      console.error('Audit log error (delete material):', auditError);
    }

    res.json({ message: 'Material deleted successfully' });
  } catch (error) {
    console.error('Delete material error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
