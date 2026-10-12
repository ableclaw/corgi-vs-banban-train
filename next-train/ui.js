import {
  applyAction,
  cardView,
  CHANGES,
  conflictOpen,
  continueLevel,
  createRun,
  currentBlocker,
  HELP,
  legalActions,
  nodeBrief,
  outcomeReport,
} from "./engine.js";

let W = 426;
let H = 240;
let portrait = false;
const canvas = document.querySelector("#screen");
let ctx = canvas.getContext("2d");

const params = new URLSearchParams(location.search);
const debug = params.has("debug");
let seed = Math.max(1, Number(params.get("seed")) || 1);
let state = null;
let scene = "title";
let backScene = "title";
let cursor = 0;
let hover = -1;
let helpPage = 0;
let muted = false;
let audioCtx = null;
let fontReady = false;
let shake = 0;
let flash = 0;
let trainAnim = 0;
let frame = 0;
let logSeen = 0;
let lineQueue = [];
let speech = "";
let speechAt = 0;
let nextLevel = null;
let popups = [];
const hot = {};
const anchor = {};
const hits = [];

const INK = "#d7f5df";
const DIM = "#6f8f7c";
const BG = "#081018";
const PANEL = "#102030";
const GOLD = "#f0d060";
const RED = "#e07058";
const GREEN = "#78d878";
const BLUE = "#70c8f0";
const PURPLE = "#c080e0";
const FAVOR = "#f0b050";

const HELP_PAGES = [
  [...HELP],
  [
    "方向键移动。Enter 或 Z 确认，X 返回。",
    "对局里按 Esc 或 P 打开这份说明，再按一次关掉。",
    "M 静音。F 全屏。标题和这份说明里也能切全屏。",
    "点卡片、菜单和对话框就能操作。",
    "手机上先点一下看全文，再点一次确认。",
    "选中的牌会预告打出后的数值。",
    "灰色的牌写着为什么现在不能打。",
    "亮着的格子是当前卡点。",
  ],
];

const SHORT = {
  talk: "问出要求或人情+1",
  align: "指出真人或并一格",
  cc: "通过当前节点",
  reframe: "解开特批",
  hotfix: "跳过普通签字",
  weekend: "通过当前卡点",
  rest: "补精力，不签字",
  nihil: "结束这一局",
  force: "审批会被打回",
  corrupt: "进入黑化结局",
  decline: "理智回到至少 5",
  "vp-attend": "通过并再放行一格",
  "vp-delegate": "没有决议",
  "vp-skip": "节点还在",
};

document.fonts.load("10px PixelCN").then(() => {
  fontReady = true;
});

function tone(freq, dur = 0.06, type = "square", vol = 0.045) {
  if (muted) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = vol;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
  osc.stop(audioCtx.currentTime + dur);
}

function fitCanvas() {
  const view = window.visualViewport;
  const vw = view?.width || window.innerWidth;
  const vh = view?.height || window.innerHeight;
  portrait = vh > vw;
  W = portrait ? 240 : 426;
  H = portrait ? 426 : 240;
  if (canvas.width !== W || canvas.height !== H) {
    canvas.width = W;
    canvas.height = H;
    ctx = canvas.getContext("2d");
  }
  ctx.imageSmoothingEnabled = false;
  const scale = Math.min(vw / W, vh / H);
  if (!Number.isFinite(scale) || scale <= 0) return;
  const integer = Math.floor(scale);
  const chosen = integer >= 1 && integer / scale >= 0.92 ? integer : scale;
  canvas.style.width = `${Math.max(1, Math.floor(W * chosen))}px`;
  canvas.style.height = `${Math.max(1, Math.floor(H * chosen))}px`;
}

function blit(x, y, rows, map, scale = 3) {
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i += 1) {
      const color = map[row[i]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x + i * scale), Math.round(y + j * scale), scale, scale);
    }
  });
}

