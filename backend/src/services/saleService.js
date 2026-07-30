const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { getPagination, buildMeta } = require("../utils/pagination");
const { generateDocumentNumber } = require("../utils/documentNumber");
const { multiply, add, subtract, toNumber } = require("../utils/money");
const { decreaseStock, increaseStock, recordMovement } = require("./stockMovementService");

async function list(query) {
  const { page, limit, skip } = getPagination(query);
  const where = {};

  if (query.search) {
    where.OR = [
      { saleNumber: { contains: query.search } },
      { customerName: { contains: query.search } },
      { customerPhone: { contains: query.search } },
    ];
  }
  if (query.paymentStatus) {
    where.paymentStatus = query.paymentStatus;
  }
  if (query.status) {
    where.status = query.status;
  }
  if (query.startDate || query.endDate) {
    where.saleDate = {};
    if (query.startDate) where.saleDate.gte = new Date(query.startDate);
    if (query.endDate) where.saleDate.lte = new Date(query.endDate);
  }

  const [items, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      skip,
      take: limit,
      orderBy: { saleDate: "desc" },
    }),
    prisma.sale.count({ where }),
  ]);

  return { items, meta: buildMeta(page, limit, total) };
}

async function getById(id) {
  const sale = await prisma.sale.findUnique({
    where: { id: Number(id) },
    include: {
      items: { include: { product: true } },
      createdBy: { select: { id: true, name: true, username: true } },
      salesReturns: { include: { items: true } },
    },
  });
  if (!sale) {
    throw new ApiError(404, "Sale not found");
  }
  return sale;
}

async function create(data, userId) {
  const productIds = [...new Set(data.items.map((i) => i.productId))];
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  if (products.length !== productIds.length) {
    throw new ApiError(400, "One or more products not found");
  }
  const productMap = new Map(products.map((p) => [p.id, p]));

  for (const item of data.items) {
    const product = productMap.get(item.productId);
    if (!product.isActive) {
      throw new ApiError(400, `${product.name} is not active`);
    }
    if (product.currentStock < item.quantity) {
      throw new ApiError(400, `Insufficient stock for ${product.name}`);
    }
  }

  const itemsResolved = data.items.map((item) => {
    const product = productMap.get(item.productId);
    const sellingPrice = item.sellingPrice ?? Number(product.sellingPrice);
    const unitCostAtSale = Number(product.purchasePrice);
    const totalAmount = toNumber(multiply(item.quantity, sellingPrice));
    const totalCost = toNumber(multiply(item.quantity, unitCostAtSale));
    const grossProfit = toNumber(subtract(totalAmount, totalCost));
    return {
      productId: item.productId,
      quantity: item.quantity,
      sellingPrice,
      unitCostAtSale,
      totalAmount,
      totalCost,
      grossProfit,
    };
  });

  const subtotal = toNumber(add(...itemsResolved.map((i) => i.totalAmount)));
  const totalAmount = toNumber(subtract(subtotal, data.discount));
  if (totalAmount < 0) {
    throw new ApiError(400, "Total amount cannot be negative");
  }
  const paidAmount = Math.min(data.paidAmount, totalAmount);
  const dueAmount = toNumber(subtract(totalAmount, paidAmount));
  const paymentStatus = dueAmount === 0 ? "PAID" : paidAmount === 0 ? "UNPAID" : "PARTIALLY_PAID";
  const saleDate = new Date();

  return prisma.$transaction(async (tx) => {
    const saleNumber = await generateDocumentNumber(tx.sale, "saleNumber", "SAL", saleDate);

    const sale = await tx.sale.create({
      data: {
        saleNumber,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        saleDate,
        subtotal,
        discount: data.discount,
        totalAmount,
        paidAmount,
        dueAmount,
        paymentStatus,
        paymentMethod: data.paymentMethod,
        status: "COMPLETED",
        createdById: userId,
        items: {
          create: itemsResolved.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            sellingPrice: i.sellingPrice,
            unitCostAtSale: i.unitCostAtSale,
            totalAmount: i.totalAmount,
            totalCost: i.totalCost,
            grossProfit: i.grossProfit,
          })),
        },
      },
      include: { items: { include: { product: true } } },
    });

    for (const item of itemsResolved) {
      const { stockBefore, stockAfter } = await decreaseStock(tx, item.productId, item.quantity);
      await recordMovement(tx, {
        productId: item.productId,
        movementType: "SALE",
        referenceType: "Sale",
        referenceId: sale.id,
        quantityIn: 0,
        quantityOut: item.quantity,
        stockBefore,
        stockAfter,
        note: `Sale ${sale.saleNumber}`,
        createdById: userId,
      });
    }

    return sale;
  });
}

async function cancel(id, userId) {
  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({
      where: { id: Number(id) },
      include: { items: true, salesReturns: true },
    });
    if (!sale) {
      throw new ApiError(404, "Sale not found");
    }
    if (sale.status === "CANCELLED") {
      throw new ApiError(400, "Sale is already cancelled");
    }
    if (sale.salesReturns.length > 0) {
      throw new ApiError(400, "Cannot cancel a sale that has returns recorded against it");
    }

    for (const item of sale.items) {
      const { stockBefore, stockAfter } = await increaseStock(tx, item.productId, item.quantity);
      await recordMovement(tx, {
        productId: item.productId,
        movementType: "SALE_CANCELLATION",
        referenceType: "Sale",
        referenceId: sale.id,
        quantityIn: item.quantity,
        quantityOut: 0,
        stockBefore,
        stockAfter,
        note: `Cancelled sale ${sale.saleNumber}`,
        createdById: userId,
      });
    }

    return tx.sale.update({ where: { id: sale.id }, data: { status: "CANCELLED" } });
  });
}

module.exports = { list, getById, create, cancel };
