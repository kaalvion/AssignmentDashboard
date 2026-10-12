const { db, bucket } = require('../config/firebase');
const { calculateAssignmentMetrics } = require('../services/priorityService');
const { awardPoints, POINT_RULES, checkAndAwardAchievements } = require('../services/gamificationService');
const { normalizeClassValue } = require('../utils/classNormalizer');
const {
  notifyStudentsForNewAssignment,
  notifyStudentsForAssignmentUpdate,
  notifyStudentsForAssignmentDeletion,
  getStudentsInClass
} = require('../services/notificationService');
const { evaluateLazyPenaltiesForStudent } = require('../services/pointsService');

/**
 * Format assignment object to guarantee both camelCase and snake_case properties
 * so all existing React UI components continue working without issues.
 */
function formatAssignmentResponse(data, id = null) {
  if (!data) return null;
  const docId = id || data.id;

  const estimatedHours = data.estimatedHours !== undefined ? Number(data.estimatedHours) : (data.estimated_hours !== undefined ? Number(data.estimated_hours) : 1.0);
  const priorityScore = data.priorityScore !== undefined ? Number(data.priorityScore) : (data.priority_score !== undefined ? Number(data.priority_score) : 0);
  const progress = data.progress !== undefined ? Number(data.progress) : 0;
  const maxPoints = data.maxPoints !== undefined ? Number(data.maxPoints) : (data.max_points !== undefined ? Number(data.max_points) : 100);
  const allowLate = data.allowLate !== undefined ? Boolean(data.allowLate) : (data.allow_late !== undefined ? Boolean(data.allow_late) : true);
  const teacherName = data.teacherName || data.teacher_name || data.teacher || 'Teacher';
  const submissionStatus = data.submissionStatus || data.submission_status || 'NOT_SUBMITTED';

  const subtasks = (data.subtasks || []).map(st => {
    const mins = st.estimatedMinutes !== undefined ? Number(st.estimatedMinutes) : (st.estimated_minutes !== undefined ? Number(st.estimated_minutes) : 30);
    const isComp = Boolean(st.isCompleted || st.is_completed === 1 || st.is_completed === true);
    return {
      ...st,
      id: st.id,
      title: st.title,
      estimatedMinutes: mins,
      estimated_minutes: mins,
      isCompleted: isComp,
      is_completed: isComp ? 1 : 0
    };
  });

  const resources = (data.resources || []).map(r => ({
    ...r,
    id: r.id,
    title: r.title,
    type: r.type,
    urlOrPath: r.urlOrPath || r.url_or_path,
    url_or_path: r.urlOrPath || r.url_or_path,
    fileSize: r.fileSize !== undefined ? Number(r.fileSize) : (r.file_size !== undefined ? Number(r.file_size) : 0),
    file_size: r.fileSize !== undefined ? Number(r.fileSize) : (r.file_size !== undefined ? Number(r.file_size) : 0)
  }));

  return {
    ...data,
    id: docId,
    userId: data.userId || data.user_id,
    user_id: data.userId || data.user_id,
    subjectId: data.subjectId || data.subject_id,
    subject_id: data.subjectId || data.subject_id,
    subjectName: data.subjectName || data.subject_name || data.subject || 'General',
    subject_name: data.subjectName || data.subject_name || data.subject || 'General',
    subject: data.subject || data.subjectName || data.subject_name || 'General',
    subjectCode: data.subjectCode || data.subject_code || '',
    subject_code: data.subjectCode || data.subject_code || '',
    subjectColor: data.subjectColor || data.subject_color || '#4F46E5',
    subject_color: data.subjectColor || data.subject_color || '#4F46E5',
    title: data.title,
    description: data.description || '',
    deadline: data.deadline,
    difficulty: data.difficulty || 'MEDIUM',
    estimatedHours,
    estimated_hours: estimatedHours,
    progress,
    status: data.status || 'ACTIVE',
    maxPoints,
    max_points: maxPoints,
    allowLate,
    allow_late: allowLate,
    course: data.course || '',
    semester: data.semester || '',
    division: data.division || '',
    teacherId: data.teacherId || data.teacher_id || '',
    teacher_id: data.teacherId || data.teacher_id || '',
    teacherName,
    teacher_name: teacherName,
    teacher: teacherName,
    submissionStatus,
    submission_status: submissionStatus,
    submissionMethod: data.submissionMethod || data.submission_method || '',
    submission_method: data.submissionMethod || data.submission_method || '',
    notes: data.notes || '',
    priorityScore,
    priority_score: priorityScore,
    priorityLevel: data.priorityLevel || data.priority_level || 'MEDIUM',
    priority_level: data.priorityLevel || data.priority_level || 'MEDIUM',
    riskLevel: data.riskLevel || data.risk_level || 'SAFE',
    risk_level: data.riskLevel || data.risk_level || 'SAFE',
    completedAt: data.completedAt || data.completed_at || null,
    completed_at: data.completedAt || data.completed_at || null,
    createdAt: data.createdAt || data.created_at || new Date().toISOString(),
    created_at: data.createdAt || data.created_at || new Date().toISOString(),
    subtasks,
    resources
  };
}

