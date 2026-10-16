const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/firebase');
const { JWT_SECRET, ensureUserDoc, resolveRoleForUser } = require('../middleware/authMiddleware');
const { seedDefaultSubjectsForUser } = require('../seed');
const { normalizeClassValue } = require('../utils/classNormalizer');
const { syncClassNotificationsForStudent } = require('../services/notificationService');

async function register(req, res) {
  try {
    const { name, email, password, course, semester, division, avatarUrl, avatar_url } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const role = resolveRoleForUser(cleanEmail);

    const normCourse = normalizeClassValue(course);
    const normSemester = normalizeClassValue(semester);
    const normDivision = normalizeClassValue(division);

    // If role is STUDENT, require course, semester, and division
    if (role === 'STUDENT' && (!normCourse || !normSemester || !normDivision)) {
      return res.status(400).json({
        success: false,
        message: 'Students must provide course, semester, and division.'
      });
    }

    // Check if email already registered in Firestore
    const existingSnap = await db.collection('users').where('email', '==', cleanEmail).limit(1).get();
    if (!existingSnap.empty) {
      return res.status(409).json({ success: false, message: 'User with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userRef = db.collection('users').doc();
    const userId = userRef.id;

    const userObj = {
      id: userId,
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      role, // Resolved securely by server, never from client body
      course: normCourse,
      semester: normSemester,
      division: normDivision,
      classAssignedAt: (normCourse && normSemester && normDivision) ? new Date().toISOString() : null,
      avatarUrl: avatarUrl || avatar_url || null,
      avatar_url: avatarUrl || avatar_url || null,
      points: 0,
      streak: 0,
      createdAt: new Date().toISOString()
    };

    await userRef.set(userObj);

    // Auto-create default subjects for new student
    if (role === 'STUDENT') {
      await seedDefaultSubjectsForUser(userId);
    }

    // Welcome Notification
    await db.collection('notifications').add({
      userId,
      title: 'Welcome to Assignment Deadline Dashboard! 🚀',
      message: role === 'TEACHER' 
        ? 'Welcome Teacher! You can now manage and publish assignments for your classes.' 
        : 'Your subjects have been loaded. Start tracking assignments now!',
      type: 'SUCCESS',
      isRead: false,
      is_read: 0,
      link: '/assignments',
      createdAt: new Date().toISOString()
    });

    const token = jwt.sign({ id: userId, email: userObj.email, name: userObj.name, role }, JWT_SECRET, { expiresIn: '7d' });

    delete userObj.password;
    userObj.needsOnboarding = role === 'STUDENT' && (!userObj.course || !userObj.semester || !userObj.division);

    return res.status(201).json({
      success: true,
      message: 'Registration successful.',
      data: { token, user: userObj }
    });
  } catch (error) {
    console.error('Registration Error:', error);
    return res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const snap = await db.collection('users').where('email', '==', cleanEmail).limit(1).get();
    if (snap.empty) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const userDoc = snap.docs[0];
    const user = { id: userDoc.id, ...userDoc.data() };

    if (!user.password) {
      return res.status(401).json({ success: false, message: 'Please sign in via Clerk or registered provider.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const userRole = user.role || 'STUDENT';
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: userRole }, JWT_SECRET, { expiresIn: '7d' });
    delete user.password;
    user.needsOnboarding = userRole === 'STUDENT' && (!user.course || !user.semester || !user.division);

    return res.json({
      success: true,
      message: 'Login successful.',
      data: { token, user }
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
}

async function getMe(req, res) {
  try {
    if (!db) {
      return res.status(503).json({
        success: false,
        message: 'Firebase database is not connected. Please add Firebase credentials to Vercel Environment Variables.'
      });
    }

    const userDoc = await db.collection('users').doc(req.user.id).get();
    if (!userDoc.exists) {
      const created = await ensureUserDoc(req.user.id, req.user);
      return res.json({ success: true, data: created });
    }

    const data = userDoc.data();
    delete data.password;

    // Re-evaluate role against ADMIN_EMAILS in case admin email was added
    const effectiveEmail = (req.user?.email || data.email || '').trim().toLowerCase();
    const resolvedRole = resolveRoleForUser(effectiveEmail, data.role);
    if (resolvedRole !== data.role) {
      await db.collection('users').doc(req.user.id).update({
        role: resolvedRole,
        ...(effectiveEmail ? { email: effectiveEmail } : {})
      });
      data.role = resolvedRole;
      if (effectiveEmail) data.email = effectiveEmail;
    }

    const role = data.role || 'STUDENT';
    const needsOnboarding = role === 'STUDENT' && (!data.course || !data.semester || !data.division);

    return res.json({
      success: true,
      data: {
        id: userDoc.id,
        ...data,
        role,
        needsOnboarding
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return res.status(500).json({ success: false, message: 'Error fetching user profile.' });
  }
}

async function updateProfile(req, res) {
  try {
    if (!db) {
      return res.status(503).json({
        success: false,
        message: 'Firebase database is not connected. Please add Firebase credentials to Vercel Environment Variables.'
      });
    }

    // Notice: role from req.body is explicitly excluded!
    const { name, course, semester, division, avatarUrl, avatar_url } = req.body;
    const userRef = db.collection('users').doc(req.user.id);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const currentData = userDoc.data();
    const role = currentData.role || 'STUDENT';

    // Lock check: if role is STUDENT and class is already completed, lock changes
    const normCourse = course !== undefined ? normalizeClassValue(course) : undefined;
    const normSemester = semester !== undefined ? normalizeClassValue(semester) : undefined;
    const normDivision = division !== undefined ? normalizeClassValue(division) : undefined;

    if (role === 'STUDENT') {
      const isAlreadyOnboarded = Boolean(currentData.course && currentData.semester && currentData.division);
      if (isAlreadyOnboarded) {
        const attemptedCourseChange = normCourse !== undefined && normCourse !== currentData.course;
        const attemptedSemesterChange = normSemester !== undefined && normSemester !== currentData.semester;
        const attemptedDivisionChange = normDivision !== undefined && normDivision !== currentData.division;

        if (attemptedCourseChange || attemptedSemesterChange || attemptedDivisionChange) {
          return res.status(403).json({
            success: false,
            message: 'Class details (course, semester, division) are locked after initial onboarding. Contact an administrator to update your class.'
          });
        }
      }
    }

    const updatePayload = {
      updatedAt: new Date().toISOString()
    };
    if (name !== undefined) updatePayload.name = name.trim();
    if (normCourse !== undefined) updatePayload.course = normCourse;
    if (normSemester !== undefined) updatePayload.semester = normSemester;
    if (normDivision !== undefined) updatePayload.division = normDivision;
    if (normCourse || normSemester || normDivision) {
      if (!currentData.classAssignedAt) {
        updatePayload.classAssignedAt = new Date().toISOString();
      }
    }
    if (avatarUrl !== undefined || avatar_url !== undefined) {
      const url = avatarUrl || avatar_url;
      updatePayload.avatarUrl = url;
      updatePayload.avatar_url = url;
    }

    await userRef.set(updatePayload, { merge: true });

    const updatedSnap = await userRef.get();
    const updatedData = updatedSnap.data();
    delete updatedData.password;
    const finalRole = updatedData.role || 'STUDENT';
    const needsOnboarding = finalRole === 'STUDENT' && (!updatedData.course || !updatedData.semester || !updatedData.division);

    if (finalRole === 'STUDENT' && updatedData.course && updatedData.semester && updatedData.division) {
      try {
        await syncClassNotificationsForStudent(updatedSnap.id, updatedData.course, updatedData.semester, updatedData.division);
      } catch (err) {
        console.warn('Notice: Failed syncing class notifications on onboarding:', err.message);
      }
    }

    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      data: {
        id: updatedSnap.id,
        ...updatedData,
        role: finalRole,
        needsOnboarding
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({ success: false, message: 'Error updating profile.' });
  }
}

module.exports = {
  register,
  login,
  getMe,
  updateProfile
};
