import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import stockAdjustmentApi from "../api/stockAdjustmentApi";
import productApi from "../api/productApi";
import Table from "../components/Table";
import Pagination from "../components/Pagination";
import Modal from "../components/Modal";
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Stock Adjustments</h1>
          <p className="text-sm text-slate-500">Manually add or deduct stock with a recorded reason</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          New Adjustment
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4">
        {loading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : (
          <>
            <Table columns={columns} data={adjustments} />
            <Pagination meta={meta} onPageChange={setPage} pageSize={limit} onPageSizeChange={handlePageSizeChange} />
          </>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Stock Adjustment" maxWidth="max-w-lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Product</label>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              {...register("productId")}
            >
              <option value="">Select product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
            {selectedProduct && (
              <p className="mt-1 text-xs text-slate-500">Current stock: {selectedProduct.currentStock} {selectedProduct.unit}</p>
            )}
            {errors.productId && <p className="mt-1 text-xs text-red-600">{errors.productId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Adjustment Type</label>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                {...register("adjustmentType")}
              >
                {ADJUSTMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Direction</label>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                {...register("direction")}
              >
                <option value="IN">IN (add stock)</option>
                <option value="OUT">OUT (remove stock)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Quantity</label>
            <input
              type="number"
              min="1"
              onFocus={selectOnFocus}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              {...register("quantity")}
            />
            {errors.quantity && <p className="mt-1 text-xs text-red-600">{errors.quantity.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Reason</label>
            <textarea
              rows={3}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              {...register("reason")}
            />
            {errors.reason && <p className="mt-1 text-xs text-red-600">{errors.reason.message}</p>}
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
              Save Adjustment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
