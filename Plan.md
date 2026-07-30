You are a senior full-stack software architect and developer.

Build a complete, clean and production-ready Stock and Sales Management Web Application for my small stationery shop.

## Project purpose

This application will be used by a single shop owner to:

- Register stationery products
- Record purchases from suppliers
- Record customer sales
- Automatically increase stock after purchases
- Automatically decrease stock after sales
- Track cash and UPI payments
- Track expenses
- Identify low-stock and out-of-stock products
- Calculate sales, cost and estimated gross profit
- View daily and monthly reports

This is initially a single-shop and single-admin application. Do not add unnecessary enterprise-level complexity.

---

# Required technology stack

## Frontend

- Vite
- React
- JavaScript only, not TypeScript
- React Router
- Axios
- Tailwind CSS
- Lucide React icons
- Recharts for reports and dashboard charts
- React Hook Form
- Zod validation if useful
- Responsive design for desktop, tablet and mobile
- PWA-ready structure if practical

## Backend

- Node.js
- Express.js
- JavaScript only
- REST API
- JWT authentication
- bcryptjs for password hashing
- Cookie-based or Authorization-header authentication
- Proper controller, route, service and middleware separation
- Centralised error handling
- Input validation
- Transaction-safe stock operations

## Database

- MySQL
- Prisma ORM version 6
- Prisma migrations
- Prisma seed script
- Decimal fields for monetary values
- Proper indexes and foreign-key relationships

Do not use MongoDB, Sequelize, TypeORM or TypeScript.

---

# Project structure

Create two main folders:

stationery-stock-app/
  client/
  server/

Suggested frontend structure:

client/src/
  api/
  components/
  layouts/
  pages/
  hooks/
  context/
  utils/
  constants/
  routes/

Suggested backend structure:

server/src/
  config/
  controllers/
  services/
  routes/
  middleware/
  validators/
  utils/
  app.js
  server.js

Also include:

- .env.example
- README.md
- API documentation
- Prisma schema
- Prisma migrations
- Seed script
- Development scripts

---

# Authentication

Create a secure admin login.

Admin fields:

- id
- name
- email
- passwordHash
- role
- isActive
- createdAt
- updatedAt

Requirements:

- Login
- Logout
- Get current admin
- Protected routes
- Password hashing
- JWT expiry
- Authentication middleware
- Seed one development admin account
- Never expose password hashes

This application initially needs only one ADMIN role, but keep the role field extensible.

---

# Main modules

## 1. Dashboard

Display summary cards:

- Today’s total sales
- Today’s gross profit
- Today’s transaction count
- Cash collected today
- UPI collected today
- Total products
- Total stock quantity
- Stock purchase value
- Estimated retail stock value
- Low-stock product count
- Out-of-stock product count
- Current month’s sales
- Current month’s expenses

Dashboard sections:

- Recent sales
- Low-stock products
- Best-selling products
- Sales chart for the last 7 or 30 days
- Payment-method breakdown
- Category-wise stock summary

Use Indian currency formatting such as ₹1,250.00.

---

## 2. Categories

Category fields:

- id
- name
- description
- isActive
- createdAt
- updatedAt

Features:

- Add category
- Edit category
- View categories
- Activate/deactivate category
- Prevent accidental deletion when products exist

Seed categories such as:

- Notebooks and Registers
- Pens
- Pencils
- Art and Craft
- Files and Folders
- Geometry and Exam Items
- Adhesives
- Paper Products
- Office Supplies
- Miscellaneous

---

## 3. Products

Product fields:

- id
- sku
- barcode, optional
- name
- description, optional
- categoryId
- brand, optional
- unit
- purchasePrice
- sellingPrice
- mrp, optional
- currentStock
- minimumStock
- isActive
- createdAt
- updatedAt

Supported units:

- PIECE
- PACKET
- BOX
- DOZEN
- REAM
- SET
- BOTTLE
- ROLL

Product requirements:

