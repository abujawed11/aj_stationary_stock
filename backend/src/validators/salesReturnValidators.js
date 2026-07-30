const { z } = require("zod");

const PAYMENT_METHODS = ["CASH", "UPI", "BANK_TRANSFER", "OTHER"];
const CONDITIONS = ["GOOD", "DAMAGED"];

const returnItemSchema = z.object({
  saleItemId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive("Quantity must be greater than 0"),
  condition: z.enum(CONDITIONS).default("GOOD"),
  returnToStock: z.boolean().optional().default(true),
});

const createSalesReturnSchema = z.object({
  saleId: z.coerce.number().int().positive(),
  reason: z.string().optional(),
  refundMethod: z.enum(PAYMENT_METHODS),
  items: z.array(returnItemSchema).min(1, "At least one item is required"),
});

module.exports = { PAYMENT_METHODS, CONDITIONS, createSalesReturnSchema };
