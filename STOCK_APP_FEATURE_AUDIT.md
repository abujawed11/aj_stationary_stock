# Stock Management Application Feature Audit

Audit date: 2026-08-06. Read-only review of `D:\react\aj_stationary_stock`. No files were modified except this one.

## 1. Executive Summary

This is a **deliberately small, single-shop, single-admin** stock and sales management app for a stationery shop, built to the spec in `Plan.md`. It is **not** an enterprise inventory system — there are no product variants, barcode scanning/label printing, batch/lot tracking, multi-location transfers, supplier price comparison, demand forecasting, or role-based access control. Comparing against the full 19-area checklist in this audit's brief, the majority of "advanced" items (variants, batch/lot, seasonal calendar, demand recommendations, multi-role auth, backup/restore) are **Missing by design**, not bugs.

What *is* built is solid: the core purchase → stock → sale → return → adjustment pipeline is fully wired end-to-end (UI → Axios → Express route → Zod validation → service → Prisma transaction → MySQL), uses real `Decimal` money math, atomic conditional stock decrements (race-safe), a central immutable `StockMovement` ledger, and a working Dashboard/Reports layer backed entirely by live queries (no mock data found anywhere in `frontend/src` or `backend/src`).

Counts (see sections 3–6 for detail):
- **Complete (✅):** ~28 features across auth, product/category/supplier CRUD, purchases, sales/POS, sales returns, stock adjustments, stock ledger, expenses, dashboard, reports+CSV export.
- **Partial (🟡):** ~10 — e.g. supplier "payment history" (purchases list only, no dedicated payment ledger/reminders), slow-moving report (simple "lowest quantity sold" ranking, not configurable-period dead-stock analysis), profit reporting (gross profit only, no markup vs. margin distinction, no expense-aware net profit).
- **Missing (❌):** ~35+ — variants, barcode scan/print, batch/lot/expiry, multi-location, supplier price comparison, landed-cost breakdown, purchase requisition/quotation/PO lifecycle, demand-based reorder recommendations, seasonal calendar, customer credit ledger (beyond a due-amount field), supplier payment ledger/reminders, roles beyond ADMIN, audit/login history, backup/restore, negative-price/negative-stock UI guards beyond the backend ones already in place, soft-delete for Category/Supplier hard-delete (there simply are no delete endpoints at all — only deactivate, which is actually correct-by-omission).
- **Data-integrity risks rated P0/critical:** **0 found in the built core flows.** Purchases, sales, returns, and adjustments all run inside `prisma.$transaction`, use decimal-safe money math, and guard against negative stock via a conditional `updateMany`. The main integrity **gaps** (not bugs) are in areas that simply don't exist yet (no customer credit blocking, no supplier payment reversal safeguard beyond a due-amount check, no idempotency key on double form-submit for Sale/Purchase creation — see §10).

## 2. Actual Project Architecture

Confirmed by reading `README.md`, `Plan.md`, `IMPLEMENTATION_PLAN.md`, both `package.json` files, and the folder tree.

- **Frontend:** Vite 8 + React 19 (JavaScript, no TypeScript), React Router v7, Axios, Tailwind CSS v4, `@headlessui/react`, `motion` (framer-motion), Lucide React icons, Recharts, React Hook Form + Zod resolvers. Lint via `oxlint` (not ESLint). Path: `frontend/src/{api,components,components/ui,layouts,pages,context,routes,utils}`.
- **Backend:** Node.js + Express 5 (JavaScript), JWT (httpOnly cookie, `jsonwebtoken`), `bcryptjs`, `helmet`, `cors`, `express-rate-limit` (on login), `zod` validation, `cookie-parser`, `morgan`. Layered `controllers/ → services/ → routes/` with `middleware/` (auth, error handler, validate) and `validators/` (Zod schemas). Path: `backend/src/{config,controllers,services,routes,middleware,validators,utils}`.
- **Database:** MySQL via Prisma ORM v6 (`@prisma/client ^6.19.3`, `prisma ^6.19.3`). Schema at `backend/prisma/schema.prisma`, 3 migrations in `backend/prisma/migrations/` (`20260730045644_db_create`, `20260730050747` [likely the username-field addition], `20260731172347_add_category_default_markup`), seed at `backend/prisma/seed.js` (+ `seed.production.js`).
- **Testing:** Vitest + Supertest, real MySQL test DB (per `TESTING.md`), 5 test files: `auth.test.js`, `purchases.test.js`, `sales.test.js`, `salesReturns.test.js`, `stockAdjustments.test.js` — covering exactly the 10 critical cases enumerated in `Plan.md` §Testing. Tests were **not executed** in this audit (would require a live MySQL test database — out of scope for a read-only audit and risks touching a DB).
- **No mobile app, no separate admin/cashier roles, no multi-tenant support** — confirmed single `AdminRole { ADMIN }` enum in schema, single `User` model.

This matches the README/Plan almost exactly; the one confirmed deviation is `frontend/`+`backend/` folder names instead of `client/`+`server/` (documented as an intentional, approved deviation in `IMPLEMENTATION_PLAN.md` line 43).

## 3. Existing Features

