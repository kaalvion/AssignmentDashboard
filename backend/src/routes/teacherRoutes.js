const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const submissionController = require('../controllers/submissionController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

router.use(authenticateToken);
router.use(requireRole('TEACHER', 'ADMIN'));

// Teacher assignments management
router.get('/assignments', assignmentController.getTeacherAssignments);
router.post('/assignments', assignmentController.createAssignment);
router.put('/assignments/:id', assignmentController.updateAssignment);
router.delete('/assignments/:id', assignmentController.deleteAssignment);

// Submissions review & download
router.get('/assignments/:id/submissions', submissionController.getAssignmentSubmissions);
router.get('/assignments/:id/submissions/:studentId/download-url', submissionController.getSubmissionDownloadUrl);

module.exports = router;
