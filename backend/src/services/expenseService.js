const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { getPagination, buildMeta } = require("../utils/pagination");
const { generateDocumentNumber } = require("../utils/documentNumber");

async function list(query) {
  const { page, limit, skip } = getPagination(query);
  const where = {};

  if (query.search) {
    where.OR = [
      { expenseNumber: { contains: query.search } },
      { description: { contains: query.search } },
    ];
  }
  if (query.category) {
    where.category = query.category;
  }
  if (query.startDate || query.endDate) {
    where.expenseDate = {};
    if (query.startDate) where.expenseDate.gte = new Date(query.startDate);
    if (query.endDate) where.expenseDate.lte = new Date(query.endDate);
  }

  const [items, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      skip,
      take: limit,
      orderBy: { expenseDate: "desc" },
    }),
    prisma.expense.count({ where }),
  ]);

  return { items, meta: buildMeta(page, limit, total) };
}

async function getById(id) {
  const expense = await prisma.expense.findUnique({ where: { id: Number(id) } });
  if (!expense) {
    throw new ApiError(404, "Expense not found");
  }
  return expense;
}

async function create(data, userId) {
  const expenseDate = data.expenseDate || new Date();
  const expenseNumber = await generateDocumentNumber(prisma.expense, "expenseNumber", "EXP", expenseDate);

  return prisma.expense.create({
    data: {
      expenseNumber,
      category: data.category,
      description: data.description,
      amount: data.amount,
      expenseDate,
      paymentMethod: data.paymentMethod,
      notes: data.notes,
      createdById: userId,
    },
  });
}

async function update(id, data) {
  await getById(id);
  return prisma.expense.update({ where: { id: Number(id) }, data });
}

async function remove(id) {
  await getById(id);
  await prisma.expense.delete({ where: { id: Number(id) } });
}

module.exports = { list, getById, create, update, remove };
