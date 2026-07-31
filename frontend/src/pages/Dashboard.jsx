import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
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
  Tags,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import dashboardApi from "../api/dashboardApi";
import StatCard from "../components/StatCard";
import HeroStatCard from "../components/ui/HeroStatCard";
import Card from "../components/ui/Card";
import { StatCardSkeleton } from "../components/ui/Skeleton";
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
    return (
      <div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  const alertCount = summary.products.lowStockCount + summary.products.outOfStockCount;

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-800">Dashboard</h1>
      <p className="text-sm text-slate-500">Welcome, {user?.name}</p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <HeroStatCard
          label="Today's Sales"
          numericValue={Number(summary.today.totalSales)}
          format={formatCurrency}
          icon={TrendingUp}
          tone="blue"
        />
        <HeroStatCard
          label="Today's Profit"
          numericValue={Number(summary.today.grossProfit)}
          format={formatCurrency}
          icon={TrendingUp}
          tone="emerald"
        />
        <HeroStatCard
          label="This Month's Sales"
          numericValue={Number(summary.month.sales)}
          format={formatCurrency}
          icon={CalendarDays}
          tone="blue"
        />
        <HeroStatCard
          label="Low Stock Alerts"
          numericValue={alertCount}
          format={(v) => Math.round(v).toString()}
          icon={AlertTriangle}
          tone={alertCount > 0 ? "amber" : "emerald"}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Today's Transactions" value={summary.today.transactionCount} icon={Receipt} tone="slate" />
        <StatCard label="Cash Collected Today" value={formatCurrency(summary.today.cashCollected)} icon={Banknote} tone="emerald" />
        <StatCard label="UPI Collected Today" value={formatCurrency(summary.today.upiCollected)} icon={Smartphone} tone="blue" />
        <StatCard label="Total Products" value={summary.products.totalProducts} icon={Package} tone="slate" />
        <StatCard label="Total Stock Qty" value={summary.products.totalStockQuantity} icon={Boxes} tone="slate" />
        <StatCard label="Stock Purchase Value" value={formatCurrency(summary.products.stockPurchaseValue)} icon={Wallet} tone="slate" />
        <StatCard label="Retail Stock Value" value={formatCurrency(summary.products.estimatedRetailStockValue)} icon={Wallet} tone="blue" />
        <StatCard label="Out of Stock Items" value={summary.products.outOfStockCount} icon={PackageX} tone="red" />
        <StatCard label="This Month's Expenses" value={formatCurrency(summary.month.expenses)} icon={TrendingDown} tone="red" />
      </div>

      <Card className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Sales Trend</h2>
          <div className="flex gap-1">
            {[7, 30].map((d) => (
              <button
                key={d}
                onClick={() => setChartDays(d)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                  chartDays === d ? "bg-brand-600 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {d} days
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Area type="monotone" dataKey="totalSales" stroke="#2563eb" strokeWidth={2} fill="url(#salesGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Recent Sales" icon={Receipt}>
          <div className="space-y-2">
            {recentSales.length === 0 && <p className="text-sm text-slate-400">No sales yet.</p>}
            {recentSales.map((sale) => (
              <div key={sale.id} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2 text-sm">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                    <Receipt className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">{sale.saleNumber}</p>
                    <p className="text-xs text-slate-400">{sale.customerName || "Walk-in"} · {formatDateTime(sale.saleDate)}</p>
                  </div>
                </div>
                <span className="font-medium text-slate-700">{formatCurrency(sale.totalAmount)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Low Stock Products" icon={AlertTriangle}>
          <div className="space-y-2">
            {lowStock.length === 0 && <p className="text-sm text-slate-400">Nothing is low on stock.</p>}
            {lowStock.map((product) => (
              <div key={product.id} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2 text-sm">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                    <Package className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">{product.name}</p>
                    <p className="text-xs text-slate-400">{product.category?.name}</p>
                  </div>
                </div>
                <span className={product.currentStock === 0 ? "font-medium text-red-600" : "font-medium text-amber-600"}>
                  {product.currentStock} / min {product.minimumStock}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Best-Selling Products (30 days)" icon={TrendingUp}>
          <div className="space-y-2">
            {summary.bestSellingProducts.length === 0 && <p className="text-sm text-slate-400">No sales yet.</p>}
            {summary.bestSellingProducts.map((entry) => (
              <div key={entry.product.id} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2 text-sm">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <TrendingUp className="h-3.5 w-3.5" />
                  </div>
                  <span>{entry.product.name}</span>
                </div>
                <span className="text-slate-500">{entry.quantitySold} sold · {formatCurrency(entry.totalRevenue)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Category-wise Stock" icon={Tags}>
          <div className="space-y-2">
            {summary.categoryStockSummary.map((c) => (
              <div key={c.categoryId} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2 text-sm">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    <Tags className="h-3.5 w-3.5" />
                  </div>
                  <span>{c.categoryName}</span>
                </div>
                <span className="text-slate-500">{c.totalStock} units · {formatCurrency(c.stockValue)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
