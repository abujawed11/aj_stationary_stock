import { useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, Eye } from "lucide-react";
import purchaseApi from "../api/purchaseApi";
import supplierApi from "../api/supplierApi";
import productApi from "../api/productApi";
import Table from "../components/Table";
import Pagination from "../components/Pagination";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import { selectOnFocus } from "../utils/formHelpers";
import { formatCurrency, formatDate } from "../utils/currency";
import { useToast } from "../context/ToastContext";

const PAYMENT_METHODS = ["CASH", "UPI", "BANK_TRANSFER", "OTHER"];

const purchaseSchema = z.object({
  supplierId: z.union([z.coerce.number().int().positive(), z.literal("")]).optional(),
  invoiceNumber: z.string().optional(),
  paymentMethod: z.enum(PAYMENT_METHODS),
  discount: z.coerce.number().nonnegative().optional().default(0),
  additionalCost: z.coerce.number().nonnegative().optional().default(0),
  paidAmount: z.coerce.number().nonnegative().optional().default(0),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.coerce.number().int().positive("Select a product"),
        quantity: z.coerce.number().int().positive("Qty must be > 0"),
        unitCost: z.coerce.number().nonnegative("Cannot be negative"),
      })
    )
    .min(1, "Add at least one item"),
});

function PaymentStatusBadge({ status }) {
  const styles = {
    PAID: "bg-emerald-100 text-emerald-700",
    PARTIALLY_PAID: "bg-amber-100 text-amber-700",
    UNPAID: "bg-red-100 text-red-700",
  };
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>{status.replace("_", " ")}</span>;
}

