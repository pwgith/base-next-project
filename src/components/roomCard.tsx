import type { Room } from "@/types/floorPlan";
import { RoomDiagram } from "@/components/roomDiagram";
import { MeasurementTable } from "@/components/measurementTable";

interface RoomCardProps {
  room: Room;
}

export function RoomCard({ room }: RoomCardProps) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 overflow-hidden animate-fade-in">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
        <h3 className="text-lg font-semibold text-white">{room.name}</h3>
      </div>
      <div className="p-6 sm:p-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <RoomDiagram room={room} />
          <MeasurementTable room={room} />
        </div>
      </div>
    </div>
  );
}
