import { State } from '../state.js';
import { TerminalSystem } from '../ui/Terminal.js';
import { ObjectiveSystem } from '../ui/Objective.js';

export const SaveSystem = {
  // ENCRYPTION HELPERS (Simple Base64 Obfuscation)
  encrypt: (data) => {
    try {
        return btoa(JSON.stringify(data)); // Convert JSON -> Base64
    } catch (e) { console.error("Encrypt failed", e); return null; }
  },
  
  decrypt: (str) => {
    try {
        return JSON.parse(atob(str)); // Convert Base64 -> JSON
    } catch (e) { console.error("Decrypt failed", e); return null; }
  },

  save: (slot = 1) => {
    // 1. Gather Data
    const saveData = {
        player: State.player,
        game: State.game,
        inventory: State.hotbar,
        chapter: 1, // Track which chapter they are in
        timestamp: Date.now()
    };

    // 2. Encrypt & Save to Local Storage
    const encrypted = SaveSystem.encrypt(saveData);
    if (encrypted) {
        localStorage.setItem("0110_save_data", encrypted);
        TerminalSystem.log("PROGRESS SAVED (ENCRYPTED)", "safe");
        return true;
    }
    return false;
  },

  load: async () => {
    // 1. Get String
    const raw = localStorage.getItem("0110_save_data");
    if (!raw) return false;

    // 2. Decrypt
    const data = SaveSystem.decrypt(raw);
    if (!data) {
        console.error("Save file corrupted or tampered.");
        return false;
    }

    // 3. Apply Data to State
    State.player = { ...State.player, ...data.player };
    State.game = { ...State.game, ...data.game };
    State.hotbar = data.inventory || State.hotbar;
    
    // UI Updates
    ObjectiveSystem.currentPhaseIndex = data.game.killCount > 0 ? 1 : 0; 
    
    return true;
  },
  
  // Call this when finishing Tutorial or Chapter 1
  saveChapterProgress: (chapterNum) => {
      // This is a separate "Meta" save file just for unlocks
      const current = localStorage.getItem("0110_meta") || "{}";
      const meta = JSON.parse(current);
      meta.chapter = chapterNum;
      localStorage.setItem("0110_meta", JSON.stringify(meta));
  }
};