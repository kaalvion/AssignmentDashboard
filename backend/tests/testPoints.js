/**
 * Comprehensive Test Suite for Phase D: Points, Early Bonuses, Streaks,
 * Missed Penalties, Lazy Triggers, and Daily Cron.
 */

const assert = require('assert');
const app = require('../src/server');
const { db, bucket } = require('../src/config/firebase');

const CRON_SECRET = process.env.CRON_SECRET || 'dev_cron_secret_nexus_2026';

// In-memory mock for Google Cloud Storage files
const mockStorageFiles = new Map();

function setupStorageMocking() {
  if (!bucket) return;
  const originalFile = bucket.file.bind(bucket);

  bucket.file = function (filePath) {
    const realFile = originalFile(filePath);

    function getMock() {
      return mockStorageFiles.get(filePath);
    }

    realFile.getSignedUrl = async function () {
      return [`https://storage.googleapis.com/${bucket.name}/${filePath}?mock_v4=true`];
    };

    realFile.exists = async function () {
      return [mockStorageFiles.has(filePath)];
    };

    realFile.getMetadata = async function () {
      const mock = getMock();
      if (mock) {
        return [{ size: mock.buffer.length, contentType: mock.contentType }];
      }
      return [{ size: 0, contentType: 'application/octet-stream' }];
    };

    realFile.download = async function (opts = {}) {
      const mock = getMock();
      if (mock) {
        const start = opts.start || 0;
        const end = opts.end !== undefined ? opts.end + 1 : mock.buffer.length;
        return [mock.buffer.subarray(start, end)];
      }
      return [Buffer.from('')];
    };

    realFile.delete = async function () {
      mockStorageFiles.delete(filePath);
      return [{}];
    };

    realFile.copy = async function (destFile) {
      const mock = getMock();
      if (mock) {
        const destPath = typeof destFile === 'string' ? destFile : (destFile.name || filePath.replace('/tmp/', '/'));
        mockStorageFiles.set(destPath, { ...mock });
        return [{}];
      }
      return [{}];
    };

    return realFile;
  };
}

