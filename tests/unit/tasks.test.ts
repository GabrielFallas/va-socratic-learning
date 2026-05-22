import { describe, it, expect } from "vitest";
import { TASKS, getTaskById } from "@/shared/config/tasks";

// ============================================================
// Unit Tests: Task Configuration
// Validates the experimental debugging tasks
// ============================================================

describe("TASKS configuration", () => {
  it("should have exactly 2 tasks", () => {
    expect(TASKS).toHaveLength(2);
  });

  it("task 1 should be about infinite loop (beginner)", () => {
    const task = TASKS[0];
    expect(task.id).toBe("task-1-infinite-loop");
    expect(task.language).toBe("python");
    expect(task.buggyCode).toContain("while");
    expect(task.buggyCode).toContain("counter");
    // Bug: counter is never incremented
    expect(task.errorDescription).toContain("incrementa");
  });

  it("task 2 should be about algorithm complexity (intermediate)", () => {
    const task = TASKS[1];
    expect(task.id).toBe("task-2-algorithm-complexity");
    expect(task.language).toBe("python");
    expect(task.buggyCode).toContain("for i in range");
    expect(task.buggyCode).toContain("for j in range");
    // Bug: O(n²) or worse, should use set
    expect(task.errorDescription).toContain("O(n");
  });

  it("each task should have required fields", () => {
    TASKS.forEach((task) => {
      expect(task.id).toBeTruthy();
      expect(task.title).toBeTruthy();
      expect(task.description).toBeTruthy();
      expect(task.buggyCode).toBeTruthy();
      expect(task.language).toBeTruthy();
      expect(task.errorDescription).toBeTruthy();
      expect(task.maxTimeSeconds).toBeGreaterThan(0);
    });
  });

  it("tasks should have reasonable time limits (5-15 min)", () => {
    TASKS.forEach((task) => {
      expect(task.maxTimeSeconds).toBeGreaterThanOrEqual(300); // 5 min
      expect(task.maxTimeSeconds).toBeLessThanOrEqual(900); // 15 min
    });
  });

  it("error descriptions should NOT be visible in buggy code titles", () => {
    TASKS.forEach((task) => {
      // The task description shown to students should not reveal the error
      expect(task.description).not.toContain(task.errorDescription);
    });
  });
});

describe("getTaskById", () => {
  it("should return correct task by id", () => {
    const task = getTaskById("task-1-infinite-loop");
    expect(task).toBeDefined();
    expect(task!.id).toBe("task-1-infinite-loop");
  });

  it("should return undefined for non-existent id", () => {
    const task = getTaskById("non-existent");
    expect(task).toBeUndefined();
  });

  it("should find task-2", () => {
    const task = getTaskById("task-2-algorithm-complexity");
    expect(task).toBeDefined();
    expect(task!.id).toBe("task-2-algorithm-complexity");
  });
});
