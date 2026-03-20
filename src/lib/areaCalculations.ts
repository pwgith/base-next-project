import type { Wall, Room } from "@/types/floorPlan";

/**
 * Calculate the area of a single wall.
 * @returns area in sq m (length × height)
 */
export function calculateWallArea(length: number, height: number): number {
  return Math.round(length * height * 100) / 100;
}

/**
 * Calculate the floor area of a rectangular room.
 * @returns area in sq m (width × length)
 */
export function calculateFloorArea(width: number, length: number): number {
  return Math.round(width * length * 100) / 100;
}

/**
 * Calculate the ceiling area of a rectangular room.
 * Ceiling area equals floor area for rectangular rooms.
 * @returns area in sq m
 */
export function calculateCeilingArea(width: number, length: number): number {
  return calculateFloorArea(width, length);
}

/**
 * Calculate the total wall area from an array of walls.
 * @returns sum of all wall areas in sq m
 */
export function calculateTotalWallArea(walls: Wall[]): number {
  return Math.round(walls.reduce((sum, w) => sum + w.area, 0) * 100) / 100;
}

/**
 * Calculate the total floor area across all rooms.
 * @returns sum of all room floor areas in sq m
 */
export function calculateTotalFloorArea(rooms: Room[]): number {
  return Math.round(rooms.reduce((sum, r) => sum + r.floorArea, 0) * 100) / 100;
}

/**
 * Build the four walls for a rectangular room.
 * Wall A & C = width walls (top/bottom), Wall B & D = length walls (right/left).
 */
export function buildRoomWalls(
  width: number,
  length: number,
  height: number,
): Wall[] {
  return [
    { label: "Wall A", length: width, height, area: calculateWallArea(width, height) },
    { label: "Wall B", length, height, area: calculateWallArea(length, height) },
    { label: "Wall C", length: width, height, area: calculateWallArea(width, height) },
    { label: "Wall D", length, height, area: calculateWallArea(length, height) },
  ];
}
