const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const { sendCsv } = require("../utils/csv");
const reportService = require("../services/reportService");

const getSalesReport = asyncHandler(async (req, res) => {
  const result = await reportService.getSalesReport(req.query);
  if (req.query.format === "csv") {
    return sendCsv(res, "sales-report.csv", result.items);
  }
  sendSuccess(res, { message: "Sales report fetched", data: result });
});

const getProfitReport = asyncHandler(async (req, res) => {
  const result = await reportService.getProfitReport(req.query);
  if (req.query.format === "csv") {
    return sendCsv(res, "profit-report.csv", result.items);
  }
  sendSuccess(res, { message: "Profit report fetched", data: result });
});

const getProductsReport = asyncHandler(async (req, res) => {
  const result = await reportService.getProductsReport(req.query);
  if (req.query.format === "csv") {
    return sendCsv(res, "products-report.csv", result.items);
  }
  sendSuccess(res, { message: "Products report fetched", data: result });
});

const getStockReport = asyncHandler(async (req, res) => {
  const result = await reportService.getStockReport(req.query);
  if (req.query.format === "csv") {
    return sendCsv(res, "stock-valuation-report.csv", result.items);
  }
  sendSuccess(res, { message: "Stock valuation report fetched", data: result });
});

const getPurchasesReport = asyncHandler(async (req, res) => {
  const result = await reportService.getPurchasesReport(req.query);
  if (req.query.format === "csv") {
    return sendCsv(res, "purchases-report.csv", req.query.groupBy === "supplier" ? result.bySupplier : result.items);
  }
  sendSuccess(res, { message: "Purchases report fetched", data: result });
});

const getExpensesReport = asyncHandler(async (req, res) => {
  const result = await reportService.getExpensesReport(req.query);
  if (req.query.format === "csv") {
    return sendCsv(res, "expenses-report.csv", req.query.groupBy === "category" ? result.byCategory : result.items);
  }
  sendSuccess(res, { message: "Expenses report fetched", data: result });
});

const getPaymentMethodsReport = asyncHandler(async (req, res) => {
  const result = await reportService.getPaymentMethodsReport(req.query);
  if (req.query.format === "csv") {
    return sendCsv(res, "payment-methods-report.csv", result.items);
  }
  sendSuccess(res, { message: "Payment methods report fetched", data: result });
});

module.exports = {
  getSalesReport,
  getProfitReport,
  getProductsReport,
  getStockReport,
  getPurchasesReport,
  getExpensesReport,
  getPaymentMethodsReport,
};
