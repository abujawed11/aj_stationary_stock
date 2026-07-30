const { z } = require("zod");

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  PORT: z.string().optional(),
  JWT_SECRET: z.string().min(10, "JWT_SECRET must be set and at least 10 characters"),
  JWT_EXPIRES_IN: z.string().optional(),
  CLIENT_URL: z.string().optional(),
  NODE_ENV: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid or missing environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

module.exports = parsed.data;
