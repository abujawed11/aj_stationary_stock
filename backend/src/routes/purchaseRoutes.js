const express = require("express");
const validate = require("../middleware/validate");
const { authenticate } = require("../middleware/authMiddleware");
const { createPurchaseSchema, recordPaymentSchema } = require("../validators/purchaseValidators");
const purchaseController = require("../controllers/purchaseController");

const router = express.Router();

router.use(authenticate);

router.get("/", purchaseController.list);
router.post("/", validate(createPurchaseSchema), purchaseController.create);
router.get("/:id", purchaseController.getById);
router.post("/:id/cancel", purchaseController.cancel);
router.post("/:id/payment", validate(recordPaymentSchema), purchaseController.recordPayment);

module.exports = router;
