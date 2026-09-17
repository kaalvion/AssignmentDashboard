const { query, get } = require('../config/db');
const { generateDeadlineReminders } = require('../services/notificationService');

async function getDashboardData(req, res) {
  try {
    const userId = req.user.id;

    // Trigger notification reminders check silently
    await generateDeadlineReminders(userId);

    const assignments = await query(
      `SELECT a.*, s.name as subject_name, s.code as subject_code, s.color as subject_color
       FROM assignments a
       JOIN subjects s ON a.subject_id = s.id
       WHERE a.user_id = ?`,
      [userId]
    );

    const user = await get(`SELECT points, streak FROM users WHERE id = ?`, [userId]);

    const total = assignments.length;
    const completed = assignments.filter(a => a.status === 'COMPLETED').length;
    const inProgress = assignments.filter(a => a.status === 'IN_PROGRESS').length;
    const pending = assignments.filter(a => a.status === 'PENDING').length;
    const overdue = assignments.filter(a => a.status === 'OVERDUE').length;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // On-Time Rate
    const completedItems = assignments.filter(a => a.status === 'COMPLETED');
    const onTimeCount = completedItems.filter(a => {
      if (!a.completed_at || !a.deadline) return true;
      return new Date(a.completed_at) <= new Date(a.deadline);
    }).length;
    const onTimeRate = completedItems.length > 0 ? Math.round((onTimeCount / completedItems.length) * 100) : 100;

    // Today's Priority Selection: highest priority_score among incomplete assignments
    const activeAssignments = assignments.filter(a => a.status !== 'COMPLETED');
    activeAssignments.sort((a, b) => b.priority_score - a.priority_score);

    const todaysPriority = activeAssignments.length > 0 ? activeAssignments[0] : null;

    // Upcoming Deadlines (sorted by deadline asc)
    const upcomingDeadlines = [...activeAssignments].sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).slice(0, 5);

    return res.json({
      success: true,
      data: {
        stats: {
          total,
          completed,
          inProgress,
          pending,
          overdue,
          completionRate,
          onTimeRate,
          streak: user ? user.streak : 0,
          points: user ? user.points : 0
        },
        todaysPriority,
        upcomingDeadlines
      }
    });
  } catch (error) {
    console.error('Dashboard Data Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch dashboard data.' });
  }
}

async function getProductivityAnalytics(req, res) {
  try {
    const userId = req.user.id;
    const assignments = await query(
      `SELECT a.*, s.name as subject_name 
       FROM assignments a
       JOIN subjects s ON a.subject_id = s.id
       WHERE a.user_id = ?`,
      [userId]
    );

    // Status Distribution
    const statusCounts = {
      COMPLETED: assignments.filter(a => a.status === 'COMPLETED').length,
      IN_PROGRESS: assignments.filter(a => a.status === 'IN_PROGRESS').length,
      PENDING: assignments.filter(a => a.status === 'PENDING').length,
      OVERDUE: assignments.filter(a => a.status === 'OVERDUE').length
    };

    // Subject Breakdown
    const subjectMap = {};
    assignments.forEach(a => {
      const sub = a.subject_name || 'Other';
      if (!subjectMap[sub]) {
        subjectMap[sub] = { name: sub, total: 0, completed: 0, hours: 0 };
      }
      subjectMap[sub].total += 1;
      if (a.status === 'COMPLETED') subjectMap[sub].completed += 1;
      subjectMap[sub].hours += a.estimated_hours;
    });

    const subjectDistribution = Object.values(subjectMap);

    return res.json({
      success: true,
      data: {
        statusCounts,
        subjectDistribution
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch analytics.' });
  }
}

module.exports = {
  getDashboardData,
  getProductivityAnalytics
};
