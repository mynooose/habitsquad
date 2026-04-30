const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { registerSchema, loginSchema } = require('../utils/validation');
const { generateToken } = require('../middleware/auth');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/mailer');
const { sendOtpSms, normalizePhone, generateOtp } = require('../utils/sms');
const authQueries = require('../queries/auth.queries');
const prisma = require('../database/prisma');

async function register(req, res, next) {
  try {
    const data = registerSchema.parse(req.body);

    const existingUser = await authQueries.findUserByEmail(data.email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);
    const verifyToken = crypto.randomBytes(32).toString('hex');

    const tz = (typeof req.body?.timezone === 'string' && req.body.timezone.length < 64) ? req.body.timezone : 'UTC';
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        verifyToken,
        timezone: tz
      },
      select: { id: true, email: true, name: true, emailVerified: true, createdAt: true }
    });

    // Send verification email
    try {
      await sendVerificationEmail({ to: data.email, name: data.name, token: verifyToken });
    } catch (emailErr) {
      console.error('Failed to send verification email:', emailErr.message);
    }

    res.status(201).json({
      user,
      message: 'Account created. Please check your email to verify your account.',
      requiresVerification: true
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    next(error);
  }
}

async function verifyEmail(req, res, next) {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Verification token is required' });

    // Atomic: match by token, update in one go. If token was already consumed, this finds nothing.
    const user = await prisma.user.findUnique({ where: { verifyToken: token } });

    if (!user) {
      // Token may have been consumed already - check if user is verified
      return res.status(400).json({ error: 'Invalid or already used verification link. Please log in or request a new link.' });
    }

    if (user.emailVerified) {
      const jwtToken = generateToken(user.id);
      return res.json({ message: 'Email already verified', token: jwtToken, user: { id: user.id, email: user.email, name: user.name } });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, verifyToken: null }
    });

    const jwtToken = generateToken(user.id);
    res.json({
      message: 'Email verified successfully',
      token: jwtToken,
      user: { id: user.id, email: user.email, name: user.name }
    });
  } catch (error) {
    next(error);
  }
}

async function resendVerification(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await authQueries.findUserByEmail(email);
    if (!user) return res.status(404).json({ error: 'No account with this email' });
    if (user.emailVerified) return res.json({ message: 'Email already verified' });

    const verifyToken = crypto.randomBytes(32).toString('hex');
    await prisma.user.update({ where: { id: user.id }, data: { verifyToken } });

    await sendVerificationEmail({ to: email, name: user.name, token: verifyToken });
    res.json({ message: 'Verification email sent' });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const data = loginSchema.parse(req.body);
    const user = await authQueries.findUserByEmail(data.email);

    if (!user || user.deletedAt) return res.status(401).json({ error: 'Invalid email or password' });

    const validPassword = await bcrypt.compare(data.password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Invalid email or password' });

    if (!user.emailVerified) {
      return res.status(403).json({ error: 'Please verify your email before logging in', unverified: true, email: user.email });
    }

    const token = generateToken(user.id);
    res.json({
      user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar, createdAt: user.createdAt, totalXp: user.totalXp, onboardedAt: user.onboardedAt },
      token
    });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message });
    next(error);
  }
}

async function getMe(req, res, next) {
  try {
    const user = await authQueries.findUserById(req.user.id);
    res.json({ user });
  } catch (error) { next(error); }
}

async function updateMe(req, res, next) {
  try {
    const { name, avatar, dob, gender, bio, dailyEmailEnabled, dailyEmailTime, timezone, onboardedAt } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (avatar !== undefined) data.avatar = avatar;
    if (dob !== undefined) data.dob = dob ? new Date(dob) : null;
    if (gender !== undefined) data.gender = gender;
    if (bio !== undefined) data.bio = bio;
    if (dailyEmailEnabled !== undefined) data.dailyEmailEnabled = dailyEmailEnabled;
    if (dailyEmailTime !== undefined && /^\d{2}:\d{2}$/.test(dailyEmailTime)) data.dailyEmailTime = dailyEmailTime;
    if (timezone !== undefined && typeof timezone === 'string' && timezone.length < 64) data.timezone = timezone;
    if (onboardedAt !== undefined) data.onboardedAt = onboardedAt ? new Date(onboardedAt) : null;

    const user = await authQueries.updateUser(req.user.id, data);
    res.json({ user });
  } catch (error) {
    next(error);
  }
}

async function deleteAccount(req, res, next) {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { deletedAt: new Date(), dailyEmailEnabled: false }
    });
    res.json({ success: true });
  } catch (error) { next(error); }
}

