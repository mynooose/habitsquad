const userQ = require('../queries/users.queries');
const { buildWeeklyPdf, buildMonthlyPdf, weekRangeFromTodayKey, monthRangeFromTodayKey } = require('../utils/pdfReport');

async function searchUsers(req, res, next) {
  try {
    const { q, excludeGroupId } = req.query;
    if (!q || q.length < 2) return res.json({ users: [] });

    let excludeUserIds = [req.user.id];
    if (excludeGroupId) {
      const memberIds = await userQ.findMembershipUserIds(excludeGroupId);
      excludeUserIds = [...excludeUserIds, ...memberIds];
    }

    const users = await userQ.searchUsers(q, excludeUserIds);
    res.json({ users });
  } catch (error) { next(error); }
}

async function getUserProfile(req, res, next) {
  try {
    const user = await userQ.findUserPublicProfile(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (error) { next(error); }
}

async function downloadReport(req, res, next) {
  try {
    const range = req.query.range === 'month' ? 'month' : 'week';
    const todayKey = req.query.date && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
      ? req.query.date
      : new Date().toISOString().split('T')[0];

    const period = range === 'month' ? monthRangeFromTodayKey(todayKey) : weekRangeFromTodayKey(todayKey);
    const buf = range === 'month'
      ? await buildMonthlyPdf(req.user.id, period)
      : await buildWeeklyPdf(req.user.id, period);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="habitsquad-${range}-${todayKey}.pdf"`);
    res.send(buf);
  } catch (error) {
    next(error);
  }
}

module.exports = { searchUsers, getUserProfile, downloadReport };
