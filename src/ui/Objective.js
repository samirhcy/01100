import { State } from '../state.js';
import { AudioSystem } from '../systems/Audio.js';
import { TerminalSystem } from './Terminal.js'; // Helper function needs to call Log

export const ObjectiveSystem = {
  wrapper: document.getElementById("objective-wrapper"),
  summary: document.getElementById("obj-summary"),
  title: document.getElementById("obj-phase-title"),
  list: document.getElementById("obj-task-list"),
  dot: document.getElementById("obj-pulse-dot"),

  currentPhaseIndex: 0,
  expanded: false,
  phases: [
    {
      name: "INITIALIZATION",
      tasks: [
        {
          id: "data",
          text: "Gather 100 Data",
          check: () => State.player.data >= 100,
        },
        {
          id: "compile",
          text: "Unlock Profiles (sys.compile)",
          check: () => State.player.combatUnlocked,
        },
        {
          id: "light",
          text: "Boost Light (sys.lumos)",
          check: () => State.player.lightLevel > 1.0,
        },
        {
          id: "def",
          text: "Add Protection (Shield/Cloak)",
          check: () => State.player.shield > 0 || State.player.cloaked,
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
        },
        {
          id: "k10",
          text: "Eliminate 10 Anomalies",
          check: () => State.game.killCount >= 10,
        },
        {
          id: "k20",
          text: "Eliminate 20 Anomalies",
          check: () => State.game.killCount >= 20,
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
        },
        {
          id: "find",
          text: "Locate Safe Haven Signal",
          check: () => State.game.safeHaven !== null,
        },
        {
          id: "esc",
          text: "Enter Beacon & Evacuate",
          check: () => State.game.safeTimer > 0,
        },
      ],
      complete: false,
    },
  ],

  init: () => {
    // Re-cache DOM elements in init to ensure they exist on load
    ObjectiveSystem.wrapper = document.getElementById("objective-wrapper");
    ObjectiveSystem.summary = document.getElementById("obj-summary");
    ObjectiveSystem.title = document.getElementById("obj-phase-title");
    ObjectiveSystem.list = document.getElementById("obj-task-list");
    ObjectiveSystem.dot = document.getElementById("obj-pulse-dot");
    
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
    void ObjectiveSystem.wrapper.offsetWidth;
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
      ObjectiveSystem.notify();
      setTimeout(() => {
        ObjectiveSystem.currentPhaseIndex++;
        if (ObjectiveSystem.currentPhaseIndex < ObjectiveSystem.phases.length) {
          TerminalSystem.log(
            `NEW OBJECTIVE: ${ObjectiveSystem.phases[ObjectiveSystem.currentPhaseIndex].name}`
          );
          ObjectiveSystem.render();
        }
      }, 1500);
    }
  },

  render: () => {
    if (ObjectiveSystem.currentPhaseIndex >= ObjectiveSystem.phases.length) {
      ObjectiveSystem.summary.innerText = "OBJ: MISSION COMPLETE";
      ObjectiveSystem.title.innerText = "ALL SYSTEMS GO";
      ObjectiveSystem.list.innerHTML = `<div class="task-item done"><span class="task-checkbox">[x]</span><span>Await Extraction</span></div>`;
      return;
    }
    const phase = ObjectiveSystem.phases[ObjectiveSystem.currentPhaseIndex];
    ObjectiveSystem.summary.innerText = `OBJ: ${phase.name}`;
    ObjectiveSystem.title.innerText = `PHASE ${ObjectiveSystem.currentPhaseIndex + 1}: ${phase.name}`;
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
  },
};