const db = require('../config/database');

async function ensureTable() {
  try {
    await db.execute('SELECT 1 FROM notifications LIMIT 1');
    try {
      const [cols] = await db.execute('DESCRIBE notifications');
      if (!cols.some(c => c.Field === 'target_role')) {
        await db.execute('ALTER TABLE notifications ADD COLUMN target_role VARCHAR(50) NULL');
      }
    } catch (e) { /* ignore */ }
  } catch {
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
    } catch (e) { /* ignore */ }
  }
}

/** Create a broadcast notification (visible to all users) */
async function createBroadcastNotification(message) {
  try {
    await ensureTable();
    const title = (message && message.length > 80) ? message.substring(0, 80) + '...' : (message || 'Notification');
    await db.execute(
      'INSERT INTO notifications (user_id, title, message) VALUES (NULL, ?, ?)',
      [title, message || '']
    );
  } catch (err) { console.error('Create notification error:', err); }
}

/** Create a notification for a specific user */
async function createNotification(userId, message) {
  try {
    await ensureTable();
    const title = (message && message.length > 80) ? message.substring(0, 80) + '...' : (message || 'Notification');
    await db.execute(
      'INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)',
      [userId, title, message || '']
    );
  } catch (err) { console.error('Create notification error:', err); }
}

/** Create notification for all users with a specific role */
async function notifyRole(targetRole, message) {
  try {
    await ensureTable();
    const title = (message && message.length > 80) ? message.substring(0, 80) + '...' : (message || 'Notification');
    await db.execute(
      'INSERT INTO notifications (user_id, target_role, title, message) VALUES (NULL, ?, ?, ?)',
      [targetRole, title, message || '']
    );
  } catch (err) { console.error('Notify role error:', err); }
}

/** Create notifications for all System Admins */
async function notifySystemAdmins(message) {
  try {
    await ensureTable();
    const [admins] = await db.execute('SELECT id FROM users WHERE role = ? AND status = ?', ['SYSTEM_ADMIN', 'ACTIVE']);
    for (const admin of admins || []) {
      await createNotification(admin.id, message);
    }
  } catch (err) { console.error('Notify admins error:', err); }
}

module.exports = { createBroadcastNotification, createNotification, notifyRole, notifySystemAdmins };
