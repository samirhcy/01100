import { State } from './state.js';
import { Config } from '../src/config.js';
import { UISystem } from './HUD.js';

let ctx = null, miniCtx = null, canvas = null;

export const RenderSystem = {
  init: () => {
    canvas = document.getElementById("gameCanvas");
    ctx = canvas.getContext("2d");
    const miniCanvas = document.getElementById("minimap-canvas");
    if (miniCanvas) miniCtx = miniCanvas.getContext("2d");
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  },

  draw: () => {
    if (!ctx) return;
    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const cx = canvas.width / 2; const cy = canvas.height / 2;

    ctx.save();
    ctx.translate(cx - State.player.x, cy - State.player.y);

    // 1. Grid (Restores to normal if Aether Lens is acquired)
    let gridColor = Config.colors.grid;
    if (State.ch2.phase === "locked" && !State.ch2.hasAetherLens) gridColor = "#002233";
    
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const sc = Math.floor((State.player.x - cx) / Config.gridSize);
    const ec = Math.floor((State.player.x + cx) / Config.gridSize) + 1;
    const sr = Math.floor((State.player.y - cy) / Config.gridSize);
    const er = Math.floor((State.player.y + cy) / Config.gridSize) + 1;
    for (let x = sc * Config.gridSize; x <= ec * Config.gridSize; x += Config.gridSize) {
      ctx.moveTo(x, State.player.y - cy); ctx.lineTo(x, State.player.y + cy);
    }
    for (let y = sr * Config.gridSize; y <= er * Config.gridSize; y += Config.gridSize) {
      ctx.moveTo(State.player.x - cx, y); ctx.lineTo(State.player.x + cx, y);
    }
    ctx.stroke();

    // 2. Threshold Line
    if (State.ch2.phase !== "locked") {
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-3000, State.ch2.gateY); ctx.lineTo(3000, State.ch2.gateY);
      ctx.stroke();
    }

    // 3. Walls & Relic Blocks (No glow, solid colors)
    State.world.structures.forEach((s) => {
        ctx.fillStyle = s.color || "#004422";
        ctx.fillRect(s.x, s.y, s.w, s.h);
    });

    // 4. Memory Stream Elements (Dashed Circle)
    State.ch2.relics.forEach(r => {
        if (r.circleVisible) {
            ctx.strokeStyle = "rgba(157, 193, 131, 0.4)";
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(r.x + r.w/2, r.y + r.h/2, r.radius, 0, Math.PI*2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    });

    // Fragments
    State.world.fragments.forEach(f => {
        if (f.active) {
            ctx.fillStyle = Config.colors.fragment;
            ctx.shadowBlur = 10;
            ctx.shadowColor = Config.colors.fragment;
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.size/2, 0, Math.PI*2);
            ctx.fill();
        }
    });
    ctx.shadowBlur = 0;

    // Relic Unique Data (Rounded Square)
    State.ch2.relics.forEach(r => {
        if (r.spawnedItems && r.relicData && r.relicData.active) {
            ctx.fillStyle = "#ffa500"; // Distinct Gold/Orange color
            ctx.shadowBlur = 15;
            ctx.shadowColor = "#ffa500";
            
            // Draw Rounded Rectangle
            ctx.beginPath();
            ctx.roundRect(r.relicData.x - r.relicData.w/2, r.relicData.y - r.relicData.h/2, r.relicData.w, r.relicData.h, 4);
            ctx.fill();
            
            // Inner detail
            ctx.fillStyle = "#fff";
            ctx.shadowBlur = 0;
            ctx.fillRect(r.relicData.x - 2, r.relicData.y - 2, 4, 4);
        }
    });

    // 5. Player & Aim Arrow
    if (!State.player.isDead) {
      // Draw Body
      ctx.fillStyle = State.player.mode === "combat" ? "#fa0" : "#fff";
      ctx.beginPath();
      ctx.arc(State.player.x, State.player.y, 10, 0, Math.PI * 2);
      ctx.fill();

      // THE FIX: Detached Clinging Aim Arrow
      ctx.fillStyle = State.player.mode === "combat" ? "#fa0" : "#00f3ff";
      let tipX = State.player.x + Math.cos(State.player.angle) * 18;
      let tipY = State.player.y + Math.sin(State.player.angle) * 18;
      let leftX = State.player.x + Math.cos(State.player.angle - 0.6) * 12;
      let leftY = State.player.y + Math.sin(State.player.angle - 0.6) * 12;
      let rightX = State.player.x + Math.cos(State.player.angle + 0.6) * 12;
      let rightY = State.player.y + Math.sin(State.player.angle + 0.6) * 12;

      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(leftX, leftY);
      ctx.lineTo(rightX, rightY);
      ctx.closePath();
      ctx.fill();
    }

    // 6. Draw Bullets (Projectiles)
    ctx.fillStyle = "#ffaa00";
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#ffaa00";
    State.world.projectiles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.shadowBlur = 0;

    ctx.restore(); // Ensure this restore() is still here!
    // ==========================================
    // STANDARD LIGHTING (No weird screen glow)
    // ==========================================
    ctx.setTransform(1, 0, 0, 1, 0, 0); 
    let rLight = Config.baseLightRadius * State.player.lightLevel;
    let pGlow = ctx.createRadialGradient(cx, cy, 10, cx, cy, rLight);
    pGlow.addColorStop(0, "rgba(0,0,0,0)"); 
    pGlow.addColorStop(1, "rgba(0,0,0,0.98)");
    ctx.fillStyle = pGlow;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // ==========================================

    // 6. Draw Out-Of-Bounds Masks
    ctx.save();
    ctx.translate(cx - State.player.x, cy - State.player.y);
    if (State.ch2.phase === "locked") {
      ctx.fillStyle = "#000000";
      ctx.fillRect(-10000, -10000, 10000 + State.ch2.boundaries.minX, 20000); // Left
      ctx.fillRect(State.ch2.boundaries.maxX, -10000, 10000, 20000); // Right
      ctx.fillRect(-10000, -10000, 20000, 10000 + State.ch2.boundaries.minY); // Top
      ctx.fillRect(-10000, State.ch2.boundaries.maxY, 20000, 10000); // Bottom
    }

    // 7. Draw the Chip and Tags OVER the darkness
    State.ch2.relics.forEach(r => {
        if (r.tagVisible) {
            ctx.fillStyle = "#9dc183";
            ctx.font = "bold 14px Inconsolata";
            ctx.fillText("#u01/nullable-relics", r.x - 30, r.y - 15);
        }

        if (r.spawnedItems && !r.chip.collected) {
            ctx.fillStyle = "#bd00ff";
            ctx.fillRect(r.chip.x, r.chip.y, r.chip.w, r.chip.h);
            ctx.fillStyle = "#fff";
            ctx.fillRect(r.chip.x + 4, r.chip.y + 4, r.chip.w - 8, r.chip.h - 8);
        }
    });
    ctx.restore();

    UISystem.update();
    RenderSystem.drawMiniMap();
  },

  drawMiniMap: () => {
    if (!miniCtx) return;
    miniCtx.fillStyle = "#000";
    miniCtx.fillRect(0, 0, 140, 140);
    
    const s = 0.05, cx = 70, cy = 70;

    // --- DRAW WALLS FIRST ---
    State.world.structures.forEach((st) => {
      miniCtx.fillStyle = st.color || "#004422";
      let rx = (st.x - State.player.x) * s;
      let ry = (st.y - State.player.y) * s;
      let rw = st.w * s;
      let rh = st.h * s;
      
      if (rx + rw > -70 && rx < 70 && ry + rh > -70 && ry < 70) {
         miniCtx.fillRect(cx + rx, cy + ry, rw, rh);
      }
    });

    // --- OFFLINE STATE OVERLAY (Only if Lens is NOT acquired) ---
    if (State.ch2.phase === "locked" && !State.ch2.hasAetherLens) {
        miniCtx.fillStyle = "rgba(0, 0, 0, 0.6)"; 
        miniCtx.fillRect(0, 0, 140, 140);

        // Blinking logic using current time
        if (Math.floor(Date.now() / 800) % 2 === 0) {
            miniCtx.fillStyle = "#ff3333";
            miniCtx.font = "bold 16px Inconsolata";
            miniCtx.fillText("OFFLINE", 35, 75);
        }
        
        // Ensure Relic is visible
        State.ch2.relics.forEach(r => {
            let rx = (r.x - State.player.x) * s;
            let ry = (r.y - State.player.y) * s;
            if (rx + r.w*s > -70 && rx < 70 && ry + r.h*s > -70 && ry < 70) {
               miniCtx.fillStyle = "#9dc183";
               miniCtx.fillRect(cx + rx, cy + ry, r.w * s, r.h * s);
            }
        });
        
        miniCtx.fillStyle = "#fff";
        miniCtx.beginPath(); miniCtx.arc(cx, cy, 2, 0, Math.PI * 2); miniCtx.fill();
        return;
    }

    // --- DRAW FRAGMENTS (Only if Lens is acquired) ---
    if (State.ch2.hasAetherLens) {
        miniCtx.fillStyle = Config.colors.fragment;
        State.world.fragments.forEach((f) => {
          if (f.active) {
            let rx = (f.x - State.player.x) * s, ry = (f.y - State.player.y) * s;
            if (Math.abs(rx) < 70 && Math.abs(ry) < 70) miniCtx.fillRect(cx + rx, cy + ry, 2, 2);
          }
        });
    }

    miniCtx.fillStyle = "#fff";
    miniCtx.beginPath(); miniCtx.arc(cx, cy, 2, 0, Math.PI * 2); miniCtx.fill();
  }
};