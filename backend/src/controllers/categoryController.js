const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const categoryService = require("../services/categoryService");

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await categoryService.list(req.query);
  sendSuccess(res, { message: "Categories fetched", data: items, meta });
});

const getById = asyncHandler(async (req, res) => {
  const category = await categoryService.getById(req.params.id);
  sendSuccess(res, { message: "Category fetched", data: category });
});

const create = asyncHandler(async (req, res) => {
  const category = await categoryService.create(req.body);
  sendSuccess(res, { statusCode: 201, message: "Category created", data: category });
});

const update = asyncHandler(async (req, res) => {
  const category = await categoryService.update(req.params.id, req.body);
  sendSuccess(res, { message: "Category updated", data: category });
});

const setStatus = asyncHandler(async (req, res) => {
  const category = await categoryService.setStatus(req.params.id, req.body.isActive);
  sendSuccess(res, { message: "Category status updated", data: category });
});

module.exports = { list, getById, create, update, setStatus };
