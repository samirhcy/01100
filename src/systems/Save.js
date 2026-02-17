import { State } from '../state.js';
import { TerminalSystem } from '../ui/Terminal.js';
import { ObjectiveSystem } from '../ui/Objective.js';

export const SaveSystem = {
  // ENCRYPTION (Base64)
  encrypt: (data) => {
    try { return btoa(JSON.stringify(data)); } 
    catch (e) { return null; }
  },
  
  decrypt: (str) => {
    try { return JSON.parse(atob(str)); } 
    catch (e) { return null; }
  },

  // AUTO-SAVE (CHECKPOINT)
  save: () => {
    const saveData = {
        player: State.player,
        game: State.game,
        inventory: State.hotbar,
        chapter: 1,
        timestamp: Date.now()
    };

    const encrypted = SaveSystem.encrypt(saveData);
    if (encrypted) {
        localStorage.setItem("0110_checkpoint", encrypted);
        TerminalSystem.log("CHECKPOINT REACHED. PROGRESS SAVED.", "safe");
        return true;
    }
    return false;
  },

  // LOAD CHECKPOINT
  load: async () => {
    const raw = localStorage.getItem("0110_checkpoint");
    if (!raw) return false;

    const data = SaveSystem.decrypt(raw);
    if (!data) return false;

    // Restore State
    State.player = { ...State.player, ...data.player };
    State.game = { ...State.game, ...data.game };
    State.hotbar = data.inventory || State.hotbar;
    
    // Restore Objective Phase
    // If they were in Phase 1 (index 0) or 2 (index 1), restore it.
    if (data.game.killCount > 0) ObjectiveSystem.currentPhaseIndex = 1; 
    if (data.game.survivalTimer > 0) ObjectiveSystem.currentPhaseIndex = 2;

    return true;
  },
  
  // END GAME TRANSITION (Fixes Black Screen)
  saveAndExit: (nextChapter) => {
      // 1. Mark Chapter 2 as Unlocked in Local Storage
      // This is what the Home Page checks to show the Overlay or not.
      localStorage.setItem("0110_access_token", "UNLOCKED_BY_GAMEPLAY");
      
      // 2. Clear the mid-game checkpoint (so they start fresh next time)
      localStorage.removeItem("0110_checkpoint");

      // 3. Redirect to Home
      window.location.href = "index.html";
  }
};