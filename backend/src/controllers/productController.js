const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const productService = require("../services/productService");

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await productService.list(req.query);
  sendSuccess(res, { message: "Products fetched", data: items, meta });
});

const getById = asyncHandler(async (req, res) => {
  const product = await productService.getById(req.params.id);
  sendSuccess(res, { message: "Product fetched", data: product });
});

const create = asyncHandler(async (req, res) => {
  const product = await productService.create(req.body);
  sendSuccess(res, { statusCode: 201, message: "Product created", data: product });
});

const update = asyncHandler(async (req, res) => {
  const product = await productService.update(req.params.id, req.body);
  sendSuccess(res, { message: "Product updated", data: product });
});

const setStatus = asyncHandler(async (req, res) => {
  const product = await productService.setStatus(req.params.id, req.body.isActive);
  sendSuccess(res, { message: "Product status updated", data: product });
});

const getStockLedger = asyncHandler(async (req, res) => {
  const { items, meta } = await productService.getStockLedger(req.params.id, req.query);
  sendSuccess(res, { message: "Stock ledger fetched", data: items, meta });
});

module.exports = { list, getById, create, update, setStatus, getStockLedger };
