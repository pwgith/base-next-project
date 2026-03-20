import type { AnalysisResult } from "@/types/floorPlan";
import { AnnotatedFloorPlan } from "@/components/annotatedFloorPlan";
import { ResultsSummary } from "@/components/resultsSummary";
import { RoomCard } from "@/components/roomCard";

interface AnalysisResultsProps {
  result: AnalysisResult;
  onNewUpload: () => void;
}

export function AnalysisResults({ result, onNewUpload }: AnalysisResultsProps) {
  return (
    <section className="space-y-8">
      <AnnotatedFloorPlan
        imageUrl={result.annotatedImageUrl}
        sourceFileName={result.sourceFileName}
      />
      <ResultsSummary result={result} onNewUpload={onNewUpload} />
      {result.rooms.map((room) => (
        <RoomCard key={room.name} room={room} />
      ))}
    </section>
  );
}
