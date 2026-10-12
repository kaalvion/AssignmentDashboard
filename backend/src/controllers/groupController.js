const { db, admin } = require('../config/firebase');

function formatGroupResponse(group, currentUserId = null) {
  if (!group) return null;
  const memberIds = group.memberIds || [];
  const members = group.members || [];
  const myMembership = members.find(m => m.userId === currentUserId);
  const myRole = myMembership ? myMembership.role : (group.creatorId === currentUserId ? 'LEADER' : 'MEMBER');

  return {
    ...group,
    id: group.id,
    creatorId: group.creatorId || group.creator_id,
    creator_id: group.creatorId || group.creator_id,
    memberIds,
    members,
    memberCount: memberIds.length,
    member_count: memberIds.length,
    role: myRole,
    myRole
  };
}

async function getGroups(req, res) {
  try {
    const userId = req.user.id;
    const snap = await db.collection('groups').where('memberIds', 'array-contains', userId).get();

    const groups = snap.docs.map(doc => {
      const data = doc.data();
      return formatGroupResponse({ id: doc.id, ...data }, userId);
    });

    // Sort by createdAt descending
    groups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.json({ success: true, data: groups });
  } catch (error) {
    console.error('Error fetching groups:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch groups.' });
  }
}

async function getGroupById(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const groupRef = db.collection('groups').doc(id);
    const groupDoc = await groupRef.get();

    if (!groupDoc.exists) {
      return res.status(404).json({ success: false, message: 'Study group not found.' });
    }

    const groupData = groupDoc.data();
    const memberIds = groupData.memberIds || [];

    // Permission check: only members can view
    if (!memberIds.includes(userId)) {
      return res.status(403).json({ success: false, message: 'You are not a member of this study group.' });
    }

    // Fetch tasks from subcollection groups/{id}/tasks
    const taskSnap = await groupRef.collection('tasks').get();
    const tasks = taskSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Sort tasks by createdAt descending
    tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
    const groupProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const formatted = formatGroupResponse({ id: groupDoc.id, ...groupData }, userId);

    return res.json({
      success: true,
      data: {
        ...formatted,
        groupProgress,
        tasks
      }
    });
  } catch (error) {
    console.error('Error fetching group by ID:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch group details.' });
  }
}

async function createGroup(req, res) {
  try {
    const { name, description } = req.body;
    const userId = req.user.id;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Group name is required.' });
    }

    // Generate unique invite code and ensure it is not already used
    let code = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      code = 'GRP-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const existing = await db.collection('groups').where('code', '==', code).limit(1).get();
      if (existing.empty) {
        isUnique = true;
      }
      attempts++;
    }

    const groupRef = db.collection('groups').doc();
    const groupData = {
      id: groupRef.id,
      name: name.trim(),
      description: description ? description.trim() : '',
      creatorId: userId,
      creator_id: userId,
      code,
      memberIds: [userId],
      members: [
        {
          userId,
          name: req.user.name || 'Student',
          email: req.user.email || '',
          avatarUrl: req.user.avatarUrl || req.user.avatar_url || null,
          role: 'LEADER',
          joinedAt: new Date().toISOString()
        }
      ],
      createdAt: new Date().toISOString()
    };

    await groupRef.set(groupData);

    return res.status(201).json({
      success: true,
      data: formatGroupResponse(groupData, userId)
    });
  } catch (error) {
    console.error('Error creating group:', error);
    return res.status(500).json({ success: false, message: 'Failed to create group.' });
  }
}

async function joinGroup(req, res) {
  try {
    const { code } = req.body;
    const userId = req.user.id;

    if (!code || !code.trim()) {
      return res.status(400).json({ success: false, message: 'Group invite code is required.' });
    }

    const snap = await db.collection('groups').where('code', '==', code.trim().toUpperCase()).limit(1).get();
    if (snap.empty) {
      return res.status(404).json({ success: false, message: 'Invalid group code.' });
    }

    const groupDoc = snap.docs[0];
    const group = groupDoc.data();
    const memberIds = group.memberIds || [];

    if (memberIds.includes(userId)) {
      return res.status(409).json({ success: false, message: 'You are already a member of this group.' });
    }

    const newMemberObj = {
      userId,
      name: req.user.name || 'Student',
      email: req.user.email || '',
      avatarUrl: req.user.avatarUrl || req.user.avatar_url || null,
      role: 'MEMBER',
      joinedAt: new Date().toISOString()
    };

    // Atomically add to memberIds and members without duplicates
    await groupDoc.ref.update({
      memberIds: admin.firestore.FieldValue.arrayUnion(userId),
      members: admin.firestore.FieldValue.arrayUnion(newMemberObj)
    });

    return res.json({
      success: true,
      message: `Successfully joined ${group.name}!`,
      data: { groupId: groupDoc.id }
    });
  } catch (error) {
    console.error('Error joining group:', error);
    return res.status(500).json({ success: false, message: 'Failed to join group.' });
  }
}

