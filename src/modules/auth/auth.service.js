const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/db');

// ─── Helpers ────────────────────────────────────────────────────────────────

const generateAccessToken = (user) => {
  return jwt.sign(
    { userId: user.id, version: user.tokenVersion, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { userId: user.id, version: user.tokenVersion },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh',
    { expiresIn: '7d' }
  );
};

const safeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  profilePicture: user.profilePicture,
  role: user.role,
  createdAt: user.createdAt,
});

// ─── Auth ────────────────────────────────────────────────────────────────────

const register = async (userData) => {
  const { name, email, password, profilePicture, role } = userData;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error('Email already in use');

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      profilePicture: profilePicture || null,
      role: role || 'USER',
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return user;
};

const login = async (email, password) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('User not found');

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new Error('Password is incorrect');

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  return { accessToken, refreshToken, user: safeUser(user) };
};

const logout = async (userId) => {
  return await prisma.user.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
  });
};

// ─── Token ───────────────────────────────────────────────────────────────────

const refreshToken = async (token) => {
  if (!token) throw new Error('Refresh token required');

  let decoded;
  try {
    decoded = jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh'
    );
  } catch {
    throw new Error('Invalid or expired refresh token');
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
  if (!user) throw new Error('User not found');
  if (user.tokenVersion !== decoded.version) {
    throw new Error('Refresh token has been revoked');
  }

  const accessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user);

  return { accessToken, refreshToken: newRefreshToken };
};

// ─── Profile ─────────────────────────────────────────────────────────────────

const getMe = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');
  return safeUser(user);
};

const updateProfile = async (userId, data) => {
  const { name, profilePicture } = data;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(name && { name }),
      ...(profilePicture !== undefined && { profilePicture }),
    },
  });

  return safeUser(updated);
};

const changePassword = async (userId, oldPassword, newPassword) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) throw new Error('Old password is incorrect');

  if (newPassword.length < 6) throw new Error('New password must be at least 6 characters');

  const hashed = await bcrypt.hash(newPassword, 10);

  // increment tokenVersion เพื่อ invalidate tokens ทั้งหมด
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed, tokenVersion: { increment: 1 } },
  });

  return { message: 'Password changed successfully. Please login again.' };
};

// ─── Delete My Account ─────────────────────────────
const deleteMe = async (userId) => {
  await prisma.user.delete({
    where: { id: userId }
  });

  return { message: 'Account deleted successfully' };
};



module.exports = {
  register,
  login,
  logout,
  refreshToken,
  getMe,
  updateProfile,
  changePassword,
  deleteMe,       
};