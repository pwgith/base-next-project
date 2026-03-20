"use client";

import { useState, useId, useEffect } from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/browserClient";

// ─── Types ────────────────────────────────────────────────────────────────────

type FormStatus = "idle" | "submitting" | "sent";

interface FieldErrors {
  newEmail?: string;
  confirmEmail?: string;
  password?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

export function ChangeEmailForm(): React.ReactElement {
  const newEmailId = useId();
  const confirmEmailId = useId();
  const passwordId = useId();

  const [status, setStatus] = useState<FormStatus>("idle");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [alertMessage, setAlertMessage] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [currentEmail, setCurrentEmail] = useState<string>("");
  const [sentToEmail, setSentToEmail] = useState<string>("");

  useEffect(() => {
    const supabase = createBrowserClient();
    supabase.auth.getSession().then(({ data }) => {
      setCurrentEmail(data.session?.user?.email ?? "");
    });
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});
    setAlertMessage("");

    const form = e.currentTarget;
    const newEmail = (form.elements.namedItem("newEmail") as HTMLInputElement).value.trim().toLowerCase();
    const confirmEmail = (form.elements.namedItem("confirmEmail") as HTMLInputElement).value.trim().toLowerCase();
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    // ── Client-side validation ────────────────────────────────────────────
    const errors: FieldErrors = {};

    if (!newEmail) {
      errors.newEmail = "New email address is required.";
    } else if (!EMAIL_REGEX.test(newEmail)) {
      errors.newEmail = "Please enter a valid email address.";
    } else if (currentEmail && newEmail === currentEmail) {
      errors.newEmail = "New email address must be different from your current email address.";
    }

    if (!confirmEmail) {
      errors.confirmEmail = "Please confirm your new email address.";
    } else if (newEmail && confirmEmail && newEmail !== confirmEmail) {
      errors.confirmEmail = "Email addresses do not match.";
    }

    if (!password) {
      errors.password = "Password is required.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setStatus("submitting");

    const supabase = createBrowserClient();

    // ── Step 1: Re-authenticate to verify password ────────────────────────
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: currentEmail,
      password,
    });

    if (signInError) {
      setFieldErrors({ password: "Password is incorrect." });
      setStatus("idle");
      return;
    }

    // ── Step 2: Request email update — Supabase sends verification email ──
    const { error: updateError } = await supabase.auth.updateUser(
      { email: newEmail },
      { emailRedirectTo: `${window.location.origin}/auth/callback?next=/account/change-email/confirmed` },
    );

    if (updateError) {
      const msg = (updateError.message ?? "").toLowerCase();
      if (msg.includes("already") || msg.includes("registered") || msg.includes("in use")) {
        setFieldErrors({ newEmail: "This email address is already in use." });
        setStatus("idle");
        return;
      }
      setAlertMessage("Failed to initiate email change. Please try again.");
      setStatus("idle");
      return;
    }

    setSentToEmail(newEmail);
    setStatus("sent");
  }

  // ── Verification sent screen ──────────────────────────────────────────────

  if (status === "sent") {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-6 sm:p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Verify your new email address</h2>
        <p className="text-slate-600 text-sm mb-1">A verification link has been sent to</p>
        <p className="font-semibold text-slate-900 text-sm mb-4">{sentToEmail}</p>
        <p className="text-slate-500 text-xs mb-6">
          Your email address will remain{" "}
          <span className="font-semibold">{currentEmail}</span> until you click
          the verification link. The link expires in 24 hours.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="text-sm text-blue-600 hover:text-blue-700 underline transition-colors block mb-4"
        >
          Go back and try a different address
        </button>
        <Link
          href="/"
          className="w-full inline-flex items-center justify-center gap-2 border border-slate-200 text-slate-700 font-semibold rounded-xl px-6 py-3 hover:bg-slate-50 transition-all text-sm"
        >
          Back to home
        </Link>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  const isSubmitting = status === "submitting";

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-6 sm:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Change email address</h1>
        <p className="text-slate-500 text-sm mt-1">
          Your current email is{" "}
          <span className="font-semibold text-slate-700">{currentEmail || "—"}</span>.{" "}
          Enter a new address and confirm your password to continue.
        </p>
      </div>

      {/* Security note */}
      <div className="mb-5 flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
        <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <span>
          A verification link will be sent to the new address. The change will not take effect until you click the link.
        </span>
      </div>

      {/* Alert */}
      {alertMessage && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm"
        >
          <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <span>{alertMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* New email */}
        <div className="space-y-1.5">
          <label htmlFor={newEmailId} className="block text-sm font-medium text-slate-700">
            New email address
          </label>
          <input
            id={newEmailId}
            name="newEmail"
            type="email"
            autoComplete="email"
            placeholder="you-new@example.com"
            disabled={isSubmitting}
            className={`w-full px-4 py-3 rounded-xl border bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm ${
              fieldErrors.newEmail ? "border-red-300" : "border-slate-200"
            }`}
          />
          {fieldErrors.newEmail && (
            <p className="text-xs text-red-600">{fieldErrors.newEmail}</p>
          )}
        </div>

        {/* Confirm new email */}
        <div className="space-y-1.5">
          <label htmlFor={confirmEmailId} className="block text-sm font-medium text-slate-700">
            Confirm new email address
          </label>
          <input
            id={confirmEmailId}
            name="confirmEmail"
            type="email"
            autoComplete="email"
            placeholder="you-new@example.com"
            disabled={isSubmitting}
            className={`w-full px-4 py-3 rounded-xl border bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm ${
              fieldErrors.confirmEmail ? "border-red-300" : "border-slate-200"
            }`}
          />
          {fieldErrors.confirmEmail && (
            <p className="text-xs text-red-600">{fieldErrors.confirmEmail}</p>
          )}
        </div>

        {/* Current password */}
        <div className="space-y-1.5">
          <label htmlFor={passwordId} className="block text-sm font-medium text-slate-700">
            Current password
          </label>
          <div className="relative">
            <input
              id={passwordId}
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              disabled={isSubmitting}
              className={`w-full px-4 py-3 pr-11 rounded-xl border bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm ${
                fieldErrors.password ? "border-red-300" : "border-slate-200"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          {fieldErrors.password && (
            <p className="text-xs text-red-600">{fieldErrors.password}</p>
          )}
          <p className="text-xs text-slate-500">
            We need your password to confirm this sensitive change.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl px-6 py-3 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-lg shadow-blue-500/25 transition-all text-sm disabled:opacity-50"
          >
            {isSubmitting ? "Sending…" : "Update email address"}
          </button>
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-2 border border-slate-200 text-slate-700 font-semibold rounded-xl px-6 py-3 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all text-sm"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
