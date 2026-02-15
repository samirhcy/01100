import { State } from '../state.js';
import { Config } from '../config.js';
import { AudioSystem } from './Audio.js';
import { TerminalSystem } from '../ui/Terminal.js';
import { UISystem } from '../ui/HUD.js';
import { ObjectiveSystem } from '../ui/Objective.js';

// We need a way to trigger profile toggles and projectiles.
// I'll define the specific logic here to avoid circular dependency on GameLogic.
// This is functionally identical to your original code.

export const InputSystem = {
  init: () => {
    window.addEventListener("resize", () => {
      const cvs = document.getElementById("gameCanvas");
      if(cvs) {
          cvs.width = window.innerWidth;
          cvs.height = window.innerHeight;
      }
    });

    window.addEventListener("keydown", (e) => {
      AudioSystem.init();

      if (e.key === "Escape") {
        UISystem.toggleMenu();
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
        ["w", "a", "s", "d"].includes(e.key.toLowerCase()) &&
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
        State.input.keys[e.key] !== undefined &&
        !State.player.isTerminalOpen
      )
        State.input.keys[e.key] = true;

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
      if (State.input.keys[e.key] !== undefined)
        State.input.keys[e.key] = false;
    });

    window.addEventListener("mousedown", (e) => {
      AudioSystem.init();
      if (
        State.player.mode === "combat" &&
        !State.player.isDead &&
        State.player.combatUnlocked &&
        !State.game.paused
      )
        spawnPlayerProjectile(e.clientX, e.clientY);
    });
  },
};

// --- HELPER FUNCTIONS (Moved from GameLogic to keep Input self-contained) ---

function toggleProfile() {
    if (State.player.isTerminalOpen) return;
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

function spawnPlayerProjectile(mouseX, mouseY) {
    if (Number(State.player.data) >= Config.combat.bulletCost) {
      State.player.data -= Config.combat.bulletCost;
      const rect = document.getElementById("gameCanvas").getBoundingClientRect();
      const angle = Math.atan2(
        mouseY - rect.top - window.innerHeight / 2,
        mouseX - rect.left - window.innerWidth / 2
      );
      State.world.projectiles.push({
        x: State.player.x,
        y: State.player.y,
        vx: Math.cos(angle) * Config.combat.bulletSpeed,
        vy: Math.sin(angle) * Config.combat.bulletSpeed,
        type: "player",
        life: 100,
      });
    } else TerminalSystem.log("ERR: NO DATA", "error");
}