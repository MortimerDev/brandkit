// Bundles src/index.css into one minified file for CDN or <link> use.
import { mkdirSync, writeFileSync } from "node:fs";
import { bundle } from "lightningcss";

const { code } = bundle({ filename: "src/index.css", minify: true, errorRecovery: false });
mkdirSync("dist", { recursive: true });
writeFileSync("dist/brandkit.min.css", code);
console.log(`dist/brandkit.min.css ${(code.length / 1024).toFixed(1)} kB`);
