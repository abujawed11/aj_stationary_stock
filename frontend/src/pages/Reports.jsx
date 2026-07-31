import { useEffect, useState } from "react";
import { Download, Receipt, TrendingUp, Package, Boxes, ShoppingCart, Wallet, CreditCard } from "lucide-react";
import reportApi from "../api/reportApi";
import categoryApi from "../api/categoryApi";
import supplierApi from "../api/supplierApi";
import productApi from "../api/productApi";
import Table from "../components/Table";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import FormField from "../components/ui/FormField";
import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import { TableSkeleton } from "../components/ui/Skeleton";
import { formatCurrency, formatDate } from "../utils/currency";
import { useToast } from "../context/ToastContext";

const REPORT_TYPES = [
  { value: "SALES", label: "Sales", icon: Receipt },
  { value: "PROFIT", label: "Profit", icon: TrendingUp },
  { value: "PRODUCTS", label: "Product Performance", icon: Package },
  { value: "STOCK", label: "Stock Valuation", icon: Boxes },
  { value: "PURCHASES", label: "Purchases", icon: ShoppingCart },
  { value: "EXPENSES", label: "Expenses", icon: Wallet },
  { value: "PAYMENT_METHODS", label: "Payment Methods", icon: CreditCard },
];

const PAYMENT_METHODS = ["CASH", "UPI", "BANK_TRANSFER", "OTHER"];
const EXPENSE_CATEGORIES = ["RENT", "ELECTRICITY", "INTERNET", "TRANSPORT", "PACKAGING", "REPAIR", "FURNITURE", "SALARY", "MISCELLANEOUS"];

