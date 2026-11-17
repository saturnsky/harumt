
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { homedir } from "node:os";
import { AsyncLocalStorage } from "node:async_hooks";

import {
  setDataLoader,
  type DataLoader,
  type DataLoaderEntry,
  type DataLoaderStat
} from "./data-loader.js";
import {
  initAllTables,
  resolveDictDirs,
  loadDictsAndBuildPipeline,
  loadLookupTablesProvider,
  loadNumericTablesProvider,
  type TranslationPipelineOptions
} from "./pipeline-factory.js";

import { clearProviderCaches as clearFactoryProviderCaches } from "./pipeline-factory.js";
import { resolveDataDir } from "./pipeline/data-paths.js";
import { loadSupplementalLexicon } from "./analyzer-lexicon.js";
import type {
  SupplementalLexiconMemoryCache,
  UserLexiconEntry
} from "./analyzer/dictionary.js";
import { tsvDirFingerprint, type TranslationPipeline } from "./pipeline/core.js";
import { createSudachiAnalyzer, readUserDictSource } from "./analyzer/node-helpers.js";
import type { DictionaryDataSource } from "./analyzer/dictionary-provider.js";
import { LookupTables } from "./pipeline/lookup-tables.js";
import { NumericTables } from "./generator/numeric-lookup.js";
import { DEFAULT_DATA_DIR } from "./package-paths.js";
import { resolveDefaultSystemDictPath } from "./system-dictionary-asset.js";
import { installProtoLayoutStorage } from "./pipeline/clause-layout/proto-state.js";

class NodeDataLoader implements DataLoader {
  dataDir = DEFAULT_DATA_DIR;

  async readTextFile(path: string): Promise<string> {
    return readFileSync(path, "utf8");
  }
  async readBinaryFile(path: string): Promise<Uint8Array> {
    return readFileSync(path);
  }
  async readDir(path: string): Promise<readonly DataLoaderEntry[]> {
    return readdirSync(path, { withFileTypes: true }).map((e) => ({
      name: e.name,
      isDirectory: e.isDirectory(),
      isFile: e.isFile()
    }));
  }
  async stat(path: string): Promise<DataLoaderStat> {
    const s = statSync(path, { bigint: true });
    return {
      size: Number(s.size),
      mtimeNs: s.mtimeNs,
      isFile: s.isFile(),
      isDirectory: s.isDirectory()
    };
  }
  async exists(path: string): Promise<boolean> {
    return existsSync(path);
  }
  joinPath(...segments: string[]): string {
    return join(...segments);
  }
  dirName(path: string): string {
    return dirname(path);
  }
  getDataDir(): string {
    return this.dataDir;
  }
  getHomeDir(): string {
    return homedir();
  }
}

const nodeDataLoader = new NodeDataLoader();

setDataLoader(nodeDataLoader);
installProtoLayoutStorage(new AsyncLocalStorage());

let _initialized = false;

export async function ensureInitialized(dataDir?: string): Promise<void> {
  const requested = dataDir === undefined ? undefined : resolveResourceDir(dataDir);
  if (_initialized) {
    if (requested !== undefined && requested !== nodeDataLoader.dataDir) {
      throw new Error(`data directory is already initialized as ${nodeDataLoader.dataDir}; cannot switch to ${requested}`);
    }
    return;
  }
  if (requested !== undefined) nodeDataLoader.dataDir = requested;
  await initAllTables(nodeDataLoader);
  _initialized = true;
}

function resolveResourceDir(dirPath: string): string {
  if (/^~[^/]/u.test(dirPath)) {
    throw new Error(`unsupported user home expansion in path: ${dirPath}`);
  }
  const expanded =
    dirPath === "~" || dirPath.startsWith("~/")
      ? join(homedir(), dirPath.slice(2))
      : dirPath;
  return resolve(expanded);
}

