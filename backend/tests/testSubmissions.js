if (process.env.NODE_ENV === 'production') {
  console.error('⛔ Refusing to run tests against production environment!');
  process.exit(1);
}

const express = require('express');
const assignmentRoutes = require('../src/routes/assignmentRoutes');
const teacherRoutes = require('../src/routes/teacherRoutes');
const { db, bucket } = require('../src/config/firebase');

const app = express();
app.use(express.json());
app.use('/api/assignments', assignmentRoutes);
app.use('/api/teacher', teacherRoutes);

// In-memory mock storage files map for local test execution
const mockStorageFiles = new Map();

// Helper to install local mock file methods if bucket is not live on cloud yet
function setupStorageMockingIfNeeded() {
  const originalFileFn = bucket.file.bind(bucket);

  bucket.file = function (filePath) {
    const realFile = originalFileFn(filePath);

    // If local test has mock data for this file, overlay methods
    const getMock = () => mockStorageFiles.get(filePath);

    const originalGetSignedUrl = realFile.getSignedUrl.bind(realFile);
    realFile.getSignedUrl = async function (opts) {
      try {
        return await originalGetSignedUrl(opts);
      } catch (e) {
        return [`https://storage.googleapis.com/${bucket.name}/${filePath}?mock_v4_signature=true`];
      }
    };

    realFile.exists = async function () {
      return [mockStorageFiles.has(filePath)];
    };

    const originalGetMetadata = realFile.getMetadata.bind(realFile);
    realFile.getMetadata = async function () {
      const mock = getMock();
      if (mock) {
        return [{ size: mock.buffer.length, contentType: mock.contentType }];
      }
      return await originalGetMetadata();
    };

    const originalDownload = realFile.download.bind(realFile);
    realFile.download = async function (opts = {}) {
      const mock = getMock();
      if (mock) {
        const start = opts.start || 0;
        const end = opts.end !== undefined ? opts.end + 1 : mock.buffer.length;
        return [mock.buffer.subarray(start, end)];
      }
      return await originalDownload(opts);
    };

    const originalDelete = realFile.delete.bind(realFile);
    realFile.delete = async function () {
      if (mockStorageFiles.has(filePath)) {
        mockStorageFiles.delete(filePath);
        return [{}];
      }
      try {
        return await originalDelete();
      } catch (e) {
        return [{}];
      }
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
  console.log('🧪 Starting Phase C: Student PDF Submissions & Teacher Review Tests...');

  setupStorageMockingIfNeeded();

  const server = app.listen(5077, async () => {
    const createdDocRefs = [];
    try {
      const baseUrl = 'http://localhost:5077/api';
      const timestamp = Date.now();

      // Setup Users
      const teacher1Id = `sub_teacher1_${timestamp}`;
      const teacher2Id = `sub_teacher2_${timestamp}`;
      const studentAId = `sub_studentA_${timestamp}`;
      const studentBId = `sub_studentB_${timestamp}`;

      console.log('1️⃣ Setting up test teachers and students...');

      await db.collection('users').doc(teacher1Id).set({
        id: teacher1Id,
        name: 'Prof. Hopper',
        email: `hopper_${timestamp}@nexus.edu`,
        role: 'TEACHER'
      });
      createdDocRefs.push(db.collection('users').doc(teacher1Id));

      await db.collection('users').doc(teacher2Id).set({
        id: teacher2Id,
        name: 'Dr. Dijkstra',
        email: `dijkstra_${timestamp}@nexus.edu`,
        role: 'TEACHER'
      });
      createdDocRefs.push(db.collection('users').doc(teacher2Id));

      // Student A belongs to BCA 5TH DIV A
      await db.collection('users').doc(studentAId).set({
        id: studentAId,
        name: 'Ada Lovelace',
        email: `ada_${timestamp}@nexus.edu`,
        role: 'STUDENT',
        course: 'BCA',
        semester: '5TH',
        division: 'A'
      });
      createdDocRefs.push(db.collection('users').doc(studentAId));

      // Student B belongs to BCA 5TH DIV B (Different class)
      await db.collection('users').doc(studentBId).set({
        id: studentBId,
        name: 'Bob Babbage',
        email: `bob_${timestamp}@nexus.edu`,
        role: 'STUDENT',
        course: 'BCA',
        semester: '5TH',
        division: 'B'
      });
      createdDocRefs.push(db.collection('users').doc(studentBId));

      // Setup Assignment 1 (Future deadline, allowLate = true)
      const assign1Ref = db.collection('assignments').doc();
      const assign1Id = assign1Ref.id;
      createdDocRefs.push(assign1Ref);
      await assign1Ref.set({
        id: assign1Id,
        title: 'Compiler Design Lab 1',
        course: 'BCA',
        semester: '5TH',
        division: 'A',
        deadline: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days in future
        allowLate: true,
        maxPoints: 100,
        teacherId: teacher1Id,
        teacherName: 'Prof. Hopper',
        status: 'ACTIVE'
      });

      // Setup Assignment 2 (Past deadline, allowLate = false)
      const assign2Ref = db.collection('assignments').doc();
      const assign2Id = assign2Ref.id;
      createdDocRefs.push(assign2Ref);
      await assign2Ref.set({
        id: assign2Id,
        title: 'Strict Math Assignment',
        course: 'BCA',
        semester: '5TH',
        division: 'A',
        deadline: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
        allowLate: false,
        maxPoints: 50,
        teacherId: teacher1Id,
        teacherName: 'Prof. Hopper',
        status: 'ACTIVE'
      });

      // Setup Assignment 3 (Past deadline, allowLate = true)
      const assign3Ref = db.collection('assignments').doc();
      const assign3Id = assign3Ref.id;
      createdDocRefs.push(assign3Ref);
      await assign3Ref.set({
        id: assign3Id,
        title: 'Late Allowed Essay',
        course: 'BCA',
        semester: '5TH',
        division: 'A',
        deadline: new Date(Date.now() - 3600000 * 1).toISOString(), // 1 hour ago
        allowLate: true,
        maxPoints: 75,
        teacherId: teacher1Id,
        teacherName: 'Prof. Hopper',
        status: 'ACTIVE'
      });

      console.log('✅ Assignments configured.');

      // ==========================================================
      // TEST 1: Non-class student blocked from getting upload URL
      // ==========================================================
      console.log('2️⃣ Testing: Non-class student blocked from upload URL (403 expected)...');
      const nonClassRes = await fetch(`${baseUrl}/assignments/${assign1Id}/submission/upload-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': studentBId
        }
      });
      if (nonClassRes.status !== 403) {
        throw new Error(`Expected 403 for non-class student, got: ${nonClassRes.status}`);
      }
      console.log('✅ Non-class student blocked with 403 Forbidden.');

      // ==========================================================
      // TEST 2: Late blocked when allowLate = false
      // ==========================================================
      console.log('3️⃣ Testing: Late blocked when allowLate=false (400 expected)...');
      const lateBlockedRes = await fetch(`${baseUrl}/assignments/${assign2Id}/submission/upload-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': studentAId
        }
      });
      if (lateBlockedRes.status !== 400) {
        throw new Error(`Expected 400 for late submission when allowLate=false, got: ${lateBlockedRes.status}`);
      }
      console.log('✅ Late submission correctly rejected with 400 Bad Request.');

      // ==========================================================
      // TEST 3: Upload URL generation for target class student
      // ==========================================================
      console.log('4️⃣ Testing: Upload URL generation for eligible student...');
      const uploadUrlRes = await fetch(`${baseUrl}/assignments/${assign1Id}/submission/upload-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': studentAId
        }
      });
      const uploadUrlData = await uploadUrlRes.json();
      if (!uploadUrlData.success || !uploadUrlData.data.uploadUrl) {
        throw new Error('Upload URL generation failed: ' + JSON.stringify(uploadUrlData));
      }
      if (!uploadUrlData.data.uploadUrl.includes('storage.googleapis.com')) {
        throw new Error('Returned upload URL is not a Google Storage URL: ' + uploadUrlData.data.uploadUrl);
      }
      console.log('✅ Valid V4 signed upload URL generated successfully.');

      // ==========================================================
      // TEST 4: Confirm rejects when file doesn't exist
      // ==========================================================
      console.log('5️⃣ Testing: Confirm rejects when file is missing in Storage (400 expected)...');
      const missingFileConfirmRes = await fetch(`${baseUrl}/assignments/${assign1Id}/submission/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': studentAId
        }
      });
      if (missingFileConfirmRes.status !== 400) {
        throw new Error(`Expected 400 for missing file, got: ${missingFileConfirmRes.status}`);
      }
      console.log('✅ Missing file rejected with 400 Bad Request.');

      // ==========================================================
      // TEST 5: Bad file type / non-PDF rejected
      // ==========================================================
      console.log('6️⃣ Testing: Bad file type rejected (400 expected)...');
      const badFilePath = `submissions/${assign1Id}/tmp/${studentAId}.pdf`;
      // Put a text file disguised as PDF
      mockStorageFiles.set(badFilePath, {
        buffer: Buffer.from('NOT A PDF FILE TEXT CONTENT'),
        contentType: 'text/plain'
      });

      const badTypeConfirmRes = await fetch(`${baseUrl}/assignments/${assign1Id}/submission/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': studentAId
        }
      });
      if (badTypeConfirmRes.status !== 400) {
        throw new Error(`Expected 400 for bad content type, got: ${badTypeConfirmRes.status}`);
      }
      console.log('✅ Bad content type rejected with 400 Bad Request.');

      // Bad magic bytes with application/pdf header
      mockStorageFiles.set(badFilePath, {
        buffer: Buffer.from('RIFF_FAKE_HEADER'),
        contentType: 'application/pdf'
      });
      const badMagicConfirmRes = await fetch(`${baseUrl}/assignments/${assign1Id}/submission/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': studentAId
        }
      });
      if (badMagicConfirmRes.status !== 400) {
        throw new Error(`Expected 400 for invalid magic bytes, got: ${badMagicConfirmRes.status}`);
      }
      console.log('✅ Fake PDF header (magic bytes check) rejected with 400 Bad Request.');

      // ==========================================================
      // TEST 6: Oversized file rejected (> 10MB)
      // ==========================================================
      console.log('7️⃣ Testing: Oversized file rejected (400 expected)...');
      mockStorageFiles.set(badFilePath, {
        buffer: Buffer.alloc(11 * 1024 * 1024, '%PDF'),
        contentType: 'application/pdf'
      });
      const oversizeConfirmRes = await fetch(`${baseUrl}/assignments/${assign1Id}/submission/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': studentAId
        }
      });
      if (oversizeConfirmRes.status !== 400) {
        throw new Error(`Expected 400 for oversized file, got: ${oversizeConfirmRes.status}`);
      }
      console.log('✅ Oversized file rejected with 400 Bad Request.');

      // ==========================================================
      // TEST 7: Valid PDF confirmed -> status ON_TIME
      // ==========================================================
      console.log('8️⃣ Testing: Valid PDF submission confirmed (ON_TIME status)...');
      const validPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
      mockStorageFiles.set(badFilePath, {
        buffer: validPdfBuffer,
        contentType: 'application/pdf'
      });

      const validConfirmRes = await fetch(`${baseUrl}/assignments/${assign1Id}/submission/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': studentAId
        }
      });
      const validConfirmData = await validConfirmRes.json();
      if (!validConfirmData.success || validConfirmData.data.status !== 'ON_TIME') {
        throw new Error('Valid submission confirmation failed: ' + JSON.stringify(validConfirmData));
      }
      console.log('✅ Valid PDF confirmed with status:', validConfirmData.data.status);

      // Verify student's assignment view shows ON_TIME
      const studentViewRes = await fetch(`${baseUrl}/assignments/${assign1Id}`, {
        headers: { 'x-user-id': studentAId }
      });
      const studentViewData = await studentViewRes.json();
      if (studentViewData.data.submissionStatus !== 'ON_TIME') {
        throw new Error(`Expected student view submissionStatus ON_TIME, got: ${studentViewData.data.submissionStatus}`);
      }
      console.log('✅ Student assignment view reflects status ON_TIME.');

      // ==========================================================
      // TEST 8: Late allowed gets LATE status (Assignment 3)
      // ==========================================================
      console.log('9️⃣ Testing: Late allowed gets LATE status...');
      const lateFilePath = `submissions/${assign3Id}/tmp/${studentAId}.pdf`;
      mockStorageFiles.set(lateFilePath, {
        buffer: validPdfBuffer,
        contentType: 'application/pdf'
      });

      const lateConfirmRes = await fetch(`${baseUrl}/assignments/${assign3Id}/submission/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': studentAId
        }
      });
      const lateConfirmData = await lateConfirmRes.json();
      if (!lateConfirmData.success || lateConfirmData.data.status !== 'LATE') {
        throw new Error('Expected LATE status for late submission, got: ' + JSON.stringify(lateConfirmData));
      }
      console.log('✅ Late submission confirmed with status: LATE.');

      // ==========================================================
      // TEST 9: Other teacher cannot list submissions (403)
      // ==========================================================
      console.log('🔟 Testing: Non-creator teacher cannot list submissions (403 expected)...');
      const otherTeacherListRes = await fetch(`${baseUrl}/teacher/assignments/${assign1Id}/submissions`, {
        headers: { 'x-user-id': teacher2Id }
      });
      if (otherTeacherListRes.status !== 403) {
        throw new Error(`Expected 403 when other teacher lists submissions, got: ${otherTeacherListRes.status}`);
      }
      console.log('✅ Non-creator teacher blocked with 403 Forbidden.');

      // Creator teacher lists submissions -> 200 OK
      const creatorListRes = await fetch(`${baseUrl}/teacher/assignments/${assign1Id}/submissions`, {
        headers: { 'x-user-id': teacher1Id }
      });
      const creatorListData = await creatorListRes.json();
      if (!creatorListData.success || creatorListData.data.submittedCount !== 1) {
        throw new Error('Creator teacher failed to list submissions: ' + JSON.stringify(creatorListData));
      }
      const studentASubRecord = creatorListData.data.submissions.find(s => s.studentId === studentAId);
      if (!studentASubRecord || studentASubRecord.status !== 'ON_TIME') {
        throw new Error('Expected student A submission record ON_TIME in teacher list');
      }
      console.log('✅ Creator teacher successfully listed submissions. Found submitted student:', studentASubRecord.studentName);

      // ==========================================================
      // TEST 10: Other student or teacher cannot download someone else's file
      // ==========================================================
      console.log('1️⃣1️⃣ Testing: Student & other teacher cannot download submission (403 expected)...');
      const studentDownloadRes = await fetch(`${baseUrl}/teacher/assignments/${assign1Id}/submissions/${studentAId}/download-url`, {
        headers: { 'x-user-id': studentBId }
      });
      if (studentDownloadRes.status !== 403) {
        throw new Error(`Expected 403 for student download URL access, got: ${studentDownloadRes.status}`);
      }

      const diffTeacherDownloadRes = await fetch(`${baseUrl}/teacher/assignments/${assign1Id}/submissions/${studentAId}/download-url`, {
        headers: { 'x-user-id': teacher2Id }
      });
      if (diffTeacherDownloadRes.status !== 403) {
        throw new Error(`Expected 403 for other teacher download URL access, got: ${diffTeacherDownloadRes.status}`);
      }
      console.log('✅ Unauthorized download attempts blocked with 403 Forbidden.');

      // Creator teacher gets download URL -> 200 OK
      const creatorDownloadRes = await fetch(`${baseUrl}/teacher/assignments/${assign1Id}/submissions/${studentAId}/download-url`, {
        headers: { 'x-user-id': teacher1Id }
      });
      const creatorDownloadData = await creatorDownloadRes.json();
      if (!creatorDownloadData.success || !creatorDownloadData.data.downloadUrl) {
        throw new Error('Creator download URL generation failed: ' + JSON.stringify(creatorDownloadData));
      }
      console.log('✅ Creator teacher successfully obtained signed download URL.');

      // ==========================================================
      // TEST 11: Confirm rejects late submission when allowLate=false and cleans up temp file
      // ==========================================================
      console.log('1️⃣2️⃣ Testing: Confirm rejects late submission when allowLate=false and deletes file...');
      const lateNoAllowTempPath = `submissions/${assign2Id}/tmp/${studentAId}.pdf`;
      mockStorageFiles.set(lateNoAllowTempPath, {
        buffer: validPdfBuffer,
        contentType: 'application/pdf'
      });
      const lateNoAllowConfirmRes = await fetch(`${baseUrl}/assignments/${assign2Id}/submission/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': studentAId }
      });
      if (lateNoAllowConfirmRes.status !== 400) {
        throw new Error(`Expected 400 when confirming late on allowLate=false, got: ${lateNoAllowConfirmRes.status}`);
      }
      if (mockStorageFiles.has(lateNoAllowTempPath)) {
        throw new Error('Temp file was not deleted after rejection on allowLate=false');
      }
      console.log('✅ Confirm rejected late submission and cleaned up temp file.');

      // ==========================================================
      // TEST 12: Cannot replace an ON_TIME submission after deadline passes
      // ==========================================================
      console.log('1️⃣3️⃣ Testing: Cannot replace an ON_TIME submission after deadline passes...');
      const assignPastRef = db.collection('assignments').doc();
      const assignPastId = assignPastRef.id;
      createdDocRefs.push(assignPastRef);
      await assignPastRef.set({
        id: assignPastId,
        title: 'Past Deadline Assignment',
        course: 'BCA',
        semester: '5TH',
        division: 'A',
        deadline: new Date(Date.now() - 3600 * 1000).toISOString(),
        allowLate: true,
        maxPoints: 50,
        teacherId: teacher1Id,
        status: 'ACTIVE'
      });

      const finalPathPast = `submissions/${assignPastId}/${studentAId}.pdf`;
      mockStorageFiles.set(finalPathPast, {
        buffer: validPdfBuffer,
        contentType: 'application/pdf'
      });
      await assignPastRef.collection('submissions').doc(studentAId).set({
        id: studentAId,
        assignmentId: assignPastId,
        studentId: studentAId,
        status: 'ON_TIME',
        filePath: finalPathPast,
        fileName: `${assignPastId}_${studentAId}.pdf`,
        submittedAt: new Date(Date.now() - 7200 * 1000).toISOString()
      });

      const replaceTempPath = `submissions/${assignPastId}/tmp/${studentAId}.pdf`;
      mockStorageFiles.set(replaceTempPath, {
        buffer: validPdfBuffer,
        contentType: 'application/pdf'
      });

      const replaceRes = await fetch(`${baseUrl}/assignments/${assignPastId}/submission/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': studentAId }
      });
      if (replaceRes.status !== 400) {
        throw new Error(`Expected 400 when replacing ON_TIME submission after deadline, got: ${replaceRes.status}`);
      }
      if (mockStorageFiles.has(replaceTempPath)) {
        throw new Error('Temp replacement file was not deleted after rejection');
      }
      if (!mockStorageFiles.has(finalPathPast)) {
        throw new Error('Existing on-time final submission file was erroneously removed');
      }
      const existingSubCheck = await assignPastRef.collection('submissions').doc(studentAId).get();
      if (existingSubCheck.data().status !== 'ON_TIME') {
        throw new Error('Existing ON_TIME submission document was erroneously modified');
      }
      console.log('✅ Replacing ON_TIME submission after deadline correctly blocked and protected.');

      // ==========================================================
      // TEST 13: Failed upload attempt never destroys existing valid submission
      // ==========================================================
      console.log('1️⃣4️⃣ Testing: Failed upload attempt never destroys existing valid submission...');
      const finalPathAssign1 = `submissions/${assign1Id}/${studentAId}.pdf`;
      if (!mockStorageFiles.has(finalPathAssign1)) {
        throw new Error('Expected final file on assign1 to exist');
      }

      const corruptedTempPath = `submissions/${assign1Id}/tmp/${studentAId}.pdf`;
      mockStorageFiles.set(corruptedTempPath, {
        buffer: Buffer.from('NOT A VALID PDF FILE'),
        contentType: 'text/plain'
      });

      const failedUploadRes = await fetch(`${baseUrl}/assignments/${assign1Id}/submission/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': studentAId }
      });
      if (failedUploadRes.status !== 400) {
        throw new Error(`Expected 400 for corrupted file upload, got: ${failedUploadRes.status}`);
      }
      if (mockStorageFiles.has(corruptedTempPath)) {
        throw new Error('Corrupted temp file was not cleaned up');
      }
      if (!mockStorageFiles.has(finalPathAssign1)) {
        throw new Error('Original valid submission file was destroyed by failed upload!');
      }
      const assign1SubDoc = await db.collection('assignments').doc(assign1Id).collection('submissions').doc(studentAId).get();
      if (assign1SubDoc.data().status !== 'ON_TIME') {
        throw new Error('Original submission record was altered by failed upload attempt!');
      }
      console.log('✅ Previous valid submission fully preserved despite failed upload.');

      // ==========================================================
      // TEST 14: cors.json exact origins validation
      // ==========================================================
      console.log('1️⃣5️⃣ Testing: cors.json has exact origins and no partial wildcards...');
      const fs = require('fs');
      const path = require('path');
      const corsConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../cors.json'), 'utf8'));
      const origins = corsConfig[0].origin;
      if (origins.some(o => o.includes('*.'))) {
        throw new Error('Partial wildcard found in cors.json origins!');
      }
      if (!origins.includes('http://localhost:3000') || !origins.includes('http://localhost:5173')) {
        throw new Error('cors.json missing localhost origins!');
      }
      console.log('✅ cors.json validated: exact origins only.');

      // ==========================================================
      // TEST 11: Cleanup
      // ==========================================================
      console.log('🧹 Cleaning up test documents and mock storage files...');
      const cleanupBatch = db.batch();
      for (const ref of createdDocRefs) {
        cleanupBatch.delete(ref);
      }
      // Also delete submission docs
      cleanupBatch.delete(assign1Ref.collection('submissions').doc(studentAId));
      cleanupBatch.delete(assign3Ref.collection('submissions').doc(studentAId));
      await cleanupBatch.commit();
      mockStorageFiles.clear();

      console.log('🎉 All Phase C PDF Submissions & Teacher Review Tests PASSED with 100% success!');
    } catch (err) {
      console.error('❌ Test Failure:', err);
      process.exitCode = 1;
    } finally {
      server.close();
    }
  });
}

runTests();
