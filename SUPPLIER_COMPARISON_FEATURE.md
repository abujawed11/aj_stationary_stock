# Supplier Price Comparison Feature

Adds a way to compare supplier quotations for a product (or a whole shopping
list of products) and find the cheapest **effective** cost — accounting for
MOQ, delivery charges, discounts, "Buy X Get Y Free" schemes, and other
charges — without touching stock or creating a purchase.

## What was added

### 1. Database

New model `SupplierQuotation` (migration `20260806104419_add_supplier_quotations`):

```prisma
model SupplierQuotation {
  id             Int      @id @default(autoincrement())
  productId      Int
  supplierId     Int
  unitPrice      Decimal  @db.Decimal(12, 2)
  moq            Int      @default(1)
  deliveryCharge Decimal  @default(0) @db.Decimal(12, 2)
  discount       Decimal  @default(0) @db.Decimal(12, 2)
  schemeBuyQty   Int?
  schemeFreeQty  Int?
  otherCharges   Decimal  @default(0) @db.Decimal(12, 2)
  deliveryTime   String?
  notes          String?  @db.Text
  isActive       Boolean  @default(true)
  createdById    Int
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  product   Product  @relation(fields: [productId], references: [id])
  supplier  Supplier @relation(fields: [supplierId], references: [id])
  createdBy User     @relation("SupplierQuotationCreatedBy", fields: [createdById], references: [id])
}
```

A quotation is a standalone record of "what supplier X quoted for product Y" —
it does not reference or create a `Purchase`, and never changes
`Product.currentStock`. `tests/setup.js` was updated to clean this table on
test reset.

### 2. Backend

| File | Purpose |
|---|---|
| `backend/src/services/supplierQuotationService.js` | CRUD + the two comparison functions (`compare`, `compareBasket`) and the shared `calculateQuotation` formula helper |
| `backend/src/controllers/supplierQuotationController.js` | Thin controller wiring service → HTTP response, matching the existing controller pattern |
| `backend/src/routes/supplierQuotationRoutes.js` | Routes, mounted at `/api/supplier-quotations` in `backend/src/routes/index.js` |
| `backend/src/validators/supplierQuotationValidators.js` | Zod schemas for create/update/basket-compare |
| `backend/tests/supplierQuotations.test.js` | Formula correctness, MOQ ineligibility, sorting/cheapest-highlight, basket ranking, and a check that no stock/purchase is touched |

### 3. Frontend

| File | Purpose |
|---|---|
| `frontend/src/api/supplierQuotationApi.js` | Axios wrapper (list/get/create/update/remove/compare/compareBasket) |
| `frontend/src/pages/SupplierComparison.jsx` | New page with two tabs: **Single Product** and **Product List (Basket)** |
| `frontend/src/App.jsx` | Route `/supplier-comparison` |
| `frontend/src/layouts/AppLayout.jsx` | Sidebar nav item "Supplier Comparison" |

Reused existing components throughout: `ProductSearchSelect`, `Table`,
`Modal`, `ConfirmDialog`, `Card`, `Badge`, `FormField`, `Input`, `Select`,
`Textarea`, `EmptyState`, `Skeleton`. No new UI primitives were introduced.

## Calculation logic

Implemented once, in `calculateQuotation(quotation, requiredQty)` inside
`supplierQuotationService.js`, and reused by both the single-product and
basket comparisons:

```
paidQuantity            = requiredQty
freeQuantity             = schemeBuyQty && schemeFreeQty
                             ? floor(paidQuantity / schemeBuyQty) * schemeFreeQty
                             : 0
totalReceivedQuantity    = paidQuantity + freeQuantity
totalPurchaseCost        = (paidQuantity * unitPrice) - discount + deliveryCharge + otherCharges
effectiveCostPerUnit     = totalPurchaseCost / totalReceivedQuantity

eligible                 = paidQuantity >= moq   (otherwise flagged "ineligible" with a reason)
```

All money math goes through the existing `backend/src/utils/money.js`
Decimal helpers, matching how purchases/sales compute totals elsewhere in the
app.

### Single-product comparison (`GET /api/supplier-quotations/compare`)

