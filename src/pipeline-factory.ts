import type { DataLoader } from "./data-loader.js";
import { TranslationPipeline, type TranslationPipelineOptions } from "./pipeline/core.js";
import {
  clearPipelineResourceCache,
  loadCachedMorphemeDictionary,
  loadCachedPatternDictionary,
  loadCachedCollocationDictionary,
  loadCachedReanalysisDictionary
} from "./pipeline/resource-cache.js";
import { resolveDataDir } from "./pipeline/data-paths.js";
import type { SudachiAnalyzer } from "./analyzer/index.js";
import { LookupTables } from "./pipeline/lookup-tables.js";
import { initConjugator } from "./generator/conjugator.js";
import { initKoreanReadings } from "./generator/korean-reading.js";
import { initAuxMap } from "./generator/aux-map.js";
import { NumericTables } from "./generator/numeric-lookup.js";
import { initGrammarRuntime } from "./pipeline/semantics/grammar-runtime.js";
import { initPunctuation } from "./pipeline/rendering/punctuation.js";
import { initContentResolver } from "./pipeline/content-resolver.js";
import { initDemoDiscourseConnectiveData } from "./pipeline/demo-discourse.js";
import { initModality } from "./pipeline/rules/modality.js";
import { initHeadTailStringSetData } from "./pipeline/head-tail/data/string-set-table.js";
import { initCopulaFocusAdjunctData } from "./pipeline/head-tail/data/copula-focus-adjunct-table.js";
import { initScopeBridgeFocusData } from "./pipeline/head-tail/data/scope-bridge-focus-table.js";
import { initPredicateFocusSupportData } from "./pipeline/head-tail/data/predicate-focus-support-table.js";
import { initHonorificFormulaicArmData } from "./pipeline/head-tail/data/honorific-formulaic-arm-table.js";
import { initNominalFrameData } from "./pipeline/head-tail/head/adapters/nominal/frame-table.js";
import { initConnectiveRenderData } from "./pipeline/head-tail/tail/predicate-root/connective-render-table.js";
import { initHostlessQuoteMarkerData } from "./pipeline/head-tail/tail/predicate-root/hostless-quote-marker-table.js";
import { initConnectiveSurfaceData } from "./pipeline/head-tail/tail/predicate-root/connective-surface-table.js";
import { initHeadContractData } from "./pipeline/head-tail/tail/predicate-root/head-contract-table.js";
import { initObligationPatternData } from "./pipeline/head-tail/tail/predicate-root/obligation-pattern-table.js";
import { initPostverbAuxiliaryData } from "./pipeline/head-tail/tail/predicate-root/postverb-auxiliary-table.js";
import { initDerivationalSuffixData } from "./pipeline/head-tail/tail/predicate-root/derivational-suffix-table.js";
import { initAppearancePerceptionCarrierData } from "./pipeline/head-tail/tail/predicate-root/appearance-perception-carrier-table.js";
import { initProjectionCarrierFormData } from "./pipeline/head-tail/tail/predicate-root/projection-carrier-form-table.js";
import { initEpistemicHedgeCarrierData } from "./pipeline/head-tail/tail/predicate-root/epistemic-hedge-carrier-table.js";
import { initNominalizerFollowerData } from "./pipeline/head-tail/tail/predicate-root/nominalizer-follower-table.js";
import { initSemanticCarrierPredicateData } from "./pipeline/head-tail/integration/semantic-carrier-predicate-table.js";
import { initTeTailContinuationData } from "./pipeline/head-tail/tail/te-tail-continuation-table.js";

export type { TranslationPipelineOptions };

const HEAD_TAIL_STRING_SET_FILES = [
  "compound_following_forms.jsonl",
  "modality_sets.jsonl",
  "ni_predicate_complements.jsonl",
  "quoted_reporting_sets.jsonl",
  "secondary_particle_aliases.jsonl",
  "semantic_helper_sets.jsonl",
  "structural_attributive_heads.jsonl",
  "tosuru_resultative_heads.jsonl"
] as const;

let _tablesInitialized = false;
let lookupProviderCache = new WeakMap<DataLoader, Promise<LookupTables>>();
let numericProviderCache = new WeakMap<DataLoader, Promise<NumericTables>>();

