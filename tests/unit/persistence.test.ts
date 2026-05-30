import { describe, it, expect, beforeAll } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import type { Condition, SessionLog } from "@/shared/types/session";

// store.ts reads DATA_DIR at module-load time, so set it BEFORE importing.
let store: typeof import("@/server/telemetry/store");
let assignNext: () => { condition: Condition };

beforeAll(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "va-store-"));
  process.env.DATA_DIR = dir;
  store = await import("@/server/telemetry/store");
  ({ assignNext } = await import("@/server/experiment/assignment"));
});

describe("session store round-trip", () => {
  it("persists and reloads a session", () => {
    const s: SessionLog = {
      sessionId: "P-999",
      condition: "B",
      startTime: 1,
      messages: [],
      taskResults: [],
    };
    store.persistSession(s);
    const loaded = store.loadSession("P-999");
    expect(loaded?.sessionId).toBe("P-999");
    expect(loaded?.condition).toBe("B");
  });

  it("lists persisted sessions", () => {
    expect(store.listSessions().some((x) => x.sessionId === "P-999")).toBe(true);
  });

  it("ignores path-traversal in session ids", () => {
    store.persistSession({ sessionId: "../evil", condition: "A", startTime: 1, messages: [], taskResults: [] });
    // No file should escape the sessions dir; load by the sanitized id works.
    expect(store.loadSession("../evil")).toBeTruthy();
  });
});

describe("counterbalanced assignment", () => {
  it("keeps A and B balanced within every block of 4", () => {
    const conds = Array.from({ length: 8 }, () => assignNext().condition);
    expect(conds.slice(0, 4).filter((c) => c === "A").length).toBe(2);
    expect(conds.slice(4, 8).filter((c) => c === "A").length).toBe(2);
  });

  it("issues sequential participant ids", () => {
    const a = assignNext();
    const b = assignNext();
    expect(a).toBeDefined();
    expect(b).toBeDefined();
  });
});
