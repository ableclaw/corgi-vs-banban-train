import { GROUND, VIEW_H, VIEW_W } from "./constants.js";

const FONT = '"WenQuanYi Micro Hei","PingFang SC","Noto Sans SC","Microsoft YaHei",sans-serif';
const FUR = "#e5923c";
const FUR_DARK = "#c56e24";
const CREAM = "#fff7ee";
const INK = "#2a211c";

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawSky(ctx, cam) {
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  sky.addColorStop(0, "#1b1240");
  sky.addColorStop(0.55, "#3a2468");
  sky.addColorStop(1, "#e38a62");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.fillStyle = "#f6e7c1";
  ctx.beginPath();
  ctx.arc(680, 78, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(227, 138, 98, 0.35)";
  ctx.beginPath();
  ctx.arc(692, 78, 24, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fff6ea";
  for (let i = 0; i < 18; i += 1) {
    const sx = (i * 137 + 40 - cam * 0.05) % VIEW_W;
    const sy = 16 + ((i * 53) % 120);
    ctx.globalAlpha = 0.35 + (i % 3) * 0.15;
    ctx.fillRect(sx, sy, 2, 2);
  }
  ctx.globalAlpha = 1;

  const base = -((cam * 0.25) % 220);
  for (let i = -1; i < 8; i += 1) {
    const x = base + i * 220;
    const h = 70 + (i % 3) * 28;
    ctx.fillStyle = "#241845";
    ctx.fillRect(x, GROUND - 90 - h, 90, h + 90);
    ctx.fillStyle = "#f0c36a";
    for (let wy = GROUND - 80 - h; wy < GROUND - 100; wy += 16) {
      for (let wx = x + 8; wx < x + 80; wx += 16) {
        ctx.globalAlpha = (wx + wy) % 32 === 0 ? 0.9 : 0.25;
        ctx.fillRect(wx, wy, 7, 8);
      }
    }
    ctx.globalAlpha = 1;
  }

  ctx.save();
  ctx.translate(-((cam * 0.45) % (VIEW_W + 400)), 0);
  drawTrainSilhouette(ctx, 40, GROUND - 168, 520, 0.55);
  ctx.restore();
}

function drawTrainSilhouette(ctx, x, y, w, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#120a22";
  roundRect(ctx, x, y, w, 46, 8);
  ctx.fill();
  ctx.fillStyle = "#f2d48a";
  for (let i = 0; i < 7; i += 1) ctx.fillRect(x + 18 + i * 70, y + 12, 36, 16);
  ctx.fillStyle = "#ffb088";
  ctx.font = `bold 16px ${FONT}`;
  ctx.fillText("版本火车", x + 18, y - 8);
  ctx.restore();
}

function drawGround(ctx, length) {
  ctx.fillStyle = "#2a2142";
  ctx.fillRect(-200, GROUND, length + 400, VIEW_H - GROUND + 40);
  ctx.fillStyle = "#3d3158";
  ctx.fillRect(-200, GROUND, length + 400, 10);
  const ties = Math.ceil((length + 400) / 36);
  for (let i = 0; i < ties; i += 1) {
    const x = -180 + i * 36;
    ctx.fillStyle = i % 5 === 0 ? "#6a4a2a" : "#4a3824";
    ctx.fillRect(x, GROUND + 18, 22, 8);
  }
  ctx.strokeStyle = "#d7dde8";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-200, GROUND + 16);
  ctx.lineTo(length + 200, GROUND + 16);
  ctx.moveTo(-200, GROUND + 30);
  ctx.lineTo(length + 200, GROUND + 30);
  ctx.stroke();
  ctx.strokeStyle = "#ffc857";
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 14]);
  ctx.beginPath();
  ctx.moveTo(-200, GROUND + 46);
  ctx.lineTo(length + 200, GROUND + 46);
  ctx.stroke();
  ctx.setLineDash([]);
}

