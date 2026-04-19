const prisma = require('../database/prisma');

const USER_SELECT = { id: true, email: true, name: true, avatar: true, dob: true, gender: true, bio: true, dailyEmailEnabled: true, createdAt: true };

async function findUserByEmail(email) {
  return prisma.user.findUnique({ where: { email } });
}

async function findUserById(id) {
  return prisma.user.findUnique({ where: { id }, select: USER_SELECT });
}

async function createUser({ email, password, name }) {
  return prisma.user.create({
    data: { email, password, name },
    select: USER_SELECT
  });
}

async function updateUser(id, data) {
  return prisma.user.update({
    where: { id },
    data,
    select: USER_SELECT
  });
}

module.exports = { findUserByEmail, findUserById, createUser, updateUser, USER_SELECT };
