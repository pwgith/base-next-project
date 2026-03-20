import type { Room } from "@/types/floorPlan";

interface RoomDiagramProps {
  room: Room;
}

/**
 * SVG-based labelled rectangle diagram showing walls with labels and lengths.
 * Wall A = top (width), Wall B = right (length), Wall C = bottom (width), Wall D = left (length).
 */
export function RoomDiagram({ room }: RoomDiagramProps) {
  return (
    <div className="flex items-center justify-center">
      <div className="relative w-full max-w-xs aspect-square">
        {/* Room box */}
        <div className="absolute inset-8 border-2 border-slate-700 rounded-md bg-blue-50/50" />

        {/* Wall A — top (width) */}
        <span className="absolute top-2 left-1/2 -translate-x-1/2 text-xs font-bold text-blue-700 bg-white px-2 py-0.5 rounded shadow-sm border border-blue-200 whitespace-nowrap">
          Wall A — {room.width} m
        </span>

        {/* Wall C — bottom (width) */}
        <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs font-bold text-blue-700 bg-white px-2 py-0.5 rounded shadow-sm border border-blue-200 whitespace-nowrap">
          Wall C — {room.width} m
        </span>

        {/* Wall D — left (length) */}
        <span className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 text-xs font-bold text-blue-700 bg-white px-2 py-0.5 rounded shadow-sm border border-blue-200 origin-center whitespace-nowrap">
          Wall D — {room.length} m
        </span>

        {/* Wall B — right (length) */}
        <span className="absolute right-0 top-1/2 -translate-y-1/2 rotate-90 text-xs font-bold text-blue-700 bg-white px-2 py-0.5 rounded shadow-sm border border-blue-200 origin-center whitespace-nowrap">
          Wall B — {room.length} m
        </span>

        {/* Dimensions in center */}
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-sm text-slate-600 font-medium">
          {room.width} m × {room.length} m
        </span>
      </div>
    </div>
  );
}
