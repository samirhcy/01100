/* =========================================
   SECTION 1: CONFIGURATION & STATE
   ========================================= */
const Config = {
    gridSize: 60,
    baseLightRadius: 300,
    colors: {
      grid: "#151515",
      fragment: "#00f3ff",
      beacon: "#ffffff",
      portal: "#bd00ff",
    },
    player: { accel: 0.15, friction: 0.96 },
};
  
const State = {
    phase: "intro", // intro -> void -> tutorial -> active -> end
    player: {
      x: 0, 
      y: 0, 
      vx: 0, 
      vy: 0, 
      size: 10,
      data: 0, 
      lightLevel: 1.0,
      isTerminalOpen: false, 
      scanActive: false, 
      scanTimer: 0,
    },
    world: {
      fragments: [],
      beacon: { x: 0, y: 0, active: false, pulse: 0 },
      portal: { x: 0, y: 0, active: false, pulse: 0 },
    },
    input: { keys: { w: false, a: false, s: false, d: false } },
    hotbar: { 1: null, 2: null, 3: null, 4: null, 5: null },
};

/* =========================================
   SECTION 2: UTILITIES & AUDIO MOCKUP
   ========================================= */
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const miniCanvas = document.getElementById("minimap-canvas");
const miniCtx = miniCanvas.getContext("2d");

const Utils = {
    wait: (ms) => new Promise((r) => setTimeout(r, ms)),
    unlock: (id) => {
        const el = document.getElementById(id);
        if(el) el.classList.add("unlocked");
    },
    dist: (x1, y1, x2, y2) => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2),
};

/* =========================================
   SECTION 3: CINEMATICS (INTRO)
   ========================================= */
const Intro = {
    play: async () => {
      const title = document.getElementById("intro-title");
      const sub = document.getElementById("intro-sub");
      const dev = document.getElementById("intro-dev");
      const glitch = document.getElementById("glitch-layer");
      const overlay = document.getElementById("cinematic-overlay");
      const story = document.getElementById("story-overlay");

      // 1. Cinematic Sequence
      await Utils.wait(500);
      if(title) title.style.opacity = 1;
      if(sub) sub.style.opacity = 1;
      
      await Utils.wait(3000);
      if(title) title.style.opacity = 0;
      if(sub) sub.style.opacity = 0;
      
      await Utils.wait(1000);
      if(dev) dev.style.opacity = 1;
      
      await Utils.wait(2500);
      if(dev) dev.style.opacity = 0;
      
      // 2. Transition to Story
      await Utils.wait(500);
      if(overlay) overlay.style.opacity = 0; // Hide first overlay
      
      if(story) story.style.opacity = 1; // Show Story
      await Utils.wait(20000);
      if(story) story.style.opacity = 0; // Hide Story
      await Utils.wait(1000);

      // 3. Glitch Effect & Start
      if(glitch) {
          glitch.classList.add("glitch-active");
          await Utils.wait(500);
          glitch.classList.remove("glitch-active");
      }

      State.phase = "void";
      Game.spawnBeacon();
    },
};

/* =========================================
   SECTION 4: UI & TERMINAL SYSTEMS
   ========================================= */
const UI = {
    update: () => {
      const coords = document.getElementById("coords-display");
      if(coords) coords.innerText = `LOC: [${Math.floor(State.player.x)}, ${Math.floor(State.player.y)}]`;
      
      const data = document.getElementById("data-bank");
      if(data) data.innerText = `DATA: ${State.player.data} MB`;
    },
    
    log: (msg) => {
      const l = document.getElementById("system-log");
      if(!l) return;
      const d = document.createElement("div");
      d.className = "log-entry";
      d.innerText = "> " + msg;
      l.appendChild(d);
      if (l.children.length > 5) l.removeChild(l.firstChild);
    },
    
    toggleMenu: () => {
      const menu = document.getElementById("menu-dropdown");
      if(menu) menu.classList.toggle("show");
    }
};

