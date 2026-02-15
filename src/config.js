export const Config = {
  gridSize: 60,
  chunkSize: 2000,
  renderDistance: 1,
  baseLightRadius: 300,
  maxLightLevel: 2.0,
  safeZoneRadius: 300,
  colors: {
    grid: "#222",
    wall: "#fff",
    fragment: "#00f3ff",
    enemy: "#ff3333",
    safe: "#00ffaa",
  },
  player: { 
    maxHealth: 100, 
    accel: 0.15, 
    friction: 0.96, 
    maxSpeed: 4.0 
  },
  combat: {
    bulletSpeed: 8,
    bulletCost: 2,
    baseEnemyHP: 3,
    baseEnemyDmg: 10,
  },
  audio: {
    // These paths match your original game.html. 
    // Ensure the files are in the corresponding locations in your folder.
    bgm: ["bgm1.mp3", "bgm2.mp3", "bgm3.mp3"],
    sfx: {
      term_open: "term.mp3",
      term_close: "term.mp3",
      term_success: "sfx/term_success.mp3",
      obj_toggle: "obj.mp3",
      obj_update: "obj2.mp3",
      log: "",
      intro_hit: "on2.wav",
      story_ambience: "",
    },
  },
};