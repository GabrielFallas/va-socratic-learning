// ============================================================
// Session & Experiment Types
// Covers both Condition A (avatar) and Condition B (text-only)
// ============================================================

export type Condition = "A" | "B";

export type AvatarState =
  | "idle"
  | "thinking"
  | "speaking"
  | "listening"
  | "happy"
  | "curious"
  | "empathetic"
  | "encouraging";

export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  /** Time in ms between user send and first token received (perceived latency, RQ4) */
  latencyMs?: number;
  /** Explicit time-to-first-token in ms (same value as latencyMs; named for clarity) */
  ttftMs?: number;
  /** Time in ms for complete response */
  totalResponseMs?: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  /** The buggy code the student will debug */
  buggyCode: string;
  /** Language for syntax highlighting */
  language: string;
  /** What the error is (hidden from student, used by tutor LLM) */
  errorDescription: string;
  /** Maximum time in seconds */
  maxTimeSeconds: number;
  /**
   * Hidden test harness (Python). Appended after the student's code and run in
   * Pyodide. Must print a line `__TESTS__{"passed":bool,"detail":str}`.
   * Drives the real `resolvedAutonomously` signal (replaces self-report).
   */
  tests: {
    harness: string;
    /** Per-task execution timeout in ms (worker is killed past this). */
    timeoutMs?: number;
  };
}

export interface TaskResult {
  taskId: string;
  /** Did the student resolve autonomously? Now backed by passing hidden tests, not self-report. */
  resolvedAutonomously: boolean;
  /** Number of conversation turns */
  turns: number;
  /** Total time spent in seconds */
  timeSpentSeconds: number;
  /** All latency readings in ms (time-to-first-token per turn) */
  latencyReadings: number[];
  /** How was the task closed: tests passed, timed out, or gave up */
  resolution?: "tests-passed" | "timeout" | "gave-up";
  /** Number of times the student ran their code */
  codeRunAttempts?: number;
  /** Whether the hidden test suite passed on the final run */
  testsPassed?: boolean;
  /** Whether the student edited the starter code at all */
  codeEdited?: boolean;
}

export interface SessionLog {
  sessionId: string;
  condition: Condition;
  startTime: number;
  endTime?: number;
  messages: ChatMessage[];
  taskResults: TaskResult[];
  /** Average latency in ms */
  avgLatencyMs?: number;
  /** Max latency in ms */
  maxLatencyMs?: number;
}

export interface ApiChatRequest {
  sessionId: string;
  condition: Condition;
  messages: Array<{ role: MessageRole; content: string }>;
  taskContext?: {
    taskId: string;
    buggyCode: string;
    errorDescription: string;
  };
}

export interface ApiChatResponse {
  content: string;
  latencyMs: number;
  avatarState?: AvatarState;
}