- Generate a unique SKU automatically if not entered
- Search by name, SKU, barcode or brand
- Filter by category and stock status
- Pagination
- Sorting
- Add and edit products
- Product detail page
- Low-stock status when currentStock is less than or equal to minimumStock
- Out-of-stock status when currentStock is zero
- Do not allow negative prices or stock
- Do not hard-delete products that have transaction history
- Allow product activation/deactivation

Important:

The product’s currentStock must not normally be edited directly after creation. Stock changes must happen through purchases, sales, returns or stock adjustments.

---

## 4. Suppliers

Supplier fields:

- id
- name
- contactPerson, optional
- phone, optional
- email, optional
- address, optional
- gstNumber, optional
- notes, optional
- isActive
- createdAt
- updatedAt

Features:

- Add supplier
- Edit supplier
- Search supplier
- Supplier purchase history
- Supplier outstanding amount summary

---

## 5. Purchases

A purchase represents stock bought from a supplier.

Purchase fields:

- id
- purchaseNumber
- supplierId, optional
- invoiceNumber, optional
- purchaseDate
- subtotal
- discount
- additionalCost
- totalAmount
- paidAmount
- dueAmount
- paymentStatus
- paymentMethod
- notes
- createdById
- createdAt
- updatedAt

Purchase item fields:

- id
- purchaseId
- productId
- quantity
- unitCost
- totalCost

Payment status values:

- PAID
- PARTIALLY_PAID
- UNPAID

Payment methods:

- CASH
- UPI
- BANK_TRANSFER
- OTHER

Purchase workflow:

1. Select supplier.
2. Add one or multiple products.
3. Enter quantity and unit purchase cost.
4. Calculate subtotal automatically.
5. Apply discount or additional cost.
6. Record paid and due amounts.
7. Complete the purchase.
8. Increase each product’s stock automatically.
9. Create stock-movement records.
10. Save everything inside one Prisma database transaction.

Do not increase stock until the purchase is successfully completed.

Support:

- Purchase detail page
- Purchase list
- Search and date filtering
- Supplier filtering
- Payment-status filtering
- Purchase cancellation

If a completed purchase is cancelled, reverse its stock movement safely. Do not allow reversal if it would make stock negative because some of the stock has already been sold. Show a clear error.

---

## 6. Sales and billing

A sale represents items purchased by a customer.

Sale fields:

- id
- saleNumber
- customerName, optional
- customerPhone, optional
- saleDate
- subtotal
- discount
- totalAmount
- paidAmount
- dueAmount
- paymentStatus
- paymentMethod
- notes
- status
- createdById
- createdAt
- updatedAt

Sale item fields:

- id
- saleId
- productId
- quantity
- sellingPrice
- unitCostAtSale
- totalAmount
- totalCost
- grossProfit

Sale status:

- COMPLETED
- CANCELLED
- PARTIALLY_RETURNED
- RETURNED

Sales screen requirements:

- Fast POS-style billing page
- Search products by name, SKU or barcode
- Add multiple products to a cart
- Increase or decrease quantity
- Show available stock
- Prevent selling more than available stock
- Allow discount on complete sale
- Select Cash, UPI, Bank Transfer or Other
- Optional customer name and phone
- Complete sale button
- Print-friendly receipt
- Mobile-responsive layout

When a sale is completed:

1. Validate stock for every item.
2. Save the sale and sale items.
3. Decrease product stock.
4. Save the purchase cost applicable at the time of sale.
5. Calculate gross profit.
6. Create stock-movement records.
7. Save everything inside one Prisma database transaction.

Use:

grossProfit = totalSellingAmount - totalCost

Store unitCostAtSale so historical profit does not change when a product’s purchase price is edited later.

Handle concurrent sales safely so the same stock cannot be sold twice.

---

## 7. Sales returns

Create a proper sales-return system.

Return fields:

- id
- returnNumber
- saleId
- returnDate
- totalRefund
- refundMethod
- reason
- createdById
- createdAt

Return item fields:

- id
- salesReturnId
- saleItemId
- productId
- quantity
- refundAmount
- returnToStock
- condition

Conditions:

- GOOD
- DAMAGED

Requirements:

