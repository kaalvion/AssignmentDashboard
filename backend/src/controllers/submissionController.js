const { db, bucket } = require('../config/firebase');
const { normalizeClassValue } = require('../utils/classNormalizer');
const { getStudentsInClass } = require('../services/notificationService');
const { awardSubmissionPoints } = require('../services/pointsService');

/**
 * Controller for Student PDF Submissions & Teacher Review with Firebase Storage
 */

/**
 * POST /api/assignments/:id/submission/upload-url
 * Generates a short-lived v4 signed PUT URL for direct browser-to-Storage upload
 * into a temporary path: submissions/{id}/tmp/{studentId}.pdf.
 */
async function getSubmissionUploadUrl(req, res) {
  try {
    const { id } = req.params;
    const studentId = req.user.id;

    if (!bucket) {
      return res.status(500).json({
        success: false,
        message: 'Storage bucket is not configured. Please set FIREBASE_STORAGE_BUCKET.'
      });
    }

    const assignDoc = await db.collection('assignments').doc(id).get();
    if (!assignDoc.exists) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    const assignment = assignDoc.data();
    if (assignment.status === 'DELETED') {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    // 1. Class Membership Check
    const userDoc = await db.collection('users').doc(studentId).get();
    const userData = userDoc.exists ? userDoc.data() : req.user;

    const studentCourse = normalizeClassValue(userData.course);
    const studentSemester = normalizeClassValue(userData.semester);
    const studentDivision = normalizeClassValue(userData.division);

    const assignCourse = normalizeClassValue(assignment.course);
    const assignSemester = normalizeClassValue(assignment.semester);
    const assignDivision = normalizeClassValue(assignment.division);

    const classMatches =
      studentCourse === assignCourse &&
      studentSemester === assignSemester &&
      studentDivision === assignDivision;

    if (!classMatches) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You do not belong to the target class for this assignment.'
      });
    }

    // 2. Deadline & allowLate Check
    const now = new Date();
    const deadline = new Date(assignment.deadline);
    const isLate = now > deadline;

    if (isLate && !assignment.allowLate) {
      return res.status(400).json({
        success: false,
        message: 'Deadline has passed and late submissions are not allowed for this assignment.'
      });
    }

    // 3. Prevent replacing existing ON_TIME submission after deadline
    if (isLate) {
      const existingSubDoc = await db.collection('assignments').doc(id).collection('submissions').doc(studentId).get();
      if (existingSubDoc.exists && existingSubDoc.data().status === 'ON_TIME') {
        return res.status(400).json({
          success: false,
          message: 'Cannot replace an on-time submission after the deadline.'
        });
      }
    }

    // Upload to temp path so failed uploads never overwrite/destroy an existing valid submission
    const tempFilePath = `submissions/${id}/tmp/${studentId}.pdf`;
    const tempFile = bucket.file(tempFilePath);

    // Short-lived (10 min) V4 signed PUT URL
    const [uploadUrl] = await tempFile.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 10 * 60 * 1000,
      contentType: 'application/pdf',
      extensionHeaders: {
        'x-goog-content-length-range': '0,10485760' // 0 to 10 MB limit
      }
    });

    return res.json({
      success: true,
      data: {
        uploadUrl,
        tempFilePath,
        filePath: `submissions/${id}/${studentId}.pdf`,
        assignmentId: id,
        studentId
      }
    });
  } catch (error) {
    console.error('Error generating submission upload URL:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate upload URL.' });
  }
}

/**
 * POST /api/assignments/:id/submission/confirm
 * Validates uploaded temp file in Storage (exists, size <= 10MB, contentType, magic bytes).
 * Checks deadline rules (rejection even if upload URL was issued before deadline,
 * blocks replacing on-time submissions after deadline).
 * Moves temp file to final path, commits submission doc, and triggers transactional point awards.
 */
