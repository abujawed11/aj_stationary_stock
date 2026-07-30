require("dotenv/config");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("../generated/prisma");

const prisma = new PrismaClient();

const ADMIN_USERNAME = "admin";
const ADMIN_EMAIL = "admin@ajstationery.com";
const ADMIN_PASSWORD = "admin123";

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

const PRODUCTS = [
  { sku: "STN0001", name: "Cello Blue Ball Pen", category: "Pens", brand: "Cello", unit: "PIECE", purchasePrice: 4, sellingPrice: 10, mrp: 10, openingStock: 200, minimumStock: 30 },
  { sku: "STN0002", name: "Cello Black Ball Pen", category: "Pens", brand: "Cello", unit: "PIECE", purchasePrice: 4, sellingPrice: 10, mrp: 10, openingStock: 150, minimumStock: 30 },
  { sku: "STN0003", name: "Reynolds Red Ball Pen", category: "Pens", brand: "Reynolds", unit: "PIECE", purchasePrice: 5, sellingPrice: 12, mrp: 12, openingStock: 100, minimumStock: 20 },
  { sku: "STN0004", name: "Add Gel Blue Pen", category: "Pens", brand: "Add Gel", unit: "PIECE", purchasePrice: 8, sellingPrice: 18, mrp: 20, openingStock: 80, minimumStock: 20 },
  { sku: "STN0005", name: "Natraj Pencil Pack of 10", category: "Pencils", brand: "Natraj", unit: "PACKET", purchasePrice: 28, sellingPrice: 50, mrp: 55, openingStock: 90, minimumStock: 15 },
  { sku: "STN0006", name: "Apsara Pencil Pack of 10", category: "Pencils", brand: "Apsara", unit: "PACKET", purchasePrice: 30, sellingPrice: 52, mrp: 55, openingStock: 70, minimumStock: 15 },
  { sku: "STN0007", name: "Doms Eraser", category: "Pencils", brand: "Doms", unit: "PIECE", purchasePrice: 2, sellingPrice: 5, mrp: 5, openingStock: 250, minimumStock: 40 },
  { sku: "STN0008", name: "Natraj Sharpener", category: "Pencils", brand: "Natraj", unit: "PIECE", purchasePrice: 2, sellingPrice: 5, mrp: 5, openingStock: 200, minimumStock: 40 },
  { sku: "STN0009", name: "Long Notebook 172 Pages", category: "Notebooks and Registers", brand: "Classmate", unit: "PIECE", purchasePrice: 35, sellingPrice: 60, mrp: 65, openingStock: 120, minimumStock: 20 },
  { sku: "STN0010", name: "Small Notebook 100 Pages", category: "Notebooks and Registers", brand: "Classmate", unit: "PIECE", purchasePrice: 18, sellingPrice: 30, mrp: 35, openingStock: 150, minimumStock: 25 },
  { sku: "STN0011", name: "Classmate Register 4 Quire", category: "Notebooks and Registers", brand: "Classmate", unit: "PIECE", purchasePrice: 55, sellingPrice: 90, mrp: 95, openingStock: 60, minimumStock: 10 },
  { sku: "STN0012", name: "Classmate Register 6 Quire", category: "Notebooks and Registers", brand: "Classmate", unit: "PIECE", purchasePrice: 80, sellingPrice: 130, mrp: 140, openingStock: 8, minimumStock: 10 },
  { sku: "STN0013", name: "Camlin Geometry Box", category: "Geometry and Exam Items", brand: "Camlin", unit: "PIECE", purchasePrice: 45, sellingPrice: 80, mrp: 85, openingStock: 40, minimumStock: 10 },
  { sku: "STN0014", name: "Chart Paper White", category: "Paper Products", brand: null, unit: "PIECE", purchasePrice: 6, sellingPrice: 12, mrp: 12, openingStock: 100, minimumStock: 20 },
  { sku: "STN0015", name: "A4 Paper Ream 75GSM", category: "Paper Products", brand: "JK Copier", unit: "REAM", purchasePrice: 220, sellingPrice: 320, mrp: 340, openingStock: 35, minimumStock: 10 },
  { sku: "STN0016", name: "Project File Green", category: "Files and Folders", brand: null, unit: "PIECE", purchasePrice: 20, sellingPrice: 40, mrp: 45, openingStock: 70, minimumStock: 15 },
  { sku: "STN0017", name: "L-Shape File Folder", category: "Files and Folders", brand: null, unit: "PIECE", purchasePrice: 8, sellingPrice: 18, mrp: 20, openingStock: 0, minimumStock: 15 },
  { sku: "STN0018", name: "Fevicol Glue Bottle 50ml", category: "Adhesives", brand: "Fevicol", unit: "BOTTLE", purchasePrice: 12, sellingPrice: 22, mrp: 25, openingStock: 90, minimumStock: 20 },
  { sku: "STN0019", name: "UHU Glue Stick", category: "Adhesives", brand: "UHU", unit: "PIECE", purchasePrice: 15, sellingPrice: 28, mrp: 30, openingStock: 60, minimumStock: 15 },
  { sku: "STN0020", name: "Sketch Pen Set 12 Colours", category: "Art and Craft", brand: "Camlin", unit: "SET", purchasePrice: 35, sellingPrice: 60, mrp: 65, openingStock: 45, minimumStock: 10 },
  { sku: "STN0021", name: "Colour Pencil Box 24 Shades", category: "Art and Craft", brand: "Camlin", unit: "BOX", purchasePrice: 60, sellingPrice: 100, mrp: 110, openingStock: 35, minimumStock: 10 },
  { sku: "STN0022", name: "Camel Water Colour Box", category: "Art and Craft", brand: "Camel", unit: "BOX", purchasePrice: 40, sellingPrice: 70, mrp: 75, openingStock: 25, minimumStock: 10 },
  { sku: "STN0023", name: "Oxford Stapler", category: "Office Supplies", brand: "Oxford", unit: "PIECE", purchasePrice: 45, sellingPrice: 80, mrp: 85, openingStock: 20, minimumStock: 5 },
  { sku: "STN0024", name: "Kangaro Stapler Pins Box", category: "Office Supplies", brand: "Kangaro", unit: "BOX", purchasePrice: 10, sellingPrice: 20, mrp: 20, openingStock: 50, minimumStock: 10 },
  { sku: "STN0025", name: "Rubber Bands Pack", category: "Miscellaneous", brand: null, unit: "PACKET", purchasePrice: 15, sellingPrice: 25, mrp: 25, openingStock: 40, minimumStock: 10 },
];

