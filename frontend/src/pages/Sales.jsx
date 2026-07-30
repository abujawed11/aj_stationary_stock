import { useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, Eye, Printer, Undo2, IndianRupee } from "lucide-react";
import { Link } from "react-router-dom";
import saleApi from "../api/saleApi";
import salesReturnApi from "../api/salesReturnApi";
import productApi from "../api/productApi";
import Table from "../components/Table";
import Pagination from "../components/Pagination";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import ProductSearchSelect from "../components/ProductSearchSelect";
import { formatCurrency, formatDateTime } from "../utils/currency";
import { selectOnFocus } from "../utils/formHelpers";
import { useToast } from "../context/ToastContext";

const PAYMENT_METHODS = ["CASH", "UPI", "BANK_TRANSFER", "OTHER"];

const saleSchema = z.object({
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  paymentMethod: z.enum(PAYMENT_METHODS),
  discount: z.coerce.number().nonnegative().optional().default(0),
  paidAmount: z.coerce.number().nonnegative().optional().default(0),
  items: z
    .array(
      z.object({
        productId: z.coerce.number().int().positive("Select a product"),
        quantity: z.coerce.number().int().positive("Qty must be > 0"),
        sellingPrice: z.coerce.number().nonnegative("Cannot be negative"),
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

function SaleStatusLabel({ status }) {
  const styles = {
    COMPLETED: "text-emerald-600",
    CANCELLED: "text-red-600",
    PARTIALLY_RETURNED: "text-amber-600",
    RETURNED: "text-slate-500",
  };
  return <span className={styles[status]}>{status.replace("_", " ")}</span>;
}

export default function Sales() {
  const { showToast } = useToast();
  const [sales, setSales] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [products, setProducts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [formError, setFormError] = useState("");
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnRows, setReturnRows] = useState([]);
  const [returnMethod, setReturnMethod] = useState("CASH");
  const [returnReason, setReturnReason] = useState("");
  const [returnError, setReturnError] = useState("");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethodInput, setPaymentMethodInput] = useState("CASH");
  const [paymentError, setPaymentError] = useState("");

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
      paymentMethod: "CASH",
      discount: 0,
      paidAmount: 0,
      items: [{ productId: "", quantity: 1, sellingPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = useWatch({ control, name: "items" });
  const watchedDiscount = useWatch({ control, name: "discount" });

  const subtotal = useMemo(
    () => (watchedItems || []).reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.sellingPrice) || 0), 0),
    [watchedItems]
  );
  const totalAmount = subtotal - (Number(watchedDiscount) || 0);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await saleApi.list({ page, limit });
      setSales(res.data);
      setMeta(res.meta);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load sales");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  function handlePageSizeChange(size) {
    setLimit(size);
    setPage(1);
  }

  async function openCreate() {
    setFormError("");
    const productRes = await productApi.list({ limit: 200, isActive: true });
    setProducts(productRes.data);
    reset({
      customerName: "",
      customerPhone: "",
      paymentMethod: "CASH",
      discount: 0,
      paidAmount: 0,
      items: [{ productId: "", quantity: 1, sellingPrice: 0 }],
    });
    setModalOpen(true);
  }

  function handleProductChange(index, productId) {
    const product = products.find((p) => String(p.id) === String(productId));
    if (product) {
      setValue(`items.${index}.sellingPrice`, Number(product.sellingPrice));
    }
  }

  async function onSubmit(values) {
    setFormError("");
    try {
      await saleApi.create(values);
      showToast("Sale completed successfully");
      setModalOpen(false);
      setPage(1);
      load();
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to complete sale");
    }
  }

  async function openDetail(sale) {
    const full = await saleApi.getById(sale.id);
    setDetail(full);
  }

  async function confirmCancel() {
    try {
      await saleApi.cancel(cancelTarget.id);
      showToast("Sale cancelled successfully");
      setCancelTarget(null);
      setDetail(null);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to cancel sale", "error");
    }
  }

  function openPaymentModal() {
    setPaymentAmount(Number(detail.dueAmount));
    setPaymentMethodInput(detail.paymentMethod);
    setPaymentError("");
    setPaymentModalOpen(true);
  }

  async function submitPayment() {
    setPaymentError("");
    try {
      const updated = await saleApi.recordPayment(detail.id, {
        amount: paymentAmount,
        paymentMethod: paymentMethodInput,
      });
      showToast("Payment recorded successfully");
      setPaymentModalOpen(false);
      setDetail((prev) => ({ ...prev, ...updated }));
      load();
    } catch (err) {
      setPaymentError(err.response?.data?.message || "Failed to record payment");
    }
  }

  function openReturn(sale) {
    const returnedByItem = new Map();
    for (const ret of sale.salesReturns || []) {
      for (const ri of ret.items) {
        returnedByItem.set(ri.saleItemId, (returnedByItem.get(ri.saleItemId) || 0) + ri.quantity);
      }
    }
    const rows = sale.items
      .map((item) => {
        const alreadyReturned = returnedByItem.get(item.id) || 0;
        const remaining = item.quantity - alreadyReturned;
        return {
          saleItemId: item.id,
          productName: item.product.name,
          sellingPrice: Number(item.sellingPrice),
          remaining,
          quantity: 0,
          condition: "GOOD",
          returnToStock: true,
        };
      })
      .filter((r) => r.remaining > 0);
    setReturnRows(rows);
    setReturnMethod(sale.paymentMethod);
    setReturnReason("");
    setReturnError("");
    setReturnModalOpen(true);
  }

  function updateReturnRow(index, patch) {
    setReturnRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  async function submitReturn() {
    setReturnError("");
    const itemsToReturn = returnRows
      .filter((r) => r.quantity > 0)
      .map((r) => ({
        saleItemId: r.saleItemId,
        quantity: r.quantity,
        condition: r.condition,
        returnToStock: r.condition === "GOOD" ? r.returnToStock : false,
      }));
    if (itemsToReturn.length === 0) {
      setReturnError("Enter a quantity to return for at least one item");
      return;
    }
    try {
      await salesReturnApi.create({
        saleId: detail.id,
        refundMethod: returnMethod,
        reason: returnReason || undefined,
        items: itemsToReturn,
      });
      showToast("Return recorded successfully");
      setReturnModalOpen(false);
      setDetail(null);
      load();
    } catch (err) {
      setReturnError(err.response?.data?.message || "Failed to record return");
    }
  }

  const columns = [
    { key: "saleNumber", header: "Sale #" },
    { key: "customerName", header: "Customer", render: (row) => row.customerName || "Walk-in" },
    { key: "saleDate", header: "Date", render: (row) => formatDateTime(row.saleDate) },
    { key: "totalAmount", header: "Total", render: (row) => formatCurrency(row.totalAmount) },
    { key: "paymentStatus", header: "Payment", render: (row) => <PaymentStatusBadge status={row.paymentStatus} /> },
    { key: "status", header: "Status", render: (row) => <SaleStatusLabel status={row.status} /> },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex items-center gap-3">
          <button onClick={() => openDetail(row)} className="text-slate-500 hover:text-blue-600" title="View">
            <Eye className="h-4 w-4" />
          </button>
          {(row.status === "COMPLETED" || row.status === "PARTIALLY_RETURNED") && (
            <button
              onClick={async () => openReturn(await saleApi.getById(row.id))}
              className="text-slate-500 hover:text-blue-600"
              title="Return items"
            >
              <Undo2 className="h-4 w-4" />
            </button>
          )}
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
          <h1 className="text-xl font-semibold text-slate-800">Sales</h1>
          <p className="text-sm text-slate-500">Bill customers and track sales</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          New Sale
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4">
        {loading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : (
          <>
            <Table columns={columns} data={sales} />
            <Pagination meta={meta} onPageChange={setPage} pageSize={limit} onPageSizeChange={handlePageSizeChange} />
          </>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Sale" maxWidth="max-w-4xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">Customer Name (optional)</label>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                {...register("customerName")}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Customer Phone (optional)</label>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                {...register("customerPhone")}
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
              <label className="block text-sm font-medium text-slate-700">Cart</label>
              <button
                type="button"
                onClick={() => append({ productId: "", quantity: 1, sellingPrice: 0 })}
                className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />
                Add item
              </button>
            </div>
            <div className="mt-2 grid grid-cols-[1fr_5rem_5rem_6.5rem_6rem_1.5rem] gap-3 px-1 text-xs font-medium text-slate-500">
              <span>Product</span>
              <span>Quantity</span>
              <span>Stock</span>
              <span>Price (₹)</span>
              <span>Line Total (₹)</span>
              <span></span>
            </div>
            <div className="mt-1 space-y-2">
              {fields.map((field, index) => {
                const item = watchedItems?.[index];
                const selectedProduct = products.find((p) => String(p.id) === String(item?.productId));
                const lineTotal = (Number(item?.quantity) || 0) * (Number(item?.sellingPrice) || 0);
                const exceedsStock = selectedProduct && Number(item?.quantity) > selectedProduct.currentStock;
                return (
                  <div key={field.id} className="grid grid-cols-[1fr_5rem_5rem_6.5rem_6rem_1.5rem] items-center gap-3">
                    <Controller
                      control={control}
                      name={`items.${index}.productId`}
                      render={({ field: controllerField }) => (
                        <ProductSearchSelect
                          products={products}
                          value={controllerField.value}
                          onChange={(id) => {
                            controllerField.onChange(id);
                            handleProductChange(index, id);
                          }}
                        />
                      )}
                    />
                    <input
                      type="number"
                      min="1"
                      aria-label="Quantity"
                      onFocus={selectOnFocus}
                      className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                        exceedsStock ? "border-red-400 focus:border-red-500 focus:ring-red-500" : "border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                      }`}
                      {...register(`items.${index}.quantity`)}
                    />
                    <span className={`text-sm ${exceedsStock ? "text-red-600" : "text-slate-500"}`}>
                      {selectedProduct ? selectedProduct.currentStock : "-"}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      aria-label="Selling price"
                      onFocus={selectOnFocus}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      {...register(`items.${index}.sellingPrice`)}
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
            <div className="col-span-2 flex flex-col justify-end">
              <p className="text-xs text-slate-500">Subtotal: {formatCurrency(subtotal)}</p>
              <p className="text-sm font-semibold text-slate-800">Total: {formatCurrency(totalAmount)}</p>
            </div>
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
              Complete Sale
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.saleNumber || ""} maxWidth="max-w-2xl">
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-2 text-slate-600">
              <p><span className="text-slate-400">Customer:</span> {detail.customerName || "Walk-in"}</p>
              <p><span className="text-slate-400">Date:</span> {formatDateTime(detail.saleDate)}</p>
              <p><span className="text-slate-400">Payment:</span> {detail.paymentMethod}</p>
              <p><span className="text-slate-400">Status:</span> <SaleStatusLabel status={detail.status} /></p>
            </div>
            <div className="space-y-1.5">
              <div className="grid grid-cols-[1fr_5rem_5rem] gap-2 px-3 text-xs font-medium text-slate-400">
                <span>Item</span>
                <span className="text-right">Total</span>
                <span className="text-right">Profit</span>
              </div>
              {detail.items.map((item) => (
                <div key={item.id} className="grid grid-cols-[1fr_5rem_5rem] gap-2 rounded-md border border-slate-100 px-3 py-1.5">
                  <span>{item.product.name} × {item.quantity}</span>
                  <span className="text-right">{formatCurrency(item.totalAmount)}</span>
                  <span className="text-right text-emerald-600">{formatCurrency(item.grossProfit)}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1 border-t border-slate-100 pt-3 text-right">
              <p>Subtotal: {formatCurrency(detail.subtotal)}</p>
              <p>Discount: {formatCurrency(detail.discount)}</p>
              <p className="font-semibold text-slate-800">Total: {formatCurrency(detail.totalAmount)}</p>
              <p>Paid: {formatCurrency(detail.paidAmount)}</p>
              <p>Due: {formatCurrency(detail.dueAmount)}</p>
              <p className="font-semibold text-emerald-600">
                Gross Profit: {formatCurrency(
                  detail.items.reduce((sum, i) => sum + Number(i.grossProfit), 0) - Number(detail.discount)
                )}
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Link
                to={`/sales/${detail.id}/receipt`}
                target="_blank"
                className="flex items-center gap-1.5 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Printer className="h-4 w-4" />
                Print Receipt
              </Link>
              {detail.status !== "CANCELLED" && Number(detail.dueAmount) > 0 && (
                <button
                  onClick={openPaymentModal}
                  className="flex items-center gap-1.5 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <IndianRupee className="h-4 w-4" />
                  Record Payment
                </button>
              )}
              {(detail.status === "COMPLETED" || detail.status === "PARTIALLY_RETURNED") && (
                <button
                  onClick={() => openReturn(detail)}
                  className="flex items-center gap-1.5 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Undo2 className="h-4 w-4" />
                  Return Items
                </button>
              )}
              {detail.status === "COMPLETED" && (
                <button
                  onClick={() => setCancelTarget(detail)}
                  className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Cancel Sale
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal open={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} title="Record Payment" maxWidth="max-w-sm">
        {detail && (
          <div className="space-y-4 text-sm">
            <p className="text-slate-500">
              Due amount: <span className="font-semibold text-slate-800">{formatCurrency(detail.dueAmount)}</span>
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-700">Amount Received (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                max={Number(detail.dueAmount)}
                onFocus={selectOnFocus}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Payment Method</label>
              <select
                value={paymentMethodInput}
                onChange={(e) => setPaymentMethodInput(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m.replace("_", " ")}</option>
                ))}
              </select>
            </div>

            {paymentError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{paymentError}</p>}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={submitPayment}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Record Payment
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={returnModalOpen} onClose={() => setReturnModalOpen(false)} title="Return Items" maxWidth="max-w-2xl">
        <div className="space-y-4 text-sm">
          {returnRows.length === 0 && <p className="text-slate-400">Nothing left to return on this sale.</p>}
          {returnRows.length > 0 && (
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_4rem_5rem_6rem_5rem] gap-2 px-1 text-xs font-medium text-slate-500">
                <span>Product</span>
                <span>Return Qty</span>
                <span>Remaining</span>
                <span>Condition</span>
                <span>Restock</span>
              </div>
              {returnRows.map((row, index) => (
                <div key={row.saleItemId} className="grid grid-cols-[1fr_4rem_5rem_6rem_5rem] items-center gap-2">
                  <span>{row.productName}</span>
                  <input
                    type="number"
                    min="0"
                    max={row.remaining}
                    onFocus={selectOnFocus}
                    value={row.quantity}
                    onChange={(e) => updateReturnRow(index, { quantity: Number(e.target.value) })}
                    className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-slate-500">{row.remaining}</span>
                  <select
                    value={row.condition}
                    onChange={(e) => updateReturnRow(index, { condition: e.target.value })}
                    className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="GOOD">Good</option>
                    <option value="DAMAGED">Damaged</option>
                  </select>
                  <input
                    type="checkbox"
                    checked={row.condition === "GOOD" && row.returnToStock}
                    disabled={row.condition !== "GOOD"}
                    onChange={(e) => updateReturnRow(index, { returnToStock: e.target.checked })}
                    className="h-4 w-4"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Refund Method</label>
              <select
                value={returnMethod}
                onChange={(e) => setReturnMethod(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Reason (optional)</label>
              <input
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {returnError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{returnError}</p>}

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setReturnModalOpen(false)}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            {returnRows.length > 0 && (
              <button
                onClick={submitReturn}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Record Return
              </button>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!cancelTarget}
        title="Cancel Sale"
        message={`This will restore the stock sold in ${cancelTarget?.saleNumber || ""}. This cannot be undone.`}
        confirmLabel="Cancel Sale"
        danger
        onConfirm={confirmCancel}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
}
