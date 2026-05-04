const express = require('express');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/reflections.controller');

const router = express.Router();

router.use(authenticate);

router.get('/', ctrl.listReflections);
router.post('/', ctrl.upsertReflection);

module.exports = router;
