import { State } from '../state.js';
import { Config } from '../config.js';
import { UISystem } from '../ui/HUD.js'; // Render loop calls UI update in original code

let ctx = null;
let miniCtx = null;
let canvas = null;

export const RenderSystem = {
  init: () => {
    canvas = document.getElementById("gameCanvas");
    ctx = canvas.getContext("2d");
    const miniCanvas = document.getElementById("minimap-canvas");
    if (miniCanvas) miniCtx = miniCanvas.getContext("2d");

    // Initial resize to ensure full screen
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  },

  draw: () => {
    if (!ctx) return;

    // 1. Clear Screen
    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    ctx.save();
    ctx.translate(cx - State.player.x, cy - State.player.y);

    // 2. Draw Grid
    ctx.strokeStyle = Config.colors.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const sc = Math.floor((State.player.x - cx) / Config.gridSize);
    const ec = Math.floor((State.player.x + cx) / Config.gridSize) + 1;
    const sr = Math.floor((State.player.y - cy) / Config.gridSize);
    const er = Math.floor((State.player.y + cy) / Config.gridSize) + 1;

    for (let x = sc * Config.gridSize; x <= ec * Config.gridSize; x += Config.gridSize) {
      ctx.moveTo(x, State.player.y - cy);
      ctx.lineTo(x, State.player.y + cy);
    }
    for (let y = sr * Config.gridSize; y <= er * Config.gridSize; y += Config.gridSize) {
      ctx.moveTo(State.player.x - cx, y);
      ctx.lineTo(State.player.x + cx, y);
    }
    ctx.stroke();

    // 3. Draw Walls
    ctx.fillStyle = Config.colors.wall;
    State.world.structures.forEach((s) => {
      if (
        s.x + s.w > State.player.x - cx &&
        s.x < State.player.x + cx &&
        s.y + s.h > State.player.y - cy &&
        s.y < State.player.y + cy
      )
        ctx.fillRect(s.x, s.y, s.w, s.h);
    });

    // 4. Draw Fragments
    ctx.fillStyle = Config.colors.fragment;
    ctx.shadowBlur = 10;
    ctx.shadowColor = Config.colors.fragment;
    State.world.fragments.forEach((f) => {
      if (
        f.active &&
        f.x > State.player.x - cx &&
        f.x < State.player.x + cx
      )
        ctx.fillRect(f.x - 4, f.y - 4, 8, 8);
    });
    ctx.shadowBlur = 0;

    // 5. Draw Enemies
    State.world.enemies.forEach((en) => {
      if (
        en.x > State.player.x - cx - 1000 &&
        en.x < State.player.x + cx + 1000
      ) {
        ctx.fillStyle = "rgba(255, 50, 50, 0.1)";
        ctx.beginPath();
        ctx.moveTo(en.x, en.y);
        ctx.arc(en.x, en.y, en.sightRange, en.angle - 0.4, en.angle + 0.4);
        ctx.fill();
        ctx.fillStyle = Config.colors.enemy;
        ctx.save();
        ctx.translate(en.x, en.y);
        ctx.rotate(en.angle);
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(-10, 8);
        ctx.lineTo(-10, -8);
        ctx.fill();
        ctx.restore();
      }
    });

    // 6. Draw Projectiles
    State.world.projectiles.forEach((p) => {
      ctx.fillStyle = p.type === "player" ? "#ff0" : "#f00";
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    });

    // 7. Draw Safe Haven
    if (State.game.safeHaven) {
      const h = State.game.safeHaven;
      let pulse = Math.sin(Date.now() / 200) * 5;
      ctx.strokeStyle = Config.colors.safe;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.r + pulse, 0, Math.PI * 2);
      ctx.stroke();
      if (State.game.safeTimer > 0) {
        ctx.fillStyle = "rgba(0, 255, 170, 0.2)";
        ctx.beginPath();
        ctx.arc(
          h.x,
          h.y,
          h.r * (State.game.safeTimer / 180),
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }

    // 8. Draw Player
    if (!State.player.isDead) {
      ctx.globalAlpha = State.player.cloaked ? 0.3 : 1.0;
      ctx.fillStyle = State.player.mode === "combat" ? "#fa0" : "#fff";
      ctx.shadowBlur = 10;
      ctx.shadowColor = ctx.fillStyle;
      ctx.beginPath();
      ctx.arc(State.player.x, State.player.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1.0;
      if (State.player.mode === "combat") {
        ctx.strokeStyle = "#ff3333";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(State.player.x, State.player.y, 20, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();

    // 9. Lighting Vignette
    let healthMod = Math.max(0.3, State.player.health / 100);
    let r = Config.baseLightRadius * State.player.lightLevel * healthMod;
    let g = ctx.createRadialGradient(cx, cy, 10, cx, cy, r);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,1)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 10. Update UI (Matched original placement)
    UISystem.update();
    RenderSystem.drawMiniMap();
  },

  drawMiniMap: () => {
    if (!miniCtx) return;
    
    miniCtx.fillStyle = "#000";
    miniCtx.fillRect(0, 0, 140, 140);
    const s = 0.05;
    const cx = 70;
    const cy = 70;
    
    miniCtx.fillStyle = "#f33";
    State.world.enemies.forEach((e) => {
      let rx = (e.x - State.player.x) * s,
        ry = (e.y - State.player.y) * s;
      if (Math.abs(rx) < 70 && Math.abs(ry) < 70)
        miniCtx.fillRect(cx + rx - 1.5, cy + ry - 1.5, 3, 3);
    });
    
    if (State.game.safeHaven) {
      let h = State.game.safeHaven;
      let rx = (h.x - State.player.x) * s,
        ry = (h.y - State.player.y) * s;
      if (Math.abs(rx) < 70 && Math.abs(ry) < 70) {
        miniCtx.strokeStyle = Config.colors.safe;
        miniCtx.lineWidth = 2;
        miniCtx.beginPath();
        miniCtx.arc(cx + rx, cy + ry, h.r * s, 0, Math.PI * 2);
        miniCtx.stroke();
      }
    }
    
    miniCtx.fillStyle = "#444";
    State.world.structures.forEach((st) => {
      let rx = (st.x - State.player.x) * s,
        ry = (st.y - State.player.y) * s;
      if (Math.abs(rx) < 70 && Math.abs(ry) < 70)
        miniCtx.fillRect(cx + rx, cy + ry, st.w * s, st.h * s);
    });
    
    if (State.player.scanActive) {
      miniCtx.fillStyle = Config.colors.fragment;
      State.world.fragments.forEach((f) => {
        if (f.active) {
          let rx = (f.x - State.player.x) * s,
            ry = (f.y - State.player.y) * s;
          if (Math.abs(rx) < 70 && Math.abs(ry) < 70)
            miniCtx.fillRect(cx + rx, cy + ry, 2, 2);
        }
      });
    }
    
    miniCtx.fillStyle = State.player.mode === "combat" ? "#fa0" : "#fff";
    miniCtx.beginPath();
    miniCtx.arc(cx, cy, 2, 0, Math.PI * 2);
    miniCtx.fill();
  },
};