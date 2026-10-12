const jwt = require('jsonwebtoken');
const { verifyToken, createClerkClient } = require('@clerk/backend');
const { db } = require('../config/firebase');
const { seedDefaultSubjectsForUser } = require('../seed');

const JWT_SECRET = process.env.JWT_SECRET || 'antigravity_assignment_dashboard_secret_key_2026';

// In-memory cache for Clerk user lookups in production (TTL: 5 minutes)
const clerkUserCache = new Map();

function getAdminEmails() {
  const envEmails = process.env.ADMIN_EMAILS || '';
  return envEmails.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
}

function resolveRoleForUser(email, existingRole = null) {
  const adminEmails = getAdminEmails();
  if (email && adminEmails.includes(email.trim().toLowerCase())) {
    return 'ADMIN';
  }
  if (existingRole && ['ADMIN', 'TEACHER', 'STUDENT'].includes(existingRole)) {
    return existingRole;
  }
  return 'STUDENT';
}

function getClerkClient() {
  if (!process.env.CLERK_SECRET_KEY && !process.env.CLERK_JWT_KEY) return null;
  return createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
    jwtKey: process.env.CLERK_JWT_KEY
  });
}

/**
 * Fetch and verify primary email directly from Clerk Backend API.
 * Uses cached result if within TTL (5 minutes).
 */
