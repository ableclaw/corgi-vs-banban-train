import { VIEW_H, VIEW_W } from "./constants.js";
import { createPilot } from "./bot.js";
import { createAudio } from "./audio.js";
import { createRun, step } from "./engine.js";
import { LEVELS } from "./levels.js";
import { drawGame, drawPoster } from "./render.js";
import { applyClear, emptySave, loadSave, writeSave } from "./save.js";

const audio = createAudio();
const screens = {
  title: document.querySelector("#screen-title"),
  select: document.querySelector("#screen-select"),
  play: document.querySelector("#screen-play"),
};
const posterCanvas = document.querySelector("#poster");
const gameCanvas = document.querySelector("#game");
const levelList = document.querySelector("#level-list");
const modal = document.querySelector("#modal");
const banner = document.querySelector("#banner");
const muteButton = document.querySelector("#btn-mute");
const startButton = document.querySelector("#btn-start");

const keys = new Set();
const pointers = new Map();
let jumpQueued = false;
let mode = "title";
let run = null;
let modalKind = null;
let posterTime = 0;
let lastTs = 0;

const held = { left: false, right: false, duck: false };
const params = new URLSearchParams(location.search);
const autoplay = params.has("bot");
let pilot = createPilot();

function show(next) {
  mode = next;
  for (const [name, el] of Object.entries(screens)) el.hidden = name !== next;
  if (next === "select") renderSelect();
  if (next === "title") paintStart();
}

function paintMute() {
  const save = loadSave();
  audio.setMuted(save.mute);
  muteButton.textContent = save.mute ? "已静音 · Muted" : "声音开 · Sound";
  muteButton.setAttribute("aria-pressed", String(save.mute));
}

function toggleMute() {
  const save = loadSave();
  save.mute = !save.mute;
  writeSave(save);
  paintMute();
  audio.play("click");
}

function paintStart() {
  const save = loadSave();
  const level = LEVELS[Math.max(0, save.unlocked - 1)];
  startButton.textContent =
    save.unlocked > 1 ? `继续第 ${level.id} 关 · Continue` : "开始闯关 · Start";
}

function renderSelect() {
  const save = loadSave();
  levelList.innerHTML = "";
  for (const level of LEVELS) {
    const locked = level.id > save.unlocked;
    const best = Number(save.best[level.id]) || 0;
    const card = document.createElement("button");
    card.type = "button";
    card.className = `level-card${locked ? " locked" : ""}`;
    card.disabled = locked;
    card.innerHTML = `
      <span class="lv">第 ${level.id} 关${locked ? " · 锁定" : ""}</span>
      <strong>${level.name}</strong>
      <em>${level.en}</em>
      <span class="meta">${
        locked ? "先通过上一关 · Locked" : best ? `已通关 · Best ${best}` : "未通关 · New"
      }</span>
    `;
    card.addEventListener("click", () => startLevel(level.id));
    levelList.appendChild(card);
  }
}

function startLevel(id) {
  pilot = createPilot();
  audio.unlock();
  audio.play("click");
  run = createRun(id);
  modalKind = null;
  modal.hidden = true;
  modal.innerHTML = "";
  show("play");
  banner.hidden = false;
  banner.innerHTML = `<strong>第 ${run.level.id} 关 · ${run.level.name}</strong><span>${run.level.blurb}</span><small>${run.level.blurbEn}</small>`;
}

function readInput() {
  const jumpPressed = jumpQueued;
  jumpQueued = false;
  return {
    left: keys.has("ArrowLeft") || keys.has("KeyA") || held.left,
    right: keys.has("ArrowRight") || keys.has("KeyD") || held.right,
    duck: keys.has("ArrowDown") || keys.has("KeyS") || held.duck,
    jumpPressed,
  };
}

function paintHud() {
  if (!run) return;
  const level = run.level;
  document.querySelector("#hud-name").textContent = `第 ${level.id} 关 · ${level.name}`;
  document.querySelector("#hud-en").textContent = level.en;
  document.querySelector("#hud-score").textContent = String(Math.round(run.score));
  const hearts = document.querySelector("#hud-hearts");
  hearts.innerHTML = "";
  for (let i = 0; i < run.maxHp; i += 1) {
    const span = document.createElement("span");
    span.textContent = i < run.hp ? "❤" : "♡";
    span.className = i < run.hp ? "full" : "empty";
    hearts.appendChild(span);
  }
  const progress = Math.max(0, Math.min(1, run.player.x / run.level.goal.x));
  document.querySelector("#hud-bar").style.width = `${progress * 100}%`;
  banner.hidden = !!modalKind || run.time > 3.2;
}

