const { db } = require('../config/firebase');
const { getAdminEmails } = require('../middleware/authMiddleware');

async function getUsers(req, res) {
  try {
    const { role } = req.query;
    let query = db.collection('users');

    if (role) {
      query = query.where('role', '==', role.toUpperCase());
    }

    const snap = await query.get();
    const users = snap.docs.map(doc => {
      const data = doc.data();
      delete data.password;
      return {
        id: doc.id,
        ...data,
        role: data.role || 'STUDENT'
      };
    });

    users.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    return res.json({ success: true, data: users });
  } catch (error) {
    console.error('Admin getUsers error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch users.' });
  }
}

async function getTeachers(req, res) {
  try {
    const snap = await db.collection('users').where('role', '==', 'TEACHER').get();
    const teachers = snap.docs.map(doc => {
      const data = doc.data();
      delete data.password;
      return {
        id: doc.id,
        ...data,
        role: 'TEACHER'
      };
    });

    teachers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    return res.json({ success: true, data: teachers });
  } catch (error) {
    console.error('Admin getTeachers error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch teachers.' });
  }
}

async function updateUserRole(req, res) {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Only allow STUDENT and TEACHER. Reject ADMIN.
    if (!role || !['STUDENT', 'TEACHER'].includes(role.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: "Only 'STUDENT' and 'TEACHER' roles can be set via API. Admin roles can only be granted via ADMIN_EMAILS."
      });
    }

    // An admin cannot change their own role
    if (id === req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Admins cannot change their own role."
      });
    }

    const targetRole = role.toUpperCase();
    const userRef = db.collection('users').doc(id);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const targetUser = userDoc.data();
    const adminEmails = getAdminEmails();

    // An admin cannot change the role of anyone listed in ADMIN_EMAILS
    if (targetUser.email && adminEmails.includes(targetUser.email.trim().toLowerCase())) {
      return res.status(403).json({
        success: false,
        message: "Cannot modify the role of a user listed in ADMIN_EMAILS."
      });
    }

    await userRef.update({
      role: targetRole,
      updatedAt: new Date().toISOString()
    });

    return res.json({
      success: true,
      message: `User role successfully updated to ${targetRole}.`,
      data: {
        id,
        role: targetRole
      }
    });
  } catch (error) {
    console.error('Admin updateUserRole error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update user role.' });
  }
}

/**
 * Admin endpoint to update student's class (course, semester, division)
 * after it was locked by student onboarding.
 */
const { normalizeClassValue } = require('../utils/classNormalizer');
const { syncClassNotificationsForStudent } = require('../services/notificationService');

async function updateUserClass(req, res) {
  try {
    const { id } = req.params;
    const { course, semester, division } = req.body;

    const userRef = db.collection('users').doc(id);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const updatePayload = {
      updatedAt: new Date().toISOString()
    };
    if (course !== undefined) updatePayload.course = normalizeClassValue(course);
    if (semester !== undefined) updatePayload.semester = normalizeClassValue(semester);
    if (division !== undefined) updatePayload.division = normalizeClassValue(division);
    if (course !== undefined || semester !== undefined || division !== undefined) {
      updatePayload.classAssignedAt = new Date().toISOString();
    }

    await userRef.update(updatePayload);

    const updatedDoc = await userRef.get();
    const updatedData = updatedDoc.data();
    delete updatedData.password;

    if (updatedData.role === 'STUDENT' && updatedData.course && updatedData.semester && updatedData.division) {
      try {
        await syncClassNotificationsForStudent(updatedDoc.id, updatedData.course, updatedData.semester, updatedData.division);
      } catch (e) {}
    }

    return res.json({
      success: true,
      message: 'Student class details updated successfully by administrator.',
      data: {
        id: updatedDoc.id,
        name: updatedData.name,
        course: updatedData.course,
        semester: updatedData.semester,
        division: updatedData.division
      }
    });
  } catch (error) {
    console.error('Admin updateUserClass error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update user class.' });
  }
}

module.exports = {
  getUsers,
  getTeachers,
  updateUserRole,
  updateUserClass
};