const Terminal = {
    print: (text, color = "#0f0") => {
      const out = document.getElementById("term-output");
      if(!out) return;
      const line = document.createElement("div");
      line.style.color = color;
      line.style.marginBottom = "8px";
      line.innerText = text;
      out.appendChild(line);
      out.scrollTop = out.scrollHeight;
    },
    
    toggle: () => {
      if (State.phase === "intro" || State.phase === "void") return;
      
      State.player.isTerminalOpen = !State.player.isTerminalOpen;
      const wrap = document.getElementById("terminal-wrapper");
      
      if (State.player.isTerminalOpen) {
        wrap.classList.add("open");
        setTimeout(() => document.getElementById("term-input").focus(), 50);
      } else {
        wrap.classList.remove("open");
        document.getElementById("term-input").blur();
      }
    },
    
    runSequence: async () => {
      State.phase = "tutorial";
      Utils.unlock("hud-bottom-right");
      
      await Utils.wait(500);
      Terminal.toggle();
      
      await Utils.wait(1000);
      Terminal.print("SOURCE CODE IDENTIFIED...", "#fff");
      await Utils.wait(1500);
      Terminal.print("#WilliamHayes CONNECTED.", "#00f3ff");
      await Utils.wait(1500);
      Terminal.print("ALERT: MEMORY BANKS OFFLINE.", "#ff3333");
      await Utils.wait(2000);
      Terminal.print("RESTORING NAVIGATION...", "#ccc");
      
      await Utils.wait(1000);
      Utils.unlock("hud-top-left");
      Utils.unlock("hud-bottom-left");
      Terminal.print(">> MAP & LOGS: UNLOCKED", "#0f0");
      
      await Utils.wait(2000);
      Terminal.print("SCANNING FOR DATA FRAGMENTS...", "#ccc");
      Game.spawnLoot();
      
      await Utils.wait(2000);
      Utils.unlock("hud-bottom-center");
      Utils.unlock("hud-top-right");
      Terminal.print(">> CORE STATS: UNLOCKED", "#0f0");
      
      await Utils.wait(1000);
      Terminal.print("TUTORIAL COMPLETE. SYSTEM READY.", "#fff");
      Terminal.print("Press 'Tab' to open/close Terminal.", "#fff");
      Terminal.print("COMMANDS AVAILABLE:", "#00f3ff");
      Terminal.print("  sys.lumos  - Enhance Light (50 MB)", "#ccc");
      Terminal.print("  sys.scan   - Highlight Loot (50 MB)", "#ccc");
      Terminal.print("  /bind [k] [cmd] - Assign Keys", "#ccc");
      Terminal.print("n: TRY ABOVE COMMANDS BEFORE ENTERING THE RIFT.", "#ccc");
      Terminal.print("OBJECTIVE: ENTER THE RIFT TO ESCAPE.", "#bd00ff");
      
      State.phase = "active";
      Game.spawnPortal();
    },
    
    execute: (val) => {
      const parts = val.split(" ");
      const cmd = parts[0];
      const args = parts.slice(1);
      
      if (cmd === "/help") {
        Terminal.print("COMMANDS: sys.lumos, sys.scan, /bind", "#fff");
      } else if (cmd === "sys.lumos") {
        if (State.player.data >= 50) {
          State.player.data -= 50;
          State.player.lightLevel += 0.3;
          Terminal.print("LIGHT RADIUS INCREASED.", "#0f0");
        } else Terminal.print("ERR: 50 DATA REQUIRED", "#f33");
      } else if (cmd === "sys.scan") {
        if (State.player.data >= 50) {
          State.player.data -= 50;
          State.player.scanActive = true;
          State.player.scanTimer = 600;
          Terminal.print("AREA SCANNED.", "#0f0");
        } else Terminal.print("ERR: 50 DATA REQUIRED", "#f33");
      } else if (cmd === "/bind") {
        const k = args[0];
        const c = args[1];
        if (["1", "2", "3", "4", "5"].includes(k)) {
          State.hotbar[k] = c;
          const slot = document.getElementById(`slot-${k}`);
          if(slot) slot.innerText = c;
          Terminal.print(`BOUND ${c} TO [${k}]`, "#0ff");
        } else Terminal.print("ERR: INVALID KEY", "#f33");
      } else {
        Terminal.print("UNKNOWN COMMAND", "#f33");
      }
      UI.update();
    },
};

/* =========================================
   SECTION 5: GAME LOGIC & PHYSICS
   ========================================= */
