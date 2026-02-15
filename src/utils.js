import { State } from './state.js';

export const Utils = {
  wait: (ms) => new Promise((r) => setTimeout(r, ms)),
  dist: (x1, y1, x2, y2) => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2),
  checkRectCollide: (x, y, rect) => {
    return (
      x > rect.x - 10 &&
      x < rect.x + rect.w + 10 &&
      y > rect.y - 10 &&
      y < rect.y + rect.h + 10
    );
  },
  rayCast: (x1, y1, x2, y2) => {
    for (let s of State.world.structures) {
      if (Math.abs(s.x + s.w / 2 - (x1 + x2) / 2) > 1000) continue;
      let minX = Math.min(x1, x2),
        maxX = Math.max(x1, x2),
        minY = Math.min(y1, y2),
        maxY = Math.max(y1, y2);
      if (
        maxX < s.x ||
        minX > s.x + s.w ||
        maxY < s.y ||
        minY > s.y + s.h
      )
        continue;
      return { hit: true };
    }
    return { hit: false };
  },
};