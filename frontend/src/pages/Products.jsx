import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, History } from "lucide-react";
import productApi from "../api/productApi";
import categoryApi from "../api/categoryApi";
import Table from "../components/Table";
import Pagination from "../components/Pagination";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import { formatCurrency, formatDate, formatDateTime } from "../utils/currency";
import { selectOnFocus } from "../utils/formHelpers";
import { useToast } from "../context/ToastContext";

const UNITS = ["PIECE", "PACKET", "BOX", "DOZEN", "REAM", "SET", "BOTTLE", "ROLL"];

const productSchema = z.object({
  barcode: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  categoryId: z.coerce.number().int().positive("Category is required"),
  brand: z.string().optional(),
  unit: z.enum(UNITS),
  sellingPrice: z.coerce.number().nonnegative("Cannot be negative"),
  mrp: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? undefined : val),
    z.coerce.number().nonnegative().optional()
  ),
  minimumStock: z.coerce.number().int().nonnegative().optional().default(0),
});

function stockLabel(product) {
  if (product.currentStock === 0) return { text: "Out of stock", className: "text-red-600" };
  if (product.currentStock <= product.minimumStock) return { text: "Low stock", className: "text-amber-600" };
  return { text: "In stock", className: "text-emerald-600" };
}

export default function Products() {
  const { showToast } = useToast();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [stockStatus, setStockStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [ledgerProduct, setLedgerProduct] = useState(null);
  const [ledgerItems, setLedgerItems] = useState([]);
  const [formError, setFormError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(productSchema) });

  async function loadCategories() {
    const res = await categoryApi.list({ limit: 100, isActive: true });
    setCategories(res.data);
  }

  async function loadProducts() {
    setLoading(true);
    setError("");
    try {
      const res = await productApi.list({
        page,
        limit,
        search: search || undefined,
        categoryId: categoryId || undefined,
        stockStatus: stockStatus || undefined,
      });
      setProducts(res.data);
      setMeta(res.meta);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, categoryId, stockStatus]);

  function handlePageSizeChange(size) {
    setLimit(size);
    setPage(1);
  }

  function openCreate() {
    setEditing(null);
    setFormError("");
    reset({
      barcode: "",
      name: "",
      description: "",
      categoryId: categories[0]?.id || "",
      brand: "",
      unit: "PIECE",
      sellingPrice: 0,
      mrp: "",
      minimumStock: 0,
    });
    setModalOpen(true);
  }

  function openEdit(product) {
    setEditing(product);
    setFormError("");
    reset({
      barcode: product.barcode || "",
      name: product.name,
      description: product.description || "",
      categoryId: product.categoryId,
      brand: product.brand || "",
      unit: product.unit,
      sellingPrice: Number(product.sellingPrice),
      mrp: product.mrp ? Number(product.mrp) : "",
      minimumStock: product.minimumStock,
    });
    setModalOpen(true);
  }

  async function onSubmit(values) {
    setFormError("");
    const payload = {
      ...values,
      mrp: values.mrp === "" ? undefined : values.mrp,
      barcode: values.barcode || undefined,
      brand: values.brand || undefined,
      description: values.description || undefined,
    };
    try {
      if (editing) {
        await productApi.update(editing.id, payload);
        showToast("Product updated");
      } else {
        await productApi.create(payload);
        showToast("Product created");
      }
      setModalOpen(false);
      setPage(1);
      loadProducts();
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to save product");
    }
  }

  async function toggleStatus(product) {
    try {
      await productApi.setStatus(product.id, !product.isActive);
      showToast(`Product ${product.isActive ? "deactivated" : "activated"}`);
      loadProducts();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update status", "error");
    }
  }

  async function openLedger(product) {
    setLedgerProduct(product);
    const res = await productApi.getStockLedger(product.id, { limit: 20 });
    setLedgerItems(res.data);
  }

  const columns = [
    { key: "sku", header: "SKU" },
    { key: "name", header: "Name" },
    { key: "category", header: "Category", render: (row) => row.category?.name || "-" },
    { key: "unit", header: "Unit" },
    { key: "purchasePrice", header: "Purchase", render: (row) => formatCurrency(row.purchasePrice) },
    { key: "sellingPrice", header: "Selling", render: (row) => formatCurrency(row.sellingPrice) },
    {
      key: "stock",
      header: "Stock",
      render: (row) => {
        const label = stockLabel(row);
        return (
          <div>
            <span className="font-medium">{row.currentStock}</span>
            <span className={`ml-2 text-xs ${label.className}`}>{label.text}</span>
          </div>
        );
      },
    },
    { key: "status", header: "Status", render: (row) => <StatusBadge active={row.isActive} /> },
    { key: "updatedAt", header: "Last Updated", render: (row) => formatDateTime(row.updatedAt) },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex items-center gap-3">
          <button onClick={() => openEdit(row)} className="text-slate-500 hover:text-blue-600" title="Edit">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={() => openLedger(row)} className="text-slate-500 hover:text-blue-600" title="Stock ledger">
            <History className="h-4 w-4" />
          </button>
          <button
            onClick={() => toggleStatus(row)}
            className="text-xs font-medium text-blue-600 hover:underline"
          >
            {row.isActive ? "Deactivate" : "Activate"}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Products</h1>
          <p className="text-sm text-slate-500">Manage your product catalog and stock levels</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (setPage(1), loadProducts())}
          placeholder="Search name, SKU, barcode, brand..."
          className="w-64 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <select
          value={categoryId}
          onChange={(e) => (setPage(1), setCategoryId(e.target.value))}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={stockStatus}
          onChange={(e) => (setPage(1), setStockStatus(e.target.value))}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All stock levels</option>
          <option value="LOW">Low stock</option>
          <option value="OUT">Out of stock</option>
        </select>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4">
        {loading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : (
          <>
            <Table columns={columns} data={products} />
            <Pagination meta={meta} onPageChange={setPage} pageSize={limit} onPageSizeChange={handlePageSizeChange} />
          </>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Product" : "Add Product"} maxWidth="max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Basic Info</h3>
            <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Name</label>
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  {...register("name")}
                />
                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Category</label>
                <select
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  {...register("categoryId")}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {errors.categoryId && <p className="mt-1 text-xs text-red-600">{errors.categoryId.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Brand (optional)</label>
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  {...register("brand")}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Barcode (optional)</label>
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  {...register("barcode")}
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Pricing &amp; Stock</h3>
            <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Selling Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  onFocus={selectOnFocus}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  {...register("sellingPrice")}
                />
                {errors.sellingPrice && <p className="mt-1 text-xs text-red-600">{errors.sellingPrice.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">MRP (optional)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  onFocus={selectOnFocus}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  {...register("mrp")}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Unit</label>
                <select
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  {...register("unit")}
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Minimum Stock</label>
                <input
                  type="number"
                  min="0"
                  onFocus={selectOnFocus}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  {...register("minimumStock")}
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Purchase price isn't set here — it's automatically updated from what you actually pay when you record a purchase for this product.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Description (optional)</label>
            <textarea
              rows={2}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              {...register("description")}
            />
          </div>

          {formError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>
          )}

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
              {editing ? "Save Changes" : "Create"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!ledgerProduct} onClose={() => setLedgerProduct(null)} title={`Stock Ledger — ${ledgerProduct?.name || ""}`} maxWidth="max-w-2xl">
        <div className="space-y-2">
          {ledgerItems.length === 0 && <p className="text-sm text-slate-400">No stock movements yet.</p>}
          {ledgerItems.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2 text-sm">
              <div>
                <p className="font-medium text-slate-700">{m.movementType}</p>
                <p className="text-xs text-slate-400">{formatDate(m.createdAt)} · {m.note}</p>
              </div>
              <div className="text-right">
                <p className={m.quantityIn > 0 ? "text-emerald-600" : "text-red-600"}>
                  {m.quantityIn > 0 ? `+${m.quantityIn}` : `-${m.quantityOut}`}
                </p>
                <p className="text-xs text-slate-400">{m.stockBefore} → {m.stockAfter}</p>
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