async function confirmSubmission(req, res) {
  try {
    const { id } = req.params;
    const studentId = req.user.id;

    if (!bucket) {
      return res.status(500).json({
        success: false,
        message: 'Storage bucket is not configured. Please set FIREBASE_STORAGE_BUCKET.'
      });
    }

    const assignDoc = await db.collection('assignments').doc(id).get();
    if (!assignDoc.exists) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    const assignment = assignDoc.data();
    if (assignment.status === 'DELETED') {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    const tempFilePath = `submissions/${id}/tmp/${studentId}.pdf`;
    const tempFile = bucket.file(tempFilePath);
    const finalFilePath = `submissions/${id}/${studentId}.pdf`;
    const finalFile = bucket.file(finalFilePath);

    // 1. Check temp file exists in Storage
    let exists = false;
    try {
      const [resExists] = await tempFile.exists();
      exists = resExists;
    } catch (e) {
      exists = false;
    }

    if (!exists) {
      return res.status(400).json({
        success: false,
        message: 'File not found in storage. Please upload the PDF to the signed URL before confirming.'
      });
    }

    // 2. Validate Size and Content-Type from Storage metadata
    const [metadata] = await tempFile.getMetadata();
    const size = Number(metadata.size || 0);

    if (size <= 0 || size > 10 * 1024 * 1024) {
      await tempFile.delete().catch(() => {});
      return res.status(400).json({
        success: false,
        message: 'File size invalid or exceeds maximum allowed 10 MB limit.'
      });
    }

    const contentType = (metadata.contentType || '').toLowerCase();
    if (contentType !== 'application/pdf') {
      await tempFile.delete().catch(() => {});
      return res.status(400).json({
        success: false,
        message: 'Invalid content type. Only application/pdf files are accepted.'
      });
    }

    // 3. Validate Magic Bytes (First bytes must be "%PDF")
    try {
      const [buffer] = await tempFile.download({ start: 0, end: 4 });
      const headerStr = buffer.toString('utf8', 0, 4);
      if (!headerStr.startsWith('%PDF')) {
        await tempFile.delete().catch(() => {});
        return res.status(400).json({
          success: false,
          message: 'Invalid file contents. The uploaded file is not a valid PDF document.'
        });
      }
    } catch (readErr) {
      console.error('Error reading file magic bytes:', readErr);
      await tempFile.delete().catch(() => {});
      return res.status(400).json({
        success: false,
        message: 'Failed to verify PDF file contents.'
      });
    }

    // 4. Calculate Submission Status based on Server Timestamp
    const serverTimestamp = new Date();
    const deadline = new Date(assignment.deadline);
    const isLate = serverTimestamp > deadline;

    // Rule: Reject if deadline passed and allowLate is false, even if upload URL was issued before deadline
    if (isLate && !assignment.allowLate) {
      await tempFile.delete().catch(() => {});
      return res.status(400).json({
        success: false,
        message: 'Deadline has passed and late submissions are not allowed for this assignment.'
      });
    }

    // Rule: After deadline, don't allow replacing an existing ON_TIME submission
    const existingSubDoc = await db.collection('assignments').doc(id).collection('submissions').doc(studentId).get();
    if (isLate && existingSubDoc.exists && existingSubDoc.data().status === 'ON_TIME') {
      await tempFile.delete().catch(() => {});
      return res.status(400).json({
        success: false,
        message: 'Cannot replace an on-time submission after the deadline.'
      });
    }

    // 5. Copy temp file to final location and clean up temp file
    // A failed upload will have been deleted above without ever touching the previous finalFile
    await tempFile.copy(finalFile);
    await tempFile.delete().catch(() => {});

    const submissionStatus = isLate ? 'LATE' : 'ON_TIME';

    // 6. Store / Overwrite in assignments/{id}/submissions/{studentId}
    const submissionRef = db.collection('assignments').doc(id).collection('submissions').doc(studentId);
    const submissionData = {
      id: studentId,
      assignmentId: id,
      studentId,
      studentName: req.user.name || 'Student',
      studentEmail: req.user.email || '',
      filePath: finalFilePath,
      fileName: `${id}_${studentId}.pdf`,
      size,
      status: submissionStatus,
      submittedAt: serverTimestamp.toISOString(), // SERVER timestamp
      updatedAt: serverTimestamp.toISOString()
    };

    await submissionRef.set(submissionData, { merge: true });

    // 7. Phase D: Award Points transactionally
    const awardResult = await awardSubmissionPoints(
      studentId,
      id,
      assignment,
      submissionStatus,
      serverTimestamp
    );

    return res.status(200).json({
      success: true,
      message: 'Assignment submitted successfully.',
      data: {
        ...submissionData,
        pointsAwarded: awardResult.pointsAwarded || 0,
        isEarlyBonus: awardResult.isEarly || false,
        currentPoints: awardResult.currentPoints
      }
    });
  } catch (error) {
    console.error('Error confirming submission:', error);
    return res.status(500).json({ success: false, message: 'Failed to confirm submission.' });
  }
}

/**
 * GET /api/teacher/assignments/:id/submissions
 * Lists all target class students and their submission status (submitted / late / missing).
 * Accessible ONLY by the creating teacher or an ADMIN.
 */
async function getAssignmentSubmissions(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;

    const assignDoc = await db.collection('assignments').doc(id).get();
    if (!assignDoc.exists) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    const assignment = assignDoc.data();
    if (assignment.status === 'DELETED') {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    const isCreator = (assignment.teacherId && assignment.teacherId === user.id) ||
                      (assignment.userId && assignment.userId === user.id);
    const isAdmin = user.role === 'ADMIN';

    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only the creating teacher or an admin can access submissions.'
      });
    }

    // 1. Fetch all students in target class
    const students = await getStudentsInClass(assignment.course, assignment.semester, assignment.division);

    // 2. Fetch existing submissions
    const subsSnap = await db.collection('assignments').doc(id).collection('submissions').get();
    const subMap = new Map();
    subsSnap.docs.forEach(doc => {
      subMap.set(doc.id, doc.data());
    });

    const now = new Date();
    const deadline = assignment.deadline ? new Date(assignment.deadline) : null;
    const isPastDeadline = deadline && now > deadline;

    // 3. Map students to status
    const results = students.map(st => {
      const sub = subMap.get(st.id);
      if (sub) {
        return {
          studentId: st.id,
          studentName: st.name || 'Student',
          studentEmail: st.email || '',
          status: sub.status, // ON_TIME or LATE
          submittedAt: sub.submittedAt,
          fileName: sub.fileName,
          size: sub.size,
          filePath: sub.filePath
        };
      } else {
        return {
          studentId: st.id,
          studentName: st.name || 'Student',
          studentEmail: st.email || '',
          status: isPastDeadline ? 'OVERDUE' : 'NOT_SUBMITTED',
          submittedAt: null,
          fileName: null,
          size: null,
          filePath: null
        };
      }
    });

    return res.json({
      success: true,
      data: {
        assignmentId: id,
        title: assignment.title,
        targetClass: {
          course: assignment.course,
          semester: assignment.semester,
          division: assignment.division
        },
        totalStudents: students.length,
        submittedCount: subsSnap.size,
        submissions: results
      }
    });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch submissions.' });
  }
}

