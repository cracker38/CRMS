const express = require('express');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require SYSTEM_ADMIN role
router.use(authenticate);
router.use(authorize('SYSTEM_ADMIN'));

// Get audit logs
router.get('/audit-logs', async (req, res) => {
  try {
    const { startDate, endDate, userId, action, limit = 100 } = req.query;
    
    let query = `
      SELECT al.*, 
        u.first_name, 
        u.last_name, 
        u.email,
        u.role
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (startDate && endDate) {
      query += ' AND al.created_at BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }
    
    if (userId) {
      query += ' AND al.user_id = ?';
      params.push(userId);
    }
    
    if (action) {
      query += ' AND al.action = ?';
      params.push(action);
    }
    
    query += ' ORDER BY al.created_at DESC LIMIT ?';
    params.push(parseInt(limit));
    
    const [logs] = await db.execute(query, params);
    res.json(logs);
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get system health
router.get('/system-health', async (req, res) => {
  try {
    const [users] = await db.execute('SELECT COUNT(*) as total, SUM(CASE WHEN status = "ACTIVE" THEN 1 ELSE 0 END) as active FROM users');
    const [projects] = await db.execute('SELECT COUNT(*) as total, SUM(CASE WHEN status = "ACTIVE" THEN 1 ELSE 0 END) as active FROM projects');
    const [expenses] = await db.execute('SELECT COUNT(*) as total, SUM(CASE WHEN payment_status = "PENDING" THEN 1 ELSE 0 END) as pending FROM expenses');
    const [recentLogs] = await db.execute('SELECT COUNT(*) as total FROM audit_logs WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)');
    
    res.json({
      users: users[0],
      projects: projects[0],
      expenses: expenses[0],
      recentActivity: recentLogs[0],
      systemStatus: 'HEALTHY',
      lastChecked: new Date()
    });
  } catch (error) {
    console.error('Get system health error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get virtual auditor alerts (fraud detection, irregular access)
router.get('/virtual-auditor/alerts', async (req, res) => {
  try {
    const alerts = [];
    
    // Check for multiple failed login attempts
    const [failedLogins] = await db.execute(`
      SELECT user_id, COUNT(*) as attempts, MAX(created_at) as last_attempt
      FROM audit_logs
      WHERE action = 'LOGIN_FAILED'
      AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY user_id
      HAVING attempts >= 5
    `);
    
    for (const login of failedLogins) {
      const [user] = await db.execute('SELECT email, first_name, last_name FROM users WHERE id = ?', [login.user_id]);
      if (user.length > 0) {
        alerts.push({
          type: 'HIGH',
          category: 'SECURITY',
          title: 'Multiple Failed Login Attempts',
          description: `${user[0].email} has ${login.attempts} failed login attempts in the last 24 hours`,
          timestamp: login.last_attempt,
          userId: login.user_id
        });
      }
    }
    
    // Check for unusual expense patterns
    const [unusualExpenses] = await db.execute(`
      SELECT project_id, SUM(amount) as total, COUNT(*) as count
      FROM expenses
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY project_id
      HAVING total > 100000 OR count > 50
    `);
    
    for (const expense of unusualExpenses) {
      const [project] = await db.execute('SELECT name FROM projects WHERE id = ?', [expense.project_id]);
      if (project.length > 0) {
        alerts.push({
          type: 'MEDIUM',
          category: 'FINANCIAL',
          title: 'Unusual Expense Pattern',
          description: `Project "${project[0].name}" has ${expense.count} expenses totaling $${expense.total.toLocaleString()} in the last 7 days`,
          timestamp: new Date(),
          projectId: expense.project_id
        });
      }
    }
    
    // Check for after-hours access
    const [afterHours] = await db.execute(`
      SELECT user_id, COUNT(*) as count
      FROM audit_logs
      WHERE action = 'LOGIN'
      AND (HOUR(created_at) < 6 OR HOUR(created_at) > 22)
      AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY user_id
      HAVING count >= 3
    `);
    
    for (const access of afterHours) {
      const [user] = await db.execute('SELECT email, first_name, last_name FROM users WHERE id = ?', [access.user_id]);
      if (user.length > 0) {
        alerts.push({
          type: 'LOW',
          category: 'ACCESS',
          title: 'After-Hours Access Pattern',
          description: `${user[0].email} has ${access.count} logins during off-hours in the last 7 days`,
          timestamp: new Date(),
          userId: access.user_id
        });
      }
    }
    
    res.json(alerts.sort((a, b) => {
      const priority = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      return priority[b.type] - priority[a.type];
    }));
  } catch (error) {
    console.error('Get virtual auditor alerts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get system settings
router.get('/settings', async (req, res) => {
  try {
    // In a real system, this would come from a settings table
    res.json({
      systemName: 'Construction Resource Management System',
      sessionTimeout: 30,
      passwordPolicy: 'STANDARD',
      maxLoginAttempts: 5,
      backupFrequency: 'DAILY',
      auditRetentionDays: 365
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update system settings
router.put('/settings', async (req, res) => {
  try {
    const { systemName, sessionTimeout, passwordPolicy, maxLoginAttempts, backupFrequency, auditRetentionDays } = req.body;
    
    // In a real system, this would update a settings table
    // For now, we'll just log it
    await db.execute(
      'INSERT INTO audit_logs (user_id, action, table_name, new_values) VALUES (?, ?, ?, ?)',
      [req.user.id, 'UPDATE_SETTINGS', 'system_settings', JSON.stringify(req.body)]
    );
    
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

