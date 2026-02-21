import { State } from './state.js';
import { Config } from '../src/config.js';
import { AudioSystem } from '../src/systems/Audio.js';
import { TerminalSystem } from './Terminal.js';
import { UISystem } from './HUD.js';
import { ObjectiveSystem } from './Objective.js';

const isPressed = (gp, btn) => gp.buttons[btn] && gp.buttons[btn].pressed;

function switchInputMode(newMode) {
    if (State.input.mode !== newMode) {
        State.input.mode = newMode;
        InputSystem.btnLock = false;
        InputSystem.navLock = false; 
        if (AudioSystem && AudioSystem.playSFX) AudioSystem.playSFX("input_switch");
    }
}

export const InputSystem = {
  btnLock: false,
  navLock: false,

  init: () => {
    window.addEventListener("resize", () => {
      const cvs = document.getElementById("gameCanvas");
      if(cvs) { cvs.width = window.innerWidth; cvs.height = window.innerHeight; }
    });

    window.addEventListener("keydown", (e) => {
      switchInputMode("kbm");
      if (AudioSystem && AudioSystem.init) AudioSystem.init();

      if (e.key === "Escape") { UISystem.toggleMenu(); return; }
      
      if (State.game.paused) {
          if (e.key === "ArrowUp") UISystem.navMenu(-1);
          if (e.key === "ArrowDown") UISystem.navMenu(1);
          if (e.key === "Enter") UISystem.selectMenu();
          return;
      }

      if (State.player.isTerminalOpen && e.key !== "Tab" && e.key !== "Enter") return;
      if (e.key.toLowerCase() === "q") { ObjectiveSystem.toggle(); return; }

      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(e.key.toLowerCase()) && ObjectiveSystem.expanded) {
        ObjectiveSystem.collapse();
      }

      if (e.key.toLowerCase() === "e" && State.ch2 && State.ch2.hasAetherLens && !State.player.isTerminalOpen) {
          window.AetherLens.toggleFullscreen();
          return;
      }

      if (e.key === "Tab") { e.preventDefault(); TerminalSystem.toggle(); return; }

      if (e.key.toLowerCase() === "x") {
        if (State.player.combatUnlocked) toggleProfile();
        else TerminalSystem.log("ERR: COMBAT MODULE MISSING", "error");
      }

      if ((State.input.keys[e.key] !== undefined || ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) && !State.player.isTerminalOpen) {
        State.input.keys[e.key] = true;
      }

      if (["1", "2", "3", "4", "5"].includes(e.key) && State.hotbar[e.key])
        TerminalSystem.execute(State.hotbar[e.key]);

      if (e.key === "Enter" && State.player.isTerminalOpen) {
        const val = document.getElementById("term-input").value.trim();
        if (val) {
          TerminalSystem.print("> " + val, "#888", "cmd");
          TerminalSystem.execute(val);
          document.getElementById("term-input").value = "";
        }
      }
    });

    window.addEventListener("keyup", (e) => {
      if (State.input.keys[e.key] !== undefined || ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key))
        State.input.keys[e.key] = false;
    });

    window.addEventListener("mousemove", (e) => {
      switchInputMode("kbm");
      if (!State.game.paused) {
         const rect = document.getElementById("gameCanvas").getBoundingClientRect();
         State.player.angle = Math.atan2(e.clientY - (rect.top + window.innerHeight / 2), e.clientX - (rect.left + window.innerWidth / 2));
      }
    });

    window.addEventListener("mousedown", (e) => {
      switchInputMode("kbm");
      if (AudioSystem && AudioSystem.init) AudioSystem.init();
      if (State.player.mode === "combat" && !State.player.isDead && State.player.combatUnlocked && !State.game.paused) {
        const rect = document.getElementById("gameCanvas").getBoundingClientRect();
        State.player.angle = Math.atan2(e.clientY - (rect.top + window.innerHeight / 2), e.clientX - (rect.left + window.innerWidth / 2));
        spawnPlayerProjectile(1.0); 
      }
    });

    window.addEventListener("gamepadconnected", (e) => {
      State.input.gamepadIndex = e.gamepad.index;
      TerminalSystem.log("GAMEPAD DETECTED", "safe");
    });
    window.addEventListener("gamepaddisconnected", () => {
      State.input.gamepadIndex = null;
      switchInputMode("kbm");
    });
  },

  update: () => {
    if (State.input.gamepadIndex !== null) {
      const gp = navigator.getGamepads()[State.input.gamepadIndex];
      if (gp) InputSystem.handleGamepad(gp);
    }

    if (State.input.mode === "kbm") {
      let dx = 0, dy = 0;
      if (State.input.keys.w || State.input.keys.ArrowUp) dy -= 1;
      if (State.input.keys.s || State.input.keys.ArrowDown) dy += 1;
      if (State.input.keys.a || State.input.keys.ArrowLeft) dx -= 1;
      if (State.input.keys.d || State.input.keys.ArrowRight) dx += 1;

      if (dx !== 0 || dy !== 0) {
        const len = Math.sqrt(dx*dx + dy*dy);
        State.input.moveVector = { x: dx/len, y: dy/len };
      } else {
        State.input.moveVector = { x: 0, y: 0 };
      }
    }
  },

  handleGamepad: (gp) => {
    const DZ = 0.15; 
    let gpActive = false;

    let lx = gp.axes[0], ly = gp.axes[1];
    if (Math.abs(lx) > DZ || Math.abs(ly) > DZ) gpActive = true; else { lx = 0; ly = 0; }

    let rx = gp.axes[2], ry = gp.axes[3];
    let aimMag = Math.sqrt(rx*rx + ry*ry); 

    if (aimMag > DZ) {
      gpActive = true;
      State.player.angle = Math.atan2(ry, rx);
    }

    for (let i = 0; i < gp.buttons.length; i++) {
        if (gp.buttons[i].pressed) gpActive = true;
    }

    if (gpActive) switchInputMode("gamepad");
    if (State.input.mode !== "gamepad") return;

    if (State.game.paused) {
        if (isPressed(gp, 12) && !InputSystem.navLock) { UISystem.navMenu(-1); InputSystem.navLock = true; } 
        if (isPressed(gp, 13) && !InputSystem.navLock) { UISystem.navMenu(1); InputSystem.navLock = true; }  
        if (isPressed(gp, 0) && !InputSystem.navLock) { UISystem.selectMenu(); InputSystem.navLock = true; } 
        if ((isPressed(gp, 1) || isPressed(gp, 9)) && !InputSystem.btnLock) { UISystem.toggleMenu(); InputSystem.btnLock = true; } 

        if (!isPressed(gp, 12) && !isPressed(gp, 13) && !isPressed(gp, 0)) InputSystem.navLock = false;
        if (!isPressed(gp, 1) && !isPressed(gp, 9)) InputSystem.btnLock = false;
        return; 
    }

    State.input.moveVector = { x: lx, y: ly };

    if (aimMag > 0.3 && State.player.mode === "combat" && !State.player.isDead && State.player.combatUnlocked) spawnPlayerProjectile(aimMag);
    if ((isPressed(gp, 5) || isPressed(gp, 7)) && State.player.mode === "combat" && !State.player.isDead && State.player.combatUnlocked) spawnPlayerProjectile(1.0);

    if (isPressed(gp, 9) && !InputSystem.btnLock) { UISystem.toggleMenu(); InputSystem.btnLock = true; }
    if (isPressed(gp, 1) && !InputSystem.btnLock) {
        if (State.player.combatUnlocked) toggleProfile();
        else TerminalSystem.log("ERR: COMBAT MODULE MISSING", "error");
        InputSystem.btnLock = true;
    }
    if (isPressed(gp, 3) && !InputSystem.btnLock) { TerminalSystem.toggle(); InputSystem.btnLock = true; }

    if (isPressed(gp, 14) && !InputSystem.navLock) { 
        let s = parseInt(State.hotbar.activeSlot) || 1;
        State.hotbar.activeSlot = s > 1 ? s - 1 : 5;
        TerminalSystem.updateHotbar();
        InputSystem.navLock = true;
    }
    if (isPressed(gp, 15) && !InputSystem.navLock) { 
        let s = parseInt(State.hotbar.activeSlot) || 1;
        State.hotbar.activeSlot = s < 5 ? s + 1 : 1;
        TerminalSystem.updateHotbar();
        InputSystem.navLock = true;
    }

    if (State.player.isTerminalOpen) {
        if (isPressed(gp, 12) && !InputSystem.navLock) { if(TerminalSystem.cycleControllerCommand) TerminalSystem.cycleControllerCommand(-1); InputSystem.navLock = true; }
        if (isPressed(gp, 13) && !InputSystem.navLock) { if(TerminalSystem.cycleControllerCommand) TerminalSystem.cycleControllerCommand(1); InputSystem.navLock = true; }
        if (isPressed(gp, 0) && !InputSystem.navLock) { 
            const val = document.getElementById("term-input").value.trim();
            if (val) { TerminalSystem.print("> " + val, "#888", "cmd"); TerminalSystem.execute(val); }
            InputSystem.navLock = true;
        }
        if (isPressed(gp, 2) && !InputSystem.btnLock) { 
            const val = document.getElementById("term-input").value.trim();
            if (val && val !== "/help" && val !== "/cls") {
                let s = parseInt(State.hotbar.activeSlot) || 1;
                State.hotbar[s] = val;
                TerminalSystem.updateHotbar();
                TerminalSystem.print(`SUCCESS: Bound ${val} to Slot [${s}]`, "#00ffaa");
            }
            InputSystem.btnLock = true;
        }
    } else {
        // Mode B: Gameplay Execution
        if (isPressed(gp, 0) && !InputSystem.btnLock) { 
            let s = parseInt(State.hotbar.activeSlot) || 1;
            if (State.hotbar[s]) TerminalSystem.execute(State.hotbar[s]);
            InputSystem.btnLock = true;
        }
        
        if (isPressed(gp, 2) && !InputSystem.btnLock) { 
            ObjectiveSystem.toggle(); 
            InputSystem.btnLock = true; 
        }

        // D-pad UP toggles Lens in Gameplay Mode
        if (isPressed(gp, 12) && !InputSystem.btnLock) {
            if (State.ch2 && State.ch2.hasAetherLens) {
                window.AetherLens.toggleFullscreen();
                InputSystem.btnLock = true;
            }
        }
    }

    // THE FIX: Added && !isPressed(gp, 12) to the btnLock release list
    if (!isPressed(gp, 3) && !isPressed(gp, 2) && !isPressed(gp, 1) && !isPressed(gp, 9) && !isPressed(gp, 0) && !isPressed(gp, 12)) InputSystem.btnLock = false;
    if (!isPressed(gp, 12) && !isPressed(gp, 13) && !isPressed(gp, 14) && !isPressed(gp, 15) && !isPressed(gp, 0)) InputSystem.navLock = false;
  }
};

