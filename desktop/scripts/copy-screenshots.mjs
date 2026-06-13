import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = join(root, "..", "Screenshots", "desktop");
const targets = [
  join(root, "src", "assets", "screenshots", "desktop"),
  join(root, "public", "screenshots", "desktop"),
];

const files = readdirSync(source).filter((name) => name.endsWith(".png"));

for (const target of targets) {
  mkdirSync(target, { recursive: true });
  for (const file of files) {
    copyFileSync(join(source, file), join(target, file));
  }
}

console.log(`Copied ${files.length} screenshots to ${targets.length} folders.`);
