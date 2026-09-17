const { query, get, run } = require('../config/db');
const { calculateAssignmentMetrics } = require('../services/priorityService');
const { awardPoints, POINT_RULES, checkAndAwardAchievements } = require('../services/gamificationService');

async function getAssignments(req, res) {
  try {
    const userId = req.user.id;
    const { subject_id, status, difficulty, search, sort } = req.query;

    let sql = `
      SELECT a.*, s.name as subject_name, s.code as subject_code, s.color as subject_color
      FROM assignments a
      JOIN subjects s ON a.subject_id = s.id
      WHERE a.user_id = ?
    `;
    const params = [userId];

    if (subject_id) {
      sql += ` AND a.subject_id = ?`;
      params.push(subject_id);
    }
    if (status) {
      sql += ` AND a.status = ?`;
      params.push(status);
    }
    if (difficulty) {
      sql += ` AND a.difficulty = ?`;
      params.push(difficulty);
    }
    if (search) {
      sql += ` AND (a.title LIKE ? OR s.name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    // Dynamic Priority/Risk Recalculation on read
    let rows = await query(sql, params);

    const updatedRows = [];
    for (const assignment of rows) {
      const metrics = calculateAssignmentMetrics(assignment);
      if (
        metrics.priorityScore !== assignment.priority_score ||
        metrics.priorityLevel !== assignment.priority_level ||
        metrics.riskLevel !== assignment.risk_level
      ) {
        // Update in DB if changed
        await run(
          `UPDATE assignments SET priority_score = ?, priority_level = ?, risk_level = ? WHERE id = ?`,
          [metrics.priorityScore, metrics.priorityLevel, metrics.riskLevel, assignment.id]
        );
        assignment.priority_score = metrics.priorityScore;
        assignment.priority_level = metrics.priorityLevel;
        assignment.risk_level = metrics.riskLevel;
      }
      updatedRows.push(assignment);
    }

    // Sorting
    if (sort === 'priority') {
      updatedRows.sort((a, b) => b.priority_score - a.priority_score);
    } else if (sort === 'deadline') {
      updatedRows.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    } else if (sort === 'difficulty') {
      const order = { EXTREME: 4, HARD: 3, MEDIUM: 2, EASY: 1 };
      updatedRows.sort((a, b) => order[b.difficulty] - order[a.difficulty]);
    } else if (sort === 'progress') {
      updatedRows.sort((a, b) => b.progress - a.progress);
    } else {
      // Default: sort by deadline
      updatedRows.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    }

    return res.json({ success: true, data: updatedRows });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch assignments.' });
  }
}

async function getAssignmentById(req, res) {
  try {
    const { id } = req.params;
    const assignment = await get(
      `SELECT a.*, s.name as subject_name, s.code as subject_code, s.color as subject_color
       FROM assignments a
       JOIN subjects s ON a.subject_id = s.id
       WHERE a.id = ? AND a.user_id = ?`,
      [id, req.user.id]
    );

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    const subtasks = await query(`SELECT * FROM subtasks WHERE assignment_id = ? ORDER BY id ASC`, [id]);
    const resources = await query(`SELECT * FROM resources WHERE assignment_id = ? ORDER BY id ASC`, [id]);

    const metrics = calculateAssignmentMetrics(assignment);
    assignment.priority_score = metrics.priorityScore;
    assignment.priority_level = metrics.priorityLevel;
    assignment.risk_level = metrics.riskLevel;

    return res.json({
      success: true,
      data: {
        ...assignment,
        subtasks,
        resources
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error retrieving assignment.' });
  }
}

async function createAssignment(req, res) {
  try {
    const userId = req.user.id;
    const { title, subject_id, description, deadline, difficulty, estimated_hours, teacher, submission_method, notes } = req.body;

    if (!title || !subject_id || !deadline || !difficulty) {
      return res.status(400).json({ success: false, message: 'Title, Subject, Deadline, and Difficulty are required.' });
    }

    const parsedEstimatedHours = parseFloat(estimated_hours) || 1.0;
    if (parsedEstimatedHours <= 0) {
      return res.status(400).json({ success: false, message: 'Estimated completion time must be greater than zero.' });
    }

    const metrics = calculateAssignmentMetrics({
      deadline,
      difficulty,
      estimated_hours: parsedEstimatedHours,
      progress: 0,
      status: 'PENDING'
    });

    const result = await run(
      `INSERT INTO assignments 
       (user_id, subject_id, title, description, deadline, difficulty, estimated_hours, progress, status, teacher, submission_method, notes, priority_score, priority_level, risk_level) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'PENDING', ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        subject_id,
        title,
        description || '',
        deadline,
        difficulty,
        parsedEstimatedHours,
        teacher || '',
        submission_method || '',
        notes || '',
        metrics.priorityScore,
        metrics.priorityLevel,
        metrics.riskLevel
      ]
    );

    const created = await get(`SELECT * FROM assignments WHERE id = ?`, [result.id]);

    return res.status(201).json({
      success: true,
      message: 'Assignment created successfully.',
      data: created
    });
  } catch (error) {
    console.error('Error creating assignment:', error);
    return res.status(500).json({ success: false, message: 'Failed to create assignment.' });
  }
}

