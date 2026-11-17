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
  type TranslationPipelineOptions
} from "./pipeline-factory.js";
import { TranslationPipeline } from "./pipeline/core.js";
import { resolveDataDir } from "./pipeline/data-paths.js";
import { SudachiAnalyzer, type SudachiDictType } from "./analyzer/index.js";
import { Dictionary, type UserLexiconEntry } from "./analyzer/dictionary.js";
import { EagerDataSource, type DictionaryDataSource } from "./analyzer/dictionary-provider.js";
import { HaruDictionaryProvider } from "./analyzer/haru-dictionary-provider.js";
import { loadSupplementalLexicon } from "./analyzer-lexicon.js";
import { translationPipelineCacheKey, withPublicPipelineDefaults } from "./pipeline-cache-key.js";
import type { WebextFileEntry } from "./webext-manifest.js";

export { decideRegisters, type StreamDecision } from "./stateful/register-stream.js";
export type { WebextFileEntry } from "./webext-manifest.js";

interface ExtensionRuntime {
  readonly runtime?: { getURL?(path: string): string };
}

export interface WebextResourceOptions {
  readonly resolveUrl?: (path: string) => string;
  readonly baseUrl?: string | URL;
}

const DATA_ROOT = "data";
const MANIFEST_PATH = `${DATA_ROOT}/files.json`;

class WebextDataLoader implements DataLoader {
  private readonly files = new Map<string, WebextFileEntry>();
  private readonly dirs = new Set<string>();
  private readonly textCache = new Map<string, Promise<string>>();
  private readonly binaryCache = new Map<string, Promise<Uint8Array>>();
  private readonly filesReady: Promise<void>;

  constructor(private readonly resourceUrl: (path: string) => string) {
    this.dirs.add(DATA_ROOT);
    this.filesReady = this.loadFiles();
  }

  async readTextFile(path: string): Promise<string> {
    await this.filesReady;
    const normalized = normalizePath(path);
    let cached = this.textCache.get(normalized);
    if (cached === undefined) {
      cached = this.fetchText(normalized);
      this.textCache.set(normalized, cached);
    }
    return cached;
  }

  async readBinaryFile(path: string): Promise<Uint8Array> {
    await this.filesReady;
    return this.readBinaryResource(path);
  }

  async readDir(path: string): Promise<readonly DataLoaderEntry[]> {
    await this.filesReady;
    const normalized = normalizePath(path);
    const prefix = normalized.length === 0 ? "" : `${normalized}/`;
    const names = new Map<string, DataLoaderEntry>();
    for (const dir of this.dirs) {
      if (!dir.startsWith(prefix) || dir === normalized) continue;
      const rest = dir.slice(prefix.length);
      if (rest.length === 0 || rest.includes("/")) continue;
      names.set(rest, { name: rest, isDirectory: true, isFile: false });
    }
    for (const file of this.files.keys()) {
      if (!file.startsWith(prefix)) continue;
      const rest = file.slice(prefix.length);
      if (rest.length === 0 || rest.includes("/")) continue;
      names.set(rest, { name: rest, isDirectory: false, isFile: true });
    }
    return [...names.values()].sort((left, right) => left.name.localeCompare(right.name));
  }

  async stat(path: string): Promise<DataLoaderStat> {
    await this.filesReady;
    const normalized = normalizePath(path);
    const file = this.files.get(normalized);
    if (file !== undefined) {
      return {
        size: file.size,
        mtimeNs: BigInt(Math.trunc(file.mtimeMs ?? 0)) * 1_000_000n,
        isFile: true,
        isDirectory: false
      };
    }
    if (this.dirs.has(normalized)) {
      return { size: 0, mtimeNs: 0n, isFile: false, isDirectory: true };
    }
    throw new Error(`Resource not found: ${path}`);
  }

  async exists(path: string): Promise<boolean> {
    await this.filesReady;
    const normalized = normalizePath(path);
    return this.files.has(normalized) || this.dirs.has(normalized);
  }

  joinPath(...segments: string[]): string {
    return normalizePath(segments.filter((segment) => segment.length > 0).join("/"));
  }

  dirName(path: string): string {
    const normalized = normalizePath(path);
    const index = normalized.lastIndexOf("/");
    if (index <= 0) return index === 0 ? "/" : "";
    return normalized.slice(0, index);
  }

  getDataDir(): string {
    return DATA_ROOT;
  }

  getHomeDir(): string {
    return "";
  }

  async readBinaryResource(path: string): Promise<Uint8Array> {
    await this.filesReady;
    const normalized = normalizePath(path);
    let cached = this.binaryCache.get(normalized);
    if (cached === undefined) {
      cached = this.fetchBinary(normalized);
      this.binaryCache.set(normalized, cached);
    }
    return cached;
  }

  private async fetchText(path: string): Promise<string> {
    return (await this.fetchResource(path)).text();
  }

