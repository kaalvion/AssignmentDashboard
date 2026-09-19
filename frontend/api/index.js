const path = require('path');
const express = require('express');
const cors = require('cors');
const fs = require('fs');

let exec;
try {
  exec = require('../../backend/src/config/db').exec;
} catch (e) {
  console.warn('Backend DB module not found in frontend api function:', e.message);
}

const app = express();

app.use(cors());
app.use(express.json());

// Fallback Mock API handlers for Vercel Frontend deployment
app.get('/api/assignments/subjects', (req, res) => {
  return res.json({
    success: true,
    data: [
      { id: 1, name: 'Computer Networks', code: 'CS401', color: 'var(--primary)' },
      { id: 2, name: 'Database Management Systems', code: 'CS402', color: 'var(--accent-purple)' },
      { id: 3, name: 'Web Technologies', code: 'CS403', color: 'var(--accent-cyan)' },
      { id: 4, name: 'Software Engineering', code: 'CS404', color: 'var(--accent-emerald)' },
      { id: 5, name: 'Operating Systems', code: 'CS405', color: 'var(--accent-amber)' }
    ]
  });
});

app.get('/api/assignments', (req, res) => {
  return res.json({
    success: true,
    data: [
      {
        id: 101,
        subject_id: 1,
        subject_name: 'Computer Networks',
        subject_color: 'var(--primary)',
        title: 'TCP/IP Socket Programming Project',
        difficulty: 'MEDIUM',
        deadline: new Date(Date.now() + 86400000 * 2).toISOString(),
        priority_level: 'HIGH',
        risk_level: 'MEDIUM',
        progress: 40,
        estimated_hours: 4.5
      },
      {
        id: 102,
        subject_id: 2,
        subject_name: 'Database Management',
        subject_color: 'var(--accent-purple)',
        title: 'Relational Schema Optimization & Indexing',
        difficulty: 'HARD',
        deadline: new Date(Date.now() + 86400000 * 4).toISOString(),
        priority_level: 'HIGH',
        risk_level: 'LOW',
        progress: 20,
        estimated_hours: 3.0
      },
      {
        id: 103,
        subject_id: 3,
        subject_name: 'Web Technologies',
        subject_color: 'var(--accent-cyan)',
        title: 'React & REST API Assignment',
        difficulty: 'EASY',
        deadline: new Date(Date.now() + 86400000 * 7).toISOString(),
        priority_level: 'MEDIUM',
        risk_level: 'LOW',
        progress: 60,
        estimated_hours: 2.0
      }
    ]
  });
});

app.post('/api/assignments', (req, res) => {
  const newAssignment = {
    id: Date.now(),
    ...req.body,
    priority_score: 75,
    priority_level: 'HIGH',
    risk_level: 'MEDIUM'
  };
  return res.status(201).json({
    success: true,
    message: 'Assignment created successfully.',
    data: newAssignment
  });
});

app.get('/api/analytics/dashboard', (req, res) => {
  return res.json({
    success: true,
    data: {
      stats: {
        total: 3,
        completed: 1,
        inProgress: 1,
        pending: 1,
        overdue: 0,
        completionRate: 33,
        onTimeRate: 100,
        streak: 3,
        points: 120
      },
      todaysPriority: {
        id: 101,
        subject_name: 'Computer Networks',
        title: 'TCP/IP Socket Programming Project',
        description: 'Implement a multi-threaded chat server and client using socket programming in C/Python.',
        estimated_hours: 4.5,
        progress: 40,
        priority_level: 'HIGH',
        risk_level: 'MEDIUM',
        deadline: new Date(Date.now() + 86400000 * 2).toISOString()
      },
      upcomingDeadlines: [
        {
          id: 102,
          subject_name: 'Database Management',
          subject_color: 'var(--primary)',
          title: 'Relational Schema Optimization & Indexing',
          deadline: new Date(Date.now() + 86400000 * 4).toISOString(),
          priority_level: 'HIGH',
          risk_level: 'LOW',
          progress: 20
        },
        {
          id: 103,
          subject_name: 'Web Technologies',
          subject_color: 'var(--accent-purple)',
          title: 'React & REST API Assignment',
          deadline: new Date(Date.now() + 86400000 * 7).toISOString(),
          priority_level: 'MEDIUM',
          risk_level: 'LOW',
          progress: 60
        }
      ]
    }
  });
});

app.get('/api/analytics/productivity', (req, res) => {
  return res.json({
    success: true,
    data: {
      statusCounts: {
        COMPLETED: 1,
        IN_PROGRESS: 1,
        PENDING: 1,
        OVERDUE: 0
      },
      subjectDistribution: [
        { name: 'Computer Networks', total: 1, completed: 0, hours: 4.5 },
        { name: 'Database Management', total: 1, completed: 0, hours: 3.0 },
        { name: 'Web Technologies', total: 1, completed: 1, hours: 2.0 }
      ]
    }
  });
});

app.get('/api/notifications', (req, res) => {
  return res.json({
    success: true,
    data: {
      notifications: [
        {
          id: 1,
          title: 'Welcome to Assignment Dashboard',
          message: 'Your workspace is active and synced.',
          type: 'INFO',
          is_read: 0,
          created_at: new Date().toISOString()
        }
      ],
      unreadCount: 1
    }
  });
});

app.put('/api/notifications/*', (req, res) => {
  return res.json({ success: true, message: 'Notification updated.' });
});

app.get('/api/gamification/leaderboard', (req, res) => {
  return res.json({
    success: true,
    data: [
      { id: 1, rank: 1, name: 'Aarav Sharma', course: 'BCA 4th Sem', completedCount: 14, completionRate: 95, points: 680, isCurrentUser: false },
      { id: 2, rank: 2, name: 'Ananya Verma', course: 'BCA 4th Sem', completedCount: 12, completionRate: 90, points: 590, isCurrentUser: false },
      { id: 3, rank: 3, name: 'Student (You)', course: 'BCA 4th Sem', completedCount: 8, completionRate: 85, points: 420, isCurrentUser: true }
    ]
  });
});

app.get('/api/gamification/star-of-month', (req, res) => {
  return res.json({
    success: true,
    data: {
      name: 'Aarav Sharma',
      course: 'BCA 4th Sem (Div A)',
      onTimeRate: 100,
      completedAssignments: 14,
      points: 680
    }
  });
});

app.get('/api/gamification/achievements', (req, res) => {
  return res.json({
    success: true,
    data: [
      { id: 1, name: 'First Milestone', description: 'Complete your first assignment', pointsReward: 50, icon: 'Trophy', isUnlocked: true, earnedAt: new Date().toISOString() },
      { id: 2, name: 'Punctuality Pro', description: 'Submit 5 assignments on time', pointsReward: 100, icon: 'Clock', isUnlocked: true, earnedAt: new Date().toISOString() },
      { id: 3, name: 'Streak Master', description: 'Maintain a 3-day active streak', pointsReward: 150, icon: 'Flame', isUnlocked: false }
    ]
  });
});

app.all('/api/*', (req, res) => {
  res.json({ success: true, message: 'API Endpoint active.' });
});



module.exports = app;
