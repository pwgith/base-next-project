"use client";

import { useState, useId } from "react";
import { createBrowserClient } from "@/lib/supabase/browserClient";

// ─── Types ────────────────────────────────────────────────────────────────────

type LoginStatus =
  | "idle"
  | "submitting"
  | "unverified"  // email not confirmed — show resend option
  | "resending"
  | "resent"
  | "error";

interface LoginFormProps {
  /** Path to redirect to after successful sign-in. Defaults to "/plans". */
  redirectTo?: string;
}

// ─── Error mapping ────────────────────────────────────────────────────────────

function mapSupabaseError(message: string, code?: string): {
  type: "invalid_credentials" | "unverified" | "locked" | "unknown";
  text: string;
} {
  const msg = message.toLowerCase();
  const c = (code ?? "").toLowerCase();

  if (
    c === "email_not_confirmed" ||
    msg.includes("email not confirmed") ||
    msg.includes("not confirmed")
  ) {
    return { type: "unverified", text: "Please verify your email address before signing in." };
  }

  if (
    c === "invalid_credentials" ||
    msg.includes("invalid login credentials") ||
    msg.includes("invalid credentials") ||
    msg.includes("user not found") ||
    msg.includes("wrong password")
  ) {
    return {
      type: "invalid_credentials",
      text: "The email address or password is incorrect.",
    };
  }

  if (
    msg.includes("locked") ||
    msg.includes("too many") ||
    msg.includes("rate limit") ||
    msg.includes("banned") ||
    msg.includes("suspended") ||
    c === "over_request_rate_limit" ||
    c === "user_banned"
  ) {
    return {
      type: "locked",
      text: "Your account has been temporarily locked. Please try again later or reset your password.",
    };
  }

  return { type: "unknown", text: "An unexpected error occurred. Please try again." };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LoginForm({ redirectTo = "/plans" }: LoginFormProps): React.ReactElement {
  const emailId = useId();
  const passwordId = useId();

  const [status, setStatus] = useState<LoginStatus>("idle");
  const [errorText, setErrorText] = useState<string>("");
  const [emailForResend, setEmailForResend] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);

  const isSubmitting = status === "submitting";

  // ── Sign in ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("idle");
    setErrorText("");

    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value.trim();
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    if (!email || !password) {
      setStatus("error");
      setErrorText("Please enter your email address and password.");
      return;
    }

    setStatus("submitting");

    const supabase = createBrowserClient();

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const mapped = mapSupabaseError(error.message, error.code);
      if (mapped.type === "unverified") {
        setEmailForResend(email);
        setStatus("unverified");
      } else {
        setStatus("error");
        setErrorText(mapped.text);
      }
      return;
    }

    // Persist the session so the Next.js middleware can read it.
    const accessToken = data.session?.access_token;
    if (accessToken) {
      // Set a client-side cookie immediately (synchronous — guaranteed to be
      // sent on the very next navigation request).
      const maxAge = 60 * 60 * 24 * 7;
      document.cookie = `sb_session=${accessToken}; path=/; max-age=${maxAge}; SameSite=Lax`;

      // Also set server-side httpOnly cookie for better security in production.
      // We await this before navigating so the middleware cookie exists on the
      // first server-rendered request.
      try {
        await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken }),
        });
      } catch {
        // The client-side cookie is already set — safe to continue.
      }
    }

    // Use a full browser navigation rather than a SPA client-side transition.
    // This ensures the middleware sees the fresh cookie on the very first
    // request to the destination page.
    window.location.href = redirectTo;
  }

  // ── Resend verification ────────────────────────────────────────────────────

  async function handleResend() {
    setStatus("resending");
    const supabase = createBrowserClient();
    await supabase.auth.resend({ type: "signup", email: emailForResend });
    setStatus("resent");
  }

  // ── Unverified state ───────────────────────────────────────────────────────

  if (status === "unverified" || status === "resending" || status === "resent") {
    return (
      <div className="space-y-4">
        <div role="alert" className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-3">
          Please verify your email address before signing in.
        </div>

        {status === "resent" ? (
          <p className="text-sm text-slate-600 text-center">
            Verification email resent. Please check your inbox.
          </p>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={status === "resending"}
            className="w-full text-sm text-blue-600 hover:underline disabled:opacity-50"
          >
            {status === "resending" ? "Sending…" : "Resend verification email"}
          </button>
        )}

        <button
          type="button"
          onClick={() => { setStatus("idle"); setErrorText(""); }}
          className="w-full text-sm text-slate-500 hover:text-slate-700"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* General error alert */}
      {status === "error" && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3"
        >
          {errorText}
        </div>
      )}

      {/* Email */}
      <div>
        <label
          htmlFor={emailId}
          className="block text-sm font-medium text-slate-700 mb-1"
        >
          Email address
        </label>
        <input
          id={emailId}
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="you@example.com"
        />
      </div>

      {/* Password */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label
            htmlFor={passwordId}
            className="block text-sm font-medium text-slate-700"
          >
            Password
          </label>
          <a
            href="/reset-password"
            className="text-xs text-blue-600 hover:underline"
          >
            Forgot password?
          </a>
        </div>
        <div className="relative">
          <input
            id={passwordId}
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Your password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Remember me */}
      <div className="flex items-center gap-2">
        <input
          id="remember-me"
          name="rememberMe"
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="remember-me" className="text-sm text-slate-600">
          Remember me
        </label>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium text-sm py-2.5 rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {isSubmitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
