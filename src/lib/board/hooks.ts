"use client";

import { useCallback, useEffect, useEffectEvent, useState, useSyncExternalStore } from "react";

export interface LiveState<T> {
  data: T | null;
  /** True on first load and whenever deps change. `data` keeps the previous value meanwhile. */
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

interface Settled<T> {
  key: string;
  data: T | null;
  error: string | null;
}

/**
 * Load data on mount, whenever `deps` change, and whenever `subscribe` fires (demo store changes,
 * or a live-API poll or stream). Initial render is always the loading state, so server and client
 * markup match. `deps` should be primitives.
 */
export function useLive<T>(
  fetcher: () => Promise<T>,
  subscribe: ((cb: () => void) => () => void) | undefined,
  deps: readonly unknown[],
): LiveState<T> {
  const key = JSON.stringify(deps);
  const [version, setVersion] = useState(0);
  const [settled, setSettled] = useState<Settled<T>>({ key: "", data: null, error: null });
  const load = useEffectEvent(fetcher);

  useEffect(() => {
    let cancelled = false;
    load().then(
      (data) => {
        if (!cancelled) setSettled({ key, data, error: null });
      },
      (e: unknown) => {
        if (!cancelled) {
          setSettled((s) => ({ key, data: s.data, error: e instanceof Error ? e.message : "Could not load. Please try again." }));
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [key, version]);

  useEffect(() => subscribe?.(() => setVersion((v) => v + 1)), [subscribe]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  return { data: settled.data, loading: settled.key !== key, error: settled.key === key ? settled.error : null, refresh };
}

/** Current time, updated every `intervalMs`. null on the server and first render so markup matches. */
export function useNow(intervalMs = 1000): number | null {
  const subscribe = useCallback(
    (cb: () => void) => {
      const id = setInterval(cb, intervalMs);
      return () => clearInterval(id);
    },
    [intervalMs],
  );
  return useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / intervalMs) * intervalMs,
    () => null,
  );
}
