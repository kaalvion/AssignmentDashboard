const { query, get, run } = require('../config/db');
const { calculateAssignmentMetrics } = require('../services/priorityService');
const { awardPoints, POINT_RULES, checkAndAwardAchievements } = require('../services/gamificationService');

async function updateAssignmentProgressFromSubtasks(assignmentId) {
  const subtasks = await query(`SELECT * FROM subtasks WHERE assignment_id = ?`, [assignmentId]);
  if (subtasks.length === 0) return;

  const completedCount = subtasks.filter(st => st.is_completed === 1).length;
  const progressPercent = Math.round((completedCount / subtasks.length) * 100);

  const assignment = await get(`SELECT * FROM assignments WHERE id = ?`, [assignmentId]);
  if (!assignment) return;

  let newStatus = assignment.status;
  if (progressPercent === 100 && assignment.status !== 'COMPLETED') {
    newStatus = 'COMPLETED';
    await awardPoints(assignment.user_id, POINT_RULES.COMPLETE_ASSIGNMENT, `Completed Assignment: ${assignment.title}`);
  } else if (progressPercent > 0 && assignment.status === 'PENDING') {
    newStatus = 'IN_PROGRESS';
  }

  const updatedMetrics = calculateAssignmentMetrics({
    ...assignment,
    progress: progressPercent,
    status: newStatus
  });

  await run(
    `UPDATE assignments 
     SET progress = ?, status = ?, priority_score = ?, priority_level = ?, risk_level = ? 
     WHERE id = ?`,
    [
      progressPercent,
      newStatus,
      updatedMetrics.priorityScore,
      updatedMetrics.priorityLevel,
      updatedMetrics.riskLevel,
      assignmentId
    ]
  );
}

async function addSubtask(req, res) {
  try {
    const { id: assignmentId } = req.params;
    const { title, estimated_minutes } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Subtask title is required.' });
    }

    const assignment = await get(`SELECT id FROM assignments WHERE id = ? AND user_id = ?`, [assignmentId, req.user.id]);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    const result = await run(
      `INSERT INTO subtasks (assignment_id, title, estimated_minutes, is_completed) VALUES (?, ?, ?, 0)`,
      [assignmentId, title, estimated_minutes || 30]
    );

    await updateAssignmentProgressFromSubtasks(assignmentId);

    const created = await get(`SELECT * FROM subtasks WHERE id = ?`, [result.id]);
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to add subtask.' });
  }
}

async function updateSubtask(req, res) {
  try {
    const { subtask_id } = req.params;
    const { title, is_completed } = req.body;

    const subtask = await get(
      `SELECT st.*, a.user_id 
       FROM subtasks st 
       JOIN assignments a ON st.assignment_id = a.id 
       WHERE st.id = ? AND a.user_id = ?`,
      [subtask_id, req.user.id]
    );

    if (!subtask) {
      return res.status(404).json({ success: false, message: 'Subtask not found.' });
    }

    const newlyCompleted = is_completed === 1 && subtask.is_completed === 0;

    await run(
      `UPDATE subtasks SET title = ?, is_completed = ? WHERE id = ?`,
      [title !== undefined ? title : subtask.title, is_completed !== undefined ? is_completed : subtask.is_completed, subtask_id]
    );

    if (newlyCompleted) {
      await awardPoints(req.user.id, POINT_RULES.COMPLETE_SUBTASK, `Completed Subtask: ${subtask.title}`);
      await checkAndAwardAchievements(req.user.id);
    }

    await updateAssignmentProgressFromSubtasks(subtask.assignment_id);

    const updated = await get(`SELECT * FROM subtasks WHERE id = ?`, [subtask_id]);
    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update subtask.' });
  }
}

async function deleteSubtask(req, res) {
  try {
    const { subtask_id } = req.params;
    const subtask = await get(
      `SELECT st.*, a.user_id 
       FROM subtasks st 
       JOIN assignments a ON st.assignment_id = a.id 
       WHERE st.id = ? AND a.user_id = ?`,
      [subtask_id, req.user.id]
    );

    if (!subtask) {
      return res.status(404).json({ success: false, message: 'Subtask not found.' });
    }

    await run(`DELETE FROM subtasks WHERE id = ?`, [subtask_id]);
    await updateAssignmentProgressFromSubtasks(subtask.assignment_id);

    return res.json({ success: true, message: 'Subtask deleted.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete subtask.' });
  }
}

async function addResource(req, res) {
  try {
    const { id: assignmentId } = req.params;
    const { title, type, url_or_path, file_size } = req.body;

    if (!title || !type || !url_or_path) {
      return res.status(400).json({ success: false, message: 'Title, type, and url/path are required.' });
    }

    const assignment = await get(`SELECT id FROM assignments WHERE id = ? AND user_id = ?`, [assignmentId, req.user.id]);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    const result = await run(
      `INSERT INTO resources (assignment_id, title, type, url_or_path, file_size) VALUES (?, ?, ?, ?, ?)`,
      [assignmentId, title, type, url_or_path, file_size || 0]
    );

    const created = await get(`SELECT * FROM resources WHERE id = ?`, [result.id]);
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to add resource.' });
  }
}

async function deleteResource(req, res) {
  try {
    const { resource_id } = req.params;
    const resource = await get(
      `SELECT r.*, a.user_id 
       FROM resources r 
       JOIN assignments a ON r.assignment_id = a.id 
       WHERE r.id = ? AND a.user_id = ?`,
      [resource_id, req.user.id]
    );

    if (!resource) {
      return res.status(404).json({ success: false, message: 'Resource not found.' });
    }

    await run(`DELETE FROM resources WHERE id = ?`, [resource_id]);
    return res.json({ success: true, message: 'Resource deleted.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete resource.' });
  }
}

module.exports = {
  addSubtask,
  updateSubtask,
  deleteSubtask,
  addResource,
  deleteResource
};
