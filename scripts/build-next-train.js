import fs from "node:fs";

const engine = fs.readFileSync("next-train/engine.js", "utf8")
  .replace(/^export /gm, "")
  .replace(/<\/script/gi, "<\\/script");
const ui = fs.readFileSync("next-train/ui.js", "utf8")
  .replace(/import \{[^}]+\} from "\.\/engine\.js";\n/, "")
  .replace(/<\/script/gi, "<\\/script");
const css = fs.readFileSync("next-train/style.css", "utf8").replace(/<\/style/gi, "<\\/style");
let html = fs.readFileSync("next-train/index.html", "utf8");
html = html.replace('<link rel="stylesheet" href="style.css" />', `<style>\n${css}\n</style>`);
html = html.replace(
  '<script type="module" src="ui.js"></script>',
  `<script>\n${engine}\n${ui}\n</script>`,
);
fs.writeFileSync("next-train/play.html", html);
console.log(`next-train/play.html ${html.length} bytes`);
