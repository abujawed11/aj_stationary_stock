# Implementation Plan — AJ Stationery Stock & Sales Management App

## Progress status (updated 2026-07-30)

**Phase 2 — Foundation: mostly done.**

Backend:
- [x] Installed express, prisma@6, @prisma/client@6, bcryptjs, jsonwebtoken, cors, helmet, express-rate-limit, zod, dotenv, cookie-parser, morgan, nodemon, vitest, supertest
- [x] Prisma configured for MySQL, `prisma.config.js` (converted from the generator's default `.ts` to plain JS)
- [x] Full `schema.prisma` written and migrated (`init`, then `add-username`)
- [x] Seed script (`prisma/seed.js`): 1 admin, 10 categories, 25 products, 3 suppliers, 3 purchases, 5 sales, 5 expenses — all stock changes go through proper `StockAdjustment`/`StockMovement` records, not raw field edits
- [x] Auth implemented: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, JWT in httpOnly cookie, login rate-limited, bcrypt password check
- [x] Central error handler, 404 handler, `ApiError`, `asyncHandler`, Zod `validate` middleware, env-variable validation (`config/env.js`)
- [x] `Makefile` at repo root wrapping both `frontend`/`backend` npm scripts (install, dev, prisma:*, test, lint, build)
- [ ] Not yet: controllers/services/routes for anything beyond auth (categories, products, suppliers, purchases, sales, etc. — Phase 3+)

Frontend:
- [x] Tailwind v4 wired via `@tailwindcss/vite`
- [x] Installed react-router-dom, axios, react-hook-form, zod, @hookform/resolvers, lucide-react
- [x] `AuthContext` (session check via `/auth/me` on load), `axiosInstance` (`withCredentials: true`), `authApi`
- [x] `ProtectedRoute`, routing wired in `App.jsx`
- [x] Login page (split-screen branded design) and a minimal Dashboard placeholder — auth flow verified working end-to-end in the browser
- [ ] Not yet: `AppLayout` (sidebar + topbar), `AuthLayout`, real Dashboard cards/charts, any other page

**Schema deviation from original plan:** added a `username` field (unique) to `User` alongside `email`, since login authenticates by username (`admin`/`admin123` seeded), not email.

**Decisions confirmed:**
1. Building inside existing `frontend/`/`backend/` folders — confirmed, not renaming to `client`/`server`.
2. Keeping `oxlint` instead of ESLint — confirmed.
3. MySQL is locally installed; using a dedicated `stationery_app` DB user (granted broad privileges locally so Prisma's shadow database works for migrations).

Next up: Phase 3 (Categories → Products → Suppliers → Purchases → Stock Movement ledger), and building out `AppLayout` once there are enough real pages to hang it on.

---

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

- **User** — id, name, username (unique, used for login), email (unique), passwordHash, role (enum `AdminRole { ADMIN }`), isActive, timestamps
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

## Open questions — resolved

See "Decisions confirmed" in the Progress status section at the top of this file.

---

## Phase 7 — UI/UX Modernization (planned 2026-07-31)

### 7.0 Where things stand today

Codebase review of `frontend/src` found the foundation is already reasonable — Tailwind v4, `lucide-react` icons, `react-hook-form` + `zod`, a branded split-screen Login page, a working sidebar layout, `recharts` on the dashboard, and a custom toast system. This is **not a rebuild**; it's a polish pass. The concrete gaps that make it feel "basic":

1. **No shared form/UI primitives.** Every page (`Products.jsx`, `Sales.jsx`, `Purchases.jsx`, etc.) hand-writes the same `<input className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:...">` block dozens of times. Inconsistent, hard to restyle, no room for icons/affordances (e.g. currency prefix, validation state icon).
2. **Flat, static modals.** `Modal.jsx` has no enter/exit transition, no backdrop blur — it just appears/disappears.
3. **Plain tables.** `Table.jsx` has no sticky header, no zebra striping, row actions are bare inline icon buttons with no grouping (gets cramped once more actions are added).
4. **No skeleton loading states** — every page shows a plain "Loading..." text string instead of a shaped placeholder.
5. **Dashboard stat cards** (`StatCard.jsx`) are small, same-weight, and there are 12 of them in a flat grid with no visual hierarchy (primary KPIs vs. secondary counts) and no trend indicators.
6. **Default system font** — no distinct typographic identity.
7. **No dark mode.**
8. **Empty states are one line of gray text**, no icon or call-to-action.
9. **Buttons are copy-pasted className strings** with no variants (primary/secondary/danger/ghost).

### 7.1 Goals

- Give the app a cohesive, modern "SaaS dashboard" feel without changing any business logic, API contracts, or routes.
- Replace repeated raw markup with a small shared component library so every page automatically looks consistent and future pages inherit the styling for free.
- Use icons purposefully (empty states, form field affordances, status indicators, menu actions) rather than only in the sidebar.
- Keep the bundle lean — prefer Tailwind + a couple of well-chosen headless/animation libraries over heavy UI kits.

### 7.2 New dependencies

| Package | Purpose | Why this one |
|---|---|---|
| `@headlessui/react` | Accessible unstyled primitives: `Menu` (row action dropdowns), `Listbox` (styled selects), `Dialog`+`Transition` (animated modal), `Switch` (settings toggles) | Built by Tailwind's own team, zero visual opinions, pairs directly with existing Tailwind classes, no CSS-in-JS |
| `motion` (formerly `framer-motion`) | Modal/menu transitions, list enter/exit, subtle hover/tap micro-animations, animated number count-up on stat cards | Industry-standard, small API surface for the few spots we need it |
| `@fontsource-variable/plus-jakarta-sans` (or `inter`) | Self-hosted variable webfont | Gives real typographic identity without a Google Fonts network request; self-hosted keeps it working offline/behind firewalls |

Everything else (icons, charts, forms, toasts) stays on what's already installed (`lucide-react`, `recharts`, `react-hook-form`, `zod`) — no need to replace working pieces.

Decision needed from you: keep the existing hand-rolled `ToastContext` (just restyle it) or swap to `sonner`? **Recommendation: keep it** — it's ~50 lines, already does everything needed, and swapping buys nothing but churn.

### 7.3 Design foundation (`index.css` / Tailwind theme)

- Define a small set of design tokens via Tailwind v4's CSS-based `@theme`:
  - Accent color: keep blue as primary brand color but define it as a token (`--color-brand-*`) instead of hardcoded `blue-600` everywhere, so it can be retuned in one place.
  - Add a `--font-sans` variable pointing at the new variable webfont, applied on `body`.
  - Standardize radius scale (`rounded-lg` for inputs/buttons, `rounded-xl` for cards/modals — already mostly consistent, just codify it).
  - Standardize shadow scale: a soft `shadow-sm` for cards, a slightly deeper shadow for modals/popovers.
- Dark mode: **skipped for now** (de-scoped per your call on 2026-07-31). No `dark:` variants will be added; can be revisited as a later phase without disrupting the component library, since tokens are already centralized.

### 7.4 Shared component library (new files under `frontend/src/components/ui/`)

| Component | Replaces | Notes |
|---|---|---|
| `Button.jsx` | ad-hoc button classNames | variants: `primary`, `secondary`, `danger`, `ghost`; sizes `sm`/`md`; supports `icon` prop (leading lucide icon) + loading spinner state |
| `IconButton.jsx` | inline `<button><Icon/></button>` in tables | consistent hit-area, hover/focus ring, optional `tone` (default/danger) |
| `Input.jsx`, `Textarea.jsx`, `Select.jsx` | raw `<input>`/`<select>` in every form | consistent border/focus ring, built-in label + error message slot, optional leading icon slot (reuses the icon-prefixed pattern already proven in `Login.jsx`), optional prefix text (e.g. `₹` for money fields) |
| `FormField.jsx` | repeated `<label>...<input/>...{errors.x && <p/>}` blocks | thin wrapper so pages just do `<FormField label="Name" error={errors.name}><input {...register("name")} /></FormField>` |
| `Card.jsx` | repeated `rounded-xl border border-slate-200 bg-white p-4` divs | takes optional title/icon/action-slot header |
| `Badge.jsx` | `StatusBadge.jsx` (generalize it) | status/stock/tone badges reused beyond just active/inactive |
| `Dropdown.jsx` | none yet | Headless UI `Menu`-based kebab menu for table row actions once a row needs 3+ actions (Products already has Edit/Ledger/Activate) |
| `Modal.jsx` (rewrite in place) | current `Modal.jsx` | swap to Headless UI `Dialog` + `Transition` for backdrop-blur fade + panel scale-in; keep the same prop API (`open/onClose/title/children/maxWidth`) so no page call-sites need to change |
| `EmptyState.jsx` | inline "No records found" strings | icon + short message + optional CTA button (e.g. "No products yet — Add your first product") |
| `Skeleton.jsx` | `Loading...` text | `animate-pulse` shaped placeholders (table-row skeleton, stat-card skeleton, chart skeleton) so loading states preserve layout instead of collapsing |
| `PageHeader.jsx` | repeated `<h1>+<p>+action button` block at the top of every page | title, subtitle, breadcrumb-ish context, right-aligned action slot |

Migration approach: build these once, then convert pages one at a time (Products first as the reference implementation since it's the most form-heavy, then roll the pattern out) — never a big-bang rewrite of all pages in one commit.

### 7.5 Page-by-page changes

- **AppLayout / Sidebar / Topbar** — add active-item indicator as a left accent bar + soft background glow (currently just a background color swap); topbar gets a user avatar-initials circle + Headless UI `Menu` dropdown (Profile/Logout) instead of a bare Logout button; add the dark-mode toggle here; add subtle slide-in `motion` transition for the mobile drawer (currently instant).
- **Login** — already the strongest page visually; minor polish only (webfont, animated gradient panel accent, button hover lift).
- **Dashboard** — restructure the 12 `StatCard`s into a hierarchy: 4 "hero" KPI cards (Today's Sales/Profit, Month Sales, Low Stock Alerts) at larger size with icon badge + trend arrow, the rest demoted into a denser secondary grid or a collapsible "More metrics" section; animate numbers counting up on load via `motion`; give the sales trend chart a gradient area fill instead of a flat line; recent-sales/low-stock/best-sellers lists get real icons per row (payment method icon, category icon) instead of plain text rows.
- **Products, Categories, Suppliers, Purchases, Sales, Stock Adjustments, Expenses** — all their create/edit modals get rebuilt on top of `FormField`/`Input`/`Select`/`Textarea`/`Button`; money fields get a `₹` prefix icon slot; table row actions consolidate into the `Dropdown` kebab menu once there are 3+ actions; empty/loading states use `EmptyState`/`Skeleton`.
- **Reports** — likely the most "spreadsheet-y" page today; give report type selection cards icons, and export buttons get a `Button` `icon` variant (Download icon).
- **Receipt** — keep print-friendly layout as-is (this is a print target, not a dashboard page) but tidy spacing/typography to match the new font.
- **Settings** — form fields move to shared `Input`/`Select`, toggle switches (if any) become Headless UI `Switch`.
- **NotFound** — small illustration/icon + "Back to dashboard" `Button`, replacing whatever plain text is there now.

### 7.6 Icon usage guidelines

- Keep `lucide-react` as the single icon set app-wide (already the case) — never mix in a second icon library, for visual consistency.
- Use icons for: nav items (done), stat card badges (done), form field affordances (done in Login, extend to money/search/date fields elsewhere), status/tone badges, empty states, toasts (done), row action buttons, dropdown menu items, page header context, dark-mode toggle (Sun/Moon).
- Icon sizing convention: `h-3.5 w-3.5` inline-with-text, `h-4 w-4` buttons/inputs, `h-5 w-5` headers/modals, `h-8 w-8`+ inside colored badge containers — codify this instead of ad-hoc sizes.

### 7.7a Progress (updated 2026-07-31)

- [x] Step 1: installed `@headlessui/react`, `motion`, `@fontsource-variable/plus-jakarta-sans`; wired `--font-sans` + `--color-brand-*` + `--shadow-card`/`--shadow-popover` tokens in `index.css`.
- [x] Step 2: built `components/ui/` primitives — `Button`, `IconButton`, `Input`, `Select`, `Textarea`, `FormField`, `Card`, `Badge`, `Dropdown` (Headless UI Menu), `EmptyState`, `Skeleton`/`TableSkeleton`/`StatCardSkeleton`, `PageHeader`. `StatusBadge` now delegates to `Badge`.
- [x] Step 3: rewrote `Modal.jsx` on Headless UI `Dialog`+`Transition` (backdrop blur + fade/scale, same prop API — no page call-sites changed).
- [x] Step 4: rewrote `AppLayout.jsx` — active nav item now has a left accent bar, topbar Logout button replaced with an avatar-initials dropdown menu (Headless UI `Menu`), mobile drawer now slides in/out instead of appearing instantly.
- [x] Step 5: converted `Products.jsx` to the new primitives (reference page) — search input has a leading search icon, price fields show a ₹ prefix, table loading state is now a shaped skeleton instead of "Loading...", empty state has an icon + "Add Product" CTA, stock ledger rows get up/down arrow icons.
- [ ] Not yet: steps 6–8 (remaining pages, dashboard hierarchy, final responsive/typography pass).

**To verify in the browser (`npm run dev`):**
1. Sidebar — active page should show a small blue accent bar on the left of its nav item.
2. Topbar — top-right should now be an avatar circle with initials + your name + chevron; clicking it opens a dropdown with your username and a Logout item (styled, not a bare button).
3. Any modal (e.g. Products → Add Product) should fade/scale in with a blurred backdrop, not appear instantly.
4. Products page: search box has a magnifying-glass icon inside it; Selling Price/MRP fields show a ₹ prefix; temporarily throttle network or reload to see the skeleton loading placeholder instead of "Loading..." text; filter to something with no results to see the new empty state with icon + button.
5. General type-check: the whole app now renders in the Plus Jakarta Sans font instead of the system default — should look slightly more distinct/rounded.
6. Functionality check (nothing should have changed here): creating/editing a product, toggling active/inactive, and viewing the stock ledger should all still work exactly as before.

### 7.7 Execution order

1. Install new deps (`@headlessui/react`, `motion`, font package); wire font + theme tokens in `index.css`.
2. Build the `components/ui/` primitives (Button, Input, Select, Textarea, FormField, Card, Badge, EmptyState, Skeleton, PageHeader).
3. Rebuild `Modal.jsx` on Headless UI `Dialog` (in place, same API) — every page using `<Modal>` gets the animation for free immediately.
4. Rebuild `AppLayout.jsx` (sidebar accent, topbar avatar menu, mobile drawer transition, dark-mode toggle).
5. Convert `Products.jsx` fully to the new primitives as the reference page — pause here for your review before repeating the pattern.
6. Roll the same conversion across Categories, Suppliers, Purchases, Sales, Stock Adjustments, Expenses, Reports, Settings.
7. Dashboard visual hierarchy + chart polish + row icons.
8. Final pass: NotFound, Receipt typography, responsive/mobile check.

Each step ships as its own commit/checkpoint so functionality can be verified (forms still submit correctly, validation still fires) before moving to the next page — no behavior changes, styling/structure only.

### 7.8 Non-goals

- No changes to API contracts, routes, validation rules, or business logic.
- No new state-management library — existing `useState`/context patterns stay.
- No CSS-in-JS or component-kit lock-in (e.g. MUI, Ant Design) — everything layers on top of the existing Tailwind setup.