| Module | Existing feature | Status | Frontend location | Backend location | DB model | Notes |
|---|---|---|---|---|---|---|
| Auth | Login (username+password), JWT httpOnly cookie, logout, get-current-user, rate-limited login | ✅ | `frontend/src/pages/Login.jsx`, `context/AuthContext.jsx`, `api/authApi.js` | `authController.js`/`authService.js`/`authRoutes.js`, `middleware/authMiddleware.js` | `User` | bcrypt-hashed password, cookie set `httpOnly`, `secure`/`sameSite:none` in prod (README) |
| Auth | Change password | ✅ | `pages/Settings.jsx` | `authController.js` (`changePassword`) | `User` | |
| Categories | CRUD (no hard delete), activate/deactivate, duplicate-name prevention | ✅ | `pages/Categories.jsx`, `api/categoryApi.js` | `categoryController/Service/Routes.js` | `Category` | `categoryService.js` has no `delete` export at all — deletion is simply not offered (satisfies "prevent accidental deletion" by omission) |
| Products | CRUD, auto SKU (`STN0001…`), search (name/SKU/barcode/brand), filter by category & stock status, sort, pagination, activate/deactivate | ✅ | `pages/Products.jsx`, `api/productApi.js` | `productController/Service.js` | `Product` | `barcode` is a plain optional unique text field the admin types in manually — no scanning/generation (see §6.1) |
| Products | Stock ledger per product | ✅ | `Products.jsx` (ledger view) | `GET /api/products/:id/stock-ledger` → `productService.getStockLedger` | `StockMovement` | |
| Suppliers | CRUD, activate/deactivate, purchase history (last 20), outstanding amount (sum of due purchases) | ✅ | `pages/Suppliers.jsx` | `supplierService.js` | `Supplier` | No dedicated payment-ledger table — outstanding is computed live via `purchase.aggregate` |
| Purchases | Create (multi-item), auto totals, discount/additional cost, payment status derivation, cancel (with stock-reversal guard), record partial payment | ✅ | `pages/Purchases.jsx` | `purchaseService.js` | `Purchase`, `PurchaseItem` | Verified: `create` wraps in `$transaction`, increments stock via `increaseStock`, writes `StockMovement` (PURCHASE) per line, refreshes `Product.purchasePrice` from latest cost |
| Purchases | Cancellation reverses stock, blocked if any unit already sold | ✅ | `Purchases.jsx` cancel action | `purchaseService.cancel` | `Purchase`, `StockMovement` | Checks `product.currentStock < item.quantity` per line before reversing (`purchaseService.js` L157-165) |
| Sales/POS | Product search-as-you-type, cart, live stock, discount, payment method, walk-in (optional name/phone), complete sale | ✅ | `pages/Sales.jsx`, `components/ProductSearchSelect.jsx` | `saleService.js` | `Sale`, `SaleItem` | Stock check both at productMap validation and again via atomic `decreaseStock` (race-safe) |
| Sales | Cost snapshot (`unitCostAtSale`) + gross profit computed at sale time | ✅ | — | `saleService.create` L77-93 | `SaleItem.unitCostAtSale/grossProfit` | Uses `product.purchasePrice` at the moment of sale, never recalculated later |
| Sales | Cancel sale (restores stock), blocked if returns exist | ✅ | `Sales.jsx` | `saleService.cancel` | `Sale`, `StockMovement` | |
| Sales | Record partial/additional payment against due amount | ✅ | `Sales.jsx` | `saleService.recordPayment` | `Sale` | |
| Sales | Printable receipt | ✅ | `pages/Receipt.jsx` (route `/sales/:id/receipt`) | `GET /api/sales/:id/receipt` | `Sale` | |
| Sales returns | Full/partial return per line item, GOOD/DAMAGED condition, conditional restock, sale status transition (PARTIALLY_RETURNED/RETURNED) | ✅ | `Sales.jsx` (return flow) | `salesReturnService.js` | `SalesReturn`, `SalesReturnItem` | Correctly tracks cumulative already-returned qty per sale item to prevent over-return (L60-79) |
| Stock adjustments | IN/OUT with mandatory reason, 7 adjustment types, negative-stock guard, immutable record | ✅ | `pages/StockAdjustments.jsx` | `stockAdjustmentService.js` | `StockAdjustment`, `StockMovement` | Types limited to `OPENING_STOCK, DAMAGED, LOST, PERSONAL_USE, FREE_SAMPLE, STOCK_CORRECTION, OTHER` — narrower than the 10 reason codes the audit brief asks about (see §6.2) |
| Stock ledger | Central immutable movement log, every stock-affecting action writes one row per product line, in the same transaction | ✅ | Product stock-ledger view | `stockMovementService.js` (`increaseStock`, `decreaseStock`, `recordMovement`) | `StockMovement` | Single shared helper used by purchases/sales/returns/adjustments — good architecture, low duplication risk |
| Expenses | CRUD, category+date filter | ✅ | `pages/Expenses.jsx` | `expenseService.js` | `Expense` | 9 categories (`RENT…MISCELLANEOUS`) |
| Dashboard | Today's sales/profit/txn count/cash+UPI collected, month sales/expenses, stock valuation, low/out-of-stock counts, recent sales, best-sellers (30-day), category-wise stock, sales trend chart | ✅ | `pages/Dashboard.jsx` | `dashboardService.js` | Live aggregate queries | All values are real DB aggregates — confirmed no hardcoded/mock numbers (`dashboardService.js` full read) |
| Reports | Sales, profit (+product-wise), products (best-selling/slow-moving/low-stock/out-of-stock), stock valuation, purchases (+supplier-wise), expenses (+category-wise), payment-method breakdown, all with date/category/supplier filters, CSV export | ✅ | `pages/Reports.jsx` | `reportService.js`, `reportController.js` | Live queries | CSV export confirmed via `utils/csv.js` + `?format=csv` on every report endpoint; no Excel/PDF export exists |
| Settings | Change password | ✅ | `pages/Settings.jsx` | `authController.changePassword` | `User` | No other settings (no shop profile, tax rate, receipt template config, etc.) |

## 4. Partially Implemented Features

**Supplier "payment history"** — What exists: `supplierService.getById` returns the 20 most recent `Purchase` rows and a live-summed `outstandingAmount` (`backend/src/services/supplierService.js` L33-49). What's missing: no dedicated `SupplierPayment` ledger (payments are just fields on `Purchase` — `paidAmount`/`dueAmount`/`paymentStatus`), no partial-payment history *per payment event* (each `recordPayment` call overwrites `paidAmount` cumulatively with no row-level audit trail of who paid what and when), no due-date/credit-period tracking, no overdue flagging, no reminders. Files: `backend/src/services/purchaseService.js` (`recordPayment`, L191-216), `backend/prisma/schema.prisma` (`Purchase` model has no `SupplierPayment` child table). DB changes needed: new `SupplierPayment` model (id, purchaseId or supplierId, amount, method, reference, date, createdById). Risk: low (doesn't corrupt data, just loses granularity). Dependencies: none blocking.

**Slow-moving / best-selling product report** — What exists: `reportService.getProductsReport` ranks products by `quantitySold` ascending (slow-moving) or descending (best-selling) over a *date-range filtered* window (`backend/src/services/reportService.js` L136-163). What's missing: no configurable fixed windows (7/30/60/90/180 days) as quick-select buttons, no "dead stock" (zero sales in N days) distinct designation, no fast/medium/slow/dead 4-tier classification — it's a single ranked list. Files: `reportService.js`, `frontend/src/pages/Reports.jsx`. Risk: low. Dependencies: none.

**Gross profit / profit reporting** — What exists: real `grossProfit = totalAmount - totalCost` per sale item, aggregated in `reportService.getProfitReport` (revenue/cost/profit totals + per-product breakdown). What's missing: no markup % vs. margin % distinction anywhere (only raw profit amount is shown — see §6.7 for an explicit flag), no category-level or daily/monthly profit rollup report, no "profit after discount/return" adjustment (sale-level `discount` is subtracted from `subtotal` for `totalAmount`, but line-level `grossProfit` is computed from `totalAmount` at the item level pre-discount-allocation — worth verifying discount is being fairly apportioned across lines; currently it looks like the *sale-level* discount doesn't reduce any individual item's stored `grossProfit`, only the sale's total, meaning summed `SaleItem.grossProfit` can slightly overstate true post-discount profit). Files: `saleService.js` L77-102, `reportService.js` L60-93. DB/risk: low severity, cosmetic accuracy gap, not a stock/money-safety bug.

**Purchase workflow** — What exists: single-step "create completed purchase" (goods receipt and invoice are implicitly the same event). What's missing: no quotation, no requisition, no PO draft/confirm/partial-receive workflow, no separate "purchase order" vs. "goods received" vs. "invoice" states — `PurchaseStatus` enum is only `COMPLETED | CANCELLED` (schema.prisma L46-49). This is consistent with the app's stated small-shop scope but is a real gap vs. the audit's purchase-workflow checklist item. Files: `schema.prisma`, `purchaseService.js`. Complexity to add: Large.

**Stock adjustment reason codes** — What exists: 7 types (`OPENING_STOCK, DAMAGED, LOST, PERSONAL_USE, FREE_SAMPLE, STOCK_CORRECTION, OTHER`). What's missing vs. the audit's requested list: no distinct `PROMOTIONAL_GIFT`, `EXPIRED`, `INCORRECT_ENTRY` (folds into `STOCK_CORRECTION`/`OTHER`), `CUSTOMER_RETURN`/`SUPPLIER_RETURN` (these are handled by the separate SalesReturn/Purchase-cancel flows instead, which is arguably correct design, not a gap). Small effort to extend the enum.

**Barcode field** — What exists: `Product.barcode` optional unique string, searchable (`productService.js` `where.OR` includes `barcode: { contains }`). What's missing: no barcode *scanning* input mode (camera/hardware scanner keystroke-wedge handling) confirmed anywhere in `frontend/src` — `ProductSearchSelect.jsx` and `Sales.jsx` search by typed text only; no barcode label/print generation; no custom-vs-manufacturer barcode distinction. Files: `frontend/src/components/ProductSearchSelect.jsx`, `frontend/src/pages/Sales.jsx`.

## 5. Missing Features

