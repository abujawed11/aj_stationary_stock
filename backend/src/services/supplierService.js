const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { getPagination, buildMeta } = require("../utils/pagination");

async function list(query) {
  const { page, limit, skip } = getPagination(query);
  const where = {};
  if (query.search) {
    where.OR = [
      { name: { contains: query.search } },
      { contactPerson: { contains: query.search } },
      { phone: { contains: query.search } },
    ];
  }
  if (query.isActive !== undefined) {
    where.isActive = query.isActive === "true";
  }

  const [items, total] = await Promise.all([
    prisma.supplier.findMany({ where, skip, take: limit, orderBy: { name: "asc" } }),
    prisma.supplier.count({ where }),
  ]);

  return { items, meta: buildMeta(page, limit, total) };
}

async function getById(id) {
  const supplier = await prisma.supplier.findUnique({ where: { id: Number(id) } });
  if (!supplier) {
    throw new ApiError(404, "Supplier not found");
  }

  const [recentPurchases, outstanding] = await Promise.all([
    prisma.purchase.findMany({
      where: { supplierId: supplier.id },
      orderBy: { purchaseDate: "desc" },
      take: 20,
    }),
    prisma.purchase.aggregate({
      where: { supplierId: supplier.id, status: "COMPLETED" },
      _sum: { dueAmount: true },
    }),
  ]);

  return {
    ...supplier,
    recentPurchases,
    outstandingAmount: outstanding._sum.dueAmount || 0,
  };
}

async function create(data) {
  return prisma.supplier.create({ data });
}

async function update(id, data) {
  await getById(id);
  return prisma.supplier.update({ where: { id: Number(id) }, data });
}

async function setStatus(id, isActive) {
  await getById(id);
  return prisma.supplier.update({ where: { id: Number(id) }, data: { isActive } });
}

module.exports = { list, getById, create, update, setStatus };
