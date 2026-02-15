import { Utils } from '../utils.js';
import { AudioSystem } from '../systems/Audio.js';
import { TerminalSystem } from './Terminal.js';

export const Cinematics = {
  playIntro: async () => {
    await Utils.wait(500);
    AudioSystem.playSFX("intro_hit");
    
    const title = document.getElementById("intro-title");
    const sub = document.getElementById("intro-sub");
    
    if (title) title.style.opacity = 1;
    if (sub) sub.style.opacity = 1;
    
    await Utils.wait(2500);
    if (title) title.style.opacity = 0;
    if (sub) sub.style.opacity = 0;
    
    await Utils.wait(1000);
    document.getElementById("cinematic-overlay").style.opacity = 0;

    AudioSystem.playSFX("story_ambience");
    document.getElementById("story-overlay").style.opacity = 1;
    
    await Utils.wait(20000);
    document.getElementById("story-overlay").style.opacity = 0;
    await Utils.wait(1000);

    document.getElementById("ui-layer").classList.add("active");
    TerminalSystem.init();
  }
};