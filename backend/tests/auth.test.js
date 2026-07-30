const { describe, it, expect, beforeEach } = require("vitest");
const request = require("supertest");
const app = require("../src/app");
const { resetDatabase } = require("./setup");

describe("Authentication middleware", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("blocks unauthenticated users from protected endpoints", async () => {
    const res = await request(app).get("/api/products");
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
