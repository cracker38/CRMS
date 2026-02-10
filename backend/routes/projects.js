const express = require('express');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all projects
router.get('/', authenticate, async (req, res) => {
  try {
    let query = `
      SELECT p.*, 
        u.first_name as pm_first_name, 
        u.last_name as pm_last_name,
        (SELECT COUNT(*) FROM sites WHERE project_id = p.id) as site_count
      FROM projects p
      LEFT JOIN users u ON p.project_manager_id = u.id
    `;
    
    if (req.user.role === 'PROJECT_MANAGER') {
      query += ' WHERE p.project_manager_id = ?';
    }
    
    query += ' ORDER BY p.created_at DESC';
    
    const [projects] = req.user.role === 'PROJECT_MANAGER'
      ? await db.execute(query, [req.user.id])
      : await db.execute(query);
    
    res.json(projects);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get project by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const [projects] = await db.execute(`
      SELECT p.*, 
        u.first_name as pm_first_name, 
        u.last_name as pm_last_name
      FROM projects p
      LEFT JOIN users u ON p.project_manager_id = u.id
      WHERE p.id = ?
    `, [req.params.id]);
    
    if (projects.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    const project = projects[0];
    
    // Get sites
    const [sites] = await db.execute(
      'SELECT * FROM sites WHERE project_id = ?',
      [req.params.id]
    );
    
    project.sites = sites;
    
    res.json(project);
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create project (Project Manager and System Admin)
router.post('/', authenticate, authorize('PROJECT_MANAGER', 'SYSTEM_ADMIN'), async (req, res) => {
  try {
    const { name, description, start_date, end_date, budget, project_manager_id } = req.body;
    
    const managerId = req.user.role === 'SYSTEM_ADMIN' ? project_manager_id : req.user.id;
    
    const [result] = await db.execute(
      'INSERT INTO projects (name, description, start_date, end_date, budget, project_manager_id) VALUES (?, ?, ?, ?, ?, ?)',
      [name, description, start_date, end_date, budget, managerId]
    );
    
    // Log audit
    await db.execute(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'CREATE_PROJECT', 'projects', result.insertId, JSON.stringify(req.body)]
    );
    
    res.status(201).json({ message: 'Project created successfully', projectId: result.insertId });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update project
router.put('/:id', authenticate, authorize('PROJECT_MANAGER', 'SYSTEM_ADMIN'), async (req, res) => {
  try {
    const { name, description, start_date, end_date, budget, status } = req.body;
    
    // Check if user has permission
    if (req.user.role === 'PROJECT_MANAGER') {
      const [projects] = await db.execute('SELECT project_manager_id FROM projects WHERE id = ?', [req.params.id]);
      if (projects.length === 0) {
        return res.status(404).json({ message: 'Project not found' });
      }
      if (projects[0].project_manager_id !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }
    
    await db.execute(
      'UPDATE projects SET name = ?, description = ?, start_date = ?, end_date = ?, budget = ?, status = ? WHERE id = ?',
      [name, description, start_date, end_date, budget, status, req.params.id]
    );
    
    // Log audit
    await db.execute(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'UPDATE_PROJECT', 'projects', req.params.id, JSON.stringify(req.body)]
    );
    
    res.json({ message: 'Project updated successfully' });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

