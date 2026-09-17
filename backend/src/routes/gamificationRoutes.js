const express = require('express');
const router = express.Router();
const gamificationController = require('../controllers/gamificationController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.get('/leaderboard', gamificationController.getLeaderboard);
router.get('/achievements', gamificationController.getAchievements);
router.get('/star-of-month', gamificationController.getStarOfMonth);

module.exports = router;
