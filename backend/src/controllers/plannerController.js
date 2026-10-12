const { generateStudyPlan } = require('../services/plannerService');
const { getEffectiveAssignmentsForUser } = require('../services/studentAssignmentService');
const { formatAssignmentResponse } = require('./assignmentController');

async function getPlanner(req, res) {
  try {
    const userId = req.user.id;
    const { days = 7, max_daily_hours = 4.0 } = req.query;

    const assignments = await getEffectiveAssignmentsForUser(userId);

    // Filter out completed assignments in-memory
    const activeAssignments = assignments
      .map(doc => formatAssignmentResponse(doc, doc.id))
      .filter(a => a.status !== 'COMPLETED');

    const plan = generateStudyPlan(
      activeAssignments,
      parseInt(days, 10),
      parseFloat(max_daily_hours)
    );

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
