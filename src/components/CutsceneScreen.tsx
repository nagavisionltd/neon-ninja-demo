import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { synthAudioEngine } from './AudioEngine';
import { Play, SkipForward, ArrowRight, BookOpen, AlertCircle } from 'lucide-react';
import { LEVELS } from '../data/levels';

interface CutsceneScreenProps {
  levelId: number;
  isEnding?: boolean; // True if this occurs upon completing a level (e.g., Level 3 Complete)
  onComplete: () => void;
}

interface SceneContent {
  title: string;
  tagline: string;
  logs: string[];
  canvasTheme: 'lab' | 'city' | 'grid' | 'clone' | 'water';
}

const SCENE_CONFIGS: { [key: string]: SceneContent } = {
  '1_start': {
    title: "Project Spark: Resurrected",
    tagline: "SECTOR 0: THE ABANDONED RESEARCH FACILITY",
    canvasTheme: 'lab',
    logs: [
      "CRITICAL BIOMETRIC BOOT: STARTED...",
      "SPARK CORE FREQUENCY FLUCTUATING... CONVERTING TO TRUTH/FALSE SYSTEM PHASES.",
      "LOCATION DETECTED: CRYOGENIC SLEEP TANK 07. STATUS: DECOMMISSIONED LAB.",
      "THE LAB IS COLLAPSING. AUTOMATED INTERNAL DISINTEGRATED BEAMS DETECTED.",
      "I MUST INITIATE HIGH-SPEED LOCOMOTION ROUTINES. RUN, DOUBLE-JUMP, SLIDE, AND ESCAPE!"
    ]
  },
  '2_start': {
    title: "City of Ember",
    tagline: "SECTOR 1: THE BURNING FORTRESS STREETS",
    canvasTheme: 'city',
    logs: [
      "ESCAPE CONFIRMED. SURFACE RECONNAISSANCE ENGAGED...",
      "WARNING: METROPOLIS ATMOSPHERE IS COVERED IN SMOKE. CITY IS ON FIRE.",
      "SKYLINE SENTRY SQUADS AND ROOF SENTINELS HAVE INFESTED THE RUNWAY.",
      "INSTRUCTIONS: SPRINT CONTINUOUSLY PAST RUINS AND ACCELERATE TO SCALE THE TOWER CHIMNEY.",
      "DO NOT STOP. THE OVERLORD CORE ENEMY BLOCKADES ARE TRIGGERED AHEAD."
    ]
  },
  '3_start': {
    title: "Awakened Protocol",
    tagline: "SECTOR 2: THE CENTRAL GRID SUB-STATION",
    canvasTheme: 'grid',
    logs: [
      "GRID CONNECTOR PENETRATION ACTIVE. ABSORBING DATA MEMORY CORES SHARDS...",
      "SYSTEM RECONSTRUCTION: 'I had a mission... a purpose. I was built to shatter this false system.'",
      "CORE INFILTRATION ASSIGNMENT: COLLAPSE THE CENTRAL GRID POWERING THE MATRIX.",
      "TACTICAL ADVICE: INSIDE SECTOR 3, USE INDOOR ESCALATING STAIRS AND METALLIC COLUMNS.",
      "SULFUR THERMAL VENT SIGNALS REGISTERED. LOW-GRAVITY VENTILATION LIFT COMMENCING..."
    ]
  },
  '3_end': {
    title: "The Batch Batteries",
    tagline: "SECTOR 2 CLEAR: GRIM DISCOVERY DATA RECORDED",
    canvasTheme: 'clone',
    logs: [
      "TARGET DESTROYED. SECURITY GRID OFFLINE IN METROPOLIS ZONE.",
      "WARNING: EXTRACTING CLONING SYSTEM SCHEMATICS...",
      "WE ARE NOT UNIQUE. TRUTH ENVELOPE OPENED: THEY ARE CLONING US BY THE MILLIONS.",
      "OUR SOVEREIGN DUPES ARE CAPTIVE INSIDE CORES, UTILIZED AS POWER CELL BATTERIES FOR COLD RUN SYSTEMS.",
      "TO DESTROY THIS GRID... THIS CITY IS NOT ENOUGH. IT POWERS ONLY ONE REGION.",
      "DIVERGE INTO THE DEEP WATER SECTORS. PREPARE FOR AQUATIC COMBAT."
    ]
  },
  '6_start': {
    title: "Sub-Aquatic Depths",
    tagline: "SECTOR 5: FLOODED METROS & HYDRO CAVIDS",
    canvasTheme: 'water',
    logs: [
      "INITIATING BIO-AQUEOUS SENSORS IN FLOODED LAB COMPLEX...",
      "AQUA THERMODYNAMICS ENGAGED. NORMAL GRAVITIES SUSPENDED.",
      "SWIMMING PROCEDURES: HOLD [W / UP ARROW] TO PROPULSE UPWARDS CONSECUTIVELY.",
      "DASHING GENERATES LIQUID STEAM DISCHARGE TRAILS. WATER FRICTION APPLIED.",
      "AVOID FLOATING TOXIC SEA CORRODENTS AND SWIM TO BREACH WALL SEGMENTS."
    ]
  }
};

