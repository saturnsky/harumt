
import { CONJUGATION_TEMPLATES_FILENAME } from "../analyzer-lexicon.js";
import { type DataLoader, getDataLoader } from "../data-loader.js";
import { CollocationDictionary } from "../dictionary/collocation.js";
import { type FuzzyLevel, MorphemeDictionary } from "../dictionary/morpheme.js";
import { PatternDictionary } from "../dictionary/pattern.js";
import { ReanalysisDictionary } from "../dictionary/reanalysis.js";
import type { NumericTables } from "../generator/numeric-lookup.js";
import type { LookupTables } from "./lookup-tables.js";

const RESOURCE_CACHE_MAX_SIZE = 32;
const morphemeDictionaryStateCache = new Map<string, MorphemeDictionary>();
const patternDictionaryStateCache = new Map<string, PatternDictionary>();
const collocationDictionaryStateCache = new Map<string, CollocationDictionary>();
const reanalysisDictionaryStateCache = new Map<string, ReanalysisDictionary>();

type JsonlFingerprint = readonly (readonly [relativePath: string, size: number, mtimeNs: bigint])[];

export function clearPipelineResourceCache(): void {
  morphemeDictionaryStateCache.clear();
  patternDictionaryStateCache.clear();
  collocationDictionaryStateCache.clear();
  reanalysisDictionaryStateCache.clear();
}

function resolveResourceDir(dirPath: string): string {
  const loader = getDataLoader();
  if (/^~[^/]/u.test(dirPath)) {
    throw new Error(`unsupported user home expansion in path: ${dirPath}`);
  }
  const expanded = dirPath === "~" || dirPath.startsWith("~/")
    ? loader.joinPath(loader.getHomeDir(), dirPath.slice(2))
    : dirPath;
  return expanded;
}

async function cachedMorphemeDictionaryState(
  dirPath: string,
  fingerprint: JsonlFingerprint,
  fuzzyLevel: FuzzyLevel,
  lookups: LookupTables,
  numeric: NumericTables
): Promise<MorphemeDictionary> {
  return await rememberCachedStateAsync(
    morphemeDictionaryStateCache,
    cacheKey(dirPath, fingerprint, fuzzyLevel, lookupProviderCacheKey(lookups), numericProviderCacheKey(numeric)),
    async () => {
      const dictionary = new MorphemeDictionary(fuzzyLevel);
      await dictionary.load(getDataLoader(), dirPath, lookups, numeric);
      return dictionary;
    }
  );
}

async function cachedPatternDictionaryState(
  dirPath: string,
  fingerprint: JsonlFingerprint,
  lookups: LookupTables
): Promise<PatternDictionary> {
  return await rememberCachedStateAsync(
    patternDictionaryStateCache,
    cacheKey(dirPath, fingerprint, undefined, lookupProviderCacheKey(lookups)),
    async () => {
      const patterns = new PatternDictionary();
      await patterns.load(getDataLoader(), dirPath, lookups);
      return patterns;
    }
  );
}

async function cachedCollocationDictionaryState(
  dirPath: string,
  fingerprint: JsonlFingerprint,
  lookups: LookupTables | undefined
): Promise<CollocationDictionary> {
  return await rememberCachedStateAsync(
    collocationDictionaryStateCache,
    cacheKey(dirPath, fingerprint, undefined, ...(lookups === undefined ? [] : [lookupProviderCacheKey(lookups)])),
    async () => {
      const collocations = new CollocationDictionary();
      await collocations.load(getDataLoader(), dirPath, lookups);
      return collocations;
    }
  );
}

export async function loadCachedMorphemeDictionary(
  dirPath: string,
  lookups: LookupTables,
  numeric: NumericTables,
  options: { readonly fuzzyLevel?: FuzzyLevel } = {}
): Promise<MorphemeDictionary> {
  const resolved = resolveResourceDir(dirPath);
  const state = await cachedMorphemeDictionaryState(
    resolved,
    await jsonlDirFingerprint(resolved),
    options.fuzzyLevel ?? "basic",
    lookups,
    numeric
  );
  return state.cloneShallow();
}

export async function loadCachedPatternDictionary(dirPath: string, lookups: LookupTables): Promise<PatternDictionary> {
  const resolved = resolveResourceDir(dirPath);
  const state = await cachedPatternDictionaryState(
    resolved,
    await jsonlDirFingerprint(resolved, { recursive: false }),
    lookups
  );
  return state.cloneShallow();
}

