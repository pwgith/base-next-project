"use client";

import { useState, useId, useEffect } from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/browserClient";

// ─── Types ────────────────────────────────────────────────────────────────────

type FormStatus = "idle" | "submitting" | "success";

interface FieldErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isStrongPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

function EyeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ChangePasswordForm(): React.ReactElement {
  const currentId = useId();
  const newId = useId();
  const confirmId = useId();

  const [status, setStatus] = useState<FormStatus>("idle");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [alertMessage, setAlertMessage] = useState<string>("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    const supabase = createBrowserClient();
    supabase.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user?.email ?? "");
    });
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});
    setAlertMessage("");

    const form = e.currentTarget;
    const currentPassword = (form.elements.namedItem("currentPassword") as HTMLInputElement).value;
    const newPassword = (form.elements.namedItem("newPassword") as HTMLInputElement).value;
    const confirmPassword = (form.elements.namedItem("confirmPassword") as HTMLInputElement).value;

    // ── Client-side validation ────────────────────────────────────────────
    const errors: FieldErrors = {};

    if (!currentPassword) {
      errors.currentPassword = "Current password is required.";
    }

    if (!newPassword) {
      errors.newPassword = "New password is required.";
    } else if (currentPassword && newPassword === currentPassword) {
      errors.newPassword = "New password must be different from the current password.";
    } else if (!isStrongPassword(newPassword)) {
      errors.newPassword =
        "Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.";
    }

    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      errors.confirmPassword = "New passwords do not match.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setStatus("submitting");
    const supabase = createBrowserClient();

    // ── Step 1: Re-authenticate to verify current password ────────────────
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: currentPassword,
    });

    if (signInError) {
      setFieldErrors({ currentPassword: "Current password is incorrect." });
      setStatus("idle");
      return;
    }

    // ── Step 2: Update to new password ────────────────────────────────────
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setAlertMessage("Failed to update password. Please try again.");
      setStatus("idle");
      return;
    }

    setStatus("success");
  }

  // ── Success screen ────────────────────────────────────────────────────────

  if (status === "success") {
    return (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900">Your password has been changed</h2>
        <p className="text-slate-500 text-sm">
          A confirmation has been sent to your email address.
        </p>
        <Link
          href="/"
          className="w-full inline-flex items-center justify-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl px-6 py-3 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-lg shadow-blue-500/25 transition-all text-sm"
        >
          Back to home
        </Link>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  const isSubmitting = status === "submitting";

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* Alert */}
      {alertMessage && (
        <div
          role="alert"
          className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm"
        >
          <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <span>{alertMessage}</span>
        </div>
      )}

      {/* Current password */}
      <div className="space-y-1.5">
        <label htmlFor={currentId} className="block text-sm font-medium text-slate-700">
          Current password
        </label>
        <div className="relative">
          <input
            id={currentId}
            name="currentPassword"
            type={showCurrent ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            disabled={isSubmitting}
            className={`w-full px-4 py-3 pr-11 rounded-xl border bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm ${
              fieldErrors.currentPassword ? "border-red-300" : "border-slate-200"
            }`}
          />
          <button
            type="button"
            onClick={() => setShowCurrent((v) => !v)}
            aria-label={showCurrent ? "Hide current password" : "Show current password"}
            className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
          >
            {showCurrent ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        {fieldErrors.currentPassword && (
          <p className="text-xs text-red-600">{fieldErrors.currentPassword}</p>
        )}
        <Link
          href="/reset-password"
          className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
        >
          Forgot your current password?
        </Link>
      </div>

      {/* New password */}
      <div className="space-y-1.5">
        <label htmlFor={newId} className="block text-sm font-medium text-slate-700">
          New password
        </label>
        <div className="relative">
          <input
            id={newId}
            name="newPassword"
            type={showNew ? "text" : "password"}
            autoComplete="new-password"
            placeholder="••••••••"
            disabled={isSubmitting}
            className={`w-full px-4 py-3 pr-11 rounded-xl border bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm ${
              fieldErrors.newPassword ? "border-red-300" : "border-slate-200"
            }`}
          />
          <button
            type="button"
            onClick={() => setShowNew((v) => !v)}
            aria-label={showNew ? "Hide new password" : "Show new password"}
            className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
          >
            {showNew ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        {fieldErrors.newPassword && (
          <p className="text-xs text-red-600">{fieldErrors.newPassword}</p>
        )}
      </div>

      {/* Confirm new password */}
      <div className="space-y-1.5">
        <label htmlFor={confirmId} className="block text-sm font-medium text-slate-700">
          Confirm new password
        </label>
        <div className="relative">
          <input
            id={confirmId}
            name="confirmPassword"
            type={showConfirm ? "text" : "password"}
            autoComplete="new-password"
            placeholder="••••••••"
            disabled={isSubmitting}
            className={`w-full px-4 py-3 pr-11 rounded-xl border bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm ${
              fieldErrors.confirmPassword ? "border-red-300" : "border-slate-200"
            }`}
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
            className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
          >
            {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        {fieldErrors.confirmPassword && (
          <p className="text-xs text-red-600">{fieldErrors.confirmPassword}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-1">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl px-6 py-3 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-lg shadow-blue-500/25 transition-all text-sm disabled:opacity-50"
        >
          {isSubmitting ? "Updating…" : "Update password"}
        </button>
        <Link
          href="/"
          className="flex-1 inline-flex items-center justify-center gap-2 border border-slate-200 text-slate-700 font-semibold rounded-xl px-6 py-3 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all text-sm"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
