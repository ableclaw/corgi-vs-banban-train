import { pathToFileURL } from "node:url";
import { applyAction, conflictOpen, continueLevel, createRun, legalActions } from "./engine.js";

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function campaign(pick, change, r) {
  let level = 1;
  let state = createRun(1, change, 1 + Math.floor(r() * 100000));
  let actions = 0;
  let max = 1;
  let softlock = 0;
  while (true) {
    if (state.outcome) {
      if (state.outcome.kind === "level") {
        level = state.outcome.id;
        max = Math.max(max, level);
        state.outcome = { kind: "level", id: level };
        state = continueLevel(state);
        continue;
      }
      return { actions, max, end: state.outcome.id, softlock };
    }
    const options = legalActions(state);
    if (!options.length) return { actions, max, end: "SOFTLOCK", softlock: 1 };
    const action = pick(state, options, r);
    const next = applyAction(state, action);
    actions += 1;
    if (next === state) return { actions, max, end: `NOOP:${action}`, softlock: 1 };
    state = next;
    if (actions > 200) return { actions, max, end: "LOOP", softlock: 1 };
  }
}

export const strategies = {
  hotfixSpam: (state, options) => {
    if (options.includes("decline")) return "decline";
    if (options.includes("vp-skip")) return "vp-skip";
    if (conflictOpen(state) && !state.conceptSwap && options.includes("reframe")) return "reframe";
    if (options.includes("hotfix")) return "hotfix";
    if (options.includes("reframe")) return "reframe";
    if (options.includes("rest")) return "rest";
    if (options.includes("talk")) return "talk";
    return options.find((id) => ["vp-delegate", "rest", "reframe", "talk"].includes(id))
      || options.find((id) => id === "nihil")
      || options[0];
  },
  hotfixOnly: (state, options) => options.includes("hotfix")
    ? "hotfix"
    : options.find((id) => ["reframe", "rest", "talk", "vp-skip", "decline"].includes(id))
      || options.find((id) => id === "nihil")
      || options[0],
  random: (state, options, roll) => options[Math.floor(roll() * options.length)],
  randomCardsOnly: (state, options, roll) => {
    const cards = options.filter((id) => !["nihil", "force", "corrupt"].includes(id));
    const pool = cards.length ? cards : options;
    return pool[Math.floor(roll() * pool.length)];
  },
  good: (state, options) => {
    if (options.includes("decline")) return "decline";
    if (options.includes("vp-attend") && state.sanity > 3) return "vp-attend";
    if (options.includes("vp-skip")) return "vp-skip";
    const blocks = state.nodes.filter((node) => node.status !== "approved" && node.status !== "read" && !node.fake && !((node.boss === "schrodinger" || node.real) && !state.schrodingerRevealed)).length;
    const kafka = state.nodes.some((node) => (node.boss === "kafka" || node.form) && node.status !== "approved");
    if (kafka && options.includes("weekend")) return "weekend";
    if (kafka && options.includes("cc")) return "cc";
    const architect = state.nodes.some((node) => node.boss === "architect" && node.status !== "approved" && !state.architectUsed);
    if (architect) {
      const cheap = ["rest", "reframe", "talk"].find((id) => options.includes(id));
      if (cheap) return cheap;
    }
    if (!state.schrodingerRevealed && state.nodes.some((node) => node.real) && options.includes("align")) return "align";
    if (blocks > 0 && options.includes("weekend")) return "weekend";
    if (blocks > 0 && state.sanity > 3 && options.includes("cc")) return "cc";
    if (blocks >= 2 && options.includes("align")) return "align";
    if (state.energy <= 4 && state.days > 1 && options.includes("rest")) return "rest";
    if (conflictOpen(state) && !state.conceptSwap && options.includes("reframe")) return "reframe";
    const hidden = state.nodes.some((node) => node.hidden && !node.revealed);
    if (hidden && options.includes("talk")) return "talk";
    return options.find((id) => !["nihil", "force", "corrupt", "hotfix", "talk"].includes(id))
      || options.find((id) => !["nihil", "force", "corrupt", "hotfix"].includes(id))
      || options[0];
  },
  report: (state, options) => (options.includes("nihil") ? "nihil" : strategies.good(state, options)),
  burnout: (state, options) => {
    if (options.includes("corrupt")) return "corrupt";
    if (options.includes("vp-attend")) return "vp-attend";
    if (options.includes("cc")) return "cc";
    if (options.includes("align")) return "align";
    if (options.includes("talk")) return "talk";
    return options.find((id) => !["decline", "rest", "nihil", "force", "weekend", "hotfix"].includes(id)) || options[0];
  },
  explore: (state, options) => (options.includes("talk") ? "talk" : options[0]),
};

