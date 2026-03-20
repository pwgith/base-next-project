/**
 * /subscription/success — Stripe Checkout success callback page.
 * Shown after a user completes a checkout session.
 */

import Link from "next/link";

export const metadata = {
  title: "Subscription Activated",
};

export default function SubscriptionSuccessPage() {
  return (
    <main className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
      <div className="mb-6 flex justify-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-emerald-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>

      <h1 className="text-2xl font-bold text-slate-900 mb-3">You&apos;re all set!</h1>
      <p className="text-slate-600 mb-8">
        Your subscription has been activated. It may take a few moments for your new plan to
        appear in your account.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/subscription"
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          View Subscription
        </Link>
        <Link
          href="/"
          className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    </main>
  );
}
