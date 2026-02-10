const express = require('express');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get notifications for the current user
router.get('/', authenticate, async (req, res) => {
  try {
    // Check if notifications table exists
    try {
      await db.execute('SELECT 1 FROM notifications LIMIT 1');
    } catch (tableError) {
      // Table doesn't exist, return empty array
      return res.json([]);
    }

    const [notifications] = await db.execute(
      'SELECT * FROM notifications WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );

    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    // Return empty array instead of error
    res.json([]);
  }
});

// Mark notification as read
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    await db.execute(
      'UPDATE notifications SET read = 1, read_at = NOW() WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;







