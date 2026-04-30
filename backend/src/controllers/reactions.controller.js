const prisma = require('../database/prisma');

const ALLOWED_EMOJIS = ['🎉', '💪', '🔥', '❤️', '👏'];

async function toggleReaction(req, res, next) {
  try {
    const { emoji } = req.body || {};
    if (!emoji || !ALLOWED_EMOJIS.includes(emoji)) {
      return res.status(400).json({ error: 'Invalid emoji' });
    }

    const completion = await prisma.taskCompletion.findUnique({
      where: { id: req.params.id },
      select: { id: true, userId: true, task: { select: { groupId: true } } }
    });
    if (!completion) return res.status(404).json({ error: 'Completion not found' });
    if (!completion.task?.groupId) {
      return res.status(403).json({ error: 'Reactions are only allowed on group completions' });
    }

    const membership = await prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId: req.user.id, groupId: completion.task.groupId } }
    });
    if (!membership) return res.status(403).json({ error: 'Not a member of this group' });

    // One reaction per user per completion. If they pick the same emoji again -> remove.
    // If they pick a different emoji -> swap.
    const existing = await prisma.reaction.findUnique({
      where: { userId_completionId: { userId: req.user.id, completionId: completion.id } }
    });
    if (existing) {
      if (existing.emoji === emoji) {
        await prisma.reaction.delete({ where: { id: existing.id } });
        return res.json({ success: true, reacted: false, emoji: null });
      }
      const updated = await prisma.reaction.update({
        where: { id: existing.id },
        data: { emoji }
      });
      return res.json({ success: true, reacted: true, emoji: updated.emoji });
    }
    await prisma.reaction.create({
      data: { userId: req.user.id, completionId: completion.id, emoji }
    });
    res.json({ success: true, reacted: true, emoji });
  } catch (error) { next(error); }
}

async function addComment(req, res, next) {
  try {
    const body = String(req.body?.body || '').trim();
    if (!body) return res.status(400).json({ error: 'Comment cannot be empty' });
    if (body.length > 500) return res.status(400).json({ error: 'Comment is too long (max 500 chars)' });

    const completion = await prisma.taskCompletion.findUnique({
      where: { id: req.params.id },
      select: { id: true, task: { select: { groupId: true } } }
    });
    if (!completion) return res.status(404).json({ error: 'Completion not found' });
    if (!completion.task?.groupId) {
      return res.status(403).json({ error: 'Comments are only allowed on group completions' });
    }
    const membership = await prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId: req.user.id, groupId: completion.task.groupId } }
    });
    if (!membership) return res.status(403).json({ error: 'Not a member of this group' });

    const comment = await prisma.comment.create({
      data: { userId: req.user.id, completionId: completion.id, body },
      include: { user: { select: { id: true, name: true, avatar: true } } }
    });
    res.json({ comment });
  } catch (error) { next(error); }
}

async function deleteComment(req, res, next) {
  try {
    const c = await prisma.comment.findUnique({ where: { id: req.params.id } });
    if (!c) return res.status(404).json({ error: 'Comment not found' });
    if (c.userId !== req.user.id) return res.status(403).json({ error: 'You can only delete your own comments' });
    await prisma.comment.delete({ where: { id: c.id } });
    res.json({ success: true });
  } catch (error) { next(error); }
}

module.exports = { toggleReaction, addComment, deleteComment, ALLOWED_EMOJIS };
