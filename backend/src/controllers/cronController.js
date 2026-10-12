/**
 * Cron Controller
 * Handles automated daily cron jobs for missed penalties and 24h reminders.
 */

const crypto = require('crypto');
const { db } = require('../config/firebase');
const { getStudentsInClass } = require('../services/notificationService');
const { applyMissedPenalty, send24HourReminderIfNeeded } = require('../services/pointsService');

/**
 * Constant-time comparison of incoming Bearer token with CRON_SECRET.
 */
function verifyCronSecret(req) {
  const authHeader = req.headers.authorization || '';
  const configuredSecret = process.env.CRON_SECRET || 'dev_cron_secret_nexus_2026';

  if (!authHeader.startsWith('Bearer ')) return false;

  const token = authHeader.slice(7).trim();
  const tokenBuf = Buffer.from(token, 'utf8');
  const secretBuf = Buffer.from(configuredSecret, 'utf8');

  if (tokenBuf.length !== secretBuf.length) return false;
  return crypto.timingSafeEqual(tokenBuf, secretBuf);
}

/**
 * GET/POST /api/cron/penalties
 * Daily Cron job for applying missed penalties and sending 24h reminders.
 */
async function processPenaltiesCron(req, res) {
  try {
    if (!verifyCronSecret(req)) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid or missing cron secret.'
      });
    }

    if (!db) {
      return res.status(500).json({ success: false, message: 'Database not initialized.' });
    }

    const now = new Date();
    const snap = await db.collection('assignments').get();
    const allAssignments = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    let penalizedStudentsCount = 0;
    const CHUNK_SIZE = 50;

    // 1. Process assignments past deadline for missed penalties
    const pastDeadlineAssignments = allAssignments.filter(a => {
      if (a.status === 'DELETED' || !a.deadline) return false;
      return new Date(a.deadline) < now;
    });

    for (const assignment of pastDeadlineAssignments) {
      if (!assignment.course || !assignment.semester || !assignment.division) continue;

      const students = await getStudentsInClass(
        assignment.course,
        assignment.semester,
        assignment.division
      );

      const subsSnap = await db.collection('assignments').doc(assignment.id).collection('submissions').get();
      const submittedStudentIds = new Set(subsSnap.docs.map(d => d.id));

      const unsubmittedStudents = students.filter(s => !submittedStudentIds.has(s.id));

      for (let i = 0; i < unsubmittedStudents.length; i += CHUNK_SIZE) {
        const chunk = unsubmittedStudents.slice(i, i + CHUNK_SIZE);
        const results = await Promise.all(
          chunk.map(student => applyMissedPenalty(student.id, assignment.id, assignment))
        );
        penalizedStudentsCount += results.filter(r => r && r.penalized).length;
      }

      // Mark penaltiesAppliedAt timestamp on the assignment document
      await db.collection('assignments').doc(assignment.id).set({
        penaltiesAppliedAt: now.toISOString(),
        updatedAt: now.toISOString()
      }, { merge: true });
    }

    // 2. Process upcoming assignments due in <= 24 hours for reminders
    const upcoming24hAssignments = allAssignments.filter(a => {
      if (a.status === 'DELETED' || !a.deadline) return false;
      const diffHours = (new Date(a.deadline) - now) / (1000 * 60 * 60);
      return diffHours > 0 && diffHours <= 24;
    });

    let remindersSentCount = 0;
    for (const assignment of upcoming24hAssignments) {
      if (!assignment.course || !assignment.semester || !assignment.division) continue;
      const students = await getStudentsInClass(
        assignment.course,
        assignment.semester,
        assignment.division
      );
      for (const student of students) {
        await send24HourReminderIfNeeded(student.id, assignment);
        remindersSentCount++;
      }
    }

    return res.json({
      success: true,
      message: 'Daily cron executed successfully.',
      processedPastAssignments: pastDeadlineAssignments.length,
      penalizedStudentsCount,
      upcomingAssignmentsChecked: upcoming24hAssignments.length,
      timestamp: now.toISOString()
    });
  } catch (error) {
    console.error('Cron Execution Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to process daily cron.' });
  }
}

module.exports = {
  processPenaltiesCron,
  verifyCronSecret
};