// ==========================================
// SUBJECTS CONTROLLER (STEP 3)
// ==========================================

async function getSubjects(req, res) {
  try {
    const userId = req.user.id;
    const snap = await db.collection('subjects').where('userId', '==', userId).get();

    const subjects = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    subjects.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    return res.json({ success: true, data: subjects });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch subjects.' });
  }
}

async function createSubject(req, res) {
  try {
    const userId = req.user.id;
    const { name, code, color } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Subject name is required.' });
    }

    const subRef = db.collection('subjects').doc();
    const newSubject = {
      userId,
      name: name.trim(),
      code: code ? code.trim() : '',
      color: color || '#4F46E5',
      createdAt: new Date().toISOString()
    };

    await subRef.set(newSubject);

    return res.status(201).json({
      success: true,
      message: 'Subject created successfully.',
      data: { id: subRef.id, ...newSubject }
    });
  } catch (error) {
    console.error('Error creating subject:', error);
    return res.status(500).json({ success: false, message: 'Failed to create subject.' });
  }
}

async function updateSubject(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { name, code, color } = req.body;

    const subRef = db.collection('subjects').doc(id);
    const subSnap = await subRef.get();

    if (!subSnap.exists) {
      return res.status(404).json({ success: false, message: 'Subject not found.' });
    }

    const currentSub = subSnap.data();
    if (currentSub.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized to update this subject.' });
    }

    const updatedData = {
      ...currentSub,
      name: name !== undefined ? name.trim() : currentSub.name,
      code: code !== undefined ? code.trim() : currentSub.code,
      color: color !== undefined ? color : currentSub.color,
      updatedAt: new Date().toISOString()
    };

    const batch = db.batch();
    batch.update(subRef, updatedData);

    const assignSnap = await db.collection('assignments')
      .where('userId', '==', userId)
      .where('subjectId', '==', id)
      .get();

    assignSnap.docs.forEach(doc => {
      batch.update(doc.ref, {
        subjectName: updatedData.name,
        subject_name: updatedData.name,
        subjectCode: updatedData.code,
        subject_code: updatedData.code,
        subjectColor: updatedData.color,
        subject_color: updatedData.color
      });
    });

    await batch.commit();

    return res.json({
      success: true,
      message: 'Subject updated successfully.',
      data: { id, ...updatedData }
    });
  } catch (error) {
    console.error('Error updating subject:', error);
    return res.status(500).json({ success: false, message: 'Failed to update subject.' });
  }
}

async function deleteSubject(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const subRef = db.collection('subjects').doc(id);
    const subSnap = await subRef.get();

    if (!subSnap.exists) {
      return res.status(404).json({ success: false, message: 'Subject not found.' });
    }

    const currentSub = subSnap.data();
    if (currentSub.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized to delete this subject.' });
    }

    const assignSnap = await db.collection('assignments')
      .where('userId', '==', userId)
      .where('subjectId', '==', id)
      .get();

    const batch = db.batch();
    batch.delete(subRef);
    assignSnap.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    return res.json({
      success: true,
      message: 'Subject and associated assignments deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting subject:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete subject.' });
  }
}

// ==========================================
// ASSIGNMENTS CONTROLLER (PHASE B TEACHER FLOW)
// ==========================================

