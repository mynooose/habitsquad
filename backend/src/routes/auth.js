const express = require('express');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/auth.controller');

const router = express.Router();

router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.get('/verify', ctrl.verifyEmail);
router.post('/resend-verification', ctrl.resendVerification);
router.post('/forgot-password', ctrl.forgotPassword);
router.post('/reset-password', ctrl.resetPassword);
router.post('/phone/send-otp', ctrl.sendPhoneOtp);
router.post('/phone/verify-otp', ctrl.verifyPhoneOtp);
router.get('/me', authenticate, ctrl.getMe);
router.put('/me', authenticate, ctrl.updateMe);
router.delete('/me', authenticate, ctrl.deleteAccount);

module.exports = router;
