import { State } from './state.js';
import { Config } from '../src/config.js';
import { AudioSystem } from '../src/systems/Audio.js';

export const UISystem = {
  menuIndex: 0,
  menuItems: [],

  update: () => {
    document.getElementById("coords-display").innerText = `LOC: [${Math.floor(
      State.player.x
    )}, ${Math.floor(State.player.y)}]`;
    
    document.getElementById("data-bank").innerText = `DATA: ${formatData(State.player.data)}`;
    document.getElementById("bar-health").style.width = `${Math.max(0, State.player.health)}%`;
    
    let totalLight = Math.floor(Config.baseLightRadius * State.player.lightLevel);
    document.getElementById("light-val").innerText = totalLight;
    
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
      
      UISystem.menuItems = document.querySelectorAll("#menu-dropdown .menu-item");
      UISystem.menuIndex = 0;
      UISystem.highlightMenu();
    } else {
      menu.classList.remove("show");
      overlay.classList.remove("visible");
    }
  },

  navMenu: (dir) => {
    if (!State.game.paused || UISystem.menuItems.length === 0) return;
    
    UISystem.menuIndex += dir;
    if (UISystem.menuIndex < 0) UISystem.menuIndex = UISystem.menuItems.length - 1;
    if (UISystem.menuIndex >= UISystem.menuItems.length) UISystem.menuIndex = 0;
    
    UISystem.highlightMenu();
  },

  highlightMenu: () => {
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
       selected.click(); 
    }
  }
};

function formatData(mb) {
    if (mb >= 1000000) {
        return (mb / 1000000).toFixed(2) + " TB";
    } else if (mb >= 1000) {
        return (mb / 1000).toFixed(2) + " GB";
    } else {
        return Math.floor(mb) + " MB";
    }
}