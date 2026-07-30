import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Welcome, {user?.name} ({user?.username})
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Logout
        </button>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-slate-500">
        Dashboard summary cards and charts will appear here.
      </div>
    </div>
  );
}
