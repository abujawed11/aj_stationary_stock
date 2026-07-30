const express = require("express");
const validate = require("../middleware/validate");
const { authenticate } = require("../middleware/authMiddleware");
const { createStockAdjustmentSchema } = require("../validators/stockAdjustmentValidators");
const stockAdjustmentController = require("../controllers/stockAdjustmentController");

const router = express.Router();

router.use(authenticate);

router.get("/", stockAdjustmentController.list);
router.post("/", validate(createStockAdjustmentSchema), stockAdjustmentController.create);
router.get("/:id", stockAdjustmentController.getById);

module.exports = router;
