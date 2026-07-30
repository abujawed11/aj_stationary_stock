import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { KeyRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import authApi from "../api/authApi";
import { useToast } from "../context/ToastContext";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "New password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export default function Settings() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [formError, setFormError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(passwordSchema) });

  async function onSubmit(values) {
    setFormError("");
    try {
      await authApi.changePassword(values.currentPassword, values.newPassword);
      showToast("Password changed successfully. Please log in again.");
      reset();
      await logout();
      navigate("/login", { replace: true });
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to change password");
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-800">Settings</h1>
      <p className="text-sm text-slate-500">Manage your admin account</p>

      <div className="mt-6 max-w-lg rounded-xl border border-slate-200 bg-white p-6">
        <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
          <p><span className="text-slate-400">Name:</span> {user?.name}</p>
          <p><span className="text-slate-400">Username:</span> {user?.username}</p>
          <p><span className="text-slate-400">Email:</span> {user?.email}</p>
          <p><span className="text-slate-400">Role:</span> {user?.role}</p>
        </div>
      </div>

      <div className="mt-6 max-w-lg rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-700">Change Password</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Current Password</label>
            <input
              type="password"
              autoComplete="current-password"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              {...register("currentPassword")}
            />
            {errors.currentPassword && <p className="mt-1 text-xs text-red-600">{errors.currentPassword.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">New Password</label>
            <input
              type="password"
              autoComplete="new-password"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              {...register("newPassword")}
            />
            {errors.newPassword && <p className="mt-1 text-xs text-red-600">{errors.newPassword.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Confirm New Password</label>
            <input
              type="password"
              autoComplete="new-password"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>}
          </div>

          {formError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            Change Password
          </button>
        </form>
      </div>
    </div>
  );
}
