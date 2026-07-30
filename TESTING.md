# Backend Automated Tests — Setup & Run Guide

The backend test suite (Vitest + Supertest) covers the 10 critical business-rule
cases from `Plan.md`. Tests run against a **separate test database**, never your
real dev database, so they can freely wipe/reset data between runs.

## 1. Create the test database

Run in MySQL Workbench (or any MySQL client):

```sql
CREATE DATABASE stationery_stock_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON stationery_stock_test.* TO 'stationery_app'@'localhost';
FLUSH PRIVILEGES;
```

## 2. Create `backend/.env.test`

Copy `backend/.env.test.example` to `backend/.env.test` and fill in your real
MySQL password (the same one used for the dev database):

```
DATABASE_URL="mysql://stationery_app:YOUR_PASSWORD@localhost:3306/stationery_stock_test"
JWT_SECRET="test-only-secret-do-not-use-in-production"
JWT_EXPIRES_IN="7d"
NODE_ENV="test"
```

This file is git-ignored — it will not be committed.

## 3. Apply migrations to the test database

This is a one-off step (repeat only if the Prisma schema changes later).
Run from `backend/` in PowerShell:

```powershell
$env:DATABASE_URL="mysql://stationery_app:YOUR_PASSWORD@localhost:3306/stationery_stock_test"
npx prisma migrate deploy
```

`migrate deploy` applies the existing migration files directly — no shadow
database required, safe for test/production-style databases.

## 4. Run the tests

From the repo root:

```bash
make backend-test
```

Or directly from `backend/`:

```bash
npm test
```

## What's covered

Each test resets the test database (`tests/setup.js`) before running, then
exercises the real Express routes via Supertest against a live MySQL test DB —
these are integration tests, not mocks.

| # | File | Case |
|---|------|------|
| 1 | `tests/purchases.test.js` | Completing a purchase increases stock (and writes a `PURCHASE` stock movement) |
| 2 | `tests/sales.test.js` | Completing a sale decreases stock |
| 3 | `tests/sales.test.js` | A sale cannot exceed available stock |
| 4 | `tests/sales.test.js` | A failed multi-item sale does not partially reduce stock (transaction rollback) |
| 5 | `tests/sales.test.js` | Cancelling a sale restores stock |
| 6 | `tests/sales.test.js` | Gross profit is calculated correctly (`totalAmount - totalCost`) |
| 7 | `tests/salesReturns.test.js` | A sales return restores only the returned quantity, not the full sold quantity |
| 8 | `tests/salesReturns.test.js` | A damaged return does not increase saleable stock |
| 9 | `tests/stockAdjustments.test.js` | A stock adjustment cannot produce negative stock |
| 10 | `tests/auth.test.js` | Unauthenticated users cannot access protected endpoints |

## Expected result

All test files should pass (green). If a test fails, the console output will
show which assertion failed and the actual vs. expected values — that's your
starting point for debugging, not necessarily a sign the app itself is broken
(check the test's assumptions first, e.g. product stock/price values it seeded).

## Troubleshooting

- **`P1010` / access denied errors** — double check the password in
  `backend/.env.test` matches your MySQL user, and that the test database
  exists.
- **Table doesn't exist errors** — you skipped step 3 (migrations weren't
  applied to the test database yet).
- **Tests hang or time out** — make sure MySQL is running locally before
  starting the test run.
