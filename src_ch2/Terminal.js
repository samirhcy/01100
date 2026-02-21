import { State } from './state.js';
import { Config } from '../src/config.js';
import { CommandBank } from '../src/commands.js';
import { AudioSystem } from '../src/systems/Audio.js';
import { WorldEntity } from './World.js';
import { ObjectiveSystem } from './Objective.js';

export const TerminalSystem = {
  commandCycleIndex: 0,
  availableCommands: [],

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
      if (AudioSystem && AudioSystem.playSFX) AudioSystem.playSFX("term_open");
      ObjectiveSystem.collapse();

      if (State.input.mode === "gamepad") {
          TerminalSystem.print(">> GAMEPAD: D-Pad Selects. A to Run. X/Square to Bind.", "#00f3ff");
          TerminalSystem.buildControllerList();
          if(TerminalSystem.availableCommands.length > 0) {
              document.getElementById("term-input").value = TerminalSystem.availableCommands[0];
          }
      } else {
          setTimeout(() => document.getElementById("term-input").focus(), 50);
      }
    } else {
      if (AudioSystem && AudioSystem.playSFX) AudioSystem.playSFX("term_close");
      document.getElementById("term-input").blur();
    }
  },

  buildControllerList: () => {
    TerminalSystem.availableCommands = Object.keys(CommandBank).filter(key => {
        const cmd = CommandBank[key];
        if (cmd.req === "combat" && !State.player.combatUnlocked) return false;
        if (cmd.req === "light_2" && State.player.lightLevel < 1.25) return false;
        return true;
    });
    
    // THE FIX: Add Decrypt to Gamepad cycle
    if (State.ch2 && State.ch2.hasAetherLens) TerminalSystem.availableCommands.push("exe.decrypt");

    TerminalSystem.availableCommands.push("/help");
    TerminalSystem.availableCommands.push("/cls");
    TerminalSystem.commandCycleIndex = 0;
  },

  cycleControllerCommand: (dir) => {
    if (TerminalSystem.availableCommands.length === 0) TerminalSystem.buildControllerList();
    
    let idx = parseInt(TerminalSystem.commandCycleIndex) || 0;
    idx += dir;
    if (idx < 0) idx = TerminalSystem.availableCommands.length - 1;
    if (idx >= TerminalSystem.availableCommands.length) idx = 0;
    
    TerminalSystem.commandCycleIndex = idx;
    document.getElementById("term-input").value = TerminalSystem.availableCommands[idx] || "";
  },

  updateHotbar: () => {
    let activeSlot = parseInt(State.hotbar.activeSlot) || 1;
    for (let i = 1; i <= 5; i++) {
      const slotBox = document.getElementById(`slot-${i}-box`);
      const slotCmd = document.getElementById(`slot-${i}`);
      if(slotBox && slotCmd) {
          slotCmd.innerText = State.hotbar[i] || "";
          slotBox.style.borderColor = (activeSlot === i) ? "var(--primary)" : "#444";
          slotBox.style.boxShadow = (activeSlot === i) ? "0 0 10px rgba(0,243,255,0.3)" : "none";
      }
    }
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
    if (AudioSystem && AudioSystem.playSFX) AudioSystem.playSFX("log");
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
        if (!val.req || (val.req === "combat" && State.player.combatUnlocked) || (val.req === "light_2" && State.player.lightLevel > 1.25)) {
          TerminalSystem.print(`${key} [${val.desc}] - ${val.cost} MB`, "#ccc");
        }
      }
      
      // NEW: Show Ch2 specific commands
      if (State.ch2 && State.ch2.hasAetherLens) {
          TerminalSystem.print("exe.decrypt [Decrypt Lens File] - 200 MB", "#bd00ff");
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
    // --- CH2 CUSTOM COMMANDS ---
    if (cmdKey === "exe.decrypt") {
        if (!State.ch2.hasAetherLens) return TerminalSystem.print("ERR: AETHER LENS NOT FOUND", "#f33");
        
        let targetFile = (window.AetherLens && window.AetherLens.OS && window.AetherLens.OS.selectedItem) 
            ? window.AetherLens.OS.selectedItem 
            : State.ch2.inventory.find(i => i.encrypted);

        if (!targetFile) return TerminalSystem.print("ERR: NO ENCRYPTED TARGET FOUND", "#ffaa00");
        if (!targetFile.encrypted) return TerminalSystem.print("ERR: FILE ALREADY CLEARTEXT", "#00ffaa");
        if (State.player.data < 200) { TerminalSystem.log("DECRYPTION FAILED", "error"); return TerminalSystem.print("ERR: REQUIRES 200 MB DATA", "#f33"); }

        State.player.data -= 200;
        targetFile.encrypted = false;
        
        TerminalSystem.print(`DECRYPTING ${targetFile.name}... OK`, "#00ffaa");
        TerminalSystem.log("DECRYPTION SUCCESSFUL", "safe");
        if (AudioSystem && AudioSystem.playSFX) AudioSystem.playSFX("term_success");
        
        if (window.AetherLens && window.AetherLens.OS) {
            window.AetherLens.OS.renderPane2();
            window.AetherLens.OS.renderPane3();
        }

        // THE FIX: Trigger Phase 3 Spawns!
        if (!State.ch2.firstRelicDecrypted) {
            State.ch2.firstRelicDecrypted = true;
            WorldEntity.spawnRemainingRelics(); // Spawns the other 14
        }
        return;
    }
    // --- CHAPTER 2 LOCKDOWN INTERCEPT ---
    if (State.ch2 && State.ch2.commandsLocked) {
        TerminalSystem.print(`ERR: CONNECTION TO NULL FAILED.`, "#ff3333");
        TerminalSystem.print(`EXECUTION BLOCKED.`, "#ff3333");
        TerminalSystem.log("COMMAND OVERRIDE REJECTED", "error");
        return; 
    }
    // ------------------------------------

    const cmdData = CommandBank[cmdKey];
    if (!cmdData) { TerminalSystem.print(`ERR: UNKNOWN COMMAND '${cmdKey}'`, "#ff3333"); return; }
    if (cmdData.req === "combat" && !State.player.combatUnlocked) return TerminalSystem.print("ERR: COMBAT MODULE NOT FOUND", "#ff3333");
    if (cmdData.req === "light_2" && State.player.lightLevel < 1.25) return TerminalSystem.print("ERR: LIGHT LEVEL TOO LOW", "#ff3333");
    if (State.player.data < cmdData.cost) return TerminalSystem.print(`ERR: NEED ${cmdData.cost} MB DATA`, "#ff3333");

    if (cmdData.limit) {
      if (cmdKey === "sys.speed" && State.player.stats.speedLevel >= cmdData.limit) return TerminalSystem.print("ERR: MAX SPEED REACHED", "#ff3333");
      if (cmdKey === "sys.fire" && State.player.stats.fireRateLevel >= cmdData.limit) return TerminalSystem.print("ERR: MAX FIRE RATE REACHED", "#ff3333");
      if (cmdKey === "sys.protect" && State.player.shield > 0) return TerminalSystem.print("ERR: SHIELD ALREADY ACTIVE", "#ff3333");
    }

    State.player.data -= cmdData.cost;
    TerminalSystem.print(`EXEC: ${cmdKey}... OK`, "#00ffaa");
    if (AudioSystem && AudioSystem.playSFX) AudioSystem.playSFX("term_success");

    switch (cmdData.action) {
      case "scan": State.player.scanActive = true; State.player.scanTimer = 600; TerminalSystem.log("SCAN COMPLETE"); break;
      case "light": 
        if (State.player.lightLevel < Config.maxLightLevel) { State.player.lightLevel += 0.2; TerminalSystem.log("LIGHT UPGRADED"); } 
        else TerminalSystem.print("ERR: MAX LIGHT", "#f33"); 
        break;
      case "combat": 
        if (!State.player.combatUnlocked) { State.player.combatUnlocked = true; TerminalSystem.log("COMBAT UNLOCKED"); } 
        else TerminalSystem.print("ERR: ALREADY ACTIVE", "#f33"); 
        break;
      case "cloak": State.player.cloaked = true; State.player.cloakTimer = 1500; TerminalSystem.log("CLOAK ENGAGED"); break;
      case "heal": State.player.health = Math.min(100, State.player.health + 50); TerminalSystem.log("HULL REPAIRED"); break;
      case "speed": State.player.stats.speedLevel++; Config.player.maxSpeed += 1; Config.player.accel += 0.05; TerminalSystem.log("VELOCITY INCREASED"); break;
      case "firerate": State.player.stats.fireRateLevel++; TerminalSystem.log("WEAPON OVERCLOCKED"); break;
      case "shield": 
        State.player.shield = 50; 
        TerminalSystem.log("SHIELD GENERATED"); 
        if (AudioSystem && AudioSystem.playSFX) AudioSystem.playSFX("shield_up");
        break;
      case "unbind":
        if (args[0] && State.hotbar[args[0]]) { State.hotbar[args[0]] = null; TerminalSystem.updateHotbar(); TerminalSystem.print(`UNBOUND KEY [${args[0]}]`, "#0ff"); }
        break;
    }
  }
};