const { z } = require("zod");

const createSupplierQuotationSchema = z.object({
  productId: z.coerce.number().int().positive(),
  supplierId: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().nonnegative("Unit price cannot be negative"),
  moq: z.coerce.number().int().positive().optional().default(1),
  deliveryCharge: z.coerce.number().nonnegative().optional().default(0),
  discount: z.coerce.number().nonnegative().optional().default(0),
  schemeBuyQty: z.coerce.number().int().positive().optional(),
  schemeFreeQty: z.coerce.number().int().positive().optional(),
  otherCharges: z.coerce.number().nonnegative().optional().default(0),
  deliveryTime: z.string().optional(),
  notes: z.string().optional(),
});

const updateSupplierQuotationSchema = createSupplierQuotationSchema.partial();

module.exports = {
  createSupplierQuotationSchema,
  updateSupplierQuotationSchema,
};
