/**
 * Notification Service for Firestore
 * Checks assignment deadlines and generates automated reminders without duplicates.
 */

const { db } = require('../config/firebase');

async function generateDeadlineReminders(userId) {
  if (!db || !userId) return;

  try {
    const snap = await db.collection('assignments').where('userId', '==', userId).get();
    const activeAssignments = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(a => a.status !== 'COMPLETED');

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10); // 'YYYY-MM-DD'

    for (const a of activeAssignments) {
      if (!a.deadline) continue;
      const deadline = new Date(a.deadline);
      const diffHours = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

      let reminderTitle = null;
      let reminderType = 'INFO';
      let windowKey = null;

      if (diffHours < 0 && a.status !== 'OVERDUE') {
        reminderTitle = `Overdue Alert: ${a.title}`;
        reminderType = 'URGENT';
        windowKey = 'overdue';
      } else if (diffHours > 0 && diffHours <= 24) {
        reminderTitle = `Due Tomorrow: ${a.title}`;
        reminderType = 'URGENT';
        windowKey = 'due24h';
      } else if (diffHours > 24 && diffHours <= 72) {
        reminderTitle = `Approaching Deadline: ${a.title}`;
        reminderType = 'WARNING';
        windowKey = 'due72h';
      }

      if (reminderTitle && windowKey) {
        // Deterministic doc ID prevents duplicate notifications within the same day/window
        const notifId = `notif_${a.id}_${windowKey}_${dateStr}`;
        const notifRef = db.collection('notifications').doc(notifId);
        const existing = await notifRef.get();

        if (!existing.exists) {
          await notifRef.set({
            id: notifId,
            userId,
            assignmentId: a.id,
            windowKey,
            title: reminderTitle,
            message: `Assignment "${a.title}" is due on ${deadline.toLocaleString()}. Current progress: ${a.progress || 0}%.`,
            type: reminderType,
            isRead: false,
            is_read: 0,
            link: `/assignments/${a.id}`,
            createdAt: now.toISOString()
          });
        }
      }
    }
  } catch (err) {
    console.error('Error generating deadline reminders:', err.message);
  }
}

const { normalizeClassValue } = require('../utils/classNormalizer');

async function getStudentsInClass(course, semester, division) {
  const normCourse = normalizeClassValue(course);
  const normSemester = normalizeClassValue(semester);
  const normDivision = normalizeClassValue(division);

  if (!db || !normCourse || !normSemester || !normDivision) return [];
  try {
    const snap = await db.collection('users').where('course', '==', normCourse).get();
    return snap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(u =>
        normalizeClassValue(u.semester) === normSemester &&
        normalizeClassValue(u.division) === normDivision &&
        (u.role === 'STUDENT' || !u.role)
      );
  } catch (err) {
    console.error('Error fetching students in class:', err.message);
    return [];
  }
}

async function batchWriteNotifications(notifications) {
  if (!notifications || notifications.length === 0) return;
  const CHUNK_SIZE = 400; // Under Firestore's 500 operation limit
  for (let i = 0; i < notifications.length; i += CHUNK_SIZE) {
    const chunk = notifications.slice(i, i + CHUNK_SIZE);
    const batch = db.batch();
    for (const notif of chunk) {
      const ref = db.collection('notifications').doc(notif.id);
      batch.set(ref, notif, { merge: true });
    }
    await batch.commit();
  }
}

async function notifyStudentsForNewAssignment(assignment) {
  if (!assignment || !assignment.course || !assignment.semester || !assignment.division) {
    return 0;
  }
  const students = await getStudentsInClass(assignment.course, assignment.semester, assignment.division);
  const now = new Date().toISOString();
  const formattedDeadline = assignment.deadline
    ? new Date(assignment.deadline).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    : 'No deadline';

  const notifications = students.map(student => ({
    id: `notif_newassign_${assignment.id}_${student.id}`,
    userId: student.id,
    assignmentId: assignment.id,
    title: `New Assignment: ${assignment.title}`,
    message: `Assignment "${assignment.title}" (${assignment.subject || 'General'}) posted by ${assignment.teacherName || 'Teacher'}. Deadline: ${formattedDeadline}. Max Points: ${assignment.maxPoints || 50} pts.`,
    deadline: assignment.deadline,
    subject: assignment.subject || assignment.subjectName || 'General',
    type: 'ASSIGNMENT',
    isRead: false,
    is_read: 0,
    link: `/assignments/${assignment.id}`,
    createdAt: now
  }));

  await batchWriteNotifications(notifications);
  return notifications.length;
}

