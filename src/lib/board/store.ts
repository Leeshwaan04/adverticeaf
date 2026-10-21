/**
 * Tiny versioned localStorage store with change notification. Used ONLY by the demo adapters.
 * Every access is wrapped: storage can be blocked, full or unavailable, and the app must still work
 * (it falls back to in-memory state for the session).
 */
type Listener = () => void;

export interface Store<T> {
  get(): T;
  set(next: T): void;
  update(fn: (draft: T) => T): void;
  subscribe(fn: Listener): () => void;
  reset(): void;
}

export function createStore<T>(key: string, seed: () => T): Store<T> {
  let cache: T | null = null;
  const listeners = new Set<Listener>();

  const load = (): T => {
    if (cache) return cache;
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
      if (raw) {
        cache = JSON.parse(raw) as T;
        return cache;
      }
    } catch {
      /* fall through to seed */
    }
    cache = seed();
    persist(cache);
    return cache;
  };

  const persist = (value: T) => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* in-memory only */
    }
  };

  const emit = () => listeners.forEach((l) => l());

  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (e.key === key) {
        cache = null;
        emit();
      }
    });
  }

  return {
    get: load,
    set(next) {
      cache = next;
      persist(next);
      emit();
    },
    update(fn) {
      this.set(fn(structuredClone(load())));
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    reset() {
      cache = seed();
      persist(cache);
      emit();
    },
  };
}

/** Simulated network latency for demo adapters. */
export const delay = (ms = 500) => new Promise<void>((r) => setTimeout(r, ms));

export const uid = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
