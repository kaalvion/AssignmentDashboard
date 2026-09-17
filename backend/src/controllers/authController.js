const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, get, run } = require('../config/db');
const { JWT_SECRET } = require('../middleware/authMiddleware');

async function register(req, res) {
  try {
    const { name, email, password, course, semester, division } = req.body;

    if (!name || !email || !password || !course || !semester || !division) {
      return res.status(400).json({ success: false, message: 'All registration fields are required.' });
    }

    const existingUser = await get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'User with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await run(
      `INSERT INTO users (name, email, password, course, semester, division) VALUES (?, ?, ?, ?, ?, ?)`,
      [name, email, hashedPassword, course, semester, division]
    );

    const userId = result.id;

    // Create default subjects for new student
    const defaultSubjects = [
      { name: 'Database Management System', code: 'DBMS', color: '#4F46E5' },
      { name: 'Java Programming', code: 'JAVA', color: '#059669' },
      { name: 'Web Development', code: 'WEB', color: '#D97706' },
      { name: 'Mathematics', code: 'MATH', color: '#DC2626' },
      { name: 'Software Engineering', code: 'SE', color: '#7C3AED' }
    ];

    for (const sub of defaultSubjects) {
      await run(`INSERT INTO subjects (user_id, name, code, color) VALUES (?, ?, ?, ?)`, [
        userId,
        sub.name,
        sub.code,
        sub.color
      ]);
    }

    // Welcome Notification
    await run(
      `INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)`,
      [userId, 'Welcome to Assignment Deadline Dashboard! 🚀', 'Your default subjects have been loaded. Start tracking assignments now!', 'SUCCESS']
    );

    const token = jwt.sign({ id: userId, email, name }, JWT_SECRET, { expiresIn: '7d' });

    const userObj = { id: userId, name, email, course, semester, division, points: 0, streak: 0 };

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

    const user = await get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });

    delete user.password;

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
    const user = await get('SELECT id, name, email, course, semester, division, avatar_url, points, streak, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    return res.json({ success: true, data: user });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error fetching user profile.' });
  }
}

async function updateProfile(req, res) {
  try {
    const { name, course, semester, division } = req.body;
    await run(
      `UPDATE users SET name = ?, course = ?, semester = ?, division = ? WHERE id = ?`,
      [name, course, semester, division, req.user.id]
    );
    const updated = await get('SELECT id, name, email, course, semester, division, avatar_url, points, streak FROM users WHERE id = ?', [req.user.id]);
    return res.json({ success: true, message: 'Profile updated successfully.', data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error updating profile.' });
  }
}

module.exports = {
  register,
  login,
  getMe,
  updateProfile
};
