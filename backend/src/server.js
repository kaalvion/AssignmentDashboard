require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const plannerRoutes = require('./routes/plannerRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const gamificationRoutes = require('./routes/gamificationRoutes');
const groupRoutes = require('./routes/groupRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const taskRoutes = require('./routes/taskRoutes');
const cronRoutes = require('./routes/cronRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

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
  res.json({ success: true, message: 'Assignment Deadline Dashboard API Server is running with Firestore.' });
});

// Centralized Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal Server Error' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 API Server running on port ${PORT}`);
  });
}

module.exports = app;
