/* eslint-disable */
// ============================================================
// Pyodide execution worker
//
// Runs the student's Python in a WASM sandbox off the main thread. Running
// in a worker is what lets us KILL an infinite loop: the main thread sets a
// timeout and calls worker.terminate() if a run doesn't return — impossible
// on the main thread, where an infinite loop freezes the whole tab. This
// matters here because Task 1 is literally an infinite-loop bug.
// ============================================================

const PYODIDE_VERSION = "v0.26.4";
let pyodidePromise = null;

async function getPyodide() {
  if (!pyodidePromise) {
    importScripts(
      `https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full/pyodide.js`
    );
    // eslint-disable-next-line no-undef
    pyodidePromise = loadPyodide({
      indexURL: `https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full/`,
    });
  }
  return pyodidePromise;
}

self.onmessage = async (e) => {
  const { id, type, code, harness } = e.data;

  if (type === "preload") {
    try {
      await getPyodide();
      self.postMessage({ id, ready: true });
    } catch (err) {
      self.postMessage({ id, ready: false, error: String(err) });
    }
    return;
  }

  if (type === "run") {
    let stdout = "";
    try {
      const pyodide = await getPyodide();
      pyodide.setStdout({ batched: (s) => { stdout += s + "\n"; } });
      pyodide.setStderr({ batched: (s) => { stdout += s + "\n"; } });

      // Fresh namespace per run so functions from a previous run don't leak.
      const namespace = pyodide.runPython("dict()");
      const program = `${code}\n\n${harness}`;

      let result = { passed: false, detail: "", stdout: "", error: null };
      try {
        await pyodide.runPythonAsync(program, { globals: namespace });
        // Harness prints a marker line: __TESTS__{json}
        const marker = stdout
          .split("\n")
          .find((l) => l.startsWith("__TESTS__"));
        if (marker) {
          const parsed = JSON.parse(marker.slice("__TESTS__".length));
          result.passed = !!parsed.passed;
          result.detail = parsed.detail || "";
        } else {
          result.detail = "No se pudo evaluar la salida de las pruebas.";
        }
      } catch (runErr) {
        result.error = String(runErr.message || runErr);
        result.detail = "Error de ejecución de Python.";
      } finally {
        namespace.destroy();
      }

      // Strip the internal marker from the user-visible console output.
      result.stdout = stdout
        .split("\n")
        .filter((l) => !l.startsWith("__TESTS__"))
        .join("\n")
        .trim();

      self.postMessage({ id, result });
    } catch (err) {
      self.postMessage({
        id,
        result: {
          passed: false,
          detail: "No se pudo iniciar el entorno de Python.",
          stdout: stdout.trim(),
          error: String(err),
        },
      });
    }
  }
};