const PLAYER = [
  "......1111......",
  "....11111111....",
  "....11222211....",
  ".....12e2e1.....",
  ".....122221.....",
  "....13333331....",
  "...1334444331...",
  "...1334444331...",
  "...1333333331...",
  "....13333331....",
  ".....133331.....",
  "......1..1......",
  ".....55..55.....",
  "....555..555....",
  "....55....55....",
  "...55......55...",
  "..55........55..",
  "................",
];
const TRAIN = [
  "..........66666666",
  "........6677777777",
  "......666666666666",
  "....66668888666666",
  "..6677776666667777",
  "666666666666666666",
  "55..55..55..55..55",
];
const SPRITE = {
  mob: [
    ".....111111.....",
    "...1111111111...",
    "...112e2e2111...",
    "....12222221....",
    "...1333333331...",
    "..133344443331..",
    "..133344443331..",
    "...1333333331...",
    "....133..331....",
    "...155....551...",
    "..1555....5551..",
    "..155......551..",
    ".15..........51.",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  kafka: [
    "....77777777....",
    "...7111111117...",
    "..71112e2e1117..",
    "..711122222117..",
    ".77111111111177.",
    ".77113333311177.",
    "7771133..3311777",
    "7771133..3311777",
    ".77113333311177.",
    "..711111111117..",
    "...7111..1117...",
    "....71....17....",
    "...77......77...",
    "..777......777..",
    "..77........77..",
    ".77..........77.",
    "................",
    "................",
  ],
  schrodinger: [
    "..5..........5..",
    "..55...55...55..",
    ".55555555555555.",
    ".55555e55e55555.",
    ".55555555555555.",
    "..555599995555..",
    "...5555555555...",
    "....55555555....",
    ".....555555.....",
    "......5555......",
    ".......55.......",
    "......5..5......",
    ".....55..55.....",
    "....55....55....",
    "...55......55...",
    "................",
    "................",
    "................",
  ],
  architect: [
    "....11111111....",
    "...1111111111...",
    "..111111111111..",
    "..11114e4e1111..",
    "..111144444111..",
    "...1114444111...",
    "....11444411....",
    "....11444411....",
    "...1114444111...",
    "..111114441111..",
    ".11111144411111.",
    ".111111..111111.",
    "..1111....1111..",
    "..111......111..",
    ".111........111.",
    "................",
    "................",
    "................",
  ],
  vp: [
    ".....666666.....",
    "...6666666666...",
    "...662e2e2666...",
    "....62222226....",
    "...6777777776...",
    "..677711117776..",
    "..677711117776..",
    "...6777777776...",
    "....67777776....",
    ".....67..76.....",
    "....155..551....",
    "...1555..5551...",
    "...155....551...",
    "..15........51..",
    "................",
    "................",
    "................",
    "................",
  ],
  audit: [
    "................",
    "...2222222222...",
    "..222222222222..",
    ".22222222222222.",
    ".2222xxxxxx2222.",
    ".2222x2222x2222.",
    ".2222x2ee2x2222.",
    ".2222x2222x2222.",
    ".2222xxxxxx2222.",
    ".22222222222222.",
    "..222222222222..",
    "...2222222222...",
    ".....22..22.....",
    "....222..222....",
    "...22......22...",
    "..22........22..",
    "................",
    "................",
  ],
};
const MAPS = {
  player: { 1: "#3a2418", 2: "#f0c8a0", 3: "#3878c0", 4: "#d8efe0", 5: "#1c3050", e: "#203040" },
  train: { 6: "#d0d8e0", 7: "#70c8f0", 5: "#202830", 8: "#f0d060" },
  mob: { 1: "#3a2418", 2: "#f0c8a0", 3: "#c08040", 4: "#f0d8b0", 5: "#5a4030", e: "#203040" },
  kafka: { 1: "#d8efe0", 2: "#f0c8a0", 3: "#2f6b45", 7: "#e8d060", e: "#102018" },
  schrodinger: { 5: "#d8c8f0", 9: "#6848a0", e: "#203040" },
  architect: { 1: "#202830", 4: "#8aa0b8", e: "#f0d060" },
  vp: { 2: "#f0c8a0", 6: "#f0d060", 7: "#8a3040", 1: "#f4e2a8", 5: "#1c3050", e: "#203040" },
  audit: { 2: "#e07058", x: "#fff4e0", e: "#3a1820" },
};
const ICONS = {
  talk: ["..1111..", ".1....1.", ".1.22.1.", ".1....1.", "..1111..", "...11...", "....1...", "........"],
  align: ["11....11", ".1....1.", "..1..1..", "...11...", "...11...", "..1..1..", ".1....1.", "11....11"],
  cc: ["...11...", "..1111..", ".11..11.", "11....11", "...11...", "...11...", "...11...", "...11..."],
  reframe: ["1111....", "1..1....", "1..11111", "1....1.1", ".11111.1", "....1..1", "....1111", "........"],
  hotfix: [".22222..", "2.111.2.", "2.1..12.", "2.111.2.", ".22222..", "...1....", "..111...", "........"],
  weekend: ["...22...", "..2112..", ".211112.", "21111112", ".211112.", "..2222..", "....1...", "...1...."],
  rest: ["11...11.", ".1...1..", "11...11.", "........", "..222...", ".2...2..", "2.....2.", "........"],
  nihil: ["..1111..", ".1....1.", ".1.11.1.", ".1.11.1.", ".1....1.", "..1111..", "........", "........"],
  force: ["11111111", "1......1", "1.2222.1", "1.2..2.1", "1.2222.1", "1......1", "11111111", "........"],
};
const ICON_MAP = { 1: "#d7f5df", 2: "#f0d060" };

function useFont() {
  ctx.font = "10px PixelCN, sans-serif";
  ctx.textBaseline = "top";
}

function text(value, x, y, color = INK) {
  useFont();
  ctx.fillStyle = color;
  ctx.fillText(value, Math.round(x), Math.round(y));
}

function wrap(value, width) {
  useFont();
  const lines = [];
  let line = "";
  const limit = Math.max(10, width);
  for (const ch of String(value)) {
    if (ctx.measureText(line + ch).width > limit && line) {
      lines.push(line);
      line = ch;
    } else line += ch;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function bar(x, y, w, h, value, max, color) {
  ctx.fillStyle = "#183028";
  ctx.fillRect(x, y, w, h);
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, Math.round(w * ratio), h);
  ctx.strokeStyle = "#2a4458";
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function hit(x, y, w, h, index, kind) {
  hits.push({ x, y, w, h, index, kind });
}

function remember(key, x, y) {
  anchor[key] = { x, y };
}

function fullscreenOn() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement);
}

function fullscreenLabel() {
  return fullscreenOn() ? "退出全屏" : "全屏";
}

function toggleFullscreen() {
  const root = document.documentElement;
  const req = root.requestFullscreen || root.webkitRequestFullscreen;
  const exit = document.exitFullscreen || document.webkitExitFullscreen;
  if (fullscreenOn()) {
    if (exit) exit.call(document).catch(() => {});
  } else if (req) req.call(root).catch(() => {});
  tone(520, 0.05);
}

function extraView(id) {
  if (id === "nihil") {
    return {
      id,
      name: "合规报告",
      effect: "结束这一局，进入虚无结局。几个月没有东西上车。",
      cost: "不消耗",
      reason: "",
      playable: true,
    };
  }
  return {
    id,
    name: "强行合入",
    effect: "安全要日志、合规不让记。强行合入会把审批打回。",
    cost: "不消耗",
    reason: "",
    playable: true,
  };
}

function items() {
  if (scene === "title") {
    return [
      { id: "start", name: "开始游戏", playable: true },
      { id: "help", name: "玩法说明", playable: true },
      { id: "full", name: fullscreenLabel(), playable: true },
    ];
  }
  if (scene === "station") {
    return CHANGES.map((change) => ({
      id: change.id,
      name: change.title,
      effect: change.blurb,
      diff: change.diff,
      playable: true,
    }));
  }
  if (scene === "result") {
    return [{ id: "ok", name: state?.outcome?.kind === "level" ? "进入下一关" : "再来一局", playable: true }];
  }
  if (!state) return [];
  if (state.pendingChoice === "corrupt") {
    return [
      { id: "corrupt", name: "我来加一道卡点", cost: "进入黑化", effect: "这局在这里结束", playable: true },
      { id: "decline", name: "我还是要上车", cost: "理智回到至少 5", effect: "拒绝黑化，这班还能继续", playable: true },
    ];
  }
  if (state.pendingChoice === "vp") {
    return [
      { id: "vp-attend", name: "去开会", cost: "理智 -1 · 天数 -1", effect: "通过 VP，再放行一个节点", playable: state.sanity > 0, reason: state.sanity > 0 ? "" : "理智不足" },
      { id: "vp-delegate", name: "助理代开", cost: "理智 -1", effect: "没有决议", playable: true },
      { id: "vp-skip", name: "这个会我不去", cost: "不消耗", effect: "节点还在", playable: true },
    ];
  }
  const cards = state.hand.map((id, index) => ({ ...cardView(state, id), index }));
  if (conflictOpen(state)) cards.push(extraView("nihil"), extraView("force"));
  return cards;
}

function clampCursor() {
  const list = items();
  if (!list.length) {
    cursor = 0;
    return;
  }
  if (cursor >= list.length) cursor = list.length - 1;
  if (cursor < 0) cursor = 0;
}

function queueLines(fresh) {
  if (!state) return;
  const start = fresh ? Math.max(0, state.log.length - 2) : logSeen;
  for (let i = start; i < state.log.length; i += 1) {
    lineQueue.push(`${state.log[i].who}：${state.log[i].text}`);
  }
  logSeen = state.log.length;
  pumpSpeech();
}

function pumpSpeech() {
  if (speech && speechAt < speech.length) return;
  if (!speech && lineQueue.length) {
    speech = lineQueue.shift();
    speechAt = 0;
  }
}

function skipSpeech() {
  if (speech && speechAt < speech.length) {
    speechAt = speech.length;
    return true;
  }
  if (lineQueue.length) {
    speech = lineQueue.shift();
    speechAt = 0;
    return true;
  }
  return false;
}

function begin(changeId, levelId = 1, nextSeed = seed) {
  seed = Math.max(1, Number(nextSeed) || 1);
  state = createRun(levelId, changeId, seed);
  scene = "battle";
  cursor = 0;
  hover = -1;
  logSeen = 0;
  speech = "";
  lineQueue = [];
  nextLevel = null;
  popups = [];
  queueLines(true);
  tone(523, 0.08);
}

function markHot(key) {
  hot[key] = 28;
}

function commit(actionId) {
  if (!state) return;
  const before = {
    energy: state.energy,
    sanity: state.sanity,
    favor: state.favor,
    days: state.days,
    audit: state.audit,
    train: state.train,
  };
  const next = applyAction(state, actionId);
  if (next === state) {
    tone(98, 0.08);
    const view = cardView(state, actionId);
    speech = view.reason || "现在不能这么做";
    speechAt = speech.length;
    return;
  }
  state = next;
  for (const key of Object.keys(before)) {
    if (key === "train") continue;
    const delta = state[key] - before[key];
    if (!delta) continue;
    markHot(key);
    const spot = anchor[key] || { x: 40, y: 8 };
    popups.push({
      x: spot.x,
      y: spot.y,
      text: `${delta > 0 ? "+" : ""}${delta}`,
      t: 42,
      color: delta < 0 ? RED : GOLD,
    });
  }
  if (state.energy < before.energy || state.sanity < before.sanity) {
    shake = 8;
    flash = 5;
    tone(150, 0.09);
  } else tone(660, 0.05);
  if (state.train !== before.train) trainAnim = 40;
  queueLines(false);
  cursor = 0;
  hover = -1;
  if (state.outcome?.kind === "level") nextLevel = continueLevel(state);
  if (state.outcome) scene = "result";
}

function confirm() {
  const list = items();
  const item = list[cursor];
  if (scene === "help") {
    helpPage = (helpPage + 1) % HELP_PAGES.length;
    tone(440, 0.04);
    return;
  }
  if ((scene === "battle" || scene === "result") && skipSpeech()) {
    tone(330, 0.03);
    return;
  }
  if (!item) return;
  if (scene === "title") {
    if (item.id === "help") openHelp();
    else if (item.id === "full") toggleFullscreen();
    else {
      scene = "station";
      cursor = 0;
      tone(494, 0.06);
    }
    return;
  }
  if (scene === "station") {
    begin(item.id, 1, seed);
    return;
  }
  if (scene === "result") {
    if (nextLevel) {
      state = nextLevel;
      nextLevel = null;
      scene = "battle";
      cursor = 0;
      hover = -1;
      logSeen = 0;
      speech = "";
      lineQueue = [];
      queueLines(true);
      tone(587, 0.08);
    } else {
      state = null;
      scene = "title";
      cursor = 0;
      hover = -1;
      speech = "";
      tone(220, 0.06);
    }
    return;
  }
  if (item.playable === false) {
    tone(98, 0.08);
    speech = item.reason || "现在不能这么做";
    speechAt = speech.length;
    return;
  }
  commit(item.id);
}

function openHelp() {
  if (scene !== "help") backScene = scene;
  scene = "help";
  helpPage = 0;
  tone(392, 0.05);
}

function back() {
  if (scene === "help") {
    scene = backScene || "title";
    tone(196, 0.05);
    return;
  }
  if (speech || lineQueue.length) {
    speech = "";
    speechAt = 0;
    lineQueue = [];
    return;
  }
  if (scene === "station" || scene === "result") {
    state = null;
    nextLevel = null;
    scene = "title";
    cursor = 0;
    hover = -1;
  }
}

function move(dx, dy) {
  if (scene === "title" && dx) {
    seed = Math.max(1, seed + dx);
    tone(300, 0.03);
    return;
  }
  if (scene === "help") {
    const step = dy || dx;
    if (!step) return;
    helpPage = Math.max(0, Math.min(HELP_PAGES.length - 1, helpPage + step));
    tone(240, 0.02, "square", 0.03);
    return;
  }
  const list = items();
  if (!list.length) return;
  const step = dx || dy;
  if (!step) return;
  cursor = (cursor + step + list.length * 4) % list.length;
  tone(240, 0.02, "square", 0.03);
}

function press(key) {
  if (key === "up") move(0, -1);
  else if (key === "down") move(0, 1);
  else if (key === "left") move(-1, 0);
  else if (key === "right") move(1, 0);
  else if (key === "a") confirm();
  else if (key === "b") back();
  else if (key === "start" || key === "p") {
    if (scene === "help") back();
    else openHelp();
  } else if (key === "select" || key === "m") {
    muted = !muted;
    if (!muted) tone(880, 0.05);
  } else if (key === "f") toggleFullscreen();
}

const KEYS = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  Enter: "a",
  z: "a",
  Z: "a",
  x: "b",
  X: "b",
  p: "p",
  P: "p",
  m: "m",
  M: "m",
  f: "f",
  F: "f",
  s: "start",
  S: "start",
};
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    if (scene === "help" || scene === "station" || scene === "result" || speech || lineQueue.length) back();
    else openHelp();
    return;
  }
  const key = KEYS[event.key];
  if (!key) return;
  event.preventDefault();
  press(key);
});

