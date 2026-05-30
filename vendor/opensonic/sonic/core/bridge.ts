// ============================================================
// Host bridge — postMessage channel between the engine (in an iframe) and the
// React tutoring app. Added for the "Debug Zones" reimagining; not part of the
// upstream opensonic-js engine.
//
// Engine → host:  window.parent.postMessage({ source:"sonic-engine", type, payload })
// Host → engine:  postMessage({ target:"sonic-engine", type, payload })
// ============================================================

let paused = false;
let ready = false;
let readyPayload: unknown = null;

export const bridge_is_paused = (): boolean => paused;
export const bridge_set_paused = (v: boolean): void => { paused = v; };

/** Mark the engine ready and announce it. Re-announced on host "ping" so a
 *  late-attaching host listener never misses the one-shot event. */
export const bridge_ready = (payload?: unknown): void => {
  ready = true;
  readyPayload = payload;
  bridge_emit("engine-ready", payload);
};

/** Emit an event to the host React app (no-op when not embedded). */
export const bridge_emit = (type: string, payload?: unknown): void => {
  if (typeof window === "undefined") return;
  try {
    window.parent?.postMessage({ source: "sonic-engine", type, payload }, "*");
  } catch {
    /* cross-origin or no parent — ignore */
  }
};

/** Start listening for host → engine commands (pause/resume, etc.). */
export const bridge_init = (): void => {
  if (typeof window === "undefined") return;
  window.addEventListener("message", (e: MessageEvent) => {
    const d = e.data;
    if (!d || d.target !== "sonic-engine") return;
    switch (d.type) {
      case "pause":  paused = true;  break;
      case "resume": paused = false; break;
      case "ping":   if (ready) bridge_emit("engine-ready", readyPayload); break;
    }
  });
};
