/** One departure per level. Targets must miss the train; everyone else may board. */
export const LEVELS = [
  {
    id: 1,
    name: "需求",
    en: "Requirements",
    brief: "这是 v2.0 的第一步，还在收需求。暗黑模式没写清楚，用需求评审把它留下。",
    hint: "点「需求评审」，再点到暗黑模式前方的格子。工单太轻，拦不住。",
    setup: 7,
    duration: 11,
    slots: 5,
    train: ["v2.0", "需求", "待发"],
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
    brief: "需求收完，同一班 v2.0 进入评审。导出报表还过不了安全评审，按钮文案可以上。",
    hint: "只挡「导出报表」那一行。安全评审或需求评审都可以。",
    setup: 5,
    duration: 12,
    slots: 5,
    train: ["v2.0", "评审", "待发"],
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
    brief: "评审过了，v2.0 开始联调。支付联调和发票接口还没通，登录文案可以上。",
    hint: "联调失败要贴在支付、发票上。贴到登录文案上，就浪费了一张。",
    setup: 4,
    duration: 11,
    slots: 5,
    train: ["v2.0", "联调", "待发"],
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
    brief: "联调收尾，v2.0 准备封版。权限改造太赶，只有防火墙能把它留下。",
    hint: "把「防火墙」贴到权限改造那一行。另外两张牌拦不住它。",
    setup: 4,
    duration: 10,
    slots: 5,
    train: ["v2.0", "封版", "待发"],
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
    brief: "封版之后，v2.0 准点发车。实时风控要过封版检查，批量导出要过安全评审。",
    hint: "风控用「封版检查」，批量导出用「安全评审」。合规打不回风控。",
    setup: 3,
    duration: 9,
    slots: 4,
    train: ["v2.0", "发车", "准点"],
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