function printReport() {
for (const [name, pick] of Object.entries(strategies)) {
  const runs = name.startsWith("random") ? 200 : 12;
  const rows = [];
  for (let i = 0; i < runs; i += 1) rows.push(campaign(pick, ["color", "typo", "period"][i % 3], rng(1000 + i)));
  const avg = rows.reduce((sum, row) => sum + row.actions, 0) / runs;
  const levels = {};
  const ends = {};
  let softlocks = 0;
  for (const row of rows) {
    levels[row.max] = (levels[row.max] || 0) + 1;
    ends[row.end] = (ends[row.end] || 0) + 1;
    softlocks += row.softlock;
  }
  console.log(name.padEnd(16), "runs", runs, "avgActions", avg.toFixed(2), "maxLevel", JSON.stringify(levels), "ends", JSON.stringify(ends), "softlocks", softlocks);
}

function hash(state) {
  return [
    state.levelId,
    state.train,
    state.days,
    state.energy,
    state.sanity,
    state.favor,
    state.audit,
    state.pendingChoice,
    state.conceptSwap,
    state.hand.join(","),
    state.nodes.map((node) => `${node.id}:${node.status}:${node.boss}:${node.form}`).join("|"),
  ].join("/");
}

function search(level, banned) {
  let expanded = 0;
  for (let seed = 1; seed <= 6; seed += 1) {
    const start = createRun(level, "typo", seed);
    let frontier = [start];
    const seen = new Set();
    for (let depth = 0; depth < 7 && frontier.length; depth += 1) {
      const next = [];
      for (const state of frontier) {
        for (const action of legalActions(state)) {
          if (banned.includes(action)) continue;
          const child = applyAction(state, action);
          expanded += 1;
          if (child.outcome && (child.outcome.kind === "level" || child.outcome.id === "absurd")) {
            return `win depth ${depth + 1} seed ${seed}`;
          }
          if (child.outcome) continue;
          const key = hash(child);
          if (seen.has(key)) continue;
          seen.add(key);
          if (seen.size < 4000) next.push(child);
        }
      }
      frontier = next;
    }
  }
  return `no win (${expanded} nodes)`;
}

for (const level of [1, 2, 3, 4]) {
  console.log(`L${level}`, "no-hotfix:", search(level, ["hotfix"]), "| hotfix-only:", search(level, ["weekend", "cc", "align", "talk", "nihil", "force", "corrupt"]));
}

const red = createRun(3, "typo", 1);
red.hand = ["hotfix", "reframe", "talk", "align"];
const failed = applyAction(red, "hotfix");
console.log(
  "failed hotfix L3: energy", red.energy, "->", failed.energy,
  "favor", red.favor, "->", failed.favor,
  "days", red.days, "->", failed.days,
  "canPlay hotfix after:", failed.hand.includes("hotfix") && failed.favor === red.favor && failed.energy >= red.energy - 1,
);

let early = 0;
let total = 0;
for (let i = 0; i < 200; i += 1) {
  const row = campaign(strategies.randomCardsOnly, "typo", rng(1000 + i));
  if (row.end === "absurd") {
    total += 1;
    if (row.max < 4) early += 1;
  }
}
console.log("absurd total", total, "reached before L4 (L1 businessCut skip)", early);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) printReport();
