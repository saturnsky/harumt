import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { Config } from "./config.js";
import {
  Dictionary,
  type SupplementalLexiconMemoryCache,
  type UserLexiconEntry
} from "./dictionary.js";
import { PageCachedFileSource } from "./node-dictionary-provider.js";
import type { DictionaryDataSource } from "./dictionary-provider.js";
import { HaruDictionaryProvider } from "./haru-dictionary-provider.js";
import { SudachiAnalyzer, type SudachiDictType } from "./index.js";
import { resolveDefaultSystemDictPath } from "../system-dictionary-asset.js";
import { UserDictionary, type UserDictEntry } from "../user-dictionary.js";

function systemIndexPath(systemDictPath: string): string {
  return systemDictPath.replace(/\.hrdic$/u, "") + ".hridx";
}

export function resolveDefaultSudachiSystemDictPath(systemDictPath: string = resolveDefaultSystemDictPath()): string | undefined {
  if (!existsSync(systemDictPath) || !existsSync(systemIndexPath(systemDictPath))) {
    return undefined;
  }
  return systemDictPath;
}

export function buildUserDict(
  entries: readonly UserDictEntry[],
  outputPath: string,
  _dictType: SudachiDictType = "full"
): void {
  mkdirSync(dirname(outputPath), { recursive: true });
  const dict = new UserDictionary(entries);
  const lexicon = dict.lexiconEntries;
  writeFileSync(
    withSuffix(outputPath, ".csv"),
    lexicon.map((entry) => personCsvLine(entry)).join("\n") + "\n",
    "utf8"
  );
  writeFileSync(
    outputPath,
    JSON.stringify({
      format: "sudachi-js-person-user-dict-v1",
      entries: lexicon,
      sourceEntries: entries.map(normalizeUserDictEntry)
    }, null, 2) + "\n",
    "utf8"
  );
}

export function readUserDictSource(userDictPath: string): UserDictionary | undefined {
  const text = readFileSync(userDictPath, "utf8").trim();
  if (!text.startsWith("{")) {
    return undefined;
  }
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (!isRecord(data) || data["format"] !== "sudachi-js-person-user-dict-v1") {
    return undefined;
  }
  const sourceEntries = data["sourceEntries"];
  if (sourceEntries === undefined) {
    return undefined;
  }
  if (!Array.isArray(sourceEntries) || !sourceEntries.every(isUserDictEntry)) {
    throw new Error(`Invalid sourceEntries in user dictionary: ${userDictPath}`);
  }
  return new UserDictionary(sourceEntries.map(normalizeUserDictEntry));
}

function normalizeUserDictEntry(entry: UserDictEntry): UserDictEntry {
  return {
    japanese: entry.japanese,
    category: entry.category,
    ...(entry.korean !== undefined ? { korean: entry.korean } : {}),
    ...(entry.reading !== undefined ? { reading: entry.reading } : {})
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUserDictEntry(value: unknown): value is UserDictEntry {
  return isRecord(value)
    && typeof value["japanese"] === "string"
    && typeof value["category"] === "string"
    && (value["korean"] === undefined || typeof value["korean"] === "string")
    && (value["reading"] === undefined || typeof value["reading"] === "string");
}

export async function createSudachiAnalyzer(
  _dictType: SudachiDictType = "full",
  userDictPath: string | null = null,
  configPath?: string | null,
  openBinaryOverride?: (path: string) => DictionaryDataSource,
  supplementalLexicon?: readonly UserLexiconEntry[],
  supplementalMemoryCache?: SupplementalLexiconMemoryCache,
  systemDictPathOption: string = resolveDefaultSystemDictPath()
): Promise<SudachiAnalyzer> {
  const systemDictPath = requireSudachiSystemDictPath(systemDictPathOption);
  const provider = new HaruDictionaryProvider(systemDictPath, {
    openBinary: openBinaryOverride ?? ((path) => new PageCachedFileSource(path)),
    readText: (path) => readFileSync(path, "utf8")
  });
  const config = configPath === undefined || configPath === null
    ? await provider.readConfiguration(systemDictPath)
    : new Config(JSON.parse(readFileSync(configPath, "utf8")));
  const dictionary = await Dictionary.fromConfig(config, provider);
  if (supplementalLexicon !== undefined && supplementalLexicon.length > 0) {
    if (supplementalMemoryCache === undefined) {
      dictionary.addSupplementalLexicon(supplementalLexicon);
    } else {
      if (supplementalMemoryCache.resolved === undefined) {
        const resolved = dictionary.resolveSupplementalLexicon(supplementalLexicon);
        if (resolved !== undefined) {
          supplementalMemoryCache.resolved = resolved;
        }
      }
      if (supplementalMemoryCache.resolved !== undefined) {
        dictionary.addResolvedSupplementalLexicon(supplementalMemoryCache.resolved);
      }
    }
  }
  if (userDictPath !== null) {
    dictionary.addUserDictionaryBytes(readFileSync(userDictPath));
  }
  return new SudachiAnalyzer(dictionary);
}

function requireSudachiSystemDictPath(path: string): string {
  const systemDictPath = resolveDefaultSudachiSystemDictPath(path);
  if (systemDictPath === undefined) {
    throw new Error(
      `HaruMT system dictionary not found. Expected ${path} and ${systemIndexPath(path)}. ` +
      "Install it with `npx harumt-fetch-dictionary`, " +
      "or pass the systemDictPath option."
    );
  }
  return systemDictPath;
}

function personCsvLine(entry: {
  readonly surface: string;
  readonly leftId: number;
  readonly rightId: number;
  readonly cost: number;
  readonly pos: readonly string[];
  readonly reading: string;
}): string {
  return [
    entry.surface,
    String(entry.leftId),
    String(entry.rightId),
    String(entry.cost),
    entry.surface,
    ...entry.pos,
    entry.reading,
    entry.surface,
    "*",
    "A",
    "*",
    "*",
    "*"
  ].join(",");
}

function withSuffix(path: string, suffix: string): string {
  const basenameStart = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\")) + 1;
  const dot = path.lastIndexOf(".");
  if (dot >= basenameStart) {
    return `${path.slice(0, dot)}${suffix}`;
  }
  return `${path}${suffix}`;
}
