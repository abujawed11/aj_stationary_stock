const prisma = require("../config/prisma");
const { getIstDayRange, getIstMonthRange, istDateKey } = require("../utils/dateRange");
const { add, toNumber } = require("../utils/money");

async function getSummary() {
  const { start: todayStart, end: todayEnd } = getIstDayRange();
  const { start: monthStart, end: monthEnd } = getIstMonthRange();

  const [todaySales, monthSales, monthExpenses, products] = await Promise.all([
    prisma.sale.findMany({
      where: { saleDate: { gte: todayStart, lte: todayEnd }, status: { not: "CANCELLED" } },
      include: { items: true },
    }),
    prisma.sale.aggregate({
      where: { saleDate: { gte: monthStart, lte: monthEnd }, status: { not: "CANCELLED" } },
      _sum: { totalAmount: true },
    }),
    prisma.expense.aggregate({
      where: { expenseDate: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),
    prisma.product.findMany({
      select: {
        id: true,
        currentStock: true,
        minimumStock: true,
        purchasePrice: true,
        sellingPrice: true,
      },
    }),
  ]);

  const todayTotalSales = toNumber(add(...todaySales.map((s) => s.totalAmount)));
  const todayGrossProfit = toNumber(
    add(...todaySales.flatMap((s) => s.items.map((i) => i.grossProfit)))
  );
  const paymentTotals = { CASH: 0, UPI: 0, BANK_TRANSFER: 0, OTHER: 0 };
  for (const sale of todaySales) {
    paymentTotals[sale.paymentMethod] += Number(sale.paidAmount);
  }

  let totalStockQuantity = 0;
  let stockPurchaseValue = 0;
  let estimatedRetailStockValue = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  for (const p of products) {
    totalStockQuantity += p.currentStock;
    stockPurchaseValue += p.currentStock * Number(p.purchasePrice);
    estimatedRetailStockValue += p.currentStock * Number(p.sellingPrice);
    if (p.currentStock === 0) {
      outOfStockCount += 1;
    } else if (p.currentStock <= p.minimumStock) {
      lowStockCount += 1;
    }
  }

  return {
    today: {
      totalSales: todayTotalSales,
      grossProfit: todayGrossProfit,
      transactionCount: todaySales.length,
      cashCollected: paymentTotals.CASH,
      upiCollected: paymentTotals.UPI,
      bankTransferCollected: paymentTotals.BANK_TRANSFER,
      otherCollected: paymentTotals.OTHER,
    },
    month: {
      sales: Number(monthSales._sum.totalAmount || 0),
      expenses: Number(monthExpenses._sum.amount || 0),
    },
    products: {
      totalProducts: products.length,
      totalStockQuantity,
      stockPurchaseValue,
      estimatedRetailStockValue,
      lowStockCount,
      outOfStockCount,
    },
  };
}

async function getRecentSales(limit = 8) {
  return prisma.sale.findMany({
    orderBy: { saleDate: "desc" },
    take: Number(limit),
  });
}

async function getBestSellingProducts(limit = 5, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const grouped = await prisma.saleItem.groupBy({
    by: ["productId"],
    where: { sale: { saleDate: { gte: since }, status: { not: "CANCELLED" } } },
    _sum: { quantity: true, totalAmount: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: Number(limit),
  });

  const productIds = grouped.map((g) => g.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const productMap = new Map(products.map((p) => [p.id, p]));

  return grouped.map((g) => ({
    product: productMap.get(g.productId),
    quantitySold: g._sum.quantity,
    totalRevenue: Number(g._sum.totalAmount),
  }));
}

async function getCategoryStockSummary() {
  const categories = await prisma.category.findMany({
    include: { products: { select: { currentStock: true, purchasePrice: true, sellingPrice: true } } },
  });

  return categories.map((c) => {
    const totalStock = c.products.reduce((sum, p) => sum + p.currentStock, 0);
    const stockValue = c.products.reduce((sum, p) => sum + p.currentStock * Number(p.purchasePrice), 0);
    return { categoryId: c.id, categoryName: c.name, totalStock, stockValue };
  });
}

async function getSalesChart(days = 7) {
  const numDays = Number(days);
  const since = new Date();
  since.setDate(since.getDate() - (numDays - 1));
  const { start } = getIstDayRange(since);

  const sales = await prisma.sale.findMany({
    where: { saleDate: { gte: start }, status: { not: "CANCELLED" } },
    select: { saleDate: true, totalAmount: true },
  });

  const buckets = new Map();
  for (let i = 0; i < numDays; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (numDays - 1 - i));
    buckets.set(istDateKey(d), { date: istDateKey(d), totalSales: 0, transactionCount: 0 });
  }

  for (const sale of sales) {
    const key = istDateKey(sale.saleDate);
    if (buckets.has(key)) {
      const bucket = buckets.get(key);
      bucket.totalSales += Number(sale.totalAmount);
      bucket.transactionCount += 1;
    }
  }

  return Array.from(buckets.values());
}

async function getLowStock(limit = 10) {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: { category: true },
  });

  return products
    .filter((p) => p.currentStock <= p.minimumStock)
    .sort((a, b) => a.currentStock - b.currentStock)
    .slice(0, Number(limit));
}

module.exports = {
  getSummary,
  getRecentSales,
  getBestSellingProducts,
  getCategoryStockSummary,
  getSalesChart,
  getLowStock,
};
