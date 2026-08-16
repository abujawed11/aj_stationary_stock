import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Scale, Award, ListChecks, X as XIcon } from "lucide-react";
import supplierQuotationApi from "../api/supplierQuotationApi";
import supplierApi from "../api/supplierApi";
import productApi from "../api/productApi";
import Table from "../components/Table";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import ProductSearchSelect from "../components/ProductSearchSelect";
import Button from "../components/ui/Button";
import IconButton from "../components/ui/IconButton";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Textarea from "../components/ui/Textarea";
import FormField from "../components/ui/FormField";
import PageHeader from "../components/ui/PageHeader";
import EmptyState from "../components/ui/EmptyState";
import Badge from "../components/ui/Badge";
import Card from "../components/ui/Card";
import { TableSkeleton } from "../components/ui/Skeleton";
import { selectOnFocus } from "../utils/formHelpers";
import { formatCurrency } from "../utils/currency";
import { useToast } from "../context/ToastContext";

function toOptionalInt(val) {
  return val === "" || val === null || val === undefined ? undefined : val;
}

const quotationSchema = z.object({
  supplierId: z.coerce.number().int().positive("Select a supplier"),
  unitPrice: z.coerce.number().nonnegative("Cannot be negative"),
  moq: z.coerce.number().int().positive("MOQ must be > 0").optional().default(1),
  deliveryCharge: z.coerce.number().nonnegative().optional().default(0),
  discount: z.coerce.number().nonnegative().optional().default(0),
  schemeBuyQty: z.preprocess(toOptionalInt, z.coerce.number().int().positive().optional()),
  schemeFreeQty: z.preprocess(toOptionalInt, z.coerce.number().int().positive().optional()),
  otherCharges: z.coerce.number().nonnegative().optional().default(0),
  deliveryTime: z.string().optional(),
  notes: z.string().optional(),
});

const emptyDefaults = {
  supplierId: "",
  unitPrice: 0,
  moq: 1,
  deliveryCharge: 0,
  discount: 0,
  schemeBuyQty: "",
  schemeFreeQty: "",
  otherCharges: 0,
  deliveryTime: "",
  notes: "",
};

