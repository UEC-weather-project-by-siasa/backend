const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/db');
const crypto = require('crypto');
const { sendResetPasswordEmail } = require('../../services/email.service');

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

  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        profilePicture: profilePicture || null,
        role: role || 'USER',
        // สร้าง Setting เริ่มต้นที่นี่เลย
        setting: {
          create: {
            enableEmailAlert: true,   // ค่าเริ่มต้นเปิดไว้
            enableSystemNoti: true,   // ค่าเริ่มต้นเปิดไว้
          }
        }
      },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        role: true, 
        createdAt: true,
        setting: true 
      },
    });
    return newUser;
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


// ---- setting ------------
const getMySettings = async (userId) => {
  return await prisma.userSetting.findUnique({ where: { userId } });
};

const updateMySettings = async (userId, data) => {
  return await prisma.userSetting.update({
    where: { userId },
    data: {
      enableEmailAlert: data.enableEmailAlert,
      enableSystemNoti: data.enableSystemNoti,
    }
  });
};


// --------------- push ------------------------
/**
 * ลงทะเบียนหรืออัปเดตข้อมูลมือถือ
 */
const registerMobileDevice = async (userId, deviceData) => {
  const { pushToken, deviceModel, osVersion } = deviceData;

  if (!pushToken) throw new Error('Push token is required');

  return await prisma.userMobileDevice.upsert({
    where: { pushToken: pushToken },
    update: { 
      userId: userId,
      deviceModel: deviceModel || null,
      osVersion: osVersion || null,
    },
    create: {
      pushToken: pushToken,
      userId: userId,
      deviceModel: deviceModel || null,
      osVersion: osVersion || null,
    },
  });
};

/**
 * ลบ Token อุปกรณ์ออก (ใช้ตอน Logout หรือปิดแจ้งเตือน)
 */
const unregisterMobileDevice = async (pushToken) => {
  if (!pushToken) throw new Error('Push token is required to unregister');
  
  return await prisma.userMobileDevice.deleteMany({
    where: { pushToken: pushToken }
  });
};

// --------------------- password -----------------------
const requestPasswordReset = async (email) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('User with this email does not exist');

  // สร้าง Token แบบสุ่มและกำหนดวันหมดอายุ (เช่น 1 ชั่วโมง)
  const resetToken = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 3600000); 

  await prisma.user.update({
    where: { email },
    data: {
      resetPasswordToken: resetToken,
      resetPasswordExpires: expires,
    },
  });

  await sendResetPasswordEmail(user.email, resetToken);

  return { message: 'Reset link sent to email' };
};

const resetPassword = async (token, newPassword) => {
  const user = await prisma.user.findFirst({
    where: {
      resetPasswordToken: token,
      resetPasswordExpires: { gt: new Date() }, 
    },
  });

  if (!user) throw new Error('Token is invalid or has expired');

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetPasswordToken: null,     
      resetPasswordExpires: null,
      tokenVersion: { increment: 1 } 
    },
  });

  return { message: 'Password has been reset successfully' };
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
  getMySettings,
  updateMySettings,
  registerMobileDevice,
  unregisterMobileDevice,
  requestPasswordReset,
  resetPassword,      
};