import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Eye } from "lucide-react";
import supplierApi from "../api/supplierApi";
import Table from "../components/Table";
import Pagination from "../components/Pagination";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import { formatCurrency, formatDate } from "../utils/currency";
import { useToast } from "../context/ToastContext";

const supplierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.union([z.string().email(), z.literal("")]).optional(),
  address: z.string().optional(),
  gstNumber: z.string().optional(),
  notes: z.string().optional(),
});

export default function Suppliers() {
  const { showToast } = useToast();
  const [suppliers, setSuppliers] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [formError, setFormError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(supplierSchema) });

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await supplierApi.list({ page, search: search || undefined });
      setSuppliers(res.data);
      setMeta(res.meta);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function openCreate() {
    setEditing(null);
    setFormError("");
    reset({ name: "", contactPerson: "", phone: "", email: "", address: "", gstNumber: "", notes: "" });
    setModalOpen(true);
  }

  function openEdit(supplier) {
    setEditing(supplier);
    setFormError("");
    reset({
      name: supplier.name,
      contactPerson: supplier.contactPerson || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      gstNumber: supplier.gstNumber || "",
      notes: supplier.notes || "",
    });
    setModalOpen(true);
  }

  async function onSubmit(values) {
    setFormError("");
    const payload = { ...values, email: values.email || undefined };
    try {
      if (editing) {
        await supplierApi.update(editing.id, payload);
        showToast("Supplier updated");
      } else {
        await supplierApi.create(payload);
        showToast("Supplier created");
      }
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to save supplier");
      return;
    }
    setModalOpen(false);
    setPage(1);
    load();
  }

  async function toggleStatus(supplier) {
    try {
      await supplierApi.setStatus(supplier.id, !supplier.isActive);
      showToast(`Supplier ${supplier.isActive ? "deactivated" : "activated"}`);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update status", "error");
    }
  }

  async function openDetail(supplier) {
    const full = await supplierApi.getById(supplier.id);
    setDetail(full);
  }

  const columns = [
    { key: "name", header: "Name" },
    { key: "contactPerson", header: "Contact", render: (row) => row.contactPerson || "-" },
    { key: "phone", header: "Phone", render: (row) => row.phone || "-" },
    { key: "status", header: "Status", render: (row) => <StatusBadge active={row.isActive} /> },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex items-center gap-3">
          <button onClick={() => openDetail(row)} className="text-slate-500 hover:text-blue-600" title="View">
            <Eye className="h-4 w-4" />
          </button>
          <button onClick={() => openEdit(row)} className="text-slate-500 hover:text-blue-600" title="Edit">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={() => toggleStatus(row)} className="text-xs font-medium text-blue-600 hover:underline">
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
          <h1 className="text-xl font-semibold text-slate-800">Suppliers</h1>
          <p className="text-sm text-slate-500">Manage your stock suppliers</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Supplier
        </button>
      </div>

      <div className="mt-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (setPage(1), load())}
          placeholder="Search by name, contact, phone..."
          className="w-64 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4">
        {loading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : (
          <>
            <Table columns={columns} data={suppliers} />
            <Pagination meta={meta} onPageChange={setPage} />
          </>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Supplier" : "Add Supplier"} maxWidth="max-w-xl">
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700">Name</label>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              {...register("name")}
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Contact Person</label>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              {...register("contactPerson")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Phone</label>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              {...register("phone")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              {...register("email")}
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">GST Number</label>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              {...register("gstNumber")}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700">Address</label>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              {...register("address")}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700">Notes</label>
            <textarea
              rows={2}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              {...register("notes")}
            />
          </div>
          {formError && (
            <p className="sm:col-span-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>
          )}
          <div className="sm:col-span-2 flex justify-end gap-2">
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

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.name || ""} maxWidth="max-w-xl">
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-2 text-slate-600">
              <p><span className="text-slate-400">Contact:</span> {detail.contactPerson || "-"}</p>
              <p><span className="text-slate-400">Phone:</span> {detail.phone || "-"}</p>
              <p><span className="text-slate-400">Email:</span> {detail.email || "-"}</p>
              <p><span className="text-slate-400">GST:</span> {detail.gstNumber || "-"}</p>
            </div>
            <div className="rounded-md bg-amber-50 px-3 py-2 text-amber-700">
              Outstanding amount: <span className="font-semibold">{formatCurrency(detail.outstandingAmount)}</span>
            </div>
            <div>
              <p className="mb-2 font-medium text-slate-700">Recent purchases</p>
              {detail.recentPurchases.length === 0 && <p className="text-slate-400">No purchases yet.</p>}
              <div className="space-y-1.5">
                {detail.recentPurchases.map((p) => (
                  <div key={p.id} className="flex justify-between rounded-md border border-slate-100 px-3 py-1.5">
                    <span>{p.purchaseNumber} · {formatDate(p.purchaseDate)}</span>
                    <span>{formatCurrency(p.totalAmount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
