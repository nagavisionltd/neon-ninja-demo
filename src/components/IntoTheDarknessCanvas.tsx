import { useEffect, useRef, useState } from 'react';
import { Gamepad2 } from 'lucide-react';
import { synthAudioEngine } from './AudioEngine';
import { LEVELS, LevelData, Platform, PhaseCatalyst, Shard, EnemyTemplate, LockedZone, RoomZone, Destructible } from '../data/levels';

interface GameCanvasProps {
  levelId: number;
  onLevelComplete: (stats: { timeTaken: string; shardsCollected: number; finalHp: number }) => void;
  onPlayerDeath: () => void;
  onPauseToggle: () => void;
  isPaused: boolean;
}

export default function IntoTheDarknessCanvas({
  levelId,
  onLevelComplete,
  onPlayerDeath,
  onPauseToggle,
  isPaused
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Load level metadata
  const currentLevelData = LEVELS.find((l) => l.id === levelId) || LEVELS[0];

  // Game active state tracking refs to avoid React state re-render lag during heavy simulation loops
  const stateRef = useRef({
    gameStarted: true,
    levelComplete: false,
    dialogue: { active: true, text: currentLevelData.startText, timer: 280, alpha: 0 },
    portal: { x: currentLevelData.portalX, y: currentLevelData.portalY, w: 80, h: 140, active: false, pulse: 0 },
    
    // Level specific clones
    platforms: JSON.parse(JSON.stringify(currentLevelData.platforms)) as Platform[],
    phaseCatalysts: JSON.parse(JSON.stringify(currentLevelData.phaseCatalysts)) as PhaseCatalyst[],
    shards: JSON.parse(JSON.stringify(currentLevelData.shards)) as Shard[],
    enemies: JSON.parse(JSON.stringify(currentLevelData.enemies)) as EnemyTemplate[],
    lockedZones: JSON.parse(JSON.stringify(currentLevelData.lockedZones)) as LockedZone[],
    roomZones: currentLevelData.roomZones as RoomZone[],
    destructibles: JSON.parse(JSON.stringify(currentLevelData.destructibles || [])) as Destructible[],

    player: {
      x: currentLevelData.startX,
      y: currentLevelData.startY,
      width: 32,
      height: 32,
      vx: 0,
      vy: 0,
      grounded: false,
      jumpsUsed: 0,
      jumpHeld: false,
      dashTimer: 0,
      dashCooldown: 0,
      canDash: true,
      attackTimer: 0,
      attackCooldown: 0,
      attackHitIds: new Set<string>(),
      attackKind: 'strike',
      comboStep: 0,
      comboWindow: 0,
      blastCooldown: 0,
      blastCharge: 0,
      chargingBlast: false,
      somersaultTimer: 0,
      somersaultSpin: 0,
      guard: false,
      crouching: false,
      touchingWall: 0,
      wallSliding: false,
      flightEnergy: 150, // FLIGHT_MAX
      flying: false,
      shadowStepTimer: 0,
      shadowStepCharges: 2,
      shadowStepRecharge: 0,
      shardMode: 'truth' as 'truth' | 'false',
      truthShards: 0,
      falseShards: 0,
      hp: 100,
      facingRight: true,
      ridingPlatform: null as Platform | null,
      history: [] as { x: number; y: number }[]
    },

    camera: { x: 0, y: 0, targetX: 0, targetY: 0, smoothing: 0.1 },
    projectiles: [] as any[],
    ghostTrails: [] as any[],
    particles: [] as any[],
    wasGrounded: false,
    hitstopTimer: 0,
    frameCount: 0,
    screenShake: { x: 0, y: 0 },
    screenFlashTimer: 0,
    elapsedSeconds: 0,
    startTime: Date.now()
  });

  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const justPressed = useRef<{ [key: string]: boolean }>({});
  const justReleased = useRef<{ [key: string]: boolean }>({});
  const prevGamepadState = useRef<{ [action: string]: boolean }>({});
  const [gamepadConnected, setGamepadConnected] = useState(false);

  const GRAVITY = 0.65;
  const JUMP_FORCE = -15;
  const ACCELERATION = 0.22;
  const RUN_MAX_SPEED = 10;
  const FRICTION = 0.85;
  const MAX_JUMPS = 2;
  const DASH_SPEED = 12;
  const DASH_FRAMES = 12;
  const DASH_COOLDOWN = 22;
  const ATTACK_FRAMES = 12;
  const ATTACK_COOLDOWN = 16;
  const COMBO_WINDOW = 28;
  const SOMERSAULT_FRAMES = 28;
  const BLAST_SPEED = 13;
  const BLAST_COOLDOWN = 24;
  const BLAST_CHARGE_1 = 20;
  const BLAST_CHARGE_2 = 50;
  const BLAST_CHARGE_3 = 90;
  const WALL_SLIDE_SPEED = 2.2;
  const WALL_JUMP_X = 9;
  const WALL_JUMP_Y = -12;
  const FLIGHT_MAX = 150;
  const FLIGHT_RECHARGE = 1.2;
  const FLIGHT_DRAIN = 1.8;
  const FLIGHT_SPEED = 5.2;
  const SHADOW_STEP_SPEED = 18;
  const SHADOW_STEP_FRAMES = 8;
  const SHADOW_STEP_COOLDOWN = 42;

  // React HUD hooks
  const [hudHp, setHudHp] = useState(100);
  const [hudPhase, setHudPhase] = useState<'truth' | 'false'>('truth');
  const [hudShards, setHudShards] = useState({ truth: 0, false: 0 });
  const [hudSteps, setHudSteps] = useState(2);
  const [hudTime, setHudTime] = useState('00:00');

  useEffect(() => {
    // Canvas Resize Observer
    if (!canvasRef.current || !containerRef.current) return;
    const canvas = canvasRef.current;
    
    const handleResize = () => {
      canvas.width = containerRef.current?.clientWidth || window.innerWidth;
      canvas.height = Math.max(500, containerRef.current?.clientHeight || 600);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    // Setup input system
    const controls = {
      left: ['KeyA', 'ArrowLeft'],
      right: ['KeyD', 'ArrowRight'],
      up: ['KeyW', 'ArrowUp'], // Space removed to prevent double-firing jump with dash
      down: ['ArrowDown', 'KeyS'],
      dash: ['Space'], // Space is strictly dash/dodge
      combo: ['KeyC'],
      strike: ['KeyF'],
      blast: ['KeyV'],
      guard: ['KeyX'],
      toggle: ['KeyQ'],
      flight: ['ShiftLeft', 'ShiftRight'],
      shadowStep: ['KeyZ']
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cheat level skip keys: Alt + N skip to next level
      if (e.code === 'KeyN' && e.altKey) {
        e.preventDefault();
        const p = stateRef.current.player;
        synthAudioEngine.playLevelClear();
        onLevelComplete({
          timeTaken: '00:00 (SKIPPED)',
          shardsCollected: p.truthShards + p.falseShards,
          finalHp: p.hp
        });
        return;
      }

      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      if (!keysPressed.current[e.code]) {
        justPressed.current[e.code] = true;
      }
      keysPressed.current[e.code] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;
      justReleased.current[e.code] = true;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Gamepad controller support state retriever
    const getGamepadActionState = (action: keyof typeof controls): boolean => {
      if (!navigator.getGamepads) return false;
      const gamepads = navigator.getGamepads();
      let anyConnected = false;
      let actionActive = false;

      for (let i = 0; i < gamepads.length; i++) {
        const gp = gamepads[i];
        if (!gp) continue;
        anyConnected = true;

        if (action === 'left') {
          const axisLeft = gp.axes[0] !== undefined && gp.axes[0] < -0.3;
          const dpadLeft = gp.buttons[14]?.pressed;
          if (axisLeft || dpadLeft) actionActive = true;
        }
        else if (action === 'right') {
          const axisRight = gp.axes[0] !== undefined && gp.axes[0] > 0.3;
          const dpadRight = gp.buttons[15]?.pressed;
          if (axisRight || dpadRight) actionActive = true;
        }
        else if (action === 'up') {
          const btnJump = gp.buttons[1]?.pressed; // Button 1 (B/Circle) is now jump!
          if (btnJump) actionActive = true;
        }
        else if (action === 'down') {
          const axisDown = gp.axes[1] !== undefined && gp.axes[1] > 0.4;
          const dpadDown = gp.buttons[13]?.pressed;
          if (axisDown || dpadDown) actionActive = true;
        }
        else if (action === 'dash') {
          // Button 4 (L1) is now dodge!
          const btnDash = gp.buttons[4]?.pressed;
          if (btnDash) actionActive = true;
        }
        else if (action === 'combo') {
          // Button 0 (A/Cross) is now attack!
          if (gp.buttons[0]?.pressed) actionActive = true;
        }
        else if (action === 'strike') {
          // Button 3 (Y/Triangle)
          if (gp.buttons[3]?.pressed) actionActive = true;
        }
        else if (action === 'blast') {
          // Button 7 (R2) is now blast!
          if (gp.buttons[7]?.pressed) actionActive = true;
        }
        else if (action === 'guard') {
          // Button 6 (L2) is now guard!
          if (gp.buttons[6]?.pressed) actionActive = true;
        }
        else if (action === 'toggle') {
          // Button 2 (X/Square) is now mode swap (toggle)!
          if (gp.buttons[2]?.pressed) actionActive = true;
        }
        else if (action === 'flight') {
          // Button 10 (L3 Click) or Button 8 (Select)
          if (gp.buttons[10]?.pressed || gp.buttons[8]?.pressed) actionActive = true;
        }
        else if (action === 'shadowStep') {
          // Button 5 (RB/R1)
          if (gp.buttons[5]?.pressed) actionActive = true;
        }
      }

      if (anyConnected !== gamepadConnected) {
        setGamepadConnected(anyConnected);
      }

      return actionActive;
    };

    // Helpers to query inputs (Keyboard + Gamepad merge)
    const actionHeld = (action: keyof typeof controls) => {
      const kbHeld = controls[action].some((code) => keysPressed.current[code]);
      const gpHeld = getGamepadActionState(action);
      return kbHeld || gpHeld;
    };

    const actionPressed = (action: keyof typeof controls) => {
      const kbPressed = controls[action].some((code) => justPressed.current[code]);
      const gpHeldNow = getGamepadActionState(action);
      const gpWasHeld = !!prevGamepadState.current[action];
      const gpPressed = gpHeldNow && !gpWasHeld;
      return kbPressed || gpPressed;
    };

    const actionReleased = (action: keyof typeof controls) => {
      const kbReleased = controls[action].some((code) => justReleased.current[code]);
      const gpHeldNow = getGamepadActionState(action);
      const gpWasHeld = !!prevGamepadState.current[action];
      const gpReleased = !gpHeldNow && gpWasHeld;
      return kbReleased || gpReleased;
    };

    // Particle factory
    const spawnParticles = (x: number, y: number, type: string, count: number, options: any = {}) => {
      const { particles } = stateRef.current;
      for (let i = 0; i < count; i++) {
        const vx = (Math.random() - 0.5) * (options.spreadX || 4) + (options.vx || 0);
        const vy = (Math.random() - 0.5) * (options.spreadY || 4) + (options.vy || 0);
        particles.push({
          x: x,
          y: y,
          vx: vx,
          vy: vy,
          life: options.life || (20 + Math.random() * 20),
          maxLife: options.life || 40,
          size: options.size || (2 + Math.random() * 3),
          color: options.color || '#ffffff',
          type: type,
          gravity: options.gravity !== undefined ? options.gravity : 0.2
        });
      }
    };

    const rectsOverlap = (a: any, b: any) => {
      return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    };

    const getAttackHitbox = (player: any) => {
      let attackW = player.shardMode === 'false' ? 110 : 90;
      let attackH = player.shardMode === 'false' ? 80 : 70;
      if (player.attackKind === 'dash') {
        attackW = 100;
        attackH = 50;
      } else if (player.attackKind === 'combo') {
        attackW = 60 + player.comboStep * 10;
        attackH = 50 + Math.min(player.comboStep, 3) * 4;
      }
      return {
        x: player.facingRight ? player.x + player.width - 10 : player.x - attackW + 10,
        y: player.y - 15,
        w: attackW,
        h: attackH
      };
    };

    const revealTruthPlatforms = () => {
      stateRef.current.platforms.forEach((plat) => {
        if (plat.type === 'truthPlatform') plat.revealed = true;
      });
    };

    const platformIsActive = (plat: Platform, player: any) => {
      if (plat.hidden && !plat.revealed) return false;
      if (plat.type === 'truthPlatform' && player.shardMode !== 'truth') return false;
      if (plat.type === 'falsePlatform' && player.shardMode !== 'false') return false;
      if (plat.type === 'barrier') {
        const zone = stateRef.current.lockedZones.find((z) => z.id === plat.zoneId);
        return zone && zone.active;
      }
      return true;
    };

    const resolveCollisions = (entity: any, platforms: Platform[]) => {
      entity.grounded = false;
      for (const plat of platforms) {
        if (!platformIsActive(plat, entity)) continue;
        
        // Handle custom laser_fence damage if not matching state phase!
        if (plat.type === 'laser_fence') {
          if (rectsOverlap(entity, plat)) {
            // Check state match
            if (plat.color !== entity.shardMode) {
              // Zap player!
              if (entity.dashTimer === 0 && entity.shadowStepTimer === 0) {
                entity.hp = Math.max(0, entity.hp - 1); // continuous drain, rapid
                entity.vy = -4;
                entity.vx = entity.facingRight ? -4 : 4;
                if (stateRef.current.frameCount % 20 === 0) {
                  synthAudioEngine.playHurt();
                  spawnParticles(entity.x + entity.width/2, entity.y + entity.height/2, 'spark', 15, {
                    color: plat.color === 'truth' ? '#00e5ff' : '#ff3b5f',
                    spreadX: 10, spreadY: 10
                  });
                }
              }
            }
          }
          continue; // Laser fence is non-solid if player matches color phase!
        }

        if (
          entity.x < plat.x + plat.w &&
          entity.x + entity.width > plat.x &&
          entity.y < plat.y + plat.h &&
          entity.y + entity.height > plat.y
        ) {
          if (entity.vy > 0 && entity.y + entity.height - entity.vy <= plat.y + 5) {
            entity.y = plat.y - entity.height;
            entity.vy = 0;
            entity.grounded = true;
          } else if (entity.vy < 0 && entity.y - entity.vy >= plat.y + plat.h - 5) {
            entity.y = plat.y + plat.h;
            entity.vy = 0;
          } else if (entity.vx > 0) {
            entity.x = plat.x - entity.width;
          } else if (entity.vx < 0) {
            entity.x = plat.x + plat.w;
          }
        }
      }
    };

    const resolveEnemyCollisions = (enemy: any, platforms: Platform[]) => {
      enemy.grounded = false;
      const isFlying = enemy.type === 'drone';
      const playerMode = stateRef.current.player.shardMode;

      for (const plat of platforms) {
        if (plat.hidden && !plat.revealed) continue;
        if (plat.type === 'truthPlatform' && playerMode !== 'truth') continue;
        if (plat.type === 'falsePlatform' && playerMode !== 'false') continue;
        if (plat.type === 'barrier') {
          const zone = stateRef.current.lockedZones.find((z) => z.id === plat.zoneId);
          if (!zone || !zone.active) continue;
        }

        // Must be a solid platform for enemies
        if (
          plat.type !== 'floor' &&
          plat.type !== 'wall' &&
          plat.type !== 'barrier' &&
          plat.type !== 'arenaWall' &&
          plat.type !== 'truthPlatform' &&
          plat.type !== 'falsePlatform'
        ) {
          continue;
        }

        if (
          enemy.x < plat.x + plat.w &&
          enemy.x + enemy.w > plat.x &&
          enemy.y < plat.y + plat.h &&
          enemy.y + enemy.h > plat.y
        ) {
          const evy = enemy.vy || 0;

          if (!isFlying) {
            // Check vertical landing first
            if (evy > 0 && enemy.y + enemy.h - evy <= plat.y + 7) {
              enemy.y = plat.y - enemy.h;
              enemy.vy = 0;
              enemy.grounded = true;
              continue;
            } else if (evy < 0 && enemy.y - evy >= plat.y + plat.h - 7) {
              enemy.y = plat.y + plat.h;
              enemy.vy = 0;
              continue;
            }
          }

          // Resolve horizontal push-back
          if (enemy.vx > 0) {
            enemy.x = plat.x - enemy.w;
            enemy.vx = 0;
          } else if (enemy.vx < 0) {
            enemy.x = plat.x + plat.w;
            enemy.vx = 0;
          }
        }
      }
    };

    const detectWallContact = (entity: any, platforms: Platform[]) => {
      let wallDir = 0;
      for (const plat of platforms) {
        if (!platformIsActive(plat, entity)) continue;
        if (plat.type === 'laser_fence') continue;
        if (entity.y < plat.y + plat.h && entity.y + entity.height > plat.y) {
          if (Math.abs(entity.x + entity.width - plat.x) <= 3 && entity.vx >= 0) wallDir = 1;
          if (Math.abs(entity.x - (plat.x + plat.w)) <= 3 && entity.vx <= 0) wallDir = -1;
        }
      }
      return wallDir;
    };

    // Main animation variable
    let animId: number;

    const gameLoopUpdate = () => {
      if (isPaused) return;

      const state = stateRef.current;
      const { player, camera, projectiles, ghostTrails, particles, platforms, phaseCatalysts, shards, enemies, lockedZones } = state;

      if (state.levelComplete) return;

      state.frameCount++;

      // Timer update
      const elapsedMs = Date.now() - state.startTime;
      const totalSec = Math.floor(elapsedMs / 1000);
      const minutes = String(Math.floor(totalSec / 60)).padStart(2, '0');
      const seconds = String(totalSec % 60).padStart(2, '0');
      setHudTime(`${minutes}:${seconds}`);

      if (state.screenFlashTimer > 0) state.screenFlashTimer--;

      if (state.dialogue.active) {
        state.dialogue.timer--;
        if (state.dialogue.timer > 240) state.dialogue.alpha = Math.min(1, state.dialogue.alpha + 0.05);
        else if (state.dialogue.timer < 40) state.dialogue.alpha = Math.max(0, state.dialogue.alpha - 0.05);
        if (state.dialogue.timer <= 0) state.dialogue.active = false;
      }

      // Hitstop screen shake management
      if (state.hitstopTimer > 0) {
        state.hitstopTimer--;
        state.screenShake.x = (Math.random() - 0.5) * 8;
        state.screenShake.y = (Math.random() - 0.5) * 8;

        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.vy += p.gravity;
          p.life--;
          if (p.life <= 0) particles.splice(i, 1);
        }
        return;
      } else {
        state.screenShake.x = 0;
        state.screenShake.y = 0;
      }

      // Moving platforms update
      platforms.forEach((plat) => {
        if (plat.type === 'elevator' && plat.vy !== undefined) {
          plat.y += plat.vy;
          if (plat.vx !== undefined) {
            plat.x += plat.vx;
          }
          if (plat.y < (plat.minY || 100) || plat.y > (plat.maxY || 500)) {
            plat.vy = -plat.vy;
            if (plat.vx !== undefined) {
              plat.vx = -plat.vx;
            }
          }
        } else if (plat.type === 'shuttle' && plat.vx !== undefined) {
          plat.x += plat.vx;
          if (plat.x < (plat.minX || 100) || plat.x > (plat.maxX || 3000)) {
            plat.vx = -plat.vx;
          }
        }
      });

      // Platform riding coordinates adjust
      if (player.ridingPlatform) {
        player.x += player.ridingPlatform.vx || 0;
        player.y += player.ridingPlatform.vy || 0;
      }

      player.history = player.history || [];
      player.history.unshift({ x: player.x, y: player.y });
      if (player.history.length > 15) player.history.pop();

      // Q state toggles
      if (actionPressed('toggle')) {
        player.shardMode = player.shardMode === 'truth' ? 'false' : 'truth';
        setHudPhase(player.shardMode);
        synthAudioEngine.playPhaseToggle(player.shardMode === 'truth');
        // Spawn ring visual of shifts
        spawnParticles(player.x + player.width/2, player.y + player.height/2, 'shockwave', 1, {
          color: player.shardMode === 'truth' ? '#00e5ff' : '#ff3b5f',
          size: 4,
          life: 18
        });
      }

      if (player.dashCooldown > 0) player.dashCooldown--;
      if (player.attackCooldown > 0) player.attackCooldown--;
      if (player.blastCooldown > 0) player.blastCooldown--;

      // Shadow step charge recharge
      if (player.shadowStepCharges < 2) {
        player.shadowStepRecharge++;
        if (player.shadowStepRecharge >= SHADOW_STEP_COOLDOWN) {
          player.shadowStepCharges++;
          setHudSteps(player.shadowStepCharges);
          player.shadowStepRecharge = 0;
        }
      } else {
        player.shadowStepRecharge = 0;
      }

      if (player.somersaultTimer > 0) {
        player.somersaultTimer--;
        player.somersaultSpin = Math.min(player.somersaultSpin + 0.55, 4 * Math.PI);
      }
      if (player.comboWindow > 0) player.comboWindow--;
      if (player.comboWindow === 0 && player.attackTimer === 0) player.comboStep = 0;
      if (player.attackTimer > 0) player.attackTimer--;
      if (player.attackTimer === 0) player.attackHitIds.clear();

      player.guard = actionHeld('guard');
      player.crouching = actionHeld('down');

      if (player.grounded) {
        player.jumpsUsed = 0;
        player.canDash = true;
        player.flightEnergy = Math.min(FLIGHT_MAX, player.flightEnergy + FLIGHT_RECHARGE);
      } else {
        player.ridingPlatform = null;
      }

      player.touchingWall = detectWallContact(player, platforms);
      player.wallSliding = !player.grounded && player.touchingWall !== 0 && player.vy > 0 && !player.flying;

      if (player.wallSliding && state.frameCount % 3 === 0) {
        const sparkX = player.touchingWall > 0 ? player.x + player.width + 2 : player.x - 5;
        spawnParticles(sparkX, player.y + player.height / 2, 'spark', 1, {
          color: '#ffaa00',
          spreadX: 2,
          spreadY: 4,
          vy: -2,
          gravity: 0.15,
          size: 1.5,
          life: 15
        });
      }

      // Phase catalysts collection
      phaseCatalysts.forEach((cat) => {
        if (cat.cooldown > 0) {
          cat.cooldown--;
          return;
        }
        const dist = Math.hypot(player.x + player.width / 2 - cat.x, player.y + player.height / 2 - cat.y);
        if (dist < cat.r + 16) {
          player.shardMode = cat.kind;
          setHudPhase(player.shardMode);
          cat.cooldown = 45;
          player.vy = -13;
          player.vx = player.facingRight ? 9 : -9;
          player.jumpsUsed = 0;
          player.canDash = true;
          synthAudioEngine.playPhaseToggle(cat.kind === 'truth');
          spawnParticles(cat.x, cat.y, 'crystal', 18, {
            color: cat.kind === 'truth' ? '#00e5ff' : '#ff3b5f',
            spreadX: 12,
            spreadY: 12,
            vy: -3,
            gravity: 0.1
          });
          if (cat.kind === 'truth') revealTruthPlatforms();
        }
      });

      // Open Flow: Cross-trigger spawners (No locking screens or snapping movement!)
      lockedZones.forEach((zone) => {
        if (player.x >= zone.triggerX && !zone.cleared) {
          zone.cleared = true;
          zone.active = false; // Never lock the screen!

          // Spawn appropriate enemies depending on level triggers!
          if (levelId === 1) {
            if (zone.id === 'gate1') {
              enemies.push(
                { id: 'z1_e1', x: zone.lockX + 200, y: 510, w: 40, h: 40, vx: 0, hp: 6, maxHp: 6, alive: true, type: 'knight', frozenTimer: 0, zoneId: 'gate1' },
                { id: 'z1_e2', x: zone.lockX + 400, y: 510, w: 40, h: 40, vx: 0, hp: 6, maxHp: 6, alive: true, type: 'knight', frozenTimer: 0, zoneId: 'gate1' },
                { id: 'z1_e3', x: zone.lockX + 550, y: 510, w: 40, h: 40, vx: 0, hp: 8, maxHp: 8, alive: true, type: 'knight', frozenTimer: 0, zoneId: 'gate1' }
              );
            } else if (zone.id === 'gate2') {
              enemies.push(
                { id: 'z1_e4', x: zone.lockX + 150, y: 510, w: 40, h: 40, vx: 0, hp: 8, maxHp: 8, alive: true, type: 'knight', frozenTimer: 0, zoneId: 'gate2' },
                { id: 'z1_e5', x: zone.lockX + 350, y: 510, w: 40, h: 40, vx: 0, hp: 8, maxHp: 8, alive: true, type: 'knight', frozenTimer: 0, zoneId: 'gate2' },
                { id: 'z1_e6', x: zone.lockX + 550, y: 510, w: 40, h: 40, vx: 0, hp: 12, maxHp: 12, alive: true, type: 'knight', frozenTimer: 0, zoneId: 'gate2' }
              );
            }
          } else if (levelId === 2) {
            if (zone.id === 'gateH1') {
              enemies.push(
                { id: 'z2_d1', x: zone.lockX + 220, y: 300, w: 32, h: 32, vx: 0, hp: 4, maxHp: 4, alive: true, type: 'drone', frozenTimer: 0, zoneId: 'gateH1' },
                { id: 'z2_d2', x: zone.lockX + 380, y: 220, w: 32, h: 32, vx: 0, hp: 4, maxHp: 4, alive: true, type: 'drone', frozenTimer: 0, zoneId: 'gateH1' },
                { id: 'z2_e1', x: zone.lockX + 520, y: 510, w: 40, h: 40, vx: 0, hp: 10, maxHp: 10, alive: true, type: 'knight', frozenTimer: 0, zoneId: 'gateH1' }
              );
            } else if (zone.id === 'gateH2') {
              enemies.push(
                { id: 'z2_e2', x: zone.lockX + 180, y: -350, w: 40, h: 40, vx: 0, hp: 12, maxHp: 12, alive: true, type: 'knight', frozenTimer: 0, zoneId: 'gateH2' },
                { id: 'z2_d3', x: zone.lockX + 320, y: -450, w: 32, h: 32, vx: 0, hp: 6, maxHp: 6, alive: true, type: 'drone', frozenTimer: 0, zoneId: 'gateH2' },
                { id: 'z2_e3', x: zone.lockX + 480, y: -350, w: 40, h: 40, vx: 0, hp: 14, maxHp: 14, alive: true, type: 'knight', frozenTimer: 0, zoneId: 'gateH2' }
              );
            }
          } else if (levelId === 3) {
            if (zone.id === 'gateW1') {
              enemies.push(
                { id: 'z3_e1', x: zone.lockX + 180, y: 370, w: 40, h: 40, vx: 0, hp: 10, maxHp: 10, alive: true, type: 'knight', frozenTimer: 0, zoneId: 'gateW1' },
                { id: 'z3_d1', x: zone.lockX + 300, y: 200, w: 32, h: 32, vx: 0, hp: 5, maxHp: 5, alive: true, type: 'drone', frozenTimer: 0, zoneId: 'gateW1' },
                { id: 'z3_e2', x: zone.lockX + 450, y: 370, w: 40, h: 40, vx: 0, hp: 10, maxHp: 10, alive: true, type: 'knight', frozenTimer: 0, zoneId: 'gateW1' }
              );
            } else if (zone.id === 'gateW2') {
              enemies.push(
                { id: 'z3_e3', x: zone.lockX + 150, y: 50, w: 40, h: 40, vx: 0, hp: 14, maxHp: 14, alive: true, type: 'knight', frozenTimer: 0, zoneId: 'gateW2' },
                { id: 'z3_d2', x: zone.lockX + 320, y: -100, w: 32, h: 32, vx: 0, hp: 8, maxHp: 8, alive: true, type: 'drone', frozenTimer: 0, zoneId: 'gateW2' },
                { id: 'z3_d3', x: zone.lockX + 480, y: -150, w: 32, h: 32, vx: 0, hp: 8, maxHp: 8, alive: true, type: 'drone', frozenTimer: 0, zoneId: 'gateW2' }
              );
            }
          } else if (levelId === 4) {
            if (zone.id === 'gateV1') {
              enemies.push(
                { id: 'z4_e1', x: zone.lockX + 180, y: 510, w: 40, h: 40, vx: 0, hp: 12, maxHp: 12, alive: true, type: 'knight', frozenTimer: 0, zoneId: 'gateV1' },
                { id: 'z4_d1', x: zone.lockX + 300, y: 240, w: 32, h: 32, vx: 0, hp: 8, maxHp: 8, alive: true, type: 'drone', frozenTimer: 0, zoneId: 'gateV1' },
                { id: 'z4_e2', x: zone.lockX + 450, y: 510, w: 40, h: 40, vx: 0, hp: 12, maxHp: 12, alive: true, type: 'knight', frozenTimer: 0, zoneId: 'gateV1' }
              );
            } else if (zone.id === 'gateV2') {
              enemies.push(
                { id: 'z4_e3', x: zone.lockX + 150, y: 510, w: 40, h: 40, vx: 0, hp: 16, maxHp: 16, alive: true, type: 'knight', frozenTimer: 0, zoneId: 'gateV2' },
                { id: 'z4_d2', x: zone.lockX + 320, y: 180, w: 32, h: 32, vx: 0, hp: 10, maxHp: 10, alive: true, type: 'drone', frozenTimer: 0, zoneId: 'gateV2' },
                { id: 'z4_d3', x: zone.lockX + 480, y: 280, w: 32, h: 32, vx: 0, hp: 10, maxHp: 10, alive: true, type: 'drone', frozenTimer: 0, zoneId: 'gateV2' },
                { id: 'z4_e4', x: zone.lockX + 600, y: 510, w: 40, h: 40, vx: 0, hp: 20, maxHp: 20, alive: true, type: 'knight', frozenTimer: 0, zoneId: 'gateV2' }
              );
            }
          } else if (levelId === 5) {
            if (zone.id === 'gateE1') {
              enemies.push(
                { id: 'z5_e1', x: zone.lockX + 180, y: 512, w: 40, h: 40, vx: 0, hp: 12, maxHp: 12, alive: true, type: 'knight', frozenTimer: 0, zoneId: 'gateE1' },
                { id: 'z5_d1', x: zone.lockX + 300, y: 300, w: 32, h: 32, vx: 0, hp: 8, maxHp: 8, alive: true, type: 'drone', frozenTimer: 0, zoneId: 'gateE1' },
                { id: 'z5_e2', x: zone.lockX + 450, y: 512, w: 40, h: 40, vx: 0, hp: 12, maxHp: 12, alive: true, type: 'knight', frozenTimer: 0, zoneId: 'gateE1' }
              );
            }
          } else if (levelId === 6) {
            if (zone.id === 'gateA1') {
              enemies.push(
                { id: 'z6_e1', x: zone.lockX + 180, y: 722, w: 40, h: 40, vx: 0, hp: 14, maxHp: 14, alive: true, type: 'knight', frozenTimer: 0, zoneId: 'gateA1' },
                { id: 'z6_d1', x: zone.lockX + 300, y: 400, w: 32, h: 32, vx: 0, hp: 10, maxHp: 10, alive: true, type: 'drone', frozenTimer: 0, zoneId: 'gateA1' }
              );
            } else if (zone.id === 'gateA2') {
              enemies.push(
                { id: 'z6_e2', x: zone.lockX + 150, y: 422, w: 40, h: 40, vx: 0, hp: 16, maxHp: 16, alive: true, type: 'knight', frozenTimer: 0, zoneId: 'gateA2' },
                { id: 'z6_d2', x: zone.lockX + 320, y: 200, w: 32, h: 32, vx: 0, hp: 10, maxHp: 10, alive: true, type: 'drone', frozenTimer: 0, zoneId: 'gateA2' },
                { id: 'z6_e3', x: zone.lockX + 480, y: 422, w: 40, h: 40, vx: 0, hp: 16, maxHp: 16, alive: true, type: 'knight', frozenTimer: 0, zoneId: 'gateA2' }
              );
            } else if (zone.id === 'gateA3') {
              enemies.push(
                { id: 'z6_e4', x: zone.lockX + 150, y: 682, w: 40, h: 40, vx: 0, hp: 20, maxHp: 20, alive: true, type: 'knight', frozenTimer: 0, zoneId: 'gateA3' },
                { id: 'z6_d3', x: zone.lockX + 320, y: 350, w: 32, h: 32, vx: 0, hp: 12, maxHp: 12, alive: true, type: 'drone', frozenTimer: 0, zoneId: 'gateA3' },
                { id: 'z6_e5', x: zone.lockX + 500, y: 682, w: 40, h: 40, vx: 0, hp: 20, maxHp: 20, alive: true, type: 'knight', frozenTimer: 0, zoneId: 'gateA3' }
              );
            }
          }

          // Trigger neat tactical alert audio chime!
          synthAudioEngine.playPhaseToggle(true);
          spawnParticles(zone.lockX + 100, player.y - 40, 'barrierSparks', 25, { color: '#00e5ff', spreadX: 12, spreadY: 12 });
        }
      });

      // Clear gates once wave is defeated
      lockedZones.forEach((zone) => {
        if (zone.active) {
          const activeWave = enemies.filter((e) => e.zoneId === zone.id && e.alive);
          if (activeWave.length === 0) {
            zone.active = false;
            zone.cleared = true;
            synthAudioEngine.playLevelClear(); // play arpeggio chime on zone clear!
            spawnParticles(player.x, player.y - 20, 'clearedShield', 30, { color: '#00e5ff', spreadX: 12, spreadY: 12 });
          }
        }
      });

      // Character Action: Dash
      if (actionPressed('dash') && player.canDash && player.dashCooldown === 0 && !player.guard) {
        player.dashTimer = DASH_FRAMES + 4;
        player.dashCooldown = DASH_COOLDOWN;
        player.canDash = false;
        player.vx = player.facingRight ? DASH_SPEED : -DASH_SPEED;
        player.vy = player.grounded ? -4.5 : -2;
        synthAudioEngine.playJump();
        ghostTrails.push({ x: player.x, y: player.y, life: 14 });
        spawnParticles(player.x + player.width / 2, player.y + player.height / 2, 'dash', 15, {
          color: player.shardMode === 'truth' ? '#50dcff' : '#ff3b5f',
          spreadX: 8,
          spreadY: 8,
          gravity: 0,
          life: 15,
          size: 3
        });
      }

      // Action: Z-Shadow step
      if (actionPressed('shadowStep') && player.shadowStepCharges > 0 && !player.guard) {
        player.shadowStepTimer = SHADOW_STEP_FRAMES;
        player.shadowStepCharges--;
        setHudSteps(player.shadowStepCharges);
        player.shadowStepRecharge = 0;
        player.vx = player.facingRight ? SHADOW_STEP_SPEED : -SHADOW_STEP_SPEED;
        player.vy = 0;
        state.screenFlashTimer = 3;
        synthAudioEngine.playLaserShot(); // space dash futuristic teleport sound!
        for (let i = 0; i < 6; i++) {
          ghostTrails.push({
            x: player.x - i * 18 * (player.facingRight ? 1 : -1),
            y: player.y,
            life: 25 - i * 2,
            shadow: true
          });
        }
        spawnParticles(player.x + player.width / 2, player.y + player.height / 2, 'dash', 20, {
          color: '#ffffff',
          spreadX: 30,
          spreadY: 2,
          vx: player.facingRight ? 20 : -20,
          gravity: 0,
          life: 15,
          size: 2
        });
      }

      // Attack weapon logic (C keyboard)
      if (actionPressed('combo') && player.attackCooldown === 0 && !player.guard) {
        player.comboStep = player.comboWindow > 0 ? Math.min(player.comboStep + 1, 9) : 1;
        player.comboWindow = COMBO_WINDOW;
        player.attackKind = player.dashTimer > 0 ? 'dash' : 'combo';
        player.attackTimer = player.comboStep >= 9 ? 18 : ATTACK_FRAMES;
        player.attackCooldown = player.comboStep >= 9 ? 24 : 12;
        synthAudioEngine.playAttackSlash();
      }

      // Attack: Heavy strike (F keyboard)
      if (actionPressed('strike') && player.attackCooldown === 0 && !player.guard) {
        player.attackKind = 'strike';
        player.attackTimer = ATTACK_FRAMES;
        player.attackCooldown = ATTACK_COOLDOWN;
        synthAudioEngine.playAttackSlash();
        if (player.shardMode === 'truth') revealTruthPlatforms();
        spawnParticles(player.x + player.width / 2, player.y + player.height / 2, 'strike', 15, {
          color: player.shardMode === 'truth' ? '#50dcff' : '#ff3b5f',
          spreadX: 4,
          spreadY: 10,
          vx: player.facingRight ? 10 : -10,
          vy: 0,
          gravity: 0,
          life: 12,
          size: 2
        });
      }

      // Energy beam blast charges (V keyboard)
      if (actionHeld('blast') && player.blastCooldown === 0 && !player.guard) {
        player.chargingBlast = true;
        player.blastCharge = Math.min(BLAST_CHARGE_3, player.blastCharge + 1);
        player.vx *= 0.92;
      }
      if ((actionReleased('blast') || player.guard) && player.chargingBlast) {
        const level = player.blastCharge >= BLAST_CHARGE_3 ? 3 : player.blastCharge >= BLAST_CHARGE_2 ? 2 : player.blastCharge >= BLAST_CHARGE_1 ? 1 : 0;
        
        // Fire project!
        const power = Math.max(1, level);
        projectiles.push({
          x: player.facingRight ? player.x + player.width : player.x - (20 + power * 15),
          y: player.y + 4,
          w: 20 + power * 15,
          h: 20 + power * 15,
          vx: player.facingRight ? BLAST_SPEED + power * 1.5 : -(BLAST_SPEED + power * 1.5),
          life: 70 + power * 10,
          damage: power,
          chargeLevel: power,
          kind: player.shardMode,
          isPlayerBlast: true
        });
        synthAudioEngine.playLaserShot();
        player.blastCooldown = BLAST_COOLDOWN;
        player.chargingBlast = false;
        player.blastCharge = 0;
      }
      if (!actionHeld('blast') && !player.chargingBlast && player.blastCharge > 0) {
        player.blastCharge = 0;
      }

      player.flying = actionHeld('flight') && player.flightEnergy > 0 && !player.grounded && !player.guard;

      if (player.shadowStepTimer > 0) {
        player.shadowStepTimer--;
        player.vx = player.facingRight ? SHADOW_STEP_SPEED : -SHADOW_STEP_SPEED;
        player.vy = 0;
        if (player.shadowStepTimer % 2 === 0) {
          ghostTrails.push({ x: player.x, y: player.y, life: 12, shadow: true });
        }
      } else if (player.dashTimer > 0) {
        player.dashTimer--;
        player.vx = player.facingRight ? DASH_SPEED : -DASH_SPEED;
      } else {
        if (!player.guard && actionHeld('left')) {
          player.facingRight = false;
          if (player.vx > 0) player.vx *= player.grounded ? 0.35 : 0.75;
          player.vx -= ACCELERATION;
        } else if (!player.guard && actionHeld('right')) {
          player.facingRight = true;
          if (player.vx < 0) player.vx *= player.grounded ? 0.35 : 0.75;
          player.vx += ACCELERATION;
        } else {
          player.vx *= player.grounded ? 0.62 : FRICTION;
        }

        if (Math.abs(player.vx) < 0.1) player.vx = 0;
        player.vx = Math.max(-RUN_MAX_SPEED, Math.min(RUN_MAX_SPEED, player.vx));

        if (player.flying) {
          if (actionHeld('up')) player.vy -= 0.8;
          if (actionHeld('down')) player.vy += 0.8;
          player.vx = Math.max(-FLIGHT_SPEED, Math.min(FLIGHT_SPEED, player.vx));
          player.vy = Math.max(-FLIGHT_SPEED, Math.min(FLIGHT_SPEED, player.vy));
          player.flightEnergy = Math.max(0, player.flightEnergy - FLIGHT_DRAIN);
          spawnParticles(player.x + player.width / 2, player.y + player.height, 'thrust', 2, {
            color: '#50dcff',
            spreadX: 6,
            spreadY: 2,
            vy: Math.max(2, player.vy + 2),
            gravity: 0.1,
            life: 10,
            size: 2
          });
        }
      }

      // Jump and walls slides
      const jumpPressed = actionHeld('up');
      if (levelId === 6 && jumpPressed && !player.guard) {
        player.vy = -3.8; // Continual upward swimming physics
        player.grounded = false;
        if (state.frameCount % 20 === 0) {
          synthAudioEngine.playJump(); // subtle swim action sound
        }
      } else if (jumpPressed && !player.jumpHeld && player.wallSliding && !player.guard) {
        player.vx = -player.touchingWall * WALL_JUMP_X;
        player.vy = WALL_JUMP_Y;
        player.facingRight = player.touchingWall < 0;
        player.grounded = false;
        player.jumpsUsed = 0;
        player.jumpHeld = true;
        synthAudioEngine.playJump();
        spawnParticles(
          player.touchingWall > 0 ? player.x + player.width : player.x,
          player.y + player.height / 2,
          'burst',
          12,
          { color: '#ffaa00', spreadX: 8, spreadY: 8, gravity: 0.2 }
        );
      } else if (jumpPressed && !player.jumpHeld && player.grounded && !player.guard) {
        player.vy = JUMP_FORCE;
        player.grounded = false;
        player.jumpHeld = true;
        synthAudioEngine.playJump();
        spawnParticles(player.x + player.width / 2, player.y + player.height, 'dust', 12, {
          color: '#2a1a1a',
          spreadX: 10,
          spreadY: 2,
          vy: -1,
          gravity: 0.1
        });
      } else if (!jumpPressed && player.vy < -2) {
        player.vy *= 0.6;
      } else if (
        jumpPressed &&
        !player.jumpHeld &&
        player.jumpsUsed < MAX_JUMPS &&
        !player.grounded &&
        !player.guard &&
        !player.crouching
      ) {
        player.vy = JUMP_FORCE * 1.25;
        player.jumpsUsed++;
        player.jumpHeld = true;
        player.canDash = true;
        player.somersaultTimer = SOMERSAULT_FRAMES;
        player.somersaultSpin = 0;
        synthAudioEngine.playJump();
        spawnParticles(player.x + player.width / 2, player.y + player.height, 'burst', 15, {
          color: player.shardMode === 'truth' ? '#dff8ff' : '#ffeaee',
          spreadX: 8,
          spreadY: 8,
          vy: 2,
          gravity: 0.2
        });
      }

      if (!jumpPressed) player.jumpHeld = false;

      if (player.flying || player.shadowStepTimer > 0) {
        player.vy += 0;
      } else {
        const currentGravity = levelId === 6 ? GRAVITY * 0.35 : levelId === 3 ? GRAVITY * 0.55 : GRAVITY;
        player.vy += player.dashTimer > 0 ? currentGravity * 0.8 : currentGravity;
      }
      if (levelId === 6) {
        player.vy = Math.min(player.vy, 3.2); // reduced terminal velocity underwater
        if (!player.grounded) {
          player.vx *= 0.92; // water drag
        }
        // Spawn underwater bubbles around the player
        if (state.frameCount % 8 === 0) {
          spawnParticles(
            player.x + player.width / 2 + (Math.random() * 40 - 20),
            player.y + player.height / 2 + (Math.random() * 40 - 20),
            'bubble',
            1,
            {
              color: 'rgba(0, 229, 255, 0.45)',
              spreadX: 1,
              spreadY: 1,
              vy: -1.5,
              gravity: -0.04,
              size: 2 + Math.random() * 3
            }
          );
        }
      } else if (levelId === 3) {
        player.vy = Math.min(player.vy, 6.5); // higher terminal velocity than water but floaty
      }
      if (player.wallSliding) player.vy = Math.min(player.vy, WALL_SLIDE_SPEED);

      player.x += player.vx;
      player.y += player.vy;

      // Map active destructibles to solid platforms for physics resolution
      const destructiblesAsPlatforms = (state.destructibles || [])
        .filter((d: any) => d.hp > 0)
        .map((d: any) => ({
          x: d.x,
          y: d.y,
          w: d.w,
          h: d.h,
          type: 'floor' as const
        }));
      const activePlatformsForCollision = [...platforms, ...destructiblesAsPlatforms];

      const tempGrounded = player.grounded;
      resolveCollisions(player, activePlatformsForCollision);

      if (player.grounded && !tempGrounded) {
        const checkPlat = activePlatformsForCollision.find(
          (plat: Platform) =>
            plat.type !== 'wall' &&
            plat.type !== 'arenaWall' &&
            player.x + player.width > plat.x &&
            player.x < plat.x + plat.w &&
            Math.abs(player.y + player.height - plat.y) <= 8
        );
        if (checkPlat && (checkPlat.type === 'elevator' || checkPlat.type === 'shuttle')) {
          player.ridingPlatform = checkPlat;
        }
      }

      if (player.grounded && !state.wasGrounded && player.vy === 0) {
        spawnParticles(player.x + player.width / 2, player.y + player.height, 'dust', 15, {
          color: '#2a1a1a',
          spreadX: 15,
          spreadY: 2,
          vy: -1.5,
          gravity: 0.1
        });
      }
      state.wasGrounded = player.grounded;

      // Unlocking boss doors based on position logic
      const activeBoss = enemies.find((enemy) => enemy.type === 'boss' || enemy.type === 'hive_queen' || enemy.type === 'overlord');
      if (activeBoss && !activeBoss.alive) {
        state.portal.active = true;
        state.portal.pulse += 0.05;

        // Check level objective finish!
        if (
          rectsOverlap(
            { x: player.x, y: player.y, w: player.width, h: player.height },
            { x: state.portal.x, y: state.portal.y, w: state.portal.w, h: state.portal.h }
          )
        ) {
          state.levelComplete = true;
          synthAudioEngine.playLevelClear();
          onLevelComplete({
            timeTaken: hudTime,
            shardsCollected: player.truthShards + player.falseShards,
            finalHp: player.hp
          });
        }
      }

      // Shard collectibles
      shards.forEach((shard) => {
        if (shard.collected) return;
        if (
          rectsOverlap(
            { x: player.x, y: player.y, w: player.width, h: player.height },
            { x: shard.x - shard.r, y: shard.y - shard.r, w: shard.r * 2, h: shard.r * 2 }
          )
        ) {
          shard.collected = true;
          synthAudioEngine.playPhaseToggle(shard.kind === 'truth');
          if (shard.kind === 'truth') {
            player.truthShards++;
            player.shardMode = 'truth';
            if (shard.reveals) revealTruthPlatforms();
          } else {
            player.falseShards++;
            player.shardMode = 'false';
          }
          setHudShards({ truth: player.truthShards, false: player.falseShards });
          setHudPhase(player.shardMode);
          spawnParticles(shard.x, shard.y, 'collect', 15, { color: '#ffffff', spreadX: 10, spreadY: 10 });
        }
      });

      // Player sword attack VS enemies
      if (player.attackTimer > 0) {
        const hitbox = getAttackHitbox(player);
        
        let swingX = player.x + (player.facingRight ? player.width + 30 : -30);
        spawnParticles(swingX, player.y + player.height / 2 + (Math.random() * 40 - 20), 'swing_clack', 4, {
          color: player.shardMode === 'truth' ? '#00e5ff' : '#ff3b5f',
          spreadX: 25,
          spreadY: 25,
          vy: -3,
          gravity: -0.1,
          size: 3 + Math.random() * 2,
          life: 15
        });

        // Projectile deflection: deflect enemy blasts back
        projectiles.forEach((proj) => {
          if (((proj as any).isEnemyBlast || proj.kind === 'enemy_fired') && proj.life > 0) {
            if (rectsOverlap(hitbox, { x: proj.x, y: proj.y, w: proj.w, h: proj.h })) {
              (proj as any).isEnemyBlast = false;
              (proj as any).isPlayerBlast = true;
              proj.kind = 'player_reflected';
              proj.vx = player.facingRight ? 18 : -18;
              proj.vy = (Math.random() - 0.5) * 4;
              proj.damage = 10;
              proj.life = 100;

              // Sparkles & Sound SFX
              synthAudioEngine.playPhaseToggle(true);
              spawnParticles(proj.x + proj.w / 2, proj.y + proj.h / 2, 'shockwave', 1, {
                color: '#db9c31',
                size: 8,
                life: 15
              });
              spawnParticles(proj.x + proj.w / 2, proj.y + proj.h / 2, 'hit', 10, { color: '#ffd700' });
            }
          }
        });

        // Player sword attack VS destructibles
        if (state.destructibles) {
          state.destructibles.forEach((dest) => {
            if (dest.hp <= 0 || player.attackHitIds.has(dest.id)) return;
            if (rectsOverlap(hitbox, dest)) {
              dest.hp--;
              player.attackHitIds.add(dest.id);

              synthAudioEngine.playPhaseToggle(false);
              state.screenShake.x = (Math.random() - 0.5) * 5;
              state.screenShake.y = (Math.random() - 0.5) * 5;

              const isCrate = dest.type === 'crate';
              const color = isCrate ? '#855118' : '#718096';

              spawnParticles(dest.x + dest.w / 2, dest.y + dest.h / 2, 'collect', 12, {
                color,
                spreadX: dest.w / 2,
                spreadY: dest.h / 2,
                vy: -2
              });

              if (dest.hp <= 0) {
                synthAudioEngine.playBossDefeated();
                spawnParticles(dest.x + dest.w / 2, dest.y + dest.h / 2, 'hit', 25, {
                  color,
                  spreadX: dest.w / 2,
                  spreadY: dest.h / 2
                });
              }
            }
          });
        }

        enemies.forEach((enemy) => {
          if (!enemy.alive || player.attackHitIds.has(enemy.id)) return;
          if (rectsOverlap(hitbox, enemy)) {
            // Boss parrying defense shield!
            if (levelId === 3 && enemy.type === 'boss' && (enemy as any).isGuarding) {
              player.vx = player.facingRight ? -8 : 8;
              enemy.vx = player.facingRight ? 4 : -4;
              player.attackHitIds.add(enemy.id);
              state.hitstopTimer = 5;
              
              // Sparks & Sound SFX
              synthAudioEngine.playPhaseToggle(false);
              spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, 'spark', 15, { color: '#00e5ff' });
              return; // block standard damage!
            }

            const finisher = player.attackKind === 'combo' && player.comboStep >= 9;
            const damage = finisher ? 6 : player.attackKind === 'dash' ? 3 : player.shardMode === 'false' ? 3 : 2;
            const baseKnockback = finisher ? 20 : player.attackKind === 'dash' ? 16 : player.shardMode === 'false' ? 14 : 8;
            const isHeavyOrBoss = enemy.type === 'boss' || enemy.type === 'hive_queen' || enemy.type === 'overlord';
            const knockback = isHeavyOrBoss ? Math.min(2.0, baseKnockback * 0.1) : baseKnockback;

            enemy.hp -= damage;
            enemy.vx = player.facingRight ? knockback : -knockback;
            player.attackHitIds.add(enemy.id);

            synthAudioEngine.playHitEnemy();

            if (finisher) {
              state.hitstopTimer = 14;
              state.screenFlashTimer = 4;
              state.screenShake = {
                x: (Math.random() - 0.5) * 20,
                y: (Math.random() - 0.5) * 20
              };
              spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, 'shockwave', 1, {
                color: '#ffffff',
                size: 8,
                life: 20
              });
            } else {
              state.hitstopTimer = 6;
            }

            spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, 'hit', 20, {
              color: player.shardMode === 'truth' ? '#00e5ff' : '#ff3b5f',
              spreadX: 12,
              spreadY: 12,
              vy: -2,
              gravity: 0.2
            });

            if (enemy.hp <= 0) {
              enemy.alive = false;
              if (enemy.type === 'boss' || enemy.type === 'hive_queen' || enemy.type === 'overlord') {
                synthAudioEngine.playBossDefeated();
              }
              spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, 'death', 30, {
                color: '#ff3b5f',
                spreadX: 18,
                spreadY: 18
              });
            }
          }
        });
      }

      // Energy Projectiles collisions
      for (const proj of projectiles) {
        proj.x += proj.vx;
        proj.life--;

        if (state.frameCount % 2 === 0) {
          spawnParticles(proj.x + proj.w / 2, proj.y + proj.h / 2, 'firetrail', 2, {
            color: proj.kind === 'truth' ? '#00e5ff' : '#ff3b5f',
            spreadX: 10,
            spreadY: 10,
            vy: -1,
            gravity: -0.05,
            life: 20,
            size: 2 + proj.chargeLevel
          });
        }

        enemies.forEach((enemy) => {
          if (!enemy.alive || proj.life <= 0) return;
          // Only player blasts or reflected blasts hit enemies!
          if (!(proj as any).isPlayerBlast && proj.kind !== 'truth' && proj.kind !== 'false' && proj.kind !== 'player_reflected') return;
          if (rectsOverlap(proj, enemy)) {
            // Level 2 Core extra damage matching state!
            let damage = proj.damage;
            if (levelId === 2 && enemy.type === 'hive_queen') {
              // double damage if color matches phase!
              if (player.shardMode === 'truth') damage *= 1.5;
            }

            enemy.hp -= damage;
            const isHeavyOrBoss = enemy.type === 'boss' || enemy.type === 'hive_queen' || enemy.type === 'overlord';
            enemy.vx = proj.vx > 0 ? (isHeavyOrBoss ? 1.0 : 9) : (isHeavyOrBoss ? -1.0 : -9);
            proj.life = 0;
            state.hitstopTimer = 4;
            synthAudioEngine.playHitEnemy();
            
            spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, 'hit', 25, {
              color: '#ffaa00',
              spreadX: 15,
              spreadY: 15,
              gravity: 0.1
            });

            if (enemy.hp <= 0) {
              enemy.alive = false;
              if (enemy.type === 'boss' || enemy.type === 'hive_queen' || enemy.type === 'overlord') {
                synthAudioEngine.playBossDefeated();
              }
              spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, 'death', 30, {
                color: '#ff3b5f',
                spreadX: 18,
                spreadY: 18
              });
            }
          }
        });

        // Player projectiles VS destructibles
        if (state.destructibles && ((proj as any).isPlayerBlast || proj.kind === 'truth' || proj.kind === 'false' || proj.kind === 'player_reflected')) {
          state.destructibles.forEach((dest) => {
            if (dest.hp <= 0 || proj.life <= 0) return;
            if (rectsOverlap(proj, dest)) {
              dest.hp -= proj.damage || 2;
              proj.life = 0; // consume projectile!

              synthAudioEngine.playPhaseToggle(false);
              const isCrate = dest.type === 'crate';
              const color = isCrate ? '#855118' : '#718096';

              spawnParticles(dest.x + dest.w / 2, dest.y + dest.h / 2, 'collect', 12, {
                color,
                spreadX: dest.w / 2,
                spreadY: dest.h / 2,
                vy: -2
              });

              if (dest.hp <= 0) {
                synthAudioEngine.playBossDefeated();
                spawnParticles(dest.x + dest.w / 2, dest.y + dest.h / 2, 'hit', 25, {
                  color,
                  spreadX: dest.w / 2,
                  spreadY: dest.h / 2
                });
              }
            }
          });
        }
      }
      state.projectiles = projectiles.filter((p) => p.life > 0);

      // Enemy AI Engine
      enemies.forEach((enemy) => {
        if (!enemy.alive) return;

        const isFlying = enemy.type === 'drone';

        // Apply horizontal decay/friction
        enemy.vx *= 0.82;

        if (!isFlying) {
          if (enemy.vy === undefined) enemy.vy = 0;
          const currentGravity = levelId === 3 ? GRAVITY * 0.45 : GRAVITY;
          enemy.vy += currentGravity;

          enemy.x += enemy.vx;
          enemy.y += enemy.vy;
        } else {
          enemy.x += enemy.vx;
        }

        if (enemy.type === 'knight') {
          const dx = player.x - enemy.x;
          if (Math.abs(dx) < 300) {
            enemy.vx += Math.sign(dx) * 0.4;
          } else {
            enemy.vx += Math.sin(state.frameCount * 0.05 + enemy.x) * 0.2;
          }

          // Knight attacks player on contact!
          if (rectsOverlap(enemy, player)) {
            if (player.dashTimer === 0 && player.shadowStepTimer === 0 && !player.guard) {
              player.hp = Math.max(0, player.hp - 1.2); // Rapid minor chip
              player.vy = -3;
              player.vx = player.x > enemy.x ? 6 : -6;
              if (state.frameCount % 25 === 0) {
                synthAudioEngine.playHurt();
                spawnParticles(player.x + player.width/2, player.y + player.height/2, 'hit', 12, {
                  color: '#ff3b5f'
                });
              }
            }
          }
        } 
        else if (enemy.type === 'drone') {
          // Floating heatseeking drones! (New Level 2 and Level 3 drone)
          const dx = player.x - enemy.x;
          const dy = player.y - enemy.y;
          const dist = Math.hypot(dx, dy);

          if (dist < 400) {
            enemy.vx += (dx / dist) * 0.35;
            if (enemy.vy === undefined) enemy.vy = 0;
            enemy.vy += (dy / dist) * 0.35;
            enemy.vy *= 0.85;
            enemy.y += enemy.vy;
          }

          if (enemy.shootTimer === undefined) enemy.shootTimer = 0;
          enemy.shootTimer++;
          if (enemy.shootTimer > 120 && dist < 350) {
            // Shoot a glowing false blast!
            projectiles.push({
              x: enemy.x + 8,
              y: enemy.y + 8,
              w: 12,
              h: 12,
              vx: (dx / dist) * 5,
              vy: (dy / dist) * 5,
              life: 100,
              damage: 1,
              chargeLevel: 1,
              kind: 'enemy_fired',
              isEnemyBlast: true
            } as any);
            enemy.shootTimer = 0;
          }

          if (rectsOverlap(enemy, player)) {
            if (player.dashTimer === 0 && player.shadowStepTimer === 0 && !player.guard) {
              player.hp = Math.max(0, player.hp - 10);
              enemy.hp = 0;
              enemy.alive = false;
              synthAudioEngine.playHurt();
              spawnParticles(player.x + player.width/2, player.y + player.height/2, 'death', 20, { color: '#ff3b5f' });
            }
          }
        }
        else if (enemy.type === 'boss') {
          if (levelId === 3) {
            // EPIC REACTION-BASED SWORD BOSSFIGHT WITH PARRIES MECHANIC!
            const dx = player.x - enemy.x;
            const dy = player.y - enemy.y;
            const dist = Math.hypot(dx, dy);

            // Rotate visual orientation and face the player
            (enemy as any).facingRight = dx > 0;

            // Faster and more persistent ground pursuit speed
            if (dist > 110 && dist < 650) {
              enemy.vx += Math.sign(dx) * 0.65;
            }

            // Custom attack clock
            if (enemy.shootTimer === undefined) enemy.shootTimer = 0;
            enemy.shootTimer++;

            // Shorter defense block window (blocking for 45/180 frames) to keep him aggressive
            (enemy as any).isGuarding = state.frameCount % 180 < 45;

            if (enemy.shootTimer > 65) {
              (enemy as any).isAttacking = true;
              (enemy as any).attackWarnFrames = 15; // Swifter warm-up (15 frames)
              enemy.shootTimer = 0;
            }

            if ((enemy as any).isAttacking) {
              if ((enemy as any).attackWarnFrames > 0) {
                (enemy as any).attackWarnFrames--;
                // Lunging charge toward player during the brief warn flash!
                enemy.vx = Math.sign(dx) * 9.5;
                if (state.frameCount % 2 === 0) {
                  spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, 'spark', 5, { color: '#ffd700' });
                }
              } else {
                (enemy as any).isAttacking = false;
                
                // Strike hitbox area: slightly wider for lunging sweep
                const strikeHitbox = {
                  x: (enemy as any).facingRight ? enemy.x - 20 : enemy.x - 140,
                  y: enemy.y - 15,
                  w: 220,
                  h: enemy.h + 30
                };

                if (rectsOverlap(strikeHitbox, player)) {
                  if (player.dashTimer === 0 && player.shadowStepTimer === 0) {
                    if (player.guard) {
                      // CLASH PARRY! Push back both actors & trigger sparkles
                      enemy.vx = (enemy as any).facingRight ? -12 : 12;
                      player.vx = (enemy as any).facingRight ? 14 : -14;
                      state.hitstopTimer = 12;
                      state.screenFlashTimer = 3;
                      
                      synthAudioEngine.playPhaseToggle(true);
                      spawnParticles(player.x + player.width/2, player.y + player.height/2, 'shockwave', 1, { color: '#ffffff', size: 15 });
                      spawnParticles(player.x + player.width/2, player.y + player.height/2, 'spark', 35, { color: '#ffcc00' });
                    } else {
                      // Unblocked hit - heavy sword swipe damage
                      player.hp = Math.max(0, player.hp - 18);
                      player.vy = -5;
                      player.vx = (enemy as any).facingRight ? 14 : -14;
                      synthAudioEngine.playHurt();
                      spawnParticles(player.x + player.width/2, player.y + player.height/2, 'hit', 25, { color: '#ff3b5f' });
                    }
                  }
                }

                (enemy as any).slashArcTimer = 15;
                (enemy as any).slashArcFacing = (enemy as any).facingRight;
              }
            }

            // Fire standard background energy beam occasionally (More frequent and faster)
            if (state.frameCount % 100 === 0 && dist < 650) {
              projectiles.push({
                x: enemy.x + ((enemy as any).facingRight ? enemy.w : -12),
                y: enemy.y + 20,
                w: 12,
                h: 12,
                vx: (enemy as any).facingRight ? 9 : -9,
                vy: 0,
                life: 100,
                damage: 2,
                chargeLevel: 1,
                kind: 'false',
                isEnemyBlast: true
              } as any);
            }
          } else {
            // Level 1 original boss shoots periodic fire
            if (state.frameCount % 90 === 0) {
              const dir = player.x < enemy.x ? -1 : 1;
              projectiles.push({
                x: enemy.x + (dir < 0 ? -30 : enemy.w),
                y: enemy.y + 30,
                w: 30,
                h: 30,
                vx: dir * 6,
                life: 120,
                damage: 1,
                chargeLevel: 1,
                kind: 'false',
                isEnemyBlast: true
              } as any);
              spawnParticles(enemy.x + enemy.w / 2, enemy.y + 30, 'ember', 10, { color: '#ff5a00' });
            }

            if (rectsOverlap(enemy, player) && player.dashTimer === 0 && player.shadowStepTimer === 0 && !player.guard) {
              player.hp = Math.max(0, player.hp - 2);
            }
          }
        }
        else if (enemy.type === 'hive_queen') {
          // Level 2 Boss drone (Hive Queen)
          if (state.frameCount % 70 === 0) {
            // Spiral shoot projectiles
            for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 3) {
              projectiles.push({
                x: enemy.x + enemy.w/2,
                y: enemy.y + enemy.h/2,
                w: 16,
                h: 16,
                vx: Math.cos(angle) * 4.5,
                vy: Math.sin(angle) * 4.5,
                life: 140,
                damage: 2,
                chargeLevel: 1,
                kind: 'false',
                isEnemyBlast: true
              } as any);
            }
            spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h/2, 'sparks', 15, { color: '#00e5ff' });
          }

          if (rectsOverlap(enemy, player) && player.dashTimer === 0 && player.shadowStepTimer === 0 && !player.guard) {
            player.hp = Math.max(0, player.hp - 2.5);
          }
        }
        else if (enemy.type === 'overlord') {
          // Level 3 Boss (Obsidian Overlord) color-matched shield shifts!
          if (enemy.shootTimer === undefined) enemy.shootTimer = 0;
          enemy.shootTimer++;
          if (enemy.shootTimer % 180 === 0) {
            // Alternate core phases
            enemy.zoneId = enemy.zoneId === 'truth' ? 'false' : 'truth';
            spawnParticles(enemy.x + enemy.w/2, enemy.y + enemy.h/2, 'shockwave', 1, {
              color: enemy.zoneId === 'truth' ? '#00e5ff' : '#ff3b5f',
              size: 5,
              life: 25
            });
          }

          if (state.frameCount % 100 === 0) {
            // Triple wave fires directly towards player coordinates
            const dx = player.x - enemy.x;
            const dy = player.y - enemy.y;
            const dist = Math.hypot(dx, dy);

            projectiles.push({
              x: enemy.x,
              y: enemy.y + 20,
              w: 24,
              h: 24,
              vx: (dx / dist) * 7.5,
              vy: (dy / dist) * 7.5,
              life: 140,
              damage: 3,
              chargeLevel: 2,
              kind: enemy.zoneId || 'truth',
              isEnemyBlast: true
            } as any);
          }

          if (rectsOverlap(enemy, player) && player.dashTimer === 0 && player.shadowStepTimer === 0 && !player.guard) {
            player.hp = Math.max(0, player.hp - 3);
          }
        }

        resolveEnemyCollisions(enemy, activePlatformsForCollision);
      });

      // Projectiles shot by enemies/hazards that hit player!
      projectiles.forEach((proj) => {
        if (((proj as any).isEnemyBlast || proj.kind === 'enemy_fired') && !(proj as any).isPlayerBlast) {
          if (rectsOverlap(proj, player)) {
            if (player.dashTimer === 0 && player.shadowStepTimer === 0) {
              if (player.guard) {
                // Safeguard hit blocks!
                spawnParticles(player.x + player.width/2, player.y + player.height/2, 'spark', 15, { color: '#ffffff' });
              } else {
                player.hp = Math.max(0, player.hp - (proj.damage * 8));
                synthAudioEngine.playHurt();
                spawnParticles(player.x + player.width/2, player.y + player.height/2, 'hit', 20, { color: '#ff3b5f' });
              }
              proj.life = 0;
            }
          }
        }
      });

      // Synchronise HUD states
      setHudHp(Math.ceil(player.hp));

      // Check player death!
      if (player.hp <= 0) {
        state.gameStarted = false;
        onPlayerDeath();
      }

      // Pitfalls reset
      const deathYLimit = currentLevelData.deathY || 1500;
      if (player.y > deathYLimit) {
        player.x = currentLevelData.startX;
        player.y = currentLevelData.startY;
        player.vx = 0;
        player.vy = 0;
        player.hp = Math.max(0, player.hp - 15);
        synthAudioEngine.playHurt();
        spawnParticles(player.x + player.width / 2, player.y + player.height / 2, 'death', 25, {
          color: '#ff3b5f'
        });
        if (player.hp <= 0) {
          onPlayerDeath();
        }
      }

      // Trail decay
      ghostTrails.forEach((trail) => trail.life--);
      state.ghostTrails = ghostTrails.filter((t) => t.life > 0);

      // Particle simulation
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.life--;
      });
      state.particles = particles.filter((p) => p.life > 0);

      // Smooth camera follow
      camera.targetX = player.x - canvas.width * 0.4;
      camera.targetY = player.y - canvas.height * 0.6;
      camera.x += (camera.targetX - camera.x) * camera.smoothing;
      camera.y += (camera.targetY - camera.y) * camera.smoothing;

      // Handle custom projectile drawing/trajectories if they have vy!
      projectiles.forEach((p) => {
        if (p.vy !== undefined) {
          p.y += p.vy;
        }
      });

      // Update gamepad previous states
      const actions: (keyof typeof controls)[] = [
        'left', 'right', 'up', 'down', 'dash', 'combo', 'strike', 'blast', 'guard', 'toggle', 'flight', 'shadowStep'
      ];
      actions.forEach((action) => {
        prevGamepadState.current[action] = getGamepadActionState(action);
      });

      // Reset keyboard frames
      for (const code in justPressed.current) delete justPressed.current[code];
      for (const code in justReleased.current) delete justReleased.current[code];
    };

    const drawFlame = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, time: number) => {
      const sway = Math.sin(time * 0.12 + x * 0.03) * size * 0.12;
      ctx.save();
      const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 2.5);
      glow.addColorStop(0, 'rgba(255, 120, 20, 0.5)');
      glow.addColorStop(0.4, 'rgba(255, 40, 0, 0.2)');
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(x - size * 3, y - size * 3, size * 6, size * 4);
      ctx.fillStyle = '#ff3a00';
      ctx.beginPath();
      ctx.moveTo(x - size * 0.5, y);
      ctx.quadraticCurveTo(x - size * 0.9 + sway, y - size * 0.7, x + sway, y - size * 1.6);
      ctx.quadraticCurveTo(x + size * 0.9 + sway, y - size * 0.55, x + size * 0.45, y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffaa00';
      ctx.beginPath();
      ctx.moveTo(x - size * 0.22, y);
      ctx.quadraticCurveTo(x - size * 0.42 - sway * 0.3, y - size * 0.45, x + sway * 0.2, y - size * 1.05);
      ctx.quadraticCurveTo(x + size * 0.42, y - size * 0.32, x + size * 0.2, y);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const gameLoopRender = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const state = stateRef.current;
      const { player, camera, projectiles, ghostTrails, particles, platforms, phaseCatalysts, shards, enemies, lockedZones, dialogue } = state;

      let colors = [...currentLevelData.skyColors];
      let bgColor = currentLevelData.bgColor;
      let starColor = currentLevelData.id === 3 ? '#db9c31' : currentLevelData.id === 4 ? '#ff0055' : '#ff7b00';
      
      let bgBuildingRow0 = currentLevelData.id === 3 ? '#230e26' : '#03050c';
      let bgBuildingRow1 = currentLevelData.id === 3 ? '#120414' : '#010208';
      let windowColor = currentLevelData.id === 3 ? 'rgba(219, 156, 49, 0.4)' : 'rgba(255, 80, 10, 0.4)';

      if (currentLevelData.id === 2) {
        // JOURNEY EFFECT for Level 2:
        // Transition deep background dynamically depending on player x progress!
        const progress = Math.min(1, Math.max(0, player.x / 4200));

        if (progress < 0.4) {
          const p = progress / 0.4;
          colors = [
            interpolateColor("#020b12", "#0a0604", p), // Sky color top
            interpolateColor("#011624", "#200d02", p), // Sky color high
            interpolateColor("#033230", "#552003", p), // Sky color horizon high
            interpolateColor("#00e5ff", "#ff7b00", p)  // Horizon neon glow (teal -> amber-orange)
          ];
          bgColor = interpolateColor("#010808", "#080301", p);
          starColor = interpolateColor("#00e5ff", "#ff7b00", p);
          bgBuildingRow0 = interpolateColor("#03050c", "#0b0401", p);
          bgBuildingRow1 = interpolateColor("#010208", "#050201", p);
          windowColor = `rgba(${Math.round(255 * p)}, ${Math.round(80 + 40 * p)}, ${Math.round(10 + p * 20)}, 0.45)`;
        } else {
          const p = (progress - 0.4) / 0.6;
          colors = [
            interpolateColor("#0a0604", "#0b0014", p), // Sky solid high
            interpolateColor("#200d02", "#1d012a", p), 
            interpolateColor("#552003", "#4c0044", p), 
            interpolateColor("#ff7b00", "#ff0088", p)  // Horizon glow (amber-orange -> reactor magenta)
          ];
          bgColor = interpolateColor("#080301", "#08000b", p);
          starColor = interpolateColor("#ff7b00", "#ff00a0", p);
          bgBuildingRow0 = interpolateColor("#0b0401", "#06010c", p);
          bgBuildingRow1 = interpolateColor("#050201", "#020006", p);
          windowColor = `rgba(${Math.round(255)}, ${Math.round(120 - 120 * p)}, ${Math.round(30 + p * 150)}, 0.45)`; // shifting to deep neon violet
        }
      }

      // 1. SKY BACKBONE GRADIENTS
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (currentLevelData.id === 6 || currentLevelData.id === 7 || currentLevelData.id === 8) {
        // --- 1. A. SUBTERRANEAN CAVERNS / SEWERS / TOWER INTERIOR BACKGROUNDS ---
        ctx.save();
        if (currentLevelData.id === 8) {
          // Mega-Tower Interior!
          // Floor color zones
          let zoneBg = '#010205'; // Floor 4 (Top)
          let gridColor = 'rgba(255, 0, 160, 0.1)';
          let accentPillars = '#10001a';
          
          if (player.y > 2700) { zoneBg = '#0a0000'; gridColor = 'rgba(255, 0, 0, 0.1)'; accentPillars = '#1a0000'; } // Floor 1 (Boss)
          else if (player.y > 1800) { zoneBg = '#000803'; gridColor = 'rgba(0, 255, 100, 0.1)'; accentPillars = '#001a05'; } // Floor 2
          else if (player.y > 900) { zoneBg = '#000508'; gridColor = 'rgba(0, 150, 255, 0.1)'; accentPillars = '#000a1a'; } // Floor 3

          ctx.fillStyle = zoneBg;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Tower structural beams (far back)
          const pLayer = 0.2;
          ctx.fillStyle = accentPillars;
          for (let pIdx = 0; pIdx < 10; pIdx++) {
            const startX = Math.floor((camera.x * pLayer - canvas.width) / 600) * 600;
            const px = startX + pIdx * 600 - camera.x * pLayer;
            ctx.fillRect(px, 0, 180, canvas.height);
          }

          // Distant windows
          ctx.fillStyle = gridColor;
          for (let row = 0; row < 12; row++) {
             const wy = (row * 120 - camera.y * 0.1) % canvas.height;
             for (let col = 0; col < 15; col++) {
                const wx = (col * 100 - camera.x * 0.1) % canvas.width;
                ctx.fillRect(wx, wy, 40, 80);
             }
          }
        } else if (currentLevelData.id === 6) {
          // Deep aquatic dark ocean cavern fill
          ctx.fillStyle = '#010e14';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Cavern pillars in parallax (deep oceanic teals)
          const pillars = [
            { spacing: 240, parallax: 0.12, w: 90, color: '#021a24' },
            { spacing: 380, parallax: 0.25, w: 140, color: '#042736' }
          ];
          pillars.forEach((p) => {
            const start = Math.floor((camera.x * p.parallax - canvas.width) / p.spacing) * p.spacing;
            ctx.fillStyle = p.color;
            for (let x = start; x < camera.x * p.parallax + canvas.width + p.spacing; x += p.spacing) {
              const screenX = x - camera.x * p.parallax;
              ctx.beginPath();
              ctx.moveTo(screenX, 0);
              ctx.quadraticCurveTo(screenX + p.w * 0.4, canvas.height * 0.5, screenX + 10, canvas.height);
              ctx.lineTo(screenX + p.w, canvas.height);
              ctx.quadraticCurveTo(screenX + p.w * 0.6, canvas.height * 0.5, screenX + p.w - 10, 0);
              ctx.fill();
            }
          });

          // Hanging organic vine stems / glowing nests
          for (let i = 0; i < 8; i++) {
            const vx = (i * 240 - camera.x * 0.18) % (canvas.width + 120) - 60;
            const length = 70 + (i % 3) * 45;
            
            ctx.strokeStyle = '#1b120c';
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(vx, 0);
            ctx.quadraticCurveTo(vx + Math.sin(state.frameCount * 0.02 + i) * 12, length * 0.5, vx + Math.sin(state.frameCount * 0.02 + i) * 6, length);
            ctx.stroke();

            // Sickly green nest sacs
            ctx.fillStyle = '#163121';
            ctx.beginPath();
            ctx.arc(vx + Math.sin(state.frameCount * 0.02 + i) * 6, length, 12 + (i % 2) * 5, 0, Math.PI * 2);
            ctx.fill();

            // Glow aura
            ctx.fillStyle = 'rgba(59, 252, 167, 0.2)';
            ctx.beginPath();
            ctx.arc(vx + Math.sin(state.frameCount * 0.02 + i) * 6, length, 24, 0, Math.PI * 2);
            ctx.fill();
          }

          // Spores drifting upwards
          ctx.fillStyle = '#3bfca7';
          for (let i = 0; i < 35; i++) {
            const speed = 0.5 + (i % 3) * 0.2;
            const sx = (i * 123 + state.frameCount * speed) % (canvas.width + 50) - 25;
            const sy = (canvas.height - (i * 61 + state.frameCount * speed * 2.5) % (canvas.height + 100));
            ctx.globalAlpha = 0.25 + Math.sin(state.frameCount * 0.04 + i) * 0.2;
            ctx.beginPath();
            ctx.arc(sx, sy, 1.5 + (i % 2), 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;

        } else {
          // Chemical Sewer Core background
          ctx.fillStyle = '#010504';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Massive mossy brick sewer rings in parallax
          const rings = [
            { spacing: 440, parallax: 0.1, radius: 260, color: '#031410' },
            { spacing: 580, parallax: 0.22, radius: 190, color: '#010907' }
          ];
          rings.forEach((r) => {
            const start = Math.floor((camera.x * r.parallax - canvas.width) / r.spacing) * r.spacing;
            ctx.strokeStyle = r.color;
            ctx.lineWidth = 26;
            for (let x = start; x < camera.x * r.parallax + canvas.width + r.spacing; x += r.spacing) {
              const screenX = x - camera.x * r.parallax;
              const cy = canvas.height * 0.45;
              ctx.beginPath();
              ctx.arc(screenX, cy, r.radius, 0, Math.PI * 2);
              ctx.stroke();

              // rivets
              ctx.fillStyle = '#000000';
              for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
                ctx.beginPath();
                ctx.arc(screenX + Math.cos(a) * r.radius, cy + Math.sin(a) * r.radius, 6, 0, Math.PI * 2);
                ctx.fill();
              }
            }
          });

          // Horizontal metal piping with pulsing green chemicals
          ctx.lineWidth = 14;
          ctx.strokeStyle = '#051814';
          ctx.beginPath();
          ctx.moveTo(0, canvas.height * 0.25);
          ctx.lineTo(canvas.width, canvas.height * 0.25);
          ctx.stroke();

          ctx.lineWidth = 4;
          ctx.strokeStyle = '#3bfca7';
          ctx.shadowColor = '#3bfca7';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.setLineDash([20, 40]);
          ctx.lineDashOffset = -(state.frameCount * 2.2) % 60;
          ctx.moveTo(0, canvas.height * 0.25);
          ctx.lineTo(canvas.width, canvas.height * 0.25);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.shadowBlur = 0;

          // Toxic dripping droplets in background
          ctx.fillStyle = '#ff3b5f';
          for (let i = 0; i < 6; i++) {
            const dx = (i * 280) % canvas.width;
            const dy = (state.frameCount * (2 + i % 2) + i * 150) % (canvas.height + 100) - 50;
            ctx.beginPath();
            ctx.arc(dx, dy, 2.5 + (i % 2), 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
      } else {
        // --- 1. B. STANDARD RETRO SKYLINE MOON AND SKY PARTICLES ---
        ctx.save();
        const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
        sky.addColorStop(0, colors[0]);
        sky.addColorStop(0.4, colors[1]);
        sky.addColorStop(0.7, colors[2]);
        sky.addColorStop(1, colors[3]);
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // MOON
        const moonX = canvas.width * 0.65 - camera.x * 0.02;
        const moonY = 150 - camera.y * 0.02;
        const moonGlow = ctx.createRadialGradient(moonX, moonY, 10, moonX, moonY, 140);
        moonGlow.addColorStop(0, currentLevelData.id === 2 ? (colors[3] + "CC") : currentLevelData.moonColor);
        moonGlow.addColorStop(0.4, currentLevelData.id === 2 ? (colors[2] + "66") : currentLevelData.id === 3 ? 'rgba(255, 120, 10, 0.4)' : 'rgba(0, 150, 200, 0.4)');
        moonGlow.addColorStop(1, 'rgba(0, 50, 100, 0)');
        ctx.fillStyle = moonGlow;
        ctx.beginPath();
        ctx.arc(moonX, moonY, 140, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = currentLevelData.id === 3 ? '#ffe6ad' : '#ccffff';
        ctx.beginPath();
        ctx.arc(moonX, moonY, 45, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = currentLevelData.id === 3 ? 'rgba(219, 156, 49, 0.35)' : 'rgba(0, 100, 150, 0.3)';
        ctx.beginPath(); ctx.arc(moonX - 10, moonY - 5, 12, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(moonX + 15, moonY + 12, 18, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(moonX - 8, moonY + 18, 8, 0, Math.PI * 2); ctx.fill();

        // RISING ASHES / SPARKS OF METROPOLIS / STEAM CURRENT RINGS
        for (let i = 0; i < 90; i++) {
          const speed = 1 + (i % 3) * 0.5;
          const x = (i * 137 + state.frameCount * speed - camera.x * 0.4) % (canvas.width + 100) - 50;
          const y = (canvas.height + 100 - (i * 71 + state.frameCount * speed * 2 - camera.y * 0.2) % (canvas.height + 200)) - 50;
          const sway = Math.sin(state.frameCount * 0.02 + i) * 20;
          const size = (i % 3) + 1.5;
          ctx.globalAlpha = 0.3 + Math.sin(state.frameCount * 0.05 + i) * 0.2;
          if (currentLevelData.id === 3) {
            ctx.strokeStyle = '#db9c31';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(x + sway, y, size + 1.2, 0, Math.PI * 2);
            ctx.stroke();
          } else {
            ctx.fillStyle = starColor;
            ctx.fillRect(x + sway, y, size, size);
          }
        }
        ctx.globalAlpha = 1;

        // PARALLAX BACKGROUND BUILDINGS
        const buildingRows = [
          { y: 650, baseH: 200, step: 200, parallax: 0.1, color: bgBuildingRow0 },
          { y: 700, baseH: 350, step: 350, parallax: 0.25, color: bgBuildingRow1 },
          { y: 750, baseH: 500, step: 400, parallax: 0.5, color: '#000000' }
        ];

        buildingRows.forEach((row) => {
          const start = Math.floor((camera.x * row.parallax - canvas.width) / row.step) * row.step;
          ctx.fillStyle = row.color;
          for (let x = start; x < camera.x * row.parallax + canvas.width + row.step; x += row.step) {
            const screenX = x - camera.x * row.parallax;
            const h = row.baseH + (Math.abs(Math.sin(x * 0.015)) * 120 | 0);
            const w = row.step * (0.6 + Math.abs(Math.cos(x * 0.01)) * 0.3);
            const drawY = row.y - h - camera.y * row.parallax * 0.15;
            ctx.fillRect(screenX, drawY, w, h);

            // Retro skyline outlines
            ctx.beginPath();
            ctx.moveTo(screenX, drawY);
            ctx.lineTo(screenX + w * 0.3, drawY + 20);
            ctx.lineTo(screenX + w * 0.6, drawY - 10);
            ctx.lineTo(screenX + w, drawY + 30);
            ctx.lineTo(screenX + w, drawY + 50);
            ctx.lineTo(screenX, drawY + 50);
            ctx.fill();

            // Cyber Window yellow-orange squares
            for (let i = 0; i < 4; i++) {
              if ((i + Math.floor(x / row.step)) % 4 === 0) {
                ctx.fillStyle = windowColor;
                ctx.fillRect(screenX + 30 + i * 35, drawY + 60 + i * 25, 8, 16);
                ctx.fillStyle = row.color;
              }
            }
          }
        });
        ctx.restore();
      }

      // CAMERA & GAMEPLAY TRANSLATE COORDINATES
      ctx.save();
      ctx.translate(-camera.x + state.screenShake.x, -camera.y + state.screenShake.y);

      // Arena zone boundaries
      state.roomZones.forEach((room) => {
        ctx.fillStyle = room.id === state.roomZones[0].id ? 'rgba(255, 69, 0, 0.01)' : 'rgba(255, 255, 255, 0.005)';
        ctx.fillRect(room.x, -260, room.w, 1400);
        ctx.strokeStyle = 'rgba(255, 69, 0, 0.05)';
        ctx.strokeRect(room.x, -260, room.w, 1400);
      });

      // Room decoration & industrial mechanics for Ventilation Battery (Level 3)
      if (currentLevelData.id === 3) {
        ctx.save();
        
        // 0. Inner Building Brick walls, Window panes, Stairs, and Floor girders
        ctx.fillStyle = '#1c0e24'; // Deep inner lab wall color
        ctx.fillRect(-400, -200, 6000, 1000);

        // Grid lines on walls representing large steel plate panels
        ctx.strokeStyle = '#0e0513';
        ctx.lineWidth = 1.5;
        for (let wx = -400; wx < 5600; wx += 200) {
          ctx.beginPath();
          ctx.moveTo(wx, -200);
          ctx.lineTo(wx, 800);
          ctx.stroke();
        }
        for (let wy = -200; wy < 800; wy += 150) {
          ctx.beginPath();
          ctx.moveTo(-400, wy);
          ctx.lineTo(5600, wy);
          ctx.stroke();
        }

        // Draw background staircases leading up to resting catwalk structures
        ctx.strokeStyle = '#230a30';
        ctx.lineWidth = 3.5;
        for (let sx = 600; sx < 5200; sx += 1200) {
          ctx.beginPath();
          // Catwalk stairs handrail
          ctx.moveTo(sx, 550);
          ctx.lineTo(sx + 250, 250);
          ctx.stroke();
          // Individual stair steps
          for (let step = 0; step <= 10; step++) {
            const stepX = sx + step * 25;
            const stepY = 550 - step * 30;
            ctx.beginPath();
            ctx.moveTo(stepX, stepY);
            ctx.lineTo(stepX + 25, stepY);
            ctx.stroke();
          }
        }

        // Draw glowing golden cyberpunk windows showing external outlines
        for (let wx = 100; wx < 5400; wx += 800) {
          // Window frames
          ctx.fillStyle = '#09010a';
          ctx.fillRect(wx, 120, 110, 160);
          ctx.strokeStyle = '#db9c31';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(wx, 120, 110, 160);

          // Glowing window cross bars
          ctx.strokeStyle = 'rgba(219, 156, 49, 0.45)';
          ctx.beginPath();
          ctx.moveTo(wx + 55, 120);
          ctx.lineTo(wx + 55, 280);
          ctx.moveTo(wx, 200);
          ctx.lineTo(wx + 110, 200);
          ctx.stroke();
        }
        
        // 1. Structural support background beams (Steel crossing trusses)
        ctx.strokeStyle = '#29142f'; // dark metallic violet
        ctx.lineWidth = 3;
        const trussSpacing = 440;
        for (let bx = -400; bx < 4800; bx += trussSpacing) {
          // X-Truss supports
          ctx.beginPath();
          ctx.moveTo(bx, -100);
          ctx.lineTo(bx + trussSpacing, 550);
          ctx.moveTo(bx + trussSpacing, -100);
          ctx.lineTo(bx, 550);
          ctx.stroke();

          // Horizontal beam line
          ctx.beginPath();
          ctx.moveTo(bx, 150);
          ctx.lineTo(bx + trussSpacing, 150);
          ctx.stroke();
        }

        // 2. Industrial pipelines (Copper and Silver gradients)
        const drawPipe = (x1: number, y1: number, x2: number, y2: number, diameter: number, colorType: 'gold' | 'silver') => {
          ctx.save();
          const pipeGrad = ctx.createLinearGradient(x1, y1, x2, y2);
          if (colorType === 'gold') {
            pipeGrad.addColorStop(0, '#5e3708');
            pipeGrad.addColorStop(0.3, '#db9c31');
            pipeGrad.addColorStop(0.6, '#ffd58c');
            pipeGrad.addColorStop(0.8, '#a87114');
            pipeGrad.addColorStop(1, '#3b2403');
          } else {
            pipeGrad.addColorStop(0, '#1c202b');
            pipeGrad.addColorStop(0.3, '#757c8b');
            pipeGrad.addColorStop(0.6, '#d9e0eb');
            pipeGrad.addColorStop(0.8, '#525a69');
            pipeGrad.addColorStop(1, '#11151c');
          }
          ctx.fillStyle = pipeGrad;
          ctx.fillRect(
            Math.min(x1, x2) - (x1 === x2 ? diameter/2 : 0), 
            Math.min(y1, y2) - (y1 === y2 ? diameter/2 : 0), 
            Math.abs(x2 - x1) || diameter, 
            Math.abs(y2 - y1) || diameter
          );
          
          // Joint flanges/brackets
          ctx.fillStyle = colorType === 'gold' ? '#db9c31' : '#757c8b';
          ctx.strokeStyle = '#05070a';
          ctx.lineWidth = 1.2;
          const numJoints = 3;
          if (x1 === x2) {
            // Vertical pipe joints
            const stepY = Math.abs(y2 - y1) / numJoints;
            for (let j = 0; j <= numJoints; j++) {
              const jy = Math.min(y1, y2) + j * stepY;
              ctx.fillRect(x1 - diameter * 0.7, jy - 3, diameter * 1.4, 6);
              ctx.strokeRect(x1 - diameter * 0.7, jy - 3, diameter * 1.4, 6);
            }
          } else {
            // Horizontal pipe joints
            const stepX = Math.abs(x2 - x1) / numJoints;
            for (let j = 0; j <= numJoints; j++) {
              const jx = Math.min(x1, x2) + j * stepX;
              ctx.fillRect(jx - 3, y1 - diameter * 0.7, 6, diameter * 1.4);
              ctx.strokeRect(jx - 3, y1 - diameter * 0.7, 6, diameter * 1.4);
            }
          }
          ctx.restore();
        };

        // Draw background horizontal and vertical pipes
        drawPipe(-200, 200, 4800, 200, 16, 'silver');
        drawPipe(-200, 310, 4800, 310, 12, 'gold');
        drawPipe(-200, 70, 4800, 70, 22, 'silver');

        drawPipe(450, -200, 450, 700, 16, 'gold');
        drawPipe(1650, -200, 1650, 700, 20, 'silver');
        drawPipe(2850, -200, 2850, 700, 16, 'gold');
        drawPipe(3800, -200, 3800, 700, 24, 'silver');

        // 3. Rotating giant ventilation fan blades
        const fans = [
          { x: 300, y: 150, r: 42 },
          { x: 1450, y: 120, r: 55 },
          { x: 2500, y: 180, r: 48 },
          { x: 3500, y: 110, r: 52 }
        ];
        fans.forEach((fan) => {
          ctx.save();
          // Draw outer fan frame rim
          ctx.fillStyle = '#1c1e2b';
          ctx.strokeStyle = '#db9c31';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(fan.x, fan.y, fan.r + 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Draw dark vent backdrop
          ctx.fillStyle = '#0a030f';
          ctx.beginPath();
          ctx.arc(fan.x, fan.y, fan.r, 0, Math.PI * 2);
          ctx.fill();

          // Draw rotating blades
          ctx.translate(fan.x, fan.y);
          const rotationAngle = state.frameCount * 0.035;
          ctx.rotate(rotationAngle);
          
          ctx.fillStyle = '#4c5366';
          for (let b = 0; b < 4; b++) {
            ctx.rotate(Math.PI / 2);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(fan.r * 0.35, -fan.r * 0.18, fan.r * 0.95, -fan.r * 0.08);
            ctx.lineTo(fan.r * 0.8, -fan.r * 0.35);
            ctx.closePath();
            ctx.fill();
          }

          // Bullet core hub
          ctx.fillStyle = '#db9c31';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(0, 0, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.restore();
        });

        ctx.restore();
      }

      // Platform Renderings
      platforms.forEach((plat) => {
        const isActive = platformIsActive(plat, player);
        if (plat.type === 'floor' || plat.type === 'wall') {
          if (currentLevelData.id === 3) {
            ctx.save();
            // 3D metallic vertical shading gradient
            const grad = ctx.createLinearGradient(plat.x, plat.y, plat.x, plat.y + plat.h);
            grad.addColorStop(0, '#757c8b');
            grad.addColorStop(0.3, '#c9d0db');
            grad.addColorStop(0.5, '#404a5c');
            grad.addColorStop(1, '#1b2029');
            ctx.fillStyle = grad;
            ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
            
            // Gold border or hazard lines at the edge
            ctx.fillStyle = '#db9c31';
            ctx.fillRect(plat.x, plat.y, plat.w, Math.min(6, plat.h));

            // Hazard warning diagonal lines at top
            ctx.fillStyle = '#0a030f';
            const stripeSpacing = 20;
            for (let sx = plat.x + 10; sx < plat.x + plat.w - 10; sx += stripeSpacing) {
              ctx.beginPath();
              ctx.moveTo(sx, plat.y);
              ctx.lineTo(sx + 5, plat.y);
              ctx.lineTo(sx, plat.y + 6);
              ctx.lineTo(sx - 5, plat.y + 6);
              ctx.closePath();
              ctx.fill();
            }

            // Outline of the panel
            ctx.strokeStyle = '#2d3342';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);

            // Metal plate corner rivets
            if (plat.w >= 24 && plat.h >= 24) {
              ctx.fillStyle = '#f0f3f8';
              ctx.strokeStyle = '#323947';
              ctx.lineWidth = 1;
              const drawRivet = (cx: number, cy: number) => {
                ctx.beginPath();
                ctx.arc(cx, cy, 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
              };
              drawRivet(plat.x + 8, plat.y + 14);
              drawRivet(plat.x + plat.w - 8, plat.y + 14);
              if (plat.h >= 60) {
                drawRivet(plat.x + 8, plat.y + plat.h - 10);
                drawRivet(plat.x + plat.w - 8, plat.y + plat.h - 10);
              }
            }
            ctx.restore();
            return;
          } else {
            ctx.save();
            if (currentLevelData.id === 1) {
              // Level 1: Cyber Lab cold steel plate with neon light circuits
              ctx.fillStyle = '#0b1624';
              ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
              ctx.strokeStyle = '#00c3ff';
              ctx.lineWidth = 1.5;
              ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
              ctx.fillStyle = 'rgba(0, 195, 255, 0.6)';
              ctx.fillRect(plat.x + 10, plat.y + 2, plat.w - 20, 2);
            } else if (currentLevelData.id === 2) {
              // Level 2: Magma city obsidian blocks with orange volcanic cracks
              ctx.fillStyle = '#1c0a06';
              ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
              ctx.strokeStyle = '#ff5100';
              ctx.lineWidth = 2;
              ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
              ctx.strokeStyle = 'rgba(255, 170, 0, 0.5)';
              ctx.lineWidth = 1;
              for (let cy = plat.y + 12; cy < plat.y + plat.h; cy += 18) {
                ctx.beginPath();
                ctx.moveTo(plat.x + 6, cy);
                ctx.lineTo(plat.x + plat.w - 6, cy);
                ctx.stroke();
              }
            } else if (currentLevelData.id === 4) {
              // Level 4: Singularity Void matte dark core with crimson outer border
              ctx.fillStyle = '#080003';
              ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
              ctx.strokeStyle = '#ff003c';
              ctx.lineWidth = 2;
              ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
              ctx.fillStyle = 'rgba(255, 0, 60, 0.3)';
              ctx.fillRect(plat.x + 4, plat.y + 4, plat.w - 8, 3);
            } else if (currentLevelData.id === 5) {
              // Level 5: Iron refinery automated steel girders
              ctx.fillStyle = '#181f2b';
              ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
              ctx.strokeStyle = '#00e5ff';
              ctx.lineWidth = 1.8;
              ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
              // diagonal support hatch drawing
              ctx.strokeStyle = 'rgba(0, 229, 255, 0.25)';
              ctx.beginPath();
              ctx.moveTo(plat.x, plat.y);
              ctx.lineTo(plat.x + plat.w, plat.y + plat.h);
              ctx.stroke();
            } else if (currentLevelData.id === 6) {
              // Level 6: Flooded Sub-Lab ruined mossy stone columns
              ctx.fillStyle = '#02181f';
              ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
              ctx.strokeStyle = '#009bb3';
              ctx.lineWidth = 2.5;
              ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
              // mossy seaweed loops floating
              ctx.fillStyle = 'rgba(0, 229, 255, 0.18)';
              for (let mx = plat.x + 10; mx < plat.x + plat.w - 10; mx += 35) {
                ctx.beginPath();
                ctx.arc(mx, plat.y + 6, 4, 0, Math.PI, true);
                ctx.fill();
              }
            } else if (currentLevelData.id === 7) {
              // Level 7: Toxic Chemical Sewer slimy sludge pipes
              ctx.fillStyle = '#051f14';
              ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
              ctx.strokeStyle = '#128c51';
              ctx.lineWidth = 2;
              ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
              ctx.fillStyle = 'rgba(59, 252, 167, 0.22)';
              ctx.fillRect(plat.x, plat.y + plat.h - 8, plat.w, 5);
            } else if (currentLevelData.id === 8) {
              // Level 8: Tower interior floors
              ctx.lineWidth = 2;
              if (plat.y > 2700) {
                // Boss floor (Red)
                ctx.fillStyle = '#0a0000';
                ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
                ctx.strokeStyle = '#330000';
                ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
                ctx.fillStyle = '#cc0000';
                ctx.fillRect(plat.x, plat.y, plat.w, 4);
              } else if (plat.y > 1800) {
                // Security floor (Green)
                ctx.fillStyle = '#000a02';
                ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
                ctx.strokeStyle = '#003311';
                ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
                ctx.fillStyle = '#00cc33';
                ctx.fillRect(plat.x, plat.y, plat.w, 4);
              } else if (plat.y > 900) {
                // Labs floor (Blue)
                ctx.fillStyle = '#00040a';
                ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
                ctx.strokeStyle = '#001a33';
                ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
                ctx.fillStyle = '#0088cc';
                ctx.fillRect(plat.x, plat.y, plat.w, 4);
              } else {
                // Neon floor (Pink)
                ctx.fillStyle = '#0a000a';
                ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
                ctx.strokeStyle = '#220033';
                ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
                ctx.fillStyle = '#df0088';
                ctx.fillRect(plat.x, plat.y, plat.w, 4);
              }
            } else {
              // Basic fallback metallic structure
              ctx.fillStyle = '#121824';
              ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
            }
            ctx.restore();
            return;
          }
        } else if (plat.type === 'truthPlatform' || plat.type === 'falsePlatform') {
          ctx.save();
          if (isActive) {
            ctx.fillStyle = plat.type === 'truthPlatform' ? 'rgba(0, 229, 255, 0.35)' : 'rgba(255, 59, 95, 0.35)';
            ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
            ctx.strokeStyle = plat.type === 'truthPlatform' ? '#00e5ff' : '#ff3b5f';
            ctx.lineWidth = 3;
            ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
          } else {
            ctx.strokeStyle = plat.type === 'truthPlatform' ? 'rgba(0, 229, 255, 0.18)' : 'rgba(255, 59, 95, 0.18)';
            ctx.setLineDash([4, 4]);
            ctx.lineWidth = 1.5;
            ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
          }
          ctx.restore();
          return;
        } else if (plat.type === 'laser_fence') {
          // Dynamic electricity laser fences of Level 2 and Level 3!
          ctx.save();
          const laserGlowColor = plat.color === 'truth' ? '#00e5ff' : '#ff3b5f';
          ctx.strokeStyle = laserGlowColor;
          ctx.shadowColor = laserGlowColor;
          ctx.shadowBlur = 12;
          ctx.lineWidth = 3;
          
          // Outer lightning boundary bars
          ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
          
          // Jagged laser beam arcing inside
          ctx.beginPath();
          ctx.moveTo(plat.x + plat.w/2, plat.y);
          const segments = 6;
          for (let s = 1; s <= segments; s++) {
            const tempY = plat.y + (plat.h / segments) * s;
            const tempX = plat.x + plat.w/2 + (Math.sin(state.frameCount * 0.3 + s) * 8);
            ctx.lineTo(tempX, tempY);
          }
          ctx.stroke();
          ctx.restore();
          return;
        } else if (plat.type === 'barrier' || plat.type === 'arenaWall') {
          // If it's a barrier that's not active, don't draw it at all!
          if (plat.type === 'barrier' && !isActive) return;

          ctx.save();
          
          if (currentLevelData.id === 6 || currentLevelData.id === 7) {
             // Aquatic/Toxic forcefield (teal/green)
             const color = currentLevelData.id === 6 ? '#00e5ff' : '#3bfca7';
             ctx.fillStyle = `rgba(${currentLevelData.id === 6 ? '0,229,255' : '59,252,167'}, 0.1)`;
             ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
             
             ctx.strokeStyle = color;
             ctx.lineWidth = 1;
             ctx.beginPath();
             for (let y = plat.y; y < plat.y + plat.h; y += 40) {
               ctx.moveTo(plat.x, y + (state.frameCount % 40));
               ctx.lineTo(plat.x + plat.w, y + (state.frameCount % 40));
             }
             ctx.stroke();
             // Edge glowing rods
             ctx.fillRect(plat.x, plat.y, 4, plat.h);
             ctx.fillRect(plat.x + plat.w - 4, plat.y, 4, plat.h);
          } else {
             // Standard red holographic lockdown barrier
             ctx.fillStyle = 'rgba(255, 10, 50, 0.15)';
             ctx.fillRect(plat.x, plat.y, plat.w, plat.h);

             // Hexagonal or lined grid effect
             ctx.strokeStyle = 'rgba(255, 10, 50, 0.4)';
             ctx.lineWidth = 2;
             ctx.beginPath();
             const scanlineY = plat.y + ((state.frameCount * 2) % plat.h);
             ctx.moveTo(plat.x, scanlineY);
             ctx.lineTo(plat.x + plat.w, scanlineY);
             ctx.stroke();

             ctx.fillStyle = '#ff003c';
             ctx.fillRect(plat.x, plat.y, 6, plat.h); // Left heavy rod
             ctx.fillRect(plat.x + plat.w - 6, plat.y, 6, plat.h); // Right heavy rod
          }
          ctx.restore();
          return;
        } else if (plat.type === 'elevator' || plat.type === 'shuttle') {
          if (currentLevelData.id === 3) {
            ctx.save();
            // Golden/Bronze metallic lifts
            const elevGrad = ctx.createLinearGradient(plat.x, plat.y, plat.x, plat.y + plat.h);
            elevGrad.addColorStop(0, '#db9c31');
            elevGrad.addColorStop(0.5, '#7c5310');
            elevGrad.addColorStop(1, '#db9c31');
            ctx.fillStyle = elevGrad;
            ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
            
            ctx.fillStyle = '#221100';
            ctx.fillRect(plat.x + 10, plat.y + 3, plat.w - 20, 5);
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
            ctx.restore();
            return;
          } else if (currentLevelData.id === 8) {
            ctx.save();
            ctx.fillStyle = '#050511';
            ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
            ctx.fillStyle = '#ffd500'; // Industrial elevator warning stripes
            ctx.fillRect(plat.x, plat.y, plat.w, 4);
            ctx.fillStyle = '#ff00aa'; // Pink neon track lines on elevators
            ctx.fillRect(plat.x + plat.w/2 - 2, plat.y, 4, plat.h);
            ctx.strokeStyle = '#555577';
            ctx.lineWidth = 2;
            ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
            ctx.restore();
            return;
          } else {
            ctx.fillStyle = '#1c1f2b';
            ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
            ctx.fillStyle = '#4e5670';
            ctx.fillRect(plat.x + 10, plat.y + 3, plat.w - 20, 5);
          }
        }

        ctx.fillStyle = '#334455';
        ctx.fillRect(plat.x, plat.y, plat.w, Math.min(6, plat.h));
        ctx.strokeStyle = '#05070a';
        ctx.lineWidth = 2;
        ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
      });

      // Render active destructibles
      if (state.destructibles) {
        state.destructibles.forEach((dest) => {
          if (dest.hp <= 0) return;

          ctx.save();
          const isCrate = dest.type === 'crate';

          if (isCrate) {
            // Draw wooden crate
            const grad = ctx.createLinearGradient(dest.x, dest.y, dest.x + dest.w, dest.y + dest.h);
            grad.addColorStop(0, '#a56c34');
            grad.addColorStop(1, '#663f10');
            ctx.fillStyle = grad;
            ctx.fillRect(dest.x, dest.y, dest.w, dest.h);

            // Draw crate border
            ctx.strokeStyle = '#3d2402';
            ctx.lineWidth = 3;
            ctx.strokeRect(dest.x, dest.y, dest.w, dest.h);

            // Cross reinforcement beams inside the crate structure
            ctx.beginPath();
            ctx.moveTo(dest.x + 4, dest.y + 4);
            ctx.lineTo(dest.x + dest.w - 4, dest.y + dest.h - 4);
            ctx.moveTo(dest.x + dest.w - 4, dest.y + 4);
            ctx.lineTo(dest.x + 4, dest.y + dest.h - 4);
            ctx.strokeStyle = '#3d2402';
            ctx.lineWidth = 2;
            ctx.stroke();
          } else {
            // Draw industrial security brick or breakable wall block
            const grad = ctx.createLinearGradient(dest.x, dest.y, dest.x, dest.y + dest.h);
            grad.addColorStop(0, '#536270');
            grad.addColorStop(1, '#2c353e');
            ctx.fillStyle = grad;
            ctx.fillRect(dest.x, dest.y, dest.w, dest.h);

            // Grid plates pattern
            ctx.strokeStyle = '#181e25';
            ctx.lineWidth = 2;
            ctx.strokeRect(dest.x, dest.y, dest.w, dest.h);

            // Crack lines showing damaged status based on hit points
            if (dest.maxHp && dest.hp < dest.maxHp) {
              const damageRatio = dest.hp / dest.maxHp;
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              if (damageRatio <= 0.7) {
                // Simple crack lines
                ctx.moveTo(dest.x + 5, dest.y + 5);
                ctx.lineTo(dest.x + dest.w / 2, dest.y + dest.h / 2);
                ctx.lineTo(dest.x + dest.w - 10, dest.y + dest.h - 5);
              }
              if (damageRatio <= 0.4) {
                // Deeper splinter cracks
                ctx.moveTo(dest.x + dest.w - 5, dest.y + 10);
                ctx.lineTo(dest.x + dest.w / 2, dest.y + dest.h / 2);
                ctx.lineTo(dest.x + 10, dest.y + dest.h - 8);
              }
              ctx.stroke();
            }
          }

          // Subtle neon light indicator
          ctx.fillStyle = '#3bfca7';
          ctx.beginPath();
          ctx.arc(dest.x + dest.w / 2, dest.y + 6, 2.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        });
      }

      // Phase catalysts rendering
      phaseCatalysts.forEach((cat) => {
        const available = cat.cooldown === 0;
        ctx.save();
        ctx.translate(cat.x, cat.y);
        cat.pulse += 0.06;
        ctx.rotate(cat.pulse);
        const activeColor = cat.kind === 'truth' ? '#00e5ff' : '#ff3b5f';
        ctx.fillStyle = available ? activeColor : 'rgba(40, 40, 40, 0.35)';
        ctx.strokeStyle = available ? '#ffffff' : 'rgba(100, 100, 100, 0.2)';
        ctx.lineWidth = available ? 2 : 1;

        ctx.beginPath();
        ctx.moveTo(0, -cat.r);
        ctx.lineTo(cat.r * 0.7, 0);
        ctx.lineTo(0, cat.r);
        ctx.lineTo(-cat.r * 0.7, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        if (available) {
          ctx.shadowColor = activeColor;
          ctx.shadowBlur = 15;
          ctx.strokeStyle = activeColor;
          ctx.strokeRect(-cat.r * 0.3, -cat.r * 0.3, cat.r * 0.6, cat.r * 0.6);
        }
        ctx.restore();
      });

      // Shard collectibles
      shards.forEach((shard) => {
        if (shard.collected) return;
        ctx.save();
        ctx.beginPath();
        ctx.fillStyle = shard.kind === 'truth' ? '#50dcff' : '#ff3b5f';
        ctx.arc(shard.x, shard.y, shard.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowColor = ctx.fillStyle as string;
        ctx.shadowBlur = 15;
        ctx.strokeStyle = '#ffffff';
         ctx.stroke();
        ctx.restore();
      });

      // Fire branding hazard flames
      stateRef.current.fireSources = currentLevelData.fireSources;
      stateRef.current.fireSources.forEach((fire) => {
        drawFlame(ctx, fire.x, fire.y, fire.size, state.frameCount);
      });

      // Enemies rendering
      enemies.forEach((enemy) => {
        if (!enemy.alive) return;
        ctx.save();

        const facingRight = (enemy as any).facingRight !== undefined ? (enemy as any).facingRight : (enemy.vx >= 0);
        const center = { x: enemy.x + enemy.w / 2, y: enemy.y + enemy.h / 2 };
        const phaseColor = enemy.zoneId === 'truth' ? '#00e5ff' : enemy.zoneId === 'false' ? '#ff3b5f' : '#ff0055';

        // Stagger/vibration offset if frozen or damaged
        const frozen = enemy.frozenTimer > 0;
        let shakeOffsetX = 0;
        let shakeOffsetY = 0;
        if (frozen) {
          shakeOffsetX = Math.sin(state.frameCount * 0.45) * 2.5;
        }

        ctx.translate(center.x + shakeOffsetX, center.y + shakeOffsetY);
        ctx.scale(facingRight ? 1 : -1, 1);

        const frameNum = state.frameCount;

        if (enemy.type === 'drone') {
          // --- 1. POLISHED DETAILED HOVERING DRONE ---
          const hoverY = Math.sin(frameNum * 0.12 + enemy.x * 0.05) * 4.5;
          ctx.translate(0, hoverY);

          // Active pulse core shield boundary rings
          ctx.strokeStyle = phaseColor;
          ctx.lineWidth = 2;
          ctx.shadowColor = phaseColor;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(0, 0, 16, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Drone Core Body sphere (Metal sphere gradient)
          const radGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, 10);
          radGrad.addColorStop(0, '#506072');
          radGrad.addColorStop(0.7, '#1b2531');
          radGrad.addColorStop(1, '#050a10');
          ctx.fillStyle = radGrad;
          ctx.beginPath();
          ctx.arc(0, 0, 11, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.strokeStyle = '#2b394f';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Outer hovering wing brackets (rotating / opening depending on distance)
          ctx.save();
          ctx.strokeStyle = '#3a4b64';
          ctx.lineWidth = 2.5;
          ctx.lineCap = 'round';
          
          // Left bracket
          ctx.beginPath();
          ctx.arc(-13, 0, 8, -Math.PI / 2, Math.PI / 2, true);
          ctx.stroke();

          // Right bracket
          ctx.beginPath();
          ctx.arc(13, 0, 8, -Math.PI / 2, Math.PI / 2, false);
          ctx.stroke();
          ctx.restore();

          // Active scanning single laser eye visor
          ctx.fillStyle = phaseColor;
          ctx.shadowColor = phaseColor;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          const scanSweep = Math.sin(frameNum * 0.08) * 4;
          ctx.arc(4 + scanSweep * 0.3, -2, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

        } else if (enemy.type === 'knight') {
          // --- 2. POLISHED PLATED BIO-MECHANICAL KNIGHT ---
          const walking = Math.abs(enemy.vx) > 0.1;
          const cycle = walking ? (frameNum * 0.15 + enemy.x * 0.05) : 0;
          const bob = walking ? Math.abs(Math.sin(cycle)) * 3 : Math.sin(frameNum * 0.04) * 1.2;

          ctx.translate(0, bob);

          // Draw heavy mechanical plated feet
          ctx.fillStyle = '#0a0d14';
          ctx.strokeStyle = '#283244';
          ctx.lineWidth = 2;

          const leftFootX = -10 + (walking ? Math.sin(cycle) * 7 : -3);
          const rightFootX = 10 + (walking ? Math.cos(cycle) * 7 : 3);
          const footY = enemy.h / 2 - 4;

          ctx.beginPath(); ctx.ellipse(leftFootX, footY, 6, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.ellipse(rightFootX, footY, 6, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

          // Plated Joint Connectors
          ctx.strokeStyle = '#ff3366';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(leftFootX, footY - 2);
          ctx.lineTo(-4, footY - 14);
          ctx.moveTo(rightFootX, footY - 2);
          ctx.lineTo(4, footY - 14);
          ctx.stroke();

          // Knight Torso body (Heavy metal block/shield structure)
          const bodyGrad = ctx.createLinearGradient(-15, -enemy.h / 2, 15, enemy.h / 2);
          bodyGrad.addColorStop(0, '#1a1f2c');
          bodyGrad.addColorStop(0.5, '#0e111a');
          bodyGrad.addColorStop(1, '#030508');
          ctx.fillStyle = bodyGrad;
          ctx.strokeStyle = '#4e5b75';
          ctx.lineWidth = 2.5;

          // Drawing hexagonal torso plate bounds
          ctx.beginPath();
          ctx.moveTo(-16, -14);
          ctx.lineTo(12, -14);
          ctx.lineTo(16, 12);
          ctx.lineTo(-12, 12);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Visor scan eye line
          ctx.strokeStyle = '#ff1144';
          ctx.shadowColor = '#ff1144';
          ctx.shadowBlur = 8;
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(0, -6);
          ctx.lineTo(12, -6);
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Glowing reactor cell emblem in torso middle
          ctx.fillStyle = phaseColor;
          ctx.beginPath();
          ctx.arc(-2, 2, 3, 0, Math.PI * 2);
          ctx.fill();

          // Active sword held by the bio-knight
          ctx.save();
          ctx.translate(10, 2);
          const bladeRot = (enemy as any).shootTimer && (enemy as any).shootTimer < 15 
            ? -Math.PI / 4 + ((15 - (enemy as any).shootTimer) / 15) * Math.PI 
            : Math.PI / 5 + Math.sin(frameNum * 0.05) * 0.08;
          ctx.rotate(bladeRot);

          // Render neon claymore blade
          ctx.strokeStyle = phaseColor;
          ctx.shadowColor = phaseColor;
          ctx.shadowBlur = 10;
          ctx.lineWidth = 5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(24, -24);
          ctx.stroke();

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(22, -22);
          ctx.stroke();
          ctx.restore();

        } else if (enemy.type === 'laser_eye') {
          // --- 3. POLISHED HEAVY MOUNTED GUN TURRET PANEL ---
          const dx = player.x + player.width / 2 - center.x;
          const dy = player.y + player.height / 2 - center.y;
          const aimAngle = Math.atan2(dy, Math.abs(dx));

          // Draw sturdy mechanical ceiling bracket base
          ctx.fillStyle = '#0f141d';
          ctx.strokeStyle = '#344055';
          ctx.lineWidth = 3;
          ctx.fillRect(-18, -enemy.h / 2, 36, 12);
          ctx.strokeRect(-18, -enemy.h / 2, 36, 12);

          // Rotary hydraulic arm
          ctx.fillStyle = '#1e2530';
          ctx.fillRect(-6, -enemy.h / 2 + 12, 12, 12);

          ctx.translate(0, 5);
          ctx.rotate(aimAngle);

          // Gun sphere camera scanner
          const camGrad = ctx.createRadialGradient(-2, -2, 2, 0, 0, 12);
          camGrad.addColorStop(0, '#53657a');
          camGrad.addColorStop(0.8, '#1b232e');
          camGrad.addColorStop(1, '#05070a');
          ctx.fillStyle = camGrad;
          ctx.strokeStyle = '#4e5b75';
          ctx.beginPath();
          ctx.arc(0, 0, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Gun muzzle barrel pointing forward
          ctx.fillStyle = '#ff1144';
          ctx.fillRect(10, -3.5, 12, 7);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(10, -3.5, 12, 7);

          // Glowing scan ray indicator
          ctx.fillStyle = 'rgba(255, 17, 68, 0.8)';
          ctx.beginPath();
          ctx.arc(4, 0, 3, 0, Math.PI * 2);
          ctx.fill();

        } else if (enemy.type === 'hive_queen') {
          // --- 4. MAJESTIC SEGMENTED BIOORGANIC INSECT QUEEN BOSS ---
          const flap = Math.sin(frameNum * 0.18) * Math.PI / 4;
          const tailWiggle = Math.sin(frameNum * 0.12) * 5;

          // Pulsing emerald bioluminescent rear abdomen
          ctx.save();
          ctx.translate(-15, tailWiggle);
          const abdoGrad = ctx.createRadialGradient(-10, 0, 5, 0, 0, 28);
          abdoGrad.addColorStop(0, '#7effb2');
          abdoGrad.addColorStop(0.4, '#09bc60');
          abdoGrad.addColorStop(0.8, '#044221');
          abdoGrad.addColorStop(1, '#02180c');
          ctx.fillStyle = abdoGrad;
          ctx.strokeStyle = '#3bfca7';
          ctx.lineWidth = 2.5;

          ctx.beginPath();
          ctx.ellipse(0, 8, 32, 22, Math.PI / 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();

          // Organic layered back insect wings
          ctx.save();
          ctx.translate(-8, -12);
          ctx.fillStyle = 'rgba(59, 252, 167, 0.45)';
          ctx.strokeStyle = '#3bfca7';
          ctx.lineWidth = 2;

          // Upper Wing
          ctx.beginPath();
          ctx.ellipse(-15, -15, 45, 14, -Math.PI / 4 + flap, 0, Math.PI * 2);
          ctx.fill(); ctx.stroke();
          
          // Lower Wing
          ctx.fillStyle = 'rgba(20, 150, 90, 0.3)';
          ctx.beginPath();
          ctx.ellipse(-8, 5, 30, 9, -Math.PI / 8 - flap * 0.5, 0, Math.PI * 2);
          ctx.fill(); ctx.stroke();
          ctx.restore();

          // Heavy armored bone head and chitin plate torso
          const chitinGrad = ctx.createLinearGradient(-15, -15, 15, 15);
          chitinGrad.addColorStop(0, '#102219');
          chitinGrad.addColorStop(0.7, '#040b08');
          chitinGrad.addColorStop(1, '#010202');
          ctx.fillStyle = chitinGrad;
          ctx.strokeStyle = '#2bbb75'; // venom outline
          ctx.lineWidth = 3;

          ctx.beginPath();
          ctx.moveTo(-18, -15);
          ctx.lineTo(14, -18);
          ctx.lineTo(24, 6);
          ctx.lineTo(-12, 22);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Glowing multi-faceted cyber venom eyes
          ctx.fillStyle = '#ffea00';
          ctx.shadowColor = '#3bfca7';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.ellipse(14, -8, 5, 3, Math.PI / 6, 0, Math.PI * 2);
          ctx.ellipse(18, -4, 4, 2, Math.PI / 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          // Front sickle mandibles
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(15, 4);
          ctx.quadraticCurveTo(28, 20, 18, 28);
          ctx.stroke();

        } else if (enemy.type === 'overlord') {
          // --- 5. IMMENSE DUST FLOATING CYBER VOID OVERLORD BOSS ---
          const driftY = Math.sin(frameNum * 0.08) * 10;
          ctx.translate(0, driftY);

          // Core Black Hole Singularity
          const radGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 32);
          radGrad.addColorStop(0, '#000000');
          radGrad.addColorStop(0.3, '#020005');
          radGrad.addColorStop(0.65, '#3b0051');
          radGrad.addColorStop(0.85, phaseColor);
          radGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = radGrad;
          ctx.beginPath();
          ctx.arc(0, 0, 36, 0, Math.PI * 2);
          ctx.fill();

          // Shoulder pauldrons
          ctx.fillStyle = '#090510';
          ctx.strokeStyle = '#5c1bb8';
          ctx.lineWidth = 3.5;
          ctx.save();
          // left shoulder
          ctx.translate(-30, -18);
          ctx.rotate(-Math.PI / 12 + Math.sin(frameNum * 0.1) * 0.05);
          ctx.beginPath();
          ctx.moveTo(-10, -20); ctx.lineTo(10, -10); ctx.lineTo(15, 20); ctx.lineTo(-15, 10);
          ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.restore();

          ctx.save();
          // right shoulder
          ctx.translate(30, -18);
          ctx.rotate(Math.PI / 12 - Math.sin(frameNum * 0.1) * 0.05);
          ctx.beginPath();
          ctx.moveTo(10, -20); ctx.lineTo(-10, -10); ctx.lineTo(-15, 20); ctx.lineTo(15, 10);
          ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.restore();

          // Heavy core crown horns
          ctx.fillStyle = '#05020c';
          ctx.beginPath();
          ctx.moveTo(-12, -26);
          ctx.lineTo(0, -42);
          ctx.lineTo(12, -26);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Visual optic reactor visor
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = phaseColor;
          ctx.shadowColor = phaseColor;
          ctx.shadowBlur = 15;
          ctx.beginPath();
          ctx.arc(0, -16, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Orbiting reactor crystals
          ctx.save();
          const orbitalRadius = 52;
          const orbitAngle = frameNum * 0.04;
          for (let s = 0; s < 3; s++) {
            const rot = orbitAngle + (s * Math.PI * 2) / 3;
            const sx = Math.cos(rot) * orbitalRadius;
            const sy = Math.sin(rot) * orbitalRadius * 0.35 - 10;

            ctx.fillStyle = phaseColor;
            ctx.shadowColor = phaseColor;
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.ellipse(sx, sy, 5, 9, Math.PI / 4, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();

          // Overlord dynamic shield rings
          const shieldCol = enemy.zoneId === 'truth' ? '#00e5ff' : '#ff3b5f';
          ctx.strokeStyle = shieldCol;
          ctx.lineWidth = 4;
          ctx.shadowColor = shieldCol;
          ctx.shadowBlur = 15;
          ctx.strokeRect(-enemy.w / 2 - 10, -enemy.h / 2 - 10, enemy.w + 20, enemy.h + 20);
          ctx.shadowBlur = 0;

        } else if (enemy.type === 'boss') {
          // --- 6. LEVEL 1 OR 3 STANDARD ANCIENT WAR-MECH BOSS ---
          const stomp = Math.abs(enemy.vx) > 0.1;
          const stompCycle = stomp ? (frameNum * 0.1 + enemy.x * 0.02) : 0;
          const stompingOffset = stomp ? Math.abs(Math.sin(stompCycle)) * 6 : Math.sin(frameNum * 0.03) * 1.5;

          ctx.translate(0, stompingOffset);

          // Giant iron feet
          ctx.fillStyle = '#100707';
          ctx.strokeStyle = '#421212';
          ctx.lineWidth = 3;
          const lFootX = -18 + (stomp ? Math.sin(stompCycle) * 12 : -5);
          const rFootX = 18 + (stomp ? Math.cos(stompCycle) * 12 : 5);
          ctx.beginPath(); ctx.ellipse(lFootX, enemy.h / 2 - 6, 12, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.ellipse(rFootX, enemy.h / 2 - 6, 12, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

          // Sledge torso chest cavity (Iron fortress look)
          const fortressGrad = ctx.createLinearGradient(-26, -enemy.h / 2, 26, enemy.h / 2);
          fortressGrad.addColorStop(0, '#2d1414');
          fortressGrad.addColorStop(0.5, '#160505');
          fortressGrad.addColorStop(1, '#030000');
          ctx.fillStyle = fortressGrad;
          ctx.strokeStyle = '#8f2020';
          ctx.lineWidth = 3.5;

          ctx.beginPath();
          ctx.moveTo(-28, -20);
          ctx.lineTo(28, -20);
          ctx.lineTo(22, 28);
          ctx.lineTo(-22, 28);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Cyber armored skull faceplate
          ctx.fillStyle = '#080101';
          ctx.strokeStyle = '#ff1a1a';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, -10, 11, 0, Math.PI, true);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#ff111a';
          ctx.shadowColor = '#ff111a';
          ctx.shadowBlur = 10;
          ctx.fillRect(-6 + Math.sin(frameNum * 0.05) * 2, -14, 5, 2.5);
          ctx.shadowBlur = 0;

          // Glowing core in belly
          ctx.fillStyle = phaseColor;
          ctx.beginPath();
          ctx.ellipse(0, 10, 8, 4, 0, 0, Math.PI * 2);
          ctx.fill();

          // Level 3 specific attachments
          if (levelId === 3) {
            ctx.save();
            ctx.translate(24, 6);
            ctx.rotate((enemy as any).facingRight ? Math.PI / 4 : -Math.PI / 4);
            ctx.strokeStyle = (enemy as any).isGuarding ? '#00e5ff' : '#ffea00';
            ctx.lineWidth = 5;
            ctx.shadowColor = ctx.strokeStyle;
            ctx.shadowBlur = 12;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -55); ctx.stroke();
            ctx.restore();

            if ((enemy as any).isGuarding) {
              ctx.strokeStyle = '#00e5ff';
              ctx.lineWidth = 4;
              ctx.shadowColor = '#00e5ff';
              ctx.shadowBlur = 15;
              ctx.beginPath();
              ctx.arc(28, 0, 32, -Math.PI / 2, Math.PI / 2, false);
              ctx.stroke();
            }

            if ((enemy as any).slashArcTimer > 0) {
              (enemy as any).slashArcTimer--;
              ctx.save();
              ctx.strokeStyle = '#ffae00';
              ctx.lineWidth = 7;
              ctx.shadowColor = '#ffea00';
              ctx.shadowBlur = 18;
              ctx.beginPath();
              ctx.arc(26, 0, 75, -Math.PI / 2, Math.PI / 2, false);
              ctx.stroke();
              ctx.restore();
            }
          }
        }

        ctx.restore();

        // Enemy Health meter
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(enemy.x, enemy.y - 14, enemy.w, 4.5);
        ctx.fillStyle = '#ff3a00';
        ctx.fillRect(enemy.x, enemy.y - 14, enemy.w * (enemy.hp / enemy.maxHp), 4.5);
      });

      // Projectiles rendering
      projectiles.forEach((proj) => {
        ctx.save();
        ctx.translate(proj.x + proj.w / 2, proj.y + proj.h / 2);
        const baseColor = proj.chargeLevel >= 3 ? '#ffffff' : proj.chargeLevel === 2 ? '#ff9900' : proj.kind === 'truth' ? '#00e5ff' : '#ff3b5f';

        ctx.shadowColor = baseColor;
        ctx.shadowBlur = 20 + Math.random() * 10;
        ctx.fillStyle = '#ffffff';

        ctx.beginPath();
        for (let i = 0; i < Math.PI * 2; i += Math.PI / 5) {
          const r = proj.w / 3 + Math.random() * (proj.w / 4);
          ctx.lineTo(Math.cos(i) * r, Math.sin(i) * r);
        }
        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = baseColor;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(0, 0, proj.w / 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Portal sync exit
      if (state.portal.active) {
        ctx.save();
        ctx.translate(state.portal.x + state.portal.w / 2, state.portal.y + state.portal.h / 2);
        ctx.rotate(state.portal.pulse);
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, state.portal.h / 2);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.2, '#00e5ff');
        grad.addColorStop(0.6, '#6a00ff');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.scale(0.6, 1);
        ctx.beginPath();
        ctx.arc(0, 0, state.portal.h / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Lightsaber crescent slash swing arc
      if (player.attackTimer > 0) {
        ctx.save();
        ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
        ctx.scale(player.facingRight ? 1 : -1, 1);

        const rawProgress = (ATTACK_FRAMES - player.attackTimer) / ATTACK_FRAMES;
        const progress = rawProgress < 0.2 ? 0 : rawProgress > 0.5 ? 1 : (rawProgress - 0.2) * 3.33;

        ctx.strokeStyle = player.shardMode === 'truth' ? `rgba(0, 229, 255, ${1 - rawProgress})` : `rgba(255, 59, 95, ${1 - rawProgress})`;
        ctx.lineWidth = 2 + Math.sin(progress * Math.PI) * 22;
        ctx.lineCap = 'round';
        ctx.beginPath();

        const radius = player.shardMode === 'false' ? 95 : 85;
        const swingType = player.comboStep % 3;

        if (swingType === 1) {
          ctx.arc(0, 0, radius, -Math.PI * 1.1, -Math.PI * 1.1 + progress * Math.PI * 1.6);
        } else if (swingType === 2) {
          ctx.arc(0, 0, radius, Math.PI - progress * Math.PI * 1.6, Math.PI);
        } else {
          ctx.ellipse(0, 0, radius * 1.2, radius * 0.5, 0, -Math.PI / 3, -Math.PI / 3 + progress * Math.PI * 1.2);
        }

        ctx.stroke();
        ctx.strokeStyle = `rgba(255, 255, 255, ${1 - rawProgress})`;
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.restore();
      }

      // Trail renders
      ghostTrails.forEach((trail) => {
        if (trail.shadow) {
          ctx.fillStyle = `rgba(255, 255, 255, ${trail.life / 25})`;
          ctx.fillRect(trail.x, trail.y, player.width, player.height);
          ctx.strokeStyle = `rgba(0, 229, 255, ${trail.life / 15})`;
          ctx.lineWidth = 2;
          ctx.strokeRect(trail.x - 2, trail.y - 2, player.width + 4, player.height + 4);
        } else {
          ctx.fillStyle = `rgba(80, 220, 255, ${trail.life / 28})`;
          ctx.fillRect(trail.x, trail.y, player.width, player.height);
        }
      });

      // SQUISHY CARTOON CONTROLLER DRAW
      const drawHeight = player.crouching ? player.height * 0.6 : player.height;
      const drawY = player.crouching ? player.y + player.height - drawHeight : player.y;

      ctx.save();
      ctx.translate(player.x + player.width / 2, drawY + drawHeight / 2);

      if (player.somersaultTimer > 0) ctx.rotate(player.somersaultSpin);
      if (!player.facingRight) ctx.scale(-1, 1);

      const runCycle = player.grounded && Math.abs(player.vx) > 0.5 ? state.frameCount * 0.5 : 0;
      const chargeLevel = player.blastCharge >= BLAST_CHARGE_3 ? 3 : player.blastCharge >= BLAST_CHARGE_2 ? 2 : player.blastCharge >= BLAST_CHARGE_1 ? 1 : 0;
      const chargeShake = player.chargingBlast ? (Math.random() - 0.5) * chargeLevel * 2 : 0;
      ctx.translate(chargeShake, chargeShake);

      let sx = 1, sy = 1, bodyRot = 0;
      const dp = player.dashTimer > 0 ? 1 - player.dashTimer / 16 : 0;

      if (player.dashTimer > 0) {
        if (dp < 0.3) {
          sx = 1.2;
          sy = 0.8;
          bodyRot = dp / 0.3 * (Math.PI * 0.8) * (player.facingRight ? 1 : -1);
        } else if (dp < 0.6) {
          sx = 1.4;
          sy = 0.6;
          bodyRot = (Math.PI * 0.8 + ((dp - 0.3) / 0.3) * (Math.PI * 0.4)) * (player.facingRight ? 1 : -1);
        } else {
          sx = 0.85;
          sy = 1.15;
          bodyRot = (Math.PI * 1.2 + ((dp - 0.6) / 0.4) * (Math.PI * 0.8)) * (player.facingRight ? 1 : -1);
        }
      } else if (player.attackTimer > 0) {
        const ap = (ATTACK_FRAMES - player.attackTimer) / ATTACK_FRAMES;
        sx = 1.2;
        sy = 0.8;
        bodyRot = (ap < 0.5 ? -Math.PI / 8 : Math.PI / 6) * (player.facingRight ? 1 : -1);
        if (player.comboStep % 3 === 2) bodyRot *= -1;
      } else if (player.crouching) {
        sx = 1.25;
        sy = 0.7;
      } else if (!player.grounded) {
        if (player.vy < -2) {
          sx = 0.85;
          sy = 1.15;
        } else if (player.vy > 2) {
          sx = 0.95;
          sy = 1.05;
        }
      } else if (Math.abs(player.vx) > 0.5) {
        sy = 1 - Math.abs(Math.sin(runCycle)) * 0.15;
        bodyRot = Math.PI / 16;
      }

      ctx.scale(sx, sy);
      ctx.rotate(bodyRot);

      const coreColor = player.shadowStepTimer > 0 ? '#201030' : '#050101';
      const outlineColor = chargeLevel === 3 ? '#ffffff' : chargeLevel === 2 ? '#72f4ff' : chargeLevel === 1 ? '#1f8cff' : player.shardMode === 'truth' ? '#00e5ff' : '#ff3b5f';
      const bladeColor = player.shardMode === 'truth' ? 'rgba(0, 229, 255, 0.95)' : 'rgba(255, 59, 95, 0.95)';
      const eyeColor = player.shardMode === 'truth' ? '#ffffff' : '#ffeaee';

      // Circular core body styling
      ctx.fillStyle = coreColor;
      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = 2.5;

      // Feet arcing
      let footY = 12;
      let leftFootX = -5 + (player.grounded ? Math.sin(runCycle) * 8 : -4);
      let rightFootX = 5 + (player.grounded ? Math.cos(runCycle) * 8 : 4);
      if (player.crouching) {
        leftFootX = -8;
        rightFootX = 8;
        footY = 8;
      }

      ctx.beginPath(); ctx.ellipse(leftFootX, footY, 5, 3.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(rightFootX, footY, 5, 3.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

      // Core sphere body
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Neon visor scan lines
      ctx.shadowColor = outlineColor;
      ctx.shadowBlur = 15;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.beginPath();

      const eyeX = 2;
      const eyeY = -4;
      const tilt = player.attackTimer > 0 || player.chargingBlast ? 4 : player.crouching ? -2 : 0;
      const pulse = Math.sin(state.frameCount * 0.15) * 4;

      ctx.moveTo(eyeX - 10, eyeY - tilt);
      ctx.quadraticCurveTo(eyeX, eyeY + 4 + tilt + pulse * 0.2, eyeX + 10, eyeY - tilt);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(eyeX + Math.sin(state.frameCount * 0.1) * 6, eyeY - tilt + 2 + pulse * 0.1, 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;

      // Snappy glowing laser blade arm!
      ctx.save();
      const frontHandX = 10 + (player.grounded ? Math.cos(runCycle) * 6 : 4);
      const frontHandY = 4 + (player.grounded ? Math.sin(runCycle) * 2 : 2);
      ctx.translate(frontHandX, frontHandY);

      if (player.attackTimer > 0 || player.chargingBlast) {
        ctx.rotate(player.chargingBlast ? -Math.PI/2 : (player.comboStep % 3 === 1 ? -Math.PI*0.8 : Math.PI/4));
        ctx.shadowColor = bladeColor;
        ctx.shadowBlur = 30;
        ctx.strokeStyle = bladeColor;
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(65, 0); ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(60, 0); ctx.stroke();
      } else {
        ctx.rotate(Math.PI / 1.5);
        ctx.shadowColor = bladeColor;
        ctx.shadowBlur = 10;
        ctx.strokeStyle = bladeColor;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(25, 0); ctx.stroke();
      }
      ctx.restore();

      ctx.restore(); // Main player save end

      // Drawing particles
      particles.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        if (p.type === 'shockwave') {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size;
          ctx.beginPath();
          ctx.arc(p.x, p.y, (p.maxLife - p.life) * 4, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.globalAlpha = 1;

      // Shield active guard sphere
      if (player.guard) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2;
        const shieldX = player.facingRight ? player.x + player.width + 4 : player.x - 10;
        ctx.beginPath();
        ctx.moveTo(shieldX + (player.facingRight ? 0 : 6), player.y - 4);
        ctx.quadraticCurveTo(shieldX + (player.facingRight ? 8 : -2), player.y + player.height/2, shieldX + (player.facingRight ? 0 : 6), player.y + player.height + 4);
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore(); // Camera coordinate scale restore

      // Drawing Portal Navigational Arrow Waypoint (Screen relative)
      if (state.portal) {
        const dx = state.portal.x - player.x;
        const dy = state.portal.y - player.y;
        const distance = Math.round(Math.hypot(dx, dy));

        // Placement of exit marker
        const compassX = canvas.width - 150;
        const compassY = 120; // safe from top-right status meters

        ctx.save();
        ctx.fillStyle = 'rgba(10, 5, 20, 0.85)';
        ctx.strokeStyle = state.portal.active ? '#00e5ff' : '#db9c31';
        ctx.lineWidth = 1.5;

        // Rounded box
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(compassX, compassY, 130, 36, 6);
        } else {
          ctx.rect(compassX, compassY, 130, 36);
        }
        ctx.fill();
        ctx.stroke();

        // Arrow chevron
        const arrowAngle = Math.atan2(dy, dx);
        ctx.save();
        ctx.translate(compassX + 22, compassY + 18);
        ctx.rotate(arrowAngle);
        ctx.fillStyle = state.portal.active ? '#00e5ff' : '#db9c31';
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(-6, -6);
        ctx.lineTo(-2, 0);
        ctx.lineTo(-6, 6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Technical status labeling
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(state.portal.active ? 'PORTAL ACTIVE' : 'EXIT BEACON', compassX + 40, compassY + 16);
        ctx.fillStyle = state.portal.active ? '#00e5ff' : '#db9c31';
        ctx.font = '10px monospace';
        ctx.fillText(`${distance}m`, compassX + 40, compassY + 28);

        ctx.restore();
      }
    };

    // Unified simulation worker
    const animationLoop = () => {
      gameLoopUpdate();
      gameLoopRender();
      animId = requestAnimationFrame(animationLoop);
    };

    // Start background loops
    synthAudioEngine.startBGM();
    animId = requestAnimationFrame(animationLoop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      synthAudioEngine.stopBGM();
    };
  }, [levelId, isPaused]);

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[500px] overflow-hidden bg-black select-none border-2 border-brand-orange/40 rounded-xl">
      {/* HUD OVERLAY BAR */}
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap gap-4 justify-between items-center p-4 bg-[#0a0505]/90 border border-brand-pink md:border-brand-cyan rounded-lg text-white font-mono text-xs shadow-lg">
        {/* Unit 1: HEALTH STATUS */}
        <div className="flex items-center gap-3">
          <span className="text-zinc-400 font-bold shrink-0">HP RECORD:</span>
          <div className="w-36 h-3 bg-red-950 border border-red-500 rounded overflow-hidden">
            <div
              className="h-full bg-red-500 transition-all duration-100"
              style={{ width: `${hudHp}%` }}
            />
          </div>
          <span className="text-red-400 font-bold w-12">{hudHp}/100</span>
        </div>

        {/* Unit 2: PHASE STATE */}
        <div className="flex items-center gap-3">
          <span className="text-zinc-400 font-bold">FREQUENCY PHASING:</span>
          <span
            className={`px-2.5 py-0.5 rounded font-extrabold uppercase animate-pulse border ${
              hudPhase === 'truth' ? 'bg-cyan-950 text-brand-cyan border-brand-cyan shadow-[0_0_8px_rgba(0,229,255,0.4)]' : 'bg-rose-950 text-brand-pink border-brand-pink shadow-[0_0_8px_rgba(255,59,95,0.4)]'
            }`}
          >
            {hudPhase} MODE
          </span>
        </div>

        {/* Unit 3: COLLECTED SHARDS */}
        <div className="flex items-center gap-2">
          <span className="text-zinc-400 font-bold text-[11px]">CORES UNLOCKED:</span>
          <span className="text-brand-cyan font-bold bg-[#112]/50 px-2 py-0.5 rounded">T: {hudShards.truth}</span>
          <span className="text-brand-pink font-bold bg-[#212]/50 px-2 py-0.5 rounded">F: {hudShards.false}</span>
        </div>

        {/* Unit 4: SHADOW STEPS */}
        <div className="flex items-center gap-2">
          <span className="text-zinc-400 font-bold text-[11px]">SHADOW STEPS:</span>
          <div className="flex gap-1.5">
            {[0, 1].map((i) => (
              <div
                key={i}
                className={`w-6 h-2.5 rounded border border-white/50 transition-colors ${
                  hudSteps > i ? 'bg-brand-cyan border-brand-cyan shadow-[0_0_5px_#00e5ff]' : 'bg-zinc-900 border-zinc-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Unit 4.5: GAMEPAD STATUS */}
        {gamepadConnected && (
          <div className="flex items-center gap-1.5 bg-cyan-950/85 border border-brand-cyan/65 text-brand-cyan font-mono text-[10px] font-black px-2.5 py-1 rounded shadow-[0_0_12px_rgba(0,229,255,0.3)] animate-pulse uppercase">
            <Gamepad2 className="w-3.5 h-3.5 text-brand-cyan" />
            <span>PAD ACTIVE</span>
          </div>
        )}

        {/* Unit 5: TIME */}
        <div className="flex items-center gap-2 text-brand-orange font-bold text-sm bg-black/40 px-3 py-1 rounded border border-brand-orange/20">
          <span>{hudTime}</span>
        </div>
      </div>

      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}

// Helper function to interpolate between two hex colors seamlessly
function interpolateColor(color1: string, color2: string, factor: number): string {
  if (color1.startsWith('#') && color1.length === 4) {
    color1 = '#' + color1[1] + color1[1] + color1[2] + color1[2] + color1[3] + color1[3];
  }
  if (color2.startsWith('#') && color2.length === 4) {
    color2 = '#' + color2[1] + color2[1] + color2[2] + color2[2] + color2[3] + color2[3];
  }
  
  const r1 = parseInt(color1.substring(1, 3), 16);
  const g1 = parseInt(color1.substring(3, 5), 16);
  const b1 = parseInt(color1.substring(5, 7), 16);
  
  const r2 = parseInt(color2.substring(1, 3), 16);
  const g2 = parseInt(color2.substring(3, 5), 16);
  const b2 = parseInt(color2.substring(5, 7), 16);
  
  const r = Math.round(r1 + factor * (r2 - r1));
  const g = Math.round(g1 + factor * (g2 - g1));
  const b = Math.round(b1 + factor * (b2 - b1));
  
  const rc = Math.max(0, Math.min(255, r)).toString(16).padStart(2, '0');
  const gc = Math.max(0, Math.min(255, g)).toString(16).padStart(2, '0');
  const bc = Math.max(0, Math.min(255, b)).toString(16).padStart(2, '0');
  
  return `#${rc}${gc}${bc}`;
}