async function updateAssignment(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const existing = await get(`SELECT * FROM assignments WHERE id = ? AND user_id = ?`, [id, userId]);

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    const {
      title,
      subject_id,
      description,
      deadline,
      difficulty,
      estimated_hours,
      progress,
      status,
      teacher,
      submission_method,
      notes
    } = req.body;

    let updatedStatus = status || existing.status;
    let updatedProgress = progress !== undefined ? parseInt(progress, 10) : existing.progress;
    let completedAt = existing.completed_at;

    if (updatedStatus === 'COMPLETED' && existing.status !== 'COMPLETED') {
      updatedProgress = 100;
      completedAt = new Date().toISOString();

      // Award Gamification Points
      await awardPoints(userId, POINT_RULES.COMPLETE_ASSIGNMENT, `Completed Assignment: ${title || existing.title}`);
      
      const now = new Date();
      const due = new Date(deadline || existing.deadline);
      if (now <= due) {
        await awardPoints(userId, POINT_RULES.ON_TIME_SUBMISSION, `On-time Submission Bonus`);
      }

      await checkAndAwardAchievements(userId);
    }

    const updatedAssignmentObj = {
      deadline: deadline || existing.deadline,
      difficulty: difficulty || existing.difficulty,
      estimated_hours: estimated_hours !== undefined ? parseFloat(estimated_hours) : existing.estimated_hours,
      progress: updatedProgress,
      status: updatedStatus
    };

    const metrics = calculateAssignmentMetrics(updatedAssignmentObj);

    await run(
      `UPDATE assignments 
       SET title = ?, subject_id = ?, description = ?, deadline = ?, difficulty = ?, estimated_hours = ?, progress = ?, status = ?, teacher = ?, submission_method = ?, notes = ?, priority_score = ?, priority_level = ?, risk_level = ?, completed_at = ?
       WHERE id = ? AND user_id = ?`,
      [
        title || existing.title,
        subject_id || existing.subject_id,
        description !== undefined ? description : existing.description,
        deadline || existing.deadline,
        difficulty || existing.difficulty,
        estimated_hours !== undefined ? parseFloat(estimated_hours) : existing.estimated_hours,
        updatedProgress,
        updatedStatus,
        teacher !== undefined ? teacher : existing.teacher,
        submission_method !== undefined ? submission_method : existing.submission_method,
        notes !== undefined ? notes : existing.notes,
        metrics.priorityScore,
        metrics.priorityLevel,
        metrics.riskLevel,
        completedAt,
        id,
        userId
      ]
    );

    const updated = await get(`SELECT * FROM assignments WHERE id = ?`, [id]);
    return res.json({ success: true, message: 'Assignment updated.', data: updated });
  } catch (error) {
    console.error('Error updating assignment:', error);
    return res.status(500).json({ success: false, message: 'Failed to update assignment.' });
  }
}

async function deleteAssignment(req, res) {
  try {
    const { id } = req.params;
    const existing = await get(`SELECT id FROM assignments WHERE id = ? AND user_id = ?`, [id, req.user.id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    await run(`DELETE FROM assignments WHERE id = ?`, [id]);
    return res.json({ success: true, message: 'Assignment deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete assignment.' });
  }
}

async function getSubjects(req, res) {
  try {
    const subjects = await query(`SELECT * FROM subjects WHERE user_id = ? ORDER BY name ASC`, [req.user.id]);
    return res.json({ success: true, data: subjects });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch subjects.' });
  }
}

async function createSubject(req, res) {
  try {
    const { name, code, color } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Subject name is required.' });

    const result = await run(
      `INSERT INTO subjects (user_id, name, code, color) VALUES (?, ?, ?, ?)`,
      [req.user.id, name, code || name.slice(0, 4).toUpperCase(), color || '#4F46E5']
    );
    const created = await get(`SELECT * FROM subjects WHERE id = ?`, [result.id]);
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create subject.' });
  }
}

module.exports = {
  getAssignments,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getSubjects,
  createSubject
};
