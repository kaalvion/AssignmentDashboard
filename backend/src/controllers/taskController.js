const { db } = require('../config/firebase');

/**
 * Personal Tasks Controller ("My Tasks")
 * Private tasks created by students/users for their own personal planning.
 * IMPORTANT: Completing personal tasks awards NO points to prevent point farming.
 */

async function getMyTasks(req, res) {
  try {
    const userId = req.user.id;
    const snap = await db.collection('tasks').where('userId', '==', userId).get();

    const tasks = snap.docs.map(doc => {
      const data = doc.data();
      const isCompleted = Boolean(data.isCompleted || data.is_completed);
      return {
        id: doc.id,
        ...data,
        isCompleted,
        is_completed: isCompleted ? 1 : 0,
        points: 0 // Explicitly 0 points
      };
    });

    tasks.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));

    return res.json({ success: true, data: tasks });
  } catch (error) {
    console.error('Error fetching personal tasks:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch personal tasks.' });
  }
}

async function createPersonalTask(req, res) {
  try {
    const userId = req.user.id;
    const { title, description, deadline, priority } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Title is required.' });
    }

    const taskRef = db.collection('tasks').doc();
    const newTask = {
      userId,
      user_id: userId,
      title: title.trim(),
      description: description ? description.trim() : '',
      deadline: deadline || null,
      priority: priority || 'MEDIUM',
      isCompleted: false,
      is_completed: 0,
      points: 0, // NO points awarded for personal tasks
      isPersonal: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await taskRef.set(newTask);

    return res.status(201).json({
      success: true,
      message: 'Personal task created.',
      data: { id: taskRef.id, ...newTask }
    });
  } catch (error) {
    console.error('Error creating personal task:', error);
    return res.status(500).json({ success: false, message: 'Failed to create personal task.' });
  }
}

async function updatePersonalTask(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const taskRef = db.collection('tasks').doc(id);
    const taskSnap = await taskRef.get();

    if (!taskSnap.exists) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    const current = taskSnap.data();
    if (current.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized to update this task.' });
    }

    const { title, description, deadline, priority, isCompleted, is_completed } = req.body;
    const updatePayload = {
      updatedAt: new Date().toISOString(),
      points: 0 // NO points
    };

    if (title !== undefined) updatePayload.title = title.trim();
    if (description !== undefined) updatePayload.description = description.trim();
    if (deadline !== undefined) updatePayload.deadline = deadline;
    if (priority !== undefined) updatePayload.priority = priority;

    const completedVal = isCompleted !== undefined ? isCompleted : is_completed;
    if (completedVal !== undefined) {
      const boolComp = Boolean(completedVal);
      updatePayload.isCompleted = boolComp;
      updatePayload.is_completed = boolComp ? 1 : 0;
      // CRITICAL: NO points are awarded when completing a personal task!
    }

    await taskRef.update(updatePayload);

    return res.json({
      success: true,
      message: 'Personal task updated.',
      data: { id, ...current, ...updatePayload }
    });
  } catch (error) {
    console.error('Error updating personal task:', error);
    return res.status(500).json({ success: false, message: 'Failed to update personal task.' });
  }
}

async function deletePersonalTask(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const taskRef = db.collection('tasks').doc(id);
    const taskSnap = await taskRef.get();

    if (!taskSnap.exists) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    if (taskSnap.data().userId !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized to delete this task.' });
    }

    await taskRef.delete();

    return res.json({ success: true, message: 'Personal task deleted.' });
  } catch (error) {
    console.error('Error deleting personal task:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete personal task.' });
  }
}

module.exports = {
  getMyTasks,
  createPersonalTask,
  updatePersonalTask,
  deletePersonalTask
};
