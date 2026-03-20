import { useCallback, useEffect, useState } from "react";

import { validateFileFormat } from "@/lib/validation";
import { SUPPORTED_FILE_EXTENSIONS } from "@/constants/floorPlan";

interface FileDropZoneProps {
  onFileSelected: (file: File) => void;
  onPaste: (file: File) => void;
  formatError: string | null;
  onClearError: () => void;
}

export function FileDropZone({
  onFileSelected,
  onPaste,
  formatError,
  onClearError,
}: FileDropZoneProps) {
  const [isClipboardReadSupported, setIsClipboardReadSupported] =
    useState(false);

  useEffect(() => {
    setIsClipboardReadSupported(
      typeof navigator !== "undefined" &&
        typeof navigator.clipboard?.read === "function",
    );
  }, []);
  const handleFile = useCallback(
    (file: File) => {
      onClearError();
      const validation = validateFileFormat(file);
      if (!validation.valid) {
        // Dispatch error via a custom mechanism — parent handles display
        onFileSelected(file); // Still pass the file so the parent can show the error
        return;
      }
      onFileSelected(file);
    },
    [onFileSelected, onClearError],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleClick = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = SUPPORTED_FILE_EXTENSIONS.join(",");
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) handleFile(file);
    };
    input.click();
  }, [handleFile]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick],
  );

  const handlePasteEvent = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) onPaste(file);
          return;
        }
      }
    },
    [onPaste],
  );

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find((type) =>
          type.startsWith("image/"),
        );
        if (imageType) {
          const blob = await item.getType(imageType);
          const extension = imageType.split("/")[1] || "png";
          const file = new File([blob], `pasted-image.${extension}`, {
            type: imageType,
          });
          onPaste(file);
          return;
        }
      }
    } catch {
      // Clipboard API not available or permission denied — ignore
    }
  }, [onPaste]);

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-label="Click, drag, or paste to provide a floor plan image"
        className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition-all duration-200"
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onKeyDown={handleKeyDown}
        onPaste={handlePasteEvent}
      >
        <svg
          className="mx-auto h-10 w-10 text-slate-400 mb-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
          />
        </svg>
        <p className="text-sm font-medium text-slate-700">
          Click or drag an image here
        </p>
        <p className="text-xs text-slate-500 mt-1">
          or paste an image from your clipboard (Ctrl+V / ⌘V)
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Supported formats: PNG, JPG, PDF
        </p>
        {isClipboardReadSupported && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePasteFromClipboard();
            }}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
            aria-label="Paste image from clipboard"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            Paste from clipboard
          </button>
        )}
      </div>

      {formatError && (
        <div
          className="mt-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-start gap-2"
          role="alert"
        >
          <svg
            className="h-5 w-5 text-red-500 shrink-0 mt-0.5"
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
          <span>{formatError}</span>
        </div>
      )}
    </>
  );
}
