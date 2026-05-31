"use client";

import { useEffect, useRef } from "react";
import type { AvatarState } from "@/shared/types/session";
import { createKaplay, destroyKaplay } from "@/client/avatar/kaplayManager";
import { playSFX } from "@/client/audio/sfx";
import { playBGM, stopBGM, setBGMVolume } from "@/client/audio/bgm";

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
      background: [18, 4, 4],   // dark red base (Chemical Plant dramatic palette)
      global:     false,
      debug:      false,
    }).then((k) => {
      if (!k || !mounted) return;

      // ── Sprites ────────────────────────────────────────────
      // OpenSonic player.png: Sonic region = 5 cols × 15 rows = 75 frames
      // Frame map (row-major): row0=[0‥4], row1=[5‥9], … row14=[70‥74]
      k.loadSprite("sonic", "/sprites/sonic-opensonic.png", {
        sliceX: 5, sliceY: 15,
        anims: {
          stopped:   { from: 0,  to: 0,  loop: false, speed: 8  },
          waiting:   { from: 1,  to: 2,  loop: true,  speed: 6  },
          lookUp:    { from: 3,  to: 4,  loop: false, speed: 12 },
          crouchDown:{ from: 5,  to: 6,  loop: false, speed: 12 },
          braking:   { from: 7,  to: 9,  loop: false, speed: 8  },
          ringless:  { from: 10, to: 11, loop: false, speed: 8  },
          spring:    { from: 12, to: 12, loop: true,  speed: 8  },
          dead:      { from: 13, to: 13, loop: false, speed: 8  },
          drowned:   { from: 14, to: 14, loop: false, speed: 8  },
          jumping:   { from: 15, to: 19, loop: true,  speed: 16 },
          spinDash:  { from: 20, to: 24, loop: true,  speed: 16 },
          running:   { from: 26, to: 29, loop: true,  speed: 10 },
          walking:   { from: 30, to: 37, loop: true,  speed: 12 },
          breathing: { from: 38, to: 38, loop: false, speed: 8  },
          ledge:     { from: 39, to: 41, loop: true,  speed: 6  },
          pushing:   { from: 42, to: 45, loop: true,  speed: 8  },
          victory:   { from: 47, to: 49, loop: true,  speed: 8  },
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
      k.loadSprite("bg-sky", "/sprites/bg-sky.png");
      k.loadSprite("bg-far", "/sprites/bg-far.png");
      k.loadSprite("platforms", "/sprites/platforms.png", {
        sliceX: 8, sliceY: 1,
      });

      // ── Extra enemies (OpenSonic baddies) ───────────────────
      k.loadSprite("enemy-fly", "/sprites/enemy-fly.png", {
        sliceX: 4, sliceY: 1,
        anims: { fly: { from: 0, to: 3, loop: true, speed: 8 } },
      });
      k.loadSprite("enemy-buzzer", "/sprites/enemy-buzzer.png", {
        sliceX: 4, sliceY: 1,
        anims: { walk: { from: 0, to: 3, loop: true, speed: 6 } },
      });

      // ── Spring pads (OpenSonic, 2 frames: compressed + extended) ─
      k.loadSprite("spring-yellow", "/sprites/spring-yellow.png", {
        sliceX: 2, sliceY: 1,
        anims: { bounce: { from: 0, to: 1, loop: false, speed: 8 } },
      });

      // ── Explosion & animal sprites (OpenSonic) ─────────────
      k.loadSprite("explosion", "/sprites/explosion.png", {
        sliceX: 7, sliceY: 1,
        anims: { boom: { from: 0, to: 6, loop: false, speed: 14 } },
      });
      k.loadSprite("animal", "/sprites/animals.png", {
        sliceX: 7, sliceY: 1,
      });

      // ── Shield sprites (OpenSonic, 5 frames each, 46×42) ───
      k.loadSprite("shield-regular", "/sprites/shield-regular.png", {
        sliceX: 5, sliceY: 1,
        anims: { pulse: { from: 0, to: 4, loop: true, speed: 24 } },
      });
      k.loadSprite("shield-fire", "/sprites/shield-fire.png", {
        sliceX: 5, sliceY: 1,
        anims: { pulse: { from: 0, to: 4, loop: true, speed: 24 } },
      });
      k.loadSprite("shield-thunder", "/sprites/shield-thunder.png", {
        sliceX: 5, sliceY: 1,
        anims: { pulse: { from: 0, to: 4, loop: true, speed: 24 } },
      });
      k.loadSprite("shield-water", "/sprites/shield-water.png", {
        sliceX: 5, sliceY: 1,
        anims: { pulse: { from: 0, to: 4, loop: true, speed: 24 } },
      });

      k.scene("main", () => {
        k.setGravity(2200);
        const GROUND_Y = 215;
        const BG_W     = 960;
        const SKY_W    = 925;

        // ── 3-layer parallax background ───────────────────────
        // Layer 0 (farthest): sky/clouds — slowest scroll
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sky1: any = k.add([k.sprite("bg-sky"), k.pos(0, 0), k.scale(480 / 925, 260 / 150), k.z(-2)]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sky2: any = k.add([k.sprite("bg-sky"), k.pos(SKY_W * (480 / 925), 0), k.scale(480 / 925, 260 / 150), k.z(-2)]);

        // Layer 1 (mid): island/far scenery — medium scroll
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const far1: any = k.add([k.sprite("bg-far"), k.pos(0, 10), k.scale(480 / 888, 220 / 550), k.opacity(0.45), k.z(-1)]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const far2: any = k.add([k.sprite("bg-far"), k.pos(480, 10), k.scale(480 / 888, 220 / 550), k.opacity(0.45), k.z(-1)]);

        // Layer 2 (nearest): chemical plant — fastest scroll
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bg1: any = k.add([k.sprite("bg"), k.pos(0, 0),    k.scale(2), k.z(0)]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bg2: any = k.add([k.sprite("bg"), k.pos(BG_W, 0), k.scale(2), k.z(0)]);

        // Zone colour overlay — zone 1: red Chemical Plant, zone 2: Speed Highway sunset
        k.add([
          k.rect(480, 260), k.pos(0, 0),
          k.color(signals.current.zone === 2
            ? k.Color.fromHex("#ff6600")
            : k.Color.fromHex("#cc1100")),
          k.opacity(signals.current.zone === 2 ? 0.18 : 0.22), k.z(1), k.fixed(),
        ]);

        // Red tint overlay (critical timer)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const redTint: any = k.add([
          k.rect(480, 260), k.pos(0, 0),
          k.color(k.Color.fromHex("#ff0000")),
          k.opacity(0), k.z(15), k.fixed(),
        ]);

        // Ground — colour varies by zone (zone 1 gets red-tinted ground to match)
        const groundDark  = signals.current.zone === 2 ? "#3a1a1a" : "#2a0a0a";
        const groundEdge  = signals.current.zone === 2 ? "#cc5500" : "#cc2200";
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
          k.sprite("sonic", { anim: "walking" }),
          k.pos(90, GROUND_Y),
          k.scale(2),
          k.anchor("bot"),
          k.body(),
          k.area(),
          k.z(5),
          "sonic",
        ]);

        let isJumping     = false;
        let hurtTimer     = 0;
        let hurtBlink     = 0;
        let completedOnce = false;  // fires the stop sequence exactly once
        let prevAvatarState: AvatarState = signals.current.state;
        let spinDashCharging = false;

        function sonicAnimForState(state: AvatarState): string {
          switch (state) {
            case "happy":
            case "encouraging": return "running";
            case "thinking":    return "waiting";
            case "speaking":    return "stopped";
            case "listening":   return "lookUp";
            case "curious":     return "ledge";
            case "empathetic":  return "pushing";
            default:            return "walking";
          }
        }

        // ── Shield system — state-driven elemental shields ─────────────
        const SHIELD_MAP: Partial<Record<AvatarState, string>> = {
          listening:   "shield-regular",
          encouraging: "shield-fire",
          happy:       "shield-thunder",
          empathetic:  "shield-water",
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let activeShield: any = null;
        let activeShieldType: string | null = null;

        function updateShield(state: AvatarState) {
          const needed = SHIELD_MAP[state] ?? null;
          if (needed === activeShieldType) return;

          if (activeShield?.exists()) {
            k.destroy(activeShield);
            activeShield = null;
          }
          activeShieldType = needed;

          if (needed) {
            activeShield = k.add([
              k.sprite(needed, { anim: "pulse" }),
              k.pos(sonic.pos.x, sonic.pos.y - 22),
              k.scale(2.2),
              k.anchor("center"),
              k.opacity(0.75),
              k.z(6),
            ]);
            const sfxMap: Record<string, Parameters<typeof playSFX>[0]> = {
              "shield-regular": "shield", "shield-fire": "fireshield",
              "shield-thunder": "thundershield", "shield-water": "watershield",
            };
            if (sfxMap[needed]) playSFX(sfxMap[needed], 0.4);
          }
        }

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

        // Ring burst — compact upward flash on ring earn
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

        // "+1 RING" popup — prominent golden text + ring sprite that floats up
        function spawnRingEarnedPopup(x: number, y: number) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const txt: any = k.add([
            k.text("+1 RING", { size: 18, font: "monospace" }),
            k.pos(x - 18, y - 30),
            k.anchor("center"),
            k.color(k.Color.fromHex("#ffcc00")),
            k.z(12), k.opacity(1),
          ]);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const sprite: any = k.add([
            k.sprite("ring-sprite", { anim: "spin" }),
            k.pos(x + 32, y - 30),
            k.scale(2.2),
            k.anchor("center"),
            k.z(12), k.opacity(1),
          ]);
          let t = 0;
          const ctrl = k.onUpdate(() => {
            t += k.dt();
            txt.pos.y    -= 50 * k.dt();
            sprite.pos.y -= 50 * k.dt();
            sprite.pos.x  = x + 32 + Math.sin(t * 12) * 3;
            const alpha   = Math.max(0, 1 - t * 1.1);
            txt.opacity = sprite.opacity = alpha;
            if (t > 0.95) {
              if (txt.exists())    k.destroy(txt);
              if (sprite.exists()) k.destroy(sprite);
              ctrl.cancel();
            }
          });
        }

        // Ring scatter (opensonic-style) — rings fly outward, bounce with gravity, flash before vanish
        function spawnRingScatter(x: number, y: number) {
          const COUNT = 8;
          for (let i = 0; i < COUNT; i++) {
            const angle  = (i / COUNT) * Math.PI * 2 + k.rand(-0.4, 0.4);
            const speed  = k.rand(70, 140);
            let vx       = Math.cos(angle) * speed;
            let vy       = Math.sin(angle) * speed - 110;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const r: any = k.add([
              k.sprite("ring-sprite", { anim: "spin" }),
              k.pos(x, y),
              k.scale(1.8),
              k.anchor("center"),
              k.z(8), k.opacity(1),
            ]);
            let t = 0;
            const ctrl = k.onUpdate(() => {
              if (!r.exists()) { ctrl.cancel(); return; }
              t   += k.dt();
              vy  += 380 * k.dt();
              r.pos.x += vx * k.dt();
              r.pos.y += vy * k.dt();
              if (r.pos.y > GROUND_Y) { r.pos.y = GROUND_Y; vy *= -0.4; vx *= 0.7; }
              // flash near the end (opensonic-js pattern)
              r.opacity = t > 1.1
                ? (Math.floor(t * 8) % 2 === 0 ? 0.85 : 0.1)
                : 1;
              if (t > 1.8) { if (r.exists()) k.destroy(r); ctrl.cancel(); }
            });
          }
        }

        // "-1" red text popup
        function spawnRingLostPopup(x: number, y: number) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const txt: any = k.add([
            k.text("-1 RING", { size: 18, font: "monospace" }),
            k.pos(x, y - 40),
            k.anchor("center"),
            k.color(k.Color.fromHex("#ff4444")),
            k.z(12), k.opacity(1),
          ]);
          let t = 0;
          const ctrl = k.onUpdate(() => {
            t += k.dt();
            txt.pos.y  -= 30 * k.dt();
            txt.opacity = Math.max(0, 1 - t * 1.6);
            if (t > 0.65) { if (txt.exists()) k.destroy(txt); ctrl.cancel(); }
          });
        }

        // Hurt flash (red overlay blink) + camera shake
        function spawnHurtFlash() {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const flash: any = k.add([k.rect(480, 260), k.pos(0, 0), k.color(k.Color.fromHex("#ff0000")), k.opacity(0.35), k.z(14), k.fixed()]);
          let ft = 0;
          const ctrl = k.onUpdate(() => {
            if (!flash.exists()) { ctrl.cancel(); return; }
            ft += k.dt(); flash.opacity = Math.max(0, 0.35 - ft * 1.5);
            if (ft > 0.25) { k.destroy(flash); ctrl.cancel(); }
          });
          // Camera shake — use k.setCamPos (k.camPos is deprecated in Kaplay 3001.x)
          let shakeT = 0;
          const shakeCtrl = k.onUpdate(() => {
            shakeT += k.dt();
            if (shakeT > 0.22) { k.setCamPos(240, 130); shakeCtrl.cancel(); return; }
            const amp = 5 * (1 - shakeT / 0.22);
            k.setCamPos(240 + (Math.random() - 0.5) * amp * 2, 130 + (Math.random() - 0.5) * amp * 2);
          });
        }

        // Speed lines — thin rect objects at high speed (happy/encouraging states)
        // Use k.rect (not custom draw() which can crash the render loop)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const speedLines: any[] = [];
        for (let i = 0; i < 5; i++) {
          const y = 35 + i * 44;
          const lineW = 80 + (i % 3) * 30;  // vary lengths: 80, 110, 140
          speedLines.push(k.add([
            k.rect(lineW, 2),
            k.pos(480 - lineW, y),
            k.color(k.Color.fromHex("#ffffff")),
            k.opacity(0),
            k.z(6),
            k.fixed(),
            k.anchor("topleft"),
          ]));
        }

        // Motobug
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let motobugObj: any = null;
        let motoActive = false;
        let motoTimer  = 0;

        function spawnMotobug() {
          if (motoActive) return;
          motoActive = true;
          const tl = signals.current.timeLeft;
          if (tl < 30) {
            // Critical: flying enemy swoops from above
            motobugObj = k.add([k.sprite("enemy-fly", { anim: "fly" }), k.pos(510, GROUND_Y - 70), k.scale(2), k.anchor("bot"), k.z(4), "motobug"]);
          } else if (tl < 60) {
            // Urgent: buzzer enemy
            motobugObj = k.add([k.sprite("enemy-buzzer", { anim: "walk" }), k.pos(510, GROUND_Y), k.scale(2), k.anchor("bot"), k.z(4), "motobug"]);
          } else {
            // Normal: classic motobug
            motobugObj = k.add([k.sprite("motobug", { anim: "run" }), k.pos(510, GROUND_Y), k.scale(2), k.anchor("bot"), k.z(4), "motobug"]);
          }
        }
        function destroyMotobug(explode = true) {
          if (!motobugObj?.exists()) { motoActive = false; return; }
          const motoPos = motobugObj.pos.clone();
          if (explode) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const ex: any = k.add([k.sprite("explosion", { anim: "boom" }), k.pos(motoPos), k.scale(2), k.anchor("center"), k.z(9)]);
            ex.onAnimEnd(() => { if (ex.exists()) k.destroy(ex); });
            spawnRescuedAnimal(motoPos.x, motoPos.y);
          }
          k.destroy(motobugObj); motobugObj = null; motoActive = false; motoTimer = 0;
        }

        function spawnRescuedAnimal(x: number, y: number) {
          const animalFrame = Math.floor(Math.random() * 7);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const critter: any = k.add([
            k.sprite("animal", { frame: animalFrame }),
            k.pos(x, y), k.scale(2), k.anchor("center"), k.z(8), k.opacity(1),
          ]);
          let vy = -180;
          let vx = (Math.random() - 0.5) * 80;
          let t = 0;
          const ctrl = k.onUpdate(() => {
            if (!critter.exists()) { ctrl.cancel(); return; }
            t += k.dt();
            vy += 500 * k.dt();
            critter.pos.x += vx * k.dt();
            critter.pos.y += vy * k.dt();
            if (critter.pos.y > GROUND_Y) { critter.pos.y = GROUND_Y; vy *= -0.35; vx *= 0.6; }
            if (t > 2.0) { critter.opacity = Math.max(0, critter.opacity - k.dt() * 3); }
            if (t > 2.5) { k.destroy(critter); ctrl.cancel(); }
          });
        }

        // ── Spring pads — scroll in during positive states ─────
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let springObj: any = null;
        let springTimer = 0;

        function spawnSpring() {
          if (springObj?.exists()) return;
          springObj = k.add([
            k.sprite("spring-yellow", { frame: 0 }),
            k.pos(510, GROUND_Y), k.scale(2), k.anchor("bot"),
            k.area(), k.z(3), "spring-pad",
          ]);
        }

        sonic.onCollide("spring-pad", () => {
          if (springObj?.exists()) {
            springObj.play("bounce");
            sonic.jump(900);
            sonic.play("spring");
            playSFX("spring", 0.5);
          }
        });

        // ── Checkpoint posts — spawn every 5 rings earned ──────────
        let lastCheckpointRing = 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let checkpointObj: any = null;

        function spawnCheckpoint() {
          if (checkpointObj?.exists()) return;
          const poleH = 55;
          const poleW = 6;
          const orbR  = 9;
          // Container group: pole + orb
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pole: any = k.add([
            k.rect(poleW, poleH),
            k.pos(510, GROUND_Y),
            k.anchor("bot"),
            k.color(k.Color.fromHex("#888888")),
            k.z(3),
            "checkpoint-pole",
          ]);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const orb: any = k.add([
            k.circle(orbR),
            k.pos(510 + poleW / 2, GROUND_Y - poleH - orbR),
            k.anchor("center"),
            k.color(k.Color.fromHex("#ff4444")),
            k.z(4),
            k.area({ shape: new k.Rect(k.vec2(-orbR, -orbR), orbR * 2, orbR * 2) }),
            "checkpoint-orb",
          ]);
          checkpointObj = { pole, orb, activated: false };
        }

        sonic.onCollide("checkpoint-orb", () => {
          if (checkpointObj && !checkpointObj.activated) {
            checkpointObj.activated = true;
            checkpointObj.orb.color = k.Color.fromHex("#00ff66");
            playSFX("checkpoint", 0.5);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const burst: any = k.add([
              k.text("★ CHECKPOINT ★", { size: 14, font: "monospace" }),
              k.pos(checkpointObj.orb.pos.x, checkpointObj.orb.pos.y - 15),
              k.anchor("center"),
              k.color(k.Color.fromHex("#00ff66")),
              k.z(12), k.opacity(1),
            ]);
            let bt = 0;
            const bctrl = k.onUpdate(() => {
              bt += k.dt(); burst.pos.y -= 40 * k.dt(); burst.opacity = Math.max(0, 1 - bt * 1.3);
              if (bt > 0.8) { if (burst.exists()) k.destroy(burst); bctrl.cancel(); }
            });
          }
        });

        // Victory stars
        function spawnVictoryStar(x: number, y: number) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const star: any = k.add([k.text("★", { size: 22, font: "monospace" }), k.pos(x, y), k.anchor("center"), k.color(k.Color.fromHex("#ffcc00")), k.z(9), k.opacity(1)]);
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
          if (hurtTimer <= 0 && !s.completed && s.state !== "thinking" && s.state !== "speaking") {
            sonic.paused = false;
            const anim = sonicAnimForState(s.state);
            if (sonic.curAnim() !== anim) sonic.play(anim);
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

          // ── State change: golden flash for positive, blue for empathetic ──
          if (sig.state !== prevAvatarState) {
            if (sig.state === "happy" || sig.state === "encouraging") {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const glow: any = k.add([k.rect(480, 260), k.pos(0, 0), k.color(k.Color.fromHex("#ffcc00")), k.opacity(0.18), k.z(14), k.fixed()]);
              let gt = 0;
              const gctrl = k.onUpdate(() => { gt += k.dt(); glow.opacity = Math.max(0, 0.18 - gt * 1.8); if (gt > 0.12) { if (glow.exists()) k.destroy(glow); gctrl.cancel(); } });
            } else if (sig.state === "empathetic") {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const blueGlow: any = k.add([k.rect(480, 260), k.pos(0, 0), k.color(k.Color.fromHex("#4488ff")), k.opacity(0.12), k.z(14), k.fixed()]);
              let bt = 0;
              const bctrl = k.onUpdate(() => { bt += k.dt(); blueGlow.opacity = Math.max(0, 0.12 - bt * 1.2); if (bt > 0.12) { if (blueGlow.exists()) k.destroy(blueGlow); bctrl.cancel(); } });
            }
            prevAvatarState = sig.state;
            updateShield(sig.state);
            if (sig.state === "thinking") playSFX("brake", 0.3);
          }

          // Shield follows Sonic
          if (activeShield?.exists()) {
            activeShield.pos.x = sonic.pos.x;
            activeShield.pos.y = sonic.pos.y - 22;
          }

          // ① Rotation lock — must run every frame
          sonic.angle           = 0;
          sonic.angularVelocity = 0;

          // ── STOP: celebrate dance when task completed ─────────────────────
          if (sig.completed) {
            if (!completedOnce) {
              completedOnce = true;
              destroyMotobug(false);
              playSFX("checkpoint", 0.6);
              for (let i = 0; i < 6; i++) {
                setTimeout(() => {
                  if (!mounted) return;
                  spawnVictoryStar(sonic.pos.x + k.rand(-40, 80), sonic.pos.y - k.rand(20, 80));
                }, i * 120);
              }
              // Orbiting invincibility stars (OpenSonic-style)
              const STAR_COUNT = 5;
              for (let s = 0; s < STAR_COUNT; s++) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const orb: any = k.add([
                  k.text("★", { size: 16, font: "monospace" }),
                  k.pos(sonic.pos.x, sonic.pos.y - 40),
                  k.anchor("center"),
                  k.color(k.Color.fromHex("#ffdd00")),
                  k.z(11), k.opacity(0.9),
                ]);
                const angleOff = (s / STAR_COUNT) * Math.PI * 2;
                const ctrl = k.onUpdate(() => {
                  if (!orb.exists()) { ctrl.cancel(); return; }
                  const t = k.time() * 4;
                  orb.pos.x = sonic.pos.x + Math.cos(t + angleOff) * 50;
                  orb.pos.y = (sonic.pos.y - 40) + Math.sin(t + angleOff) * 18;
                });
              }
            }
            sonic.paused = false;
            if (sonic.curAnim() !== "victory") sonic.play("victory");
            sonic.angle           = 0;
            sonic.angularVelocity = 0;
            if (activeShield?.exists()) { k.destroy(activeShield); activeShield = null; activeShieldType = null; }
            timerBar.width = 480 * Math.max(0, sig.timeLeft / 600);
            label.text  = "¡ZONA COMPLETADA!";
            label.color = k.Color.fromHex("#ffcc00");
            redTint.opacity = 0;
            thinkBubble.opacity = 0;
            speedLines.forEach((sl) => { sl.opacity = 0; });
            return;
          }

          // ② Background + platform speed (more rings = faster, boosted on happy/encouraging)
          const isThinking  = sig.state === "thinking";
          const isSpeaking  = sig.state === "speaking";
          const pauseWalk   = isThinking || isSpeaking;  // slow/stop when Sonic talks or thinks
          const boost       = (sig.state === "encouraging" || sig.state === "happy") ? 2 : 1;
          const bgSpeed     = pauseWalk
            ? 30  // slow crawl when thinking / speaking welcome
            : Math.min(220, 80 + Math.floor(sig.rings / 5) * 10) * boost;
          // Parallax: sky (0.15x), far (0.35x), main (1x)
          const skyScroll = bgSpeed * 0.15;
          const farScroll = bgSpeed * 0.35;
          [sky1, sky2].forEach((s) => {
            s.pos.x -= skyScroll * k.dt();
            if (s.pos.x <= -480) s.pos.x = 480;
          });
          [far1, far2].forEach((f) => {
            f.pos.x -= farScroll * k.dt();
            if (f.pos.x <= -480) f.pos.x = 480;
          });
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
          if (!sig.completed) {
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

          // ⑥ Ring earned: burst + golden popup
          if (sig.rings > sig.prevRings) {
            const sonicX = sonic.pos.x;
            const sonicY = sonic.pos.y;
            spawnRingBurst(sonicX + k.rand(-14, 14), sonicY - 50 + k.rand(-10, 0));
            spawnRingEarnedPopup(sonicX, sonicY - 55);
            sig.prevRings = sig.rings;
          }
          // ⑦ Ring lost: scatter + red popup + hurt flash + slow-mo
          if (sig.rings < sig.prevRings) {
            const sonicX = sonic.pos.x;
            const sonicY = sonic.pos.y;
            spawnHurtFlash();
            spawnRingScatter(sonicX, sonicY - 20);
            spawnRingLostPopup(sonicX, sonicY);
            hurtTimer = 1.0;
            hurtBlink = 0;
            sig.prevRings = sig.rings;
            k.timeScale = 0.3;
            setTimeout(() => { if (mounted) k.timeScale = 1.0; }, 400);
          }

          // ⑦b Speed lines — visible only at high speed (happy / encouraging)
          const highSpeed = (sig.state === "happy" || sig.state === "encouraging") && bgSpeed > 140;
          speedLines.forEach((sl, i) => {
            sl.opacity = highSpeed ? 0.22 + Math.sin(k.time() * 8 + i) * 0.1 : Math.max(0, sl.opacity - k.dt() * 3);
          });

          // ⑦c Checkpoint posts — spawn every 5 rings
          if (sig.rings >= lastCheckpointRing + 5 && !sig.completed) {
            lastCheckpointRing = Math.floor(sig.rings / 5) * 5;
            spawnCheckpoint();
          }
          if (checkpointObj?.pole?.exists()) {
            checkpointObj.pole.pos.x -= bgSpeed * k.dt();
            checkpointObj.orb.pos.x  -= bgSpeed * k.dt();
            // Orb glow pulse (red if not activated, green if activated)
            if (!checkpointObj.activated) {
              checkpointObj.orb.color = k.Color.fromHex(
                Math.floor(k.time() * 3) % 2 === 0 ? "#ff4444" : "#ff8866"
              );
            }
            if (checkpointObj.pole.pos.x < -30) {
              if (checkpointObj.pole.exists()) k.destroy(checkpointObj.pole);
              if (checkpointObj.orb.exists())  k.destroy(checkpointObj.orb);
              checkpointObj = null;
            }
          }

          // ⑦d Springs — spawn during positive states, scroll left
          const positiveState = sig.state === "happy" || sig.state === "encouraging";
          if (positiveState && !sig.completed) {
            springTimer += k.dt();
            if (springTimer > 4) { spawnSpring(); springTimer = 0; }
          }
          if (springObj?.exists()) {
            springObj.pos.x -= bgSpeed * k.dt();
            if (springObj.pos.x < -40) { k.destroy(springObj); springObj = null; }
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

          // ⑩ Avatar state → Sonic behaviour (OpenSonic animations)
          if (hurtTimer <= 0) {
            switch (sig.state) {
              case "happy": case "encouraging":
                sonic.paused = false;
                if (!isJumping && sonic.isGrounded()) {
                  if (!spinDashCharging) {
                    spinDashCharging = true;
                    sonic.play("spinDash");
                    playSFX("spindash", 0.5);
                    setTimeout(() => {
                      if (!mounted) return;
                      spinDashCharging = false;
                      isJumping = true;
                      sonic.jump(680);
                      sonic.play("jumping");
                      destroyMotobug();
                    }, 350);
                  }
                } else if (isJumping) {
                  if (sonic.curAnim() !== "jumping") sonic.play("jumping");
                } else {
                  if (sonic.curAnim() !== "running") sonic.play("running");
                }
                break;
              case "thinking":
                if (sonic.isGrounded()) {
                  sonic.scale.x = 2 + Math.sin(k.time() * 4) * 0.05;
                  sonic.paused  = false;
                  if (sonic.curAnim() !== "waiting") sonic.play("waiting");
                }
                break;
              case "speaking":
                sonic.scale.x = 2;
                if (sonic.isGrounded()) {
                  sonic.paused = false;
                  if (sonic.curAnim() !== "stopped") sonic.play("stopped");
                }
                break;
              case "listening":
                sonic.scale.x = 2;
                sonic.paused  = false;
                if (sonic.isGrounded() && sonic.curAnim() !== "lookUp") sonic.play("lookUp");
                break;
              case "curious":
                sonic.scale.x = 2;
                sonic.paused  = false;
                if (sonic.isGrounded() && sonic.curAnim() !== "ledge") sonic.play("ledge");
                break;
              case "empathetic":
                sonic.scale.x = 2;
                sonic.paused  = false;
                if (sonic.isGrounded() && sonic.curAnim() !== "pushing") sonic.play("pushing");
                break;
              default:
                sonic.scale.x = 2;
                sonic.paused  = false;
                spinDashCharging = false;
                if (motoActive) destroyMotobug();
                if (sonic.isGrounded() && sonic.curAnim() !== "walking") sonic.play("walking");
                break;
            }
          }

          // ⑪ Dynamic BGM volume — quieter during thinking/speaking
          const bgmVol = isThinking || isSpeaking ? 0.04
            : (sig.state === "happy" || sig.state === "encouraging") ? 0.18
            : 0.12;
          setBGMVolume(bgmVol);

          // Speaking bob — ONLY apply when grounded so jumps stay clean (no mid-air squish)
          sonic.scale.y = (sig.speaking && sonic.isGrounded()) ? 2 + Math.sin(k.time() * 18) * 0.09 : 2;

          // State label
          label.text  = sig.timeLeft < 30 && !sig.completed ? "⚠ TIEMPO CRÍTICO" : stateLabels[sig.state] ?? "Listo";
          label.color = sig.timeLeft < 30 && !sig.completed ? k.Color.fromHex("#ff4444") : k.Color.fromHex("#ffcc00");
        });
      });

      k.go("main");

      const bgmZone = zone === 2 ? "speed-highway" : "chemical-plant";
      playBGM(bgmZone, 0.12);
    });

    return () => {
      mounted = false;
      stopBGM();
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
          zIndex:      25,
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