function openModal(kind) {
  jumpQueued = false;
  modalKind = kind;
  const level = run.level;
  const score = Math.round(run.score);
  let title = "";
  let body = "";
  let sub = "";
  let actions = "";
  if (kind === "pause") {
    title = "暂停";
    sub = "Paused";
    body = "短腿还在，火车也还在。";
    actions = `
      <button type="button" data-act="resume" class="primary">继续 · Resume</button>
      <button type="button" data-act="retry">重开本关 · Retry</button>
      <button type="button" data-act="select">选关 · Levels</button>
    `;
  } else if (kind === "over") {
    title = "又掉下车了";
    sub = "Slipped off the train";
    body = "体力耗尽。防火墙还在，柯基也可以再来一次。";
    actions = `
      <button type="button" data-act="retry" class="primary">再试一次 · Retry</button>
      <button type="button" data-act="select">选关 · Levels</button>
    `;
  } else if (kind === "clear") {
    title = "过关！";
    sub = "Level clear";
    body = `第 ${level.id} 关 ${level.name} 拿到了。分数 ${score}。下一堵防火墙已经在排队。`;
    actions = `
      <button type="button" data-act="next" class="primary">下一关 · Next</button>
      <button type="button" data-act="retry">重玩 · Retry</button>
      <button type="button" data-act="select">选关 · Levels</button>
    `;
  } else if (kind === "ending") {
    title = "回到版本火车";
    sub = "Back aboard";
    body = "柯基重新扒上了车头。短腿在风里晃，但这次发布没有把狗落下。分数 " + score + "。";
    actions = `
      <button type="button" data-act="select" class="primary">选关再坐一趟 · Levels</button>
      <button type="button" data-act="retry">再闯终点 · Retry</button>
    `;
  }
  modal.hidden = false;
  modal.innerHTML = `
    <div class="modal-card ${kind === "ending" || kind === "clear" ? "win" : ""}">
      <p class="eyebrow">${sub}</p>
      <h2>${title}</h2>
      <p>${body}</p>
      <div class="actions">${actions}</div>
    </div>
  `;
  modal.querySelector(".primary")?.focus();
}

function closeModal() {
  modalKind = null;
  modal.hidden = true;
  modal.innerHTML = "";
}

function onModalClick(event) {
  const button = event.target.closest("button");
  if (!button || !run) return;
  const act = button.dataset.act;
  audio.play("click");
  if (act === "resume") closeModal();
  else if (act === "retry") startLevel(run.level.id);
  else if (act === "next") startLevel(Math.min(LEVELS.length, run.level.id + 1));
  else if (act === "select") show("select");
}

function settleRun() {
  if (!run || run.settled) return;
  if (run.status === "clear") {
    run.settled = true;
    writeSave(applyClear(loadSave(), run.level.id, run.score));
    openModal(run.level.id === LEVELS.length ? "ending" : "clear");
  } else if (run.status === "over") {
    run.settled = true;
    openModal("over");
  }
}

function togglePause() {
  if (mode !== "play" || !run || run.status !== "play") return;
  if (modalKind === "pause") closeModal();
  else if (!modalKind) openModal("pause");
}

function fit(canvas) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.round(VIEW_W * dpr);
  const h = Math.round(VIEW_H * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

function frame(ts) {
  const dt = Math.min(0.05, lastTs ? (ts - lastTs) / 1000 : 1 / 60);
  lastTs = ts;
  try {
    if (mode === "title") {
      posterTime += dt;
      drawPoster(fit(posterCanvas), posterTime);
    } else if (mode === "play" && run) {
      if (!modalKind && run.status === "play") {
        step(run, autoplay ? pilot(run) : readInput(), dt);
        if (run.sfx) {
          audio.play(run.sfx);
          run.sfx = null;
        }
        settleRun();
      }
      drawGame(fit(gameCanvas), run);
      paintHud();
    }
  } catch (err) {
    console.error(err);
  }
  requestAnimationFrame(frame);
}

function syncHeld() {
  held.left = false;
  held.right = false;
  held.duck = false;
  for (const act of pointers.values()) {
    if (act === "left" || act === "right" || act === "duck") held[act] = true;
  }
}

document.querySelector("#btn-start").addEventListener("click", () => {
  startLevel(loadSave().unlocked || 1);
});
document.querySelector("#btn-levels").addEventListener("click", () => {
  audio.unlock();
  audio.play("click");
  show("select");
});
document.querySelector("#btn-select-back").addEventListener("click", () => show("title"));
document.querySelector("#btn-reset").addEventListener("click", () => {
  const ok = window.confirm("清空这台设备上的关卡进度？\nClear saved progress on this device?");
  if (!ok) return;
  const mute = loadSave().mute;
  writeSave({ ...emptySave(), mute });
  renderSelect();
});
muteButton.addEventListener("click", toggleMute);
document.querySelector("#btn-pause").addEventListener("click", togglePause);
modal.addEventListener("click", onModalClick);

for (const button of document.querySelectorAll(".touch button")) {
  const act = button.dataset.act;
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, act);
    if (act === "jump") jumpQueued = true;
    syncHeld();
    audio.unlock();
  });
  const release = (event) => {
    pointers.delete(event.pointerId);
    syncHeld();
  };
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
}

window.addEventListener("keydown", (event) => {
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) {
    event.preventDefault();
  }
  if (event.repeat) return;
  keys.add(event.code);
  if (["Space", "ArrowUp", "KeyW"].includes(event.code)) jumpQueued = true;
  if (event.code === "KeyM") toggleMute();
  if (event.code === "KeyP" || event.code === "Escape") {
    if (modalKind === "pause" || (mode === "play" && !modalKind)) togglePause();
  }
  if (event.code === "Enter" && modalKind) modal.querySelector(".primary")?.click();
  else if (event.code === "Enter" && mode === "title") startLevel(loadSave().unlocked || 1);
  else if (event.code === "Enter" && mode === "select") {
    const openCard = levelList.querySelector("button:not(:disabled)");
    openCard?.click();
  }
});
window.addEventListener("keyup", (event) => keys.delete(event.code));
window.addEventListener("blur", () => keys.clear());

paintMute();
paintStart();
requestAnimationFrame(frame);

if (new URLSearchParams(location.search).has("debug")) {
  window.__corgi = {
    get run() {
      return run;
    },
    get mode() {
      return mode;
    },
    startLevel,
    loadSave,
  };
}
