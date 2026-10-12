const express = require('express');
const router = express.Router();
const { processPenaltiesCron } = require('../controllers/cronController');

// Support both GET and POST (Vercel crons make GET requests by default)
router.get('/penalties', processPenaltiesCron);
router.post('/penalties', processPenaltiesCron);

module.exports = router;