| ID | Missing feature | Module | Priority | Business value | Complexity | DB changes | Backend changes | Frontend changes | Dependencies |
|---|---|---|---|---|---|---|---|---|---|
| M1 | Product variants (size/color/pack with own SKU/barcode/stock/price) | Products | P2 | Medium — stationery shops sometimes need this (e.g. pen colors) but not essential day one | Large | New `ProductVariant` model, FK from Sale/Purchase items | Rework product/sale/purchase item resolution to variant-aware | Variant picker UI everywhere products are selected | Product CRUD |
| M2 | Barcode scanning (camera/hardware scanner input) | Sales/Products | P1 | High — biggest single speed win at the POS counter | Medium | none | none (pure frontend keystroke capture or camera lib) | Scanner input handling in `ProductSearchSelect`/`Sales.jsx` | none |
| M3 | Barcode label printing | Products | P2 | Medium | Medium | none | Label template generation | Print view | Barcode field already exists |
| M4 | Product status lifecycle (trial/fast-moving/slow-moving/seasonal/discontinued) beyond active/inactive | Products | P3 | Low-medium — nice classification but derivable from reports | Small-Medium | New enum/field on `Product` or computed view | classification logic | badge/filter UI | Sales history data (exists) |
| M5 | Reserved stock / available-vs-current distinction | Inventory | P3 | Low for single-counter shop (no online reservations) | Medium | New `reservedStock` field | hold logic | UI display | none |
| M6 | Reorder level & reorder qty (distinct from `minimumStock`) | Inventory | P2 | Medium — currently only a single `minimumStock` threshold exists, no suggested reorder qty | Small | Add `reorderLevel`/`reorderQty` to `Product` | none major | Product form fields | none |
| M7 | Physical stock count / reconciliation workflow | Inventory | P2 | Medium — currently only ad-hoc `STOCK_CORRECTION` adjustments exist, no formal count sheet | Medium | New `StockCount`/`StockCountItem` model | count session service | Count entry page | Stock adjustment infra (exists, reusable) |
| M8 | Multi-location transfer | Inventory | P3 | Low — single shop, single location per README | Large | `Location` model, transfer model | full new module | full new pages | Out of scope per Plan.md (single-shop) |
| M9 | Batch/lot tracking, expiry tracking | Inventory | P3 | Low for stationery (mostly non-perishable); relevant only for things like glue/ink | Large | `Batch` model, FK from stock movements | full rework of stock ledger to be batch-aware | batch selection UI | Large schema change |
| M10 | Supplier extended profile (delivery time, MOQ, delivery charges, replacement policy, primary/secondary flag) | Suppliers | P2 | Medium | Small | Add fields to `Supplier` | none major | Supplier form fields | none |
| M11 | Supplier-specific product rates | Suppliers/Purchasing | P2 | Medium — currently purchase price is only tracked as last-paid on `Product`, not per-supplier | Medium | New `SupplierProductPrice` model | price lookup service | picker in New Purchase | Supplier, Product |
| M12 | Supplier price comparison (landed-cost across suppliers) | Purchasing | P2 | Medium — valuable for a shop with 3+ suppliers | Large | Needs M11 first + landed-cost fields (GST, transport, handling) | comparison service | comparison UI | M11 |
| M13 | Purchase quotation/requisition/PO lifecycle (draft/confirmed/partial/cancelled), expected delivery date, partial goods receipt | Purchasing | P3 | Low-medium for a small shop doing simple cash-and-carry purchases | Very large | New `PurchaseOrder` model distinct from `Purchase`, or extend `PurchaseStatus` enum + add receipt tracking | major service rework | new PO pages | none blocking |
| M14 | Purchase attachments (invoice scan upload) | Purchasing | P3 | Low-medium | Medium | File storage + `attachmentUrl` field | file upload endpoint | upload UI | Needs file storage decision (local/S3) |
| M15 | Purchase-price history per product (last/lowest/highest/avg, % change, best-rate supplier) | Purchasing/Reports | P2 | Medium — `PurchaseItem` data already captures this raw; just needs a report | Medium | none (derivable from existing `PurchaseItem`) | new report query | new report tab | none — cheapest "missing" item to build |
| M16 | Landed-cost breakdown (GST/transport/handling itemized, not lumped into `additionalCost`) | Purchasing | P2 | Medium | Medium | Add itemized cost fields to `Purchase`/`PurchaseItem` | cost allocation logic | purchase form fields | none |
| M17 | Markup % vs margin % distinction on reports/product form | Reports/Products | P1 | High — currently conflated/absent, easy to fix, prevents pricing mistakes (see §6.7 flag) | Small | none (`Category.defaultMarkupPercent` already exists, unused elsewhere) | small calc utility | display in Product form + Profit report | none |
| M18 | Barcode billing at POS | Sales | P1 | High (pairs with M2) | Small-Medium | none | none | POS input handling | M2 |
| M19 | Split payment (multiple methods on one sale) | Sales | P2 | Medium — currently `paymentMethod` is a single enum per sale, no per-method split | Medium | Add `SalePayment` child model or multi-method array | rework sale creation | payment split UI | none |
| M20 | Exchange (return + new sale combined flow) | Sales returns | P3 | Low-medium — currently a return and a new sale are two separate manual actions | Medium | none structurally | orchestration service | UI flow | Sales return, Sales (both exist) |
| M21 | Customer profile + credit ledger (limit, overdue, blocked/trusted flag, statement, reminders) | Customers | P1 | High if the shop extends credit regularly — currently `customerName`/`customerPhone` are free-text, no `Customer` entity at all, no credit limit enforcement, no blocking | Very large | New `Customer` model, FK from `Sale`, ledger/statement logic | full new module | full new module | none blocking, but touches Sale creation flow |
| M22 | Billing-screen warning on customer outstanding/over-limit/overdue/blocked | Sales | P1 (once M21 exists) | High | Small (after M21) | — | validation in `saleService.create` | warning banner in `Sales.jsx` | M21 |
| M23 | Supplier payment ledger (separate from Purchase.paidAmount), due date, credit period, reminders, statement | Suppliers | P2 | Medium (see §4 partial analysis) | Medium | New `SupplierPayment` model | payment history service | supplier payment tab | none |
| M24 | Fast/medium/slow/dead-stock analysis with configurable periods (7/30/60/90/180d) | Reports | P2 | Medium — raw sales data exists (`SaleItem`), just needs a dedicated report with period toggle | Medium | none (derivable) | new report query with `days` param | new report UI toggle | none — data already exists, cheapest intelligence feature to add |
| M25 | Demand-based purchase recommendations (avg daily sales, lead time, safety stock, pending POs, pack size) | Purchasing intelligence | P3 | Low-medium — underlying sales-velocity data exists; lead time/safety stock/pack size do not | Large | Add `leadTimeDays`, `safetyStock`, `packSize` to `Product`/`Supplier` | recommendation engine | recommendations page | M6, M11 |
| M26 | Seasonal-demand calendar (events, expected demand upticks) | Reports/Planning | P3 | Low for a stationery shop outside back-to-school season, but plausible value | Large | New `SeasonalEvent` model | none major | calendar UI | none |
| M27 | Supplier purchase returns (only *sales* returns exist; no symmetric supplier-return flow) | Returns | P2 | Medium — a shop occasionally needs to send defective stock back to a supplier | Medium | New `PurchaseReturn`/`PurchaseReturnItem` models (mirrors `SalesReturn`) | new service (can largely copy `salesReturnService.js` pattern) | new page | Purchase, StockMovement (exist) |
| M28 | Roles beyond ADMIN (cashier, inventory manager) + permission-gated routes/UI | Auth | P2 | Medium — currently every logged-in user has full access; fine for single-admin use per README but blocks eventually hiring staff | Medium | `AdminRole` enum currently has only `ADMIN` — needs `CASHIER`, `INVENTORY_MANAGER` values + permission checks | route-level authorization middleware | conditional UI rendering | none |
| M29 | Audit log / activity history / login history | Auth/Ops | P2 | Medium — `StockMovement` and `createdById` fields already give partial provenance for stock changes, but there's no login-attempt log or generic "who changed what" audit trail for non-stock entities (e.g. category/supplier edits) | Medium | New `AuditLog` model | logging middleware/hooks | audit viewer page | none |
| M30 | Backup/restore, scheduled export | Ops | P3 | Low — MySQL native backup tooling covers this operationally; app-level backup is a nice-to-have | Medium | none | export/import endpoints | admin UI | none |
| M31 | Excel/PDF export (only CSV exists today) | Reports | P3 | Low-medium | Medium | none | new export format libs | export button variants | none |
| M32 | Offline handling / PWA | Frontend | P3 | Low — README mentions "PWA-ready structure if practical" in `Plan.md` but no service worker/manifest found in `frontend/` | Medium | none | none | service worker, manifest | none |
| M33 | Expense categories vs. full opex/net-profit tracking (gross sales − COGS − opex = net profit report) | Expenses/Reports | P2 | Medium — `Expense` and profit data both exist independently but are never combined into one net-profit report | Small-Medium | none (derivable) | new report combining `reportService.getProfitReport` + `getExpensesReport` | new report tab | none — cheap to add |
| M34 | Confirmation/2FA on sensitive settings changes, session/token revocation list | Auth | P3 | Low | Small | none | none | none | none |
| M35 | Negative-price validation explicitly surfaced in UI (backend likely relies on Zod min(0) — verify) | Products | P3 (verify) | — | — | — | see §8 | see §9 | — |

