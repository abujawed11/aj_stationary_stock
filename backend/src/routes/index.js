const express = require("express");
const authRoutes = require("./authRoutes");
const categoryRoutes = require("./categoryRoutes");
const productRoutes = require("./productRoutes");
const supplierRoutes = require("./supplierRoutes");
const purchaseRoutes = require("./purchaseRoutes");
const saleRoutes = require("./saleRoutes");
const salesReturnRoutes = require("./salesReturnRoutes");
const stockAdjustmentRoutes = require("./stockAdjustmentRoutes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/categories", categoryRoutes);
router.use("/products", productRoutes);
router.use("/suppliers", supplierRoutes);
router.use("/purchases", purchaseRoutes);
router.use("/sales", saleRoutes);
router.use("/sales-returns", salesReturnRoutes);
router.use("/stock-adjustments", stockAdjustmentRoutes);

module.exports = router;
