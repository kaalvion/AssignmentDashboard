const { db } = require('../config/firebase');
const { calculateAssignmentMetrics } = require('../services/priorityService');
const { awardPoints, POINT_RULES, checkAndAwardAchievements, awardAssignmentCompletionPoints } = require('../services/gamificationService');

async function addSubtask(req, res) {
  try {
    const { id: assignmentId } = req.params;
    const { title, estimated_minutes } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Subtask title is required.' });
    }

    const docRef = db.collection('assignments').doc(assignmentId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    const assignment = doc.data();
    if (assignment.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    const subtasks = assignment.subtasks || [];
    const newSubtask = {
      id: `st_${Date.now()}`,
      title: title.trim(),
      estimatedMinutes: estimated_minutes ? Number(estimated_minutes) : 30,
      estimated_minutes: estimated_minutes ? Number(estimated_minutes) : 30,
      isCompleted: false,
      is_completed: 0,
      createdAt: new Date().toISOString()
    };

    subtasks.push(newSubtask);

    // Recalculate assignment progress
    const completedCount = subtasks.filter(st => st.isCompleted || st.is_completed === 1).length;
    const progressPercent = Math.round((completedCount / subtasks.length) * 100);

    let newStatus = assignment.status;
    if (progressPercent === 100 && assignment.status !== 'COMPLETED') {
      newStatus = 'COMPLETED';
    } else if (progressPercent > 0 && assignment.status === 'PENDING') {
      newStatus = 'IN_PROGRESS';
    }

    const metrics = calculateAssignmentMetrics({
      ...assignment,
      progress: progressPercent,
      status: newStatus
    });

    await docRef.update({
      subtasks,
      progress: progressPercent,
      status: newStatus,
      priorityScore: metrics.priorityScore,
      priority_score: metrics.priorityScore,
      priorityLevel: metrics.priorityLevel,
      priority_level: metrics.priorityLevel,
      riskLevel: metrics.riskLevel,
      risk_level: metrics.riskLevel
    });

    return res.status(201).json({ success: true, data: newSubtask });
  } catch (error) {
    console.error('Error adding subtask:', error);
    return res.status(500).json({ success: false, message: 'Failed to add subtask.' });
  }
}

async function updateSubtask(req, res) {
  try {
    const { subtask_id } = req.params;
    const { title, is_completed } = req.body;
    const userId = req.user.id;

    // Scan user's assignments for the one containing subtask_id
    const snap = await db.collection('assignments').where('userId', '==', userId).get();
    let targetDoc = null;
    let targetAssignment = null;
    let targetSubtask = null;
    let targetIndex = -1;

    for (const doc of snap.docs) {
      const data = doc.data();
      const subtasks = data.subtasks || [];
      const idx = subtasks.findIndex(st => st.id === subtask_id);
      if (idx !== -1) {
        targetDoc = doc;
        targetAssignment = data;
        targetSubtask = subtasks[idx];
        targetIndex = idx;
        break;
      }
    }

    if (!targetDoc) {
      return res.status(404).json({ success: false, message: 'Subtask not found.' });
    }

    const wasCompleted = Boolean(targetSubtask.isCompleted || targetSubtask.is_completed === 1);
    const willBeCompleted = is_completed !== undefined ? Boolean(is_completed === 1 || is_completed === true) : wasCompleted;
    const newlyCompleted = !wasCompleted && willBeCompleted;

    if (title !== undefined) targetSubtask.title = title.trim();
    targetSubtask.isCompleted = willBeCompleted;
    targetSubtask.is_completed = willBeCompleted ? 1 : 0;

    targetAssignment.subtasks[targetIndex] = targetSubtask;

    // Recalculate progress
    const subtasks = targetAssignment.subtasks;
    const completedCount = subtasks.filter(st => st.isCompleted || st.is_completed === 1).length;
    const progressPercent = Math.round((completedCount / subtasks.length) * 100);

    let newStatus = targetAssignment.status;
    let completedAt = targetAssignment.completedAt || targetAssignment.completed_at;

    if (progressPercent === 100 && targetAssignment.status !== 'COMPLETED') {
      newStatus = 'COMPLETED';
      completedAt = new Date().toISOString();
    } else if (progressPercent > 0 && targetAssignment.status === 'PENDING') {
      newStatus = 'IN_PROGRESS';
    }

    const metrics = calculateAssignmentMetrics({
      ...targetAssignment,
      progress: progressPercent,
      status: newStatus
    });

    await targetDoc.ref.update({
      subtasks,
      progress: progressPercent,
      status: newStatus,
      completedAt,
      completed_at: completedAt,
      priorityScore: metrics.priorityScore,
      priority_score: metrics.priorityScore,
      priorityLevel: metrics.priorityLevel,
      priority_level: metrics.priorityLevel,
      riskLevel: metrics.riskLevel,
      risk_level: metrics.riskLevel
    });

    return res.json({ success: true, data: targetSubtask });
  } catch (error) {
    console.error('Error updating subtask:', error);
    return res.status(500).json({ success: false, message: 'Failed to update subtask.' });
  }
}

async function deleteSubtask(req, res) {
  try {
    const { subtask_id } = req.params;
    const userId = req.user.id;

    const snap = await db.collection('assignments').where('userId', '==', userId).get();
    let targetDoc = null;
    let targetAssignment = null;

    for (const doc of snap.docs) {
      const data = doc.data();
      const subtasks = data.subtasks || [];
      if (subtasks.some(st => st.id === subtask_id)) {
        targetDoc = doc;
        targetAssignment = data;
        break;
      }
    }

    if (!targetDoc) {
      return res.status(404).json({ success: false, message: 'Subtask not found.' });
    }

    const updatedSubtasks = (targetAssignment.subtasks || []).filter(st => st.id !== subtask_id);
    const completedCount = updatedSubtasks.filter(st => st.isCompleted || st.is_completed === 1).length;
    const progressPercent = updatedSubtasks.length > 0 ? Math.round((completedCount / updatedSubtasks.length) * 100) : targetAssignment.progress;

    const metrics = calculateAssignmentMetrics({
      ...targetAssignment,
      progress: progressPercent
    });

    await targetDoc.ref.update({
      subtasks: updatedSubtasks,
      progress: progressPercent,
      priorityScore: metrics.priorityScore,
      priority_score: metrics.priorityScore,
      priorityLevel: metrics.priorityLevel,
      priority_level: metrics.priorityLevel,
      riskLevel: metrics.riskLevel,
      risk_level: metrics.riskLevel
    });

    return res.json({ success: true, message: 'Subtask deleted.' });
  } catch (error) {
    console.error('Error deleting subtask:', error);
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

    const docRef = db.collection('assignments').doc(assignmentId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    const assignment = doc.data();
    if (assignment.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    const resources = assignment.resources || [];
    const newResource = {
      id: `res_${Date.now()}`,
      title: title.trim(),
      type,
      urlOrPath: url_or_path,
      url_or_path,
      fileSize: file_size ? Number(file_size) : 0,
      file_size: file_size ? Number(file_size) : 0,
      createdAt: new Date().toISOString()
    };

    resources.push(newResource);
    await docRef.update({ resources });

    return res.status(201).json({ success: true, data: newResource });
  } catch (error) {
    console.error('Error adding resource:', error);
    return res.status(500).json({ success: false, message: 'Failed to add resource.' });
  }
}

async function deleteResource(req, res) {
  try {
    const { resource_id } = req.params;
    const userId = req.user.id;

    const snap = await db.collection('assignments').where('userId', '==', userId).get();
    let targetDoc = null;
    let targetAssignment = null;

    for (const doc of snap.docs) {
      const data = doc.data();
      const resources = data.resources || [];
      if (resources.some(r => r.id === resource_id)) {
        targetDoc = doc;
        targetAssignment = data;
        break;
      }
    }

    if (!targetDoc) {
      return res.status(404).json({ success: false, message: 'Resource not found.' });
    }

    const updatedResources = (targetAssignment.resources || []).filter(r => r.id !== resource_id);
    await targetDoc.ref.update({ resources: updatedResources });

    return res.json({ success: true, message: 'Resource deleted.' });
  } catch (error) {
    console.error('Error deleting resource:', error);
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