async function getAssignments(req, res) {
  try {
    const user = req.user;
    const userRole = user.role || 'STUDENT';
    const { subject_id, status, difficulty, search, sort, teacher_id, course, semester, division } = req.query;

    let assignments = [];

    if (userRole === 'TEACHER') {
      // List teacher's own assignments
      const snap = await db.collection('assignments')
        .where('teacherId', '==', user.id)
        .get();
      assignments = snap.docs.map(doc => formatAssignmentResponse(doc.data(), doc.id));
    } else if (userRole === 'ADMIN') {
      // Admin lists all active assignments
      const snap = await db.collection('assignments').get();
      assignments = snap.docs.map(doc => formatAssignmentResponse(doc.data(), doc.id));
      if (teacher_id) {
        assignments = assignments.filter(a => a.teacherId === teacher_id || a.teacher_id === teacher_id);
      }
    } else {
      // STUDENT: Match student's course, semester, and division
      let studentCourse = user.course;
      let studentSemester = user.semester;
      let studentDivision = user.division;

      if (!studentCourse || !studentSemester || !studentDivision) {
        const uDoc = await db.collection('users').doc(user.id).get();
        if (uDoc.exists) {
          const uData = uDoc.data();
          studentCourse = studentCourse || uData.course;
          studentSemester = studentSemester || uData.semester;
          studentDivision = studentDivision || uData.division;
        }
      }

      const normStudentCourse = normalizeClassValue(studentCourse);
      const normStudentSemester = normalizeClassValue(studentSemester);
      const normStudentDivision = normalizeClassValue(studentDivision);

      if (!normStudentCourse || !normStudentSemester || !normStudentDivision) {
        return res.json({ success: true, data: [] });
      }

      // Query assignments targeting student's course without composite index
      const snap = await db.collection('assignments')
        .where('course', '==', normStudentCourse)
        .get();

      assignments = snap.docs
        .map(doc => formatAssignmentResponse(doc.data(), doc.id))
        .filter(a =>
          normalizeClassValue(a.semester) === normStudentSemester &&
          normalizeClassValue(a.division) === normStudentDivision &&
          a.status !== 'DELETED'
        );

      // Populate student's real submission status for each assignment
      assignments = await Promise.all(
        assignments.map(async (a) => {
          const subDoc = await db.collection('assignments').doc(a.id).collection('submissions').doc(user.id).get();
          if (subDoc.exists) {
            const subData = subDoc.data();
            const subStatus = subData.status || 'ON_TIME';
            return {
              ...a,
              submissionStatus: subStatus,
              submission_status: subStatus,
              status: 'COMPLETED',
              completedAt: subData.submittedAt
            };
          }
          return {
            ...a,
            submissionStatus: 'NOT_SUBMITTED',
            submission_status: 'NOT_SUBMITTED'
          };
        })
      );

      // Lazy evaluation: check and apply missed penalties for past-deadline assignments without submission
      await evaluateLazyPenaltiesForStudent(user.id, assignments);
    }

    // In-memory Filtering
    if (course) assignments = assignments.filter(a => a.course === course);
    if (semester) assignments = assignments.filter(a => a.semester === semester);
    if (division) assignments = assignments.filter(a => a.division === division);
    if (subject_id) {
      assignments = assignments.filter(a => a.subjectId === subject_id || a.subject_id === subject_id || a.subject === subject_id);
    }
    if (status) {
      assignments = assignments.filter(a => a.status === status);
    }
    if (difficulty) {
      assignments = assignments.filter(a => a.difficulty === difficulty);
    }
    if (search) {
      const q = search.trim().toLowerCase();
      assignments = assignments.filter(a =>
        (a.title && a.title.toLowerCase().includes(q)) ||
        (a.subjectName && a.subjectName.toLowerCase().includes(q)) ||
        (a.description && a.description.toLowerCase().includes(q)) ||
        (a.teacherName && a.teacherName.toLowerCase().includes(q))
      );
    }

    // Dynamic Priority/Risk Recalculation on read
    assignments = assignments.map(assignment => {
      const metrics = calculateAssignmentMetrics(assignment);
      assignment.priorityScore = metrics.priorityScore;
      assignment.priority_score = metrics.priorityScore;
      assignment.priorityLevel = metrics.priorityLevel;
      assignment.priority_level = metrics.priorityLevel;
      assignment.riskLevel = metrics.riskLevel;
      assignment.risk_level = metrics.riskLevel;
      return assignment;
    });

    // In-memory Sorting
    if (sort === 'priority') {
      assignments.sort((a, b) => b.priority_score - a.priority_score);
    } else if (sort === 'deadline') {
      assignments.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    } else if (sort === 'difficulty') {
      const order = { EXTREME: 4, HARD: 3, MEDIUM: 2, EASY: 1 };
      assignments.sort((a, b) => (order[b.difficulty] || 0) - (order[a.difficulty] || 0));
    } else if (sort === 'progress') {
      assignments.sort((a, b) => b.progress - a.progress);
    } else {
      assignments.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    }

    return res.json({ success: true, data: assignments });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch assignments.' });
  }
}

