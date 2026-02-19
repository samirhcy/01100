import { State } from '../state.js';
import { Config } from '../config.js';
import { AudioSystem } from './Audio.js';
import { TerminalSystem } from '../ui/Terminal.js';
import { UISystem } from '../ui/HUD.js';
import { ObjectiveSystem } from '../ui/Objective.js';

export const InputSystem = {
  btnLock: false,
  navLock: false,

  init: () => {
    window.addEventListener("resize", () => {
      const cvs = document.getElementById("gameCanvas");
      if(cvs) {
          cvs.width = window.innerWidth;
          cvs.height = window.innerHeight;
      }
    });

    window.addEventListener("keydown", (e) => {
      State.input.mode = "kbm"; 
      AudioSystem.init();

      if (e.key === "Escape") {
        UISystem.toggleMenu();
        return;
      }
      
      // Allow navigation in pause menu via keyboard arrows
      if (State.game.paused) {
          if (e.key === "ArrowUp") UISystem.navMenu(-1);
          if (e.key === "ArrowDown") UISystem.navMenu(1);
          if (e.key === "Enter") UISystem.selectMenu();
          return;
      }

      if (
        State.player.isTerminalOpen &&
        e.key !== "Tab" &&
        e.key !== "Enter"
      )
        return;

      if (e.key.toLowerCase() === "q") {
        ObjectiveSystem.toggle();
        return;
      }

      if (
        ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(e.key.toLowerCase()) &&
        ObjectiveSystem.expanded
      ) {
        ObjectiveSystem.collapse();
      }

      if (e.key === "Tab") {
        e.preventDefault();
        TerminalSystem.toggle();
        return;
      }

      if (e.key.toLowerCase() === "x") {
        if (State.player.combatUnlocked) toggleProfile();
        else TerminalSystem.log("ERR: COMBAT MODULE MISSING", "error");
      }

      if (
        (State.input.keys[e.key] !== undefined || ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) &&
        !State.player.isTerminalOpen
      ) {
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
      State.input.mode = "kbm";
      if (!State.game.paused) {
         const rect = document.getElementById("gameCanvas").getBoundingClientRect();
         const cx = rect.left + window.innerWidth / 2;
         const cy = rect.top + window.innerHeight / 2;
         State.player.angle = Math.atan2(e.clientY - cy, e.clientX - cx);
      }
    });

    window.addEventListener("mousedown", (e) => {
      State.input.mode = "kbm";
      AudioSystem.init();
      if (
        State.player.mode === "combat" &&
        !State.player.isDead &&
        State.player.combatUnlocked &&
        !State.game.paused
      ) {
        const rect = document.getElementById("gameCanvas").getBoundingClientRect();
        State.player.angle = Math.atan2(
          e.clientY - rect.top - window.innerHeight / 2,
          e.clientX - rect.left - window.innerWidth / 2
        );
        spawnPlayerProjectile(2.0); // Mouse click fires at 100% intensity
      }
    });

    window.addEventListener("gamepadconnected", (e) => {
      State.input.gamepadIndex = e.gamepad.index;
      TerminalSystem.log("GAMEPAD DETECTED", "safe");
    });
    window.addEventListener("gamepaddisconnected", () => {
      State.input.gamepadIndex = null;
      State.input.mode = "kbm";
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

    // A. Movement (Left Stick)
    let lx = gp.axes[0];
    let ly = gp.axes[1];
    if (Math.abs(lx) > DZ || Math.abs(ly) > DZ) gpActive = true;
    else { lx = 0; ly = 0; }

    // B. Aiming & Dynamic Shooting (Right Stick)
    let rx = gp.axes[2];
    let ry = gp.axes[3];
    let aimMag = Math.sqrt(rx*rx + ry*ry); // Calculate stick tilt intensity

    if (aimMag > DZ) {
      gpActive = true;
      State.player.angle = Math.atan2(ry, rx);
    }

    for (let i = 0; i < gp.buttons.length; i++) {
        if (gp.buttons[i].pressed) gpActive = true;
    }

    if (gpActive) State.input.mode = "gamepad";
    if (State.input.mode !== "gamepad") return;

    // --- 1. PAUSE MENU INTERCEPTION ---
    if (State.game.paused) {
        if (gp.buttons[12]?.pressed && !InputSystem.navLock) { UISystem.navMenu(-1); InputSystem.navLock = true; } // D-Up
        if (gp.buttons[13]?.pressed && !InputSystem.navLock) { UISystem.navMenu(1); InputSystem.navLock = true; }  // D-Down
        if (gp.buttons[0]?.pressed && !InputSystem.navLock) { UISystem.selectMenu(); InputSystem.navLock = true; } // A / Cross
        if ((gp.buttons[1]?.pressed || gp.buttons[9]?.pressed) && !InputSystem.btnLock) { 
            UISystem.toggleMenu(); 
            InputSystem.btnLock = true; 
        } // B or Start to Unpause

        // Reset Locks in Pause
        if (!gp.buttons[12]?.pressed && !gp.buttons[13]?.pressed && !gp.buttons[0]?.pressed) InputSystem.navLock = false;
        if (!gp.buttons[1]?.pressed && !gp.buttons[9]?.pressed) InputSystem.btnLock = false;
        return; // STOP processing other inputs while paused
    }

    State.input.moveVector = { x: lx, y: ly };

    // --- 2. GAMEPLAY LOGIC ---
    // Auto-shoot based on Right Stick (Twin-Stick style). Fires if pushed past 30%.
    if (aimMag > 0.3 && State.player.mode === "combat" && !State.player.isDead && State.player.combatUnlocked) {
        spawnPlayerProjectile(aimMag); // Pass the magnitude to scale fire rate
    }

    // Manual Shoot (R1/RB or R2/RT) - Counts as full 100% intensity
    if ((gp.buttons[5]?.pressed || gp.buttons[7]?.pressed)) {
      if (State.player.mode === "combat" && !State.player.isDead && State.player.combatUnlocked) {
          spawnPlayerProjectile(1.0); 
      }
    }

    // Pause (Options/Start)
    if (gp.buttons[9]?.pressed && !InputSystem.btnLock) {
        UISystem.toggleMenu();
        InputSystem.btnLock = true;
    }

    // Toggle Profile (Circle/B)
    if (gp.buttons[1]?.pressed && !InputSystem.btnLock) {
        if (State.player.combatUnlocked) toggleProfile();
        else TerminalSystem.log("ERR: COMBAT MODULE MISSING", "error");
        InputSystem.btnLock = true;
    }

    // Toggle Terminal (Triangle/Y)
    if (gp.buttons[3]?.pressed && !InputSystem.btnLock) {
        TerminalSystem.toggle();
        InputSystem.btnLock = true;
    }

    // Toggle Objective (Square/X)
    if (gp.buttons[2]?.pressed && !InputSystem.btnLock) {
        ObjectiveSystem.toggle();
        InputSystem.btnLock = true;
    }

    // --- 3. D-PAD MULTI-FUNCTION LOGIC ---
    if (State.player.isTerminalOpen) {
        // Mode A: Terminal Navigation
        if (gp.buttons[12]?.pressed && !InputSystem.navLock) {
            if(TerminalSystem.cycleControllerCommand) TerminalSystem.cycleControllerCommand(-1);
            InputSystem.navLock = true;
        }
        if (gp.buttons[13]?.pressed && !InputSystem.navLock) {
            if(TerminalSystem.cycleControllerCommand) TerminalSystem.cycleControllerCommand(1);
            InputSystem.navLock = true;
        }
        if (gp.buttons[0]?.pressed && !InputSystem.navLock) {
            const val = document.getElementById("term-input").value.trim();
            if (val) {
                TerminalSystem.print("> " + val, "#888", "cmd");
                TerminalSystem.execute(val);
                document.getElementById("term-input").value = "";
            }
            InputSystem.navLock = true;
        }
    } else {
        // Mode B: Hotbar Execution (Up=1, Right=2, Down=3, Left=4)
        if (gp.buttons[12]?.pressed && !InputSystem.navLock) { triggerHotbar(1); InputSystem.navLock = true; } // D-Up
        if (gp.buttons[15]?.pressed && !InputSystem.navLock) { triggerHotbar(2); InputSystem.navLock = true; } // D-Right
        if (gp.buttons[13]?.pressed && !InputSystem.navLock) { triggerHotbar(3); InputSystem.navLock = true; } // D-Down
        if (gp.buttons[14]?.pressed && !InputSystem.navLock) { triggerHotbar(4); InputSystem.navLock = true; } // D-Left
    }

    // Reset Gameplay Locks
    if (!gp.buttons[3]?.pressed && !gp.buttons[2]?.pressed && !gp.buttons[1]?.pressed && !gp.buttons[9]?.pressed) InputSystem.btnLock = false;
    if (!gp.buttons[12]?.pressed && !gp.buttons[13]?.pressed && !gp.buttons[14]?.pressed && !gp.buttons[15]?.pressed && !gp.buttons[0]?.pressed) InputSystem.navLock = false;
  }
};

// --- HELPER FUNCTIONS ---

function toggleProfile() {
    if (State.player.isTerminalOpen) return;
    AudioSystem.playSFX("profile_switch");
    if (State.player.mode === "roam") {
      State.player.mode = "combat";
      document.body.className = "mode-combat";
      document.getElementById("profile-indicator").innerText =
        "PROFILE: ATTACK/DEFENSE";
      TerminalSystem.log("COMBAT PROFILE ENGAGED");
    } else {
      State.player.mode = "roam";
      document.body.className = "mode-roam";
      document.getElementById("profile-indicator").innerText =
        "PROFILE: ROAMING";
      TerminalSystem.log("ROAMING PROFILE");
    }
}

function triggerHotbar(slotIndex) {
    if (State.hotbar[slotIndex]) {
        TerminalSystem.execute(State.hotbar[slotIndex]);
    }
}

// Global cooldown tracker
let lastShotTime = 0;

function spawnPlayerProjectile(intensity = 1.0) {
    const now = Date.now();
    
    // Dynamic Cooldown Math:
    // Base is 350ms. Upgrades lower the base.
    // Dividing by 'intensity' (0.3 to 1.0) means lighter pushes create longer cooldowns.
    let baseCooldown = 250 - (State.player.stats.fireRateLevel * 40);
    let dynamicCooldown = baseCooldown / intensity;
    
    // Hard cap so we don't crash the canvas with projectiles
    if (dynamicCooldown < 100) dynamicCooldown = 100;

    if (now - lastShotTime < dynamicCooldown) return; 
    lastShotTime = now;

    if (Number(State.player.data) >= Config.combat.bulletCost) {
      State.player.data -= Config.combat.bulletCost;
      AudioSystem.playSFX("player_shoot");
      State.world.projectiles.push({
        x: State.player.x,
        y: State.player.y,
        vx: Math.cos(State.player.angle) * Config.combat.bulletSpeed,
        vy: Math.sin(State.player.angle) * Config.combat.bulletSpeed,
        type: "player",
        life: 100,
      });
    } else {
       // Only log out of data error sparingly to avoid spamming the log
       if (Math.random() < 0.1) TerminalSystem.log("ERR: NO DATA FOR WEAPON", "error");
    }
}