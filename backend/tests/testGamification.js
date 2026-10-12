if (process.env.NODE_ENV === 'production') {
  console.error('⛔ Refusing to run tests against production environment!');
  process.exit(1);
}

const express = require('express');
const gamificationRoutes = require('../src/routes/gamificationRoutes');
const notificationRoutes = require('../src/routes/notificationRoutes');
const { db } = require('../src/config/firebase');
const { 
  awardPoints, 
  checkAndAwardAchievements,
  POINT_RULES 
} = require('../src/services/gamificationService');
const { generateDeadlineReminders } = require('../src/services/notificationService');

const app = express();
app.use(express.json());
app.use('/api/gamification', gamificationRoutes);
app.use('/api/notifications', notificationRoutes);

async function runTests() {
  console.log('🧪 Starting Gamification & Notifications Firestore Tests...');

  const server = app.listen(5066, async () => {
    try {
      const timestamp = Date.now();
      const testUserId = `test_gamify_user_${timestamp}`;
      const headers = {
        'Content-Type': 'application/json',
        'x-user-id': testUserId
      };

      // 1. Create test user
      const userRef = db.collection('users').doc(testUserId);
      await userRef.set({
        id: testUserId,
        name: 'Gamer Student',
        email: `${testUserId}@nexus.edu`,
        points: 100,
        streak: 7
      });
      console.log('✅ Test student created with 100 points, 7 streak.');

      // 2. Test Double-Counting Prevention for Submission Points
      console.log('1️⃣ Testing Idempotency & Point Double-Count Protection...');
      const dummyAssignId = `sub_dup_test_${timestamp}`;

      // First call -> Should award 75 submission points
      await awardPoints(testUserId, 75, 'On-time PDF Submission: ML Lab', `sub_ontime_${dummyAssignId}`);
      
      let userSnap = await userRef.get();
      let currentPoints = userSnap.data().points;
      console.log('   Points after 1st submission point call:', currentPoints);
      if (currentPoints !== 175) {
        throw new Error(`Expected 175 points, got: ${currentPoints}`);
      }

      // Second call for the SAME submission -> Should NOT award points again!
      await awardPoints(testUserId, 75, 'On-time PDF Submission: ML Lab', `sub_ontime_${dummyAssignId}`);
      userSnap = await userRef.get();
      currentPoints = userSnap.data().points;
      console.log('   Points after 2nd (duplicate) call:', currentPoints);
      if (currentPoints !== 175) {
        throw new Error(`Double-counting bug detected! Expected 175 points, but got: ${currentPoints}`);
      }
      console.log('✅ Double-counting protection PASSED: Points were not awarded twice.');

      // 3. Test Achievements Unlock
      console.log('2️⃣ Testing Achievements Evaluation & Unlocking...');
      await checkAndAwardAchievements(testUserId);

      const achSnap = await userRef.collection('achievements').doc('CONSISTENCY_CHAMPION').get();
      if (!achSnap.exists) {
        throw new Error('Expected CONSISTENCY_CHAMPION to be unlocked for 7-day streak');
      }
      console.log('✅ Achievement unlocked successfully:', achSnap.data().name);

      // Verify GET /api/gamification/achievements returns it as unlocked
      const getAchRes = await fetch('http://localhost:5066/api/gamification/achievements', { headers });
      const getAchData = await getAchRes.json();
      const unlockedBadge = getAchData.data.find(b => b.code === 'CONSISTENCY_CHAMPION');
      if (!unlockedBadge || !unlockedBadge.isUnlocked) {
        throw new Error('API failed to reflect unlocked achievement');
      }
      console.log('✅ GET /api/gamification/achievements returns badge isUnlocked: true.');

      // 4. Test Notification Duplication Prevention
      console.log('3️⃣ Testing Notifications Duplicate Protection...');
      const notifAssignId = `assign_notif_test_${timestamp}`;
      const assignRef = db.collection('assignments').doc(notifAssignId);
      await assignRef.set({
        id: notifAssignId,
        userId: testUserId,
        title: 'Compiler Design Submission',
        deadline: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
        status: 'PENDING',
        progress: 10
      });

      // Run reminders generation twice
      await generateDeadlineReminders(testUserId);
      await generateDeadlineReminders(testUserId);

      // Verify only 1 reminder created for this assignment
      const notifListRes = await fetch('http://localhost:5066/api/notifications', { headers });
      const notifListData = await notifListRes.json();
      const matchingReminders = notifListData.data.notifications.filter(n => n.assignmentId === notifAssignId);
      
      console.log('   Matching reminders found for 18h window:', matchingReminders.length);
      if (matchingReminders.length !== 1) {
        throw new Error(`Expected exactly 1 notification, found: ${matchingReminders.length}`);
      }
      console.log('✅ Notification duplicate protection PASSED.');

      // 5. Test Mark Notification as Read
      console.log('4️⃣ Testing Mark as Read...');
      const targetNotif = matchingReminders[0];
      const markRes = await fetch(`http://localhost:5066/api/notifications/${targetNotif.id}/read`, {
        method: 'PUT',
        headers
      });
      const markData = await markRes.json();
      if (!markData.success) {
        throw new Error('Mark as read failed: ' + JSON.stringify(markData));
      }
      console.log('✅ Notification marked as read.');

      // 6. Test Leaderboard and Star of Month
      console.log('5️⃣ Testing Leaderboard & Star of Month...');
      const leadRes = await fetch('http://localhost:5066/api/gamification/leaderboard', { headers });
      const leadData = await leadRes.json();
      if (!leadData.success || !Array.isArray(leadData.data) || leadData.data.length === 0) {
        throw new Error('Leaderboard failed: ' + JSON.stringify(leadData));
      }
      console.log(`✅ Leaderboard returned students. Top rank #1: ${leadData.data[0].name} (${leadData.data[0].points} pts).`);

      const starRes = await fetch('http://localhost:5066/api/gamification/star-of-month', { headers });
      const starData = await starRes.json();
      if (!starData.success || !starData.data.name) {
        throw new Error('Star of month failed: ' + JSON.stringify(starData));
      }
      console.log('✅ Star of Month returned:', starData.data.name);

      // 7. Cleanup
      console.log('🧹 Cleaning up test gamification and notification docs...');
      const cleanBatch = db.batch();
      cleanBatch.delete(userRef);
      cleanBatch.delete(assignRef);
      matchingReminders.forEach(n => cleanBatch.delete(db.collection('notifications').doc(n.id)));
      
      const ptsSnap = await userRef.collection('points').get();
      ptsSnap.forEach(d => cleanBatch.delete(d.ref));
      const userAchSnap = await userRef.collection('achievements').get();
      userAchSnap.forEach(d => cleanBatch.delete(d.ref));

      await cleanBatch.commit();

      console.log('🎉 All Gamification & Notification tests PASSED with 100% success!');
      server.close(() => process.exit(0));
    } catch (err) {
      console.error('❌ Test Failure:', err);
      server.close(() => process.exit(1));
    }
  });
}

runTests();
