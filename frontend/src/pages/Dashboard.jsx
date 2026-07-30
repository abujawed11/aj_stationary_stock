import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-800">Dashboard</h1>
      <p className="text-sm text-slate-500">Welcome, {user?.name}</p>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-slate-500">
        Dashboard summary cards and charts will appear here.
      </div>
    </div>
  );
}
