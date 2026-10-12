const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.get('/', groupController.getGroups);
router.post('/', groupController.createGroup);
router.post('/join', groupController.joinGroup);
router.get('/:id', groupController.getGroupById);
router.delete('/:id', groupController.deleteGroup);
router.post('/:id/leave', groupController.leaveGroup);
router.delete('/:id/members/:member_id', groupController.removeMember);

// Group Tasks
router.post('/:id/tasks', groupController.addGroupTask);
router.put('/:id/tasks/:task_id', groupController.updateGroupTask);
router.put('/tasks/:task_id', groupController.updateGroupTask);

module.exports = router;