async function leaveGroup(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const groupRef = db.collection('groups').doc(id);
    const groupDoc = await groupRef.get();

    if (!groupDoc.exists) {
      return res.status(404).json({ success: false, message: 'Group not found.' });
    }

    const group = groupDoc.data();
    const memberIds = group.memberIds || [];
    const members = group.members || [];

    if (!memberIds.includes(userId)) {
      return res.status(403).json({ success: false, message: 'You are not a member of this group.' });
    }

    const myMembership = members.find(m => m.userId === userId);
    const isLeader = myMembership && myMembership.role === 'LEADER';

    // If only 1 member left in the group, delete the group and tasks
    if (memberIds.length === 1) {
      const taskSnap = await groupRef.collection('tasks').get();
      const batch = db.batch();
      taskSnap.docs.forEach(d => batch.delete(d.ref));
      batch.delete(groupRef);
      await batch.commit();

      return res.json({
        success: true,
        message: 'You were the last member. Group and tasks deleted successfully.'
      });
    }

    // Leader cannot leave unless transferring leadership first or being the last member
    if (isLeader) {
      return res.status(400).json({
        success: false,
        message: 'A LEADER cannot leave the group without transferring leadership first or being the sole member.'
      });
    }

    // Remove user from memberIds and members
    const updatedMemberIds = memberIds.filter(uid => uid !== userId);
    const updatedMembers = members.filter(m => m.userId !== userId);

    await groupRef.update({
      memberIds: updatedMemberIds,
      members: updatedMembers
    });

    return res.json({ success: true, message: 'Left study group successfully.' });
  } catch (error) {
    console.error('Error leaving group:', error);
    return res.status(500).json({ success: false, message: 'Failed to leave group.' });
  }
}

async function deleteGroup(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const groupRef = db.collection('groups').doc(id);
    const groupDoc = await groupRef.get();

    if (!groupDoc.exists) {
      return res.status(404).json({ success: false, message: 'Group not found.' });
    }

    const group = groupDoc.data();
    const members = group.members || [];
    const myMembership = members.find(m => m.userId === userId);
    const isLeader = myMembership ? myMembership.role === 'LEADER' : group.creatorId === userId;

    if (!isLeader) {
      return res.status(403).json({ success: false, message: 'Only the LEADER can delete this group.' });
    }

    // Delete tasks subcollection via batch write and delete group
    const taskSnap = await groupRef.collection('tasks').get();
    const batch = db.batch();
    taskSnap.docs.forEach(d => batch.delete(d.ref));
    batch.delete(groupRef);
    await batch.commit();

    return res.json({ success: true, message: 'Study group and all tasks deleted successfully.' });
  } catch (error) {
    console.error('Error deleting group:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete group.' });
  }
}

async function removeMember(req, res) {
  try {
    const { id, member_id } = req.params;
    const userId = req.user.id;

    const groupRef = db.collection('groups').doc(id);
    const groupDoc = await groupRef.get();

    if (!groupDoc.exists) {
      return res.status(404).json({ success: false, message: 'Group not found.' });
    }

    const group = groupDoc.data();
    const members = group.members || [];
    const myMembership = members.find(m => m.userId === userId);
    const isLeader = myMembership ? myMembership.role === 'LEADER' : group.creatorId === userId;

    if (!isLeader) {
      return res.status(403).json({ success: false, message: 'Only the LEADER can remove members.' });
    }

    if (member_id === userId) {
      return res.status(400).json({ success: false, message: 'Leader cannot remove themselves. Use leave instead.' });
    }

    const updatedMemberIds = (group.memberIds || []).filter(uid => uid !== member_id);
    const updatedMembers = members.filter(m => m.userId !== member_id);

    await groupRef.update({
      memberIds: updatedMemberIds,
      members: updatedMembers
    });

    return res.json({ success: true, message: 'Member removed successfully.' });
  } catch (error) {
    console.error('Error removing member:', error);
    return res.status(500).json({ success: false, message: 'Failed to remove member.' });
  }
}

