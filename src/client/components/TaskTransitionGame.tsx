"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { playSFX } from "@/client/audio/sfx";
import { createKaplay, destroyKaplay } from "@/client/avatar/kaplayManager";

interface TaskTransitionGameProps {
  earnedRings:      number;
  fromZone:         string;
  toZone:           string;
  condition:        "A" | "B";
  onComplete:       () => void;
  onRingCollected?: () => void;
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

  const [headerVisible, setHeaderVisible] = useState(false);
  const [outroVisible,  setOutroVisible]  = useState(false);
  const [fadeOut,       setFadeOut]       = useState(false);
  const [progress,      setProgress]      = useState(0);
  const [collectedHere, setCollectedHere] = useState(0);

  const isConditionA   = condition === "A";
  const ringCount      = Math.max(1, Math.min(earnedRings, 10));
  const bossDefeatedRef = useRef(false);

  // Refs so callbacks don't get stale
  const outroFiredRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  // ── Outro sequence ────────────────────────────────────────────
  const startOutro = useCallback(() => {
    if (outroFiredRef.current) return;
    outroFiredRef.current = true;
    setOutroVisible(true);

    let prog = 0;
    const iv = setInterval(() => {
      prog = Math.min(100, prog + 2);
      setProgress(prog);
    }, 50);

    setTimeout(() => { clearInterval(iv); setProgress(100); }, 2500);
    setTimeout(() => setFadeOut(true), 3200);
    setTimeout(() => onCompleteRef.current(), 3800);
  }, []);

  // ── Timeline ──────────────────────────────────────────────────
  useEffect(() => {
    const t0 = setTimeout(() => setHeaderVisible(true), 150);
    const t1 = setTimeout(() => startOutro(), 14000); // max 14s fallback
    return () => { clearTimeout(t0); clearTimeout(t1); };
  }, [startOutro]);

