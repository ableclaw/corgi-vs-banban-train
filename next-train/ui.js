import {
  applyAction,
  cardView,
  CHANGES,
  continueLevel,
  createRun,
  currentBlocker,
  HELP,
  legalActions,
  nodeBrief,
  outcomeReport,
} from "./engine.js";

const W = 320;
const H = 240;
const canvas = document.querySelector("#screen");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const params = new URLSearchParams(location.search);
const debug = params.has("debug");
let seed = Math.max(1, Number(params.get("seed")) || 1);
let state = null;
let scene = "title";
let backScene = "title";
let cursor = 0;
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

const INK = "#d7f5df";
const DIM = "#6f8f7c";
const BG = "#081018";
const PANEL = "#102030";
const GOLD = "#f0d060";
const RED = "#e07058";
const GREEN = "#78d878";
const BLUE = "#70c8f0";

const HELP_PAGES = [
  [...HELP],
  [
    "方向键移动光标，A 或 Enter 确认。",
    "B 或 Esc 返回。Start 打开这份说明。",
    "Select 关掉音效。",
    "选中的牌会预告打出后的数值。",
    "灰色的牌写着为什么现在不能打。",
    "亮着的格子是当前卡点。",
  ],
];

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

function blit(x, y, rows, map, scale = 2) {
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i += 1) {
      const color = map[row[i]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x + i * scale, y + j * scale, scale, scale);
    }
  });
}

const PLAYER = [
  "..1111..",
  ".111111.",
  "..1212..",
  "..2222..",
  ".333333.",
  "33444433",
  ".333333.",
  "..3..3..",
  ".55..55.",
];
const TRAIN = [
  "....6666",
  "..667777",
  ".6666666",
  "66666666",
  ".55..55.",
];
const SPRITE = {
  mob: ["..4444..", ".444444.", "..4544..", ".333333.", "33333333", ".33..33."],
  kafka: ["..2222..", ".222222.", "..2522..", ".111111.", "11111111", ".11..11.", "..7777.."],
  schrodinger: ["..5555..", ".555555.", "..5?5?..", ".333333.", "..3..3.."],
  architect: ["..1111..", ".111111.", "..1.1...", ".444444.", "44444444"],
  vp: ["..6666..", ".666666.", "..6262..", ".777777.", "77777777"],
  audit: ["..2222..", ".222222.", "..2xx2..", ".222222.", "..2222.."],
};
const MAPS = {
  player: { 1: "#3a2418", 2: "#f0c8a0", 3: "#3878c0", 4: "#d8efe0", 5: "#1c3050" },
  train: { 6: "#d0d8e0", 7: "#70c8f0", 5: "#202830" },
  mob: { 3: "#c08040", 4: "#f0c8a0", 5: "#203040" },
  kafka: { 1: "#2f6b45", 2: "#d8efe0", 5: "#102018", 7: "#e8d060" },
  schrodinger: { 3: "#6848a0", 5: "#d8c8f0", "?": GOLD },
  architect: { 1: "#202830", 4: "#8aa0b8" },
  vp: { 6: "#f0d060", 2: "#f0c8a0", 7: "#8a3040" },
  audit: { 2: "#e07058", x: "#fff4e0" },
};

function text(value, x, y, color = INK) {
  ctx.fillStyle = color;
  ctx.font = "10px PixelCN, sans-serif";
  ctx.textBaseline = "top";
  ctx.fillText(value, x, y);
}

function fitText(value, width) {
  let line = "";
  for (const ch of String(value)) {
    if (ctx.measureText(`${line}${ch}…`).width > width && line) return `${line}…`;
    line += ch;
  }
  return line;
}

