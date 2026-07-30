const { z } = require("zod");

const createCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

const updateCategorySchema = createCategorySchema.partial();

const statusSchema = z.object({
  isActive: z.boolean(),
});

module.exports = { createCategorySchema, updateCategorySchema, statusSchema };