  // ── Kaplay scene ─────────────────────────────────────────────
  useEffect(() => {
    if (!isConditionA || !canvasRef.current) return;
    let mounted = true;
    let localRings = 0;
    // Use ref so the header can also read bossDefeated state
    bossDefeatedRef.current = false;

    createKaplay(canvasRef.current, {
      width:      800,
      height:     300,
      letterbox:  true,
      background: [0, 8, 20],
      global:     false,
      debug:      false,
    }).then((k) => {
      if (!k || !mounted) return;

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
        const GROUND_Y   = 250;
        const BG_W       = 1600;
        // World-scroll speed: rings + other objects move LEFT toward Sonic.
        // This gives the "Sonic running through the world" feel while Sonic
        // stays at a fixed screen X (no camera needed).
        const WORLD_SPD  = 170;

        // ── Backgrounds ──────────────────────────────────────
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bg1: any = k.add([k.sprite("bg"), k.pos(0, 0),    k.scale(2.67), k.z(0)]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bg2: any = k.add([k.sprite("bg"), k.pos(BG_W, 0), k.scale(2.67), k.z(0)]);

        // Ground — wide enough so scrolling world never reveals a gap
        k.add([k.rect(800, 60), k.pos(0, GROUND_Y), k.color(k.Color.fromHex("#1a3d1a")), k.body({ isStatic: true }), k.area(), k.z(1)]);
        k.add([k.rect(800, 10), k.pos(0, GROUND_Y), k.color(k.Color.fromHex("#4caf50")), k.z(2)]);

        // ── Sonic (player) ────────────────────────────────────
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sonic: any = k.add([
          k.sprite("sonic", { anim: "run" }),
          k.pos(130, GROUND_Y),
          k.scale(2),
          k.anchor("bot"),
          k.body(),
          k.area(),
          k.z(5),
          "sonic",
        ]);

        // Controls
        function tryJump() {
          if (sonic.isGrounded()) {
            sonic.jump(1700);
            sonic.play("jump");
            // Reset rotation immediately after jump impulse
            sonic.angle           = 0;
            sonic.angularVelocity = 0;
            playSFX("jump", 0.5);
          }
        }
        k.onKeyPress("space", tryJump);
        k.onKeyPress("up",    tryJump);
        k.onKeyPress("w",     tryJump);
        k.onClick(tryJump);

        sonic.onGround(() => {
          sonic.angle           = 0;
          sonic.angularVelocity = 0;
          if (sonic.curAnim() !== "run") sonic.play("run");
        });

        // Hint
        k.add([
          k.text("ESPACIO / CLICK para saltar", { size: 13, font: "monospace" }),
          k.pos(400, 16),
          k.anchor("top"),
          // Note: Kaplay fromHex only accepts 6-char hex — alpha must be a separate k.opacity()
          k.color(k.Color.fromHex("#ffcc00")),
          k.opacity(0.5),
          k.z(10),
        ]);

        // ── Rings placed ahead in world-space ─────────────────
        // Rings start to the right of Sonic and scroll toward him at WORLD_SPD.
        // Layout: every 3rd ring is elevated so players must jump for it.
        for (let i = 0; i < ringCount; i++) {
          const elevated = i % 3 === 2;
          const y = elevated ? GROUND_Y - 115 : GROUND_Y - 48;
          const x = 350 + i * 65;          // first ring at x=350, spreads rightward
          k.add([
            k.sprite("ring-sprite", { anim: "spin" }),
            k.pos(x, y),
            k.scale(2.5),
            k.anchor("center"),
            k.area({ shape: new k.Rect(k.vec2(-13, -13), 26, 26) }),
            k.z(4),
            "ring",
          ]);
        }

        // Collect rings
        sonic.onCollide("ring", (ring: ReturnType<typeof k.add>) => {
          k.destroy(ring);
          localRings++;
          setCollectedHere(localRings);
          playSFX("ring", 0.65);
          onRingCollected?.();

          // Burst effect at ring position
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const burst: any = k.add([
            k.sprite("ring-sprite", { anim: "spin" }),
            k.pos((ring as any).pos.clone()),
            k.scale(3.5), k.anchor("center"), k.z(8), k.opacity(1),
          ]);
          let bt = 0;
          const ctrl = k.onUpdate(() => {
            if (!burst.exists()) { ctrl.cancel(); return; }
            bt += k.dt(); burst.pos.y -= 75 * k.dt(); burst.opacity = Math.max(0, 1 - bt * 2.5);
            if (bt > 0.4) { k.destroy(burst); ctrl.cancel(); }
          });

          if (localRings >= ringCount && bossDefeatedRef.current) {
            setTimeout(() => { if (mounted) startOutro(); }, 600);
          }
        });

        // ── Motobug boss ──────────────────────────────────────
        // Spawns far to the right; the world scroll plus its own chase speed
        // bring it to Sonic at roughly the same time as the last ring.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const moto: any = k.add([
          k.sprite("motobug", { anim: "run" }),
          k.pos(1050, GROUND_Y),
          k.scale(2.5),
          k.anchor("bot"),
          k.area(),
          k.z(4),
          "motobug",
        ]);

        // Defeat motobug by stomping (falling vel must be positive = downward)
        sonic.onCollide("motobug", (bug: ReturnType<typeof k.add>) => {
          if (!bossDefeatedRef.current && sonic.vel.y > 30) {
            bossDefeatedRef.current = true;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const ex: any = k.add([k.text("💥", { size: 40 }), k.pos((bug as any).pos.clone()), k.anchor("center"), k.z(9)]);
            setTimeout(() => { if (ex.exists()) k.destroy(ex); }, 600);
            k.destroy(bug);
            playSFX("destroy", 0.75);
            sonic.jump(1500); // bounce
            sonic.angle           = 0;
            sonic.angularVelocity = 0;

            if (localRings >= ringCount) {
              setTimeout(() => { if (mounted) startOutro(); }, 600);
            }
          }
        });

        // ── Update ────────────────────────────────────────────
        k.onUpdate(() => {
          // ① Rotation lock — prevent physics from tilting Sonic
          sonic.angle           = 0;
          sonic.angularVelocity = 0;

          // ② Scroll background (slightly faster than world for parallax)
          [bg1, bg2].forEach((bg) => {
            bg.pos.x -= (WORLD_SPD + 40) * k.dt();
            if (bg.pos.x <= -BG_W) bg.pos.x = BG_W;
          });

          // ③ Scroll all rings toward Sonic (world-runner effect)
          k.get("ring").forEach((ring: ReturnType<typeof k.add>) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (ring as any).pos.x -= WORLD_SPD * k.dt();
          });

          // ④ Motobug: world scroll + chase speed; flip to face left
          if (moto.exists()) {
            moto.pos.x -= (WORLD_SPD + 60) * k.dt();
            moto.scale.x = -2.5;
            if (moto.pos.x < -60) k.destroy(moto);
          }
        });
      });

