const express = require("express");
const validate = require("../middleware/validate");
const { authenticate } = require("../middleware/authMiddleware");
const { createSaleSchema } = require("../validators/saleValidators");
const saleController = require("../controllers/saleController");

const router = express.Router();

router.use(authenticate);

router.get("/", saleController.list);
router.post("/", validate(createSaleSchema), saleController.create);
router.get("/:id", saleController.getById);
router.post("/:id/cancel", saleController.cancel);
router.get("/:id/receipt", saleController.getReceipt);

module.exports = router;
