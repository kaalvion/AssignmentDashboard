const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.get('/', taskController.getMyTasks);
router.post('/', taskController.createPersonalTask);
router.put('/:id', taskController.updatePersonalTask);
router.delete('/:id', taskController.deletePersonalTask);

module.exports = router;