export async function loadCachedCollocationDictionary(
  dirPath: string,
  lookups?: LookupTables
): Promise<CollocationDictionary> {
  const resolved = resolveResourceDir(dirPath);
  const state = await cachedCollocationDictionaryState(
    resolved,
    await jsonlDirFingerprint(resolved),
    lookups
  );
  return state.cloneShallow();
}

async function cachedReanalysisDictionaryState(
  dirPath: string,
  fingerprint: JsonlFingerprint
): Promise<ReanalysisDictionary> {
  return await rememberCachedStateAsync(
    reanalysisDictionaryStateCache,
    cacheKey(dirPath, fingerprint),
    async () => {
      const reanalysis = new ReanalysisDictionary();
      await reanalysis.load(getDataLoader(), dirPath);
      return reanalysis;
    }
  );
}

export async function loadCachedReanalysisDictionary(dirPath: string): Promise<ReanalysisDictionary> {
  const resolved = resolveResourceDir(dirPath);
  const state = await cachedReanalysisDictionaryState(
    resolved,
    await jsonlDirFingerprint(resolved)
  );
  return state.cloneShallow();
}

async function rememberCachedStateAsync<T>(
  cache: Map<string, T>,
  key: string,
  factory: () => Promise<T>
): Promise<T> {
  const cached = cache.get(key);
  if (cached !== undefined) {
    cache.delete(key);
    cache.set(key, cached);
    return cached;
  }
  const value = await factory();
  cache.set(key, value);
  if (cache.size > RESOURCE_CACHE_MAX_SIZE) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) {
      cache.delete(firstKey);
    }
  }
  return value;
}

function lookupProviderCacheKey(lookups: LookupTables): string {
  return `lookup:${lookups.providerCacheKey()}`;
}

function numericProviderCacheKey(numeric: NumericTables): string {
  return `numeric:${numeric.providerCacheKey()}`;
}

function cacheKey(dirPath: string, fingerprint: JsonlFingerprint, fuzzyLevel?: FuzzyLevel, ...providerKeys: readonly string[]): string {
  const fingerprintKey = fingerprint
    .map(([relativePath, size, mtimeNs]) => `${relativePath}\u001f${size}\u001f${mtimeNs.toString()}`)
    .join("\u001e");
  return `${dirPath}\0${fuzzyLevel ?? ""}\0${providerKeys.join("\u001d")}\0${fingerprintKey}`;
}

export async function jsonlDirFingerprint(dirPath: string, options: { readonly recursive?: boolean } = {}): Promise<JsonlFingerprint> {
  const loader = getDataLoader();
  const files: (readonly [string, number, bigint])[] = [];
  await collectJsonlFingerprints(loader, resolveResourceDir(dirPath), "", files, options.recursive ?? true);
  return files.sort(([left], [right]) => left.localeCompare(right));
}

async function collectJsonlFingerprints(loader: DataLoader, dirPath: string, relativePrefix: string, files: (readonly [string, number, bigint])[], recursive: boolean): Promise<void> {
  if (!(await loader.exists(dirPath))) {
    return;
  }
  for (const entry of await loader.readDir(dirPath)) {
    const fullPath = loader.joinPath(dirPath, entry.name);
    const relativePath = relativePrefix.length === 0 ? entry.name : `${relativePrefix}/${entry.name}`;
    if (entry.isDirectory) {
      if (recursive) {
        await collectJsonlFingerprints(loader, fullPath, relativePath, files, recursive);
      }
      continue;
    }
    if (!entry.name.endsWith(".jsonl")) {
      continue;
    }
    try {
      const stat = await loader.stat(fullPath);
      if (!stat.isFile) continue;
      files.push([relativePath, stat.size, stat.mtimeNs]);
    } catch {
      continue;
    }
  }
}

export async function tsvDirFingerprint(dirPath: string): Promise<JsonlFingerprint> {
  const loader = getDataLoader();
  const resolved = resolveResourceDir(dirPath);
  const files: (readonly [string, number, bigint])[] = [];
  if (!(await loader.exists(resolved))) {
    return files;
  }
  for (const entry of await loader.readDir(resolved)) {
    if (entry.isDirectory) {
      continue;
    }
    if (!(entry.name.endsWith(".tsv") || entry.name === CONJUGATION_TEMPLATES_FILENAME)) {
      continue;
    }
    const fullPath = loader.joinPath(resolved, entry.name);
    try {
      const stat = await loader.stat(fullPath);
      if (!stat.isFile) continue;
      files.push([entry.name, stat.size, stat.mtimeNs]);
    } catch {
      continue;
    }
  }
  return files.sort(([left], [right]) => left.localeCompare(right));
}
