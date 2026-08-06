import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Scale, Award } from "lucide-react";
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
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [productId, setProductId] = useState("");
  const [requiredQty, setRequiredQty] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

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

  function openCreate() {
    setEditing(null);
    setFormError("");
    reset(emptyDefaults);
    setModalOpen(true);
  }

  function openEdit(quote) {
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
    const payload = { ...values, productId: Number(productId) };
    try {
      if (editing) {
        await supplierQuotationApi.update(editing.id, payload);
        showToast("Quotation updated");
      } else {
        await supplierQuotationApi.create(payload);
        showToast("Quotation added");
      }
      setModalOpen(false);
      loadComparison();
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to save quotation");
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
            <Button icon={Plus} disabled={!productId} onClick={openCreate}>
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
                <Button icon={Plus} onClick={openCreate}>
                  Add Supplier Quotation
                </Button>
              }
            />
          </div>
        ) : (
          <Table columns={columns} data={result.quotations} />
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Supplier Quotation" : "Add Supplier Quotation"}
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
