const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const subtaskController = require('../controllers/subtaskController');
const submissionController = require('../controllers/submissionController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

router.use(authenticateToken);

// Subjects
router.get('/subjects', assignmentController.getSubjects);
router.post('/subjects', assignmentController.createSubject);
router.put('/subjects/:id', assignmentController.updateSubject);
router.delete('/subjects/:id', assignmentController.deleteSubject);

// Teacher assignments listing
router.get('/teacher/my', requireRole('TEACHER', 'ADMIN'), assignmentController.getTeacherAssignments);

// Submissions (Student upload flow)
router.post('/:id/submission/upload-url', submissionController.getSubmissionUploadUrl);
router.post('/:id/submission/confirm', submissionController.confirmSubmission);

// Assignments CRUD
router.get('/', assignmentController.getAssignments);
router.post('/', requireRole('TEACHER', 'ADMIN'), assignmentController.createAssignment);
router.get('/:id', assignmentController.getAssignmentById);
router.put('/:id', requireRole('TEACHER', 'ADMIN'), assignmentController.updateAssignment);
router.delete('/:id', requireRole('TEACHER', 'ADMIN'), assignmentController.deleteAssignment);

// Subtasks
router.post('/:id/subtasks', subtaskController.addSubtask);
router.put('/subtasks/:subtask_id', subtaskController.updateSubtask);
router.delete('/subtasks/:subtask_id', subtaskController.deleteSubtask);

// Resources
router.post('/:id/resources', subtaskController.addResource);
router.delete('/resources/:resource_id', subtaskController.deleteResource);

module.exports = router;
