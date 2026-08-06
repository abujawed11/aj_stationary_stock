import { Fragment, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Menu, MenuButton, MenuItem, MenuItems, Transition, TransitionChild } from "@headlessui/react";
import {
  Boxes,
  LayoutDashboard,
  Tags,
  Package,
  Truck,
  ShoppingCart,
  Receipt,
  SlidersHorizontal,
  Wallet,
  BarChart3,
  Settings,
  Menu as MenuIcon,
  X,
  LogOut,
  ChevronDown,
  UserCircle,
  Scale,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/categories", label: "Categories", icon: Tags },
  { to: "/products", label: "Products", icon: Package },
  { to: "/suppliers", label: "Suppliers", icon: Truck },
  { to: "/purchases", label: "Purchases", icon: ShoppingCart },
  { to: "/supplier-comparison", label: "Supplier Comparison", icon: Scale },
  { to: "/sales", label: "Sales", icon: Receipt },
  { to: "/stock-adjustments", label: "Stock Adjustments", icon: SlidersHorizontal },
  { to: "/expenses", label: "Expenses", icon: Wallet },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];

function SidebarContent({ onNavigate }) {
  return (
    <>
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
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
              `relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-600" />
                )}
                <Icon className="h-4 w-4" />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </>
  );
}

function UserMenu({ user, onLogout }) {
  const initials = (user?.name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Menu as="div" className="relative">
      <MenuButton className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-100">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
          {initials}
        </span>
        <span className="hidden text-slate-600 sm:inline">{user?.name}</span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </MenuButton>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <MenuItems className="absolute right-0 z-20 mt-2 w-48 origin-top-right rounded-lg border border-slate-200 bg-white p-1 shadow-popover focus:outline-none">
          <MenuItem>
            {({ focus }) => (
              <div className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-slate-500 ${focus ? "bg-slate-50" : ""}`}>
                <UserCircle className="h-4 w-4" />
                {user?.username}
              </div>
            )}
          </MenuItem>
          <div className="my-1 border-t border-slate-100" />
          <MenuItem>
            {({ focus }) => (
              <button
                onClick={onLogout}
                className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-red-600 ${focus ? "bg-red-50" : ""}`}
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            )}
          </MenuItem>
        </MenuItems>
      </Transition>
    </Menu>
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

      <Transition show={mobileOpen} as={Fragment}>
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <TransitionChild
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="-translate-x-full"
            enterTo="translate-x-0"
            leave="transition ease-in duration-150"
            leaveFrom="translate-x-0"
            leaveTo="-translate-x-full"
          >
            <div className="w-64 bg-white shadow-xl">
              <div className="flex justify-end px-3 pt-3">
                <button onClick={() => setMobileOpen(false)}>
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </div>
          </TransitionChild>
          <TransitionChild
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="flex-1 bg-slate-900/40" onClick={() => setMobileOpen(false)} />
          </TransitionChild>
        </div>
      </Transition>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:px-6">
          <button className="text-slate-500 lg:hidden" onClick={() => setMobileOpen(true)}>
            <MenuIcon className="h-5 w-5" />
          </button>
          <div className="hidden lg:block" />
          <UserMenu user={user} onLogout={handleLogout} />
        </header>

        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
