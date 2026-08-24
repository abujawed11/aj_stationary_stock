const { z } = require("zod");

const PAYMENT_METHODS = ["CASH", "UPI", "BANK_TRANSFER", "OTHER"];

const purchaseItemSchema = z.object({
  productId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive("Quantity must be greater than 0"),
  unitCost: z.coerce.number().nonnegative("Unit cost cannot be negative"),
});

const createPurchaseSchema = z.object({
  supplierId: z.coerce.number().int().positive().optional(),
  invoiceNumber: z.string().optional(),
  purchaseDate: z.coerce.date().optional(),
  discount: z.coerce.number().nonnegative().optional().default(0),
  additionalCost: z.coerce.number().nonnegative().optional().default(0),
  paidAmount: z.coerce.number().nonnegative().optional().default(0),
  paymentMethod: z.enum(PAYMENT_METHODS),
  notes: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1, "At least one item is required"),
});

const updatePurchaseSchema = createPurchaseSchema;

const recordPaymentSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
});

module.exports = { PAYMENT_METHODS, createPurchaseSchema, updatePurchaseSchema, recordPaymentSchema };