function wrap(value, width) {
  const lines = [];
  let line = "";
  for (const ch of String(value)) {
    if (ctx.measureText(line + ch).width > width && line) {
      lines.push(line);
      line = ch;
    } else line += ch;
  }
  if (line) lines.push(line);
  return lines;
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

function items() {
  if (scene === "title") return [{ id: "start", name: "开始游戏", playable: true }, { id: "help", name: "玩法说明", playable: true }];
  if (scene === "station") {
    return CHANGES.map((change) => ({ id: change.id, name: change.title, effect: change.blurb, playable: true }));
  }
  if (scene === "result") return [{ id: "ok", name: state?.outcome?.kind === "level" ? "进入下一关" : "再来一局", playable: true }];
  if (!state) return [];
  if (state.pendingChoice === "corrupt") {
    return [
      { id: "corrupt", name: "我来加一道卡点", cost: "进入黑化", effect: "这局在这里结束", playable: true },
      { id: "decline", name: "我还是要上车", cost: "理智回到至少 5", effect: "拒绝黑化", playable: true },
    ];
  }
  if (state.pendingChoice === "vp") {
    return [
      { id: "vp-attend", name: "去开会", cost: "理智 -1 · 天数 -1", effect: "通过 VP，再放行一个节点", playable: state.sanity > 0, reason: state.sanity > 0 ? "" : "理智不足" },
      { id: "vp-delegate", name: "助理代开", cost: "理智 -1", effect: "没有决议", playable: true },
      { id: "vp-skip", name: "这个会我不去", cost: "不消耗", effect: "节点还在", playable: true },
    ];
  }
  return state.hand.map((id, index) => ({ ...cardView(state, id), index }));
}

function clampCursor() {
  const list = items();
  if (cursor >= list.length) cursor = Math.max(0, list.length - 1);
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
  const spots = { energy: 36, sanity: 48, favor: 60, days: 12, audit: 230 };
  for (const key of Object.keys(before)) {
    if (key === "train") continue;
    const delta = state[key] - before[key];
    if (!delta) continue;
    markHot(key);
    popups.push({
      x: spots[key] || 40,
      y: key === "days" || key === "audit" ? 4 : 34,
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
      logSeen = 0;
      speech = "";
      lineQueue = [];
      queueLines(true);
      tone(587, 0.08);
    } else {
      state = null;
      scene = "title";
      cursor = 0;
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
  }
}

function move(dx, dy) {
  if (scene === "title" && dx) {
    seed = Math.max(1, seed + dx);
    tone(300, 0.03);
    return;
  }
  if (scene === "help") {
    helpPage = Math.max(0, Math.min(HELP_PAGES.length - 1, helpPage + dy));
    return;
  }
  cursor += dy;
  const list = items();
  if (cursor < 0) cursor = list.length - 1;
  if (cursor >= list.length) cursor = 0;
  tone(240, 0.02, "square", 0.03);
}

function press(key) {
  if (key === "up") move(0, -1);
  else if (key === "down") move(0, 1);
  else if (key === "left") move(-1, 0);
  else if (key === "right") move(1, 0);
  else if (key === "a") confirm();
  else if (key === "b") back();
  else if (key === "start") openHelp();
  else if (key === "select") {
    muted = !muted;
    document.querySelector("#led").style.background = muted ? "#445" : "#ff4d4d";
    if (!muted) tone(880, 0.05);
  }
}

const KEYS = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  Enter: "a",
  z: "a",
  Z: "a",
  Escape: "b",
  x: "b",
  X: "b",
  s: "start",
  S: "start",
  Shift: "select",
};
window.addEventListener("keydown", (event) => {
  const key = KEYS[event.key];
  if (!key) return;
  event.preventDefault();
  press(key);
});
document.querySelectorAll("[data-key]").forEach((button) => {
  button.addEventListener("click", () => press(button.dataset.key));
});
canvas.addEventListener("pointerdown", (event) => {
  const rect = canvas.getBoundingClientRect();
  const y = ((event.clientY - rect.top) / rect.height) * H;
  const geom = menuBox();
  const row = Math.floor((y - geom.y) / geom.h);
  const list = items();
  if (row >= 0 && row < list.length) {
    if (cursor === row) confirm();
    else cursor = row;
    return;
  }
  if (scene === "battle" || scene === "result") confirm();
});

function menuBox() {
  if (scene === "title") return { y: 156, h: 18 };
  if (scene === "station") return { y: 132, h: 28 };
  if (scene === "result") return { y: 208, h: 18 };
  if (scene === "help") return { y: 210, h: 18 };
  return { y: 152, h: 22 };
}

function drawHud() {
  if (!state) return;
  ctx.fillStyle = "#0c1a24";
  ctx.fillRect(0, 0, W, 28);
  ctx.fillStyle = "#2a4458";
  ctx.fillRect(0, 27, W, 1);
  const levelHot = hot.level ? GOLD : INK;
  text(`第${state.levelId}关 ${state.levelName}`, 4, 2, levelHot);
  text(`班次 ${state.train}/${state.maxTrains}`, 232, 2, hot.train ? GOLD : INK);
  text("天数", 4, 14, hot.days ? GOLD : DIM);
  bar(28, 16, 54, 6, state.days, state.dayBudget, GREEN);
  text(`${state.days}/${state.dayBudget}`, 86, 14, hot.days ? GOLD : INK);
  text("审计", 150, 14, hot.audit ? GOLD : DIM);
  bar(174, 16, 36, 6, state.audit, state.auditMax, RED);
  text(`${state.audit}/${state.auditMax}`, 214, 14, hot.audit ? GOLD : INK);
}

function drawBars() {
  const rows = [
    ["精力", state.energy, state.energyMax, BLUE, "energy"],
    ["理智", state.sanity, state.sanityMax, "#c080e0", "sanity"],
    ["人情", state.favor, state.favorMax, "#f0b050", "favor"],
  ];
  rows.forEach(([label, value, max, color, key], index) => {
    const y = 30 + index * 12;
    text(label, 4, y, hot[key] ? GOLD : DIM);
    bar(28, y + 1, 70, 7, value, max, color);
    text(`${value}/${max}`, 102, y, hot[key] ? GOLD : INK);
  });
}

function drawActor(kind, x, y) {
  if (kind === "player") blit(x, y, PLAYER, MAPS.player, 2);
  else blit(x, y, SPRITE[kind] || SPRITE.mob, MAPS[kind] || MAPS.mob, 2);
}

function drawRail() {
  const blocker = currentBlocker(state);
  const nodes = state.nodes.filter((node) => node.status !== "read" || node.boss);
  const shown = nodes.slice(0, 8);
  ctx.fillStyle = "#4a4030";
  ctx.fillRect(8, 100, 250, 3);
  const step = shown.length ? 220 / shown.length : 40;
  shown.forEach((node, index) => {
    const x = 14 + index * step;
    const current = blocker && node.id === blocker.id;
    const bob = current && Math.floor(frame / 8) % 2 === 0 ? -2 : 0;
    ctx.fillStyle = node.status === "approved" ? GREEN : current ? RED : "#d8efe0";
    ctx.fillRect(x, 92 + bob, current ? 10 : 7, current ? 10 : 7);
    if (node.boss || node.form) {
      ctx.fillStyle = GOLD;
      ctx.fillRect(x + 2, 94 + bob, 3, 3);
    }
  });
  const shift = state.days <= 2 ? 8 + Math.sin(frame / 4) * 2 : 0;
  blit(268 - shift - (trainAnim ? Math.sin(frame / 2) * 3 : 0), 84, TRAIN, MAPS.train, 2);
  if (state.days <= 2) text("即将发车", 248, 74, RED);
  const brief = blocker ? nodeBrief(state, blocker).text : "当前没有卡住的格子。";
  text(fitText(brief, 312), 4, 106, blocker ? GOLD : DIM);
}

function drawSpeech() {
  ctx.fillStyle = PANEL;
  ctx.fillRect(4, 118, 312, 32);
  ctx.strokeStyle = "#2a4458";
  ctx.strokeRect(4.5, 118.5, 311, 31);
  const turns = state?.turns?.slice(-2) || [];
  if (turns.length) text(fitText(`${turns[turns.length - 1].source} ${turns[turns.length - 1].text}`, 304), 8, 120, DIM);
  const picked = items()[cursor];
  const idle = !speech && picked?.preview && picked.playable
    ? `打出后 精力 ${picked.preview.energy}/${state.energyMax} · 理智 ${picked.preview.sanity}/${state.sanityMax} · 人情 ${picked.preview.favor}/${state.favorMax}`
    : speech.slice(0, speechAt);
  wrap(idle, 300).slice(0, 1).forEach((line) => text(line, 8, 132, INK));
}

function drawMenu() {
  const geom = menuBox();
  const list = items();
  ctx.fillStyle = "#0c1822";
  ctx.fillRect(0, geom.y - 2, W, H - geom.y + 2);
  list.forEach((item, index) => {
    const y = geom.y + index * geom.h;
    const on = index === cursor;
    if (on) {
      ctx.fillStyle = "#1c3a28";
      ctx.fillRect(2, y - 1, 316, geom.h - 1);
    }
    const nameColor = item.playable === false ? "#5d6b64" : on ? GOLD : INK;
    const label = on ? `> ${item.name}` : `  ${item.name}`;
    text(label, 4, y, nameColor);
    const extra = item.playable === false
      ? item.reason
      : [item.cost, item.effect].filter(Boolean).join(" · ");
    if (scene === "battle") {
      text(fitText(extra, 300), 16, y + 10, item.playable === false ? RED : DIM);
    } else if (extra) {
      text(fitText(extra, 200), 108, y, item.playable === false ? RED : DIM);
      if (on && item.effect && geom.h > 20) text(fitText(item.effect, 290), 16, y + 11, DIM);
    }
  });
}

function drawTitle() {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 8; i += 1) {
    ctx.fillStyle = i % 2 ? "#102030" : "#0c1a24";
    ctx.fillRect(0, 150 + i, W, 1);
  }
  blit(18, 78 + Math.round(Math.sin(frame / 10) * 2), TRAIN, MAPS.train, 3);
  text("下一班火车", 108, 48, GOLD);
  text("把一行改动送上车", 108, 66, INK);
  text(`种子 ${seed}  ←→`, 108, 92, DIM);
  text("初级工程师的审批战", 108, 112, DIM);
  drawMenu();
}

function drawStation() {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#1a2830";
  ctx.fillRect(0, 70, W, 50);
  ctx.fillStyle = "#4a4030";
  ctx.fillRect(0, 112, W, 4);
  blit(230, 78, TRAIN, MAPS.train, 2);
  text("车站", 8, 8, GOLD);
  text("选一行改动。三种开头不一样。", 8, 24, INK);
  text(`种子 ${seed}`, 8, 40, DIM);
  CHANGES.forEach((change, index) => {
    if (index === cursor) text("▶", 8, 78 + index * 4, GOLD);
  });
  drawMenu();
}

function drawBattle() {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#102018";
  ctx.fillRect(0, 28, W, 100);
  drawHud();
  drawBars();
  drawActor("player", 8, 64);
  const blocker = currentBlocker(state);
  const kind = blocker?.boss || (blocker?.form ? "kafka" : "mob");
  drawActor(kind, 250, 58);
  const who = blocker ? blocker.name : "没有卡点";
  text(who.length > 8 ? who.slice(0, 8) : who, 214, 58, GOLD);
  drawRail();
  drawSpeech();
  drawMenu();
}

function drawHelp() {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  text("玩法说明", 8, 8, GOLD);
  text(`${helpPage + 1}/${HELP_PAGES.length}`, 270, 8, DIM);
  HELP_PAGES[helpPage].forEach((line, index) => {
    text(line, 8, 26 + index * 16, INK);
  });
  text("A 下一页   B 返回", 8, 220, DIM);
}

function drawResult() {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  drawHud();
  const report = state.outcome?.kind === "level"
    ? {
      title: "这关过了",
      cause: `下一关是${nextLevel?.levelName || "下一关"}。精力 ${nextLevel?.energy}/${nextLevel?.energyMax}，理智 ${nextLevel?.sanity}，人情 ${nextLevel?.favor}。`,
      tip: "过关会补一点精力、理智和人情。",
    }
    : outcomeReport(state);
  text(report.title, 8, 36, GOLD);
  let y = 54;
  for (const line of wrap(report.cause, 300)) {
    text(line, 8, y, INK);
    y += 12;
  }
  y += 6;
  for (const line of wrap(`提示：${report.tip}`, 300)) {
    text(line, 8, y, DIM);
    y += 12;
  }
  if (speech) wrap(speech.slice(0, speechAt), 300).slice(0, 2).forEach((line) => {
    text(line, 8, y, "#9ad0c8");
    y += 12;
  });
  drawMenu();
}

function drawPopups() {
  for (const popup of popups) {
    text(popup.text, popup.x, popup.y - (42 - popup.t) / 3, popup.color);
  }
}

function frameTick() {
  frame += 1;
  if (speech && speechAt < speech.length && frame % 2 === 0) {
    speechAt += 1;
    if (speechAt % 3 === 0) tone(520, 0.015, "square", 0.02);
  }
  popups = popups.filter((popup) => {
    popup.t -= 1;
    return popup.t > 0;
  });
  for (const key of Object.keys(hot)) if (hot[key] > 0) hot[key] -= 1;
  if (shake > 0) shake -= 1;
  if (flash > 0) flash -= 1;
  if (trainAnim > 0) trainAnim -= 1;
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
  if (flash > 0) {
    ctx.fillStyle = `rgba(255,244,224,${flash / 12})`;
    ctx.fillRect(-4, 0, W + 8, H);
  }
  if (!fontReady) text("……", 8, 8, DIM);
  ctx.restore();
  requestAnimationFrame(frameTick);
}
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
