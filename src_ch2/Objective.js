import { State } from './state.js';
import { AudioSystem } from '../src/systems/Audio.js';
import { TerminalSystem } from './Terminal.js'; 
import { SaveSystem } from '../src/systems/Save.js';

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
      name: "THE UNKNOWN",
      tasks: [
        { id: "explore", text: "Explore the area.", check: () => State.player.y < -800, done: false },
        { id: "detect", text: "Follow the anomaly signature.", check: () => State.ch2.relics.length > 0 && State.ch2.relics[0].circleVisible, done: false }
      ],
      complete: false,
    },
    {
      name: "DECRYPTION",
      tasks: [
        { id: "chip", text: "Retrieve Lens & Relic Data.", check: () => State.ch2.hasAetherLens && State.ch2.inventory.length > 0, done: false },
        { id: "fragments", text: "Collect 200 Data Fragments.", check: () => State.player.data >= 200, done: false },
        { id: "decrypt", text: "Decrypt data via Main Terminal.", check: () => State.ch2.firstRelicDecrypted, done: false }
      ],
      complete: false,
    },
    {
      name: "THE NETWORK",
      tasks: [
        { id: "gather", text: "Locate the remaining 14 Relics.", check: () => State.ch2.inventory.length >= 15, done: false }
      ],
      complete: false,
    }
  ],

  init: () => {
    ObjectiveSystem.wrapper = document.getElementById("objective-wrapper");
    ObjectiveSystem.summary = document.getElementById("obj-summary");
    ObjectiveSystem.title = document.getElementById("obj-phase-title");
    ObjectiveSystem.list = document.getElementById("obj-task-list");
    ObjectiveSystem.dot = document.getElementById("obj-pulse-dot");
    ObjectiveSystem.render();
  },

  toggle: () => {
    ObjectiveSystem.expanded = !ObjectiveSystem.expanded;
    if(AudioSystem && AudioSystem.playSFX) AudioSystem.playSFX("obj_toggle");
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
    if(AudioSystem && AudioSystem.playSFX) AudioSystem.playSFX("obj_update");
    ObjectiveSystem.wrapper.classList.remove("pulse-anim");
    void ObjectiveSystem.wrapper.offsetWidth; 
    ObjectiveSystem.wrapper.classList.add("pulse-anim");
    ObjectiveSystem.dot.classList.add("active");
  },

  update: () => {
    if (ObjectiveSystem.currentPhaseIndex >= ObjectiveSystem.phases.length) return;
    
    const phase = ObjectiveSystem.phases[ObjectiveSystem.currentPhaseIndex];
    let allDone = true;
    let changed = false;

    phase.tasks.forEach((t) => {
      if (!t.done) {
        if (t.check()) { t.done = true; changed = true; ObjectiveSystem.notify(); } 
        else { allDone = false; }
      }
    });

    if (changed) ObjectiveSystem.render();

    if (allDone && !phase.complete) {
      phase.complete = true;
      TerminalSystem.log(`PHASE COMPLETE: ${phase.name}`, "safe");
      SaveSystem.save(); 
      ObjectiveSystem.notify();
      
      setTimeout(() => {
        ObjectiveSystem.currentPhaseIndex++;
        if (ObjectiveSystem.currentPhaseIndex < ObjectiveSystem.phases.length) {
          TerminalSystem.log(`NEW OBJECTIVE: ${ObjectiveSystem.phases[ObjectiveSystem.currentPhaseIndex].name}`);
          ObjectiveSystem.render();
          SaveSystem.save(); 
        }
      }, 1500);
    }
  },

  render: () => {
    if (ObjectiveSystem.currentPhaseIndex >= ObjectiveSystem.phases.length) {
      if(ObjectiveSystem.summary) ObjectiveSystem.summary.innerText = "OBJ: MISSION COMPLETE";
      if(ObjectiveSystem.title) ObjectiveSystem.title.innerText = "ALL SYSTEMS GO";
      if(ObjectiveSystem.list) ObjectiveSystem.list.innerHTML = `<div class="task-item done"><span class="task-checkbox">[x]</span><span>Await Extraction</span></div>`;
      return;
    }
    const phase = ObjectiveSystem.phases[ObjectiveSystem.currentPhaseIndex];
    if(ObjectiveSystem.summary) ObjectiveSystem.summary.innerText = `OBJ: ${phase.name}`;
    if(ObjectiveSystem.title) ObjectiveSystem.title.innerText = `PHASE ${ObjectiveSystem.currentPhaseIndex + 1}: ${phase.name}`;
    if(ObjectiveSystem.list) {
        ObjectiveSystem.list.innerHTML = phase.tasks.map(t => `
            <div class="task-item ${t.done ? "done" : ""}">
                <span class="task-checkbox">[${t.done ? "x" : " "}]</span>
                <span>${t.text}</span>
            </div>
        `).join("");
    }
  }
};