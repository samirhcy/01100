import { Config } from '../src/config.js';
import { Utils } from '../src/utils.js';
import { State } from './state.js';
import { WorldEntity } from './World.js';
import { RenderSystem } from './Render.js';
import { TerminalSystem } from './Terminal.js';
import { PlayerEntity } from './Player.js'; 
import { InputSystem } from './Input.js';
import { UISystem } from './HUD.js';
import { ObjectiveSystem } from './Objective.js';
import { AudioSystem } from '../src/systems/Audio.js';
import { AetherLensSystem } from './AetherLens.js'; // <--- NEW IMPORT

window.UISystem = UISystem;
window.TerminalSystem = TerminalSystem;
window.AudioSystem = AudioSystem;

const GameLogicCh2 = {
  init: async () => {
    InputSystem.init();
    RenderSystem.init();
    TerminalSystem.init();
    ObjectiveSystem.init();

    // ... Keep Cinematic Intro exactly the same ...
    const fade = document.getElementById("fade-overlay");
    const cinematic = document.getElementById("cinematic-overlay");
    const title = document.getElementById("intro-title");
    const sub = document.getElementById("intro-sub");
    const uiLayer = document.getElementById("ui-layer");

    if (fade) fade.style.opacity = "0"; 

    if (cinematic && title && sub) {
        cinematic.style.display = "flex";
        cinematic.style.opacity = "1";
        title.style.opacity = "0";
        sub.style.opacity = "0";
        if (uiLayer) uiLayer.classList.remove("active"); 

        await Utils.wait(500);
        if (AudioSystem && AudioSystem.playSFX) AudioSystem.playSFX("intro_hit");
        title.style.opacity = "1";
        sub.style.opacity = "1";

        await Utils.wait(3000);
        title.style.opacity = "0";
        sub.style.opacity = "0";

        await Utils.wait(1500);
        cinematic.style.opacity = "0";
        
        await Utils.wait(2000);
        cinematic.style.display = "none"; 
        
        if (uiLayer) uiLayer.classList.add("active");
        WorldEntity.initCh2();
    } else {
        if (cinematic) cinematic.style.display = "none";
        const story = document.getElementById("story-overlay");
        if (story) story.style.display = "none";
        if (uiLayer) uiLayer.classList.add("active");
        WorldEntity.initCh2();
    }

    State.player.mode = "roam";
    document.body.className = "mode-roam";
    requestAnimationFrame(GameLogicCh2.loop);
  },

  loop: () => {
    const timeScale = State.player.isTerminalOpen ? 0.1 : 1.0;
    InputSystem.update(); 

    if (!State.player.isDead && !State.game.paused) {
        PlayerEntity.update(timeScale);
        WorldEntity.update(1.0); 
        
        // --- UPDATE THE 3D MAP ---
        AetherLensSystem.update(); 
    }

    RenderSystem.draw();
    requestAnimationFrame(GameLogicCh2.loop);
  }
};

GameLogicCh2.init();