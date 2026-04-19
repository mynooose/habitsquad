const express = require('express');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/users.controller');

const router = express.Router();

router.use(authenticate);

router.get('/search', ctrl.searchUsers);
router.get('/:id', ctrl.getUserProfile);

module.exports = router;
