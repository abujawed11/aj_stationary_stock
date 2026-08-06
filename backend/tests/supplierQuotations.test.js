const { describe, it, expect, beforeEach } = require("vitest");
const request = require("supertest");
const app = require("../src/app");
const { prisma, resetDatabase, createTestUser, tokenFor, createCategory, createProduct } = require("./setup");

describe("Supplier price comparison", () => {
  let token, category, product, supplierA, supplierB;

  beforeEach(async () => {
    await resetDatabase();
    const user = await createTestUser();
    token = tokenFor(user);
    category = await createCategory();
    product = await createProduct(category.id, { currentStock: 0 });
    supplierA = await prisma.supplier.create({ data: { name: "Supplier A" } });
    supplierB = await prisma.supplier.create({ data: { name: "Supplier B" } });
  });

  it("calculates free quantity, total cost, and effective cost per unit correctly", async () => {
    // Buy 100 @ 10, buy10-get1-free scheme, discount 20, delivery 50, other 10
    // freeQty = floor(100/10)*1 = 10; totalReceived = 110
    // totalCost = 100*10 - 20 + 50 + 10 = 1040; effective = 1040/110 = 9.4545...
    const res = await request(app)
      .post("/api/supplier-quotations")
      .set("Cookie", `token=${token}`)
      .send({
        productId: product.id,
        supplierId: supplierA.id,
        unitPrice: 10,
        moq: 20,
        deliveryCharge: 50,
        discount: 20,
        schemeBuyQty: 10,
        schemeFreeQty: 1,
        otherCharges: 10,
        deliveryTime: "3-5 days",
      });
    expect(res.status).toBe(201);

    const compareRes = await request(app)
      .get("/api/supplier-quotations/compare")
      .query({ productId: product.id, requiredQty: 100 })
      .set("Cookie", `token=${token}`);

    expect(compareRes.status).toBe(200);
    const quote = compareRes.body.data.quotations[0];
    expect(quote.paidQuantity).toBe(100);
    expect(quote.freeQuantity).toBe(10);
    expect(quote.totalReceivedQuantity).toBe(110);
    expect(quote.totalPurchaseCost).toBe(1040);
    expect(quote.effectiveCostPerUnit).toBeCloseTo(9.45, 2);
    expect(quote.eligible).toBe(true);
    expect(quote.isLowestEffectiveCost).toBe(true);
  });

  it("marks a quotation ineligible when required quantity is below MOQ", async () => {
    await request(app)
      .post("/api/supplier-quotations")
      .set("Cookie", `token=${token}`)
      .send({
        productId: product.id,
        supplierId: supplierA.id,
        unitPrice: 10,
        moq: 50,
      });

    const compareRes = await request(app)
      .get("/api/supplier-quotations/compare")
      .query({ productId: product.id, requiredQty: 20 })
      .set("Cookie", `token=${token}`);

    expect(compareRes.status).toBe(200);
    const quote = compareRes.body.data.quotations[0];
    expect(quote.eligible).toBe(false);
    expect(quote.ineligibleReason).toMatch(/MOQ/);
    expect(quote.isLowestEffectiveCost).toBeUndefined();
  });

  it("sorts eligible suppliers by lowest effective cost and highlights the cheapest", async () => {
    await request(app)
      .post("/api/supplier-quotations")
      .set("Cookie", `token=${token}`)
      .send({ productId: product.id, supplierId: supplierA.id, unitPrice: 12, moq: 1 });

    await request(app)
      .post("/api/supplier-quotations")
      .set("Cookie", `token=${token}`)
      .send({ productId: product.id, supplierId: supplierB.id, unitPrice: 8, moq: 1 });

    const compareRes = await request(app)
      .get("/api/supplier-quotations/compare")
      .query({ productId: product.id, requiredQty: 10 })
      .set("Cookie", `token=${token}`);

    const [cheapest, second] = compareRes.body.data.quotations;
    expect(cheapest.supplier.id).toBe(supplierB.id);
    expect(cheapest.isLowestEffectiveCost).toBe(true);
    expect(second.supplier.id).toBe(supplierA.id);
    expect(second.isLowestEffectiveCost).toBeUndefined();
  });

  it("does not create a purchase or change product stock", async () => {
    await request(app)
      .post("/api/supplier-quotations")
      .set("Cookie", `token=${token}`)
      .send({ productId: product.id, supplierId: supplierA.id, unitPrice: 10, moq: 1 });

    const unchanged = await prisma.product.findUnique({ where: { id: product.id } });
    expect(unchanged.currentStock).toBe(0);
    const purchaseCount = await prisma.purchase.count();
    expect(purchaseCount).toBe(0);
  });
});
