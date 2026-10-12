const { db } = require('../config/firebase');
const { syncClassNotificationsForStudent } = require('../services/notificationService');

async function getNotifications(req, res) {
  try {
    const userId = req.user.id;

    // Auto-sync class notifications so student never misses notifications for assignments posted for their class
    if (req.user && req.user.course && req.user.semester && req.user.division && (req.user.role === 'STUDENT' || !req.user.role)) {
      try {
        await syncClassNotificationsForStudent(userId, req.user.course, req.user.semester, req.user.division);
      } catch (syncErr) {
        console.warn('Notice: syncClassNotifications warning:', syncErr.message);
      }
    }

    const snap = await db.collection('notifications').where('userId', '==', userId).get();

    const notifications = snap.docs.map(doc => {
      const data = doc.data();
      const isRead = Boolean(data.isRead || data.is_read === 1);
      return {
        ...data,
        id: doc.id,
        isRead,
        is_read: isRead ? 1 : 0
      };
    });

    // Sort descending by createdAt in memory
    notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const limited = notifications.slice(0, 30);
    const unreadCount = notifications.filter(n => !n.isRead).length;

    return res.json({
      success: true,
      data: {
        notifications: limited,
        unreadCount
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch notifications.' });
  }
}

async function markAsRead(req, res) {
  try {
    const { id } = req.params;
    const docRef = db.collection('notifications').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    if (doc.data().userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    await docRef.update({
      isRead: true,
      is_read: 1
    });

    return res.json({ success: true, message: 'Notification marked as read.' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return res.status(500).json({ success: false, message: 'Failed to update notification.' });
  }
}

async function markAllAsRead(req, res) {
  try {
    const userId = req.user.id;
    const snap = await db.collection('notifications').where('userId', '==', userId).get();

    const unreadDocs = snap.docs.filter(d => {
      const data = d.data();
      return !data.isRead && data.is_read !== 1;
    });

    if (unreadDocs.length > 0) {
      const batch = db.batch();
      unreadDocs.forEach(d => {
        batch.update(d.ref, {
          isRead: true,
          is_read: 1
        });
      });
      await batch.commit();
    }

    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return res.status(500).json({ success: false, message: 'Failed to mark all as read.' });
  }
}

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead
};
