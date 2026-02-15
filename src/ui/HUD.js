import { State } from '../state.js';
import { Config } from '../config.js';
import { AudioSystem } from '../systems/Audio.js';

export const UISystem = {
  update: () => {
    document.getElementById("coords-display").innerText = `LOC: [${Math.floor(
      State.player.x
    )}, ${Math.floor(State.player.y)}]`;
    
    document.getElementById("data-bank").innerText = `DATA: ${State.player.data} MB`;
    
    document.getElementById("bar-health").style.width = `${State.player.health}%`;
    
    let totalLight = Math.floor(Config.baseLightRadius * State.player.lightLevel);
    document.getElementById("light-val").innerText = totalLight;
    
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