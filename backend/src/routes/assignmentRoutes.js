const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const subtaskController = require('../controllers/subtaskController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

// Subjects
router.get('/subjects', assignmentController.getSubjects);
router.post('/subjects', assignmentController.createSubject);

// Assignments CRUD
router.get('/', assignmentController.getAssignments);
router.post('/', assignmentController.createAssignment);
router.get('/:id', assignmentController.getAssignmentById);
router.put('/:id', assignmentController.updateAssignment);
router.delete('/:id', assignmentController.deleteAssignment);

// Subtasks
router.post('/:id/subtasks', subtaskController.addSubtask);
router.put('/subtasks/:subtask_id', subtaskController.updateSubtask);
router.delete('/subtasks/:subtask_id', subtaskController.deleteSubtask);

// Resources
router.post('/:id/resources', subtaskController.addResource);
router.delete('/resources/:resource_id', subtaskController.deleteResource);

module.exports = router;
