"use client";

// ─────────────────────────────────────────────────────────────────
// SonicGameCanvas — Kaplay-powered live avatar panel
//
// Renders a mini Sonic runner world inside a <canvas>:
//   • Parallax Chemical Plant background scrolling
//   • Real Sonic sprite (run / jump / hurt / victory)
//   • Real ring sprites spinning + collected bursts
//   • Motobug enemy that reacts to avatar state + critical timer
//   • Speed scales with rings collected
//   • Victory sequence on task completion
//   • All driven by props via signals ref (no remount)
// ─────────────────────────────────────────────────────────────────

import { useEffect, useRef } from "react";
import type { AvatarState } from "@/shared/types/session";

interface SonicGameCanvasProps {
  avatarState:          AvatarState;
  isSpeaking:           boolean;
  ringsCollected?:      number;
  timeRemainingSeconds?: number;
  taskCompleted?:       boolean;
  className?:           string;
}

interface GameSignals {
  state:      AvatarState;
  speaking:   boolean;
  rings:      number;
  prevRings:  number;
  timeLeft:   number;
  completed:  boolean;
}

export default function SonicGameCanvas({
  avatarState,
  isSpeaking,
  ringsCollected = 0,
  timeRemainingSeconds = 600,
  taskCompleted = false,
  className = "",
}: SonicGameCanvasProps) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const signals    = useRef<GameSignals>({
    state:     avatarState,
    speaking:  isSpeaking,
    rings:     ringsCollected,
    prevRings: ringsCollected,
    timeLeft:  timeRemainingSeconds,
    completed: taskCompleted,
  });
  const destroyRef = useRef<(() => void) | null>(null);

  // Keep signals current every render
  useEffect(() => {
    signals.current.prevRings = signals.current.rings;
    signals.current.state     = avatarState;
    signals.current.speaking  = isSpeaking;
    signals.current.rings     = ringsCollected;
    signals.current.timeLeft  = timeRemainingSeconds;
    signals.current.completed = taskCompleted;
  });

  useEffect(() => {
    if (!canvasRef.current) return;
    let mounted = true;

    import("kaplay").then(({ default: kaplay }) => {
      if (!mounted || !canvasRef.current) return;

      const k = kaplay({
        canvas:     canvasRef.current!,
        width:      480,
        height:     260,
        letterbox:  true,
        background: [0, 10, 25],
        global:     false,
        debug:      false,
      });

      // ── Sprite sheets ─────────────────────────────────────────
      k.loadSprite("sonic", "/sprites/sonic.png", {
        sliceX: 8, sliceY: 2,
        anims: {
          run:  { from: 0, to: 7,  loop: true,  speed: 18 },
          jump: { from: 8, to: 15, loop: false, speed: 14 },
        },
      });
      k.loadSprite("ring-sprite", "/sprites/ring.png", {
        sliceX: 16, sliceY: 1,
        anims: { spin: { from: 0, to: 15, loop: true, speed: 30 } },
      });
      k.loadSprite("motobug", "/sprites/motobug.png", {
        sliceX: 5, sliceY: 1,
        anims: { run: { from: 0, to: 4, loop: true, speed: 8 } },
      });
      k.loadSprite("bg", "/sprites/chemical-bg.png");

      k.scene("main", () => {
        k.setGravity(2200);
        const GROUND_Y = 210;

        // ── Parallax background ───────────────────────────────
        const BG_W = 960;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bg1: any = k.add([k.sprite("bg"), k.pos(0, 0),    k.scale(2), k.z(0)]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bg2: any = k.add([k.sprite("bg"), k.pos(BG_W, 0), k.scale(2), k.z(0)]);

        // ── Red tint overlay (critical timer) ────────────────
        const redTint = k.add([
          k.rect(480, 260),
          k.pos(0, 0),
          k.color(k.Color.fromHex("#ff0000")),
          k.opacity(0),
          k.z(15),
          k.fixed(),
        ]);

        // ── Ground ────────────────────────────────────────────
        k.add([k.rect(480, 50), k.pos(0, GROUND_Y), k.color(k.Color.fromHex("#1a3a1a")), k.body({ isStatic: true }), k.area(), k.z(1)]);
        k.add([k.rect(480, 8),  k.pos(0, GROUND_Y), k.color(k.Color.fromHex("#4caf50")), k.z(2)]);

        // ── Sonic sprite ──────────────────────────────────────
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sonic: any = k.add([
          k.sprite("sonic", { anim: "run" }),
          k.pos(90, GROUND_Y - 10),
          k.scale(3),
          k.anchor("botleft"),
          k.body(),
          k.area({ shape: new k.Rect(k.vec2(-4, -36), 20, 36) }),
          k.z(5),
          "sonic",
        ]);

        let isJumping   = false;
        let hurtTimer   = 0;
        let victoryMode = false;
        let victoryTimer = 0;

        // ── Ring HUD (top-right, inside canvas) ───────────────
        const ringIcon = k.add([
          k.sprite("ring-sprite", { anim: "spin" }),
          k.pos(394, 10),
          k.scale(1.3),
          k.z(11),
          k.fixed(),
        ]);
        void ringIcon; // suppress unused warning

        const ringText = k.add([
          k.text(`${signals.current.rings}`, { size: 16, font: "monospace" }),
          k.pos(416, 13),
          k.color(k.Color.fromHex("#ffcc00")),
          k.z(11),
          k.fixed(),
        ]);

        // ── Timer bar (bottom strip) ──────────────────────────
        const timerBg = k.add([
          k.rect(480, 6),
          k.pos(0, 254),
          k.color(k.Color.fromHex("#001a33")),
          k.z(12),
          k.fixed(),
        ]);
        void timerBg;
        const timerBar = k.add([
          k.rect(480, 6),
          k.pos(0, 254),
          k.color(k.Color.fromHex("#0066cc")),
          k.z(13),
          k.fixed(),
        ]);

        // ── Ring burst animation ──────────────────────────────
        function spawnRingBurst(x: number, y: number): void {
          const r = k.add([
            k.sprite("ring-sprite", { anim: "spin" }),
            k.pos(x, y),
            k.scale(2.5),
            k.anchor("center"),
            k.z(8),
            k.opacity(1),
          ]);
          let t = 0;
          const ctrl = k.onUpdate(() => {
            if (!r.exists()) { ctrl.cancel(); return; }
            t += k.dt();
            (r as any).pos.y -= 65 * k.dt();
            (r as any).opacity = Math.max(0, 1 - t * 2);
            if (t > 0.55) { k.destroy(r); ctrl.cancel(); }
          });
        }

        // ── Motobug spawner ───────────────────────────────────
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let motobugObj: any = null;
        let motoActive  = false;
        let motoTimer   = 0;
        const MOTO_INTERVAL_NORMAL   = 999; // disabled normally
        const MOTO_INTERVAL_CRITICAL = 5.0;
        const MOTO_INTERVAL_PANIC    = 2.5;

        function spawnMotobug(): void {
          if (motoActive) return;
          motoActive = true;
          motobugObj = k.add([
            k.sprite("motobug", { anim: "run" }),
            k.pos(510, GROUND_Y - 10),
            k.scale(3),
            k.anchor("botleft"),
            k.z(4),
            "motobug",
          ]);
        }

        function destroyMotobug(explode = true): void {
          if (!motobugObj?.exists()) { motoActive = false; return; }
          if (explode) {
            const ex = k.add([
              k.text("💥", { size: 28 }),
              k.pos(motobugObj.pos.clone()),
              k.anchor("center"),
              k.z(9),
            ]);
            setTimeout(() => { if (ex.exists()) k.destroy(ex); }, 380);
          }
          k.destroy(motobugObj);
          motobugObj = null;
          motoActive = false;
          motoTimer  = 0;
        }

        // ── Victory stars ─────────────────────────────────────
        function spawnVictoryStar(x: number, y: number): void {
          const star = k.add([
            k.text("⭐", { size: 22 }),
            k.pos(x, y),
            k.anchor("center"),
            k.z(9),
            k.opacity(1),
          ]);
          let t = 0;
          const ctrl = k.onUpdate(() => {
            if (!star.exists()) { ctrl.cancel(); return; }
            t += k.dt();
            (star as any).pos.y -= 50 * k.dt();
            (star as any).pos.x += Math.sin(t * 8) * 2;
            (star as any).opacity = Math.max(0, 1 - t * 1.5);
            if (t > 0.7) { k.destroy(star); ctrl.cancel(); }
          });
        }

        // ── Sonic land ────────────────────────────────────────
        sonic.onGround(() => {
          isJumping = false;
          if (hurtTimer <= 0 && !victoryMode && sonic.curAnim() !== "run") {
            sonic.play("run");
          }
        });

        // ── State label ───────────────────────────────────────
        const stateLabels: Record<AvatarState, string> = {
          idle:        "Listo",
          thinking:    "Pensando...",
          speaking:    "Hablando",
          listening:   "Escuchando",
          happy:       "¡Genial!",
          curious:     "Curioso",
          empathetic:  "Comprensivo",
          encouraging: "¡Vamos!",
        };
        const label = k.add([
          k.text("", { size: 10, font: "monospace" }),
          k.pos(90, GROUND_Y + 14),
          k.anchor("top"),
          k.color(k.Color.fromHex("#ffcc00")),
          k.z(10),
          k.fixed(),
        ]);

        // ── Main update ───────────────────────────────────────
        k.onUpdate(() => {
          const sig = signals.current;

          // ── Speed: base 80, +10 per 5 rings, cap 220 ────────
          const bgSpeed = Math.min(220, 80 + Math.floor(sig.rings / 5) * 10);

          // ── Scroll backgrounds ───────────────────────────────
          const factor = (sig.state === "encouraging" || sig.state === "happy" || victoryMode) ? 2 : 1;
          [bg1, bg2].forEach((bg) => {
            bg.pos.x -= bgSpeed * factor * k.dt();
            if (bg.pos.x <= -BG_W) bg.pos.x = BG_W;
          });

          // ── Timer bar ────────────────────────────────────────
          const maxTime = 600;
          const pct     = Math.max(0, sig.timeLeft / maxTime);
          (timerBar as any).width = 480 * pct;
          (timerBar as any).color =
            sig.timeLeft < 30  ? k.Color.fromHex("#ff2222") :
            sig.timeLeft < 60  ? k.Color.fromHex("#ff8800") :
            sig.timeLeft < 120 ? k.Color.fromHex("#ffcc00") :
                                 k.Color.fromHex("#0066cc");

          // ── Critical timer red tint pulse ─────────────────
          if (sig.timeLeft < 30 && !sig.completed) {
            (redTint as any).opacity = 0.06 * Math.abs(Math.sin(k.time() * 4));
          } else {
            (redTint as any).opacity = 0;
          }

          // ── Motobug timer logic ───────────────────────────
          let motoInterval = MOTO_INTERVAL_NORMAL;
          if (!sig.completed) {
            if      (sig.timeLeft < 30) motoInterval = MOTO_INTERVAL_PANIC;
            else if (sig.timeLeft < 60) motoInterval = MOTO_INTERVAL_CRITICAL;
            else if (sig.state === "empathetic") motoInterval = 8.0;
          }

          motoTimer += k.dt();
          if (motoTimer > motoInterval && !victoryMode) {
            spawnMotobug();
            motoTimer = 0;
          }

          // ── Move motobug ──────────────────────────────────
          if (motobugObj?.exists()) {
            (motobugObj as any).pos.x -= 130 * k.dt();
            if ((motobugObj as any).pos.x < -50) destroyMotobug(false);
          }

          // ── New ring collected → burst ─────────────────────
          if (sig.rings > sig.prevRings) {
            const diff = sig.rings - sig.prevRings;
            for (let i = 0; i < diff; i++) {
              spawnRingBurst(
                95 + k.rand(-18, 18),
                GROUND_Y - 55 + k.rand(-15, 0)
              );
            }
            (ringText as any).text = `${sig.rings}`;
            sig.prevRings = sig.rings;
          }

          // ── HUD ring text sync ────────────────────────────
          if ((ringText as any).text !== `${sig.rings}`) {
            (ringText as any).text = `${sig.rings}`;
          }

          // ── Hurt countdown ────────────────────────────────
          if (hurtTimer > 0) hurtTimer -= k.dt();

          // ── Victory mode ──────────────────────────────────
          if (sig.completed && !victoryMode) {
            victoryMode = true;
            destroyMotobug(false);
            // Continuous star burst
            const starInterval = setInterval(() => {
              if (!mounted) { clearInterval(starInterval); return; }
              spawnVictoryStar(
                sonic.pos.x + k.rand(-40, 80),
                sonic.pos.y - k.rand(20, 80)
              );
            }, 220);
            setTimeout(() => clearInterval(starInterval), 4000);
          }

          if (victoryMode) {
            victoryTimer += k.dt();
            // Rapid jumps
            if (sonic.isGrounded() && victoryTimer % 0.9 < k.dt() * 2) {
              sonic.jump(1100);
              sonic.play("jump");
            }
            return;
          }

          // ── Avatar state → Sonic behaviour ────────────────
          if (hurtTimer <= 0) {
            switch (sig.state) {
              case "happy":
              case "encouraging":
                if (!isJumping && sonic.isGrounded()) {
                  isJumping = true;
                  sonic.jump(1350);
                  sonic.play("jump");
                  destroyMotobug();
                }
                break;

              case "thinking":
                // Shimmer scale
                (sonic as any).scale.x = 3 + Math.sin(k.time() * 4) * 0.07;
                if (sonic.isGrounded() && sonic.curAnim() !== "run") sonic.play("run");
                break;

              case "empathetic":
                // Motobug handled by timer above
                if (sonic.isGrounded() && sonic.curAnim() !== "run") sonic.play("run");
                break;

              default:
                // Non-critical states: clear any motobug
                if (motoActive) destroyMotobug();
                if (sonic.isGrounded() && sonic.curAnim() !== "run") sonic.play("run");
                break;
            }
          }

          // ── Speaking: vertical bob ────────────────────────
          (sonic as any).scale.y = sig.speaking
            ? 3 + Math.sin(k.time() * 18) * 0.11
            : 3;

          // ── State label ───────────────────────────────────
          label.text = victoryMode
            ? "¡ZONA COMPLETADA!"
            : sig.timeLeft < 30 && !sig.completed
            ? "⚠ TIEMPO CRÍTICO"
            : stateLabels[sig.state] ?? "Listo";
          (label as any).color =
            victoryMode                         ? k.Color.fromHex("#ffcc00") :
            sig.timeLeft < 30 && !sig.completed ? k.Color.fromHex("#ff4444") :
                                                  k.Color.fromHex("#ffcc00");
        });
      });

      k.go("main");

      destroyRef.current = () => {
        try { k.quit(); } catch { /* ignore */ }
      };
    });

    return () => {
      mounted = false;
      destroyRef.current?.();
      destroyRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: "block", imageRendering: "pixelated" }}
      />
    </div>
  );
}
