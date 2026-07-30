const express = require("express");
const rateLimit = require("express-rate-limit");
const validate = require("../middleware/validate");
const { loginSchema } = require("../validators/authValidators");
const { authenticate } = require("../middleware/authMiddleware");
const authController = require("../controllers/authController");

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many login attempts. Please try again later.", errors: [] },
});

router.post("/login", loginLimiter, validate(loginSchema), authController.login);
router.post("/logout", authController.logout);
router.get("/me", authenticate, authController.me);

module.exports = router;
