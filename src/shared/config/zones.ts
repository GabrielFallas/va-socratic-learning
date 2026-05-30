// Maps each experimental task to a playable Open Sonic level (Condition A).
// The Socratic tutoring is identical across conditions; only Condition A wraps
// it in a playable zone.
export const ZONE_FOR_TASK: Record<string, { level: string; name: string }> = {
  "task-1-infinite-loop": { level: "data/levels/blue_ocean_1.json", name: "BLUE OCEAN" },
  "task-2-algorithm-complexity": { level: "data/levels/desert1.json", name: "DESERT" },
};

export function zoneForTask(taskId: string) {
  return ZONE_FOR_TASK[taskId] ?? ZONE_FOR_TASK["task-1-infinite-loop"];
}
