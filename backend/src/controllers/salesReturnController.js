const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const salesReturnService = require("../services/salesReturnService");

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await salesReturnService.list(req.query);
  sendSuccess(res, { message: "Sales returns fetched", data: items, meta });
});

const getById = asyncHandler(async (req, res) => {
  const salesReturn = await salesReturnService.getById(req.params.id);
  sendSuccess(res, { message: "Sales return fetched", data: salesReturn });
});

const create = asyncHandler(async (req, res) => {
  const salesReturn = await salesReturnService.create(req.body, req.user.id);
  sendSuccess(res, { statusCode: 201, message: "Sales return recorded successfully", data: salesReturn });
});

module.exports = { list, getById, create };
