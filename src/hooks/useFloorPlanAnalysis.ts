"use client";

import { useState, useCallback } from "react";

import type { AnalysisResult } from "@/types/floorPlan";
import { DEFAULT_ROOF_HEIGHT } from "@/constants/floorPlan";
import { validateFileFormat, validateRoofHeight } from "@/lib/validation";

type AnalysisStatus = "idle" | "uploading" | "results" | "error";

interface FloorPlanAnalysisState {
  status: AnalysisStatus;
  selectedFile: File | null;
  roofHeight: string;
  result: AnalysisResult | null;
  errorMessage: string | null;
  formatError: string | null;
  roofHeightError: string | null;
}

const initialState: FloorPlanAnalysisState = {
  status: "idle",
  selectedFile: null,
  roofHeight: String(DEFAULT_ROOF_HEIGHT),
  result: null,
  errorMessage: null,
  formatError: null,
  roofHeightError: null,
};

export function useFloorPlanAnalysis() {
  const [state, setState] = useState<FloorPlanAnalysisState>(initialState);

  const setFile = useCallback((file: File) => {
    const validation = validateFileFormat(file);
    if (!validation.valid) {
      setState((prev) => ({
        ...prev,
        formatError: validation.message ?? null,
        selectedFile: null,
      }));
      return;
    }
    setState((prev) => ({
      ...prev,
      selectedFile: file,
      formatError: null,
    }));
  }, []);

  const removeFile = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedFile: null,
      formatError: null,
    }));
  }, []);

  const setRoofHeight = useCallback((value: string) => {
    setState((prev) => ({ ...prev, roofHeight: value }));
  }, []);

  const setRoofHeightError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, roofHeightError: error }));
  }, []);

  const clearFormatError = useCallback(() => {
    setState((prev) => ({ ...prev, formatError: null }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  const submit = useCallback(async () => {
    const { selectedFile, roofHeight } = state;

    // Validate file selected
    if (!selectedFile) {
      return;
    }

    // Validate roof height
    const roofValidation = validateRoofHeight(roofHeight);
    if (!roofValidation.valid) {
      setState((prev) => ({
        ...prev,
        roofHeightError:
          roofValidation.message ??
          "Please enter a valid roof height greater than zero.",
      }));
      return;
    }

    // Start uploading
    setState((prev) => ({
      ...prev,
      status: "uploading",
      errorMessage: null,
    }));

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);
      formData.append("roofHeight", roofHeight);

      const response = await fetch("/api/analyse", {
        method: "POST",
        body: formData,
      });

      const json = await response.json();

      if (!response.ok) {
        setState((prev) => ({
          ...prev,
          status: "error",
          errorMessage:
            json.error?.message ??
            "Unable to process this floor plan. Please try uploading a clearer image.",
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        status: "results",
        result: json.data,
      }));
    } catch {
      setState((prev) => ({
        ...prev,
        status: "error",
        errorMessage:
          "Unable to process this floor plan. Please try uploading a clearer image.",
      }));
    }
  }, [state]);

  return {
    ...state,
    setFile,
    removeFile,
    setRoofHeight,
    setRoofHeightError,
    clearFormatError,
    submit,
    reset,
  };
}
