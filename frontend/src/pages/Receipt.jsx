import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Printer } from "lucide-react";
import saleApi from "../api/saleApi";
import Button from "../components/ui/Button";
import { formatCurrency, formatDateTime } from "../utils/currency";

export default function Receipt() {
  const { id } = useParams();
  const [sale, setSale] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    saleApi
      .getReceipt(id)
      .then(setSale)
      .catch((err) => setError(err.response?.data?.message || "Failed to load receipt"));
  }, [id]);

  if (error) {
    return <div className="p-8 text-sm text-red-600">{error}</div>;
  }

  if (!sale) {
    return <div className="p-8 text-sm text-slate-400">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-md p-6">
      <div className="mb-4 flex justify-end print:hidden">
        <Button icon={Printer} onClick={() => window.print()}>
          Print
        </Button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm">
        <div className="text-center">
          <h1 className="text-lg font-bold text-slate-800">AJ Stationery</h1>
          <p className="text-xs text-slate-500">Sales Receipt</p>
        </div>

        <div className="mt-4 space-y-1 border-t border-dashed border-slate-300 pt-3 text-xs text-slate-600">
          <p>Receipt #: {sale.saleNumber}</p>
          <p>Date: {formatDateTime(sale.saleDate)}</p>
          <p>Customer: {sale.customerName || "Walk-in Customer"}</p>
          {sale.customerPhone && <p>Phone: {sale.customerPhone}</p>}
        </div>

        <table className="mt-4 w-full border-t border-dashed border-slate-300 pt-2 text-xs">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-1">Item</th>
              <th className="py-1 text-right">Qty</th>
              <th className="py-1 text-right">Price</th>
              <th className="py-1 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item) => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="py-1">{item.product.name}</td>
                <td className="py-1 text-right">{item.quantity}</td>
                <td className="py-1 text-right">{formatCurrency(item.sellingPrice)}</td>
                <td className="py-1 text-right">{formatCurrency(item.totalAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3 space-y-1 border-t border-dashed border-slate-300 pt-3 text-xs">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(sale.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Discount</span>
            <span>{formatCurrency(sale.discount)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold text-slate-800">
            <span>Total</span>
            <span>{formatCurrency(sale.totalAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span>Paid ({sale.paymentMethod})</span>
            <span>{formatCurrency(sale.paidAmount)}</span>
          </div>
          {Number(sale.dueAmount) > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Due</span>
              <span>{formatCurrency(sale.dueAmount)}</span>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">Thank you for shopping with us!</p>
      </div>
    </div>
  );
}