const Game = {
    init: () => {
      State.player.x = 0;
      State.player.y = 0;
      State.world = {
        fragments: [],
        beacon: { active: false },
        portal: { active: false },
      };
      
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      window.addEventListener("resize", () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      });
      
      // Expose globally for HTML event handlers
      window.UI = UI;
      window.Terminal = Terminal;
      
      Intro.play();
    },
    
    spawnBeacon: () => {
      const angle = Math.random() * Math.PI * 2;
      State.world.beacon = {
        x: Math.cos(angle) * 500,
        y: Math.sin(angle) * 500,
        active: true,
        pulse: 0,
      };
    },
    
    spawnLoot: () => {
      for (let i = 0; i < 40; i++) {
        let x = Math.random() * 2000 - 1000;
        let y = Math.random() * 2000 - 1000;
        if (Math.sqrt(x * x + y * y) > 200)
          State.world.fragments.push({ x, y, size: 8, active: true });
      }
    },
    
    spawnPortal: () => {
      State.world.portal = {
        x: -State.player.x + 200,
        y: -State.player.y + 200,
        active: true,
        pulse: 0,
      };
      UI.log("ANOMALY DETECTED: PORTAL OPENED");
    },
    
    update: () => {
      if (State.phase === "intro" || State.phase === "end") return;
      const timeScale = State.player.isTerminalOpen ? 0.1 : 1.0;

      // Physics
      if (State.input.keys.w) State.player.vy -= Config.player.accel * timeScale;
      if (State.input.keys.s) State.player.vy += Config.player.accel * timeScale;
      if (State.input.keys.a) State.player.vx -= Config.player.accel * timeScale;
      if (State.input.keys.d) State.player.vx += Config.player.accel * timeScale;
      
      State.player.vx *= Config.player.friction;
      State.player.vy *= Config.player.friction;
      
      State.player.x += State.player.vx * timeScale;
      State.player.y += State.player.vy * timeScale;

      // Beacon Interaction
      if (State.phase === "void" && State.world.beacon.active) {
        const dx = State.player.x - State.world.beacon.x;
        const dy = State.player.y - State.world.beacon.y;
        if (Math.sqrt(dx * dx + dy * dy) < 50) {
          State.world.beacon.active = false;
          Terminal.runSequence();
        }
      }

      // Portal Interaction (End Level)
      if (State.phase === "active" && State.world.portal.active) {
        const dx = State.player.x - State.world.portal.x;
        const dy = State.player.y - State.world.portal.y;
        if (Math.sqrt(dx * dx + dy * dy) < 60) {
          State.phase = "end";
          Terminal.print(">> UPLOADING CONSCIOUSNESS...", "#bd00ff");
          
          const saveData = {
            data: State.player.data,
            lightLevel: State.player.lightLevel,
          };
          localStorage.setItem("0110_save", JSON.stringify(saveData));
          
          const fade = document.getElementById("fade-layer");
          if(fade) fade.style.opacity = 1;
          
          setTimeout(() => { window.location.href = "game.html"; }, 3000);
        }
      }

      // Fragment Collection
      State.world.fragments.forEach((f) => {
        if (f.active && Utils.dist(State.player.x, State.player.y, f.x, f.y) < 20) {
          f.active = false;
          State.player.data += 10;
          UI.log("DATA MINED: +10 MB");
          UI.update();
        }
      });

      if (State.player.scanActive) State.player.scanTimer--;
    },
};

/* =========================================
   SECTION 6: RENDERING SYSTEM
   ========================================= */
