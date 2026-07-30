require("dotenv").config({ path: require("path").join(__dirname, "..", ".env.test") });

const bcrypt = require("bcryptjs");
const prisma = require("../src/config/prisma");
const { signToken } = require("../src/utils/jwt");

async function resetDatabase() {
  await prisma.$transaction([
    prisma.stockMovement.deleteMany(),
    prisma.salesReturnItem.deleteMany(),
    prisma.salesReturn.deleteMany(),
    prisma.saleItem.deleteMany(),
    prisma.sale.deleteMany(),
    prisma.purchaseItem.deleteMany(),
    prisma.purchase.deleteMany(),
    prisma.stockAdjustment.deleteMany(),
    prisma.expense.deleteMany(),
    prisma.product.deleteMany(),
    prisma.category.deleteMany(),
    prisma.supplier.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

async function createTestUser(overrides = {}) {
  const passwordHash = await bcrypt.hash("Test@1234", 10);
  return prisma.user.create({
    data: {
      name: "Test Admin",
      username: "testadmin",
      email: "testadmin@example.com",
      passwordHash,
      role: "ADMIN",
      ...overrides,
    },
  });
}

function tokenFor(user) {
  return signToken({ sub: user.id, role: user.role });
}

async function createCategory(overrides = {}) {
  return prisma.category.create({ data: { name: "Test Category", ...overrides } });
}

async function createProduct(categoryId, overrides = {}) {
  return prisma.product.create({
    data: {
      sku: overrides.sku || `TST${Math.floor(Math.random() * 1000000)}`,
      name: "Test Product",
      categoryId,
      unit: "PIECE",
      purchasePrice: 10,
      sellingPrice: 20,
      currentStock: 0,
      minimumStock: 5,
      ...overrides,
    },
  });
}

module.exports = { prisma, resetDatabase, createTestUser, tokenFor, createCategory, createProduct };
