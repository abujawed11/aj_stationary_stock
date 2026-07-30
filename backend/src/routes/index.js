const express = require("express");
const authRoutes = require("./authRoutes");
const dashboardRoutes = require("./dashboardRoutes");
const categoryRoutes = require("./categoryRoutes");
const productRoutes = require("./productRoutes");
const supplierRoutes = require("./supplierRoutes");
const purchaseRoutes = require("./purchaseRoutes");
const saleRoutes = require("./saleRoutes");
const salesReturnRoutes = require("./salesReturnRoutes");
const stockAdjustmentRoutes = require("./stockAdjustmentRoutes");
const expenseRoutes = require("./expenseRoutes");
const reportRoutes = require("./reportRoutes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/categories", categoryRoutes);
router.use("/products", productRoutes);
router.use("/suppliers", supplierRoutes);
router.use("/purchases", purchaseRoutes);
router.use("/sales", saleRoutes);
router.use("/sales-returns", salesReturnRoutes);
router.use("/stock-adjustments", stockAdjustmentRoutes);
router.use("/expenses", expenseRoutes);
router.use("/reports", reportRoutes);

module.exports = router;
