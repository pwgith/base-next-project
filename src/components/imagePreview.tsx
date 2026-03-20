import { useMemo } from "react";

interface ImagePreviewProps {
  file: File;
  onRemove: () => void;
}

export function ImagePreview({ file, onRemove }: ImagePreviewProps) {
  const previewUrl = useMemo(() => URL.createObjectURL(file), [file]);

  return (
    <div className="mt-4 rounded-xl overflow-hidden border border-slate-200">
      <div className="bg-slate-100 flex items-center justify-center h-48 sm:h-64">
        {file.type.startsWith("image/") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={`Preview of ${file.name}`}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="text-sm text-slate-500">{file.name} — preview</span>
        )}
      </div>
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50 text-xs text-slate-600">
        <span>{file.name}</span>
        <button
          onClick={onRemove}
          className="text-red-500 hover:text-red-700 font-medium"
          aria-label="Remove selected file"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
