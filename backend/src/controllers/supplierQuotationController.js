const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const ApiError = require("../utils/ApiError");
const supplierQuotationService = require("../services/supplierQuotationService");

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await supplierQuotationService.list(req.query);
  sendSuccess(res, { message: "Supplier quotations fetched", data: items, meta });
});

const getById = asyncHandler(async (req, res) => {
  const quotation = await supplierQuotationService.getById(req.params.id);
  sendSuccess(res, { message: "Supplier quotation fetched", data: quotation });
});

const create = asyncHandler(async (req, res) => {
  const quotation = await supplierQuotationService.create(req.body, req.user.id);
  sendSuccess(res, { statusCode: 201, message: "Supplier quotation created", data: quotation });
});

const update = asyncHandler(async (req, res) => {
  const quotation = await supplierQuotationService.update(req.params.id, req.body);
  sendSuccess(res, { message: "Supplier quotation updated", data: quotation });
});

const remove = asyncHandler(async (req, res) => {
  await supplierQuotationService.remove(req.params.id);
  sendSuccess(res, { message: "Supplier quotation deleted", data: null });
});

const compare = asyncHandler(async (req, res) => {
  const { productId, requiredQty } = req.query;
  if (!productId || !requiredQty) {
    throw new ApiError(400, "productId and requiredQty are required");
  }
  const result = await supplierQuotationService.compare(productId, requiredQty);
  sendSuccess(res, { message: "Supplier price comparison fetched", data: result });
});

module.exports = { list, getById, create, update, remove, compare };
