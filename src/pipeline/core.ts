
import { SudachiAnalyzer, type HaruToken } from "../analyzer/index.js";
import {
  detectWhitespaceRuns,
  letterSpacingRunChains,
  type WhitespaceRun,
  type WhitespaceRunBond,
  type WhitespaceRunMode,
  type WhitespaceRunPolicy
} from "../analyzer/whitespace-policy.js";
import { CollocationDictionary } from "../dictionary/collocation.js";
import { buildReanalysisEmittedTokens, ReanalysisDictionary } from "../dictionary/reanalysis.js";
import { isReanalysisFlipRequest, type ReanalysisActivation, type ReanalysisFlipRequest } from "../types/reanalysis.js";
import { registeredReanalysisConditionIds } from "./commitment/deferred-reanalysis.js";
import { MorphemeDictionary } from "../dictionary/morpheme.js";
import { PatternDictionary } from "../dictionary/pattern.js";
import { withConjugationWarningCollection } from "../generator/conjugator.js";
import { isKana } from "../utils/char-class.js";
import type { ReadingRule } from "../generator/readings.js";
import type { AnnotatedResult, AnnotatedSegment, AnnotatedText } from "../types/annotation.js";
import * as transform from "../transform/index.js";
import { flipNiComplementMatrixPredicates } from "./preprocess/ni-complement-matrix-flip.js";
import { retagKeijoujiCopulaRenyou } from "./preprocess/keijouji-copula-de-retag.js";
import { retagExplanatoryMonAsSentenceFinalParticle } from "./preprocess/explanatory-mon-sfp-retag.js";
import { retagVolitionalResolutionAsSentenceFinalParticle } from "./preprocess/volitional-resolution-sfp-retag.js";
import { retagRentaishiNoAsNominalizer } from "./preprocess/rentaishi-no-nominalizer-retag.js";
import { flipQuotativeMannerNouns } from "./preprocess/quotative-manner-noun-flip.js";
import { mergeCompoundParticles } from "./preprocess/compound-particle-merge.js";
import { normalizeReduplications } from "./preprocess/reduplicated-mimetic.js";
import {
  canonicalizeWordElongationSmallVowels,
  mergeNasalVocalizationRuns,
  remergeSplitYouon,
  retagStandaloneSmallKana
} from "./preprocess/youon-remerge.js";
import { diffTableUpdate } from "../transform/table-update.js";
import type {
  RuntimeHaruToken,
  SourceTokenBoundary
} from "../types/token.js";
import {
  inheritedSourceIdentity,
  rewriteRuntimeTokenSurface
} from "../types/token.js";
import type { TargetSegment } from "../types/projection.js";
import { assignAnnotationKeysFromSegments } from "./annotation.js";
import { detectEllipsisRunPreflightEvidence, detectWhitespaceChunkBreaks } from "./clause-layout/boundary-detection.js";
import { detectOpaqueWavePauseRuns } from "./pause-range-preflight.js";
import { applySourceRubyReadingFragments } from "./source-ruby-replay.js";
import { PipelineAssemblerMixin } from "./assembler.js";
import { PipelineCompoundMixin } from "./compounds/index.js";
import { resolveDataDir, type DataPathOptions } from "./data-paths.js";
import { attachMoraStutterPrefixes } from "./disfluency/stutter-prefix.js";
import { PASSTHROUGH_POS, PipelineFallbackMixin, isNonLexicalSymbolSurface, isNonLexicalSymbolToken } from "./fallback/index.js";
import { CONTENT_POS } from "./lookup-tables.js";
import type { LookupTables } from "./lookup-tables.js";
import type { NumericTables } from "../generator/numeric-lookup.js";
import { PipelineContentResolverMixin } from "./content-resolver.js";
import { renderTargetSegmentsText } from "./rendering/target-segment-text.js";
import { trailingAllomorphHostText } from "./rendering/allomorph-host.js";
import { hasDeterminateAllomorphJongseong } from "../generator/particles.js";
import type { Warning } from "../types/warning.js";
import type { TranslationUnit } from "./translation/unit.js";
import type { UserDictionary } from "../user-dictionary.js";

import {
  POS0,
  POS0_NAME,
  POS01,
  POS012,
  POS1,
  isBoundFormPos0,
  POS2,
  POS4,
  POS5,
  POS5A,
  posToString,
  感動詞,
  isSymbolCharacterToken,
  形状詞,
  形容詞0,
  助詞,
  助詞_格助詞,
  助動詞,
  助動詞_ダ,
  終止形_一般,
  助詞_副助詞,
  助詞_接続助詞,
  代名詞,
  動詞,
  副詞,
  接頭辞,
  接尾辞,
  補助記号,
  補助記号_括弧閉,
  補助記号_括弧開,
  未然形_,
  連用形_一般,
  名詞,
  名詞_固有名詞,
  名詞_固有名詞_人名,
  名詞_固有名詞_地名,
  名詞_普通名詞,
  名詞_普通名詞_サ変可能,
  命令形_,
  連用形_,
  is上一段,
  is下一段,
  助詞_終助詞,
  isTeFormFusionHostToken,
  isCounterCapableToken
} from "../types/pos.js";
import { latinNotationAcceptsSourceReading } from "../generator/korean-reading.js";
import { difference, stripOffsets } from "./preprocess/analyzer-input-offsets.js";
import {
  expandKansaiPoliteMasseContraction,
  retagBenefactiveTeeAsConjunctiveTe,
  retagInfantileResuCopula,
  retagMistaggedDesireTee,
  retagYasuPoliteAsMasu
} from "./preprocess/auxiliary-variant-retag.js";
import {
  expandBungoGotoshi,
  expandDroppedVolitionalAru,
  expandNegativeNshiConjunction,
  restoreDroppedVolitionalQuoteMarker,
  retagBungoVolitionalNAsNegative,
  retagCopulaNaraBeforeParticleNAsNaruNegation,
  retagMistaggedExplanatoryNAfterFiniteHost
} from "./preprocess/bungo-nasal-n-retag.js";
import { collapseMeowSpacing, normalizeCatMeowTokens, translatePureMeowRun } from "./preprocess/cat-meow.js";
import { isCausativeAuxLemma } from "./preprocess/causative-aux-lemma.js";
import { expandCollapsedAspectAuxContraction } from "./preprocess/collapsed-aspect-aux.js";
import { recoverDirectCollapsedTeOkuAuxHost, recoverSplitCollapsedTeOkuAux } from "./preprocess/collapsed-te-oku.js";
import {
  mergeContractedColloquialIAdjectives,
  mergeFusedColloquialNonAdjectives,
  normalizeColloquialNaiAdjectiveTokens
} from "./preprocess/colloquial-vowel-fusion.js";
import { expandCopulaFocusFusedNegativeStateChange } from "./preprocess/copula-focus-negative-state-change.js";
import {
  resplitImpossibleDesuRenyouDesire,
  retagMistaggedWakedeCopulaRenyou
} from "./preprocess/copula-renyou-retag.js";
import {
  attachEmphasisSokuonFlags,
  checkRealSokuon,
  findEmphasisSokuonOffsets,
  NO_BOUNDARIES,
  removedRunsCrossedAtJunction
} from "./preprocess/emphasis-sokuon.js";
import {
  expandFusedConditionalConnectiveSplits,
  resplitMisparsedBaIiSentenceFinal
} from "./preprocess/fused-conditional.js";
import {
  ICHIDAN_TO_GODAN_ROW,
  isGodanImperativeYoMistagCandidate,
  recoverColloquialTteAuxBeforeBa,
  recoverCopulaNiBeforeStateChangeImperative,
  recoverImperativeTaggedAuxBeforeBa,
  recoverNaruImperativeMistaggedAsNarePotential
} from "./preprocess/imperative-mistag-recovery.js";
import { stripColloquialNoniTails, stripVariationSelectors } from "./preprocess/input-text-normalization.js";
import {
  expandDialectDeicticCopula,
  expandKansaiExplanatoryNen,
  expandKansaiNegativeHen,
  resplitMisparsedDekiHen,
  restoreMisparsedFusedConditionalAkan,
  retagKansaiAssertiveDe,
  retagKyotoNegativeHin,
  retagMistaggedHenNounNegation
} from "./preprocess/kansai-dialect.js";
import { resplitPastQuotativeTteBeforeBa } from "./preprocess/past-quotative-tte-resplit.js";
import {
  composeRemovedOffsets,
  findProlongedOrthographyRestorationOffsets,
  restoreProlongedOrthographySurfaces
} from "./preprocess/prolonged-orthography.js";
import {
  canonicalizeProlongedParticles,
  restoreProlongedCollapsedAspectVariant,
  restoreProlongedYouComparison
} from "./preprocess/prolonged-surface-canonicalization.js";
import {
  canonicalizeTerminalPunctuationNotation,
  hasFollowingPrefixHost,
  SYMMETRIC_QUOTE_SURFACES,
  symmetricQuoteDirections
} from "./preprocess/punctuation-canonicalization.js";
import { runtimeTokenFromHaru, withChunkBreakWitnesses } from "./preprocess/runtime-token-from-analyzer.js";
import {
  applyStandaloneVoiceMarkEdits,
  attachStandaloneVoiceMarkFlags,
  findStandaloneVoiceMarkEdits
} from "./preprocess/standalone-voice-mark.js";
import {
  expandTeAgeruContraction,
  expandTeWaContraction,
  restoreDroppedSokuonChauAspect
} from "./preprocess/te-contraction.js";
import { attachTerminalRoleFlags, stripTerminalRoleTails } from "./preprocess/terminal-role-tail.js";
import { expandColloquialToIuContraction } from "./preprocess/to-iu-contraction.js";
import { sourceSpanForTokenSlice, type TerminalRoleOccurrence, type TokenTextSpan } from "./source-coordinate.js";
import { mergeTranslationWarnings, translationWarningsFromUnits } from "./translation/warnings.js";
import type {
  ParentheticalIsland,
  PreparedTranslation
} from "./projection/prepared-translation.js";
import {
  attachNarouRubySourceFragments,
  collectNarouRubyTokenizationInput,
  type NarouRubyInputProjection,
  projectTerminalRoleOccurrencesAcrossNarouRuby
} from "./projection/narou-ruby-input.js";
import {
  assignParentheticalDelimiterAnnotationKeys,
  assignParentheticalDelimiterSegmentKeys,
  collectPreparedAnnotationTokens
} from "./projection/parenthetical-delimiter-annotation.js";
import { absorbParentheticalRubyIslands } from "./projection/parenthetical-ruby-absorption.js";
import {
  proportionalProjectionForRawParenthetical,
  sourceBoundaryAfterSourceSpan,
  sourceBoundaryBeforeSourceSpan,
  sourceBoundaryForRawParenthetical
} from "./projection/parenthetical-source-boundary.js";
import {
  buildRawParentheticalSourceIdentityPlan,
  remapRawParentheticalPreprocessedTokenSourceIdentities
} from "./projection/parenthetical-source-identity.js";
import {
  insertParentheticalIntoInternalTargetBoundary,
  normalizeParentheticalInsertionAtKoreanBoundary,
  parentheticalDelimiterTargetSegmentKind,
  parentheticalInsertionBeforeLaterRestoredIslands,
  parentheticalTargetSegments,
  restoreWordBoundaryAfterParenthetical,
  shouldSuppressIntraOwnerSpaceForParenthetical,
  targetInsertionForParenthetical
} from "./projection/parenthetical-target-insertion.js";
import {
  preparedHasNonPunctuationContent,
  preparedSourceWidth,
  shiftPreparedSourceIdentity,
  withEmbeddedTokenSpace,
  withEnclosingDelimiter
} from "./projection/prepared-tree.js";
import { splitRawParentheticalIslands } from "./projection/raw-parenthetical-split.js";
import { resolvePreparedRubyAnnotations } from "./projection/ruby-annotation.js";
import {
  projectBoundariesAcrossRemovedOffsets,
  projectBoundariesAcrossRemovedSpans,
  projectDeletionOnlyBoundaries,
  projectSpansAcrossBoundaryProjection,
  tokenTextSpansForSourceText
} from "./projection/text-offset-projection.js";
import {
  absorbWhitespaceAfterTransparentPauses,
  adjustTransparentPauseInsertionIndex,
  appendTransparentPauseIslands,
  markTransparentPauseIslandMaterialized,
  transparentPauseJunctions
} from "./projection/transparent-pause-island.js";
const SMALL_VOWEL_KANA: ReadonlySet<string> = new Set(Array.from("ぁぃぅぇぉァィゥェォ"));

