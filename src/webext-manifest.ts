#!/usr/bin/env node

import { readdirSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

export interface WebextFileEntry {
  readonly path: string;
  readonly size: number;
  readonly mtimeMs?: number;
}

const MANIFEST_NAME = "files.json";

export function collectWebextFileEntries(extensionRoot: string): WebextFileEntry[] {
  const out: WebextFileEntry[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (!entry.isFile() || (dir === join(extensionRoot, "data") && entry.name === MANIFEST_NAME)) continue;
      const stat = statSync(fullPath);
      out.push({
        path: relative(extensionRoot, fullPath).replace(/\\/g, "/"),
        size: stat.size,
        mtimeMs: Math.trunc(stat.mtimeMs)
      });
    }
  };
  walk(join(extensionRoot, "data"));
  return out.sort((left, right) => left.path.localeCompare(right.path));
}

export function buildWebextFileManifest(entries: readonly WebextFileEntry[]): string {
  let selfSize = 0;
  for (; ;) {
    const allFiles = [...entries, { path: `data/${MANIFEST_NAME}`, size: selfSize, mtimeMs: 0 }]
      .sort((left, right) => left.path.localeCompare(right.path));
    const content = `${JSON.stringify(allFiles, null, 2)}\n`;
    const nextSize = Buffer.byteLength(content);
    if (nextSize === selfSize) return content;
    selfSize = nextSize;
  }
}

export function writeWebextDataManifest(extensionRoot: string): number {
  const entries = collectWebextFileEntries(extensionRoot);
  writeFileSync(join(extensionRoot, "data", MANIFEST_NAME), buildWebextFileManifest(entries), "utf8");
  return entries.length + 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const root = process.argv[2];
  if (root === undefined) {
    console.error("usage: harumt-webext-manifest <extension-root>");
    process.exit(2);
  }
  console.log(`webext data files: ${writeWebextDataManifest(root)}`);
}
