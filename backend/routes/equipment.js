const express = require('express');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Get equipment usage/status
router.get('/', authenticate, async (req, res) => {
  try {
    // Check if equipment table exists
    try {
      await db.execute('SELECT 1 FROM equipment LIMIT 1');
    } catch (tableError) {
      // Return placeholder data structure
      return res.json([]);
    }

    let query = `
      SELECT e.*, 
        s.name as site_name,
        p.name as project_name
      FROM equipment e
      LEFT JOIN sites s ON e.site_id = s.id
      LEFT JOIN projects p ON s.project_id = p.id
    `;
    
    if (req.user.role === 'SITE_SUPERVISOR') {
      query += ' WHERE e.site_id IN (SELECT id FROM sites WHERE supervisor_id = ?)';
    }
    
    query += ' ORDER BY e.name';
    
    const [equipment] = req.user.role === 'SITE_SUPERVISOR'
      ? await db.execute(query, [req.user.id])
      : await db.execute(query);
    
    res.json(equipment);
  } catch (error) {
    console.error('Get equipment error:', error);
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
