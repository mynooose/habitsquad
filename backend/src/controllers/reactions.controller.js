const prisma = require('../database/prisma');

const ALLOWED_EMOJIS = ['🎉', '💪', '🔥', '❤️', '👏'];

async function toggleReaction(req, res, next) {
  try {
    const { emoji } = req.body || {};
    if (!emoji || !ALLOWED_EMOJIS.includes(emoji)) {
      return res.status(400).json({ error: 'Invalid emoji' });
    }

    // Ensure completion exists and reactor shares a group with the completer
    const completion = await prisma.taskCompletion.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, userId: true,
        task: { select: { groupId: true } }
      }
    });
    if (!completion) return res.status(404).json({ error: 'Completion not found' });

    // Only group-task completions can be reacted to
    if (!completion.task?.groupId) {
      return res.status(403).json({ error: 'Reactions are only allowed on group completions' });
    }

    // Reactor must be a member of the same group
    const membership = await prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId: req.user.id, groupId: completion.task.groupId } }
    });
    if (!membership) return res.status(403).json({ error: 'Not a member of this group' });

    // Toggle: delete if exists, otherwise create
    const existing = await prisma.reaction.findUnique({
      where: { userId_completionId_emoji: { userId: req.user.id, completionId: completion.id, emoji } }
    });
    if (existing) {
      await prisma.reaction.delete({ where: { id: existing.id } });
      return res.json({ success: true, reacted: false });
    }
    await prisma.reaction.create({
      data: { userId: req.user.id, completionId: completion.id, emoji }
    });
    res.json({ success: true, reacted: true });
  } catch (error) { next(error); }
}

module.exports = { toggleReaction, ALLOWED_EMOJIS };
