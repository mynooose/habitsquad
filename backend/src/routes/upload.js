const express = require('express');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/upload.controller');

const router = express.Router();

router.use(authenticate);
router.post('/', ctrl.uploadImage);

module.exports = router;
