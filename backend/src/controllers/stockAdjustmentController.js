const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const stockAdjustmentService = require("../services/stockAdjustmentService");

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await stockAdjustmentService.list(req.query);
  sendSuccess(res, { message: "Stock adjustments fetched", data: items, meta });
});

const getById = asyncHandler(async (req, res) => {
  const adjustment = await stockAdjustmentService.getById(req.params.id);
  sendSuccess(res, { message: "Stock adjustment fetched", data: adjustment });
});

const create = asyncHandler(async (req, res) => {
  const adjustment = await stockAdjustmentService.create(req.body, req.user.id);
  sendSuccess(res, { statusCode: 201, message: "Stock adjustment recorded successfully", data: adjustment });
});

module.exports = { list, getById, create };