export function resolveSupplementalLexiconDir(
  options: TranslationPipelineOptions
): string | null {
  if (options.supplementalLexiconDir === null) {
    return null;
  }
  return resolveResourceDir(
    options.supplementalLexiconDir ??
      nodeDataLoader.joinPath(resolveDataDir(options), "dict", "analyzer-lexicon")
  );
}

type SupplementalFingerprint = Awaited<ReturnType<typeof tsvDirFingerprint>>;
interface SupplementalCacheSlot extends SupplementalLexiconMemoryCache {
  readonly fingerprint: string;
  readonly entriesPromise: Promise<readonly UserLexiconEntry[]>;
}
const supplementalLexiconCache = new Map<string, SupplementalCacheSlot>();

function encodeSupplementalFingerprint(fingerprint: SupplementalFingerprint): string {
  return fingerprint
    .map(([name, size, mtimeNs]) => `${name}${size}${mtimeNs.toString()}`)
    .join("");
}

async function loadCachedSupplementalLexicon(
  loader: DataLoader,
  dir: string
): Promise<SupplementalCacheSlot> {
  const fingerprint = encodeSupplementalFingerprint(await tsvDirFingerprint(dir));
  const cached = supplementalLexiconCache.get(dir);
  if (cached !== undefined && cached.fingerprint === fingerprint) {
    return cached;
  }
  const entriesPromise = loadSupplementalLexicon(loader, dir);
  const slot = { fingerprint, entriesPromise };
  supplementalLexiconCache.set(dir, slot);
  return slot;
}

export function clearProviderCaches(): void {
  supplementalLexiconCache.clear();
  clearFactoryProviderCaches();
}

export async function createTranslationPipeline(
  options: TranslationPipelineOptions = {},
  openBinaryOverride?: (path: string) => DictionaryDataSource
): Promise<TranslationPipeline> {
  await ensureInitialized(options.dataDir);

  const loader = nodeDataLoader;
  const dirs = resolveDictDirs(loader, options);
  dirs.dictDir = resolveResourceDir(dirs.dictDir);
  dirs.patternDir = resolveResourceDir(dirs.patternDir);
  dirs.collocationDir = resolveResourceDir(dirs.collocationDir);
  dirs.numericSplitsDir = resolveResourceDir(dirs.numericSplitsDir);

  const supplementalDir = resolveSupplementalLexiconDir(options);
  const supplementalSlot = supplementalDir === null
    ? undefined
    : await loadCachedSupplementalLexicon(loader, supplementalDir);
  const supplementalLexicon = supplementalSlot === undefined
    ? []
    : await supplementalSlot.entriesPromise;
  const supplementalMemoryCache =
    options.sudachiConfigPath === undefined && openBinaryOverride === undefined && options.systemDictPath === undefined
      ? supplementalSlot
      : undefined;

  const userDictPath = options.userDictPath ?? null;
  const userDictSource = userDictPath === null ? undefined : readUserDictSource(userDictPath);

  const analyzer = await createSudachiAnalyzer(
    "full",
    userDictSource === undefined ? userDictPath : null,
    options.sudachiConfigPath,
    openBinaryOverride,
    supplementalLexicon,
    supplementalMemoryCache,
    resolveResourceDir(options.systemDictPath ?? resolveDefaultSystemDictPath(resolveResourceDir(resolveDataDir(options))))
  );

  const pipeline = await loadDictsAndBuildPipeline(loader, dirs, analyzer, options);
  if (userDictSource !== undefined) {
    pipeline.replaceUserDictionary(userDictSource);
  }
  return pipeline;
}

export async function createLookupTables(): Promise<LookupTables> {
  await ensureInitialized();
  return loadLookupTablesProvider(nodeDataLoader);
}

export async function createNumericTables(): Promise<NumericTables> {
  await ensureInitialized();
  return loadNumericTablesProvider(nodeDataLoader);
}

export {
  resolveDefaultSudachiSystemDictPath,
  buildUserDict,
  createSudachiAnalyzer
} from "./analyzer/node-helpers.js";
