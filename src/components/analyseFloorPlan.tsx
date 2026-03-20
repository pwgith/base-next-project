"use client";

import { useFloorPlanAnalysis } from "@/hooks/useFloorPlanAnalysis";
import { UploadForm } from "@/components/uploadForm";
import { LoadingIndicator } from "@/components/loadingIndicator";
import { AnalysisError } from "@/components/analysisError";
import { AnalysisResults } from "@/components/analysisResults";

export function AnalyseFloorPlan() {
  const {
    status,
    selectedFile,
    roofHeight,
    result,
    errorMessage,
    formatError,
    roofHeightError,
    setFile,
    removeFile,
    setRoofHeight,
    setRoofHeightError,
    clearFormatError,
    submit,
    reset,
  } = useFloorPlanAnalysis();

  if (status === "uploading") {
    return <LoadingIndicator />;
  }

  if (status === "error" && errorMessage) {
    return <AnalysisError message={errorMessage} onRetry={reset} />;
  }

  if (status === "results" && result) {
    return <AnalysisResults result={result} onNewUpload={reset} />;
  }

  return (
    <UploadForm
      selectedFile={selectedFile}
      onFileSelected={setFile}
      onFileRemoved={removeFile}
      roofHeight={roofHeight}
      onRoofHeightChange={setRoofHeight}
      roofHeightError={roofHeightError}
      onRoofHeightErrorChange={setRoofHeightError}
      formatError={formatError}
      onFormatErrorClear={clearFormatError}
      onSubmit={submit}
      onReset={reset}
    />
  );
}
