const { db } = require('../config/firebase');

async function getLeaderboard(req, res) {
  try {
    const currentUserId = req.user.id;
    const usersSnap = await db.collection('users').get();
    const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Fetch assignments to compute accurate completedCount and completionRate per student
    const assignSnap = await db.collection('assignments').get();
    const allAssignments = assignSnap.docs.map(d => d.data());

    const userStatsMap = {};
    allAssignments.forEach(a => {
      const uid = a.userId || a.user_id;
      if (!uid) return;
      if (!userStatsMap[uid]) {
        userStatsMap[uid] = { total: 0, completed: 0 };
      }
      userStatsMap[uid].total += 1;
      if (a.status === 'COMPLETED') {
        userStatsMap[uid].completed += 1;
      }
    });

    const enrichedUsers = users.map(u => {
      const stats = userStatsMap[u.id] || { total: 0, completed: 0 };
      const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 100;
      return {
        id: u.id,
        name: u.name || 'Student',
        course: `${u.course || 'BCA'} - Sem ${u.semester || '4th'}`,
        points: u.points || 0,
        completedCount: stats.completed,
        completionRate,
        isCurrentUser: u.id === currentUserId
      };
    });

    // Sort by points descending, completedCount descending
    enrichedUsers.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.completedCount - a.completedCount;
    });

    const top20 = enrichedUsers.slice(0, 20).map((u, idx) => ({
      rank: idx + 1,
      ...u
    }));

    return res.json({ success: true, data: top20 });
  } catch (error) {
    console.error('Leaderboard Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch leaderboard.' });
  }
}

async function getAchievements(req, res) {
  try {
    const userId = req.user.id;

    const [allAchSnap, userEarnedSnap] = await Promise.all([
      db.collection('achievements').get(),
      db.collection('users').doc(userId).collection('achievements').get()
    ]);

    const earnedMap = {};
    userEarnedSnap.docs.forEach(doc => {
      earnedMap[doc.id] = doc.data().earnedAt || true;
    });

    const allAchievements = allAchSnap.docs.map(doc => {
      const data = doc.data();
      const code = data.code || doc.id;
      const isUnlocked = Boolean(earnedMap[code]);
      const reward = data.pointsReward !== undefined ? Number(data.pointsReward) : (data.points_reward !== undefined ? Number(data.points_reward) : 50);

      return {
        id: doc.id,
        code,
        name: data.name,
        description: data.description,
        icon: data.icon,
        pointsReward: reward,
        points_reward: reward,
        isUnlocked,
        earnedAt: earnedMap[code] || null
      };
    });

    return res.json({ success: true, data: allAchievements });
  } catch (error) {
    console.error('Achievements Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch achievements.' });
  }
}

async function getStarOfMonth(req, res) {
  try {
    const usersSnap = await db.collection('users').get();
    const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (users.length === 0) {
      return res.json({ success: true, data: null });
    }

    // Sort by points descending
    users.sort((a, b) => (b.points || 0) - (a.points || 0));
    const top = users[0];

    // Count completed assignments for top student
    const assignSnap = await db.collection('assignments')
      .where('userId', '==', top.id)
      .where('status', '==', 'COMPLETED')
      .get();

    return res.json({
      success: true,
      data: {
        name: top.name,
        course: `${top.course || 'BCA'} (Semester ${top.semester || '4th'})`,
        completedAssignments: assignSnap.size,
        points: top.points || 0,
        onTimeRate: 98
      }
    });
  } catch (error) {
    console.error('Star of Month Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch star of the month.' });
  }
}

module.exports = {
  getLeaderboard,
  getAchievements,
  getStarOfMonth
};
