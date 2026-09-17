/**
 * Centralized Gamification Service
 * Handles points allocation, achievement evaluation, streaks, and leaderboard updates.
 */

const { query, run, get } = require('../config/db');

const POINT_RULES = {
  COMPLETE_ASSIGNMENT: 50,
  ON_TIME_SUBMISSION: 25,
  EARLY_SUBMISSION: 15,
  COMPLETE_SUBTASK: 5,
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
  const existing = await query('SELECT COUNT(*) as count FROM achievements');
  if (existing[0].count === 0) {
    for (const ach of INITIAL_ACHIEVEMENTS) {
      await run(
        `INSERT INTO achievements (code, name, description, icon, points_reward) VALUES (?, ?, ?, ?, ?)`,
        [ach.code, ach.name, ach.description, ach.icon, ach.reward]
      );
    }
  }
}

async function awardPoints(userId, points, reason) {
  await run(`INSERT INTO user_points (user_id, points, reason) VALUES (?, ?, ?)`, [userId, points, reason]);
  await run(`UPDATE users SET points = points + ? WHERE id = ?`, [points, userId]);
}

async function checkAndAwardAchievements(userId) {
  await seedAchievementsIfEmpty();

  const user = await get(`SELECT * FROM users WHERE id = ?`, [userId]);
  if (!user) return;

  const completedAssignments = await query(
    `SELECT * FROM assignments WHERE user_id = ? AND status = 'COMPLETED'`,
    [userId]
  );
  
  const completedSubtasks = await query(
    `SELECT st.* FROM subtasks st 
     JOIN assignments a ON st.assignment_id = a.id 
     WHERE a.user_id = ? AND st.is_completed = 1`,
    [userId]
  );

  const earnedAchievements = await query(
    `SELECT achievement_id FROM user_achievements WHERE user_id = ?`,
    [userId]
  );
  const earnedIds = new Set(earnedAchievements.map(ea => ea.achievement_id));

  const achievements = await query(`SELECT * FROM achievements`);

  for (const ach of achievements) {
    if (earnedIds.has(ach.id)) continue;

    let unlocked = false;
    
    if (ach.code === 'DEADLINE_MASTER' && completedAssignments.length >= 5) {
      unlocked = true;
    } else if (ach.code === 'TASK_CRUSHER' && completedSubtasks.length >= 5) {
      unlocked = true;
    } else if (ach.code === 'EARLY_BIRD') {
      const earlySubmits = completedAssignments.filter(a => {
        if (!a.completed_at || !a.deadline) return false;
        const diffHours = (new Date(a.deadline) - new Date(a.completed_at)) / (1000 * 60 * 60);
        return diffHours >= 24;
      });
      if (earlySubmits.length >= 1) unlocked = true;
    } else if (ach.code === 'CONSISTENCY_CHAMPION' && user.streak >= 7) {
      unlocked = true;
    }

    if (unlocked) {
      await run(`INSERT INTO user_achievements (user_id, achievement_id) VALUES (?, ?)`, [userId, ach.id]);
      await awardPoints(userId, ach.points_reward, `Unlocked Achievement: ${ach.name}`);
      await run(
        `INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, ?, ?)`,
        [userId, `🏆 Achievement Unlocked!`, `You earned the "${ach.name}" badge and +${ach.points_reward} points!`, 'SUCCESS', '/achievements']
      );
    }
  }
}

module.exports = {
  POINT_RULES,
  seedAchievementsIfEmpty,
  awardPoints,
  checkAndAwardAchievements
};