const OOV_DICTIONARY_ID = -1;

export interface TranslationPipelineOptions extends DataPathOptions {
  register?: "casual" | "formal";
  useCommittedKoreanFallback?: boolean;
  dictDir?: string;
  patternDir?: string;
  collocationDir?: string;
  numericSplitsDir?: string;
  reanalysisDir?: string;
  supplementalLexiconDir?: string | null;
  userDictPath?: string;
  systemDictPath?: string;
  sudachiConfigPath?: string;
  readingFallbackRule?: ReadingRule;
  annotateOov?: boolean;
  annotateUserDict?: boolean;
}

export interface TranslationPipelineResources {
  analyzer: SudachiAnalyzer;
  dictionary: MorphemeDictionary;
  patterns: PatternDictionary;
  collocations: CollocationDictionary;
  numericSplits: CollocationDictionary;
  reanalysis: ReanalysisDictionary;
  lookups: LookupTables;
  numeric: NumericTables;
}

declare const resolvedPreparedTranslationBrand: unique symbol;
export type ResolvedPreparedTranslation = PreparedTranslation & {
  readonly [resolvedPreparedTranslationBrand]: true;
};

export interface ResolvedUnitIr {
  readonly prepared: ResolvedPreparedTranslation;
  readonly units: TranslationUnit[];
  readonly warnings: readonly Warning[];
}

export type PreprocessChainMode = {
  readonly reanalysis:
  | "propose"
  | {
    readonly flip: readonly ReanalysisActivation[];
    readonly onUnmatchedActivation?: (activation: ReanalysisActivation) => void;
  };
  readonly onWarning?: (warning: Warning) => void;
};

export interface DualTranslationResult {
  readonly casual: string;
  readonly formal: string;
}

export interface TranslationUnitSpace {
  readonly id: string;
  readonly units: readonly TranslationUnit[];
  readonly tokens: readonly RuntimeHaruToken[];
}

export interface TranslationUnitSpaceSink {
  readonly id: string;
  readonly emit: (space: TranslationUnitSpace) => void;
}

interface PreparedRenderResult {
  readonly text: string;
  readonly units: TranslationUnit[];
  readonly warnings: readonly Warning[];
}

export class TranslationPipeline extends PipelineAssemblerMixin {
  readonly dataDir: string;
  readonly register: "casual" | "formal";
  readonly _content_pos: ReadonlySet<string> = CONTENT_POS;
  readonly _passthrough_pos: ReadonlySet<string> = PASSTHROUGH_POS;
  protected readonly lookups: LookupTables;
  protected readonly numeric: NumericTables;
  readonly readingFallbackRule: ReadingRule | undefined;
  private readonly resources: TranslationPipelineResources;
  private readonly options: TranslationPipelineOptions;
  private analyzerInstance: SudachiAnalyzer;
  private dictionaryInstance: MorphemeDictionary;
  private patternInstance: PatternDictionary;
  private collocationInstance: CollocationDictionary;
  private numericSplitsInstance: CollocationDictionary;
  private reanalysisInstance: ReanalysisDictionary;
  private casualSibling: TranslationPipeline | undefined;
  private formalSibling: TranslationPipeline | undefined;
  private userKoreanOverrides: Map<string, string> = new Map();

  constructor(resources: TranslationPipelineResources, options: TranslationPipelineOptions = {}) {
    super();
    this.resources = resources;
    this.options = options;
    this.register = options.register ?? "casual";
    this._useCommittedKoreanFallback = options.useCommittedKoreanFallback ?? false;
    this.dataDir = resolveDataDir(options);
    this.readingFallbackRule = options.readingFallbackRule;
    this._formal = this.register === "formal";
    this.analyzerInstance = resources.analyzer;
    this.dictionaryInstance = resources.dictionary;
    this.patternInstance = resources.patterns;
    this.collocationInstance = resources.collocations;
    this.numericSplitsInstance = resources.numericSplits;
    this.reanalysisInstance = resources.reanalysis;
    this.reanalysisInstance.assertConditionIdsRegistered(registeredReanalysisConditionIds());
    this.lookups = resources.lookups;
    this.numeric = resources.numeric;
  }

  withLookups(lookups: LookupTables): TranslationPipeline {
    return new TranslationPipeline({ ...this.resources, lookups, patterns: this.patternInstance.withLookups(lookups) }, this.options);
  }

  async withMorphemeEntries(patchJsonl: string): Promise<TranslationPipeline> {
    const delta = await MorphemeDictionary.fromPatch(
      patchJsonl,
      "<morpheme-patch>",
      this.lookups,
      this.numeric,
      this.dictionaryInstance.fuzzyLevel
    );
    const dictionary = this.dictionaryInstance.withMorphemeOverrides(delta);
    return new TranslationPipeline({ ...this.resources, dictionary }, this.options);
  }

  withReanalysisEntries(patchJsonl: string): TranslationPipeline {
    const reanalysis = this.reanalysisInstance.cloneShallow();
    reanalysis.loadFromJsonl(patchJsonl, "<reanalysis-patch>");
    return new TranslationPipeline({ ...this.resources, reanalysis }, this.options);
  }

  tokenize(
    text: string,
    pauseJunctions: ReadonlySet<number> = NO_BOUNDARIES,
    pauseRuns: readonly TokenTextSpan[] = []
  ): RuntimeHaruToken[] {
    return this.tokenizeWithRubyBaseBarriers(text, new Set(), pauseJunctions, pauseRuns);
  }

  private tokenizeWithRubyBaseBarriers(
    text: string,
    rubyBaseBarriers: ReadonlySet<number>,
    pauseJunctions: ReadonlySet<number> = NO_BOUNDARIES,
    pauseRuns: readonly TokenTextSpan[] = []
  ): RuntimeHaruToken[] {
    const stripped = stripColloquialNoniTails(stripVariationSelectors(text), this.lookups);
    const [roleStrippedText, roleOccurrences] = stripTerminalRoleTails(stripped, this.lookups);
    const projectedRubyBaseBarriers = projectDeletionOnlyBoundaries(
      text,
      roleStrippedText,
      rubyBaseBarriers
    );
    const projectedPauseJunctions = projectDeletionOnlyBoundaries(text, roleStrippedText, pauseJunctions);
    const projectedPauseRuns = projectSpansAcrossBoundaryProjection(
      pauseRuns,
      (boundaries) => projectDeletionOnlyBoundaries(text, roleStrippedText, boundaries)
    );
    const rubyInput = collectNarouRubyTokenizationInput(
      roleStrippedText,
      projectedRubyBaseBarriers
    );

    const analyzeInput = (
      inputText: string,
      rubyProjections: readonly NarouRubyInputProjection[],
      terminalRoles: readonly TerminalRoleOccurrence[],
      inputPauseJunctions: ReadonlySet<number>,
      inputPauseRuns: readonly TokenTextSpan[]
    ): { readonly tokens: RuntimeHaruToken[]; readonly rubyAttached: boolean } => {
      const voiceMarkEdits = findStandaloneVoiceMarkEdits(inputText);
      const voiceText = voiceMarkEdits === null ? inputText : applyStandaloneVoiceMarkEdits(inputText, voiceMarkEdits);
      const prolongedOffsets = findProlongedOrthographyRestorationOffsets(voiceText, this.lookups);
      const analysisText = prolongedOffsets.size === 0 ? voiceText : stripOffsets(voiceText, prolongedOffsets);
      const voiceJunctions = voiceMarkEdits === null
        ? inputPauseJunctions
        : projectBoundariesAcrossRemovedOffsets(inputPauseJunctions, voiceMarkEdits.removed);
      const analysisJunctions = projectBoundariesAcrossRemovedOffsets(voiceJunctions, prolongedOffsets);
      const analysisPauseRuns = projectSpansAcrossBoundaryProjection(inputPauseRuns, (boundaries) =>
        projectBoundariesAcrossRemovedOffsets(
          voiceMarkEdits === null ? boundaries : projectBoundariesAcrossRemovedOffsets(boundaries, voiceMarkEdits.removed),
          prolongedOffsets
        ));
      const { tokens, finalText, removeOffsets } = this.analyzeWithEmphasisSokuon(
        analysisText,
        analysisJunctions,
        analysisPauseRuns
      );
      const voiceTextRemoveOffsets = prolongedOffsets.size === 0
        ? removeOffsets
        : composeRemovedOffsets(prolongedOffsets, removeOffsets, Array.from(voiceText).length);
      const sourceRemoveOffsets = voiceMarkEdits === null
        ? voiceTextRemoveOffsets
        : composeRemovedOffsets(voiceMarkEdits.removed, voiceTextRemoveOffsets, Array.from(inputText).length);
      if (voiceMarkEdits !== null) {
        attachStandaloneVoiceMarkFlags(tokens, voiceMarkEdits, prolongedOffsets, removeOffsets);
      }
      attachTerminalRoleFlags(tokens, terminalRoles, sourceRemoveOffsets);
      const rubyAttached = attachNarouRubySourceFragments(
        tokens,
        finalText,
        rubyProjections,
        sourceRemoveOffsets
      );
      normalizeCatMeowTokens(tokens);
      restoreProlongedOrthographySurfaces(tokens, prolongedOffsets, removeOffsets);
      return { tokens, rubyAttached };
    };

    const rubyAttempt = analyzeInput(
      rubyInput.text,
      rubyInput.projections,
      projectTerminalRoleOccurrencesAcrossNarouRuby(roleOccurrences, rubyInput.removedTextSpans),
      projectBoundariesAcrossRemovedSpans(projectedPauseJunctions, rubyInput.removedTextSpans),
      projectSpansAcrossBoundaryProjection(
        projectedPauseRuns,
        (boundaries) => projectBoundariesAcrossRemovedSpans(boundaries, rubyInput.removedTextSpans)
      )
    );
    if (rubyAttempt.rubyAttached) {
      return rubyAttempt.tokens;
    }
    return analyzeInput(roleStrippedText, [], roleOccurrences, projectedPauseJunctions, projectedPauseRuns).tokens;
  }

  private analyzeWithEmphasisSokuon(
    analysisText: string,
    junctions: ReadonlySet<number>,
    pauseRuns: readonly TokenTextSpan[]
  ): { readonly tokens: RuntimeHaruToken[]; readonly finalText: string; readonly removeOffsets: Set<number> } {
    const offsets = findEmphasisSokuonOffsets(analysisText, junctions);
    if (offsets.size === 0) {
      return { tokens: this.analyze(analysisText), finalText: analysisText, removeOffsets: new Set() };
    }
    const cleanedText = stripOffsets(analysisText, offsets);
    const pass2Tokens = this.analyze(cleanedText);
    const pass1Tokens = this.analyze(analysisText);
    const ownRestoreOffsets = checkRealSokuon(pass1Tokens, pass2Tokens, offsets, this.lookups, junctions);
    const restoreOffsets = pauseRuns.length === 0
      ? ownRestoreOffsets
      : this.alignSokuonDecisionAtPauseRuns(analysisText, offsets, ownRestoreOffsets, pauseRuns);
    for (;;) {
      const removeOffsets = difference(offsets, restoreOffsets);
      if (removeOffsets.size === 0) {
        return { tokens: pass1Tokens, finalText: analysisText, removeOffsets };
      }
      const finalText = restoreOffsets.size === 0 ? cleanedText : stripOffsets(analysisText, removeOffsets);
      const tokens = restoreOffsets.size === 0 ? pass2Tokens : this.analyze(finalText);
      const crossed = removedRunsCrossedAtJunction(tokens, removeOffsets, junctions);
      if (crossed.size === 0) {
        attachEmphasisSokuonFlags(tokens, removeOffsets);
        return { tokens, finalText, removeOffsets };
      }
      for (const offset of crossed) restoreOffsets.add(offset);
    }
  }

