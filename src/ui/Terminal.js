import { State } from '../state.js';
import { Config } from '../config.js';
import { CommandBank } from '../commands.js';
import { AudioSystem } from '../systems/Audio.js';
import { WorldEntity } from '../entities/World.js';
import { ObjectiveSystem } from './Objective.js';
import { Utils } from '../utils.js';

export const TerminalSystem = {
  init: () => {
    TerminalSystem.updateHotbar();
    TerminalSystem.print("SYSTEM: NULL SECTOR", "#fff");
    TerminalSystem.print("Type /help for commands.", "#888");

    setTimeout(() => TerminalSystem.log('Use "WASD" Keys for movement'), 500);
    setTimeout(() => TerminalSystem.log('Press "Tab" key to open Terminal'), 1500);
    setTimeout(() => TerminalSystem.log('Press "Q" to view Objective'), 2500);
  },

  toggle: () => {
    State.player.isTerminalOpen = !State.player.isTerminalOpen;
    document.getElementById("terminal-wrapper").classList.toggle("open");
    if (State.player.isTerminalOpen) {
      AudioSystem.playSFX("term_open");
      setTimeout(() => document.getElementById("term-input").focus(), 50);
      ObjectiveSystem.collapse();
    } else {
      AudioSystem.playSFX("term_close");
      document.getElementById("term-input").blur();
    }
  },

  updateHotbar: () => {
    for (let i = 1; i <= 5; i++)
      document.getElementById(`slot-${i}`).innerText = State.hotbar[i] || "";
  },

  print: (msg, color, type = "msg") => {
    const d = document.createElement("div");
    d.className = `term-${type}`;
    d.style.color = color;
    d.innerText = msg;
    const out = document.getElementById("term-output");
    out.appendChild(d);
    out.scrollTop = out.scrollHeight;
  },

  log: (msg, type = "new") => {
    AudioSystem.playSFX("log");
    const l = document.getElementById("system-log");
    const d = document.createElement("div");
    d.className = `log-entry ${type}`;
    d.innerText = "> " + msg;
    l.appendChild(d);
    if (l.children.length > 6) l.removeChild(l.firstChild);
    setTimeout(() => d.classList.remove(type), 3000);
  },

  execute: (raw) => {
    const parts = raw.split(" ");
    const cmdKey = parts[0];
    const args = parts.slice(1);

    if (cmdKey === "/help") {
      TerminalSystem.print("--- SYSTEM COMMANDS ---", "#fff");
      for (const [key, val] of Object.entries(CommandBank)) {
        if (
          !val.req ||
          (val.req === "combat" && State.player.combatUnlocked) ||
          (val.req === "light_2" && State.player.lightLevel > 1.3)
        ) {
          TerminalSystem.print(`${key} [${val.desc}] - ${val.cost} MB`, "#ccc");
        }
      }
      TerminalSystem.print("--- UTILITY ---", "#fff");
      TerminalSystem.print("/bind [key] [cmd] (Assign to Hotbar)", "#888");
      TerminalSystem.print("/cls (Clear Screen)", "#888");
      return;
    }
    if (cmdKey === "/cls") {
      document.getElementById("term-output").innerHTML = "";
      TerminalSystem.print("SYSTEM: CLEARED", "#fff");
      return;
    }
    if (cmdKey === "/bind") {
      const key = args[0];
      const commandToBind = args[1];
      if (["1", "2", "3", "4", "5"].includes(key)) {
        if (CommandBank[commandToBind]) {
          State.hotbar[key] = commandToBind;
          TerminalSystem.updateHotbar();
          TerminalSystem.print(`SUCCESS: Bound ${commandToBind} to [${key}]`, "#00ffaa");
        } else {
          TerminalSystem.print(`ERR: Command '${commandToBind}' not found`, "#ff3333");
        }
      } else TerminalSystem.print("ERR: Invalid Key (Use 1-5)", "#ff3333");
      return;
    }

    const cmdData = CommandBank[cmdKey];
    if (!cmdData) {
      TerminalSystem.print(`ERR: UNKNOWN COMMAND '${cmdKey}'`, "#ff3333");
      return;
    }
    if (cmdData.req === "combat" && !State.player.combatUnlocked)
      return TerminalSystem.print("ERR: COMBAT MODULE NOT FOUND", "#ff3333");
    if (cmdData.req === "light_2" && State.player.lightLevel < 1.3)
      return TerminalSystem.print("ERR: LIGHT LEVEL TOO LOW", "#ff3333");
    if (State.player.data < cmdData.cost)
      return TerminalSystem.print(`ERR: NEED ${cmdData.cost} MB DATA`, "#ff3333");

    if (cmdData.limit) {
      if (cmdKey === "sys.speed" && State.player.stats.speedLevel >= cmdData.limit)
        return TerminalSystem.print("ERR: MAX SPEED REACHED", "#ff3333");
      if (cmdKey === "sys.fire" && State.player.stats.fireRateLevel >= cmdData.limit)
        return TerminalSystem.print("ERR: MAX FIRE RATE REACHED", "#ff3333");
      if (cmdKey === "sys.protect" && State.player.shield > 0)
        return TerminalSystem.print("ERR: SHIELD ALREADY ACTIVE", "#ff3333");
    }

    State.player.data -= cmdData.cost;
    TerminalSystem.print(`EXEC: ${cmdKey}... OK`, "#00ffaa");
    AudioSystem.playSFX("term_success");

    switch (cmdData.action) {
      case "scan":
        State.player.scanActive = true;
        State.player.scanTimer = 600;
        TerminalSystem.log("SCAN COMPLETE");
        break;
      case "light":
        if (State.player.lightLevel < Config.maxLightLevel) {
          State.player.lightLevel += 0.2;
          TerminalSystem.log("LIGHT UPGRADED");
        } else TerminalSystem.print("ERR: MAX LIGHT", "#f33");
        break;
      case "combat":
        if (!State.player.combatUnlocked) {
          State.player.combatUnlocked = true;
          TerminalSystem.log("COMBAT UNLOCKED");
          // Calls the local helper function instead of GameLogic
          setTimeout(triggerCombatEvent, 1000);
        } else TerminalSystem.print("ERR: ALREADY ACTIVE", "#f33");
        break;
      case "cloak":
        State.player.cloaked = true;
        State.player.cloakTimer = 300;
        TerminalSystem.log("CLOAK ENGAGED");
        break;
      case "heal":
        State.player.health = Math.min(100, State.player.health + 50);
        TerminalSystem.log("HULL REPAIRED");
        break;
      case "speed":
        State.player.stats.speedLevel++;
        Config.player.maxSpeed += 1;
        Config.player.accel += 0.05;
        TerminalSystem.log("VELOCITY INCREASED");
        break;
      case "firerate":
        State.player.stats.fireRateLevel++;
        TerminalSystem.log("WEAPON OVERCLOCKED");
        break;
      case "shield":
        State.player.shield = 50;
        TerminalSystem.log("SHIELD GENERATED");
        break;
      case "unbind":
        if (args[0] && State.hotbar[args[0]]) {
          State.hotbar[args[0]] = null;
          TerminalSystem.updateHotbar();
          TerminalSystem.print(`UNBOUND KEY [${args[0]}]`, "#0ff");
        }
        break;
    }
  },
};

// --- HELPER: Trigger Combat (Originally in GameLogic) ---
function triggerCombatEvent() {
  TerminalSystem.print("WARNING: ARCHITECTURE RE-WRITTEN", "#ff3333");
  TerminalSystem.print(">> HOSTILES DETECTED", "#ff3333");
  document.getElementById("profile-indicator").classList.remove("hidden");
  TerminalSystem.log("PRESS 'X' FOR COMBAT MODE");
  
  State.world.visitedChunks.forEach((key) => {
    const [cx, cy] = key.split(",").map(Number);
    const sx = cx * Config.chunkSize;
    const sy = cy * Config.chunkSize;
    for (let i = 0; i < 8; i++) WorldEntity.spawnInChunk(sx, sy, "wall");
  });
  
  for (let i = 0; i < 4; i++) WorldEntity.spawnEnemyRing();
}