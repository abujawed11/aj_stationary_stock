import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Eye, Search, Truck, Mail, Phone, FileText, Landmark } from "lucide-react";
import supplierApi from "../api/supplierApi";
import Table from "../components/Table";
import Pagination from "../components/Pagination";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import Button from "../components/ui/Button";
import IconButton from "../components/ui/IconButton";
import Input from "../components/ui/Input";
import Textarea from "../components/ui/Textarea";
import FormField from "../components/ui/FormField";
import PageHeader from "../components/ui/PageHeader";
import EmptyState from "../components/ui/EmptyState";
import { TableSkeleton } from "../components/ui/Skeleton";
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
  const [limit, setLimit] = useState(20);
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
      const res = await supplierApi.list({ page, limit, search: search || undefined });
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
  }, [page, limit]);

  function handlePageSizeChange(size) {
    setLimit(size);
    setPage(1);
  }

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
        <div className="flex items-center gap-1">
          <IconButton icon={Eye} title="View" onClick={() => openDetail(row)} />
          <IconButton icon={Pencil} title="Edit" onClick={() => openEdit(row)} />
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
        title="Suppliers"
        subtitle="Manage your stock suppliers"
        action={
          <Button icon={Plus} onClick={openCreate}>
            Add Supplier
          </Button>
        }
      />

      <div className="mt-4 w-64">
        <Input
          icon={Search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (setPage(1), load())}
          placeholder="Search by name, contact, phone..."
        />
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4">
        {loading ? (
          <TableSkeleton columns={columns.length} />
        ) : suppliers.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white">
            <EmptyState
              icon={Truck}
              title="No suppliers found"
              message="Add your first supplier to start recording purchases."
              action={
                <Button icon={Plus} onClick={openCreate}>
                  Add Supplier
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <Table columns={columns} data={suppliers} />
            <Pagination meta={meta} onPageChange={setPage} pageSize={limit} onPageSizeChange={handlePageSizeChange} />
          </>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Supplier" : "Add Supplier"} maxWidth="max-w-xl">
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Name" error={errors.name} className="sm:col-span-2">
            <Input error={errors.name} {...register("name")} />
          </FormField>
          <FormField label="Contact Person">
            <Input {...register("contactPerson")} />
          </FormField>
          <FormField label="Phone">
            <Input icon={Phone} {...register("phone")} />
          </FormField>
          <FormField label="Email" error={errors.email}>
            <Input icon={Mail} error={errors.email} {...register("email")} />
          </FormField>
          <FormField label="GST Number">
            <Input icon={FileText} {...register("gstNumber")} />
          </FormField>
          <FormField label="Address" className="sm:col-span-2">
            <Input icon={Landmark} {...register("address")} />
          </FormField>
          <FormField label="Notes" className="sm:col-span-2">
            <Textarea rows={2} {...register("notes")} />
          </FormField>
          {formError && (
            <p className="sm:col-span-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>
          )}
          <div className="sm:col-span-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {editing ? "Save Changes" : "Create"}
            </Button>
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
