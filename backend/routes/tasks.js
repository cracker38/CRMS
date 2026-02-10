const express = require('express');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all tasks
router.get('/', authenticate, async (req, res) => {
  try {
    // Check if tasks table exists
    try {
      await db.execute('SELECT 1 FROM tasks LIMIT 1');
    } catch (tableError) {
      // Table doesn't exist, return empty array
      console.log('Tasks table does not exist yet');
      return res.json([]);
    }

    let query = `
      SELECT t.*,
        p.name as project_name,
        u1.first_name as assigned_by_first_name,
        u1.last_name as assigned_by_last_name,
        u2.first_name as assigned_to_first_name,
        u2.last_name as assigned_to_last_name,
        CONCAT(u2.first_name, ' ', u2.last_name) as assigned_to_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u1 ON t.assigned_by = u1.id
      LEFT JOIN users u2 ON t.assigned_to = u2.id
    `;
    
    if (req.user.role === 'PROJECT_MANAGER') {
      query += ' WHERE p.project_manager_id = ?';
    } else if (req.user.role === 'SITE_SUPERVISOR') {
      query += ' WHERE t.assigned_to = ?';
    }
    
    query += ' ORDER BY t.created_at DESC';
    
    const [tasks] = req.user.role === 'PROJECT_MANAGER'
      ? await db.execute(query, [req.user.id])
      : req.user.role === 'SITE_SUPERVISOR'
      ? await db.execute(query, [req.user.id])
      : await db.execute(query);
    
    res.json(tasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    // Return empty array instead of error if table doesn't exist
    if (error.code === 'ER_NO_SUCH_TABLE' || error.message?.includes('doesn\'t exist')) {
      return res.json([]);
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Create task (Project Manager)
router.post('/', authenticate, authorize('PROJECT_MANAGER'), async (req, res) => {
  try {
    // Check if tasks table exists, if not create it
    try {
      await db.execute('SELECT 1 FROM tasks LIMIT 1');
    } catch (tableError) {
      // Create tasks table if it doesn't exist
      await db.execute(`
        CREATE TABLE IF NOT EXISTS tasks (
          id INT AUTO_INCREMENT PRIMARY KEY,
          project_id INT NOT NULL,
          assigned_by INT NOT NULL,
          assigned_to INT NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          due_date DATE,
          priority ENUM('LOW', 'MEDIUM', 'HIGH') DEFAULT 'MEDIUM',
          status ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') DEFAULT 'PENDING',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
          FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
    }

    const { project_id, assigned_to, title, description, due_date, priority } = req.body;
    
    // Verify project belongs to this PM
    const [projects] = await db.execute(
      'SELECT project_manager_id FROM projects WHERE id = ?',
      [project_id]
    );
    
    if (projects.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    if (projects[0].project_manager_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Verify assigned_to is a Site Supervisor
    const [users] = await db.execute(
      'SELECT role FROM users WHERE id = ? AND status = "ACTIVE"',
      [assigned_to]
    );
    
    if (users.length === 0 || users[0].role !== 'SITE_SUPERVISOR') {
      return res.status(400).json({ message: 'Invalid supervisor selected' });
    }
    
    const [result] = await db.execute(
      'INSERT INTO tasks (project_id, assigned_by, assigned_to, title, description, due_date, priority, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [project_id, req.user.id, assigned_to, title, description, due_date, priority || 'MEDIUM', 'PENDING']
    );
    
    // Log audit (if audit_logs table exists)
    try {
      await db.execute(
        'INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'CREATE_TASK', 'tasks', result.insertId, JSON.stringify(req.body)]
      );
    } catch (auditError) {
      // Ignore audit log errors
      console.log('Audit log error (non-critical):', auditError.message);
    }
    
    res.status(201).json({ message: 'Task assigned successfully', taskId: result.insertId });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get site supervisors for a project
router.get('/site-supervisors/:projectId', authenticate, authorize('PROJECT_MANAGER'), async (req, res) => {
  try {
    // Verify project belongs to this PM
    const [projects] = await db.execute(
      'SELECT project_manager_id FROM projects WHERE id = ?',
      [req.params.projectId]
    );
    
    if (projects.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    if (projects[0].project_manager_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Get all active site supervisors
    const [supervisors] = await db.execute(
      'SELECT id, first_name, last_name, email FROM users WHERE role = "SITE_SUPERVISOR" AND status = "ACTIVE" ORDER BY first_name, last_name'
    );
    
    res.json(supervisors);
  } catch (error) {
    console.error('Get site supervisors error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

