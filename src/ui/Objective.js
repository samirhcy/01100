import { State } from '../state.js';
import { AudioSystem } from '../systems/Audio.js';
import { TerminalSystem } from './Terminal.js'; 
import { SaveSystem } from '../systems/Save.js'; // <--- ADDED: Needed for Checkpoints

export const ObjectiveSystem = {
  wrapper: document.getElementById("objective-wrapper"),
  summary: document.getElementById("obj-summary"),
  title: document.getElementById("obj-phase-title"),
  list: document.getElementById("obj-task-list"),
  dot: document.getElementById("obj-pulse-dot"),

  currentPhaseIndex: 0,
  expanded: false,
  
  // YOUR ORIGINAL PHASES & TASKS
  phases: [
    {
      name: "INITIALIZATION",
      tasks: [
        {
          id: "data",
          text: "Gather 100 Data",
          check: () => State.player.data >= 100,
          done: false
        },
        {
          id: "compile",
          text: "Unlock Profiles (sys.compile)",
          check: () => State.player.combatUnlocked,
          done: false
        },
        {
          id: "light",
          text: "Boost Light (sys.lumos)",
          check: () => State.player.lightLevel > 1.0,
          done: false
        },
        {
          id: "def",
          text: "Add Protection (Shield/Cloak)",
          check: () => State.player.shield > 0 || State.player.cloaked,
          done: false
        },
      ],
      complete: false,
    },
    {
      name: "EXTERMINATION",
      tasks: [
        {
          id: "k5",
          text: "Eliminate 5 Anomalies",
          check: () => State.game.killCount >= 5,
          done: false
        },
        {
          id: "k10",
          text: "Eliminate 10 Anomalies",
          check: () => State.game.killCount >= 10,
          done: false
        },
        {
          id: "k20",
          text: "Eliminate 20 Anomalies",
          check: () => State.game.killCount >= 20,
          done: false
        },
      ],
      complete: false,
    },
    {
      name: "SURVIVAL",
      tasks: [
        {
          id: "dist",
          text: "Maintain Distance from Hostiles",
          check: () => State.game.survivalTimer > 600,
          done: false
        },
        {
          id: "find",
          text: "Locate Safe Haven Signal",
          check: () => State.game.safeHaven !== null,
          done: false
        },
        {
          id: "esc",
          text: "Enter Beacon & Evacuate",
          check: () => State.game.safeTimer > 0,
          done: false
        },
      ],
      complete: false,
    },
  ],

  init: () => {
    // Re-cache DOM elements
    ObjectiveSystem.wrapper = document.getElementById("objective-wrapper");
    ObjectiveSystem.summary = document.getElementById("obj-summary");
    ObjectiveSystem.title = document.getElementById("obj-phase-title");
    ObjectiveSystem.list = document.getElementById("obj-task-list");
    ObjectiveSystem.dot = document.getElementById("obj-pulse-dot");
    
    // Restore Phase Index based on state if loading save
    if (State.game.killCount >= 20) ObjectiveSystem.currentPhaseIndex = 2;
    else if (State.player.combatUnlocked) ObjectiveSystem.currentPhaseIndex = 0; // Or 1 depending on logic
    // (Note: The SaveSystem.load usually handles setting the index, but this is a backup)

    ObjectiveSystem.render();
  },

  toggle: () => {
    ObjectiveSystem.expanded = !ObjectiveSystem.expanded;
    AudioSystem.playSFX("obj_toggle");
    if (ObjectiveSystem.expanded) {
      ObjectiveSystem.wrapper.classList.add("expanded");
      ObjectiveSystem.dot.classList.add("active");
    } else {
      ObjectiveSystem.wrapper.classList.remove("expanded");
      ObjectiveSystem.dot.classList.remove("active");
    }
  },

  collapse: () => {
    if (ObjectiveSystem.expanded) {
      ObjectiveSystem.expanded = false;
      ObjectiveSystem.wrapper.classList.remove("expanded");
      ObjectiveSystem.dot.classList.remove("active");
    }
  },

  notify: () => {
    AudioSystem.playSFX("obj_update");
    ObjectiveSystem.wrapper.classList.remove("pulse-anim");
    void ObjectiveSystem.wrapper.offsetWidth; // Trigger reflow
    ObjectiveSystem.wrapper.classList.add("pulse-anim");
    ObjectiveSystem.dot.classList.add("active");
  },

  update: () => {
    if (ObjectiveSystem.currentPhaseIndex >= ObjectiveSystem.phases.length)
      return;
    
    const phase = ObjectiveSystem.phases[ObjectiveSystem.currentPhaseIndex];
    let allDone = true;
    let changed = false;

    phase.tasks.forEach((t) => {
      if (!t.done) {
        if (t.check()) {
          t.done = true;
          changed = true;
          ObjectiveSystem.notify();
        } else {
          allDone = false;
        }
      }
    });

    if (changed) ObjectiveSystem.render();

    if (allDone && !phase.complete) {
      phase.complete = true;
      TerminalSystem.log(`PHASE COMPLETE: ${phase.name}`, "safe");
      
      // --- NEW: CHECKPOINT SAVE ---
      // This is the missing piece! Auto-save when a phase is fully complete.
      SaveSystem.save(); 
      // ----------------------------

      ObjectiveSystem.notify();
      
      setTimeout(() => {
        ObjectiveSystem.currentPhaseIndex++;
        if (ObjectiveSystem.currentPhaseIndex < ObjectiveSystem.phases.length) {
          TerminalSystem.log(
            `NEW OBJECTIVE: ${ObjectiveSystem.phases[ObjectiveSystem.currentPhaseIndex].name}`
          );
          ObjectiveSystem.render();
          
          // Optional: Save again at start of new phase so index is stored correctly
          SaveSystem.save(); 
        }
      }, 1500);
    }
  },

  render: () => {
    // End Game State
    if (ObjectiveSystem.currentPhaseIndex >= ObjectiveSystem.phases.length) {
      if(ObjectiveSystem.summary) ObjectiveSystem.summary.innerText = "OBJ: MISSION COMPLETE";
      if(ObjectiveSystem.title) ObjectiveSystem.title.innerText = "ALL SYSTEMS GO";
      if(ObjectiveSystem.list) ObjectiveSystem.list.innerHTML = `<div class="task-item done"><span class="task-checkbox">[x]</span><span>Await Extraction</span></div>`;
      return;
    }

    const phase = ObjectiveSystem.phases[ObjectiveSystem.currentPhaseIndex];
    
    // Safety checks for DOM elements
    if(ObjectiveSystem.summary) ObjectiveSystem.summary.innerText = `OBJ: ${phase.name}`;
    if(ObjectiveSystem.title) ObjectiveSystem.title.innerText = `PHASE ${ObjectiveSystem.currentPhaseIndex + 1}: ${phase.name}`;
    
    if(ObjectiveSystem.list) {
        ObjectiveSystem.list.innerHTML = phase.tasks
          .map(
            (t) => `
              <div class="task-item ${t.done ? "done" : ""}">
                  <span class="task-checkbox">[${t.done ? "x" : " "}]</span>
                  <span>${t.text}</span>
              </div>
          `
          )
          .join("");
    }
  },
};