export default function Reports() {
  const { showToast } = useToast();
  const [reportType, setReportType] = useState("SALES");
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [productId, setProductId] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("");
  const [mode, setMode] = useState("best-selling");
  const [groupBy, setGroupBy] = useState("");

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    categoryApi.list({ limit: 100, isActive: true }).then((res) => setCategories(res.data));
    supplierApi.list({ limit: 100, isActive: true }).then((res) => setSuppliers(res.data));
    productApi.list({ limit: 200, isActive: true }).then((res) => setProducts(res.data));
  }, []);

  function buildParams() {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    if (reportType === "SALES") {
      if (paymentMethod) params.paymentMethod = paymentMethod;
      if (groupBy) params.groupBy = groupBy;
    } else if (reportType === "PROFIT") {
      if (productId) params.productId = productId;
    } else if (reportType === "PRODUCTS") {
      params.mode = mode;
      if (categoryId) params.categoryId = categoryId;
    } else if (reportType === "STOCK") {
      if (categoryId) params.categoryId = categoryId;
    } else if (reportType === "PURCHASES") {
      if (supplierId) params.supplierId = supplierId;
      if (groupBy) params.groupBy = groupBy;
    } else if (reportType === "EXPENSES") {
      if (expenseCategory) params.category = expenseCategory;
      if (groupBy) params.groupBy = groupBy;
    }
    return params;
  }

  function getEndpointInfo() {
    const map = {
      SALES: { fn: reportApi.getSales, path: "/reports/sales", filename: "sales-report.csv" },
      PROFIT: { fn: reportApi.getProfit, path: "/reports/profit", filename: "profit-report.csv" },
      PRODUCTS: { fn: reportApi.getProducts, path: "/reports/products", filename: "products-report.csv" },
      STOCK: { fn: reportApi.getStock, path: "/reports/stock", filename: "stock-valuation-report.csv" },
      PURCHASES: { fn: reportApi.getPurchases, path: "/reports/purchases", filename: "purchases-report.csv" },
      EXPENSES: { fn: reportApi.getExpenses, path: "/reports/expenses", filename: "expenses-report.csv" },
      PAYMENT_METHODS: { fn: reportApi.getPaymentMethods, path: "/reports/payment-methods", filename: "payment-methods-report.csv" },
    };
    return map[reportType];
  }

  async function runReport() {
    setLoading(true);
    setError("");
    try {
      const { fn } = getEndpointInfo();
      const result = await fn(buildParams());
      setReport(result);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    runReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType]);

  async function handleExport() {
    try {
      const { path, filename } = getEndpointInfo();
      await reportApi.downloadCsv(path, buildParams(), filename);
    } catch {
      showToast("Failed to export CSV", "error");
    }
  }

  const dataForTable =
    reportType === "PURCHASES" && groupBy === "supplier"
      ? report?.bySupplier || []
      : reportType === "EXPENSES" && groupBy === "category"
      ? report?.byCategory || []
      : reportType === "SALES" && groupBy
      ? report?.grouped || []
      : report?.items || [];

  const columns = getColumns(reportType, groupBy);

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Analyze sales, profit, stock, purchases, and expenses"
        action={
          <Button variant="secondary" icon={Download} onClick={handleExport}>
            Export CSV
          </Button>
        }
      />

      <div className="mt-4 flex flex-wrap gap-2">
        {REPORT_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setReportType(t.value)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              reportType === t.value ? "bg-brand-600 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      <Card className="mt-4">
        <div className="flex flex-wrap items-end gap-3">
          {reportType !== "STOCK" && (
            <>
              <FormField label="From">
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </FormField>
              <FormField label="To">
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </FormField>
            </>
          )}

          {reportType === "SALES" && (
            <>
              <FormField label="Payment Method">
                <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option value="">All</option>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>{m.replace("_", " ")}</option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Group By">
                <Select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
                  <option value="">None</option>
                  <option value="day">Day</option>
                  <option value="month">Month</option>
                </Select>
              </FormField>
            </>
          )}

          {reportType === "PROFIT" && (
            <FormField label="Product">
              <Select value={productId} onChange={(e) => setProductId(e.target.value)}>
                <option value="">All products</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </FormField>
          )}

          {reportType === "PRODUCTS" && (
            <>
              <FormField label="Mode">
                <Select value={mode} onChange={(e) => setMode(e.target.value)}>
                  <option value="best-selling">Best-selling</option>
                  <option value="slow-moving">Slow-moving</option>
                  <option value="low-stock">Low stock</option>
                  <option value="out-of-stock">Out of stock</option>
                </Select>
              </FormField>
              <FormField label="Category">
                <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </FormField>
            </>
          )}

          {reportType === "STOCK" && (
            <FormField label="Category">
              <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </FormField>
          )}

          {reportType === "PURCHASES" && (
            <>
              <FormField label="Supplier">
                <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                  <option value="">All suppliers</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Group By">
                <Select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
                  <option value="">None</option>
                  <option value="supplier">Supplier</option>
                </Select>
              </FormField>
            </>
          )}

          {reportType === "EXPENSES" && (
            <>
              <FormField label="Category">
                <Select value={expenseCategory} onChange={(e) => setExpenseCategory(e.target.value)}>
                  <option value="">All categories</option>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Group By">
                <Select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
                  <option value="">None</option>
                  <option value="category">Category</option>
                </Select>
              </FormField>
            </>
          )}

          <Button onClick={runReport}>Apply</Button>
        </div>
      </Card>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {report?.summary && (
        <div className="mt-4 flex flex-wrap gap-3">
          {renderSummary(reportType, report.summary)}
        </div>
      )}
      {report?.transactionCount !== undefined && (
        <div className="mt-4 flex flex-wrap gap-3">
          <SummaryPill label="Transactions" value={report.transactionCount} />
        </div>
      )}

      <div className="mt-4">
        {loading ? <TableSkeleton columns={columns.length || 5} /> : <Table columns={columns} data={dataForTable} keyField={columns[0]?.key || "id"} />}
      </div>
    </div>
  );
}

function SummaryPill({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm shadow-card">
      <span className="text-slate-400">{label}: </span>
      <span className="font-semibold text-slate-800">{value}</span>
    </div>
  );
}

function renderSummary(reportType, summary) {
  if (reportType === "SALES") {
    return (
      <>
        <SummaryPill label="Total Sales" value={formatCurrency(summary.totalSales)} />
        <SummaryPill label="Total Discount" value={formatCurrency(summary.totalDiscount)} />
        <SummaryPill label="Transactions" value={summary.transactionCount} />
      </>
    );
  }
  if (reportType === "PROFIT") {
    return (
      <>
        <SummaryPill label="Total Revenue" value={formatCurrency(summary.totalRevenue)} />
        <SummaryPill label="Total Cost" value={formatCurrency(summary.totalCost)} />
        <SummaryPill label="Total Profit" value={formatCurrency(summary.totalProfit)} />
      </>
    );
  }
  if (reportType === "STOCK") {
    return (
      <>
        <SummaryPill label="Total Purchase Value" value={formatCurrency(summary.totalPurchaseValue)} />
        <SummaryPill label="Total Retail Value" value={formatCurrency(summary.totalRetailValue)} />
        <SummaryPill label="Potential Profit" value={formatCurrency(summary.totalPotentialProfit)} />
      </>
    );
  }
  if (reportType === "PURCHASES") {
    return (
      <>
        <SummaryPill label="Total Amount" value={formatCurrency(summary.totalAmount)} />
        <SummaryPill label="Total Paid" value={formatCurrency(summary.totalPaid)} />
        <SummaryPill label="Total Due" value={formatCurrency(summary.totalDue)} />
        <SummaryPill label="Count" value={summary.count} />
      </>
    );
  }
  if (reportType === "EXPENSES") {
    return (
      <>
        <SummaryPill label="Total Amount" value={formatCurrency(summary.totalAmount)} />
        <SummaryPill label="Count" value={summary.count} />
      </>
    );
  }
  return null;
}

