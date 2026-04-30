const express = require('express');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/reactions.controller');

const router = express.Router();

router.use(authenticate);

router.post('/completions/:id/reactions', ctrl.toggleReaction);
router.post('/completions/:id/comments', ctrl.addComment);
router.delete('/comments/:id', ctrl.deleteComment);

module.exports = router;
