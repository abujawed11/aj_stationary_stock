import { Link } from "react-router-dom";
import { PackageX, ArrowLeft } from "lucide-react";
import Button from "../components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50">
        <PackageX className="h-7 w-7 text-brand-600" />
      </div>
      <h1 className="mt-6 text-4xl font-bold text-slate-800">404</h1>
      <p className="mt-2 text-sm text-slate-500">The page you're looking for doesn't exist.</p>
      <Button as={Link} to="/" icon={ArrowLeft} className="mt-6">
        Go to Dashboard
      </Button>
    </div>
  );
}