function getColumns(reportType, groupBy) {
  if (reportType === "SALES") {
    if (groupBy) {
      return [
        { key: "period", header: "Period" },
        { key: "totalSales", header: "Total Sales", render: (r) => formatCurrency(r.totalSales) },
        { key: "transactionCount", header: "Transactions" },
      ];
    }
    return [
      { key: "saleNumber", header: "Sale #" },
      { key: "saleDate", header: "Date", render: (r) => formatDate(r.saleDate) },
      { key: "customerName", header: "Customer" },
      { key: "paymentMethod", header: "Payment" },
      { key: "totalAmount", header: "Total", render: (r) => formatCurrency(r.totalAmount) },
      { key: "dueAmount", header: "Due", render: (r) => formatCurrency(r.dueAmount) },
      { key: "status", header: "Status" },
    ];
  }

  if (reportType === "PROFIT") {
    return [
      { key: "productName", header: "Product" },
      { key: "quantitySold", header: "Qty Sold" },
      { key: "revenue", header: "Revenue", render: (r) => formatCurrency(r.revenue) },
      { key: "cost", header: "Cost", render: (r) => formatCurrency(r.cost) },
      { key: "profit", header: "Profit", render: (r) => formatCurrency(r.profit) },
    ];
  }

  if (reportType === "PRODUCTS") {
    return [
      { key: "productName", header: "Product" },
      { key: "sku", header: "SKU" },
      { key: "category", header: "Category" },
      { key: "quantitySold", header: "Qty Sold" },
      { key: "currentStock", header: "Current Stock" },
      { key: "minimumStock", header: "Minimum Stock" },
      { key: "revenue", header: "Revenue", render: (r) => (r.revenue !== undefined ? formatCurrency(r.revenue) : "-") },
    ];
  }

  if (reportType === "STOCK") {
    return [
      { key: "productName", header: "Product" },
      { key: "sku", header: "SKU" },
      { key: "category", header: "Category" },
      { key: "currentStock", header: "Stock" },
      { key: "purchaseValue", header: "Purchase Value", render: (r) => formatCurrency(r.purchaseValue) },
      { key: "retailValue", header: "Retail Value", render: (r) => formatCurrency(r.retailValue) },
      { key: "potentialProfit", header: "Potential Profit", render: (r) => formatCurrency(r.potentialProfit) },
    ];
  }

  if (reportType === "PURCHASES") {
    if (groupBy === "supplier") {
      return [
        { key: "supplierName", header: "Supplier" },
        { key: "totalAmount", header: "Total Amount", render: (r) => formatCurrency(r.totalAmount) },
        { key: "count", header: "Purchases" },
      ];
    }
    return [
      { key: "purchaseNumber", header: "Purchase #" },
      { key: "purchaseDate", header: "Date", render: (r) => formatDate(r.purchaseDate) },
      { key: "supplierName", header: "Supplier" },
      { key: "totalAmount", header: "Total", render: (r) => formatCurrency(r.totalAmount) },
      { key: "dueAmount", header: "Due", render: (r) => formatCurrency(r.dueAmount) },
      { key: "status", header: "Status" },
    ];
  }

  if (reportType === "EXPENSES") {
    if (groupBy === "category") {
      return [
        { key: "category", header: "Category" },
        { key: "totalAmount", header: "Total Amount", render: (r) => formatCurrency(r.totalAmount) },
        { key: "count", header: "Expenses" },
      ];
    }
    return [
      { key: "expenseNumber", header: "Expense #" },
      { key: "expenseDate", header: "Date", render: (r) => formatDate(r.expenseDate) },
      { key: "category", header: "Category" },
      { key: "description", header: "Description" },
      { key: "amount", header: "Amount", render: (r) => formatCurrency(r.amount) },
    ];
  }

  if (reportType === "PAYMENT_METHODS") {
    return [
      { key: "paymentMethod", header: "Payment Method" },
      { key: "amount", header: "Amount Collected", render: (r) => formatCurrency(r.amount) },
    ];
  }

  return [];
}
