"use client";

// ─────────────────────────────────────────────────────────────────
// TaskTransitionGame — Interactive Kaplay mini-runner between tasks
//
// The player controls Sonic with SPACE / click to jump.
// Rings are placed in the path: walk/jump to collect them.
// The motobug must be defeated by jumping on it.
// Rings collected here count toward the session total.
//
// Timeline:
//   0s   — header slides in, game is active
//   ─    — player runs, collects rings, defeats motobug
//   auto — when all rings + motobug done, outro appears automatically
//         OR after 12s timeout, outro fires anyway
//   outro — progress bar fills 2.5s → fade → onComplete()
// ─────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, useCallback } from "react";
import { playSFX } from "@/client/audio/sfx";

interface TaskTransitionGameProps {
  earnedRings:      number;
  fromZone:         string;
  toZone:           string;
  condition:        "A" | "B";
  onComplete:       () => void;
  onRingCollected?: () => void;  // called once per ring collected
}

export default function TaskTransitionGame({
  earnedRings,
  fromZone,
  toZone,
  condition,
  onComplete,
  onRingCollected,
}: TaskTransitionGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const kaplayRef = useRef<any>(null);

  const [headerVisible, setHeaderVisible] = useState(false);
  const [outroVisible,  setOutroVisible]  = useState(false);
  const [fadeOut,       setFadeOut]       = useState(false);
  const [progress,      setProgress]      = useState(0);
  const [collectedHere, setCollectedHere] = useState(0);

  const isConditionA = condition === "A";
  const ringCount    = Math.min(earnedRings, 10);

  // ── Start outro sequence ─────────────────────────────────────
  const startOutro = useCallback(() => {
    setOutroVisible(true);
    let prog = 0;
    const iv = setInterval(() => {
      prog = Math.min(100, prog + 2);
      setProgress(prog);
    }, 50);
    setTimeout(() => {
      clearInterval(iv);
      setProgress(100);
    }, 2500);
    setTimeout(() => setFadeOut(true), 3000);
    setTimeout(() => onComplete(),     3600);
  }, [onComplete]);

  // ── Header in, then auto-outro after 12s max ─────────────────
  useEffect(() => {
    const t0 = setTimeout(() => setHeaderVisible(true), 100);
    const t1 = setTimeout(() => startOutro(), 12000); // max 12s
    return () => { clearTimeout(t0); clearTimeout(t1); };
  }, [startOutro]);

  // ── Kaplay mini-game (Condition A) ───────────────────────────
  useEffect(() => {
    if (!isConditionA || !canvasRef.current) return;
    let mounted = true;

    import("kaplay").then(({ default: kaplay }) => {
      if (!mounted || !canvasRef.current) return;

      // Destroy any pre-existing instance first
      if (kaplayRef.current) {
        try { kaplayRef.current.quit(); } catch { /**/ }
        kaplayRef.current = null;
      }

      const k = kaplay({
        canvas:     canvasRef.current,
        width:      800,
        height:     300,
        letterbox:  true,
        background: [0, 8, 20],
        global:     false,
        debug:      false,
      });
      kaplayRef.current = k;

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

      k.scene("transition", () => {
        k.setGravity(2400);
        const GROUND_Y = 250;
        const BG_W     = 1600;

        // Scrolling backgrounds
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bg1: any = k.add([k.sprite("bg"), k.pos(0, 0),    k.scale(2.67), k.z(0)]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bg2: any = k.add([k.sprite("bg"), k.pos(BG_W, 0), k.scale(2.67), k.z(0)]);

        // Ground
        k.add([k.rect(800, 60), k.pos(0, GROUND_Y), k.color(k.Color.fromHex("#1a3d1a")), k.body({ isStatic: true }), k.area(), k.z(1)]);
        k.add([k.rect(800, 10), k.pos(0, GROUND_Y), k.color(k.Color.fromHex("#4caf50")), k.z(2)]);

        // ── Sonic (player-controlled) ─────────────────────────
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sonic: any = k.add([
          k.sprite("sonic", { anim: "run" }),
          k.pos(100, GROUND_Y),
          k.scale(2),
          k.anchor("bot"),
          k.body(),
          k.area(),
          k.z(5),
          "sonic",
        ]);

        // ── Controls: SPACE / UP / click to jump ──────────────
        function tryJump() {
          if (sonic.isGrounded()) {
            sonic.jump(1700);
            sonic.play("jump");
            playSFX("jump", 0.5);
          }
        }
        k.onKeyPress("space",   tryJump);
        k.onKeyPress("up",      tryJump);
        k.onKeyPress("w",       tryJump);
        k.onClick(tryJump);

        // Land → run
        sonic.onGround(() => {
          if (sonic.curAnim() !== "run") sonic.play("run");
        });

        // ── Hint text ─────────────────────────────────────────
        k.add([
          k.text("ESPACIO / CLICK para saltar", { size: 13, font: "monospace" }),
          k.pos(400, 18),
          k.anchor("top"),
          k.color(k.Color.fromHex("#ffcc00aa")),
          k.z(10),
        ]);

        // ── Rings placed in path ──────────────────────────────
        // Spread rings at different heights: ground-level and elevated
        let ringsLeft = ringCount;
        let totalDefeated = 0;
        let ringsCollectedLocal = 0;

        for (let i = 0; i < ringCount; i++) {
          // Alternate between ground level and elevated
          const elevated  = i % 3 === 2;
          const ringY     = elevated ? GROUND_Y - 100 : GROUND_Y - 40;
          const ringX     = 280 + i * 58;

          k.add([
            k.sprite("ring-sprite", { anim: "spin" }),
            k.pos(ringX, ringY),
            k.scale(2.5),
            k.anchor("center"),
            k.area({ shape: new k.Rect(k.vec2(-12, -12), 24, 24) }),
            k.z(4),
            "ring",
          ]);
        }

        // Collect rings on overlap
        sonic.onCollide("ring", (ring: ReturnType<typeof k.add>) => {
          k.destroy(ring);
          ringsLeft--;
          ringsCollectedLocal++;
          setCollectedHere(ringsCollectedLocal);
          playSFX("ring", 0.65);
          onRingCollected?.();

          // Burst animation
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const burst: any = k.add([
            k.sprite("ring-sprite", { anim: "spin" }),
            k.pos((ring as any).pos.clone()),
            k.scale(3.5),
            k.anchor("center"),
            k.z(8),
            k.opacity(1),
          ]);
          let bt = 0;
          const ctrl = k.onUpdate(() => {
            if (!burst.exists()) { ctrl.cancel(); return; }
            bt += k.dt();
            burst.pos.y  -= 75 * k.dt();
            burst.opacity = Math.max(0, 1 - bt * 2.5);
            if (bt > 0.4) { k.destroy(burst); ctrl.cancel(); }
          });

          // Auto-trigger outro when all objectives done
          if (ringsLeft <= 0 && totalDefeated >= 1) {
            setTimeout(() => { if (mounted) startOutro(); }, 800);
          }
        });

        // ── Motobug (appears at x=750, moves left) ────────────
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const moto: any = k.add([
          k.sprite("motobug", { anim: "run" }),
          k.pos(820, GROUND_Y),
          k.scale(2),
          k.anchor("bot"),
          k.area(),
          k.z(4),
          "motobug",
        ]);

        // Defeat motobug when Sonic lands on top (Sonic above it, overlapping)
        sonic.onCollide("motobug", (bug: ReturnType<typeof k.add>) => {
          // Only defeat if Sonic is falling (above the bug)
          if (sonic.vel.y > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const ex: any = k.add([
              k.text("💥", { size: 36 }),
              k.pos((bug as any).pos.clone()),
              k.anchor("center"),
              k.z(9),
            ]);
            setTimeout(() => { if (ex.exists()) k.destroy(ex); }, 500);
            k.destroy(bug);
            totalDefeated++;
            playSFX("destroy", 0.75);
            // Bouncy jump after defeat
            sonic.jump(1400);

            if (ringsLeft <= 0 && totalDefeated >= 1) {
              setTimeout(() => { if (mounted) startOutro(); }, 800);
            }
          }
        });

        // ── Main update ───────────────────────────────────────
        k.onUpdate(() => {
          // Fix rotation
          sonic.angle           = 0;
          sonic.angularVelocity = 0;

          // Scroll bg
          [bg1, bg2].forEach((bg) => {
            bg.pos.x -= 200 * k.dt();
            if (bg.pos.x <= -BG_W) bg.pos.x = BG_W;
          });

          // Move motobug left (if still alive)
          if (moto.exists()) {
            moto.pos.x -= 160 * k.dt();
            // flip motobug: faces left naturally
          }

          // Camera: keep Sonic roughly in left third
          // (we don't scroll; rings are pre-placed and motobug moves in)
        });
      });

      k.go("transition");
    });

    return () => {
      mounted = false;
      if (kaplayRef.current) {
        try { kaplayRef.current.quit(); } catch { /**/ }
        kaplayRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Render ────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        background: "#000810",
        opacity:    fadeOut ? 0 : 1,
        transition: "opacity 0.6s ease",
        pointerEvents: fadeOut ? "none" : "auto",
      }}
    >
      {/* ── Zone 1 header ─────────────────────────────────────── */}
      <div
        style={{
          transform:  headerVisible ? "translateY(0)" : "translateY(-100%)",
          transition: "transform 0.5s cubic-bezier(0.22,1,0.36,1)",
          background: "linear-gradient(90deg, #003366, #0066cc, #003366)",
          borderBottom: "4px solid #ffcc00",
          padding: "12px 28px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontFamily: "'Courier New', monospace",
            fontSize:   "20px",
            fontWeight: 900,
            color:      "#ffcc00",
            textShadow: "2px 2px 0 #cc6600",
            letterSpacing: "0.08em",
          }}
        >
          ✓ ZONA 1 COMPLETADA: {fromZone}
        </div>
        {/* Live ring counter for this game */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: 22, height: 22,
              backgroundImage:  "url(/sprites/ring.png)",
              backgroundSize:   "1600% 100%",
              imageRendering:   "pixelated",
              animation:        "ringSheetSpin 0.6s steps(16) infinite",
            }}
          />
          <span
            style={{
              fontFamily: "'Courier New', monospace",
              fontWeight: 700,
              color:      "#ffcc00",
              fontSize:   "16px",
            }}
          >
            +{collectedHere} / {ringCount}
          </span>
        </div>
      </div>

      {/* ── Game canvas (Condition A) or BG strip (Condition B) ── */}
      {isConditionA ? (
        <canvas
          ref={canvasRef}
          className="flex-1 w-full"
          style={{ imageRendering: "pixelated", display: "block", outline: "none" }}
          tabIndex={0}
        />
      ) : (
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
          <div style={{ fontFamily: "'Courier New'", color: "#ffcc00", fontSize: 20 }}>
            Preparando Zona 2...
          </div>
        </div>
      )}

      {/* ── Outro panel ───────────────────────────────────────── */}
      {outroVisible && (
        <div
          style={{
            background: "linear-gradient(90deg, #001a33, #002244, #001a33)",
            borderTop: "4px solid #ffcc00",
            padding: "18px 28px",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontFamily:    "'Courier New', monospace",
              fontSize:      "17px",
              fontWeight:    700,
              color:         "#ffffff",
              letterSpacing: "0.12em",
              marginBottom:  "10px",
            }}
          >
            CARGANDO ZONA 2: {toZone}...
          </div>
          <div
            style={{
              width: "100%", height: "12px",
              background: "#0a1a2a",
              borderRadius: "6px",
              border: "2px solid #0066cc",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height:       "100%",
                width:        `${progress}%`,
                background:   "linear-gradient(90deg, #0066cc, #ffcc00)",
                borderRadius: "6px",
                transition:   "width 0.05s linear",
                boxShadow:    "0 0 8px rgba(255,204,0,0.5)",
              }}
            />
          </div>
          <div
            style={{
              marginTop:  "6px",
              fontFamily: "'Courier New', monospace",
              fontSize:   "11px",
              color:      "#ffcc0099",
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
