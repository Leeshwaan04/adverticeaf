/** "My tiles": tile indexes the buyer purchased on this device, kept in localStorage. Pure helpers. */
import { TOTAL_TILES, isTileIndex } from "./rules";

export const MINE_KEY = "adv-board-wall-mine-v1";

/** Parse stored JSON into a sorted, de-duplicated list of valid tile indexes. Anything else is ignored. */
export function parseMine(raw: string | null | undefined): number[] {
  if (!raw) return [];
  try {
    const v: unknown = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return normaliseMine(v.filter((n): n is number => isTileIndex(n)));
  } catch {
    return [];
  }
}

export function normaliseMine(tiles: readonly number[]): number[] {
  return Array.from(new Set(tiles.filter((n) => isTileIndex(n)))).sort((a, b) => a - b).slice(0, TOTAL_TILES);
}

export function addMine(existing: readonly number[], added: readonly number[]): number[] {
  return normaliseMine([...existing, ...added]);
}

export const serializeMine = (tiles: readonly number[]): string => JSON.stringify(normaliseMine(tiles));
