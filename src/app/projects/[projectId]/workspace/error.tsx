"use client";

import Link from "next/link";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-slate-100 px-4">
      <div className="w-14 h-14 rounded-2xl bg-red-900/40 flex items-center justify-center mb-4">
        <svg
          className="w-7 h-7 text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-slate-100 mb-1">
        Something went wrong
      </h2>
      <p className="text-sm text-slate-400 mb-6 text-center max-w-sm">
        An error occurred while loading the workspace.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-semibold rounded-xl px-4 py-2 transition-colors"
        >
          Try again
        </button>
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-xl px-4 py-2 transition-colors border border-slate-600"
        >
          Back to projects
        </Link>
      </div>
    </div>
  );
}
