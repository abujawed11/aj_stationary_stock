const { z } = require("zod");

const EXPENSE_CATEGORIES = [
  "RENT",
  "ELECTRICITY",
  "INTERNET",
  "TRANSPORT",
  "PACKAGING",
  "REPAIR",
  "FURNITURE",
  "SALARY",
  "MISCELLANEOUS",
];

const PAYMENT_METHODS = ["CASH", "UPI", "BANK_TRANSFER", "OTHER"];

const createExpenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  description: z.string().min(1, "Description is required"),
  amount: z.coerce.number().nonnegative("Amount cannot be negative"),
  expenseDate: z.coerce.date().optional(),
  paymentMethod: z.enum(PAYMENT_METHODS),
  notes: z.string().optional(),
});

const updateExpenseSchema = createExpenseSchema.partial();

module.exports = { EXPENSE_CATEGORIES, PAYMENT_METHODS, createExpenseSchema, updateExpenseSchema };
