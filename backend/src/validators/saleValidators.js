const { z } = require("zod");

const PAYMENT_METHODS = ["CASH", "UPI", "BANK_TRANSFER", "OTHER"];

const saleItemSchema = z.object({
  productId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive("Quantity must be greater than 0"),
  sellingPrice: z.coerce.number().nonnegative().optional(),
});

const createSaleSchema = z.object({
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  discount: z.coerce.number().nonnegative().optional().default(0),
  paidAmount: z.coerce.number().nonnegative().optional().default(0),
  paymentMethod: z.enum(PAYMENT_METHODS),
  items: z.array(saleItemSchema).min(1, "At least one item is required"),
});

const recordPaymentSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
});

module.exports = { PAYMENT_METHODS, createSaleSchema, recordPaymentSchema };
