import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { KeyRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import authApi from "../api/authApi";
import { useToast } from "../context/ToastContext";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import FormField from "../components/ui/FormField";
import PageHeader from "../components/ui/PageHeader";

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
      <PageHeader title="Settings" subtitle="Manage your admin account" />

      <Card className="mt-6 max-w-lg">
        <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
          <p><span className="text-slate-400">Name:</span> {user?.name}</p>
          <p><span className="text-slate-400">Username:</span> {user?.username}</p>
          <p><span className="text-slate-400">Email:</span> {user?.email}</p>
          <p><span className="text-slate-400">Role:</span> {user?.role}</p>
        </div>
      </Card>

      <Card title="Change Password" icon={KeyRound} className="mt-6 max-w-lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Current Password" error={errors.currentPassword}>
            <Input type="password" autoComplete="current-password" error={errors.currentPassword} {...register("currentPassword")} />
          </FormField>
          <FormField label="New Password" error={errors.newPassword}>
            <Input type="password" autoComplete="new-password" error={errors.newPassword} {...register("newPassword")} />
          </FormField>
          <FormField label="Confirm New Password" error={errors.confirmPassword}>
            <Input type="password" autoComplete="new-password" error={errors.confirmPassword} {...register("confirmPassword")} />
          </FormField>

          {formError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>}

          <Button type="submit" loading={isSubmitting}>
            Change Password
          </Button>
        </form>
      </Card>
    </div>
  );
}