async function forgotPassword(req, res, next) {
  try {
    const email = (req.body?.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'Email is required' });

    // Always respond with the same success message regardless of account existence.
    const user = await authQueries.findUserByEmail(email);
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken: token, resetTokenExpiry: expiry }
      });
      sendPasswordResetEmail({ to: email, token }).catch(err => console.error('Reset email failed:', err.message));
    }
    res.json({ success: true, message: 'If that email is registered, a reset link is on the way.' });
  } catch (error) { next(error); }
}

async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body || {};
    if (!token || !password) return res.status(400).json({ error: 'Token and new password are required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const user = await prisma.user.findUnique({ where: { resetToken: token } });
    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      return res.status(400).json({ error: 'This reset link is invalid or has expired.' });
    }

    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, resetToken: null, resetTokenExpiry: null }
    });

    const jwtToken = generateToken(user.id);
    res.json({ success: true, token: jwtToken, user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) { next(error); }
}

function hashOtp(otp, phone) {
  return crypto.createHash('sha256').update(`${otp}:${phone}:${process.env.JWT_SECRET || 'fallback-secret-change-me'}`).digest('hex');
}

async function sendPhoneOtp(req, res, next) {
  try {
    const phone = normalizePhone(req.body?.phone);
    if (!phone) return res.status(400).json({ error: 'Invalid phone number' });

    const name = (typeof req.body?.name === 'string' && req.body.name.trim()) ? req.body.name.trim() : null;
    const tz = (typeof req.body?.timezone === 'string' && req.body.timezone.length < 64) ? req.body.timezone : 'Asia/Kolkata';

    let user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      // First-time signup via phone. Email is optional and can be added later in profile.
      // Generate a placeholder email to satisfy NOT NULL + UNIQUE constraint.
      const placeholderEmail = `phone+${phone}@habitsquad.local`;
      user = await prisma.user.create({
        data: {
          email: placeholderEmail,
          password: '!phone-only',
          name: name || `User${phone.slice(-4)}`,
          phone,
          timezone: tz,
          emailVerified: false
        }
      });
    }

    if (user.deletedAt) return res.status(403).json({ error: 'Account no longer active' });

    const otp = generateOtp();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpHash: hashOtp(otp, phone),
        otpExpiry: new Date(Date.now() + 10 * 60 * 1000),
        otpAttempts: 0
      }
    });

    try {
      await sendOtpSms(phone, otp);
    } catch (smsErr) {
      console.error('SMS send failed:', smsErr.message);
      return res.status(502).json({ error: 'Could not send the verification code right now. Please try again.' });
    }

    res.json({ success: true, message: 'OTP sent' });
  } catch (error) { next(error); }
}

async function verifyPhoneOtp(req, res, next) {
  try {
    const phone = normalizePhone(req.body?.phone);
    const code = String(req.body?.code || '').trim();
    if (!phone) return res.status(400).json({ error: 'Invalid phone number' });
    if (!/^\d{4,8}$/.test(code)) return res.status(400).json({ error: 'Invalid code' });

    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user || user.deletedAt) return res.status(400).json({ error: 'Code expired or not requested. Try sending again.' });
    if (!user.otpHash || !user.otpExpiry) return res.status(400).json({ error: 'Code expired or not requested. Try sending again.' });
    if (user.otpExpiry < new Date()) return res.status(400).json({ error: 'Code expired. Send a new one.' });
    if ((user.otpAttempts || 0) >= 5) return res.status(429).json({ error: 'Too many attempts. Send a new code.' });

    const expected = hashOtp(code, phone);
    if (expected !== user.otpHash) {
      await prisma.user.update({ where: { id: user.id }, data: { otpAttempts: { increment: 1 } } });
      return res.status(400).json({ error: 'Incorrect code' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpHash: null,
        otpExpiry: null,
        otpAttempts: 0,
        phoneVerified: true,
        emailVerified: user.email.includes('@habitsquad.local') ? user.emailVerified : true
      }
    });

    const token = generateToken(user.id);
    res.json({
      success: true,
      token,
      user: {
        id: user.id, email: user.email, name: user.name, avatar: user.avatar,
        createdAt: user.createdAt, totalXp: user.totalXp, onboardedAt: user.onboardedAt,
        phone: user.phone
      }
    });
  } catch (error) { next(error); }
}

module.exports = { register, login, verifyEmail, resendVerification, getMe, updateMe, forgotPassword, resetPassword, deleteAccount, sendPhoneOtp, verifyPhoneOtp };
