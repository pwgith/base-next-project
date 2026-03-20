interface AnnotatedFloorPlanProps {
  imageUrl: string;
  sourceFileName: string;
}

export function AnnotatedFloorPlan({
  imageUrl,
  sourceFileName,
}: AnnotatedFloorPlanProps) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 sm:p-8 border border-white/50 animate-fade-in">
      <h2 className="text-xl font-semibold text-slate-900 mb-4">
        Annotated Floor Plan
      </h2>
      <p className="text-sm text-slate-600 mb-6">
        Each room has been identified and labelled. Rooms with existing names
        keep their original labels. Rooms without useful names have been assigned
        labels (Room A, Room B, etc.).
      </p>
      <div className="relative bg-slate-100 rounded-xl border border-slate-200 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={`Annotated floor plan of ${sourceFileName}`}
          className="w-full h-auto max-h-[500px] object-contain"
        />
      </div>
    </div>
  );
}
