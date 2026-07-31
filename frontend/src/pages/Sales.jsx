import { useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, Eye, Printer, Undo2, IndianRupee, Receipt as ReceiptIcon } from "lucide-react";
import { Link } from "react-router-dom";
import saleApi from "../api/saleApi";
import salesReturnApi from "../api/salesReturnApi";
import productApi from "../api/productApi";
import Table from "../components/Table";
import Pagination from "../components/Pagination";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import ProductSearchSelect from "../components/ProductSearchSelect";
import Button from "../components/ui/Button";
import IconButton from "../components/ui/IconButton";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import FormField from "../components/ui/FormField";
import PageHeader from "../components/ui/PageHeader";
import EmptyState from "../components/ui/EmptyState";
import Badge from "../components/ui/Badge";
import { TableSkeleton } from "../components/ui/Skeleton";
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
  const tones = { PAID: "emerald", PARTIALLY_PAID: "amber", UNPAID: "red" };
  return <Badge tone={tones[status]}>{status.replace("_", " ")}</Badge>;
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
        <div className="flex items-center gap-1">
          <IconButton icon={Eye} title="View" onClick={() => openDetail(row)} />
          {(row.status === "COMPLETED" || row.status === "PARTIALLY_RETURNED") && (
            <IconButton icon={Undo2} title="Return items" onClick={async () => openReturn(await saleApi.getById(row.id))} />
          )}
          {row.status === "COMPLETED" && (
            <button onClick={() => setCancelTarget(row)} className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50">
              Cancel
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Sales"
        subtitle="Bill customers and track sales"
        action={
          <Button icon={Plus} onClick={openCreate}>
            New Sale
          </Button>
        }
      />

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4">
        {loading ? (
          <TableSkeleton columns={columns.length} />
        ) : sales.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white">
            <EmptyState
              icon={ReceiptIcon}
              title="No sales yet"
              message="Bill your first customer to see it here."
              action={
                <Button icon={Plus} onClick={openCreate}>
                  New Sale
                </Button>
              }
            />
          </div>
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
            <FormField label="Customer Name (optional)">
              <Input {...register("customerName")} />
            </FormField>
            <FormField label="Customer Phone (optional)">
              <Input {...register("customerPhone")} />
            </FormField>
            <FormField label="Payment Method">
              <Select {...register("paymentMethod")}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m.replace("_", " ")}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-700">Cart</label>
              <button
                type="button"
                onClick={() => append({ productId: "", quantity: 1, sellingPrice: 0 })}
                className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
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
                    <Input
                      type="number"
                      min="1"
                      aria-label="Quantity"
                      onFocus={selectOnFocus}
                      error={exceedsStock}
                      {...register(`items.${index}.quantity`)}
                    />
                    <span className={`text-sm ${exceedsStock ? "text-red-600" : "text-slate-500"}`}>
                      {selectedProduct ? selectedProduct.currentStock : "-"}
                    </span>
                    <Input type="number" min="0" step="0.01" aria-label="Selling price" onFocus={selectOnFocus} {...register(`items.${index}.sellingPrice`)} />
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
            <FormField label="Discount">
              <Input type="number" min="0" step="0.01" prefix="₹" onFocus={selectOnFocus} {...register("discount")} />
            </FormField>
            <FormField label="Paid Amount">
              <Input type="number" min="0" step="0.01" prefix="₹" onFocus={selectOnFocus} {...register("paidAmount")} />
            </FormField>
            <div className="col-span-2 flex flex-col justify-end">
              <p className="text-xs text-slate-500">Subtotal: {formatCurrency(subtotal)}</p>
              <p className="text-sm font-semibold text-slate-800">Total: {formatCurrency(totalAmount)}</p>
            </div>
          </div>

          {formError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Complete Sale
            </Button>
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
              <Button as={Link} to={`/sales/${detail.id}/receipt`} target="_blank" variant="secondary" icon={Printer}>
                Print Receipt
              </Button>
              {detail.status !== "CANCELLED" && Number(detail.dueAmount) > 0 && (
                <Button variant="secondary" icon={IndianRupee} onClick={openPaymentModal}>
                  Record Payment
                </Button>
              )}
              {(detail.status === "COMPLETED" || detail.status === "PARTIALLY_RETURNED") && (
                <Button variant="secondary" icon={Undo2} onClick={() => openReturn(detail)}>
                  Return Items
                </Button>
              )}
              {detail.status === "COMPLETED" && (
                <Button variant="danger" onClick={() => setCancelTarget(detail)}>
                  Cancel Sale
                </Button>
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
            <FormField label="Amount Received">
              <Input
                type="number"
                min="0"
                step="0.01"
                max={Number(detail.dueAmount)}
                prefix="₹"
                onFocus={selectOnFocus}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
              />
            </FormField>
            <FormField label="Payment Method">
              <Select value={paymentMethodInput} onChange={(e) => setPaymentMethodInput(e.target.value)}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m.replace("_", " ")}</option>
                ))}
              </Select>
            </FormField>

            {paymentError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{paymentError}</p>}

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setPaymentModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitPayment}>Record Payment</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={returnModalOpen} onClose={() => setReturnModalOpen(false)} title="Return Items" maxWidth="max-w-2xl">
        <div className="space-y-4 text-sm">
          {returnRows.length === 0 && (
            <EmptyState icon={Undo2} title="Nothing left to return" message="Everything on this sale has already been returned." />
          )}
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
                  <Input
                    type="number"
                    min="0"
                    max={row.remaining}
                    onFocus={selectOnFocus}
                    value={row.quantity}
                    onChange={(e) => updateReturnRow(index, { quantity: Number(e.target.value) })}
                    className="px-2 py-1.5"
                  />
                  <span className="text-slate-500">{row.remaining}</span>
                  <Select
                    value={row.condition}
                    onChange={(e) => updateReturnRow(index, { condition: e.target.value })}
                    className="px-2 py-1.5"
                  >
                    <option value="GOOD">Good</option>
                    <option value="DAMAGED">Damaged</option>
                  </Select>
                  <input
                    type="checkbox"
                    checked={row.condition === "GOOD" && row.returnToStock}
                    disabled={row.condition !== "GOOD"}
                    onChange={(e) => updateReturnRow(index, { returnToStock: e.target.checked })}
                    className="h-4 w-4 accent-brand-600"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Refund Method">
              <Select value={returnMethod} onChange={(e) => setReturnMethod(e.target.value)}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m.replace("_", " ")}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Reason (optional)">
              <Input value={returnReason} onChange={(e) => setReturnReason(e.target.value)} />
            </FormField>
          </div>

          {returnError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{returnError}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setReturnModalOpen(false)}>
              Cancel
            </Button>
            {returnRows.length > 0 && <Button onClick={submitReturn}>Record Return</Button>}
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
