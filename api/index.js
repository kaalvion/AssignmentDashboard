const path = require('path');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { exec } = require('../backend/src/config/db');

const authRoutes = require('../backend/src/routes/authRoutes');
const assignmentRoutes = require('../backend/src/routes/assignmentRoutes');
const plannerRoutes = require('../backend/src/routes/plannerRoutes');
const analyticsRoutes = require('../backend/src/routes/analyticsRoutes');
const gamificationRoutes = require('../backend/src/routes/gamificationRoutes');
const groupRoutes = require('../backend/src/routes/groupRoutes');
const notificationRoutes = require('../backend/src/routes/notificationRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Initialize Database schema
const schemaPath = path.join(__dirname, '../backend/src/config/schema.sql');
if (fs.existsSync(schemaPath)) {
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  exec(schemaSql).catch(err => {
    console.error('Database initialization error:', err);
  });
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/planner', plannerRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Assignment Deadline Dashboard API Server is running on Vercel.' });
});

// Centralized Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal Server Error' });
});

module.exports = app;
