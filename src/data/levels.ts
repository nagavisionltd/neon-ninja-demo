export interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
  type: 'floor' | 'wall' | 'arenaWall' | 'door' | 'truthPlatform' | 'falsePlatform' | 'barrier' | 'elevator' | 'shuttle' | 'conveyor' | 'conveyor_left' | 'hazard_spikes' | 'laser_fence';
  hidden?: boolean;
  revealed?: boolean;
  zoneId?: string;
  minY?: number;
  maxY?: number;
  minX?: number;
  maxX?: number;
  vx?: number;
  vy?: number;
  color?: string; // custom decoration/color
  freq?: number;  // behavior timing
}

export interface PhaseCatalyst {
  x: number;
  y: number;
  r: number;
  kind: 'truth' | 'false';
  cooldown: number;
  pulse: number;
}

export interface Shard {
  x: number;
  y: number;
  r: number;
  kind: 'truth' | 'false';
  collected: boolean;
  reveals?: boolean;
}

export interface FireSource {
  x: number;
  y: number;
  size: number;
}

export interface EnemyTemplate {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy?: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  type: 'knight' | 'boss' | 'drone' | 'hive_queen' | 'overlord' | 'laser_eye';
  frozenTimer: number;
  zoneId?: string;
  patrolMin?: number;
  patrolMax?: number;
  shootTimer?: number;
}

export interface RoomZone {
  id: string;
  name: string;
  x: number;
  w: number;
  y: number;
  type: string;
  note: string;
}

export interface LockedZone {
  id: string;
  triggerX: number;
  lockX: number;
  active: boolean;
  cleared: boolean;
  enemiesSpawned: boolean;
}

export interface Destructible {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: 'breakableWall' | 'breakableFloor' | 'crackedBlock' | 'crate' | 'brittleCeiling' | 'enemyBarricade';
  material?: string;
  hp: number;
  maxHp?: number;
  breakBy?: string[];
  drops?: string;
  stateAfterBreak?: string;
}

export interface LevelData {
  id: number;
  name: string;
  subtitle: string;
  difficulty: string;
  description: string;
  bgColor: string;
  skyColors: [string, string, string, string];
  moonColor: string;
  auraColor: string;
  startText: string;
  startX: number;
  startY: number;
  portalX: number;
  portalY: number;
  deathY?: number;
  platforms: Platform[];
  phaseCatalysts: PhaseCatalyst[];
  shards: Shard[];
  fireSources: FireSource[];
  enemies: EnemyTemplate[];
  roomZones: RoomZone[];
  lockedZones: LockedZone[];
  destructibles?: Destructible[];
}