  private async fetchBinary(path: string): Promise<Uint8Array> {
    return new Uint8Array(await (await this.fetchResource(path)).arrayBuffer());
  }

  private async fetchResource(path: string): Promise<Response> {
    const response = await fetch(this.resourceUrl(path));
    if (!response.ok) {
      throw new Error(`Failed to load ${path}: HTTP ${response.status}`);
    }
    return response;
  }

  private async loadFiles(): Promise<void> {
    const entries = JSON.parse(await this.fetchText(MANIFEST_PATH)) as WebextFileEntry[];
    for (const entry of entries) {
      const path = normalizePath(entry.path);
      this.files.set(path, { ...entry, path });
      this.addParentDirs(path);
    }
  }

  private addParentDirs(path: string): void {
    const parts = path.split("/");
    parts.pop();
    let current = "";
    for (const part of parts) {
      current = current.length === 0 ? part : `${current}/${part}`;
      this.dirs.add(current);
    }
  }
}

let state: { readonly loader: WebextDataLoader; readonly ready: Promise<void> } | null = null;
const pipelinePromises = new Map<string, Promise<TranslationPipeline>>();

export function initializeWebext(options: WebextResourceOptions = {}): Promise<void> {
  if (state !== null) {
    throw new Error("HaruMT webext layer is already initialized");
  }
  const loader = new WebextDataLoader(resourceUrlResolver(options));
  setDataLoader(loader);
  state = { loader, ready: initAllTables(loader) };
  return state.ready;
}

export async function ensureInitialized(): Promise<void> {
  if (state === null) {
    await initializeWebext();
    return;
  }
  await state.ready;
}

function initializedLoader(): WebextDataLoader {
  if (state === null) {
    throw new Error("HaruMT webext layer is not initialized");
  }
  return state.loader;
}

export async function createSudachiAnalyzer(
  _dictType: SudachiDictType = "full",
  userDictPath: string | null = null,
  configPath?: string | null,
  supplementalLexicon?: readonly UserLexiconEntry[],
  systemDictPath = `${DATA_ROOT}/dict/system.hrdic`
): Promise<SudachiAnalyzer> {
  await ensureInitialized();
  const loader = initializedLoader();
  const systemIdxPath = systemDictPath.replace(/\.hrdic$/u, "") + ".hridx";
  if (configPath !== undefined && configPath !== null) {
    throw new Error("Sudachi config files are not supported in the web extension build.");
  }
  if (userDictPath !== null) {
    throw new Error("Sudachi user dictionaries are not supported in the web extension build.");
  }
  const [dictionaryBytes, indexBytes] = await Promise.all([
    loader.readBinaryResource(systemDictPath),
    loader.readBinaryResource(systemIdxPath)
  ]);
  const provider = new HaruDictionaryProvider(systemDictPath, {
    openBinary: (path) => sourceForDictionaryPath(path, dictionaryBytes, indexBytes),
    readText: () => {
      throw new Error("External Sudachi text resources are not available in the web extension build.");
    }
  });
  const config = await provider.readConfiguration(systemDictPath);
  const dictionary = await Dictionary.fromConfig(config, provider);
  if (supplementalLexicon !== undefined && supplementalLexicon.length > 0) {
    dictionary.addSupplementalLexicon(supplementalLexicon);
  }
  return new SudachiAnalyzer(dictionary);
}

function resolveSupplementalLexiconDir(options: TranslationPipelineOptions): string | null {
  if (options.supplementalLexiconDir === null) {
    return null;
  }
  return (
    options.supplementalLexiconDir ??
    initializedLoader().joinPath(resolveDataDir(options), "dict", "analyzer-lexicon")
  );
}

export async function createTranslationPipeline(
  requested: TranslationPipelineOptions = {}
): Promise<TranslationPipeline> {
  const options = withPublicPipelineDefaults(requested);
  const key = translationPipelineCacheKey(options);
  let pipelinePromise = pipelinePromises.get(key);
  if (pipelinePromise !== undefined) return pipelinePromise;
  pipelinePromise = createTranslationPipelineOnce(options);
  pipelinePromises.set(key, pipelinePromise);
  pipelinePromise.catch(() => {
    if (pipelinePromises.get(key) === pipelinePromise) pipelinePromises.delete(key);
  });
  return pipelinePromise;
}

async function createTranslationPipelineOnce(
  options: TranslationPipelineOptions
): Promise<TranslationPipeline> {
  await ensureInitialized();
  const loader = initializedLoader();

  const dirs = resolveDictDirs(loader, options);
  const supplementalDir = resolveSupplementalLexiconDir(options);
  const supplementalLexicon =
    supplementalDir === null ? [] : await loadSupplementalLexicon(loader, supplementalDir);
  const analyzer = await createSudachiAnalyzer("full", null, undefined, supplementalLexicon, options.systemDictPath);

  return serializedPipeline(await loadDictsAndBuildPipeline(loader, dirs, analyzer, options));
}