async function getAssignmentById(req, res) {
  try {
    const { id } = req.params;
    const docRef = db.collection('assignments').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    const data = doc.data();
    if (data.status === 'DELETED') {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    const userRole = req.user.role || 'STUDENT';
    if (userRole === 'STUDENT') {
      const userDoc = await db.collection('users').doc(req.user.id).get();
      const userData = userDoc.exists ? userDoc.data() : req.user;
      const studentClassMatches =
        userData.course === data.course &&
        userData.semester === data.semester &&
        userData.division === data.division;

      if (!studentClassMatches && data.userId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Unauthorized to view this assignment.' });
      }
    }

    let assignment = formatAssignmentResponse(data, doc.id);

    if (userRole === 'STUDENT') {
      const subDoc = await db.collection('assignments').doc(id).collection('submissions').doc(req.user.id).get();
      if (subDoc.exists) {
        const subData = subDoc.data();
        assignment.submissionStatus = subData.status || 'ON_TIME';
        assignment.submission_status = subData.status || 'ON_TIME';
        assignment.status = 'COMPLETED';
        assignment.completedAt = subData.submittedAt;
      } else {
        assignment.submissionStatus = 'NOT_SUBMITTED';
        assignment.submission_status = 'NOT_SUBMITTED';
      }
    }

    const metrics = calculateAssignmentMetrics(assignment);
    assignment.priorityScore = metrics.priorityScore;
    assignment.priority_score = metrics.priorityScore;
    assignment.priorityLevel = metrics.priorityLevel;
    assignment.priority_level = metrics.priorityLevel;
    assignment.riskLevel = metrics.riskLevel;
    assignment.risk_level = metrics.riskLevel;

    return res.json({ success: true, data: assignment });
  } catch (error) {
    console.error('Error fetching assignment by id:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch assignment details.' });
  }
}

async function createAssignment(req, res) {
  try {
    const userRole = req.user.role || 'STUDENT';
    if (userRole !== 'TEACHER' && userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Students cannot create class assignments.'
      });
    }

    const {
      title,
      description,
      subject,
      subject_id,
      deadline,
      maxPoints,
      max_points,
      allowLate,
      allow_late,
      course,
      semester,
      division,
      difficulty = 'MEDIUM',
      estimated_hours = 1.0,
      subtasks = [],
      resources = []
    } = req.body;

    // 1. Title validation
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Title is required.' });
    }

    // 2. Deadline validation (must be valid future date)
    if (!deadline) {
      return res.status(400).json({ success: false, message: 'Deadline is required.' });
    }
    const deadlineDate = new Date(deadline);
    if (isNaN(deadlineDate.getTime()) || deadlineDate.getTime() <= Date.now()) {
      return res.status(400).json({ success: false, message: 'Deadline must be a valid future date.' });
    }

    // 3. maxPoints validation (must be positive number)
    const pointsVal = maxPoints !== undefined ? maxPoints : max_points;
    const points = Number(pointsVal);
    if (pointsVal === undefined || isNaN(points) || points <= 0) {
      return res.status(400).json({ success: false, message: 'maxPoints must be a positive number.' });
    }

    // 4. Target class validation
    if (!course || !semester || !division) {
      return res.status(400).json({
        success: false,
        message: 'Target class (course, semester, division) is required.'
      });
    }

    // 5. Teacher details (stored strictly from verified token/user doc, never request body)
    const teacherId = req.user.id;
    let teacherName = req.user.name;
    if (!teacherName || teacherName === 'Student' || teacherName === 'User') {
      const tDoc = await db.collection('users').doc(teacherId).get();
      if (tDoc.exists && tDoc.data().name) {
        teacherName = tDoc.data().name;
      } else {
        teacherName = teacherName || 'Teacher';
      }
    }

    const allowLateVal = allowLate !== undefined ? Boolean(allowLate) : (allow_late !== undefined ? Boolean(allow_late) : true);
    const subjectName = subject ? subject.trim() : (req.body.subject_name ? req.body.subject_name.trim() : 'General');

    const formattedSubtasks = (subtasks || []).map((st, idx) => ({
      id: st.id || `st_${Date.now()}_${idx}`,
      title: st.title || 'Task',
      estimatedMinutes: st.estimated_minutes || st.estimatedMinutes || 30,
      estimated_minutes: st.estimated_minutes || st.estimatedMinutes || 30,
      isCompleted: Boolean(st.isCompleted || st.is_completed === 1),
      is_completed: (st.isCompleted || st.is_completed === 1) ? 1 : 0,
      createdAt: new Date().toISOString()
    }));

    const formattedResources = (resources || []).map((r, idx) => ({
      id: r.id || `res_${Date.now()}_${idx}`,
      title: r.title || 'Resource',
      type: r.type || 'URL',
      urlOrPath: r.url_or_path || r.urlOrPath || '',
      url_or_path: r.url_or_path || r.urlOrPath || '',
      fileSize: r.file_size || r.fileSize || 0,
      file_size: r.file_size || r.fileSize || 0,
      createdAt: new Date().toISOString()
    }));

    const metrics = calculateAssignmentMetrics({
      deadline: deadlineDate.toISOString(),
      difficulty,
      estimated_hours: parseFloat(estimated_hours),
      progress: 0,
      status: 'ACTIVE'
    });

    const assignRef = db.collection('assignments').doc();
    const newAssignment = {
      id: assignRef.id,
      title: title.trim(),
      description: description ? description.trim() : '',
      subject: subjectName,
      subjectName,
      subject_name: subjectName,
      subjectId: subject_id || '',
      subject_id: subject_id || '',
      deadline: deadlineDate.toISOString(),
      maxPoints: points,
      max_points: points,
      allowLate: allowLateVal,
      allow_late: allowLateVal,
      course: normalizeClassValue(course),
      semester: normalizeClassValue(semester),
      division: normalizeClassValue(division),
      teacherId,
      teacher_id: teacherId,
      teacherName,
      teacher_name: teacherName,
      teacher: teacherName,
      userId: teacherId, // backwards compatibility
      user_id: teacherId,
      difficulty,
      estimatedHours: parseFloat(estimated_hours),
      estimated_hours: parseFloat(estimated_hours),
      progress: 0,
      status: 'ACTIVE',
      priorityScore: metrics.priorityScore,
      priority_score: metrics.priorityScore,
      priorityLevel: metrics.priorityLevel,
      priority_level: metrics.priorityLevel,
      riskLevel: metrics.riskLevel,
      risk_level: metrics.riskLevel,
      subtasks: formattedSubtasks,
      resources: formattedResources,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await assignRef.set(newAssignment);

    // 6. Notify every student in the target class (chunked by 400 with deterministic IDs)
    const notifCount = await notifyStudentsForNewAssignment({ id: assignRef.id, ...newAssignment });

    return res.status(201).json({
      success: true,
      message: 'Assignment created successfully.',
      data: formatAssignmentResponse(newAssignment, assignRef.id),
      notificationCount: notifCount
    });
  } catch (error) {
    console.error('Error creating assignment:', error);
    return res.status(500).json({ success: false, message: 'Failed to create assignment.' });
  }
}

