import { Config } from './config.js';
import { State } from './state.js';
import { Utils } from './utils.js';

// Entities
import { PlayerEntity } from './entities/Player.js';
import { WorldEntity } from './entities/World.js';
import { EnemyEntity } from './entities/Enemy1.js'; // Note: You named it enemy1.js

// Systems
import { AudioSystem } from './systems/Audio.js';
import { InputSystem } from './systems/Input.js';
import { RenderSystem } from './systems/Render.js';
import { SaveSystem } from './systems/Save.js';

// UI
import { TerminalSystem } from './ui/Terminal.js';
import { UISystem } from './ui/HUD.js';
import { ObjectiveSystem } from './ui/Objective.js';
import { Cinematics } from './ui/Cinematics.js';

const GameLogic = {
  init: async () => {
    // 1. Initialize Engine Systems
    InputSystem.init();
    RenderSystem.init();

    // 2. Load Save Data (Transition support)
    const savedData = localStorage.getItem("0110_save");
    const v2Data = localStorage.getItem("0110_save_v2");
    
    // Prioritize V2, fallback to V1 if needed
    if (savedData && !v2Data) {
      const parsed = JSON.parse(savedData);
      State.player.data = parseInt(parsed.data) || 0;
      State.player.lightLevel = parseFloat(parsed.lightLevel) || 1.0;
    }

    // 3. Set Initial State
    State.player.mode = "roam";
    document.body.className = "mode-roam";
    
    // 4. Generate Initial World
    GameLogic.checkChunks();
    ObjectiveSystem.init();

    // 5. Play Intro Sequence
    await Cinematics.playIntro();

    // 6. Start Loop
    requestAnimationFrame(GameLogic.loop);
  },

  checkChunks: () => {
    const cx = Math.floor(State.player.x / Config.chunkSize);
    const cy = Math.floor(State.player.y / Config.chunkSize);
    for (let x = -Config.renderDistance; x <= Config.renderDistance; x++) {
      for (let y = -Config.renderDistance; y <= Config.renderDistance; y++) {
        WorldEntity.generateChunk(cx + x, cy + y);
      }
    }
  },

  loop: () => {
    // 1. Check Pause / Death
    if (State.player.isDead || State.game.paused) {
        if(State.game.paused) RenderSystem.draw(); // Keep drawing if just paused
        requestAnimationFrame(GameLogic.loop);
        return;
    }

    const timeScale = State.player.isTerminalOpen ? 0.1 : 1.0;

    // 2. Update Entities
    PlayerEntity.update(timeScale);
    GameLogic.checkChunks(); // Infinite World Generation
    
    // 3. Update Systems
    ObjectiveSystem.update();
    UISystem.update();
    AudioSystem.init(); // Audio context check

    // 4. Update Enemies & Projectiles (Only if combat unlocked/active)
    // Note: Projectiles need to update even if timeScale is 0 to prevent freezing mid-air visuals,
    // but typically we scale them too.
    if (timeScale > 0 && State.player.combatUnlocked) {
        EnemyEntity.update(timeScale);
        updateProjectiles(timeScale);
    }

    // 5. Core Game Logic (Spawning & Objectives)
    handleGameRules();

    // 6. Fragment Collection
    for(let i = State.world.fragments.length - 1; i >= 0; i--) {
        let f = State.world.fragments[i];
        if (f.active && Utils.dist(State.player.x, State.player.y, f.x, f.y) < 20) {
            f.active = false;
            State.player.data += 10;
            TerminalSystem.log("DATA: +10 MB");
            // Remove from array to keep performance high
            State.world.fragments.splice(i, 1);
        }
    }
    
    // Replenish Fragments if low
    if (State.world.fragments.filter((f) => f.active).length < 20) {
        WorldEntity.spawnInChunk(State.player.x, State.player.y, "fragment");
    }

    // 7. Render
    RenderSystem.draw();

    requestAnimationFrame(GameLogic.loop);
  }
};

// --- LOGIC HELPERS (Extracted from original Update loop) ---