const Render = {
    loop: () => {
      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2, cy = canvas.height / 2;
      
      ctx.save();
      ctx.translate(cx - State.player.x, cy - State.player.y);

      // Grid
      const sc = Math.floor((State.player.x - cx) / Config.gridSize),
        ec = Math.floor((State.player.x + cx) / Config.gridSize) + 1;
      const sr = Math.floor((State.player.y - cy) / Config.gridSize),
        er = Math.floor((State.player.y + cy) / Config.gridSize) + 1;
      
      ctx.strokeStyle = Config.colors.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = sc * Config.gridSize; x <= ec * Config.gridSize; x += Config.gridSize) {
        ctx.moveTo(x, State.player.y - cy); ctx.lineTo(x, State.player.y + cy);
      }
      for (let y = sr * Config.gridSize; y <= er * Config.gridSize; y += Config.gridSize) {
        ctx.moveTo(State.player.x - cx, y); ctx.lineTo(State.player.x + cx, y);
      }
      ctx.stroke();

      // Fragments
      State.world.fragments.forEach((f) => {
        if (f.active && f.x > State.player.x - cx && f.x < State.player.x + cx) {
          ctx.fillStyle = Config.colors.fragment;
          ctx.shadowBlur = 10;
          ctx.shadowColor = Config.colors.fragment;
          ctx.fillRect(f.x - 4, f.y - 4, 8, 8);
        }
      });
      ctx.shadowBlur = 0;

      // Player
      ctx.fillStyle = "#fff";
      ctx.shadowBlur = 15; ctx.shadowColor = "#fff";
      ctx.beginPath();
      ctx.arc(State.player.x, State.player.y, State.player.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();

      // Lighting Vignette
      let r = Config.baseLightRadius * State.player.lightLevel;
      let g = ctx.createRadialGradient(cx, cy, 10, cx, cy, r);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(0,0,0,1)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Special Objects (Beacon / Portal)
      ctx.save();
      ctx.translate(cx - State.player.x, cy - State.player.y);
      if (State.world.beacon.active) {
        let b = State.world.beacon;
        b.pulse += 0.05;
        let sz = 20 + Math.sin(b.pulse) * 5;
        ctx.fillStyle = Config.colors.beacon;
        ctx.shadowBlur = 40;
        ctx.shadowColor = "#00f3ff";
        ctx.fillRect(b.x - sz / 2, b.y - sz / 2, sz, sz);
      }
      if (State.world.portal.active) {
        let p = State.world.portal;
        p.pulse += 0.1;
        let sz = 40 + Math.sin(p.pulse) * 5;
        ctx.fillStyle = "#000";
        ctx.strokeStyle = Config.colors.portal;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 30;
        ctx.shadowColor = Config.colors.portal;
        ctx.beginPath();
        ctx.arc(p.x, p.y, sz, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();

      Render.miniMap();
    },
    
    miniMap: () => {
      miniCtx.fillStyle = "#000";
      miniCtx.fillRect(0, 0, 140, 140);
      const s = 0.05, cx = 70, cy = 70;

      if (State.world.beacon.active) {
        let rx = (State.world.beacon.x - State.player.x) * s,
          ry = (State.world.beacon.y - State.player.y) * s;
        if (Math.abs(rx) < 70 && Math.abs(ry) < 70) {
          miniCtx.fillStyle = "#fff";
          miniCtx.fillRect(cx + rx - 3, cy + ry - 3, 6, 6);
        }
      }
      if (State.world.portal.active) {
        let rx = (State.world.portal.x - State.player.x) * s,
          ry = (State.world.portal.y - State.player.y) * s;
        if (Math.abs(rx) < 70 && Math.abs(ry) < 70) {
          miniCtx.fillStyle = "#bd00ff";
          miniCtx.beginPath();
          miniCtx.arc(cx + rx, cy + ry, 4, 0, Math.PI * 2);
          miniCtx.fill();
        }
      }
      if (State.phase === "active" || State.phase === "tutorial") {
        miniCtx.fillStyle = Config.colors.fragment;
        State.world.fragments.forEach((f) => {
          if (f.active) {
            let rx = (f.x - State.player.x) * s,
              ry = (f.y - State.player.y) * s;
            if (Math.abs(rx) < 70 && Math.abs(ry) < 70) {
              if (State.player.scanActive) miniCtx.fillRect(cx + rx, cy + ry, 2, 2);
            }
          }
        });
      }
      miniCtx.fillStyle = "#fff";
      miniCtx.beginPath();
      miniCtx.arc(cx, cy, 2, 0, Math.PI * 2);
      miniCtx.fill();
    },
};

/* =========================================
   SECTION 7: INPUT HANDLING & MAIN LOOP
   ========================================= */
window.addEventListener("keydown", (e) => {
    if (State.input.keys[e.key] !== undefined && !State.player.isTerminalOpen)
      State.input.keys[e.key] = true;
    
    // Terminal Input
    if (e.key === "Enter" && State.player.isTerminalOpen) {
      const term = document.getElementById("term-input");
      const val = term.value.trim();
      if (val) {
        Terminal.print("> " + val, "#888");
        Terminal.execute(val);
        term.value = "";
      }
      return;
    }
    
    // Toggle Terminal
    if (e.key === "Tab") {
      e.preventDefault();
      Terminal.toggle();
      return;
    }
    
    // Hotbar
    if (["1", "2", "3", "4", "5"].includes(e.key) && State.phase === "active" && !State.player.isTerminalOpen) {
      const cmd = State.hotbar[e.key];
      if (cmd) Terminal.execute(cmd);
    }
});

window.addEventListener("keyup", (e) => {
    if (State.input.keys[e.key] !== undefined)
      State.input.keys[e.key] = false;
});

// START GAME
Game.init();

function loop() {
    Game.update();
    Render.loop();
    requestAnimationFrame(loop);
}
loop();