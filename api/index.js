const express = require('express');
const cors = require('cors');

const authRoutes = require('../backend/src/routes/authRoutes');
const assignmentRoutes = require('../backend/src/routes/assignmentRoutes');
const plannerRoutes = require('../backend/src/routes/plannerRoutes');
const analyticsRoutes = require('../backend/src/routes/analyticsRoutes');
const gamificationRoutes = require('../backend/src/routes/gamificationRoutes');
const groupRoutes = require('../backend/src/routes/groupRoutes');
const notificationRoutes = require('../backend/src/routes/notificationRoutes');
const adminRoutes = require('../backend/src/routes/adminRoutes');
const teacherRoutes = require('../backend/src/routes/teacherRoutes');
const taskRoutes = require('../backend/src/routes/taskRoutes');
const cronRoutes = require('../backend/src/routes/cronRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/cron', cronRoutes);

app.use('/api/planner', plannerRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Assignment Deadline Dashboard API Server is running on Vercel with Firestore.' });
});

// Centralized Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal Server Error' });
});

module.exports = app;
