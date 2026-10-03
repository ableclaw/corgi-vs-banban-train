/** One departure per level. Targets must miss the train; everyone else may board. */
export const LEVELS = [
  {
    id: 1,
    name: "需求",
    en: "Requirements",
    blurb: "暗黑模式还没想清楚。放一块需求评审，它就赶不上这班。",
    hint: "点「需求评审」，再点到暗黑模式前方的格子。工单太轻，拦不住。",
    setup: 7,
    duration: 11,
    slots: 5,
    train: ["v1.6", "v1.7", "v1.8"],
    inventory: [
      { id: "review", count: 1 },
      { id: "ticket", count: 1 },
    ],
    features: [{ id: "dark", name: "暗黑模式", lane: 0, speed: 9, target: true }],
  },
  {
    id: 2,
    name: "评审",
    en: "Review",
    blurb: "文案可以上。导出报表这次先留下。别把牌贴错行。",
    hint: "只挡「导出报表」那一行。安全评审或需求评审都可以。",
    setup: 5,
    duration: 12,
    slots: 5,
    train: ["v1.8", "v1.9", "v1.10"],
    inventory: [
      { id: "review", count: 1 },
      { id: "security", count: 1 },
    ],
    features: [
      { id: "copy", name: "按钮文案", lane: 0, speed: 11.5, target: false },
      { id: "export", name: "导出报表", lane: 1, speed: 8, target: true },
    ],
  },
  {
    id: 3,
    name: "联调",
    en: "Integration",
    blurb: "支付和发票还没联通。两张「联调失败」各放一行，登录文案别挡。",
    hint: "联调失败要贴在支付、发票上。贴到登录文案上，就浪费了一张。",
    setup: 4,
    duration: 11,
    slots: 5,
    train: ["v1.9", "v1.10", "v1.11"],
    inventory: [
      { id: "integration", count: 2 },
      { id: "ticket", count: 1 },
    ],
    features: [
      { id: "login", name: "登录文案", lane: 0, speed: 12.2, target: false },
      { id: "pay", name: "支付联调", lane: 1, speed: 9.6, target: true },
      { id: "invoice", name: "发票接口", lane: 2, speed: 8.8, target: true },
    ],
  },
  {
    id: 4,
    name: "封版",
    en: "Code freeze",
    blurb: "权限改造跑得很快。热修和合规都不够，防火墙只能用在它身上。",
    hint: "把「防火墙」贴到权限改造那一行。另外两张牌拦不住它。",
    setup: 4,
    duration: 10,
    slots: 5,
    train: ["v2.0-rc", "v2.0", "上线"],
    inventory: [
      { id: "firewall", count: 1 },
      { id: "hotfix", count: 1 },
      { id: "compliance", count: 1 },
    ],
    features: [
      { id: "help", name: "帮助中心", lane: 0, speed: 10, target: false },
      { id: "auth", name: "权限改造", lane: 1, speed: 13.5, target: true },
      { id: "legacy", name: "旧接口下线", lane: 2, speed: 9.4, target: false },
    ],
  },
  {
    id: 5,
    name: "发车",
    en: "Departure",
    blurb: "车很快。封版检查留给实时风控，安全评审留给批量导出。",
    hint: "风控用「封版检查」，批量导出用「安全评审」。合规打不回风控。",
    setup: 3,
    duration: 9,
    slots: 4,
    train: ["v2.0", "v2.1", "发车"],
    inventory: [
      { id: "freeze", count: 1 },
      { id: "security", count: 1 },
      { id: "compliance", count: 1 },
    ],
    features: [
      { id: "popup", name: "营销弹窗", lane: 0, speed: 12, target: false },
      { id: "risk", name: "实时风控", lane: 1, speed: 14, target: true },
      { id: "track", name: "埋点补齐", lane: 2, speed: 11, target: false },
      { id: "batch", name: "批量导出", lane: 3, speed: 10.4, target: true },
    ],
  },
];

export function getLevel(id) {
  return LEVELS.find((level) => level.id === id) || null;
}
