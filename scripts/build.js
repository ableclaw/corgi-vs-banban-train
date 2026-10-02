import { spawnSync } from "node:child_process";
import fs from "node:fs";

const bundled = spawnSync(
  "npx",
  ["--yes", "esbuild", "js/main.js", "--bundle", "--format=iife", "--target=es2020", "--outfile=.play.bundle.js"],
  { stdio: "inherit" },
);
if (bundled.status !== 0) process.exit(bundled.status || 1);

const code = fs.readFileSync(".play.bundle.js", "utf8").replace(/<\/script/gi, "<\\/script");
const css = fs.readFileSync("css/style.css", "utf8").replace(/<\/style/gi, "<\\/style");
const svg = fs.readFileSync("favicon.svg", "utf8");
const icon = `data:image/svg+xml,${encodeURIComponent(svg)}`;
let html = fs.readFileSync("index.html", "utf8");
html = html.replace(
  '<link rel="icon" href="favicon.svg" type="image/svg+xml" />',
  `<link rel="icon" href="${icon}" type="image/svg+xml" />`,
);
html = html.replace('<link rel="stylesheet" href="css/style.css" />', `<style>\n${css}\n</style>`);
html = html.replace('<script type="module" src="js/main.js"></script>', `<script>\n${code}\n</script>`);
fs.writeFileSync("play.html", html);
fs.unlinkSync(".play.bundle.js");
console.log(`play.html ${html.length} bytes`);
