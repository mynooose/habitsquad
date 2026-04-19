const userQ = require('../queries/users.queries');

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

module.exports = { searchUsers, getUserProfile };
