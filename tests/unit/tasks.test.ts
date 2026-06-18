import { describe, it, expect } from "vitest";
import { TASKS, getTaskById } from "@/shared/config/tasks";

// The crossover design uses TWO variants of each task (slot 1 = loop,
// slot 2 = complexity) so block 2 never repeats block 1's exact problem.
describe("task catalogue (crossover variants)", () => {
  const ids = TASKS.map((t) => t.id);

  it("defines both variants of both task slots", () => {
    expect(ids).toEqual(
      expect.arrayContaining([
        "task-1-infinite-loop",
        "task-2-algorithm-complexity",
        "task-1b-infinite-loop",
        "task-2b-algorithm-complexity",
      ]),
    );
  });

  it("variant ids keep the slot keyword so zone/label detection still works", () => {
    expect("task-1b-infinite-loop".includes("infinite-loop")).toBe(true);
    expect("task-2b-algorithm-complexity".includes("algorithm-complexity")).toBe(true);
  });

  it("every task has a buggyCode and a hidden test harness emitting __TESTS__", () => {
    for (const t of TASKS) {
      expect(t.buggyCode.length).toBeGreaterThan(0);
      expect(t.tests.harness).toContain("__TESTS__");
    }
  });

  it("getTaskById resolves the second variants", () => {
    expect(getTaskById("task-1b-infinite-loop")?.title).toContain("Tarea 1");
    expect(getTaskById("task-2b-algorithm-complexity")?.title).toContain("Tarea 2");
  });
});
