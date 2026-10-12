const { db } = require('../config/firebase');
const { normalizeClassValue } = require('../utils/classNormalizer');
const { calculateAssignmentMetrics } = require('./priorityService');

/**
 * Retrieves the effective assignments for a student based on their class targeting
 * and joins each assignment with the student's own submission record.
 * 
 * For students:
 * - Queries assignments targeted to their course, semester, and division.
 * - Inspects assignments/{id}/submissions/{userId} to determine real submissionStatus.
 * - Sets status = 'COMPLETED' if submitted, 'OVERDUE' if past deadline and unsubmitted, or 'PENDING'.
 * 
 * For teachers:
 * - Queries assignments created by the teacher.
 */
async function getEffectiveAssignmentsForUser(userId) {
  if (!db || !userId) return [];

  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) return [];

  const userData = userDoc.data();
  const role = userData.role || 'STUDENT';

  if (role === 'TEACHER') {
    const snap = await db.collection('assignments').where('teacherId', '==', userId).get();
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(a => a.status !== 'DELETED');
  }

  // STUDENT role
  const course = normalizeClassValue(userData.course);
  const semester = normalizeClassValue(userData.semester);
  const division = normalizeClassValue(userData.division);

  let rawAssignments = [];

  if (course && semester && division) {
    const snap = await db.collection('assignments').where('course', '==', course).get();
    rawAssignments = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(a =>
        normalizeClassValue(a.semester) === semester &&
        normalizeClassValue(a.division) === division &&
        a.status !== 'DELETED'
      );
  }

  // Fallback: If no class assignments found, check legacy userId match for backwards-compatibility in tests
  if (rawAssignments.length === 0) {
    const legacySnap = await db.collection('assignments').where('userId', '==', userId).get();
    rawAssignments = legacySnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(a => a.status !== 'DELETED');
  }

  const now = new Date();

  // Parallel lookup for student submissions
  const populatedAssignments = await Promise.all(
    rawAssignments.map(async (assignment) => {
      const subRef = db.collection('assignments').doc(assignment.id).collection('submissions').doc(userId);
      const subSnap = await subRef.get();

      let submissionStatus = 'NOT_SUBMITTED';
      let status = assignment.status || 'PENDING';
      let progress = assignment.progress || 0;
      let completedAt = assignment.completedAt || null;

      if (subSnap.exists) {
        const subData = subSnap.data();
        submissionStatus = subData.status || 'ON_TIME';
        status = 'COMPLETED';
        progress = 100;
        completedAt = subData.submittedAt || now.toISOString();
      } else if (assignment.status === 'COMPLETED') {
        submissionStatus = assignment.submissionStatus || 'ON_TIME';
        status = 'COMPLETED';
        progress = 100;
        completedAt = assignment.completedAt || assignment.completed_at || now.toISOString();
      } else {
        const deadline = assignment.deadline ? new Date(assignment.deadline) : null;
        if (deadline && now > deadline) {
          status = 'OVERDUE';
        } else {
          status = assignment.status || 'PENDING';
        }
      }

      const merged = {
        ...assignment,
        submissionStatus,
        submission_status: submissionStatus,
        status,
        progress,
        completedAt,
        completed_at: completedAt
      };

      const metrics = calculateAssignmentMetrics(merged);
      merged.priorityScore = metrics.priorityScore;
      merged.priority_score = metrics.priorityScore;
      merged.priorityLevel = metrics.priorityLevel;
      merged.priority_level = metrics.priorityLevel;
      merged.riskLevel = metrics.riskLevel;
      merged.risk_level = metrics.riskLevel;

      return merged;
    })
  );

  return populatedAssignments;
}

module.exports = {
  getEffectiveAssignmentsForUser
};
