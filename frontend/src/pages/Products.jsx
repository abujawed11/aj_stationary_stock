import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, History, Search, PackageSearch, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import productApi from "../api/productApi";
import categoryApi from "../api/categoryApi";
import Table from "../components/Table";
import Pagination from "../components/Pagination";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import Button from "../components/ui/Button";
import IconButton from "../components/ui/IconButton";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Textarea from "../components/ui/Textarea";
import FormField from "../components/ui/FormField";
import PageHeader from "../components/ui/PageHeader";
import EmptyState from "../components/ui/EmptyState";
import { TableSkeleton } from "../components/ui/Skeleton";
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
        <div className="flex items-center gap-1">
          <IconButton icon={Pencil} title="Edit" onClick={() => openEdit(row)} />
          <IconButton icon={History} title="Stock ledger" onClick={() => openLedger(row)} />
          <button
            onClick={() => toggleStatus(row)}
            className="rounded-md px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50"
          >
            {row.isActive ? "Deactivate" : "Activate"}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle="Manage your product catalog and stock levels"
        action={
          <Button icon={Plus} onClick={openCreate}>
            Add Product
          </Button>
        }
      />

      <div className="mt-4 flex flex-wrap gap-3">
        <div className="w-64">
          <Input
            icon={Search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (setPage(1), loadProducts())}
            placeholder="Search name, SKU, barcode, brand..."
          />
        </div>
        <div className="w-48">
          <Select value={categoryId} onChange={(e) => (setPage(1), setCategoryId(e.target.value))}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-48">
          <Select value={stockStatus} onChange={(e) => (setPage(1), setStockStatus(e.target.value))}>
            <option value="">All stock levels</option>
            <option value="LOW">Low stock</option>
            <option value="OUT">Out of stock</option>
          </Select>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4">
        {loading ? (
          <TableSkeleton columns={columns.length} />
        ) : products.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white">
            <EmptyState
              icon={PackageSearch}
              title="No products found"
              message="Try adjusting your filters, or add your first product to get started."
              action={
                <Button icon={Plus} onClick={openCreate}>
                  Add Product
                </Button>
              }
            />
          </div>
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
              <FormField label="Name" error={errors.name} className="sm:col-span-2">
                <Input {...register("name")} error={errors.name} />
              </FormField>
              <FormField label="Category" error={errors.categoryId}>
                <Select {...register("categoryId")} error={errors.categoryId}>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Brand (optional)">
                <Input {...register("brand")} />
              </FormField>
              <FormField label="Barcode (optional)" className="sm:col-span-2">
                <Input {...register("barcode")} />
              </FormField>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Pricing &amp; Stock</h3>
            <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Selling Price" error={errors.sellingPrice}>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  prefix="₹"
                  onFocus={selectOnFocus}
                  error={errors.sellingPrice}
                  {...register("sellingPrice")}
                />
              </FormField>
              <FormField label="MRP (optional)">
                <Input type="number" step="0.01" min="0" prefix="₹" onFocus={selectOnFocus} {...register("mrp")} />
              </FormField>
              <FormField label="Unit">
                <Select {...register("unit")}>
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Minimum Stock">
                <Input type="number" min="0" onFocus={selectOnFocus} {...register("minimumStock")} />
              </FormField>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Purchase price isn't set here — it's automatically updated from what you actually pay when you record a purchase for this product.
            </p>
          </div>

          <FormField label="Description (optional)">
            <Textarea rows={2} {...register("description")} />
          </FormField>

          {formError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {editing ? "Save Changes" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!ledgerProduct} onClose={() => setLedgerProduct(null)} title={`Stock Ledger — ${ledgerProduct?.name || ""}`} maxWidth="max-w-2xl">
        <div className="space-y-2">
          {ledgerItems.length === 0 && (
            <EmptyState icon={History} title="No stock movements yet" />
          )}
          {ledgerItems.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                {m.quantityIn > 0 ? (
                  <ArrowUpCircle className="h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <ArrowDownCircle className="h-4 w-4 shrink-0 text-red-500" />
                )}
                <div>
                  <p className="font-medium text-slate-700">{m.movementType}</p>
                  <p className="text-xs text-slate-400">{formatDate(m.createdAt)} · {m.note}</p>
                </div>
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
