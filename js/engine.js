import { GATES } from "./catalog.js";
import { getLevel } from "./levels.js";

export function boardLine(slots) {
  return (slots / (slots + 1)) * 100;
}

export function createRun(levelId) {
  const level = getLevel(levelId);
  if (!level) throw new Error(`Unknown level ${levelId}`);
  const boardX = boardLine(level.slots);
  return {
    level,
    boardX,
    slotW: boardX / level.slots,
    phase: "setup",
    setupLeft: level.setup,
    departIn: level.setup + level.duration,
    total: level.setup + level.duration,
    obstacles: [],
    inventory: level.inventory.map((item) => ({ ...item })),
    features: level.features.map((feature) => ({
      ...feature,
      x: 0,
      hold: 0,
      seen: {},
      platform: false,
      result: "",
      blocked: "",
    })),
    laneCount: Math.max(...level.features.map((feature) => feature.lane)) + 1,
    win: false,
    score: 0,
    departed: false,
  };
}

export function place(state, gateId, lane, slot) {
  if (state.phase === "departed") return { ok: false, reason: "departed" };
  if (!GATES[gateId]) return { ok: false, reason: "slot" };
  const item = state.inventory.find((entry) => entry.id === gateId);
  if (!item || item.count <= 0) return { ok: false, reason: "empty" };
  if (!Number.isInteger(slot) || slot < 0 || slot >= state.level.slots) return { ok: false, reason: "slot" };
  if (!Number.isInteger(lane) || lane < 0 || lane >= state.laneCount) return { ok: false, reason: "lane" };
  if (state.obstacles.some((obstacle) => obstacle.lane === lane && obstacle.slot === slot)) {
    return { ok: false, reason: "occupied" };
  }
  const feature = state.features.find((item) => item.lane === lane);
  if (feature && state.phase !== "setup" && feature.x >= (slot + 1) * state.slotW - 0.05) {
    return { ok: false, reason: "late" };
  }
  item.count -= 1;
  state.obstacles.push({ gate: gateId, lane, slot });
  return { ok: true };
}

export function remove(state, lane, slot) {
  if (state.phase !== "setup") return { ok: false, reason: "locked" };
  const index = state.obstacles.findIndex((obstacle) => obstacle.lane === lane && obstacle.slot === slot);
  if (index < 0) return { ok: false, reason: "empty" };
  const [obstacle] = state.obstacles.splice(index, 1);
  const item = state.inventory.find((entry) => entry.id === obstacle.gate);
  if (item) item.count += 1;
  return { ok: true };
}

export function step(state, dt) {
  if (state.phase === "departed") return;
  const limited = Math.min(0.05, Math.max(0, dt));
  const n = Math.max(1, Math.ceil(limited / (1 / 60)));
  const sub = limited / n;
  for (let i = 0; i < n; i += 1) stepOnce(state, sub);
}

function stepOnce(state, dt) {
  if (state.phase === "departed") return;
  state.departIn -= dt;
  if (state.phase === "setup") {
    state.setupLeft -= dt;
    if (state.setupLeft <= 0) {
      state.setupLeft = 0;
      state.phase = "running";
    }
  } else if (state.phase === "running") {
    for (const feature of state.features) moveFeature(state, feature, dt);
  }
  if (state.departIn <= 0) depart(state);
}

function moveFeature(state, feature, dt) {
  if (feature.x >= state.boardX) {
    feature.x = state.boardX;
    feature.platform = true;
    feature.blocked = "";
    return;
  }
  const slot = slotIndex(state, feature.x);
  const obstacle = state.obstacles.find((item) => item.lane === feature.lane && item.slot === slot);
  const gate = obstacle ? GATES[obstacle.gate] : null;
  const key = obstacle ? `${obstacle.lane}:${obstacle.slot}` : "";

  if (gate && !feature.seen[key]) {
    feature.seen[key] = true;
    if (gate.effect === "hold") feature.hold = gate.hold;
    if (gate.effect === "push") {
      feature.x = Math.max(0, feature.x - gate.push);
      feature.blocked = gate.name;
      return;
    }
  }

  if (gate && gate.effect === "stop") {
    feature.blocked = gate.name;
    return;
  }
  if (feature.hold > 0) {
    feature.hold = Math.max(0, feature.hold - dt);
    feature.blocked = gate ? gate.name : "等待";
    return;
  }

  const mult = gate && gate.effect === "slow" ? gate.slow : 1;
  feature.x += feature.speed * mult * dt;
  feature.blocked = mult < 1 && gate ? gate.name : "";
  if (feature.x >= state.boardX) {
    feature.x = state.boardX;
    feature.platform = true;
    feature.blocked = "";
  }
}

function slotIndex(state, x) {
  if (x >= state.boardX) return -1;
  return Math.min(state.level.slots - 1, Math.max(0, Math.floor(x / state.slotW)));
}

function depart(state) {
  state.departIn = 0;
  state.phase = "departed";
  state.departed = true;
  for (const feature of state.features) {
    feature.result = feature.x >= state.boardX - 0.05 ? "boarded" : "missed";
    feature.platform = feature.result === "boarded";
    feature.blocked = "";
  }
  const targets = state.features.filter((feature) => feature.target);
  state.win = targets.length > 0 && targets.every((feature) => feature.result === "missed");
  state.score = state.win ? scoreRun(state) : 0;
}

function scoreRun(state) {
  let score = 200;
  for (const feature of state.features) {
    if (feature.target && feature.result === "missed") {
      score += 400 + Math.round((state.boardX - feature.x) * 6);
    }
    if (!feature.target && feature.result === "boarded") score += 120;
  }
  for (const item of state.inventory) score += item.count * 80;
  return score;
}

export function budgetLeft(state) {
  return state.inventory.reduce((sum, item) => sum + item.count, 0);
}