function toggleProfile() {
    if (State.player.isTerminalOpen) return;
    if (AudioSystem && AudioSystem.playSFX) AudioSystem.playSFX("profile_switch");
    if (State.player.mode === "roam") {
      State.player.mode = "combat";
      document.body.className = "mode-combat";
      document.getElementById("profile-indicator").innerText = "PROFILE: ATTACK/DEFENSE";
      TerminalSystem.log("COMBAT PROFILE ENGAGED");
    } else {
      State.player.mode = "roam";
      document.body.className = "mode-roam";
      document.getElementById("profile-indicator").innerText = "PROFILE: ROAMING";
      TerminalSystem.log("ROAMING PROFILE");
    }
}

let lastShotTime = 0;
function spawnPlayerProjectile(intensity = 1.0) {
    const now = Date.now();
    let baseCooldown = 350 - (State.player.stats.fireRateLevel * 40);
    let dynamicCooldown = Math.max(100, baseCooldown / intensity);

    if (now - lastShotTime < dynamicCooldown) return; 
    lastShotTime = now;

    if (Number(State.player.data) >= Config.combat.bulletCost) {
      State.player.data -= Config.combat.bulletCost;
      
      let finalAngle = State.player.angle;
      if (State.input.mode === "gamepad") {
          let snapThreshold = 0.6; 
          State.world.enemies.forEach(e => {
              let dist = Math.sqrt(Math.pow(e.x - State.player.x, 2) + Math.pow(e.y - State.player.y, 2));
              if (dist < 600) { 
                  let angleToEnemy = Math.atan2(e.y - State.player.y, e.x - State.player.x);
                  let diff = Math.atan2(Math.sin(angleToEnemy - finalAngle), Math.cos(angleToEnemy - finalAngle));
                  if (Math.abs(diff) < snapThreshold) {
                      finalAngle = angleToEnemy; 
                      snapThreshold = Math.abs(diff); 
                  }
              }
          });
      }
      
      State.world.projectiles.push({
        x: State.player.x,
        y: State.player.y,
        vx: Math.cos(finalAngle) * Config.combat.bulletSpeed,
        vy: Math.sin(finalAngle) * Config.combat.bulletSpeed,
        type: "player",
        life: 100,
      });
      if (AudioSystem && AudioSystem.playSFX) AudioSystem.playSFX("player_shoot");
    } else {
       if (Math.random() < 0.1) TerminalSystem.log("ERR: NO DATA FOR WEAPON", "error");
    }
}