- Full or partial return
- Do not allow returning more than the quantity sold
- If condition is GOOD and returnToStock is true, increase stock
- If damaged, do not return it to saleable stock
- Update sale status
- Create stock-movement records
- Use a Prisma transaction

Never delete the original sale.

---

## 8. Stock adjustments

Provide manual stock adjustment for:

- OPENING_STOCK
- DAMAGED
- LOST
- PERSONAL_USE
- FREE_SAMPLE
- STOCK_CORRECTION
- OTHER

Adjustment fields:

- id
- adjustmentNumber
- productId
- adjustmentType
- direction
- quantity
- stockBefore
- stockAfter
- reason
- createdById
- createdAt

Direction:

- IN
- OUT

Requirements:

- Require a reason
- Prevent negative final stock
- Keep a permanent audit record
- Use a transaction
- Do not allow editing or deleting completed adjustments

---

## 9. Stock movement ledger

Create a central stock-movement table.

Fields:

- id
- productId
- movementType
- referenceType
- referenceId
- quantityIn
- quantityOut
- stockBefore
- stockAfter
- note
- createdById
- createdAt

Movement types:

- PURCHASE
- SALE
- SALES_RETURN
- PURCHASE_REVERSAL
- SALE_CANCELLATION
- ADJUSTMENT
- OPENING_STOCK

Every stock change must create a stock-movement record.

Create a product stock-ledger page showing:

- Date and time
- Movement type
- Reference number
- Quantity in
- Quantity out
- Previous stock
- New stock
- User
- Notes

---

## 10. Expenses

Expense fields:

- id
- expenseNumber
- category
- description
- amount
- expenseDate
- paymentMethod
- notes
- createdById
- createdAt
- updatedAt

Expense categories:

- RENT
- ELECTRICITY
- INTERNET
- TRANSPORT
- PACKAGING
- REPAIR
- FURNITURE
- SALARY
- MISCELLANEOUS

Features:

- Add expense
- Edit expense
- Expense list
- Filter by category and date
- Monthly expense report

---

## 11. Reports

Create reports for:

- Daily sales
- Monthly sales
- Date-range sales
- Gross profit
- Product-wise profit
- Category-wise sales
- Best-selling products
- Slow-moving products
- Low-stock products
- Out-of-stock products
- Purchase report
- Supplier purchase report
- Expense report
- Cash versus UPI collections
- Current stock valuation

Stock valuation should show:

- Purchase-value estimate
- Retail-value estimate
- Potential gross profit

Allow report filtering by:

- Start date
- End date
- Category
- Product
- Supplier
- Payment method

Add CSV export for major reports.

---

# Database design requirements

Create a complete Prisma 6 schema using MySQL.

Use:

- Int or BigInt primary keys
- Decimal for prices and totals
- DateTime for timestamps
- Enums for statuses and types
- Proper unique constraints
- Proper indexes
- Foreign keys
- createdAt and updatedAt where appropriate

Important tables/models should include:

- User
- Category
- Product
- Supplier
- Purchase
- PurchaseItem
- Sale
- SaleItem
- SalesReturn
- SalesReturnItem
- StockAdjustment
- StockMovement
- Expense

Use explicit Prisma relation names wherever ambiguity is possible.

Do not use floating-point fields for money.

---

# Business rules

Implement these rules carefully:

1. Stock cannot become negative.
2. Sale quantity cannot exceed available stock.
3. Completed sales must not be directly edited or deleted.
4. Completed purchases must not be directly edited or deleted.
5. Corrections should happen through cancellation, returns or adjustments.
6. Every stock change must appear in the stock ledger.
7. Purchase and sale operations must use Prisma transactions.
8. Historical sale cost and profit must remain unchanged.
9. Monetary calculations must be performed safely using Prisma Decimal or another decimal-safe approach.
10. Product deletion must be restricted when transaction history exists.
11. Generate readable unique numbers such as:
    - SAL-20260730-0001
    - PUR-20260730-0001
    - RET-20260730-0001
    - ADJ-20260730-0001
    - EXP-20260730-0001
