const express = require("express");
const validate = require("../middleware/validate");
const { authenticate } = require("../middleware/authMiddleware");
const { createCategorySchema, updateCategorySchema, statusSchema } = require("../validators/categoryValidators");
const categoryController = require("../controllers/categoryController");

const router = express.Router();

router.use(authenticate);

router.get("/", categoryController.list);
router.post("/", validate(createCategorySchema), categoryController.create);
router.get("/:id", categoryController.getById);
router.put("/:id", validate(updateCategorySchema), categoryController.update);
router.patch("/:id/status", validate(statusSchema), categoryController.setStatus);

module.exports = router;
