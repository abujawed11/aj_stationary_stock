const { describe, it, expect, beforeEach } = require("vitest");
const request = require("supertest");
const app = require("../src/app");
const { prisma, resetDatabase, createTestUser, tokenFor, createCategory, createProduct } = require("./setup");

describe("Stock adjustments", () => {
  let token, product;

  beforeEach(async () => {
    await resetDatabase();
    const user = await createTestUser();
    token = tokenFor(user);
    const category = await createCategory();
    product = await createProduct(category.id, { currentStock: 5 });
  });

  it("prevents an OUT adjustment from producing negative stock", async () => {
    const res = await request(app)
      .post("/api/stock-adjustments")
      .set("Cookie", `token=${token}`)
      .send({
        productId: product.id,
        adjustmentType: "DAMAGED",
        direction: "OUT",
        quantity: 10,
        reason: "Test negative stock guard",
      });

    expect(res.status).toBe(400);

    const unchanged = await prisma.product.findUnique({ where: { id: product.id } });
    expect(unchanged.currentStock).toBe(5);
  });
});
