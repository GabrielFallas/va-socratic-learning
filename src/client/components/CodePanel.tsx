"use client";

import { useEffect, useRef, useState } from "react";
import type { Task } from "@/shared/types/session";
import type { RunResult } from "@/client/code/pyodideRunner";
import { preloadPyodide, runPython } from "@/client/code/pyodideRunner";

export interface TaskCompleteMeta {
  runAttempts: number;
  testsPassed: boolean;
  codeEdited: boolean;
  resolution: "tests-passed" | "gave-up";
  detail?: string;
}

interface CodePanelProps {
  task: Task;
  timeRemainingSeconds: number;
  turnCount: number;
  onTaskComplete: (resolved: boolean, meta?: TaskCompleteMeta) => void;
}

// ── Left-to-right tokenizer for Python syntax highlighting ──────────────
// (Single raw pass — never re-scans already-emitted HTML.)
function highlightPython(raw: string): string {
  const src = raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const rules: Array<{ re: RegExp; emit: (m: string) => string }> = [
    { re: /#[^\n]*/, emit: (m) => `<span style="color:#6a9955;font-style:italic">${m}</span>` },
    { re: /"""[^]*?"""|'''[^]*?'''/, emit: (m) => `<span style="color:#ce9178">${m}</span>` },
    { re: /f?"(?:[^"\\]|\\.)*"|f?'(?:[^'\\]|\\.)*'/, emit: (m) => `<span style="color:#ce9178">${m}</span>` },
    { re: /@\w+/, emit: (m) => `<span style="color:#dcdcaa">${m}</span>` },
    {
      re: /\bdef\s+\w+/,
      emit: (m) => {
        const sp = m.match(/\s+/);
        if (!sp || sp.index === undefined) {
          return `<span style="color:#569cd6;font-weight:bold">${m}</span>`;
        }
        const kw = m.slice(0, sp.index);
        const name = m.slice(sp.index + sp[0].length);
        return (
          `<span style="color:#569cd6;font-weight:bold">${kw}</span>` +
          sp[0] +
          `<span style="color:#dcdcaa;font-weight:bold">${name}</span>`
        );
      },
    },
    {
      re: /\b(return|while|for|if|else|elif|import|from|in|not|and|or|True|False|None|class|with|as|try|except|finally|raise|pass|break|continue|lambda|yield|global|nonlocal|async|await)\b/,
      emit: (m) => `<span style="color:#569cd6;font-weight:bold">${m}</span>`,
    },
    {
      re: /\b(print|len|range|type|int|str|list|dict|set|tuple|bool|float|sum|min|max|sorted|enumerate|zip|map|filter|any|all|input|open|randint|random)\b/,
      emit: (m) => `<span style="color:#4ec9b0">${m}</span>`,
    },
    { re: /\b\d+(?:\.\d+)?\b/, emit: (m) => `<span style="color:#b5cea8">${m}</span>` },
  ];

  let out = "";
  let pos = 0;
  while (pos < src.length) {
    let bestStart = src.length;
    let bestLen = 0;
    let bestEmit = "";
    for (const rule of rules) {
      const m = src.slice(pos).match(rule.re);
      if (m && m.index !== undefined) {
        const start = pos + m.index;
        if (start < bestStart || (start === bestStart && m[0].length > bestLen)) {
          bestStart = start;
          bestLen = m[0].length;
          bestEmit = rule.emit(m[0]);
        }
      }
    }
    if (bestLen === 0) {
      out += src.slice(pos);
      break;
    }
    out += src.slice(pos, bestStart);
    out += bestEmit;
    pos = bestStart + bestLen;
  }
  // Trailing newline so the highlighted layer keeps height parity with textarea.
  return out + "\n";
}

const EDITOR_FONT: React.CSSProperties = {
  fontFamily: "'Courier New', monospace",
  fontSize: "13px",
  lineHeight: "22px",
  padding: "16px",
  margin: 0,
  whiteSpace: "pre",
  tabSize: 4,
  border: "none",
  letterSpacing: "normal",
};

