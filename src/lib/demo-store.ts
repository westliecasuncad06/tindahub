import { applyCommand } from "./domain";
import type { AppData, Command } from "./types";

const KEY = "tindahub_demo_v2";
/** Browser-local examples only. Real stores never use localStorage for business data. */
export function createDemoStore(initial: AppData, enabled = true) {
  let data = initial;
  const listeners = new Set<() => void>();
  let error = "";
  function read() {
    if (!enabled || typeof window === "undefined") return;
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const value = JSON.parse(raw) as AppData;
    if (
      value.version !== 2 ||
      !Array.isArray(value.products) ||
      !Array.isArray(value.sales) ||
      !value.processed_commands
    )
      throw new Error(
        "Saved demo data cannot be loaded. Reset the demo from Settings.",
      );
    data = value;
  }
  try {
    read();
  } catch (e) {
    error = e instanceof Error ? e.message : "Demo storage is unavailable.";
  }
  const emit = () => listeners.forEach((fn) => fn());
  const storage = (event: StorageEvent) => {
    if (event.key === KEY) {
      try {
        if (event.newValue) read();
        else data = initial;
        emit();
      } catch {
        /* Preserve the last valid snapshot. */
      }
    }
  };
  let queue = Promise.resolve(initial);
  return {
    error,
    getSnapshot: () => data,
    subscribe(fn: () => void) {
      if (enabled && !listeners.size && typeof window !== "undefined")
        window.addEventListener("storage", storage);
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
        if (!listeners.size && typeof window !== "undefined")
          window.removeEventListener("storage", storage);
      };
    },
    async execute(command: Command) {
      const work = async () => {
        read();
        const next = applyCommand(data, command);
        localStorage.setItem(KEY, JSON.stringify(next));
        data = next;
        emit();
        return data;
      };
      if (navigator.locks) return navigator.locks.request(KEY, work);
      queue = queue.catch(() => data).then(work);
      return queue;
    },
    reset() {
      localStorage.removeItem(KEY);
      data = initial;
      error = "";
      emit();
    },
  };
}
