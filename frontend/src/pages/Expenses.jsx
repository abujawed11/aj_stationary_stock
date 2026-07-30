import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2 } from "lucide-react";
import expenseApi from "../api/expenseApi";
import Table from "../components/Table";
import Pagination from "../components/Pagination";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
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
        <div className="flex items-center gap-3">
          <button onClick={() => openEdit(row)} className="text-slate-500 hover:text-blue-600" title="Edit">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={() => setDeleteTarget(row)} className="text-slate-500 hover:text-red-600" title="Delete">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Expenses</h1>
          <p className="text-sm text-slate-500">Track shop expenses like rent, electricity, and salaries</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Expense
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (setPage(1), load())}
          placeholder="Search description..."
          className="w-56 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <select
          value={category}
          onChange={(e) => (setPage(1), setCategory(e.target.value))}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <div>
          <label className="block text-xs text-slate-500">From</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => (setPage(1), setStartDate(e.target.value))}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500">To</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => (setPage(1), setEndDate(e.target.value))}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4">
        {loading ? (
          <p className="text-sm text-slate-400">Loading...</p>
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
          <div>
            <label className="block text-sm font-medium text-slate-700">Category</label>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              {...register("category")}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Payment Method</label>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              {...register("paymentMethod")}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700">Description</label>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              {...register("description")}
            />
            {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Amount (₹)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              onFocus={selectOnFocus}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              {...register("amount")}
            />
            {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Date</label>
            <input
              type="date"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              {...register("expenseDate")}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700">Notes (optional)</label>
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
