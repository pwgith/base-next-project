"use client";

export default function PlansError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 sm:p-8 border border-white/50 max-w-2xl">
        <div
          className="rounded-xl bg-red-50 border border-red-200 px-5 py-4 flex items-start gap-3"
          role="alert"
        >
          <svg
            className="h-6 w-6 text-red-500 shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
          <div>
            <h2 className="text-sm font-medium text-red-800">
              Something went wrong
            </h2>
            <p className="text-sm text-red-700 mt-1">
              {error.message || "We couldn't load this page. Please try again."}
            </p>
          </div>
        </div>
        <button
          onClick={reset}
          className="mt-6 inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 hover:from-blue-700 hover:to-indigo-700 focus:ring-blue-500 shadow-lg shadow-blue-500/25"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
