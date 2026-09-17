const { query } = require('../config/db');
const { generateStudyPlan } = require('../services/plannerService');

async function getPlanner(req, res) {
  try {
    const userId = req.user.id;
    const { days = 7, max_daily_hours = 4.0 } = req.query;

    const assignments = await query(
      `SELECT a.*, s.name as subject_name 
       FROM assignments a
       JOIN subjects s ON a.subject_id = s.id
       WHERE a.user_id = ? AND a.status != 'COMPLETED'`,
      [userId]
    );

    const plan = generateStudyPlan(assignments, parseInt(days, 10), parseFloat(max_daily_hours));

    return res.json({
      success: true,
      data: plan
    });
  } catch (error) {
    console.error('Planner Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate study plan.' });
  }
}

module.exports = {
  getPlanner
};
