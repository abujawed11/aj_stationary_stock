const bcrypt = require("bcryptjs");
const prisma = require("../config/prisma");
const { signToken } = require("../utils/jwt");
const ApiError = require("../utils/ApiError");

async function login({ username, password }) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !user.isActive) {
    throw new ApiError(401, "Invalid username or password");
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new ApiError(401, "Invalid username or password");
  }

  const token = signToken({ sub: user.id, role: user.role });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
    },
  };
}

async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    throw new ApiError(401, "Current password is incorrect");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

module.exports = { login, changePassword };
