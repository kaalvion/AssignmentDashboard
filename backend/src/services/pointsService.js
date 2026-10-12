/**
 * Points and Penalty Service
 * Handles transactional point awards, early bonuses, streak updates, and missed penalties.
 */

const { db } = require('../config/firebase');
const { calculateSubmissionPoints, calculateMissedPenalty } = require('../config/pointsConfig');
const { checkAndAwardAchievements } = require('./gamificationService');

/**
 * Awards points for an assignment submission inside a Firestore transaction.
 * Uses deterministic document ID `award_${assignmentId}` inside `users/{userId}/points`.
 * 
 * Rules:
 * - Deterministic doc ID prevents double-awarding on resubmission, retries, or parallel requests.
 * - If late after a missed penalty was applied, the late award is granted while the penalty remains.
 * - Streak is incremented only for ON_TIME submissions.
 * - User total points floor at 0.
 * - Automatically triggers achievement checks.
 */
async function awardSubmissionPoints(userId, assignmentId, assignment, status, submittedAt) {
  if (!db || !userId || !assignmentId) {
    return { awarded: false, message: 'Invalid parameters' };
  }

  const userRef = db.collection('users').doc(userId);
  const awardRef = userRef.collection('points').doc(`award_${assignmentId}`);

  let pointsAwarded = 0;
  let isEarlyBonus = false;
  let currentPoints = 0;
  let wasAlreadyAwarded = false;

  await db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef);
    const awardDoc = await transaction.get(awardRef);

    if (awardDoc.exists) {
      wasAlreadyAwarded = true;
      currentPoints = userDoc.exists ? (userDoc.data().points || 0) : 0;
      return;
    }

    const userData = userDoc.exists ? userDoc.data() : {};
    const calculation = calculateSubmissionPoints(
      assignment.maxPoints || assignment.max_points || 50,
      status,
      submittedAt,
      assignment.deadline
    );

    pointsAwarded = calculation.points;
    isEarlyBonus = calculation.isEarly;

    const prevPoints = Number(userData.points) || 0;
    currentPoints = Math.max(0, prevPoints + pointsAwarded);

    const nowIso = new Date().toISOString();

    // 1. Create deterministic award record
    transaction.set(awardRef, {
      id: `award_${assignmentId}`,
      assignmentId,
      userId,
      points: pointsAwarded,
      basePoints: calculation.basePoints,
      earlyBonus: calculation.earlyBonus,
      isEarly: isEarlyBonus,
      status,
      reason: isEarlyBonus
        ? `On-time submission (+${calculation.basePoints} pts) + 24h early bonus (+${calculation.earlyBonus} pts)`
        : (status === 'ON_TIME'
            ? `On-time submission (+${pointsAwarded} pts)`
            : `Late submission (+${pointsAwarded} pts)`),
      createdAt: nowIso
    });

    // 2. Update user profile (points, and streak only if ON_TIME)
    const userUpdate = {
      points: currentPoints,
      updatedAt: nowIso
    };

    if (status === 'ON_TIME') {
      const prevStreak = Number(userData.streak) || 0;
      userUpdate.streak = prevStreak + 1;
    }

    transaction.set(userRef, userUpdate, { merge: true });
  });

  if (wasAlreadyAwarded) {
    return { awarded: false, reason: 'ALREADY_AWARDED', currentPoints };
  }

  // 3. Notify student of points awarded (deterministic notification ID)
  try {
    const notifId = `notif_award_${assignmentId}_${userId}`;
    await db.collection('notifications').doc(notifId).set({
      id: notifId,
      userId,
      assignmentId,
      title: isEarlyBonus ? '⚡ Early Submission Bonus!' : '🎉 Points Awarded!',
      message: isEarlyBonus
        ? `You earned +${pointsAwarded} points (including a 30% early bird bonus) for "${assignment.title || 'Assignment'}"!`
        : `You earned +${pointsAwarded} points for your ${status === 'ON_TIME' ? 'on-time' : 'late'} submission on "${assignment.title || 'Assignment'}".`,
      type: 'SUCCESS',
      isRead: false,
      is_read: 0,
      link: `/assignments/${assignmentId}`,
      createdAt: new Date().toISOString()
    }, { merge: true });
  } catch (notifErr) {
    console.error('Error sending points award notification:', notifErr.message);
  }

  // 4. Trigger achievements evaluation
  try {
    await checkAndAwardAchievements(userId);
  } catch (achErr) {
    console.error('Error evaluating achievements after award:', achErr.message);
  }

  return {
    awarded: true,
    pointsAwarded,
    isEarly: isEarlyBonus,
    currentPoints
  };
}

/**
 * Applies a missed assignment penalty inside a Firestore transaction.
 * Uses deterministic document ID `penalty_${assignmentId}` inside `users/{userId}/points`.
 * 
 * Rules:
 * - Only applies if the deadline has passed AND the student has no submission.
 * - Deterministic doc ID guarantees penalty is applied at most once per assignment.
 * - User total points floor at 0.
 * 
 * Note on deadline extension:
 * If a teacher extends an assignment deadline into the future, students will not receive missed
 * penalties until the new deadline passes. If a penalty was already applied under the old deadline,
 * it remains in place (it is not reversed or altered).
 */
