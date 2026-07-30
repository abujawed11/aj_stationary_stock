const { describe, it, expect, beforeEach } = require("vitest");
const request = require("supertest");
const app = require("../src/app");
const { prisma, resetDatabase, createTestUser, tokenFor, createCategory, createProduct } = require("./setup");

describe("Sales returns", () => {
  let token, category, product, saleId, saleItemId;

  beforeEach(async () => {
    await resetDatabase();
    const user = await createTestUser();
    token = tokenFor(user);
    category = await createCategory();
    product = await createProduct(category.id, {
      currentStock: 20,
      purchasePrice: 10,
      sellingPrice: 25,
    });

    const saleRes = await request(app)
      .post("/api/sales")
      .set("Cookie", `token=${token}`)
      .send({
        paymentMethod: "CASH",
        paidAmount: 250,
        items: [{ productId: product.id, quantity: 10 }],
      });

    saleId = saleRes.body.data.id;
    saleItemId = saleRes.body.data.items[0].id;
  });

  it("restores only the returned quantity to stock", async () => {
    // Stock after sale: 20 - 10 = 10
    const res = await request(app)
      .post("/api/sales-returns")
      .set("Cookie", `token=${token}`)
      .send({
        saleId,
        refundMethod: "CASH",
        items: [{ saleItemId, quantity: 4, condition: "GOOD", returnToStock: true }],
      });

    expect(res.status).toBe(201);

    const updated = await prisma.product.findUnique({ where: { id: product.id } });
    expect(updated.currentStock).toBe(14); // 10 + 4, not the full 10 sold
  });

  it("does not increase stock for a damaged return", async () => {
    const beforeReturn = await prisma.product.findUnique({ where: { id: product.id } });

    const res = await request(app)
      .post("/api/sales-returns")
      .set("Cookie", `token=${token}`)
      .send({
        saleId,
        refundMethod: "CASH",
        items: [{ saleItemId, quantity: 3, condition: "DAMAGED", returnToStock: true }],
      });

    expect(res.status).toBe(201);

    const afterReturn = await prisma.product.findUnique({ where: { id: product.id } });
    expect(afterReturn.currentStock).toBe(beforeReturn.currentStock);
  });
});
