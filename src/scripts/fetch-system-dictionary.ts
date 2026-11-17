#!/usr/bin/env node

import { createHash, randomUUID } from "node:crypto";
import { createReadStream, createWriteStream, existsSync, mkdirSync, readdirSync, realpathSync, renameSync, rmSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { pathToFileURL } from "node:url";
import { createGunzip } from "node:zlib";
import {
  assertManifestPathSegment,
  readSystemDictionaryManifest,
  userSystemDictDir,
  userSystemDictRoot,
  type SystemDictionaryFile,
  type SystemDictionaryManifest,
  type UserDataEnvironment
} from "../system-dictionary-asset.js";

export interface InstallSystemDictionaryOptions {
  readonly out?: string;
  readonly from?: string;
  readonly force?: boolean;
  readonly manifest?: SystemDictionaryManifest;
  readonly environment?: UserDataEnvironment;
  readonly log?: (message: string) => void;
}

export async function installSystemDictionary(options: InstallSystemDictionaryOptions = {}): Promise<void> {
  const manifest = options.manifest ?? readSystemDictionaryManifest();
  for (const file of manifest.files) assertManifestPathSegment("file name", file.name);
  const out = resolve(options.out ?? userSystemDictDir(manifest.id, options.environment));
  const log = options.log ?? (() => {});
  mkdirSync(out, { recursive: true });
  for (const file of manifest.files) {
    const target = join(out, file.name);
    if (!options.force && await isInstalled(target, file)) {
      log(`${file.name}: already installed (${manifest.id})`);
      continue;
    }
    const source = options.from === undefined ? manifest.url + file.asset : join(resolve(options.from), file.asset);
    log(`${file.name}: installing from ${source}`);
    const partial = `${target}.${process.pid}-${randomUUID()}.partial`;
    try {
      const hash = createHash("sha256");
      let size = 0;
      await pipeline(
        await openAsset(source, options.from !== undefined),
        createGunzip(),
        new Transform({
          transform(chunk: Buffer, _encoding, done) {
            hash.update(chunk);
            size += chunk.length;
            done(null, chunk);
          }
        }),
        createWriteStream(partial, { flags: "wx" })
      );
      const sha256 = hash.digest("hex");
      if (size !== file.size || sha256 !== file.sha256) {
        throw new Error(`${file.name}: verification failed (expected ${file.size} bytes ${file.sha256}, got ${size} bytes ${sha256})`);
      }
      renameSync(partial, target);
    } finally {
      rmSync(partial, { force: true });
    }
  }
  log(`system dictionary ${manifest.id} installed in ${out}`);
  if (options.out === undefined) reportOtherDictionaryVersions(manifest.id, options.environment, log);
}

function reportOtherDictionaryVersions(id: string, environment: UserDataEnvironment | undefined, log: (message: string) => void): void {
  const root = userSystemDictRoot(environment);
  const others = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== id)
    .map((entry) => entry.name);
  if (others.length === 0) return;
  log(`other dictionary versions in ${root}: ${others.join(", ")} — this version does not use them; ` +
    "delete them by hand if no other project depends on an older harumt");
}

async function isInstalled(path: string, file: SystemDictionaryFile): Promise<boolean> {
  if (!existsSync(path) || statSync(path).size !== file.size) return false;
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk as Buffer);
  return hash.digest("hex") === file.sha256;
}

async function openAsset(source: string, local: boolean): Promise<Readable> {
  if (local) return createReadStream(source);
  const response = await fetch(source);
  if (!response.ok || response.body === null) throw new Error(`download failed: ${source} (${response.status} ${response.statusText})`);
  return Readable.from(response.body, { objectMode: false });
}

const usage = `Usage: harumt-fetch-dictionary [options]

Downloads the HaruMT system dictionary (system.hrdic, system.hridx) and verifies it.

Options:
  --out <dir>    Install directory (default: <user data dir>/harumt/dict/<dictionary id>, where
                 the pipeline looks by default; elsewhere, pass the path as systemDictPath)
  --from <dir>   Install from a local directory holding the release assets (*.gz)
  --force        Reinstall even when the installed files already match
  -h, --help     Show this help
`;

async function main(args: readonly string[]): Promise<void> {
  const options: { out?: string; from?: string; force?: boolean } = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]!;
    if (arg === "-h" || arg === "--help") {
      console.log(usage);
      return;
    }
    if (arg === "--force") options.force = true;
    else if (arg === "--out" || arg === "--from") {
      const value = args[++i];
      if (value === undefined) throw new Error(`missing value after ${arg}`);
      options[arg === "--out" ? "out" : "from"] = value;
    } else throw new Error(`unknown option: ${arg}\n\n${usage}`);
  }
  await installSystemDictionary({ ...options, log: (message) => console.log(message) });
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
