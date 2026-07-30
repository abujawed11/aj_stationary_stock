const { z } = require("zod");

function emptyToUndefined(val) {
  return val === "" || val === null ? undefined : val;
}

const createSupplierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.preprocess(emptyToUndefined, z.string().email().optional()),
  address: z.string().optional(),
  gstNumber: z.string().optional(),
  notes: z.string().optional(),
});

const updateSupplierSchema = createSupplierSchema.partial();

const statusSchema = z.object({
  isActive: z.boolean(),
});

module.exports = { createSupplierSchema, updateSupplierSchema, statusSchema };
