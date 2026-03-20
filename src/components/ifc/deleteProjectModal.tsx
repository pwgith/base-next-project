"use client";

import { useState, useEffect, useRef } from "react";

interface DeleteProjectModalProps {
  projectName: string;
  hasIfcData: boolean;
  currentIfcVersion: number;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export function DeleteProjectModal({
  projectName,
  hasIfcData,
  currentIfcVersion,
  onConfirm,
  onClose,
}: DeleteProjectModalProps) {
  const [deleting, setDeleting] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === backdropRef.current) onClose();
  }

  async function handleDelete() {
    setDeleting(true);
    await onConfirm();
    setDeleting(false);
  }

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm bg-slate-900/40"
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-6">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
            <svg
              className="w-5 h-5 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Delete Project
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              This action cannot be undone.
            </p>
          </div>
        </div>

        {hasIfcData && (
          <div
            className="mb-4 flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-3 py-2.5 text-sm"
            role="alert"
          >
            <svg
              className="w-4 h-4 mt-0.5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            <span>
              This project contains{" "}
              <strong>
                IFC data across {currentIfcVersion} version
                {currentIfcVersion === 1 ? "" : "s"}
              </strong>
              . Deleting it will permanently remove all model data and version
              history.
            </span>
          </div>
        )}

        <p className="text-sm text-slate-600 mb-5">
          Are you sure you want to delete{" "}
          <strong>&ldquo;{projectName}&rdquo;</strong>?
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 inline-flex items-center justify-center border border-slate-200 text-slate-700 font-semibold rounded-xl px-4 py-2.5 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-red-600 text-white font-semibold rounded-xl px-4 py-2.5 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 text-sm disabled:opacity-50"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
              />
            </svg>
            {deleting ? "Deleting…" : "Delete Project"}
          </button>
        </div>
      </div>
    </div>
  );
}
