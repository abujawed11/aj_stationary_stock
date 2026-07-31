require("dotenv/config");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("../generated/prisma");

const prisma = new PrismaClient();

const ADMIN_NAME = process.env.ADMIN_NAME || "Shop Admin";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@ajstationery.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

const CATEGORIES = [
  "Notebooks and Registers",
  "Pens",
  "Pencils",
  "Art and Craft",
  "Files and Folders",
  "Geometry and Exam Items",
  "Adhesives",
  "Paper Products",
  "Office Supplies",
  "Miscellaneous",
];

async function main() {
  const existingAdmin = await prisma.user.findUnique({ where: { username: ADMIN_USERNAME } });
  if (existingAdmin) {
    console.log("Database already seeded. Skipping.");
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const admin = await prisma.user.create({
    data: {
      name: ADMIN_NAME,
      username: ADMIN_USERNAME,
      email: ADMIN_EMAIL,
      passwordHash,
      role: "ADMIN",
    },
  });
  console.log(`Created admin user: ${admin.username}`);

  for (const name of CATEGORIES) {
    await prisma.category.create({
      data: { name, description: `${name} category` },
    });
  }
  console.log(`Created ${CATEGORIES.length} categories`);

  console.log("Production seeding complete.");
  console.log(`Admin login -> username: ${ADMIN_USERNAME} / password: ${ADMIN_PASSWORD}`);
  console.log("IMPORTANT: change this password immediately after first login.");
}

main()
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
