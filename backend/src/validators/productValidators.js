const { z } = require("zod");

const UNITS = ["PIECE", "PACKET", "BOX", "DOZEN", "REAM", "SET", "BOTTLE", "ROLL"];

const createProductSchema = z.object({
  sku: z.string().min(1).optional(),
  barcode: z.string().min(1).optional(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  categoryId: z.coerce.number().int().positive("Category is required"),
  brand: z.string().optional(),
  unit: z.enum(UNITS),
  purchasePrice: z.coerce.number().nonnegative("Purchase price cannot be negative"),
  sellingPrice: z.coerce.number().nonnegative("Selling price cannot be negative"),
  mrp: z.coerce.number().nonnegative().optional(),
  minimumStock: z.coerce.number().int().nonnegative().optional().default(0),
});

const updateProductSchema = createProductSchema.omit({ sku: true }).partial();

const statusSchema = z.object({
  isActive: z.boolean(),
});

module.exports = { UNITS, createProductSchema, updateProductSchema, statusSchema };