const SUPPLIERS = [
  { name: "Sharma Stationery Distributors", contactPerson: "Ravi Sharma", phone: "9811100001", email: "ravi@sharmastationery.example", address: "Chandni Chowk, Delhi", gstNumber: "07AASFS1234A1Z5" },
  { name: "Om Paper Traders", contactPerson: "Om Prakash", phone: "9822200002", email: "om@omtraders.example", address: "Lamington Road, Mumbai", gstNumber: "27AAOPT5678B1Z2" },
  { name: "Krishna Wholesale Stationers", contactPerson: "Krishna Patel", phone: "9833300003", email: "krishna@krishnaws.example", address: "Manek Chowk, Ahmedabad", gstNumber: "24AAKWS9012C1Z8" },
];

const EXPENSES = [
  { category: "RENT", description: "Monthly shop rent", amount: 15000, paymentMethod: "CASH", daysAgo: 20 },
  { category: "ELECTRICITY", description: "Electricity bill", amount: 3500, paymentMethod: "CASH", daysAgo: 15 },
  { category: "INTERNET", description: "Broadband bill", amount: 1200, paymentMethod: "UPI", daysAgo: 12 },
  { category: "TRANSPORT", description: "Local delivery transport", amount: 800, paymentMethod: "CASH", daysAgo: 8 },
  { category: "PACKAGING", description: "Packing bags and covers", amount: 2000, paymentMethod: "UPI", daysAgo: 5 },
];

function pad(num, len) {
  return String(num).padStart(len, "0");
}

