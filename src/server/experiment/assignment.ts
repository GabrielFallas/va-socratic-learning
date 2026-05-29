import type { Condition } from "@/shared/types/session";
import { loadAssignmentState, saveAssignmentState } from "@/server/telemetry/store";

// ============================================================
// Counterbalanced condition assignment
//
// Replaces the old `Math.random() > 0.5` per-click coin flip, which gave
// no balance guarantee and let the participant *choose* their condition
// (a selection-bias hazard).
//
// Strategy: permuted-block randomization. Each block of `BLOCK_SIZE`
// participants contains an equal number of A and B in a randomized order,
// so balance is guaranteed at every block boundary while order stays
// unpredictable.
//
// State is persisted to disk (store.ts) so balance and participant numbering
// survive server restarts mid-study.
// ============================================================

const BLOCK_SIZE = 4; // 2×A, 2×B per block

// Hydrate from disk on first use.
const persisted = loadAssignmentState();
let assignedCount = persisted?.assignedCount ?? 0;
let blockQueue: Condition[] = persisted?.blockQueue ?? [];

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
  const half = BLOCK_SIZE / 2;
  blockQueue = shuffle<Condition>([
    ...Array<Condition>(half).fill("A"),
    ...Array<Condition>(half).fill("B"),
  ]);
}

/** Sequential, zero-padded participant id (P-001, P-002, …). */
function nextParticipantId(): string {
  return `P-${String(assignedCount + 1).padStart(3, "0")}`;
}

export interface Assignment {
  participantId: string;
  condition: Condition;
  /** 1-based ordinal of this participant in the run */
  ordinal: number;
}

/**
 * Allocate the next participant: returns a counterbalanced condition and a
 * sequential participant id. Call exactly once per real experimental session.
 */
export function assignNext(): Assignment {
  if (blockQueue.length === 0) refillBlock();
  const condition = blockQueue.shift()!;
  const participantId = nextParticipantId();
  assignedCount += 1;
  persist();
  return { participantId, condition, ordinal: assignedCount };
}

/** Diagnostics for the facilitator view (counts so far). */
export function assignmentStats(): { total: number } {
  return { total: assignedCount };
}