  private alignSokuonDecisionAtPauseRuns(
    text: string,
    offsets: ReadonlySet<number>,
    restore: ReadonlySet<number>,
    pauseRuns: readonly TokenTextSpan[]
  ): Set<number> {
    const chars = Array.from(text);
    const strippedIndexOf = new Map<number, number>();
    const strippedChars: string[] = [];
    for (const [index, char] of chars.entries()) {
      if (pauseRuns.some((run) => run.start <= index && index < run.end)) continue;
      strippedIndexOf.set(index, strippedChars.length);
      strippedChars.push(char);
    }
    const strippedText = strippedChars.join("");
    const junctions = new Set(pauseRuns.map((run) =>
      [...strippedIndexOf.keys()].filter((index) => index < run.start).length));
    const strippedRemove = this.analyzeWithEmphasisSokuon(strippedText, junctions, []).removeOffsets;
    const runStarts = new Set(pauseRuns.map((run) => run.start));
    const aligned = new Set(restore);
    for (const offset of offsets) {
      let runEnd = offset + 1;
      while (offsets.has(runEnd)) runEnd += 1;
      if (!runStarts.has(runEnd)) continue;
      const strippedOffset = strippedIndexOf.get(offset);
      if (strippedOffset !== undefined && strippedRemove.has(strippedOffset)) {
        aligned.delete(offset);
      } else {
        aligned.add(offset);
      }
    }
    return aligned;
  }

  async preprocessTokens(text: string): Promise<RuntimeHaruToken[]> {
    return await this.applyPreprocessChain(this.tokenize(text));
  }

  async preparedTokenSpaces(text: string): Promise<readonly { readonly id: string; readonly tokens: readonly RuntimeHaruToken[] }[]> {
    const lifted = this.liftStringIfTransformNeeded(text);
    const prepared = lifted !== null
      ? await this.prepareAnnotatedTranslation(transform.forward(lifted))
      : await this.prepareTranslation(text);
    const spaces: { readonly id: string; readonly tokens: readonly RuntimeHaruToken[] }[] = [];
    const visit = (current: PreparedTranslation, id: string): void => {
      if (current.pureMeow !== undefined) {
        return;
      }
      spaces.push({ id, tokens: current.tokens });
      for (const island of current.parentheticalIslands ?? []) {
        visit(island.innerPrepared, `${id}/${island.id}`);
      }
    };
    visit(prepared, "outer");
    return spaces;
  }

  async prepareTranslation(text: string, pauseJunctions: ReadonlySet<number> = NO_BOUNDARIES): Promise<PreparedTranslation> {
    const pureMeow = translatePureMeowRun(text);
    if (pureMeow !== undefined) {
      return { sourceText: text, pureMeow, tokens: [] };
    }
    const rawExtracted = await this.extractRawParentheticalIslands(text, 0, pauseJunctions);
    if (rawExtracted !== null) {
      return rawExtracted;
    }
    const rawTokens = this.tokenize(text, pauseJunctions);
    const preprocessWarnings: Warning[] = [];
    const tokens = await this.applyPreprocessChain(rawTokens, {
      reanalysis: "propose",
      onWarning: (warning) => preprocessWarnings.push(warning)
    });
    return {
      sourceText: text,
      tokens,
      rawTokens,
      ...(preprocessWarnings.length === 0 ? {} : { preprocessWarnings })
    };
  }

  private async extractRawParentheticalIslands(
    sourceText: string,
    nestingDepth: number,
    pauseJunctions: ReadonlySet<number>
  ): Promise<PreparedTranslation | null> {
    const raw = splitRawParentheticalIslands(sourceText);
    if (raw === null) {
      return null;
    }
    const outerChars = Array.from(raw.outerText);
    const rubyBaseBarriers = new Set(raw.islands.map((island) => island.outerOffset));
    const outerPauseJunctions = projectBoundariesAcrossRemovedSpans(
      pauseJunctions,
      raw.islands.map((island) => ({ start: island.openingTextSpan.start, end: island.closingTextSpan.end }))
    );
    const sourceTokens = this.tokenizeWithRubyBaseBarriers(raw.outerText, rubyBaseBarriers, outerPauseJunctions);
    const sourceTokenTextSpans = tokenTextSpansForSourceText(sourceTokens, outerChars);
    const rawOuterTokens = this.tokenizeWithRubyBaseBarriers(raw.outerText, rubyBaseBarriers, outerPauseJunctions);
    const preprocessWarnings: Warning[] = [];
    const tokens = await this.applyPreprocessChain(rawOuterTokens, {
      reanalysis: "propose",
      onWarning: (warning) => preprocessWarnings.push(warning)
    });
    const tokenTextSpans = tokenTextSpansForSourceText(tokens, outerChars);
    const preparedInner = await Promise.all(raw.islands.map(async (island) => this.prepareTranslation(
      island.innerText,
      new Set([...pauseJunctions]
        .filter((boundary) => boundary >= island.openingTextSpan.end && boundary <= island.closingTextSpan.start)
        .map((boundary) => boundary - island.openingTextSpan.end))
    )));
    const islandWidths = preparedInner.map((inner) => preparedSourceWidth(inner) + 2);
    const projectionProbe = async (token: RuntimeHaruToken) => this.nominalCompoundProjectionProbeText(token);
    const sourceIdentityPlan = await buildRawParentheticalSourceIdentityPlan(
      sourceTokens,
      sourceTokenTextSpans,
      raw.islands,
      islandWidths,
      projectionProbe
    );
    const shiftedSourceTokens = sourceIdentityPlan.tokens;
    const shiftedSourceTokenTextSpans = tokenTextSpansForSourceText(shiftedSourceTokens, outerChars);
    const shiftedTokens = remapRawParentheticalPreprocessedTokenSourceIdentities(tokens, tokenTextSpans, sourceIdentityPlan);
    const islands: ParentheticalIsland[] = [];
    let prevIslandEndOrdinal = 0;
    for (let islandIndex = 0; islandIndex < raw.islands.length; islandIndex += 1) {
      const rawIsland = raw.islands[islandIndex]!;
      const innerPreparedBase = preparedInner[islandIndex]!;
      const islandWidth = islandWidths[islandIndex]!;
      const outerBoundary = sourceBoundaryForRawParenthetical(
        rawIsland.outerOffset,
        shiftedSourceTokens,
        shiftedSourceTokenTextSpans
      );
      const plannedAnchorOrdinal = sourceIdentityPlan.islandAnchorOrdinals[islandIndex];
      const baseAnchorOrdinal = plannedAnchorOrdinal ?? (outerBoundary.beforeOrdinal === null
        ? 0
        : outerBoundary.beforeOrdinal + 1);
      const anchorOrdinal = Math.max(baseAnchorOrdinal, prevIslandEndOrdinal);
      prevIslandEndOrdinal = anchorOrdinal + islandWidth;
      const sourceBoundary: SourceTokenBoundary = outerBoundary.beforeOrdinal === null
        ? { beforeOrdinal: null, afterOrdinal: 0 }
        : { beforeOrdinal: outerBoundary.beforeOrdinal, afterOrdinal: outerBoundary.beforeOrdinal + 1 };
      const innerPrepared = withEnclosingDelimiter(withEmbeddedTokenSpace(shiftPreparedSourceIdentity(
        innerPreparedBase,
        anchorOrdinal + 1
      ), islandIndex > 0 || shiftedSourceTokenTextSpans.some((span) => span !== null && span.end <= rawIsland.outerOffset)),
      rawIsland.openingSurface);
      islands.push({
        id: `parenthetical:${anchorOrdinal}:${anchorOrdinal + islandWidth}:${islands.length}`,
        delimiter: {
          open: rawIsland.openingSurface,
          close: rawIsland.closingSurface
        },
        delimiterTextSpan: {
          open: rawIsland.openingTextSpan,
          close: rawIsland.closingTextSpan
        },
        sourceBoundary,
        sourceSpan: { startOrdinal: anchorOrdinal, endOrdinal: anchorOrdinal + islandWidth },
        ...(proportionalProjectionForRawParenthetical(
          rawIsland,
          shiftedSourceTokens,
          shiftedSourceTokenTextSpans
        ) ?? {}),
        innerPrepared,
        nestingDepth
      });
    }
    const prepared: PreparedTranslation = {
      sourceText,
      tokens: shiftedTokens,
      parentheticalIslands: islands,
      rawTokens: rawOuterTokens,
      ...(preprocessWarnings.length === 0 ? {} : { preprocessWarnings }),
      finalizeFlipTokens: (chainTokens) => remapRawParentheticalPreprocessedTokenSourceIdentities(
        chainTokens,
        tokenTextSpansForSourceText(chainTokens, outerChars),
        sourceIdentityPlan
      )
    };
    absorbParentheticalRubyIslands(prepared);
    return prepared;
  }

  private async nominalCompoundProjectionProbeText(token: RuntimeHaruToken): Promise<string | null> {
    const fallbackText = await this.renderTokenFallback(token);
    return fallbackText.length === 0 ? null : fallbackText;
  }

