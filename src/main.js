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
import { DialogueSystem } from './ui/Dialogue.js';

// Expose Systems for Console Debugging
window.UISystem = UISystem;
window.SaveSystem = SaveSystem;
window.AudioSystem = AudioSystem;
window.TerminalSystem = TerminalSystem;

// --- DEVELOPER TOOLS (CONSOLE COMMANDS) ---

// 1. GOD MODE: Max Stats + 1GB Data
window.godMode = () => {
    console.log(">> DEV MODE: GOD STATUS ACTIVE");
    
    State.player.data += 1000; // Adds 1000 MB (1 GB)
    State.player.health = 100; // Restore Health
    State.player.shield = 100; // Max Shield
    State.player.isDead = false;
    
    // Optional: Boost Light for visibility
    State.player.lightLevel = 3.0; 
    
    TerminalSystem.log("DEV: STATS MAXIMIZED (+1GB DATA)", "warning");
};

// 2. SKIP TO END: Teleport to Safe Haven & Clear Enemies
window.devSkip = () => {
    console.log(">> DEV MODE: WARPING TO SAFE HAVEN");
    
    // Set Game State to End Phase
    State.player.combatUnlocked = true;
    State.game.killCount = 25; 
    ObjectiveSystem.currentPhaseIndex = 2; // Jump to "Locate Signal" phase
    
    // Fast-forward survival timer so Haven spawns
    State.game.survivalTimer = 610; 
    
    // NUKE ENEMIES (Safety)
    State.world.enemies = [];
    State.world.projectiles = [];
    
    // Spawn Haven & Teleport
    WorldEntity.spawnSafeHaven();
    if (State.game.safeHaven) {
        State.player.x = State.game.safeHaven.x;
        State.player.y = State.game.safeHaven.y;
    }
    
    TerminalSystem.log("DEV: WARP SUCCESSFUL. THREATS CLEARED.", "safe");
};

const GameLogic = {
  init: async () => {
    // 1. Initialize Systems
    InputSystem.init();
    RenderSystem.init();

    // 2. START LOOP IMMEDIATELY (Fixes Black Screen)
    // We start drawing the void/loading screen instantly.
    requestAnimationFrame(GameLogic.loop);

    // 3. Check for Checkpoint
    if (await SaveSystem.load()) {
        TerminalSystem.log("CHECKPOINT RESTORED", "safe");
        
        // If we loaded a save, ensure Objective UI matches the data
        if (State.game.killCount >= 5) ObjectiveSystem.currentPhaseIndex = 1;
        if (State.game.survivalTimer > 0) ObjectiveSystem.currentPhaseIndex = 2;
        ObjectiveSystem.render();
    } else {
        // 4. New Game Setup
        State.player.mode = "roam";
        document.body.className = "mode-roam";
        
        GameLogic.checkChunks();
        ObjectiveSystem.init();
        
        // Only play Intro if it's a fresh start
        await Cinematics.playIntro();
        
        // Narrative Hooks using DialogueSystem
        setTimeout(() => DialogueSystem.show("Where am I? I can't feel my arms...", 4000), 2000);
        setTimeout(() => DialogueSystem.show("Am I... glowing?", 3000), 8000);
        setTimeout(() => DialogueSystem.show("I need to figure out how to move.", 4000), 13000);
    }
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
    // Logic Loop
    if (!State.player.isDead && !State.game.paused) {
        const timeScale = State.player.isTerminalOpen ? 0.1 : 1.0;

        // --- NEW: Poll the gamepad/keyboard vector every frame ---
        InputSystem.update(); 

        PlayerEntity.update(timeScale);
        GameLogic.checkChunks();
        
        // Updates
        ObjectiveSystem.update();
        UISystem.update();
        AudioSystem.init(); 

        if (timeScale > 0 && State.player.combatUnlocked) {
            EnemyEntity.update(timeScale);
            updateProjectiles(timeScale);
        }

        handleGameRules();
        handleFragments();
    } else {
        // If paused/dead, we still draw the screen so it's not black
        if(State.game.paused) RenderSystem.draw(); 
    }

    // Draw Frame
    RenderSystem.draw();
    
    // Repeat
    requestAnimationFrame(GameLogic.loop);
  }
};

// --- LOGIC HELPERS ---

function handleFragments() {
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
}

function handleGameRules() {
    // A. Spawn Enemies based on Kills
    let spawnChance = 0.01;
    let maxEnemies = 5 + State.game.killCount / 3;

    if (State.game.killCount >= 20) { spawnChance = 0.08; maxEnemies = 30; } 
    else if (State.game.killCount >= 15) { spawnChance = 0.03; maxEnemies = 15; }

    if (State.player.combatUnlocked && State.world.enemies.length < maxEnemies) {
      if (Math.random() < spawnChance) WorldEntity.spawnEnemyRing();
    }

    // B. Survival Phase Logic
    if (ObjectiveSystem.currentPhaseIndex === 2 && !State.game.safeHaven) {
      // Check if enemies are nearby to count "survival" time
      let enemiesNearby = State.world.enemies.some((e) => Utils.dist(State.player.x, State.player.y, e.x, e.y) < 600);
      let tooClose = State.world.enemies.some((e) => Utils.dist(State.player.x, State.player.y, e.x, e.y) < 250);
      
      // If enemies are around but not touching you, timer goes up
      if (enemiesNearby && !tooClose) State.game.survivalTimer++;
      
      // Spawn Safe Haven after 600 frames (~10s)
      if (State.game.survivalTimer > 600) WorldEntity.spawnSafeHaven();
    }

    // C. WIN CONDITION (Safe Haven)
    if (State.game.safeHaven) {
      const h = State.game.safeHaven;
      if (Utils.dist(State.player.x, State.player.y, h.x, h.y) < h.r) {
        State.game.safeTimer++;
        
        // If player stays in circle for 3 seconds (180 frames)
        if (State.game.safeTimer > 180) {
          document.getElementById("fade-overlay").style.opacity = 1;
          TerminalSystem.print(">> SIGNAL LOCK. UPLOADING...", "#00ffaa");
          
          if (!State.player.isDead) {
              // --- CRITICAL UPDATE: CALL SAVE & EXIT ---
              setTimeout(() => {
                  SaveSystem.saveAndExit(2); // Unlock Chapter 2
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
                    if (State.player.shield > 0) { 
                        State.player.shield -= 10; 
                        TerminalSystem.log("SHIELD ABSORB", "safe"); 
                        
                        // --- ADD THIS CHECK FOR SHIELD DROPPING ---
                        if (State.player.shield <= 0) {
                             AudioSystem.playSFX("shield_down");
                        } else {
                             AudioSystem.playSFX("player_hit");
                        }
                    } 
                    else { 
                        State.player.health -= 10; 
                        TerminalSystem.log("HULL DAMAGE", "error"); 
                        AudioSystem.playSFX("player_hit"); // <--- ADD THIS LINE
                    }
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

// Start Game
GameLogic.init();