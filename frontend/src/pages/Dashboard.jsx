import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  TrendingUp,
  Receipt,
  Banknote,
  Smartphone,
  Package,
  Boxes,
  Wallet,
  AlertTriangle,
  PackageX,
  CalendarDays,
  TrendingDown,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import dashboardApi from "../api/dashboardApi";
import StatCard from "../components/StatCard";
import { formatCurrency, formatDateTime } from "../utils/currency";

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [recentSales, setRecentSales] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [chartDays, setChartDays] = useState(7);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadCore() {
    setLoading(true);
    setError("");
    try {
      const [summaryRes, recentRes, lowStockRes] = await Promise.all([
        dashboardApi.getSummary(),
        dashboardApi.getRecentSales(8),
        dashboardApi.getLowStock(8),
      ]);
      setSummary(summaryRes);
      setRecentSales(recentRes);
      setLowStock(lowStockRes);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  async function loadChart(days) {
    const res = await dashboardApi.getSalesChart(days);
    setChartData(res.map((d) => ({ ...d, label: d.date.slice(5) })));
  }

  useEffect(() => {
    loadCore();
  }, []);

  useEffect(() => {
    loadChart(chartDays);
  }, [chartDays]);

  if (loading) {
    return <p className="text-sm text-slate-400">Loading dashboard...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-800">Dashboard</h1>
      <p className="text-sm text-slate-500">Welcome, {user?.name}</p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Today's Sales" value={formatCurrency(summary.today.totalSales)} icon={TrendingUp} tone="blue" />
        <StatCard label="Today's Profit" value={formatCurrency(summary.today.grossProfit)} icon={TrendingUp} tone="emerald" />
        <StatCard label="Today's Transactions" value={summary.today.transactionCount} icon={Receipt} tone="slate" />
        <StatCard label="Cash Collected Today" value={formatCurrency(summary.today.cashCollected)} icon={Banknote} tone="emerald" />
        <StatCard label="UPI Collected Today" value={formatCurrency(summary.today.upiCollected)} icon={Smartphone} tone="blue" />
        <StatCard label="Total Products" value={summary.products.totalProducts} icon={Package} tone="slate" />
        <StatCard label="Total Stock Qty" value={summary.products.totalStockQuantity} icon={Boxes} tone="slate" />
        <StatCard label="Stock Purchase Value" value={formatCurrency(summary.products.stockPurchaseValue)} icon={Wallet} tone="slate" />
        <StatCard label="Retail Stock Value" value={formatCurrency(summary.products.estimatedRetailStockValue)} icon={Wallet} tone="blue" />
        <StatCard label="Low Stock Items" value={summary.products.lowStockCount} icon={AlertTriangle} tone="amber" />
        <StatCard label="Out of Stock Items" value={summary.products.outOfStockCount} icon={PackageX} tone="red" />
        <StatCard label="This Month's Sales" value={formatCurrency(summary.month.sales)} icon={CalendarDays} tone="blue" />
        <StatCard label="This Month's Expenses" value={formatCurrency(summary.month.expenses)} icon={TrendingDown} tone="red" />
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Sales Trend</h2>
          <div className="flex gap-1">
            {[7, 30].map((d) => (
              <button
                key={d}
                onClick={() => setChartDays(d)}
                className={`rounded-md px-3 py-1 text-xs font-medium ${
                  chartDays === d ? "bg-blue-600 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {d} days
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Line type="monotone" dataKey="totalSales" stroke="#2563eb" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-700">Recent Sales</h2>
          <div className="mt-3 space-y-2">
            {recentSales.length === 0 && <p className="text-sm text-slate-400">No sales yet.</p>}
            {recentSales.map((sale) => (
              <div key={sale.id} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-slate-700">{sale.saleNumber}</p>
                  <p className="text-xs text-slate-400">{sale.customerName || "Walk-in"} · {formatDateTime(sale.saleDate)}</p>
                </div>
                <span className="font-medium text-slate-700">{formatCurrency(sale.totalAmount)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-700">Low Stock Products</h2>
          <div className="mt-3 space-y-2">
            {lowStock.length === 0 && <p className="text-sm text-slate-400">Nothing is low on stock.</p>}
            {lowStock.map((product) => (
              <div key={product.id} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-slate-700">{product.name}</p>
                  <p className="text-xs text-slate-400">{product.category?.name}</p>
                </div>
                <span className={product.currentStock === 0 ? "font-medium text-red-600" : "font-medium text-amber-600"}>
                  {product.currentStock} / min {product.minimumStock}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-700">Best-Selling Products (30 days)</h2>
          <div className="mt-3 space-y-2">
            {summary.bestSellingProducts.length === 0 && <p className="text-sm text-slate-400">No sales yet.</p>}
            {summary.bestSellingProducts.map((entry) => (
              <div key={entry.product.id} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2 text-sm">
                <span>{entry.product.name}</span>
                <span className="text-slate-500">{entry.quantitySold} sold · {formatCurrency(entry.totalRevenue)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-700">Category-wise Stock</h2>
          <div className="mt-3 space-y-2">
            {summary.categoryStockSummary.map((c) => (
              <div key={c.categoryId} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2 text-sm">
                <span>{c.categoryName}</span>
                <span className="text-slate-500">{c.totalStock} units · {formatCurrency(c.stockValue)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