export function drawGame(ctx, state) {
  const reduce =
    typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
  ctx.save();
  if (!reduce && state.shake > 0) {
    const mag = state.shake * 16;
    ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
  }
  drawSky(ctx, state.cam);
  ctx.save();
  ctx.translate(-Math.round(state.cam), 0);
  drawGround(ctx, state.level.length);
  for (const solid of state.solids) drawSolid(ctx, solid, state.time);
  for (const hazard of state.hazards) drawHazard(ctx, hazard, state.time);
  for (const pickup of state.pickups) if (!pickup.taken) drawTreat(ctx, pickup, state.time);
  for (const hint of state.level.hints || []) drawSign(ctx, hint.x, hint.text, hint.sub);
  drawGoal(ctx, state.level.goal, state.time, state.level.id === 5);
  drawPlayer(ctx, state);
  ctx.restore();
  ctx.restore();
}

function drawPlayer(ctx, state) {
  const p = state.player;
  const blink = state.invuln > 0 && Math.floor(state.time * 16) % 2 === 0;
  if (blink) ctx.globalAlpha = 0.55;
  const mood = state.invuln > 0.2 && state.hp < state.maxHp ? "hurt" : p.ducking ? "focus" : "ok";
  drawCorgi(ctx, p.x, p.y, p.w, p.h, {
    facing: p.facing,
    t: state.time,
    duck: p.ducking,
    mood,
    running: p.onGround && Math.abs(p.vx) > 30,
  });
  ctx.globalAlpha = 1;
  if (p.onGround && Math.abs(p.vx) > 40) {
    ctx.fillStyle = "rgba(255,246,234,0.35)";
    const phase = (state.time * 12) % 1;
    ctx.beginPath();
    ctx.ellipse(p.x + 10, GROUND - 2, 8 + phase * 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#fff7ee";
  ctx.font = `bold 14px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("柯基", p.x + p.w / 2, p.y - 8);
  ctx.textAlign = "left";
}

export function drawCorgi(ctx, x, y, w, h, opt = {}) {
  const facing = opt.facing ?? 1;
  const t = opt.t ?? 0;
  const duck = !!opt.duck;
  const mood = opt.mood ?? "ok";
  const running = !!opt.running;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (facing < 0) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  const bob = running ? Math.sin(t * 14) * 1.4 : 0;
  const leg = running ? Math.sin(t * 16) : 0;

  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(w * 0.48, h - 2, w * 0.32, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = FUR;
  ctx.beginPath();
  ctx.ellipse(10, h * 0.55 + bob, 11, 8, -0.8 + Math.sin(t * 10) * 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f2b25e";
  ctx.beginPath();
  ctx.ellipse(w * 0.3, h * (duck ? 0.58 : 0.5) + bob, w * 0.24, h * (duck ? 0.28 : 0.32), 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = FUR;
  roundRect(ctx, w * 0.2, h * (duck ? 0.42 : 0.32) + bob, w * 0.46, h * (duck ? 0.34 : 0.38), 14);
  ctx.fill();
  ctx.fillStyle = FUR_DARK;
  roundRect(ctx, w * 0.28, h * (duck ? 0.46 : 0.34) + bob, w * 0.22, h * 0.1, 6);
  ctx.fill();

  ctx.fillStyle = CREAM;
  roundRect(ctx, w * 0.32, h * 0.56 + bob, w * 0.26, h * 0.14, 7);
  ctx.fill();

  const hx = w * 0.66;
  const hy = h * (duck ? 0.48 : 0.38) + bob;
  const hr = h * (duck ? 0.3 : 0.3);
  ctx.fillStyle = FUR;
  ctx.beginPath();
  ctx.arc(hx, hy, hr, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = FUR_DARK;
  const earLift = duck ? hr * 0.1 : -hr * 0.15 + Math.sin(t * 6) * 1.2;
  ctx.beginPath();
  ctx.moveTo(hx - hr * 0.55, hy - hr * 0.2);
  ctx.lineTo(hx - hr * 0.85, hy - hr * 0.95 + earLift);
  ctx.lineTo(hx - hr * 0.05, hy - hr * 0.35);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(hx + hr * 0.1, hy - hr * 0.45);
  ctx.lineTo(hx + hr * 0.15, hy - hr * 1.15 + earLift);
  ctx.lineTo(hx + hr * 0.7, hy - hr * 0.25);
  ctx.fill();
  ctx.fillStyle = "#f3b7a2";
  ctx.beginPath();
  ctx.moveTo(hx - hr * 0.42, hy - hr * 0.25);
  ctx.lineTo(hx - hr * 0.62, hy - hr * 0.75 + earLift);
  ctx.lineTo(hx - hr * 0.12, hy - hr * 0.32);
  ctx.fill();

  ctx.fillStyle = CREAM;
  ctx.beginPath();
  ctx.ellipse(hx + hr * 0.25, hy + hr * 0.12, hr * 0.55, hr * 0.48, 0.15, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = INK;
  const eyeY = hy - hr * 0.05;
  if (mood === "hurt") {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hx + 2, eyeY);
    ctx.lineTo(hx + 10, eyeY + 3);
    ctx.moveTo(hx + 16, eyeY);
    ctx.lineTo(hx + 24, eyeY + 3);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(hx + hr * 0.05, eyeY, 2.3, 0, Math.PI * 2);
    ctx.arc(hx + hr * 0.48, eyeY, 2.3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(hx + hr * 0.72, hy + hr * 0.12, 3.2, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = mood === "hurt" ? "#a33b4a" : INK;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  if (mood === "hurt") {
    ctx.arc(hx + hr * 0.42, hy + hr * 0.55, 6, Math.PI * 0.15, Math.PI * 0.85, true);
  } else {
    ctx.arc(hx + hr * 0.42, hy + hr * 0.28, 7, 0.15, Math.PI - 0.4);
  }
  ctx.stroke();
  if (mood !== "hurt" && !duck) {
    ctx.fillStyle = "#ef6d86";
    ctx.beginPath();
    ctx.ellipse(hx + hr * 0.55, hy + hr * 0.48, 4, 3, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  const legH = Math.max(7, h * (duck ? 0.12 : 0.18));
  const feet = h - 1;
  [0.22, 0.34, 0.46, 0.56].forEach((ratio, i) => {
    const swing = (i % 2 === 0 ? leg : -leg) * 3.5;
    ctx.fillStyle = FUR_DARK;
    roundRect(ctx, w * ratio + swing, feet - legH, 8, legH, 2);
    ctx.fill();
    ctx.fillStyle = CREAM;
    ctx.fillRect(w * ratio + swing, feet - 4, 8, 3);
  });

  ctx.fillStyle = "#3aa0ff";
  roundRect(ctx, hx - hr * 0.2, hy + hr * 0.55, hr * 0.7, 5, 2);
  ctx.fill();
  ctx.fillStyle = "#ffd35a";
  ctx.beginPath();
  ctx.arc(hx + hr * 0.55, hy + hr * 0.7, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.font = `bold 8px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("v1", hx + hr * 0.55, hy + hr * 0.74);
  ctx.textAlign = "left";
  ctx.restore();
}

function drawSolid(ctx, solid, t) {
  if (solid.kind === "platform") {
    ctx.fillStyle = "#6d5a45";
    roundRect(ctx, solid.x, solid.y, solid.w, solid.h, 4);
    ctx.fill();
    ctx.fillStyle = "#c9a36a";
    ctx.fillRect(solid.x, solid.y, solid.w, 4);
    ctx.fillStyle = "#fff6ea";
    ctx.font = `12px ${FONT}`;
    ctx.fillText("站台", solid.x + 8, solid.y + 14);
    return;
  }
  drawFirewall(ctx, solid, t);
  if (solid.gate) drawMarker(ctx, solid.x - 54, "蹲", "DUCK");
  else drawMarker(ctx, solid.x - 48, "跳", "JUMP");
}

function drawFirewall(ctx, solid, t) {
  const { x, y, w, h } = solid;
  const body = ctx.createLinearGradient(x, y, x, y + h);
  body.addColorStop(0, "#8ea4c8");
  body.addColorStop(1, "#5c6d8c");
  ctx.fillStyle = body;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#d5e4ff";
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.strokeStyle = "rgba(20,24,40,0.35)";
  ctx.lineWidth = 1;
  const brickH = 14;
  const brickW = 16;
  for (let row = 0; row < h; row += brickH) {
    const offset = (row / brickH) % 2 === 0 ? 0 : brickW / 2;
    for (let col = -brickW; col < w; col += brickW) {
      ctx.strokeRect(x + col + offset, y + row, brickW, brickH);
    }
  }
  const glow = 0.45 + Math.sin(t * 6) * 0.25;
  ctx.fillStyle = `rgba(80, 220, 255, ${glow})`;
  ctx.fillRect(x - 2, y, w + 4, 6);
  ctx.fillStyle = "#ffb15a";
  const flame = 6 + Math.sin(t * 10) * 3;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.2, y);
  ctx.quadraticCurveTo(x + w * 0.35, y - flame, x + w * 0.5, y);
  ctx.quadraticCurveTo(x + w * 0.7, y - flame - 4, x + w * 0.85, y);
  ctx.fill();
  if (h > 70 && w >= 32) {
    ctx.save();
    ctx.fillStyle = "#102033";
    ctx.font = `bold 14px ${FONT}`;
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText("防火墙", 0, 5);
    ctx.restore();
  }
  if (solid.gate) {
    ctx.strokeStyle = "rgba(255, 214, 120, 0.8)";
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(x, y + h, w, GROUND - (y + h));
    ctx.setLineDash([]);
  }
}

function drawHazard(ctx, hazard, t) {
  if (hazard.kind === "coach") drawCoach(ctx, hazard, t);
  else if (hazard.kind === "ticket") drawTicket(ctx, hazard, t);
  else if (hazard.kind === "broken") drawBroken(ctx, hazard);
  else drawHotfix(ctx, hazard, t);
}

function drawCoach(ctx, coach, t) {
  const { x, y, w, h } = coach;
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(x + w - 10, coach.ymin, 6, GROUND - coach.ymin);
  const parkedUp = coach.y <= coach.ymin + 3 && coach.hang > 0;
  const parkedDown = coach.y >= coach.ymax - 3 && coach.hang > 0;
  ctx.fillStyle = parkedUp ? "rgba(62,224,162,0.45)" : parkedDown ? "rgba(255,90,90,0.4)" : "rgba(255,200,90,0.3)";
  ctx.fillRect(x, GROUND - 10, w, 10);

  ctx.fillStyle = "#c4473a";
  roundRect(ctx, x, y, w, h - 16, 10);
  ctx.fill();
  ctx.fillStyle = "#8d2e28";
  ctx.fillRect(x, y + 18, w, 16);
  ctx.fillStyle = "#9fd8ff";
  const windows = Math.max(2, Math.floor(w / 70));
  for (let i = 0; i < windows; i += 1) {
    ctx.fillRect(x + 16 + i * ((w - 32) / windows), y + 28, Math.min(36, (w - 40) / windows), 22);
  }
  ctx.fillStyle = "#2a211c";
  const wheelY = Math.min(GROUND - 8, y + h - 8);
  ctx.beginPath();
  ctx.arc(x + 24, wheelY, 10, 0, Math.PI * 2);
  ctx.arc(x + w - 24, wheelY, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff7ee";
  ctx.font = `bold 18px ${FONT}`;
  ctx.fillText(coach.label || "车厢", x + 14, y + 16);
  const lamp = parkedUp ? "#3ee0a2" : parkedDown ? "#ff5a6a" : "#ffc857";
  ctx.fillStyle = lamp;
  ctx.beginPath();
  ctx.arc(x + w - 16, y + 12, 6, 0, Math.PI * 2);
  ctx.fill();
  if ((parkedUp || parkedDown) && coach.pause) {
    const ratio = Math.max(0, Math.min(1, coach.hang / coach.pause));
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(x + 12, y + h - 28, w - 24, 6);
    ctx.fillStyle = lamp;
    ctx.fillRect(x + 12, y + h - 28, (w - 24) * ratio, 6);
  }
  ctx.fillStyle = parkedUp ? "#d9ffe9" : "#ffd0d4";
  ctx.font = `bold 16px ${FONT}`;
  ctx.fillText(parkedUp ? "冲 RUN" : parkedDown ? "停 WAIT" : "……", x + 12, GROUND - 16);
  void t;
}

function drawTicket(ctx, ticket) {
  ctx.save();
  ctx.translate(ticket.x, ticket.y);
  ctx.fillStyle = "#ffe27a";
  roundRect(ctx, 0, 0, ticket.w, ticket.h, 4);
  ctx.fill();
  ctx.fillStyle = "#f0c84a";
  ctx.beginPath();
  ctx.moveTo(ticket.w - 14, 0);
  ctx.lineTo(ticket.w, 0);
  ctx.lineTo(ticket.w, 14);
  ctx.fill();
  ctx.fillStyle = "#7a3b2e";
  ctx.font = `bold ${ticket.h > 70 ? 16 : 14}px ${FONT}`;
  ctx.fillText("工单", 6, Math.min(ticket.h - 8, 22));
  if (ticket.h > 70) {
    ctx.font = `12px ${FONT}`;
    ctx.fillText("TICKET", 6, 40);
  }
  ctx.restore();
}

function drawBroken(ctx, box) {
  ctx.fillStyle = "#6e2430";
  roundRect(ctx, box.x, box.y, box.w, box.h, 6);
  ctx.fill();
  ctx.strokeStyle = "#ff8b98";
  ctx.lineWidth = 3;
  ctx.strokeRect(box.x + 6, box.y + 8, box.w - 12, box.h - 26);
  ctx.beginPath();
  ctx.moveTo(box.x + 10, box.y + 12);
  ctx.lineTo(box.x + box.w - 10, box.y + box.h - 30);
  ctx.moveTo(box.x + box.w - 10, box.y + 12);
  ctx.lineTo(box.x + 10, box.y + box.h - 30);
  ctx.stroke();
  ctx.fillStyle = "#ffd0d6";
  ctx.font = `bold 12px ${FONT}`;
  ctx.fillText("坏构建", box.x + 4, box.y + box.h - 6);
}

function drawHotfix(ctx, box, t) {
  const wide = box.w > 100;
  ctx.fillStyle = wide ? "#1f8a62" : "#27a36f";
  roundRect(ctx, box.x, box.y, box.w, box.h, wide ? 8 : 6);
  ctx.fill();
  ctx.strokeStyle = "#e9fff6";
  ctx.lineWidth = 3;
  const crosses = wide ? Math.floor(box.w / 70) : 1;
  for (let i = 0; i < crosses; i += 1) {
    const cx = box.x + (box.w * (i + 1)) / (crosses + 1);
    const cy = box.y + box.h / 2;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy);
    ctx.lineTo(cx + 8, cy);
    ctx.moveTo(cx, cy - 8);
    ctx.lineTo(cx, cy + 8);
    ctx.stroke();
  }
  ctx.fillStyle = "#e9fff6";
  ctx.font = `bold ${wide ? 18 : 12}px ${FONT}`;
  ctx.fillText(wide ? "热修 hotfix" : "hotfix", box.x + 8, box.y + (wide ? 18 : box.h - 6));
  if (wide) {
    const pulse = 0.4 + Math.sin(t * 5) * 0.2;
    ctx.fillStyle = `rgba(255,255,255,${pulse})`;
    ctx.fillRect(box.x, box.y, 8, box.h);
  }
}

function drawTreat(ctx, treat, t) {
  const bob = Math.sin(t * 6 + treat.x) * 3;
  ctx.save();
  ctx.translate(treat.x, treat.y + bob);
  ctx.fillStyle = "#ff9a3c";
  ctx.beginPath();
  ctx.ellipse(14, 10, 12, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(24, 10);
  ctx.lineTo(32, 4);
  ctx.lineTo(32, 16);
  ctx.fill();
  ctx.fillStyle = "#fff7ee";
  ctx.beginPath();
  ctx.arc(10, 8, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGoal(ctx, goal, t, finale) {
  ctx.fillStyle = "#243052";
  roundRect(ctx, goal.x, goal.y, goal.w, goal.h, 8);
  ctx.fill();
  ctx.fillStyle = "#ffc857";
  ctx.fillRect(goal.x, goal.y, goal.w, 10);
  const wave = Math.sin(t * 5) * 4;
  ctx.fillStyle = "#ff5d73";
  ctx.beginPath();
  ctx.moveTo(goal.x + goal.w - 6, goal.y + 10);
  ctx.lineTo(goal.x + goal.w + 34 + wave, goal.y + 22);
  ctx.lineTo(goal.x + goal.w - 6, goal.y + 34);
  ctx.fill();
  ctx.fillStyle = "#fff7ee";
  ctx.font = `bold 16px ${FONT}`;
  ctx.save();
  ctx.translate(goal.x + goal.w / 2, goal.y + 28);
  ctx.textAlign = "center";
  ctx.fillText(finale ? "车头" : "到站", 0, 16);
  ctx.font = `12px ${FONT}`;
  ctx.fillText(finale ? "ENGINE" : "GOAL", 0, 34);
  ctx.restore();
}

function drawMarker(ctx, x, text, sub) {
  drawSign(ctx, x, text, sub);
}

function drawSign(ctx, x, text, sub) {
  const y = GROUND - 118;
  ctx.fillStyle = "#6b4a2c";
  ctx.fillRect(x + 28, y + 36, 6, GROUND - (y + 36));
  ctx.fillStyle = "#ffe7a3";
  roundRect(ctx, x, y, 92, 40, 6);
  ctx.fill();
  ctx.fillStyle = "#3a2a18";
  ctx.font = `bold 16px ${FONT}`;
  ctx.fillText(text, x + 8, y + 18);
  ctx.font = `11px ${FONT}`;
  ctx.fillText(sub || "", x + 8, y + 32);
}

export function drawPoster(ctx, time) {
  const loop = time % 6.5;
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawSky(ctx, loop * 40);
  drawGround(ctx, VIEW_W + 200);
  drawFirewall(ctx, { x: 470, y: GROUND - 168, w: 46, h: 168, gate: false }, time);

  let x = 70;
  let y = GROUND - 70;
  let mood = "ok";
  let duck = false;
  if (loop < 2.4) x = 60 + loop * 130;
  else if (loop < 3.5) {
    const j = (loop - 2.4) / 1.1;
    x = 60 + loop * 115;
    y = GROUND - 70 - Math.sin(Math.min(1, j) * Math.PI) * 78;
    if (j > 0.72) mood = "hurt";
  } else if (loop < 5) {
    x = 400;
    y = GROUND - 62;
    mood = "hurt";
    duck = true;
  } else {
    x = 400 - (loop - 5) * 40;
    mood = "focus";
  }
  drawCorgi(ctx, x, y, 78, duck ? 48 : 70, { t: time, facing: loop < 5 ? 1 : -1, mood, duck, running: loop < 2.4 || loop > 5 });
  ctx.fillStyle = "rgba(20,10,30,0.72)";
  roundRect(ctx, 24, 24, 360, 74, 12);
  ctx.fill();
  ctx.fillStyle = "#fff7ee";
  ctx.font = `bold 22px ${FONT}`;
  ctx.fillText("跳不过这堵防火墙", 40, 52);
  ctx.font = `16px ${FONT}`;
  ctx.fillStyle = "#ffd0b8";
  ctx.fillText("Short legs. Tall firewall.", 40, 78);
}
