import { LEVELS } from "./levels.js";

export const SAVE_KEY = "corgi-banban-save-v1";

export function emptySave() {
  return { unlocked: 1, best: {}, mute: false, cleared: false };
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return emptySave();
    const data = JSON.parse(raw);
    const max = LEVELS.length;
    return {
      unlocked: clamp(Number(data.unlocked) || 1, 1, max),
      best: data.best && typeof data.best === "object" ? data.best : {},
      mute: !!data.mute,
      cleared: !!data.cleared,
    };
  } catch {
    return emptySave();
  }
}

export function writeSave(save) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  return save;
}

export function applyClear(save, levelId, score, levelCount = LEVELS.length) {
  const next = { ...save, best: { ...save.best } };
  const rounded = Math.max(0, Math.round(score));
  next.best[levelId] = Math.max(Number(next.best[levelId]) || 0, rounded);
  if (levelId < levelCount) next.unlocked = Math.max(next.unlocked || 1, levelId + 1);
  if (levelId >= levelCount) next.cleared = true;
  return next;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}
