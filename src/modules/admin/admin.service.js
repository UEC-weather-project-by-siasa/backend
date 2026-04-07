const prisma = require('../../config/db');

const getAllUsers = async () => {
  return await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true
    }
  });
};

const deleteUser = async (targetUserId, currentUserId) => {
  if (targetUserId === currentUserId) {
    throw new Error('Admin cannot delete themselves');
  }

  await prisma.user.delete({
    where: { id: targetUserId }
  });

  return { message: 'User deleted successfully' };
};

const getUserById = async (id) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true
    }
  });

  if (!user) throw new Error("User not found");

  return user;
};

const updateUserRole = async (targetUserId, role, currentUserId) => {
  if (targetUserId === currentUserId) {
    throw new Error("Admin cannot change their own role");
  }

  const user = await prisma.user.update({
    where: { id: targetUserId },
    data: { role }
  });

  return user;
};

const updateUser = async (id, data) => {
  return await prisma.user.update({
    where: { id },
    data: {
      name: data.name,
      email: data.email
    }
  });
};

const forceLogout = async (id) => {
  return await prisma.user.update({
    where: { id },
    data: {
      tokenVersion: {
        increment: 1
      }
    }
  });
};

module.exports = { getAllUsers, deleteUser , getUserById , updateUserRole , updateUser, forceLogout };