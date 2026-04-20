const express = require('express');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/notifications.controller');

const router = express.Router();
router.use(authenticate);

router.get('/', ctrl.listNotifications);
router.post('/:id/read', ctrl.markAsRead);
router.post('/read-all', ctrl.markAllRead);
router.post('/:id/respond', ctrl.respondToNotification);

module.exports = router;
