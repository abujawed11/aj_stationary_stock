const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const purchaseService = require("../services/purchaseService");

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await purchaseService.list(req.query);
  sendSuccess(res, { message: "Purchases fetched", data: items, meta });
});

const getById = asyncHandler(async (req, res) => {
  const purchase = await purchaseService.getById(req.params.id);
  sendSuccess(res, { message: "Purchase fetched", data: purchase });
});

const create = asyncHandler(async (req, res) => {
  const purchase = await purchaseService.create(req.body, req.user.id);
  sendSuccess(res, { statusCode: 201, message: "Purchase completed successfully", data: purchase });
});

const cancel = asyncHandler(async (req, res) => {
  const purchase = await purchaseService.cancel(req.params.id, req.user.id);
  sendSuccess(res, { message: "Purchase cancelled successfully", data: purchase });
});

const recordPayment = asyncHandler(async (req, res) => {
  const purchase = await purchaseService.recordPayment(req.params.id, req.body);
  sendSuccess(res, { message: "Payment recorded successfully", data: purchase });
});

module.exports = { list, getById, create, cancel, recordPayment };
