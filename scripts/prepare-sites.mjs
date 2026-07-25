import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "..");
const targetDirectory = resolve(projectRoot, "dist", "server");

await mkdir(targetDirectory, { recursive: true });
await copyFile(
  resolve(projectRoot, "sites-worker.js"),
  resolve(targetDirectory, "index.js"),
);
