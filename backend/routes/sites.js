const express = require('express');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Get sites
router.get('/', authenticate, async (req, res) => {
  try {
    let query = `
      SELECT s.*,
        p.name AS project_name,
        u.first_name AS supervisor_first_name,
        u.last_name AS supervisor_last_name
      FROM sites s
      LEFT JOIN projects p ON s.project_id = p.id
      LEFT JOIN users u ON s.supervisor_id = u.id
    `;

    const params = [];

    if (req.user.role === 'PROJECT_MANAGER') {
      // Only sites that belong to projects managed by this PM
      query += ' WHERE p.project_manager_id = ?';
      params.push(req.user.id);
    } else if (req.user.role === 'SITE_SUPERVISOR') {
      // Sites assigned to this supervisor
      query += ' WHERE s.supervisor_id = ?';
      params.push(req.user.id);
    }

    query += ' ORDER BY p.name, s.name';

    const [sites] = await db.execute(query, params);
    res.json(sites);
  } catch (error) {
    console.error('Get sites error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create site (Project Manager and System Admin)
router.post('/', authenticate, authorize('PROJECT_MANAGER', 'SYSTEM_ADMIN'), async (req, res) => {
  try {
    const { project_id, name, location, supervisor_id, status } = req.body;

    if (!project_id || !name) {
      return res.status(400).json({ message: 'Project and site name are required' });
    }

    // Verify project exists and belongs to this project manager (if PM)
    const [projects] = await db.execute(
      'SELECT id, project_manager_id FROM projects WHERE id = ?',
      [project_id]
    );

    if (projects.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const project = projects[0];

    if (req.user.role === 'PROJECT_MANAGER' && project.project_manager_id !== req.user.id) {
      return res.status(403).json({ message: 'You can only create sites for your own projects' });
    }

    const [result] = await db.execute(
      'INSERT INTO sites (project_id, name, location, supervisor_id, status) VALUES (?, ?, ?, ?, ?)',
      [
        project_id,
        name,
        location || null,
        supervisor_id || null,
        status || 'ACTIVE'
      ]
    );

    // Log audit
    await db.execute(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values) VALUES (?, ?, ?, ?, ?)',
      [
        req.user.id,
        'CREATE_SITE',
        'sites',
        result.insertId,
        JSON.stringify({ project_id, name, location, supervisor_id, status: status || 'ACTIVE' })
      ]
    );

    res.status(201).json({
      message: 'Site created successfully',
      siteId: result.insertId
    });
  } catch (error) {
    console.error('Create site error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