## 6. Feature-by-Feature Audit

### 6.1 Product management
- CRUD: ✅ `frontend/src/pages/Products.jsx`, `backend/src/services/productService.js`, `backend/src/controllers/productController.js`.
- Categories: ✅ single-level `Category` model (`schema.prisma` L125-137) — no subcategories. 🟡/❌ if sub-categories were expected: **Missing** (flat only).
- Brands: ✅ `Product.brand` free-text optional field, searchable.
- Units: ✅ 8-value enum (`PIECE, PACKET, BOX, DOZEN, REAM, SET, BOTTLE, ROLL`) — `schema.prisma` L22-31.
- SKU generation: ✅ auto `STN0001…` sequential (`productService.js` L7-10). ⚠️ Uses `prisma.product.count()` for the next number — safe enough for a single-admin low-concurrency shop, but not collision-proof under true concurrent creates (no transaction wrapping this specific counter, unlike document numbers elsewhere which use `generateDocumentNumber` inside `$transaction`). Minor risk, flagged in §10.
- Manufacturer barcode: 🟡 field exists (`Product.barcode`, unique, optional) but is manually typed, not scanned or manufacturer-imported.
- Custom barcode generation: ❌ not found.
- Barcode scanning: ❌ not found — `ProductSearchSelect.jsx`/`Sales.jsx` are text-search only.
- Barcode label printing: ❌ not found.
- Product images: ❌ no image field on `Product` model, no upload UI.
- Variants: ❌ not found — no `ProductVariant` model.
- Active/inactive status: ✅ `isActive` boolean + `setStatus` endpoint (`productService.js` L127-130).
- Trial/regular/fast-moving/slow-moving/seasonal/discontinued status: ❌ not modeled; only derivable ad hoc via the Reports "best-selling"/"slow-moving" queries, not stored as product state.

### 6.2 Inventory
- Current stock: ✅ `Product.currentStock`.
- Available/reserved stock split: ❌ only one stock number; no reservation concept (consistent with no online ordering).
- Min/max/reorder level, reorder qty: 🟡 only `minimumStock` exists; no `maximumStock`, `reorderLevel`, or `reorderQty` fields.
- Low-stock & out-of-stock alerts: ✅ computed live (`currentStock <= minimumStock` / `=== 0`) in `dashboardService.getSummary`/`getLowStock` and `reportService.getProductsReport`.
- Negative-stock prevention: ✅ verified at the DB-update level — `stockMovementService.decreaseStock` uses a conditional `updateMany` with `currentStock: { gte: quantity }` guard (race-safe), and `stockAdjustmentService` routes OUT-direction adjustments through the same function.
- Opening stock: ✅ `AdjustmentType.OPENING_STOCK` + matching `MovementType.OPENING_STOCK`.
- Stock movement history: ✅ full central ledger, `StockMovement` model, per-product ledger page/endpoint.
- Stock adjustments with reasons: 🟡 7 of the ~10 requested reason codes exist (see §4); each records product, previous qty, adjustment qty, new qty, reason, user (`createdById`), timestamp — ✅ on the fields that do exist.
- Physical stock counting/reconciliation: ❌ not found as a dedicated workflow (only ad-hoc `STOCK_CORRECTION` adjustments).
- Multi-location transfer: ❌ not found — single-location app by design.
- Batch/lot tracking, expiry tracking: ❌ not found.

### 6.3 Supplier management
- Full profile fields: 🟡 has `name, contactPerson, phone, email, address, gstNumber, notes, isActive` — missing delivery time, MOQ, delivery charges, replacement policy, primary/secondary flag.
- Products supplied / supplier-specific rates: ❌ no `SupplierProduct` join table; purchases just reference `Product` + `Supplier` independently per purchase.
- Primary/secondary supplier: ❌ not modeled.
- Delivery time, MOQ, delivery charges, replacement policy: ❌ not modeled.
- Last purchase date, total purchases: 🟡 derivable (`supplierService.getById` returns `recentPurchases`, last 20) but not a stored/precomputed field; no "total purchases" sum returned currently (only `outstandingAmount`).
- Outstanding payable: ✅ live-computed sum of due purchase amounts (`supplierService.js` L39-49).
- Payment history: 🟡 see §4 — purchase-level paid/due only, no discrete payment-event ledger.

### 6.4 Supplier price comparison
❌ Missing entirely — no landed-cost comparison logic, no per-supplier rate table, no scheme/discount/GST/transport modeling across suppliers. `Purchase.additionalCost` is a single lump figure, not itemized. See M11/M12/M16.

### 6.5 Purchase management
- Quotation, requisition: ❌ not found.
- PO draft/confirmed/partial/full/cancelled: ❌ `PurchaseStatus` enum is only `COMPLETED | CANCELLED` — a purchase is created already-complete, no draft/partial-receipt states.
- Expected delivery date: ❌ not a field.
- Goods receipt (partial): ❌ not found — purchase creation and stock increase happen atomically in one step.
- Purchase invoice: 🟡 `invoiceNumber` optional text field only, no structured invoice document/attachment.
- Purchase return: ❌ **missing** — only sales returns exist, no supplier-side purchase return (see M27). Cancellation exists but that's "undo a mistake," not "return defective goods to supplier."
- Discounts, additional expenses: ✅ `discount`, `additionalCost` fields on `Purchase`, verified used in total calc (`purchaseService.js` L78-82).
- Schemes, free qty: ❌ not modeled (no "buy X get Y free" line-item field).
- GST: ❌ no explicit tax field — would have to be folded into `additionalCost`/`discount` manually.
- Payment status/due date: 🟡 `paymentStatus` enum ✅, but no due-date field for payment terms.
- Attachments: ❌ not found.
- Stock conversion: N/A (no unit-of-measure conversion logic found — a product has one fixed `unit`).
- Duplicate-update prevention: ✅ completed purchases are never edited, only cancelled/paid-against (verified — no `PUT /purchases/:id` route exists in `purchaseRoutes.js`... confirm: only list/create/get/cancel/payment routes per README API table).

### 6.6 Purchase-price history per product
🟡 Raw data exists (`PurchaseItem.unitCost`, `quantity`, `totalCost`, linked to `Purchase.purchaseDate`/`supplierId`) but there is **no dedicated report or view** surfacing last/lowest/highest/average price, % change over time, or "best-rate supplier" — this is a cheap-to-build report on top of existing data (M15), currently absent from `reportService.js`.

