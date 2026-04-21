const express = require('express');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/reactions.controller');

const router = express.Router();

router.use(authenticate);

router.post('/completions/:id/reactions', ctrl.toggleReaction);

module.exports = router;
