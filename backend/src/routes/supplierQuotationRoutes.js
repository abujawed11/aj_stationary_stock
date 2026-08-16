const express = require("express");
const validate = require("../middleware/validate");
const { authenticate } = require("../middleware/authMiddleware");
const {
  createSupplierQuotationSchema,
  updateSupplierQuotationSchema,
  compareBasketSchema,
} = require("../validators/supplierQuotationValidators");
const supplierQuotationController = require("../controllers/supplierQuotationController");

const router = express.Router();

router.use(authenticate);

router.get("/compare", supplierQuotationController.compare);
router.post("/compare-basket", validate(compareBasketSchema), supplierQuotationController.compareBasket);
router.get("/", supplierQuotationController.list);
router.post("/", validate(createSupplierQuotationSchema), supplierQuotationController.create);
router.get("/:id", supplierQuotationController.getById);
router.put("/:id", validate(updateSupplierQuotationSchema), supplierQuotationController.update);
router.delete("/:id", supplierQuotationController.remove);

module.exports = router;
