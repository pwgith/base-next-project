import { useEffect, useCallback } from "react";

import { FileDropZone } from "@/components/fileDropZone";
import { ImagePreview } from "@/components/imagePreview";
import { RoofHeightInput } from "@/components/roofHeightInput";
import { validateFileFormat } from "@/lib/validation";

interface UploadFormProps {
  selectedFile: File | null;
  onFileSelected: (file: File) => void;
  onFileRemoved: () => void;
  roofHeight: string;
  onRoofHeightChange: (value: string) => void;
  roofHeightError: string | null;
  onRoofHeightErrorChange: (error: string | null) => void;
  formatError: string | null;
  onFormatErrorClear: () => void;
  onSubmit: () => void;
  onReset: () => void;
}

export function UploadForm({
  selectedFile,
  onFileSelected,
  onFileRemoved,
  roofHeight,
  onRoofHeightChange,
  roofHeightError,
  onRoofHeightErrorChange,
  formatError,
  onFormatErrorClear,
  onSubmit,
  onReset,
}: UploadFormProps) {
  const handlePastedFile = useCallback(
    (file: File) => {
      onFormatErrorClear();
      const validation = validateFileFormat(file);
      if (!validation.valid) {
        return; // Silently ignore unsupported pasted formats
      }
      onFileSelected(file);
    },
    [onFileSelected, onFormatErrorClear],
  );

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) handlePastedFile(file);
          return;
        }
      }
      // No image in clipboard — ignore the paste
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handlePastedFile]);

  return (
    <section className="animate-fade-in">
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 sm:p-8 border border-white/50 max-w-2xl">
        <h2 className="text-xl font-semibold text-slate-900 mb-6">
          Upload Floor Plan
        </h2>

        {!selectedFile && (
          <FileDropZone
            onFileSelected={onFileSelected}
            onPaste={handlePastedFile}
            formatError={formatError}
            onClearError={onFormatErrorClear}
          />
        )}

        {selectedFile && (
          <ImagePreview file={selectedFile} onRemove={onFileRemoved} />
        )}

        <RoofHeightInput
          value={roofHeight}
          onChange={onRoofHeightChange}
          error={roofHeightError}
          onErrorChange={onRoofHeightErrorChange}
        />

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <button
            onClick={onSubmit}
            className="inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 hover:from-blue-700 hover:to-indigo-700 focus:ring-blue-500 shadow-lg shadow-blue-500/25"
            aria-label="Analyse floor plan"
          >
            Analyse Floor Plan
          </button>
          <button
            onClick={onReset}
            className="inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 border border-slate-300 text-slate-700 px-6 py-3 hover:bg-slate-50 focus:ring-slate-400"
            aria-label="Reset form"
          >
            Reset
          </button>
        </div>
      </div>
    </section>
  );
}
