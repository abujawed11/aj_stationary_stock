import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { Boxes, Eye, EyeOff, Lock, User, ArrowRight, TrendingUp, PackageX } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values) {
    setServerError("");
    try {
      await login(values.username, values.password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setServerError(err.response?.data?.message || "Login failed. Please try again.");
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-blue-700 to-slate-900 p-12 text-white lg:flex">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
              <Boxes className="h-6 w-6 text-blue-200" />
            </div>
            <span className="text-lg font-semibold">AJ Stationery</span>
          </div>

          <div className="mt-24">
            <h1 className="text-4xl font-bold">AJ Stationery</h1>
            <p className="mt-3 max-w-sm text-blue-100">
              Stock and sales management for your shop.
            </p>
          </div>

          <div className="mt-10 w-full max-w-sm rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-blue-200">
              Today's overview
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-white/10 p-3">
                <div className="flex items-center gap-1.5 text-emerald-300">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span className="text-xs">Sales</span>
                </div>
                <p className="mt-1 text-xl font-semibold">₹12,450</p>
              </div>
              <div className="rounded-lg bg-white/10 p-3">
                <div className="flex items-center gap-1.5 text-amber-300">
                  <PackageX className="h-3.5 w-3.5" />
                  <span className="text-xs">Low stock</span>
                </div>
                <p className="mt-1 text-xl font-semibold">4 items</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-blue-200/70">© 2026 AJ Stationery</p>
      </div>

      <div className="flex w-full items-center justify-center bg-slate-50 px-4 lg:w-1/2">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-800">Welcome back</h2>
            <p className="mt-1 text-sm text-slate-500">Sign in to continue</p>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="block text-sm font-medium text-slate-700" htmlFor="username">
                Username
              </label>
              <div className="relative mt-1">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  placeholder="admin"
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  {...register("username")}
                />
              </div>
              {errors.username && (
                <p className="mt-1 text-xs text-red-600">{errors.username.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700" htmlFor="password">
                Password
              </label>
              <div className="relative mt-1">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-10 text-sm focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>

            {serverError && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{serverError}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
              {!isSubmitting && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
