const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { getPagination, buildMeta } = require("../utils/pagination");

async function list(query) {
  const { page, limit, skip } = getPagination(query);
  const where = {};
  if (query.search) {
    where.name = { contains: query.search };
  }
  if (query.isActive !== undefined) {
    where.isActive = query.isActive === "true";
  }

  const [items, total] = await Promise.all([
    prisma.category.findMany({ where, skip, take: limit, orderBy: { name: "asc" } }),
    prisma.category.count({ where }),
  ]);

  return { items, meta: buildMeta(page, limit, total) };
}

async function getById(id) {
  const category = await prisma.category.findUnique({ where: { id: Number(id) } });
  if (!category) {
    throw new ApiError(404, "Category not found");
  }
  return category;
}

async function create(data) {
  const existing = await prisma.category.findUnique({ where: { name: data.name } });
  if (existing) {
    throw new ApiError(409, "Category with this name already exists");
  }
  return prisma.category.create({ data });
}

async function update(id, data) {
  await getById(id);

  if (data.name) {
    const existing = await prisma.category.findFirst({
      where: { name: data.name, NOT: { id: Number(id) } },
    });
    if (existing) {
      throw new ApiError(409, "Category with this name already exists");
    }
  }

  return prisma.category.update({ where: { id: Number(id) }, data });
}

async function setStatus(id, isActive) {
  await getById(id);
  return prisma.category.update({ where: { id: Number(id) }, data: { isActive } });
}

module.exports = { list, getById, create, update, setStatus };
