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

module.exports = { getAllUsers, deleteUser };