  async applyPreprocessChain(
    tokens: readonly RuntimeHaruToken[],
    mode: PreprocessChainMode = { reanalysis: "propose" }
  ): Promise<RuntimeHaruToken[]> {
    const rubyFragments = tokens.flatMap((token) => token.sourceRubyReadingFragments ?? []);
    let result = canonicalizeTerminalPunctuationNotation(tokens);
    result = this.remapMisclassifiedBracketPos(result);
    result = await remergeSplitYouon(result, (candidate) => this.resolveMergedYouonPos(candidate));
    result = retagStandaloneSmallKana(result, (token) => POS0_NAME[token.pos & POS0] ?? "", 感動詞);
    result = mergeNasalVocalizationRuns(result, (token) => POS0_NAME[token.pos & POS0] ?? "", 感動詞);
    result = canonicalizeWordElongationSmallVowels(result, (token) => POS0_NAME[token.pos & POS0] ?? "");
    result = await normalizeReduplications(
      result,
      (token) => POS0_NAME[token.pos & POS0] ?? "",
      副詞,
      (form, reading) => this.hasExactAdverbEntry(form, reading)
    );
    result = this.mergeKatakanaNameChains(result);
    result = this.expandNumericSplits(result);
    result = await this.recoverOovFunctionalSplits(result);
    result = normalizeColloquialNaiAdjectiveTokens(result);
    result = await mergeContractedColloquialIAdjectives(
      result,
      (candidate) => this.isRestorableColloquialIAdjective(candidate)
    );
    result = await mergeFusedColloquialNonAdjectives(
      result,
      (head, candidate) => this.restoreFusedColloquialNonAdjectivePos(head, candidate)
    );
    result = expandFusedConditionalConnectiveSplits(result);
    result = resplitMisparsedBaIiSentenceFinal(result);
    result = resplitMisparsedDekiHen(result);
    result = retagMistaggedHenNounNegation(result);
    result = retagKyotoNegativeHin(result);
    result = expandKansaiNegativeHen(result);
    result = expandBungoGotoshi(result);
    result = retagCopulaNaraBeforeParticleNAsNaruNegation(result);
    result = retagBungoVolitionalNAsNegative(result, this.lookups);
    result = expandNegativeNshiConjunction(result);
    result = restoreMisparsedFusedConditionalAkan(result);
    result = expandDroppedVolitionalAru(result);
    result = restoreDroppedVolitionalQuoteMarker(result, this.lookups);
    result = retagMistaggedExplanatoryNAfterFiniteHost(result);
    result = retagInfantileResuCopula(result);
    result = expandKansaiPoliteMasseContraction(result, this.lookups);
    result = retagYasuPoliteAsMasu(result, this.lookups);
    result = retagBenefactiveTeeAsConjunctiveTe(result, this.lookups);
    result = retagMistaggedDesireTee(result, this.lookups);
    result = await expandKansaiExplanatoryNen(result, (candidate) => this.isRestorableColloquialIAdjective(candidate));
    result = retagKansaiAssertiveDe(result);
    result = expandColloquialToIuContraction(result);
    result = expandTeAgeruContraction(result);
    result = expandTeWaContraction(result);
    result = restoreDroppedSokuonChauAspect(result);
    result = restoreProlongedYouComparison(result);
    result = expandDialectDeicticCopula(result);
    result = canonicalizeProlongedParticles(result, this.lookups);
    result = restoreProlongedCollapsedAspectVariant(result);
    result = this.retagMistaggedCauseDeAsCaseParticle(result);
    result = retagMistaggedWakedeCopulaRenyou(result);
    result = resplitImpossibleDesuRenyouDesire(result);
    result = await this.resplitMistaggedGodanImperativeYo(result);
    result = recoverColloquialTteAuxBeforeBa(result);
    result = recoverImperativeTaggedAuxBeforeBa(result);
    result = recoverCopulaNiBeforeStateChangeImperative(result);
    result = recoverNaruImperativeMistaggedAsNarePotential(result);
    result = await recoverDirectCollapsedTeOkuAuxHost(result, token => this.recoverSplitCollapsedTeOkuHost(token));
    result = await recoverSplitCollapsedTeOkuAux(result, token => this.recoverSplitCollapsedTeOkuHostTokens(token));
    result = expandCollapsedAspectAuxContraction(result, this.lookups);
    applySourceRubyReadingFragments(result, rubyFragments);
    result = this.preprocessCollocations(result);
    result = retagKeijoujiCopulaRenyou(result);
    result = retagExplanatoryMonAsSentenceFinalParticle(result);
    result = retagVolitionalResolutionAsSentenceFinalParticle(result);
    result = retagRentaishiNoAsNominalizer(result);
    result = expandCopulaFocusFusedNegativeStateChange(result, this.lookups);
    if (mode.reanalysis === "propose") {
      result = this.proposeDeferredReanalysis(result);
    } else {
      result = this.applyDeferredReanalysisFlips(
        result,
        mode.reanalysis.flip,
        mode.reanalysis.onUnmatchedActivation
      );
    }
    result = mergeCompoundParticles(result, this.lookups);
    result = flipNiComplementMatrixPredicates(result);
    result = flipQuotativeMannerNouns(result, this.lookups);
    result = resplitPastQuotativeTteBeforeBa(result, this.lookups);
    result = this.resplitMergedCopulaDatteForQuote(result);
    result = await this.expandOovSplits(result);
    if (this.userKoreanOverrides.size > 0) {
      result = this.applyUserKoreanOverrides(result);
    }
    result = attachMoraStutterPrefixes(result);
    await this.attachLatinNotationTransliterations(result);
    if (!applySourceRubyReadingFragments(result, rubyFragments) && mode.onWarning !== undefined) {
      mode.onWarning({
        type: "ruby_fragment_replay_unapplied",
        severity: "warning",
        opKind: "source_ruby_reading",
        message: `명시 ruby 독음을 전처리 후 토큰에 재사영하지 못했다: ${rubyFragments
          .map((fragment) => `${fragment.sourceSurface}@${fragment.sourceOrdinal}`)
          .join(", ")}`
      });
    }
    return result;
  }

  private async attachLatinNotationTransliterations(tokens: readonly RuntimeHaruToken[]): Promise<void> {
    for (const token of tokens) {
      if (!latinNotationAcceptsSourceReading(token.surface, token.reading) || isCounterCapableToken(token)) {
        continue;
      }
      const transliteration = await this.dictionary.findKatakanaTransliteration(token.reading);
      if (transliteration !== undefined) {
        token.latinNotationTransliteration = transliteration;
      }
    }
  }

  private proposeDeferredReanalysis(tokens: RuntimeHaruToken[]): RuntimeHaruToken[] {
    if (this.reanalysisInstance.isEmpty) {
      return tokens;
    }
    for (let index = 0; index < tokens.length; index += 1) {
      const matched = this.reanalysisInstance.matchAt(tokens, index);
      if (matched === undefined) {
        continue;
      }
      const anchor = tokens[index]!;
      const proposal = {
        rowId: matched.entry.id,
        consumed: matched.consumed,
        flipKind: matched.entry.flipKind,
        conditionId: matched.entry.conditionId,
        blockerIds: matched.entry.blockerIds,
        anchorSourceOrdinal: anchor.sourceSpan?.startOrdinal ?? anchor.sourceOrdinal ?? null
      };
      anchor.reanalysisProposals = [...(anchor.reanalysisProposals ?? []), proposal];
    }
    return tokens;
  }

  private applyDeferredReanalysisFlips(
    tokens: RuntimeHaruToken[],
    activations: readonly ReanalysisActivation[],
    onUnmatched?: (activation: ReanalysisActivation) => void
  ): RuntimeHaruToken[] {
    if (activations.length === 0) {
      return tokens;
    }
    const pending = new Map<string, ReanalysisActivation>();
    for (const activation of activations) {
      pending.set(`${activation.rowId}@${activation.anchorSourceOrdinal ?? "null"}`, activation);
    }
    const result: RuntimeHaruToken[] = [];
    let index = 0;
    while (index < tokens.length) {
      const token = tokens[index]!;
      const ordinal = token.sourceSpan?.startOrdinal ?? token.sourceOrdinal ?? null;
      const matched = pending.size > 0 ? this.reanalysisInstance.matchAt(tokens, index) : undefined;
      if (matched !== undefined && matched.entry.flipKind === "token_substitution") {
        const key = `${matched.entry.id}@${ordinal ?? "null"}`;
        const activation = pending.get(key);
        if (activation !== undefined) {
          pending.delete(key);
          result.push(...buildReanalysisEmittedTokens(tokens, index, matched.entry));
          index += matched.consumed;
          continue;
        }
      }
      for (const activation of pending.values()) {
        if (activation.kind === "rule_reading_pin" && activation.anchorSourceOrdinal !== null && activation.anchorSourceOrdinal === ordinal) {
          pending.delete(`${activation.rowId}@${activation.anchorSourceOrdinal}`);
          token.reanalysisReadingPins = [...(token.reanalysisReadingPins ?? []), activation.rowId];
          break;
        }
      }
      result.push(token);
      index += 1;
    }
    if (onUnmatched !== undefined) {
      for (const activation of pending.values()) {
        onUnmatched(activation);
      }
    }
    return result;
  }

  private applyUserKoreanOverrides(tokens: RuntimeHaruToken[]): RuntimeHaruToken[] {
    for (const token of tokens) {
      const korean = this.userKoreanOverrides.get(token.surface)
        ?? this.userKoreanOverrides.get(token.dictionaryForm);
      if (korean !== undefined) {
        token.koreanOverride = korean;
      }
    }
    return tokens;
  }

  private async recoverSplitCollapsedTeOkuHost(token: RuntimeHaruToken): Promise<RuntimeHaruToken | null> {
    const pos0 = token.pos & POS0;
    if ((pos0 !== 名詞 && pos0 !== 動詞) || token.surface.length === 0) {
      return null;
    }
    const candidateSurface = `${token.surface}る`;
    const analyzed = this.analyzerInstance.tokenize(candidateSurface, false, this.lookups.PROLONGED_REDUCTION_CONTRACT);
    if (analyzed.length !== 1) {
      return this.recoverCollapsedTeOkuHostByAuxProbe(token);
    }
    const verb = analyzed[0]!;
    if (
      verb.surface !== candidateSurface ||
      (verb.pos & POS0) !== 動詞 ||
      (!is上一段(verb.pos) && !is下一段(verb.pos))
    ) {
      return this.recoverCollapsedTeOkuHostByAuxProbe(token);
    }
    const stemReading = token.reading.length > 0
      ? token.reading
      : verb.reading.endsWith("ル")
        ? verb.reading.slice(0, -1)
        : verb.reading;
    return {
      ...token,
      dictionaryForm: candidateSurface,
      reading: stemReading,
      dictionaryFormReading: `${stemReading}ル`,
      pos: (verb.pos & ~POS5) | 連用形_一般,
      dictionaryId: 0,
      syntheticReason: "collapsed_te_oku_host_retag"
    };
  }

  private recoverCollapsedTeOkuHostByAuxProbe(token: RuntimeHaruToken): RuntimeHaruToken | null {
    const analyzed = this.analyzerInstance.tokenize(`${token.surface}とく`, false, this.lookups.PROLONGED_REDUCTION_CONTRACT);
    if (analyzed.length !== 2) {
      return null;
    }
    const verb = runtimeTokenFromHaru(analyzed[0]!);
    const aux = runtimeTokenFromHaru(analyzed[1]!);
    if (
      verb.surface !== token.surface ||
      (verb.pos & POS0) !== 動詞 ||
      (verb.pos & POS5A) !== 連用形_ ||
      !isTeFormFusionHostToken(verb) ||
      (aux.pos & POS0) !== 助動詞 ||
      aux.dictionaryForm !== "とく"
    ) {
      return null;
    }
    return {
      ...token,
      dictionaryForm: verb.dictionaryForm,
      reading: token.reading.length > 0 ? token.reading : verb.reading,
      dictionaryFormReading: verb.dictionaryFormReading,
      pos: verb.pos,
      dictionaryId: verb.dictionaryId,
      syntheticReason: "collapsed_te_oku_host_retag"
    };
  }

  private async recoverSplitCollapsedTeOkuHostTokens(token: RuntimeHaruToken): Promise<readonly RuntimeHaruToken[] | null> {
    const singleHost = await this.recoverSplitCollapsedTeOkuHost(token);
    if (singleHost !== null) {
      return [singleHost];
    }
    return this.recoverSplitCollapsedTeOkuCausativeHostTokens(token);
  }

  private async recoverSplitCollapsedTeOkuCausativeHostTokens(token: RuntimeHaruToken): Promise<readonly RuntimeHaruToken[] | null> {
    const pos0 = token.pos & POS0;
    if ((pos0 !== 名詞 && pos0 !== 動詞) || token.surface.length === 0) {
      return null;
    }
    const candidateSurface = `${token.surface}る`;
    const analyzed = this.analyzerInstance.tokenize(candidateSurface, false, this.lookups.PROLONGED_REDUCTION_CONTRACT);
    if (analyzed.length !== 2) {
      return null;
    }
    const stem = runtimeTokenFromHaru(analyzed[0]!);
    const aux = runtimeTokenFromHaru(analyzed[1]!);
    if (
      `${stem.surface}${aux.surface}` !== candidateSurface || (stem.pos & (POS0 | POS5A)) !== (動詞 | 未然形_) || !isCausativeAuxLemma(aux) || !aux.surface.endsWith("る")
    ) {
      return null;
    }
    const auxStem = rewriteRuntimeTokenSurface(aux, { kind: "remove_suffix", suffix: "る" });
    const auxReading = aux.reading.endsWith("ル")
      ? aux.reading.slice(0, -1)
      : aux.reading;
    const sourceFields = token.sourceSpan === undefined ? {} : { sourceSpan: token.sourceSpan };
    return [
      {
        ...stem,
        ...sourceFields,
        syntheticReason: "split_collapsed_te_oku_causative_stem"
      },
      {
        ...auxStem,
        ...sourceFields,
        reading: auxReading,
        pos: (aux.pos & ~POS5) | 連用形_一般,
        dictionaryId: 0,
        syntheticReason: "split_collapsed_te_oku_causative_aux"
      }
    ];
  }

