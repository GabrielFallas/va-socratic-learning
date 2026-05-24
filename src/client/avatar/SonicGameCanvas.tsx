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
  zone?:                 1 | 2;     // 1 = Chemical Plant (blue), 2 = Speed Highway (orange)
  className?:            string;
}

interface GameSignals {
  state:         AvatarState;
  speaking:      boolean;
  rings:         number;
  prevRings:     number;
  timeLeft:      number;
  completed:     boolean;
  zone:          1 | 2;
}

export default function SonicGameCanvas({
  avatarState,
  isSpeaking,
  ringsCollected       = 0,
  timeRemainingSeconds = 600,
  taskCompleted        = false,
  zone                 = 1,
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
    zone,
  });

  // Sync props → signals each render (no re-mount)
  useEffect(() => {
    signals.current.prevRings = signals.current.rings;
    signals.current.state     = avatarState;
    signals.current.speaking  = isSpeaking;
    signals.current.rings     = ringsCollected;
    signals.current.timeLeft  = timeRemainingSeconds;
    signals.current.completed = taskCompleted;
    signals.current.zone      = zone;
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
      k.loadSprite("platforms", "/sprites/platforms.png", {
        sliceX: 8, sliceY: 1,
      });

      k.scene("main", () => {
        k.setGravity(2200);
        const GROUND_Y = 215;
        const BG_W     = 960;

        // Scrolling BG (zone 2 gets a warm tint via a color overlay added later)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bg1: any = k.add([k.sprite("bg"), k.pos(0, 0),    k.scale(2), k.z(0)]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bg2: any = k.add([k.sprite("bg"), k.pos(BG_W, 0), k.scale(2), k.z(0)]);

        // Zone 2 warm colour overlay (Speed Highway sunset palette)
        if (signals.current.zone === 2) {
          k.add([
            k.rect(480, 260), k.pos(0, 0),
            k.color(k.Color.fromHex("#ff6600")),
            k.opacity(0.18), k.z(1), k.fixed(),
          ]);
        }

        // Red tint overlay (critical timer)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const redTint: any = k.add([
          k.rect(480, 260), k.pos(0, 0),
          k.color(k.Color.fromHex("#ff0000")),
          k.opacity(0), k.z(15), k.fixed(),
        ]);

        // Ground — colour varies by zone
        const groundDark  = signals.current.zone === 2 ? "#3a1a1a" : "#1a3a1a";
        const groundEdge  = signals.current.zone === 2 ? "#cc5500" : "#4caf50";
        k.add([k.rect(480, 50), k.pos(0, GROUND_Y), k.color(k.Color.fromHex(groundDark)), k.body({ isStatic: true }), k.area(), k.z(1)]);
        k.add([k.rect(480, 8),  k.pos(0, GROUND_Y), k.color(k.Color.fromHex(groundEdge)), k.z(2)]);

        // ── Scrolling platform tiles — placed at ground level ──────────
        // 8 tiles cover the canvas width (480px / 8 = 60px each at scale ~1)
        // Two sets of tiles alternate so the ground never shows gaps.
        const TILE_W     = 60;   // visible pixel width of one tile at scale 1
        const TILE_COUNT = 10;   // enough to cover 480 + one extra set
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const platTiles: any[] = [];
        for (let i = 0; i < TILE_COUNT * 2; i++) {
          platTiles.push(k.add([
            k.sprite("platforms", { frame: i % 8 }),
            // anchor "top" → pos.y is the TOP edge of the tile, which aligns with
            // Sonic's feet at GROUND_Y so he appears ON TOP of the platform tiles.
            k.pos(i * TILE_W, GROUND_Y),
            k.scale(1),
            k.anchor("top"),
            k.z(3),
          ]));
        }

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
        let hurtBlink    = 0;
        let victoryMode  = false;
        let victoryTimer = 0;

        // ── Timer bar (HTML overlay handles ring count — only time bar here) ─
        k.add([k.rect(480, 6), k.pos(0, 254), k.color(k.Color.fromHex("#001a33")), k.z(12), k.fixed()]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const timerBar: any = k.add([k.rect(480, 6), k.pos(0, 254), k.color(k.Color.fromHex("#0066cc")), k.z(13), k.fixed()]);

        // ── "?" thinking bubble above Sonic ───────────────────────────────
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const thinkBubble: any = k.add([
          k.text("?", { size: 22, font: "monospace" }),
          k.pos(120, 130),
          k.color(k.Color.fromHex("#ffcc00")),
          k.opacity(0),
          k.z(10),
        ]);

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

        // Hurt flash (red overlay blink)
        function spawnHurtFlash() {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const flash: any = k.add([k.rect(480, 260), k.pos(0, 0), k.color(k.Color.fromHex("#ff0000")), k.opacity(0.35), k.z(14), k.fixed()]);
          let ft = 0;
          const ctrl = k.onUpdate(() => {
            if (!flash.exists()) { ctrl.cancel(); return; }
            ft += k.dt(); flash.opacity = Math.max(0, 0.35 - ft * 1.5);
            if (ft > 0.25) { k.destroy(flash); ctrl.cancel(); }
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
          const s = signals.current;
          if (hurtTimer <= 0 && !victoryMode && s.state !== "thinking" && s.state !== "speaking") {
            sonic.paused = false;
            if (sonic.curAnim() !== "run") sonic.play("run");
          }
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

          // ① Rotation lock — must run every frame
          sonic.angle           = 0;
          sonic.angularVelocity = 0;

          // ② Background + platform speed (more rings = faster, boosted on happy/encouraging)
          const isThinking  = sig.state === "thinking";
          const isSpeaking  = sig.state === "speaking";
          const pauseWalk   = isThinking || isSpeaking;  // slow/stop when Sonic talks or thinks
          const boost       = (sig.state === "encouraging" || sig.state === "happy" || victoryMode) ? 2 : 1;
          const bgSpeed     = pauseWalk
            ? 30  // slow crawl when thinking / speaking welcome
            : Math.min(220, 80 + Math.floor(sig.rings / 5) * 10) * boost;
          [bg1, bg2].forEach((bg) => {
            bg.pos.x -= bgSpeed * k.dt();
            if (bg.pos.x <= -BG_W) bg.pos.x = BG_W;
          });
          // Scroll platform tiles at same world speed as bg
          const TILE_FULL_W = 60 * TILE_COUNT * 2;
          platTiles.forEach((t) => {
            t.pos.x -= bgSpeed * k.dt();
            if (t.pos.x < -60) t.pos.x += TILE_FULL_W;
          });

          // ③ Timer bar
          timerBar.width = 480 * Math.max(0, sig.timeLeft / 600);
          timerBar.color =
            sig.timeLeft < 30  ? k.Color.fromHex("#ff2222") :
            sig.timeLeft < 60  ? k.Color.fromHex("#ff8800") :
            sig.timeLeft < 120 ? k.Color.fromHex("#ffcc00") :
                                 k.Color.fromHex("#0066cc");

          // ④ Red tint pulse when critical
          redTint.opacity = sig.timeLeft < 30 && !sig.completed
            ? 0.07 * Math.abs(Math.sin(k.time() * 4)) : 0;

          // ⑤ Motobug timer
          if (!sig.completed && !victoryMode) {
            const motoInterval =
              sig.timeLeft < 30  ? 2.5 :
              sig.timeLeft < 60  ? 5.0 :
              sig.state === "empathetic" ? 6.0 : 999;
            motoTimer += k.dt();
            if (motoTimer > motoInterval) { spawnMotobug(); motoTimer = 0; }
          }
          if (motobugObj?.exists()) {
            motobugObj.pos.x -= 130 * k.dt();
            if (motobugObj.pos.x < -50) destroyMotobug(false);
          }

          // ⑥ Ring burst on collect (rings increased)
          if (sig.rings > sig.prevRings) {
            for (let i = 0; i < sig.rings - sig.prevRings; i++) {
              spawnRingBurst(95 + k.rand(-18, 18), GROUND_Y - 50 + k.rand(-15, 0));
            }
            sig.prevRings = sig.rings;
          }
          // ⑦ Hurt flash on ring loss (rings decreased)
          if (sig.rings < sig.prevRings) {
            spawnHurtFlash();
            hurtTimer = 1.0;
            hurtBlink = 0;
            sig.prevRings = sig.rings;
          }

          if (hurtTimer > 0) {
            hurtTimer -= k.dt();
            hurtBlink += k.dt();
            // Blink: show/hide Sonic rapidly
            sonic.opacity = Math.floor(hurtBlink * 8) % 2 === 0 ? 1 : 0.2;
          } else {
            sonic.opacity = 1;
          }

          // ⑧ Thinking bubble
          if (isThinking) {
            thinkBubble.opacity = 0.85 + Math.sin(k.time() * 5) * 0.15;
            thinkBubble.pos.y   = sonic.pos.y - 85 + Math.sin(k.time() * 3) * 5;
            thinkBubble.pos.x   = sonic.pos.x + 22;
          } else {
            thinkBubble.opacity = 0;
          }

          // ⑨ Victory mode
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
            if (sonic.isGrounded() && victoryTimer % 1.1 < k.dt() * 3) {
              sonic.jump(650);         // halved from original 1100
              sonic.play("jump");
              sonic.angle           = 0;
              sonic.angularVelocity = 0;
            }
            // Hard rotation lock in victory every frame
            sonic.angle           = 0;
            sonic.angularVelocity = 0;
            label.text  = "¡ZONA COMPLETADA!";
            label.color = k.Color.fromHex("#ffcc00");
            return;
          }

          // ⑩ Avatar state → Sonic behaviour
          if (hurtTimer <= 0) {
            switch (sig.state) {
              case "happy": case "encouraging":
                sonic.paused = false;
                if (!isJumping && sonic.isGrounded()) {
                  isJumping = true;
                  sonic.jump(680);  // halved from 1350
                  sonic.play("jump");
                  destroyMotobug();
                }
                break;
              case "thinking":
                // Freeze Sonic in place while he "thinks" — pause anim on frame 0
                // Only apply scale bob and pause when grounded; in-air = no squish
                if (sonic.isGrounded()) {
                  sonic.scale.x = 2 + Math.sin(k.time() * 4) * 0.05; // subtle bob
                  sonic.paused  = true;
                  sonic.frame   = 0;  // first frame = standing pose
                }
                break;
              case "speaking":
                // Sonic pauses (stands) when delivering the welcome/proactive message
                sonic.scale.x = 2;
                if (sonic.isGrounded()) {
                  sonic.paused = true;
                  sonic.frame  = 0;
                }
                break;
              case "empathetic":
                sonic.scale.x = 2;
                sonic.paused  = false;
                if (sonic.isGrounded() && sonic.curAnim() !== "run") sonic.play("run");
                break;
              default:
                // Reset scale.x to neutral when transitioning from thinking/other states
                sonic.scale.x = 2;
                sonic.paused  = false;
                if (motoActive) destroyMotobug();
                if (sonic.isGrounded() && sonic.curAnim() !== "run") sonic.play("run");
                break;
            }
          }

          // Speaking bob — ONLY apply when grounded so jumps stay clean (no mid-air squish)
          sonic.scale.y = (sig.speaking && sonic.isGrounded()) ? 2 + Math.sin(k.time() * 18) * 0.09 : 2;

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

  // ── Render — ring HUD is HTML overlay (reliable, no Kaplay z-fighting) ─
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Kaplay canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: "block", imageRendering: "pixelated" }}
      />

      {/* Ring counter overlay — top-right corner of the canvas area */}
      <div
        className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 rounded-lg"
        style={{
          background:  "rgba(0,4,20,0.75)",
          border:      "1px solid rgba(255,204,0,0.4)",
          backdropFilter: "blur(2px)",
          zIndex:      5,
        }}
      >
        {/* 16-frame ring sprite via CSS spritesheet */}
        <div
          style={{
            width:           18,
            height:          18,
            backgroundImage: "url(/sprites/ring.png)",
            backgroundSize:  "1600% 100%",
            imageRendering:  "pixelated",
            animation:       "ringSheetSpin 0.6s steps(16) infinite",
            flexShrink:      0,
          }}
        />
        <span
          style={{
            fontFamily:  "'Courier New', monospace",
            fontWeight:  700,
            fontSize:    "13px",
            color:       "#ffcc00",
            textShadow:  "0 0 6px rgba(255,204,0,0.6)",
            minWidth:    "20px",
            textAlign:   "right",
          }}
        >
          {ringsCollected}
        </span>
      </div>
    </div>
  );
}
