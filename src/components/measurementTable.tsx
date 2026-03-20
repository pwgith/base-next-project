import type { Room } from "@/types/floorPlan";

interface MeasurementTableProps {
  room: Room;
}

export function MeasurementTable({ room }: MeasurementTableProps) {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
        Dimensions
      </h4>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-slate-500 text-xs">Width</p>
          <p className="font-semibold text-slate-900">{room.width} m</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-slate-500 text-xs">Length</p>
          <p className="font-semibold text-slate-900">{room.length} m</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-slate-500 text-xs">Height</p>
          <p className="font-semibold text-slate-900">{room.height} m</p>
        </div>
      </div>

      <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider pt-2">
        Areas
      </h4>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-emerald-50 rounded-lg p-3 text-center">
          <p className="text-emerald-700 text-xs">Floor Area</p>
          <p className="font-semibold text-emerald-800">{room.floorArea} m²</p>
        </div>
        <div className="bg-emerald-50 rounded-lg p-3 text-center">
          <p className="text-emerald-700 text-xs">Ceiling Area</p>
          <p className="font-semibold text-emerald-800">
            {room.ceilingArea} m²
          </p>
        </div>
      </div>

      <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider pt-2">
        Wall Areas
      </h4>
      <div className="overflow-x-auto">
        <table
          className="w-full text-sm text-left"
          aria-label={`${room.name} wall areas`}
        >
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <th className="py-2 pr-4 font-medium">Wall</th>
              <th className="py-2 pr-4 font-medium">Length</th>
              <th className="py-2 pr-4 font-medium">Height</th>
              <th className="py-2 font-medium text-right">Area</th>
            </tr>
          </thead>
          <tbody className="text-slate-700">
            {room.walls.map((wall, index) => (
              <tr
                key={wall.label}
                className={
                  index < room.walls.length - 1
                    ? "border-b border-slate-100"
                    : ""
                }
              >
                <td className="py-2 pr-4 font-medium">{wall.label}</td>
                <td className="py-2 pr-4">{wall.length} m</td>
                <td className="py-2 pr-4">{wall.height} m</td>
                <td className="py-2 text-right font-semibold">
                  {wall.area} m²
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-300">
              <td
                colSpan={3}
                className="py-2 pr-4 font-semibold text-slate-900"
              >
                Total Wall Area
              </td>
              <td className="py-2 text-right font-bold text-slate-900">
                {room.totalWallArea} m²
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
