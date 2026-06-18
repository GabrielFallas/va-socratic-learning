import type { Condition } from "@/shared/types/session";
import { loadAssignmentState, saveAssignmentState } from "@/server/telemetry/store";

// ============================================================
// Counterbalanced condition-ORDER assignment (within-subjects crossover)
//
// Each participant experiences BOTH conditions: Task 1 in one condition and
// Task 2 in the opposite. What we counterbalance is therefore the *order*
// (A→B vs B→A), not a single condition. Permuted-block randomization over the
// two possible sequences guarantees an even split of starting condition at
// every block boundary while keeping the order unpredictable.
//
// This replaces the previous between-subjects scheme (one random condition per
// participant), which could not control for individual differences and let the
// starting condition cluster. The crossover gives far more power with the small
// N typical of a class study.
//
// State (participant counter + remaining queue) is persisted to disk (store.ts)
// so balance and numbering survive server restarts mid-study.
// ============================================================

const SEQUENCES: Condition[][] = [
  ["A", "B"],
  ["B", "A"],
];
const BLOCK_SIZE = SEQUENCES.length; // one of each order per block

// Hydrate from disk on first use. The persisted queue may be in the legacy
// (single-condition) format from the old between-subjects scheme; if so we
// ignore it and refill with sequences — the participant COUNTER is preserved so
// numbering continues uninterrupted across the design change.
const persisted = loadAssignmentState();
let assignedCount = persisted?.assignedCount ?? 0;
let blockQueue: Condition[][] = normalizeQueue(persisted?.blockQueue);

function normalizeQueue(q: unknown): Condition[][] {
  if (!Array.isArray(q)) return [];
  // Only accept the new format: an array of 2-element condition arrays.
  if (q.every((s) => Array.isArray(s) && s.length === 2)) return q as Condition[][];
  return [];
}

function persist(): void {
  saveAssignmentState({ assignedCount, blockQueue });
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function refillBlock(): void {
  blockQueue = shuffle(SEQUENCES.map((s) => [...s]));
}

/** Sequential, zero-padded participant id (P-001, P-002, …). */
function nextParticipantId(): string {
  return `P-${String(assignedCount + 1).padStart(3, "0")}`;
}

export interface Assignment {
  participantId: string;
  /** Counterbalanced condition order, e.g. ["A","B"]. */
  sequence: Condition[];
  /** Convenience: the condition the participant starts with (sequence[0]). */
  condition: Condition;
  /** 1-based ordinal of this participant in the run */
  ordinal: number;
}

/**
 * Allocate the next participant: returns a counterbalanced condition ORDER and a
 * sequential participant id. Call exactly once per real experimental session.
 */
export function assignNext(): Assignment {
  if (blockQueue.length === 0) refillBlock();
  const sequence = blockQueue.shift()!;
  const participantId = nextParticipantId();
  assignedCount += 1;
  persist();
  return { participantId, sequence, condition: sequence[0], ordinal: assignedCount };
}

/** Diagnostics for the facilitator view (counts so far). */
export function assignmentStats(): { total: number } {
  return { total: assignedCount };
}
