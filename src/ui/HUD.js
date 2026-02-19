import { State } from '../state.js';
import { Config } from '../config.js';
import { AudioSystem } from '../systems/Audio.js';

export const UISystem = {
  // NEW: Track the pause menu selection
  menuIndex: 0,
  menuItems: [],

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
    
    State.game.paused = !State.game.paused;

    if (State.game.paused) {
      menu.classList.add("show");
      overlay.classList.add("visible");
      
      // Initialize menu selection array
      UISystem.menuItems = document.querySelectorAll("#menu-dropdown .menu-item");
      UISystem.menuIndex = 0;
      UISystem.highlightMenu();
    } else {
      menu.classList.remove("show");
      overlay.classList.remove("visible");
    }
  },

  // --- NEW: MENU NAVIGATION LOGIC ---

  navMenu: (dir) => {
    if (!State.game.paused || UISystem.menuItems.length === 0) return;
    
    UISystem.menuIndex += dir;
    if (UISystem.menuIndex < 0) UISystem.menuIndex = UISystem.menuItems.length - 1;
    if (UISystem.menuIndex >= UISystem.menuItems.length) UISystem.menuIndex = 0;
    
    UISystem.highlightMenu();
  },

  highlightMenu: () => {
    // Manually apply the hover CSS so the controller user sees what is selected
    UISystem.menuItems.forEach((item, index) => {
      if (index === UISystem.menuIndex) {
        item.style.background = "rgba(0, 243, 255, 0.2)";
        item.style.color = "white";
        item.style.paddingLeft = "25px";
      } else {
        item.style.background = "rgba(0, 0, 0, 0.9)";
        item.style.color = "#ccc";
        item.style.paddingLeft = "20px";
      }
    });
  },

  selectMenu: () => {
    if (!State.game.paused || UISystem.menuItems.length === 0) return;
    const selected = UISystem.menuItems[UISystem.menuIndex];
    if (selected) {
       selected.click(); // Triggers the existing HTML onclick attribute!
    }
  }
};

// --- HELPER: DATA UNIT CONVERTER (Unchanged) ---
function formatData(mb) {
    if (mb >= 1000000) {
        return (mb / 1000000).toFixed(2) + " TB";
    } else if (mb >= 1000) {
        return (mb / 1000).toFixed(2) + " GB";
    } else {
        return Math.floor(mb) + " MB";
    }
}