"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Task } from "@/shared/types/session";

interface CodePanelProps {
  task: Task;
  timeRemainingSeconds: number;
  turnCount: number;
  onTaskComplete: (resolved: boolean) => void;
}

// Improved Python syntax highlighting
function highlightPython(code: string): string {
  const keywords = /\b(def|return|while|for|if|else|elif|import|from|in|not|and|or|True|False|None|class|with|as|try|except|finally|raise|pass|break|continue|lambda|yield|global|nonlocal|async|await)\b/g;
  const builtins = /\b(print|len|range|type|int|str|list|dict|set|tuple|bool|float|sum|min|max|sorted|enumerate|zip|map|filter|any|all|input|open)\b/g;
  const strings = /(f?"[^"]*"|f?'[^']*')/g;
  const comments = /(#[^\n]*)/g;
  const numbers = /\b(\d+\.?\d*)\b/g;
  const funcDef = /\bdef\s+(\w+)/g;
  const decorators = /(@\w+)/g;

  return code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(comments,   '<span style="color:#6a9955;font-style:italic">$1</span>')
    .replace(strings,    '<span style="color:#ce9178">$1</span>')
    .replace(decorators, '<span style="color:#dcdcaa">$1</span>')
    .replace(keywords,   '<span style="color:#569cd6;font-weight:bold">$1</span>')
    .replace(builtins,   '<span style="color:#4ec9b0">$1</span>')
    .replace(numbers,    '<span style="color:#b5cea8">$1</span>')
    .replace(funcDef,    'def <span style="color:#dcdcaa;font-weight:bold">$1</span>');
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
