if (process.env.NODE_ENV === 'production') {
  console.error('⛔ Refusing to run tests against production environment!');
  process.exit(1);
}

const express = require('express');
const assignmentRoutes = require('../src/routes/assignmentRoutes');
const { db } = require('../src/config/firebase');

const app = express();
app.use(express.json());
app.use('/api/assignments', assignmentRoutes);

async function runTests() {
  console.log('🧪 Starting Subjects, Assignments & Security Firestore Tests...');

  const server = app.listen(5088, async () => {
    try {
      const baseUrl = 'http://localhost:5088/api/assignments';
      const timestamp = Date.now();
      const testUserId = `test_student_${timestamp}`;
      const headers = {
        'Content-Type': 'application/json',
        'x-user-id': testUserId
      };

      // ====================================================
      // TEST 1: Security Fix (production mode 401 enforcement)
      // ====================================================
      console.log('1️⃣ Testing Security Fix (production mode 401 enforcement)...');
      process.env.NODE_ENV = 'production';
      const unauthRes = await fetch(`${baseUrl}/subjects`, {
        headers: { 'x-user-id': testUserId } // Should be rejected in production
      });
      if (unauthRes.status !== 401) {
        throw new Error(`Expected 401 in production for unverified request, got: ${unauthRes.status}`);
      }
      console.log('✅ Production security verified: Unverified request rejected with 401.');
      process.env.NODE_ENV = 'development'; // Restore to dev for remaining tests

      // ====================================================
      // TEST 2: Create, Read & Update Subject with Cascade
      // ====================================================
      console.log('2️⃣ Testing Subject creation and assignment batch-sync on update...');
      // Initialize user as TEACHER with class
      await db.collection('users').doc(testUserId).set({
        id: testUserId,
        name: 'Prof. Turing',
        email: `${testUserId}@nexus.edu`,
        role: 'TEACHER',
        course: 'BCA',
        semester: '4th',
        division: 'A'
      });

      const createSubRes = await fetch(`${baseUrl}/subjects`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: 'Artificial Intelligence',
          code: 'AI',
          color: '#EC4899'
        })
      });
      const createSubData = await createSubRes.json();
      if (!createSubData.success || !createSubData.data.id) {
        throw new Error('Create subject failed: ' + JSON.stringify(createSubData));
      }
      const subjectId = createSubData.data.id;
      console.log('✅ Subject created:', createSubData.data.name, 'ID:', subjectId);

      // Create assignment under this subject
      const createAssignRes = await fetch(baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: 'Neural Network Project',
          subject_id: subjectId,
          deadline: new Date(Date.now() + 86400000 * 3).toISOString(),
          maxPoints: 100,
          course: 'BCA',
          semester: '4th',
          division: 'A',
          difficulty: 'HARD',
          estimated_hours: 4.0,
          description: 'Build a CNN in PyTorch'
        })
      });
      const createAssignData = await createAssignRes.json();
      if (!createAssignData.success || !createAssignData.data.id) {
        throw new Error('Create assignment failed: ' + JSON.stringify(createAssignData));
      }
      const assignmentId = createAssignData.data.id;
      console.log('✅ Assignment created under subject. Priority score:', createAssignData.data.priority_score);

      // Update subject name and color -> should cascade update assignment document
      console.log('Testing subject update and batch write to assignments...');
      const updateSubRes = await fetch(`${baseUrl}/subjects/${subjectId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          name: 'Advanced Neural Systems',
          color: '#8B5CF6'
        })
      });
      const updateSubData = await updateSubRes.json();
      if (!updateSubData.success || updateSubData.data.name !== 'Advanced Neural Systems') {
        throw new Error('Subject update failed: ' + JSON.stringify(updateSubData));
      }

      // Verify that assignment document has updated subjectName and subjectColor
      const verifyAssignDoc = await db.collection('assignments').doc(assignmentId).get();
      const assignData = verifyAssignDoc.data();
      if (assignData.subjectName !== 'Advanced Neural Systems' || assignData.subjectColor !== '#8B5CF6') {
        throw new Error(`Assignment batch update mismatch: subjectName=${assignData.subjectName}, color=${assignData.subjectColor}`);
      }
      console.log('✅ Subject update successfully cascaded to assignment document via batch write.');

      // ====================================================
      // TEST 3: Subtasks Toggle & Progress Recalculation
      // ====================================================
      console.log('3️⃣ Testing Subtasks: Add, Toggle & Progress Update...');
      const addSubtaskRes = await fetch(`${baseUrl}/${assignmentId}/subtasks`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: 'Prepare dataset preprocessing script',
          estimated_minutes: 45
        })
      });
      const addSubtaskData = await addSubtaskRes.json();
      if (!addSubtaskData.success || !addSubtaskData.data.id) {
        throw new Error('Add subtask failed: ' + JSON.stringify(addSubtaskData));
      }
      const subtaskId = addSubtaskData.data.id;
      console.log('✅ Subtask added to embedded array:', addSubtaskData.data.title, 'ID:', subtaskId);

      // Toggle subtask to completed
      const updateSubtaskRes = await fetch(`${baseUrl}/subtasks/${subtaskId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          is_completed: 1
        })
      });
      const updateSubtaskData = await updateSubtaskRes.json();
      if (!updateSubtaskData.success || !updateSubtaskData.data.isCompleted) {
        throw new Error('Toggle subtask failed: ' + JSON.stringify(updateSubtaskData));
      }

      // Verify assignment progress updated to 100%
      const verifyProgressDoc = await db.collection('assignments').doc(assignmentId).get();
      const progressData = verifyProgressDoc.data();
      if (progressData.progress !== 100 || progressData.status !== 'COMPLETED') {
        throw new Error(`Expected progress 100 and COMPLETED status, got: progress=${progressData.progress}, status=${progressData.status}`);
      }
      console.log('✅ Subtask completed. Assignment progress auto-updated to 100% and status COMPLETED.');

      // ====================================================
      // TEST 4: Resources Embedded Array
      // ====================================================
      console.log('4️⃣ Testing Resources: Add & embedded storage...');
      const addResRes = await fetch(`${baseUrl}/${assignmentId}/resources`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: 'PyTorch Documentation',
          type: 'URL',
          url_or_path: 'https://pytorch.org'
        })
      });
      const addResData = await addResRes.json();
      if (!addResData.success || !addResData.data.id) {
        throw new Error('Add resource failed: ' + JSON.stringify(addResData));
      }
      console.log('✅ Resource added to embedded array:', addResData.data.title);

      // ====================================================
      // TEST 5: Filtering & In-memory Text Search
      // ====================================================
      console.log('5️⃣ Testing Search and Filtering...');
      const searchRes = await fetch(`${baseUrl}?search=neural`, { headers });
      const searchData = await searchRes.json();
      if (!searchData.success || searchData.data.length === 0) {
        throw new Error('Search failed to find assignment matching "neural"');
      }
      console.log(`✅ Text search returned ${searchData.data.length} match for "neural".`);

      // ====================================================
      // TEST 6: Ownership Check Enforcement
      // ====================================================
      console.log('6️⃣ Testing Ownership Protection (different student)...');
      const unauthorizedHeaders = {
        'Content-Type': 'application/json',
        'x-user-id': 'unauthorized_attacker_id'
      };
      const attackRes = await fetch(`${baseUrl}/${assignmentId}`, {
        method: 'DELETE',
        headers: unauthorizedHeaders
      });
      if (attackRes.status !== 403) {
        throw new Error(`Expected 403 Forbidden for unauthorized deletion, got: ${attackRes.status}`);
      }
      console.log('✅ Ownership check passed: Unauthorized access blocked with 403 Forbidden.');

      // ====================================================
      // TEST 7: Cascade Delete on Subject Deletion
      // ====================================================
      console.log('7️⃣ Testing Subject cascade deletion of assignments...');
      const deleteSubRes = await fetch(`${baseUrl}/subjects/${subjectId}`, {
        method: 'DELETE',
        headers
      });
      const deleteSubData = await deleteSubRes.json();
      if (!deleteSubData.success) {
        throw new Error('Delete subject failed: ' + JSON.stringify(deleteSubData));
      }

      // Verify that both subject and assignment are deleted from Firestore
      const verifyDeletedSub = await db.collection('subjects').doc(subjectId).get();
      const verifyDeletedAssign = await db.collection('assignments').doc(assignmentId).get();
      if (verifyDeletedSub.exists || verifyDeletedAssign.exists) {
        throw new Error('Cascade deletion failed: subject or assignment still exists in Firestore.');
      }
      console.log('✅ Subject and all associated assignments deleted cleanly via batch write cascade.');

      // Clean up test student user doc if any
      await db.collection('users').doc(testUserId).delete();

      console.log('🎉 All Subjects, Assignments, Subtasks & Security Tests PASSED!');
      server.close(() => process.exit(0));
    } catch (err) {
      console.error('❌ Test Failure:', err);
      server.close(() => process.exit(1));
    }
  });
}

runTests();
