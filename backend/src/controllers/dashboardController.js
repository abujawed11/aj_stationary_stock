const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const dashboardService = require("../services/dashboardService");

const getSummary = asyncHandler(async (req, res) => {
  const [summary, bestSellingProducts, categoryStockSummary] = await Promise.all([
    dashboardService.getSummary(),
    dashboardService.getBestSellingProducts(),
    dashboardService.getCategoryStockSummary(),
  ]);
  sendSuccess(res, {
    message: "Dashboard summary fetched",
    data: { ...summary, bestSellingProducts, categoryStockSummary },
  });
});

const getRecentSales = asyncHandler(async (req, res) => {
  const sales = await dashboardService.getRecentSales(req.query.limit);
  sendSuccess(res, { message: "Recent sales fetched", data: sales });
});

const getSalesChart = asyncHandler(async (req, res) => {
  const chart = await dashboardService.getSalesChart(req.query.days || 7);
  sendSuccess(res, { message: "Sales chart fetched", data: chart });
});

const getLowStock = asyncHandler(async (req, res) => {
  const products = await dashboardService.getLowStock(req.query.limit);
  sendSuccess(res, { message: "Low stock products fetched", data: products });
});

module.exports = { getSummary, getRecentSales, getSalesChart, getLowStock };
