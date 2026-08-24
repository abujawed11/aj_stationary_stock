const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { getPagination, buildMeta } = require("../utils/pagination");
const { generateDocumentNumber } = require("../utils/documentNumber");
const { multiply, add, subtract, toNumber } = require("../utils/money");
const { increaseStock, decreaseStock, recordMovement } = require("./stockMovementService");

async function list(query) {
  const { page, limit, skip } = getPagination(query);
  const where = {};

  if (query.search) {
    where.OR = [
      { purchaseNumber: { contains: query.search } },
      { invoiceNumber: { contains: query.search } },
    ];
  }
  if (query.supplierId) {
    where.supplierId = Number(query.supplierId);
  }
  if (query.paymentStatus) {
    where.paymentStatus = query.paymentStatus;
  }
  if (query.startDate || query.endDate) {
    where.purchaseDate = {};
    if (query.startDate) where.purchaseDate.gte = new Date(query.startDate);
    if (query.endDate) where.purchaseDate.lte = new Date(query.endDate);
  }

  const [items, total] = await Promise.all([
    prisma.purchase.findMany({
      where,
      skip,
      take: limit,
      orderBy: { purchaseDate: "desc" },
      include: { supplier: true },
    }),
    prisma.purchase.count({ where }),
  ]);

  return { items, meta: buildMeta(page, limit, total) };
}

async function getById(id) {
  const purchase = await prisma.purchase.findUnique({
    where: { id: Number(id) },
    include: {
      supplier: true,
      items: { include: { product: true } },
      createdBy: { select: { id: true, name: true, username: true } },
    },
  });
  if (!purchase) {
    throw new ApiError(404, "Purchase not found");
  }
  return purchase;
}

async function create(data, userId) {
  if (data.supplierId) {
    const supplier = await prisma.supplier.findUnique({ where: { id: data.supplierId } });
    if (!supplier) {
      throw new ApiError(400, "Supplier not found");
    }
  }

  const productIds = [...new Set(data.items.map((i) => i.productId))];
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  if (products.length !== productIds.length) {
    throw new ApiError(400, "One or more products not found");
  }

  const itemsWithTotals = data.items.map((item) => ({
    ...item,
    totalCost: toNumber(multiply(item.quantity, item.unitCost)),
  }));

  const subtotal = toNumber(add(...itemsWithTotals.map((i) => i.totalCost)));
  const totalAmount = toNumber(subtract(add(subtotal, data.additionalCost), data.discount));
  if (totalAmount < 0) {
    throw new ApiError(400, "Total amount cannot be negative");
  }

  const paidAmount = Math.min(data.paidAmount, totalAmount);
  const dueAmount = toNumber(subtract(totalAmount, paidAmount));
  const paymentStatus = dueAmount === 0 ? "PAID" : paidAmount === 0 ? "UNPAID" : "PARTIALLY_PAID";
  const purchaseDate = data.purchaseDate || new Date();

  return prisma.$transaction(async (tx) => {
    const purchaseNumber = await generateDocumentNumber(tx.purchase, "purchaseNumber", "PUR", purchaseDate);

    const purchase = await tx.purchase.create({
      data: {
        purchaseNumber,
        supplierId: data.supplierId || null,
        invoiceNumber: data.invoiceNumber,
        purchaseDate,
        subtotal,
        discount: data.discount,
        additionalCost: data.additionalCost,
        totalAmount,
        paidAmount,
        dueAmount,
        paymentStatus,
        paymentMethod: data.paymentMethod,
        status: "COMPLETED",
        notes: data.notes,
        createdById: userId,
        items: {
          create: itemsWithTotals.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitCost: i.unitCost,
            totalCost: i.totalCost,
          })),
        },
      },
      include: { items: true, supplier: true },
    });

    for (const item of itemsWithTotals) {
      const { stockBefore, stockAfter } = await increaseStock(tx, item.productId, item.quantity);
      // Cost basis is refreshed from the latest actual purchase price paid,
      // rather than a manually-guessed value on the product itself.
      await tx.product.update({ where: { id: item.productId }, data: { purchasePrice: item.unitCost } });
      await recordMovement(tx, {
        productId: item.productId,
        movementType: "PURCHASE",
        referenceType: "Purchase",
        referenceId: purchase.id,
        quantityIn: item.quantity,
        quantityOut: 0,
        stockBefore,
        stockAfter,
        note: `Purchase ${purchase.purchaseNumber}`,
        createdById: userId,
      });
    }

    return purchase;
  });
}