function handleGameRules() {
    // A. Escalation Spawning
    let spawnChance = 0.01;
    let maxEnemies = 5 + State.game.killCount / 3;

    if (State.game.killCount >= 20) {
      spawnChance = 0.08;
      maxEnemies = 30;
    } else if (State.game.killCount >= 15) {
      spawnChance = 0.03;
      maxEnemies = 15;
    }

    if (State.player.combatUnlocked && State.world.enemies.length < maxEnemies) {
      if (Math.random() < spawnChance) WorldEntity.spawnEnemyRing();
    }

    // B. Phase 3: Survival Timer
    if (ObjectiveSystem.currentPhaseIndex === 2 && !State.game.safeHaven) {
      let enemiesNearby = State.world.enemies.some(
        (e) => Utils.dist(State.player.x, State.player.y, e.x, e.y) < 600
      );
      let tooClose = State.world.enemies.some(
        (e) => Utils.dist(State.player.x, State.player.y, e.x, e.y) < 250
      );
      
      // Only count survival if enemies are near but NOT touching you
      if (enemiesNearby && !tooClose) State.game.survivalTimer++;
      
      if (State.game.survivalTimer > 600) WorldEntity.spawnSafeHaven();
    }

    // C. Safe Haven Logic (Win Condition)
    if (State.game.safeHaven) {
      const h = State.game.safeHaven;
      if (Utils.dist(State.player.x, State.player.y, h.x, h.y) < h.r) {
        State.game.safeTimer++;
        if (State.game.safeTimer > 180) {
          document.getElementById("fade-overlay").style.opacity = 1;
          TerminalSystem.print(">> SIGNAL LOCK. TRANSPORTING...", "#00ffaa");
          setTimeout(() => (window.location.href = "end.html"), 3000);
        }
      } else State.game.safeTimer = 0;
    }
}

function updateProjectiles(dt) {
    for (let i = State.world.projectiles.length - 1; i >= 0; i--) {
      let p = State.world.projectiles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      
      let hitWall = false;
      for (let s of State.world.structures)
        if (Utils.checkRectCollide(p.x, p.y, s)) hitWall = true;
      
      if (hitWall || p.life <= 0) {
        State.world.projectiles.splice(i, 1);
        continue;
      }

      // Enemy Projectiles hitting Player
      if (p.type === "enemy") {
        if (Utils.dist(p.x, p.y, State.player.x, State.player.y) < State.player.size + 5) {
          let inSafeHaven = false;
          // You are safe inside the beacon
          if (State.game.safeHaven) {
            if (Utils.dist(State.player.x, State.player.y, State.game.safeHaven.x, State.game.safeHaven.y) < State.game.safeHaven.r) {
              inSafeHaven = true;
            }
          }
          
          if (!inSafeHaven) {
            if (State.player.shield > 0) {
              State.player.shield -= 10;
              TerminalSystem.log("SHIELD ABSORB", "safe");
            } else {
              State.player.health -= 10;
              TerminalSystem.log("HULL DAMAGE", "error");
            }
            if (State.player.health <= 0) killPlayer();
          }
          State.world.projectiles.splice(i, 1);
          continue;
        }
      }

      // Player Projectiles hitting Enemies
      if (p.type === "player") {
        for (let j = State.world.enemies.length - 1; j >= 0; j--) {
          let e = State.world.enemies[j];
          if (Utils.dist(p.x, p.y, e.x, e.y) < 15) {
            e.hp--;
            State.world.projectiles.splice(i, 1);
            if (e.hp <= 0) {
              State.world.enemies.splice(j, 1);
              State.player.data += 50;
              State.game.killCount++;
              TerminalSystem.log(`ENEMY ELIMINATED [${State.game.killCount}]`);
            }
            break;
          }
        }
      }
    }
}

function killPlayer() {
    State.player.isDead = true;
    document.getElementById("overlay-screen").style.opacity = 1;
    setTimeout(() => location.reload(), 3000);
}

// Start Game
GameLogic.init();