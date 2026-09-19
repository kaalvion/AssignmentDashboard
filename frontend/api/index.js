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

app.all('/api/*', (req, res) => {
  res.json({ success: true, message: 'API Endpoint active.' });
});

module.exports = app;