async function runTests() {
  console.log('🧪 Starting Phase D: Points, Early Bonuses, Missed Penalties & Cron Tests...');

  setupStorageMocking();

  const server = app.listen(5088, async () => {
    const baseUrl = 'http://localhost:5088/api';
    const createdDocRefs = [];
    const timestamp = Date.now();

    try {
      const teacherId = `test_teacher_${timestamp}`;
      const student1Id = `student_p1_${timestamp}`;
      const student2Id = `student_p2_${timestamp}`; // Will test floor at 0

      // Setup Teacher
      await db.collection('users').doc(teacherId).set({
        id: teacherId,
        name: 'Dr. Turing',
        email: `turing_${timestamp}@nexus.edu`,
        role: 'TEACHER'
      });
      createdDocRefs.push(db.collection('users').doc(teacherId));

      // Setup Student 1 (Initial 100 points, streak 5)
      await db.collection('users').doc(student1Id).set({
        id: student1Id,
        name: 'Grace Hopper',
        email: `grace_${timestamp}@nexus.edu`,
        role: 'STUDENT',
        course: 'BCA',
        semester: '5TH',
        division: 'A',
        points: 100,
        streak: 1
      });
      createdDocRefs.push(db.collection('users').doc(student1Id));

      // Setup Student 2 (Initial 10 points, streak 0 - for floor at 0 test)
      await db.collection('users').doc(student2Id).set({
        id: student2Id,
        name: 'Charles Babbage',
        email: `charles_${timestamp}@nexus.edu`,
        role: 'STUDENT',
        course: 'BCA',
        semester: '5TH',
        division: 'A',
        points: 10,
        streak: 0
      });
      createdDocRefs.push(db.collection('users').doc(student2Id));

      // Assignment 1: maxPoints = 50, deadline in 48h (Eligible for +30% early bonus)
      const assign1Ref = db.collection('assignments').doc();
      const assign1Id = assign1Ref.id;
      createdDocRefs.push(assign1Ref);
      await assign1Ref.set({
        id: assign1Id,
        title: 'Algorithms Assignment 1',
        course: 'BCA',
        semester: '5TH',
        division: 'A',
        deadline: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
        allowLate: true,
        maxPoints: 50,
        teacherId,
        teacherName: 'Dr. Turing',
        status: 'ACTIVE'
      });

      // Assignment 2: maxPoints = 50, deadline in 12h (On-time, but NO early bonus)
      const assign2Ref = db.collection('assignments').doc();
      const assign2Id = assign2Ref.id;
      createdDocRefs.push(assign2Ref);
      await assign2Ref.set({
        id: assign2Id,
        title: 'Operating Systems Lab',
        course: 'BCA',
        semester: '5TH',
        division: 'A',
        deadline: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
        allowLate: true,
        maxPoints: 50,
        teacherId,
        teacherName: 'Dr. Turing',
        status: 'ACTIVE'
      });

      // Assignment 3: maxPoints = 50, deadline 2h in past, allowLate = true (For late submission test)
      const assign3Ref = db.collection('assignments').doc();
      const assign3Id = assign3Ref.id;
      createdDocRefs.push(assign3Ref);
      await assign3Ref.set({
        id: assign3Id,
        title: 'Database Architecture Exam',
        course: 'BCA',
        semester: '5TH',
        division: 'A',
        deadline: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        allowLate: true,
        maxPoints: 50,
        teacherId,
        teacherName: 'Dr. Turing',
        status: 'ACTIVE'
      });

      // Valid PDF buffer for test uploads
      const validPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');

      // ==========================================================
      // TEST 1: ON-TIME + EARLY BONUS (+100% + 30% = +65 points)
      // ==========================================================
      console.log('1️⃣ Testing: On-time submission with early bonus (+100% + 30%)...');
      mockStorageFiles.set(`submissions/${assign1Id}/tmp/${student1Id}.pdf`, {
        buffer: validPdfBuffer,
        contentType: 'application/pdf'
      });

      const confirm1Res = await fetch(`${baseUrl}/assignments/${assign1Id}/submission/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': student1Id }
      });
      const confirm1Data = await confirm1Res.json();

      assert.strictEqual(confirm1Res.status, 200);
      assert.strictEqual(confirm1Data.data.status, 'ON_TIME');
      assert.strictEqual(confirm1Data.data.pointsAwarded, 65, 'Expected 50 + 15 = 65 points');
      assert.strictEqual(confirm1Data.data.isEarlyBonus, true);
      assert.strictEqual(confirm1Data.data.currentPoints, 165);

      const user1DocAfter1 = await db.collection('users').doc(student1Id).get();
      assert.strictEqual(user1DocAfter1.data().points, 165);
      assert.strictEqual(user1DocAfter1.data().streak, 2, 'Expected streak incremented to 2');
      console.log('✅ On-time submission with early bonus verified: 100 -> 165 pts, streak -> 2.');

      // ==========================================================
      // TEST 2: RESUBMISSION NEVER DOUBLE-AWARDS POINTS
      // ==========================================================
      console.log('2️⃣ Testing: Resubmission does not double-award points...');
      mockStorageFiles.set(`submissions/${assign1Id}/tmp/${student1Id}.pdf`, {
        buffer: validPdfBuffer,
        contentType: 'application/pdf'
      });

      const resubmitRes = await fetch(`${baseUrl}/assignments/${assign1Id}/submission/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': student1Id }
      });
      const resubmitData = await resubmitRes.json();

      assert.strictEqual(resubmitRes.status, 200);
      assert.strictEqual(resubmitData.data.pointsAwarded, 0, 'Resubmission should award 0 points');

      const user1DocAfterResubmit = await db.collection('users').doc(student1Id).get();
      assert.strictEqual(user1DocAfterResubmit.data().points, 165, 'Points must remain 165');
      assert.strictEqual(user1DocAfterResubmit.data().streak, 2, 'Streak must remain 2');
      console.log('✅ Resubmission idempotency verified: points remain at 165.');

      // ==========================================================
      // TEST 3: ON-TIME WITHOUT EARLY BONUS (+100% = +50 points)
      // ==========================================================
      console.log('3️⃣ Testing: On-time submission without early bonus (+100%)...');
      mockStorageFiles.set(`submissions/${assign2Id}/tmp/${student1Id}.pdf`, {
        buffer: validPdfBuffer,
        contentType: 'application/pdf'
      });

      const confirm2Res = await fetch(`${baseUrl}/assignments/${assign2Id}/submission/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': student1Id }
      });
      const confirm2Data = await confirm2Res.json();

      assert.strictEqual(confirm2Res.status, 200);
      assert.strictEqual(confirm2Data.data.status, 'ON_TIME');
      assert.strictEqual(confirm2Data.data.pointsAwarded, 50, 'Expected exactly 50 points');
      assert.strictEqual(confirm2Data.data.isEarlyBonus, false);
      assert.strictEqual(confirm2Data.data.currentPoints, 215);

      const user1DocAfter2 = await db.collection('users').doc(student1Id).get();
      assert.strictEqual(user1DocAfter2.data().points, 215);
      assert.strictEqual(user1DocAfter2.data().streak, 3, 'Streak incremented to 3');
      console.log('✅ Standard on-time submission verified: 165 -> 215 pts, streak -> 3.');

      // ==========================================================
      // TEST 4: MISSED PENALTY (-40% of maxPoints = -20 points)
      // ==========================================================
      console.log('4️⃣ Testing: Missed assignment penalty application (-40%)...');
      const { applyMissedPenalty } = require('../src/services/pointsService');
      const penaltyResult = await applyMissedPenalty(student1Id, assign3Id, {
        id: assign3Id,
        title: 'Database Architecture Exam',
        deadline: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        maxPoints: 50
      });

      assert.strictEqual(penaltyResult.penalized, true);
      assert.strictEqual(penaltyResult.deduction, 20, 'Expected 40% of 50 = 20 deduction');
      assert.strictEqual(penaltyResult.newPoints, 195);

      const user1DocAfterPenalty = await db.collection('users').doc(student1Id).get();
      assert.strictEqual(user1DocAfterPenalty.data().points, 195);
      console.log('✅ Missed penalty verified: 215 -> 195 pts (-20 pts).');

      // ==========================================================
      // TEST 5: POINTS FLOOR AT 0 (CANNOT GO NEGATIVE)
      // ==========================================================
      console.log('5️⃣ Testing: User points floor at 0 (never negative)...');
      // Student 2 starts with 10 points. 20 points penalty should floor at 0
      const penaltyResultFloor = await applyMissedPenalty(student2Id, assign3Id, {
        id: assign3Id,
        title: 'Database Architecture Exam',
        deadline: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        maxPoints: 50
      });

      assert.strictEqual(penaltyResultFloor.penalized, true);
      assert.strictEqual(penaltyResultFloor.deduction, 10, 'Actual points deducted must be capped at 10');
      assert.strictEqual(penaltyResultFloor.newPoints, 0, 'Points must be floored at 0');

      const user2Doc = await db.collection('users').doc(student2Id).get();
      assert.strictEqual(user2Doc.data().points, 0, 'User points in DB must be exactly 0');

      // Verify points ledger record records actual deduction of -10 so ledger history matches total
      const penaltyDocUser2 = await db.collection('users').doc(student2Id).collection('points').doc(`penalty_${assign3Id}`).get();
      assert.strictEqual(penaltyDocUser2.data().points, -10, 'Ledger record points must be -10 (actual reduction)');
      console.log('✅ Floor at 0 verified: ledger records actual deduction of -10 pts; user total = 0.');

      // ==========================================================
      // TEST 5B: classAssignedAt SCOPE (NO PENALTY FOR ASSIGNMENTS CREATED BEFORE ENROLLMENT)
      // ==========================================================
      console.log('5️⃣B Testing: Penalties only apply for assignments created AFTER student was assigned to class...');
      const studentLateJoinId = `student_latejoin_${timestamp}`;
      const nowMs = Date.now();
      await db.collection('users').doc(studentLateJoinId).set({
        id: studentLateJoinId,
        name: 'Late Joiner',
        email: `late_${timestamp}@nexus.edu`,
        role: 'STUDENT',
        course: 'BCA',
        semester: '5TH',
        division: 'A',
        points: 50,
        classAssignedAt: new Date(nowMs).toISOString() // Enrolled right now
      });
      createdDocRefs.push(db.collection('users').doc(studentLateJoinId));

      // Assignment created 3 hours ago (before student's classAssignedAt)
      const oldAssignment = {
        id: `old_assign_${timestamp}`,
        title: 'Old Assignment',
        deadline: new Date(nowMs - 3600 * 1000).toISOString(),
        createdAt: new Date(nowMs - 3 * 3600 * 1000).toISOString(),
        maxPoints: 50
      };

      const oldAssignPenalty = await applyMissedPenalty(studentLateJoinId, oldAssignment.id, oldAssignment);
      assert.strictEqual(oldAssignPenalty.penalized, false);
      assert.strictEqual(oldAssignPenalty.reason, 'ASSIGNED_AFTER_CREATION');

      // Verify student's points were not touched
      const lateJoinerDoc = await db.collection('users').doc(studentLateJoinId).get();
      assert.strictEqual(lateJoinerDoc.data().points, 50, 'Student must not be penalized for assignments created prior to enrollment');
      console.log('✅ classAssignedAt restriction verified: skipped penalty for pre-enrollment assignment.');

      // ==========================================================
      // TEST 6: LATE AFTER PENALTY GETS LATE AWARD (PENALTY STAYS)
      // ==========================================================
      console.log('6️⃣ Testing: Late submission after penalty gets late award (+20%)...');
      mockStorageFiles.set(`submissions/${assign3Id}/tmp/${student1Id}.pdf`, {
        buffer: validPdfBuffer,
        contentType: 'application/pdf'
      });

      const confirmLateRes = await fetch(`${baseUrl}/assignments/${assign3Id}/submission/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': student1Id }
      });
      const confirmLateData = await confirmLateRes.json();

      assert.strictEqual(confirmLateRes.status, 200);
      assert.strictEqual(confirmLateData.data.status, 'LATE');
      assert.strictEqual(confirmLateData.data.pointsAwarded, 10, 'Expected 20% of 50 = 10 pts');
      assert.strictEqual(confirmLateData.data.currentPoints, 205);

      const user1DocAfterLate = await db.collection('users').doc(student1Id).get();
      assert.strictEqual(user1DocAfterLate.data().points, 205);

      // Verify both award and penalty records exist
      const penaltyDocCheck = await db.collection('users').doc(student1Id).collection('points').doc(`penalty_${assign3Id}`).get();
      const awardDocCheck = await db.collection('users').doc(student1Id).collection('points').doc(`award_${assign3Id}`).get();
      assert.strictEqual(penaltyDocCheck.exists, true, 'Penalty record must persist');
      assert.strictEqual(awardDocCheck.exists, true, 'Late award record must exist');
      console.log('✅ Late after penalty verified: gets +10 pts late award; penalty doc stays intact.');

      // ==========================================================
      // TEST 7: CRON REJECTS REQUESTS WITHOUT SECRET (401 EXPECTED)
      // ==========================================================
      console.log('7️⃣ Testing: Daily cron rejects unauthenticated requests (401 expected)...');
      const noAuthCronRes = await fetch(`${baseUrl}/cron/penalties`, { method: 'POST' });
      assert.strictEqual(noAuthCronRes.status, 401);

      const badAuthCronRes = await fetch(`${baseUrl}/cron/penalties`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer wrong_secret_token' }
      });
      assert.strictEqual(badAuthCronRes.status, 401);
      console.log('✅ Cron authentication security verified: 401 returned for invalid/missing token.');

      // ==========================================================
      // TEST 8: CRON WITH VALID SECRET RUNS SUCCESSFULLY
      // ==========================================================
      console.log('8️⃣ Testing: Daily cron executes with valid secret...');
      const validCronRes = await fetch(`${baseUrl}/cron/penalties`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${CRON_SECRET}` }
      });
      const validCronData = await validCronRes.json();

      assert.strictEqual(validCronRes.status, 200);
      assert.strictEqual(validCronData.success, true);
      console.log('✅ Daily cron execution succeeded.');

      // ==========================================================
      // TEST 9: CRON RUNNING TWICE DOES NOT DOUBLE-PENALIZE (IDEMPOTENCY)
      // ==========================================================
      console.log('9️⃣ Testing: Cron running twice does not double-penalize (idempotent)...');
      const user1PtsBeforeCron2 = (await db.collection('users').doc(student1Id).get()).data().points;

      const secondCronRes = await fetch(`${baseUrl}/cron/penalties`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${CRON_SECRET}` }
      });
      assert.strictEqual(secondCronRes.status, 200);

      const user1PtsAfterCron2 = (await db.collection('users').doc(student1Id).get()).data().points;
      assert.strictEqual(user1PtsBeforeCron2, user1PtsAfterCron2, 'Points must remain unchanged on repeat cron');
      console.log('✅ Cron idempotency verified: repeat run caused 0 extra deductions.');

      // ==========================================================
      // TEST 10: LAZY + CRON TOGETHER DO NOT DOUBLE-PENALIZE
      // ==========================================================
      console.log('🔟 Testing: Lazy check + Cron together never double-penalize...');
      // Student loads assignments (triggers lazy penalty check)
      const listAssignmentsRes = await fetch(`${baseUrl}/assignments`, {
        headers: { 'x-user-id': student1Id }
      });
      assert.strictEqual(listAssignmentsRes.status, 200);

      // Student loads dashboard (triggers lazy penalty check)
      const dashboardRes = await fetch(`${baseUrl}/analytics/dashboard`, {
        headers: { 'x-user-id': student1Id }
      });
      assert.strictEqual(dashboardRes.status, 200);

      const user1FinalPoints = (await db.collection('users').doc(student1Id).get()).data().points;
      assert.strictEqual(user1FinalPoints, user1PtsAfterCron2, 'Points must not be double deducted by lazy checks');
      console.log('✅ Lazy evaluation + Cron harmony verified: points perfectly consistent at', user1FinalPoints);

      console.log('🎉 All Phase D Points, Penalties, Early Bonuses & Cron tests PASSED with 100% success!');
    } catch (testError) {
      console.error('❌ Phase D Test Failure:', testError);
      process.exitCode = 1;
    } finally {
      console.log('🧹 Cleaning up test documents...');
      for (const docRef of createdDocRefs) {
        try {
          // Delete points subcollection
          const ptsSnap = await docRef.collection('points').get();
          const batch = db.batch();
          ptsSnap.docs.forEach(d => batch.delete(d.ref));
          // Delete submissions subcollection
          const subsSnap = await docRef.collection('submissions').get();
          subsSnap.docs.forEach(d => batch.delete(d.ref));
          await batch.commit();

          await docRef.delete();
        } catch (e) {}
      }
      mockStorageFiles.clear();
      server.close();
    }
  });
}

runTests();
