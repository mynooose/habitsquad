const prisma = require('../database/prisma');

async function findCompletionsByUserAndDateRange(userId, startDate, endDate) {
  return prisma.taskCompletion.findMany({
    where: { userId, date: { gte: startDate, lt: endDate } }
  });
}

async function findCompletionsWithTasks(userId, startDate, endDate) {
  return prisma.taskCompletion.findMany({
    where: { userId, date: { gte: startDate, lte: endDate } },
    include: { task: { select: { id: true, title: true, weightage: true, color: true, groupId: true } } }
  });
}

async function findCompletionsByDateRange(userId, startDate, endDate) {
  return prisma.taskCompletion.findMany({
    where: { userId, date: { gte: startDate, lte: endDate } },
    orderBy: { date: 'desc' }
  });
}

async function findUserMembershipsWithGroup(userId) {
  return prisma.groupMembership.findMany({
    where: { userId },
    include: { group: { select: { id: true, name: true, color: true } } }
  });
}

async function countUserMemberships(userId) {
  return prisma.groupMembership.count({ where: { userId } });
}

module.exports = {
  findCompletionsByUserAndDateRange,
  findCompletionsWithTasks,
  findCompletionsByDateRange,
  findUserMembershipsWithGroup,
  countUserMemberships,
};
