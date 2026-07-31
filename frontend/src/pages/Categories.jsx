import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Search, Tags } from "lucide-react";
import categoryApi from "../api/categoryApi";
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
import { useToast } from "../context/ToastContext";

const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

export default function Categories() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formError, setFormError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(categorySchema) });

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await categoryApi.list({ page, limit, search: search || undefined });
      setCategories(res.data);
      setMeta(res.meta);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load categories");
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
    reset({ name: "", description: "" });
    setModalOpen(true);
  }

  function openEdit(category) {
    setEditing(category);
    setFormError("");
    reset({ name: category.name, description: category.description || "" });
    setModalOpen(true);
  }

  async function onSubmit(values) {
    setFormError("");
    try {
      if (editing) {
        await categoryApi.update(editing.id, values);
        showToast("Category updated");
      } else {
        await categoryApi.create(values);
        showToast("Category created");
      }
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to save category");
      return;
    }
    setModalOpen(false);
    setPage(1);
    load();
  }

  async function toggleStatus(category) {
    try {
      await categoryApi.setStatus(category.id, !category.isActive);
      showToast(`Category ${category.isActive ? "deactivated" : "activated"}`);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update status", "error");
    }
  }

  const columns = [
    { key: "name", header: "Name" },
    { key: "description", header: "Description", render: (row) => row.description || "-" },
    { key: "status", header: "Status", render: (row) => <StatusBadge active={row.isActive} /> },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex items-center gap-1">
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
        title="Categories"
        subtitle="Organize your products into categories"
        action={
          <Button icon={Plus} onClick={openCreate}>
            Add Category
          </Button>
        }
      />

      <div className="mt-4 w-full max-w-xs">
        <Input
          icon={Search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (setPage(1), load())}
          placeholder="Search by name..."
        />
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4">
        {loading ? (
          <TableSkeleton columns={columns.length} />
        ) : categories.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white">
            <EmptyState
              icon={Tags}
              title="No categories found"
              message="Add your first category to start organizing products."
              action={
                <Button icon={Plus} onClick={openCreate}>
                  Add Category
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <Table columns={columns} data={categories} />
            <Pagination meta={meta} onPageChange={setPage} pageSize={limit} onPageSizeChange={handlePageSizeChange} />
          </>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Category" : "Add Category"}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Name" error={errors.name}>
            <Input error={errors.name} {...register("name")} />
          </FormField>
          <FormField label="Description">
            <Textarea rows={3} {...register("description")} />
          </FormField>
          {formError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>}
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
    </div>
  );
}
