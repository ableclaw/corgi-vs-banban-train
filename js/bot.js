import {
  BOT_CLEAR_PAD,
  BOT_TIME_PAD,
  BOT_WAIT_PAD,
  DUCK_H,
  GROUND,
  STAND_H,
  TUNING,
  jumpClearDistances,
} from "./constants.js";

function hitsBand(rect, top) {
  return rect.y < GROUND - 0.5 && rect.y + rect.h > top + 1;
}

function isOverhead(rect) {
  return hitsBand(rect, GROUND - STAND_H) && !hitsBand(rect, GROUND - DUCK_H);
}

function isGroundThreat(rect) {
  return hitsBand(rect, GROUND - STAND_H) && hitsBand(rect, GROUND - DUCK_H);
}

function nearestChallenge(state) {
  const p = state.player;
  let best = null;
  let bestKey = Infinity;
  const consider = (rect, type) => {
    if (p.x > rect.x + rect.w - 4) return;
    const dx = rect.x - (p.x + p.w);
    const key = dx < 0 ? 0 : dx;
    if (key < bestKey) {
      bestKey = key;
      best = { rect, type, dx };
    }
  };
  for (const solid of state.solids) {
    if (solid.gate) consider(solid, "duck-solid");
    else if (solid.kind === "firewall") consider(solid, "jump-solid");
  }
  for (const hazard of state.hazards) {
    if (hazard.motion === "lift" || hazard.motion === "ping") continue;
    if (isOverhead(hazard)) consider(hazard, "duck");
    else if (isGroundThreat(hazard)) consider(hazard, "jump");
  }
  return best;
}

export function decide(state) {
  const p = state.player;
  let right = true;
  let jump = false;
  let duck = false;
  const challenge = nearestChallenge(state);
  if (challenge && challenge.dx < 520) {
    if (challenge.type === "duck" || challenge.type === "duck-solid") {
      const pad = challenge.type === "duck-solid" ? 70 : 110;
      if (challenge.dx < pad) duck = true;
    } else {
      const rise = challenge.type === "jump-solid" ? challenge.rect.h : GROUND - challenge.rect.y;
      const band = jumpClearDistances(rise, challenge.rect.w);
      if (band) {
        const trigger = (band.dMin + band.dMax) / 2;
        const fast = p.vx >= TUNING.maxSpeed * 0.88;
        if (fast && challenge.dx <= trigger && challenge.dx > -12) jump = true;
      }
    }
  }

  for (const hazard of state.hazards) {
    if (hazard.motion !== "ping" || !isOverhead(hazard)) continue;
    const z0 = hazard.min - 36;
    const z1 = hazard.max + hazard.w + 16;
    if (p.x + p.w > z0 && p.x < z1) duck = true;
  }

  let coach = null;
  for (const hazard of state.hazards) {
    if (hazard.motion !== "lift") continue;
    if (p.x >= hazard.x + hazard.w - 4) continue;
    if (!coach || hazard.x < coach.x) coach = hazard;
  }
  if (coach) {
    const dist = coach.x + coach.w + BOT_CLEAR_PAD - p.x;
    const need = dist / TUNING.maxSpeed + BOT_TIME_PAD;
    const parkedUp = coach.y <= coach.ymin + 2 && coach.hang >= need;
    if (!parkedUp && p.x + p.w >= coach.x - BOT_WAIT_PAD) right = false;
  }

  if (duck || !right) jump = false;
  return { left: false, right, jump, duck };
}

export function createPilot() {
  let prevJump = false;
  return (state) => {
    const input = decide(state);
    input.jumpPressed = input.jump && !prevJump;
    prevJump = !!input.jump;
    return input;
  };
}
