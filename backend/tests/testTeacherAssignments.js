if (process.env.NODE_ENV === 'production') {
  console.error('⛔ Refusing to run tests against production environment!');
  process.exit(1);
}

const express = require('express');
const assignmentRoutes = require('../src/routes/assignmentRoutes');
const teacherRoutes = require('../src/routes/teacherRoutes');
const notificationRoutes = require('../src/routes/notificationRoutes');
const taskRoutes = require('../src/routes/taskRoutes');
const { db } = require('../src/config/firebase');
const { notifyStudentsForNewAssignment } = require('../src/services/notificationService');

const app = express();
app.use(express.json());
app.use('/api/assignments', assignmentRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/tasks', taskRoutes);

async function runTests() {
  console.log('🧪 Starting Phase B: Teacher Assignments & Class Notifications Tests...');

  const server = app.listen(5099, async () => {
    const createdDocRefs = [];
    try {
      const baseUrl = 'http://localhost:5099/api';
      const timestamp = Date.now();

      // 1. Setup Users
      const teacher1Id = `test_teacher1_${timestamp}`;
      const teacher2Id = `test_teacher2_${timestamp}`;
      const studentA1Id = `test_studentA1_${timestamp}`;
      const studentA2Id = `test_studentA2_${timestamp}`;
      const studentBId = `test_studentB_${timestamp}`;

      console.log('1️⃣ Setting up test teachers and students...');

      // Teacher 1
      await db.collection('users').doc(teacher1Id).set({
        id: teacher1Id,
        name: 'Dr. Jane Smith',
        email: `teacher1_${timestamp}@nexus.edu`,
        role: 'TEACHER'
      });
      createdDocRefs.push(db.collection('users').doc(teacher1Id));

      // Teacher 2 (different teacher)
      await db.collection('users').doc(teacher2Id).set({
        id: teacher2Id,
        name: 'Prof. Alan Turing',
        email: `teacher2_${timestamp}@nexus.edu`,
        role: 'TEACHER'
      });
      createdDocRefs.push(db.collection('users').doc(teacher2Id));

      // Student A1 (BCA, sem 5th, div A)
      await db.collection('users').doc(studentA1Id).set({
        id: studentA1Id,
        name: 'Student Alpha',
        email: `studentA1_${timestamp}@nexus.edu`,
        role: 'STUDENT',
        course: 'BCA',
        semester: '5th',
        division: 'A',
        points: 0,
        streak: 0
      });
      createdDocRefs.push(db.collection('users').doc(studentA1Id));

      // Student A2 (BCA, sem 5th, div A)
      await db.collection('users').doc(studentA2Id).set({
        id: studentA2Id,
        name: 'Student Beta',
        email: `studentA2_${timestamp}@nexus.edu`,
        role: 'STUDENT',
        course: 'BCA',
        semester: '5th',
        division: 'A',
        points: 0,
        streak: 0
      });
      createdDocRefs.push(db.collection('users').doc(studentA2Id));

      // Student B (BCA, sem 5th, div B) - Different division
      await db.collection('users').doc(studentBId).set({
        id: studentBId,
        name: 'Student Gamma',
        email: `studentB_${timestamp}@nexus.edu`,
        role: 'STUDENT',
        course: 'BCA',
        semester: '5th',
        division: 'B',
        points: 0,
        streak: 0
      });
      createdDocRefs.push(db.collection('users').doc(studentBId));

      console.log('✅ Users configured (2 in BCA Div A, 1 in BCA Div B, 2 Teachers).');

      // 2. Student attempts to create an assignment (Must return 403 Forbidden)
      console.log('2️⃣ Testing: Student cannot create an assignment (403 expected)...');
      const studentCreateRes = await fetch(`${baseUrl}/assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': studentA1Id
        },
        body: JSON.stringify({
          title: 'Illicit Assignment',
          deadline: new Date(Date.now() + 86400000 * 5).toISOString(),
          maxPoints: 100,
          course: 'BCA',
          semester: '5th',
          division: 'A'
        })
      });

      if (studentCreateRes.status !== 403) {
        throw new Error(`Expected 403 when student creates assignment, got: ${studentCreateRes.status}`);
      }
      console.log('✅ Student creation blocked with 403 Forbidden.');

      // 3. Teacher 1 creates assignment for BCA / sem 5th / div A
      console.log('3️⃣ Testing: Teacher creates assignment for BCA / sem 5 / div A...');
      const futureDeadline = new Date(Date.now() + 86400000 * 7).toISOString();
      const teacherCreateRes = await fetch(`${baseUrl}/assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': teacher1Id
        },
        body: JSON.stringify({
          title: 'Database Architecture Project',
          description: 'Design and normalize schemas to 3NF',
          subject: 'Database Systems',
          deadline: futureDeadline,
          maxPoints: 100,
          allowLate: true,
          course: 'BCA',
          semester: '5th',
          division: 'A',
          difficulty: 'HARD',
          // Malicious attempt to spoof teacher in request body
          teacherId: 'spoofed_teacher',
          teacherName: 'Spoofed Name'
        })
      });

      const teacherCreateData = await teacherCreateRes.json();
      if (!teacherCreateData.success || !teacherCreateData.data.id) {
        throw new Error('Teacher assignment creation failed: ' + JSON.stringify(teacherCreateData));
      }

      const assignmentId = teacherCreateData.data.id;
      createdDocRefs.push(db.collection('assignments').doc(assignmentId));

      // Verify teacherId and teacherName are set from verified user, not from request body
      if (teacherCreateData.data.teacherId === 'spoofed_teacher' || teacherCreateData.data.teacherName === 'Spoofed Name') {
        throw new Error('Spoofed teacher details accepted from body!');
      }
      if (teacherCreateData.data.teacherId !== teacher1Id) {
        throw new Error(`Expected teacherId=${teacher1Id}, got: ${teacherCreateData.data.teacherId}`);
      }
      console.log('✅ Teacher assignment created successfully. ID:', assignmentId);
      console.log('   Teacher verified:', teacherCreateData.data.teacherName, 'ID:', teacherCreateData.data.teacherId);

      // 4. Verify Class Targeting: Student in BCA A sees it, Student in BCA B does not
      console.log('4️⃣ Testing: Student in BCA A sees it; student in BCA B does not...');
      const studentARes = await fetch(`${baseUrl}/assignments`, {
        headers: { 'x-user-id': studentA1Id }
      });
      const studentAData = await studentARes.json();
      const studentAHasIt = studentAData.data.some(a => a.id === assignmentId);
      if (!studentAHasIt) {
        throw new Error('Student in BCA 5th Div A did NOT receive the target assignment!');
      }

      const targetAssignForStudent = studentAData.data.find(a => a.id === assignmentId);
      if (targetAssignForStudent.submissionStatus !== 'NOT_SUBMITTED') {
        throw new Error(`Expected submissionStatus 'NOT_SUBMITTED', got: ${targetAssignForStudent.submissionStatus}`);
      }
      if (!targetAssignForStudent.teacherName) {
        throw new Error('Missing teacherName on student assignment view!');
      }
      console.log('✅ Student in BCA Div A correctly sees the assignment with status NOT_SUBMITTED.');

      const studentBRes = await fetch(`${baseUrl}/assignments`, {
        headers: { 'x-user-id': studentBId }
      });
      const studentBData = await studentBRes.json();
      const studentBHasIt = studentBData.data.some(a => a.id === assignmentId);
      if (studentBHasIt) {
        throw new Error('Student in BCA 5th Div B should NOT see assignments for Div A!');
      }
      console.log('✅ Student in BCA Div B does NOT see the Div A assignment.');

      // 5. Verify Notification count equals the number of students in BCA A (exactly 2)
      console.log('5️⃣ Testing: Notification count equals number of students in BCA A (2)...');
      const notifSnapA1 = await db.collection('notifications').doc(`notif_newassign_${assignmentId}_${studentA1Id}`).get();
      const notifSnapA2 = await db.collection('notifications').doc(`notif_newassign_${assignmentId}_${studentA2Id}`).get();
      const notifSnapB = await db.collection('notifications').doc(`notif_newassign_${assignmentId}_${studentBId}`).get();

      if (!notifSnapA1.exists || !notifSnapA2.exists) {
        throw new Error('Missing expected notifications for BCA Div A students!');
      }
      if (notifSnapB.exists) {
        throw new Error('Student in Div B received unexpected notification!');
      }
      console.log('✅ Notifications delivered only to targeted BCA Div A students.');

      // 6. Idempotency / Duplicate Check: Running notification step twice doesn't create duplicates
      console.log('6️⃣ Testing: Running notification step twice does not create duplicates...');
      const secondNotifCount = await notifyStudentsForNewAssignment({
        id: assignmentId,
        title: 'Database Architecture Project',
        subject: 'Database Systems',
        deadline: futureDeadline,
        teacherName: 'Dr. Jane Smith',
        course: 'BCA',
        semester: '5th',
        division: 'A'
      });

      // Query notifications for student A1 for this assignment
      const allNotifsForA1 = await db.collection('notifications')
        .where('userId', '==', studentA1Id)
        .where('assignmentId', '==', assignmentId)
        .get();

      if (allNotifsForA1.size !== 1) {
        throw new Error(`Expected exactly 1 notification for student A1, found ${allNotifsForA1.size}!`);
      }
      console.log('✅ Duplicate protection verified: Exactly 1 notification persists per student.');

      // 7. Authorization Check: A different teacher cannot edit someone else's assignment (403)
      console.log('7️⃣ Testing: Different teacher cannot edit someone else\'s assignment (403 expected)...');
      const diffTeacherEditRes = await fetch(`${baseUrl}/assignments/${assignmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': teacher2Id
        },
        body: JSON.stringify({
          title: 'Hacked Title by Another Teacher'
        })
      });

      if (diffTeacherEditRes.status !== 403) {
        throw new Error(`Expected 403 when different teacher edits assignment, got: ${diffTeacherEditRes.status}`);
      }
      console.log('✅ Cross-teacher edit attempt blocked with 403 Forbidden.');

      // 8. Creator teacher edits assignment (succeeds)
      console.log('8️⃣ Testing: Creator teacher edits assignment details...');
      const creatorEditRes = await fetch(`${baseUrl}/assignments/${assignmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': teacher1Id
        },
        body: JSON.stringify({
          title: 'Database Architecture & Indexing Project',
          maxPoints: 120
        })
      });
      const creatorEditData = await creatorEditRes.json();
      if (!creatorEditData.success || creatorEditData.data.title !== 'Database Architecture & Indexing Project') {
        throw new Error('Creator edit failed: ' + JSON.stringify(creatorEditData));
      }
      console.log('✅ Creator teacher updated assignment successfully.');

      // 9. Teacher lists "My assignments"
      console.log('9️⃣ Testing: Teacher lists "my assignments"...');
      const teacherMyRes = await fetch(`${baseUrl}/teacher/assignments`, {
        headers: { 'x-user-id': teacher1Id }
      });
      const teacherMyData = await teacherMyRes.json();
      if (!teacherMyData.success || teacherMyData.data.length === 0) {
        throw new Error('Teacher my assignments returned empty: ' + JSON.stringify(teacherMyData));
      }
      console.log(`✅ Teacher lists "my assignments": Found ${teacherMyData.data.length} assignment(s).`);

      // 10. Private Personal Tasks ("My tasks") have NO points
      console.log('🔟 Testing: Personal tasks give 0 points...');
      const taskCreateRes = await fetch(`${baseUrl}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': studentA1Id
        },
        body: JSON.stringify({
          title: 'Review Chapter 4 slides',
          priority: 'HIGH'
        })
      });
      const taskCreateData = await taskCreateRes.json();
      if (!taskCreateData.success || taskCreateData.data.points !== 0) {
        throw new Error('Personal task did not have 0 points: ' + JSON.stringify(taskCreateData));
      }
      const taskId = taskCreateData.data.id;
      createdDocRefs.push(db.collection('tasks').doc(taskId));

      // Complete personal task
      const taskUpdateRes = await fetch(`${baseUrl}/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': studentA1Id
        },
        body: JSON.stringify({
          isCompleted: true
        })
      });
      const taskUpdateData = await taskUpdateRes.json();
      if (!taskUpdateData.success || taskUpdateData.data.points !== 0) {
        throw new Error('Completed personal task awarded points!');
      }

      // Verify student's points in Firestore did NOT change
      const studentDocAfterTask = await db.collection('users').doc(studentA1Id).get();
      if ((studentDocAfterTask.data().points || 0) !== 0) {
        throw new Error(`Student farmed points from personal task! Points: ${studentDocAfterTask.data().points}`);
      }
      console.log('✅ Personal tasks verified: 0 points awarded on completion (point farming blocked).');

      // 11. Cleanup test docs
      console.log('🧹 Cleaning up test documents...');
      const cleanupBatch = db.batch();
      for (const ref of createdDocRefs) {
        cleanupBatch.delete(ref);
      }
      // Also delete test notifications
      cleanupBatch.delete(db.collection('notifications').doc(`notif_newassign_${assignmentId}_${studentA1Id}`));
      cleanupBatch.delete(db.collection('notifications').doc(`notif_newassign_${assignmentId}_${studentA2Id}`));
      await cleanupBatch.commit();

      console.log('🎉 All Phase B Teacher Assignments & Notification Tests PASSED with 100% success!');
    } catch (err) {
      console.error('❌ Test Failure:', err);
      process.exitCode = 1;
    } finally {
      server.close();
    }
  });
}

runTests();
