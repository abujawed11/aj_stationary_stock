const { describe, it, expect, beforeEach } = require("vitest");
const request = require("supertest");
const app = require("../src/app");
const { prisma, resetDatabase, createTestUser, tokenFor, createCategory, createProduct } = require("./setup");

describe("Sales", () => {
  let token, category, product;

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
  });

  it("decreases product stock when a sale is completed", async () => {
    const res = await request(app)
      .post("/api/sales")
      .set("Cookie", `token=${token}`)
      .send({
        paymentMethod: "CASH",
        paidAmount: 125,
        items: [{ productId: product.id, quantity: 5 }],
      });

    expect(res.status).toBe(201);

    const updated = await prisma.product.findUnique({ where: { id: product.id } });
    expect(updated.currentStock).toBe(15);
  });

  it("rejects a sale that exceeds available stock", async () => {
    const res = await request(app)
      .post("/api/sales")
      .set("Cookie", `token=${token}`)
      .send({
        paymentMethod: "CASH",
        paidAmount: 0,
        items: [{ productId: product.id, quantity: 999 }],
      });

    expect(res.status).toBe(400);

    const unchanged = await prisma.product.findUnique({ where: { id: product.id } });
    expect(unchanged.currentStock).toBe(20);
  });

  it("does not partially reduce stock when one item in a multi-item sale fails", async () => {
    const lowStockProduct = await createProduct(category.id, {
      sku: "TSTLOW1",
      currentStock: 2,
      purchasePrice: 10,
      sellingPrice: 20,
    });

    const res = await request(app)
      .post("/api/sales")
      .set("Cookie", `token=${token}`)
      .send({
        paymentMethod: "CASH",
        paidAmount: 0,
        items: [
          { productId: product.id, quantity: 5 },
          { productId: lowStockProduct.id, quantity: 10 },
        ],
      });

    expect(res.status).toBe(400);

    const firstProductUnchanged = await prisma.product.findUnique({ where: { id: product.id } });
    expect(firstProductUnchanged.currentStock).toBe(20);
  });

  it("restores stock when a completed sale is cancelled", async () => {
    const createRes = await request(app)
      .post("/api/sales")
      .set("Cookie", `token=${token}`)
      .send({
        paymentMethod: "CASH",
        paidAmount: 125,
        items: [{ productId: product.id, quantity: 5 }],
      });

    const saleId = createRes.body.data.id;

    const cancelRes = await request(app).post(`/api/sales/${saleId}/cancel`).set("Cookie", `token=${token}`);
    expect(cancelRes.status).toBe(200);

    const restored = await prisma.product.findUnique({ where: { id: product.id } });
    expect(restored.currentStock).toBe(20);
  });

  it("calculates gross profit correctly", async () => {
    const res = await request(app)
      .post("/api/sales")
      .set("Cookie", `token=${token}`)
      .send({
        paymentMethod: "CASH",
        paidAmount: 100,
        items: [{ productId: product.id, quantity: 4 }],
      });

    const saleItem = await prisma.saleItem.findFirst({ where: { saleId: res.body.data.id } });
    expect(Number(saleItem.totalAmount)).toBe(100);
    expect(Number(saleItem.totalCost)).toBe(40);
    expect(Number(saleItem.grossProfit)).toBe(60);
  });
});