/**
 * GET /api/teacher/assignments/:id/submissions/:studentId/download-url
 * Generates a short-lived signed GET URL for downloading a student's submitted PDF.
 * Accessible ONLY by the creating teacher or an ADMIN.
 */
async function getSubmissionDownloadUrl(req, res) {
  try {
    const { id, studentId } = req.params;
    const user = req.user;

    if (!bucket) {
      return res.status(500).json({
        success: false,
        message: 'Storage bucket is not configured. Please set FIREBASE_STORAGE_BUCKET.'
      });
    }

    const assignDoc = await db.collection('assignments').doc(id).get();
    if (!assignDoc.exists) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    const assignment = assignDoc.data();
    const isCreator = (assignment.teacherId && assignment.teacherId === user.id) ||
                      (assignment.userId && assignment.userId === user.id);
    const isAdmin = user.role === 'ADMIN';

    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only the creating teacher or an admin can download submission files.'
      });
    }

    const subDoc = await db.collection('assignments').doc(id).collection('submissions').doc(studentId).get();
    if (!subDoc.exists) {
      return res.status(404).json({ success: false, message: 'Submission not found for this student.' });
    }

    const subData = subDoc.data();
    const file = bucket.file(subData.filePath);

    let exists = false;
    try {
      const [resExists] = await file.exists();
      exists = resExists;
    } catch (e) {
      exists = false;
    }

    if (!exists) {
      return res.status(404).json({ success: false, message: 'File not found in storage.' });
    }

    // Short-lived signed GET URL (15 min)
    const [downloadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000
    });

    return res.json({
      success: true,
      data: {
        downloadUrl,
        fileName: subData.fileName
      }
    });
  } catch (error) {
    console.error('Error generating download URL:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate download URL.' });
  }
}

module.exports = {
  getSubmissionUploadUrl,
  confirmSubmission,
  getAssignmentSubmissions,
  getSubmissionDownloadUrl
};
