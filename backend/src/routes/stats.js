const express = require('express');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/stats.controller');

const router = express.Router();

router.use(authenticate);

router.get('/daily', ctrl.getDaily);
router.get('/streak', ctrl.getStreak);
router.get('/overview', ctrl.getOverview);
router.get('/dashboard', ctrl.getDashboard);
router.get('/rankings', ctrl.getRankings);

module.exports = router;
