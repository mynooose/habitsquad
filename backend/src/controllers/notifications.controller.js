const prisma = require('../database/prisma');

async function listNotifications(req, res, next) {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    const unreadCount = await prisma.notification.count({ where: { userId: req.user.id, read: false } });
    res.json({ notifications, unreadCount });
  } catch (error) { next(error); }
}

async function clearAllRead(req, res, next) {
  try {
    // Delete read notifications that aren't pending-response actions.
    const r = await prisma.notification.deleteMany({
      where: {
        userId: req.user.id,
        read: true,
        status: { not: 'PENDING' }
      }
    });
    res.json({ success: true, deleted: r.count });
  } catch (error) { next(error); }
}

async function markAsRead(req, res, next) {
  try {
    await prisma.notification.update({
      where: { id: req.params.id, userId: req.user.id },
      data: { read: true }
    }).catch(() => {});
    res.json({ success: true });
  } catch (error) { next(error); }
}

async function markAllRead(req, res, next) {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, read: false },
      data: { read: true }
    });
    res.json({ success: true });
  } catch (error) { next(error); }
}

async function respondToNotification(req, res, next) {
  try {
    const { action } = req.body; // 'accept' | 'decline'
    const notif = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!notif || notif.userId !== req.user.id) return res.status(404).json({ error: 'Notification not found' });
    if (notif.status !== 'PENDING') return res.status(400).json({ error: 'Already responded' });

    // Handle group invite accept/decline — membership is created only on accept
    if (notif.type === 'GROUP_ADDED' && notif.relatedId) {
      if (action === 'accept') {
        const existing = await prisma.groupMembership.findUnique({
          where: { userId_groupId: { userId: req.user.id, groupId: notif.relatedId } }
        });
        if (!existing) {
          await prisma.groupMembership.create({
            data: { userId: req.user.id, groupId: notif.relatedId, role: 'MEMBER' }
          });
        }
      }
      if (action === 'decline') {
        // Membership is not created by new invites, but clean up any
        // stale membership from the old flow where it was created upfront.
        await prisma.groupMembership.deleteMany({
          where: { userId: req.user.id, groupId: notif.relatedId }
        });
      }
    }

    await prisma.notification.update({
      where: { id: req.params.id },
      data: { status: action === 'accept' ? 'ACCEPTED' : 'DECLINED', read: true }
    });

    res.json({ success: true });
  } catch (error) { next(error); }
}

module.exports = { listNotifications, markAsRead, markAllRead, respondToNotification, clearAllRead };
