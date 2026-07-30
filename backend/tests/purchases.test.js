const { describe, it, expect, beforeEach } = require("vitest");
const request = require("supertest");
const app = require("../src/app");
const { prisma, resetDatabase, createTestUser, tokenFor, createCategory, createProduct } = require("./setup");

describe("Purchases", () => {
  let token, category, product;

  beforeEach(async () => {
    await resetDatabase();
    const user = await createTestUser();
    token = tokenFor(user);
    category = await createCategory();
    product = await createProduct(category.id, { currentStock: 0 });
  });

  it("increases product stock when a purchase is completed", async () => {
    const res = await request(app)
      .post("/api/purchases")
      .set("Cookie", `token=${token}`)
      .send({
        paymentMethod: "CASH",
        paidAmount: 100,
        items: [{ productId: product.id, quantity: 10, unitCost: 5 }],
      });

    expect(res.status).toBe(201);

    const updated = await prisma.product.findUnique({ where: { id: product.id } });
    expect(updated.currentStock).toBe(10);

    const movement = await prisma.stockMovement.findFirst({ where: { productId: product.id, movementType: "PURCHASE" } });
    expect(movement).not.toBeNull();
    expect(movement.quantityIn).toBe(10);
  });
});
