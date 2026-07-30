# AJ Stationery — Stock & Sales Management App

A complete stock and sales management web application for a small stationery
shop: register products, record purchases and sales, track stock movements,
manage expenses, and view dashboards and reports — all in one place.

This is a single-shop, single-admin application by design. It intentionally
avoids multi-tenant/enterprise complexity.

---

## Features

- **Authentication** — secure admin login (username + password), JWT stored in
  an httpOnly cookie, rate-limited login endpoint.
- **Categories & Products** — full catalog management, auto-generated SKUs,
  search/filter/sort, low-stock and out-of-stock detection, per-product stock
  ledger.
- **Suppliers** — contact details, purchase history, outstanding balance.
- **Purchases** — record stock bought from suppliers; completing a purchase
  automatically increases product stock (inside a database transaction) and
  writes a stock-movement record. Purchases can be cancelled (reversing
  stock, blocked if that stock has already been sold) and partial payments
  can be recorded against a due balance.
- **Sales (POS)** — search-as-you-type product picker, live stock display,
  discount, multiple payment methods, printable receipt. Completing a sale
  decreases stock, snapshots the cost at time of sale, and computes gross
  profit — all inside a transaction that cannot partially apply. Sales can be
  cancelled (restoring stock) or have partial payments recorded.
- **Sales returns** — full or partial returns per line item, with
  GOOD/DAMAGED condition — damaged items never return to saleable stock.
- **Stock adjustments** — manual IN/OUT stock corrections (damaged, lost,
  personal use, free sample, opening stock, etc.) with a mandatory reason;
  stock can never go negative.
- **Stock movement ledger** — every single stock change, from any module, is
  recorded as an immutable audit trail.
- **Expenses** — categorized shop expenses (rent, electricity, salary, etc.)
  with date/category filtering.
- **Dashboard** — today's sales/profit/transactions, cash vs UPI collected,
  this month's sales & expenses, stock valuation, low/out-of-stock counts,
  a sales trend chart, recent sales, best-sellers, and category-wise stock.
- **Reports** — sales, profit (overall + product-wise), product performance
  (best-selling/slow-moving/low-stock/out-of-stock), stock valuation,
  purchases (+ supplier-wise), expenses (+ category-wise), and payment-method
  breakdown — each filterable and exportable to CSV.
- **Settings** — change the admin password.

---

## Technology stack

**Frontend:** Vite, React (JavaScript, no TypeScript), React Router, Axios,
Tailwind CSS v4, Lucide React icons, Recharts, React Hook Form, Zod.

**Backend:** Node.js, Express.js (JavaScript), JWT auth, bcryptjs, centralized
error handling, Zod validation, Helmet, CORS, rate limiting.

**Database:** MySQL, Prisma ORM v6, Prisma migrations, Prisma seed script,
`Decimal` fields for all monetary values.

**Testing:** Vitest + Supertest (backend integration tests against a real
MySQL test database).

---

## Folder structure

```
aj_stationary_stock/
  Plan.md                     Original project spec (reference only)
  IMPLEMENTATION_PLAN.md       Build plan and progress log
  TESTING.md                  How to set up and run the backend test suite
  Makefile                    Convenience commands for both frontend/backend

  backend/
    src/
      config/                 env validation, Prisma client instance
      controllers/            request handlers, one per module
      services/                business logic + Prisma transactions
      routes/                  Express routers
      middleware/              auth, error handling, validation
      validators/               Zod schemas
      utils/                    ApiError, money (Decimal-safe math), document
                                 numbering, date ranges, CSV export, pagination
      app.js, server.js
    prisma/
      schema.prisma
      migrations/
      seed.js
    tests/                     Vitest + Supertest test suite

  frontend/
    src/
      api/                     one Axios client per module
      components/               shared UI (Table, Modal, Pagination, etc.)
      layouts/                   AppLayout (sidebar + topbar)
      pages/                     one file per route
      context/                   AuthContext, ToastContext
      routes/                    ProtectedRoute
      utils/                     currency/date formatting, small form helpers
```

---

## Prerequisites

- Node.js and npm
- MySQL Server (running locally or reachable)
- `make` (used for the convenience commands below — optional, you can run the
  underlying `npm` commands directly from `backend/`/`frontend/` instead)

---

## MySQL database setup

Run in a MySQL client (e.g. MySQL Workbench):

```sql
CREATE DATABASE stationery_stock CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER 'stationery_app'@'localhost' IDENTIFIED BY 'YOUR_PASSWORD';
GRANT ALL PRIVILEGES ON *.* TO 'stationery_app'@'localhost';
FLUSH PRIVILEGES;
```

`GRANT ALL PRIVILEGES ON *.*` (rather than scoping to just this database) is
needed so Prisma Migrate can create its temporary shadow database during
`migrate dev`. This is fine for a local development MySQL instance.

