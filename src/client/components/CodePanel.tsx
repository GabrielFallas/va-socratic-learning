"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Task } from "@/shared/types/session";

interface CodePanelProps {
  task: Task;
  timeRemainingSeconds: number;
  turnCount: number;
  onTaskComplete: (resolved: boolean) => void;
}

// ── Left-to-right tokenizer for Python syntax highlighting ──────────────
// Sequential .replace() passes corrupt each other: the second pass runs on
// the HTML already emitted by the first (e.g. the strings regex matches the
// quote characters inside a comment span's style="..." attribute, breaking
// the tag). A left-to-right tokenizer processes the raw source once and
// never re-scans already-emitted HTML.
function highlightPython(raw: string): string {
  // 1. HTML-escape the raw source before tokenising
  const src = raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // 2. Token rules — tried at each position; earliest match wins
  const rules: Array<{ re: RegExp; emit: (m: string) => string }> = [
    // Python comment (rest of line)
    {
      re:   /#[^\n]*/,
      emit: (m) => `<span style="color:#6a9955;font-style:italic">${m}</span>`,
    },
    // Triple-quoted strings (single-line occurrence only)
    {
      re:   /"""[^]*?"""|'''[^]*?'''/,
      emit: (m) => `<span style="color:#ce9178">${m}</span>`,
    },
    // f-strings and regular strings
    {
      re:   /f?"(?:[^"\\]|\\.)*"|f?'(?:[^'\\]|\\.)*'/,
      emit: (m) => `<span style="color:#ce9178">${m}</span>`,
    },
    // Decorator
    {
      re:   /@\w+/,
      emit: (m) => `<span style="color:#dcdcaa">${m}</span>`,
    },
    // `def funcname` — two colours in one token
    {
      re: /\bdef\s+\w+/,
      emit: (m) => {
        const sp = m.match(/\s+/);
        if (!sp || sp.index === undefined) {
          return `<span style="color:#569cd6;font-weight:bold">${m}</span>`;
        }
        const kw   = m.slice(0, sp.index);
        const name = m.slice(sp.index + sp[0].length);
        return (
          `<span style="color:#569cd6;font-weight:bold">${kw}</span>` +
          sp[0] +
          `<span style="color:#dcdcaa;font-weight:bold">${name}</span>`
        );
      },
    },
    // Keywords
    {
      re:   /\b(return|while|for|if|else|elif|import|from|in|not|and|or|True|False|None|class|with|as|try|except|finally|raise|pass|break|continue|lambda|yield|global|nonlocal|async|await)\b/,
      emit: (m) => `<span style="color:#569cd6;font-weight:bold">${m}</span>`,
    },
    // Built-ins
    {
      re:   /\b(print|len|range|type|int|str|list|dict|set|tuple|bool|float|sum|min|max|sorted|enumerate|zip|map|filter|any|all|input|open|randint|random)\b/,
      emit: (m) => `<span style="color:#4ec9b0">${m}</span>`,
    },
    // Numbers
    {
      re:   /\b\d+(?:\.\d+)?\b/,
      emit: (m) => `<span style="color:#b5cea8">${m}</span>`,
    },
  ];

  let out = "";
  let pos = 0;

  while (pos < src.length) {
    let bestStart = src.length;
    let bestLen   = 0;
    let bestEmit  = "";

    for (const rule of rules) {
      const sub = src.slice(pos);
      const m   = sub.match(rule.re);
      if (m && m.index !== undefined) {
        const start = pos + m.index;
        // Prefer earlier; break ties by longer match
        if (start < bestStart || (start === bestStart && m[0].length > bestLen)) {
          bestStart = start;
          bestLen   = m[0].length;
          bestEmit  = rule.emit(m[0]);
        }
      }
    }

    if (bestLen === 0) {
      out += src.slice(pos);
      break;
    }

    out += src.slice(pos, bestStart);
    out += bestEmit;
    pos  = bestStart + bestLen;
  }

  return out;
}

export default function CodePanel({
  task,
  timeRemainingSeconds,
  turnCount,
  onTaskComplete,
}: CodePanelProps) {
  const timerRef = useRef(timeRemainingSeconds);
  timerRef.current = timeRemainingSeconds;

  const minutes = Math.floor(timeRemainingSeconds / 60);
  const seconds = timeRemainingSeconds % 60;
  const timeStr = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  const timeCritical = timeRemainingSeconds < 60;
  const timeWarning = timeRemainingSeconds < 120;

  const lines = task.buggyCode.split("\n");

  return (
    <div className="h-full flex flex-col" style={{ background: "#0d1117" }} data-testid="code-panel">

      {/* Panel header — game terminal style */}
      <div
        className="px-4 py-3 border-b flex-shrink-0"
        style={{ background: "#161b22", borderColor: "#30363d" }}
      >
        {/* Terminal dots + title */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: "#ff5f56" }} />
            <div className="w-3 h-3 rounded-full" style={{ background: "#ffbd2e" }} />
            <div className="w-3 h-3 rounded-full" style={{ background: "#27c93f" }} />
          </div>
          <span className="text-xs font-mono" style={{ color: "#8b949e" }}>
            debug_challenge.py — READ ONLY
          </span>
        </div>

        {/* Task title */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-yellow-400 text-sm font-bold font-mono">
                🎯 {task.title}
              </span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "#8b949e", maxWidth: "380px" }}>
              {task.description}
            </p>
          </div>
        </div>
      </div>

      {/* Code area */}
      <div className="flex-1 overflow-auto relative" style={{ background: "#0d1117" }}>
        <div className="p-4 min-h-full">
          <pre className="text-sm leading-6 font-mono">
            {lines.map((line, i) => (
              <div
                key={i}
                className="flex group hover:bg-white/5 rounded transition-colors"
              >
                {/* Line number */}
                <span
                  className="select-none w-8 text-right pr-3 flex-shrink-0 text-xs leading-6"
                  style={{ color: "#3b4048" }}
                >
                  {i + 1}
                </span>
                {/* Code */}
                <span
                  className="flex-1 pl-2 leading-6"
                  dangerouslySetInnerHTML={{ __html: highlightPython(line) || "&nbsp;" }}
                />
              </div>
            ))}
          </pre>
        </div>

        {/* Read-only badge */}
        <div
          className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded font-mono"
          style={{ background: "rgba(255,100,0,0.2)", color: "#ff8c00", border: "1px solid rgba(255,100,0,0.3)" }}
        >
          🔒 read-only
        </div>
      </div>

      {/* Footer actions */}
      <div
        className="px-4 py-3 border-t flex items-center justify-between flex-shrink-0"
        style={{ background: "#161b22", borderColor: "#30363d" }}
      >
        <div className="flex items-center gap-3 text-xs font-mono" style={{ color: "#8b949e" }}>
          <span>💬 {turnCount} turnos</span>
          <span>·</span>
          <span>{task.language.toUpperCase()}</span>
        </div>

        <button
          onClick={() => onTaskComplete(true)}
          className="px-4 py-2 rounded-lg text-sm font-bold font-mono transition-all hover:scale-105"
          style={{
            background: "linear-gradient(90deg, #27c93f, #1a8f2b)",
            color: "black",
            boxShadow: "0 3px 0 #0d6b1a",
          }}
          data-testid="resolve-button"
        >
          ✅ ¡Lo Encontré!
        </button>
      </div>
    </div>
  );
}
