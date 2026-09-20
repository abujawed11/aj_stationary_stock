const { z } = require("zod");

const UNITS = ["PIECE", "PACKET", "BOX", "DOZEN", "REAM", "SET", "BOTTLE", "ROLL"];

function emptyToUndefined(val) {
  return val === "" || val === null ? undefined : val;
}

const createProductSchema = z.object({
  barcode: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  categoryId: z.coerce.number().int().positive("Category is required"),
  brand: z.string().optional(),
  unit: z.enum(UNITS),
  sellingPrice: z.coerce.number().nonnegative("Selling price cannot be negative"),
  mrp: z.preprocess(emptyToUndefined, z.coerce.number().nonnegative().optional()),
  minimumStock: z.coerce.number().int().nonnegative().optional().default(0),
  openingStock: z.coerce.number().int().nonnegative().optional().default(0),
});

const updateProductSchema = createProductSchema.partial();

const statusSchema = z.object({
  isActive: z.boolean(),
});

module.exports = { UNITS, createProductSchema, updateProductSchema, statusSchema };
