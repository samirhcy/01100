import { State } from '../state.js';
import { TerminalSystem } from '../ui/Terminal.js';
import { UISystem } from '../ui/HUD.js';
import { ObjectiveSystem } from '../ui/Objective.js';

export const SaveSystem = {
  save: () => {
    const saveData = {
      player: State.player,
      hotbar: State.hotbar,
      kills: State.game.killCount,
      objPhase: ObjectiveSystem.currentPhaseIndex,
    };
    localStorage.setItem("0110_save_v2", JSON.stringify(saveData));
    TerminalSystem.log("SYSTEM SAVED. STATE PRESERVED.", "safe");
    UISystem.toggleMenu();
  },

  load: () => {
    const raw = localStorage.getItem("0110_save_v2");
    if (raw) {
      const data = JSON.parse(raw);
      State.player = { ...State.player, ...data.player };
      State.hotbar = data.hotbar;
      State.game.killCount = data.kills;
      ObjectiveSystem.currentPhaseIndex = data.objPhase || 0;
      
      // Reset Transients
      State.player.vx = 0;
      State.player.vy = 0;
      State.player.isTerminalOpen = false;
      State.game.paused = false;
      
      // Clear world to prevent glitches on spawn
      State.world.structures = [];
      State.world.fragments = [];
      State.world.enemies = [];
      State.world.visitedChunks.clear();
      
      TerminalSystem.updateHotbar();
      ObjectiveSystem.render();
      return true;
    }
    return false;
  },

  reboot: () => {
    if (SaveSystem.load()) {
      TerminalSystem.log("REBOOTING FROM LAST SAVE...", "safe");
      UISystem.toggleMenu();
      setTimeout(() => location.reload(), 500);
      
      const overlay = document.getElementById("pause-overlay");
      if(overlay) overlay.classList.remove("visible");
    } else {
      location.reload();
    }
  },
};