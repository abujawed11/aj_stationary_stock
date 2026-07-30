# Implementation Plan — AJ Stationery Stock & Sales Management App

## 0. Repository inspection findings

- Not a git repository yet.
- `backend/` exists but only contains a bare `package.json` (default `npm init`, CommonJS, no dependencies, no source files). Nothing to preserve besides the file itself.
- `frontend/` exists as an **untouched default Vite + React 19 scaffold** (`App.jsx`, `main.jsx`, `index.css`, `App.css`, default assets, `oxlint` for linting, Vite 8 with the `rolldown-vite` engine). No Tailwind, no router, no app-specific code yet.
- `Plan.md` (the spec you provided) sits at the repo root and will remain untouched/for-reference only.

**Deviation from Plan.md naming:** the spec asks for `client/` + `server/`, but this project already has `frontend/` and `backend/` folders in use. I will build inside the existing `frontend/` and `backend/` folders rather than creating new `client`/`server` folders, to avoid duplicate/confusing project roots. Let me know if you'd rather I rename them to match the spec exactly.

**Deviation on frontend tooling:** the existing scaffold uses `oxlint` (not `eslint`) and Vite's `rolldown-vite` build (Vite 8, not the more common Vite 5/6 line). Plan.md asks for ESLint + `npm run lint`. I propose keeping `oxlint` since it's already installed and wired to `npm run lint` (satisfies the spec's intent — a working lint script) instead of ripping it out to install ESLint. Flag if you'd prefer classic ESLint instead.

Everything else below assumes these two folders as the project roots and will be built fresh inside them (existing scaffold files like `App.jsx`/`main.jsx` will be rewritten as part of Phase 2, since they're just Vite's default placeholder content, not custom work).

---

## 1. Final folder structure

```
aj_stationary_stock/
  Plan.md                     (existing, reference only)
  IMPLEMENTATION_PLAN.md       (this file)
  README.md                    (new, root-level project overview)

  backend/
    src/
      config/                 (env loading, prisma client instance)
      controllers/             (one per module: auth, dashboard, categories, products,
                                 suppliers, purchases, sales, salesReturns,
                                 stockAdjustments, expenses, reports)
      services/                 (business logic + Prisma transactions, mirrors controllers)
      routes/                   (Express routers, mirrors controllers)
      middleware/               (authMiddleware, errorHandler, rateLimiter, validate)
      validators/                (Zod or express-validator schemas per module)
      utils/                    (apiResponse helper, number generator, currency/date utils)
      app.js
      server.js
    prisma/
      schema.prisma
      migrations/
      seed.js
    tests/                      (Vitest + Supertest)
    .env.example
    package.json

  frontend/
    src/
      api/                      (axios instance + one client file per module)
      components/                (Sidebar, Topbar, DataTable, Card, Modal, Toast, etc.)
      layouts/                   (AppLayout with sidebar+topbar, AuthLayout)
      pages/                     (one folder per module, see section 4)
      hooks/                      (useAuth, usePagination, useDebounce, etc.)
      context/                    (AuthContext)
      utils/                      (currency formatting ₹, date formatting, sku helpers)
      constants/                  (enums mirrored from Prisma: units, payment methods, etc.)
      routes/                     (AppRoutes.jsx incl. ProtectedRoute)
    public/
    .env.example
    package.json
```

---

## 2. Database design (Prisma 6 + MySQL)

Models (all `Int` autoincrement PKs, `Decimal(12,2)` for money, `createdAt`/`updatedAt` on mutable entities):

- **User** — id, name, email (unique), passwordHash, role (enum `AdminRole { ADMIN }`), isActive, timestamps
- **Category** — id, name (unique), description?, isActive, timestamps; relation → Product[]
- **Product** — id, sku (unique), barcode? (unique, nullable), name, description?, categoryId (FK), brand?, unit (enum `Unit`), purchasePrice (Decimal), sellingPrice (Decimal), mrp? (Decimal), currentStock (Int, default 0), minimumStock (Int, default 0), isActive, timestamps. Indexes on name, categoryId, isActive.
- **Supplier** — id, name, contactPerson?, phone?, email?, address?, gstNumber?, notes?, isActive, timestamps
- **Purchase** — id, purchaseNumber (unique), supplierId? (FK), invoiceNumber?, purchaseDate, subtotal, discount, additionalCost, totalAmount, paidAmount, dueAmount, paymentStatus (enum), paymentMethod (enum), status (enum: COMPLETED/CANCELLED — needed to support cancellation workflow), notes?, createdById (FK→User), timestamps
- **PurchaseItem** — id, purchaseId (FK), productId (FK), quantity, unitCost, totalCost
- **Sale** — id, saleNumber (unique), customerName?, customerPhone?, saleDate, subtotal, discount, totalAmount, paidAmount, dueAmount, paymentStatus (enum), paymentMethod (enum), status (enum `SaleStatus`), createdById (FK), timestamps
- **SaleItem** — id, saleId (FK), productId (FK), quantity, sellingPrice, unitCostAtSale, totalAmount, totalCost, grossProfit
- **SalesReturn** — id, returnNumber (unique), saleId (FK), returnDate, totalRefund, refundMethod (enum, reuse PaymentMethod), reason?, createdById (FK), createdAt
- **SalesReturnItem** — id, salesReturnId (FK), saleItemId (FK), productId (FK), quantity, refundAmount, returnToStock (Boolean), condition (enum `ItemCondition`)
- **StockAdjustment** — id, adjustmentNumber (unique), productId (FK), adjustmentType (enum), direction (enum IN/OUT), quantity, stockBefore, stockAfter, reason, createdById (FK), createdAt
- **StockMovement** — id, productId (FK), movementType (enum), referenceType (string or enum), referenceId (Int), quantityIn, quantityOut, stockBefore, stockAfter, note?, createdById (FK), createdAt. Indexed on (productId, createdAt).
- **Expense** — id, expenseNumber (unique), category (enum), description, amount, expenseDate, paymentMethod (enum), notes?, createdById (FK), timestamps

Enums: `Unit`, `PaymentStatus`, `PaymentMethod`, `SaleStatus`, `ItemCondition`, `AdjustmentType`, `AdjustmentDirection`, `MovementType`, `ExpenseCategory`, `AdminRole`.

Key relations get explicit `@relation(name: ...)` where a model has multiple FKs to the same target (e.g. `createdById` → User across many models all named distinctly; `Product` referenced from PurchaseItem/SaleItem/StockAdjustment/StockMovement/SalesReturnItem).

Number generator utility: `PUR-YYYYMMDD-0001` style, computed inside the same transaction (count-of-day based, with row lock consideration to avoid collisions under concurrency — will use a small `SEQUENCE`-like approach: query max suffix for the day inside the transaction).

---

## 3. Core business-logic modules (backend services)

Each of these wraps a **Prisma interactive transaction**:

1. **Purchases** — create purchase + items → increment `Product.currentStock` per item → write `StockMovement` (PURCHASE) per item. Cancellation: reverse movement (PURCHASE_REVERSAL), block if resulting stock would go negative (i.e., some of that stock already sold/moved out since).
2. **Sales** — validate stock ≥ requested qty for every line (re-check inside transaction to prevent race conditions — use `SELECT ... FOR UPDATE` semantics via Prisma's transaction + `currentStock` guarded update, or optimistic check with `updateMany where currentStock >= qty`), decrement stock, snapshot `unitCostAtSale` from current `purchasePrice`, compute `grossProfit = totalAmount - totalCost`, write StockMovement (SALE). Cancellation restores stock (SALE_CANCELLATION).
3. **Sales returns** — validate return qty ≤ (sold − already returned) per sale item, refund amount, conditionally restock (GOOD + returnToStock=true → increment stock + StockMovement SALES_RETURN), update parent Sale.status (PARTIALLY_RETURNED/RETURNED).
4. **Stock adjustments** — direction IN increments, OUT decrements with a guard against negative result; StockMovement type ADJUSTMENT or OPENING_STOCK.
5. **Stock movement ledger** — pure read-side; every mutation above writes to it as part of the same transaction, never independently.

Concurrency safety approach: wrap each stock-affecting mutation in `prisma.$transaction(async (tx) => {...})`, and use a conditional `update` (`data: { currentStock: { decrement: qty } }` guarded by a `where: { id, currentStock: { gte: qty } }` plus checking the returned row count) so two simultaneous sales can't both succeed against the same last unit.

---

## 4. API surface

Matches Plan.md's endpoint list section-for-section (`/api/auth`, `/api/dashboard/*`, `/api/categories`, `/api/products` incl. `/:id/stock-ledger`, `/api/suppliers`, `/api/purchases` incl. `/:id/cancel`, `/api/sales` incl. `/:id/cancel` and `/:id/receipt`, `/api/sales-returns`, `/api/stock-adjustments`, `/api/expenses`, `/api/reports/*`). All list endpoints support `page`, `limit`, `search`, `sortBy`, `sortOrder`, date-range and status/category filters as applicable. Every response follows the `{ success, message, data, meta }` / `{ success:false, message, errors }` envelope via a shared `sendSuccess`/`sendError` helper and a centralized Express error-handling middleware.

---

## 5. Frontend pages

Login, Dashboard, Product List/Add/Edit/Details/Stock-Ledger, Categories, Suppliers + Supplier Details, Purchases List/New/Details, Sales List/New (POS)/Details/Receipt, Sales Return, Stock Adjustments, Expenses, Reports, Settings, 404 — each per Plan.md's page list, under `AppLayout` (sidebar + topbar) behind a `ProtectedRoute`, with `AuthLayout` for `/login`.

Shared components built once and reused: `DataTable` (pagination/sort baked in), `Card`, `StatCard`, `Modal`/`ConfirmDialog`, `Toast` provider, `SearchInput`, `DateRangePicker`, `FormField` wrappers around React Hook Form + Zod.

---

## 6. Development phases (execution order)

**Phase 2 — Foundation**
- Backend: install express, prisma@6, @prisma/client, bcryptjs, jsonwebtoken, cors, helmet, express-rate-limit, zod (or express-validator), dotenv, morgan; init Prisma, write full schema, run first migration, write seed script, implement auth (login/logout/me + JWT middleware).
- Frontend: install react-router-dom, axios, tailwindcss, lucide-react, recharts, react-hook-form, zod, @hookform/resolvers; configure Tailwind; build AppLayout/AuthLayout/ProtectedRoute; wire login page + AuthContext.
- Checkpoint: login works end-to-end against a seeded admin.

**Phase 3 — Core inventory**
- Categories, Products (incl. SKU auto-generation, search/filter/pagination), Suppliers, Purchases (incl. transaction + stock increment), Stock Movement ledger + product ledger page.
- Checkpoint: completing a purchase visibly increases product stock and produces a ledger row.

**Phase 4 — Sales**
- POS billing page, sale completion transaction (stock decrement + cost snapshot + profit calc), receipt view, sale cancellation (stock restore), sales returns (full/partial, condition-aware restock).
- Checkpoint: sale reduces stock, cancel restores it, partial return restocks only the GOOD/returnToStock portion.

**Phase 5 — Business management**
- Stock adjustments, Expenses, Dashboard (summary cards + charts + breakdowns), Reports (all report types + CSV export).

**Phase 6 — Polish & testing**
- Responsive pass, loading/empty states, toasts, confirmation dialogs on destructive actions, Vitest+Supertest backend tests for the 10 critical cases from Plan.md, README, production build verification (`vite build`, `prisma migrate deploy` dry-run).

I will pause after each phase to run the relevant build/lint/test commands and report results before moving to the next.

---

## 7. Key business rules carried through implementation

1. Stock never goes negative — enforced at the DB-update level, not just app-level checks.
2. Sale quantity can't exceed available stock — checked at cart-add time (UX) and again inside the transaction (correctness).
3. Completed sales/purchases are never mutated/deleted directly — only cancellation, returns, or adjustments change stock state afterward.
4. Every stock-affecting action writes exactly one `StockMovement` row per affected product line, in the same transaction as the parent record.
5. `unitCostAtSale` is captured at sale time and never recalculated — historical profit is immutable even if `Product.purchasePrice` changes later.
6. All money fields use Prisma `Decimal`; arithmetic on them in JS uses a decimal-safe helper (likely `decimal.js`, which Prisma already depends on) — never native floating point.
7. Document numbers (`SAL-YYYYMMDD-0001` etc.) are generated inside the owning transaction to avoid collisions.
8. Product hard-delete is blocked whenever any Purchase/Sale/Adjustment references it; soft-deactivate (`isActive=false`) is offered instead.

---

## Open questions for you before I start Phase 2

1. OK to build inside existing `frontend/`/`backend/` folders (not `client/`/`server/`)?
2. OK to keep `oxlint` for the frontend lint script instead of switching to ESLint?
3. Do you already have a local MySQL instance/credentials ready, or should the plan assume a placeholder `DATABASE_URL` you'll fill in yourself before running migrations?