  retagMistaggedCauseDeAsCaseParticle(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
    const adverbialHeads = this.lookups.set("nominal_frame", "single_particle_de_case_adverbial_heads");
    const nominalizerHeads = this.lookups.set("nominal_frame", "de_case_nominalizer_heads");
    let dirty = false;
    const result = tokens.map((token, index) => {
      if (
        token.surface !== "で" || token.dictionaryForm !== "だ" || (token.pos & (POS0 | POS4 | POS5A)) !== (助動詞 | 助動詞_ダ | 連用形_)
      ) {
        return token;
      }
      const prev = tokens[index - 1];
      if (prev === undefined) {
        return token;
      }
      const prevPos0 = prev.pos & POS0;
      if (prevPos0 !== 名詞 && prevPos0 !== 代名詞) {
        return token;
      }
      const headForm = adverbialHeads.has(prev.dictionaryForm)
        ? prev.dictionaryForm
        : adverbialHeads.has(prev.surface)
          ? prev.surface
          : null;
      if (headForm === null || nominalizerHeads.has(headForm)) {
        return token;
      }
      const next = tokens[index + 1];
      if (
        next === undefined ||
        (next.pos & POS0) !== 補助記号 ||
        (next.surface !== "、" && next.surface !== "，")
      ) {
        return token;
      }
      dirty = true;
      return {
        ...token,
        dictionaryForm: "で",
        dictionaryFormReading: "デ",
        pos: 助詞_格助詞,
        syntheticReason: "cause_de_mistag_retag"
      };
    });
    return dirty ? result : [...tokens];
  }

  resplitMergedCopulaDatteForQuote(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
    let dirty = false;
    const result: RuntimeHaruToken[] = [];
    for (let index = 0; index < tokens.length; index += 1) {
      const token = tokens[index]!;
      const prev = result[result.length - 1];
      const next = tokens[index + 1];
      const insistence = next !== undefined && next.dictionaryForm === "ば" &&
        (next.pos & POS01) === 助詞_接続助詞;
      const beforeQuotativeHead = next !== undefined && (next.pos & POS0) === 名詞 &&
        this.lookups.DATTE_QUOTATIVE_CONTENT_HEADS.has(next.dictionaryForm || next.baseForm || next.surface);
      if (
        token.surface !== "だって" ||
        token.dictionaryForm !== "だって" ||
        (token.pos & POS0) !== 助詞 ||
        prev === undefined ||
        ((prev.pos & POS0) !== 名詞 && (prev.pos & POS0) !== 代名詞) ||
        !(insistence || beforeQuotativeHead)
      ) {
        result.push(token);
        continue;
      }
      dirty = true;
      const provenance = inheritedSourceIdentity(token);
      result.push({
        surface: "だ",
        dictionaryForm: "だ",
        reading: "ダ",
        dictionaryFormReading: "ダ",
        pos: 助動詞 | 助動詞_ダ | 終止形_一般,
        dictionaryId: 0,
        ...provenance,
        syntheticReason: "copula_datte_resplit_da"
      });
      result.push({
        surface: "って",
        dictionaryForm: "って",
        reading: "ッテ",
        dictionaryFormReading: "ッテ",
        pos: 助詞_副助詞,
        dictionaryId: 0,
        ...provenance,
        syntheticReason: "copula_datte_resplit_tte"
      });
    }
    return dirty ? result : [...tokens];
  }

  async resplitMistaggedGodanImperativeYo(tokens: readonly RuntimeHaruToken[]): Promise<RuntimeHaruToken[]> {
    if (!tokens.some(isGodanImperativeYoMistagCandidate)) {
      return [...tokens];
    }
    const result: RuntimeHaruToken[] = [];
    let dirty = false;
    for (const token of tokens) {
      if (!isGodanImperativeYoMistagCandidate(token)) {
        result.push(token);
        continue;
      }
      const entry = await this.dictionary.lookupTokenRelaxed(token);
      const derivations = entry?.derivations;
      const derivation = derivations?.[0];
      const godanRow = ICHIDAN_TO_GODAN_ROW.get(token.pos & POS4);
      if (
        derivations === undefined ||
        derivations.length !== 1 ||
        derivation?.id !== "potential" ||
        derivation.baseForm === undefined ||
        derivation.baseReading === undefined ||
        godanRow === undefined
      ) {
        result.push(token);
        continue;
      }
      dirty = true;
      const stemToken = rewriteRuntimeTokenSurface(token, {
        kind: "remove_suffix",
        suffix: "よ"
      });
      const provenance = inheritedSourceIdentity(token);
      result.push({
        ...stemToken,
        reading: token.reading.slice(0, -1),
        dictionaryForm: derivation.baseForm,
        dictionaryFormReading: derivation.baseReading,
        dictionaryId: 0,
        pos: (token.pos & ~POS4 & ~POS5) | godanRow | 命令形_,
        syntheticReason: "godan_imperative_yo_stem"
      });
      result.push({
        surface: "よ",
        dictionaryForm: "よ",
        reading: "ヨ",
        dictionaryFormReading: "ヨ",
        pos: 助詞_終助詞,
        dictionaryId: 0,
        ...provenance,
        syntheticReason: "godan_imperative_yo_sfp"
      });
    }
    return dirty ? result : [...tokens];
  }

  remapMisclassifiedBracketPos(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
    const HIGH_BITS = ~POS012;
    const symmetricDirections = symmetricQuoteDirections(
      tokens,
      this.lookups.GRAMMAR_BOUNDARY_SYMMETRIC_QUOTE_TOGGLE_SURFACES
    );
    let dirty = false;
    const result = tokens.map((token, index) => {
      if ((token.pos & POS0) === 接頭辞) {
        if (!hasFollowingPrefixHost(tokens, index + 1)) {
          dirty = true;
          return { ...token, pos: 感動詞 | (token.pos & HIGH_BITS) };
        }
        return token;
      }
      const symmetric = symmetricDirections.get(index);
      if (symmetric !== undefined) {
        const remapped = symmetric | (token.pos & HIGH_BITS);
        if (remapped === token.pos) return token;
        dirty = true;
        return { ...token, pos: remapped };
      }
      let remappedPos: number | undefined;
      if ((token.pos & POS012) === 名詞_普通名詞_サ変可能) {
        if (token.surface.length === 1) {
          if (/^[\p{Ps}\p{Pi}]$/u.test(token.surface)) {
            remappedPos = 補助記号_括弧開 | (token.pos & HIGH_BITS);
          } else if (/^[\p{Pe}\p{Pf}]$/u.test(token.surface)) {
            remappedPos = 補助記号_括弧閉 | (token.pos & HIGH_BITS);
          } else if (SYMMETRIC_QUOTE_SURFACES.has(token.surface)) {
            remappedPos = (index === 0 ? 補助記号_括弧開 : 補助記号_括弧閉) | (token.pos & HIGH_BITS);
          }
        }
        if (remappedPos === undefined && isNonLexicalSymbolSurface(token.surface)) {
          remappedPos = 補助記号 | (token.pos & HIGH_BITS);
        }
      } else if ((token.pos & POS0) === 補助記号 && token.surface.length === 1) {
        const subtype = token.pos & POS01;
        if (subtype !== 補助記号_括弧開 && subtype !== 補助記号_括弧閉) {
          if (/^\p{Ps}$/u.test(token.surface)) {
            remappedPos = 補助記号_括弧開 | (token.pos & HIGH_BITS);
          } else if (/^\p{Pe}$/u.test(token.surface)) {
            remappedPos = 補助記号_括弧閉 | (token.pos & HIGH_BITS);
          }
        }
      }
      if (remappedPos === undefined) return token;
      dirty = true;
      return { ...token, pos: remappedPos };
    });
    return dirty ? result : [...tokens];
  }

  async translate(text: string): Promise<string>;
  async translate(text: AnnotatedText): Promise<AnnotatedResult>;
  async translate(text: string | AnnotatedText): Promise<string | AnnotatedResult> {
    if (typeof text === "string") {
      const lifted = this.liftStringIfTransformNeeded(text);
      if (lifted) {
        const result = await this.translateAnnotatedText(lifted);
        return result.segments.map(s => s.text).join("");
      }
      return await this.translatePrepared(await this.prepareTranslation(text));
    }
    return await this.translateAnnotatedText(text);
  }

  async translatePrepared(prepared: PreparedTranslation): Promise<string> {
    const { text } = await this.renderPreparedTranslation(prepared);
    return text;
  }

  async translateWithWarnings(text: string): Promise<{ text: string; warnings: readonly Warning[] }>;
  async translateWithWarnings(text: AnnotatedText): Promise<{ result: AnnotatedResult; warnings: readonly Warning[] }>;
  async translateWithWarnings(text: string | AnnotatedText): Promise<{ text: string; warnings: readonly Warning[] } | { result: AnnotatedResult; warnings: readonly Warning[] }> {
    if (typeof text !== "string") {
      return await this.translateAnnotatedTextWithWarnings(text);
    }
    const lifted = this.liftStringIfTransformNeeded(text);
    if (lifted) {
      const { result, warnings } = await this.translateAnnotatedTextWithWarnings(lifted);
      return { text: result.segments.map(s => s.text).join(""), warnings };
    }
    return await this.translatePreparedWithWarnings(await this.prepareTranslation(text));
  }

  async translatePreparedWithWarnings(prepared: PreparedTranslation): Promise<{ text: string; warnings: readonly Warning[] }> {
    const { text, warnings } = await this.renderPreparedTranslation(prepared);
    return { text, warnings };
  }

  async translateWithUnits(text: string): Promise<readonly [string, TranslationUnit[]]>;
  async translateWithUnits(text: AnnotatedText): Promise<readonly [AnnotatedResult, TranslationUnit[]]>;
  async translateWithUnits(text: string | AnnotatedText): Promise<readonly [string | AnnotatedResult, TranslationUnit[]]> {
    if (typeof text === "string") {
      const lifted = this.liftStringIfTransformNeeded(text);
      if (lifted) {
        const [result, units] = await this.translateAnnotatedTextWithUnits(lifted);
        return [result.segments.map(s => s.text).join(""), units];
      }
      return await this.translatePreparedWithUnits(await this.prepareTranslation(text));
    }
    return await this.translateAnnotatedTextWithUnits(text);
  }

  async translateWithUnitSpaces(text: string): Promise<{
    readonly text: string;
    readonly spaces: readonly TranslationUnitSpace[];
  }> {
    const spaces: TranslationUnitSpace[] = [];
    const sink: TranslationUnitSpaceSink = { id: "outer", emit: (space) => { spaces.push(space); } };
    const lifted = this.liftStringIfTransformNeeded(text);
    if (lifted !== null) {
      const forwarded = transform.forward(lifted);
      const prepared = await this.prepareAnnotatedTranslation(forwarded);
      if (prepared.pureMeow !== undefined) {
        return { text: prepared.pureMeow, spaces };
      }
      const { segments } = await this.renderAnnotatedPreparedTranslation(prepared, { materializeUnitCaches: true }, sink);
      const backward = transform.backward({
        segments: segments.map((segment) => ({ ...segment, text: collapseMeowSpacing(segment.text) })),
        table: forwarded.table,
        ...(forwarded.metadata !== undefined ? { metadata: forwarded.metadata } : {})
      });
      return { text: backward.segments.map((segment) => segment.text).join(""), spaces };
    }
    const prepared = await this.prepareTranslation(text);
    const rendered = await this.renderPreparedTranslation(prepared, { materializeUnitCaches: true }, sink);
    return { text: rendered.text, spaces };
  }