12. Handle failed requests without leaving partially updated stock.
13. Validate all input on both frontend and backend.
14. Use India-friendly dates and ₹ currency formatting.
15. Add confirmation dialogs for cancellation and destructive actions.

---

# API requirements

Create REST endpoints similar to:

## Authentication

- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me

## Dashboard

- GET /api/dashboard/summary
- GET /api/dashboard/recent-sales
- GET /api/dashboard/sales-chart
- GET /api/dashboard/low-stock

## Categories

- GET /api/categories
- POST /api/categories
- GET /api/categories/:id
- PUT /api/categories/:id
- PATCH /api/categories/:id/status

## Products

- GET /api/products
- POST /api/products
- GET /api/products/:id
- PUT /api/products/:id
- PATCH /api/products/:id/status
- GET /api/products/:id/stock-ledger

## Suppliers

- GET /api/suppliers
- POST /api/suppliers
- GET /api/suppliers/:id
- PUT /api/suppliers/:id
- PATCH /api/suppliers/:id/status

## Purchases

- GET /api/purchases
- POST /api/purchases
- GET /api/purchases/:id
- POST /api/purchases/:id/cancel

## Sales

- GET /api/sales
- POST /api/sales
- GET /api/sales/:id
- POST /api/sales/:id/cancel
- GET /api/sales/:id/receipt

## Returns

- GET /api/sales-returns
- POST /api/sales-returns
- GET /api/sales-returns/:id

## Adjustments

- GET /api/stock-adjustments
- POST /api/stock-adjustments
- GET /api/stock-adjustments/:id

## Expenses

- GET /api/expenses
- POST /api/expenses
- GET /api/expenses/:id
- PUT /api/expenses/:id
- DELETE /api/expenses/:id

## Reports

- GET /api/reports/sales
- GET /api/reports/profit
- GET /api/reports/products
- GET /api/reports/stock
- GET /api/reports/purchases
- GET /api/reports/expenses
- GET /api/reports/payment-methods

Implement query parameters for pagination, search, date filtering, sorting and status filtering.

Return consistent JSON responses:

{
  "success": true,
  "message": "Sale completed successfully",
  "data": {},
  "meta": {}
}

For errors:

{
  "success": false,
  "message": "Insufficient stock for Cello Blue Pen",
  "errors": []
}

---

# Frontend pages

Create these pages:

- Login
- Dashboard
- Product list
- Add product
- Edit product
- Product details
- Product stock ledger
- Categories
- Suppliers
- Supplier details
- Purchases list
- New purchase
- Purchase details
- Sales list
- New sale / POS billing
- Sale details
- Printable receipt
- Sales return
- Stock adjustments
- Expenses
- Reports
- Settings
- Not found page

---

# UI requirements

Use a clean modern admin dashboard.

Layout:

- Collapsible left sidebar
- Top navigation bar
- Responsive mobile drawer
- Page title and breadcrumbs
- Reusable cards
- Reusable data table
- Search and filter bars
- Pagination
- Loading skeletons
- Empty states
- Toast notifications
- Confirmation modals
- Form validation messages
- Accessible labels and keyboard navigation

Use a professional stationery-shop theme, but do not overuse bright colours.

The sales page must be quick to use at the counter.

The cart should show:

- Product
- Available stock
- Quantity
- Selling price
- Line total
- Remove button

Order summary should show:

- Subtotal
- Discount
- Grand total
- Payment method
- Paid amount
- Due amount
- Complete sale button

---

# Seed data

Create a Prisma seed script containing:

- One admin user
- At least 8 categories
- At least 20 sample stationery products
- At least 3 suppliers
- A few sample purchases
- A few sample sales
- Sample expenses

Use realistic Indian stationery data, for example:

- Blue ball pen
- Black ball pen
- Nataraj pencil
- Eraser
- Sharpener
- Long notebook
- Small notebook
- Register
- Geometry box
- Chart paper
- Project file
- Glue bottle
- Sketch pen set
- Colour pencil box
- A4 paper ream

Mention the seeded admin credentials clearly in the README and require changing them in production.

---

# Environment configuration

Create server/.env.example with:

