/**
 * Centralized Gamification Service for Firestore
 * Handles points allocation, achievement evaluation, streaks, and leaderboard updates.
 */

const { db, admin } = require('../config/firebase');

const POINT_RULES = {
  ON_TIME_SUBMISSION: 25,
  LATE_SUBMISSION: 10,
  EARLY_SUBMISSION: 15,
  WEEKLY_CONSISTENCY: 20
};

const INITIAL_ACHIEVEMENTS = [
  { code: 'TOP_PERFORMER', name: 'Top Performer', description: 'Reach top 3 position on the leaderboard', icon: 'Trophy', reward: 100 },
  { code: 'DEADLINE_MASTER', name: 'Deadline Master', description: 'Complete 5 assignments before deadline', icon: 'Clock', reward: 75 },
  { code: 'CONSISTENCY_CHAMPION', name: 'Consistency Champion', description: 'Maintain a 7-day study streak', icon: 'Flame', reward: 50 },
  { code: 'PERFECT_ON_TIME', name: '100% On-Time', description: 'Complete 10 assignments with 100% on-time record', icon: 'CheckCircle', reward: 100 },
  { code: 'STAR_OF_MONTH', name: 'Star of the Month', description: 'Achieve #1 productivity rank for the month', icon: 'Star', reward: 150 },
  { code: 'EARLY_BIRD', name: 'Early Bird', description: 'Submit an assignment at least 24h before deadline', icon: 'Zap', reward: 40 },
  { code: 'TASK_CRUSHER', name: 'Task Crusher', description: 'Complete 25 total subtasks', icon: 'CheckSquare', reward: 60 },
  { code: 'PERFECT_WEEK', name: 'Perfect Week', description: 'Complete all planned assignments for a full week', icon: 'Award', reward: 80 }
];

async function seedAchievementsIfEmpty() {
  if (!db) return;
  const snapshot = await db.collection('achievements').limit(1).get();
  if (snapshot.empty) {
    const batch = db.batch();
    for (const ach of INITIAL_ACHIEVEMENTS) {
      const ref = db.collection('achievements').doc(ach.code);
      batch.set(ref, {
        id: ach.code,
        code: ach.code,
        name: ach.name,
        description: ach.description,
        icon: ach.icon,
        pointsReward: ach.reward,
        points_reward: ach.reward
      }, { merge: true });
    }
    await batch.commit();
  }
}

/**
 * Awards points atomically using FieldValue.increment().
 * An optional customPointDocId ensures idempotency so completing an assignment
 * or subtask cannot double-count points.
 */
async function awardPoints(userId, points, reason, customPointDocId = null) {
  if (!db || !userId || !points) return false;
  try {
    const userRef = db.collection('users').doc(userId);
    const pointRef = customPointDocId 
      ? userRef.collection('points').doc(customPointDocId)
      : userRef.collection('points').doc();

    if (customPointDocId) {
      const existing = await pointRef.get();
      if (existing.exists) {
        // Points already given for this action
        return false;
      }
    }

    const batch = db.batch();
    batch.set(pointRef, {
      id: pointRef.id,
      userId,
      points,
      reason,
      createdAt: new Date().toISOString()
    });

    batch.set(userRef, {
      points: admin.firestore.FieldValue.increment(points)
    }, { merge: true });

    await batch.commit();
    return true;
  } catch (err) {
    console.error('Error awarding points:', err.message);
    return false;
  }
}


async function checkAndAwardAchievements(userId) {
  if (!db || !userId) return;
  try {
    await seedAchievementsIfEmpty();

    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return;
    const userData = userDoc.data();

    // Fetch user assignments
    const assignSnap = await db.collection('assignments').where('userId', '==', userId).get();
    const userAssignments = assignSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const completedAssignments = userAssignments.filter(a => a.status === 'COMPLETED');
    
    // Count completed subtasks from embedded arrays
    let completedSubtasksCount = 0;
    userAssignments.forEach(a => {
      const subtasks = a.subtasks || [];
      completedSubtasksCount += subtasks.filter(st => st.isCompleted || st.is_completed === 1).length;
    });

    // Fetch already earned achievements from users/{uid}/achievements
    const earnedSnap = await db.collection('users').doc(userId).collection('achievements').get();
    const earnedCodes = new Set(earnedSnap.docs.map(d => d.id));

    // Fetch all static achievements
    const achSnap = await db.collection('achievements').get();
    const allAchievements = achSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    for (const ach of allAchievements) {
      if (earnedCodes.has(ach.code)) continue;

      let unlocked = false;

      if (ach.code === 'DEADLINE_MASTER' && completedAssignments.length >= 5) {
        unlocked = true;
      } else if (ach.code === 'TASK_CRUSHER' && completedSubtasksCount >= 5) {
        unlocked = true;
      } else if (ach.code === 'EARLY_BIRD') {
        const earlySubmits = completedAssignments.filter(a => {
          const compDate = a.completedAt || a.completed_at;
          if (!compDate || !a.deadline) return false;
          const diffHours = (new Date(a.deadline) - new Date(compDate)) / (1000 * 60 * 60);
          return diffHours >= 24;
        });
        if (earlySubmits.length >= 1) unlocked = true;
      } else if (ach.code === 'CONSISTENCY_CHAMPION' && (userData.streak || 0) >= 7) {
        unlocked = true;
      }

      if (unlocked) {
        const achRef = db.collection('users').doc(userId).collection('achievements').doc(ach.code);
        await achRef.set({
          id: ach.code,
          achievementId: ach.code,
          code: ach.code,
          name: ach.name,
          icon: ach.icon,
          pointsReward: ach.pointsReward || ach.points_reward || 50,
          points_reward: ach.pointsReward || ach.points_reward || 50,
          earnedAt: new Date().toISOString()
        });

        // Award points with unique doc ID
        await awardPoints(
          userId,
          ach.pointsReward || ach.points_reward || 50,
          `Unlocked Achievement: ${ach.name}`,
          `ach_reward_${ach.code}`
        );

        // Send Notification
        await db.collection('notifications').add({
          userId,
          title: '🏆 Achievement Unlocked!',
          message: `You earned the "${ach.name}" badge and +${ach.pointsReward || ach.points_reward || 50} points!`,
          type: 'SUCCESS',
          isRead: false,
          is_read: 0,
          link: '/achievements',
          createdAt: new Date().toISOString()
        });
      }
    }
  } catch (err) {
    console.error('Error checking achievements:', err.message);
  }
}

module.exports = {
  POINT_RULES,
  INITIAL_ACHIEVEMENTS,
  seedAchievementsIfEmpty,
  awardPoints,
  checkAndAwardAchievements
};
