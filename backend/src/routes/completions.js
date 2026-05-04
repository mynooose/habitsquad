const express = require('express');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/completions.controller');

const router = express.Router();

router.use(authenticate);

router.get('/', ctrl.listCompletions);
router.get('/calendar', ctrl.getCalendar);
router.patch('/:id/remark', ctrl.updateRemark);

module.exports = router;
