const prisma = require('../database/prisma');

async function findUserMemberships(userId) {
  return prisma.groupMembership.findMany({
    where: { userId },
    include: {
      group: {
        include: {
          _count: { select: { memberships: true, tasks: true } },
          createdBy: { select: { id: true, name: true, avatar: true } }
        }
      }
    }
  });
}

async function findMembership(userId, groupId) {
  return prisma.groupMembership.findUnique({
    where: { userId_groupId: { userId, groupId } }
  });
}

async function createGroup(data) {
  return prisma.group.create({
    data,
    include: { _count: { select: { memberships: true } } }
  });
}

async function findGroupById(id) {
  return prisma.group.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true } },
      memberships: {
        include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
        orderBy: { joinedAt: 'asc' }
      },
      invites: {
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'desc' }
      },
      _count: { select: { tasks: true } }
    }
  });
}

async function findGroupByInviteCode(code) {
  return prisma.group.findUnique({ where: { inviteCode: code.toUpperCase() } });
}

async function createMembership(userId, groupId, role = 'MEMBER') {
  return prisma.groupMembership.create({ data: { userId, groupId, role } });
}

async function deleteMembership(userId, groupId) {
  return prisma.groupMembership.delete({
    where: { userId_groupId: { userId, groupId } }
  });
}

async function deleteMembershipById(id) {
  return prisma.groupMembership.delete({ where: { id } });
}

async function findGroupMembers(groupId) {
  return prisma.groupMembership.findMany({
    where: { groupId },
    include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
    orderBy: { joinedAt: 'asc' }
  });
}

async function countAdmins(groupId) {
  return prisma.groupMembership.count({ where: { groupId, role: 'ADMIN' } });
}

async function countMembers(groupId) {
  return prisma.groupMembership.count({ where: { groupId } });
}

async function deleteGroup(id) {
  return prisma.group.delete({ where: { id } });
}

async function updateGroup(id, data) {
  return prisma.group.update({ where: { id }, data });
}

async function findUserByEmail(email) {
  return prisma.user.findUnique({ where: { email } });
}

async function findUserById(id) {
  return prisma.user.findUnique({ where: { id } });
}

async function findPendingInvite(groupId, email) {
  return prisma.groupInvite.findUnique({ where: { groupId_email: { groupId, email } } });
}

async function upsertInvite(groupId, email, invitedById) {
  return prisma.groupInvite.upsert({
    where: { groupId_email: { groupId, email } },
    update: { status: 'PENDING', invitedById, createdAt: new Date() },
    create: { groupId, email, invitedById, status: 'PENDING' }
  });
}

async function deleteInvite(id, groupId) {
  return prisma.groupInvite.delete({ where: { id, groupId } });
}

async function acceptInvites(groupId, email) {
  return prisma.groupInvite.updateMany({
    where: { groupId, email, status: 'PENDING' },
    data: { status: 'ACCEPTED' }
  });
}

module.exports = {
  findUserMemberships,
  findMembership,
  createGroup,
  findGroupById,
  findGroupByInviteCode,
  createMembership,
  deleteMembership,
  deleteMembershipById,
  findGroupMembers,
  countAdmins,
  countMembers,
  deleteGroup,
  updateGroup,
  findUserByEmail,
  findUserById,
  findPendingInvite,
  upsertInvite,
  deleteInvite,
  acceptInvites,
};
