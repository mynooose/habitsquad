const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { registerSchema, loginSchema } = require('../utils/validation');
const { generateToken } = require('../middleware/auth');
const { sendVerificationEmail } = require('../utils/mailer');
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

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        verifyToken
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
      message: 'Account created. Please check your email to verify your account.'
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

    const user = await prisma.user.findUnique({ where: { verifyToken: token } });
    if (!user) return res.status(400).json({ error: 'Invalid or expired verification token' });

    if (user.emailVerified) {
      return res.json({ message: 'Email already verified' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, verifyToken: null }
    });

    // Return JWT so user is logged in after verification
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

    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const validPassword = await bcrypt.compare(data.password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Invalid email or password' });

    if (!user.emailVerified) {
      return res.status(403).json({ error: 'Please verify your email before logging in', unverified: true, email: user.email });
    }

    const token = generateToken(user.id);
    res.json({
      user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar, createdAt: user.createdAt },
      token
    });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message });
    next(error);
  }
}

async function getMe(req, res) {
  res.json({ user: req.user });
}

async function updateMe(req, res, next) {
  try {
    const { name, avatar, dob, gender, bio, dailyEmailEnabled } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (avatar !== undefined) data.avatar = avatar;
    if (dob !== undefined) data.dob = dob ? new Date(dob) : null;
    if (gender !== undefined) data.gender = gender;
    if (bio !== undefined) data.bio = bio;
    if (dailyEmailEnabled !== undefined) data.dailyEmailEnabled = dailyEmailEnabled;

    const user = await authQueries.updateUser(req.user.id, data);
    res.json({ user });
  } catch (error) {
    next(error);
  }
}

module.exports = { register, login, verifyEmail, resendVerification, getMe, updateMe };
