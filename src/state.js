export const State = {
  player: {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle: 0, // NEW: Added to track the player's aiming direction for the right joystick
    size: 10,
    health: 100,
    shield: 0,
    data: 0,
    lightLevel: 1.0,
    mode: "roam",
    combatUnlocked: false,
    cloaked: false,
    cloakTimer: 0,
    isTerminalOpen: false,
    scanActive: false,
    scanTimer: 0,
    isDead: false,
    stats: { speedLevel: 0, fireRateLevel: 0 },
  },
  game: {
    killCount: 0,
    safeHaven: null,
    safeTimer: 0,
    paused: false,
    survivalTimer: 0,
  },
  world: {
    structures: [],
    fragments: [],
    enemies: [],
    projectiles: [],
    visitedChunks: new Set(),
  },
  hotbar: { 1: "sys.scan", 2: null, 3: null, 4: null, 5: null },
  input: { 
    // NEW: Expanded input object to handle both KBM and Gamepad states smoothly
    mode: "kbm", 
    keys: { w: false, a: false, s: false, d: false, ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false },
    moveVector: { x: 0, y: 0 }, 
    aimVector: { x: 0, y: 0 },  
    gamepadIndex: null 
  },
};