function docNumber(prefix, date, seq) {
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1, 2);
  const d = pad(date.getDate(), 2);
  return `${prefix}-${y}${m}${d}-${pad(seq, 4)}`;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function main() {
  const existingAdmin = await prisma.user.findUnique({ where: { username: ADMIN_USERNAME } });
  if (existingAdmin) {
    console.log("Database already seeded. Skipping.");
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const admin = await prisma.user.create({
    data: {
      name: "Shop Admin",
      username: ADMIN_USERNAME,
      email: ADMIN_EMAIL,
      passwordHash,
      role: "ADMIN",
    },
  });
  console.log(`Created admin user: ${admin.username}`);

  const categoryMap = {};
  for (const name of CATEGORIES) {
    const category = await prisma.category.create({
      data: { name, description: `${name} category` },
    });
    categoryMap[name] = category.id;
  }
  console.log(`Created ${CATEGORIES.length} categories`);

  let adjSeq = 1;
  const productMap = {};
  for (const p of PRODUCTS) {
    const product = await prisma.product.create({
      data: {
        sku: p.sku,
        name: p.name,
        categoryId: categoryMap[p.category],
        brand: p.brand,
        unit: p.unit,
        purchasePrice: p.purchasePrice,
        sellingPrice: p.sellingPrice,
        mrp: p.mrp,
        currentStock: p.openingStock,
        minimumStock: p.minimumStock,
      },
    });
    productMap[p.sku] = product;

    if (p.openingStock > 0) {
      const adjustment = await prisma.stockAdjustment.create({
        data: {
          adjustmentNumber: docNumber("ADJ", new Date(), adjSeq++),
          productId: product.id,
          adjustmentType: "OPENING_STOCK",
          direction: "IN",
          quantity: p.openingStock,
          stockBefore: 0,
          stockAfter: p.openingStock,
          reason: "Initial opening stock",
          createdById: admin.id,
        },
      });

      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          movementType: "OPENING_STOCK",
          referenceType: "StockAdjustment",
          referenceId: adjustment.id,
          quantityIn: p.openingStock,
          quantityOut: 0,
          stockBefore: 0,
          stockAfter: p.openingStock,
          note: "Initial opening stock",
          createdById: admin.id,
        },
      });
    }
  }
  console.log(`Created ${PRODUCTS.length} products with opening stock`);

  const supplierRecords = [];
  for (const s of SUPPLIERS) {
    const supplier = await prisma.supplier.create({ data: s });
    supplierRecords.push(supplier);
  }
  console.log(`Created ${SUPPLIERS.length} suppliers`);

  const purchaseDefs = [
    {
      supplier: supplierRecords[0],
      daysAgo: 10,
      paymentMethod: "CASH",
      fullyPaid: true,
      items: [
        { sku: "STN0001", quantity: 100, unitCost: 4 },
        { sku: "STN0005", quantity: 50, unitCost: 28 },
        { sku: "STN0015", quantity: 20, unitCost: 220 },
      ],
    },
    {
      supplier: supplierRecords[1],
      daysAgo: 7,
      paymentMethod: "UPI",
      fullyPaid: false,
      items: [
        { sku: "STN0009", quantity: 60, unitCost: 35 },
        { sku: "STN0011", quantity: 40, unitCost: 55 },
      ],
    },
    {
      supplier: supplierRecords[2],
      daysAgo: 4,
      paymentMethod: "BANK_TRANSFER",
      fullyPaid: true,
      items: [
        { sku: "STN0013", quantity: 30, unitCost: 45 },
        { sku: "STN0018", quantity: 80, unitCost: 12 },
      ],
    },
  ];

  let purSeq = 1;
  for (const def of purchaseDefs) {
    const itemsWithTotals = def.items.map((item) => ({
      ...item,
      totalCost: item.quantity * item.unitCost,
    }));
    const subtotal = itemsWithTotals.reduce((sum, i) => sum + i.totalCost, 0);
    const totalAmount = subtotal;
    const paidAmount = def.fullyPaid ? totalAmount : Math.round(totalAmount * 0.6);
    const dueAmount = totalAmount - paidAmount;
    const purchaseDate = daysAgo(def.daysAgo);

    const purchase = await prisma.purchase.create({
      data: {
        purchaseNumber: docNumber("PUR", purchaseDate, purSeq++),
        supplierId: def.supplier.id,
        purchaseDate,
        subtotal,
        discount: 0,
        additionalCost: 0,
        totalAmount,
        paidAmount,
        dueAmount,
        paymentStatus: dueAmount === 0 ? "PAID" : "PARTIALLY_PAID",
        paymentMethod: def.paymentMethod,
        status: "COMPLETED",
        createdById: admin.id,
        items: {
          create: itemsWithTotals.map((i) => ({
            productId: productMap[i.sku].id,
            quantity: i.quantity,
            unitCost: i.unitCost,
            totalCost: i.totalCost,
          })),
        },
      },
    });

    for (const item of itemsWithTotals) {
      const product = await prisma.product.findUnique({ where: { id: productMap[item.sku].id } });
      const stockBefore = product.currentStock;
      const stockAfter = stockBefore + item.quantity;

      await prisma.product.update({
        where: { id: product.id },
        data: { currentStock: stockAfter },
      });

      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          movementType: "PURCHASE",
          referenceType: "Purchase",
          referenceId: purchase.id,
          quantityIn: item.quantity,
          quantityOut: 0,
          stockBefore,
          stockAfter,
          note: `Purchase ${purchase.purchaseNumber}`,
          createdById: admin.id,
        },
      });

      productMap[item.sku].currentStock = stockAfter;
    }
  }
  console.log(`Created ${purchaseDefs.length} sample purchases`);

  const saleDefs = [
    {
      daysAgo: 6,
      paymentMethod: "CASH",
      fullyPaid: true,
      customerName: "Walk-in Customer",
      items: [
        { sku: "STN0001", quantity: 2 },
        { sku: "STN0007", quantity: 1 },
      ],
    },
    {
      daysAgo: 5,
      paymentMethod: "UPI",
      fullyPaid: true,
      customerName: "Anita Verma",
      items: [
        { sku: "STN0009", quantity: 1 },
        { sku: "STN0005", quantity: 3 },
      ],
    },
    {
      daysAgo: 3,
      paymentMethod: "CASH",
      fullyPaid: true,
      customerName: "Walk-in Customer",
      items: [
        { sku: "STN0002", quantity: 5 },
        { sku: "STN0020", quantity: 2 },
      ],
    },
    {
      daysAgo: 2,
      paymentMethod: "UPI",
      fullyPaid: false,
      customerName: "Rahul Mehta",
      items: [
        { sku: "STN0015", quantity: 1 },
        { sku: "STN0016", quantity: 2 },
      ],
    },
    {
      daysAgo: 1,
      paymentMethod: "CASH",
      fullyPaid: true,
      customerName: "Walk-in Customer",
      items: [
        { sku: "STN0021", quantity: 3 },
        { sku: "STN0013", quantity: 1 },
      ],
    },
  ];

  let saleSeq = 1;
  for (const def of saleDefs) {
    const itemsResolved = def.items.map((item) => {
      const product = productMap[item.sku];
      const totalAmount = item.quantity * Number(product.sellingPrice);
      const totalCost = item.quantity * Number(product.purchasePrice);
      return {
        sku: item.sku,
        productId: product.id,
        quantity: item.quantity,
        sellingPrice: product.sellingPrice,
        unitCostAtSale: product.purchasePrice,
        totalAmount,
        totalCost,
        grossProfit: totalAmount - totalCost,
      };
    });

    const subtotal = itemsResolved.reduce((sum, i) => sum + i.totalAmount, 0);
    const totalAmount = subtotal;
    const paidAmount = def.fullyPaid ? totalAmount : Math.round(totalAmount * 0.7);
    const dueAmount = totalAmount - paidAmount;
    const saleDate = daysAgo(def.daysAgo);

    const sale = await prisma.sale.create({
      data: {
        saleNumber: docNumber("SAL", saleDate, saleSeq++),
        customerName: def.customerName,
        saleDate,
        subtotal,
        discount: 0,
        totalAmount,
        paidAmount,
        dueAmount,
        paymentStatus: dueAmount === 0 ? "PAID" : "PARTIALLY_PAID",
        paymentMethod: def.paymentMethod,
        status: "COMPLETED",
        createdById: admin.id,
        items: {
          create: itemsResolved.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            sellingPrice: i.sellingPrice,
            unitCostAtSale: i.unitCostAtSale,
            totalAmount: i.totalAmount,
            totalCost: i.totalCost,
            grossProfit: i.grossProfit,
          })),
        },
      },
    });

    for (const item of itemsResolved) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      const stockBefore = product.currentStock;
      const stockAfter = stockBefore - item.quantity;

      await prisma.product.update({
        where: { id: product.id },
        data: { currentStock: stockAfter },
      });

      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          movementType: "SALE",
          referenceType: "Sale",
          referenceId: sale.id,
          quantityIn: 0,
          quantityOut: item.quantity,
          stockBefore,
          stockAfter,
          note: `Sale ${sale.saleNumber}`,
          createdById: admin.id,
        },
      });

      productMap[item.sku].currentStock = stockAfter;
    }
  }
  console.log(`Created ${saleDefs.length} sample sales`);

  let expSeq = 1;
  for (const e of EXPENSES) {
    const expenseDate = daysAgo(e.daysAgo);
    await prisma.expense.create({
      data: {
        expenseNumber: docNumber("EXP", expenseDate, expSeq++),
        category: e.category,
        description: e.description,
        amount: e.amount,
        expenseDate,
        paymentMethod: e.paymentMethod,
        createdById: admin.id,
      },
    });
  }
  console.log(`Created ${EXPENSES.length} sample expenses`);

  console.log("Seeding complete.");
  console.log(`Admin login -> username: ${ADMIN_USERNAME} / password: ${ADMIN_PASSWORD}`);
  console.log("IMPORTANT: change this password before using in production.");
}

main()
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
