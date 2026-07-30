const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const supplierService = require("../services/supplierService");

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await supplierService.list(req.query);
  sendSuccess(res, { message: "Suppliers fetched", data: items, meta });
});

const getById = asyncHandler(async (req, res) => {
  const supplier = await supplierService.getById(req.params.id);
  sendSuccess(res, { message: "Supplier fetched", data: supplier });
});

const create = asyncHandler(async (req, res) => {
  const supplier = await supplierService.create(req.body);
  sendSuccess(res, { statusCode: 201, message: "Supplier created", data: supplier });
});

const update = asyncHandler(async (req, res) => {
  const supplier = await supplierService.update(req.params.id, req.body);
  sendSuccess(res, { message: "Supplier updated", data: supplier });
});

const setStatus = asyncHandler(async (req, res) => {
  const supplier = await supplierService.setStatus(req.params.id, req.body.isActive);
  sendSuccess(res, { message: "Supplier status updated", data: supplier });
});

module.exports = { list, getById, create, update, setStatus };
