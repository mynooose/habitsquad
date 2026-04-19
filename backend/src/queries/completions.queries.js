const prisma = require('../database/prisma');

async function findCompletions(userId, dateFilter) {
  return prisma.taskCompletion.findMany({
    where: { userId, ...dateFilter },
    include: {
      task: { select: { id: true, title: true, color: true, weightage: true, frequency: true, groupId: true } }
    },
    orderBy: { date: 'desc' }
  });
}

async function findCompletionsForCalendar(userId, startDate, endDate) {
  return prisma.taskCompletion.findMany({
    where: { userId, date: { gte: startDate, lte: endDate } },
    include: {
      task: { select: { id: true, title: true, weightage: true, color: true, groupId: true } }
    }
  });
}

async function findActiveTasksForCalendar(userId) {
  return prisma.task.findMany({
    where: { userId, isActive: true },
    select: {
      id: true, title: true, weightage: true, frequency: true, color: true, requiresProof: true,
      createdAt: true, groupId: true,
      group: { select: { id: true, name: true, color: true } }
    }
  });
}

module.exports = { findCompletions, findCompletionsForCalendar, findActiveTasksForCalendar };
