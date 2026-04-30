const prisma = require('../database/prisma');

// Best-effort fire-and-forget logger. Failures are silenced — never block the
// originating request because of an audit log issue.
function log({ groupId, userId, type, targetUserId = null, habitTitle = null, habitColor = null, detail = null }) {
  if (!groupId || !userId || !type) return;
  prisma.groupActivity.create({
    data: { groupId, userId, type, targetUserId, habitTitle, habitColor, detail }
  }).catch(err => {
    console.error('[activity log] failed:', err.message);
  });
}

module.exports = { log };
