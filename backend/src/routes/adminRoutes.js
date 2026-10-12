const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

router.use(authenticateToken);
router.use(requireRole('ADMIN'));

router.get('/users', adminController.getUsers);
router.get('/teachers', adminController.getTeachers);
router.put('/users/:id/role', adminController.updateUserRole);
router.put('/users/:id/class', adminController.updateUserClass);

module.exports = router;
