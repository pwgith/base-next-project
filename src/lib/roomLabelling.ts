import type { RawRoom } from "@/types/floorPlan";

/**
 * Assign labels to rooms. Rooms that already have a useful name keep it.
 * Rooms with a null or empty name are assigned sequential labels:
 * "Room A", "Room B", "Room C", etc.
 *
 * Only unlabelled rooms consume a letter.
 */
export function assignRoomLabels(
  rawRooms: RawRoom[],
): { name: string; width: number; length: number }[] {
  let letterIndex = 0;

  return rawRooms.map((room) => {
    const hasUsefulName = room.name !== null && room.name.trim().length > 0;

    if (hasUsefulName) {
      return { name: room.name as string, width: room.width, length: room.length };
    }

    const letter = String.fromCharCode(65 + letterIndex); // A, B, C, …
    letterIndex++;
    return { name: `Room ${letter}`, width: room.width, length: room.length };
  });
}
