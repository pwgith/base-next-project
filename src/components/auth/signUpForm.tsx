"use client";

import { useState, useId } from "react";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

type FormState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "verification-sent" }
  | { status: "error"; message: string; code?: string };

interface FieldErrors {
  email?: string;
  displayName?: string;
  password?: string;
  confirmPassword?: string;
}

// ─── Password strength ────────────────────────────────────────────────────────

interface StrengthResult {
  score: number; // 0–4
  label: string;
  colour: string;
}

function checkPasswordStrength(password: string): StrengthResult {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const labels = ["Very weak", "Weak", "Fair", "Good", "Strong", "Very strong"];
  const colours = [
    "bg-red-400",
    "bg-orange-400",
    "bg-yellow-400",
    "bg-blue-400",
    "bg-green-500",
    "bg-green-600",
  ];

  return { score, label: labels[score] ?? "Strong", colour: colours[score] ?? "bg-green-600" };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SignUpForm(): React.ReactElement {
  const emailId = useId();
  const nameId = useId();
  const passwordId = useId();
  const confirmId = useId();

  const [formState, setFormState] = useState<FormState>({ status: "idle" });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const router = useRouter();

  const strength = checkPasswordStrength(password);
  const isSubmitting = formState.status === "submitting";

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});
    setFormState({ status: "idle" });

    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value.trim();
    const displayName = (form.elements.namedItem("displayName") as HTMLInputElement).value.trim();
    const pwd = (form.elements.namedItem("password") as HTMLInputElement).value;
    const confirm = (form.elements.namedItem("confirmPassword") as HTMLInputElement).value;

    // Client-side validation
    const errors: FieldErrors = {};
    if (!email) errors.email = "Email is required.";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) errors.email = "Please enter a valid email address.";
    if (!displayName) errors.displayName = "Display name is required.";
    if (!pwd) errors.password = "Password is required.";
    if (pwd !== confirm) errors.confirmPassword = "Passwords do not match.";
    if (pwd && strength.score < 5) {
      errors.password =
        "Password must be at least 8 characters and include uppercase, lowercase, a digit, and a special character.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFormState({ status: "submitting" });

    try {
      const response = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, displayName, password: pwd }),
      });

      const json = (await response.json()) as {
        data?: { message: string };
        error?: { message: string; code?: string; fields?: FieldErrors };
      };

      if (!response.ok || json.error) {
        const err = json.error;
        if (err?.code === "EMAIL_TAKEN") {
          setFieldErrors({ email: err.message });
          setFormState({ status: "idle" });
          return;
        }
        if (err?.fields) {
          setFieldErrors(err.fields);
          setFormState({ status: "idle" });
          return;
        }
        setFormState({
          status: "error",
          message: err?.message ?? "Something went wrong. Please try again.",
          code: err?.code,
        });
        return;
      }

      setFormState({ status: "verification-sent" });
    } catch {
      setFormState({
        status: "error",
        message: "Unable to connect. Please check your connection and try again.",
      });
    }
  }

  // ── Verification sent screen ───────────────────────────────────────────────

  if (formState.status === "verification-sent") {
    return (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-slate-900">Check your inbox</h2>
        <p className="text-sm text-slate-600">
          We sent a verification link to your email address. Click the link to
          activate your account before signing in.
        </p>
        <p className="text-xs text-slate-400">
          Didn&apos;t receive it? Check your spam folder.
        </p>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* General error alert */}
      {formState.status === "error" && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3"
        >
          {formState.message}
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
          className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            fieldErrors.email ? "border-red-400 bg-red-50" : "border-slate-300 bg-white"
          }`}
          placeholder="you@example.com"
          aria-describedby={fieldErrors.email ? `${emailId}-error` : undefined}
        />
        {fieldErrors.email && (
          <p id={`${emailId}-error`} className="mt-1 text-xs text-red-600">
            {fieldErrors.email}
          </p>
        )}
      </div>

      {/* Display name */}
      <div>
        <label
          htmlFor={nameId}
          className="block text-sm font-medium text-slate-700 mb-1"
        >
          Display name
        </label>
        <input
          id={nameId}
          name="displayName"
          type="text"
          autoComplete="name"
          required
          className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            fieldErrors.displayName
              ? "border-red-400 bg-red-50"
              : "border-slate-300 bg-white"
          }`}
          placeholder="Your name"
          aria-describedby={
            fieldErrors.displayName ? `${nameId}-error` : undefined
          }
        />
        {fieldErrors.displayName && (
          <p id={`${nameId}-error`} className="mt-1 text-xs text-red-600">
            {fieldErrors.displayName}
          </p>
        )}
      </div>

      {/* Password */}
      <div>
        <label
          htmlFor={passwordId}
          className="block text-sm font-medium text-slate-700 mb-1"
        >
          Password
        </label>
        <div className="relative">
          <input
            id={passwordId}
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full rounded-lg border px-3 py-2 pr-10 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              fieldErrors.password
                ? "border-red-400 bg-red-50"
                : "border-slate-300 bg-white"
            }`}
            placeholder="Minimum 8 characters"
            aria-describedby={
              fieldErrors.password ? `${passwordId}-error` : `${passwordId}-hint`
            }
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

        {/* Strength indicator */}
        {password && (
          <div className="mt-2">
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    i < strength.score ? strength.colour : "bg-slate-200"
                  }`}
                />
              ))}
            </div>
            <p id={`${passwordId}-hint`} className="mt-1 text-xs text-slate-500">
              {strength.label}
            </p>
          </div>
        )}

        {fieldErrors.password && (
          <p id={`${passwordId}-error`} className="mt-1 text-xs text-red-600">
            {fieldErrors.password}
          </p>
        )}
      </div>

      {/* Confirm password */}
      <div>
        <label
          htmlFor={confirmId}
          className="block text-sm font-medium text-slate-700 mb-1"
        >
          Confirm password
        </label>
        <div className="relative">
          <input
            id={confirmId}
            name="confirmPassword"
            type={showConfirm ? "text" : "password"}
            autoComplete="new-password"
            required
            className={`w-full rounded-lg border px-3 py-2 pr-10 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              fieldErrors.confirmPassword
                ? "border-red-400 bg-red-50"
                : "border-slate-300 bg-white"
            }`}
            placeholder="Re-enter your password"
            aria-describedby={
              fieldErrors.confirmPassword ? `${confirmId}-error` : undefined
            }
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
            aria-label={showConfirm ? "Hide password" : "Show password"}
          >
            {showConfirm ? (
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
        {fieldErrors.confirmPassword && (
          <p id={`${confirmId}-error`} className="mt-1 text-xs text-red-600">
            {fieldErrors.confirmPassword}
          </p>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium text-sm py-2.5 rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {isSubmitting ? "Creating account…" : "Create account"}
      </button>

      <p className="text-xs text-slate-400 text-center">
        By creating an account you agree to our terms of service.
      </p>
    </form>
  );
}
