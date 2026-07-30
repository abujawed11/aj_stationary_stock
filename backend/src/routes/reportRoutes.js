const express = require("express");
const { authenticate } = require("../middleware/authMiddleware");
const reportController = require("../controllers/reportController");

const router = express.Router();

router.use(authenticate);

router.get("/sales", reportController.getSalesReport);
router.get("/profit", reportController.getProfitReport);
router.get("/products", reportController.getProductsReport);
router.get("/stock", reportController.getStockReport);
router.get("/purchases", reportController.getPurchasesReport);
router.get("/expenses", reportController.getExpensesReport);
router.get("/payment-methods", reportController.getPaymentMethodsReport);

module.exports = router;
