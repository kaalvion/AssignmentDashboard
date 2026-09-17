const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'antigravity_assignment_dashboard_secret_key_2026';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired authentication token.' });
    }
    req.user = user;
    next();
  });
}

module.exports = {
  JWT_SECRET,
  authenticateToken
};
