const express = require("express");
const validate = require("../middleware/validate");
const { authenticate } = require("../middleware/authMiddleware");
const { createProductSchema, updateProductSchema, statusSchema } = require("../validators/productValidators");
const productController = require("../controllers/productController");

const router = express.Router();

router.use(authenticate);

router.get("/", productController.list);
router.post("/", validate(createProductSchema), productController.create);
router.get("/:id", productController.getById);
router.put("/:id", validate(updateProductSchema), productController.update);
router.patch("/:id/status", validate(statusSchema), productController.setStatus);
router.get("/:id/stock-ledger", productController.getStockLedger);

module.exports = router;