---

## Environment variables

Copy the example files and fill in your own values:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

`backend/.env`:
```
DATABASE_URL="mysql://stationery_app:YOUR_PASSWORD@localhost:3306/stationery_stock"
PORT=5000
JWT_SECRET="replace-with-a-strong-secret"
JWT_EXPIRES_IN="7d"
CLIENT_URL="http://localhost:5173"
NODE_ENV="development"
```

`frontend/.env`:
```
VITE_API_BASE_URL="http://localhost:5000/api"
```

See `TESTING.md` for the separate `.env.test` needed to run the backend test
suite.

---

## Install, migrate, seed

From the repo root (using the Makefile):

```bash
make install          # npm install in both backend/ and frontend/
make prisma-migrate   # create tables from schema.prisma
make prisma-seed      # seed categories, products, suppliers, sample data, admin user
```

Or directly, from `backend/`:

```bash
npm install
npx prisma migrate dev
npx prisma db seed
```

---

## Running the app

```bash
make backend-dev      # starts Express on http://localhost:5000
make frontend-dev     # starts Vite on http://localhost:5173
```

Open the printed frontend URL in your browser.

## Default login credentials

```
Username: admin
Password: admin123
```

**Change this password before using the app for anything real** — the
Settings page (top-right nav) has a "Change Password" form.

---

## Other useful commands

```bash
make backend-test      # run the backend test suite (see TESTING.md for setup)
make frontend-lint     # oxlint
make frontend-build    # production build
make prisma-studio     # browse the database visually
make prisma-reset      # drop, recreate, and re-migrate the dev database
```

---

## API overview

All endpoints are prefixed with `/api` and (except `/auth/login`) require an
authenticated session (JWT cookie set by login). Responses follow a
consistent envelope:

```json
{ "success": true, "message": "...", "data": {}, "meta": {} }
```
```json
{ "success": false, "message": "...", "errors": [] }
```

| Module | Base path |
|---|---|
| Auth | `/api/auth` — login, logout, me, change-password |
| Dashboard | `/api/dashboard` — summary, recent-sales, sales-chart, low-stock |
| Categories | `/api/categories` |
| Products | `/api/products` — includes `/:id/stock-ledger` |
| Suppliers | `/api/suppliers` |
| Purchases | `/api/purchases` — includes `/:id/cancel`, `/:id/payment` |
| Sales | `/api/sales` — includes `/:id/cancel`, `/:id/receipt`, `/:id/payment` |
| Sales returns | `/api/sales-returns` |
| Stock adjustments | `/api/stock-adjustments` |
| Expenses | `/api/expenses` |
| Reports | `/api/reports/{sales,profit,products,stock,purchases,expenses,payment-methods}` (add `?format=csv` to any of these to download a CSV instead of JSON) |

List endpoints support `page`, `limit`, `search`, and module-relevant filters
(`categoryId`, `supplierId`, `paymentStatus`, `startDate`/`endDate`, etc.) as
query parameters.

---

## Important stock-management rules

These are enforced at the database/service layer, not just in the UI:

1. Stock can never go negative — every stock-decreasing operation is guarded.
2. A sale cannot be completed for more than the currently available stock.
3. Completed sales and purchases are never edited or deleted directly —
   corrections happen through cancellation, returns, or stock adjustments.
4. Every single stock change (purchase, sale, return, adjustment,
   cancellation) writes a row to the central stock-movement ledger.
5. `unitCostAtSale` is captured at the moment of sale and never recalculated
   — historical profit stays accurate even if a product's purchase price
   changes later.
6. All monetary math uses Prisma's `Decimal` type end-to-end (never native
   floating point) to avoid rounding errors.
7. Document numbers (`SAL-YYYYMMDD-0001`, `PUR-...`, `RET-...`, `ADJ-...`,
   `EXP-...`) are generated inside the same transaction as the record they
   belong to.
8. Every stock-affecting write happens inside a Prisma transaction — a
   failure partway through never leaves stock partially updated.

---

## Production deployment notes

- Set `NODE_ENV=production` — this makes login cookies `secure` and
  `sameSite: "none"` (required for cross-origin cookies over HTTPS), and
  disables the `morgan` request logger.
- Use a strong, unique `JWT_SECRET` in production — never reuse the
  development value.
- Point `DATABASE_URL` at your production MySQL instance and run
  `npx prisma migrate deploy` (not `migrate dev`) to apply migrations without
  needing a shadow database.
- Build the frontend with `npm run build` (in `frontend/`) and serve the
  resulting `dist/` folder from a static host or CDN; point
  `VITE_API_BASE_URL` at your deployed backend URL before building.
- Change the seeded admin password immediately after first deploying to a
  shared/production environment.
- Review CORS (`CLIENT_URL`) to match your deployed frontend's origin.
