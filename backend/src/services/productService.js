const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { getPagination, buildMeta } = require("../utils/pagination");
const stockAdjustmentService = require("./stockAdjustmentService");

const SORTABLE_FIELDS = ["name", "sku", "currentStock", "sellingPrice", "purchasePrice", "createdAt", "updatedAt"];

async function generateSku() {
  const count = await prisma.product.count();
  return `STN${String(count + 1).padStart(4, "0")}`;
}

async function list(query) {
  const where = {};

  if (query.search) {
    where.OR = [
      { name: { contains: query.search } },
      { sku: { contains: query.search } },
      { barcode: { contains: query.search } },
      { brand: { contains: query.search } },
    ];
  }
  if (query.categoryId) {
    where.categoryId = Number(query.categoryId);
  }
  if (query.isActive !== undefined) {
    where.isActive = query.isActive === "true";
  }

  const sortBy = SORTABLE_FIELDS.includes(query.sortBy) ? query.sortBy : "updatedAt";
  const sortOrder = query.sortBy ? (query.sortOrder === "desc" ? "desc" : "asc") : "desc";
  const { page, limit, skip } = getPagination(query);

  if (query.stockStatus === "LOW" || query.stockStatus === "OUT") {
    // currentStock vs minimumStock is a column-to-column comparison Prisma can't
    // express in `where`, so this path filters in memory. Fine at small-shop scale;
    // the default (unfiltered) path below uses real DB-level pagination.
    let items = await prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { [sortBy]: sortOrder },
    });

    items =
      query.stockStatus === "LOW"
        ? items.filter((p) => p.currentStock > 0 && p.currentStock <= p.minimumStock)
        : items.filter((p) => p.currentStock === 0);

    const total = items.length;
    const paged = items.slice(skip, skip + limit);
    return { items: paged, meta: buildMeta(page, limit, total) };
  }

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  return { items, meta: buildMeta(page, limit, total) };
}

async function getById(id) {
  const product = await prisma.product.findUnique({
    where: { id: Number(id) },
    include: { category: true },
  });
  if (!product) {
    throw new ApiError(404, "Product not found");
  }
  return product;
}

async function create(data, userId) {
  const { openingStock, ...productData } = data;

  const category = await prisma.category.findUnique({ where: { id: productData.categoryId } });
  if (!category) {
    throw new ApiError(400, "Category not found");
  }

  if (productData.barcode) {
    const existingBarcode = await prisma.product.findUnique({ where: { barcode: productData.barcode } });
    if (existingBarcode) {
      throw new ApiError(409, "Barcode already exists");
    }
  }

  const sku = await generateSku();

  const product = await prisma.product.create({
    data: {
      ...productData,
      sku,
      purchasePrice: 0,
      currentStock: 0,
      minimumStock: productData.minimumStock ?? 0,
    },
  });

  if (openingStock > 0) {
    await stockAdjustmentService.create(
      {
        productId: product.id,
        adjustmentType: "OPENING_STOCK",
        direction: "IN",
        quantity: openingStock,
        reason: "Opening stock recorded at product creation",
      },
      userId
    );
    return getById(product.id);
  }

  return product;
}

async function update(id, data) {
  const product = await getById(id);

  if (data.barcode && data.barcode !== product.barcode) {
    const existingBarcode = await prisma.product.findFirst({
      where: { barcode: data.barcode, NOT: { id: Number(id) } },
    });
    if (existingBarcode) {
      throw new ApiError(409, "Barcode already exists");
    }
  }

  if (data.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category) {
      throw new ApiError(400, "Category not found");
    }
  }

  return prisma.product.update({ where: { id: Number(id) }, data });
}

async function setStatus(id, isActive) {
  await getById(id);
  return prisma.product.update({ where: { id: Number(id) }, data: { isActive } });
}

async function getStockLedger(id, query) {
  await getById(id);
  const { page, limit, skip } = getPagination(query);
  const where = { productId: Number(id) };

  const [items, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { id: true, name: true, username: true } } },
    }),
    prisma.stockMovement.count({ where }),
  ]);

  return { items, meta: buildMeta(page, limit, total) };
}

module.exports = { list, getById, create, update, setStatus, getStockLedger };
