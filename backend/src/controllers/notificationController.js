const { query, run } = require('../config/db');

async function getNotifications(req, res) {
  try {
    const notifications = await query(
      `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30`,
      [req.user.id]
    );
    const unreadCount = notifications.filter(n => n.is_read === 0).length;

    return res.json({
      success: true,
      data: {
        notifications,
        unreadCount
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch notifications.' });
  }
}

async function markAsRead(req, res) {
  try {
    const { id } = req.params;
    await run(`UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`, [id, req.user.id]);
    return res.json({ success: true, message: 'Notification marked as read.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update notification.' });
  }
}

async function markAllAsRead(req, res) {
  try {
    await run(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`, [req.user.id]);
    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to mark all as read.' });
  }
}

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead
};
