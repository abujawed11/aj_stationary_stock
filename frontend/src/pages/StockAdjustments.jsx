import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, ArrowDownCircle, ArrowUpCircle, SlidersHorizontal } from "lucide-react";
import stockAdjustmentApi from "../api/stockAdjustmentApi";
import productApi from "../api/productApi";
import Table from "../components/Table";
import Pagination from "../components/Pagination";
import Modal from "../components/Modal";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Textarea from "../components/ui/Textarea";
import FormField from "../components/ui/FormField";
import PageHeader from "../components/ui/PageHeader";
import EmptyState from "../components/ui/EmptyState";
import { TableSkeleton } from "../components/ui/Skeleton";
import { formatDateTime } from "../utils/currency";
import { selectOnFocus } from "../utils/formHelpers";
import { useToast } from "../context/ToastContext";

const ADJUSTMENT_TYPES = ["OPENING_STOCK", "DAMAGED", "LOST", "PERSONAL_USE", "FREE_SAMPLE", "STOCK_CORRECTION", "OTHER"];
const DIRECTIONS = ["IN", "OUT"];

const adjustmentSchema = z.object({
  productId: z.coerce.number().int().positive("Select a product"),
  adjustmentType: z.enum(ADJUSTMENT_TYPES),
  direction: z.enum(DIRECTIONS),
  quantity: z.coerce.number().int().positive("Quantity must be greater than 0"),
  reason: z.string().min(1, "Reason is required"),
});

function DirectionBadge({ direction }) {
  const isIn = direction === "IN";
  const Icon = isIn ? ArrowUpCircle : ArrowDownCircle;
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${isIn ? "text-emerald-600" : "text-red-600"}`}>
      <Icon className="h-3.5 w-3.5" />
      {direction}
    </span>
  );
}

export default function StockAdjustments() {
  const { showToast } = useToast();
  const [adjustments, setAdjustments] = useState([]);
  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: { productId: "", adjustmentType: "STOCK_CORRECTION", direction: "IN", quantity: 1, reason: "" },
  });

  const watchedProductId = watch("productId");
  const selectedProduct = products.find((p) => String(p.id) === String(watchedProductId));

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await stockAdjustmentApi.list({ page, limit });
      setAdjustments(res.data);
      setMeta(res.meta);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load stock adjustments");
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
    const res = await productApi.list({ limit: 200, isActive: true });
    setProducts(res.data);
    reset({ productId: "", adjustmentType: "STOCK_CORRECTION", direction: "IN", quantity: 1, reason: "" });
    setModalOpen(true);
  }

  async function onSubmit(values) {
    setFormError("");
    try {
      await stockAdjustmentApi.create(values);
      showToast("Stock adjustment recorded");
      setModalOpen(false);
      setPage(1);
      load();
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to record adjustment");
    }
  }

  const columns = [
    { key: "adjustmentNumber", header: "Adjustment #" },
    { key: "product", header: "Product", render: (row) => row.product.name },
    { key: "adjustmentType", header: "Type", render: (row) => row.adjustmentType.replace(/_/g, " ") },
    { key: "direction", header: "Direction", render: (row) => <DirectionBadge direction={row.direction} /> },
    { key: "quantity", header: "Qty" },
    { key: "stockChange", header: "Stock", render: (row) => `${row.stockBefore} → ${row.stockAfter}` },
    { key: "reason", header: "Reason" },
    { key: "createdAt", header: "Date", render: (row) => formatDateTime(row.createdAt) },
  ];

  return (
    <div>
      <PageHeader
        title="Stock Adjustments"
        subtitle="Manually add or deduct stock with a recorded reason"
        action={
          <Button icon={Plus} onClick={openCreate}>
            New Adjustment
          </Button>
        }
      />

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4">
        {loading ? (
          <TableSkeleton columns={columns.length} />
        ) : adjustments.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white">
            <EmptyState
              icon={SlidersHorizontal}
              title="No stock adjustments yet"
              message="Record damages, losses, or corrections here."
              action={
                <Button icon={Plus} onClick={openCreate}>
                  New Adjustment
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <Table columns={columns} data={adjustments} />
            <Pagination meta={meta} onPageChange={setPage} pageSize={limit} onPageSizeChange={handlePageSizeChange} />
          </>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Stock Adjustment" maxWidth="max-w-lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            label="Product"
            error={errors.productId}
            hint={selectedProduct ? `Current stock: ${selectedProduct.currentStock} ${selectedProduct.unit}` : undefined}
          >
            <Select error={errors.productId} {...register("productId")}>
              <option value="">Select product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </Select>
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Adjustment Type">
              <Select {...register("adjustmentType")}>
                {ADJUSTMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Direction">
              <Select {...register("direction")}>
                <option value="IN">IN (add stock)</option>
                <option value="OUT">OUT (remove stock)</option>
              </Select>
            </FormField>
          </div>

          <FormField label="Quantity" error={errors.quantity}>
            <Input type="number" min="1" onFocus={selectOnFocus} error={errors.quantity} {...register("quantity")} />
          </FormField>

          <FormField label="Reason" error={errors.reason}>
            <Textarea rows={3} error={errors.reason} {...register("reason")} />
          </FormField>

          {formError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Save Adjustment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
