if (process.env.NODE_ENV === 'production') {
  console.error('⛔ Refusing to run tests against production environment!');
  process.exit(1);
}

const express = require('express');
const plannerRoutes = require('../src/routes/plannerRoutes');
const analyticsRoutes = require('../src/routes/analyticsRoutes');
const { db } = require('../src/config/firebase');

const app = express();
app.use(express.json());
app.use('/api/planner', plannerRoutes);
app.use('/api/analytics', analyticsRoutes);

async function runTests() {
  console.log('🧪 Starting Smart Study Planner & Analytics Firestore Tests...');

  const server = app.listen(5077, async () => {
    try {
      const timestamp = Date.now();
      const testUserId = `test_planner_user_${timestamp}`;
      const headers = {
        'Content-Type': 'application/json',
        'x-user-id': testUserId
      };

      // 1. Setup mock assignments for this test user
      console.log('Setting up mock assignments in Firestore...');
      const now = new Date();
      const hoursFromNow = (h) => new Date(now.getTime() + h * 60 * 60 * 1000).toISOString();

      const testAssignments = [
        {
          id: `pa_assign_1_${timestamp}`,
          userId: testUserId,
          title: 'Algorithmic Graph Theory',
          subjectId: 'sub_math',
          subjectName: 'Mathematics',
          subjectColor: '#EF4444',
          deadline: hoursFromNow(24),
          difficulty: 'HARD',
          estimatedHours: 3.5,
          estimated_hours: 3.5,
          progress: 20,
          status: 'IN_PROGRESS',
          priorityScore: 160,
          priority_score: 160,
          priorityLevel: 'HIGH',
          priority_level: 'HIGH',
          riskLevel: 'URGENT',
          risk_level: 'URGENT'
        },
        {
          id: `pa_assign_2_${timestamp}`,
          userId: testUserId,
          title: 'Cloud Architecture Research',
          subjectId: 'sub_cloud',
          subjectName: 'Cloud Computing',
          subjectColor: '#06B6D4',
          deadline: hoursFromNow(72),
          difficulty: 'MEDIUM',
          estimatedHours: 4.0,
          estimated_hours: 4.0,
          progress: 0,
          status: 'PENDING',
          priorityScore: 90,
          priority_score: 90,
          priorityLevel: 'MEDIUM',
          priority_level: 'MEDIUM',
          riskLevel: 'APPROACHING',
          risk_level: 'APPROACHING'
        },
        {
          id: `pa_assign_3_${timestamp}`,
          userId: testUserId,
          title: 'Database Schema Normalization',
          subjectId: 'sub_dbms',
          subjectName: 'DBMS',
          subjectColor: '#6366F1',
          deadline: hoursFromNow(-24),
          difficulty: 'EASY',
          estimatedHours: 2.0,
          estimated_hours: 2.0,
          progress: 100,
          status: 'COMPLETED',
          completedAt: hoursFromNow(-25),
          completed_at: hoursFromNow(-25),
          priorityScore: 0,
          priority_score: 0,
          priorityLevel: 'LOW',
          priority_level: 'LOW',
          riskLevel: 'SAFE',
          risk_level: 'SAFE'
        }
      ];

      const batch = db.batch();
      testAssignments.forEach(a => {
        batch.set(db.collection('assignments').doc(a.id), a);
      });
      batch.set(db.collection('users').doc(testUserId), {
        id: testUserId,
        name: 'Planner Tester',
        email: `${testUserId}@nexus.edu`,
        points: 350,
        streak: 4
      });
      await batch.commit();
      console.log('✅ Mock data seeded in Firestore.');

      // 2. Test Smart Planner
      console.log('1️⃣ Testing GET /api/planner...');
      const plannerRes = await fetch('http://localhost:5077/api/planner?days=7&max_daily_hours=4.0', { headers });
      const plannerData = await plannerRes.json();

      if (!plannerData.success || !plannerData.data.days || plannerData.data.days.length !== 7) {
        throw new Error('Planner API failed: ' + JSON.stringify(plannerData));
      }

      console.log('✅ Planner generated 7-day schedule.');
      console.log('   Total required hours planned:', plannerData.data.totalRequiredHours);
      console.log('   Days count:', plannerData.data.days.length);

      // 3. Test Analytics Dashboard
      console.log('2️⃣ Testing GET /api/analytics/dashboard...');
      const dashRes = await fetch('http://localhost:5077/api/analytics/dashboard', { headers });
      const dashData = await dashRes.json();

      if (!dashData.success || !dashData.data.stats) {
        throw new Error('Analytics Dashboard failed: ' + JSON.stringify(dashData));
      }

      const stats = dashData.data.stats;
      console.log('✅ Dashboard stats returned:', {
        total: stats.total,
        completed: stats.completed,
        inProgress: stats.inProgress,
        pending: stats.pending,
        completionRate: `${stats.completionRate}%`,
        onTimeRate: `${stats.onTimeRate}%`,
        points: stats.points,
        streak: stats.streak
      });

      if (stats.total !== 3 || stats.completed !== 1) {
        throw new Error(`Stats mismatch: expected total 3, completed 1. Got: ${JSON.stringify(stats)}`);
      }

      if (!dashData.data.todaysPriority || dashData.data.todaysPriority.title !== 'Algorithmic Graph Theory') {
        throw new Error('Expected highest priority to be Algorithmic Graph Theory, got: ' + JSON.stringify(dashData.data.todaysPriority));
      }
      console.log('✅ Today\'s Priority identified correctly:', dashData.data.todaysPriority.title);

      // 4. Test Productivity Analytics
      console.log('3️⃣ Testing GET /api/analytics/productivity...');
      const prodRes = await fetch('http://localhost:5077/api/analytics/productivity', { headers });
      const prodData = await prodRes.json();

      if (!prodData.success || !prodData.data.statusCounts || !prodData.data.subjectDistribution) {
        throw new Error('Productivity Analytics failed: ' + JSON.stringify(prodData));
      }

      console.log('✅ Productivity breakdown:', {
        statusCounts: prodData.data.statusCounts,
        subjectCount: prodData.data.subjectDistribution.length
      });

      // 5. Cleanup test data
      console.log('🧹 Cleaning up test assignments and user...');
      const cleanBatch = db.batch();
      testAssignments.forEach(a => cleanBatch.delete(db.collection('assignments').doc(a.id)));
      cleanBatch.delete(db.collection('users').doc(testUserId));
      await cleanBatch.commit();

      console.log('🎉 All Planner & Analytics tests PASSED with 100% success!');
      server.close(() => process.exit(0));
    } catch (err) {
      console.error('❌ Test Failure:', err);
      server.close(() => process.exit(1));
    }
  });
}

runTests();