export function clearProviderCaches(): void {
  lookupProviderCache = new WeakMap();
  numericProviderCache = new WeakMap();
  clearPipelineResourceCache();
}

export function loadLookupTablesProvider(loader: DataLoader): Promise<LookupTables> {
  let cached = lookupProviderCache.get(loader);
  if (cached === undefined) {
    cached = LookupTables.load(loader);
    lookupProviderCache.set(loader, cached);
  }
  return cached;
}

export function loadNumericTablesProvider(loader: DataLoader): Promise<NumericTables> {
  let cached = numericProviderCache.get(loader);
  if (cached === undefined) {
    cached = NumericTables.load(loader);
    numericProviderCache.set(loader, cached);
  }
  return cached;
}

export async function initAllTables(loader: DataLoader): Promise<void> {
  if (_tablesInitialized) return;
  const lookups = await loadLookupTablesProvider(loader);
  await Promise.all([
    initConjugator(loader),
    initKoreanReadings(loader),
    initAuxMap(loader),
    initGrammarRuntime(loader),
    initPunctuation(loader),
    initContentResolver(loader),
    initDemoDiscourseConnectiveData(loader, lookups),
    initModality(loader),
    initCopulaFocusAdjunctData(loader),
    initScopeBridgeFocusData(loader),
    initPredicateFocusSupportData(loader),
    initHonorificFormulaicArmData(loader),
    initNominalFrameData(loader, lookups),
    initConnectiveRenderData(loader),
    initHostlessQuoteMarkerData(loader),
    initConnectiveSurfaceData(loader),
    initHeadContractData(loader),
    initObligationPatternData(loader),
    initPostverbAuxiliaryData(loader),
    initDerivationalSuffixData(loader),
    initAppearancePerceptionCarrierData(loader),
    initProjectionCarrierFormData(loader),
    initEpistemicHedgeCarrierData(loader),
    initNominalizerFollowerData(loader),
    initSemanticCarrierPredicateData(loader),
    initTeTailContinuationData(loader),
    ...HEAD_TAIL_STRING_SET_FILES.map((file) => initHeadTailStringSetData(loader, file))
  ]);
  _tablesInitialized = true;
}

export interface ResolveDirsResult {
  dictDir: string;
  patternDir: string;
  collocationDir: string;
  numericSplitsDir: string;
  reanalysisDir: string;
}

export function resolveDictDirs(
  loader: DataLoader,
  options: TranslationPipelineOptions
): ResolveDirsResult {
  const dataDir = resolveDataDir(options);
  return {
    dictDir: options.dictDir ?? loader.joinPath(dataDir, "dict", "morpheme"),
    patternDir: options.patternDir ?? loader.joinPath(dataDir, "dict", "pattern"),
    collocationDir: options.collocationDir ?? loader.joinPath(dataDir, "dict", "collocation"),
    numericSplitsDir: options.numericSplitsDir ?? loader.joinPath(dataDir, "dict", "numeric_splits"),
    reanalysisDir: options.reanalysisDir ?? loader.joinPath(dataDir, "dict", "reanalysis")
  };
}

export async function loadDictsAndBuildPipeline(
  loader: DataLoader,
  dirs: ResolveDirsResult,
  analyzer: SudachiAnalyzer,
  options: TranslationPipelineOptions
): Promise<TranslationPipeline> {
  const [lookups, numeric] = await Promise.all([
    loadLookupTablesProvider(loader),
    loadNumericTablesProvider(loader)
  ]);
  const [dictionary, patterns, collocations, numericSplits, reanalysis] = await Promise.all([
    loadCachedMorphemeDictionary(dirs.dictDir, lookups, numeric),
    loadCachedPatternDictionary(dirs.patternDir, lookups),
    loadCachedCollocationDictionary(dirs.collocationDir, lookups),
    loadCachedCollocationDictionary(dirs.numericSplitsDir),
    loadCachedReanalysisDictionary(dirs.reanalysisDir)
  ]);
  return new TranslationPipeline(
    { analyzer, dictionary, patterns, collocations, numericSplits, reanalysis, lookups, numeric },
    options
  );
}