function pointOf(event) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}

function hitAt(p) {
  for (let i = hits.length - 1; i >= 0; i -= 1) {
    const box = hits[i];
    if (p.x >= box.x && p.y >= box.y && p.x < box.x + box.w && p.y < box.y + box.h) return box;
  }
  return null;
}

canvas.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  canvas.focus();
  const p = pointOf(event);
  if (!p) return;
  const box = hitAt(p);
  if (!box) return;
  if (box.kind === "seed") {
    seed = Math.max(1, seed + box.index);
    tone(300, 0.03);
    return;
  }
  if (box.kind === "full") {
    toggleFullscreen();
    return;
  }
  if (box.kind === "back") {
    back();
    return;
  }
  if (box.kind === "mute") {
    press("m");
    return;
  }
  if (box.kind === "helpkey") {
    press("p");
    return;
  }
  if (box.kind === "confirmkey") {
    confirm();
    return;
  }
  if (box.kind === "speech") {
    if (skipSpeech()) tone(330, 0.03);
    return;
  }
  if (box.kind === "helppage") {
    confirm();
    return;
  }
  const touch = event.pointerType === "touch";
  if (touch && cursor !== box.index) {
    cursor = box.index;
    tone(240, 0.02, "square", 0.03);
    return;
  }
  cursor = box.index;
  confirm();
});
canvas.addEventListener("pointermove", (event) => {
  if (event.pointerType === "touch") return;
  const p = pointOf(event);
  if (!p) return;
  const box = hitAt(p);
  hover = box && box.kind === "item" ? box.index : -1;
});
canvas.addEventListener("pointerleave", () => {
  hover = -1;
});
window.addEventListener("resize", fitCanvas);
window.visualViewport?.addEventListener("resize", fitCanvas);
window.addEventListener("orientationchange", fitCanvas);
document.addEventListener("fullscreenchange", fitCanvas);