async function notifyStudentsForAssignmentUpdate(assignment) {
  if (!assignment || !assignment.course || !assignment.semester || !assignment.division) {
    return 0;
  }
  const students = await getStudentsInClass(assignment.course, assignment.semester, assignment.division);
  const now = new Date().toISOString();
  const updateTimestamp = assignment.updatedAt ? new Date(assignment.updatedAt).getTime() : Date.now();
  const notifications = students.map(student => ({
    id: `notif_update_${assignment.id}_${student.id}_${updateTimestamp}`,
    userId: student.id,
    assignmentId: assignment.id,
    title: `Assignment Updated: ${assignment.title}`,
    message: `Assignment "${assignment.title}" details or deadline have been updated by ${assignment.teacherName || 'Teacher'}. Due: ${new Date(assignment.deadline).toLocaleString()}.`,
    type: 'WARNING',
    isRead: false,
    is_read: 0,
    link: `/assignments/${assignment.id}`,
    createdAt: now
  }));

  await batchWriteNotifications(notifications);
  return notifications.length;
}

async function notifyStudentsForAssignmentDeletion(assignment) {
  if (!assignment || !assignment.course || !assignment.semester || !assignment.division) {
    return 0;
  }
  const students = await getStudentsInClass(assignment.course, assignment.semester, assignment.division);
  const now = new Date().toISOString();
  const notifications = students.map(student => ({
    id: `notif_deleted_${assignment.id}_${student.id}`,
    userId: student.id,
    assignmentId: assignment.id,
    title: `Assignment Removed: ${assignment.title}`,
    message: `Assignment "${assignment.title}" was removed by ${assignment.teacherName || 'Teacher'}.`,
    type: 'INFO',
    link: `/assignments`,
    createdAt: now
  }));

  await batchWriteNotifications(notifications);
  return notifications.length;
}

async function syncClassNotificationsForStudent(studentId, course, semester, division) {
  const normCourse = normalizeClassValue(course);
  const normSemester = normalizeClassValue(semester);
  const normDivision = normalizeClassValue(division);

  if (!db || !studentId || !normCourse || !normSemester || !normDivision) return 0;

  try {
    const snap = await db.collection('assignments')
      .where('course', '==', normCourse)
      .get();

    const activeAssignments = snap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(a =>
        normalizeClassValue(a.semester) === normSemester &&
        normalizeClassValue(a.division) === normDivision &&
        a.status !== 'DELETED'
      );

    const notifications = [];
    const now = new Date().toISOString();

    for (const assignment of activeAssignments) {
      const notifId = `notif_newassign_${assignment.id}_${studentId}`;
      const existingDoc = await db.collection('notifications').doc(notifId).get();
      if (!existingDoc.exists) {
        const formattedDeadline = assignment.deadline
          ? new Date(assignment.deadline).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
          : 'No deadline';
        notifications.push({
          id: notifId,
          userId: studentId,
          assignmentId: assignment.id,
          title: `New Assignment: ${assignment.title}`,
          message: `Assignment "${assignment.title}" (${assignment.subject || 'General'}) posted. Deadline: ${formattedDeadline}. Max Points: ${assignment.maxPoints || 50} pts.`,
          type: 'ASSIGNMENT',
          isRead: false,
          is_read: 0,
          link: `/assignments/${assignment.id}`,
          createdAt: assignment.createdAt || now
        });
      }
    }

    if (notifications.length > 0) {
      await batchWriteNotifications(notifications);
    }
    return notifications.length;
  } catch (err) {
    console.error('Error syncing class notifications for student:', err);
    return 0;
  }
}

module.exports = {
  generateDeadlineReminders,
  getStudentsInClass,
  notifyStudentsForNewAssignment,
  notifyStudentsForAssignmentUpdate,
  notifyStudentsForAssignmentDeletion,
  syncClassNotificationsForStudent
};
