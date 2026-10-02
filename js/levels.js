import { GROUND } from "./constants.js";

function fw(x, h, w = 34) {
  return { kind: "firewall", x, h, w, label: "防火墙" };
}

function gate(x, w = 130) {
  return { kind: "firewall", x, w, h: 280, gate: true, gap: 48, label: "防火墙" };
}

function platform(x, elev, w = 170) {
  return { kind: "platform", x, y: GROUND - elev, w, h: 18 };
}

function broken(x, w = 42, h = 58) {
  return { kind: "broken", x, y: GROUND - h, w, h, label: "BUILD" };
}

function groundTicket(x, h = 96, w = 36) {
  return { kind: "ticket", motion: "still", x, y: GROUND - h, w, h, label: "工单" };
}

function airTicket(x, span = 200) {
  const h = 30;
  const bottom = GROUND - 44;
  return {
    kind: "ticket",
    motion: "ping",
    x,
    y: bottom - h,
    w: 78,
    h,
    vx: 90,
    min: x,
    max: x + span,
    label: "工单",
  };
}

function hotfixGround(x) {
  const h = 54;
  return { kind: "hotfix", motion: "still", x, y: GROUND - h, w: 40, h, label: "hotfix" };
}

function hotfixBar(x, w = 440) {
  const h = 28;
  const bottom = GROUND - 44;
  return { kind: "hotfix", motion: "still", x, y: bottom - h, w, h, label: "热修" };
}

function coach(x, w, label, pause = 2) {
  const h = 156;
  const ymin = GROUND - 94 - h;
  const ymax = GROUND - h;
  return {
    kind: "coach",
    motion: "lift",
    x,
    w,
    h,
    ymin,
    ymax,
    vy: 110,
    pause,
    label,
  };
}

function treat(x, elev = 28) {
  return { kind: "treat", x, y: GROUND - elev, w: 28, h: 18 };
}

function goal(x) {
  return { x, y: GROUND - 140, w: 56, h: 140 };
}

function make(spec) {
  return { ...spec, length: spec.goal.x + 520 };
}

export const LEVELS = [
  make({
    id: 1,
    name: "入职第一天",
    en: "Day One",
    blurb: "矮防火墙热热身。短腿跳不高，但这几堵还够得着。",
    blurbEn: "Warm up on the short firewalls. Those legs still clear these.",
    checkpoints: [0, 2800],
    hints: [
      { x: 360, text: "按住 → 跑", sub: "Hold →" },
      { x: 620, text: "空格跳", sub: "Space" },
    ],
    solids: [fw(760, 96, 36), fw(1560, 118, 34), fw(2480, 108, 34)],
    hazards: [
      broken(2060),
      groundTicket(3300, 100, 36),
      hotfixBar(4100, 450),
      coach(5000, 300, "v0.9 车厢", 2.2),
    ],
    pickups: [treat(1180), treat(2900), treat(3780)],
    goal: goal(5750),
  }),
  make({
    id: 2,
    name: "需求评审",
    en: "Spec Review",
    blurb: "有的防火墙底下留了缝。蹲过去，比硬跳靠谱。",
    blurbEn: "Some firewalls leave a gap. Ducking beats a hopeless jump.",
    checkpoints: [0, 2600, 5200],
    hints: [{ x: 1180, text: "↓ 蹲着钻", sub: "Duck" }],
    solids: [fw(700, 122, 34), gate(1450, 140), fw(3600, 112, 34), gate(5050, 150)],
    hazards: [
      broken(2300),
      broken(2680),
      groundTicket(4100, 92, 36),
      hotfixGround(4600),
      hotfixBar(5750, 460),
      coach(6650, 320, "评审车厢", 2.15),
    ],
    pickups: [treat(1050), treat(3200), treat(5480)],
    goal: goal(7420),
  }),
  make({
    id: 3,
    name: "联调之夜",
    en: "Integration Night",
    blurb: "工单满天飞，坏构建别踩。看准车厢抬起来再冲。",
    blurbEn: "Tickets everywhere. Don't step on red builds. Dash when the coach lifts.",
    checkpoints: [0, 3200, 6400],
    hints: [{ x: 1680, text: "工单贴着头，蹲", sub: "Duck tickets" }],
    solids: [fw(720, 114, 34), platform(2050, 168, 180), gate(4300, 140), fw(8600, 120, 32)],
    hazards: [
      airTicket(1500, 220),
      broken(2600),
      hotfixGround(3400),
      coach(5100, 300, "v1.2 车厢", 2.05),
      groundTicket(6100, 100, 34),
      hotfixBar(6900, 430),
      coach(7900, 280, "v1.3 车厢", 2),
    ],
    pickups: [
      treat(1100),
      { kind: "treat", x: 2100, y: GROUND - 168 - 20, w: 28, h: 18 },
      treat(4750),
      treat(6600),
    ],
    goal: goal(9200),
  }),
  make({
    id: 4,
    name: "封版前夕",
    en: "Code Freeze",
    blurb: "封版了还在发热修。蹲、跳、等车厢，一样都不能省。",
    blurbEn: "Code freeze, and the hotfixes are still flying. Duck, jump, wait.",
    checkpoints: [0, 3000, 6200],
    hints: [],
    solids: [fw(680, 124, 32), gate(1500, 130), fw(2500, 116, 32), gate(5200, 140), fw(9600, 120, 32)],
    hazards: [
      airTicket(1900, 180),
      broken(3200),
      hotfixGround(4000),
      groundTicket(4700, 104, 34),
      coach(5900, 300, "freeze 车厢", 1.95),
      hotfixBar(6800, 420),
      coach(7900, 300, "hotfix 车厢", 1.95),
      broken(8900),
    ],
    pickups: [treat(1100), treat(2900), treat(4500), treat(7500)],
    goal: goal(10300),
  }),
  make({
    id: 5,
    name: "版本火车",
    en: "Release Train",
    blurb: "终点就是那列把你甩下去的火车。一节一节抢回去。",
    blurbEn: "The train that dropped you is the finish line. Take it back, car by car.",
    checkpoints: [0, 2500, 5200, 7600],
    hints: [{ x: 420, text: "版本火车，发车", sub: "All aboard" }],
    solids: [fw(700, 120, 32), gate(1500, 130), fw(3600, 128, 32), gate(5600, 140), fw(8200, 120, 32)],
    hazards: [
      broken(2300),
      airTicket(2800, 200),
      coach(4200, 290, "v1.0 车厢", 1.95),
      hotfixBar(4900, 420),
      groundTicket(6600, 108, 34),
      hotfixGround(7100),
      coach(7600, 280, "v2.0 车厢", 1.9),
      coach(9000, 300, "发车车厢", 1.95),
    ],
    pickups: [treat(1100), treat(3300), treat(6400), treat(8600)],
    goal: goal(9800),
  }),
];

export function getLevel(id) {
  return LEVELS.find((level) => level.id === id) || null;
}
