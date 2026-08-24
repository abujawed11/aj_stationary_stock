import { useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, Eye, Pencil, IndianRupee, ShoppingCart } from "lucide-react";
import purchaseApi from "../api/purchaseApi";
import supplierApi from "../api/supplierApi";
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
import Textarea from "../components/ui/Textarea";
import FormField from "../components/ui/FormField";
import PageHeader from "../components/ui/PageHeader";
import EmptyState from "../components/ui/EmptyState";
import Badge from "../components/ui/Badge";
import { TableSkeleton } from "../components/ui/Skeleton";
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
  const tones = { PAID: "emerald", PARTIALLY_PAID: "amber", UNPAID: "red" };
  return <Badge tone={tones[status]}>{status.replace("_", " ")}</Badge>;
}

export default function Purchases() {
  const { showToast } = useToast();
  const [purchases, setPurchases] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [formError, setFormError] = useState("");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethodInput, setPaymentMethodInput] = useState("CASH");
  const [paymentError, setPaymentError] = useState("");

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
      const res = await purchaseApi.list({ page, limit });
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
  }, [page, limit]);

  function handlePageSizeChange(size) {
    setLimit(size);
    setPage(1);
  }

  async function openCreate() {
    setFormError("");
    setEditingId(null);
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

  async function openEdit(row) {
    setFormError("");
    const [supplierRes, productRes, purchase] = await Promise.all([
      supplierApi.list({ limit: 100, isActive: true }),
      productApi.list({ limit: 200, isActive: true }),
      purchaseApi.getById(row.id),
    ]);
    setSuppliers(supplierRes.data);
    setProducts(productRes.data);
    setEditingId(purchase.id);
    reset({
      supplierId: purchase.supplierId || "",
      invoiceNumber: purchase.invoiceNumber || "",
      paymentMethod: purchase.paymentMethod,
      discount: Number(purchase.discount),
      additionalCost: Number(purchase.additionalCost),
      paidAmount: Number(purchase.paidAmount),
      notes: purchase.notes || "",
      items: purchase.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitCost: Number(item.unitCost),
      })),
    });
    setDetail(null);
    setModalOpen(true);
  }

  async function onSubmit(values) {
    setFormError("");
    try {
      const payload = {
        ...values,
        supplierId: values.supplierId || undefined,
      };
      if (editingId) {
        await purchaseApi.update(editingId, payload);
        showToast("Purchase updated successfully");
      } else {
        await purchaseApi.create(payload);
        showToast("Purchase completed successfully");
      }
      setModalOpen(false);
      setEditingId(null);
      setPage(1);
      load();
    } catch (err) {
      setFormError(err.response?.data?.message || `Failed to ${editingId ? "update" : "create"} purchase`);
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

  function openPaymentModal() {
    setPaymentAmount(Number(detail.dueAmount));
    setPaymentMethodInput(detail.paymentMethod);
    setPaymentError("");
    setPaymentModalOpen(true);
  }

  async function submitPayment() {
    setPaymentError("");
    try {
      const updated = await purchaseApi.recordPayment(detail.id, {
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

  const columns = [
    { key: "purchaseNumber", header: "Purchase #" },
    { key: "supplier", header: "Supplier", render: (row) => row.supplier?.name || "-" },
    { key: "purchaseDate", header: "Date", render: (row) => formatDate(row.purchaseDate) },
    { key: "totalAmount", header: "Total", render: (row) => formatCurrency(row.totalAmount) },
    { key: "paymentStatus", header: "Payment", render: (row) => <PaymentStatusBadge status={row.paymentStatus} /> },
    {
      key: "status",
      header: "Status",
      render: (row) => <Badge tone={row.status === "CANCELLED" ? "red" : "emerald"}>{row.status}</Badge>,
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex items-center gap-1">
          <IconButton icon={Eye} title="View" onClick={() => openDetail(row)} />
          {row.status === "COMPLETED" && (
            <>
              <IconButton icon={Pencil} title="Edit" onClick={() => openEdit(row)} />
              <button onClick={() => setCancelTarget(row)} className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50">
                Cancel
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Purchases"
        subtitle="Record stock purchased from suppliers"
        action={
          <Button icon={Plus} onClick={openCreate}>
            New Purchase
          </Button>
        }
      />

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4">
        {loading ? (
          <TableSkeleton columns={columns.length} />
        ) : purchases.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white">
            <EmptyState
              icon={ShoppingCart}
              title="No purchases yet"
              message="Record a purchase to start adding stock."
              action={
                <Button icon={Plus} onClick={openCreate}>
                  New Purchase
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <Table columns={columns} data={purchases} />
            <Pagination meta={meta} onPageChange={setPage} pageSize={limit} onPageSizeChange={handlePageSizeChange} />
          </>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingId(null);
        }}
        title={editingId ? "Edit Purchase" : "New Purchase"}
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label="Supplier (optional)">
              <Select {...register("supplierId")}>
                <option value="">No supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Invoice Number">
              <Input {...register("invoiceNumber")} />
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
              <label className="block text-sm font-medium text-slate-700">Items</label>
              <button
                type="button"
                onClick={() => append({ productId: "", quantity: 1, unitCost: 0 })}
                className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
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
                    <Controller
                      control={control}
                      name={`items.${index}.productId`}
                      render={({ field: controllerField }) => (
                        <ProductSearchSelect
                          products={products}
                          value={controllerField.value}
                          onChange={controllerField.onChange}
                        />
                      )}
                    />
                    <Input type="number" min="1" aria-label="Quantity" onFocus={selectOnFocus} {...register(`items.${index}.quantity`)} />
                    <span className="flex h-full items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                      {selectedProduct?.unit || "-"}
                    </span>
                    <Input type="number" min="0" step="0.01" aria-label="Unit cost" onFocus={selectOnFocus} {...register(`items.${index}.unitCost`)} />
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
            <FormField label="Additional Cost">
              <Input type="number" min="0" step="0.01" prefix="₹" onFocus={selectOnFocus} {...register("additionalCost")} />
            </FormField>
            <FormField label="Paid Amount">
              <Input type="number" min="0" step="0.01" prefix="₹" onFocus={selectOnFocus} {...register("paidAmount")} />
            </FormField>
            <div className="flex flex-col justify-end">
              <p className="text-xs text-slate-500">Subtotal: {formatCurrency(subtotal)}</p>
              <p className="text-sm font-semibold text-slate-800">Total: {formatCurrency(totalAmount)}</p>
            </div>
          </div>

          <FormField label="Notes">
            <Textarea rows={2} {...register("notes")} />
          </FormField>

          {formError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setModalOpen(false);
                setEditingId(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {editingId ? "Save Changes" : "Complete Purchase"}
            </Button>
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
            <div className="flex flex-wrap justify-end gap-2">
              {detail.status !== "CANCELLED" && Number(detail.dueAmount) > 0 && (
                <Button variant="secondary" icon={IndianRupee} onClick={openPaymentModal}>
                  Record Payment
                </Button>
              )}
              {detail.status === "COMPLETED" && (
                <>
                  <Button variant="secondary" icon={Pencil} onClick={() => openEdit(detail)}>
                    Edit
                  </Button>
                  <Button variant="danger" onClick={() => setCancelTarget(detail)}>
                    Cancel Purchase
                  </Button>
                </>
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
            <FormField label="Amount Paid">
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
