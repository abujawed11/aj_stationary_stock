const prisma = require("../config/prisma");
const { add, toNumber } = require("../utils/money");
const { istDateKey } = require("../utils/dateRange");

function buildDateFilter(query, field) {
  const filter = {};
  if (query.startDate) filter.gte = new Date(query.startDate);
  if (query.endDate) {
    const end = new Date(query.endDate);
    end.setHours(23, 59, 59, 999);
    filter.lte = end;
  }
  return Object.keys(filter).length ? { [field]: filter } : {};
}

async function getSalesReport(query) {
  const where = {
    status: { not: "CANCELLED" },
    ...buildDateFilter(query, "saleDate"),
  };
  if (query.paymentMethod) where.paymentMethod = query.paymentMethod;

  const sales = await prisma.sale.findMany({ where, orderBy: { saleDate: "asc" } });

  const items = sales.map((s) => ({
    saleNumber: s.saleNumber,
    saleDate: s.saleDate,
    customerName: s.customerName || "Walk-in",
    paymentMethod: s.paymentMethod,
    subtotal: Number(s.subtotal),
    discount: Number(s.discount),
    totalAmount: Number(s.totalAmount),
    paidAmount: Number(s.paidAmount),
    dueAmount: Number(s.dueAmount),
    status: s.status,
  }));

  const summary = {
    totalSales: toNumber(add(...sales.map((s) => s.totalAmount))),
    totalDiscount: toNumber(add(...sales.map((s) => s.discount))),
    transactionCount: sales.length,
  };

  let grouped = null;
  if (query.groupBy === "day" || query.groupBy === "month") {
    const buckets = new Map();
    for (const s of sales) {
      const key = query.groupBy === "day" ? istDateKey(s.saleDate) : istDateKey(s.saleDate).slice(0, 7);
      if (!buckets.has(key)) buckets.set(key, { period: key, totalSales: 0, transactionCount: 0 });
      const b = buckets.get(key);
      b.totalSales += Number(s.totalAmount);
      b.transactionCount += 1;
    }
    grouped = Array.from(buckets.values()).sort((a, b) => a.period.localeCompare(b.period));
  }

  return { items, summary, grouped };
}

async function getProfitReport(query) {
  const saleWhere = { status: { not: "CANCELLED" }, ...buildDateFilter(query, "saleDate") };
  const where = { sale: saleWhere };
  if (query.productId) where.productId = Number(query.productId);

  const saleItems = await prisma.saleItem.findMany({ where, include: { product: true } });

  const summary = {
    totalRevenue: toNumber(add(...saleItems.map((i) => i.totalAmount))),
    totalCost: toNumber(add(...saleItems.map((i) => i.totalCost))),
    totalProfit: toNumber(add(...saleItems.map((i) => i.grossProfit))),
  };

  const byProductMap = new Map();
  for (const i of saleItems) {
    if (!byProductMap.has(i.productId)) {
      byProductMap.set(i.productId, {
        productId: i.productId,
        productName: i.product.name,
        quantitySold: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
      });
    }
    const b = byProductMap.get(i.productId);
    b.quantitySold += i.quantity;
    b.revenue += Number(i.totalAmount);
    b.cost += Number(i.totalCost);
    b.profit += Number(i.grossProfit);
  }

  return { summary, items: Array.from(byProductMap.values()).sort((a, b) => b.profit - a.profit) };
}

async function getProductsReport(query) {
  const mode = query.mode || "best-selling";
  const categoryWhere = query.categoryId ? { categoryId: Number(query.categoryId) } : {};

  if (mode === "low-stock" || mode === "out-of-stock") {
    const products = await prisma.product.findMany({
      where: { isActive: true, ...categoryWhere },
      include: { category: true },
    });
    const filtered =
      mode === "low-stock"
        ? products.filter((p) => p.currentStock > 0 && p.currentStock <= p.minimumStock)
        : products.filter((p) => p.currentStock === 0);

    return {
      items: filtered.map((p) => ({
        productId: p.id,
        sku: p.sku,
        productName: p.name,
        category: p.category.name,
        currentStock: p.currentStock,
        minimumStock: p.minimumStock,
      })),
    };
  }

  const saleWhere = { status: { not: "CANCELLED" }, ...buildDateFilter(query, "saleDate") };
  const grouped = await prisma.saleItem.groupBy({
    by: ["productId"],
    where: { sale: saleWhere },
    _sum: { quantity: true, totalAmount: true },
  });
  const soldMap = new Map(grouped.map((g) => [g.productId, g]));

  const allProducts = await prisma.product.findMany({
    where: { isActive: true, ...categoryWhere },
    include: { category: true },
  });

  const limit = query.limit ? Number(query.limit) : 20;

  if (mode === "best-selling") {
    const items = allProducts
      .map((p) => ({
        productId: p.id,
        sku: p.sku,
        productName: p.name,
        category: p.category.name,
        quantitySold: soldMap.get(p.id)?._sum.quantity || 0,
        revenue: Number(soldMap.get(p.id)?._sum.totalAmount || 0),
      }))
      .filter((i) => i.quantitySold > 0)
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, limit);
    return { items };
  }

  // slow-moving
  const items = allProducts
    .map((p) => ({
      productId: p.id,
      sku: p.sku,
      productName: p.name,
      category: p.category.name,
      quantitySold: soldMap.get(p.id)?._sum.quantity || 0,
    }))
    .sort((a, b) => a.quantitySold - b.quantitySold)
    .slice(0, limit);
  return { items };
}

