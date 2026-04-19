const prisma = require('../database/prisma');

async function searchUsers(query, excludeUserIds) {
  return prisma.user.findMany({
    where: {
      id: { notIn: excludeUserIds },
      OR: [
        { name: { contains: query } },
        { email: { contains: query } }
      ]
    },
    select: { id: true, name: true, email: true, avatar: true },
    take: 10
  });
}

async function findUserPublicProfile(id) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, avatar: true, createdAt: true }
  });
}

async function findMembershipUserIds(groupId) {
  const memberships = await prisma.groupMembership.findMany({
    where: { groupId },
    select: { userId: true }
  });
  return memberships.map(m => m.userId);
}

module.exports = { searchUsers, findUserPublicProfile, findMembershipUserIds };