export default function SupplierComparison() {
  const { showToast } = useToast();
  const [mode, setMode] = useState("single");
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [productId, setProductId] = useState("");
  const [requiredQty, setRequiredQty] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalProductId, setModalProductId] = useState("");
  const [editing, setEditing] = useState(null);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const modalProductName = useMemo(
    () => products.find((p) => String(p.id) === String(modalProductId))?.name || "",
    [products, modalProductId]
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(quotationSchema), defaultValues: emptyDefaults });

  useEffect(() => {
    async function loadOptions() {
      const [productRes, supplierRes] = await Promise.all([
        productApi.list({ limit: 200, isActive: true }),
        supplierApi.list({ limit: 100, isActive: true }),
      ]);
      setProducts(productRes.data);
      setSuppliers(supplierRes.data);
    }
    loadOptions();
  }, []);

  async function loadComparison() {
    if (!productId || !requiredQty || Number(requiredQty) <= 0) {
      setResult(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await supplierQuotationApi.compare(productId, requiredQty);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load comparison");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadComparison();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, requiredQty]);

  const selectedProduct = useMemo(
    () => products.find((p) => String(p.id) === String(productId)),
    [products, productId]
  );

  // Basket (product list) comparison state
  const [basketItems, setBasketItems] = useState([{ productId: "", requiredQty: 1 }]);
  const [basketResult, setBasketResult] = useState(null);
  const [basketLoading, setBasketLoading] = useState(false);
  const [basketError, setBasketError] = useState("");

  function addBasketRow() {
    setBasketItems((rows) => [...rows, { productId: "", requiredQty: 1 }]);
  }

  function removeBasketRow(index) {
    setBasketItems((rows) => (rows.length > 1 ? rows.filter((_, i) => i !== index) : rows));
  }

  function updateBasketRow(index, field, value) {
    setBasketItems((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  async function runBasketCompare() {
    const validItems = basketItems
      .filter((row) => row.productId && Number(row.requiredQty) > 0)
      .map((row) => ({ productId: Number(row.productId), requiredQty: Number(row.requiredQty) }));

    if (validItems.length === 0) {
      setBasketError("Add at least one product with a quantity");
      return;
    }

    setBasketLoading(true);
    setBasketError("");
    try {
      const data = await supplierQuotationApi.compareBasket(validItems);
      setBasketResult(data);
    } catch (err) {
      setBasketError(err.response?.data?.message || "Failed to compare basket");
      setBasketResult(null);
    } finally {
      setBasketLoading(false);
    }
  }

  function openCreate(forProductId = productId, prefillSupplierId = "") {
    setModalProductId(forProductId);
    setEditing(null);
    setFormError("");
    reset({ ...emptyDefaults, supplierId: prefillSupplierId });
    setModalOpen(true);
  }

  function openEdit(quote) {
    setModalProductId(productId);
    setEditing(quote);
    setFormError("");
    reset({
      supplierId: quote.supplier.id,
      unitPrice: quote.unitPrice,
      moq: quote.moq,
      deliveryCharge: quote.deliveryCharge,
      discount: quote.discount,
      schemeBuyQty: quote.schemeBuyQty || "",
      schemeFreeQty: quote.schemeFreeQty || "",
      otherCharges: quote.otherCharges,
      deliveryTime: quote.deliveryTime || "",
      notes: quote.notes || "",
    });
    setModalOpen(true);
  }

  async function onSubmit(values) {
    setFormError("");
    if (!Number.isFinite(Number(modalProductId)) || Number(modalProductId) <= 0) {
      setFormError("Please select a product first");
      return;
    }
    const payload = { ...values, productId: Number(modalProductId) };
    try {
      if (editing) {
        await supplierQuotationApi.update(editing.id, payload);
        showToast("Quotation updated");
      } else {
        await supplierQuotationApi.create(payload);
        showToast("Quotation added");
      }
      setModalOpen(false);
      if (mode === "basket") {
        runBasketCompare();
      } else {
        loadComparison();
      }
    } catch (err) {
      const fieldErrors = err.response?.data?.errors;
      console.error("[SupplierQuotation] save failed:", err.response?.data || err);
      if (fieldErrors?.length) {
        setFormError(fieldErrors.map((fe) => `${fe.path}: ${fe.message}`).join("; "));
      } else {
        setFormError(err.response?.data?.message || "Failed to save quotation");
      }
    }
  }

  async function confirmDelete() {
    try {
      await supplierQuotationApi.remove(deleteTarget.id);
      showToast("Quotation deleted");
      setDeleteTarget(null);
      loadComparison();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to delete quotation", "error");
    }
  }

  function schemeLabel(q) {
    if (!q.schemeBuyQty || !q.schemeFreeQty) return "-";
    return `Buy ${q.schemeBuyQty} Get ${q.schemeFreeQty} Free`;
  }

  const columns = [
    {
      key: "supplier",
      header: "Supplier",
      render: (row) => (
        <span className={row.isLowestEffectiveCost ? "font-semibold text-emerald-700" : "text-slate-700"}>
          {row.supplier.name}
        </span>
      ),
    },
    { key: "unitPrice", header: "Unit Price", render: (row) => formatCurrency(row.unitPrice) },
    { key: "moq", header: "MOQ", render: (row) => row.moq },
    { key: "deliveryCharge", header: "Delivery", render: (row) => formatCurrency(row.deliveryCharge) },
    { key: "discount", header: "Discount", render: (row) => formatCurrency(row.discount) },
    { key: "scheme", header: "Scheme", render: (row) => schemeLabel(row) },
    { key: "otherCharges", header: "Other", render: (row) => formatCurrency(row.otherCharges) },
    { key: "deliveryTime", header: "Delivery Time", render: (row) => row.deliveryTime || "-" },
    { key: "paidQuantity", header: "Paid Qty", render: (row) => row.paidQuantity },
    { key: "freeQuantity", header: "Free Qty", render: (row) => row.freeQuantity },
    { key: "totalReceivedQuantity", header: "Total Received", render: (row) => row.totalReceivedQuantity },
    { key: "totalPurchaseCost", header: "Total Cost", render: (row) => formatCurrency(row.totalPurchaseCost) },
    {
      key: "effectiveCostPerUnit",
      header: "Effective Cost/Unit",
      render: (row) =>
        row.eligible ? (
          <span className={row.isLowestEffectiveCost ? "font-semibold text-emerald-700" : ""}>
            {formatCurrency(row.effectiveCostPerUnit)}
          </span>
        ) : (
          "-"
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) =>
        row.isLowestEffectiveCost ? (
          <Badge tone="emerald" icon={Award}>Lowest Effective Cost</Badge>
        ) : row.eligible ? (
          <Badge tone="slate">Eligible</Badge>
        ) : (
          <div>
            <Badge tone="red">Below MOQ</Badge>
            <p className="mt-1 text-xs text-slate-400">{row.ineligibleReason}</p>
          </div>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex items-center gap-1">
          <IconButton icon={Pencil} title="Edit" onClick={() => openEdit(row)} />
          <IconButton icon={Trash2} tone="danger" title="Delete" onClick={() => setDeleteTarget(row)} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Supplier Price Comparison"
        subtitle="Compare supplier quotations for a product and find the lowest effective cost per unit"
      />

      <div className="mt-4 flex gap-1 border-b border-slate-200">
        <button
          onClick={() => setMode("single")}
          className={`px-4 py-2 text-sm font-medium ${
            mode === "single" ? "border-b-2 border-brand-600 text-brand-700" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Single Product
        </button>
        <button
          onClick={() => setMode("basket")}
          className={`px-4 py-2 text-sm font-medium ${
            mode === "basket" ? "border-b-2 border-brand-600 text-brand-700" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Product List (Basket)
        </button>
      </div>

      {mode === "single" && (
        <>
          <Card className="mt-4" title="Product & Required Quantity" icon={Scale}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField label="Product">
                <ProductSearchSelect products={products} value={productId} onChange={setProductId} />
              </FormField>
              <FormField label="Quantity Needed">
                <Input
                  type="number"
                  min="1"
                  onFocus={selectOnFocus}
                  value={requiredQty}
                  onChange={(e) => setRequiredQty(e.target.value)}
                />
              </FormField>
              <div className="flex items-end">
                <Button icon={Plus} disabled={!productId} onClick={() => openCreate()}>
                  Add Supplier Quotation
                </Button>
              </div>
            </div>
          </Card>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <div className="mt-4">
            {!productId ? (
              <div className="rounded-xl border border-slate-200 bg-white">
                <EmptyState
                  icon={Scale}
                  title="Select a product to begin"
                  message="Choose a product and enter the quantity you need to compare supplier quotations."
                />
              </div>
            ) : loading ? (
              <TableSkeleton columns={columns.length} />
            ) : !result || result.quotations.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white">
                <EmptyState
                  icon={Scale}
                  title="No supplier quotations yet"
                  message={`Add a quotation from a supplier for ${selectedProduct?.name || "this product"} to start comparing.`}
                  action={
                    <Button icon={Plus} onClick={() => openCreate()}>
                      Add Supplier Quotation
                    </Button>
                  }
                />
              </div>
            ) : (
              <Table columns={columns} data={result.quotations} />
            )}
          </div>
        </>
      )}

      {mode === "basket" && (
        <>
          <Card className="mt-4" title="Product List" icon={ListChecks}>
            <div className="space-y-2">
              {basketItems.map((row, index) => (
                <div key={index} className="grid grid-cols-[1fr_8rem_2rem] items-center gap-3">
                  <ProductSearchSelect
                    products={products}
                    value={row.productId}
                    onChange={(val) => updateBasketRow(index, "productId", val)}
                  />
                  <Input
                    type="number"
                    min="1"
                    aria-label="Quantity"
                    onFocus={selectOnFocus}
                    value={row.requiredQty}
                    onChange={(e) => updateBasketRow(index, "requiredQty", e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => removeBasketRow(index)}
                    className="text-slate-400 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <button
                type="button"
                onClick={addBasketRow}
                className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />
                Add product
              </button>
              <Button onClick={runBasketCompare} loading={basketLoading}>
                Compare Basket
              </Button>
            </div>
          </Card>

          {basketError && <p className="mt-3 text-sm text-red-600">{basketError}</p>}

          <div className="mt-4 space-y-3">
            {!basketResult ? (
              <div className="rounded-xl border border-slate-200 bg-white">
                <EmptyState
                  icon={ListChecks}
                  title="Build a product list to compare"
                  message="Add the products and quantities you need, then compare which supplier is cheapest for the whole list."
                />
              </div>
            ) : basketResult.suppliers.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white">
                <EmptyState
                  icon={ListChecks}
                  title="No supplier covers any of these products"
                  message="Add supplier quotations for these products first (via Single Product tab) to compare a basket."
                />
              </div>
            ) : (
              basketResult.suppliers.map((s) => (
                <Card key={s.supplier.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{s.supplier.name}</span>
                      {s.isLowestBasketCost && (
                        <Badge tone="emerald" icon={Award}>Lowest Basket Cost</Badge>
                      )}
                      {s.isComplete ? (
                        <Badge tone="slate">Covers all {s.totalItems} items</Badge>
                      ) : (
                        <Badge tone="amber">
                          Covers {s.coveredCount}/{s.totalItems} items
                        </Badge>
                      )}
                    </div>
                    <span className="text-lg font-semibold text-slate-800">
                      {formatCurrency(s.totalBasketCost)}
                    </span>
                  </div>

                  {s.lineItems.length > 0 && (
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="text-xs uppercase tracking-wide text-slate-500">
                          <tr>
                            <th className="py-1.5 pr-4 font-medium">Product</th>
                            <th className="py-1.5 pr-4 font-medium">Unit Price</th>
                            <th className="py-1.5 pr-4 font-medium">Paid Qty</th>
                            <th className="py-1.5 pr-4 font-medium">Free Qty</th>
                            <th className="py-1.5 pr-4 font-medium">Effective Cost/Unit</th>
                            <th className="py-1.5 pr-4 font-medium">Line Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {s.lineItems.map((li) => (
                            <tr key={li.productId}>
                              <td className="py-1.5 pr-4 text-slate-700">{li.productName}</td>
                              <td className="py-1.5 pr-4 text-slate-600">{formatCurrency(li.unitPrice)}</td>
                              <td className="py-1.5 pr-4 text-slate-600">{li.paidQuantity}</td>
                              <td className="py-1.5 pr-4 text-slate-600">{li.freeQuantity}</td>
                              <td className="py-1.5 pr-4 text-slate-600">{formatCurrency(li.effectiveCostPerUnit)}</td>
                              <td className="py-1.5 pr-4 text-slate-700">{formatCurrency(li.totalPurchaseCost)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {s.missingItems.length > 0 && (
                    <div className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
                      <p className="font-medium">Not available from this supplier:</p>
                      <ul className="mt-1 space-y-1">
                        {s.missingItems.map((mi) => (
                          <li key={mi.productId} className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1">
                              <XIcon className="h-3 w-3 shrink-0" /> {mi.productName} — {mi.reason}
                            </span>
                            <button
                              type="button"
                              onClick={() => openCreate(mi.productId, s.supplier.id)}
                              className="shrink-0 whitespace-nowrap font-medium text-brand-700 hover:underline"
                            >
                              + Add quote
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editing
            ? "Edit Supplier Quotation"
            : `Add Supplier Quotation${modalProductName ? ` — ${modalProductName}` : ""}`
        }
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField label="Supplier" error={errors.supplierId} className="sm:col-span-3">
            <Select error={errors.supplierId} {...register("supplierId")}>
              <option value="">Select supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Purchase Price / Unit" error={errors.unitPrice}>
            <Input type="number" min="0" step="0.01" prefix="₹" onFocus={selectOnFocus} error={errors.unitPrice} {...register("unitPrice")} />
          </FormField>
          <FormField label="MOQ" error={errors.moq}>
            <Input type="number" min="1" onFocus={selectOnFocus} error={errors.moq} {...register("moq")} />
          </FormField>
          <FormField label="Delivery Charge">
            <Input type="number" min="0" step="0.01" prefix="₹" onFocus={selectOnFocus} {...register("deliveryCharge")} />
          </FormField>
          <FormField label="Discount">
            <Input type="number" min="0" step="0.01" prefix="₹" onFocus={selectOnFocus} {...register("discount")} />
          </FormField>
          <FormField label="Buy Qty (scheme)" hint="e.g. Buy 10">
            <Input type="number" min="1" onFocus={selectOnFocus} {...register("schemeBuyQty")} />
          </FormField>
          <FormField label="Free Qty (scheme)" hint="e.g. Get 1 free">
            <Input type="number" min="1" onFocus={selectOnFocus} {...register("schemeFreeQty")} />
          </FormField>
          <FormField label="Other Charges">
            <Input type="number" min="0" step="0.01" prefix="₹" onFocus={selectOnFocus} {...register("otherCharges")} />
          </FormField>
          <FormField label="Delivery Time" hint="e.g. 3-5 days">
            <Input {...register("deliveryTime")} />
          </FormField>
          <FormField label="Notes" className="sm:col-span-3">
            <Textarea rows={2} {...register("notes")} />
          </FormField>

          {formError && (
            <p className="sm:col-span-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>
          )}

          <div className="sm:col-span-3 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {editing ? "Save Changes" : "Add Quotation"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Quotation"
        message={`Remove the quotation from ${deleteTarget?.supplier?.name || ""}? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
