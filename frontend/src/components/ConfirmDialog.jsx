import Modal from "./Modal";

export default function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", onConfirm, onCancel, danger = false }) {
  return (
    <Modal open={open} onClose={onCancel} title={title} maxWidth="max-w-sm">
      <p className="text-sm text-slate-600">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className={`rounded-md px-4 py-2 text-sm font-medium text-white ${
            danger ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
