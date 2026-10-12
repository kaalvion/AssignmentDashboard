if (process.env.NODE_ENV === 'production') {
  console.error('⛔ Refusing to run tests against production environment!');
  process.exit(1);
}

const express = require('express');
const groupRoutes = require('../src/routes/groupRoutes');
const { db } = require('../src/config/firebase');

const app = express();
app.use(express.json());
app.use('/api/groups', groupRoutes);

async function runTests() {
  console.log('🧪 Starting Study Groups Firestore Tests...');

  const server = app.listen(5055, async () => {
    try {
      const baseUrl = 'http://localhost:5055/api/groups';
      const timestamp = Date.now();
      const leaderId = `test_leader_${timestamp}`;
      const memberId = `test_member_${timestamp}`;
      const outsiderId = `test_outsider_${timestamp}`;

      const leaderHeaders = { 'Content-Type': 'application/json', 'x-user-id': leaderId };
      const memberHeaders = { 'Content-Type': 'application/json', 'x-user-id': memberId };
      const outsiderHeaders = { 'Content-Type': 'application/json', 'x-user-id': outsiderId };

      // 1. Create Group
      console.log('1️⃣ Testing Group Creation (Leader role assignment)...');
      const createRes = await fetch(baseUrl, {
        method: 'POST',
        headers: leaderHeaders,
        body: JSON.stringify({
          name: 'Distributed Systems Project Group',
          description: 'Raft consensus algorithm implementation'
        })
      });
      const createData = await createRes.json();
      if (!createData.success || !createData.data.id || !createData.data.code) {
        throw new Error('Create group failed: ' + JSON.stringify(createData));
      }
      const groupId = createData.data.id;
      const groupCode = createData.data.code;
      console.log('✅ Group created successfully. Code:', groupCode, 'ID:', groupId);

      // 2. Join by Code
      console.log('2️⃣ Testing Join by Invite Code...');
      const joinRes = await fetch(`${baseUrl}/join`, {
        method: 'POST',
        headers: memberHeaders,
        body: JSON.stringify({ code: groupCode })
      });
      const joinData = await joinRes.json();
      if (!joinData.success) {
        throw new Error('Join group failed: ' + JSON.stringify(joinData));
      }
      console.log('✅ Member successfully joined group.');

      // 3. Double Join Attempt (should return 409)
      console.log('3️⃣ Testing Double Join Protection...');
      const doubleJoinRes = await fetch(`${baseUrl}/join`, {
        method: 'POST',
        headers: memberHeaders,
        body: JSON.stringify({ code: groupCode })
      });
      if (doubleJoinRes.status !== 409) {
        throw new Error(`Expected 409 on double join, got: ${doubleJoinRes.status}`);
      }
      console.log('✅ Double join blocked with 409 Conflict.');

      // 4. List My Groups
      console.log('4️⃣ Testing List Groups for Member...');
      const listRes = await fetch(baseUrl, { headers: memberHeaders });
      const listData = await listRes.json();
      if (!listData.success || listData.data.length === 0 || !listData.data.some(g => g.id === groupId)) {
        throw new Error('Member cannot see joined group in list.');
      }
      console.log('✅ Member sees joined group. Member count:', listData.data[0].member_count);

      // 5. Outsider View Permission Check (403 expected)
      console.log('5️⃣ Testing Permission: Outsider View Denial...');
      const outsiderRes = await fetch(`${baseUrl}/${groupId}`, { headers: outsiderHeaders });
      if (outsiderRes.status !== 403) {
        throw new Error(`Expected 403 for outsider view, got: ${outsiderRes.status}`);
      }
      console.log('✅ Outsider view denied with 403 Forbidden.');

      // 6. Task Assignment Permissions
      console.log('6️⃣ Testing Task Assignment Permissions...');
      // Member attempts to assign task -> 403
      const memberAssignRes = await fetch(`${baseUrl}/${groupId}/tasks`, {
        method: 'POST',
        headers: memberHeaders,
        body: JSON.stringify({ title: 'Raft Log Replication' })
      });
      if (memberAssignRes.status !== 403) {
        throw new Error(`Expected 403 for non-leader task assignment, got: ${memberAssignRes.status}`);
      }
      console.log('✅ Non-leader task assignment denied with 403.');

      // Leader assigns task to member
      const leaderAssignRes = await fetch(`${baseUrl}/${groupId}/tasks`, {
        method: 'POST',
        headers: leaderHeaders,
        body: JSON.stringify({
          title: 'Implement Raft Heartbeats',
          assigned_user_id: memberId
        })
      });
      const leaderAssignData = await leaderAssignRes.json();
      if (!leaderAssignData.success || !leaderAssignData.data.id) {
        throw new Error('Leader task assignment failed: ' + JSON.stringify(leaderAssignData));
      }
      const taskId = leaderAssignData.data.id;
      console.log('✅ Leader assigned task to member. Task ID:', taskId);

      // 7. Task Update Permissions
      console.log('7️⃣ Testing Task Status Update...');
      const outsiderUpdateRes = await fetch(`${baseUrl}/${groupId}/tasks/${taskId}`, {
        method: 'PUT',
        headers: outsiderHeaders,
        body: JSON.stringify({ status: 'COMPLETED' })
      });
      if (outsiderUpdateRes.status !== 403 && outsiderUpdateRes.status !== 404) {
        throw new Error(`Expected 403/404 for outsider task update, got: ${outsiderUpdateRes.status}`);
      }

      // Member updates their own task -> SUCCESS
      const memberUpdateRes = await fetch(`${baseUrl}/${groupId}/tasks/${taskId}`, {
        method: 'PUT',
        headers: memberHeaders,
        body: JSON.stringify({ status: 'COMPLETED' })
      });
      const memberUpdateData = await memberUpdateRes.json();
      if (!memberUpdateData.success || memberUpdateData.data.status !== 'COMPLETED') {
        throw new Error('Member failed to update assigned task.');
      }
      console.log('✅ Member updated their assigned task to COMPLETED.');

      // 8. Delete Group Permissions (Non-leader rejected with 403)
      console.log('8️⃣ Testing Group Deletion Permissions...');
      const memberDeleteRes = await fetch(`${baseUrl}/${groupId}`, {
        method: 'DELETE',
        headers: memberHeaders
      });
      if (memberDeleteRes.status !== 403) {
        throw new Error(`Expected 403 for member group deletion, got: ${memberDeleteRes.status}`);
      }
      console.log('✅ Member deletion denied with 403 Forbidden.');

      // 9. Leave Group
      console.log('9️⃣ Testing Member Leave Group...');
      const leaveRes = await fetch(`${baseUrl}/${groupId}/leave`, {
        method: 'POST',
        headers: memberHeaders
      });
      const leaveData = await leaveRes.json();
      if (!leaveData.success) {
        throw new Error('Member leave failed: ' + JSON.stringify(leaveData));
      }
      console.log('✅ Member successfully left the group.');

      // 10. Leader Leave (Sole member -> Cascades delete)
      console.log('🔟 Testing Leader Last Member Leave (Cascades group & tasks deletion)...');
      const leaderLeaveRes = await fetch(`${baseUrl}/${groupId}/leave`, {
        method: 'POST',
        headers: leaderHeaders
      });
      const leaderLeaveData = await leaderLeaveRes.json();
      if (!leaderLeaveData.success) {
        throw new Error('Leader sole leave failed: ' + JSON.stringify(leaderLeaveData));
      }

      const verifyGroup = await db.collection('groups').doc(groupId).get();
      const verifyTask = await db.collection('groups').doc(groupId).collection('tasks').doc(taskId).get();
      if (verifyGroup.exists || verifyTask.exists) {
        throw new Error('Expected group and subcollection tasks to be deleted from Firestore.');
      }
      console.log('✅ Group and subcollection tasks deleted completely via batch write.');

      // Cleanup user docs if any
      await db.collection('users').doc(leaderId).delete();
      await db.collection('users').doc(memberId).delete();
      await db.collection('users').doc(outsiderId).delete();

      console.log('🎉 All Groups Firestore tests PASSED with 100% success!');
      server.close(() => process.exit(0));
    } catch (err) {
      console.error('❌ Test Failure:', err);
      server.close(() => process.exit(1));
    }
  });
}

runTests();
