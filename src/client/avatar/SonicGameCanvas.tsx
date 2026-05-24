"use client";

// ─────────────────────────────────────────────────────────────────
// SonicGameCanvas — Kaplay-powered live avatar panel
//
// Renders a mini Sonic runner world inside a <canvas>:
//   • Parallax Chemical Plant background scrolling
//   • Real Sonic sprite (run / jump / hurt)
//   • Real ring sprites spinning + collected
//   • Motobug enemy that reacts to debug events
//   • All driven by avatarState + isSpeaking props
// ─────────────────────────────────────────────────────────────────

import { useEffect, useRef } from "react";
import type { AvatarState } from "@/shared/types/session";

interface SonicGameCanvasProps {
  avatarState:     AvatarState;
  isSpeaking:      boolean;
  ringsCollected?: number;
  className?:      string;
}

// We store mutable "signals" in a ref so the Kaplay loop can read
// the latest props without stale closures.
interface GameSignals {
  state:      AvatarState;
  speaking:   boolean;
  rings:      number;
  prevRings:  number;
}

export default function SonicGameCanvas({
  avatarState,
  isSpeaking,
  ringsCollected = 0,
  className = "",
}: SonicGameCanvasProps) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const signals    = useRef<GameSignals>({
    state:     avatarState,
    speaking:  isSpeaking,
    rings:     ringsCollected,
    prevRings: ringsCollected,
  });
  const destroyRef = useRef<(() => void) | null>(null);

  // Keep signals in sync with props (no re-mount needed)
  useEffect(() => {
    signals.current.prevRings = signals.current.rings;
    signals.current.state     = avatarState;
    signals.current.speaking  = isSpeaking;
    signals.current.rings     = ringsCollected;
  });

  useEffect(() => {
    if (!canvasRef.current) return;

    let mounted = true;

    // Dynamic import so SSR never touches Kaplay
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

      // ── Load sprites ──────────────────────────────────────────
      k.loadSprite("sonic", "/sprites/sonic.png", {
        sliceX: 8, sliceY: 2,
        anims: {
          run:  { from: 0, to: 7,  loop: true,  speed: 18 },
          jump: { from: 8, to: 15, loop: false, speed: 14 },
        },
      });

      k.loadSprite("ring-sprite", "/sprites/ring.png", {
        sliceX: 16, sliceY: 1,
        anims: {
          spin: { from: 0, to: 15, loop: true, speed: 30 },
        },
      });

      k.loadSprite("motobug", "/sprites/motobug.png", {
        sliceX: 5, sliceY: 1,
        anims: {
          run: { from: 0, to: 4, loop: true, speed: 8 },
        },
      });

      k.loadSprite("bg", "/sprites/chemical-bg.png");
      k.loadSprite("platform", "/sprites/platforms.png");

      k.scene("main", () => {
        // ── Gravity ──────────────────────────────────────────────
        k.setGravity(2200);
        const GROUND_Y = 210;

        // ── Scrolling background (two tiles) ─────────────────────
        let bgSpeed    = 80;
        const bgWidth  = 960; // bg scaled ×2

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bg1: any = k.add([k.sprite("bg"), k.pos(0, 0),   k.scale(2), k.z(0)]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bg2: any = k.add([k.sprite("bg"), k.pos(bgWidth, 0), k.scale(2), k.z(0)]);

        // ── Ground platform ───────────────────────────────────────
        const ground = k.add([
          k.rect(480, 50),
          k.pos(0, GROUND_Y),
          k.color(k.Color.fromHex("#1a3a1a")),
          k.body({ isStatic: true }),
          k.area(),
          k.z(1),
        ]);
        // Green strip on top
        k.add([
          k.rect(480, 8),
          k.pos(0, GROUND_Y),
          k.color(k.Color.fromHex("#4caf50")),
          k.z(2),
        ]);

        // ── Sonic sprite ──────────────────────────────────────────
        const sonic = k.add([
          k.sprite("sonic", { anim: "run" }),
          k.pos(90, GROUND_Y - 10),
          k.scale(3),
          k.anchor("botleft"),
          k.body(),
          k.area({ shape: new k.Rect(k.vec2(-4, -36), 20, 36) }),
          k.z(5),
          "sonic",
        ]);

        // Jump flag
        let isJumping = false;
        let hurtTimer = 0;

        // ── Floating rings HUD (top-right) ────────────────────────
        let displayedRings = signals.current.rings;

        const ringCounterBg = k.add([
          k.rect(80, 28, { radius: 8 }),
          k.pos(392, 8),
          k.color(k.Color.fromArray([0, 0, 0, 0.6])),
          k.opacity(0.7),
          k.z(10),
        ]);

        const ringIcon = k.add([
          k.sprite("ring-sprite", { anim: "spin" }),
          k.pos(402, 11),
          k.scale(1.2),
          k.z(11),
        ]);

        const ringText = k.add([
          k.text(`${displayedRings}`, { size: 16, font: "monospace" }),
          k.pos(422, 14),
          k.color(k.Color.fromHex("#ffcc00")),
          k.z(11),
        ]);

        // ── Ring collect animation pool ───────────────────────────
        function spawnRingCollect(x: number, y: number): void {
          const r = k.add([
            k.sprite("ring-sprite", { anim: "spin" }),
            k.pos(x, y),
            k.scale(2.5),
            k.anchor("center"),
            k.z(8),
            k.opacity(1),
          ]);
          // Float up and fade
          let t = 0;
          k.onUpdate(() => {
            if (!r.exists()) return;
            t += k.dt();
            r.pos.y -= 60 * k.dt();
            r.opacity = Math.max(0, 1 - t * 1.8);
            if (t > 0.6) k.destroy(r);
          });
        }

        // ── Motobug (shows when state = empathetic/thinking) ──────
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let motobugObj: any = null;
        let motoActive = false;

        function spawnMotobug(): void {
          if (motoActive || motobugObj?.exists()) return;
          motoActive = true;
          motobugObj = k.add([
            k.sprite("motobug", { anim: "run" }),
            k.pos(500, GROUND_Y - 10),
            k.scale(3),
            k.anchor("botleft"),
            k.z(4),
            "motobug",
          ]);
        }

        function removeMotobug(): void {
          if (motobugObj?.exists()) {
            // Destroy burst
            const ex = k.add([
              k.text("💥", { size: 28 }),
              k.pos(motobugObj.pos.clone()),
              k.anchor("center"),
              k.z(9),
            ]);
            setTimeout(() => { if (ex.exists()) k.destroy(ex); }, 400);
            k.destroy(motobugObj);
          }
          motobugObj = null;
          motoActive = false;
        }

        // ── Sonic land → switch to run ────────────────────────────
        sonic.onGround(() => {
          isJumping = false;
          if (hurtTimer <= 0 && sonic.curAnim() !== "run") {
            sonic.play("run");
          }
        });

        // ── Main update ───────────────────────────────────────────
        k.onUpdate(() => {
          const sig = signals.current;

          // Scroll backgrounds
          bgSpeed = sig.state === "encouraging" || sig.state === "happy" ? 160 : 80;
          [bg1, bg2].forEach((bg) => {
            bg.pos.x -= bgSpeed * k.dt();
            if (bg.pos.x <= -bgWidth) bg.pos.x = bgWidth;
          });

          // Detect new ring collected
          if (sig.rings > sig.prevRings) {
            const diff = sig.rings - sig.prevRings;
            for (let i = 0; i < diff; i++) {
              spawnRingCollect(
                90 + k.rand(-20, 20),
                GROUND_Y - 60 + k.rand(-20, 0)
              );
            }
            displayedRings = sig.rings;
            ringText.text = `${displayedRings}`;
            sig.prevRings = sig.rings;
          }

          // Hurt countdown
          if (hurtTimer > 0) {
            hurtTimer -= k.dt();
          }

          // Avatar state → Sonic behaviour
          if (hurtTimer <= 0) {
            switch (sig.state) {
              case "happy":
              case "encouraging":
                if (!isJumping && sonic.isGrounded()) {
                  isJumping = true;
                  sonic.jump(1400);
                  sonic.play("jump");
                  removeMotobug();
                }
                break;

              case "thinking":
                if (sonic.isGrounded() && sonic.curAnim() !== "run") {
                  sonic.play("run");
                }
                // Slow Sonic scale shimmer
                sonic.scale.x = 3 + Math.sin(k.time() * 4) * 0.08;
                break;

              case "empathetic":
                spawnMotobug();
                break;

              case "listening":
                // Bob slightly — handled by run anim
                if (sonic.isGrounded() && sonic.curAnim() !== "run") sonic.play("run");
                break;

              default:
                if (sonic.isGrounded() && sonic.curAnim() !== "run") sonic.play("run");
                break;
            }
          }

          // Move motobug toward Sonic
          if (motobugObj?.exists()) {
            motobugObj.pos.x -= 120 * k.dt();
            if (motobugObj.pos.x < -50) {
              k.destroy(motobugObj);
              motobugObj = null;
              motoActive = false;
            }
            // Remove if state resolved
            if (sig.state !== "empathetic" && sig.state !== "thinking") {
              removeMotobug();
            }
          }

          // Speaking: face bob handled by run anim speed variation
          if (sig.speaking) {
            sonic.scale.y = 3 + Math.sin(k.time() * 18) * 0.12;
          } else {
            sonic.scale.y = 3;
          }
        });

        // ── Glow label under Sonic ────────────────────────────────
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
          k.text(stateLabels[avatarState] ?? "Listo", {
            size: 11,
            font: "monospace",
          }),
          k.pos(90, GROUND_Y + 14),
          k.anchor("top"),
          k.color(k.Color.fromHex("#ffcc00")),
          k.z(10),
        ]);

        k.onUpdate(() => {
          const s = signals.current.state;
          label.text = stateLabels[s] ?? "Listo";
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
  }, []); // mount/unmount only

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