  async translatePreparedWithUnits(prepared: PreparedTranslation): Promise<readonly [string, TranslationUnit[]]> {
    const { text, units } = await this.renderPreparedTranslation(prepared, {
      materializeUnitCaches: true
    });
    return [text, units];
  }

  async buildPreparedUnitIr(prepared: PreparedTranslation): Promise<TranslationUnit[]> {
    return (await this.buildResolvedUnitIr(prepared)).units;
  }

  async buildResolvedUnitIr(prepared: PreparedTranslation): Promise<ResolvedUnitIr> {
    if (prepared.pureMeow !== undefined) {
      return { prepared: prepared as ResolvedPreparedTranslation, units: [], warnings: [] };
    }
    const builder = this.pipelineForRegister("casual");
    if (builder !== this) {
      return await builder.buildResolvedUnitIr(prepared);
    }
    const preprocessWarnings = prepared.preprocessWarnings ?? [];
    const space = {
      embeddedTokenSpace: prepared.embeddedTokenSpace === true,
      ...(prepared.enclosingDelimiter === undefined ? {} : { enclosingDelimiter: prepared.enclosingDelimiter }),
      removedIslandSourceOrdinals: (prepared.parentheticalIslands ?? [])
        .filter((island) => island.pause === undefined && preparedHasNonPunctuationContent(island.innerPrepared))
        .map((island) => island.sourceSpan.startOrdinal)
    };
    const attempt = await this.buildUnitIrForAssembly(prepared.tokens, undefined, space);
    if (!isReanalysisFlipRequest(attempt)) {
      return {
        prepared: prepared as ResolvedPreparedTranslation,
        units: attempt.units,
        warnings: [...attempt.warnings, ...preprocessWarnings]
      };
    }
    const { resolved, flipWarnings } = await this.rebuildPreparedForFlip(prepared, attempt);
    const second = await this.buildUnitIrForAssembly(resolved.tokens, { reanalysis: "record_only" }, space);
    return {
      prepared: resolved as ResolvedPreparedTranslation,
      units: second.units,
      warnings: [...second.warnings, ...preprocessWarnings, ...flipWarnings]
    };
  }

  private async rebuildPreparedForFlip(
    prepared: PreparedTranslation,
    request: ReanalysisFlipRequest
  ): Promise<{ resolved: PreparedTranslation; flipWarnings: readonly Warning[] }> {
    const flipWarnings: Warning[] = [];
    if (prepared.rawTokens === undefined) {
      flipWarnings.push({
        type: "reanalysis_flip_skipped",
        severity: "warning",
        opKind: "no_raw_tokens",
        message: `deferred reanalysis flip skipped (no raw tokens): ${request.activations.map((a) => a.rowId).join(", ")}`
      });
      return { resolved: prepared, flipWarnings };
    }
    const chainTokens = await this.applyPreprocessChain(prepared.rawTokens, {
      reanalysis: {
        flip: request.activations,
        onUnmatchedActivation: (activation) => {
          flipWarnings.push({
            type: "reanalysis_flip_skipped",
            severity: "warning",
            opKind: "activation_rematch_failed",
            message: `deferred reanalysis activation did not re-match in pass 2: ${activation.rowId}@${activation.anchorSourceOrdinal ?? "null"}`
          });
        }
      },
      onWarning: (warning) => flipWarnings.push(warning)
    });
    const tokens = prepared.finalizeFlipTokens === undefined ? chainTokens : prepared.finalizeFlipTokens(chainTokens);
    const resolved: PreparedTranslation = { ...prepared, tokens };
    if (prepared.annotationReplay !== undefined) {
      assignAnnotationKeysFromSegments(
        prepared.annotationReplay.segments,
        collectPreparedAnnotationTokens(resolved),
        prepared.annotationReplay.metadata
      );
    }
    return { resolved, flipWarnings };
  }

  renderUnitIr(units: readonly TranslationUnit[], register: "casual" | "formal" = this.register): string {
    return collapseMeowSpacing(this.pipelineForRegister(register).generate(units));
  }

  async translatePreparedBothWithWarnings(prepared: PreparedTranslation): Promise<DualTranslationResult & { warnings: readonly Warning[] }> {
    if (prepared.pureMeow !== undefined) {
      return { casual: prepared.pureMeow, formal: prepared.pureMeow, warnings: [] };
    }
    const builder = this.pipelineForRegister("casual");
    const collected = withConjugationWarningCollection(() => {
      return builder.buildResolvedUnitIr(prepared);
    });
    const { prepared: resolved, units, warnings: assemblyWarnings } = await collected.value;
    const rendered = withConjugationWarningCollection(() => {
      return translationWarningsFromUnits(units, resolved.tokens, this.lookups, this.numeric);
    });
    const casualRendered = await this.pipelineForRegister("casual").renderPreparedTargetSegments(resolved, units);
    const formalRendered = await this.pipelineForRegister("formal").renderPreparedTargetSegments(resolved, units);
    const casual = collapseMeowSpacing(renderTargetSegmentsText(casualRendered.segments));
    const formal = collapseMeowSpacing(renderTargetSegmentsText(formalRendered.segments));
    const warnings = mergeTranslationWarnings([
      ...rendered.value,
      ...casualRendered.warnings,
      ...formalRendered.warnings,
      ...collected.warnings,
      ...rendered.warnings,
      ...assemblyWarnings
    ]);
    return { casual, formal, warnings };
  }

  async translatePreparedBoth(prepared: PreparedTranslation): Promise<DualTranslationResult> {
    const { casual, formal } = await this.translatePreparedBothWithWarnings(prepared);
    return { casual, formal };
  }

  async translateBoth(text: string): Promise<DualTranslationResult> {
    const lifted = this.liftStringIfTransformNeeded(text);
    if (lifted) {
      return await this.translateAnnotatedBoth(lifted);
    }
    return await this.translatePreparedBoth(await this.prepareTranslation(text));
  }

  async translateBothWithWarnings(text: string): Promise<DualTranslationResult & { warnings: readonly Warning[] }> {
    const lifted = this.liftStringIfTransformNeeded(text);
    if (lifted) {
      return await this.translateAnnotatedBothWithWarnings(lifted);
    }
    return await this.translatePreparedBothWithWarnings(await this.prepareTranslation(text));
  }

  private async translateAnnotatedBoth(input: AnnotatedText): Promise<DualTranslationResult> {
    const { casual, formal } = await this.translateAnnotatedBothWithWarnings(input);
    return { casual, formal };
  }

  private async translateAnnotatedBothWithWarnings(input: AnnotatedText): Promise<DualTranslationResult & { warnings: readonly Warning[] }> {
    const prepared = await this.prepareAnnotatedTranslation(input);
    if (prepared.pureMeow !== undefined) {
      const restored = transform.backward({
        segments: [{ text: prepared.pureMeow }],
        table: input.table,
        ...(input.metadata !== undefined ? { metadata: input.metadata } : {})
      });
      const text = restored.segments.map(segment => segment.text).join("");
      return { casual: text, formal: text, warnings: [] };
    }

    const builder = this.pipelineForRegister("casual");
    const collected = withConjugationWarningCollection(() => {
      return builder.buildResolvedUnitIr(prepared);
    });
    const { prepared: resolved, units, warnings: assemblyWarnings } = await collected.value;
    const rendered = withConjugationWarningCollection(() => {
      return translationWarningsFromUnits(units, resolved.tokens, this.lookups, this.numeric);
    });
    const casualRendered = await this.pipelineForRegister("casual").renderPreparedTargetSegments(resolved, units);
    const formalRendered = await this.pipelineForRegister("formal").renderPreparedTargetSegments(resolved, units);
    const annotationTokens = collectPreparedAnnotationTokens(resolved);
    const segmentOptions = {
      ...(this.options.annotateOov ? { annotateOov: true } : {}),
      ...(this.options.annotateUserDict ? { annotateUserDict: true } : {})
    };
    const restore = (segments: readonly TargetSegment[]): string => {
      const annotated = this._targetSegmentsToAnnotatedSegments(segments, annotationTokens, segmentOptions);
      const restored = transform.backward({
        segments: annotated.map(segment => ({ ...segment, text: collapseMeowSpacing(segment.text) })),
        table: input.table,
        ...(input.metadata !== undefined ? { metadata: input.metadata } : {})
      });
      return restored.segments.map(segment => segment.text).join("");
    };
    const warnings = mergeTranslationWarnings([
      ...rendered.value,
      ...casualRendered.warnings,
      ...formalRendered.warnings,
      ...collected.warnings,
      ...rendered.warnings,
      ...assemblyWarnings
    ]);
    return {
      casual: restore(casualRendered.segments),
      formal: restore(formalRendered.segments),
      warnings
    };
  }

  private liftStringIfTransformNeeded(text: string): AnnotatedText | null {
    const plain: AnnotatedText = { segments: [{ text }], table: new Map() };
    const needsEllipsisPreflight = /[…‥⋯]/u.test(text);
    const needsWaveRangePreflight = /[～〜~]/u.test(text);
    const preflightTokens = needsEllipsisPreflight || needsWaveRangePreflight
      ? this.tokenize(text, NO_BOUNDARIES, transform.provisionalTransparentPauseRunSpans(text))
      : null;
    const ellipsisPreflight = needsEllipsisPreflight && preflightTokens !== null
      ? detectEllipsisRunPreflightEvidence(preflightTokens, this.lookups)
      : undefined;
    const preserveEllipsisRunOrdinals = ellipsisPreflight === undefined
      ? undefined
      : new Set(ellipsisPreflight.hardTerminalEllipsisRuns.map((evidence) => evidence.runOrdinal));
    const ellipsisRunBoundaryEvidence = ellipsisPreflight?.pauseJunctureBoundaryEvidence;
    const opaqueWavePauseRunOrdinals = needsWaveRangePreflight && preflightTokens !== null
      ? detectOpaqueWavePauseRuns(text, preflightTokens, this.lookups)
      : undefined;
    const forwarded = transform.forward(plain, {
      ...(preserveEllipsisRunOrdinals === undefined ? {} : { preserveEllipsisRunOrdinals }),
      ...(opaqueWavePauseRunOrdinals === undefined ? {} : { opaqueWavePauseRunOrdinals }),
      ...(ellipsisRunBoundaryEvidence === undefined ? {} : { ellipsisRunBoundaryEvidence }),
    });
    return forwarded !== plain ? forwarded : null;
  }

  private async prepareAnnotatedTranslation(input: AnnotatedText): Promise<PreparedTranslation> {
    const sourceText = input.segments.map(s => s.text).join("");
    const prepared = await this.prepareTranslation(sourceText, transparentPauseJunctions(input));
    if (prepared.pureMeow === undefined) {
      const mutableTokens = collectPreparedAnnotationTokens(prepared);
      assignAnnotationKeysFromSegments(input.segments, mutableTokens, input.metadata);
      assignParentheticalDelimiterAnnotationKeys(prepared, input.metadata);
      assignParentheticalDelimiterSegmentKeys(prepared, input.segments, input.metadata);
      await resolvePreparedRubyAnnotations(prepared, input.table, (text) => this.prepareTranslation(text));
      appendTransparentPauseIslands(prepared, input.segments, input.table, input.metadata);
      return {
        ...prepared,
        annotationReplay: {
          segments: input.segments,
          ...(input.metadata !== undefined ? { metadata: input.metadata } : {})
        }
      };
    }
    return prepared;
  }

