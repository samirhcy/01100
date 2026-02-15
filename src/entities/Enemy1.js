import { State } from '../state.js';
import { Utils } from '../utils.js';

export const EnemyEntity = {
  update: (dt) => {
    State.world.enemies.forEach((en, index) => {
      // 1. Separation Logic (Don't stack on top of each other)
      let sepX = 0,
        sepY = 0;
      State.world.enemies.forEach((other, otherIdx) => {
        if (index !== otherIdx) {
          let d = Utils.dist(en.x, en.y, other.x, other.y);
          if (d < 60) {
            sepX += (en.x - other.x) * 1.5;
            sepY += (en.y - other.y) * 1.5;
          }
        }
      });

      if (en.cooldown > 0) en.cooldown -= dt;

      // 2. Perception (Raycast & Distance)
      let dist = Utils.dist(en.x, en.y, State.player.x, State.player.y);
      let hit = Utils.rayCast(en.x, en.y, State.player.x, State.player.y);

      // 3. AI State Machine (Omniscient vs Wander vs Chase)
      let isOmniscient = State.game.killCount >= 15 && !State.player.cloaked;
      let canSee = dist < en.sightRange && !hit.hit && !State.player.cloaked;

      if (isOmniscient) {
        // Tracking Mode (High Kills)
        en.targetX = State.player.x;
        en.targetY = State.player.y;
      } else if (dist > 700 || hit.hit) {
        // Wandering Mode
        if (en.wanderTimer <= 0) {
          en.targetX = en.x + (Math.random() - 0.5) * 400;
          en.targetY = en.y + (Math.random() - 0.5) * 400;
          en.wanderTimer = 100 + Math.random() * 100;
        }
        en.wanderTimer -= dt;
      } else if (canSee) {
        // Chase Mode
        en.targetX = State.player.x;
        en.targetY = State.player.y;
      }

      // 4. Movement Logic
      let dx = en.targetX - en.x;
      let dy = en.targetY - en.y;
      let moveDist = Math.sqrt(dx * dx + dy * dy);

      if (moveDist > 10) {
        let nextX = en.x + (dx / moveDist) * en.speed * dt + sepX * 0.1;
        let nextY = en.y + (dy / moveDist) * en.speed * dt + sepY * 0.1;
        let blocked = false;

        for (let s of State.world.structures) {
          if (Utils.checkRectCollide(nextX, nextY, s)) {
            blocked = true;
            break;
          }
        }

        if (!blocked) {
          en.x = nextX;
          en.y = nextY;
          en.angle = Math.atan2(dy, dx);
        } else {
          // BUG FIX: Prevent freezing when hitting walls
          en.targetX = en.x + (Math.random() - 0.5) * 300;
          en.targetY = en.y + (Math.random() - 0.5) * 300;
          en.wanderTimer = 50;
        }
      } else {
        if (!isOmniscient && !canSee) en.wanderTimer = 0;
      }

      // 5. Combat (Shooting)
      if (canSee) {
        en.angle = Math.atan2(State.player.y - en.y, State.player.x - en.x);
        if (en.cooldown <= 0) {
          State.world.projectiles.push({
            x: en.x,
            y: en.y,
            vx: Math.cos(en.angle) * 6,
            vy: Math.sin(en.angle) * 6,
            type: "enemy",
            life: 100,
          });
          en.cooldown = Math.max(20, 60 - State.game.killCount * 2);
        }
      }
    });
  },
};