async function getVerifiedClerkEmail(clerkUserId) {
  const cached = clerkUserCache.get(clerkUserId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.email;
  }

  const clerk = getClerkClient();
  if (!clerk) return null;

  try {
    const clerkUser = await clerk.users.getUser(clerkUserId);
    if (!clerkUser || !clerkUser.emailAddresses) return null;

    // Find primary email
    const primaryEmailObj = clerkUser.emailAddresses.find(
      e => e.id === clerkUser.primaryEmailAddressId
    );

    // Accept ONLY if primary email is VERIFIED
    const isVerified = primaryEmailObj && primaryEmailObj.verification && primaryEmailObj.verification.status === 'verified';
    const verifiedEmail = isVerified ? primaryEmailObj.emailAddress.trim().toLowerCase() : null;

    clerkUserCache.set(clerkUserId, {
      email: verifiedEmail,
      name: clerkUser.fullName || `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'Student',
      expiresAt: Date.now() + 5 * 60 * 1000 // 5-minute TTL
    });

    return verifiedEmail;
  } catch (err) {
    console.error('Clerk getUser API error:', err.message);
    return null;
  }
}

const DEFAULT_FALLBACK_USER = {
  id: 'demo_student_alex',
  name: 'Alex Johnson',
  email: 'alex.student@college.edu',
  role: 'STUDENT',
  course: 'BCA',
  semester: '4th',
  division: 'A',
  points: 285,
  streak: 5,
  needsOnboarding: false
};

/**
 * Ensures user document exists in Firestore.
 * Automatically creates the user doc and default subjects on first login if missing.
 */
async function ensureUserDoc(userId, extraData = {}) {
  if (!db || !userId) return DEFAULT_FALLBACK_USER;

  const userRef = db.collection('users').doc(userId);
  const userSnap = await userRef.get();

  if (userSnap.exists) {
    const data = userSnap.data();
    delete data.password;

    const effectiveEmail = (extraData.email || data.email || '').trim().toLowerCase();
    if (extraData.email && (!data.email || data.email.toLowerCase() !== extraData.email.toLowerCase())) {
      await userRef.update({ email: extraData.email.toLowerCase() });
      data.email = extraData.email.toLowerCase();
    }

    // Check if email belongs to ADMIN_EMAILS and update role if needed
    const resolvedRole = resolveRoleForUser(effectiveEmail, data.role);
    if (resolvedRole !== data.role) {
      await userRef.update({ role: resolvedRole });
      data.role = resolvedRole;
    }

    const currentRole = data.role || 'STUDENT';
    const needsOnboarding = currentRole === 'STUDENT' && (!data.course || !data.semester || !data.division);

    return {
      id: userSnap.id,
      ...data,
      role: currentRole,
      needsOnboarding: Boolean(needsOnboarding)
    };
  }

  // Auto-create user document on first login
  const email = (extraData.email || `${userId}@nexus.edu`).trim().toLowerCase();
  const role = resolveRoleForUser(email, extraData.role);

  const newUser = {
    id: userId,
    name: extraData.name || 'Student',
    email,
    role,
    course: extraData.course || '',
    semester: extraData.semester || '',
    division: extraData.division || '',
    avatarUrl: extraData.avatarUrl || extraData.avatar_url || null,
    avatar_url: extraData.avatarUrl || extraData.avatar_url || null,
    points: 0,
    streak: 0,
    createdAt: new Date().toISOString()
  };

  await userRef.set(newUser, { merge: true });

  // Auto-seed default subjects for students only
  if (role === 'STUDENT') {
    try {
      await seedDefaultSubjectsForUser(userId);
    } catch (err) {
      console.warn('Failed to seed default subjects for user:', userId, err.message);
    }
  }

  const needsOnboarding = role === 'STUDENT' && (!newUser.course || !newUser.semester || !newUser.division);

  return {
    ...newUser,
    needsOnboarding: Boolean(needsOnboarding)
  };
}

async function authenticateToken(req, res, next) {
  const isProduction = process.env.NODE_ENV === 'production';
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  // ==========================================
  // 1. PRODUCTION MODE: STRICT CLERK AUTH ONLY
  // ==========================================
  if (isProduction) {
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Bearer token is required.'
      });
    }

    try {
      const verified = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
        jwtKey: process.env.CLERK_JWT_KEY
      });

      if (!verified || !verified.sub) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: Invalid token claims.'
        });
      }

      const userId = verified.sub;
      
      // In production, fetch verified primary email directly from Clerk Backend API (cached)
      const verifiedPrimaryEmail = await getVerifiedClerkEmail(userId);
      const cached = clerkUserCache.get(userId);

      const user = await ensureUserDoc(userId, {
        email: verifiedPrimaryEmail || null,
        name: cached?.name || verified.name || verified.firstName
      });

      req.user = user;
      return next();
    } catch (error) {
      console.error('Clerk Token Verification Failed in production:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid or expired token.'
      });
    }
  }

  // ====================================================
  // 2. DEVELOPMENT / TEST MODE: LOCAL JWT & DEV SHORTCUTS
  // ====================================================
  try {
    const customUserId = req.headers['x-user-id'];
    const customEmail = req.headers['x-user-email'];
    const customName = req.headers['x-user-name'];
    let resolvedUserId = null;
    let extraUserData = {};

    // A) Header shortcut (dev only)
    if (customUserId) {
      resolvedUserId = customUserId;
      if (customEmail) extraUserData.email = customEmail.trim().toLowerCase();
      if (customName) extraUserData.name = customName;
    }
    // B) Bearer token check
    else if (token && token !== 'undefined' && token !== 'null') {
      if (process.env.CLERK_SECRET_KEY || process.env.CLERK_JWT_KEY) {
        try {
          const verified = await verifyToken(token, {
            secretKey: process.env.CLERK_SECRET_KEY,
            jwtKey: process.env.CLERK_JWT_KEY
          });
          if (verified && verified.sub) {
            resolvedUserId = verified.sub;
            extraUserData = {
              email: verified.email,
              name: verified.name
            };
          }
        } catch (e) {}
      }

      if (!resolvedUserId) {
        try {
          const decoded = jwt.decode(token);
          if (decoded && (decoded.sub || decoded.id)) {
            resolvedUserId = decoded.sub || decoded.id;
            if (decoded.email) extraUserData.email = decoded.email;
          }
        } catch (e) {}
      }

      if (!resolvedUserId) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          resolvedUserId = decoded.id;
          extraUserData = {
            email: decoded.email,
            name: decoded.name
          };
        } catch (err) {
          if (typeof token === 'string' && (token.startsWith('user_') || token.length > 5)) {
            resolvedUserId = token;
          }
        }
      }
    }

    if (!resolvedUserId) {
      resolvedUserId = DEFAULT_FALLBACK_USER.id;
      extraUserData = DEFAULT_FALLBACK_USER;
    }

    const user = await ensureUserDoc(resolvedUserId, extraUserData);
    req.user = user;
    return next();
  } catch (error) {
    console.error('Dev Auth Middleware Error:', error);
    req.user = DEFAULT_FALLBACK_USER;
    return next();
  }
}

/**
 * Role-Based Access Control (RBAC) Middleware.
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    const userRole = req.user.role || 'STUDENT';
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Requires one of [${allowedRoles.join(', ')}] role. Current role is '${userRole}'.`
      });
    }

    next();
  };
}

module.exports = {
  JWT_SECRET,
  DEFAULT_FALLBACK_USER,
  authenticateToken,
  requireRole,
  ensureUserDoc,
  resolveRoleForUser,
  getAdminEmails,
  getVerifiedClerkEmail
};