  private async renderAnnotatedPreparedTranslation(
    prepared: PreparedTranslation,
    options: { readonly materializeUnitCaches?: boolean } = {},
    sink?: TranslationUnitSpaceSink
  ): Promise<{ readonly segments: AnnotatedSegment[]; readonly units: TranslationUnit[]; readonly warnings: readonly Warning[] }> {
    const collected = withConjugationWarningCollection(() => {
      return this.buildResolvedUnitIr(prepared);
    });
    const { prepared: resolved, units, warnings: assemblyWarnings } = await collected.value;
    const segmentOptions: {
      materializeCaches?: boolean;
      annotateOov?: boolean;
      annotateUserDict?: boolean;
    } = {};
    if (options.materializeUnitCaches !== undefined) {
      segmentOptions.materializeCaches = options.materializeUnitCaches;
    }
    if (this.options.annotateOov) segmentOptions.annotateOov = true;
    if (this.options.annotateUserDict) segmentOptions.annotateUserDict = true;
    const target = await this.renderPreparedTargetSegments(resolved, units, segmentOptions, sink);
    const rendered = withConjugationWarningCollection(() => {
      return translationWarningsFromUnits(units, resolved.tokens, this.lookups, this.numeric);
    });
    const segments = this._targetSegmentsToAnnotatedSegments(
      target.segments,
      collectPreparedAnnotationTokens(resolved),
      {
        ...(this.options.annotateOov ? { annotateOov: true } : {}),
        ...(this.options.annotateUserDict ? { annotateUserDict: true } : {})
      }
    );
    const warnings = mergeTranslationWarnings([...rendered.value, ...target.warnings, ...collected.warnings, ...rendered.warnings, ...assemblyWarnings]);
    return { segments, units, warnings };
  }

  private async renderPreparedTargetSegmentsWithFreshUnits(
    prepared: PreparedTranslation,
    options: { readonly materializeCaches?: boolean } = {},
    sink?: TranslationUnitSpaceSink
  ): Promise<{ readonly segments: readonly TargetSegment[]; readonly warnings: readonly Warning[] }> {
    if (prepared.pureMeow !== undefined) {
      const sourceSpan = sourceSpanForTokenSlice(prepared.tokens, 0, prepared.tokens.length);
      return {
        segments: [{
          text: prepared.pureMeow,
          sourceSpan,
          boundaryBefore: sourceSpan === null ? null : sourceBoundaryBeforeSourceSpan(sourceSpan),
          boundaryAfter: sourceSpan === null ? null : sourceBoundaryAfterSourceSpan(sourceSpan),
          unit: null,
          renderPlanKind: null,
          kind: "synthetic",
          projectionConfidence: "exact"
        }],
        warnings: []
      };
    }
    const builder = this.pipelineForRegister("casual");
    const collected = withConjugationWarningCollection(() => {
      return builder.buildResolvedUnitIr(prepared);
    });
    const { prepared: resolved, units, warnings: assemblyWarnings } = await collected.value;
    const rendered = withConjugationWarningCollection(() => {
      return translationWarningsFromUnits(units, resolved.tokens, this.lookups, this.numeric);
    });
    const target = await this.renderPreparedTargetSegments(resolved, units, options, sink);
    const warnings = mergeTranslationWarnings([...rendered.value, ...target.warnings, ...collected.warnings, ...rendered.warnings, ...assemblyWarnings]);
    return { segments: target.segments, warnings };
  }

  private async renderPreparedTargetSegments(
    prepared: ResolvedPreparedTranslation,
    units: readonly TranslationUnit[],
    options: { readonly materializeCaches?: boolean } = {},
    sink?: TranslationUnitSpaceSink
  ): Promise<{ readonly segments: readonly TargetSegment[]; readonly warnings: readonly Warning[] }> {
    sink?.emit({ id: sink.id, units, tokens: prepared.tokens });
    const islands = prepared.parentheticalIslands ?? [];
    const generationWarnings = () => units.flatMap((unit) =>
      unit.warnings.filter((warning) => warning.opKind === "render_plan_fallback_raw")
    );
    if (islands.length === 0) {
      const plain = this._generateTargetSegments(units, { ...options, tokens: prepared.tokens });
      return { segments: plain, warnings: generationWarnings() };
    }
    const innerRendered = new Map<
      ParentheticalIsland,
      { readonly segments: readonly TargetSegment[]; readonly warnings: readonly Warning[] }
    >();
    for (const island of islands) {
      if (island.pause === undefined) {
        innerRendered.set(island, await this.renderPreparedTargetSegmentsWithFreshUnits(
          island.innerPrepared,
          options,
          sink === undefined ? undefined : { id: `${sink.id}/${island.id}`, emit: sink.emit }
        ));
      }
    }
    const segments = this._generateTargetSegments(units, {
      ...options,
      tokens: prepared.tokens,
      allomorphIslandHosts: islands.flatMap((island) => {
        const rendered = innerRendered.get(island);
        if (rendered === undefined) {
          return [];
        }
        const text = trailingAllomorphHostText(rendered.segments, { tokens: island.innerPrepared.tokens });
        return text.length === 0 || !hasDeterminateAllomorphJongseong(text)
          ? []
          : [{
            startOrdinal: island.sourceSpan.startOrdinal,
            endOrdinal: island.sourceSpan.endOrdinal,
            text
          }];
      })
    });
    const mutable = [...segments];
    const warnings: Warning[] = [...generationWarnings()];
    for (const island of [...islands].sort((left, right) => right.sourceSpan.startOrdinal - left.sourceSpan.startOrdinal)) {
      const inner: { readonly segments: readonly TargetSegment[]; readonly warnings: readonly Warning[] } =
        innerRendered.get(island) ?? { segments: [], warnings: [] };
      warnings.push(...inner.warnings);
      const internalInsertion = insertParentheticalIntoInternalTargetBoundary(
        mutable,
        island,
        inner.segments,
        prepared.tokens
      );
      if (internalInsertion.inserted) {
        if (island.pause !== undefined) {
          markTransparentPauseIslandMaterialized(island);
        } else if (internalInsertion.warning !== undefined) {
          warnings.push(internalInsertion.warning);
        }
        continue;
      }
      const insertion = targetInsertionForParenthetical(mutable, island);
      const insertionIndex = normalizeParentheticalInsertionAtKoreanBoundary(
        mutable,
        parentheticalInsertionBeforeLaterRestoredIslands(mutable, insertion.index, island)
      );
      if (shouldSuppressIntraOwnerSpaceForParenthetical(mutable, insertionIndex)) {
        mutable.splice(insertionIndex, 1);
      }
      const pauseInsertionIndex = island.pause === undefined
        ? insertionIndex
        : adjustTransparentPauseInsertionIndex(mutable, insertionIndex);
      if (island.pause !== undefined) {
        markTransparentPauseIslandMaterialized(island);
      }
      const islandSegments = parentheticalTargetSegments(island, inner.segments, insertion.confidence);
      mutable.splice(pauseInsertionIndex, 0, ...islandSegments);
      if (
        island.pause === undefined &&
        parentheticalDelimiterTargetSegmentKind(island.delimiter.open) === "parenthetical"
      ) {
        restoreWordBoundaryAfterParenthetical(mutable, pauseInsertionIndex, islandSegments.length);
      }
    }
    absorbWhitespaceAfterTransparentPauses(mutable);
    return { segments: mutable, warnings };
  }

  private async translateAnnotatedText(input: AnnotatedText): Promise<AnnotatedResult> {
    const forwarded = transform.forward(input);
    const prepared = await this.prepareAnnotatedTranslation(forwarded);
    if (prepared.pureMeow !== undefined) {
      const bwd = transform.backward({
        segments: [{ text: prepared.pureMeow }],
        table: forwarded.table,
        ...(forwarded.metadata !== undefined ? { metadata: forwarded.metadata } : {}),
      });
      return { segments: bwd.segments, tableUpdate: diffTableUpdate(input.table, input.metadata, bwd.table, bwd.metadata) };
    }
    const { segments } = await this.renderAnnotatedPreparedTranslation(prepared);
    const bwd = transform.backward({
      segments: segments.map(s => ({ ...s, text: collapseMeowSpacing(s.text) })),
      table: forwarded.table,
      ...(forwarded.metadata !== undefined ? { metadata: forwarded.metadata } : {}),
    });
    return { segments: bwd.segments, tableUpdate: diffTableUpdate(input.table, input.metadata, bwd.table, bwd.metadata) };
  }

  private async translateAnnotatedTextWithWarnings(input: AnnotatedText): Promise<{ result: AnnotatedResult; warnings: readonly Warning[] }> {
    const forwarded = transform.forward(input);
    const prepared = await this.prepareAnnotatedTranslation(forwarded);
    if (prepared.pureMeow !== undefined) {
      const bwd = transform.backward({
        segments: [{ text: prepared.pureMeow }],
        table: forwarded.table,
        ...(forwarded.metadata !== undefined ? { metadata: forwarded.metadata } : {}),
      });
      return { result: { segments: bwd.segments, tableUpdate: diffTableUpdate(input.table, input.metadata, bwd.table, bwd.metadata) }, warnings: [] };
    }
    const { segments, warnings } = await this.renderAnnotatedPreparedTranslation(prepared);
    const bwd = transform.backward({
      segments: segments.map(s => ({ ...s, text: collapseMeowSpacing(s.text) })),
      table: forwarded.table,
      ...(forwarded.metadata !== undefined ? { metadata: forwarded.metadata } : {}),
    });
    return { result: { segments: bwd.segments, tableUpdate: diffTableUpdate(input.table, input.metadata, bwd.table, bwd.metadata) }, warnings };
  }

  private async translateAnnotatedTextWithUnits(input: AnnotatedText): Promise<readonly [AnnotatedResult, TranslationUnit[]]> {
    const forwarded = transform.forward(input);
    const prepared = await this.prepareAnnotatedTranslation(forwarded);
    if (prepared.pureMeow !== undefined) {
      const bwd = transform.backward({
        segments: [{ text: prepared.pureMeow }],
        table: forwarded.table,
        ...(forwarded.metadata !== undefined ? { metadata: forwarded.metadata } : {}),
      });
      return [{ segments: bwd.segments, tableUpdate: diffTableUpdate(input.table, input.metadata, bwd.table, bwd.metadata) }, []];
    }
    const { units, segments } = await this.renderAnnotatedPreparedTranslation(prepared, {
      materializeUnitCaches: true
    });
    const bwd = transform.backward({
      segments: segments.map(s => ({ ...s, text: collapseMeowSpacing(s.text) })),
      table: forwarded.table,
      ...(forwarded.metadata !== undefined ? { metadata: forwarded.metadata } : {}),
    });
    return [{ segments: bwd.segments, tableUpdate: diffTableUpdate(input.table, input.metadata, bwd.table, bwd.metadata) }, units];
  }

  private async renderPreparedTranslation(
    prepared: PreparedTranslation,
    options: { readonly materializeUnitCaches?: boolean } = {},
    sink?: TranslationUnitSpaceSink
  ): Promise<PreparedRenderResult> {
    if (prepared.pureMeow !== undefined) {
      return { text: prepared.pureMeow, units: [], warnings: [] };
    }
    const builder = this.pipelineForRegister("casual");
    const collected = withConjugationWarningCollection(() => {
      return builder.buildResolvedUnitIr(prepared);
    });
    const { prepared: resolved, units, warnings: assemblyWarnings } = await collected.value;
    const rendered = withConjugationWarningCollection(() => {
      return translationWarningsFromUnits(units, resolved.tokens, this.lookups, this.numeric);
    });
    const target = await this.renderPreparedTargetSegments(resolved, units, {
      ...(options.materializeUnitCaches === true ? { materializeCaches: true } : {})
    }, sink);
    const text = collapseMeowSpacing(renderTargetSegmentsText(target.segments));
    const warnings = mergeTranslationWarnings([...rendered.value, ...target.warnings, ...collected.warnings, ...rendered.warnings, ...assemblyWarnings]);
    return { text, units, warnings };
  }

