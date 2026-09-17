const { query, get } = require('../config/db');

async function getLeaderboard(req, res) {
  try {
    const users = await query(
      `SELECT u.id, u.name, u.course, u.semester, u.division, u.points, u.avatar_url,
        (SELECT COUNT(*) FROM assignments WHERE user_id = u.id AND status = 'COMPLETED') as completed_count,
        (SELECT COUNT(*) FROM assignments WHERE user_id = u.id) as total_count
       FROM users u
       ORDER BY u.points DESC, completed_count DESC
       LIMIT 50`
    );

    const formatted = users.map((u, index) => {
      const completionRate = u.total_count > 0 ? Math.round((u.completed_count / u.total_count) * 100) : 100;
      return {
        rank: index + 1,
        id: u.id,
        name: u.name,
        course: `${u.course} - Sem ${u.semester}`,
        points: u.points,
        completedCount: u.completed_count,
        completionRate,
        isCurrentUser: u.id === req.user.id
      };
    });

    return res.json({ success: true, data: formatted });
  } catch (error) {
    console.error('Leaderboard Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch leaderboard.' });
  }
}

async function getAchievements(req, res) {
  try {
    const userId = req.user.id;
    const allAchievements = await query(`SELECT * FROM achievements ORDER BY id ASC`);
    const userEarned = await query(`SELECT * FROM user_achievements WHERE user_id = ?`, [userId]);

    const earnedMap = {};
    userEarned.forEach(ue => {
      earnedMap[ue.achievement_id] = ue.earned_at;
    });

    const formatted = allAchievements.map(ach => ({
      id: ach.id,
      code: ach.code,
      name: ach.name,
      description: ach.description,
      icon: ach.icon,
      pointsReward: ach.points_reward,
      isUnlocked: !!earnedMap[ach.id],
      earnedAt: earnedMap[ach.id] || null
    }));

    return res.json({ success: true, data: formatted });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch achievements.' });
  }
}

async function getStarOfMonth(req, res) {
  try {
    const topStudent = await get(
      `SELECT u.id, u.name, u.course, u.semester, u.points,
        (SELECT COUNT(*) FROM assignments WHERE user_id = u.id AND status = 'COMPLETED') as completed_count
       FROM users u
       ORDER BY u.points DESC, completed_count DESC
       LIMIT 1`
    );

    if (!topStudent) {
      return res.json({ success: true, data: null });
    }

    return res.json({
      success: true,
      data: {
        name: topStudent.name,
        course: `${topStudent.course} (Semester ${topStudent.semester})`,
        completedAssignments: topStudent.completed_count,
        points: topStudent.points,
        onTimeRate: 98
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch star of the month.' });
  }
}

module.exports = {
  getLeaderboard,
  getAchievements,
  getStarOfMonth
};
