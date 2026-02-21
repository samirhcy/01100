export const State = {
  player: {
    x: 0, y: 150, vx: 0, vy: 0, angle: 0, size: 10,
    health: 100, shield: 0, data: 0, lightLevel: 1.0,
    mode: "roam", combatUnlocked: true, cloaked: false, cloakTimer: 0,
    isTerminalOpen: false, scanActive: false, scanTimer: 0, isDead: false,
    stats: { speedLevel: 0, fireRateLevel: 0 },
  },
  game: { killCount: 0, paused: false },
  world: { structures: [], fragments: [], enemies: [], projectiles: [] },
  hotbar: { 1: "sys.scan", 2: null, 3: null, 4: null, 5: null, activeSlot: 1 },
  input: { mode: "kbm", keys: {}, moveVector: { x: 0, y: 0 }, aimVector: { x: 0, y: 0 }, gamepadIndex: null },
  
  ch2: {
    phase: "entrance", transitionTimer: 0, commandsLocked: false,
    gateY: -300, 
    preBoundaries: { minX: -400, maxX: 400, minY: -350, maxY: 300 },
    
    // MASSIVELY EXPANDED BOUNDARIES for 15 Relics
    boundaries: { minX: -5000, maxX: 5000, minY: -8000, maxY: -350 },
    
    relicSpawnTimer: 0,
    relics: [],
    hasAetherLens: false,
    firstRelicDecrypted: false, // Tracks Phase 2 -> 3 transition
    errorThrottle: 0,
    lens: { expanded: false },
    inventory: [], 
    activeApp: 'files',
    viewingItem: null 
  }
};