export default function Purchases() {
  const { showToast } = useToast();
  const [purchases, setPurchases] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [formError, setFormError] = useState("");

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      supplierId: "",
      invoiceNumber: "",
      paymentMethod: "CASH",
      discount: 0,
      additionalCost: 0,
      paidAmount: 0,
      notes: "",
      items: [{ productId: "", quantity: 1, unitCost: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = useWatch({ control, name: "items" });
  const watchedDiscount = useWatch({ control, name: "discount" });
  const watchedAdditionalCost = useWatch({ control, name: "additionalCost" });

  const subtotal = useMemo(
    () => (watchedItems || []).reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitCost) || 0), 0),
    [watchedItems]
  );
  const totalAmount = subtotal - (Number(watchedDiscount) || 0) + (Number(watchedAdditionalCost) || 0);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await purchaseApi.list({ page });
      setPurchases(res.data);
      setMeta(res.meta);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load purchases");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function openCreate() {
    setFormError("");
    const [supplierRes, productRes] = await Promise.all([
      supplierApi.list({ limit: 100, isActive: true }),
      productApi.list({ limit: 200, isActive: true }),
    ]);
    setSuppliers(supplierRes.data);
    setProducts(productRes.data);
    reset({
      supplierId: "",
      invoiceNumber: "",
      paymentMethod: "CASH",
      discount: 0,
      additionalCost: 0,
      paidAmount: 0,
      notes: "",
      items: [{ productId: "", quantity: 1, unitCost: 0 }],
    });
    setModalOpen(true);
  }

  async function onSubmit(values) {
    setFormError("");
    try {
      const payload = {
        ...values,
        supplierId: values.supplierId || undefined,
      };
      await purchaseApi.create(payload);
      showToast("Purchase completed successfully");
      setModalOpen(false);
      setPage(1);
      load();
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to create purchase");
    }
  }

  async function openDetail(purchase) {
    const full = await purchaseApi.getById(purchase.id);
    setDetail(full);
  }

  async function confirmCancel() {
    try {
      await purchaseApi.cancel(cancelTarget.id);
      showToast("Purchase cancelled successfully");
      setCancelTarget(null);
      setDetail(null);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to cancel purchase", "error");
    }
  }

  const columns = [
    { key: "purchaseNumber", header: "Purchase #" },
    { key: "supplier", header: "Supplier", render: (row) => row.supplier?.name || "-" },
    { key: "purchaseDate", header: "Date", render: (row) => formatDate(row.purchaseDate) },
    { key: "totalAmount", header: "Total", render: (row) => formatCurrency(row.totalAmount) },
    { key: "paymentStatus", header: "Payment", render: (row) => <PaymentStatusBadge status={row.paymentStatus} /> },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <span className={row.status === "CANCELLED" ? "text-red-600" : "text-emerald-600"}>{row.status}</span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex items-center gap-3">
          <button onClick={() => openDetail(row)} className="text-slate-500 hover:text-blue-600">
            <Eye className="h-4 w-4" />
          </button>
          {row.status === "COMPLETED" && (
            <button onClick={() => setCancelTarget(row)} className="text-xs font-medium text-red-600 hover:underline">
              Cancel
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Purchases</h1>
          <p className="text-sm text-slate-500">Record stock purchased from suppliers</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          New Purchase
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4">
        {loading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : (
          <>
            <Table columns={columns} data={purchases} />
            <Pagination meta={meta} onPageChange={setPage} />
          </>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Purchase" maxWidth="max-w-4xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">Supplier (optional)</label>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                {...register("supplierId")}
              >
                <option value="">No supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Invoice Number</label>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                {...register("invoiceNumber")}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Payment Method</label>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                {...register("paymentMethod")}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-700">Items</label>
              <button
                type="button"
                onClick={() => append({ productId: "", quantity: 1, unitCost: 0 })}
                className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />
                Add item
              </button>
            </div>
            <div className="mt-2 grid grid-cols-[1fr_6rem_6rem_7rem_6rem_1.5rem] gap-3 px-1 text-xs font-medium text-slate-500">
              <span>Product</span>
              <span>Quantity</span>
              <span>Unit</span>
              <span>Unit Cost (₹)</span>
              <span>Line Total (₹)</span>
              <span></span>
            </div>
            <div className="mt-1 space-y-2">
              {fields.map((field, index) => {
                const item = watchedItems?.[index];
                const lineTotal = (Number(item?.quantity) || 0) * (Number(item?.unitCost) || 0);
                const selectedProduct = products.find((p) => String(p.id) === String(item?.productId));
                return (
                  <div key={field.id} className="grid grid-cols-[1fr_6rem_6rem_7rem_6rem_1.5rem] items-center gap-3">
                    <select
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      {...register(`items.${index}.productId`)}
                    >
                      <option value="">Select product</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      aria-label="Quantity"
                      onFocus={selectOnFocus}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      {...register(`items.${index}.quantity`)}
                    />
                    <span className="flex h-full items-center rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                      {selectedProduct?.unit || "-"}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      aria-label="Unit cost"
                      onFocus={selectOnFocus}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      {...register(`items.${index}.unitCost`)}
                    />
                    <span className="text-sm text-slate-600">{formatCurrency(lineTotal)}</span>
                    <button
                      type="button"
                      onClick={() => fields.length > 1 && remove(index)}
                      className="text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
            {errors.items && !Array.isArray(errors.items) && (
              <p className="mt-1 text-xs text-red-600">{errors.items.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Discount (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                onFocus={selectOnFocus}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                {...register("discount")}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Additional Cost (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                onFocus={selectOnFocus}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                {...register("additionalCost")}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Paid Amount (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                onFocus={selectOnFocus}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                {...register("paidAmount")}
              />
            </div>
            <div className="flex flex-col justify-end">
              <p className="text-xs text-slate-500">Subtotal: {formatCurrency(subtotal)}</p>
              <p className="text-sm font-semibold text-slate-800">Total: {formatCurrency(totalAmount)}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Notes</label>
            <textarea
              rows={2}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              {...register("notes")}
            />
          </div>

          {formError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              Complete Purchase
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.purchaseNumber || ""} maxWidth="max-w-2xl">
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-2 text-slate-600">
              <p><span className="text-slate-400">Supplier:</span> {detail.supplier?.name || "-"}</p>
              <p><span className="text-slate-400">Date:</span> {formatDate(detail.purchaseDate)}</p>
              <p><span className="text-slate-400">Payment:</span> {detail.paymentMethod}</p>
              <p><span className="text-slate-400">Status:</span> {detail.status}</p>
            </div>
            <div className="space-y-1.5">
              {detail.items.map((item) => (
                <div key={item.id} className="flex justify-between rounded-md border border-slate-100 px-3 py-1.5">
                  <span>{item.product.name} × {item.quantity}</span>
                  <span>{formatCurrency(item.totalCost)}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1 border-t border-slate-100 pt-3 text-right">
              <p>Subtotal: {formatCurrency(detail.subtotal)}</p>
              <p>Discount: {formatCurrency(detail.discount)}</p>
              <p>Additional cost: {formatCurrency(detail.additionalCost)}</p>
              <p className="font-semibold text-slate-800">Total: {formatCurrency(detail.totalAmount)}</p>
              <p>Paid: {formatCurrency(detail.paidAmount)}</p>
              <p>Due: {formatCurrency(detail.dueAmount)}</p>
            </div>
            {detail.status === "COMPLETED" && (
              <div className="flex justify-end">
                <button
                  onClick={() => setCancelTarget(detail)}
                  className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Cancel Purchase
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!cancelTarget}
        title="Cancel Purchase"
        message={`This will reverse the stock added by purchase ${cancelTarget?.purchaseNumber || ""}. This cannot be undone.`}
        confirmLabel="Cancel Purchase"
        danger
        onConfirm={confirmCancel}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
}
