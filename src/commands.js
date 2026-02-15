export const CommandBank = {
  "sys.scan": {
    cost: 50,
    desc: "Reveal Loot",
    req: null,
    action: "scan",
  },
  "sys.lumos": {
    cost: 50,
    desc: "Upgrade Light",
    req: null,
    action: "light",
  },
  "sys.compile": {
    cost: 50,
    desc: "Unlock Weapon",
    req: "story",
    action: "combat",
  },
  "sys.cloak": {
    cost: 20,
    desc: "Invisibility (10s)",
    req: "combat",
    action: "cloak",
  },
  "exe.repair": {
    cost: 100,
    desc: "Restore 50 HP",
    req: "combat",
    action: "heal",
  },
  "sys.speed": {
    cost: 80,
    desc: "Boost Velocity",
    req: "light_2",
    limit: 2,
    action: "speed",
  },
  "sys.fire": {
    cost: 60,
    desc: "Boost Fire Rate",
    req: "combat",
    limit: 3,
    action: "firerate",
  },
  "sys.protect": {
    cost: 120,
    desc: "Shield Layer",
    req: "combat",
    limit: 1,
    action: "shield",
  },
  "sys.unbind": {
    cost: 0,
    desc: "Clear Hotkey",
    req: null,
    action: "unbind",
  },
};