async function addGroupTask(req, res) {
  try {
    const { id: groupId } = req.params;
    const { title, assigned_user_id, deadline } = req.body;
    const userId = req.user.id;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Task title is required.' });
    }

    const groupRef = db.collection('groups').doc(groupId);
    const groupDoc = await groupRef.get();

    if (!groupDoc.exists) {
      return res.status(404).json({ success: false, message: 'Group not found.' });
    }

    const group = groupDoc.data();
    const members = group.members || [];
    const myMembership = members.find(m => m.userId === userId);

    if (!myMembership) {
      return res.status(403).json({ success: false, message: 'You are not a member of this group.' });
    }

    // Permission check: only LEADER can assign tasks
    if (myMembership.role !== 'LEADER') {
      return res.status(403).json({ success: false, message: 'Only the group LEADER can assign tasks.' });
    }

    let assignedUserName = null;
    if (assigned_user_id) {
      const assignedMember = members.find(m => m.userId === assigned_user_id);
      assignedUserName = assignedMember ? assignedMember.name : null;
    }

    const taskRef = groupRef.collection('tasks').doc();
    const taskData = {
      id: taskRef.id,
      groupId,
      title: title.trim(),
      assignedUserId: assigned_user_id || null,
      assigned_user_id: assigned_user_id || null,
      assignedUserName,
      assigned_user_name: assignedUserName,
      deadline: deadline || null,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    await taskRef.set(taskData);
    return res.status(201).json({ success: true, data: taskData });
  } catch (error) {
    console.error('Error adding group task:', error);
    return res.status(500).json({ success: false, message: 'Failed to add task.' });
  }
}

async function updateGroupTask(req, res) {
  try {
    const taskId = req.params.task_id;
    const groupId = req.params.id;
    const { status, title, assigned_user_id, deadline } = req.body;
    const userId = req.user.id;

    // Find the task across groups if groupId is not in params
    let taskDoc = null;
    let targetGroupDoc = null;

    if (groupId) {
      const gRef = db.collection('groups').doc(groupId);
      targetGroupDoc = await gRef.get();
      if (targetGroupDoc.exists) {
        const tDoc = await gRef.collection('tasks').doc(taskId).get();
        if (tDoc.exists) taskDoc = tDoc;
      }
    } else {
      // Find task doc across groups by scanning user's groups
      const myGroupsSnap = await db.collection('groups').where('memberIds', 'array-contains', userId).get();
      for (const gDoc of myGroupsSnap.docs) {
        const tDoc = await gDoc.ref.collection('tasks').doc(taskId).get();
        if (tDoc.exists) {
          taskDoc = tDoc;
          targetGroupDoc = gDoc;
          break;
        }
      }
    }

    if (!taskDoc || !targetGroupDoc) {
      return res.status(404).json({ success: false, message: 'Task not found or access denied.' });
    }

    const group = targetGroupDoc.data();
    const members = group.members || [];
    const myMembership = members.find(m => m.userId === userId);

    if (!myMembership) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    const task = taskDoc.data();
    const isLeader = myMembership.role === 'LEADER';
    const isAssignee = task.assignedUserId === userId || task.assigned_user_id === userId;

    // Permission check: a member can update status of their own assigned tasks; LEADER can update any
    if (!isLeader && !isAssignee) {
      return res.status(403).json({ success: false, message: 'You can only update tasks assigned to you.' });
    }

    const updatePayload = {
      updatedAt: new Date().toISOString()
    };
    if (status !== undefined) updatePayload.status = status;
    if (isLeader) {
      if (title !== undefined) updatePayload.title = title.trim();
      if (assigned_user_id !== undefined) {
        updatePayload.assignedUserId = assigned_user_id;
        updatePayload.assigned_user_id = assigned_user_id;
        const assignedMember = members.find(m => m.userId === assigned_user_id);
        updatePayload.assignedUserName = assignedMember ? assignedMember.name : null;
        updatePayload.assigned_user_name = assignedMember ? assignedMember.name : null;
      }
      if (deadline !== undefined) updatePayload.deadline = deadline;
    }

    await taskDoc.ref.update(updatePayload);

    const updatedTask = {
      ...task,
      ...updatePayload
    };

    return res.json({ success: true, data: updatedTask });
  } catch (error) {
    console.error('Error updating group task:', error);
    return res.status(500).json({ success: false, message: 'Failed to update task.' });
  }
}

module.exports = {
  getGroups,
  getGroupById,
  createGroup,
  joinGroup,
  leaveGroup,
  deleteGroup,
  removeMember,
  addGroupTask,
  updateGroupTask
};
