/**
 * Notification Service
 * Checks assignment deadlines and generates automated reminders.
 */

const { query, run } = require('../config/db');

async function generateDeadlineReminders(userId) {
  const assignments = await query(
    `SELECT * FROM assignments WHERE user_id = ? AND status != 'COMPLETED'`,
    [userId]
  );

  const now = new Date();

  for (const a of assignments) {
    const deadline = new Date(a.deadline);
    const diffHours = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

    let reminderTitle = null;
    let reminderType = 'INFO';

    if (diffHours < 0 && a.status !== 'OVERDUE') {
      reminderTitle = `Overdue Alert: ${a.title}`;
      reminderType = 'URGENT';
    } else if (diffHours > 0 && diffHours <= 24) {
      reminderTitle = `Due Tomorrow: ${a.title}`;
      reminderType = 'URGENT';
    } else if (diffHours > 24 && diffHours <= 72) {
      reminderTitle = `Approaching Deadline: ${a.title}`;
      reminderType = 'WARNING';
    }

    if (reminderTitle) {
      // Check if notification already sent in last 24h
      const existing = await query(
        `SELECT id FROM notifications WHERE user_id = ? AND title = ? AND datetime(created_at) > datetime('now', '-1 day')`,
        [userId, reminderTitle]
      );
      
      if (existing.length === 0) {
        await run(
          `INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, ?, ?)`,
          [
            userId,
            reminderTitle,
            `Assignment "${a.title}" is due on ${new Date(a.deadline).toLocaleString()}. Current progress: ${a.progress}%.`,
            reminderType,
            `/assignments/${a.id}`
          ]
        );
      }
    }
  }
}

module.exports = {
  generateDeadlineReminders
};
