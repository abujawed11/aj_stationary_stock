const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { getPagination, buildMeta } = require("../utils/pagination");
const { generateDocumentNumber } = require("../utils/documentNumber");
const { increaseStock, decreaseStock, recordMovement } = require("./stockMovementService");

async function list(query) {
  const { page, limit, skip } = getPagination(query);
  const where = {};

  if (query.productId) {
    where.productId = Number(query.productId);
  }
  if (query.adjustmentType) {
    where.adjustmentType = query.adjustmentType;
  }
  if (query.direction) {
    where.direction = query.direction;
  }
  if (query.startDate || query.endDate) {
    where.createdAt = {};
    if (query.startDate) where.createdAt.gte = new Date(query.startDate);
    if (query.endDate) where.createdAt.lte = new Date(query.endDate);
  }

  const [items, total] = await Promise.all([
    prisma.stockAdjustment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { product: true, createdBy: { select: { id: true, name: true, username: true } } },
    }),
    prisma.stockAdjustment.count({ where }),
  ]);

  return { items, meta: buildMeta(page, limit, total) };
}

async function getById(id) {
  const adjustment = await prisma.stockAdjustment.findUnique({
    where: { id: Number(id) },
    include: { product: true, createdBy: { select: { id: true, name: true, username: true } } },
  });
  if (!adjustment) {
    throw new ApiError(404, "Stock adjustment not found");
  }
  return adjustment;
}

async function create(data, userId) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: data.productId } });
    if (!product) {
      throw new ApiError(404, "Product not found");
    }

    const { stockBefore, stockAfter } =
      data.direction === "IN"
        ? await increaseStock(tx, data.productId, data.quantity)
        : await decreaseStock(tx, data.productId, data.quantity);

    const adjustmentNumber = await generateDocumentNumber(tx.stockAdjustment, "adjustmentNumber", "ADJ", new Date());

    const adjustment = await tx.stockAdjustment.create({
      data: {
        adjustmentNumber,
        productId: data.productId,
        adjustmentType: data.adjustmentType,
        direction: data.direction,
        quantity: data.quantity,
        stockBefore,
        stockAfter,
        reason: data.reason,
        createdById: userId,
      },
    });

    await recordMovement(tx, {
      productId: data.productId,
      movementType: data.adjustmentType === "OPENING_STOCK" ? "OPENING_STOCK" : "ADJUSTMENT",
      referenceType: "StockAdjustment",
      referenceId: adjustment.id,
      quantityIn: data.direction === "IN" ? data.quantity : 0,
      quantityOut: data.direction === "OUT" ? data.quantity : 0,
      stockBefore,
      stockAfter,
      note: data.reason,
      createdById: userId,
    });

    return adjustment;
  });
}

module.exports = { list, getById, create };
