"use client";

import { useState, useId } from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/browserClient";

// ─── Types ────────────────────────────────────────────────────────────────────

type FormStatus = "idle" | "submitting" | "sent";

// ─── Component ────────────────────────────────────────────────────────────────

export function ResetPasswordRequestForm(): React.ReactElement {
  const emailId = useId();

  const [status, setStatus] = useState<FormStatus>("idle");
  const [submittedEmail, setSubmittedEmail] = useState<string>("");

  const isSubmitting = status === "submitting";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value.trim();

    if (!email) return;

    setStatus("submitting");
    setSubmittedEmail(email);

    const supabase = createBrowserClient();

    // Always show the neutral "check your inbox" message regardless of whether
    // the account exists — prevents email enumeration.
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password/confirm`,
    });

    setStatus("sent");
  }

  // ── Sent screen ──────────────────────────────────────────────────────────

  if (status === "sent") {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-6 sm:p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Check your email</h2>
        <p className="text-slate-600 text-sm mb-1">
          If an account exists for{" "}
          <span className="font-semibold">{submittedEmail}</span>, a password
          reset link has been sent.
        </p>
        <p className="text-slate-500 text-xs mb-6">
          The link expires in 1 hour. Not seeing it? Check your spam folder.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium underline transition-colors block mb-4"
        >
          Try a different email address
        </button>
        <Link
          href="/login"
          className="w-full inline-flex items-center justify-center gap-2 border border-slate-200 text-slate-700 font-semibold rounded-xl px-6 py-3 hover:bg-slate-50 transition-all text-sm"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  // ── Request form ──────────────────────────────────────────────────────────

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-6 sm:p-8">
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Forgot your password?</h1>
        <p className="text-slate-500 text-sm mt-1">
          Enter your email address and we&apos;ll send you a reset link.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor={emailId} className="block text-sm font-medium text-slate-700">
            Email address
          </label>
          <input
            id={emailId}
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            disabled={isSubmitting}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl px-6 py-3 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-lg shadow-blue-500/25 transition-all text-sm disabled:opacity-50"
        >
          {isSubmitting ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <div className="mt-5 text-center">
        <Link
          href="/login"
          className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
