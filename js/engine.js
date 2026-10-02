import {
  BOT_CLEAR_PAD,
  BOT_TIME_PAD,
  BOT_WAIT_PAD,
  DUCK_H,
  GROUND,
  PLAYER_W,
  STAND_H,
  TUNING,
  VIEW_W,
} from "./constants.js";
import { getLevel } from "./levels.js";

const HAZARD_INSET = 8;
const BODY_INSET = 4;

export function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function normalizeSolid(solid) {
  if (solid.gate) {
    const gap = solid.gap ?? 48;
    const h = solid.h ?? 280;
    return { ...solid, y: GROUND - gap - h, h, gap };
  }
  if (solid.kind === "platform") return { ...solid };
  return { ...solid, y: GROUND - solid.h };
}

function cloneHazard(hazard) {
  const copy = { ...hazard };
  if (hazard.motion === "lift") {
    copy.y = hazard.ymin;
    copy.vy = Math.abs(hazard.vy || 100);
    copy.vx = 0;
    copy.hang = hazard.pause ?? 1.6;
  } else if (hazard.motion === "ping") {
    copy.vx = hazard.vx || 60;
    copy.vy = 0;
    copy.hang = 0;
    if (copy.min == null) copy.min = copy.x;
    if (copy.max == null) copy.max = copy.x;
  } else {
    copy.motion = "still";
    copy.vx = 0;
    copy.vy = 0;
  }
  return copy;
}

export function createRun(levelId) {
  const level = getLevel(levelId);
  if (!level) throw new Error(`Unknown level ${levelId}`);
  return {
    level,
    solids: level.solids.map(normalizeSolid),
    hazards: level.hazards.map(cloneHazard),
    pickups: (level.pickups || []).map((pickup) => ({ ...pickup, taken: false })),
    player: {
      x: 48,
      y: GROUND - STAND_H,
      w: PLAYER_W,
      h: STAND_H,
      vx: 0,
      vy: 0,
      onGround: true,
      ducking: false,
      facing: 1,
      coyote: 0.12,
    },
    hp: 3,
    maxHp: 3,
    score: 0,
    time: 0,
    cam: 0,
    status: "play",
    checkpoint: 0,
    invuln: 0.45,
    shake: 0,
    jumpBuf: 0,
    sfx: null,
    maxX: 48,
    finishScored: false,
  };
}

export function step(state, input, dt) {
  const limited = Math.min(Math.max(dt, 0), 0.05);
  const n = Math.max(1, Math.round(limited / (1 / 120)));
  const sub = limited / n;
  for (let i = 0; i < n; i += 1) {
    const subInput = i === 0 ? input : { ...input, jumpPressed: false };
    stepOnce(state, subInput, sub);
    if (state.status !== "play") break;
  }
}

function stepOnce(state, input, dt) {
  if (state.status !== "play") return;
  state.sfx = null;
  state.time += dt;
  state.shake = Math.max(0, state.shake - dt);
  if (state.invuln > 0) state.invuln -= dt;

  const tuning = TUNING;
  const p = state.player;

  let dir = 0;
  if (input.left) dir -= 1;
  if (input.right) dir += 1;
  if (dir !== 0) {
    p.vx += dir * tuning.accel * dt;
    p.facing = dir;
  } else {
    const drop = tuning.friction * dt;
    if (Math.abs(p.vx) <= drop) p.vx = 0;
    else p.vx -= Math.sign(p.vx) * drop;
  }
  p.vx = clamp(p.vx, -tuning.maxSpeed, tuning.maxSpeed);

  const feet = p.y + p.h;
  const wantDuck = !!input.duck;
  p.h = wantDuck ? DUCK_H : STAND_H;
  p.y = feet - p.h;
  p.ducking = wantDuck;
  if (!wantDuck && overlapsSolid(state)) {
    p.h = DUCK_H;
    p.y = feet - DUCK_H;
    p.ducking = true;
  }

  if (p.onGround) p.coyote = 0.1;
  else p.coyote = Math.max(0, p.coyote - dt);
  if (input.jumpPressed) state.jumpBuf = 0.12;
  else state.jumpBuf = Math.max(0, state.jumpBuf - dt);
  if (state.jumpBuf > 0 && p.coyote > 0 && !p.ducking) {
    p.vy = tuning.jumpV;
    p.onGround = false;
    p.coyote = 0;
    state.jumpBuf = 0;
    state.sfx = "jump";
  }

  p.vy = Math.min(980, p.vy + tuning.gravity * dt);

  const prevX = p.x;
  p.x += p.vx * dt;
  if (p.x < 0) {
    p.x = 0;
    p.vx = 0;
  }
  const maxX = state.level.length - p.w;
  if (p.x > maxX) {
    p.x = maxX;
    p.vx = 0;
  }
  resolveX(state, prevX);

  const prevY = p.y;
  p.y += p.vy * dt;
  resolveY(state, prevY);

  for (const hazard of state.hazards) updateHazard(hazard, dt);

  if (state.invuln <= 0) {
    const body = bodyBox(p, BODY_INSET);
    for (const hazard of state.hazards) {
      if (overlap(body, hazardBox(hazard))) {
        hurt(state);
        break;
      }
    }
  }

  if (state.status !== "play") return;

  const body = bodyBox(p, 0);
  for (const pickup of state.pickups) {
    if (pickup.taken) continue;
    if (overlap(body, pickup)) {
      pickup.taken = true;
      state.score += 200;
      state.sfx = state.sfx || "treat";
    }
  }

  for (const mark of state.level.checkpoints) {
    if (p.x >= mark && mark > state.checkpoint) {
      state.checkpoint = mark;
      state.sfx = state.sfx || "check";
    }
  }

  if (p.x > state.maxX) {
    state.score += (p.x - state.maxX) * 0.2;
    state.maxX = p.x;
  }

  if (overlap(body, state.level.goal)) {
    state.status = "clear";
    if (!state.finishScored) {
      state.score += 800 + state.hp * 300;
      state.finishScored = true;
    }
    state.sfx = "clear";
  }

  const camTarget = clamp(p.x - 220, 0, Math.max(0, state.level.length - VIEW_W));
  const follow = 1 - Math.exp(-dt * 10);
  state.cam += (camTarget - state.cam) * follow;
}