async function update(id, data, userId) {
  if (data.supplierId) {
    const supplier = await prisma.supplier.findUnique({ where: { id: data.supplierId } });
    if (!supplier) {
      throw new ApiError(400, "Supplier not found");
    }
  }

  const productIds = [...new Set(data.items.map((i) => i.productId))];
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  if (products.length !== productIds.length) {
    throw new ApiError(400, "One or more products not found");
  }

  const itemsWithTotals = data.items.map((item) => ({
    ...item,
    totalCost: toNumber(multiply(item.quantity, item.unitCost)),
  }));

  const subtotal = toNumber(add(...itemsWithTotals.map((i) => i.totalCost)));
  const totalAmount = toNumber(subtract(add(subtotal, data.additionalCost), data.discount));
  if (totalAmount < 0) {
    throw new ApiError(400, "Total amount cannot be negative");
  }

  const paidAmount = Math.min(data.paidAmount, totalAmount);
  const dueAmount = toNumber(subtract(totalAmount, paidAmount));
  const paymentStatus = dueAmount === 0 ? "PAID" : paidAmount === 0 ? "UNPAID" : "PARTIALLY_PAID";
  const purchaseDate = data.purchaseDate || new Date();

  return prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.findUnique({
      where: { id: Number(id) },
      include: { items: true },
    });
    if (!purchase) {
      throw new ApiError(404, "Purchase not found");
    }
    if (purchase.status === "CANCELLED") {
      throw new ApiError(400, "Cannot edit a cancelled purchase");
    }

    // Reverse the stock this purchase originally added before applying the new item list.
    for (const item of purchase.items) {
      const { stockBefore, stockAfter } = await decreaseStock(tx, item.productId, item.quantity);
      await recordMovement(tx, {
        productId: item.productId,
        movementType: "PURCHASE_REVERSAL",
        referenceType: "Purchase",
        referenceId: purchase.id,
        quantityIn: 0,
        quantityOut: item.quantity,
        stockBefore,
        stockAfter,
        note: `Edited purchase ${purchase.purchaseNumber}`,
        createdById: userId,
      });
    }

    await tx.purchaseItem.deleteMany({ where: { purchaseId: purchase.id } });

    const updated = await tx.purchase.update({
      where: { id: purchase.id },
      data: {
        supplierId: data.supplierId || null,
        invoiceNumber: data.invoiceNumber,
        purchaseDate,
        subtotal,
        discount: data.discount,
        additionalCost: data.additionalCost,
        totalAmount,
        paidAmount,
        dueAmount,
        paymentStatus,
        paymentMethod: data.paymentMethod,
        notes: data.notes,
        items: {
          create: itemsWithTotals.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitCost: i.unitCost,
            totalCost: i.totalCost,
          })),
        },
      },
      include: { items: true, supplier: true },
    });

    for (const item of itemsWithTotals) {
      const { stockBefore, stockAfter } = await increaseStock(tx, item.productId, item.quantity);
      await tx.product.update({ where: { id: item.productId }, data: { purchasePrice: item.unitCost } });
      await recordMovement(tx, {
        productId: item.productId,
        movementType: "PURCHASE",
        referenceType: "Purchase",
        referenceId: purchase.id,
        quantityIn: item.quantity,
        quantityOut: 0,
        stockBefore,
        stockAfter,
        note: `Edited purchase ${purchase.purchaseNumber}`,
        createdById: userId,
      });
    }

    return updated;
  });
}

async function cancel(id, userId) {
  return prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.findUnique({
      where: { id: Number(id) },
      include: { items: true },
    });
    if (!purchase) {
      throw new ApiError(404, "Purchase not found");
    }
    if (purchase.status === "CANCELLED") {
      throw new ApiError(400, "Purchase is already cancelled");
    }

    for (const item of purchase.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (product.currentStock < item.quantity) {
        throw new ApiError(
          400,
          `Cannot cancel purchase: insufficient remaining stock for ${product.name} (some has already been sold)`
        );
      }
    }

    for (const item of purchase.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      const stockBefore = product.currentStock;
      const stockAfter = stockBefore - item.quantity;

      await tx.product.update({ where: { id: item.productId }, data: { currentStock: stockAfter } });
      await recordMovement(tx, {
        productId: item.productId,
        movementType: "PURCHASE_REVERSAL",
        referenceType: "Purchase",
        referenceId: purchase.id,
        quantityIn: 0,
        quantityOut: item.quantity,
        stockBefore,
        stockAfter,
        note: `Cancelled purchase ${purchase.purchaseNumber}`,
        createdById: userId,
      });
    }

    return tx.purchase.update({ where: { id: purchase.id }, data: { status: "CANCELLED" } });
  });
}

async function recordPayment(id, data) {
  const purchase = await prisma.purchase.findUnique({ where: { id: Number(id) } });
  if (!purchase) {
    throw new ApiError(404, "Purchase not found");
  }
  if (purchase.status === "CANCELLED") {
    throw new ApiError(400, "Cannot record a payment against a cancelled purchase");
  }
  if (data.amount > Number(purchase.dueAmount)) {
    throw new ApiError(400, "Payment amount exceeds the due amount");
  }

  const paidAmount = toNumber(add(purchase.paidAmount, data.amount));
  const dueAmount = toNumber(subtract(purchase.totalAmount, paidAmount));
  const paymentStatus = dueAmount === 0 ? "PAID" : "PARTIALLY_PAID";

  return prisma.purchase.update({
    where: { id: purchase.id },
    data: {
      paidAmount,
      dueAmount,
      paymentStatus,
      paymentMethod: data.paymentMethod || purchase.paymentMethod,
    },
  });
}

module.exports = { list, getById, create, update, cancel, recordPayment };
