import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Search, Wallet } from "lucide-react";
import expenseApi from "../api/expenseApi";
import Table from "../components/Table";
import Pagination from "../components/Pagination";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import Button from "../components/ui/Button";
import IconButton from "../components/ui/IconButton";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Textarea from "../components/ui/Textarea";
import FormField from "../components/ui/FormField";
import PageHeader from "../components/ui/PageHeader";
import EmptyState from "../components/ui/EmptyState";
import { TableSkeleton } from "../components/ui/Skeleton";
import { formatCurrency, formatDate } from "../utils/currency";
import { selectOnFocus } from "../utils/formHelpers";
import { useToast } from "../context/ToastContext";

const CATEGORIES = ["RENT", "ELECTRICITY", "INTERNET", "TRANSPORT", "PACKAGING", "REPAIR", "FURNITURE", "SALARY", "MISCELLANEOUS"];
const PAYMENT_METHODS = ["CASH", "UPI", "BANK_TRANSFER", "OTHER"];

const expenseSchema = z.object({
  category: z.enum(CATEGORIES),
  description: z.string().min(1, "Description is required"),
  amount: z.coerce.number().nonnegative("Amount cannot be negative"),
  expenseDate: z.string().optional(),
  paymentMethod: z.enum(PAYMENT_METHODS),
  notes: z.string().optional(),
});

function toDateInputValue(value) {
  return new Date(value).toISOString().slice(0, 10);
}

export default function Expenses() {
  const { showToast } = useToast();
  const [expenses, setExpenses] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formError, setFormError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(expenseSchema) });

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await expenseApi.list({
        page,
        limit,
        search: search || undefined,
        category: category || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setExpenses(res.data);
      setMeta(res.meta);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, category, startDate, endDate]);

  function handlePageSizeChange(size) {
    setLimit(size);
    setPage(1);
  }

  function openCreate() {
    setEditing(null);
    setFormError("");
    reset({
      category: "MISCELLANEOUS",
      description: "",
      amount: 0,
      expenseDate: toDateInputValue(new Date()),
      paymentMethod: "CASH",
      notes: "",
    });
    setModalOpen(true);
  }

  function openEdit(expense) {
    setEditing(expense);
    setFormError("");
    reset({
      category: expense.category,
      description: expense.description,
      amount: Number(expense.amount),
      expenseDate: toDateInputValue(expense.expenseDate),
      paymentMethod: expense.paymentMethod,
      notes: expense.notes || "",
    });
    setModalOpen(true);
  }

  async function onSubmit(values) {
    setFormError("");
    try {
      if (editing) {
        await expenseApi.update(editing.id, values);
        showToast("Expense updated");
      } else {
        await expenseApi.create(values);
        showToast("Expense created");
      }
      setModalOpen(false);
      setPage(1);
      load();
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to save expense");
    }
  }

  async function confirmDelete() {
    try {
      await expenseApi.remove(deleteTarget.id);
      showToast("Expense deleted");
      setDeleteTarget(null);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to delete expense", "error");
    }
  }

  const totalOnPage = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const columns = [
    { key: "expenseNumber", header: "Expense #" },
    { key: "category", header: "Category", render: (row) => row.category.replace(/_/g, " ") },
    { key: "description", header: "Description" },
    { key: "amount", header: "Amount", render: (row) => formatCurrency(row.amount) },
    { key: "paymentMethod", header: "Payment" },
    { key: "expenseDate", header: "Date", render: (row) => formatDate(row.expenseDate) },
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
        title="Expenses"
        subtitle="Track shop expenses like rent, electricity, and salaries"
        action={
          <Button icon={Plus} onClick={openCreate}>
            Add Expense
          </Button>
        }
      />

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="w-56">
          <Input
            icon={Search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (setPage(1), load())}
            placeholder="Search description..."
          />
        </div>
        <div className="w-48">
          <Select value={category} onChange={(e) => (setPage(1), setCategory(e.target.value))}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, " ")}
              </option>
            ))}
          </Select>
        </div>
        <FormField label="From">
          <Input type="date" value={startDate} onChange={(e) => (setPage(1), setStartDate(e.target.value))} />
        </FormField>
        <FormField label="To">
          <Input type="date" value={endDate} onChange={(e) => (setPage(1), setEndDate(e.target.value))} />
        </FormField>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4">
        {loading ? (
          <TableSkeleton columns={columns.length} />
        ) : expenses.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white">
            <EmptyState
              icon={Wallet}
              title="No expenses found"
              message="Add your first expense to start tracking costs."
              action={
                <Button icon={Plus} onClick={openCreate}>
                  Add Expense
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <Table columns={columns} data={expenses} />
            <p className="mt-2 text-sm text-slate-500">Total on this page: {formatCurrency(totalOnPage)}</p>
            <Pagination meta={meta} onPageChange={setPage} pageSize={limit} onPageSizeChange={handlePageSizeChange} />
          </>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Expense" : "Add Expense"} maxWidth="max-w-lg">
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Category">
            <Select {...register("category")}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/_/g, " ")}
                </option>
              ))}
            </Select>
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
          <FormField label="Description" error={errors.description} className="sm:col-span-2">
            <Input error={errors.description} {...register("description")} />
          </FormField>
          <FormField label="Amount" error={errors.amount}>
            <Input type="number" min="0" step="0.01" prefix="₹" onFocus={selectOnFocus} error={errors.amount} {...register("amount")} />
          </FormField>
          <FormField label="Date">
            <Input type="date" {...register("expenseDate")} />
          </FormField>
          <FormField label="Notes (optional)" className="sm:col-span-2">
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

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Expense"
        message={`Delete expense ${deleteTarget?.expenseNumber || ""}? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