### 6.7 Landed-cost & profit calculation
- Full cost components (freight, handling, GST itemized): ❌ only lumped `additionalCost`.
- Effective landed cost: 🟡 `Product.purchasePrice` is refreshed to the last-paid `unitCost` on each purchase (`purchaseService.js` L123-125) — this is a *simple* landed cost (last cost), not a true weighted-average or fully-loaded (with allocated freight/GST) landed cost.
- Selling price, gross profit/unit, gross margin %: ✅ `grossProfit` computed and stored per `SaleItem`; **explicit flag: no margin % or markup % field/calculation found anywhere** in `saleService.js`, `reportService.js`, or the frontend — only raw currency profit amounts are shown. `Category.defaultMarkupPercent` exists in the schema (added by migration `20260731172347_add_category_default_markup`) but is **not referenced by any service or controller** (confirmed via read of `productService.js`, `categoryService.js`, `saleService.js` — none reference `defaultMarkupPercent`), so it is currently a dead/unused field. **This directly confirms the audit brief's concern: markup and margin are not distinguished, and in fact neither is computed as a percentage at all today — only absolute profit.**
- Total profit, profit after discount/return: 🟡 `reportService.getProfitReport` sums `grossProfit` across sale items in range, but as noted in §4, sale-level discount is not re-apportioned into stored item-level `grossProfit`, and returned items are not subtracted from the profit report (a returned sale's original `grossProfit` on its `SaleItem` rows stays as originally recorded — no negative "return cost" line found in `SalesReturn`/`SalesReturnItem` model, and `reportService.getProfitReport` doesn't join against `SalesReturn` at all).
- Category/product/daily/monthly profit: 🟡 product-wise ✅ (`getProfitReport` groups by product); category-wise and daily/monthly profit breakdown ❌ not found as a report (only sales-by-day/month grouping exists via `getSalesReport`'s `groupBy`, which is revenue not profit).

### 6.8 Sales & billing
- Entry, auto stock deduction: ✅ verified transactional (`saleService.create`).
- Draft/completed/cancelled sale: 🟡 `SaleStatus` has `COMPLETED, CANCELLED, PARTIALLY_RETURNED, RETURNED` — no `DRAFT` state; every sale is created already-completed (matches Plan.md's "Complete sale" one-step button design).
- Invoice, printable receipt, invoice numbering: ✅ `Receipt.jsx`, `SAL-YYYYMMDD-0001` numbering via `generateDocumentNumber` inside the sale's own transaction.
- Barcode billing: ❌ (depends on M2/M18).
- Product search, variant selection: 🟡 product search ✅; variant selection ❌ (no variants exist).
- Qty edit, item/bill discount: ✅ cart qty editable in `Sales.jsx`; only a single sale-level `discount` field exists — **no per-item discount** (Plan.md itself only specified sale-level discount, so this matches spec, but is a gap vs. this audit's broader checklist item).
- Tax: ❌ no tax field on `Sale`/`SaleItem` at all.
- Payment methods: 🟡 `CASH, UPI, BANK_TRANSFER, OTHER` enum ✅ (cash/UPI/card mapped to "OTHER" or "BANK_TRANSFER" loosely — no explicit CARD value); credit ✅ (partial/due supported via `paidAmount < totalAmount`); **split payment across multiple methods on one sale: ❌ not supported** (single `paymentMethod` enum per sale).
- Customer selection incl. walk-in: 🟡 free-text `customerName`/`customerPhone`, no saved `Customer` entity, no customer picker/autocomplete of repeat customers found in `Sales.jsx`.
- Salesperson: 🟡 implicitly `createdById` (the logged-in user) — there's no separate "salesperson" concept distinct from "who's logged in," consistent with single-admin scope.
- Payment reference, notes: 🟡 `Sale` has no `notes` field (unlike `Purchase`, which does have `notes` — schema asymmetry) and no payment-reference field for UPI/bank transactions.
- Sales return (partial), refund: ✅ (see §6.9/§3).
- Exchange: ❌ not found as a combined flow (M20).
- Restock vs damaged on return: ✅ `condition: GOOD|DAMAGED` + `returnToStock` boolean, correctly gates whether stock is incremented (`salesReturnService.js` L81, L124).
- Cancel/return correctly reverses stock/payment: ✅ for stock (verified `saleService.cancel`, `salesReturnService.create`); 🟡 for payment/accounting — cancelling a sale does **not** appear to reverse `paidAmount`/create a refund record; it only flips `status` to `CANCELLED` and restores stock (`saleService.cancel`, L158-192 — no `paidAmount`/`dueAmount` reset). This means a cancelled sale that had been paid in cash still shows a historical `paidAmount` on the record with no explicit refund-issued tracking. Not a stock-integrity bug, but an accounting-completeness gap.

### 6.9 Customer credit management
❌ Largely missing. No `Customer` model at all — `customerName`/`customerPhone` are free-text per sale, so there is no persistent customer profile, no credit limit, no ledger across multiple sales, no overdue/blocked/trusted flags, no reminders, no statements. The billing screen (`Sales.jsx`) cannot warn on outstanding/over-limit/overdue/blocked because none of that data is tracked per customer — due-amount tracking exists only at the individual-sale level. See M21/M22.

### 6.10 Supplier payment management
🟡 Partial — see §4/§6.3. Payable exists (due amount per purchase, summed for "outstanding"), partial payment recording exists (`purchaseService.recordPayment`), but no due-date/credit-period field, no overdue calculation, no payment-history ledger (each `recordPayment` call just mutates the cumulative `paidAmount` with no discrete row per payment), no reminders, no supplier statement view.

### 6.11 Fast/medium/slow/dead-stock analysis
🟡 Partial — `reportService.getProductsReport` (`mode=best-selling|slow-moving`) is computed from real `SaleItem` data within a date-filtered window, so it is **not** a manual label — good. But: no 4-tier fast/medium/slow/dead classification (only two ranked lists), no quick-select configurable periods (7/30/60/90/180 days — only whatever `startDate`/`endDate` the user picks manually), no distinct "dead stock" (zero-sales-in-N-days) report. See M24.

### 6.12 Demand-based purchase recommendations
🔵/❌ Underlying data partially available: average daily sales is derivable from `SaleItem`+`Sale.saleDate`; **not available**: lead time (no field on `Supplier`/`Product`), safety stock (no field), pending POs (no PO concept — purchases are created already-complete, so there's no "pending" purchase state to reference), pack size (no field on `Product`). No recommendation engine exists. This is a data-availability assessment only, per instructions — nothing implemented.

### 6.13 Seasonal-demand calendar
❌ Missing entirely — no event/calendar model or UI found anywhere in the codebase.

### 6.14 Returns management
- Customer sales returns: ✅ full field set implemented — return number, sale link, date, refund total, method, reason, per-item qty/refund/condition/returnToStock, creator, timestamp (`SalesReturn`/`SalesReturnItem` models).
- Supplier purchase returns: ❌ missing entirely (see §6.5/M27) — only purchase *cancellation* exists, which is a different concept (undoing an entire purchase, not returning specific defective units while keeping the rest).

### 6.15 Dashboard & reports
Every dashboard metric checked against `dashboardService.js` (full file read):
- Today's sales/profit/txn count/cash/UPI collected: ✅ real (`getSummary`).
- Total products, total stock qty, stock purchase value, estimated retail value: ✅ real.
- Low-stock/out-of-stock counts: ✅ real.
- Month sales/expenses: ✅ real (`prisma.sale.aggregate`/`prisma.expense.aggregate`).
- Recent sales, best-sellers, sales trend chart (7/30 day, IST-bucketed), category-wise stock: ✅ real, each backed by its own service function.
- Bank transfer / other payment breakdown: ✅ bonus — present in the payload beyond what Plan.md asked for.
- **No hardcoded or mock dashboard numbers found** in either `dashboardService.js` or `Dashboard.jsx`.

Reports checked against `reportService.js` (full file read): sales ✅, profit (+product-wise) ✅ (see §6.7 caveats), products (best-selling/slow-moving/low-stock/out-of-stock) ✅, stock valuation ✅ (purchase value/retail value/potential profit — matches Plan.md's stock-valuation spec exactly), purchases (+supplier-wise) ✅, expenses (+category-wise) ✅, payment-method breakdown ✅. Filters: date range ✅ on all; category ✅ (products/stock reports); product ✅ (profit report `productId`); supplier ✅ (purchases report); payment method ✅ (sales report). Export: CSV ✅ on every report endpoint (`format=csv` query param → `utils/csv.js`). Excel/PDF export: ❌ not implemented (only CSV).

### 6.16 Expenses & net-profit tracking
- Expense categories: ✅ 9-value enum.
- Gross sales, COGS, gross profit: ✅ individually available (sales report, profit report).
- Opex (expenses) vs. net profit: ❌ **no combined report** exists that computes `grossProfit - totalExpenses = netProfit` in one place — the data to do this trivially exists in two already-built reports (`getProfitReport` + `getExpensesReport`) but they are never joined. Cheapest "missing" item on the whole list (M33).

### 6.17 Data integrity
See §10 for full risk table. Summary: transaction usage ✅ throughout stock-affecting operations; negative-stock prevention ✅ (conditional `updateMany`); cancellation stock reversal ✅ (purchase and sale both); partial return correctness ✅ (cumulative already-returned tracking); rounding — uses `utils/money.js` decimal-safe helpers (not read in full but referenced consistently via `add/subtract/multiply/toNumber` across every service, never raw `+`/`-` on Decimal-typed values in the services reviewed); duplicate invoice/sale numbers — protected by DB `@unique` constraint on `purchaseNumber`/`saleNumber`/etc. plus generation inside the owning transaction; cascading deletes — moot, because there are **no delete endpoints** for Product/Supplier/Category at all (only deactivate), so the "prevent hard-delete when history exists" requirement is satisfied by never offering hard-delete in the first place, rather than by an explicit guard — this is a valid but implicit satisfaction of that requirement.

### 6.18 Auth/roles/audit
- Login, password hashing (bcrypt), session/token (JWT httpOnly cookie): ✅.
- Roles: 🟡 `AdminRole` enum defined but contains only `ADMIN` — the schema is "extensible" as Plan.md requested, but no second role is actually implemented, so there's nothing to permission-gate yet.
- Permission-based routes/UI: ❌ not applicable/not built (single role).
- Audit log / activity history / login history: 🟡 `StockMovement.createdById` + `createdAt` gives an implicit audit trail for stock changes only; no generic audit log for category/supplier/product edits, and no login-attempt history table (only rate-limiting on the login route, no persisted log of login attempts).
- API auth protection: ✅ `authMiddleware.authenticate` applied to all protected routers (confirmed via README's route table noting "all except /auth/login require an authenticated session"; spot-checked `authMiddleware.js` logic — checks cookie or Bearer header, verifies JWT, reloads user, rejects if inactive).

### 6.19 Backup & operational safety
- Backup/restore: ❌ not found (relies on external MySQL tooling, not app-level).
- Export: ✅ CSV on reports (see §6.15); ❌ no generic data export/import.
- Error logging/handling: ✅ centralized (`middleware/errorHandler.js`, `utils/ApiError.js`, `utils/asyncHandler.js`) — consistent `{success,message,data,meta}`/`{success:false,message,errors}` envelope confirmed in every service's error paths reviewed.
- Loading/empty states: ✅ per `IMPLEMENTATION_PLAN.md` Phase 7 log — `Skeleton`/`TableSkeleton`/`EmptyState` components built and rolled out to all list pages (component files confirmed present: `frontend/src/components/ui/Skeleton.jsx`, `EmptyState.jsx`).
- Destructive-action confirmations: ✅ `ConfirmDialog.jsx` component present and referenced per Phase 7 notes ("ConfirmDialog now uses Button").
- Soft delete: 🟡 effectively yes via `isActive` toggles on Product/Category/Supplier, but no formal `deletedAt` pattern — again, satisfied by never offering hard-delete.
- Validation: ✅ Zod validators on backend (`backend/src/validators/*.js`, 8 files) + React Hook Form/Zod on frontend forms.
- Mobile responsiveness: 🔵 cannot fully confirm without running the app in a browser at various widths; `IMPLEMENTATION_PLAN.md` Phase 7 claims a responsive pass was done and verified ("resize the browser down to a phone width...") but this audit did not visually verify it live.
- Print-friendly billing: ✅ dedicated `Receipt.jsx` page/route, called out in Phase 7 notes as intentionally kept separate from the dashboard visual system.
- Offline handling: ❌ no service worker/manifest found in `frontend/` (Plan.md's "PWA-ready structure if practical" was not pursued).

## 7. Database Gap Analysis

**Existing models** (12): `User, Category, Product, Supplier, Purchase, PurchaseItem, Sale, SaleItem, SalesReturn, SalesReturnItem, StockAdjustment, StockMovement, Expense`.

**Missing models** (to support §5's gaps): `Customer`, `SupplierPayment`, `PurchaseReturn`/`PurchaseReturnItem`, `SupplierProductPrice`, `ProductVariant`, `StockCount`/`StockCountItem`, `SeasonalEvent`, `AuditLog`, `SalePayment` (for split payments).

**Missing fields on existing models:**
- `Product`: image URL, `maximumStock`, `reorderLevel`, `reorderQty`, `leadTimeDays`, `safetyStock`, `packSize`, product-status classification (fast/slow/seasonal/discontinued).
- `Sale`: `notes`, tax fields, per-item discount, salesperson (if distinct from creator ever needed), payment reference.
- `Purchase`: `expectedDeliveryDate`, itemized tax/freight/handling (currently lumped in `additionalCost`), payment due date.
- `Supplier`: delivery time, MOQ, delivery charges, replacement policy, primary/secondary flag.

**Weak relationships / design notes:**
- `Category.defaultMarkupPercent` exists but is **dead** — no code path reads it (confirmed by grep across `backend/src`). Either wire it into product pricing defaults or remove it to avoid confusion.
- `Sale.createdById`/`Purchase.createdById` etc. all point to the single `User`/`AdminRole.ADMIN` — fine today, but if roles expand (M28), consider whether "salesperson" should be distinct from "the logged-in account."
- No `deletedAt`/soft-delete column pattern — deactivation (`isActive`) is used instead, which is consistent but means there's no way to distinguish "temporarily disabled" from "permanently retired" records.

**Fields needing enums (currently free text):** `Purchase.paymentMethod`/`Sale.paymentMethod` use enums already ✅; `Supplier`/`Category` have no obvious enum gaps. `AdjustmentType` could grow (see §4).

**Missing indexes/unique constraints:** Spot-checked — `Product` has indexes on `categoryId`, `name`, `isActive` (schema.prisma L164-166); no explicit index on `barcode` beyond its `@unique` constraint (which does create an index in MySQL, so this is fine). `StockMovement` has good compound indexes (`[productId, createdAt]`, `movementType`, `[referenceType, referenceId]`). No obvious missing index found in the models that exist today.

**Missing transaction protection:** `productService.generateSku()` (uses a bare `prisma.product.count()`, not wrapped in the creating transaction) is the one spot flagged — see §10 R1.

**Proposed conceptual snippets (NOT final code — illustrative only):**

```prisma
// PROPOSAL — not implemented
model Customer {
  id           Int      @id @default(autoincrement())
  name         String
  phone        String?  @unique
  creditLimit  Decimal  @default(0) @db.Decimal(12, 2)
  isBlocked    Boolean  @default(false)
  isTrusted    Boolean  @default(false)
  notes        String?  @db.Text
  sales        Sale[]
}

// PROPOSAL — not implemented
model SupplierPayment {
  id          Int      @id @default(autoincrement())
  purchaseId  Int
  amount      Decimal  @db.Decimal(12, 2)
  method      PaymentMethod
  reference   String?
  paidAt      DateTime @default(now())
  createdById Int
}
```

## 8. API Gap Analysis

**Existing APIs:** matches README's table exactly — `auth, dashboard, categories, products (+stock-ledger), suppliers, purchases (+cancel, +payment), sales (+cancel, +receipt, +payment), sales-returns, stock-adjustments, expenses, reports/*`. All confirmed present via `backend/src/routes/*.js` filenames and `README.md`'s documented route table (spot-checked against actual controller exports, e.g. `purchaseService.js`/`saleService.js` `module.exports` match the described endpoints).

**Missing APIs:** anything backing §5's missing modules — no `/api/customers`, `/api/supplier-payments`, `/api/purchase-returns`, `/api/product-variants`, `/api/stock-counts`, `/api/audit-log`.

**Validation gaps:** Not exhaustively re-derived line-by-line (would require reading all 8 validator files in full), but the services consistently perform business-rule checks in addition to Zod schema validation (e.g. stock sufficiency, cancelled-status guards, over-return guards) — no case found where a service trusted client input without a corresponding check.

**Authz gaps:** Since there's only one role, there is no authorization *tier* to gap-check — every authenticated request has full access by design. This becomes a real gap only once M28 (multi-role) is pursued.

**Error handling:** ✅ centralized, consistent envelope, `ApiError` class with status codes used throughout every service reviewed (404 for not-found, 400 for business-rule violations, 409 for uniqueness conflicts).

**Transaction safety:** ✅ verified in `purchaseService`, `saleService`, `salesReturnService`, `stockAdjustmentService` — all stock-affecting writes are inside `prisma.$transaction`. One exception flagged: `productService.generateSku()` runs its `count()` outside any transaction (§10 R1) — low risk at single-admin scale but worth noting since every *other* number generator in the codebase (`documentNumber.js`, used for `PUR-/SAL-/RET-/ADJ-` numbers) explicitly runs inside the owning transaction, so SKU generation is the one inconsistent case.

**Naming inconsistency:** Minor — `Purchase` has `notes`, `Sale` does not (see §6.8); otherwise naming is consistent (`paymentStatus`/`paymentMethod`/`createdById` used uniformly across all transactional models).

**Pagination/filtering gaps:** All list endpoints reviewed (`purchaseService.list`, `saleService.list`, `supplierService.list`, `categoryService.list`, `stockAdjustmentService.list`) consistently use the shared `getPagination`/`buildMeta` utilities — no inconsistency found. One functional caveat: `productService.list`'s `stockStatus=LOW|OUT` filter path fetches *all* matching rows into memory before paginating (`productService.js` L34-51, with an explicit code comment acknowledging this trade-off) — fine at small-shop scale (dozens to low hundreds of products) but would not scale to a large catalog. Correctly self-documented as an intentional trade-off, not an oversight.

## 9. Frontend Gap Analysis

**Existing screens:** Login, Dashboard, Categories, Products, Suppliers, Purchases, Sales (incl. POS/cart/return flow inline), Receipt, Stock Adjustments, Expenses, Reports, Settings, NotFound — 13 routes total, matching `frontend/src/App.jsx`'s `<Routes>`.

**Missing screens (vs. Plan.md's original page list):** Plan.md asked for *separate* "Add product / Edit product / Product details / Purchase details / Sale details / Supplier details" pages; the actual implementation appears to consolidate create/edit/detail into modals within the list pages (`Modal.jsx` used throughout per Phase 7 notes) rather than dedicated routes — this is a reasonable, common simplification, not a functional gap, but means there are no deep-linkable detail URLs (e.g. no `/products/:id` route exists in `App.jsx`). 🟡 Flag as a UX limitation (can't bookmark/share a direct link to one product/sale/purchase) rather than a missing feature.

**Incomplete forms / missing filters:** Not exhaustively verified per-field without running the app; based on `App.jsx` and the Phase 7 implementation log, all major list pages have search/filter/pagination (per `IMPLEMENTATION_PLAN.md` Phase 7 verification checklist).

**Missing loading/empty/error states:** None found missing — `Skeleton`, `EmptyState`, `ConfirmDialog`, `Toast` (via `ToastContext`) are all present and, per the Phase 7 log, were systematically rolled out to every page.

**Mobile responsiveness:** 🔵 Cannot fully confirm without live browser testing (out of scope for this read-only, no-dev-server-required audit) — claimed done in `IMPLEMENTATION_PLAN.md` but not independently re-verified here.

**Mock-data screens:** ❌ **None found.** Every page's corresponding `api/*Api.js` file wraps real Axios calls to real backend routes (`frontend/src/api/{auth,category,product,supplier,purchase,sale,salesReturn,stockAdjustment,expense,report,dashboard}Api.js`, 11 files, one per backend module) — confirmed no hardcoded arrays/mock JSON standing in for API responses anywhere in `frontend/src` (grep for `TODO|mock|hardcoded|placeholder|dummy` returned only false-positive matches — e.g. `placeholder=` HTML attributes and Login/Textarea component `placeholder` props, not actual mock data).

**Reusable components:** Strong component library exists (`frontend/src/components/ui/`: `Button, IconButton, Input, Select, Textarea, FormField, Card, Badge, Dropdown, EmptyState, Skeleton, PageHeader, AnimatedNumber, HeroStatCard`) plus shared `Table.jsx`, `Pagination.jsx`, `Modal.jsx`, `ConfirmDialog.jsx`, `StatCard.jsx`, `StatusBadge.jsx`, `ProductSearchSelect.jsx` — well-factored, per the Phase 7 UI modernization log.

## 10. Data Integrity Risks

| ID | Risk | Severity | Affected files | Example failure scenario | Recommended fix |
|---|---|---|---|---|---|
| R1 | SKU generation (`productService.generateSku`) reads `product.count()` outside the creating transaction | Low | `backend/src/services/productService.js` L7-10, L92 | Two near-simultaneous "Add Product" submissions could theoretically both read the same count and attempt to create the same SKU — the `@unique` DB constraint would reject the second one, so it fails loudly rather than corrupting data, but the user sees a confusing 500/constraint error instead of a clean retry | Wrap SKU generation in the same `$transaction` as product creation, following the existing `generateDocumentNumber` pattern already used for Purchase/Sale/Return/Adjustment numbers |
| R2 | Sale cancellation does not reverse `paidAmount`/create a refund record | Low-Medium | `backend/src/services/saleService.js` L158-192 | A cash sale for ₹500 (fully paid) is cancelled — stock is correctly restored, but `paidAmount` stays at ₹500 and `dueAmount` at 0 with no record that ₹500 needs to be refunded to the customer out of the till | Add explicit refund handling on cancel (either zero out paid/due with a note, or require a `SalesReturn` for any cancellation involving money already collected) |
| R3 | Purchase-report profit is not reduced by sales returns | Low | `backend/src/services/reportService.js` `getProfitReport` (L60-93) | A ₹1000 sale (profit ₹300) is fully returned the next day; the profit report for the sale's date still shows the original ₹300 profit with no offsetting entry from the `SalesReturn`, overstating historical profit | Join/subtract `SalesReturnItem.refundAmount`-derived cost/profit impact into the profit report, or store a `profitImpact` on `SalesReturnItem` at return time |
| R4 | No idempotency protection on double form-submit for Sale/Purchase creation (not confirmed either way — not verified by reading frontend submit-button disable logic in depth) | 🔵 Cannot confirm | `frontend/src/pages/Sales.jsx`, `Purchases.jsx` | A cashier double-clicks "Complete Sale" on a slow connection before the button disables → two sales created for the same cart | Verify/add a disabled-while-submitting guard on the submit button if not already present (React Hook Form's `isSubmitting` state is available for this) |
| R5 | `Category.defaultMarkupPercent` is dead data — present in schema/migration but unused by any service | Cosmetic/low | `backend/prisma/schema.prisma` L129, confirmed unused across `backend/src` | An admin sets a category's default markup expecting it to affect anything, and nothing happens — silent no-op, confusing but not destructive | Either wire it into product-creation default pricing, or remove the field until it's actually used |
| R6 | `productService.list`'s `stockStatus` filter loads the full unfiltered product set into memory before paginating | Low (scale-dependent) | `backend/src/services/productService.js` L34-52 (self-documented trade-off) | Fine today at small-shop catalog sizes; would degrade if the catalog grows into the thousands | No action needed at current scale; revisit if catalog size grows substantially |

**No P0/critical risks were found** in the implemented core (purchase, sale, return, adjustment) flows — all are transactional, use decimal-safe money math, and correctly guard against negative stock and over-return. The risks above are all P2/P3-equivalent (accounting-completeness or edge-case robustness gaps), not stock-corrupting or data-loss bugs.

## 11. Recommended Build Phases

**Phase 0 — Correctness/Safety** (small, do first regardless of what's next)
- Goals: close the few real integrity gaps found.
- Features: R1 (transactional SKU generation), R2 (sale-cancel refund tracking), R3 (returns-aware profit report), verify R4.
- Dependencies: none. DB: none (R2/R3 could optionally add fields but can be done with existing schema). Backend: small service edits. Frontend: none/minimal. Testing: extend existing Vitest suite (`purchases.test.js`, `sales.test.js`, `salesReturns.test.js` already exist as a base). DoD: no known transactional or accounting-correctness gap remains open.

**Phase 1 — Core operations polish**
- Goals: make the daily-use POS/purchasing loop faster and more complete without new domain concepts.
- Features: M2/M18 (barcode scan + billing), M6 (reorder level/qty fields), M15 (purchase-price history report), M33 (net-profit report), M17 (markup vs margin display — wire up the already-existing but dead `defaultMarkupPercent`), M31 (optional Excel export if genuinely needed).
- DB: small additive fields only. Backend: new report queries (cheap, data already exists). Frontend: barcode input handling, two new report tabs. DoD: cashier can scan a barcode at POS; owner can see net profit and price-history in Reports.

**Phase 2 — Purchasing intelligence**
- Goals: give the owner supplier-comparison and payment-tracking tools.
- Features: M10 (extended supplier profile), M11 (supplier-specific rates), M23 (supplier payment ledger), M27 (supplier purchase returns), M12 (price comparison — depends on M11).
- DB: `SupplierPayment`, `SupplierProductPrice`, `PurchaseReturn`/`PurchaseReturnItem` models. DoD: owner can compare two suppliers' rates for the same product and record/track supplier payments over time.

**Phase 3 — Inventory intelligence**
- Goals: dead-stock/fast-mover reporting and a light demand-recommendation view.
- Features: M24 (fast/medium/slow/dead-stock with configurable periods), M25 (demand-based reorder suggestions — needs M6's `leadTimeDays`/`safetyStock`/`packSize` first).
- DB: small additive fields on `Product`/`Supplier`. Backend: recommendation calc service. DoD: owner can see "reorder these 5 products soon" list grounded in real sales velocity.

**Phase 4 — Seasonal/reporting & customers**
- Goals: customer credit management (the single biggest genuinely-missing *business* feature, per M21/M22) and seasonal planning.
- Features: M21/M22 (Customer model + credit ledger + billing-screen warnings), M26 (seasonal calendar, lower priority).
- DB: `Customer` model, FK from `Sale`. DoD: repeat customers can be tracked with a credit limit, and the POS warns before selling to a blocked/over-limit customer.

**Phase 5 — Optional/large**
- Goals: only pursue if the shop's needs genuinely grow past single-location/single-role.
- Features: M28 (multi-role auth), M8 (multi-location), M9 (batch/lot/expiry), M1 (variants), M13 (full PO lifecycle), M29 (audit log), M30 (backup/restore), M32 (PWA/offline).
- Note: several of these (multi-location, batch/lot) are explicitly out of scope per `Plan.md`'s stated "avoid unnecessary enterprise-level complexity" directive — treat as "only if the shop's actual size changes," not a default roadmap item.

## 12. Recommended Next Feature

**Recommendation: Phase 0 fixes (R1–R3) followed immediately by M33 (net-profit report) and M17 (wire up markup/margin).**

Why: These are the cheapest possible changes (all backend-only, using data that already exists in the database — no new models, no new UI patterns to design) and they close the only real correctness/accounting gaps this audit found, plus deliver the one clearly-articulated pricing-safety concern from the audit brief (markup vs. margin conflation — currently *neither* is even computed, only absolute profit ₹ amounts).

Problem solved: an owner currently cannot see "am I actually profitable after rent/electricity/salary this month" (no net-profit report) and cannot see percentage margins at all (only raw profit numbers), which is the single most common way a small shop owner unknowingly underprices a product.

Reusable code: `reportService.getProfitReport` and `reportService.getExpensesReport` already compute everything needed — a net-profit report is a thin new function that calls both and subtracts. `Category.defaultMarkupPercent` already exists in the schema (migration `20260731172347_add_category_default_markup`) and just needs to be read in `productService.create`/`update` to suggest/default a selling price, plus a `marginPercent`/`markupPercent` computed field added to the profit report's per-product breakdown (`profit / revenue` vs. `profit / cost` — trivial arithmetic on numbers already in `SaleItem`).

DB/backend/frontend changes: no schema changes required for M33/M17 (R1 needs no schema change either; R2/R3 could ship with existing fields, storing the refund/reversal as a note initially and adding dedicated fields later if needed). Backend: 2–3 small service functions plus wiring the existing dead field. Frontend: one new Reports tab, one or two additional numbers shown on the existing Profit report table.

Risks: minimal — pure additive reporting logic on top of already-correct transactional data; no risk to existing stock/money-safety guarantees.

Acceptance criteria: (1) Reports page has a "Net Profit" view showing gross revenue, COGS, gross profit, total expenses, and net profit for a selected date range; (2) the Profit report's per-product table shows a margin % and markup % column alongside the existing ₹ profit; (3) `Category.defaultMarkupPercent` is either actively used to suggest a selling price when adding a product in that category, or removed from the schema if the owner decides not to use it — it should not remain silently unused.

## 13. Questions and Assumptions

- Assumed "complete" means the full UI → API → DB path is wired and exercised by at least the code path (not necessarily verified by running the live app against a real MySQL instance, since this audit was explicitly read-only and DB-touching commands were avoided). Backend Vitest suite exists and *appears* to cover the critical transactional cases per its filenames, but was not executed here.
- Assumed the shop is genuinely single-location/single-admin per `README.md`/`Plan.md`'s explicit statements, so multi-location, multi-role, and enterprise-scale items are correctly out of current scope rather than oversights — flagged as Missing (for completeness against the audit's checklist) but explicitly de-prioritized to P2/P3 in §5, consistent with "keep recommendations proportionate to a small stationery shop."
- Did not run `npm run build`/`oxlint`/`vitest` — the task allowed this but noted it's optional and that a live DB would be needed for the backend test suite; skipped to strictly avoid any risk of touching a database, per the read-only ground rules.
- `.env`/`.env.example`/`.env.production` files exist in both `frontend/` and `backend/` but were not opened, since they may contain secrets and reading them wasn't necessary to answer any audit question (their existence and the variables they're expected to contain were already fully documented in `README.md`).
- Could not visually verify mobile responsiveness or in-browser behavior (modal animations, skeleton loading, etc.) since this audit did not launch the dev server or a browser — all such claims are sourced from `IMPLEMENTATION_PLAN.md`'s Phase 7 self-reported verification log and marked 🔵 where not independently re-confirmed.
- Assumed "purchase cancellation" and "purchase return" are meant to be two distinct concepts per the audit brief's checklist (§6.5), even though `Plan.md`'s original spec only asked for cancellation — flagged the missing purchase-return as a real gap (M27) since the audit brief explicitly asks for it.