1. Load all active quotations for the product.
2. Run `calculateQuotation` for each at the requested quantity.
3. Split into eligible / ineligible (below MOQ).
4. Sort eligible quotations by `effectiveCostPerUnit` ascending.
5. Flag the first eligible one `isLowestEffectiveCost: true` ("Lowest
   Effective Cost").
6. Return `eligible + ineligible` (ineligible always sort to the bottom).

### Basket comparison (`POST /api/supplier-quotations/compare-basket`)

For a shopping list of `{ productId, requiredQty }` items, this answers
*"which single supplier is cheapest for my whole list?"*:

1. Collect every supplier who has quoted **at least one** item in the list.
2. For each supplier, run `calculateQuotation` against every item they've
   quoted (if the item's `requiredQty` is below that supplier's MOQ, the item
   is treated as "not covered" with a reason, same as the ineligible case
   above; items the supplier never quoted are "no quotation").
3. Sum `totalPurchaseCost` across covered items → `totalBasketCost`.
4. Sort: suppliers who cover **all** items first (by `totalBasketCost`
   ascending), then partial-coverage suppliers (by items-covered descending,
   then cost ascending).
5. Flag the cheapest full-coverage supplier `isLowestBasketCost: true`.

This is a read-only aggregation over the same `SupplierQuotation` rows used
by the single-product view — no new persistence was needed for basket mode.

## API routes

All routes require authentication (`authenticate` middleware), same as every
other module.

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/supplier-quotations` | List quotations (`?productId=`, `?supplierId=`, paginated) |
| `GET` | `/api/supplier-quotations/:id` | Get one quotation |
| `POST` | `/api/supplier-quotations` | Create a quotation |
| `PUT` | `/api/supplier-quotations/:id` | Update a quotation |
| `DELETE` | `/api/supplier-quotations/:id` | Delete a quotation (hard delete — quotations are scratch/comparison data, not financial records, so unlike Product/Supplier/Category there's no soft-delete requirement here) |
| `GET` | `/api/supplier-quotations/compare?productId=&requiredQty=` | Single-product comparison |
| `POST` | `/api/supplier-quotations/compare-basket` | Basket comparison — body: `{ items: [{ productId, requiredQty }, ...] }` |

None of these routes write to `Product`, `Purchase`, `PurchaseItem`, or
`StockMovement` — verified by a dedicated test
(`"does not create a purchase or change product stock"`).

## How to test

### Backend (automated)

```bash
cd backend
npm test
```

This runs `tests/supplierQuotations.test.js` along with the existing suite.
Note: at the time this feature was built, the whole existing test suite
(including tests unrelated to this feature, e.g. `auth.test.js`) was failing
in this environment with `Vitest cannot be imported in a CommonJS module
using require()` — a pre-existing Vitest v4 vs CommonJS mismatch, not caused
by this feature. If you hit that, it needs a Vitest/ESM config fix
independent of this change.

### From the UI

1. Start both servers (`backend`: `npm run dev`, `frontend`: `npm run dev`).
2. Log in, open **Supplier Comparison** in the sidebar.
3. **Single Product tab:**
   - Pick a product and a required quantity.
   - Click **Add Supplier Quotation**, fill in a supplier's price/MOQ/delivery
     charge/discount/scheme/other charges/delivery time/notes, save.
   - Repeat for 2–3 suppliers with different prices/MOQs to see:
     - A supplier whose MOQ is above your required quantity shown as
       **"Below MOQ"** (ineligible), no effective-cost value.
     - The remaining eligible suppliers sorted cheapest-first, with the
       cheapest one tagged **"Lowest Effective Cost"**.
   - Edit/delete a quotation and confirm the comparison recalculates.
4. **Product List (Basket) tab:**
   - Add 2+ products with quantities.
   - Click **Compare Basket**.
   - Confirm a supplier who has quotes for every item in the list is ranked
     above one who only covers some of them, and the cheapest full-coverage
     supplier is tagged **"Lowest Basket Cost"**. Partial suppliers list
     which items they're missing and why.
5. Confirm throughout that no `Purchase` is created and no product's
   `currentStock` changes (check the Products/Dashboard pages before and
   after).
