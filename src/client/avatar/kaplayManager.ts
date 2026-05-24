"use client";

// ─────────────────────────────────────────────────────────────────
// kaplayManager — module-level Kaplay singleton
//
// Kaplay panics if you call kaplay() while a previous instance is
// still alive. Since React doesn't guarantee synchronous unmount
// before the next mount, we keep a global reference and always
// destroy it before creating a new one.
// ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let active: any = null;

/** Destroy the running Kaplay instance (safe to call if none exists). */
export function destroyKaplay(): void {
  if (active) {
    try { active.quit(); } catch { /**/ }
    active = null;
  }
}

/**
 * Create a new Kaplay instance on the given canvas.
 * Destroys any existing instance first, then waits one animation frame
 * to let the previous RAF loop fully stop before starting the next.
 *
 * Returns null if the canvas was removed from the DOM before we started
 * (handles race between async import and React unmount).
 */
export async function createKaplay(
  canvas: HTMLCanvasElement,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: Record<string, any>,
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any | null> {
  // 1. Destroy existing instance
  destroyKaplay();

  // 2. Wait one RAF so the previous game loop's cancelAnimationFrame fires
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  // 3. Check canvas is still in the DOM (component might have unmounted)
  if (!canvas.isConnected) return null;

  // 4. Dynamic import (cached by bundler after first load)
  const { default: kaplay } = await import("kaplay");

  // 5. Check again — the async import can take a few ms
  if (!canvas.isConnected) return null;

  // Kaplay 3001.x emits a "KAPLAY already initialized" console.warn even after
  // quit() because its module-level `a.k` flag isn't fully cleared by quit().
  // We've already destroyed the previous instance above; suppress just that one
  // spurious warning to keep the console clean.
  const _origWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].includes("already initialized")) return;
    _origWarn.apply(console, args);
  };
  try {
    active = kaplay({ canvas, ...config });
  } finally {
    console.warn = _origWarn;
  }
  return active;
}