async function applyMissedPenalty(userId, assignmentId, assignment) {
  if (!db || !userId || !assignmentId) {
    return { penalized: false, reason: 'INVALID_PARAMS' };
  }

  const deadline = new Date(assignment.deadline);
  if (isNaN(deadline.getTime()) || Date.now() <= deadline.getTime()) {
    // Deadline is still in the future (or teacher extended it)
    return { penalized: false, reason: 'NOT_PAST_DEADLINE' };
  }

  const userRef = db.collection('users').doc(userId);
  const penaltyRef = userRef.collection('points').doc(`penalty_${assignmentId}`);
  const subRef = db.collection('assignments').doc(assignmentId).collection('submissions').doc(userId);

  let deduction = 0;
  let newPoints = 0;
  let wasSkipped = false;
  let skipReason = '';

  await db.runTransaction(async (transaction) => {
    const penaltyDoc = await transaction.get(penaltyRef);
    if (penaltyDoc.exists) {
      wasSkipped = true;
      skipReason = 'ALREADY_PENALIZED';
      return;
    }

    const subDoc = await transaction.get(subRef);
    if (subDoc.exists) {
      wasSkipped = true;
      skipReason = 'ALREADY_SUBMITTED';
      return;
    }

    const userDoc = await transaction.get(userRef);
    const userData = userDoc.exists ? userDoc.data() : {};

    // 1. Penalties only apply for assignments created AFTER the student was assigned to that class
    const assignCreatedAt = assignment.createdAt || assignment.created_at;
    if (userData.classAssignedAt && assignCreatedAt) {
      if (new Date(assignCreatedAt).getTime() < new Date(userData.classAssignedAt).getTime()) {
        wasSkipped = true;
        skipReason = 'ASSIGNED_AFTER_CREATION';
        return;
      }
    }

    const nominalDeduction = calculateMissedPenalty(assignment.maxPoints || assignment.max_points || 50);
    const prevPoints = Number(userData.points) || 0;
    newPoints = Math.max(0, prevPoints - nominalDeduction); // Floor at 0
    deduction = prevPoints - newPoints; // Actual points deducted (capped by 0 floor)

    const nowIso = new Date().toISOString();

    // 2. Write deterministic penalty record with ACTUAL deducted points so ledger matches balance
    transaction.set(penaltyRef, {
      id: `penalty_${assignmentId}`,
      assignmentId,
      userId,
      points: -deduction,
      nominalDeduction,
      type: 'MISSED_PENALTY',
      reason: deduction < nominalDeduction
        ? `Missed assignment deadline penalty (-${deduction} pts, capped by 0 floor from nominal -${nominalDeduction}) for "${assignment.title || 'Assignment'}"`
        : `Missed assignment deadline penalty (-${deduction} pts) for "${assignment.title || 'Assignment'}"`,
      createdAt: nowIso
    });

    // 3. Update user profile points (floored at 0)
    transaction.set(userRef, {
      points: newPoints,
      updatedAt: nowIso
    }, { merge: true });
  });

  if (wasSkipped) {
    return { penalized: false, reason: skipReason };
  }

  // 3. Notify student of penalty (deterministic notification ID)
  try {
    const notifId = `notif_penalty_${assignmentId}_${userId}`;
    await db.collection('notifications').doc(notifId).set({
      id: notifId,
      userId,
      assignmentId,
      title: '⚠️ Missed Assignment Penalty',
      message: `A penalty of -${deduction} points was applied for missing the deadline on "${assignment.title || 'Assignment'}".`,
      type: 'URGENT',
      isRead: false,
      is_read: 0,
      link: `/assignments/${assignmentId}`,
      createdAt: new Date().toISOString()
    }, { merge: true });
  } catch (notifErr) {
    console.error('Error sending penalty notification:', notifErr.message);
  }

  return {
    penalized: true,
    deduction,
    newPoints
  };
}

/**
 * Checks if a 24-hour deadline reminder should be sent to a student.
 * Sent only if the student has NOT submitted yet.
 */
async function send24HourReminderIfNeeded(studentId, assignment) {
  if (!db || !studentId || !assignment || !assignment.deadline) return;

  const now = Date.now();
  const deadline = new Date(assignment.deadline).getTime();
  const diffHours = (deadline - now) / (1000 * 60 * 60);

  // Check if within 24 hours of deadline and not yet past
  if (diffHours <= 0 || diffHours > 24) return;

  // Check if student already submitted
  const subDoc = await db.collection('assignments').doc(assignment.id).collection('submissions').doc(studentId).get();
  if (subDoc.exists) return; // Already submitted, skip reminder

  const notifId = `notif_reminder_24h_${assignment.id}_${studentId}`;
  const notifRef = db.collection('notifications').doc(notifId);
  const existing = await notifRef.get();
  if (existing.exists) return; // Prevent duplicate

  await notifRef.set({
    id: notifId,
    userId: studentId,
    assignmentId: assignment.id,
    title: `⏰ Due in 24 Hours: ${assignment.title}`,
    message: `Assignment "${assignment.title}" is due on ${new Date(assignment.deadline).toLocaleString()}. Submit soon to avoid missed penalties!`,
    type: 'URGENT',
    isRead: false,
    is_read: 0,
    link: `/assignments/${assignment.id}`,
    createdAt: new Date().toISOString()
  });
}

/**
 * Evaluates and applies missed penalties for a student on assignments past their deadline.
 * Used for lazy penalty checks on dashboard and assignment listings.
 */
async function evaluateLazyPenaltiesForStudent(studentId, assignments = []) {
  if (!db || !studentId || !Array.isArray(assignments)) return;
  const now = Date.now();
  const pastDeadline = assignments.filter(a => {
    if (!a.deadline || a.status === 'DELETED') return false;
    return new Date(a.deadline).getTime() < now;
  });

  for (const a of pastDeadline) {
    try {
      await applyMissedPenalty(studentId, a.id, a);
    } catch (err) {
      console.warn(`Lazy penalty evaluation warning for ${a.id}:`, err.message);
    }
  }
}

module.exports = {
  awardSubmissionPoints,
  applyMissedPenalty,
  send24HourReminderIfNeeded,
  evaluateLazyPenaltiesForStudent
};

