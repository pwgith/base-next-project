"use client";

import { useState, useId, useEffect } from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/browserClient";
import type { EmailOtpType } from "@supabase/auth-js";

// ─── Types ────────────────────────────────────────────────────────────────────

type PageState =
  | { status: "verifying" }
  | { status: "form" }
  | { status: "submitting" }
  | { status: "success" }
  | { status: "expired" }
  | { status: "used" }
  | { status: "invalid" };

interface FieldErrors {
  newPassword?: string;
  confirmPassword?: string;
}

interface Props {
  tokenHash: string | null;
  type: string | null;
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

export function ResetPasswordConfirmForm({ tokenHash, type }: Props): React.ReactElement {
  const newId = useId();
  const confirmId = useId();

  const [pageState, setPageState] = useState<PageState>({ status: "verifying" });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // ── Verify the token on mount ────────────────────────────────────────────
  useEffect(() => {
    if (!tokenHash || !type) {
      setPageState({ status: "invalid" });
      return;
    }

    const supabase = createBrowserClient();

    supabase.auth
      .verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType })
      .then(({ error }) => {
        if (error) {
          const msg = (error.message ?? "").toLowerCase();
          if (msg.includes("expired")) {
            setPageState({ status: "expired" });
          } else if (msg.includes("already") || msg.includes("used")) {
            setPageState({ status: "used" });
          } else {
            setPageState({ status: "invalid" });
          }
        } else {
          setPageState({ status: "form" });
        }
      });
  }, [tokenHash, type]);

  // ── Submit new password ──────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});

    const form = e.currentTarget;
    const newPassword = (form.elements.namedItem("newPassword") as HTMLInputElement).value;
    const confirmPassword = (form.elements.namedItem("confirmPassword") as HTMLInputElement).value;

    const errors: FieldErrors = {};
    if (!newPassword) {
      errors.newPassword = "Password is required.";
    } else if (!isStrongPassword(newPassword)) {
      errors.newPassword =
        "Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.";
    }
    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setPageState({ status: "submitting" });
    const supabase = createBrowserClient();

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setFieldErrors({ newPassword: "Failed to update password. Please request a new reset link." });
      setPageState({ status: "form" });
      return;
    }

    // Sign out so the session created by the recovery token doesn't persist.
    await supabase.auth.signOut();
    setPageState({ status: "success" });
  }

  // ─── State renders ────────────────────────────────────────────────────────

  if (pageState.status === "verifying") {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-6 sm:p-8 text-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100" />
          <div className="h-4 w-40 bg-slate-100 rounded" />
        </div>
      </div>
    );
  }

  if (pageState.status === "expired") {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-6 sm:p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">This reset link has expired</h2>
        <p className="text-slate-500 text-sm mb-6">
          Password reset links expire after 1 hour. Please request a new one.
        </p>
        <Link
          href="/reset-password"
          className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl px-6 py-3 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-lg shadow-blue-500/25 transition-all text-sm mb-3"
        >
          Request a new link
        </Link>
        <Link href="/login" className="text-sm text-slate-500 hover:text-slate-700 transition-colors underline block">
          Back to sign in
        </Link>
      </div>
    );
  }

  if (pageState.status === "used") {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-6 sm:p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">This reset link has already been used</h2>
        <p className="text-slate-500 text-sm mb-6">
          This link is no longer valid. Please request a new reset link.
        </p>
        <Link
          href="/reset-password"
          className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl px-6 py-3 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-lg shadow-blue-500/25 transition-all text-sm mb-3"
        >
          Request a new link
        </Link>
        <Link href="/login" className="text-sm text-slate-500 hover:text-slate-700 transition-colors underline block">
          Back to sign in
        </Link>
      </div>
    );
  }

  if (pageState.status === "invalid") {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-6 sm:p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Invalid reset link</h2>
        <p className="text-slate-500 text-sm mb-6">
          This link is not valid. Please request a new password reset link.
        </p>
        <Link
          href="/reset-password"
          className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl px-6 py-3 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-lg shadow-blue-500/25 transition-all text-sm mb-3"
        >
          Request a new link
        </Link>
        <Link href="/login" className="text-sm text-slate-500 hover:text-slate-700 transition-colors underline block">
          Back to sign in
        </Link>
      </div>
    );
  }

  if (pageState.status === "success") {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-6 sm:p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Password reset successfully</h2>
        <p className="text-slate-500 text-sm mb-6">
          Your password has been updated. You can now sign in with your new password.
        </p>
        <Link
          href="/login"
          className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl px-6 py-3 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-lg shadow-blue-500/25 transition-all text-sm"
        >
          Sign in with new password
        </Link>
      </div>
    );
  }

  // ── New password form (status: "form" | "submitting") ────────────────────

  const isSubmitting = pageState.status === "submitting";

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-6 sm:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Set a new password</h1>
        <p className="text-slate-500 text-sm mt-1">Choose a strong password for your account.</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
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

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl px-6 py-3 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-lg shadow-blue-500/25 transition-all text-sm disabled:opacity-50"
        >
          {isSubmitting ? "Saving…" : "Set new password"}
        </button>
      </form>
    </div>
  );
}
