const { query, get, run } = require('../config/db');

async function getGroups(req, res) {
  try {
    const userId = req.user.id;
    const groups = await query(
      `SELECT g.*, gm.role, 
        (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count
       FROM groups g
       JOIN group_members gm ON g.id = gm.group_id
       WHERE gm.user_id = ?
       ORDER BY g.created_at DESC`,
      [userId]
    );

    return res.json({ success: true, data: groups });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch groups.' });
  }
}

async function getGroupById(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const membership = await get(`SELECT role FROM group_members WHERE group_id = ? AND user_id = ?`, [id, userId]);
    if (!membership) {
      return res.status(403).json({ success: false, message: 'You are not a member of this study group.' });
    }

    const group = await get(`SELECT * FROM groups WHERE id = ?`, [id]);
    const members = await query(
      `SELECT u.id, u.name, u.email, u.avatar_url, gm.role 
       FROM group_members gm 
       JOIN users u ON gm.user_id = u.id 
       WHERE gm.group_id = ?`,
      [id]
    );

    const tasks = await query(
      `SELECT gt.*, u.name as assigned_user_name 
       FROM group_tasks gt 
       LEFT JOIN users u ON gt.assigned_user_id = u.id 
       WHERE gt.group_id = ? 
       ORDER BY gt.created_at DESC`,
      [id]
    );

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
    const groupProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return res.json({
      success: true,
      data: {
        ...group,
        myRole: membership.role,
        groupProgress,
        members,
        tasks
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch group details.' });
  }
}

async function createGroup(req, res) {
  try {
    const { name, description } = req.body;
    const userId = req.user.id;

    if (!name) return res.status(400).json({ success: false, message: 'Group name is required.' });

    const code = 'GRP-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    const result = await run(
      `INSERT INTO groups (name, description, creator_id, code) VALUES (?, ?, ?, ?)`,
      [name, description || '', userId, code]
    );

    const groupId = result.id;
    await run(`INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, 'LEADER')`, [groupId, userId]);

    const created = await get(`SELECT * FROM groups WHERE id = ?`, [groupId]);
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create group.' });
  }
}

async function joinGroup(req, res) {
  try {
    const { code } = req.body;
    const userId = req.user.id;

    if (!code) return res.status(400).json({ success: false, message: 'Group invite code is required.' });

    const group = await get(`SELECT id, name FROM groups WHERE code = ?`, [code.trim().toUpperCase()]);
    if (!group) return res.status(404).json({ success: false, message: 'Invalid group code.' });

    const existing = await get(`SELECT id FROM group_members WHERE group_id = ? AND user_id = ?`, [group.id, userId]);
    if (existing) return res.status(409).json({ success: false, message: 'You are already a member of this group.' });

    await run(`INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, 'MEMBER')`, [group.id, userId]);

    return res.json({ success: true, message: `Successfully joined ${group.name}!`, data: { groupId: group.id } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to join group.' });
  }
}

async function addGroupTask(req, res) {
  try {
    const { id: groupId } = req.params;
    const { title, assigned_user_id, deadline } = req.body;

    if (!title) return res.status(400).json({ success: false, message: 'Task title is required.' });

    const membership = await get(`SELECT role FROM group_members WHERE group_id = ? AND user_id = ?`, [groupId, req.user.id]);
    if (!membership) return res.status(403).json({ success: false, message: 'Unauthorized.' });

    const result = await run(
      `INSERT INTO group_tasks (group_id, assigned_user_id, title, deadline) VALUES (?, ?, ?, ?)`,
      [groupId, assigned_user_id || null, title, deadline || null]
    );

    const created = await get(`SELECT * FROM group_tasks WHERE id = ?`, [result.id]);
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to add group task.' });
  }
}

async function updateGroupTask(req, res) {
  try {
    const { task_id } = req.params;
    const { status } = req.body;

    const task = await get(`SELECT gt.* FROM group_tasks gt JOIN group_members gm ON gt.group_id = gm.group_id WHERE gt.id = ? AND gm.user_id = ?`, [task_id, req.user.id]);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found or access denied.' });

    await run(`UPDATE group_tasks SET status = ? WHERE id = ?`, [status, task_id]);
    const updated = await get(`SELECT * FROM group_tasks WHERE id = ?`, [task_id]);
    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update task.' });
  }
}

module.exports = {
  getGroups,
  getGroupById,
  createGroup,
  joinGroup,
  addGroupTask,
  updateGroupTask
};