function panel(x, y, w, h, fill = PANEL) {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#2a4458";
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function focusedIndex() {
  const list = items();
  if (hover >= 0 && hover < list.length) return hover;
  return cursor;
}

function previewLine(item) {
  if (!item?.preview || !state) return "";
  const p = item.preview;
  return `打出后 精力 ${p.energy}/${state.energyMax} 理智 ${p.sanity}/${state.sanityMax} 人情 ${p.favor}/${state.favorMax} 天数 ${p.days} 审计 ${p.audit}/${state.auditMax}`;
}

function costParts(cost) {
  return String(cost || "").split(" · ").map((part) => part.trim()).filter(Boolean);
}

function pipColor(part) {
  if (part.includes("精力")) return BLUE;
  if (part.includes("理智")) return PURPLE;
  if (part.includes("人情")) return FAVOR;
  if (part.includes("天数")) return GREEN;
  return DIM;
}

function pipLabel(part) {
  return part.replace("精力", "").replace("理智", "").replace("人情", "").replace("天数", "").trim();
}

function drawPips(cost, x, y, maxW) {
  let cx = x;
  for (const part of costParts(cost)) {
    const label = pipLabel(part);
    const color = pipColor(part);
    useFont();
    const width = 8 + ctx.measureText(label).width + 4;
    if (cx + width > x + maxW) break;
    ctx.fillStyle = color;
    ctx.fillRect(cx, y + 2, 6, 6);
    text(label, cx + 8, y, color);
    cx += width;
  }
}

function cardLines(item, width) {
  if (item.playable === false && item.reason) {
    const lines = wrap(item.reason, width);
    return lines.slice(0, 2);
  }
  const full = item.effect || "";
  if (full && ctx.measureText(full).width <= width) return [full];
  const short = SHORT[item.id] || full || item.name;
  if (!short) return [];
  if (ctx.measureText(short).width <= width) return [short];
  return wrap(short, width).slice(0, 2);
}

function drawIcon(id, x, y) {
  blit(x, y, ICONS[id] || ICONS.talk, ICON_MAP, 1);
}

function hudHeight() {
  return portrait ? 64 : 38;
}

function drawHud() {
  const height = hudHeight();
  if (!state) return height;
  ctx.fillStyle = "#0c1a24";
  ctx.fillRect(0, 0, W, height);
  ctx.fillStyle = "#2a4458";
  ctx.fillRect(0, height - 1, W, 1);
  const dayColor = state.days <= 2 ? RED : GREEN;
  if (portrait) {
    text(`第${state.levelId}关 ${state.levelName}`, 4, 2, hot.level ? GOLD : INK);
    remember("train", 156, 2);
    text(`班次 ${state.train}/${state.maxTrains}`, 150, 2, hot.train ? GOLD : INK);
    text("天数", 4, 16, hot.days ? GOLD : DIM);
    bar(28, 18, 48, 6, state.days, state.dayBudget, dayColor);
    remember("days", 80, 14);
    text(`${state.days}/${state.dayBudget}`, 80, 16, hot.days ? GOLD : INK);
    text("审计", 124, 16, hot.audit ? GOLD : DIM);
    bar(148, 18, 36, 6, state.audit, state.auditMax, RED);
    remember("audit", 188, 14);
    text(`${state.audit}/${state.auditMax}`, 188, 16, hot.audit ? GOLD : INK);
    const rows = [
      ["精力", state.energy, state.energyMax, BLUE, "energy", 28],
      ["理智", state.sanity, state.sanityMax, PURPLE, "sanity", 40],
      ["人情", state.favor, state.favorMax, FAVOR, "favor", 50],
    ];
    rows.forEach(([label, value, max, color, key, y]) => {
      text(label, 4, y, hot[key] ? GOLD : DIM);
      bar(28, y + 2, 120, 6, value, max, color);
      remember(key, 154, y);
      text(`${value}/${max}`, 154, y, hot[key] ? GOLD : INK);
    });
    return height;
  }
  text(`第${state.levelId}关 ${state.levelName}`, 4, 2, INK);
  remember("train", 360, 2);
  text(`班次 ${state.train}/${state.maxTrains}`, 340, 2, hot.train ? GOLD : INK);
  text("天数", 4, 16, hot.days ? GOLD : DIM);
  bar(28, 18, 70, 6, state.days, state.dayBudget, dayColor);
  remember("days", 102, 14);
  text(`${state.days}/${state.dayBudget}`, 102, 16, hot.days ? GOLD : INK);
  text("审计", 150, 16, hot.audit ? GOLD : DIM);
  bar(174, 18, 52, 6, state.audit, state.auditMax, RED);
  remember("audit", 230, 14);
  text(`${state.audit}/${state.auditMax}`, 230, 16, hot.audit ? GOLD : INK);
  const cols = [
    ["精力", state.energy, state.energyMax, BLUE, "energy", 4],
    ["理智", state.sanity, state.sanityMax, PURPLE, "sanity", 148],
    ["人情", state.favor, state.favorMax, FAVOR, "favor", 292],
  ];
  cols.forEach(([label, value, max, color, key, x]) => {
    text(label, x, 26, hot[key] ? GOLD : DIM);
    bar(x + 24, 28, 52, 6, value, max, color);
    remember(key, x + 80, 24);
    text(`${value}/${max}`, x + 80, 26, hot[key] ? GOLD : INK);
  });
  return 38;
}

function actorKind(node) {
  if (!node) return "mob";
  if (node.boss && SPRITE[node.boss]) return node.boss;
  if (node.form) return "kafka";
  return "mob";
}

function trainSlot() {
  return portrait ? 28 : 40;
}

function drawActors(region) {
  const blocker = state ? currentBlocker(state) : null;
  const scale = region.h >= 56 ? 3 : 2;
  const sh = 18 * scale;
  const sw = 16 * scale;
  const ground = region.y + region.h - 4;
  const reserved = trainSlot();
  ctx.fillStyle = "#102018";
  ctx.fillRect(0, region.y, W, region.h);
  ctx.fillStyle = "#1a2830";
  ctx.fillRect(0, ground, W, 4);
  const bob = Math.floor(frame / 10) % 2 === 0 ? 0 : -1;
  const py = ground - sh + bob;
  blit(8, py, PLAYER, MAPS.player, scale);
  const kind = actorKind(blocker);
  const enemyBob = blocker && Math.floor(frame / 8) % 2 === 0 ? -2 : 0;
  const enemyX = W - sw - reserved - 6;
  blit(enemyX, ground - sh + enemyBob, SPRITE[kind], MAPS[kind] || MAPS.mob, scale);
  const name = blocker ? blocker.name : "没有卡点";
  const gapX = 8 + sw + 4;
  const gapW = Math.max(48, enemyX - gapX - 4);
  const lines = wrap(name, gapW);
  const nameY = region.y + 2;
  text("VS", gapX + gapW / 2 - 8, nameY, RED);
  lines.slice(0, 2).forEach((line, index) => {
    const tw = ctx.measureText(line).width;
    text(line, gapX + (gapW - tw) / 2, nameY + 12 + index * 12, GOLD);
  });
  if (state && state.days <= 2) text("即将发车", gapX + 4, ground - 14, RED);
}

function drawConflictButtons(area) {
  if (!area || !state || state.pendingChoice || !conflictOpen(state)) return;
  const list = items();
  const ids = ["nihil", "force"];
  const gap = 4;
  const bw = Math.floor((area.w - gap) / ids.length);
  let x = area.x;
  ids.forEach((id) => {
    const index = list.findIndex((item) => item.id === id);
    if (index < 0) return;
    const on = index === cursor || index === hover;
    panel(x, area.y, bw, area.h, on ? "#1c3a28" : "#0e1c28");
    if (on) {
      ctx.strokeStyle = GOLD;
      ctx.strokeRect(x + 1.5, area.y + 1.5, bw - 3, area.h - 3);
    }
    hit(x, area.y, bw, area.h, index, "item");
    text(list[index].name, x + 6, area.y + Math.max(2, Math.round((area.h - 10) / 2)), on ? GOLD : INK);
    x += bw + gap;
  });
}

function drawRail(y) {
  const blocker = currentBlocker(state);
  const nodes = state.nodes.filter((node) => node.status !== "read" || node.boss);
  ctx.fillStyle = "#4a4030";
  ctx.fillRect(8, y + 8, W - 56, 3);
  const span = Math.max(20, W - 70);
  const step = nodes.length ? span / nodes.length : 28;
  nodes.forEach((node, index) => {
    const x = 12 + index * step;
    const current = blocker && node.id === blocker.id;
    const bob = current && Math.floor(frame / 8) % 2 === 0 ? -2 : 0;
    const size = current ? 10 : 7;
    ctx.fillStyle = node.status === "approved" ? GREEN : current ? RED : "#d8efe0";
    ctx.fillRect(x, y + 4 + bob, size, size);
    if (node.boss || node.form) {
      ctx.fillStyle = GOLD;
      ctx.fillRect(x + 2, y + 6 + bob, 3, 3);
    }
  });
  const shift = state.days <= 2 ? 4 + Math.sin(frame / 4) * 2 : 0;
  const tx = W - trainSlot() - shift - (trainAnim ? Math.sin(frame / 2) * 2 : 0);
  blit(tx, y - 4, TRAIN, MAPS.train, portrait ? 1 : 2);
}

function drawWhy(y, height) {
  const blocker = currentBlocker(state);
  const brief = blocker ? nodeBrief(state, blocker).text : "当前没有卡住的格子。";
  const lines = wrap(brief, W - 12);
  const max = Math.max(1, Math.floor(height / 12));
  lines.slice(0, max).forEach((line, index) => {
    text(line, 6, y + index * 12, blocker ? GOLD : DIM);
  });
}

function detailLines(item, width) {
  if (!item) return [];
  const lines = [];
  if (item.playable === false && item.reason) {
    wrap(item.reason, width).forEach((t) => lines.push({ t, c: RED }));
  }
  if (item.effect) wrap(item.effect, width).forEach((t) => lines.push({ t, c: INK }));
  if (item.cost) wrap(`费用 ${item.cost}`, width).forEach((t) => lines.push({ t, c: DIM }));
  if (item.playable !== false && item.preview) {
    wrap(previewLine(item), width).forEach((t) => lines.push({ t, c: GOLD }));
  }
  return lines;
}

function drawSpeech(box) {
  panel(box.x, box.y, box.w, box.h, "#0e1c28");
  hit(box.x, box.y, box.w, box.h, 0, "speech");
  const typing = speech && speechAt < speech.length;
  const list = items();
  const item = list[focusedIndex()];
  const showDetail = !typing && item && (item.effect || item.reason || item.preview);
  let lines = [];
  if (showDetail && (hover >= 0 || cursor >= 0)) {
    lines = detailLines(item, box.w - 12);
  } else if (speech) {
    lines = wrap(speech.slice(0, speechAt), box.w - 12).map((t) => ({ t, c: INK }));
  } else if (state?.turns?.length) {
    const turn = state.turns[state.turns.length - 1];
    lines = wrap(`${turn.source} ${turn.text}`, box.w - 12).map((t) => ({ t, c: DIM }));
  }
  const max = Math.max(1, Math.floor((box.h - 6) / 12));
  lines.slice(0, max).forEach((line, index) => text(line.t, box.x + 6, box.y + 4 + index * 12, line.c));
}

function drawIconCard(item, index, x, y, w, h) {
  const on = index === cursor;
  const over = index === hover;
  const fill = item.playable === false ? "#161c1a" : on ? "#1c3a28" : "#102030";
  panel(x, y, w, h, fill);
  if (on || over) {
    ctx.strokeStyle = GOLD;
    ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  }
  hit(x, y, w, h, index, "item");
  ctx.save();
  ctx.beginPath();
  ctx.rect(x + 2, y + 2, w - 4, h - 4);
  ctx.clip();
  drawIcon(item.id, x + 4, y + 4);
  const nameColor = item.playable === false ? "#5d6b64" : on ? GOLD : INK;
  text(item.name, x + 16, y + 3, nameColor);
  drawPips(item.cost, x + 4, y + 16, w - 8);
  const lines = cardLines(item, w - 8);
  const color = item.playable === false ? RED : DIM;
  lines.forEach((line, lineIndex) => {
    const ly = y + 28 + lineIndex * 12;
    if (ly < y + h - 10) text(line, x + 4, ly, color);
  });
  ctx.restore();
}

function drawRowCard(item, index, x, y, w, h) {
  const on = index === cursor;
  const over = index === hover;
  const fill = item.playable === false ? "#161c1a" : on ? "#1c3a28" : "#102030";
  panel(x, y, w, h, fill);
  if (on || over) {
    ctx.strokeStyle = GOLD;
    ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  }
  hit(x, y, w, h, index, "item");
  drawIcon(item.id, x + 4, y + 4);
  const nameColor = item.playable === false ? "#5d6b64" : on ? GOLD : INK;
  text(item.name, x + 16, y + 3, nameColor);
  const lines = cardLines(item, w - 20);
  const color = item.playable === false ? RED : DIM;
  if (lines[0]) text(lines[0], x + 16, y + 16, color);
  if (h >= 40 && lines[1]) text(lines[1], x + 16, y + 28, color);
  useFont();
  const pipW = Math.min(120, w / 2);
  drawPips(item.cost, x + w - pipW - 4, y + 3, pipW);
}

function drawHand(area, list) {
  const main = list.filter((item) => item.id !== "nihil" && item.id !== "force");
  if (portrait || main.length > 4) {
    const rowH = Math.floor(area.h / Math.max(1, main.length));
    main.forEach((item) => {
      const index = list.indexOf(item);
      drawRowCard(item, index, area.x, area.y + index * rowH, area.w, Math.max(16, rowH - 3));
    });
    return;
  }
  const gap = 4;
  const cw = Math.floor((area.w - gap * (main.length - 1)) / Math.max(1, main.length));
  main.forEach((item) => {
    const index = list.indexOf(item);
    drawIconCard(item, index, area.x + index * (cw + gap), area.y, cw, area.h);
  });
}

function drawChoiceList(area, list) {
  const rowH = Math.floor(area.h / Math.max(1, list.length));
  list.forEach((item, index) => {
    const y = area.y + index * rowH;
    const h = Math.max(16, rowH - 3);
    const on = index === cursor || index === hover;
    const fill = item.playable === false ? "#161c1a" : on ? "#1c3a28" : "#102030";
    panel(area.x, y, area.w, h, fill);
    if (on) {
      ctx.strokeStyle = GOLD;
      ctx.strokeRect(area.x + 1.5, y + 1.5, area.w - 3, h - 3);
    }
    hit(area.x, y, area.w, h, index, "item");
    const nameColor = item.playable === false ? "#5d6b64" : on ? GOLD : INK;
    text(item.name, area.x + 6, y + 3, nameColor);
    const body = item.playable === false ? item.reason : [item.cost, item.effect].filter(Boolean).join(" · ");
    if (body) {
      const lines = wrap(body, area.w - 12);
      text(lines[0], area.x + 6, y + 16, item.playable === false ? RED : DIM);
      if (h >= 40 && lines[1]) text(lines[1], area.x + 6, y + 28, item.playable === false ? RED : DIM);
    }
  });
}

function battleLayout() {
  const hint = 14;
  const hud = hudHeight();
  const pending = !!state?.pendingChoice;
  const conflict = !!(state && !pending && conflictOpen(state));
  if (portrait) {
    const actorH = 78;
    const railH = 16;
    const whyH = 24;
    const speechH = pending ? 36 : 48;
    const conflictH = conflict ? 18 : 0;
    const actorY = hud;
    const railY = actorY + actorH;
    const whyY = railY + railH;
    const speechY = whyY + whyH;
    const conflictY = speechY + speechH;
    const menuY = conflictY + conflictH;
    return {
      actor: { y: actorY, h: actorH },
      railY,
      why: { y: whyY, h: whyH },
      speech: { x: 4, y: speechY, w: W - 8, h: speechH },
      conflict: conflict ? { x: 4, y: conflictY, w: W - 8, h: conflictH } : null,
      menu: { x: 4, y: menuY, w: W - 8, h: H - hint - menuY },
      pending,
    };
  }
  const menuH = pending ? 70 : 52;
  const speechH = 36;
  const whyH = 24;
  const railH = 16;
  const menuY = H - hint - menuH;
  const speechY = menuY - speechH;
  const whyY = speechY - whyH;
  const railY = whyY - railH;
  return {
    actor: { y: hud, h: Math.max(36, railY - hud) },
    railY,
    why: { y: whyY, h: whyH },
    speech: { x: 4, y: speechY, w: W - 8, h: speechH },
    conflict: null,
    menu: { x: 4, y: menuY, w: W - 8, h: menuH },
    pending,
  };
}

function drawBattle() {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  drawHud();
  const layout = battleLayout();
  drawActors(layout.actor);
  if (layout.conflict) drawConflictButtons(layout.conflict);
  else if (!portrait && state && !state.pendingChoice && conflictOpen(state)) {
    const width = 164;
    const x = Math.max(8, Math.round((W - trainSlot()) / 2 - width / 2));
    drawConflictButtons({ x, y: layout.actor.y + layout.actor.h - 22, w: width, h: 16 });
  }
  drawRail(layout.railY);
  drawWhy(layout.why.y, layout.why.h);
  drawSpeech(layout.speech);
  const list = items();
  if (layout.pending) drawChoiceList(layout.menu, list);
  else drawHand(layout.menu, list);
}

function drawTitle() {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#102018";
  ctx.fillRect(0, portrait ? 150 : 150, W, portrait ? 40 : 28);
  ctx.fillStyle = "#4a4030";
  ctx.fillRect(0, portrait ? 188 : 176, W, 3);
  const trainScale = portrait ? 4 : 5;
  blit(portrait ? 48 : 18, portrait ? 78 : 86, TRAIN, MAPS.train, trainScale);
  const tx = portrait ? 16 : 168;
  text("下一班火车", tx, portrait ? 36 : 28, GOLD);
  text("把一行改动送上版本火车", tx, portrait ? 52 : 44, INK);
  text("初级工程师的审批战", tx, portrait ? 68 : 60, DIM);
  const seedY = portrait ? 210 : 92;
  text("种子", tx, seedY, DIM);
  const seedLabel = `${seed}`;
  text(seedLabel, tx + 28, seedY, INK);
  panel(tx + 64, seedY - 2, 16, 14, "#102030");
  text("<", tx + 68, seedY, GOLD);
  hit(tx + 64, seedY - 2, 16, 14, -1, "seed");
  panel(tx + 84, seedY - 2, 16, 14, "#102030");
  text(">", tx + 88, seedY, GOLD);
  hit(tx + 84, seedY - 2, 16, 14, 1, "seed");
  const list = items();
  const my = portrait ? 250 : 124;
  list.forEach((item, index) => {
    const y = my + index * 28;
    const on = index === cursor || index === hover;
    panel(tx, y, portrait ? 208 : 220, 24, on ? "#1c3a28" : "#102030");
    if (on) {
      ctx.strokeStyle = GOLD;
      ctx.strokeRect(tx + 1.5, y + 1.5, (portrait ? 208 : 220) - 3, 21);
    }
    hit(tx, y, portrait ? 208 : 220, 24, index, "item");
    text(item.name, tx + 8, y + 6, on ? GOLD : INK);
  });
}

function drawStation() {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  text("车站", 8, 4, GOLD);
  panel(W - 52, 4, 44, 16, "#102030");
  text("返回", W - 44, 6, DIM);
  hit(W - 52, 4, 44, 16, 0, "back");
  text("选一行改动。三种开头不一样。", 8, 20, INK);
  text(`种子 ${seed}`, portrait ? 8 : 250, portrait ? 34 : 4, DIM);
  const list = items();
  const top = portrait ? 48 : 36;
  const gap = 4;
  if (portrait) {
    const ch = Math.floor((H - 14 - top - gap * 2) / 3);
    list.forEach((item, index) => {
      const y = top + index * (ch + gap);
      drawChangeCard(item, index, 4, y, W - 8, ch - 2);
    });
    return;
  }
  const cw = Math.floor((W - 8 - gap * 2) / 3);
  list.forEach((item, index) => {
    drawChangeCard(item, index, 4 + index * (cw + gap), top, cw, H - 14 - top - 4);
  });
}

function drawChangeCard(item, index, x, y, w, h) {
  const on = index === cursor || index === hover;
  panel(x, y, w, h, on ? "#1c3a28" : "#102030");
  if (on) {
    ctx.strokeStyle = GOLD;
    ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  }
  hit(x, y, w, h, index, "item");
  text(item.name, x + 6, y + 6, on ? GOLD : INK);
  let lineY = y + 22;
  wrap(item.effect || "", w - 12).forEach((line) => {
    if (lineY > y + h - 14) return;
    text(line, x + 6, lineY, INK);
    lineY += 12;
  });
  lineY += 4;
  String(item.diff || "").split("\n").forEach((line) => {
    if (lineY > y + h - 14) return;
    text(line, x + 6, lineY, line.startsWith("+") ? GREEN : DIM);
    lineY += 12;
  });
}

function drawHelp() {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  text("玩法说明", 8, 6, GOLD);
  text(`${helpPage + 1}/${HELP_PAGES.length}`, W - 36, 6, DIM);
  hit(8, 22, W - 16, H - 64, 0, "helppage");
  let y = 24;
  const lines = HELP_PAGES[helpPage].flatMap((line) => wrap(line, W - 16));
  for (const line of lines) {
    if (y > H - 48) break;
    text(line, 8, y, INK);
    y += 14;
  }
  const by = H - 32;
  panel(8, by, 72, 16, "#102030");
  text("返回", 28, by + 3, INK);
  hit(8, by, 72, 16, 0, "back");
  panel(88, by, 96, 16, "#102030");
  text(fullscreenLabel(), 100, by + 3, GOLD);
  hit(88, by, 96, 16, 0, "full");
}

function drawResult() {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  const hud = drawHud();
  const report = state.outcome?.kind === "level"
    ? {
      title: "这关过了",
      cause: `下一关是${nextLevel?.levelName || "下一关"}。精力 ${nextLevel?.energy}/${nextLevel?.energyMax}，理智 ${nextLevel?.sanity}/${nextLevel?.sanityMax}，人情 ${nextLevel?.favor}/${nextLevel?.favorMax}。`,
      tip: "过关会补一点精力、理智和人情。",
    }
    : outcomeReport(state);
  let y = hud + 8;
  text(report.title, 8, y, GOLD);
  y += 16;
  for (const line of wrap(report.cause, W - 16)) {
    text(line, 8, y, INK);
    y += 12;
  }
  y += 6;
  for (const line of wrap(`提示：${report.tip}`, W - 16)) {
    text(line, 8, y, DIM);
    y += 12;
  }
  if (speech) {
    y += 4;
    wrap(speech.slice(0, speechAt), W - 16).slice(0, 3).forEach((line) => {
      text(line, 8, y, "#9ad0c8");
      y += 12;
    });
  }
  y += 8;
  const list = items();
  const item = list[0];
  if (!item) return;
  const bw = Math.min(180, W - 16);
  panel(8, y, bw, 22, cursor === 0 || hover === 0 ? "#1c3a28" : "#102030");
  text(item.name, 16, y + 6, GOLD);
  hit(8, y, bw, 22, 0, "item");
}

function drawHint() {
  const y = H - 13;
  ctx.fillStyle = "#05070a";
  ctx.fillRect(0, y - 1, W, 14);
  const bits = [
    { t: "方向", kind: "" },
    { t: "确认Z", kind: "confirmkey" },
    { t: "返回X", kind: "back" },
    { t: "说明P", kind: "helpkey" },
    { t: muted ? "有声M" : "静音M", kind: "mute" },
  ];
  let x = 4;
  for (const bit of bits) {
    useFont();
    const w = ctx.measureText(bit.t).width + 8;
    const color = bit.kind === "mute" && muted ? RED : DIM;
    text(bit.t, x, y, color);
    if (bit.kind) hit(x - 2, y - 2, w, 14, 0, bit.kind);
    x += w;
    if (x > W - 8) break;
  }
}

function drawPopups() {
  for (const popup of popups) {
    text(popup.text, popup.x, popup.y - (42 - popup.t) / 3, popup.color);
  }
}

function frameTick() {
  fitCanvas();
  hits.length = 0;
  frame += 1;
  if (speech && speechAt < speech.length && frame % 2 === 0) {
    speechAt += 1;
    if (speechAt % 3 === 0) tone(520, 0.015, "square", 0.02);
  }
  pumpSpeech();
  popups = popups.filter((popup) => {
    popup.t -= 1;
    return popup.t > 0;
  });
  for (const key of Object.keys(hot)) if (hot[key] > 0) hot[key] -= 1;
  if (shake > 0) shake -= 1;
  if (flash > 0) flash -= 1;
  if (trainAnim > 0) trainAnim -= 1;
  clampCursor();
  const dx = shake ? ((frame % 2) ? 2 : -2) : 0;
  ctx.save();
  ctx.translate(dx, 0);
  ctx.fillStyle = BG;
  ctx.fillRect(-4, 0, W + 8, H);
  if (scene === "title") drawTitle();
  else if (scene === "station") drawStation();
  else if (scene === "help") drawHelp();
  else if (scene === "result") drawResult();
  else drawBattle();
  drawPopups();
  drawHint();
  if (flash > 0) {
    ctx.fillStyle = `rgba(255,244,224,${flash / 12})`;
    ctx.fillRect(-4, 0, W + 8, H);
  }
  if (!fontReady) text("……", 8, 8, DIM);
  ctx.restore();
  requestAnimationFrame(frameTick);
}

fitCanvas();
canvas.focus();
requestAnimationFrame(frameTick);

if (debug) {
  window.__next = {
    get state() {
      return state;
    },
    get scene() {
      return scene;
    },
    begin,
    act: commit,
    press,
    legalActions: () => (state ? legalActions(state) : []),
  };
}