async function updateAssignment(req, res) {
  try {
    const userRole = req.user.role || 'STUDENT';
    if (userRole !== 'TEACHER' && userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Students cannot edit assignments.'
      });
    }

    const { id } = req.params;
    const docRef = db.collection('assignments').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    const existing = doc.data();

    // Check ownership: Only creator teacher or ADMIN can edit
    const isCreator = (existing.teacherId && existing.teacherId === req.user.id) ||
                      (existing.userId && existing.userId === req.user.id);
    const isAdmin = userRole === 'ADMIN';

    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only the teacher who created this assignment or an admin can edit it.'
      });
    }

    const {
      title,
      description,
      subject,
      deadline,
      maxPoints,
      max_points,
      allowLate,
      allow_late,
      course,
      semester,
      division,
      difficulty,
      estimated_hours,
      status
    } = req.body;

    const updatePayload = {
      updatedAt: new Date().toISOString()
    };

    if (title !== undefined) {
      if (!title || !title.trim()) {
        return res.status(400).json({ success: false, message: 'Title cannot be empty.' });
      }
      updatePayload.title = title.trim();
    }

    if (description !== undefined) updatePayload.description = description.trim();

    if (subject !== undefined) {
      updatePayload.subject = subject.trim();
      updatePayload.subjectName = subject.trim();
      updatePayload.subject_name = subject.trim();
    }

    if (deadline !== undefined) {
      const d = new Date(deadline);
      if (isNaN(d.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid deadline date.' });
      }
      updatePayload.deadline = d.toISOString();
    }

    const pointsVal = maxPoints !== undefined ? maxPoints : max_points;
    if (pointsVal !== undefined) {
      const p = Number(pointsVal);
      if (isNaN(p) || p <= 0) {
        return res.status(400).json({ success: false, message: 'maxPoints must be a positive number.' });
      }
      updatePayload.maxPoints = p;
      updatePayload.max_points = p;
    }

    const allowLateVal = allowLate !== undefined ? allowLate : allow_late;
    if (allowLateVal !== undefined) {
      updatePayload.allowLate = Boolean(allowLateVal);
      updatePayload.allow_late = Boolean(allowLateVal);
    }

    if (course !== undefined) updatePayload.course = normalizeClassValue(course);
    if (semester !== undefined) updatePayload.semester = normalizeClassValue(semester);
    if (division !== undefined) updatePayload.division = normalizeClassValue(division);
    if (difficulty !== undefined) updatePayload.difficulty = difficulty;
    if (status !== undefined) updatePayload.status = status;
    if (estimated_hours !== undefined) {
      updatePayload.estimatedHours = parseFloat(estimated_hours);
      updatePayload.estimated_hours = parseFloat(estimated_hours);
    }

    await docRef.update(updatePayload);

    const merged = { ...existing, ...updatePayload };

    // Notify students of update
    await notifyStudentsForAssignmentUpdate({ id, ...merged });

    return res.json({
      success: true,
      message: 'Assignment updated successfully.',
      data: formatAssignmentResponse(merged, id)
    });
  } catch (error) {
    console.error('Error updating assignment:', error);
    return res.status(500).json({ success: false, message: 'Failed to update assignment.' });
  }
}