async function getStockReport(query) {
  const where = query.categoryId ? { categoryId: Number(query.categoryId) } : {};
  const products = await prisma.product.findMany({ where, include: { category: true } });

  const items = products.map((p) => {
    const purchaseValue = p.currentStock * Number(p.purchasePrice);
    const retailValue = p.currentStock * Number(p.sellingPrice);
    return {
      productId: p.id,
      sku: p.sku,
      productName: p.name,
      category: p.category.name,
      currentStock: p.currentStock,
      purchasePrice: Number(p.purchasePrice),
      sellingPrice: Number(p.sellingPrice),
      purchaseValue,
      retailValue,
      potentialProfit: retailValue - purchaseValue,
    };
  });

  const summary = {
    totalPurchaseValue: items.reduce((s, i) => s + i.purchaseValue, 0),
    totalRetailValue: items.reduce((s, i) => s + i.retailValue, 0),
    totalPotentialProfit: items.reduce((s, i) => s + i.potentialProfit, 0),
  };

  return { items, summary };
}

async function getPurchasesReport(query) {
  const where = {
    status: { not: "CANCELLED" },
    ...buildDateFilter(query, "purchaseDate"),
  };
  if (query.supplierId) where.supplierId = Number(query.supplierId);

  const purchases = await prisma.purchase.findMany({
    where,
    include: { supplier: true },
    orderBy: { purchaseDate: "asc" },
  });

  const items = purchases.map((p) => ({
    purchaseNumber: p.purchaseNumber,
    purchaseDate: p.purchaseDate,
    supplierName: p.supplier?.name || "No supplier",
    paymentMethod: p.paymentMethod,
    subtotal: Number(p.subtotal),
    discount: Number(p.discount),
    additionalCost: Number(p.additionalCost),
    totalAmount: Number(p.totalAmount),
    paidAmount: Number(p.paidAmount),
    dueAmount: Number(p.dueAmount),
    status: p.status,
  }));

  const summary = {
    totalAmount: toNumber(add(...purchases.map((p) => p.totalAmount))),
    totalPaid: toNumber(add(...purchases.map((p) => p.paidAmount))),
    totalDue: toNumber(add(...purchases.map((p) => p.dueAmount))),
    count: purchases.length,
  };

  let bySupplier = null;
  if (query.groupBy === "supplier") {
    const map = new Map();
    for (const p of purchases) {
      const key = p.supplierId || "none";
      const name = p.supplier?.name || "No supplier";
      if (!map.has(key)) map.set(key, { supplierId: p.supplierId, supplierName: name, totalAmount: 0, count: 0 });
      const b = map.get(key);
      b.totalAmount += Number(p.totalAmount);
      b.count += 1;
    }
    bySupplier = Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }

  return { items, summary, bySupplier };
}

async function getExpensesReport(query) {
  const where = { ...buildDateFilter(query, "expenseDate") };
  if (query.category) where.category = query.category;

  const expenses = await prisma.expense.findMany({ where, orderBy: { expenseDate: "asc" } });

  const items = expenses.map((e) => ({
    expenseNumber: e.expenseNumber,
    expenseDate: e.expenseDate,
    category: e.category,
    description: e.description,
    amount: Number(e.amount),
    paymentMethod: e.paymentMethod,
  }));

  const summary = {
    totalAmount: toNumber(add(...expenses.map((e) => e.amount))),
    count: expenses.length,
  };

  let byCategory = null;
  if (query.groupBy === "category") {
    const map = new Map();
    for (const e of expenses) {
      if (!map.has(e.category)) map.set(e.category, { category: e.category, totalAmount: 0, count: 0 });
      const b = map.get(e.category);
      b.totalAmount += Number(e.amount);
      b.count += 1;
    }
    byCategory = Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }

  return { items, summary, byCategory };
}

async function getPaymentMethodsReport(query) {
  const where = { status: { not: "CANCELLED" }, ...buildDateFilter(query, "saleDate") };
  const sales = await prisma.sale.findMany({ where });

  const totals = { CASH: 0, UPI: 0, BANK_TRANSFER: 0, OTHER: 0 };
  for (const s of sales) {
    totals[s.paymentMethod] += Number(s.paidAmount);
  }

  return {
    items: Object.entries(totals).map(([paymentMethod, amount]) => ({ paymentMethod, amount })),
    transactionCount: sales.length,
  };
}

module.exports = {
  getSalesReport,
  getProfitReport,
  getProductsReport,
  getStockReport,
  getPurchasesReport,
  getExpensesReport,
  getPaymentMethodsReport,
};
