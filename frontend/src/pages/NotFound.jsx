import { Link } from "react-router-dom";
import { Boxes } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600">
        <Boxes className="h-7 w-7 text-white" />
      </div>
      <h1 className="mt-6 text-4xl font-bold text-slate-800">404</h1>
      <p className="mt-2 text-sm text-slate-500">The page you're looking for doesn't exist.</p>
      <Link
        to="/"
        className="mt-6 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