async function deleteAssignment(req, res) {
  try {
    const userRole = req.user.role || 'STUDENT';
    if (userRole !== 'TEACHER' && userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Students cannot delete assignments.'
      });
    }

    const { id } = req.params;
    const docRef = db.collection('assignments').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    const existing = doc.data();

    // Check ownership: Only creator teacher or ADMIN can delete
    const isCreator = (existing.teacherId && existing.teacherId === req.user.id) ||
                      (existing.userId && existing.userId === req.user.id);
    const isAdmin = userRole === 'ADMIN';

    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only the teacher who created this assignment or an admin can delete it.'
      });
    }

    // 1. Delete submissions subcollection
    const subsSnap = await db.collection('assignments').doc(id).collection('submissions').get();
    if (!subsSnap.empty) {
      const subBatch = db.batch();
      subsSnap.docs.forEach(d => subBatch.delete(d.ref));
      await subBatch.commit();
    }

    // 2. Delete PDF files in Storage for this assignment
    if (bucket) {
      await bucket.deleteFiles({ prefix: `submissions/${id}/` }).catch(err => {
        console.warn('Notice: Storage files cleanup warning:', err.message);
      });
    }

    // 3. Notify students that assignment was removed
    await notifyStudentsForAssignmentDeletion({ id, ...existing });

    // 4. Remove from Firestore
    await docRef.delete();

    return res.json({ success: true, message: 'Assignment deleted successfully.' });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete assignment.' });
  }
}

async function getTeacherAssignments(req, res) {
  try {
    const user = req.user;
    let query = db.collection('assignments');
    if (user.role !== 'ADMIN') {
      query = query.where('teacherId', '==', user.id);
    }
    const snap = await query.get();

    let assignments = snap.docs
      .map(doc => formatAssignmentResponse(doc.data(), doc.id))
      .filter(a => a.status !== 'DELETED');

    assignments.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    // Calculate submission counts for teacher dashboard & my assignments list
    assignments = await Promise.all(
      assignments.map(async (a) => {
        try {
          const subsSnap = await db.collection('assignments').doc(a.id).collection('submissions').get();
          let submittedCount = 0;
          let lateCount = 0;
          subsSnap.forEach(sDoc => {
            submittedCount++;
            if (sDoc.data().status === 'LATE') lateCount++;
          });

          const students = await getStudentsInClass(a.course, a.semester, a.division);
          const totalStudents = students.length;
          const onTimeCount = submittedCount - lateCount;
          const missingCount = Math.max(0, totalStudents - submittedCount);

          return {
            ...a,
            submittedCount,
            lateCount,
            onTimeCount,
            missingCount,
            totalStudents
          };
        } catch (e) {
          return {
            ...a,
            submittedCount: 0,
            lateCount: 0,
            onTimeCount: 0,
            missingCount: 0,
            totalStudents: 0
          };
        }
      })
    );

    return res.json({ success: true, data: assignments });
  } catch (error) {
    console.error('Error fetching teacher assignments:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch teacher assignments.' });
  }
}

module.exports = {
  formatAssignmentResponse,
  getAssignments,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getTeacherAssignments,
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject
};
