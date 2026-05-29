"use client";

// ============================================================
// Pyodide runner (main-thread API over the worker)
//
// Owns the worker lifecycle and enforces a hard timeout by terminating the
// worker — the only reliable way to stop an infinite loop in Python/WASM.
// After a termination the worker is recreated lazily on the next run
// (Pyodide re-loads), which is an acceptable cost for the rare timeout case.
// ============================================================

export interface RunResult {
  passed: boolean;
  detail: string;
  stdout: string;
  error?: string | null;
  timedOut?: boolean;
  durationMs: number;
}

let worker: Worker | null = null;

function ensureWorker(): Worker {
  if (!worker) {
    worker = new Worker("/pyodide.worker.js");
  }
  return worker;
}

/** Warm up Pyodide in the background so the first Run feels instant. */
export function preloadPyodide(): void {
  try {
    const w = ensureWorker();
    w.postMessage({ id: `preload-${Date.now()}`, type: "preload" });
  } catch {
    /* worker unsupported — runner will surface the error on first run */
  }
}

/**
 * Run student `code` followed by the task's hidden `harness`. Resolves with a
 * structured result. If execution exceeds `timeoutMs`, the worker is killed
 * and `timedOut` is reported (e.g. an unfixed infinite loop, or an
 * un-optimized O(n²) solution on the large performance input).
 */
export function runPython(
  code: string,
  harness: string,
  timeoutMs = 6000
): Promise<RunResult> {
  const start = Date.now();
  return new Promise<RunResult>((resolve) => {
    let w: Worker;
    try {
      w = ensureWorker();
    } catch (err) {
      resolve({
        passed: false,
        detail: "Tu navegador no soporta el entorno de ejecución.",
        stdout: "",
        error: String(err),
        durationMs: 0,
      });
      return;
    }

    const id = crypto.randomUUID();

    const timer = setTimeout(() => {
      w.removeEventListener("message", onMsg);
      w.terminate();
      worker = null; // force re-create (and reload Pyodide) next run
      resolve({
        passed: false,
        timedOut: true,
        detail:
          "Tiempo excedido. Puede ser un bucle infinito o un algoritmo demasiado lento para entradas grandes.",
        stdout: "",
        durationMs: Date.now() - start,
      });
    }, timeoutMs);

    const onMsg = (e: MessageEvent) => {
      if (e.data?.id !== id || !e.data.result) return;
      clearTimeout(timer);
      w.removeEventListener("message", onMsg);
      resolve({ ...e.data.result, durationMs: Date.now() - start });
    };

    w.addEventListener("message", onMsg);
    w.postMessage({ id, type: "run", code, harness });
  });
}
