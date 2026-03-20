import type { AnalysisResult } from "@/types/floorPlan";
import {
  generateAnalysisJson,
  generateAnalysisSpreadsheet,
  downloadBlob,
} from "@/lib/downloadGenerators";

interface ResultsSummaryProps {
  result: AnalysisResult;
  onNewUpload: () => void;
}

export function ResultsSummary({ result, onNewUpload }: ResultsSummaryProps) {
  const handleDownloadJson = () => {
    const blob = generateAnalysisJson(result);
    const baseName = result.sourceFileName.replace(/\.[^.]+$/, "");
    downloadBlob(blob, `${baseName}-analysis.json`);
  };

  const handleDownloadSpreadsheet = () => {
    const blob = generateAnalysisSpreadsheet(result);
    const baseName = result.sourceFileName.replace(/\.[^.]+$/, "");
    downloadBlob(blob, `${baseName}-analysis.csv`);
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 sm:p-8 border border-white/50 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Analysis Results
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            {result.sourceFileName} — {result.rooms.length} room
            {result.rooms.length !== 1 ? "s" : ""} detected
          </p>
        </div>
        <div className="flex items-center gap-3 bg-blue-50 rounded-xl px-5 py-3">
          <span className="text-sm font-medium text-slate-700">
            Total Floor Area
          </span>
          <span className="text-2xl font-bold text-blue-600">
            {result.totalFloorArea}{" "}
            <span className="text-sm font-medium">m²</span>
          </span>
        </div>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleDownloadJson}
          className="inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 hover:from-blue-700 hover:to-indigo-700 focus:ring-blue-500 shadow-lg shadow-blue-500/25"
          aria-label="Download analysis as JSON"
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
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
            />
          </svg>
          Download JSON
        </button>
        <button
          onClick={handleDownloadSpreadsheet}
          className="inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 border border-slate-300 text-slate-700 px-6 py-3 hover:bg-slate-50 focus:ring-slate-400"
          aria-label="Download analysis as spreadsheet"
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
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
            />
          </svg>
          Download Spreadsheet
        </button>
        <button
          onClick={onNewUpload}
          className="inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 border border-slate-300 text-slate-700 px-6 py-3 hover:bg-slate-50 focus:ring-slate-400"
          aria-label="Upload another plan"
        >
          Upload Another Plan
        </button>
      </div>
    </div>
  );
}
