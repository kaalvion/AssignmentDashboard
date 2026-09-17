const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.get('/', groupController.getGroups);
router.post('/', groupController.createGroup);
router.post('/join', groupController.joinGroup);
router.get('/:id', groupController.getGroupById);
router.post('/:id/tasks', groupController.addGroupTask);
router.put('/tasks/:task_id', groupController.updateGroupTask);

module.exports = router;
