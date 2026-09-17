const express = require('express');
const router = express.Router();
const plannerController = require('../controllers/plannerController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.get('/', plannerController.getPlanner);

module.exports = router;