export const LEVELS: LevelData[] = [
  {
    id: 1,
    name: "Moonlit Gate",
    subtitle: "Level 1: The Outskirts",
    difficulty: "Normal",
    description: "Scale high-tech rooftops and dodge hazards under a massive cyber-moon. Master the art of phase-shifting to leap over the bottomless city abyss.",
    bgColor: "#020005",
    skyColors: ["#020b24", "#0a1f4d", "#12347d", "#00c3ff"],
    moonColor: "rgba(0, 229, 255, 0.9)",
    auraColor: "#00e5ff",
    startText: "The outskirts are silent... Watch your step over the rooftops.",
    startX: 120,
    startY: 180, // High roof drop landing
    portalX: 7800,
    portalY: 350,
    lockedZones: [
      { id: 'gate1', triggerX: 1900, lockX: 1950, active: false, cleared: false, enemiesSpawned: false },
      { id: 'gate2', triggerX: 5200, lockX: 5350, active: false, cleared: false, enemiesSpawned: false },
      { id: 'gate3', triggerX: 6900, lockX: 7000, active: false, cleared: false, enemiesSpawned: false }
    ],
    roomZones: [
      { id: 'R1', name: 'The Firebrand Run', x: 0, w: 1800, y: 600, type: 'Horizontal Run', note: 'Run, Dash and collect' },
      { id: 'R2', name: 'Iron Containment', x: 1800, w: 1400, y: 600, type: 'Locked Arena 1', note: 'Exterminate the guards' },
      { id: 'R3', name: 'The Z-Heights', x: 3200, w: 1800, y: 600, type: 'Z-Climb & Orbs', note: 'Wall jump & Phase sequence' },
      { id: 'R4', name: 'Volcano Core', x: 5000, w: 1600, y: 600, type: 'Locked Arena 2', note: 'Fight the elite shieldmen' },
      { id: 'R13', name: 'Keepers Inner Sanctum', x: 6600, w: 1600, y: 600, type: 'Boss Fight', note: 'Defeat the Memory Keeper' }
    ],
    platforms: [
      // Rooftops Start Block (Spawn) - Sloped/staggered introductory steps
      { x: -250, y: 550, w: 600, h: 450, type: 'floor' }, 
      { x: 350, y: 480, w: 150, h: 520, type: 'floor' },
      { x: 500, y: 410, w: 300, h: 590, type: 'floor' },

      // First Rooftop Pitfall Jumping Sequence (X = 800 to 1800)
      { x: 920, y: 380, w: 120, h: 20, type: 'floor' },
      { x: 1180, y: 320, w: 120, h: 20, type: 'truthPlatform' },
      { x: 1420, y: 380, w: 120, h: 20, type: 'falsePlatform' },
      { x: 1480, y: 220, w: 120, h: 20, type: 'elevator', minY: 150, maxY: 480, vy: -2, vx: 0 },
      { x: 1650, y: 300, w: 120, h: 20, type: 'shuttle', minX: 1650, maxX: 1950, vx: 2, vy: 0 },

      // R2 Arena: Cyber-Combat Ring (Stepped basin)
      { x: 2000, y: 550, w: 1000, h: 450, type: 'floor' },
      { x: 2000, y: 0, w: 40, h: 600, type: 'barrier', zoneId: 'gate1' },
      { x: 2960, y: 0, w: 40, h: 600, type: 'barrier', zoneId: 'gate1' },
      
      // Floating tactical cover blocks in arena
      { x: 2200, y: 440, w: 140, h: 20, type: 'floor' },
      { x: 2660, y: 440, w: 140, h: 20, type: 'floor' },
      { x: 2430, y: 320, w: 140, h: 20, type: 'floor' },
      { x: 3000, y: 550, w: 200, h: 450, type: 'floor' }, // Exit pad

      // R3: The Z-Heights Climbing Platform Sequence (Floating towers)
      { x: 3300, y: 250, w: 100, h: 350, type: 'wall' }, 
      { x: 3600, y: 50, w: 100, h: 550, type: 'wall' },   
      { x: 3900, y: 250, w: 100, h: 350, type: 'wall' }, 
      
      // Phase shifted floating stairs
      { x: 3260, y: 150, w: 100, h: 20, type: 'truthPlatform' },
      { x: 3560, y: -50, w: 100, h: 20, type: 'falsePlatform' },
      { x: 3860, y: 150, w: 100, h: 20, type: 'truthPlatform' },
      
      { x: 4120, y: 280, w: 120, h: 20, type: 'truthPlatform', hidden: true, revealed: false },
      { x: 4320, y: 360, w: 120, h: 20, type: 'falsePlatform' },
      { x: 4520, y: 240, w: 120, h: 20, type: 'truthPlatform', hidden: true, revealed: false },
      { x: 4720, y: 160, w: 120, h: 20, type: 'falsePlatform' },
      { x: 4920, y: 280, w: 200, h: 20, type: 'floor' },

      // R4 Arena: Volcano Core Suspended Platforms
      { x: 5120, y: 550, w: 1400, h: 450, type: 'floor' },
      { x: 5250, y: 460, w: 140, h: 90, type: 'floor' },
      { x: 6250, y: 460, w: 140, h: 90, type: 'floor' },
      { x: 5350, y: 0, w: 40, h: 600, type: 'barrier', zoneId: 'gate2' },
      { x: 6520, y: 0, w: 40, h: 600, type: 'barrier', zoneId: 'gate2' },
      
      { x: 5600, y: 340, w: 140, h: 20, type: 'shuttle', minX: 5600, maxX: 6000, vx: 2, vy: 0 },
      { x: 5850, y: 180, w: 140, h: 20, type: 'truthPlatform' },
      { x: 6520, y: 550, w: 200, h: 450, type: 'floor' },

      // Boss Sanctum Hangar Base (The Memory Keeper's Throne)
      { x: 6800, y: 550, w: 600, h: 450, type: 'floor' }, // Entry hall
      { x: 7400, y: 650, w: 1200, h: 350, type: 'floor' }, // Lowered boss arena pit
      { x: 7650, y: 550, w: 250, h: 25, type: 'floor' },   // Center altar
      { x: 7000, y: 100, w: 40, h: 600, type: 'barrier', zoneId: 'gate3' },
      { x: 8600, y: 100, w: 40, h: 600, type: 'arenaWall' }
    ],
    phaseCatalysts: [
      { x: 4060, y: 320, r: 14, kind: 'truth', cooldown: 0, pulse: 0 },
      { x: 4260, y: 400, r: 14, kind: 'false', cooldown: 0, pulse: 0 },
      { x: 4460, y: 280, r: 14, kind: 'truth', cooldown: 0, pulse: 0 },
      { x: 4660, y: 200, r: 14, kind: 'false', cooldown: 0, pulse: 0 }
    ],
    shards: [
      { x: 680, y: 300, r: 12, kind: 'truth', collected: false, reveals: true }, 
      { x: 2550, y: 260, r: 12, kind: 'false', collected: false }, 
      { x: 3350, y: -100, r: 12, kind: 'truth', collected: false, reveals: true },
      { x: 6000, y: 120, r: 12, kind: 'truth', collected: false, reveals: true }
    ],
    fireSources: [
      { x: 200, y: 580, size: 25 }, { x: 800, y: 580, size: 20 },
      { x: 1350, y: 580, size: 30 }, { x: 2150, y: 580, size: 40 }, 
      { x: 2650, y: 580, size: 40 }, { x: 3400, y: 580, size: 35 },
      { x: 4300, y: 580, size: 45 }, { x: 4600, y: 580, size: 45 },
      { x: 5600, y: 580, size: 40 }, { x: 7100, y: 580, size: 35 },
      { x: 7900, y: 580, size: 35 }
    ],
    enemies: [
      { id: '1_d1', x: 700, y: 320, w: 32, h: 32, vx: 0, hp: 4, maxHp: 4, alive: true, type: 'drone', frozenTimer: 0 },
      { id: '1_e1', x: 2200, y: 400, w: 40, h: 40, vx: 0, hp: 6, maxHp: 6, alive: true, type: 'knight', frozenTimer: 0 },
      { id: '1_e2', x: 2700, y: 400, w: 40, h: 40, vx: 0, hp: 6, maxHp: 6, alive: true, type: 'knight', frozenTimer: 0 },
      { id: '1_d2', x: 2450, y: 200, w: 32, h: 32, vx: 0, hp: 4, maxHp: 4, alive: true, type: 'drone', frozenTimer: 0 },
      { id: '1_e3', x: 5200, y: 500, w: 40, h: 40, vx: 0, hp: 8, maxHp: 8, alive: true, type: 'knight', frozenTimer: 0 },
      { id: '1_e4', x: 6200, y: 500, w: 40, h: 40, vx: 0, hp: 8, maxHp: 8, alive: true, type: 'knight', frozenTimer: 0 },
      { id: '1_d3', x: 5800, y: 100, w: 32, h: 32, vx: 0, hp: 4, maxHp: 4, alive: true, type: 'drone', frozenTimer: 0 },
      { id: 'boss', x: 7710, y: 450, w: 80, h: 100, vx: 0, hp: 75, maxHp: 75, alive: true, type: 'boss', frozenTimer: 0 }
    ]
  },
  {
    id: 2,
    name: "The Burning Ruins",
    subtitle: "Level 2: City of Flames",
    difficulty: "Hard",
    description: "Infiltrate a burning mechanical fortress. Sprint past columns on fire, mount high-altitude vertical tower vaults, and fight the Overlord core boss on the stormy rooftop.",
    bgColor: "#0f0502",
    skyColors: ["#180300", "#300800", "#5c1300", "#ffa500"],
    moonColor: "rgba(255, 95, 0, 0.95)",
    auraColor: "#ff7300",
    startText: "The cyber-city ruins are on fire! Push through and scale the central tower.",
    startX: 180,
    startY: 230, // Elevated tower platform entry drop
    portalX: 9500,
    portalY: -410,
    lockedZones: [
      { id: 'gateH1', triggerX: 1000, lockX: 1100, active: false, cleared: false, enemiesSpawned: false },
      { id: 'gateH2', triggerX: 6900, lockX: 6950, active: false, cleared: false, enemiesSpawned: false },
      { id: 'gateH3', triggerX: 8600, lockX: 8700, active: false, cleared: false, enemiesSpawned: false }
    ],
    roomZones: [
      { id: 'H1', name: 'The Burning Ruins', x: 0, w: 1800, y: 600, type: 'Burning City Run', note: 'Sprint and dodge collapsing flame-pillars' },
      { id: 'H2', name: 'The Cyber Runway', x: 1800, w: 2200, y: 600, type: 'Sprint Fields', note: 'Long unhindered high-speed run and dash' },
      { id: 'H3', name: 'The Infiltration Hangar', x: 4000, w: 2800, y: 600, type: 'Tower Ascent', note: 'Climb high-altitude ventilation shafts to reach the roof top' },
      { id: 'H4', name: 'The Stormy Rooftop', x: 6800, w: 1600, y: -300, type: 'Roof Defenses', note: 'Vanquish roof patrol bots' },
      { id: 'H5', name: 'The Reactor Peak', x: 8400, w: 1600, y: -300, type: 'Boss Fight', note: 'Slay the Nuclear Hive Queen on the tower roof' }
    ],
    platforms: [
      // Ruins Base Runway (Floor at y = 550) - Start with staggered elevated blocks
      { x: -200, y: 550, w: 500, h: 450, type: 'floor' },
      { x: 300, y: 620, w: 800, h: 350, type: 'floor' }, 
      { x: 1100, y: 550, w: 700, h: 450, type: 'floor' },

      // Crumbling/burning ruin pillars inside Area 1
      { x: 300, y: 460, w: 140, h: 160, type: 'floor' },
      { x: 600, y: 390, w: 140, h: 230, type: 'floor' },
      { x: 900, y: 480, w: 140, h: 140, type: 'floor' },

      // Burning ruins containment gate
      { x: 1100, y: 0, w: 40, h: 550, type: 'barrier', zoneId: 'gateH1' },
      { x: 1700, y: 0, w: 40, h: 550, type: 'barrier', zoneId: 'gateH1' },
      { x: 1250, y: 440, w: 100, h: 20, type: 'truthPlatform' },
      { x: 1400, y: 350, w: 100, h: 20, type: 'falsePlatform' },
      { x: 1550, y: 440, w: 100, h: 20, type: 'floor' },

      // THE EPIC SPRINT RUNWAY (X = 1800 to 4000) - Real speed-run terrain!
      { x: 1800, y: 550, w: 2200, h: 450, type: 'floor' },
      
      // Series of descending & ascending slanting blocks to slide/dash over
      { x: 2100, y: 450, w: 200, h: 100, type: 'floor' },
      { x: 2500, y: 380, w: 200, h: 170, type: 'floor' },
      { x: 2900, y: 310, w: 200, h: 240, type: 'floor' },
      { x: 3300, y: 240, w: 200, h: 310, type: 'truthPlatform' },
      { x: 3700, y: 170, w: 200, h: 380, type: 'falsePlatform' },

      // THE CENTRAL TOWER BASE & VERTICAL CHIMNEY VAULT (X = 4000 to 5800)
      { x: 4000, y: 550, w: 1800, h: 450, type: 'floor' },
      
      // Dual wall structures perfect for wall jumps (X = 4160 and X = 4410)
      { x: 4160, y: -450, w: 40, h: 1000, type: 'wall' },
      { x: 4410, y: -450, w: 40, h: 1000, type: 'wall' },

      // Thin side-shelves 
      { x: 4200, y: 360, w: 40, h: 15, type: 'truthPlatform' },
      { x: 4370, y: 200, w: 40, h: 15, type: 'falsePlatform' },
      { x: 4200, y: 40, w: 40, h: 15, type: 'truthPlatform' },
      { x: 4370, y: -120, w: 40, h: 15, type: 'falsePlatform' },

      // Tower auxiliary cargo elevator & shuttle transit
      { x: 4520, y: 250, w: 125, h: 25, type: 'elevator', minY: -300, maxY: 480, vy: -3 },
      { x: 4720, y: 80, w: 120, h: 25, type: 'shuttle', minX: 4680, maxX: 4980, vx: 2 },
      { x: 4960, y: -250, w: 60, h: 800, type: 'wall' }, // Tower back border

      // SECOND EXCEL PLATFORMING FIELD (X = 5000 to 6800)
      { x: 5020, y: 550, w: 1800, h: 450, type: 'floor' },
      { x: 5300, y: 420, w: 200, h: 20, type: 'elevator', minY: 220, maxY: 500, vx: 0, vy: -2 },
      { x: 5650, y: 310, w: 200, h: 20, type: 'truthPlatform' },
      { x: 5950, y: 220, w: 220, h: 20, type: 'falsePlatform' },
      { x: 6250, y: 340, w: 250, h: 20, type: 'floor' },

      // TOWER STORMY ROOF FLOOR (Floor at y = -300)
      { x: 6800, y: -300, w: 3200, h: 440, type: 'floor' },

      // Hangar guard gates on roof top
      { x: 6950, y: -850, w: 40, h: 550, type: 'barrier', zoneId: 'gateH2' },
      { x: 7600, y: -850, w: 40, h: 550, type: 'barrier', zoneId: 'gateH2' },
      
      // Roof battle cover items
      { x: 7100, y: -380, w: 100, h: 80, type: 'floor' },
      { x: 7350, y: -440, w: 100, h: 140, type: 'floor' },

      // Boss Peak Roof Arena walls and stepped throne
      { x: 8800, y: -320, w: 150, h: 20, type: 'floor' }, // Steps up
      { x: 8950, y: -340, w: 150, h: 40, type: 'floor' },
      { x: 9100, y: -360, w: 300, h: 60, type: 'floor' }, // Center throne floor
      
      { x: 8700, y: -800, w: 40, h: 500, type: 'barrier', zoneId: 'gateH3' },
      { x: 9600, y: -800, w: 40, h: 500, type: 'arenaWall' }
    ],
    phaseCatalysts: [
      { x: 400, y: 350, r: 14, kind: 'truth', cooldown: 0, pulse: 0 },
      { x: 600, y: 200, r: 14, kind: 'false', cooldown: 0, pulse: 0 },
      { x: 1100, y: 300, r: 14, kind: 'truth', cooldown: 0, pulse: 0 },
      { x: 2150, y: 300, r: 14, kind: 'false', cooldown: 0, pulse: 0 },
      { x: 3300, y: 280, r: 14, kind: 'truth', cooldown: 0, pulse: 0 },
      { x: 5200, y: 300, r: 14, kind: 'false', cooldown: 0, pulse: 0 }
    ],
    shards: [
      { x: 600, y: 220, r: 12, kind: 'truth', collected: false, reveals: true },
      { x: 1250, y: 380, r: 12, kind: 'false', collected: false },
      { x: 2400, y: 280, r: 12, kind: 'truth', collected: false },
      { x: 4300, y: -180, r: 12, kind: 'truth', collected: false },
      { x: 6000, y: 150, r: 12, kind: 'false', collected: false }
    ],
    fireSources: [
      { x: 200, y: 530, size: 30 }, { x: 500, y: 530, size: 40 },
      { x: 800, y: 530, size: 35 }, { x: 1200, y: 530, size: 45 },
      { x: 1450, y: 530, size: 30 }, { x: 1700, y: 530, size: 50 },
      { x: 2300, y: 530, size: 35 }, { x: 3100, y: 530, size: 40 },
      { x: 5200, y: 530, size: 35 }, { x: 6100, y: 530, size: 40 },
      { x: 6800, y: -320, size: 25 }, { x: 7400, y: -320, size: 25 }
    ],
    enemies: [
      { id: 'h_drone_1', x: 400, y: 350, w: 32, h: 32, vx: 0, hp: 4, maxHp: 4, alive: true, type: 'drone', frozenTimer: 0 },
      { id: 'h_drone_2', x: 840, y: 300, w: 32, h: 32, vx: 0, hp: 4, maxHp: 4, alive: true, type: 'drone', frozenTimer: 0 },
      { id: 'h_drone_3', x: 2250, y: 320, w: 32, h: 32, vx: 0, hp: 4, maxHp: 4, alive: true, type: 'drone', frozenTimer: 0 },
      { id: 'h_drone_4', x: 3300, y: 200, w: 32, h: 32, vx: 0, hp: 4, maxHp: 4, alive: true, type: 'drone', frozenTimer: 0 },
      { id: 'h_drone_5', x: 5400, y: 280, w: 32, h: 32, vx: 0, hp: 4, maxHp: 4, alive: true, type: 'drone', frozenTimer: 0 },
      { id: 'h_drone_6', x: 7250, y: -350, w: 32, h: 32, vx: 0, hp: 4, maxHp: 4, alive: true, type: 'drone', frozenTimer: 0 },
      { id: 'h_boss', x: 9100, y: -390, w: 80, h: 90, vx: 0, hp: 80, maxHp: 80, alive: true, type: 'hive_queen', frozenTimer: 0 }
    ]
  },
  {
    id: 3,
    name: "Ventilation Battery",
    subtitle: "Level 3: Hangar & Ventilation Core",
    difficulty: "Normal",
    description: "Storm a high-altitude flying fortress and industrial shipyard. Climb along bronze and copper pipeline rings, giant ventilation drafts, steam-release valves, and heavy blast shutters, while thermal core drafts boost your jump lift.",
    bgColor: "#16061c",
    skyColors: ["#1c041f", "#3c0b30", "#63132e", "#eba445"],
    moonColor: "rgba(255, 117, 26, 0.95)",
    auraColor: "#eba445",
    startText: "Hangar ventilation drafts active! Enjoy low-gravity thermal lift and floaty ascending climbs!",
    startX: 80,
    startY: 280, // Catwalk scaffolding drop
    portalX: 5450,
    portalY: -220,
    lockedZones: [
      { id: 'gateW1', triggerX: 1100, lockX: 1200, active: false, cleared: false, enemiesSpawned: false },
      { id: 'gateW2', triggerX: 3500, lockX: 3550, active: false, cleared: false, enemiesSpawned: false },
      { id: 'gateW3', triggerX: 4500, lockX: 4600, active: false, cleared: false, enemiesSpawned: false }
    ],
    roomZones: [
      { id: 'W1', name: 'Ventilation Conduit', x: 0, w: 1200, y: 600, type: 'Ascending Flow', note: 'Float over industrial exhaust grids' },
      { id: 'W2', name: 'Steam-Sec Sweep', x: 1200, w: 2300, y: 600, type: 'Purification Arena', note: 'Purge elite security security nodes' },
      { id: 'W3', name: 'Generator Flumes', x: 3500, w: 900, y: 600, type: 'Pressure Shunts', note: 'Use ventilation elevators to reach the reactor' },
      { id: 'W4', name: 'Battery Core', x: 4400, w: 1600, y: 600, type: 'Boss Zenith', note: 'Defeat the Sword Sentinel inside the engine room' }
    ],
    platforms: [
      // Platform segment 1 - Starting staircase and pipes
      { x: -250, y: 550, w: 400, h: 450, type: 'floor' },
      { x: 150, y: 480, w: 200, h: 520, type: 'floor' },
      { x: 350, y: 410, w: 450, h: 590, type: 'floor' },
      { x: 450, y: 300, w: 180, h: 25, type: 'floor' },

      // Platform segment 2 (Ventilation flow jump gaps)
      { x: 800, y: -400, w: 40, h: 810, type: 'barrier', zoneId: 'gateW1' },
      { x: 900, y: 350, w: 150, h: 25, type: 'elevator', minY: 200, maxY: 500, vx: 0, vy: -3 },
      { x: 1200, y: 300, w: 180, h: 25, type: 'floor' },
      { x: 1500, y: 420, w: 180, h: 25, type: 'truthPlatform' },
      { x: 1750, y: 280, w: 150, h: 25, type: 'falsePlatform' },

      // Arena area: W2 (Suspended platforms)
      { x: 2000, y: 550, w: 1500, h: 450, type: 'floor' },
      // Funnel bounds
      { x: 1200, y: -200, w: 40, h: 800, type: 'barrier', zoneId: 'gateW1' },
      { x: 1950, y: -200, w: 40, h: 800, type: 'barrier', zoneId: 'gateW1' },
      
      // Floating combat blocks
      { x: 2150, y: 400, w: 150, h: 30, type: 'floor' },
      { x: 2450, y: 300, w: 150, h: 30, type: 'floor' },
      { x: 2800, y: 400, w: 150, h: 30, type: 'floor' },
      { x: 3100, y: 460, w: 150, h: 30, type: 'floor' },

      // Generator Flumes
      { x: 3550, y: -200, w: 40, h: 800, type: 'barrier', zoneId: 'gateW2' },
      { x: 3500, y: 550, w: 900, h: 450, type: 'floor' },
      { x: 3700, y: 350, w: 140, h: 20, type: 'shuttle', minX: 3700, maxX: 4000, vx: 3, vy: 0 },
      { x: 4100, y: 250, w: 140, h: 20, type: 'elevator', minY: 100, maxY: 600, vy: -4, vx: 0 },

      // Battery Core Boss Room
      { x: 4400, y: 550, w: 600, h: 450, type: 'floor' }, // entrance
      { x: 5000, y: 650, w: 800, h: 350, type: 'floor' }, // Boss lowered pit
      { x: 5200, y: 450, w: 400, h: 30, type: 'floor' }, // Boss floating roof cover
      
      { x: 4600, y: -100, w: 40, h: 650, type: 'barrier', zoneId: 'gateW3' },
      { x: 5800, y: -100, w: 40, h: 650, type: 'arenaWall' }
    ],
    phaseCatalysts: [
      { x: 500, y: 320, r: 14, kind: 'truth', cooldown: 0, pulse: 0 },
      { x: 1100, y: 120, r: 14, kind: 'false', cooldown: 0, pulse: 0 },
      { x: 2600, y: 100, r: 14, kind: 'truth', cooldown: 0, pulse: 0 }
    ],
    shards: [
      { x: 980, y: 150, r: 12, kind: 'truth', collected: false },
      { x: 2100, y: 100, r: 12, kind: 'false', collected: false },
      { x: 3950, y: -240, r: 12, kind: 'truth', collected: false }
    ],
    fireSources: [], // No flames underwater!
    enemies: [
      { id: 'w_drone_1', x: 450, y: 330, w: 32, h: 32, vx: 0, hp: 5, maxHp: 5, alive: true, type: 'drone', frozenTimer: 0 },
      { id: 'w_drone_2', x: 920, y: 150, w: 32, h: 32, vx: 0, hp: 5, maxHp: 5, alive: true, type: 'drone', frozenTimer: 0 },
      { id: 'w_mid_knight_1', x: 1950, y: 210, w: 40, h: 40, vx: 0, hp: 8, maxHp: 8, alive: true, type: 'knight', frozenTimer: 0 },
      { id: 'w_mid_knight_2', x: 2500, y: 210, w: 40, h: 40, vx: 0, hp: 8, maxHp: 8, alive: true, type: 'knight', frozenTimer: 0 },
      { id: 'w_mid_drone_1', x: 2900, y: 120, w: 32, h: 32, vx: 0, hp: 6, maxHp: 6, alive: true, type: 'drone', frozenTimer: 0 },
      { id: 'w_boss', x: 5150, y: -190, w: 80, h: 90, vx: 0, hp: 95, maxHp: 95, alive: true, type: 'boss', frozenTimer: 0 }
    ]
  },
  {
    id: 4,
    name: "Oblivion Abyss",
    subtitle: "Level 4: Zero Singularity",
    difficulty: "Midnight",
    description: "Conquer a long cyber-singularity corridor of charcoal obsidian and crimson fire. Charge past laser defense fields, breach sector containment blocks, and meet the final Overlord.",
    bgColor: "#050002",
    skyColors: ["#050001", "#150005", "#30000a", "#7a001a"],
    moonColor: "rgba(255, 12, 12, 0.95)",
    auraColor: "#ff003c",
    startText: "The singularity core is close... Run, jump, and stay on the corridor floor!",
    startX: 120,
    startY: 200, // Sky bridge drop
    portalX: 4700,
    portalY: 410,
    lockedZones: [
      { id: 'gateV1', triggerX: 1300, lockX: 1400, active: false, cleared: false, enemiesSpawned: false },
      { id: 'gateV2', triggerX: 2500, lockX: 2650, active: false, cleared: false, enemiesSpawned: false },
      { id: 'gateV3', triggerX: 4120, lockX: 4150, active: false, cleared: false, enemiesSpawned: false }
    ],
    roomZones: [
      { id: 'V1', name: 'Dimensional Sky Islands', x: 0, w: 1300, y: 600, type: 'Lethal Void Crossing', note: 'Hop between floating pillars' },
      { id: 'V2', name: 'Zero Security Well', x: 1300, w: 1200, y: 600, type: 'Fight Pit', note: 'Defeat the Sentinels in the suspended hangar' },
      { id: 'V3', name: 'Oblivion Bridge Run', x: 2500, w: 1200, y: 600, type: 'Severe Phase Sequencing', note: 'Hop across unstable truth/false plates' },
      { id: 'V4', name: 'Singularity Heart', x: 3700, w: 1000, y: 600, type: 'Ultimate Decisive', note: 'Annihilate the Singularity Overlord' }
    ],
    platforms: [
      // Sector 1: Start Obsidian Runway (Floor at y = 550)
      { x: -200, y: 550, w: 600, h: 450, type: 'floor' },
      { x: 450, y: 520, w: 150, h: 450, type: 'floor' },
      { x: 650, y: 450, w: 150, h: 450, type: 'floor' },
      { x: 900, y: 380, w: 150, h: 450, type: 'floor' },

      // Small tactical jumping hurdles
      { x: 1100, y: 440, w: 120, h: 25, type: 'truthPlatform' },
      { x: 1250, y: 320, w: 120, h: 25, type: 'falsePlatform' },

      // Locked Sentry Site V1 (Floor inside)
      { x: 1340, y: 550, w: 1160, h: 450, type: 'floor' },
      { x: 1600, y: 450, w: 100, h: 20, type: 'floor' },
      { x: 1900, y: 350, w: 100, h: 20, type: 'floor' },
      { x: 2200, y: 450, w: 100, h: 20, type: 'floor' },
      { x: 1400, y: 0, w: 40, h: 550, type: 'barrier', zoneId: 'gateV1' },
      { x: 2100, y: 0, w: 40, h: 550, type: 'barrier', zoneId: 'gateV1' },

      // Sector 2: Mid-range corridor connecting to V2
      { x: 2500, y: 550, w: 1150, h: 450, type: 'floor' },
      { x: 2700, y: 440, w: 180, h: 20, type: 'truthPlatform' },
      { x: 2950, y: 480, w: 180, h: 20, type: 'falsePlatform' },
      { x: 3200, y: 420, w: 180, h: 20, type: 'floor' },
      
      { x: 2650, y: 0, w: 40, h: 550, type: 'barrier', zoneId: 'gateV2' },
      { x: 3600, y: 0, w: 40, h: 550, type: 'barrier', zoneId: 'gateV2' },

      // Sector 3: Magma Chamber Shuttle crossings before boss door
      { x: 3650, y: 550, w: 100, h: 450, type: 'floor' },
      { x: 3750, y: 380, w: 140, h: 25, type: 'shuttle', minX: 3720, maxX: 3980, vx: 2, vy: 0 },
      { x: 3960, y: 440, w: 140, h: 25, type: 'elevator', minY: 150, maxY: 485, vy: -3, vx: 0 },

      // Sector 4: Final Overlord Boss Chamber
      { x: 4100, y: 550, w: 1100, h: 450, type: 'floor' },
      { x: 4120, y: 100, w: 40, h: 450, type: 'barrier', zoneId: 'gateV3' },
      { x: 4800, y: 100, w: 40, h: 450, type: 'arenaWall' }
    ],
    phaseCatalysts: [
      { x: 400, y: 250, r: 14, kind: 'truth', cooldown: 0, pulse: 0 },
      { x: 740, y: 180, r: 14, kind: 'false', cooldown: 0, pulse: 0 },
      { x: 1650, y: 280, r: 14, kind: 'truth', cooldown: 0, pulse: 0 },
      { x: 2900, y: 210, r: 14, kind: 'truth', cooldown: 0, pulse: 0 }
    ],
    shards: [
      { x: 620, y: 180, r: 12, kind: 'truth', collected: false },
      { x: 1600, y: 220, r: 12, kind: 'false', collected: false },
      { x: 3100, y: 180, r: 12, kind: 'truth', collected: false }
    ],
    fireSources: [
      { x: 200, y: 530, size: 28 }, { x: 700, y: 530, size: 28 },
      { x: 1450, y: 530, size: 30 }, { x: 1850, y: 530, size: 35 },
      { x: 2800, y: 530, size: 35 }, { x: 3200, y: 530, size: 40 },
      { x: 4200, y: 530, size: 45 }
    ],
    enemies: [
      { id: 'v_e1', x: 700, y: 340, w: 40, h: 40, vx: 0, hp: 8, maxHp: 8, alive: true, type: 'knight', frozenTimer: 0 },
      { id: 'v_d1', x: 1000, y: 220, w: 32, h: 32, vx: 0, hp: 5, maxHp: 5, alive: true, type: 'drone', frozenTimer: 0 },
      { id: 'v_sent_1', x: 1550, y: 512, w: 40, h: 40, vx: 0, hp: 12, maxHp: 12, alive: true, type: 'knight', frozenTimer: 0 },
      { id: 'v_sent_2', x: 1950, y: 512, w: 40, h: 40, vx: 0, hp: 12, maxHp: 12, alive: true, type: 'knight', frozenTimer: 0 },
      { id: 'v_e3', x: 2800, y: 512, w: 40, h: 40, vx: 0, hp: 10, maxHp: 10, alive: true, type: 'knight', frozenTimer: 0 },
      { id: 'v_e4', x: 3300, y: 512, w: 40, h: 40, vx: 0, hp: 10, maxHp: 10, alive: true, type: 'knight', frozenTimer: 0 },
      { id: 'v_boss', x: 4450, y: 460, w: 80, h: 110, vx: 0, hp: 130, maxHp: 130, alive: true, type: 'overlord', frozenTimer: 0 }
    ]
  },
  {
    id: 5,
    name: "Iron Spine Conduit",
    subtitle: "Level 5: Rapid Sector",
    difficulty: "Hard",
    description: "Charge through a high-momentum automated launcher corridor. Speed past elite security patrol eyes, dash over hazardous vents, and crush the mechanical drone sentinel.",
    bgColor: "#07060d",
    skyColors: ["#0b081c", "#1d1230", "#391b4f", "#00ffea"],
    moonColor: "rgba(0, 255, 234, 0.9)",
    auraColor: "#00ffea",
    startText: "SYSTEM PROTOCOL: Refinery Conduit Active. Accelerate, shift color frequencies, and breach the core!",
    startX: 150,
    startY: 180, // High scaffolding drop
    portalX: 4520,
    portalY: 410,
    lockedZones: [
      { id: 'gateE1', triggerX: 2410, lockX: 2500, active: false, cleared: false, enemiesSpawned: false },
      { id: 'gateE2', triggerX: 3820, lockX: 3850, active: false, cleared: false, enemiesSpawned: false }
    ],
    roomZones: [
      { id: 'r1', name: 'Refinery Threshold', x: 0, w: 700, y: 600, type: 'Horizontal Run', note: 'Sprint and match' },
      { id: 'r2', name: 'Refinery Abyss', x: 700, w: 900, y: 600, type: 'Phase Leap', note: 'Time your phase shifts' },
      { id: 'r3', name: 'Thermal Elevator', x: 1600, w: 800, y: 600, type: 'Vertical Hangar', note: 'Use ventilation elevators' },
      { id: 'r4', name: 'Security Hub', x: 2400, w: 1300, y: 600, type: 'Combat Sprint', note: 'Defeat security guards' },
      { id: 'r5', name: 'Reactor Zenith Sanctum', x: 3700, w: 1200, y: 600, type: 'Decisive Boss', note: 'Annihilate the core warden' }
    ],
    platforms: [
      // Starting Area Runway - staggered metallic blocks
      { x: -200, y: 550, w: 400, h: 450, type: 'floor' },
      { x: 300, y: 510, w: 200, h: 20, type: 'floor' },
      { x: 550, y: 460, w: 200, h: 20, type: 'floor' },

      // Floating platform step challenges (Flow flow)
      { x: 760, y: 500, w: 180, h: 25, type: 'floor' },
      { x: 980, y: 440, w: 180, h: 25, type: 'truthPlatform' },
      { x: 1220, y: 380, w: 220, h: 25, type: 'falsePlatform' },

      // Mid transition landing zone
      { x: 1600, y: 550, w: 300, h: 450, type: 'floor' },

      // Fast upward moving elevator launcher
      { x: 1960, y: 420, w: 200, h: 25, type: 'elevator', minY: 150, maxY: 480, vy: -3, vx: 0 },

      // Secure corridor floor
      { x: 2400, y: 550, w: 1100, h: 450, type: 'floor' },

      // Closed sector gate walls
      { x: 2500, y: 100, w: 40, h: 450, type: 'barrier', zoneId: 'gateE1' },
      { x: 3150, y: 100, w: 40, h: 450, type: 'barrier', zoneId: 'gateE1' },

      // Secondary forward jumping platform
      { x: 3240, y: 450, w: 180, h: 25, type: 'floor' },
      { x: 3490, y: 390, w: 180, h: 25, type: 'falsePlatform' },

      // Final boss chamber stadium
      { x: 3760, y: 550, w: 1200, h: 450, type: 'floor' },
      { x: 3820, y: 100, w: 40, h: 450, type: 'barrier', zoneId: 'gateE2' },
      { x: 4720, y: 100, w: 40, h: 450, type: 'arenaWall' }
    ],
    phaseCatalysts: [
      { x: 500, y: 450, r: 14, kind: 'truth', cooldown: 0, pulse: 0 },
      { x: 1100, y: 320, r: 14, kind: 'false', cooldown: 0, pulse: 0 },
      { x: 2550, y: 450, r: 14, kind: 'truth', cooldown: 0, pulse: 0 }
    ],
    shards: [
      { x: 840, y: 350, r: 12, kind: 'truth', collected: false },
      { x: 1760, y: 380, r: 12, kind: 'false', collected: false },
      { x: 3390, y: 300, r: 12, kind: 'truth', collected: false }
    ],
    fireSources: [],
    enemies: [
      { id: 'e1_add', x: 250, y: 400, w: 32, h: 32, vx: 0, hp: 5, maxHp: 5, alive: true, type: 'drone', frozenTimer: 0 },
      { id: 'e1', x: 800, y: 440, w: 32, h: 32, vx: 0, hp: 5, maxHp: 5, alive: true, type: 'drone', frozenTimer: 0 },
      { id: 'e2', x: 1050, y: 340, w: 32, h: 32, vx: 0, hp: 5, maxHp: 5, alive: true, type: 'drone', frozenTimer: 0 },
      { id: 'e3', x: 1680, y: 500, w: 40, h: 40, vx: 0, hp: 12, maxHp: 12, alive: true, type: 'knight', frozenTimer: 0 },
      { id: 'e3_b', x: 2700, y: 500, w: 40, h: 40, vx: 0, hp: 12, maxHp: 12, alive: true, type: 'knight', frozenTimer: 0 },
      { id: 'e4', x: 3300, y: 360, w: 32, h: 32, vx: 0, hp: 6, maxHp: 6, alive: true, type: 'drone', frozenTimer: 0 },
      { id: 'e5', x: 4200, y: 460, w: 80, h: 90, vx: 0, hp: 110, maxHp: 110, alive: true, type: 'boss', frozenTimer: 0 }
    ]
  },
  {
    id: 6,
    name: "Flooded Sub-Lab Core",
    subtitle: "Level 6: Underwater Swimming",
    difficulty: "Midnight",
    description: "Submerge into the sub-aquatic flooded cooling reactor. Steer freely inside currents, dodge submerged energy beams, and trigger deep phase systems in zero-buoyancy waters.",
    bgColor: "#04151a",
    skyColors: ["#020b12", "#041b26", "#092f3d", "#00e5ff"],
    moonColor: "rgba(0, 229, 255, 0.95)",
    auraColor: "#c1f5ff",
    startText: "SUB-AQUATIC CORE: Water temperatures stable. Swim dynamically upwards using jump keys, slash underwater grid traps, and unlock the Reactor seal.",
    startX: 300,
    startY: 250, // High vertical cavern chute drop sequence
    portalX: 5200,
    portalY: -1040,
    lockedZones: [
      { id: 'gateA1', triggerX: 1100, lockX: 1200, active: false, cleared: false, enemiesSpawned: false },
      { id: 'gateA2', triggerX: 2500, lockX: 2600, active: false, cleared: false, enemiesSpawned: false },
      { id: 'gateA3', triggerX: 3800, lockX: 3900, active: false, cleared: false, enemiesSpawned: false },
      { id: 'gateA4', triggerX: 4700, lockX: 4800, active: false, cleared: false, enemiesSpawned: false }
    ],
    roomZones: [
      { id: 'hub', name: 'Hub Nest Entrance', x: 0, w: 900, y: 800, type: 'hub', note: 'Starting cave gate' },
      { id: 'worker_tunnels', name: 'Worker Tunnels', x: 900, w: 900, y: 800, type: 'corridor', note: 'Dodge workers and drones' },
      { id: 'upper_shaft', name: 'Upper Shaft Ring', x: 900, w: 700, y: -400, type: 'vertical', note: 'Scale walls to reach storage' },
      { id: 'brood_room', name: 'Deep Royal Broodchamber', x: 1800, w: 1000, y: 800, type: 'combat', note: 'Breach security blockades' },
      { id: 'storage_vault', name: 'Vault of Truths', x: 2700, w: 900, y: 400, type: 'secret', note: 'Solve phase switches' },
      { id: 'guard_room', name: 'Royal Guard Quarters', x: 3600, w: 900, y: 800, type: 'miniboss', note: 'Vanquish elites' },
      { id: 'queen_palace', name: 'Queen Sovereign Nest', x: 4400, w: 1200, y: -1000, type: 'boss', note: 'Sovereign battle' }
    ],
    platforms: [
      // Hub Base Room Platforms
      { x: 0, y: 760, w: 900, h: 40, type: 'floor' },
      { x: 180, y: 620, w: 180, h: 25, type: 'floor' },
      { x: 430, y: 520, w: 160, h: 25, type: 'truthPlatform' },
      { x: 760, y: 420, w: 120, h: 25, type: 'floor' },
      { x: 860, y: 300, w: 40, h: 460, type: 'wall' },

      // Worker Tunnel segment platforms
      { x: 900, y: 760, w: 900, h: 40, type: 'floor' },
      { x: 1220, y: 540, w: 160, h: 25, type: 'floor' },
      { x: 1400, y: 300, w: 160, h: 25, type: 'falsePlatform' },

      // Vertical shaft wall slides
      { x: 900, y: -600, w: 40, h: 1000, type: 'wall' },
      { x: 1600, y: -600, w: 40, h: 700, type: 'wall' },
      { x: 1000, y: 150, w: 120, h: 25, type: 'floor' },
      { x: 1400, y: 0, w: 120, h: 25, type: 'truthPlatform' },
      { x: 1100, y: -150, w: 120, h: 25, type: 'falsePlatform' },
      { x: 1350, y: -300, w: 120, h: 25, type: 'floor' },
      { x: 1050, y: -450, w: 150, h: 25, type: 'floor' },

      // Gated locks
      { x: 1200, y: 460, w: 40, h: 300, type: 'barrier', zoneId: 'gateA1' },
      { x: 2600, y: 160, w: 40, h: 300, type: 'barrier', zoneId: 'gateA2' },
      { x: 3900, y: 420, w: 40, h: 300, type: 'barrier', zoneId: 'gateA3' },

      // Deep Brood Chamber platforms
      { x: 1800, y: 760, w: 1000, h: 40, type: 'floor' },
      { x: 1960, y: 700, w: 260, h: 25, type: 'floor' },
      { x: 2320, y: 560, w: 240, h: 25, type: 'floor' },
      { x: 2700, y: 460, w: 1100, h: 40, type: 'floor' },

      // Vault storage steps
      { x: 2920, y: 300, w: 180, h: 25, type: 'floor' },
      { x: 3240, y: 180, w: 180, h: 25, type: 'falsePlatform' },

      // Royal Guard Chamber Base Floor
      { x: 3600, y: 720, w: 900, h: 40, type: 'floor' },
      { x: 3920, y: 500, w: 180, h: 25, type: 'floor' },
      { x: 4200, y: 365, w: 180, h: 25, type: 'truthPlatform' },

      // Ascent into Sovereign Peak (Vertical Queen Approach)
      { x: 4500, y: 160, w: 900, h: 40, type: 'floor' },
      { x: 4650, y: -900, w: 40, h: 1000, type: 'wall' },
      { x: 4950, y: -900, w: 40, h: 1000, type: 'wall' },
      { x: 4720, y: 60, w: 140, h: 25, type: 'elevator', minY: -400, maxY: 100, vy: -2, vx: 0 },
      { x: 4800, y: -300, w: 120, h: 25, type: 'floor' },
      { x: 4550, y: -450, w: 150, h: 25, type: 'truthPlatform' },
      { x: 4750, y: -600, w: 150, h: 25, type: 'falsePlatform' },
      { x: 4500, y: -750, w: 120, h: 25, type: 'floor' },

      // Royal Palace Arena Platform y = -900
      { x: 4400, y: -900, w: 1100, h: 1400, type: 'floor' },
      { x: 4400, y: -1300, w: 40, h: 400, type: 'arenaWall' },
      { x: 4800, y: -1300, w: 40, h: 400, type: 'barrier', zoneId: 'gateA4' },
      { x: 5400, y: -1300, w: 40, h: 400, type: 'arenaWall' }
    ],
    phaseCatalysts: [
      { x: 600, y: 680, r: 14, kind: 'truth', cooldown: 0, pulse: 0 },
      { x: 1300, y: 480, r: 14, kind: 'false', cooldown: 0, pulse: 0 },
      { x: 3000, y: 220, r: 14, kind: 'truth', cooldown: 0, pulse: 0 },
      { x: 4800, y: -380, r: 14, kind: 'false', cooldown: 0, pulse: 0 }
    ],
    shards: [
      { x: 340, y: 550, r: 12, kind: 'truth', collected: false },
      { x: 1500, y: 220, r: 12, kind: 'false', collected: false },
      { x: 3100, y: 120, r: 12, kind: 'truth', collected: false },
      { x: 4620, y: -520, r: 12, kind: 'false', collected: false }
    ],
    fireSources: [],
    enemies: [
      { id: 'a1', x: 260, y: 700, w: 40, h: 40, vx: 0, hp: 8, maxHp: 8, alive: true, type: 'knight', frozenTimer: 0 },
      { id: 'a2', x: 560, y: 500, w: 32, h: 32, vx: 0, hp: 6, maxHp: 6, alive: true, type: 'drone', frozenTimer: 0 },
      { id: 'a3', x: 1150, y: 680, w: 40, h: 40, vx: 0, hp: 10, maxHp: 10, alive: true, type: 'knight', frozenTimer: 0 },
      { id: 'a4', x: 2050, y: 640, w: 40, h: 40, vx: 0, hp: 10, maxHp: 10, alive: true, type: 'knight', frozenTimer: 0 },
      { id: 'a5', x: 3020, y: 250, w: 32, h: 32, vx: 0, hp: 8, maxHp: 8, alive: true, type: 'drone', frozenTimer: 0 },
      { id: 'a6', x: 3780, y: 640, w: 40, h: 40, vx: 0, hp: 14, maxHp: 14, alive: true, type: 'knight', frozenTimer: 0 },
      { id: 'queen_boss', x: 5000, y: -960, w: 80, h: 100, vx: 0, hp: 120, maxHp: 120, alive: true, type: 'hive_queen', frozenTimer: 0 }
    ]
  },
  {
    id: 7,
    name: "Chemical Sewer Core",
    subtitle: "Level 7: Toxic Aqueduct",
    difficulty: "Midnight",
    description: "Navigate a toxic underground system. Ascend vertical steam vents using custom diagonal hydraulic platforms, smash sewer grates, find a hidden shard behind narrow secret walls on the upper-right, and survive a dual Knight lockdown ambush.",
    bgColor: "#03140f",
    skyColors: ["#020b08", "#031510", "#08251b", "#3bfca7"],
    moonColor: "rgba(59, 252, 167, 0.95)",
    auraColor: "#3bfca7",
    startText: "HAZARDOUS DETOUR: Sewer core ventilation online. Use energy shifts, ascend the mechanical tracks, break the barricades, and breach the sector!",
    startX: 250,
    startY: 420, // High sewer pressure launch chute drop
    portalX: 4300,
    portalY: 620,
    lockedZones: [
      { id: 'gateS1', triggerX: 2900, lockX: 3800, active: false, cleared: false, enemiesSpawned: false }
    ],
    roomZones: [
      { id: 's1', name: 'Sewer Inlet Sump', x: 0, w: 900, y: 900, type: 'Aqueduct Descent', note: 'Drop into reservoir' },
      { id: 's2', name: 'Hydraulic Pumping Shaft', x: 900, w: 1000, y: 400, type: 'Ascending Chasm', note: 'Ride diagonal lifts' },
      { id: 's3', name: 'Toxic Overflow Well', x: 1900, w: 1000, y: 300, type: 'Secret Vault', note: 'Break blocks for relic' },
      { id: 's4', name: 'Security Outflow Filter', x: 2900, w: 1600, y: 900, type: 'Decisive Lockdown', note: 'Exterminate bio-sentinels' }
    ],
    platforms: [
      // Spawn runway
      { x: -200, y: 840, w: 1150, h: 200, type: 'floor' },

      // Ascent Shaft side boundaries
      { x: 900, y: 450, w: 40, h: 430, type: 'wall' },
      { x: 1940, y: -200, w: 40, h: 1080, type: 'wall' },

      // Spikes pit in shaft bottom
      { x: 940, y: 840, w: 1000, h: 200, type: 'floor' },
      
      // Diagonal elevators
      { x: 1000, y: 700, w: 140, h: 25, type: 'elevator', minY: 480, maxY: 780, vy: -2, vx: 2, minX: 1000, maxX: 1300 },
      { x: 1600, y: 400, w: 140, h: 25, type: 'elevator', minY: 180, maxY: 480, vy: -2, vx: -2, minX: 1300, maxX: 1600 },

      // Top platforms above shaft
      { x: 1800, y: 220, w: 200, h: 25, type: 'floor' },

      // Upper platform lead-in
      { x: 2050, y: 180, w: 230, h: 25, type: 'floor' },

      // Secret room solid boundaries
      { x: 2340, y: 180, w: 40, h: 180, type: 'wall' },
      { x: 2340, y: 300, w: 320, h: 25, type: 'floor' },
      { x: 2660, y: 0, w: 40, h: 325, type: 'wall' },
      { x: 2340, y: 0, w: 320, h: 25, type: 'floor' },

      // Lockdown combat arena below
      { x: 2800, y: 760, w: 1500, h: 200, type: 'floor' },
      { x: 4300, y: 760, w: 400, h: 200, type: 'floor' },
      // Arena Boss wall limit
      { x: 4550, y: 200, w: 40, h: 560, type: 'arenaWall' },

      // Arena entry cliff wall (can fall off, but cannot jump back up)
      { x: 2760, y: 300, w: 80, h: 480, type: 'wall' },

      // Gates
      { x: 3800, y: 200, w: 40, h: 560, type: 'barrier', zoneId: 'gateS1' }
    ],
    phaseCatalysts: [
      { x: 400, y: 760, r: 14, kind: 'truth', cooldown: 0, pulse: 0 },
      { x: 1900, y: 150, r: 14, kind: 'false', cooldown: 0, pulse: 0 },
      { x: 3050, y: 680, r: 14, kind: 'truth', cooldown: 0, pulse: 0 }
    ],
    shards: [
      { x: 320, y: 740, r: 12, kind: 'truth', collected: false },
      { x: 2550, y: 240, r: 12, kind: 'false', collected: false },
      { x: 3400, y: 680, r: 12, kind: 'truth', collected: false }
    ],
    fireSources: [
      { x: 1100, y: 810, size: 30 },
      { x: 1500, y: 810, size: 30 },
      { x: 1750, y: 810, size: 30 }
    ],
    enemies: [
      { id: 's_d1', x: 650, y: 780, w: 32, h: 32, vx: 0, hp: 5, maxHp: 5, alive: true, type: 'drone', frozenTimer: 0 },
      { id: 's_kn1', x: 450, y: 800, w: 40, h: 40, vx: 0, hp: 10, maxHp: 10, alive: true, type: 'knight', frozenTimer: 0 },
      { id: 's_d2', x: 1250, y: 320, w: 32, h: 32, vx: 0, hp: 6, maxHp: 6, alive: true, type: 'drone', frozenTimer: 0 },
      { id: 's_kn2', x: 2850, y: 720, w: 40, h: 40, vx: 0, hp: 12, maxHp: 12, alive: true, type: 'knight', frozenTimer: 0 },
      { id: 's_kn3', x: 3400, y: 720, w: 40, h: 40, vx: 0, hp: 12, maxHp: 12, alive: true, type: 'knight', frozenTimer: 0 },
      { id: 's_d3', x: 3100, y: 650, w: 32, h: 32, vx: 0, hp: 6, maxHp: 6, alive: true, type: 'drone', frozenTimer: 0 },
      { id: 'sewer_boss', x: 4100, y: 660, w: 80, h: 100, vx: 0, hp: 140, maxHp: 140, alive: true, type: 'boss', frozenTimer: 0 }
    ],
    destructibles: [
      { id: 'ds_wall', x: 2300, y: 180, w: 40, h: 120, type: 'breakableWall', hp: 3, maxHp: 3, drops: 'relic' },
      { id: 'ds_crate1', x: 700, y: 800, w: 40, h: 40, type: 'crate', hp: 1, maxHp: 1, drops: 'shield' },
      { id: 'ds_crate2', x: 2450, y: 260, w: 40, h: 40, type: 'crate', hp: 1, maxHp: 1, drops: 'shield' }
    ]
  },
  {
    id: 8,
    name: "Sonic Spire: The 4-Story Gauntlet",
    subtitle: "Level 8: The Speed Tower",
    difficulty: "Absurd",
    description: "A colossal 4-story high-speed obstacle course. Sprint, jump, and dash through massive floors in this mega-building. Take the elevators between the different floors, and eliminate the commander waiting at the very bottom. Keep moving!",
    bgColor: "#0a0a0f",
    skyColors: ["#020005", "#0a0014", "#120025", "#ff00a0"],
    moonColor: "rgba(255, 0, 160, 0.95)",
    auraColor: "#ff99db",
    startText: "SPEED TOWER: 4 colossal floors. Sprint the assault courses, ride the elevators, and eliminate the commander at the bottom.",
    startX: 150,
    startY: 450,
    portalX: 600,
    portalY: 3180,
    deathY: 4000,
    lockedZones: [
      { id: 'gate8_1', triggerX: 900, lockX: 1500, active: false, cleared: false, enemiesSpawned: false }
    ],
    roomZones: [
      { id: 'f4', name: 'Floor 4: Neon Track', x: 0, w: 2500, y: 0, type: 'Sprint Course', note: 'Sprint right' },
      { id: 'f3', name: 'Floor 3: Hazard Labs', x: 0, w: 2500, y: 900, type: 'Platforming', note: 'Sprint left' },
      { id: 'f2', name: 'Floor 2: Security Zone', x: 0, w: 2500, y: 1800, type: 'Combat Run', note: 'Sprint right' },
      { id: 'f1', name: 'Floor 1: Ground Zero', x: 0, w: 2500, y: 2700, type: 'Boss Arena', note: 'Defeat the boss' }
    ],
    platforms: [
      // Building Exterior Walls
      { x: -50, y: -200, w: 50, h: 4200, type: 'wall' },
      { x: 2600, y: -200, w: 50, h: 4200, type: 'wall' },
      { x: -50, y: -200, w: 2700, h: 50, type: 'floor' }, // Roof Base

      // Floor 4 (Top, Y=600)
      { x: -50, y: 600, w: 800, h: 40, type: 'floor' },
      { x: 900, y: 550, w: 200, h: 20, type: 'floor' },
      { x: 1250, y: 480, w: 300, h: 20, type: 'shuttle', minX: 1250, maxX: 1600, vx: 5, vy: 0 },
      { x: 1700, y: 400, w: 150, h: 20, type: 'truthPlatform' },
      { x: 1950, y: 350, w: 150, h: 20, type: 'falsePlatform' },
      { x: 2150, y: 600, w: 200, h: 40, type: 'floor' }, // 2150 to 2350
      { x: 2500, y: 600, w: 100, h: 40, type: 'floor' }, // 2500 to 2600
      { x: 2350, y: 600, w: 150, h: 25, type: 'elevator', minY: 600, maxY: 1500, vy: 4, vx: 0 },

      // Floor 3 (Y=1500)
      { x: 2100, y: 1520, w: 500, h: 40, type: 'floor' }, // catch platform 2100 to 2600
      { x: 1700, y: 1450, w: 300, h: 40, type: 'floor' },
      { x: 1300, y: 1380, w: 250, h: 20, type: 'truthPlatform' },
      { x: 900, y: 1300, w: 250, h: 20, type: 'floor' },
      { x: 500, y: 1200, w: 250, h: 20, type: 'falsePlatform' },
      { x: 200, y: 1520, w: 300, h: 40, type: 'floor' }, // 200 to 500
      { x: -50, y: 1520, w: 100, h: 40, type: 'floor' }, // -50 to 50
      { x: 50, y: 1520, w: 150, h: 25, type: 'elevator', minY: 1520, maxY: 2400, vy: 4, vx: 0 },

      // Floor 2 (Y=2400)
      { x: -50, y: 2420, w: 500, h: 40, type: 'floor' }, // catch platform -50 to 450
      { x: 600, y: 2350, w: 200, h: 20, type: 'floor' },
      { x: 1000, y: 2280, w: 200, h: 20, type: 'floor' },
      { x: 1400, y: 2200, w: 300, h: 20, type: 'falsePlatform' },
      { x: 1800, y: 2300, w: 200, h: 20, type: 'truthPlatform' },
      { x: 2100, y: 2420, w: 250, h: 40, type: 'floor' }, // 2100 to 2350
      { x: 2500, y: 2420, w: 100, h: 40, type: 'floor' }, // 2500 to 2600
      { x: 2350, y: 2420, w: 150, h: 25, type: 'elevator', minY: 2420, maxY: 3300, vy: 4, vx: 0 },

      // Floor 1 (Bottom, Y=3300)
      { x: 1800, y: 3320, w: 800, h: 40, type: 'floor' }, // catch platform
      { x: 1500, y: 2520, w: 40, h: 800, type: 'barrier', zoneId: 'gate8_1' },
      { x: -50, y: 3320, w: 1600, h: 40, type: 'floor' }, // Boss Room Floor
      { x: -50, y: 2520, w: 40, h: 800, type: 'wall' } // Boss Room left wall
    ],
    phaseCatalysts: [
      { x: 1000, y: 500, r: 14, kind: 'truth', cooldown: 0, pulse: 0 },
      { x: 1400, y: 1300, r: 14, kind: 'false', cooldown: 0, pulse: 0 },
      { x: 1900, y: 2200, r: 14, kind: 'truth', cooldown: 0, pulse: 0 }
    ],
    shards: [
      { x: 1300, y: 440, r: 12, kind: 'truth', collected: false, reveals: true },
      { x: 600, y: 1150, r: 12, kind: 'false', collected: false },
      { x: 1500, y: 2150, r: 12, kind: 'truth', collected: false, reveals: true }
    ],
    fireSources: [],
    enemies: [
      { id: '8_d1', x: 600, y: 550, w: 32, h: 32, vx: 0, hp: 5, maxHp: 5, alive: true, type: 'drone', frozenTimer: 0 },
      { id: '8_k1', x: 1800, y: 1400, w: 40, h: 40, vx: 0, hp: 12, maxHp: 12, alive: true, type: 'knight', frozenTimer: 0 },
      { id: '8_d2', x: 1000, y: 1200, w: 32, h: 32, vx: 0, hp: 6, maxHp: 6, alive: true, type: 'drone', frozenTimer: 0 },
      { id: '8_k2', x: 1100, y: 2200, w: 40, h: 40, vx: 0, hp: 14, maxHp: 14, alive: true, type: 'knight', frozenTimer: 0 },
      { id: '8_k3', x: 1500, y: 2100, w: 40, h: 40, vx: 0, hp: 14, maxHp: 14, alive: true, type: 'knight', frozenTimer: 0 },
      { id: '8_boss', x: 400, y: 3220, w: 80, h: 100, vx: 0, hp: 180, maxHp: 180, alive: true, type: 'boss', frozenTimer: 0 }
    ],
    destructibles: [
      { id: '8_c1', x: 400, y: 560, w: 40, h: 40, type: 'crate', hp: 1, maxHp: 1, drops: 'shield' },
      { id: '8_c2', x: 2000, y: 1480, w: 40, h: 40, type: 'crate', hp: 1, maxHp: 1, drops: 'shield' }
    ]
  }
];

