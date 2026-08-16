const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { getPagination, buildMeta } = require("../utils/pagination");
const { toDecimal, multiply, add, subtract, toNumber } = require("../utils/money");

async function list(query) {
  const { page, limit, skip } = getPagination(query);
  const where = { isActive: true };
  if (query.productId) where.productId = Number(query.productId);
  if (query.supplierId) where.supplierId = Number(query.supplierId);

  const [items, total] = await Promise.all([
    prisma.supplierQuotation.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { supplier: true, product: true },
    }),
    prisma.supplierQuotation.count({ where }),
  ]);

  return { items, meta: buildMeta(page, limit, total) };
}

async function getById(id) {
  const quotation = await prisma.supplierQuotation.findUnique({
    where: { id: Number(id) },
    include: { supplier: true, product: true },
  });
  if (!quotation) {
    throw new ApiError(404, "Supplier quotation not found");
  }
  return quotation;
}

async function create(data, userId) {
  const [product, supplier] = await Promise.all([
    prisma.product.findUnique({ where: { id: data.productId } }),
    prisma.supplier.findUnique({ where: { id: data.supplierId } }),
  ]);
  if (!product) throw new ApiError(404, "Product not found");
  if (!supplier) throw new ApiError(404, "Supplier not found");

  return prisma.supplierQuotation.create({
    data: { ...data, createdById: userId },
    include: { supplier: true, product: true },
  });
}

async function update(id, data) {
  await getById(id);
  return prisma.supplierQuotation.update({
    where: { id: Number(id) },
    data,
    include: { supplier: true, product: true },
  });
}

async function remove(id) {
  await getById(id);
  await prisma.supplierQuotation.delete({ where: { id: Number(id) } });
}

/**
 * Free qty = floor(paidQty / buyQty) * freeQty
 * Total received = paidQty + freeQty
 * Total cost = (paidQty * unitPrice) - discount + deliveryCharge + otherCharges
 * Effective cost/unit = totalCost / totalReceivedQty
 */
function calculateQuotation(quotation, requiredQty) {
  const paidQty = requiredQty;
  const eligible = paidQty >= quotation.moq;

  let freeQty = 0;
  if (quotation.schemeBuyQty && quotation.schemeFreeQty) {
    freeQty = Math.floor(paidQty / quotation.schemeBuyQty) * quotation.schemeFreeQty;
  }
  const totalReceivedQty = paidQty + freeQty;

  const totalCostDecimal = subtract(
    add(multiply(paidQty, quotation.unitPrice), quotation.deliveryCharge, quotation.otherCharges),
    quotation.discount
  );
  const totalCost = toNumber(totalCostDecimal);
  const effectiveCostPerUnit = totalReceivedQty > 0 ? toNumber(toDecimal(totalCost).div(totalReceivedQty)) : null;

  return {
    id: quotation.id,
    supplier: quotation.supplier,
    unitPrice: toNumber(quotation.unitPrice),
    moq: quotation.moq,
    deliveryCharge: toNumber(quotation.deliveryCharge),
    discount: toNumber(quotation.discount),
    schemeBuyQty: quotation.schemeBuyQty,
    schemeFreeQty: quotation.schemeFreeQty,
    otherCharges: toNumber(quotation.otherCharges),
    deliveryTime: quotation.deliveryTime,
    notes: quotation.notes,
    paidQuantity: paidQty,
    freeQuantity: freeQty,
    totalReceivedQuantity: totalReceivedQty,
    totalPurchaseCost: totalCost,
    effectiveCostPerUnit,
    eligible,
    ineligibleReason: eligible ? null : `Required quantity (${paidQty}) is below MOQ (${quotation.moq})`,
  };
}

async function compare(productId, requiredQty) {
  const product = await prisma.product.findUnique({ where: { id: Number(productId) } });
  if (!product) throw new ApiError(404, "Product not found");

  const quotations = await prisma.supplierQuotation.findMany({
    where: { productId: Number(productId), isActive: true },
    include: { supplier: true },
    orderBy: { createdAt: "desc" },
  });

  const computed = quotations.map((q) => calculateQuotation(q, Number(requiredQty)));

  const eligible = computed
    .filter((q) => q.eligible)
    .sort((a, b) => a.effectiveCostPerUnit - b.effectiveCostPerUnit);
  const ineligible = computed.filter((q) => !q.eligible);

  if (eligible.length > 0) {
    eligible[0].isLowestEffectiveCost = true;
  }

  return {
    product: {
      id: product.id,
      name: product.name,
      sku: product.sku,
      unit: product.unit,
    },
    requiredQty: Number(requiredQty),
    quotations: [...eligible, ...ineligible],
  };
}

async function compareBasket(items) {
  const productIds = items.map((i) => Number(i.productId));
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const missing = productIds.filter((id) => !productMap.has(id));
  if (missing.length > 0) {
    throw new ApiError(404, `Product(s) not found: ${missing.join(", ")}`);
  }

  const quotations = await prisma.supplierQuotation.findMany({
    where: { productId: { in: productIds }, isActive: true },
    include: { supplier: true },
  });

  const suppliersById = new Map();
  for (const q of quotations) {
    if (!suppliersById.has(q.supplierId)) {
      suppliersById.set(q.supplierId, { supplier: q.supplier });
    }
  }

  const basketItems = items.map((i) => ({
    productId: Number(i.productId),
    requiredQty: Number(i.requiredQty),
    product: productMap.get(Number(i.productId)),
  }));

  const results = [];
  for (const [supplierId, { supplier }] of suppliersById) {
    const lineItems = [];
    const missingItems = [];

    for (const basketItem of basketItems) {
      const quotation = quotations.find(
        (q) => q.supplierId === supplierId && q.productId === basketItem.productId
      );
      if (!quotation) {
        missingItems.push({
          productId: basketItem.productId,
          productName: basketItem.product.name,
          sku: basketItem.product.sku,
          reason: "No quotation from this supplier",
        });
        continue;
      }
      const calc = calculateQuotation(quotation, basketItem.requiredQty);
      if (!calc.eligible) {
        missingItems.push({
          productId: basketItem.productId,
          productName: basketItem.product.name,
          sku: basketItem.product.sku,
          reason: calc.ineligibleReason,
        });
        continue;
      }
      lineItems.push({
        ...calc,
        productId: basketItem.productId,
        productName: basketItem.product.name,
        sku: basketItem.product.sku,
      });
    }

    const totalCost = toNumber(add(...lineItems.map((li) => li.totalPurchaseCost)));
    results.push({
      supplier,
      coveredCount: lineItems.length,
      totalItems: basketItems.length,
      isComplete: lineItems.length === basketItems.length,
      totalBasketCost: totalCost,
      lineItems,
      missingItems,
    });
  }

  results.sort((a, b) => {
    if (a.isComplete !== b.isComplete) return a.isComplete ? -1 : 1;
    if (a.isComplete && b.isComplete) return a.totalBasketCost - b.totalBasketCost;
    if (b.coveredCount !== a.coveredCount) return b.coveredCount - a.coveredCount;
    return a.totalBasketCost - b.totalBasketCost;
  });

  const cheapestComplete = results.find((r) => r.isComplete);
  if (cheapestComplete) {
    cheapestComplete.isLowestBasketCost = true;
  }

  return {
    items: basketItems.map((bi) => ({ productId: bi.productId, productName: bi.product.name, requiredQty: bi.requiredQty })),
    suppliers: results,
  };
}

module.exports = { list, getById, create, update, remove, compare, compareBasket };
