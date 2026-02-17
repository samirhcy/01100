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
    
    if (data.game.killCount > 0) ObjectiveSystem.currentPhaseIndex = 1; 
    if (data.game.survivalTimer > 0) ObjectiveSystem.currentPhaseIndex = 2;

    return true;
  },
  
  // --- THE FIX IS HERE ---
  saveAndExit: (nextChapter) => {
      // 1. UPDATE MASTER SAVE (Used by Home Page)
      // We explicitly save "chapter: 2". This triggers the "Paywall" logic on the Home Page.
      const masterSave = {
          chapter: nextChapter,
          unlocked: false // <--- Important: We say it's NOT unlocked yet.
      };
      localStorage.setItem("0110_save_v2", JSON.stringify(masterSave));
      
      // 2. Clear the mid-game checkpoint (Player starts fresh in Ch2)
      localStorage.removeItem("0110_checkpoint");

      // 3. REMOVED: Do NOT set "0110_access_token". 
      // This ensures the player MUST enter a key to proceed.

      // 4. Redirect to Home
      window.location.href = "index.html";
  }
};