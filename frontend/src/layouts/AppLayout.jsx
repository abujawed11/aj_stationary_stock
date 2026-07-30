import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Boxes, LayoutDashboard, Tags, Package, Truck, ShoppingCart, Receipt, Menu, X, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/categories", label: "Categories", icon: Tags },
  { to: "/products", label: "Products", icon: Package },
  { to: "/suppliers", label: "Suppliers", icon: Truck },
  { to: "/purchases", label: "Purchases", icon: ShoppingCart },
  { to: "/sales", label: "Sales", icon: Receipt },
];

function SidebarContent({ onNavigate }) {
  return (
    <>
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
          <Boxes className="h-5 w-5 text-white" />
        </div>
        <span className="text-base font-semibold text-slate-800">AJ Stationery</span>
      </div>
      <nav className="mt-2 flex flex-col gap-1 px-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100"
              }`
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white lg:block">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="w-64 bg-white shadow-xl">
            <div className="flex justify-end px-3 pt-3">
              <button onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </div>
          <div className="flex-1 bg-slate-900/40" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:px-6">
          <button className="text-slate-500 lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">{user?.name}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