function resolveX(state, prevX) {
  const p = state.player;
  for (const solid of state.solids) {
    if (!overlap(bodyBox(p, 0), solid)) continue;
    if (p.x >= prevX) p.x = solid.x - p.w - 0.05;
    else p.x = solid.x + solid.w + 0.05;
    p.vx = 0;
  }
}

function resolveY(state, prevY) {
  const p = state.player;
  p.onGround = false;
  for (const solid of state.solids) {
    if (!overlap(bodyBox(p, 0), solid)) continue;
    const prevBottom = prevY + p.h;
    if (p.vy >= 0 && prevBottom <= solid.y + 10) {
      p.y = solid.y - p.h;
      p.vy = 0;
      p.onGround = true;
    } else if (p.vy < 0 && prevY >= solid.y + solid.h - 10) {
      p.y = solid.y + solid.h + 0.05;
      p.vy = 0;
    }
  }
  if (p.y + p.h >= GROUND) {
    p.y = GROUND - p.h;
    if (p.vy > 0) p.vy = 0;
    p.onGround = true;
  }
}

function updateHazard(hazard, dt) {
  if (hazard.motion === "lift") {
    if (hazard.hang > 0) {
      hazard.hang -= dt;
      return;
    }
    hazard.y += hazard.vy * dt;
    if (hazard.y <= hazard.ymin) {
      hazard.y = hazard.ymin;
      hazard.vy = Math.abs(hazard.vy);
      hazard.hang = hazard.pause ?? 1.6;
    } else if (hazard.y >= hazard.ymax) {
      hazard.y = hazard.ymax;
      hazard.vy = -Math.abs(hazard.vy);
      hazard.hang = hazard.pause ?? 1.6;
    }
    return;
  }
  if (hazard.motion === "ping") {
    hazard.x += hazard.vx * dt;
    if (hazard.x <= hazard.min) {
      hazard.x = hazard.min;
      hazard.vx = Math.abs(hazard.vx);
    } else if (hazard.x >= hazard.max) {
      hazard.x = hazard.max;
      hazard.vx = -Math.abs(hazard.vx);
    }
  }
}

function hurt(state) {
  if (state.invuln > 0 || state.status !== "play") return;
  state.hp -= 1;
  state.shake = 0.32;
  state.invuln = 1.2;
  if (state.hp <= 0) {
    state.status = "over";
    state.sfx = "over";
    return;
  }
  const p = state.player;
  p.x = state.checkpoint;
  p.y = GROUND - STAND_H;
  p.h = STAND_H;
  p.vx = 0;
  p.vy = 0;
  p.ducking = false;
  p.onGround = true;
  state.sfx = "hurt";
}

function overlapsSolid(state) {
  const box = bodyBox(state.player, 0);
  return state.solids.some((solid) => overlap(box, solid));
}

function bodyBox(player, inset) {
  return {
    x: player.x + inset,
    y: player.y + inset,
    w: Math.max(4, player.w - inset * 2),
    h: Math.max(4, player.h - inset * 2),
  };
}

function hazardBox(hazard) {
  const m = HAZARD_INSET;
  return {
    x: hazard.x + m,
    y: hazard.y + m,
    w: Math.max(6, hazard.w - m * 2),
    h: Math.max(6, hazard.h - m * 2),
  };
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export { BOT_CLEAR_PAD, BOT_TIME_PAD, BOT_WAIT_PAD };