export default function CodePanel({
  task,
  timeRemainingSeconds,
  turnCount,
  onTaskComplete,
}: CodePanelProps) {
  const [code, setCode] = useState(task.buggyCode);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [resolved, setResolved] = useState(false);

  const runAttemptsRef = useRef(0);
  const preRef = useRef<HTMLPreElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Reset editor + warm up Pyodide whenever the task changes.
  useEffect(() => {
    setCode(task.buggyCode);
    setResult(null);
    setResolved(false);
    runAttemptsRef.current = 0;
    preloadPyodide();
  }, [task.id, task.buggyCode]);

  const minutes = Math.floor(timeRemainingSeconds / 60);
  const seconds = timeRemainingSeconds % 60;
  const codeEdited = code !== task.buggyCode;

  const syncScroll = () => {
    if (preRef.current && taRef.current) {
      preRef.current.scrollTop = taRef.current.scrollTop;
      preRef.current.scrollLeft = taRef.current.scrollLeft;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Insert 4 spaces on Tab instead of moving focus.
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const s = ta.selectionStart;
      const eEnd = ta.selectionEnd;
      const next = code.slice(0, s) + "    " + code.slice(eEnd);
      setCode(next);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = s + 4;
      });
    }
  };

  const handleRun = async () => {
    if (running || resolved) return;
    setRunning(true);
    setResult(null);
    const res = await runPython(code, task.tests.harness, task.tests.timeoutMs ?? 6000);
    runAttemptsRef.current += 1;
    setResult(res);
    setRunning(false);
    if (res.passed) {
      setResolved(true);
      onTaskComplete(true, {
        runAttempts: runAttemptsRef.current,
        testsPassed: true,
        codeEdited,
        resolution: "tests-passed",
        detail: res.detail,
      });
    }
  };

  const handleGiveUp = () => {
    onTaskComplete(false, {
      runAttempts: runAttemptsRef.current,
      testsPassed: false,
      codeEdited,
      resolution: "gave-up",
      detail: result?.detail,
    });
  };

  return (
    <div className="h-full flex flex-col" style={{ background: "#0d1117" }} data-testid="code-panel">
      {/* Header */}
      <div className="px-4 py-3 border-b flex-shrink-0" style={{ background: "#161b22", borderColor: "#30363d" }}>
        <div className="flex items-center gap-2 mb-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: "#ff5f56" }} />
            <div className="w-3 h-3 rounded-full" style={{ background: "#ffbd2e" }} />
            <div className="w-3 h-3 rounded-full" style={{ background: "#27c93f" }} />
          </div>
          <span className="text-xs font-mono" style={{ color: "#8b949e" }}>
            debug_challenge.py — editable
          </span>
        </div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-yellow-400 text-sm font-bold font-mono">🎯 {task.title}</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "#8b949e", maxWidth: "380px" }}>
              {task.description} Edita el código y pulsa <strong>Ejecutar</strong> para probarlo.
            </p>
          </div>
        </div>
      </div>

      {/* Editor (highlighted layer behind a transparent textarea) */}
      <div className="flex-1 min-h-0 relative" style={{ background: "#0d1117" }}>
        <pre
          ref={preRef}
          aria-hidden="true"
          className="absolute inset-0 overflow-auto pointer-events-none"
          style={{ ...EDITOR_FONT, color: "#c9d1d9" }}
          dangerouslySetInnerHTML={{ __html: highlightPython(code) }}
        />
        <textarea
          ref={taRef}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onScroll={syncScroll}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          disabled={resolved}
          data-testid="code-editor"
          className="absolute inset-0 overflow-auto resize-none outline-none bg-transparent"
          style={{
            ...EDITOR_FONT,
            color: "transparent",
            caretColor: "#ffcc00",
            WebkitTextFillColor: "transparent",
          }}
        />
      </div>

      {/* Output console */}
      {(running || result) && (
        <div
          className="flex-shrink-0 border-t px-4 py-2 font-mono text-xs overflow-auto"
          style={{ background: "#01040d", borderColor: "#30363d", maxHeight: "30%" }}
          data-testid="code-output"
        >
          {running ? (
            <div className="text-yellow-300 animate-pulse">▶ Ejecutando en Python…</div>
          ) : result ? (
            <>
              {result.stdout && (
                <pre className="whitespace-pre-wrap" style={{ color: "#8b949e" }}>{result.stdout}</pre>
              )}
              {result.error && (
                <pre className="whitespace-pre-wrap" style={{ color: "#ff7b72" }}>{result.error}</pre>
              )}
              <div
                className="mt-1 font-bold"
                style={{ color: result.passed ? "#3fb950" : result.timedOut ? "#d29922" : "#ff7b72" }}
                data-testid="code-verdict"
              >
                {result.passed ? "✓ " : "✗ "}
                {result.detail}
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* Footer actions */}
      <div className="px-4 py-3 border-t flex items-center justify-between flex-shrink-0" style={{ background: "#161b22", borderColor: "#30363d" }}>
        <div className="flex items-center gap-3 text-xs font-mono" style={{ color: "#8b949e" }}>
          <span>💬 {turnCount} turnos</span>
          <span>·</span>
          <span>{task.language.toUpperCase()}</span>
          {runAttemptsRef.current > 0 && (
            <>
              <span>·</span>
              <span>▶ {runAttemptsRef.current}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleGiveUp}
            disabled={resolved}
            className="px-3 py-2 rounded-lg text-xs font-mono transition-all disabled:opacity-40"
            style={{ background: "transparent", color: "#8b949e", border: "1px solid #30363d" }}
            data-testid="giveup-button"
            title="Continuar sin resolver"
          >
            Continuar sin resolver
          </button>
          <button
            onClick={handleRun}
            disabled={running || resolved}
            className="px-4 py-2 rounded-lg text-sm font-bold font-mono transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            style={{
              background: resolved
                ? "linear-gradient(90deg, #1a8f2b, #0d6b1a)"
                : "linear-gradient(90deg, #27c93f, #1a8f2b)",
              color: "black",
              boxShadow: "0 3px 0 #0d6b1a",
            }}
            data-testid="run-button"
          >
            {resolved ? "✓ ¡Resuelto!" : running ? "Ejecutando…" : "▶ Ejecutar"}
          </button>
        </div>
      </div>
    </div>
  );
}
