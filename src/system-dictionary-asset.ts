
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";
import { DEFAULT_DATA_DIR, defaultSystemDictPath } from "./package-paths.js";

export const HARU_REPOSITORY = "saturnsky/harumt";

export interface SystemDictionaryFile {
  readonly name: string;
  readonly size: number;
  readonly sha256: string;
  readonly asset: string;
  readonly assetSize: number;
}

export interface SystemDictionaryManifest {
  readonly id: string;
  readonly url: string;
  readonly files: readonly SystemDictionaryFile[];
}

export const SYSTEM_DICTIONARY_MANIFEST_PATH = join(DEFAULT_DATA_DIR, "dict", "system-dictionary.json");

export function systemDictionaryReleaseTag(id: string): string {
  return `dict-${id}`;
}

export function systemDictionaryReleaseUrl(id: string): string {
  return `https://github.com/${HARU_REPOSITORY}/releases/download/${systemDictionaryReleaseTag(id)}/`;
}

export function readSystemDictionaryManifest(path: string = SYSTEM_DICTIONARY_MANIFEST_PATH): SystemDictionaryManifest {
  return JSON.parse(readFileSync(path, "utf8")) as SystemDictionaryManifest;
}

export interface UserDataEnvironment {
  readonly env?: NodeJS.ProcessEnv;
  readonly platform?: NodeJS.Platform;
  readonly home?: string;
}

export function haruUserDataDir(environment: UserDataEnvironment = {}): string {
  const env = environment.env ?? process.env;
  const platform = environment.platform ?? process.platform;
  const home = environment.home ?? homedir();
  if (platform === "darwin") return join(home, "Library", "Application Support", "harumt");
  if (platform === "win32") return join(env.LOCALAPPDATA || join(home, "AppData", "Local"), "harumt");
  const xdg = env.XDG_DATA_HOME;
  return join(xdg !== undefined && isAbsolute(xdg) ? xdg : join(home, ".local", "share"), "harumt");
}

export function userSystemDictRoot(environment: UserDataEnvironment = {}): string {
  return join(haruUserDataDir(environment), "dict");
}

export function assertManifestPathSegment(kind: "id" | "file name", value: string): void {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(value)) throw new Error(`invalid system dictionary ${kind} in manifest: ${JSON.stringify(value)}`);
}

export function userSystemDictDir(id: string, environment: UserDataEnvironment = {}): string {
  assertManifestPathSegment("id", id);
  return join(userSystemDictRoot(environment), id);
}

export function resolveDefaultSystemDictPath(dataDir: string = DEFAULT_DATA_DIR, environment: UserDataEnvironment = {}): string {
  const local = defaultSystemDictPath(dataDir);
  const localComplete = existsSync(local) && existsSync(local.replace(/\.hrdic$/u, ".hridx"));
  if (localComplete || !existsSync(SYSTEM_DICTIONARY_MANIFEST_PATH)) return local;
  return join(userSystemDictDir(readSystemDictionaryManifest().id, environment), "system.hrdic");
}
