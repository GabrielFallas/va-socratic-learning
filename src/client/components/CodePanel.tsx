"use client";

import { useState } from "react";
import type { Task } from "@/shared/types/session";

// ============================================================
// Code Panel — Shows the debugging task with read-only code
// Student can see code but must discuss with Ada to find the bug
// ============================================================

interface CodePanelProps {
  task: Task;
  timeRemainingSeconds: number;
  turnCount: number;
  onTaskComplete: (resolved: boolean) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// Simple syntax highlighting (no external library needed)
function highlightPython(code: string): string {
  const keywords = [
    "def",
    "for",
    "while",
    "if",
    "else",
    "elif",
    "return",
    "import",
    "from",
    "in",
    "range",
    "print",
    "True",
    "False",
    "None",
    "and",
    "or",
    "not",
    "class",
    "try",
    "except",
    "with",
    "as",
    "pass",
    "break",
    "continue",
  ];

  return code
    .split("\n")
    .map((line, lineNum) => {
      let highlighted = line
        // Strings
        .replace(
          /(f?"[^"]*"|f?'[^']*')/g,
          '<span class="text-yellow-300">$1</span>'
        )
        // Comments
        .replace(/(#.*)$/, '<span class="text-gray-400 italic">$1</span>')
        // Numbers
        .replace(/\b(\d+)\b/g, '<span class="text-orange-400">$1</span>');

      // Keywords
      keywords.forEach((kw) => {
        highlighted = highlighted.replace(
          new RegExp(`\\b(${kw})\\b`, "g"),
          '<span class="text-purple-400 font-semibold">$1</span>'
        );
      });

      // Function names (word before parenthesis)
      highlighted = highlighted.replace(
        /\b([a-z_]\w*)\s*\(/g,
        '<span class="text-cyan-400">$1</span>('
      );

      return `<span class="text-gray-500 select-none mr-4 text-xs">${(lineNum + 1).toString().padStart(3)}</span>${highlighted}`;
    })
    .join("\n");
}

export default function CodePanel({
  task,
  timeRemainingSeconds,
  turnCount,
  onTaskComplete,
}: CodePanelProps) {
  const [showHint, setShowHint] = useState(false);
  const isTimeWarning = timeRemainingSeconds < 120; // Last 2 min
  const isTimeCritical = timeRemainingSeconds < 60; // Last 1 min

  return (
    <div
      className="flex flex-col h-full bg-gray-950 text-white"
      data-testid="code-panel"
    >
      {/* Task header */}
      <div className="px-4 py-3 border-b border-white/10 bg-black/40">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-white text-sm">{task.title}</h2>
            <p className="text-white/50 text-xs font-mono mt-0.5">
              {task.language.toUpperCase()} · {turnCount} turnos
            </p>
          </div>

          {/* Timer */}
          <div
            className={`font-mono text-2xl font-bold tabular-nums ${
              isTimeCritical
                ? "text-red-400 animate-pulse"
                : isTimeWarning
                ? "text-yellow-400"
                : "text-green-400"
            }`}
            data-testid="task-timer"
            aria-label={`Tiempo restante: ${formatTime(timeRemainingSeconds)}`}
          >
            {formatTime(timeRemainingSeconds)}
          </div>
        </div>
      </div>

      {/* Task description */}
      <div className="px-4 py-3 bg-blue-950/30 border-b border-blue-500/20">
        <p className="text-white/80 text-sm leading-relaxed">
          {task.description}
        </p>
        <p className="text-cyan-400/70 text-xs mt-2 font-mono">
          💡 Habla con Ada para descubrir el problema. No busques la respuesta
          afuera.
        </p>
      </div>

      {/* Code block */}
      <div className="flex-1 overflow-auto">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <span className="text-white/30 text-xs font-mono">
              debug_task.py
            </span>
          </div>

          <pre
            className="bg-gray-900 rounded-xl p-4 text-sm font-mono leading-7 overflow-x-auto
              border border-white/10 text-gray-100"
            data-testid="code-display"
          >
            <code
              dangerouslySetInnerHTML={{
                __html: highlightPython(task.buggyCode),
              }}
            />
          </pre>
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-4 py-3 border-t border-white/10 bg-black/30 flex gap-2">
        <button
          onClick={() => setShowHint((v) => !v)}
          className="flex-1 py-2 rounded-lg text-sm border border-white/20
            text-white/60 hover:text-white hover:border-white/40 transition-all font-mono"
          data-testid="hint-toggle"
        >
          {showHint ? "🔒 Ocultar pista" : "💭 Mostrar pista de Ada"}
        </button>

        <button
          onClick={() => onTaskComplete(true)}
          className="flex-1 py-2 rounded-lg text-sm bg-green-600 hover:bg-green-500
            text-white font-bold transition-all"
          data-testid="resolve-button"
        >
          ✓ Resolví el problema
        </button>

        <button
          onClick={() => onTaskComplete(false)}
          className="py-2 px-3 rounded-lg text-sm border border-white/20
            text-white/40 hover:text-white/60 transition-all font-mono text-xs"
          data-testid="skip-button"
        >
          Tiempo agotado
        </button>
      </div>

      {/* Hint panel (shows last socratic question conceptually) */}
      {showHint && (
        <div
          className="mx-4 mb-3 p-3 bg-purple-950/50 border border-purple-500/30 rounded-xl
          text-sm text-white/80 animate-slide-up"
        >
          <p className="text-purple-300 text-xs font-mono mb-1">
            💜 Pista de Ada:
          </p>
          <p className="italic">
            &ldquo;Analiza el flujo de ejecución línea por línea. ¿En qué
            momento cambian las variables de control? ¿Cuál es la condición que
            debería hacer que el programa avance?&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}
