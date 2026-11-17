
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isBunVirtualPath } from "./bun-compat.js";

const moduleDir = dirname(fileURLToPath(import.meta.url));

export const PACKAGE_ROOT = isBunVirtualPath(moduleDir) ? process.cwd() : resolve(moduleDir, "..");

export const DEFAULT_DATA_DIR = join(PACKAGE_ROOT, "data");

export function defaultSystemDictPath(dataDir: string = DEFAULT_DATA_DIR): string {
  return join(dataDir, "dict", "system.hrdic");
}
