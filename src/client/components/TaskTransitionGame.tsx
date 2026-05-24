"use client";

// ─────────────────────────────────────────────────────────────────
// TaskTransitionGame — Fullscreen Kaplay runner between tasks
//
// Plays a ~7-second automated Sonic mini-game showing:
//   • "ZONA 1 COMPLETADA" slide-in header
//   • Sonic auto-runs, collecting rings equal to earned rings
//   • A big motobug spawns → Sonic auto-jumps to defeat it
//   • "CARGANDO ZONA 2..." + animated progress bar
//   • Fade to black → calls onComplete()
//
// This component is mounted as a fixed fullscreen overlay.
// ─────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { playSFX, startBGMusic } from "@/client/audio/sfx";

interface TaskTransitionGameProps {
  earnedRings:    number;   // rings from completed task (shown collected)
  fromZone:       string;   // "BUCLE INFINITO"
  toZone:         string;   // "OPTIMIZACIÓN ALGORÍTMICA"
  condition:      "A" | "B";
  onComplete:     () => void;
}

export default function TaskTransitionGame({
  earnedRings,
  fromZone,
  toZone,
  condition,
  onComplete,
}: TaskTransitionGameProps) {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<"intro" | "game" | "outro" | "fade">("intro");
  const [progress, setProgress]   = useState(0);
  const [headerVisible, setHeaderVisible] = useState(false);
  const [outroVisible,  setOutroVisible]  = useState(false);
  const [fadeOut,       setFadeOut]       = useState(false);

  const isConditionA = condition === "A";

  useEffect(() => {
    // Sequence timeline
    const t0  = setTimeout(() => setHeaderVisible(true),      100);
    const t1  = setTimeout(() => setPhase("game"),            800);
    const t2  = setTimeout(() => setPhase("outro"),          4500);
    const t3  = setTimeout(() => setOutroVisible(true),      4600);
    const t4  = setTimeout(() => setFadeOut(true),           6800);
    const t5  = setTimeout(() => onComplete(),               7400);

    // Progress bar fills from t3 → t4 (2.2s)
    let prog = 0;
    const progInterval = setInterval(() => {
      prog = Math.min(100, prog + 2.2);
      setProgress(prog);
    }, 48);
    const t6 = setTimeout(() => clearInterval(progInterval), 2400);

    return () => {
      [t0,t1,t2,t3,t4,t5,t6].forEach(clearTimeout);
      clearInterval(progInterval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Kaplay mini-game (only for Condition A) ───────────────────
  useEffect(() => {
    if (!isConditionA || !canvasRef.current) return;
    let mounted = true;

    import("kaplay").then(({ default: kaplay }) => {
      if (!mounted || !canvasRef.current) return;

      const k = kaplay({
        canvas:     canvasRef.current!,
        width:      800,
        height:     300,
        letterbox:  true,
        background: [0, 8, 20],
        global:     false,
        debug:      false,
      });

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
      k.loadSprite("platform", "/sprites/platforms.png");

      k.scene("transition", () => {
        k.setGravity(2400);
        const GROUND_Y = 250;
        const BG_W     = 1600;

        // ── Scrolling backgrounds ──────────────────────────────
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bg1: any = k.add([k.sprite("bg"), k.pos(0, 0),   k.scale(2.67), k.z(0)]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bg2: any = k.add([k.sprite("bg"), k.pos(BG_W, 0), k.scale(2.67), k.z(0)]);

        // Ground
        k.add([k.rect(800, 60), k.pos(0, GROUND_Y), k.color(k.Color.fromHex("#1a3d1a")), k.body({ isStatic: true }), k.area(), k.z(1)]);
        k.add([k.rect(800, 10), k.pos(0, GROUND_Y), k.color(k.Color.fromHex("#4caf50")), k.z(2)]);

        // ── Sonic ──────────────────────────────────────────────
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sonic: any = k.add([
          k.sprite("sonic", { anim: "run" }),
          k.pos(120, GROUND_Y - 5),
          k.scale(3.5),
          k.anchor("botleft"),
          k.body(),
          k.area({ shape: new k.Rect(k.vec2(-4, -40), 22, 40) }),
          k.z(5),
        ]);

        // ── Pre-spawn rings in a row ahead of Sonic ────────────
        const ringCount = Math.min(earnedRings, 12);
        for (let i = 0; i < ringCount; i++) {
          k.add([
            k.sprite("ring-sprite", { anim: "spin" }),
            k.pos(280 + i * 55, GROUND_Y - 55),
            k.scale(2.8),
            k.anchor("center"),
            k.area({ shape: new k.Rect(k.vec2(-10, -10), 20, 20) }),
            k.z(4),
            "ring",
          ]);
        }

        // ── Motobug (appears at t=2.5s) ───────────────────────
        let moto: ReturnType<typeof k.add> | null = null;
        let motoSpawned = false;
        let motoDefeated = false;
        let autoJumped = false;

        setTimeout(() => {
          if (!mounted) return;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          moto = k.add([
            k.sprite("motobug", { anim: "run" }),
            k.pos(820, GROUND_Y - 5),
            k.scale(3.5),
            k.anchor("botleft"),
            k.area({ shape: new k.Rect(k.vec2(-4, -30), 18, 30) }),
            k.z(4),
            "motobug",
          ]) as any;
          motoSpawned = true;
        }, 2500);

        // Auto collect rings
        sonic.onCollide("ring", (ring: ReturnType<typeof k.add>) => {
          playSFX("ring", 0.6);
          // Burst upward
          const burst = k.add([
            k.sprite("ring-sprite", { anim: "spin" }),
            k.pos((ring as any).pos.clone()),
            k.scale(3.5),
            k.anchor("center"),
            k.z(8),
            k.opacity(1),
          ]);
          let bt = 0;
          k.onUpdate(() => {
            if (!burst.exists()) return;
            bt += k.dt();
            (burst as any).pos.y -= 80 * k.dt();
            (burst as any).opacity = Math.max(0, 1 - bt * 2.5);
            if (bt > 0.45) k.destroy(burst);
          });
          k.destroy(ring);
        });

        // ── Main update loop ───────────────────────────────────
        const bgSpeed = 200;
        k.onUpdate(() => {
          // Scroll bg
          [bg1, bg2].forEach((bg) => {
            bg.pos.x -= bgSpeed * k.dt();
            if (bg.pos.x <= -BG_W) bg.pos.x = BG_W;
          });

          // Move motobug left
          if (moto?.exists()) {
            (moto as any).pos.x -= 150 * k.dt();

            // Auto-jump when motobug is close
            const dist = (moto as any).pos.x - sonic.pos.x;
            if (!autoJumped && motoSpawned && dist < 200 && sonic.isGrounded()) {
              autoJumped = true;
              sonic.jump(1600);
              sonic.play("jump");
              playSFX("jump", 0.5);
            }

            // Defeat motobug if Sonic is above it
            if (!motoDefeated && sonic.pos.y < (moto as any).pos.y - 30 && dist < 80 && dist > -60) {
              motoDefeated = true;
              const ex = k.add([
                k.text("💥", { size: 36 }),
                k.pos((moto as any).pos.clone()),
                k.anchor("center"),
                k.z(9),
              ]);
              setTimeout(() => { if (ex.exists()) k.destroy(ex); }, 500);
              k.destroy(moto as any);
              moto = null;
              playSFX("destroy", 0.7);
            }
          }

          // Land → run anim
          if (sonic.isGrounded() && sonic.curAnim() !== "run") {
            sonic.play("run");
            autoJumped = false;
          }
        });
      });

      k.go("transition");

      return () => {
        mounted = false;
        try { k.quit(); } catch { /**/ }
      };
    });

    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Render ────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        background: "#000810",
        opacity: fadeOut ? 0 : 1,
        transition: "opacity 0.6s ease",
      }}
    >
      {/* ── Zone 1 complete header ────────────────────────────── */}
      <div
        style={{
          transform: headerVisible ? "translateY(0)" : "translateY(-100%)",
          transition: "transform 0.5s cubic-bezier(0.22,1,0.36,1)",
          background: "linear-gradient(90deg, #003366, #0066cc, #003366)",
          borderBottom: "4px solid #ffcc00",
          padding: "14px 32px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontFamily: "'Courier New', monospace",
            fontSize: "22px",
            fontWeight: 900,
            color: "#ffcc00",
            letterSpacing: "0.1em",
            textShadow: "2px 2px 0 #cc6600",
          }}
        >
          ✓ ZONA 1: {fromZone}
        </div>
        <div
          style={{
            marginLeft: "auto",
            fontFamily: "'Courier New', monospace",
            fontSize: "13px",
            color: "#ffcc0099",
            letterSpacing: "0.2em",
          }}
        >
          {earnedRings} RINGS COLLECTED
        </div>
      </div>

      {/* ── Kaplay canvas (Condition A) ────────────────────────── */}
      {isConditionA ? (
        <canvas
          ref={canvasRef}
          className="flex-1 w-full"
          style={{ imageRendering: "pixelated", display: "block" }}
        />
      ) : (
        /* Condition B: simple animated bg strip */
        <div
          className="flex-1 flex items-center justify-center"
          style={{
            backgroundImage: "url(/sprites/chemical-bg.png)",
            backgroundRepeat: "repeat-x",
            backgroundSize: "auto 100%",
            imageRendering: "pixelated",
            animation: "bgScrollCondB 2s linear infinite",
            opacity: 0.3,
          }}
        >
          <style>{`@keyframes bgScrollCondB{from{background-position-x:0}to{background-position-x:-480px}}`}</style>
        </div>
      )}

      {/* ── Outro panel ───────────────────────────────────────── */}
      {phase === "outro" && (
        <div
          style={{
            transform: outroVisible ? "translateY(0)" : "translateY(100%)",
            transition: "transform 0.5s cubic-bezier(0.22,1,0.36,1)",
            background: "linear-gradient(90deg, #001a33, #002244, #001a33)",
            borderTop: "4px solid #ffcc00",
            padding: "20px 32px",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontFamily: "'Courier New', monospace",
              fontSize: "18px",
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "0.15em",
              marginBottom: "12px",
            }}
          >
            CARGANDO ZONA 2: {toZone}...
          </div>

          {/* Progress bar */}
          <div
            style={{
              width: "100%",
              height: "12px",
              background: "#0a1a2a",
              borderRadius: "6px",
              border: "2px solid #0066cc",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progress}%`,
                background: "linear-gradient(90deg, #0066cc, #ffcc00)",
                borderRadius: "6px",
                transition: "width 0.05s linear",
                boxShadow: "0 0 8px rgba(255,204,0,0.5)",
              }}
            />
          </div>

          <div
            style={{
              marginTop: "8px",
              fontFamily: "'Courier New', monospace",
              fontSize: "11px",
              color: "#ffcc0088",
              letterSpacing: "0.2em",
            }}
          >
            {Math.round(progress)}%
          </div>
        </div>
      )}
    </div>
  );
}
