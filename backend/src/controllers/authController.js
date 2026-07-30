const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const authService = require("../services/authService");

const COOKIE_NAME = "token";

function cookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

const login = asyncHandler(async (req, res) => {
  const { token, user } = await authService.login(req.body);
  res.cookie(COOKIE_NAME, token, cookieOptions());
  sendSuccess(res, { message: "Login successful", data: { user } });
});

const logout = asyncHandler(async (req, res) => {
  res.clearCookie(COOKIE_NAME);
  sendSuccess(res, { message: "Logout successful" });
});

const me = asyncHandler(async (req, res) => {
  sendSuccess(res, { message: "Current admin fetched", data: { user: req.user } });
});

const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(req.user.id, req.body);
  res.clearCookie(COOKIE_NAME);
  sendSuccess(res, { message: "Password changed successfully. Please log in again." });
});

module.exports = { login, logout, me, changePassword };
