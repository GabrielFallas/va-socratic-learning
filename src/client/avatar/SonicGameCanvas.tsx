"use client";

import { useEffect, useRef } from "react";
import type { AvatarState } from "@/shared/types/session";
import { createKaplay, destroyKaplay } from "@/client/avatar/kaplayManager";

interface SonicGameCanvasProps {
  avatarState:           AvatarState;
  isSpeaking:            boolean;
  ringsCollected?:       number;
  timeRemainingSeconds?: number;
  taskCompleted?:        boolean;
  className?:            string;
}

interface GameSignals {
  state:     AvatarState;
  speaking:  boolean;
  rings:     number;
  prevRings: number;
  timeLeft:  number;
  completed: boolean;
}

export default function SonicGameCanvas({
  avatarState,
  isSpeaking,
  ringsCollected       = 0,
  timeRemainingSeconds = 600,
  taskCompleted        = false,
  className            = "",
}: SonicGameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signals   = useRef<GameSignals>({
    state:     avatarState,
    speaking:  isSpeaking,
    rings:     ringsCollected,
    prevRings: ringsCollected,
    timeLeft:  timeRemainingSeconds,
    completed: taskCompleted,
  });

  // Sync props → signals each render (no re-mount)
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

    createKaplay(canvasRef.current, {
      width:      480,
      height:     260,
      letterbox:  true,
      background: [0, 10, 25],
      global:     false,
      debug:      false,
    }).then((k) => {
      if (!k || !mounted) return;

      // ── Sprites ────────────────────────────────────────────
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
        const GROUND_Y = 215;
        const BG_W     = 960;

        // Scrolling BG
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bg1: any = k.add([k.sprite("bg"), k.pos(0, 0),    k.scale(2), k.z(0)]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bg2: any = k.add([k.sprite("bg"), k.pos(BG_W, 0), k.scale(2), k.z(0)]);

        // Red tint overlay (critical timer)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const redTint: any = k.add([
          k.rect(480, 260), k.pos(0, 0),
          k.color(k.Color.fromHex("#ff0000")),
          k.opacity(0), k.z(15), k.fixed(),
        ]);

        // Ground
        k.add([k.rect(480, 50), k.pos(0, GROUND_Y), k.color(k.Color.fromHex("#1a3a1a")), k.body({ isStatic: true }), k.area(), k.z(1)]);
        k.add([k.rect(480, 8),  k.pos(0, GROUND_Y), k.color(k.Color.fromHex("#4caf50")), k.z(2)]);

        // Sonic — anchor bot so pos.y = ground top
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sonic: any = k.add([
          k.sprite("sonic", { anim: "run" }),
          k.pos(90, GROUND_Y),
          k.scale(2),
          k.anchor("bot"),
          k.body(),
          k.area(),
          k.z(5),
          "sonic",
        ]);

        let isJumping    = false;
        let hurtTimer    = 0;
        let victoryMode  = false;
        let victoryTimer = 0;

        // Ring HUD
        k.add([k.sprite("ring-sprite", { anim: "spin" }), k.pos(390, 8), k.scale(1.3), k.z(11), k.fixed()]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ringText: any = k.add([
          k.text(`${signals.current.rings}`, { size: 16, font: "monospace" }),
          k.pos(412, 11), k.color(k.Color.fromHex("#ffcc00")), k.z(11), k.fixed(),
        ]);

        // Timer bar
        k.add([k.rect(480, 6), k.pos(0, 254), k.color(k.Color.fromHex("#001a33")), k.z(12), k.fixed()]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const timerBar: any = k.add([k.rect(480, 6), k.pos(0, 254), k.color(k.Color.fromHex("#0066cc")), k.z(13), k.fixed()]);

        // Ring burst
        function spawnRingBurst(x: number, y: number) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const r: any = k.add([k.sprite("ring-sprite", { anim: "spin" }), k.pos(x, y), k.scale(2.5), k.anchor("center"), k.z(8), k.opacity(1)]);
          let t = 0;
          const ctrl = k.onUpdate(() => {
            if (!r.exists()) { ctrl.cancel(); return; }
            t += k.dt(); r.pos.y -= 60 * k.dt(); r.opacity = Math.max(0, 1 - t * 2.2);
            if (t > 0.5) { k.destroy(r); ctrl.cancel(); }
          });
        }

        // Motobug
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let motobugObj: any = null;
        let motoActive = false;
        let motoTimer  = 0;

        function spawnMotobug() {
          if (motoActive) return;
          motoActive = true;
          motobugObj = k.add([k.sprite("motobug", { anim: "run" }), k.pos(510, GROUND_Y), k.scale(2), k.anchor("bot"), k.z(4), "motobug"]);
        }
        function destroyMotobug(explode = true) {
          if (!motobugObj?.exists()) { motoActive = false; return; }
          if (explode) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const ex: any = k.add([k.text("💥", { size: 28 }), k.pos(motobugObj.pos.clone()), k.anchor("center"), k.z(9)]);
            setTimeout(() => { if (ex.exists()) k.destroy(ex); }, 380);
          }
          k.destroy(motobugObj); motobugObj = null; motoActive = false; motoTimer = 0;
        }

        // Victory stars
        function spawnVictoryStar(x: number, y: number) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const star: any = k.add([k.text("⭐", { size: 22 }), k.pos(x, y), k.anchor("center"), k.z(9), k.opacity(1)]);
          let t = 0;
          const ctrl = k.onUpdate(() => {
            if (!star.exists()) { ctrl.cancel(); return; }
            t += k.dt(); star.pos.y -= 45 * k.dt(); star.pos.x += Math.sin(t * 8) * 2; star.opacity = Math.max(0, 1 - t * 1.6);
            if (t > 0.65) { k.destroy(star); ctrl.cancel(); }
          });
        }

        sonic.onGround(() => {
          isJumping = false;
          if (hurtTimer <= 0 && !victoryMode && sonic.curAnim() !== "run") sonic.play("run");
        });

        const stateLabels: Record<AvatarState, string> = {
          idle: "Listo", thinking: "Pensando...", speaking: "Hablando",
          listening: "Escuchando", happy: "¡Genial!", curious: "Curioso",
          empathetic: "Comprensivo", encouraging: "¡Vamos!",
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const label: any = k.add([
          k.text("", { size: 10, font: "monospace" }),
          k.pos(90, GROUND_Y + 12), k.anchor("top"),
          k.color(k.Color.fromHex("#ffcc00")), k.z(10), k.fixed(),
        ]);

        k.onUpdate(() => {
          const sig = signals.current;

          // FIX: prevent Kaplay physics from rotating Sonic
          sonic.angle           = 0;
          sonic.angularVelocity = 0;

          // Background speed (more rings = faster, boosted on happy/encouraging)
          const boost   = sig.state === "encouraging" || sig.state === "happy" || victoryMode ? 2 : 1;
          const bgSpeed = Math.min(220, 80 + Math.floor(sig.rings / 5) * 10) * boost;
          [bg1, bg2].forEach((bg) => {
            bg.pos.x -= bgSpeed * k.dt();
            if (bg.pos.x <= -BG_W) bg.pos.x = BG_W;
          });

          // Timer bar
          timerBar.width = 480 * Math.max(0, sig.timeLeft / 600);
          timerBar.color =
            sig.timeLeft < 30  ? k.Color.fromHex("#ff2222") :
            sig.timeLeft < 60  ? k.Color.fromHex("#ff8800") :
            sig.timeLeft < 120 ? k.Color.fromHex("#ffcc00") :
                                 k.Color.fromHex("#0066cc");

          // Red tint pulse when critical
          redTint.opacity = sig.timeLeft < 30 && !sig.completed
            ? 0.07 * Math.abs(Math.sin(k.time() * 4)) : 0;

          // Motobug timer
          if (!sig.completed && !victoryMode) {
            const motoInterval =
              sig.timeLeft < 30  ? 2.5 :
              sig.timeLeft < 60  ? 5.0 :
              sig.state === "empathetic" ? 8.0 : 999;
            motoTimer += k.dt();
            if (motoTimer > motoInterval) { spawnMotobug(); motoTimer = 0; }
          }
          if (motobugObj?.exists()) {
            motobugObj.pos.x -= 130 * k.dt();
            if (motobugObj.pos.x < -50) destroyMotobug(false);
          }

          // Ring collect burst
          if (sig.rings > sig.prevRings) {
            for (let i = 0; i < sig.rings - sig.prevRings; i++) {
              spawnRingBurst(95 + k.rand(-18, 18), GROUND_Y - 50 + k.rand(-15, 0));
            }
            ringText.text = `${sig.rings}`;
            sig.prevRings = sig.rings;
          }
          if (ringText.text !== `${sig.rings}`) ringText.text = `${sig.rings}`;

          if (hurtTimer > 0) hurtTimer -= k.dt();

          // Victory mode
          if (sig.completed && !victoryMode) {
            victoryMode = true;
            destroyMotobug(false);
            const iv = setInterval(() => {
              if (!mounted) { clearInterval(iv); return; }
              spawnVictoryStar(sonic.pos.x + k.rand(-40, 80), sonic.pos.y - k.rand(20, 80));
            }, 220);
            setTimeout(() => clearInterval(iv), 4000);
          }
          if (victoryMode) {
            victoryTimer += k.dt();
            if (sonic.isGrounded() && victoryTimer % 0.9 < k.dt() * 2) { sonic.jump(1100); sonic.play("jump"); }
            label.text  = "¡ZONA COMPLETADA!";
            label.color = k.Color.fromHex("#ffcc00");
            return;
          }

          // Avatar state → Sonic behaviour
          if (hurtTimer <= 0) {
            switch (sig.state) {
              case "happy": case "encouraging":
                if (!isJumping && sonic.isGrounded()) {
                  isJumping = true; sonic.jump(1350); sonic.play("jump"); destroyMotobug();
                }
                break;
              case "thinking":
                sonic.scale.x = 2 + Math.sin(k.time() * 4) * 0.06;
                if (sonic.isGrounded() && sonic.curAnim() !== "run") sonic.play("run");
                break;
              case "empathetic":
                if (sonic.isGrounded() && sonic.curAnim() !== "run") sonic.play("run");
                break;
              default:
                if (motoActive) destroyMotobug();
                if (sonic.isGrounded() && sonic.curAnim() !== "run") sonic.play("run");
                break;
            }
          }

          // Speaking bob
          sonic.scale.y = sig.speaking ? 2 + Math.sin(k.time() * 18) * 0.09 : 2;

          // State label
          label.text  = sig.timeLeft < 30 && !sig.completed ? "⚠ TIEMPO CRÍTICO" : stateLabels[sig.state] ?? "Listo";
          label.color = sig.timeLeft < 30 && !sig.completed ? k.Color.fromHex("#ff4444") : k.Color.fromHex("#ffcc00");
        });
      });

      k.go("main");
    });

    return () => {
      mounted = false;
      destroyKaplay();
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
