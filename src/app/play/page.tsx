"use client";

import GameSession from "@/client/game/GameSession";
import { TASKS } from "@/shared/config/tasks";

// Phase C demo: the full Condition-A loop — play the level, reach the Debug
// Terminal, solve the bug in the overlay, watch the gate open. Wired into the
// real session flow in Phase D.
export default function PlayPage() {
  return (
    <main style={{ background: "#000", height: "100vh" }}>
      <GameSession
        sessionId="P-DEMO"
        task={TASKS[0]}
        level="data/levels/blue_ocean_1.json"
        onTaskComplete={() => {}}
      />
    </main>
  );
}
