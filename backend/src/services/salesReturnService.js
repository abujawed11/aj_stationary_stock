const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { getPagination, buildMeta } = require("../utils/pagination");
const { generateDocumentNumber } = require("../utils/documentNumber");
const { multiply, add, toNumber } = require("../utils/money");
const { increaseStock, recordMovement } = require("./stockMovementService");

async function list(query) {
  const { page, limit, skip } = getPagination(query);
  const where = {};
  if (query.saleId) {
    where.saleId = Number(query.saleId);
  }

  const [items, total] = await Promise.all([
    prisma.salesReturn.findMany({
      where,
      skip,
      take: limit,
      orderBy: { returnDate: "desc" },
      include: { sale: true },
    }),
    prisma.salesReturn.count({ where }),
  ]);

  return { items, meta: buildMeta(page, limit, total) };
}

async function getById(id) {
  const salesReturn = await prisma.salesReturn.findUnique({
    where: { id: Number(id) },
    include: {
      sale: true,
      items: { include: { product: true, saleItem: true } },
      createdBy: { select: { id: true, name: true, username: true } },
    },
  });
  if (!salesReturn) {
    throw new ApiError(404, "Sales return not found");
  }
  return salesReturn;
}

async function create(data, userId) {
  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({
      where: { id: data.saleId },
      include: { items: true },
    });
    if (!sale) {
      throw new ApiError(404, "Sale not found");
    }
    if (sale.status === "CANCELLED") {
      throw new ApiError(400, "Cannot return items from a cancelled sale");
    }
    if (sale.status === "RETURNED") {
      throw new ApiError(400, "This sale has already been fully returned");
    }

    const saleItemMap = new Map(sale.items.map((i) => [i.id, i]));
    const existingReturnItems = await tx.salesReturnItem.findMany({
      where: { saleItemId: { in: sale.items.map((i) => i.id) } },
    });
    const alreadyReturnedByItem = new Map();
    for (const ri of existingReturnItems) {
      alreadyReturnedByItem.set(ri.saleItemId, (alreadyReturnedByItem.get(ri.saleItemId) || 0) + ri.quantity);
    }

    const resolvedItems = [];
    for (const reqItem of data.items) {
      const saleItem = saleItemMap.get(reqItem.saleItemId);
      if (!saleItem) {
        throw new ApiError(400, "Sale item not found on this sale");
      }
      const alreadyReturned = alreadyReturnedByItem.get(saleItem.id) || 0;
      const remaining = saleItem.quantity - alreadyReturned;
      if (reqItem.quantity > remaining) {
        throw new ApiError(400, `Cannot return more than sold quantity (remaining: ${remaining})`);
      }

      const effectiveReturnToStock = reqItem.condition === "GOOD" && reqItem.returnToStock;
      const refundAmount = toNumber(multiply(reqItem.quantity, saleItem.sellingPrice));

      resolvedItems.push({
        saleItemId: saleItem.id,
        productId: saleItem.productId,
        quantity: reqItem.quantity,
        refundAmount,
        returnToStock: effectiveReturnToStock,
        condition: reqItem.condition,
      });

      alreadyReturnedByItem.set(saleItem.id, alreadyReturned + reqItem.quantity);
    }

    const totalRefund = toNumber(add(...resolvedItems.map((i) => i.refundAmount)));
    const returnDate = new Date();
    const returnNumber = await generateDocumentNumber(tx.salesReturn, "returnNumber", "RET", returnDate);

    const salesReturn = await tx.salesReturn.create({
      data: {
        returnNumber,
        saleId: sale.id,
        returnDate,
        totalRefund,
        refundMethod: data.refundMethod,
        reason: data.reason,
        createdById: userId,
        items: {
          create: resolvedItems.map((i) => ({
            saleItemId: i.saleItemId,
            productId: i.productId,
            quantity: i.quantity,
            refundAmount: i.refundAmount,
            returnToStock: i.returnToStock,
            condition: i.condition,
          })),
        },
      },
      include: { items: true },
    });

    for (const item of resolvedItems) {
      if (!item.returnToStock) continue;
      const { stockBefore, stockAfter } = await increaseStock(tx, item.productId, item.quantity);
      await recordMovement(tx, {
        productId: item.productId,
        movementType: "SALES_RETURN",
        referenceType: "SalesReturn",
        referenceId: salesReturn.id,
        quantityIn: item.quantity,
        quantityOut: 0,
        stockBefore,
        stockAfter,
        note: `Return ${salesReturn.returnNumber}`,
        createdById: userId,
      });
    }

    const fullyReturned = sale.items.every((si) => (alreadyReturnedByItem.get(si.id) || 0) >= si.quantity);
    await tx.sale.update({
      where: { id: sale.id },
      data: { status: fullyReturned ? "RETURNED" : "PARTIALLY_RETURNED" },
    });

    return salesReturn;
  });
}

module.exports = { list, getById, create };
