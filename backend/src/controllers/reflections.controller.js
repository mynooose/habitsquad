const prisma = require('../database/prisma');

function parseDateKey(key) {
  if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

async function upsertReflection(req, res, next) {
  try {
    const { date, text } = req.body || {};
    const targetDate = parseDateKey(date);
    if (!targetDate) return res.status(400).json({ error: 'date must be YYYY-MM-DD' });

    const trimmed = (text ?? '').toString().slice(0, 500).trim();

    if (!trimmed) {
      await prisma.reflection.deleteMany({ where: { userId: req.user.id, date: targetDate } });
      return res.json({ reflection: null });
    }

    const reflection = await prisma.reflection.upsert({
      where: { userId_date: { userId: req.user.id, date: targetDate } },
      create: { userId: req.user.id, date: targetDate, text: trimmed },
      update: { text: trimmed }
    });
    res.json({ reflection });
  } catch (error) {
    next(error);
  }
}

async function listReflections(req, res, next) {
  try {
    const { from, to, date } = req.query;
    let where = { userId: req.user.id };

    if (date) {
      const d = parseDateKey(date);
      if (!d) return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
      where.date = d;
    } else {
      const start = parseDateKey(from);
      const end = parseDateKey(to);
      if (start && end) where.date = { gte: start, lte: end };
      else {
        const end30 = new Date(); end30.setUTCHours(0, 0, 0, 0);
        const start30 = new Date(end30); start30.setUTCDate(start30.getUTCDate() - 30);
        where.date = { gte: start30, lte: end30 };
      }
    }

    const reflections = await prisma.reflection.findMany({
      where,
      orderBy: { date: 'desc' }
    });
    res.json({ reflections });
  } catch (error) {
    next(error);
  }
}

module.exports = { upsertReflection, listReflections };
