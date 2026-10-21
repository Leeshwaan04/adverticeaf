"use client";

import { useSyncExternalStore } from "react";
import { MINE_KEY, addMine, parseMine, serializeMine } from "./mine";

const EMPTY: readonly number[] = [];
let state: readonly number[] | null = null;
const listeners = new Set<() => void>();
let wired = false;

function readStorage(): readonly number[] {
  try {
    return parseMine(window.localStorage.getItem(MINE_KEY));
  } catch {
    return EMPTY;
  }
}

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  if (!wired && typeof window !== "undefined") {
    wired = true;
    window.addEventListener("storage", (e) => {
      if (e.key === MINE_KEY) {
        state = readStorage();
        emit();
      }
    });
  }
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): readonly number[] {
  if (state === null) state = readStorage();
  return state;
}

/** Remember tiles the buyer owns. Works in memory when storage is blocked. */
export function rememberTiles(tiles: readonly number[]): void {
  state = addMine(getSnapshot(), tiles);
  try {
    window.localStorage.setItem(MINE_KEY, serializeMine(state));
  } catch {
    /* in memory only */
  }
  emit();
}

/** Tile indexes this device bought. Empty on the server and during hydration. */
export function useMine(): readonly number[] {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}
