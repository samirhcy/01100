import { Config } from '../src/config.js';
import { Utils } from '../src/utils.js';
import { State } from './state.js';
import { TerminalSystem } from './Terminal.js';
import { ObjectiveSystem } from './Objective.js';

function checkOverlap(rect, padding = 15) {
    for (let s of State.world.structures) {
        if (rect.x < s.x + s.w + padding && rect.x + rect.w > s.x - padding &&
            rect.y < s.y + s.h + padding && rect.y + rect.h > s.y - padding) return true;
    }
    return false;
}

const RelicTypes = ["note", "script", "audio"];

export const WorldEntity = {
  initCh2: () => {
    State.world.structures.push({ x: -4000, y: State.ch2.gateY - 100, w: 3900, h: 200, isEntrance: true, color: "#004422", name: "GATE_LEFT" });
    State.world.structures.push({ x: 100, y: State.ch2.gateY - 100, w: 3900, h: 200, isEntrance: true, color: "#004422", name: "GATE_RIGHT" });

    let attempts = 0, blocksSpawned = 0;
    while(blocksSpawned < 30 && attempts < 2000) {
        attempts++;
        let bw = 40 + Math.random() * 110; let bh = 40 + Math.random() * 110;
        let bx = -2800 + Math.random() * 5600; let by = -4800 + Math.random() * 4400;
        if (bx > -300 && bx < 300 && by > -700) continue;
        
        let newRect = { 
            x: bx, y: by, w: bw, h: bh, color: "#004422", 
            name: `BLK_${Math.floor(Math.random()*9999)}`,
            hasFragment: Math.random() > 0.4
        };
        
        if (!checkOverlap(newRect, 15)) {
            State.world.structures.push(newRect);
            blocksSpawned++;
        }
    }

    setTimeout(() => {
        TerminalSystem.log("TELEPORTATION SUCCESSFUL", "safe");
        document.getElementById("obj-summary").innerText = "OBJ: INVESTIGATE";
        document.getElementById("obj-phase-title").innerText = "PHASE 1: THE UNKNOWN";
        document.getElementById("obj-task-list").innerHTML = `<div class="task-item"><span class="task-checkbox">[ ]</span><span>Explore the area.</span></div>`;
    }, 1500); 
  },

  update: (dt) => {
    if (State.ch2.phase === "entrance") {
      if (State.player.x < State.ch2.preBoundaries.minX) State.player.x = State.ch2.preBoundaries.minX;
      if (State.player.x > State.ch2.preBoundaries.maxX) State.player.x = State.ch2.preBoundaries.maxX;
      if (State.player.y > State.ch2.preBoundaries.maxY) State.player.y = State.ch2.preBoundaries.maxY;

      if (State.player.y < State.ch2.gateY) {
        State.ch2.phase = "triggered";
        TerminalSystem.log("WARNING: UNSTABLE ENVIRONMENT DETECTED", "error");
      }
    }

    if (State.ch2.phase === "triggered") {
      if (State.player.x < State.ch2.preBoundaries.minX) State.player.x = State.ch2.preBoundaries.minX;
      if (State.player.x > State.ch2.preBoundaries.maxX) State.player.x = State.ch2.preBoundaries.maxX;
      State.ch2.transitionTimer += 1;
      if (State.ch2.transitionTimer >= 300) WorldEntity.lockdownArea();
    }

    if (State.ch2.phase === "locked") {
      if (State.player.x < State.ch2.boundaries.minX) State.player.x = State.ch2.boundaries.minX;
      if (State.player.x > State.ch2.boundaries.maxX) State.player.x = State.ch2.boundaries.maxX;
      if (State.player.y < State.ch2.boundaries.minY) State.player.y = State.ch2.boundaries.minY;
      if (State.player.y > State.ch2.boundaries.maxY) State.player.y = State.ch2.boundaries.maxY;

      // POP-OUT FRAGMENTS
      State.world.structures.forEach(s => {
          if (s.hasFragment && !s.isEntrance) {
              let dist = Utils.dist(State.player.x, State.player.y, s.x + s.w/2, s.y + s.h/2);
              if (dist < 100) {
                  s.hasFragment = false;
                  State.world.fragments.push({ x: s.x + s.w/2, y: s.y + s.h + 15, active: true, size: 8 });
              }
          }
      });

      // PROCEDURAL SCATTER SPAWNING
      if (State.ch2.hasAetherLens && State.world.fragments.filter(f => f.active).length < 40) {
          if (Math.random() < 0.1) {
              let fx = State.ch2.boundaries.minX + Math.random() * (State.ch2.boundaries.maxX - State.ch2.boundaries.minX);
              let fy = State.ch2.boundaries.minY + Math.random() * (State.ch2.boundaries.maxY - State.ch2.boundaries.minY);
              let overlap = false;
              for (let s of State.world.structures) { if (Utils.checkRectCollide(fx, fy, s)) overlap = true; }
              if (!overlap && Utils.dist(State.player.x, State.player.y, fx, fy) > 200) {
                  State.world.fragments.push({ x: fx, y: fy, active: true, size: 8 });
              }
          }
      }

      State.ch2.relicSpawnTimer++;
      if (State.ch2.relicSpawnTimer > 300 && State.ch2.relics.length === 0) WorldEntity.spawnRelic();

      State.ch2.relics.forEach((r, idx) => {
          let dist = Utils.dist(State.player.x, State.player.y, r.x + r.w/2, r.y + r.h/2);
          if (dist < r.radius) r.circleVisible = true; else r.circleVisible = false;

          if (dist < 150) {
              r.tagVisible = true;
              if (!r.spawnedItems) {
                  r.spawnedItems = true;
                  r.chip = { x: r.x + r.w + 20, y: r.y + r.h/2 - 10, w: 20, h: 20, collected: false };
                  
                  let typeRoll = Math.random();
                  let itemType = "note";
                  if (typeRoll > 0.7) itemType = "script";
                  else if (typeRoll > 0.4) itemType = "audio";

                  let itemName = `${itemType.toUpperCase()}_0x${Math.floor(Math.random()*9999)}.dat`;
                  let rawContent = "I don't know how long it's been. The grid keeps shifting. If you find this, look for the green signature.";
                  if (itemType === "script") rawContent = `sys.upgrade --module "player-v${Math.floor(Math.random()*5)}" --force`;
                  if (itemType === "audio") rawContent = "[AUDIO TRANSCRIPT]\n> Code84: Who is out there? I left the coordinates in sector 4...";

                  r.relicData = { 
                      x: r.x + r.w/2, y: r.y - 30, w: 16, h: 16, active: true, 
                      item: { id: Date.now() + Math.random(), type: itemType, name: itemName, raw: rawContent, encrypted: true, size: Math.floor(Math.random() * 50) + 12 } 
                  };
              }
          } else { r.tagVisible = false; }

          if (r.spawnedItems && !r.chip.collected) {
              let chipDist = Utils.dist(State.player.x, State.player.y, r.chip.x + r.chip.w/2, r.chip.y + r.chip.h/2);
              if (chipDist < 25) {
                  r.chip.collected = true;
                  State.ch2.hasAetherLens = true;
                  State.ch2.commandsLocked = false; 
                  State.world.structures.forEach(s => { if (!s.isEntrance && s.color !== "#9dc183") s.color = "#ffffff"; });
                  
                  const lensUI = document.getElementById("aether-lens-wrapper");
                  if (lensUI) lensUI.style.display = "flex";

                  TerminalSystem.log("SYSTEM UPDATE APPLIED", "safe");
                  TerminalSystem.log("AETHER LENS ACQUIRED", "safe");
              }
          }

          if (r.spawnedItems && r.relicData.active) {
              let dataDist = Utils.dist(State.player.x, State.player.y, r.relicData.x, r.relicData.y);
              if (dataDist < 20) {
                  if (!State.ch2.hasAetherLens) {
                      if (State.ch2.errorThrottle <= 0) { TerminalSystem.log("ERR: ENCRYPTED FORMAT. TOOL REQUIRED.", "error"); State.ch2.errorThrottle = 100; }
                  } else {
                      r.relicData.active = false;
                      State.ch2.inventory.push(r.relicData.item);
                      TerminalSystem.log(`ACQUIRED: ${r.relicData.item.name}`, "safe");
                      if (window.AetherLens && window.AetherLens.OS) {
                          window.AetherLens.OS.updateRAM();
                          if (window.AetherLens.OS.activeApp === 'files') window.AetherLens.OS.renderPane2();
                      }
                  }
              }
          }
      });

      State.world.fragments.forEach(f => {
          if (f.active && Utils.dist(State.player.x, State.player.y, f.x, f.y) < 20) { f.active = false; State.player.data += 10; }
      });

      // --- PROJECTILE PHYSICS ---
      for (let i = State.world.projectiles.length - 1; i >= 0; i--) {
          let p = State.world.projectiles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.life--;
          
          let hitWall = false;
          for (let s of State.world.structures) {
              if (Utils.checkRectCollide(p.x, p.y, s)) { hitWall = true; break; }
          }
          if (p.life <= 0 || hitWall) {
              State.world.projectiles.splice(i, 1);
          }
      }
    }
  },

  spawnRelic: (bypassLimit = false) => {
    if (!bypassLimit && State.ch2.relics.length > 0) return;

    let attempts = 0;
    while(attempts < 500) {
        attempts++;
        let bx, by;
        
        if (!bypassLimit) {
            // First Relic ALWAYS spawns close to the player
            let angle = Math.random() * Math.PI * 2;
            let dist = 600 + Math.random() * 400; 
            bx = State.player.x + Math.cos(angle) * dist;
            by = State.player.y + Math.sin(angle) * dist;
            bx = Math.max(State.ch2.boundaries.minX + 200, Math.min(State.ch2.boundaries.maxX - 200, bx));
            by = Math.max(State.ch2.boundaries.minY + 200, Math.min(State.ch2.boundaries.maxY - 200, by));
        } else {
            // Next 14 Relics scatter across the map
            bx = State.ch2.boundaries.minX + 200 + Math.random() * (State.ch2.boundaries.maxX - State.ch2.boundaries.minX - 400);
            by = State.ch2.boundaries.minY + 200 + Math.random() * (State.ch2.boundaries.maxY - State.ch2.boundaries.minY - 400);
        }

        let bw = 80; let bh = 80;
        if (Utils.dist(State.player.x, State.player.y, bx + bw/2, by + bh/2) < 400) continue;

        let rect = { x: bx, y: by, w: bw, h: bh, color: "#9dc183", name: `NULL_RELIC_${State.ch2.relics.length + 1}` }; 

        if (!checkOverlap(rect, 100)) { 
            State.world.structures.push(rect);
            State.ch2.relics.push({
                x: bx, y: by, w: bw, h: bh, radius: 250, circleVisible: false, tagVisible: false, 
                spawnedItems: false, chip: null, relicData: null
            });
            if (!bypassLimit) TerminalSystem.log("ANOMALY SIGNATURE DETECTED NEARBY", "safe");
            break;
        }
    }
  },

  spawnRemainingRelics: () => {
      TerminalSystem.log("NETWORK EXPANDED: MULTIPLE SIGNATURES DETECTED", "safe");
      for(let i = 0; i < 14; i++) {
          WorldEntity.spawnRelic(true);
      }
  },

  lockdownArea: () => {
    State.ch2.phase = "locked";
    State.ch2.commandsLocked = true;
    State.world.structures = State.world.structures.filter(s => !s.isEntrance);
    TerminalSystem.log("CONNECTION FAILED: NULL SAFETY ENTERED", "error");
  }
};