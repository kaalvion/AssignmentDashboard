const { db } = require('../config/firebase');
const { generateDeadlineReminders } = require('../services/notificationService');
const { getEffectiveAssignmentsForUser } = require('../services/studentAssignmentService');
const { evaluateLazyPenaltiesForStudent } = require('../services/pointsService');
const { formatAssignmentResponse } = require('./assignmentController');

async function getDashboardData(req, res) {
  try {
    const userId = req.user.id;

    // Trigger notification reminders check silently
    await generateDeadlineReminders(userId);

    const assignmentsList = await getEffectiveAssignmentsForUser(userId);

    // Lazy evaluation: check and apply missed penalties for past-deadline assignments without submission
    await evaluateLazyPenaltiesForStudent(userId, assignmentsList);

    const userDoc = await db.collection('users').doc(userId).get();
    const assignments = assignmentsList.map(doc => formatAssignmentResponse(doc, doc.id));
    const userData = userDoc.exists ? userDoc.data() : {};

    const total = assignments.length;
    const completed = assignments.filter(a => a.status === 'COMPLETED').length;
    const inProgress = assignments.filter(a => a.status === 'IN_PROGRESS').length;
    const pending = assignments.filter(a => a.status === 'PENDING').length;
    const overdue = assignments.filter(a => a.status === 'OVERDUE').length;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // On-Time Rate
    const completedItems = assignments.filter(a => a.status === 'COMPLETED');
    const onTimeCount = completedItems.filter(a => {
      if (a.submissionStatus) {
        return a.submissionStatus === 'ON_TIME';
      }
      const compDate = a.completedAt || a.completed_at;
      if (!compDate || !a.deadline) return true;
      return new Date(compDate) <= new Date(a.deadline);
    }).length;
    const onTimeRate = completedItems.length > 0 ? Math.round((onTimeCount / completedItems.length) * 100) : 100;

    // Today's Priority Selection: highest priority_score among incomplete assignments
    const activeAssignments = assignments.filter(a => a.status !== 'COMPLETED');
    activeAssignments.sort((a, b) => b.priority_score - a.priority_score);

    const todaysPriority = activeAssignments.length > 0 ? activeAssignments[0] : null;

    // Upcoming Deadlines (sorted by deadline asc)
    const upcomingDeadlines = [...activeAssignments]
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
      .slice(0, 5);

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
          streak: userData.streak !== undefined ? userData.streak : 0,
          points: userData.points !== undefined ? userData.points : 0
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
    const assignmentsList = await getEffectiveAssignmentsForUser(userId);
    const assignments = assignmentsList.map(doc => formatAssignmentResponse(doc, doc.id));

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
      const sub = a.subject_name || a.subjectName || 'Other';
      if (!subjectMap[sub]) {
        subjectMap[sub] = { name: sub, total: 0, completed: 0, hours: 0 };
      }
      subjectMap[sub].total += 1;
      if (a.status === 'COMPLETED') subjectMap[sub].completed += 1;
      subjectMap[sub].hours += (a.estimated_hours || a.estimatedHours || 1.0);
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
    console.error('Productivity Analytics Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch analytics.' });
  }
}

module.exports = {
  getDashboardData,
  getProductivityAnalytics
};
