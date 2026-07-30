const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const expenseService = require("../services/expenseService");

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await expenseService.list(req.query);
  sendSuccess(res, { message: "Expenses fetched", data: items, meta });
});

const getById = asyncHandler(async (req, res) => {
  const expense = await expenseService.getById(req.params.id);
  sendSuccess(res, { message: "Expense fetched", data: expense });
});

const create = asyncHandler(async (req, res) => {
  const expense = await expenseService.create(req.body, req.user.id);
  sendSuccess(res, { statusCode: 201, message: "Expense created", data: expense });
});

const update = asyncHandler(async (req, res) => {
  const expense = await expenseService.update(req.params.id, req.body);
  sendSuccess(res, { message: "Expense updated", data: expense });
});

const remove = asyncHandler(async (req, res) => {
  await expenseService.remove(req.params.id);
  sendSuccess(res, { message: "Expense deleted" });
});

module.exports = { list, getById, create, update, remove };