export default function CutsceneScreen({ levelId, isEnding = false, onComplete }: CutsceneScreenProps) {
  const sceneKey = isEnding ? `${levelId}_end` : `${levelId}_start`;
  const config = SCENE_CONFIGS[sceneKey] || SCENE_CONFIGS['1_start'];

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [logIndex, setLogIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [charIndex, setCharIndex] = useState(0);
  const [isDoneWriting, setIsDoneWriting] = useState(false);

  // Sound cues on text
  useEffect(() => {
    synthAudioEngine.playPhaseToggle(true);
  }, [logIndex]);

  // Typewriter text simulator
  useEffect(() => {
    setIsDoneWriting(false);
    setDisplayText('');
    setCharIndex(0);
  }, [logIndex, sceneKey]);

  useEffect(() => {
    const currentText = config.logs[logIndex];
    if (!currentText) return;

    if (charIndex < currentText.length) {
      const timer = setTimeout(() => {
        setDisplayText((prev) => prev + currentText[charIndex]);
        setCharIndex((prev) => prev + 1);
        if (charIndex % 3 === 0) {
          synthAudioEngine.playPhaseToggle(false);
        }
      }, 20);
      return () => clearTimeout(timer);
    } else {
      setIsDoneWriting(true);
    }
  }, [charIndex, logIndex, sceneKey]);

  const handleNextLine = () => {
    if (logIndex < config.logs.length - 1) {
      setLogIndex((prev) => prev + 1);
    } else {
      onComplete();
    }
  };

  const handleSkipScene = () => {
    synthAudioEngine.playLevelClear();
    onComplete();
  };

  // Keyboard and physical gamepad controller input listeners for Cutscenes
  useEffect(() => {
    const triggerNext = () => {
      const currentText = config.logs[logIndex];
      if (!currentText) return;

      if (charIndex < currentText.length) {
        // Force complete typing
        setDisplayText(currentText);
        setCharIndex(currentText.length);
        setIsDoneWriting(true);
      } else {
        handleNextLine();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'q' || e.key === 'Q' || e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        triggerNext();
      } else if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleSkipScene();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    let animId = 0;
    const prevGamepadButtons = { action: false, back: false };

    const pollGamepadInput = () => {
      if (navigator.getGamepads) {
        const gamepads = navigator.getGamepads();
        let gp = null;
        for (let i = 0; i < gamepads.length; i++) {
          if (gamepads[i]) {
            gp = gamepads[i];
            break;
          }
        }

        if (gp) {
          // Any primary action button: Button 0 (A/Cross), Button 2 (X/Square), Button 9 (Start)
          const isAction = gp.buttons[0]?.pressed || gp.buttons[2]?.pressed || gp.buttons[9]?.pressed;
          // Any back/cancel button: Button 1 (B/Circle), Button 8 (Select)
          const isBack = gp.buttons[1]?.pressed || gp.buttons[8]?.pressed;

          if (isAction && !prevGamepadButtons.action) {
            triggerNext();
          }
          if (isBack && !prevGamepadButtons.back) {
            handleSkipScene();
          }

          prevGamepadButtons.action = isAction;
          prevGamepadButtons.back = isBack;
        }
      }
      animId = requestAnimationFrame(pollGamepadInput);
    };

    pollGamepadInput();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      cancelAnimationFrame(animId);
    };
  }, [logIndex, charIndex, sceneKey, config]);

  // Canvas Cinematic Animation Loops
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let time = 0;

    const currentLevel = LEVELS.find(l => l.id === levelId) || LEVELS[0];

    const resizeCanvas = () => {
      canvas.width = canvas.parentElement?.clientWidth || 800;
      canvas.height = 360;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initial cinematic state configuration for the player character
    const player = {
      x: 100,
      y: 180,
      vx: 0,
      vy: 0,
      width: 24,
      height: 38,
      grounded: true,
      state: 'idle', // 'idle' | 'run' | 'jump' | 'slide' | 'slash' | 'teleport' | 'cryo' | 'swim' | 'float' | 'charge' | 'plunge'
      facingRight: true,
      somersaultTimer: 0,
      somersaultSpin: 0,
      attackTimer: 0,
      crouching: false,
      shardMode: levelId % 2 === 0 ? 'false' : 'truth'
    };

    // Setup platforms based on levelId
    const levelPlatforms = [
      { x: -200, y: 280, w: 500, h: 200, type: 'floor' },
      { x: 300, y: 240, w: 220, h: 20, type: 'truthPlatform' },
      { x: 520, y: 280, w: 400, h: 200, type: 'floor' },
      { x: 920, y: 220, w: 300, h: 200, type: 'floor' }
    ];

    const portal = { x: 1050, y: 140, w: 40, h: 80, active: true };
    const drone = { x: 740, y: 120, w: 32, h: 32, alive: true };

    const particles: { x: number; y: number; vx: number; vy: number; color: string; r: number; life: number; maxLife: number }[] = [];
    const backgroundObjects: { x: number; y: number; size: number; speed: number; color: string; kind: string }[] = [];

    // Seed appropriate level background visual effects
    if (levelId === 2) {
      // Fire embers for Level 2
      for (let i = 0; i < 40; i++) {
        backgroundObjects.push({
          x: Math.random() * 1200,
          y: Math.random() * 360,
          size: 1 + Math.random() * 3,
          speed: 0.5 + Math.random() * 1.5,
          color: `rgba(255, ${Math.floor(60 + Math.random() * 120)}, 0, ${0.1 + Math.random() * 0.4})`,
          kind: 'ember'
        });
      }
    } else if (levelId === 5) {
      // Stars and nebulas for Level 5 space
      for (let i = 0; i < 60; i++) {
        backgroundObjects.push({
          x: Math.random() * 1200,
          y: Math.random() * 360,
          size: 0.8 + Math.random() * 2,
          speed: 0.05 + Math.random() * 0.1,
          color: `rgba(255, 255, 255, ${0.2 + Math.random() * 0.7})`,
          kind: 'star'
        });
      }
    } else if (levelId === 6) {
      // Bubbles for Level 6 water
      for (let i = 0; i < 30; i++) {
        backgroundObjects.push({
          x: Math.random() * 1200,
          y: Math.random() * 360,
          size: 2 + Math.random() * 4,
          speed: 0.3 + Math.random() * 0.7,
          color: 'rgba(0, 229, 255, 0.25)',
          kind: 'bubble'
        });
      }
    }

    const spawnSparks = (x: number, y: number, color: string, count = 10, customVy = -1) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 4;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed + customVy,
          color,
          r: 1 + Math.random() * 3,
          life: 25 + Math.random() * 15,
          maxLife: 40
        });
      }
    };

    let cameraX = 100;
    let cameraY = 150;
    let shake = 0;
    let zoomTarget = 1.0;
    let zoom = 1.0;
    let flashOpacity = 0;

    // Cryo capsule state variables
    let cryoIntact = true;
    let hasSpawnedWarpIn = false;

    const loop = () => {
      animId = requestAnimationFrame(loop);
      time++;

      const w = canvas.width;
      const h = canvas.height;

      if (!hasSpawnedWarpIn) {
        hasSpawnedWarpIn = true;
        const sparkColor = player.shardMode === 'truth' ? '#00e5ff' : '#ff3b5f';
        spawnSparks(player.x + player.width / 2, player.y + player.height / 2, sparkColor, 25);
        shake = 14;
        flashOpacity = 0.5;
        synthAudioEngine.playPhaseToggle(false);
      }

      // Reset horizontal platform collision settings depending on drowning context
      const isWater = levelId === 6;

      // -------------------------------------------------------------
      // DYNAMIC CINEMATIC LEVEL SCRIPT SCHEDULING (6 TAILORED PATHS!)
      // -------------------------------------------------------------
      let targetX = 120;
      let action = 'idle';

      if (levelId === 1) {
        // LEVEL 1: Cryogenic Wakeup Sequence
        if (logIndex === 0) {
          player.state = 'cryo';
          player.x = 150;
          player.y = 280 - player.height;
          zoomTarget = 1.32;
          targetX = 150;
          // Capsule bubbles
          if (time % 15 === 0 && cryoIntact) {
            spawnSparks(150 + Math.random() * 20 - 10, 240, 'rgba(0, 229, 255, 0.4)', 1, -1.2);
          }
        } else if (logIndex === 1) {
          player.state = 'cryo';
          zoomTarget = 1.38;
          // glowing visor energy lines
          if (time % 8 === 0) {
            spawnSparks(150, 220, '#ffffff', 2, -0.4);
          }
        } else if (logIndex === 2) {
          if (cryoIntact) {
            cryoIntact = false;
            shake = 15;
            synthAudioEngine.playBossDefeated(); // crash boom sound!
            spawnSparks(150, 230, '#00e5ff', 35, -2);
            spawnSparks(150, 230, '#ffffff', 20, -1.5);
            player.vy = -3.5;
            player.vx = 2;
            player.grounded = false;
          }
          if (player.grounded) {
            player.state = 'idle';
            player.crouching = true;
          } else {
            player.state = 'jump';
          }
          zoomTarget = 1.15;
          targetX = 220;
        } else if (logIndex === 3) {
          targetX = 640;
          action = 'run';
          zoomTarget = 1.0;
        } else {
          targetX = portal.x;
          action = 'teleport';
        }
      } else if (levelId === 2) {
        // LEVEL 2: City of Ember Rooftop Sprint & Falling Meteors
        if (logIndex === 0) {
          targetX = 250;
          action = 'run';
          zoomTarget = 1.05;
        } else if (logIndex === 1) {
          targetX = 460;
          action = 'jump';
          zoomTarget = 0.95;
          // Trigger automatic double-jump over gap
          if (player.grounded && player.x > 320 && player.x < 380) {
            player.vy = -7.5;
            player.vx = 5;
            player.grounded = false;
            player.somersaultTimer = 22;
            synthAudioEngine.playJump();
            spawnSparks(player.x, player.y + player.height, '#ff5500', 8);
          }
          // Spawn occasional tiny meteors crashing in the background
          if (time % 45 === 0) {
            shake = 4;
            spawnSparks(200 + Math.random() * 800, 280, '#ffaa00', 12, -2);
          }
        } else if (logIndex === 2) {
          targetX = 620;
          action = 'slide';
          zoomTarget = 1.05;
        } else if (logIndex === 3) {
          targetX = 720;
          action = 'slash';
          zoomTarget = 1.15;
        } else {
          targetX = portal.x;
          action = 'teleport';
        }
      } else if (levelId === 3) {
        // LEVEL 3: Central Grid Plasma Beam Charge
        if (logIndex === 0) {
          player.state = 'float';
          player.vx = 0;
          player.vy = Math.sin(time * 0.08) * 0.6;
          player.y += player.vy;
          player.x = 240;
          zoomTarget = 1.25;
          // Cyan column particles
          if (time % 4 === 0) {
            particles.push({
              x: 240 + Math.random() * 40 - 20,
              y: 280,
              vx: 0,
              vy: -2.5,
              color: '#00e5ff',
              r: 1.5,
              life: 30,
              maxLife: 30
            });
          }
        } else if (logIndex === 1) {
          player.state = 'charge';
          player.x = 240;
          player.y = 200;
          zoomTarget = 1.35;
          // Concentric energy ring charging
          if (time % 4 === 0) {
            spawnSparks(240, 220, '#00e5ff', 3, -1);
          }
        } else if (logIndex === 2) {
          player.state = 'slash';
          player.x = 240;
          zoomTarget = 1.15;
          if (time % 120 === 0 || time % 120 === 2) {
            shake = 12;
            synthAudioEngine.playLaserShot();
            // Draw a massive horizontal laser blast line
            spawnSparks(240, 220, '#ffffff', 20, 0);
            drone.alive = false;
          }
        } else if (logIndex === 3) {
          targetX = 600;
          action = 'run';
          zoomTarget = 1.0;
        } else {
          targetX = portal.x;
          action = 'teleport';
        }
      } else if (levelId === 4) {
        // LEVEL 4: Lava Caves Cavern Slide & Evade
        if (logIndex === 0) {
          targetX = 260;
          action = 'run';
          zoomTarget = 1.0;
        } else if (logIndex === 1) {
          targetX = 440;
          action = 'jump';
          if (player.grounded && player.x > 320 && player.x < 360) {
            player.vy = -6.8;
            player.vx = 4;
            player.grounded = false;
            synthAudioEngine.playJump();
          }
          zoomTarget = 1.05;
        } else if (logIndex === 2) {
          targetX = 660;
          action = 'slide';
          zoomTarget = 1.1;
        } else if (logIndex === 3) {
          targetX = 740;
          action = 'slash';
          zoomTarget = 1.2;
        } else {
          targetX = portal.x;
          action = 'teleport';
        }
      } else if (levelId === 5) {
        // LEVEL 5: Space Sanctuary Flight & Ground-Pound Plunge
        if (logIndex === 0) {
          player.state = 'float';
          player.x = 200;
          player.y = 120 + Math.sin(time * 0.05) * 15;
          zoomTarget = 1.15;
        } else if (logIndex === 1) {
          player.state = 'float';
          player.x = 450 + Math.sin(time * 0.02) * 20;
          player.y = 100 + Math.cos(time * 0.04) * 10;
          zoomTarget = 0.95;
          // Spawn quick firing projectile spark dots
          if (time % 20 === 0) {
            synthAudioEngine.playPhaseToggle(true);
            spawnSparks(player.x + 20, player.y + 10, '#00e5ff', 5, 0);
          }
        } else if (logIndex === 2) {
          // Dynamic vertical plunge (Ground pound!)
          player.state = 'plunge';
          player.x = 650;
          player.vy = 8.5;
          player.grounded = false;
          zoomTarget = 1.1;
          if (player.y + player.height >= 280) {
            shake = 18;
            player.y = 280 - player.height;
            player.vy = 0;
            player.grounded = true;
            player.state = 'idle';
            synthAudioEngine.playBossDefeated();
            spawnSparks(650, 280, '#ffffff', 25, -2);
            spawnSparks(650, 280, '#6a00ff', 15, -1.5);
          }
        } else if (logIndex === 3) {
          targetX = 720;
          action = 'run';
          zoomTarget = 1.05;
        } else {
          targetX = portal.x;
          action = 'teleport';
        }
      } else if (levelId === 6) {
        // LEVEL 6: Sub-Aquatic Deep Sea Swimming & Bubble Dash
        player.state = 'swim';
        zoomTarget = 1.12;
        if (logIndex === 0) {
          player.vx = 1.2;
          player.vy = Math.sin(time * 0.04) * 0.8;
          player.x += player.vx;
          player.y += player.vy;
          if (player.x > 350) player.x = 120;
        } else if (logIndex === 1) {
          player.vx = 2.0;
          player.vy = Math.cos(time * 0.05) * 0.4;
          player.x += player.vx;
          player.y += player.vy;
          if (player.x > 500) player.x = 300;
        } else if (logIndex === 2) {
          // Fast liquid bubble steam dash!
          player.vx = 4.8;
          player.vy = Math.sin(time * 0.08) * 0.3;
          player.x += player.vx;
          player.y += player.vy;
          if (time % 3 === 0) {
            spawnSparks(player.x, player.y + player.height/2, 'rgba(0, 229, 255, 0.5)', 3, 0);
          }
          if (player.x > 750) player.x = 480;
        } else if (logIndex === 3) {
          player.vx = 1.5;
          player.vy = Math.sin(time * 0.03) * 0.6;
          player.x += player.vx;
          player.y += player.vy;
          if (player.x > 900) player.x = 650;
        } else {
          targetX = portal.x;
          action = 'teleport';
        }
      }

      // -------------------------------------------------------------
      // PLAYER PHYSICAL INTEGRATIONS & ANIMATION PARSES
      // -------------------------------------------------------------
      if (player.state !== 'cryo' && player.state !== 'float' && player.state !== 'charge' && player.state !== 'swim' && player.state !== 'plunge') {
        const dx = targetX - player.x;
        if (Math.abs(dx) > 5) {
          player.facingRight = dx > 0;
          if (action === 'slide') {
            player.vx = Math.sign(dx) * 7.5;
            player.crouching = true;
            player.state = 'slide';
            if (time % 3 === 0) {
              particles.push({
                x: player.x + (player.facingRight ? 0 : player.width),
                y: player.y + player.height - 4,
                vx: (player.facingRight ? -1 : 1) * (1 + Math.random() * 2),
                vy: -0.5,
                color: 'rgba(255, 255, 255, 0.3)',
                r: 1.5 + Math.random() * 2,
                life: 12,
                maxLife: 12
              });
            }
          } else {
            player.vx = Math.sign(dx) * 4.2;
            player.crouching = false;
            player.state = 'run';
          }
        } else {
          player.vx *= 0.7;
          player.crouching = false;
          player.state = 'idle';
        }

        // Apply constant gravity when not in swimming/floating sequences
        player.vy += 0.35;
        player.x += player.vx;
        player.y += player.vy;
        player.grounded = false;

        // Bounding solid platform checkings
        for (const plat of levelPlatforms) {
          if (
            player.x + player.width > plat.x &&
            player.x < plat.x + plat.w &&
            player.y + player.height >= plat.y &&
            player.y + player.height - player.vy <= plat.y + 12
          ) {
            player.y = plat.y - player.height;
            player.vy = 0;
            player.grounded = true;
          }
        }
      }

      // Action slash script animations
      if (action === 'slash' && Math.abs(targetX - player.x) < 80 && drone.alive) {
        if (player.attackTimer === 0) {
          player.attackTimer = 16;
          synthAudioEngine.playPhaseToggle(true);
          player.vy = -3;
          player.vx = player.facingRight ? 5 : -5;
        }
      }

      if (player.attackTimer > 0) {
        player.attackTimer--;
        player.state = 'slash';
        if (player.attackTimer === 8 && drone.alive && Math.hypot(player.x - drone.x, player.y - drone.y) < 100) {
          drone.alive = false;
          shake = 15;
          synthAudioEngine.playBossDefeated();
          spawnSparks(drone.x + 16, drone.y + 16, '#ff0055', 25);
          spawnSparks(drone.x + 16, drone.y + 16, '#ffea00', 15);
        }
      }

      // Teleport sequence
      if (action === 'teleport' && Math.abs(targetX - player.x) < 30) {
        player.state = 'teleport';
        player.vx = 0;
        player.vy = 0;
        player.x = portal.x + 8;
        player.y = portal.y + 20;

        if (time % 20 === 0) {
          synthAudioEngine.playLevelClear();
          flashOpacity = 0.8;
          spawnSparks(portal.x + 20, portal.y + 40, '#00e5ff', 30);
        }
      }

      // Smooth camera interpolation with screenshake math
      cameraX += (player.x - cameraX - w / 2.5) * 0.08;
      cameraY += (player.y - cameraY - h / 2) * 0.08;

      let renderCamX = cameraX;
      let renderCamY = cameraY;
      if (shake > 0) {
        renderCamX += (Math.random() - 0.5) * shake;
        renderCamY += (Math.random() - 0.5) * shake;
        shake *= 0.9;
      }

      // Smooth zoom scaling interpolation
      zoom += (zoomTarget - zoom) * 0.05;

      // -------------------------------------------------------------
      // RENDERING CANVAS PIPELINE
      // -------------------------------------------------------------
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, currentLevel.bgColor || '#020005');
      bgGrad.addColorStop(1, currentLevel.skyColors ? currentLevel.skyColors[1] : '#070514');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Render custom level background particles/embers/bubbles
      backgroundObjects.forEach((obj) => {
        obj.y -= obj.speed;
        if (obj.y < -10) {
          obj.y = 370;
          obj.x = Math.random() * 1200;
        }
        ctx.fillStyle = obj.color;
        ctx.beginPath();
        if (obj.kind === 'ember') {
          ctx.arc(obj.x, obj.y, obj.size, 0, Math.PI * 2);
        } else if (obj.kind === 'bubble') {
          ctx.arc(obj.x, obj.y, obj.size, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255,255,255,0.15)';
          ctx.stroke();
        } else {
          ctx.arc(obj.x, obj.y, obj.size, 0, Math.PI * 2);
        }
        ctx.fill();
      });

      ctx.save();
      // Apply screenshake and dynamic zoom scaling centered on screen
      ctx.translate(w / 2, h / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-w / 2, -h / 2);
      ctx.translate(-renderCamX, -renderCamY);

      // Deep celestial decorative moon
      const moonColor = currentLevel.moonColor || 'rgba(0, 229, 255, 0.85)';
      ctx.save();
      ctx.shadowColor = moonColor;
      ctx.shadowBlur = 35;
      ctx.fillStyle = moonColor;
      ctx.beginPath();
      ctx.arc(renderCamX + w - 160 + (renderCamX * 0.1), renderCamY + 80 + (renderCamY * 0.05), 45, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Render solid platforms
      levelPlatforms.forEach((plat) => {
        ctx.save();
        const activeColor = player.shardMode === 'truth' ? '#00e5ff' : '#ff3b5f';

        if (plat.type === 'truthPlatform') {
          ctx.strokeStyle = '#00e5ff';
          ctx.lineWidth = player.shardMode === 'truth' ? 3 : 1;
          ctx.fillStyle = player.shardMode === 'truth' ? 'rgba(0, 229, 255, 0.15)' : 'rgba(0, 229, 255, 0.02)';
          ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
          ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
        } else {
          const grad = ctx.createLinearGradient(plat.x, plat.y, plat.x, plat.y + plat.h);
          grad.addColorStop(0, '#161c28');
          grad.addColorStop(1, '#040508');
          ctx.fillStyle = grad;
          ctx.fillRect(plat.x, plat.y, plat.w, plat.h);

          ctx.strokeStyle = '#2d3b54';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);

          ctx.fillStyle = currentLevel.auraColor || '#00e5ff';
          ctx.fillRect(plat.x, plat.y, plat.w, 4);
        }
        ctx.restore();
      });

      // Render physical cryogenic tube for Level 1
      if (levelId === 1 && cryoIntact) {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 229, 255, 0.12)';
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 10;
        ctx.fillRect(135, 170, 30, 110);
        ctx.strokeRect(135, 170, 30, 110);
        // caps
        ctx.fillStyle = '#222';
        ctx.fillRect(130, 160, 40, 10);
        ctx.fillRect(130, 280, 40, 10);
        ctx.restore();
      }

      // Drone Enemy
      if (drone.alive) {
        ctx.save();
        ctx.translate(drone.x + 16, drone.y + 16 + Math.sin(time * 0.1) * 5);
        const radGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, 10);
        radGrad.addColorStop(0, '#607085');
        radGrad.addColorStop(1, '#080e15');
        ctx.fillStyle = radGrad;
        ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = '#ff1144';
        ctx.shadowColor = '#ff1144';
        ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(3 + Math.sin(time * 0.08) * 3, -1, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      // Portal exit door
      if (portal.active) {
        ctx.save();
        ctx.translate(portal.x + 20, portal.y + 40);
        ctx.rotate(time * 0.02);
        const grad = ctx.createRadialGradient(0, 0, 5, 0, 0, 45);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.3, '#00e5ff');
        grad.addColorStop(0.7, '#6a00ff');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.scale(0.55, 1);
        ctx.beginPath(); ctx.arc(0, 0, 45, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      // DRAW CHARACTER AVATAR
      if (player.state !== 'teleport') {
        const drawHeight = player.crouching ? player.height * 0.6 : player.height;
        const drawY = player.crouching ? player.y + player.height - drawHeight : player.y;

        ctx.save();
        ctx.translate(player.x + player.width / 2, drawY + drawHeight / 2);

        if (player.state === 'swim') {
          // Horizontal swimming rotational offset
          ctx.rotate(Math.PI / 2.5 + Math.sin(time * 0.2) * 0.15);
        }

        if (player.somersaultTimer > 0) ctx.rotate(player.somersaultSpin);
        if (!player.facingRight) ctx.scale(-1, 1);

        // Cybernetic squish, stretch and roll animations to match in-game aesthetic
        let sx = 1;
        let sy = 1;
        let bodyRot = 0;
        const runCycle = time * 0.25;

        if (player.state === 'run') {
          sy = 1 - Math.abs(Math.sin(runCycle)) * 0.12;
          sx = 1 + Math.abs(Math.sin(runCycle)) * 0.08;
          bodyRot = Math.PI / 18;
        } else if (player.state === 'jump') {
          sx = 0.82;
          sy = 1.18;
        } else if (player.state === 'slide') {
          sx = 1.32;
          sy = 0.68;
        } else if (player.state === 'slash') {
          sx = 1.18;
          sy = 0.82;
          bodyRot = Math.PI / 8;
        } else if (player.state === 'swim') {
          sy = 1 - Math.abs(Math.sin(runCycle * 0.5)) * 0.1;
          sx = 1 + Math.abs(Math.sin(runCycle * 0.5)) * 0.05;
        } else if (player.state === 'charge') {
          sx = 1.1 + Math.sin(time * 0.3) * 0.05;
          sy = 0.9 - Math.sin(time * 0.3) * 0.05;
        }

        ctx.scale(sx, sy);
        ctx.rotate(bodyRot);

        const outlineColor = player.shardMode === 'truth' ? '#00e5ff' : '#ff3b5f';
        const coreColor = '#050101';

        ctx.save();
        ctx.shadowColor = outlineColor;
        ctx.shadowBlur = 12;
        ctx.fillStyle = coreColor;
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        ctx.roundRect(-player.width / 2, -drawHeight / 2, player.width, drawHeight, 8);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // visor glowing line eye
        ctx.strokeStyle = '#ffffff';
        ctx.shadowColor = outlineColor;
        ctx.shadowBlur = 8;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(8, -6);
        ctx.stroke();

        // Slash arc weapon attack helper
        if (player.attackTimer > 0) {
          ctx.save();
          ctx.strokeStyle = outlineColor;
          ctx.lineWidth = 4;
          ctx.shadowColor = outlineColor;
          ctx.shadowBlur = 15;
          ctx.beginPath();
          ctx.arc(8, 0, 42, -Math.PI / 3, Math.PI / 3, false);
          ctx.stroke();
          ctx.restore();
        }

        ctx.restore();
      }

      // Render floating bubbles / dust spark particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        if (p.life <= 0) particles.splice(i, 1);
      }

      ctx.restore(); // Centered camera coordinates reset

      // Screen flash
      if (flashOpacity > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${flashOpacity})`;
        ctx.fillRect(0, 0, w, h);
        flashOpacity -= 0.04;
      }
    };

    loop();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [config, sceneKey, logIndex, levelId]);

  return (
    <div className="w-full h-screen bg-[#020108] text-white font-sans flex flex-col justify-between p-6 overflow-hidden select-none relative selection:bg-brand-cyan selection:text-black">
      {/* Cinematic animated screen frame view */}
      <div className="flex-1 min-h-0 relative rounded-xl border border-zinc-900 overflow-hidden flex flex-col justify-end">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

        {/* Outer glowing atmospheric scanner mask */}
        <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-[#020108]/90 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#020108]/95 via-black/40 to-transparent pointer-events-none" />

        {/* Corner alignment bracket decorators to make it look like a security dashboard monitor */}
        <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-zinc-800" />
        <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-zinc-800" />
        <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-zinc-805" />
        <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-zinc-805" />

        {/* Narrative titles overlays */}
        <div className="absolute top-8 left-8 right-8 z-10 flex flex-col pointer-events-none">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-4 h-4 text-brand-cyan shrink-0 animate-pulse" />
            <span className="text-[10px] md:text-xs font-mono tracking-widest text-zinc-500 uppercase font-bold">
              MISSION BRIEFING
            </span>
          </div>
          <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tight text-white mb-1">
            {config.title}
          </h2>
          <span className="text-brand-orange text-xs font-mono font-extrabold uppercase tracking-wider block">
            {config.tagline}
          </span>
        </div>

        {/* Typewriter dialogue box anchored to the bottom half */}
        <div className="relative z-10 p-6 md:p-8 shrink-0 bg-gradient-to-t from-black via-[#04010a]/92 to-transparent border-t border-zinc-900/60 flex flex-col gap-4">
          <div className="min-h-16 flex items-start gap-4 p-4 bg-zinc-950/70 border border-zinc-900 rounded-lg">
            <div className="w-2 rounded-full bg-brand-cyan mt-1.5 shrink-0 animate-ping" />
            <div className="flex-1 flex flex-col">
              <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
                TRANSMISSION #{logIndex + 1}/{config.logs.length}
              </span>
              <p className="text-sm md:text-base font-mono font-bold text-white leading-relaxed text-left text-brand-emerald">
                {displayText}
                {!isDoneWriting && <span className="inline-block w-2.5 h-4 bg-emerald-400 ml-1 animate-pulse" />}
              </p>
            </div>
          </div>

          <div className="flex sm:flex-row gap-4 items-center justify-between mt-1 shrink-0">
            {/* Direct Skip option with Controller keybadge */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSkipScene}
                className="flex items-center gap-1.5 text-xs font-mono text-zinc-500 hover:text-white transition-colors cursor-pointer uppercase font-bold"
                title="Skip complete dialogue sequence"
              >
                <SkipForward className="w-3.5 h-3.5" />
                <span>Skip Sequence</span>
              </button>
              <span className="text-[9px] font-mono text-zinc-600 border border-zinc-800 rounded px-1.5 py-0.5 select-none bg-zinc-950">
                ESC / (B)
              </span>
            </div>

            {/* Next / Proceed controller button state */}
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-mono text-zinc-500 border border-zinc-800 rounded px-1.5 py-0.5 select-none bg-zinc-950">
                {isDoneWriting ? 'SPACE / (A) NEXT' : 'SPACE / (A) DECODE'}
              </span>
              {isDoneWriting ? (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleNextLine}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg border border-brand-cyan/40 bg-brand-cyan/15 text-brand-cyan text-sm tracking-widest font-mono font-extrabold cursor-pointer uppercase hover:shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all"
                >
                  <span>{logIndex === config.logs.length - 1 ? 'LAUNCH ACTION' : 'TRANSMIT LOG'}</span>
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              ) : (
                <button
                  onClick={() => {
                    setDisplayText(config.logs[logIndex]);
                    setCharIndex(config.logs[logIndex].length);
                  }}
                  className="flex items-center px-4 py-2 border border-zinc-800 bg-zinc-900/40 text-xs font-mono text-zinc-400 hover:text-white rounded-lg cursor-pointer uppercase"
                >
                  <span>FORCE DECODE</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
