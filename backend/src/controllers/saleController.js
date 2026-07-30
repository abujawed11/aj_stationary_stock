const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const saleService = require("../services/saleService");

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await saleService.list(req.query);
  sendSuccess(res, { message: "Sales fetched", data: items, meta });
});

const getById = asyncHandler(async (req, res) => {
  const sale = await saleService.getById(req.params.id);
  sendSuccess(res, { message: "Sale fetched", data: sale });
});

const create = asyncHandler(async (req, res) => {
  const sale = await saleService.create(req.body, req.user.id);
  sendSuccess(res, { statusCode: 201, message: "Sale completed successfully", data: sale });
});

const cancel = asyncHandler(async (req, res) => {
  const sale = await saleService.cancel(req.params.id, req.user.id);
  sendSuccess(res, { message: "Sale cancelled successfully", data: sale });
});

const getReceipt = asyncHandler(async (req, res) => {
  const sale = await saleService.getById(req.params.id);
  sendSuccess(res, { message: "Receipt fetched", data: sale });
});

const recordPayment = asyncHandler(async (req, res) => {
  const sale = await saleService.recordPayment(req.params.id, req.body);
  sendSuccess(res, { message: "Payment recorded successfully", data: sale });
});

module.exports = { list, getById, create, cancel, getReceipt, recordPayment };