let executionTail: Promise<unknown> = Promise.resolve();

function runSerially<T>(task: () => Promise<T>): Promise<T> {
  const result = executionTail.then(task, task);
  executionTail = result.then(() => undefined, () => undefined);
  return result;
}

type SyncPipelineMethod = {
  [K in keyof TranslationPipeline]: TranslationPipeline[K] extends (...args: never[]) => unknown
    ? TranslationPipeline[K] extends (...args: never[]) => Promise<unknown> ? never : K
    : never
}[keyof TranslationPipeline];

const SYNC_PIPELINE_METHODS = [
  "withLookups", "withReanalysisEntries", "tokenize", "retagMistaggedCauseDeAsCaseParticle",
  "resplitMergedCopulaDatteForQuote", "remapMisclassifiedBracketPos", "renderUnitIr",
  "replaceUserDictionary", "setAnalyzerCache", "getAnalyzerCache", "makeParticleCtx",
  "surfaceFromRenderPlan", "ensureUnitKorean", "resolveUnitSurfaceForGenerate", "materializeSurfaceCache",
  "unitSurfaceForAssembly", "precedingForAllomorph", "precedingAllomorphHint", "_generate",
  "_generateAnnotatedSegments", "rewriteUchiAdjectivalModifier", "rewriteUchiStatusNounModifier",
  "hasUchiAttributiveModifier", "rewriteUchiPositiveHead", "uchiTemporalIntervalVariant", "haRuleUchiTopic",
  "generate", "diagnoseGetHanjaFallback", "nominalPrefixesForRenyouHead",
  "nominalPrefixCandidatesForRenyouHead", "resolveCompoundTail", "buildPredicatePlan",
  "buildAttributivePlan", "wrapTranslationAffixes", "applyTranslationAffixes", "buildLocalCandidateGrammar",
  "initialRareruReadings", "_resolveYoudaCase"
] as const satisfies readonly SyncPipelineMethod[];
const syncPipelineMethods: ReadonlySet<string | symbol> = new Set(SYNC_PIPELINE_METHODS);
type UnlistedSyncPipelineMethod = Exclude<SyncPipelineMethod, (typeof SYNC_PIPELINE_METHODS)[number]>;
const syncPipelineMethodsAreExhaustive: [UnlistedSyncPipelineMethod] extends [never] ? true : UnlistedSyncPipelineMethod = true;
void syncPipelineMethodsAreExhaustive;

function serializedPipeline(pipeline: TranslationPipeline): TranslationPipeline {
  const wrap = (value: unknown): unknown => value instanceof TranslationPipeline ? serializedPipeline(value) : value;
  return new Proxy(pipeline, {
    get(target, property) {
      const value: unknown = Reflect.get(target, property, target);
      if (typeof value !== "function") return value;
      const method = value as (...args: unknown[]) => unknown;
      if (syncPipelineMethods.has(property)) {
        return (...args: unknown[]) => wrap(method.apply(target, args));
      }
      return (...args: unknown[]) => runSerially(async () => wrap(await method.apply(target, args)));
    }
  });
}

async function translate(text: string, options: TranslationPipelineOptions = {}): Promise<string> {
  const pipeline = await createTranslationPipeline(options);
  return pipeline.translate(text);
}

function sourceForDictionaryPath(
  path: string,
  dictionaryBytes: Uint8Array,
  indexBytes: Uint8Array
): DictionaryDataSource {
  const normalized = normalizePath(path);
  if (normalized.endsWith(".hridx")) {
    return new EagerDataSource(indexBytes);
  }
  return new EagerDataSource(dictionaryBytes);
}

function normalizePath(path: string): string {
  return path
    .replace(/\\/g, "/")
    .replace(/^\/+/u, "")
    .replace(/\/+/g, "/")
    .replace(/\/$/u, "");
}

function resourceUrlResolver(options: WebextResourceOptions): (path: string) => string {
  if (options.resolveUrl !== undefined) return options.resolveUrl;
  const { baseUrl } = options;
  if (baseUrl !== undefined) return (path) => new URL(normalizePath(path), baseUrl).href;
  return (path) => {
    const globals = globalThis as { chrome?: ExtensionRuntime; browser?: ExtensionRuntime };
    const runtime = globals.chrome?.runtime?.getURL !== undefined ? globals.chrome.runtime : globals.browser?.runtime;
    if (runtime?.getURL === undefined) {
      throw new Error("No extension runtime found; call initializeWebext({ baseUrl }) or ({ resolveUrl }) first");
    }
    return runtime.getURL(normalizePath(path));
  };
}

export function resetPipelines(): void {
  pipelinePromises.clear();
}

export const HaruWebext = {
  initializeWebext,
  createTranslationPipeline,
  createSudachiAnalyzer,
  ensureInitialized,
  translate,
  resetPipelines
};
