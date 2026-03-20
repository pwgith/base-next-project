import type { Metadata } from "next";

import { AnalyseFloorPlan } from "@/components/analyseFloorPlan";

export const metadata: Metadata = {
  title: "Analyse Floor Plan — Model Helper",
  description:
    "Upload a floor plan image and get a detailed room-by-room measurement breakdown.",
};

export default function PlansPage() {
  return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Analyse Floor Plan
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Upload a floor plan image and get a detailed room-by-room
            measurement breakdown.
          </p>
        </div>

        <AnalyseFloorPlan />
      </main>
  );
}
