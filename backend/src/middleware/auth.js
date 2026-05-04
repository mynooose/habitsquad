const jwt = require('jsonwebtoken');
const prisma = require('../database/prisma');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';

const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    // Lightweight select — avatar/bio loaded only via /auth/me when needed
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, totalXp: true, timezone: true, createdAt: true, deletedAt: true }
    });

    if (!user || user.deletedAt) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    next(error);
  }
};

module.exports = { generateToken, verifyToken, authenticate };
