import { State } from '../state.js';
import { Config } from '../config.js';
import { AudioSystem } from '../systems/Audio.js';

export const UISystem = {
  update: () => {
    // 1. Coordinates (Unchanged)
    document.getElementById("coords-display").innerText = `LOC: [${Math.floor(
      State.player.x
    )}, ${Math.floor(State.player.y)}]`;
    
    // 2. Data Bank (UPDATED with Formatter)
    document.getElementById("data-bank").innerText = `DATA: ${formatData(State.player.data)}`;
    
    // 3. Health Bar (Unchanged)
    document.getElementById("bar-health").style.width = `${Math.max(0, State.player.health)}%`;
    
    // 4. Light Value (Unchanged)
    let totalLight = Math.floor(Config.baseLightRadius * State.player.lightLevel);
    document.getElementById("light-val").innerText = totalLight;
    
    // 5. Shield Label (Unchanged)
    if (State.player.shield > 0)
      document.getElementById("shield-label").classList.remove("hidden");
    else document.getElementById("shield-label").classList.add("hidden");
  },

  toggleMenu: () => {
    const menu = document.getElementById("menu-dropdown");
    const overlay = document.getElementById("pause-overlay");
    menu.classList.toggle("show");
    
    State.game.paused = !State.game.paused;

    if (State.game.paused) overlay.classList.add("visible");
    else overlay.classList.remove("visible");
  },
};

// --- HELPER: DATA UNIT CONVERTER ---
function formatData(mb) {
    if (mb >= 1000000) {
        return (mb / 1000000).toFixed(2) + " TB";
    } else if (mb >= 1000) {
        return (mb / 1000).toFixed(2) + " GB";
    } else {
        return Math.floor(mb) + " MB";
    }
}