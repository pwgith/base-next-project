/**
 * /subscription/cancelled — Stripe Checkout cancellation callback page.
 * Shown when a user abandons a Stripe Checkout session.
 */

import Link from "next/link";

export const metadata = {
  title: "Checkout Cancelled",
};

export default function SubscriptionCancelledPage() {
  return (
    <main className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
      <div className="mb-6 flex justify-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      </div>

      <h1 className="text-2xl font-bold text-slate-900 mb-3">Checkout cancelled</h1>
      <p className="text-slate-600 mb-8">
        You cancelled the checkout. Your current plan has not been changed and no payment was
        taken.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/subscription"
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          View Plans
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
