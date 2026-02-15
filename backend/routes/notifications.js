const express = require('express');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Ensure notifications table exists and has target_role column
async function ensureNotificationsTable() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        target_role VARCHAR(50) NULL,
        message TEXT NOT NULL,
        \`read\` TINYINT(1) DEFAULT 0,
        read_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    const [cols] = await db.execute('DESCRIBE notifications');
    if (!cols.some(c => c.Field === 'target_role')) {
      await db.execute('ALTER TABLE notifications ADD COLUMN target_role VARCHAR(50) NULL');
    }
  } catch (err) { /* ignore */ }
}

// Get notifications for the current user (filtered by role)
router.get('/', authenticate, async (req, res) => {
  try {
    await ensureNotificationsTable();
    let notifications;
    if (req.user.role === 'SYSTEM_ADMIN') {
      const [rows] = await db.execute('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50');
      notifications = rows;
    } else {
      const [rows] = await db.execute(
        `SELECT * FROM notifications 
         WHERE user_id = ? OR (user_id IS NULL AND (target_role IS NULL OR target_role = ?))
         ORDER BY created_at DESC LIMIT 50`,
        [req.user.id, req.user.role]
      );
      notifications = rows;
    }
    // Normalize: map is_read to read for frontend compatibility
    const normalized = (notifications || []).map(n => ({
      ...n,
      read: n.is_read ?? n.read ?? 0
    }));
    res.json(normalized);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.json([]);
  }
});

// Mark notification as read (handles both is_read and read columns)
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const [cols] = await db.execute('DESCRIBE notifications');
    const hasIsRead = cols.some(c => c.Field === 'is_read');
    const setClause = hasIsRead ? 'SET is_read = 1' : 'SET `read` = 1';
    if (req.user.role === 'SYSTEM_ADMIN') {
      await db.execute(`UPDATE notifications ${setClause} WHERE id = ?`, [req.params.id]);
    } else {
      await db.execute(
        `UPDATE notifications ${setClause} WHERE id = ? AND (user_id = ? OR user_id IS NULL)`,
        [req.params.id, req.user.id]
      );
    }
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;







