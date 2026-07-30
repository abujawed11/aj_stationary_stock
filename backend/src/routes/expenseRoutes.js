const express = require("express");
const validate = require("../middleware/validate");
const { authenticate } = require("../middleware/authMiddleware");
const { createExpenseSchema, updateExpenseSchema } = require("../validators/expenseValidators");
const expenseController = require("../controllers/expenseController");

const router = express.Router();

router.use(authenticate);

router.get("/", expenseController.list);
router.post("/", validate(createExpenseSchema), expenseController.create);
router.get("/:id", expenseController.getById);
router.put("/:id", validate(updateExpenseSchema), expenseController.update);
router.delete("/:id", expenseController.remove);

module.exports = router;
