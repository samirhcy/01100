import { Config } from './config.js';
import { State } from './state.js';
import { Utils } from './utils.js';

// Entities
import { PlayerEntity } from './entities/Player.js';
import { WorldEntity } from './entities/World.js';
import { EnemyEntity } from './entities/Enemy1.js';

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

// Expose Systems
window.UISystem = UISystem;
window.SaveSystem = SaveSystem;
window.AudioSystem = AudioSystem;
window.TerminalSystem = TerminalSystem;

const GameLogic = {
  init: async () => {
    // 1. Initialize Systems
    InputSystem.init();
    RenderSystem.init();

    // 2. Check for Save Data
    if (SaveSystem.load()) {
        TerminalSystem.log("SYSTEM RESTORED");
    } else {
        // 3. New Game Setup
        State.player.mode = "roam";
        document.body.className = "mode-roam";
        
        GameLogic.checkChunks();
        ObjectiveSystem.init();
        
        // Only play Intro if it's a fresh start
        await Cinematics.playIntro();
    }

    // 4. Start Loop
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
    if (State.player.isDead || State.game.paused) {
        if(State.game.paused) RenderSystem.draw(); 
        requestAnimationFrame(GameLogic.loop);
        return;
    }

    const timeScale = State.player.isTerminalOpen ? 0.1 : 1.0;

    PlayerEntity.update(timeScale);
    GameLogic.checkChunks();
    ObjectiveSystem.update();
    UISystem.update();
    AudioSystem.init(); 

    if (timeScale > 0 && State.player.combatUnlocked) {
        EnemyEntity.update(timeScale);
        updateProjectiles(timeScale);
    }

    handleGameRules();

    // Fragment Collection
    for(let i = State.world.fragments.length - 1; i >= 0; i--) {
        let f = State.world.fragments[i];
        if (f.active && Utils.dist(State.player.x, State.player.y, f.x, f.y) < 20) {
            f.active = false;
            State.player.data += 10;
            TerminalSystem.log("DATA: +10 MB");
            State.world.fragments.splice(i, 1);
        }
    }
    
    if (State.world.fragments.filter((f) => f.active).length < 20) {
        WorldEntity.spawnInChunk(State.player.x, State.player.y, "fragment");
    }

    RenderSystem.draw();
    requestAnimationFrame(GameLogic.loop);
  }
};

// --- LOGIC HELPERS ---

function handleGameRules() {
    let spawnChance = 0.01;
    let maxEnemies = 5 + State.game.killCount / 3;

    if (State.game.killCount >= 20) { spawnChance = 0.08; maxEnemies = 30; } 
    else if (State.game.killCount >= 15) { spawnChance = 0.03; maxEnemies = 15; }

    if (State.player.combatUnlocked && State.world.enemies.length < maxEnemies) {
      if (Math.random() < spawnChance) WorldEntity.spawnEnemyRing();
    }

    if (ObjectiveSystem.currentPhaseIndex === 2 && !State.game.safeHaven) {
      let enemiesNearby = State.world.enemies.some((e) => Utils.dist(State.player.x, State.player.y, e.x, e.y) < 600);
      let tooClose = State.world.enemies.some((e) => Utils.dist(State.player.x, State.player.y, e.x, e.y) < 250);
      
      if (enemiesNearby && !tooClose) State.game.survivalTimer++;
      if (State.game.survivalTimer > 600) WorldEntity.spawnSafeHaven();
    }

    if (State.game.safeHaven) {
      const h = State.game.safeHaven;
      if (Utils.dist(State.player.x, State.player.y, h.x, h.y) < h.r) {
        State.game.safeTimer++;
        if (State.game.safeTimer > 180) {
          document.getElementById("fade-overlay").style.opacity = 1;
          TerminalSystem.print(">> SIGNAL LOCK. UPLOADING...", "#00ffaa");
          
          if (!State.player.isDead) {
              setTimeout(() => {
                  SaveSystem.saveAndExit(2); 
              }, 2000);
          }
        }
      } else State.game.safeTimer = 0;
    }
}

function updateProjectiles(dt) {
    for (let i = State.world.projectiles.length - 1; i >= 0; i--) {
        let p = State.world.projectiles[i];
        p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
        
        let hitWall = false;
        for (let s of State.world.structures) if (Utils.checkRectCollide(p.x, p.y, s)) hitWall = true;
        if (hitWall || p.life <= 0) { State.world.projectiles.splice(i, 1); continue; }

        if (p.type === "enemy") {
            if (Utils.dist(p.x, p.y, State.player.x, State.player.y) < State.player.size + 5) {
                let inSafeHaven = false;
                if (State.game.safeHaven && Utils.dist(State.player.x, State.player.y, State.game.safeHaven.x, State.game.safeHaven.y) < State.game.safeHaven.r) inSafeHaven = true;

                if (!inSafeHaven) {
                    if (State.player.shield > 0) { State.player.shield -= 10; TerminalSystem.log("SHIELD ABSORB", "safe"); } 
                    else { State.player.health -= 10; TerminalSystem.log("HULL DAMAGE", "error"); }
                    if (State.player.health <= 0) killPlayer();
                }
                State.world.projectiles.splice(i, 1);
            }
        }
        if (p.type === "player") {
            for (let j = State.world.enemies.length - 1; j >= 0; j--) {
                let e = State.world.enemies[j];
                if (Utils.dist(p.x, p.y, e.x, e.y) < 15) {
                    e.hp--; State.world.projectiles.splice(i, 1);
                    if (e.hp <= 0) {
                        State.world.enemies.splice(j, 1);
                        State.player.data += 50; State.game.killCount++;
                        TerminalSystem.log(`ENEMY ELIMINATED [${State.game.killCount}]`, "safe");
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
    setTimeout(() => { window.location.href = "index.html"; }, 3000); 
}

GameLogic.init();