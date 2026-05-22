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
  /** Time in ms between user send and first token received */
  latencyMs?: number;
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
}

export interface TaskResult {
  taskId: string;
  /** Did the student resolve without direct code? */
  resolvedAutonomously: boolean;
  /** Number of conversation turns */
  turns: number;
  /** Total time spent in seconds */
  timeSpentSeconds: number;
  /** All latency readings in ms */
  latencyReadings: number[];
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