DATABASE_URL="mysql://root:password@localhost:3306/stationery_stock"
PORT=5000
JWT_SECRET="replace-with-a-strong-secret"
JWT_EXPIRES_IN="7d"
CLIENT_URL="http://localhost:5173"
NODE_ENV="development"

Create client/.env.example with:

VITE_API_BASE_URL="http://localhost:5000/api"

---

# Scripts

Backend scripts should include:

- npm run dev
- npm run start
- npm run prisma:generate
- npm run prisma:migrate
- npm run prisma:seed
- npm run prisma:studio

Frontend scripts should include:

- npm run dev
- npm run build
- npm run preview
- npm run lint

---

# Security and quality

Implement:

- Helmet
- CORS
- Rate limiting on authentication
- Secure password hashing
- JWT authentication
- Input sanitisation where appropriate
- Validation middleware
- Central error handler
- Safe error messages
- Environment-variable validation
- SQL injection protection through Prisma
- No sensitive values committed to Git
- ESLint
- Clean and reusable code
- Comments only where useful

Do not leave mock APIs or placeholder functions after implementation.

---

# Testing

Add at least basic backend tests for these critical cases:

1. Completing a purchase increases stock.
2. Completing a sale decreases stock.
3. A sale cannot exceed available stock.
4. A failed sale does not partially reduce stock.
5. Cancelling a sale restores stock.
6. A sales return restores only the returned quantity.
7. A damaged return does not increase saleable stock.
8. Stock adjustment cannot produce negative stock.
9. Gross profit is calculated correctly.
10. Unauthenticated users cannot access protected endpoints.

Use an appropriate JavaScript testing stack such as Vitest or Jest with Supertest.

---

# Documentation

Create a detailed README.md containing:

- Project overview
- Features
- Technology stack
- Folder structure
- Prerequisites
- MySQL database setup
- Environment-variable setup
- Prisma migration commands
- Seed command
- Frontend and backend start commands
- Default login credentials
- API overview
- Important stock-management rules
- Production deployment notes

---

# Development approach

Follow this workflow:

## Phase 1: Planning

Before writing application code:

1. Inspect the existing project directory.
2. Do not overwrite existing useful files.
3. Create a file called IMPLEMENTATION_PLAN.md.
4. Write the complete implementation plan.
5. Include:
   - Folder structure
   - Database models
   - API modules
   - Frontend pages
   - Development phases
   - Important business rules
6. Show me the plan before beginning major implementation.

## Phase 2: Foundation

After the plan is approved:

1. Initialise client and server.
2. Install dependencies.
3. Configure Express.
4. Configure Prisma 6 and MySQL.
5. Create the initial Prisma schema.
6. Run migrations.
7. Add seed data.
8. Implement authentication.
9. Create the frontend layout and protected routing.

## Phase 3: Core inventory

Implement:

1. Categories
2. Products
3. Suppliers
4. Purchases
5. Stock movement ledger

Test purchases and stock increases before continuing.

## Phase 4: Sales

Implement:

1. POS billing
2. Sale completion
3. Stock deduction
4. Profit calculation
5. Receipts
6. Cancellation
7. Sales returns

Test all stock transactions carefully.

## Phase 5: Business management

Implement:

1. Stock adjustments
2. Expenses
3. Dashboard
4. Reports
5. CSV export

## Phase 6: Polish and testing

Implement:

1. Responsive UI
2. Validation
3. Error states
4. Loading states
5. Automated tests
6. README
7. Production build verification

---

# Important instructions for Claude CLI

- First inspect the repository and report what already exists.
- Do not blindly recreate or delete existing files.
- Start by creating IMPLEMENTATION_PLAN.md.
- Do not build the entire project in one uncontrolled step.
- Work phase by phase.
- After every phase, run relevant commands and fix errors.
- Run Prisma validation after changing schema.
- Run frontend and backend lint/build checks.
- Explain each important command before running it.
- Ask for approval before moving from planning to implementation.
- Use JavaScript everywhere.
- Use Prisma version 6 specifically.
- Keep the application suitable for a small stationery shop.
- Prioritise correct stock calculations and reliable transaction history over unnecessary features.