const express = require("express");
const validate = require("../middleware/validate");
const { authenticate } = require("../middleware/authMiddleware");
const { createSupplierSchema, updateSupplierSchema, statusSchema } = require("../validators/supplierValidators");
const supplierController = require("../controllers/supplierController");

const router = express.Router();

router.use(authenticate);

router.get("/", supplierController.list);
router.post("/", validate(createSupplierSchema), supplierController.create);
router.get("/:id", supplierController.getById);
router.put("/:id", validate(updateSupplierSchema), supplierController.update);
router.patch("/:id/status", validate(statusSchema), supplierController.setStatus);

module.exports = router;
