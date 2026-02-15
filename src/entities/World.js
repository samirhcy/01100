import { Config } from '../config.js';
import { State } from '../state.js';
import { Utils } from '../utils.js';
import { TerminalSystem } from '../ui/Terminal.js'; // We will define this in UI next

export const WorldEntity = {
  generateChunk: (cx, cy) => {
    const key = `${cx},${cy}`;
    if (State.world.visitedChunks.has(key)) return;
    State.world.visitedChunks.add(key);
    
    const startX = cx * Config.chunkSize;
    const startY = cy * Config.chunkSize;
    
    // 1. Fragments
    for (let i = 0; i < 5; i++) {
        WorldEntity.spawnInChunk(startX, startY, "fragment");
    }
    
    // 2. Walls & Enemies (If Combat Unlocked)
    if (State.player.combatUnlocked) {
      for (let i = 0; i < 8; i++) {
          WorldEntity.spawnInChunk(startX, startY, "wall");
      }
      if (Math.random() > 0.5) {
          WorldEntity.spawnEnemyInChunk(startX, startY);
      }
    }
  },

  spawnInChunk: (cx, cy, type) => {
    for (let i = 0; i < 10; i++) {
      const x = cx + Math.random() * Config.chunkSize;
      const y = cy + Math.random() * Config.chunkSize;
      
      // Safe Zone Check
      if (Utils.dist(x, y, 0, 0) < Config.safeZoneRadius) continue;
      
      let overlap = false;
      for (let s of State.world.structures) {
          if (Utils.checkRectCollide(x, y, s)) overlap = true;
      }
      
      if (!overlap) {
        if (type === "fragment") {
            State.world.fragments.push({ x, y, size: 8, active: true });
        }
        if (type === "wall") {
            State.world.structures.push({
                x, y,
                w: 40 + Math.random() * 100,
                h: 40 + Math.random() * 100,
            });
        }
        return;
      }
    }
  },

  spawnEnemyInChunk: (cx, cy) => {
    const x = cx + Math.random() * Config.chunkSize;
    const y = cy + Math.random() * Config.chunkSize;
    
    if (Utils.dist(x, y, State.player.x, State.player.y) < 500) return;
    
    let speed = 1.0 + State.game.killCount * 0.05;
    let hp = 3 + Math.floor(State.game.killCount / 2);
    
    State.world.enemies.push({
      x, y,
      targetX: x, targetY: y,
      angle: 0,
      speed, hp,
      cooldown: 0,
      sightRange: 450 + State.game.killCount * 20,
      wanderTimer: 0,
    });
  },

  spawnEnemyRing: () => {
    // ESCALATION LOGIC (Exact Copy from game.html)
    let count = 1;
    if (State.game.killCount >= 20) count = 5;
    else if (State.game.killCount >= 12) count = 4; // Note: You had 12 here in game.html, not 15
    else if (State.game.killCount > 5) count = 3;

    for (let k = 0; k < count; k++) {
      for (let i = 0; i < 50; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 600 + Math.random() * 600;
        const x = State.player.x + Math.cos(angle) * dist;
        const y = State.player.y + Math.sin(angle) * dist;
        
        let overlap = false;
        for (let s of State.world.structures) {
            if (Utils.checkRectCollide(x, y, s)) overlap = true;
        }
        
        if (!overlap) {
          let speed = 1.0 + State.game.killCount * 0.05;
          let hp = 3 + Math.floor(State.game.killCount / 2);
          State.world.enemies.push({
            x, y,
            targetX: x, targetY: y,
            angle: 0,
            speed, hp,
            cooldown: 0,
            sightRange: 450 + State.game.killCount * 20,
            wanderTimer: 0,
          });
          break;
        }
      }
    }
  },

  spawnSafeHaven: () => {
    const offsetX = (Math.random() > 0.5 ? 1 : -1) * (1500 + Math.random() * 500);
    const offsetY = (Math.random() > 0.5 ? 1 : -1) * (1500 + Math.random() * 500);
    const x = Math.floor(State.player.x + offsetX);
    const y = Math.floor(State.player.y + offsetY);
    
    State.game.safeHaven = { x, y, r: 80, active: true };
    
    TerminalSystem.log("SIGNAL DETECTED: SAFE HAVEN", "safe");
    TerminalSystem.log(`COORDINATES: [${x}, ${y}]`, "safe");
    
    // Clear nearby walls
    State.world.structures = State.world.structures.filter(
      (s) => Utils.dist(s.x, s.y, x, y) > 200
    );
    
    // Ambush!
    for (let i = 0; i < 5; i++) WorldEntity.spawnEnemyRing();
  },
};