      k.go("transition");
    });

    return () => {
      mounted = false;
      destroyKaplay();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Render ────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        background:     "#000810",
        opacity:        fadeOut ? 0 : 1,
        transition:     "opacity 0.6s ease",
        pointerEvents:  fadeOut ? "none" : "auto",
      }}
    >
      {/* ── Zone completed header ──────────────────────────── */}
      <div
        style={{
          transform:    headerVisible ? "translateY(0)" : "translateY(-100%)",
          transition:   "transform 0.5s cubic-bezier(0.22,1,0.36,1)",
          background:   "linear-gradient(90deg, #003366, #0066cc, #003366)",
          borderBottom: "4px solid #ffcc00",
          padding:      "12px 28px",
          display:      "flex",
          alignItems:   "center",
          gap:          "16px",
          flexShrink:   0,
        }}
      >
        <div style={{
          fontFamily:    "'Courier New', monospace",
          fontSize:      "20px",
          fontWeight:    900,
          color:         "#ffcc00",
          textShadow:    "2px 2px 0 #cc6600",
          letterSpacing: "0.07em",
        }}>
          ✓ ZONA 1: {fromZone}
        </div>
        {/* Live ring counter */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{
            width: 24, height: 24,
            backgroundImage: "url(/sprites/ring.png)",
            backgroundSize:  "1600% 100%",
            imageRendering:  "pixelated",
            animation:       "ringSheetSpin 0.6s steps(16) infinite",
          }} />
          <span style={{ fontFamily: "'Courier New', monospace", fontWeight: 700, color: "#ffcc00", fontSize: "15px" }}>
            +{collectedHere} / {ringCount}
          </span>
        </div>
        <div style={{ fontFamily: "'Courier New', monospace", fontSize: "12px", color: "#ffffff88" }}>
          {bossDefeatedRef.current ? "🦔 ¡Derrotado!" : ""}
        </div>
      </div>

      {/* ── Game canvas / Condition B placeholder ─────────── */}
      {isConditionA ? (
        <canvas
          ref={canvasRef}
          className="flex-1 w-full"
          style={{ imageRendering: "pixelated", display: "block", outline: "none" }}
          tabIndex={0}
        />
      ) : (
        <div
          className="flex-1 flex flex-col items-center justify-center gap-4"
          style={{
            backgroundImage: "url(/sprites/chemical-bg.png)",
            backgroundRepeat: "repeat-x",
            backgroundSize: "auto 60%",
            backgroundPosition: "center bottom",
            imageRendering: "pixelated",
            animation: "bgScrollCondB 2s linear infinite",
          }}
        >
          <style>{`@keyframes bgScrollCondB{from{background-position-x:0}to{background-position-x:-480px}}`}</style>
          <div style={{ fontFamily: "'Courier New', monospace", color: "#ffcc00", fontSize: 22, fontWeight: 700, textShadow: "2px 2px 0 #cc6600" }}>
            Preparando Zona 2...
          </div>
          <div style={{ fontFamily: "'Courier New', monospace", color: "#ffffff88", fontSize: 13 }}>
            ZONA 2: {toZone}
          </div>
        </div>
      )}

      {/* ── Outro / loading panel ──────────────────────────── */}
      {outroVisible && (
        <div
          style={{
            background:   "linear-gradient(90deg, #001a33, #002244, #001a33)",
            borderTop:    "4px solid #ffcc00",
            padding:      "16px 28px",
            flexShrink:   0,
          }}
        >
          <div style={{
            fontFamily:    "'Courier New', monospace",
            fontSize:      "17px",
            fontWeight:    700,
            color:         "#ffffff",
            letterSpacing: "0.1em",
            marginBottom:  "10px",
          }}>
            CARGANDO ZONA 2: {toZone}...
          </div>
          <div style={{ width: "100%", height: "12px", background: "#0a1a2a", borderRadius: "6px", border: "2px solid #0066cc", overflow: "hidden" }}>
            <div style={{
              height:       "100%",
              width:        `${progress}%`,
              background:   "linear-gradient(90deg, #0066cc, #ffcc00)",
              borderRadius: "6px",
              transition:   "width 0.05s linear",
              boxShadow:    "0 0 8px rgba(255,204,0,0.5)",
            }} />
          </div>
          <div style={{ marginTop: "6px", fontFamily: "'Courier New', monospace", fontSize: "11px", color: "#ffcc0099", letterSpacing: "0.2em" }}>
            {Math.round(progress)}%
          </div>
        </div>
      )}
    </div>
  );
}