  async buildUnits(text: string): Promise<TranslationUnit[]> {
    return (await this.translateWithUnits(text))[1];
  }

  async hasOovMiss(text: string): Promise<boolean> {
    for (const token of await this.preprocessTokens(text)) {
      const tpos = token.pos;
      const surface = token.surface;
      if (isNonLexicalSymbolToken(token)) {
        continue;
      }
      const isKatakanaSymbol = isSymbolCharacterToken(token)
        && surface.length > 0
        && isAllKatakana(surface);
      if (!isKatakanaSymbol && !CONTENT_POS.has(posToString(tpos).split("|")[0] ?? "")) {
        continue;
      }
      const splitB = token.splitB ?? [];
      const tpos012 = tpos & POS012;
      const isMistaggedKoyuuCompound = (tpos012 === 名詞_固有名詞_人名 || tpos012 === 名詞_固有名詞_地名)
        && splitB.length >= 2
        && splitB.every((subtoken) => (subtoken.pos & POS0) === 名詞 && (subtoken.pos & POS01) !== 名詞_固有名詞);
      if ((tpos & POS01) === 名詞_固有名詞 && (tpos012 === 名詞_固有名詞_人名 || tpos012 === 名詞_固有名詞_地名)) {
        if (!isMistaggedKoyuuCompound && !isAllKatakana(surface)) {
          continue;
        }
      }
      if (surface.length > 0 && [...surface].every((ch) => /^[A-Za-z0-9]$/u.test(ch))) {
        continue;
      }
      if (await this.dictionary.lookupTokenRelaxed(token) === undefined) {
        return true;
      }
    }
    return false;
  }

  private async hasExactAdverbEntry(form: string, reading: string): Promise<boolean> {
    const entry = await this.dictionary.lookupTokenRelaxed({
      surface: form,
      dictionaryForm: form,
      reading,
      dictionaryFormReading: reading,
      pos: 副詞,
      dictionaryId: 0
    } as RuntimeHaruToken);
    return entry !== undefined && entry.matchReason === undefined && entry.dictionaryForm === form;
  }

  private async resolveMergedYouonPos(candidate: RuntimeHaruToken): Promise<number | undefined> {
    for (const pos of [感動詞, 名詞 | 名詞_普通名詞]) {
      const entry = await this.dictionary.lookupTokenRelaxed({ ...candidate, pos });
      if (entry?.dictionaryForm !== undefined && [...entry.dictionaryForm].every(isKana)) {
        return entry.matchReason === undefined ? entry.pos ?? pos : pos;
      }
    }
    if ([...candidate.surface].slice(2).every((char) => SMALL_VOWEL_KANA.has(char) || char === "ー")) {
      return 感動詞;
    }
    return undefined;
  }

  private async isRestorableColloquialIAdjective(candidate: RuntimeHaruToken): Promise<boolean> {
    const entry = await this.dictionary.lookupTokenRelaxed(candidate);
    if (entry === undefined) {
      return false;
    }
    if (entry.matchReason !== undefined && entry.matchReason !== "colloquial_i_adjective_base_restored") {
      return false;
    }
    return ((entry.pos ?? 0) & POS0) === 形容詞0;
  }

  private async restoreFusedColloquialNonAdjectivePos(
    head: RuntimeHaruToken,
    candidate: RuntimeHaruToken
  ): Promise<number | undefined> {
    if (await this.dictionary.lookupTokenRelaxed(head) !== undefined) {
      return undefined;
    }
    for (const pos of [名詞 | 名詞_普通名詞, 副詞, 形状詞]) {
      const entry = await this.dictionary.lookupTokenRelaxed({ ...candidate, pos });
      if (entry === undefined ||
        (entry.matchReason !== undefined && entry.matchReason !== "form_relaxed")) {
        continue;
      }
      const entryPos0 = (entry.pos ?? 0) & POS0;
      if (entryPos0 === 名詞 || entryPos0 === 副詞 || entryPos0 === 形状詞) {
        return (entry.pos ?? 0) & (POS0 | POS1 | POS2);
      }
    }
    return undefined;
  }

  get dictionary(): MorphemeDictionary {
    return this.dictionaryInstance;
  }

  get patterns(): PatternDictionary {
    return this.patternInstance;
  }

  get collocations(): CollocationDictionary {
    return this.collocationInstance;
  }

  get numericSplits(): CollocationDictionary {
    return this.numericSplitsInstance;
  }

  get reanalysis(): ReanalysisDictionary {
    return this.reanalysisInstance;
  }

  get lookupTables(): LookupTables {
    return this.lookups;
  }

  get numericTables(): NumericTables {
    return this.numeric;
  }

  replaceUserDictionary(dict: UserDictionary): void {
    this.analyzerInstance.replaceUserLexicon(dict.lexiconEntries);
    this.userKoreanOverrides = dict.koreanOverrides;
    if (this.casualSibling !== undefined) {
      this.casualSibling.userKoreanOverrides = this.userKoreanOverrides;
    }
    if (this.formalSibling !== undefined) {
      this.formalSibling.userKoreanOverrides = this.userKoreanOverrides;
    }
  }

  setAnalyzerCache(cache: Map<string, HaruToken[]>): void {
    this.analyzerInstance.setCache(cache);
  }

  getAnalyzerCache(): Map<string, HaruToken[]> | undefined {
    return this.analyzerInstance.getCache();
  }

  private analyzer(): SudachiAnalyzer {
    return this.analyzerInstance;
  }

  private pipelineForRegister(register: "casual" | "formal"): TranslationPipeline {
    if (this.register === register) {
      return this;
    }
    if (register === "casual") {
      this.casualSibling ??= this.createRegisterSibling("casual");
      return this.casualSibling;
    }
    this.formalSibling ??= this.createRegisterSibling("formal");
    return this.formalSibling;
  }

  private createRegisterSibling(register: "casual" | "formal"): TranslationPipeline {
    const sibling = new TranslationPipeline(
      {
        analyzer: this.analyzerInstance,
        dictionary: this.dictionaryInstance,
        patterns: this.patternInstance,
        collocations: this.collocationInstance,
        numericSplits: this.numericSplitsInstance,
        reanalysis: this.reanalysisInstance,
        lookups: this.lookups,
        numeric: this.numeric
      },
      {
        register,
        dataDir: this.dataDir,
        useCommittedKoreanFallback: this._useCommittedKoreanFallback,
        ...(this.readingFallbackRule === undefined ? {} : { readingFallbackRule: this.readingFallbackRule })
      }
    );
    sibling.userKoreanOverrides = this.userKoreanOverrides;
    return sibling;
  }

  private analyze(text: string): RuntimeHaruToken[] {
    const runs = detectWhitespaceRuns(text, this.lookups.WHITESPACE_RUN_MAPPING);
    if (runs.length === 0) {
      return this.analyzeWithPolicy(text, "raw");
    }
    const barrier = this.lookups.WHITESPACE_BARRIER_CONTRACT;
    const letterSpacing = this.letterSpacingRunOrdinals(text, runs);
    const overrides = new Map<number, WhitespaceRunMode>();
    for (const run of runs) {
      if (run.kind === "line") {
        overrides.set(run.ordinal, "split");
      }
    }
    for (const ordinal of letterSpacing) {
      overrides.set(ordinal, "skip");
    }
    const undecided = runs.filter((run) =>
      run.kind !== "line" && !letterSpacing.has(run.ordinal));
    if (undecided.length === 0) {
      return this.analyzeWithPolicy(text, { runs, default: "barrier", overrides, barrier });
    }
    const preflight = this.analyzeWithPolicy(text, { runs, default: "split", overrides, barrier });
    const chunkBreaks = detectWhitespaceChunkBreaks(preflight, this.lookups);
    if (undecided.every((run) => chunkBreaks.has(run.ordinal))) {
      return withChunkBreakWitnesses(preflight, chunkBreaks);
    }
    const finalOverrides = new Map(overrides);
    for (const ordinal of chunkBreaks.keys()) {
      if (!letterSpacing.has(ordinal)) {
        finalOverrides.set(ordinal, "split");
      }
    }
    return withChunkBreakWitnesses(this.analyzeWithPolicy(text, {
      runs,
      default: "barrier",
      overrides: finalOverrides,
      bonds: this.bondExemptRunBonds(preflight),
      barrier
    }), chunkBreaks);
  }

  private bondExemptRunBonds(
    preflight: readonly RuntimeHaruToken[]
  ): ReadonlyMap<number, WhitespaceRunBond> {
    const bonds = new Map<number, WhitespaceRunBond>();
    for (const token of preflight) {
      const ordinal = token.whitespaceBefore?.runOrdinal;
      if (ordinal === undefined) {
        continue;
      }
      if ((token.pos & POS0) === 接尾辞) {
        bonds.set(ordinal, "exempt");
      }
    }
    return bonds;
  }

  private letterSpacingRunOrdinals(
    text: string,
    runs: readonly WhitespaceRun[]
  ): ReadonlySet<number> {
    const chains = letterSpacingRunChains(
      text,
      runs,
      this.lookups.WHITESPACE_LETTER_SPACING_MIN_RUNS,
      this.lookups.WHITESPACE_LETTER_SPACING_SEGMENT_CHAR
    );
    const confirmed = new Set<number>();
    for (const chain of chains) {
      if (this.formsSingleBunsetsu(chain.letters)) {
        for (const ordinal of chain.ordinals) {
          confirmed.add(ordinal);
        }
      }
    }
    return confirmed;
  }

  private formsSingleBunsetsu(letters: string): boolean {
    if (letters.length === 0) {
      return false;
    }
    const tokens = this.analyzer().tokenize(letters, "raw", this.lookups.PROLONGED_REDUCTION_CONTRACT);
    const head = tokens[0];
    if (head === undefined || isBoundFormPos0(head.pos)) {
      return false;
    }
    return tokens.every((token, index) =>
      token.dictionary_id !== OOV_DICTIONARY_ID &&
      (index === 0 || isBoundFormPos0(token.pos)));
  }

  private analyzeWithPolicy(
    text: string,
    policy: WhitespaceRunPolicy | "raw"
  ): RuntimeHaruToken[] {
    return this.analyzer().tokenize(text, policy, this.lookups.PROLONGED_REDUCTION_CONTRACT)
      .map((token: HaruToken, ordinal) => runtimeTokenFromHaru(token, {
        startOrdinal: ordinal,
        endOrdinal: ordinal + 1
      }));
  }

}

export interface TranslationPipeline extends PipelineCompoundMixin, PipelineContentResolverMixin { }

applyPipelineMixins();

function applyPipelineMixins(): void {
  for (const baseCtor of [PipelineFallbackMixin, PipelineContentResolverMixin] as const) {
    for (const name of Object.getOwnPropertyNames(baseCtor.prototype)) {
      if (name === "constructor" || name in TranslationPipeline.prototype) {
        continue;
      }
      const descriptor = Object.getOwnPropertyDescriptor(baseCtor.prototype, name);
      if (descriptor !== undefined) {
        Object.defineProperty(TranslationPipeline.prototype, name, descriptor);
      }
    }
  }
}

export { resolveDataDir, type DataPathOptions } from "./data-paths.js";

function isAllKatakana(text: string): boolean {
  return text.length > 0 && [...text].every((ch) => "゠" <= ch && ch <= "ヿ");
}
