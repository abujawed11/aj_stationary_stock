const express = require("express");
const { authenticate } = require("../middleware/authMiddleware");
const dashboardController = require("../controllers/dashboardController");

const router = express.Router();

router.use(authenticate);

router.get("/summary", dashboardController.getSummary);
router.get("/recent-sales", dashboardController.getRecentSales);
router.get("/sales-chart", dashboardController.getSalesChart);
router.get("/low-stock", dashboardController.getLowStock);

module.exports = router;
