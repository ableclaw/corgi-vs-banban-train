# 准点发车

火车准点开，你决定谁上车、谁留下。

版本火车按点发车。没准备好的需求赶不上这一班，就等下一班。玩家是内部干系人，在需求轨道上放下流程牌，让指定需求错过上车。火车本身不会被拦住，也不会被拆掉。

## 在线游玩

不用登录。公开单页：

**https://htmlpreview.github.io/?https://github.com/ableclaw/corgi-vs-banban-train/blob/gh-pages/play.html**

仓库的 `gh-pages` 分支已经放好 `play.html` 和整站。仓库主人在 Settings → Pages 里选 Deploy from a branch → `gh-pages` / root 之后，干净地址是：

**https://ableclaw.github.io/corgi-vs-banban-train/**

## 怎么玩

每一关是一班从左到右的车。右边是上线站。先有几秒布置窗口，窗口里可以放下流程牌，也可以再点同一格拿起来。窗口结束后车开始走，已经放下的牌不能再拿起，还没走过的空格可以补牌。

点一张流程牌，再点需求轨道上的格子。标着「别上这班」的需求必须错过这班车。其他需求可以上车。车到点照开。

流程牌只拖需求，不停车：

| 牌 | 效果 |
| --- | --- |
| 防火墙、封版检查 | 一直挡住，过不去 |
| 需求评审 | 过这一格变得很慢 |
| 工单 | 排个短队，通常拦不住 |
| 安全评审、联调失败、热修 | 干等一会儿 |
| 合规 | 打回去补材料 |

五班难度往上走：车更快、布置更短，或者轨道更直、牌更紧。

| 班次 | 名称 | 要留下的需求 |
| --- | --- | --- |
| 1 | 需求 | 暗黑模式 |
| 2 | 评审 | 导出报表（按钮文案可以上） |
| 3 | 联调 | 支付联调、发票接口 |
| 4 | 封版 | 权限改造 |
| 5 | 发车 | 实时风控、批量导出 |

越早拦住、剩下的牌越多、不该拦的需求正常上车，分数越高。让目标上了这班车就是输。

操作：鼠标或触屏点选。数字键 1–9 选牌，布置窗口里按 Z 撤回上一张。过关后解锁下一班，进度写在这台设备的 `localStorage`（键名 `train-dispatch-save-v1`）。

界面上能看到距发车倒计时、剩余流程牌，以及谁上车、谁没赶上。

## 本地运行

需要 Node.js 18+。没有需要安装的依赖。

```bash
npm test
npm start
npm run build
```

浏览器打开 http://127.0.0.1:3000 。

`npm test` 用固定摆牌把五班都拦住，并检查第 1 班过关会解锁第 2 班。不放牌、或只放一张工单，第 1 班应当输掉。

`npm run build` 把样式和脚本打进单文件 `play.html`，给不能加载相对路径模块的预览站使用。

## 部署

静态页面，没有后端。

```bash
npm run build
git push origin HEAD:gh-pages
```

开启 GitHub Pages（需要仓库管理员，当前自动化令牌没有这个权限）：

1. 打开仓库 Settings → Pages。
2. Build and deployment 选 Deploy from a branch。
3. Branch 选 `gh-pages`，目录选 `/ (root)`，保存。
4. 等一分钟，打开 https://ableclaw.github.io/corgi-vs-banban-train/

也可以用接口（令牌需要 Pages 管理权限）：

```bash
gh api --method POST repos/ableclaw/corgi-vs-banban-train/pages \
  -f build_type=legacy \
  -f source[branch]=gh-pages \
  -f source[path]=/
```

## 项目结构

```
index.html           标题、选班、对局
play.html            构建出的单文件，给公开预览用
css/style.css        界面
js/catalog.js        流程牌
js/levels.js         五班时刻表
js/engine.js         摆牌、需求走动、准点发车
js/save.js           本机进度
js/main.js           点击、触屏、键盘
test/playability.js  可通关测试
```
