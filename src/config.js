export const Config = {
  gridSize: 60,
  chunkSize: 2000,
  renderDistance: 1,
  baseLightRadius: 300,
  maxLightLevel: 2.0,
  safeZoneRadius: 300,
  colors: {
    grid: "#555",
    wall: "#ffffff",
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
    bgm: ["/assets/bgm1.mp3", "/assets/bgm4.mp3", "/assets/bgm3.mp3"],
    sfx: {
      term_open: "/assets/term1.mp3",
      term_close: "/assets/term2.mp3",
      term_success: "/assets/term_success.mp3",
      obj_toggle: "/assets/obj.mp3",
      obj_update: "/assets/obj2.mp3",
      log: "",
      intro_hit: "/assets/on2.wav",
      story_ambience: "",
      profile_switch: "/assets/profile.mp3",
      player_hit: "/assets/term.mp3",
      player_shoot: "/assets/attack.mp3",
      shield_up: "/assets/sh1.mp3",
      shield_down: "/assets/sh2.mp3",
    },
  },
};