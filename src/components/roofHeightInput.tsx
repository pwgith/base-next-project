import { useCallback } from "react";

import { validateRoofHeight } from "@/lib/validation";

interface RoofHeightInputProps {
  value: string;
  onChange: (value: string) => void;
  error: string | null;
  onErrorChange: (error: string | null) => void;
}

export function RoofHeightInput({
  value,
  onChange,
  error,
  onErrorChange,
}: RoofHeightInputProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      onChange(newValue);

      if (newValue === "") {
        onErrorChange("Please enter a valid roof height greater than zero.");
        return;
      }

      const validation = validateRoofHeight(newValue);
      onErrorChange(validation.valid ? null : (validation.message ?? null));
    },
    [onChange, onErrorChange],
  );

  return (
    <div className="mt-6 space-y-1.5">
      <label
        htmlFor="roofHeight"
        className="block text-sm font-medium text-slate-700"
      >
        Default Roof Height (m)
      </label>
      <input
        id="roofHeight"
        type="number"
        step="0.1"
        min="0.1"
        value={value}
        onChange={handleChange}
        className={`w-full max-w-xs px-4 py-3 rounded-xl border bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
          error
            ? "border-red-400 focus:ring-red-500"
            : "border-slate-200 focus:ring-blue-500"
        }`}
        aria-describedby="roofHeightHelp roofHeightError"
      />
      <p id="roofHeightHelp" className="text-xs text-slate-500">
        Standard Australian ceiling height is 2.4 m.
      </p>
      {error && (
        <p
          id="roofHeightError"
          className="text-xs text-red-600 flex items-center gap-1"
        >
          <svg
            className="h-3.5 w-3.5"
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
          {error}
        </p>
      )}
    </div>
  );
}
