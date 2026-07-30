const { z } = require("zod");

const ADJUSTMENT_TYPES = [
  "OPENING_STOCK",
  "DAMAGED",
  "LOST",
  "PERSONAL_USE",
  "FREE_SAMPLE",
  "STOCK_CORRECTION",
  "OTHER",
];

const DIRECTIONS = ["IN", "OUT"];

const createStockAdjustmentSchema = z.object({
  productId: z.coerce.number().int().positive(),
  adjustmentType: z.enum(ADJUSTMENT_TYPES),
  direction: z.enum(DIRECTIONS),
  quantity: z.coerce.number().int().positive("Quantity must be greater than 0"),
  reason: z.string().min(1, "Reason is required"),
});

module.exports = { ADJUSTMENT_TYPES, DIRECTIONS, createStockAdjustmentSchema };
