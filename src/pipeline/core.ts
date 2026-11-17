
import { getDataLoader, lazyValue, type DataLoader } from "../data-loader.js";
import { CONJUGATION_TEMPLATES_FILENAME } from "../analyzer-lexicon.js";

import { SudachiAnalyzer, type HaruToken } from "../analyzer/index.js";
import type { HaruWhitespaceMark } from "../analyzer/haru-compat.js";
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
import { MorphemeDictionary, type FuzzyLevel } from "../dictionary/morpheme.js";
import { PatternDictionary } from "../dictionary/pattern.js";
import { withConjugationWarningCollection } from "../generator/conjugator.js";
import { alignReading, isKanji, minimumAlignedReadingLength } from "../generator/kanji-alignment.js";
import { isKana, toKatakana } from "../utils/char-class.js";
import { normalizeKana, type ReadingRule } from "../generator/readings.js";
import type { AnnotatedResult, AnnotatedSegment, AnnotatedText, AnnotationEntry, AnnotationMetadata, CharPointAnnotationMetadata } from "../types/annotation.js";
import * as transform from "../transform/index.js";
import { flipNiComplementMatrixPredicates } from "../transform/ni-complement-matrix-flip.js";
import { retagKeijoujiCopulaRenyou } from "../transform/keijouji-copula-de-retag.js";
import { retagExplanatoryMonAsSentenceFinalParticle } from "../transform/explanatory-mon-sfp-retag.js";
import { retagVolitionalResolutionAsSentenceFinalParticle } from "../transform/volitional-resolution-sfp-retag.js";
import { retagRentaishiNoAsNominalizer } from "../transform/rentaishi-no-nominalizer-retag.js";
import { flipQuotativeMannerNouns } from "../transform/quotative-manner-noun-flip.js";
import { mergeCompoundParticles } from "../transform/compound-particle-merge.js";
import { normalizeReduplications } from "../transform/reduplicated-mimetic.js";
import {
  canonicalizeWordElongationSmallVowels,
  mergeNasalVocalizationRuns,
  remergeSplitYouon,
  retagStandaloneSmallKana
} from "../transform/youon-remerge.js";
import { diffTableUpdate } from "../transform/table-update.js";
import { outputPauseSurface } from "../transform/transparent-pause.js";
import type {
  LongVowelReductionMetadata,
  RuntimeHaruToken,
  SeparationEvidence,
  SeparationKind,
  SourceCompoundProjectionBoundary,
  SourceRubyReadingFragment,
  SourceTokenBoundary,
  SourceTokenSpan
} from "../types/token.js";
import {
  computeSourceSpan,
  inheritedSourceIdentity,
  morphSurface,
  splitBoundaryRuntimeStateForPieces,
  mergeRuntimeTokenSourceIdentity,
  rewriteRuntimeTokenSurface,
  runtimeTokenSourceSpan,
  shiftRuntimeTokenSourceIdentity,
  shiftSourceBoundary,
  shiftSourceSpan,
  splitTrailingBoundaryRuntimeState,
  withRuntimeTokenSourceSpan
} from "../types/token.js";
import type { ProjectionConfidence, TargetSegment } from "../types/projection.js";
import { assignAnnotationKeysFromSegments, charPointPlacements, type CharPointPlacement } from "./annotation.js";
import { detectEllipsisRunPreflightEvidence, detectWhitespaceChunkBreaks, type EnclosingDelimiterKind } from "./clause-layout/index.js";
import type { WhitespaceJunctureBoundaryEvidence } from "./clause-layout/juncture-verdict.js";
import {
  closesUtteranceAs,
  utteranceClosureAfter,
  utteranceClosureAt,
  type UtteranceClosureKind
} from "./clause-layout/utterance-closure.js";
import { detectOpaqueWavePauseRuns } from "./pause-range-preflight.js";
import {
  DETACHED_SEPARATIONS,
  SEPARATION_BREAKS_MORPHEME_CHAIN,
  SEPARATION_OPENS_BOUNDARY,
  isSourceSeparatedFromPreviousToken,
  nextNonSpaceIndex,
  separatedAs
} from "./clause-layout/trivia.js";
import { applySourceRubyReadingFragments } from "./source-ruby-replay.js";
import { PipelineAssemblerMixin } from "./assembler.js";
import { PipelineCompoundMixin, isSugiruAuxiliaryToken } from "./compounds/index.js";
import { resolveDataDir, type DataPathOptions } from "./data-paths.js";
import { attachMoraStutterPrefixes, moraStutterRepeatIndex } from "./disfluency/stutter-prefix.js";
import { PASSTHROUGH_POS, PipelineFallbackMixin, isNonLexicalSymbolSurface, isNonLexicalSymbolToken } from "./fallback/index.js";
import { hasUnitRawClosureWarning, rawClosureWarningHoldsForRealization } from "./fallback/unsupported-raw.js";
import { CONTENT_POS } from "./lookup-tables.js";
import type { LookupTables } from "./lookup-tables.js";
import type { NumericTables } from "../generator/numeric-lookup.js";
import { PipelineContentResolverMixin } from "./content-resolver.js";
import { collectNominalTailChainCommittedWarnings } from "./head-tail/head/adapters/nominal/commit.js";
import type { PredicateHeadTailChainRenderPlan } from "./head-tail/lifecycle/head-tail-render-plan.js";
import {
  isNominalHeadTailChainRenderPlan,
  isPredicateHeadTailChainRenderPlan
} from "../types/render-plan.js";
import {
  canonicalHardTerminalPunctuationSurfaceFor,
  isBoundaryPunctuationCategoryToken,
  isHardTerminalPunctuationSurface,
  isHardTerminalPunctuationToken,
  isZeroWidthTerminalPunctuationContinuationToken
} from "./head-tail/boundary/punctuation.js";
import {
  isMultiGlyphDelimiterSymbolToken,
  MULTI_GLYPH_DELIMITER_SPLIT_REASON
} from "./head-tail/boundary/parenthetical.js";
import { teBenefactiveContinuationMetadataForToken } from "./head-tail/tail/postverb-tail-classifier.js";
import { COLLAPSED_ASPECT_AUX_CONTRACTION_BY_LEMMA } from "./head-tail/tail/te-tail-continuation-table.js";
import { parentheticalSpanStartingAt } from "./head-tail/boundary/parenthetical.js";
import { quoteMarkerRelationAt } from "./head-tail/boundary/quote-marker.js";
import { convertPunctuation } from "./rendering/punctuation.js";
import { renderTargetSegmentsText } from "./rendering/target-segment-text.js";
import { trailingAllomorphHostText } from "./rendering/allomorph-host.js";
import { hasDeterminateAllomorphJongseong } from "../generator/particles.js";
import { realizeRenderPlan } from "./rendering/render-plan.js";
import { warningDedupKey, type Warning } from "../types/warning.js";
import { UnitType, type TranslationUnit } from "./translation/unit.js";
import type { UserDictionary } from "../user-dictionary.js";

import {
  POS0,
  POS0_NAME,
  POS01,
  POS012,
  POS1,
  POS1_OF_NAME,
  isBoundFormPos0,
  isDependentWordToken,
  isIndependentWordToken,
  isParticleSubtypeToken,
  particleSubtypeBit,
  POS2,
  POS4,
  pos0in,
  POS5,
  POS5A,
  POS5B,
  _撥音便,
  posToString,
  PUNCTUATION_BITS,
  仮定形_,
  仮定形_一般,
  仮定形_融合,
  感動詞,
  isSymbolCharacterToken,
  形状詞,
  形状詞_助動詞語幹,
  形容詞0,
  形容詞4,
  助詞,
  助詞_格助詞,
  助動詞,
  助動詞_タ,
  助動詞_ダ,
  助動詞_デス,
  助動詞_マス,
  助動詞_ヤス,
  助動詞_タイ,
  助動詞_ナイ,
  助動詞_ヌ,
  助動詞_ヘン,
  助動詞_ヤ,
  助動詞_ジャ,
  助動詞_レル,
  文語サ行変格,
  文語助動詞_ケリ,
  文語助動詞_ム,
  文語助動詞_ンス,
  終止形_一般,
  終止形_促音便,
  終止形_撥音便,
  語幹_,
  連体形_撥音便,
  助詞_係助詞,
  接尾辞_形状詞的,
  助詞_副助詞,
  助詞_接続助詞,
  代名詞,
  動詞,
  副詞,
  接続詞,
  接頭辞,
  接尾辞,
  補助記号,
  補助記号_括弧閉,
  補助記号_括弧開,
  意志推量形_,
  未然形_,
  未然形_一般,
  終止形_,
  連体形_,
  連体形_一般,
  連用形_促音便,
  連用形_イ音便,
  連用形_一般,
  連用形_撥音便,
  名詞,
  名詞的,
  名詞_固有名詞,
  名詞_固有名詞_人名,
  名詞_固有名詞_地名,
  名詞_普通名詞,
  名詞_普通名詞_サ変可能,
  命令形_,
  連用形_,
  非自立可能,
  is上一段,
  is下一段,
  上一段_カ行,
  上一段_ハ行,
  五段_カ行,
  五段_ガ行,
  五段_サ行,
  五段_タ行,
  五段_ナ行,
  五段_バ行,
  五段_マ行,
  五段_ラ行,
  五段_ワア行,
  サ行変格,
  下一段_ア行,
  下一段_カ行,
  下一段_ガ行,
  下一段_サ行,
  下一段_タ行,
  下一段_ナ行,
  下一段_バ行,
  下一段_マ行,
  下一段_ラ行,
  助詞_終助詞,
  助詞_準体助詞,
  補助記号_句点,
  補助記号_読点,
  接尾辞_名詞的,
  助動詞語幹,
  連用形_ニ,
  動詞_非自立可能,
  意志推量形,
  isBungoVolitionalMuHatsuonToken,
  isCaseParticleToken,
  isConjunctiveParticleToken,
  isDesireAuxiliaryPos,
  isPoliteCopulaPos,
  isAssertiveCopulaFamilyPos,
  isRenyouInflection,
  isNaAdjCapable,
  isNuAttachmentHostToken,
  isTeFormFusionHostToken,
  isVoiceOrCausativeAuxiliaryToken,
  isAdjectivalTeFormFusionHostToken,
  isVoicedTeFormHostToken,
  isVerbPredicateToken,
  isVolitionalInflection,
  NOMINAL_BITS,
  INFLECTABLE_AUX_BITS, INFLECTABLE_BITS,
  連体詞,
  isAttributiveInflection,
  isAttributiveOrHomophonousTerminalInflection,
  isPronounToken,
  isCounterCapableToken,
  is文語助動詞,
  isNegativeAuxiliaryPos,
  isClassicalNegativeAuxiliaryToken
} from "../types/pos.js";
import { latinNotationAcceptsSourceReading } from "../generator/korean-reading.js";
import { bareTteTopicExclamativeFollowerAhead, collapsedAspectAuxContraction, collapsedPotentialAspectAuxContraction, isFusedNegativeStateChangeVerbToken, isSuruVerbToken, teConnectiveFusedAspectContraction, type CollapsedAspectAuxContraction } from "./head-tail/tail/predicate-root/classifiers/tokens.js";
import { dewaScopeBridgeRelationAt } from "./head-tail/boundary/marker.js";
import { isTeAuxActivationAccepted } from "./head-tail/tail/predicate-root/postverb-auxiliary-parser.js";
import { loadConnectiveSurfaceEntries } from "./head-tail/tail/predicate-root/connective-surface-table.js";
import { isColloquialNaiNeeSurface } from "./semantics/sfp-surface.js";
import { isCopulaAuxToken } from "./semantics/copula-tail-runtime.js";
import { TokenCursor } from "./token-cursor.js";

const SYMMETRIC_QUOTE_SURFACES = new Set(["\"", "'", "＂", "＇"]);

function startsNewSourceLine(token: RuntimeHaruToken | undefined): boolean {
  return token?.sourceLineBreakBefore === true;
}

function symmetricQuoteDirections(
  tokens: readonly RuntimeHaruToken[],
  toggleSurfaces: ReadonlySet<string>
): ReadonlyMap<number, number> {
  const directions = new Map<number, number>();
  if (toggleSurfaces.size === 0) {
    return directions;
  }
  let lineStart = 0;
  for (let index = 0; index <= tokens.length; index += 1) {
    if (index !== tokens.length && !(index > lineStart && startsNewSourceLine(tokens[index]))) {
      continue;
    }
    assignSymmetricQuoteDirectionsInLine(tokens, lineStart, index, toggleSurfaces, directions);
    lineStart = index;
  }
  return directions;
}

function assignSymmetricQuoteDirectionsInLine(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  endExclusive: number,
  toggleSurfaces: ReadonlySet<string>,
  directions: Map<number, number>
): void {
  const occurrencesBySurface = new Map<string, number[]>();
  for (let index = start; index < endExclusive; index += 1) {
    const surface = tokens[index]!.surface;
    if (!toggleSurfaces.has(surface)) {
      continue;
    }
    const seen = occurrencesBySurface.get(surface);
    if (seen === undefined) {
      occurrencesBySurface.set(surface, [index]);
    } else {
      seen.push(index);
    }
  }
  for (const occurrences of occurrencesBySurface.values()) {
    for (const [ordinal, index] of occurrences.entries()) {
      const unpaired = occurrences.length % 2 === 1 && ordinal === occurrences.length - 1;
      const opening = unpaired ? index === start : ordinal % 2 === 0;
      directions.set(index, opening ? 補助記号_括弧開 : 補助記号_括弧閉);
    }
  }
}

function hasFollowingPrefixHost(tokens: readonly RuntimeHaruToken[], from: number): boolean {
  const c = new TokenCursor(tokens, from);
  while (c.pos < c.end) {
    const pos0 = (c.current()?.pos ?? 0) & POS0;
    if (((1 << 補助記号) | (1 << 接頭辞)) >> pos0 & 1) {
      c.advance();
      continue;
    }
    return (((1 << 名詞) | (1 << 動詞) | (1 << 形容詞0) | (1 << 副詞) | (1 << 形状詞)) >> pos0 & 1) === 1;
  }
  return false;
}

function isPositiveFusedConditionalToken(token: RuntimeHaruToken): boolean {
  if ((token.pos & POS5) !== 仮定形_融合) {
    return false;
  }
  const pos0 = token.pos & POS0;
  if (pos0 === 動詞) {
    return true;
  }
  if (pos0 === 形容詞0) {
    return token.dictionaryForm !== "ない" && token.dictionaryForm !== "無い";
  }
  return false;
}

function canonicalizeTerminalPunctuationNotation(
  tokens: readonly RuntimeHaruToken[]
): RuntimeHaruToken[] {
  let dirty = false;
  const result = [...tokens];
  for (let index = 0; index < result.length; index += 1) {
    const head = result[index];
    if (head === undefined || head.surface.length === 0) {
      continue;
    }
    const headSurface = canonicalHardTerminalPunctuationSurfaceFor(head);
    if (headSurface === null) {
      continue;
    }
    let endExclusive = index + 1;
    while (
      endExclusive < result.length &&
      isZeroWidthTerminalPunctuationContinuationToken(result[endExclusive])
    ) {
      endExclusive += 1;
    }
    if (endExclusive === index + 1) {
      continue;
    }
    const surfaces: string[] = [headSurface];
    for (let cursor = index + 1; cursor < endExclusive; cursor += 1) {
      const continuationSurface = canonicalHardTerminalPunctuationSurfaceFor(result[cursor]);
      if (continuationSurface === null) {
        break;
      }
      surfaces.push(continuationSurface);
    }
    if (surfaces.length !== endExclusive - index) {
      continue;
    }
    for (let cursor = index; cursor < endExclusive; cursor += 1) {
      const token = result[cursor]!;
      result[cursor] = {
        ...rewriteRuntimeTokenSurface(token, { kind: "replace", surface: surfaces[cursor - index]! }),
        syntheticReason: "terminal_punctuation_notation_canonicalization"
      };
    }
    dirty = true;
    index = endExclusive - 1;
  }
  return expandMultiGlyphDelimiterSymbolTokens(dirty ? result : tokens);
}

function expandMultiGlyphDelimiterSymbolTokens(
  tokens: readonly RuntimeHaruToken[]
): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (const token of tokens) {
    const pieces = splitMultiGlyphDelimiterSymbolToken(token);
    if (pieces === null) {
      result.push(token);
      continue;
    }
    dirty = true;
    result.push(...pieces);
  }
  return dirty ? result : [...tokens];
}

function splitMultiGlyphDelimiterSymbolToken(
  token: RuntimeHaruToken
): RuntimeHaruToken[] | null {
  if (!isMultiGlyphDelimiterSymbolToken(token)) {
    return null;
  }
  const chars = [...token.surface];
  const charSpan = token.sourceCharSpan;
  if (charSpan !== undefined && charSpan !== null && charSpan.end - charSpan.start !== chars.length) {
    return null;
  }
  const { head, inner, tail } = splitBoundaryRuntimeStateForPieces(token);
  const lastIndex = chars.length - 1;
  return chars.map((char, offset) => {
    const piece: Record<string, unknown> = {
      ...(offset === 0 ? head : inner),
      ...(offset === lastIndex ? tail : {}),
      surface: char,
      dictionaryForm: char,
      reading: char,
      dictionaryFormReading: char,
      pos: delimiterSplitPiecePos(char, token.pos),
      dictionaryId: 0,
      syntheticReason: MULTI_GLYPH_DELIMITER_SPLIT_REASON
    };
    delete piece.splitA;
    delete piece.splitB;
    if (charSpan === undefined || charSpan === null) {
      delete piece.sourceCharSpan;
    } else {
      piece.sourceCharSpan = { start: charSpan.start + offset, end: charSpan.start + offset + 1 };
    }
    return piece as unknown as RuntimeHaruToken;
  });
}

function delimiterSplitPiecePos(char: string, basePos: number): number {
  const highBits = basePos & ~POS012;
  if (/^[\p{Ps}\p{Pi}]$/u.test(char)) {
    return 補助記号_括弧開 | highBits;
  }
  if (/^[\p{Pe}\p{Pf}]$/u.test(char)) {
    return 補助記号_括弧閉 | highBits;
  }
  return (isHardTerminalPunctuationSurface(char) ? 補助記号_句点 : 補助記号) | highBits;
}

function expandFusedConditionalConnectiveSplits(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (const token of tokens) {
    if (!isPositiveFusedConditionalToken(token)) {
      result.push(token);
      continue;
    }
    dirty = true;
    result.push({
      ...token,
      pos: (token.pos & ~POS5) | 仮定形_一般,
      syntheticReason: "fused_conditional_stem"
    });
    result.push({
      surface: "ば",
      dictionaryForm: "ば",
      reading: "バ",
      dictionaryFormReading: "バ",
      pos: 助詞_接続助詞,
      dictionaryId: 0,
      ...inheritedSourceIdentity(token),
      syntheticReason: "fused_conditional_ba"
    });
  }
  return dirty ? result : [...tokens];
}

function expandCopulaFocusFusedNegativeStateChange(
  tokens: readonly RuntimeHaruToken[],
  lookups: LookupTables
): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  const fusedIndices = new Set<number>();
  for (let index = 0; index < tokens.length; index += 1) {
    const bridge = dewaScopeBridgeRelationAt(tokens, index);
    if (bridge === null) {
      continue;
    }
    const body = tokens[bridge.span.endExclusive];
    if (
      body !== undefined &&
      !separatedAs(tokens, bridge.span.endExclusive, SEPARATION_BREAKS_MORPHEME_CHAIN) &&
      isFusedNegativeStateChangeVerbToken(body, lookups) &&
      body.surface.startsWith(FUSED_NEGATIVE_RENYOU_SURFACE) &&
      body.surface.length > FUSED_NEGATIVE_RENYOU_SURFACE.length
    ) {
      fusedIndices.add(bridge.span.endExclusive);
    }
  }
  for (const [index, token] of tokens.entries()) {
    if (!fusedIndices.has(index)) {
      result.push(token);
      continue;
    }
    dirty = true;
    result.push(...splitFusedNegativeStateChangeToken(token));
  }
  return dirty ? result : [...tokens];
}

function splitFusedNegativeStateChangeToken(token: RuntimeHaruToken): readonly RuntimeHaruToken[] {
  const stateChangeLemma = (token.dictionaryForm || token.surface)
    .slice(FUSED_NEGATIVE_RENYOU_SURFACE.length);
  const stateChange = rewriteRuntimeTokenSurface(token, {
    kind: "remove_prefix",
    prefix: FUSED_NEGATIVE_RENYOU_SURFACE
  });
  const { head, inner, tail } = splitBoundaryRuntimeStateForPieces(stateChange);
  const negationPiece: Record<string, unknown> = {
    ...head,
    surface: FUSED_NEGATIVE_RENYOU_SURFACE,
    dictionaryForm: FUSED_NEGATIVE_RENYOU_LEMMA,
    reading: FUSED_NEGATIVE_RENYOU_READING,
    dictionaryFormReading: FUSED_NEGATIVE_RENYOU_LEMMA_READING,
    pos: 形容詞0 | 非自立可能 | 形容詞4 | 連用形_一般,
    dictionaryId: 0,
    syntheticReason: "copula_focus_fused_negative_state_change:naku"
  };
  delete negationPiece.longVowelReduction;
  delete negationPiece.normalizedForm;
  const stateChangePiece: Record<string, unknown> = {
    ...inner,
    ...tail,
    dictionaryForm: stateChangeLemma,
    ...(token.reading !== undefined && token.reading.length > FUSED_NEGATIVE_RENYOU_READING.length &&
      token.reading.startsWith(FUSED_NEGATIVE_RENYOU_READING)
      ? { reading: token.reading.slice(FUSED_NEGATIVE_RENYOU_READING.length) }
      : {}),
    ...(token.dictionaryFormReading !== undefined &&
      token.dictionaryFormReading.startsWith(FUSED_NEGATIVE_RENYOU_READING)
      ? { dictionaryFormReading: token.dictionaryFormReading.slice(FUSED_NEGATIVE_RENYOU_READING.length) }
      : {}),
    pos: (token.pos & ~POS01) | 動詞_非自立可能,
    dictionaryId: 0,
    syntheticReason: "copula_focus_fused_negative_state_change:naru"
  };
  delete stateChangePiece.normalizedForm;
  return [
    negationPiece as unknown as RuntimeHaruToken,
    stateChangePiece as unknown as RuntimeHaruToken
  ];
}

const FUSED_NEGATIVE_RENYOU_SURFACE = "なく";
const FUSED_NEGATIVE_RENYOU_READING = "ナク";
const FUSED_NEGATIVE_RENYOU_LEMMA = "ない";
const FUSED_NEGATIVE_RENYOU_LEMMA_READING = "ナイ";

function retagKansaiAssertiveDe(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    const prev = result[result.length - 1];
    const prevPos0 = (prev?.pos ?? 0) & POS0;
    const prevIsYogenTerminal = prev !== undefined &&
      (pos0in(prevPos0, INFLECTABLE_AUX_BITS)) &&
      (prev.pos & POS5A) === 終止形_;
    const prevIsNegative = prev !== undefined && (
      (prev.pos & POS4) === 助動詞_ナイ || (prev.pos & POS4) === 助動詞_ヌ ||
      (prevPos0 === 形容詞0 && (prev.dictionaryForm === "ない" || prev.dictionaryForm === "無い"))
    );
    const isAssertiveDeForm = token.surface === "で" && (
      (token.pos & (POS0 | POS4 | POS5A)) === (助動詞 | 助動詞_ダ | 連用形_) ||
      (token.pos & POS01) === 助詞_終助詞 ||
      ((token.pos & POS01) === 助詞_接続助詞 && !prevIsNegative)
    );
    const next = tokens[i + 1];
    const isSentenceFinal = next === undefined || (next.pos & POS01) === 補助記号_句点;
    if (!isAssertiveDeForm || !prevIsYogenTerminal || !isSentenceFinal) {
      result.push(token);
      continue;
    }
    dirty = true;
    result.push({
      surface: "よ",
      dictionaryForm: "よ",
      reading: "ヨ",
      dictionaryFormReading: "ヨ",
      pos: 助詞_終助詞,
      dictionaryId: 0,
      ...inheritedSourceIdentity(token),
      syntheticReason: "kansai_assertive_de"
    });
  }
  return dirty ? result : [...tokens];
}

function retagMistaggedWakedeCopulaRenyou(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
  let dirty = false;
  const result = tokens.map((token, index) => {
    if (token.surface !== "で" || (token.pos & POS01) !== 助詞_格助詞) {
      return token;
    }
    const prev = tokens[index - 1];
    if (prev === undefined || prev.reading !== "ワケ" || (prev.pos & POS0) !== 名詞) {
      return token;
    }
    const next = tokens[index + 1];
    if (
      next !== undefined &&
      (next.surface === "は" || next.surface === "も" || next.dictionaryForm === "ある")
    ) {
      return token;
    }
    dirty = true;
    return {
      ...token,
      dictionaryForm: "だ",
      dictionaryFormReading: "ダ",
      pos: 助動詞 | 助動詞_ダ | 連用形_,
      syntheticReason: "wakede_copula_renyou"
    };
  });
  return dirty ? result : [...tokens];
}

function isKyotoHinNegativePastTail(
  token: RuntimeHaruToken | undefined,
  next: RuntimeHaruToken | undefined
): boolean {
  return token !== undefined &&
    (token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_ナイ) &&
    (token.pos & POS5) === 連用形_促音便 &&
    token.surface.startsWith("ん") &&
    next !== undefined &&
    (next.pos & POS4) === 助動詞_タ;
}

function retagKyotoNegativeHin(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    const prev = result[result.length - 1];
    const prevPos5A = (prev?.pos ?? 0) & POS5A;
    const isMistaggedHin = (token.pos & (POS0 | POS4)) === (動詞 | 上一段_ハ行) && token.dictionaryForm === "ひる" && prev !== undefined && (prev.pos & POS0) === 動詞 && (prevPos5A === 連用形_ || prevPos5A === 未然形_);
    if (!isMistaggedHin) {
      result.push(token);
      continue;
    }
    dirty = true;
    const pastTail = isKyotoHinNegativePastTail(tokens[i + 1], tokens[i + 2])
      ? tokens[i + 1]!
      : null;
    if (pastTail !== null) {
      i += 1;
    }
    const retagged: RuntimeHaruToken = {
      ...token,
      dictionaryForm: "へん",
      dictionaryFormReading: "ヘン",
      pos: 助動詞 | 助動詞_ヘン | 終止形_一般,
      syntheticReason: "kyoto_hin_negation"
    };
    result.push(
      pastTail !== null && token.sourceSpan != null && pastTail.sourceSpan != null
        ? mergeRuntimeTokenSourceIdentity(retagged, [token, pastTail])
        : retagged
    );
  }
  return dirty ? result : [...tokens];
}

function expandBungoGotoshi(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (const [index, token] of tokens.entries()) {
    const copulaForm = gotoshiCopulaForm(token);
    if (copulaForm === undefined || !followsNominalNo(tokens, index)) {
      result.push(token);
      continue;
    }
    dirty = true;
    const identity = inheritedSourceIdentity(token);
    result.push({
      surface: "よう",
      dictionaryForm: "よう",
      reading: "ヨウ",
      dictionaryFormReading: "ヨウ",
      pos: 形状詞 | 助動詞語幹,
      dictionaryId: 0,
      ...identity,
      syntheticReason: "bungo_gotoshi"
    }, {
      surface: copulaForm.surface,
      dictionaryForm: "だ",
      reading: copulaForm.reading,
      dictionaryFormReading: "ダ",
      pos: 助動詞 | 助動詞_ダ | copulaForm.pos5,
      dictionaryId: 0,
      ...identity,
      syntheticReason: "bungo_gotoshi"
    });
  }
  return dirty ? result : [...tokens];
}

function followsNominalNo(tokens: readonly RuntimeHaruToken[], index: number): boolean {
  const marker = tokens[index - 1];
  const host = tokens[index - 2];
  return marker !== undefined && marker.surface === "の" && (marker.pos & POS0) === 助詞 &&
    host !== undefined && (host.pos & POS0) !== 形状詞;
}

function gotoshiCopulaForm(
  token: RuntimeHaruToken
): { readonly surface: string; readonly reading: string; readonly pos5: number } | undefined {
  if ((token.pos & POS0) !== 助動詞 || (token.dictionaryForm !== "如し" && token.dictionaryForm !== "ごとし")) {
    return undefined;
  }
  switch (token.pos & POS5A) {
    case 連用形_:
      return { surface: "に", reading: "ニ", pos5: 連用形_ニ };
    case 連体形_:
      return { surface: "な", reading: "ナ", pos5: 連体形_一般 };
    case 終止形_:
      return { surface: "だ", reading: "ダ", pos5: 終止形_一般 };
    default:
      return undefined;
  }
}

function expandKansaiNegativeHen(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    const isHen = token.dictionaryForm === "へん" && (token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_ヘン);
    const prev = result[result.length - 1];
    const prevPos5A = (prev?.pos ?? 0) & POS5A;
    const hasVerbHost = prev !== undefined && (prev.pos & POS0) === 動詞 &&
      (prevPos5A === 連用形_ || prevPos5A === 未然形_);
    const hasVoiceAuxHost = prev !== undefined && (prev.pos & POS0) === 助動詞 &&
      ((prev.pos & POS4) === 助動詞_レル || isCausativeAuxLemma(prev)) &&
      (prevPos5A === 連用形_ || prevPos5A === 未然形_);
    if (!isHen || !(hasVerbHost || hasVoiceAuxHost)) {
      result.push(token);
      continue;
    }
    dirty = true;
    if (prevPos5A !== 未然形_) {
      result[result.length - 1] = { ...prev, pos: (prev.pos & ~POS5) | 未然形_一般 };
    }
    const next = tokens[i + 1];
    const isPast = next !== undefined &&
      (next.pos & POS4) === 助動詞_タ && next.dictionaryForm === "た";
    const naiPos5 = isPast ? 連用形_促音便 : hasAttributiveFollower(next) ? 連体形_一般 : 終止形_一般;
    result.push({
      surface: isPast ? "なかっ" : "ない",
      dictionaryForm: "ない",
      reading: isPast ? "ナカッ" : "ナイ",
      dictionaryFormReading: "ナイ",
      pos: 助動詞 | 助動詞_ナイ | naiPos5,
      dictionaryId: 0,
      ...inheritedSourceIdentity(token),
      syntheticReason: "kansai_hen_negation"
    });
  }
  return dirty ? result : [...tokens];
}

async function expandKansaiExplanatoryNen(
  tokens: readonly RuntimeHaruToken[],
  isRestorableIAdjective: (candidate: RuntimeHaruToken) => Promise<boolean>
): Promise<RuntimeHaruToken[]> {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  let expandedAt: number | null = null;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    const prev = result[result.length - 1];
    if (expandedAt === i - 1 && !separatedAs(tokens, i, DETACHED_SEPARATIONS)) {
      const restored = (token.pos & POS0) === 接続詞 && isAdversativeConnectiveToken(token)
        ? [{ ...token, pos: 助詞_接続助詞, dictionaryId: 0 }]
        : predicateHostFollowerParticle(token)?.filter((piece) => (piece.pos & POS01) !== 助詞_終助詞) ?? null;
      if (restored !== null && restored.length === 1) {
        result.push({ ...restored[0]!, syntheticReason: "kansai_explanatory_nen_follower" });
        continue;
      }
    }
    if (
      (token.pos & POS01) !== 助詞_終助詞 || morphSurface(token) !== "ねん" ||
      prev === undefined || !isExplanatoryNenHostToken(result, result.length - 1) ||
      ((prev.pos & POS0) === 形容詞0 && !await isRestorableIAdjective(prev))
    ) {
      result.push(token);
      continue;
    }
    dirty = true;
    expandedAt = i;
    const { head, inner, tail } = splitBoundaryRuntimeStateForPieces(token);
    const pieces = [
      { ...head, surface: "の", dictionaryForm: "の", reading: "ノ", dictionaryFormReading: "ノ", pos: 助詞_準体助詞 },
      { ...inner, ...tail, surface: "や", dictionaryForm: "や", reading: "ヤ", dictionaryFormReading: "ヤ", pos: 助動詞 | 助動詞_ヤ | 終止形_一般 }
    ];
    pieces.forEach((piece, offset) => {
      const synthetic: Record<string, unknown> = { ...piece, dictionaryId: 0, syntheticReason: "kansai_explanatory_nen" };
      delete synthetic.normalizedForm;
      delete synthetic.longVowelReduction;
      const span = token.sourceCharSpan;
      if (span != null && span.end - span.start === 2) {
        synthetic.sourceCharSpan = { start: span.start + offset, end: span.start + offset + 1 };
      } else {
        delete synthetic.sourceCharSpan;
      }
      result.push(synthetic as unknown as RuntimeHaruToken);
    });
  }
  return dirty ? result : [...tokens];
}

function isExplanatoryNenHostToken(result: readonly RuntimeHaruToken[], hostIndex: number): boolean {
  const host = result[hostIndex]!;
  const pos0 = host.pos & POS0;
  if (pos0 !== 動詞 && pos0 !== 形容詞0 && pos0 !== 助動詞) {
    return false;
  }
  if (!isAttributiveOrHomophonousTerminalInflection(host.pos)) {
    return false;
  }
  if (pos0 !== 助動詞) {
    return true;
  }
  const beforeHost = result[hostIndex - 1];
  return beforeHost !== undefined && pos0in(beforeHost.pos & POS0, INFLECTABLE_AUX_BITS);
}

function resplitMisparsedDekiHen(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    const next = tokens[i + 1];
    const isDekiHen = (token.pos & POS0) === 接続詞 && token.dictionaryForm === "で" &&
      next !== undefined && (next.pos & POS0) === 名詞 && next.dictionaryForm === "きへん";
    if (!isDekiHen) {
      result.push(token);
      continue;
    }
    dirty = true;
    i += 1;
    result.push({
      surface: "でき",
      dictionaryForm: "できる",
      reading: "デキ",
      dictionaryFormReading: "デキル",
      pos: 動詞 | 上一段_カ行 | 連用形_,
      dictionaryId: 0,
      ...inheritedSourceIdentity(token),
      syntheticReason: "deki_hen_resplit"
    });
    result.push({
      surface: "へん",
      dictionaryForm: "へん",
      reading: "ヘン",
      dictionaryFormReading: "ヘン",
      pos: 助動詞 | 助動詞_ヘン | 終止形_一般,
      dictionaryId: 0,
      ...inheritedSourceIdentity(next),
      syntheticReason: "deki_hen_resplit"
    });
  }
  return dirty ? result : [...tokens];
}

function resplitImpossibleDesuRenyouDesire(
  tokens: readonly RuntimeHaruToken[]
): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    const next = tokens[index + 1];
    if (
      !isPoliteCopulaPos(token.pos) ||
      !isRenyouInflection(token.pos) ||
      next === undefined ||
      !isDesireAuxiliaryPos(next.pos)
    ) {
      result.push(token);
      continue;
    }
    dirty = true;
    const provenance = inheritedSourceIdentity(token);
    result.push({
      surface: "で", dictionaryForm: "で", reading: "デ", dictionaryFormReading: "デ",
      pos: 助詞_格助詞, dictionaryId: 0, ...provenance,
      syntheticReason: "desu_renyou_desire_resplit:case"
    });
    result.push({
      surface: "し", dictionaryForm: "する", reading: "シ", dictionaryFormReading: "スル",
      pos: 動詞_非自立可能 | サ行変格 | 連用形_一般, dictionaryId: 0, ...provenance,
      syntheticReason: "desu_renyou_desire_resplit:predicate"
    });
  }
  return dirty ? result : [...tokens];
}

function retagMistaggedHenNounNegation(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (const token of tokens) {
    const prev = result[result.length - 1];
    const prevPos5A = (prev?.pos ?? 0) & POS5A;
    const isMistaggedHen = (token.pos & POS0) === 名詞 && token.dictionaryForm === "へん" &&
      prev !== undefined && (prev.pos & POS0) === 動詞 &&
      (prevPos5A === 連用形_ || prevPos5A === 未然形_);
    if (isMistaggedHen) {
      dirty = true;
      result.push({ ...token, pos: 助動詞 | 助動詞_ヘン | 終止形_一般, syntheticReason: "mistagged_hen_noun_retag" });
      continue;
    }
    const prevIsHen = prev !== undefined && (prev.pos & (POS0 | POS4)) === (助動詞 | 助動詞_ヘン);
    if (prevIsHen && (token.pos & POS01) === 接尾辞_名詞的) {
      dirty = true;
      result.push({ ...token, pos: 名詞 | 名詞_普通名詞, syntheticReason: "mistagged_hen_suffix_retag" });
      continue;
    }
    result.push(token);
  }
  return dirty ? result : [...tokens];
}

function isCopulaKateiNaraToken(token: RuntimeHaruToken): boolean {
  return token.surface === "なら" && token.dictionaryForm === "だ" &&
    (token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_ダ) && (token.pos & POS5A) === 仮定形_;
}

function isParticleTaggedHatsuonN(token: RuntimeHaruToken): boolean {
  if (token.surface !== "ん") {
    return false;
  }
  const pos01 = token.pos & POS01;
  return pos01 === 助詞_終助詞 || pos01 === 助詞_準体助詞;
}

const CLAUSE_FINAL_RETAG_CLOSING_KINDS: ReadonlySet<UtteranceClosureKind> = new Set([
  "eos",
  "hard_terminal",
  "matched_delimiter_close",
  "unmatched_trailing",
  "weak_pause"
]);

function isClauseFinalRetagFollower(
  tokens: readonly RuntimeHaruToken[],
  index: number
): boolean {
  const token = tokens[index];
  if (token === undefined) {
    return true;
  }
  if ((token.pos & POS01) === 助詞_終助詞) {
    return true;
  }
  const pos04 = token.pos & (POS0 | POS4);
  if ((pos04 === (助動詞 | 助動詞_デス) || pos04 === (助動詞 | 助動詞_ダ)) &&
    (token.pos & POS5A) === 意志推量形_) {
    return true;
  }
  return closesUtteranceAs(
    utteranceClosureAfter(null, tokens, index),
    CLAUSE_FINAL_RETAG_CLOSING_KINDS
  );
}

function retagCopulaNaraBeforeParticleNAsNaruNegation(
  tokens: readonly RuntimeHaruToken[]
): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    const nToken = tokens[index + 1];
    const host = result[result.length - 1];
    if (!isCopulaKateiNaraToken(token) || nToken === undefined || !isParticleTaggedHatsuonN(nToken) ||
      host === undefined || (host.pos & POS0) !== 名詞 ||
      !isClauseFinalRetagFollower(tokens, index + 2)) {
      result.push(token);
      continue;
    }
    dirty = true;
    result.push(replacementTokenFrom(token, {
      surface: token.surface,
      dictionaryForm: "なる",
      reading: "ナラ",
      dictionaryFormReading: "ナル",
      pos: 動詞_非自立可能 | 五段_ラ行 | 未然形_一般,
      syntheticReason: "copula_nara_particle_n_negation_retag:naru"
    }));
    result.push(replacementTokenFrom(nToken, {
      surface: nToken.surface,
      dictionaryForm: "む",
      reading: "ン",
      dictionaryFormReading: "ム",
      pos: 助動詞 | 文語助動詞_ム | 終止形_撥音便,
      syntheticReason: "copula_nara_particle_n_negation_retag:mu"
    }));
    index += 1;
  }
  return dirty ? result : [...tokens];
}

function expandDroppedVolitionalAru(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    const isMistaggedAro = token.surface === "あろ" && token.dictionaryForm === "ある" &&
      (token.pos & POS0) === 動詞 && (token.pos & POS5A) === 命令形_ &&
      isClauseFinalRetagFollower(tokens, index + 1);
    if (!isMistaggedAro) {
      result.push(token);
      continue;
    }
    dirty = true;
    result.push(replacementTokenFrom(token, {
      surface: "あろう",
      dictionaryForm: "ある",
      reading: "アロウ",
      dictionaryFormReading: "アル",
      pos: (token.pos & (POS0 | POS1 | POS4)) | 意志推量形,
      syntheticReason: "dropped_volitional_aru_expand"
    }));
  }
  return dirty ? result : [...tokens];
}

function restoreDroppedVolitionalQuoteMarker(
  tokens: readonly RuntimeHaruToken[],
  lookups: LookupTables
): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    result.push(token);
    const follower = tokens[index + 1];
    if (
      follower === undefined ||
      !isVerbPredicateToken(token) || !isVolitionalInflection(token.pos) ||
      isSourceSeparatedFromPreviousToken(tokens, index + 1) ||
      !(isSuruVerbToken(follower) ||
        (isVerbPredicateToken(follower) &&
          lookups.QUOTE_HOST_REGISTRY.hasCapability("direct", follower.dictionaryForm, "volitional_content_complement")))
    ) {
      continue;
    }
    dirty = true;
    result.push({
      surface: "と", dictionaryForm: "と", reading: "ト", dictionaryFormReading: "ト",
      pos: 助詞_格助詞, dictionaryId: 0, ...inheritedSourceIdentity(follower),
      syntheticReason: "dropped_volitional_to_restore"
    });
  }
  return dirty ? result : [...tokens];
}

function retagBungoVolitionalNAsNegative(
  tokens: readonly RuntimeHaruToken[],
  lookups: LookupTables
): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    const host = result[result.length - 1];
    if (isVolitionalPurposeToSuruAt(tokens, index + 1)) {
      if (isFusedBungoVolitionalNVerbToken(token)) {
        dirty = true;
        result.push({
          ...token,
          pos: (token.pos & ~POS5) | 意志推量形,
          syntheticReason: "bungo_volitional_n_purpose_normalize"
        });
        continue;
      }
      if (isNuHatsuonToken(token) && host !== undefined && isNuAttachmentHostToken(host)) {
        dirty = true;
        result[result.length - 1] = normalizeBungoVolitionalPurposeHost(host, token);
        continue;
      }
    }
    const licensor = tokens[index + 1];
    const isFossilLicensed = licensor !== undefined &&
      lookups.BUNGO_VOLITIONAL_N_LICENSOR_SURFACES.has(licensor.surface);
    if (!isBungoVolitionalMuHatsuonToken(token) || host === undefined ||
      !isNuAttachmentHostToken(host) || isFossilLicensed) {
      result.push(token);
      continue;
    }
    dirty = true;
    if (isVolitionalPurposeToSuruAt(tokens, index + 1)) {
      result[result.length - 1] = normalizeBungoVolitionalPurposeHost(host, token);
      continue;
    }
    result.push({
      ...token,
      dictionaryForm: "ぬ",
      dictionaryFormReading: "ヌ",
      pos: 助動詞 | 助動詞_ヌ | (token.pos & POS5),
      syntheticReason: "bungo_volitional_n_negative_retag"
    });
  }
  return dirty ? result : [...tokens];
}

function expandNegativeNshiConjunction(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    const host = result[result.length - 1];
    const next = tokens[index + 1];
    const isNshi = token.surface === "んし" &&
      (token.pos & (POS0 | POS4)) === (助動詞 | 文語助動詞_ンス) &&
      (token.pos & POS5A) === 連用形_;
    const nextContinuesNsu = next !== undefined &&
      ((next.pos & POS0) === 助動詞 || isConjunctiveParticleToken(next));
    if (!isNshi || host === undefined || !isNuAttachmentHostToken(host) || nextContinuesNsu) {
      result.push(token);
      continue;
    }
    dirty = true;
    if ((host.pos & POS5A) !== 未然形_) {
      result[result.length - 1] = { ...host, pos: (host.pos & ~POS5) | 未然形_一般 };
    }
    result.push({
      surface: "ん",
      dictionaryForm: "ぬ",
      reading: "ン",
      dictionaryFormReading: "ヌ",
      pos: 助動詞 | 助動詞_ヌ | 終止形_一般,
      dictionaryId: 0,
      ...inheritedSourceIdentity(token),
      syntheticReason: "nshi_negation_conjunction_ns"
    });
    result.push({
      surface: "し",
      dictionaryForm: "し",
      reading: "シ",
      dictionaryFormReading: "シ",
      pos: 助詞_接続助詞,
      dictionaryId: 0,
      ...inheritedSourceIdentity(token),
      syntheticReason: "nshi_negation_conjunction_shi"
    });
  }
  return dirty ? result : [...tokens];
}

function restoreMisparsedFusedConditionalAkan(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    const host = result[result.length - 1];
    if (host === undefined || !isNuAttachmentHostToken(host)) {
      result.push(token);
      continue;
    }
    const next = tokens[index + 1];
    const afterNext = tokens[index + 2];
    const isNegativeStemNa = token.surface === "な" &&
      (token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_ナイ) &&
      (token.pos & POS5A) === 語幹_;
    const isSfpNaa = token.surface === "なあ" && (token.pos & (POS0 | POS1)) === 助詞_終助詞;
    let fragments: readonly RuntimeHaruToken[] | null = null;
    if (isSfpNaa && next?.surface === "かん") {
      fragments = [token, next];
    } else if (
      isNegativeStemNa &&
      next?.surface === "あ" && (next.pos & POS0) === 感動詞 &&
      afterNext?.surface === "かん"
    ) {
      fragments = [token, next, afterNext];
    }
    if (fragments === null) {
      if (isNegativeStemNa && next !== undefined && (next.pos & POS0) === 動詞 && !isSugiruAuxiliaryToken(next)) {
        dirty = true;
        normalizeNuAttachmentHostToMizen(result);
        result.push(fusedConditionalNaToken(token));
        continue;
      }
      result.push(token);
      continue;
    }
    dirty = true;
    normalizeNuAttachmentHostToMizen(result);
    const follower = tokens[index + fragments.length];
    result.push(...fusedConditionalAkanPieces(fragments, follower));
    index += fragments.length - 1;
    const retaggedFollower = follower === undefined ? null : predicateHostFollowerParticle(follower);
    if (retaggedFollower !== null) {
      result.push(...retaggedFollower);
      index += 1;
    }
  }
  return dirty ? result : [...tokens];
}

function predicateHostFollowerParticle(follower: RuntimeHaruToken): readonly RuntimeHaruToken[] | null {
  if (follower.surface === "やん" && (follower.pos & POS01) === (接尾辞 | 名詞的)) {
    const { head, inner, tail } = splitBoundaryRuntimeStateForPieces(follower);
    const pieces = [
      { ...head, surface: "や", dictionaryForm: "や", reading: "ヤ", dictionaryFormReading: "ヤ", pos: 助動詞 | 助動詞_ヤ | 終止形_一般 },
      { ...inner, ...tail, surface: "ん", dictionaryForm: "ん", reading: "ン", dictionaryFormReading: "ン", pos: 助詞_終助詞 }
    ];
    return pieces.map((piece, offset) => {
      const token: Record<string, unknown> = { ...piece, dictionaryId: 0, syntheticReason: FUSED_CONDITIONAL_AKAN_REASON };
      delete token.normalizedForm;
      const span = follower.sourceCharSpan;
      if (span != null && span.end - span.start === 2) {
        token.sourceCharSpan = { start: span.start + offset, end: span.start + offset + 1 };
      } else {
        delete token.sourceCharSpan;
      }
      return token as unknown as RuntimeHaruToken;
    });
  }
  const pos01 = follower.pos & POS01;
  let retaggedPos: number | null = null;
  if (pos01 === 助詞_格助詞) {
    if (follower.surface === "の") retaggedPos = 助詞_準体助詞;
    else if (follower.surface === "で" || follower.surface === "から") retaggedPos = 助詞_接続助詞;
  } else if (pos01 === 助詞_副助詞 && follower.surface === "し") {
    retaggedPos = 助詞_接続助詞;
  }
  if (retaggedPos === null) return null;
  return [{ ...follower, pos: retaggedPos, dictionaryId: 0, syntheticReason: FUSED_CONDITIONAL_AKAN_REASON }];
}

function normalizeNuAttachmentHostToMizen(result: RuntimeHaruToken[]): void {
  const host = result[result.length - 1]!;
  if ((host.pos & POS5A) !== 未然形_) {
    result[result.length - 1] = { ...host, pos: (host.pos & ~POS5) | 未然形_一般 };
  }
}

const FUSED_CONDITIONAL_AKAN_REASON = "fused_conditional_akan_resplit";

function fusedConditionalNaToken(token: RuntimeHaruToken): RuntimeHaruToken {
  const retagged: Record<string, unknown> = {
    ...token,
    dictionaryForm: "ぬ",
    dictionaryFormReading: "ヌ",
    pos: 助動詞 | 助動詞_ヌ | 仮定形_融合,
    dictionaryId: 0,
    syntheticReason: FUSED_CONDITIONAL_AKAN_REASON
  };
  delete retagged.normalizedForm;
  return retagged as unknown as RuntimeHaruToken;
}

function fusedConditionalAkanPieces(
  fragments: readonly RuntimeHaruToken[],
  follower: RuntimeHaruToken | undefined
): RuntimeHaruToken[] {
  const first = fragments[0]!;
  const merged = fragments.length > 1 && fragments.every((fragment) => fragment.sourceSpan != null)
    ? mergeRuntimeTokenSourceIdentity(first, fragments as [RuntimeHaruToken, ...RuntimeHaruToken[]])
    : first;
  const { head, inner, tail } = splitBoundaryRuntimeStateForPieces(merged);
  const charSpan = merged.sourceCharSpan;
  const pieceSpecs = [
    {
      state: head,
      surface: "な", dictionaryForm: "ぬ", reading: "ナ", dictionaryFormReading: "ヌ",
      pos: 助動詞 | 助動詞_ヌ | 仮定形_融合
    },
    {
      state: inner,
      surface: "あか", dictionaryForm: "あく", reading: "アカ", dictionaryFormReading: "アク",
      pos: 動詞 | 五段_カ行 | 未然形_一般
    },
    {
      state: { ...inner, ...tail },
      surface: "ん", dictionaryForm: "ぬ", reading: "ン", dictionaryFormReading: "ヌ",
      pos: 助動詞 | 助動詞_ヌ | (hasAttributiveFollower(follower) ? 連体形_撥音便 : 終止形_撥音便)
    }
  ] as const;
  const charAligned = charSpan != null && charSpan.end - charSpan.start === "なあかん".length;
  let offset = 0;
  return pieceSpecs.map(({ state, ...fields }) => {
    const piece: Record<string, unknown> = {
      ...state,
      ...fields,
      dictionaryId: 0,
      syntheticReason: FUSED_CONDITIONAL_AKAN_REASON
    };
    for (const field of ["normalizedForm", "longVowelReduction", "splitA", "splitB"]) {
      delete piece[field];
    }
    if (charAligned) {
      piece.sourceCharSpan = { start: charSpan.start + offset, end: charSpan.start + offset + fields.surface.length };
    } else {
      delete piece.sourceCharSpan;
    }
    offset += fields.surface.length;
    return piece as unknown as RuntimeHaruToken;
  });
}

function isVolitionalPurposeToSuruAt(tokens: readonly RuntimeHaruToken[], index: number): boolean {
  const marker = tokens[index];
  const follower = tokens[index + 1];
  return marker !== undefined && marker.surface === "と" &&
    (isCaseParticleToken(marker) || isConjunctiveParticleToken(marker)) &&
    follower !== undefined && isSuruVerbToken(follower);
}

function isNuHatsuonToken(token: RuntimeHaruToken): boolean {
  return (token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_ヌ) &&
    (token.pos & POS5B) === _撥音便 &&
    token.surface === "ん";
}

function isFusedBungoVolitionalNVerbToken(token: RuntimeHaruToken): boolean {
  return (token.pos & POS0) === 動詞 &&
    (token.pos & POS5B) === _撥音便 &&
    token.surface.length >= 2 &&
    token.surface.endsWith("ん");
}

function normalizeBungoVolitionalPurposeHost(
  host: RuntimeHaruToken,
  mu: RuntimeHaruToken
): RuntimeHaruToken {
  const merged = mergeRuntimeTokenSourceIdentity(
    rewriteRuntimeTokenSurface(host, { kind: "merge", sources: [host, mu] }),
    [host, mu]
  );
  return {
    ...merged,
    reading: `${host.reading}${mu.reading}`,
    pos: (host.pos & ~POS5) | 意志推量形,
    syntheticReason: "bungo_volitional_n_purpose_normalize"
  };
}

function retagMistaggedExplanatoryNAfterFiniteHost(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (const token of tokens) {
    const prev = result[result.length - 1];
    const auxKind = token.pos & (POS0 | POS4);
    const isNuOrMuTag = token.surface === "ん" &&
      (auxKind === (助動詞 | 助動詞_ヌ) || auxKind === (助動詞 | 文語助動詞_ム));
    const prevIsFiniteInflectingHost = prev !== undefined &&
      pos0in(prev.pos & POS0, INFLECTABLE_AUX_BITS) &&
      ((prev.pos & POS5A) === 終止形_ || (prev.pos & POS5A) === 連体形_) &&
      !morphSurface(prev).endsWith("ん");
    if (!isNuOrMuTag || !prevIsFiniteInflectingHost) {
      result.push(token);
      continue;
    }
    dirty = true;
    result.push({
      ...token,
      dictionaryForm: "ん",
      dictionaryFormReading: "ン",
      normalizedForm: "の",
      pos: 助詞_準体助詞,
      syntheticReason: "explanatory_n_after_finite_host_retag"
    });
  }
  return dirty ? result : [...tokens];
}

function isMizenPredicateHostToken(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined) return false;
  const pos0 = token.pos & POS0;
  return (pos0 === 動詞 || pos0 === 助動詞) && (token.pos & POS5A) === 未然形_;
}

function retagInfantileResuCopula(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!, next = tokens[index + 1];
    const isRareru = (token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_レル) && token.surface === "れ";
    const isDesuSu = next !== undefined &&
      (next.pos & (POS0 | POS4)) === (助動詞 | 助動詞_デス) && next.surface === "す";
    if (!isRareru || !isDesuSu || isMizenPredicateHostToken(result[result.length - 1])) {
      result.push(token);
      continue;
    }
    dirty = true;
    const mergedBase = mergeRuntimeTokenSourceIdentity(
      rewriteRuntimeTokenSurface(token, { kind: "merge", sources: [token, next!] }),
      [token, next!]
    );
    result.push({
      ...mergedBase,
      dictionaryForm: "です",
      reading: "レス",
      dictionaryFormReading: "デス",
      pos: 助動詞 | 助動詞_デス | (next!.pos & POS5),
      dictionaryId: 0,
      syntheticReason: "infantile_resu_copula_retag"
    });
    index += 1;
  }
  return dirty ? result : [...tokens];
}

function isRenyouPredicateHostToken(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined) return false;
  const pos0 = token.pos & POS0;
  return (pos0 === 動詞 || pos0 === 助動詞) && (token.pos & POS5A) === 連用形_;
}

function isKansaiMassePoliteHost(
  token: RuntimeHaruToken,
  previous: RuntimeHaruToken | undefined,
  lookups: LookupTables
): boolean {
  if ((token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_マス) && (token.pos & POS5) === 終止形_促音便) {
    return true;
  }
  return (token.pos & (POS0 | POS4)) === (動詞 | 五段_タ行) &&
    (token.pos & POS5) === 連用形_促音便 &&
    lookups.KANSAI_POLITE_MASSE_MASU_MISTAG_LEMMAS.has(token.dictionaryForm) &&
    isRenyouPredicateHostToken(previous);
}

function isPreprocessClauseTerminalBoundary(
  tokens: readonly RuntimeHaruToken[],
  followerIndex: number,
  options: {
    readonly admittedSeparations?: ReadonlySet<SeparationKind>;
    readonly admitQuoteMarker?: boolean;
  } = {}
): boolean {
  let cursor = followerIndex;
  for (;;) {
    const sfp = tokens[cursor];
    if (sfp === undefined || (sfp.pos & POS01) !== 助詞_終助詞) {
      break;
    }
    cursor += 1;
  }
  const next = tokens[cursor];
  if (next === undefined) {
    return true;
  }
  if (separatedAs(tokens, cursor, options.admittedSeparations ?? SEPARATION_OPENS_BOUNDARY)) {
    return true;
  }
  if (options.admitQuoteMarker === true && quoteMarkerRelationAt(tokens, cursor) !== null) {
    return true;
  }
  return (next.pos & POS0) === 補助記号;
}

const PROLONGED_SOUND_MARK = "ー";

function stripTrailingProlongation(text: string): string {
  let end = text.length;
  while (end > 0 && text[end - 1] === PROLONGED_SOUND_MARK) {
    end -= 1;
  }
  return end === 0 ? text : text.slice(0, end);
}

function reductionRemovedOnlyProlongationMarks(
  surface: string,
  reduction: LongVowelReductionMetadata
): boolean {
  return surface.length - reduction.reducedSurface.length === reduction.removedCount &&
    surface.split(PROLONGED_SOUND_MARK).join("") ===
      reduction.reducedSurface.split(PROLONGED_SOUND_MARK).join("");
}

const PROLONGED_PARTICLE_SUBTYPE_ROW = "lookup_tables prolonged_particle_canonicalization.particle_subtypes";

const PROLONGED_PARTICLE_RESERVED_SUBTYPE_OWNERS: ReadonlyMap<string, string> = new Map([
  ["終助詞", "src/pipeline/semantics/sfp-surface.ts — SFP 표면 자체가 서법 증거라(詠嘆 `なー` ↔ 금지 `な`) 연장을 지우면 증거가 사라진다"],
  ["準体助詞", "src/pipeline/pronominal-no-dispatch.ts — 準体 `の` 의 지시·명사화 판정 owner"]
]);

const BENEFACTIVE_TEE_RETAG_ROW = "benefactive_tee_te_retag";

function prolongedParticleSubtypeBits(lookups: LookupTables): ReadonlySet<number> {
  const bits = new Set<number>();
  for (const name of lookups.PROLONGED_PARTICLE_CANONICAL_SUBTYPES) {
    const reservedOwner = PROLONGED_PARTICLE_RESERVED_SUBTYPE_OWNERS.get(name);
    if (reservedOwner !== undefined) {
      throw new Error(
        `reserved particle subtype '${name}' in ${PROLONGED_PARTICLE_SUBTYPE_ROW}: 선재 owner 소유다 (${reservedOwner})`
      );
    }
    const pos1 = particleSubtypeBit(name);
    if (pos1 === undefined) {
      throw new Error(`invalid particle subtype '${name}' in ${PROLONGED_PARTICLE_SUBTYPE_ROW}`);
    }
    bits.add(pos1);
  }
  return bits;
}

function prolongedParticleReservedSubtypeBits(): ReadonlySet<number> {
  const bits = new Set<number>();
  for (const name of PROLONGED_PARTICLE_RESERVED_SUBTYPE_OWNERS.keys()) {
    const pos1 = particleSubtypeBit(name);
    if (pos1 === undefined) {
      throw new Error(`unknown reserved particle subtype '${name}' in prolonged canonicalization owner map`);
    }
    bits.add(pos1);
  }
  return bits;
}


export function canonicalizeProlongedParticles(
  tokens: readonly RuntimeHaruToken[],
  lookups: LookupTables
): RuntimeHaruToken[] {
  const subtypeBits = prolongedParticleSubtypeBits(lookups);
  const reservedBits = prolongedParticleReservedSubtypeBits();
  const lexicalReadingLemmas =
    lookups.optionalSet(BENEFACTIVE_TEE_RETAG_ROW, "desire_lemmas");
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    const canonical = analyzerReducedCanonicalToken(token, reservedBits) ??
      prosodicTailCanonicalToken(token, tokens, index, subtypeBits, lexicalReadingLemmas);
    if (canonical === undefined) {
      result.push(token);
      continue;
    }
    dirty = true;
    result.push(mergeRuntimeTokenSourceIdentity(canonical, [token]));
  }
  return dirty ? result : [...tokens];
}

function analyzerReducedCanonicalToken(
  token: RuntimeHaruToken,
  reservedBits: ReadonlySet<number>
): RuntimeHaruToken | undefined {
  const reduction = token.longVowelReduction;
  if (reduction === undefined || reduction.reducedSurface === token.surface) {
    return undefined;
  }
  if (!reductionRemovedOnlyProlongationMarks(token.surface, reduction) ||
    !isDependentWordToken(token)) {
    return undefined;
  }
  if (isParticleSubtypeToken(token, reservedBits)) {
    return undefined;
  }
  return {
    ...rewriteRuntimeTokenSurface(token, { kind: "replace", surface: reduction.reducedSurface }),
    syntheticReason: "prolonged_particle_canonicalization"
  };
}

function prosodicTailCanonicalToken(
  token: RuntimeHaruToken,
  tokens: readonly RuntimeHaruToken[],
  index: number,
  subtypeBits: ReadonlySet<number>,
  lexicalReadingLemmas: ReadonlySet<string> | undefined
): RuntimeHaruToken | undefined {
  const surface = stripTrailingProlongation(token.surface);
  if (surface === token.surface || !isParticleSubtypeToken(token, subtypeBits)) {
    return undefined;
  }
  const admitQuoteMarker =
    lexicalReadingLemmas !== undefined && !lexicalReadingLemmas.has(token.dictionaryForm);
  if (!isPreprocessClauseTerminalBoundary(tokens, index + 1, {
    admittedSeparations: NO_WHITESPACE_BOUNDARY_EVIDENCE,
    admitQuoteMarker
  })) {
    return undefined;
  }
  return replacementTokenFrom(token, {
    surface,
    dictionaryForm: stripTrailingProlongation(token.dictionaryForm),
    reading: stripTrailingProlongation(token.reading),
    dictionaryFormReading: stripTrailingProlongation(token.dictionaryFormReading),
    pos: token.pos,
    syntheticReason: "prolonged_particle_canonicalization"
  });
}

function restoreProlongedCollapsedAspectVariant(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
  let dirty = false;
  const result = tokens.map((token) => {
    const canonical = token.normalizedForm;
    if ((token.pos & POS0) !== 助動詞 || token.longVowelReduction !== undefined ||
      canonical === undefined || canonical === token.dictionaryForm ||
      !COLLAPSED_ASPECT_AUX_CONTRACTION_BY_LEMMA.has(canonical) ||
      !token.surface.startsWith(canonical)) {
      return token;
    }
    const prolongation = token.surface.slice(canonical.length);
    if (prolongation.length === 0 || ![...prolongation].every((char) => PROLONGATION_CHARS.has(char))) {
      return token;
    }
    dirty = true;
    return {
      ...token,
      dictionaryForm: canonical,
      dictionaryFormReading: toKatakana(canonical),
      longVowelReduction: { removedCount: prolongation.length, reducedSurface: canonical },
      syntheticReason: "prolonged_collapsed_aspect_variant"
    };
  });
  return dirty ? result : [...tokens];
}

const PROLONGATION_CHARS: ReadonlySet<string> = new Set([PROLONGED_SOUND_MARK, "ぁ", "ぃ", "ぅ", "ぇ", "ぉ", "ァ", "ィ", "ゥ", "ェ", "ォ"]);

function retagBenefactiveTeeAsConjunctiveTe(
  tokens: readonly RuntimeHaruToken[],
  lookups: LookupTables
): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    const previous = result[result.length - 1];
    const isTeeDesire = (token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_タイ) &&
      lookups.BENEFACTIVE_TEE_TE_RETAG_DESIRE_LEMMAS.has(token.dictionaryForm);
    const isBenefactiveHost = previous !== undefined &&
      isRenyouPredicateHostToken(previous) &&
      lookups.BENEFACTIVE_TEE_TE_RETAG_HOST_LEMMAS.has(previous.dictionaryForm);
    if (!isTeeDesire || !isBenefactiveHost ||
      !isPreprocessClauseTerminalBoundary(tokens, index + 1, {
        admittedSeparations: NO_WHITESPACE_BOUNDARY_EVIDENCE
      })) {
      result.push(token);
      continue;
    }
    dirty = true;
    result.push(mergeRuntimeTokenSourceIdentity(
      replacementTokenFrom(token, {
        surface: "て",
        dictionaryForm: "て",
        reading: "テ",
        dictionaryFormReading: "テ",
        pos: 助詞_接続助詞,
        syntheticReason: "benefactive_tee_conjunctive_te_retag"
      }),
      [token]
    ));
  }
  return dirty ? result : [...tokens];
}

function retagMistaggedDesireTee(
  tokens: readonly RuntimeHaruToken[],
  lookups: LookupTables
): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (const token of tokens) {
    const previous = result[result.length - 1];
    if ((token.pos & (POS0 | POS4)) !== (助動詞 | 五段_ワア行) ||
      !lookups.DESIRE_TEE_RETAG_MISTAGGED_SURFACES.has(token.surface) ||
      !isRenyouPredicateHostToken(previous) || (previous!.pos & POS5) !== 連用形_一般) {
      result.push(token);
      continue;
    }
    dirty = true;
    result.push(replacementTokenFrom(token, {
      surface: "たい",
      dictionaryForm: "たい",
      reading: "タイ",
      dictionaryFormReading: "タイ",
      pos: 助動詞 | 助動詞_タイ | (token.pos & POS5),
      syntheticReason: "desire_tee_uncontraction"
    }));
  }
  return dirty ? result : [...tokens];
}

function expandKansaiPoliteMasseContraction(
  tokens: readonly RuntimeHaruToken[],
  lookups: LookupTables
): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!, next = tokens[index + 1];
    const isMasuSokuonbin = isKansaiMassePoliteHost(token, result[result.length - 1], lookups);
    const isCausativeSe = next !== undefined &&
      (next.pos & (POS0 | POS4)) === (助動詞 | 下一段_サ行) &&
      next.dictionaryForm === "せる" &&
      lookups.KANSAI_POLITE_MASSE_SE_SURFACES.has(next.surface) &&
      isPreprocessClauseTerminalBoundary(tokens, index + 2);
    if (!isMasuSokuonbin || !isCausativeSe) {
      result.push(token);
      continue;
    }
    dirty = true;
    result.push(replacementTokenFrom(token, {
      surface: "ます",
      dictionaryForm: "ます",
      reading: "マス",
      dictionaryFormReading: "マス",
      pos: 助動詞 | 助動詞_マス | 終止形_一般,
      syntheticReason: "kansai_masse_uncontraction:masu"
    }));
    result.push(replacementTokenFrom(next!, {
      surface: "ぜ",
      dictionaryForm: "ぜ",
      reading: "ゼ",
      dictionaryFormReading: "ゼ",
      pos: 助詞_終助詞,
      syntheticReason: "kansai_masse_uncontraction:sfp"
    }));
    index += 1;
  }
  return dirty ? result : [...tokens];
}

function masuFormAdmitsFollower(masu: RuntimeHaruToken, next: RuntimeHaruToken | undefined): boolean {
  const form = masu.pos & POS5A;
  if (form !== 連用形_ && form !== 意志推量形_ && form !== 終止形_ && form !== 連体形_) {
    return false;
  }
  if (form === 連用形_) {
    return next !== undefined && (
      (next.pos & (POS0 | POS4)) === (助動詞 | 助動詞_タ) ||
      ((next.pos & POS01) === 助詞_接続助詞 && (next.surface === "て" || next.surface === "で"))
    );
  }
  return next === undefined || (next.pos & POS0) !== 助動詞;
}

function retagYasuPoliteAsMasu(
  tokens: readonly RuntimeHaruToken[],
  lookups: LookupTables
): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!, next = tokens[index + 1];
    const masuSurface = (token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_ヤス)
      ? lookups.YASU_POLITE_MASU_SURFACES.get(token.surface)
      : undefined;
    if (masuSurface === undefined || !isRenyouPredicateHostToken(result[result.length - 1]) ||
      !masuFormAdmitsFollower(token, next)) {
      result.push(token);
      continue;
    }
    dirty = true;
    result.push(replacementTokenFrom(token, {
      surface: masuSurface,
      dictionaryForm: "ます",
      reading: toKatakana(masuSurface),
      dictionaryFormReading: "マス",
      pos: 助動詞 | 助動詞_マス | (token.pos & POS5),
      syntheticReason: "yasu_polite_masu_retag"
    }));
  }
  return dirty ? result : [...tokens];
}

const COLLOQUIAL_IU_AUX_LEMMAS: ReadonlySet<string> = new Set(["っちゅう", "ちゅう", "っつう", "っつー"]);
const COLLOQUIAL_TSUU_LEMMAS: ReadonlySet<string> = new Set(["つー", "つう"]);
const COLLOQUIAL_TSUU_SURFACES: ReadonlySet<string> = new Set(["つー", "つう", "つっ"]);
function isVolitionalTteExplanation(tokens: readonly RuntimeHaruToken[], index: number): boolean {
  const token = tokens[index]!;
  if (token.surface !== "って" || token.dictionaryForm !== "って") return false;
  if ((token.pos & (POS0 | POS4 | POS5A)) !== (助動詞 | 五段_ワア行 | 連体形_)) return false;
  const previous = tokens[index - 1];
  if (previous === undefined || (previous.pos & (POS0 | POS5A)) !== (動詞 | 意志推量形_)) return false;
  const nominalizer = tokens[index + 1];
  if (nominalizer === undefined || nominalizer.surface !== "ん" || (nominalizer.pos & POS01) !== 助詞_準体助詞) return false;
  const copula = tokens[index + 2];
  return copula !== undefined && isCopulaAuxToken(copula);
}

function expandColloquialToIuContraction(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!, next = tokens[index + 1];
    const splitIu = token.surface === "っつ" && token.dictionaryForm === "っつ" && (token.pos & (POS0 | POS4)) === (助動詞 | 五段_ワア行) &&
      next?.surface === "うっ" &&
      next.dictionaryForm === "うつ" && (next.pos & (POS0 | POS4 | POS5)) === (動詞 | 五段_タ行 | 連用形_促音便);
    const isIuAux = (token.pos & (POS0 | POS4)) === (助動詞 | 五段_ワア行) &&
      (COLLOQUIAL_IU_AUX_LEMMAS.has(token.dictionaryForm) ||
        (COLLOQUIAL_TSUU_LEMMAS.has(token.dictionaryForm) && COLLOQUIAL_TSUU_SURFACES.has(token.surface)) ||
        isVolitionalTteExplanation(tokens, index));
    if (!isIuAux && !splitIu) {
      result.push(token);
      continue;
    }
    dirty = true;
    const previous = result[result.length - 1];
    if (previous?.surface === "くれ" &&
        teBenefactiveContinuationMetadataForToken(previous)?.aspect === "te_kureru") {
      result[result.length - 1] = {
        ...previous,
        pos: (previous.pos & ~POS5) | 命令形_,
        syntheticReason: "colloquial_iu_preceding_kure_imperative"
      };
    }
    const provenance = inheritedSourceIdentity(token);
    result.push({
      surface: "と", dictionaryForm: "と", reading: "ト", dictionaryFormReading: "ト",
      pos: 助詞_格助詞, dictionaryId: 0, ...provenance,
      syntheticReason: "colloquial_iu_to"
    });
    result.push({
      surface: "いう", dictionaryForm: "いう", reading: "イウ", dictionaryFormReading: "イウ",
      pos: 動詞 | 五段_ワア行 | ((splitIu ? next!.pos : token.pos) & POS5),
      dictionaryId: 0, ...provenance,
      syntheticReason: "colloquial_iu_iu"
    });
    if (splitIu) index += 1;
  }
  return dirty ? result : [...tokens];
}

function replacementTokenFrom(
  source: RuntimeHaruToken,
  identity: {
    readonly surface: string;
    readonly dictionaryForm: string;
    readonly reading: string;
    readonly dictionaryFormReading: string;
    readonly pos: number;
    readonly syntheticReason: string;
  }
): RuntimeHaruToken {
  const rewritten = rewriteRuntimeTokenSurface(source, { kind: "replace", surface: identity.surface });
  const replaced: RuntimeHaruToken = {
    ...rewritten,
    dictionaryForm: identity.dictionaryForm,
    reading: identity.reading,
    dictionaryFormReading: identity.dictionaryFormReading,
    pos: identity.pos,
    dictionaryId: 0,
    syntheticReason: identity.syntheticReason
  };
  delete replaced.normalizedForm;
  return replaced;
}

function hasAttributiveFollower(next: RuntimeHaruToken | undefined): boolean {
  if (next === undefined) {
    return false;
  }
  const nextPos0 = next.pos & POS0;
  return pos0in(nextPos0, NOMINAL_BITS) ||
    (nextPos0 === 接尾辞 && (next.pos & POS1) === 名詞的);
}

function benefactiveAgeruToken(
  surface: string,
  reading: string,
  pos5: number,
  source: RuntimeHaruToken,
  reason: string
): RuntimeHaruToken {
  return {
    surface,
    dictionaryForm: "あげる",
    reading,
    dictionaryFormReading: "アゲル",
    pos: 動詞_非自立可能 | 下一段_ガ行 | pos5,
    dictionaryId: 0,
    ...inheritedSourceIdentity(source),
    syntheticReason: reason
  };
}

function teParticleToken(voiced: boolean, source: RuntimeHaruToken, reason: string): RuntimeHaruToken {
  return replacementTokenFrom(source, {
    surface: voiced ? "で" : "て",
    dictionaryForm: voiced ? "で" : "て",
    reading: voiced ? "デ" : "テ",
    dictionaryFormReading: voiced ? "デ" : "テ",
    pos: 助詞_接続助詞,
    syntheticReason: reason
  });
}

function isContractedTeAgeruAux(token: RuntimeHaruToken): boolean {
  return (token.pos & (POS0 | POS4)) === (助動詞 | 下一段_ガ行) && token.dictionaryForm === "たげる";
}

function isVoicedPastAuxDa(token: RuntimeHaruToken): boolean {
  return (token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_タ) && token.surface === "だ";
}

function contractedDaAgeruTail(
  token: RuntimeHaruToken,
  follower: RuntimeHaruToken | undefined
): { readonly surface: string; readonly reading: string; readonly pos5: number } | undefined {
  if (token.surface === "げる" && (token.pos & (POS0 | POS4)) === (助動詞 | 文語助動詞_ケリ)) {
    return {
      surface: "あげる",
      reading: "アゲル",
      pos5: hasAttributiveFollower(follower) ? 連体形_一般 : 終止形_一般
    };
  }
  if (token.surface === "げ" && (token.pos & POS01) === 接尾辞_形状詞的) {
    return { surface: "あげ", reading: "アゲ", pos5: 連用形_一般 };
  }
  return undefined;
}

function hasAdjectivalStateFollower(next: RuntimeHaruToken | undefined): boolean {
  if (next === undefined) {
    return false;
  }
  return (next.pos & (POS0 | POS4)) === (助動詞 | 助動詞_ダ) ||
    ((next.pos & POS0) === 助詞 && next.surface === "に");
}

function expandTeAgeruContraction(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    const prev = result[result.length - 1];
    const prevIsFusionHost = prev !== undefined && isTeFormFusionHostToken(prev);
    if (
      isContractedTeAgeruAux(token) && prevIsFusionHost && !isVoicedTeFormHostToken(prev!) &&
      !hasAdjectivalStateFollower(tokens[i + 1]) &&
      token.surface.startsWith("た") && token.reading.startsWith("タ")
    ) {
      dirty = true;
      const { leading, trailing } = splitTrailingBoundaryRuntimeState(token);
      result.push(teParticleToken(false, leading, "te_ageru_contraction:te"));
      result.push({
        ...benefactiveAgeruToken(
          `あ${token.surface.slice(1)}`,
          `ア${token.reading.slice(1)}`,
          token.pos & POS5,
          token,
          "te_ageru_contraction:ageru"
        ),
        ...trailing
      });
      continue;
    }
    const next = tokens[i + 1];
    if (isVoicedPastAuxDa(token) && prevIsFusionHost && isVoicedTeFormHostToken(prev!) && next !== undefined) {
      const tail = contractedDaAgeruTail(next, tokens[i + 2]);
      if (tail !== undefined) {
        dirty = true;
        result.push(teParticleToken(
          true,
          splitTrailingBoundaryRuntimeState(token).leading,
          "te_ageru_contraction:te"
        ));
        result.push({
          ...benefactiveAgeruToken(
            tail.surface,
            tail.reading,
            tail.pos5,
            next,
            "te_ageru_contraction:ageru"
          ),
          ...splitTrailingBoundaryRuntimeState(next).trailing
        });
        i += 1;
        continue;
      }
    }
    result.push(token);
  }
  return dirty ? result : [...tokens];
}

const NO_WHITESPACE_BOUNDARY_EVIDENCE: ReadonlySet<SeparationKind> = new Set<SeparationKind>();

const CONTRACTED_NAI_TAIL_SURFACES: ReadonlySet<string> = new Set(["ねぇ", "ねえ", "ねー"]);
const CONTRACTED_BAI_TAIL_SURFACES: ReadonlySet<string> = new Set(["べぇ", "べえ", "べー"]);

function isContractedIAdjectiveSplit(
  prev: RuntimeHaruToken,
  tokens: readonly RuntimeHaruToken[],
  index: number
): boolean {
  const token = tokens[index]!;
  if (separatedAs(tokens, index, DETACHED_SEPARATIONS)) {
    return false;
  }
  if (CONTRACTED_NAI_TAIL_SURFACES.has(token.surface)) {
    const tailIsNaiOrSfp = (token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_ナイ) ||
      (token.pos & POS01) === 助詞_終助詞;
    return tailIsNaiOrSfp && (prev.pos & POS0) === 動詞 && (prev.pos & POS5A) === 終止形_;
  }
  if (CONTRACTED_BAI_TAIL_SURFACES.has(token.surface)) {
    return (token.pos & POS01) === 助詞_終助詞 &&
      (prev.pos & (POS0 | POS4)) === (助動詞 | 助動詞_ヤ);
  }
  return false;
}

async function mergeContractedColloquialIAdjectives(
  tokens: readonly RuntimeHaruToken[],
  isRestorableIAdjective: (candidate: RuntimeHaruToken) => Promise<boolean>
): Promise<RuntimeHaruToken[]> {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    const prev = result[result.length - 1];
    if (prev === undefined || !isContractedIAdjectiveSplit(prev, tokens, i)) {
      result.push(token);
      continue;
    }
    const mergedReading = `${prev.reading}${toKatakana(token.surface)}`;
    const mergedBase = mergeRuntimeTokenSourceIdentity(
      rewriteRuntimeTokenSurface(prev, { kind: "merge", sources: [prev, token] }),
      [prev, token]
    );
    const merged: RuntimeHaruToken = {
      ...mergedBase,
      dictionaryForm: `${prev.surface}${token.surface}`,
      reading: mergedReading,
      dictionaryFormReading: mergedReading,
      pos: 形容詞0 | 形容詞4 | (hasAttributiveFollower(tokens[i + 1]) ? 連体形_一般 : 終止形_一般),
      dictionaryId: 0,
      syntheticReason: "colloquial_i_adjective_remerge"
    };
    if (!await isRestorableIAdjective(merged)) {
      result.push(token);
      continue;
    }
    dirty = true;
    result[result.length - 1] = merged;
  }
  return dirty ? result : [...tokens];
}

const FUSED_LONG_E_TO_BASE_A_KANA: ReadonlyMap<string, string> = new Map([
  ["え", "あ"], ["け", "か"], ["げ", "が"], ["せ", "さ"], ["ぜ", "ざ"],
  ["て", "た"], ["で", "だ"], ["ね", "な"], ["へ", "は"], ["べ", "ば"],
  ["ぺ", "ぱ"], ["め", "ま"], ["れ", "ら"]
]);

const AUTHORED_LONG_E_TAIL_CHARS: ReadonlySet<string> = new Set(["え", "ぇ", "ー"]);

const ALL_KANA_SURFACE = /^[\p{sc=Hiragana}\p{sc=Katakana}ーゝゞヽヾ]+$/u;

function unfuseLongEKanaSurface(surface: string): string | undefined {
  let head = surface.length;
  while (head > 0 && AUTHORED_LONG_E_TAIL_CHARS.has(surface[head - 1]!)) {
    head -= 1;
  }
  if (head === surface.length || head === 0) {
    return undefined;
  }
  const base = FUSED_LONG_E_TO_BASE_A_KANA.get(surface[head - 1]!);
  return base === undefined ? undefined : `${surface.slice(0, head - 1)}${base}い`;
}

function isFusedRunAncillaryToken(token: RuntimeHaruToken): boolean {
  const pos0 = token.pos & POS0;
  return pos0 === 助詞 || pos0 === 助動詞;
}

function isFusedRunHeadToken(token: RuntimeHaruToken): boolean {
  const pos0 = token.pos & POS0;
  return pos0 === 名詞 || pos0 === 動詞 || pos0 === 副詞 || pos0 === 形状詞 ||
    pos0 === 代名詞 || pos0 === 形容詞0 || pos0 === 接頭辞;
}

function isFusedLongETailToken(token: RuntimeHaruToken): boolean {
  const pos0 = token.pos & POS0;
  return pos0 === 助詞 || pos0 === 助動詞 || pos0 === 感動詞;
}

function fusedLongEVowelRunLength(
  emitted: readonly RuntimeHaruToken[],
  tokens: readonly RuntimeHaruToken[],
  index: number
): number | undefined {
  const token = tokens[index]!;
  if (!isFusedLongETailToken(token) || separatedAs(tokens, index, DETACHED_SEPARATIONS) ||
    !AUTHORED_LONG_E_TAIL_CHARS.has(token.surface.slice(-1))) {
    return undefined;
  }
  let consumed = 0;
  while (consumed < 3) {
    const candidateIdx = emitted.length - 1 - consumed;
    const candidate = emitted[candidateIdx];
    if (candidate === undefined || separatedAs(emitted, candidateIdx, DETACHED_SEPARATIONS)) {
      return undefined;
    }
    consumed += 1;
    if (isFusedRunHeadToken(candidate)) {
      return consumed;
    }
    if (!isFusedRunAncillaryToken(candidate)) {
      return undefined;
    }
  }
  return undefined;
}

async function mergeFusedColloquialNonAdjectives(
  tokens: readonly RuntimeHaruToken[],
  restoreNominal: (
    head: RuntimeHaruToken,
    candidate: RuntimeHaruToken
  ) => Promise<number | undefined>
): Promise<RuntimeHaruToken[]> {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    const runLength = fusedLongEVowelRunLength(result, tokens, index);
    if (runLength === undefined) {
      result.push(token);
      continue;
    }
    const head = result[result.length - runLength]!;
    const sources: readonly [RuntimeHaruToken, ...RuntimeHaruToken[]] = [
      head,
      ...result.slice(result.length - runLength + 1),
      token
    ];
    const fusedSurface = sources.map((source) => source.surface).join("");
    const unfusedSurface = ALL_KANA_SURFACE.test(fusedSurface)
      ? unfuseLongEKanaSurface(fusedSurface)
      : undefined;
    if (unfusedSurface === undefined) {
      result.push(token);
      continue;
    }
    const unfusedReading = toKatakana(unfusedSurface);
    const merged: RuntimeHaruToken = {
      ...mergeRuntimeTokenSourceIdentity(
        rewriteRuntimeTokenSurface(head, { kind: "merge", sources }),
        sources
      ),
      dictionaryForm: unfusedSurface,
      reading: unfusedReading,
      dictionaryFormReading: unfusedReading,
      pos: 名詞 | 名詞_普通名詞,
      dictionaryId: 0,
      syntheticReason: "colloquial_long_e_fusion_remerge"
    };
    const pos = await restoreNominal(head, merged);
    if (pos === undefined) {
      result.push(token);
      continue;
    }
    dirty = true;
    result.splice(result.length - runLength, runLength, { ...merged, pos });
  }
  return dirty ? result : [...tokens];
}

function isDialectYaCopula(token: RuntimeHaruToken): boolean {
  return (token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_ヤ);
}

function dialectYaCopulaAsDa(token: RuntimeHaruToken): RuntimeHaruToken | undefined {
  if (!token.surface.startsWith("や") || !token.reading.startsWith("ヤ")) {
    return undefined;
  }
  return replacementTokenFrom(token, {
    surface: `だ${token.surface.slice(1)}`,
    dictionaryForm: "だ",
    reading: `ダ${token.reading.slice(1)}`,
    dictionaryFormReading: "ダ",
    pos: 助動詞 | 助動詞_ダ | (token.pos & POS5),
    syntheticReason: "dialect_deictic_copula:da"
  });
}

function deicticSouAdverbToken(source: RuntimeHaruToken): RuntimeHaruToken {
  return replacementTokenFrom(source, {
    surface: "そう",
    dictionaryForm: "そう",
    reading: "ソウ",
    dictionaryFormReading: "ソウ",
    pos: 副詞,
    syntheticReason: "dialect_deictic_copula:sou"
  });
}

function deicticSonnaAdnominalToken(
  pronoun: RuntimeHaruToken,
  attributive: RuntimeHaruToken
): RuntimeHaruToken {
  return mergeRuntimeTokenSourceIdentity(
    replacementTokenFrom(pronoun, {
      surface: "そんな",
      dictionaryForm: "そんな",
      reading: "ソンナ",
      dictionaryFormReading: "ソンナ",
      pos: 連体詞,
      syntheticReason: "dialect_deictic_copula:sonna"
    }),
    [pronoun, attributive]
  );
}

function isHonDeicticFragment(token: RuntimeHaruToken): boolean {
  return isPronounToken(token) && token.surface === "ほん" && token.dictionaryForm === "ほん";
}

function isAttributiveDaCopula(token: RuntimeHaruToken): boolean {
  return (token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_ダ) &&
    token.dictionaryForm === "だ" && isAttributiveInflection(token.pos);
}

function isSeDeicticFragment(token: RuntimeHaruToken): boolean {
  return (token.pos & (POS0 | POS4)) === (動詞 | 文語サ行変格) &&
    token.surface === "せ" && token.dictionaryForm === "す";
}

function isSoDeicticFragment(token: RuntimeHaruToken): boolean {
  return (token.pos & POS0) === 副詞 && token.surface === "そ" && token.dictionaryForm === "そ";
}

const ADVERSATIVE_CONNECTIVE_SURFACES: ReadonlySet<string> = lazyValue(() => new Set(
  loadConnectiveSurfaceEntries({
    isSupportedKind: (value: string): value is string => typeof value === "string" && value.length > 0
  })
    .filter((entry) => entry.kind === "adversative")
    .flatMap((entry) => entry.surfaces)
));

function isAdversativeConnectiveToken(token: RuntimeHaruToken): boolean {
  const pos01 = token.pos & POS01;
  if (pos01 !== 助詞_接続助詞 && (token.pos & POS0) !== 接続詞) {
    return false;
  }
  return ADVERSATIVE_CONNECTIVE_SURFACES.has(token.surface);
}

function expandDialectDeicticCopula(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    const next = tokens[i + 1];
    if (
      (isSeDeicticFragment(token) || isSoDeicticFragment(token)) &&
      next !== undefined && isDialectYaCopula(next)
    ) {
      const copula = dialectYaCopulaAsDa(next);
      if (copula !== undefined) {
        dirty = true;
        result.push(deicticSouAdverbToken(splitTrailingBoundaryRuntimeState(token).leading));
        result.push(copula);
        i += 1;
        continue;
      }
    }
    const afterNext = tokens[i + 2];
    if (
      isHonDeicticFragment(token) &&
      next !== undefined && isAttributiveDaCopula(next) &&
      hasAttributiveFollower(afterNext)
    ) {
      dirty = true;
      result.push(deicticSonnaAdnominalToken(token, next));
      i += 1;
      continue;
    }
    if (
      (token.pos & POS0) === 名詞 && token.surface === "ほや" &&
      next !== undefined && isAdversativeConnectiveToken(next)
    ) {
      dirty = true;
      const { leading, trailing } = splitTrailingBoundaryRuntimeState(token);
      result.push(deicticSouAdverbToken(leading));
      result.push({
        surface: "だ",
        dictionaryForm: "だ",
        reading: "ダ",
        dictionaryFormReading: "ダ",
        pos: 助動詞 | 助動詞_ダ | 終止形_一般,
        dictionaryId: 0,
        ...inheritedSourceIdentity(token),
        ...trailing,
        syntheticReason: "dialect_deictic_copula:da"
      });
      continue;
    }
    result.push(token);
  }
  return dirty ? result : [...tokens];
}

function expandTeWaContraction(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (const token of tokens) {
    const prev = result[result.length - 1];
    const isChaJaParticle = (token.pos & POS01) === 助詞_接続助詞 &&
      ((token.surface === "ちゃ" && token.reading === "チャ") ||
        (token.surface === "じゃ" && token.reading === "ジャ"));
    const hostIsFusionHost = prev !== undefined &&
      (isTeFormFusionHostToken(prev) || isAdjectivalTeFormFusionHostToken(prev));
    const voiced = hostIsFusionHost && isVoicedTeFormHostToken(prev!);
    if (!isChaJaParticle || !hostIsFusionHost || token.surface !== (voiced ? "じゃ" : "ちゃ")) {
      result.push(token);
      continue;
    }
    dirty = true;
    if (isDesireAuxiliaryPos(prev!.pos)) {
      const marker = voiced ? "では" : "ては";
      result.push(replacementTokenFrom(token, {
        surface: marker,
        dictionaryForm: marker,
        reading: voiced ? "デハ" : "テハ",
        dictionaryFormReading: voiced ? "デハ" : "テハ",
        pos: 助詞_接続助詞,
        syntheticReason: "te_wa_contraction:tewa"
      }));
      continue;
    }
    const { leading, trailing } = splitTrailingBoundaryRuntimeState(token);
    result.push(teParticleToken(voiced, leading, "te_wa_contraction:te"));
    result.push({
      surface: "は",
      dictionaryForm: "は",
      reading: "ハ",
      dictionaryFormReading: "ハ",
      pos: 助詞_係助詞,
      dictionaryId: 0,
      ...inheritedSourceIdentity(token),
      ...trailing,
      syntheticReason: "te_wa_contraction:wa"
    });
  }
  return dirty ? result : [...tokens];
}

function restoreDroppedSokuonChauAspect(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    const prev = result[result.length - 1];
    const next = tokens[index + 1];
    const voiced = prev !== undefined && isVoicedTeFormHostToken(prev);
    if (
      (token.pos & (POS0 | POS4)) !== (助動詞 | 助動詞_ジャ) ||
      token.surface !== (voiced ? "じゃ" : "ちゃ") ||
      prev === undefined || !isTeFormFusionHostToken(prev) ||
      next === undefined || next.surface !== "て" || (next.pos & POS01) !== 助詞_接続助詞
    ) {
      result.push(token);
      continue;
    }
    dirty = true;
    result.push(replacementTokenFrom(token, {
      surface: voiced ? "じゃっ" : "ちゃっ",
      dictionaryForm: voiced ? "じゃう" : "ちゃう",
      reading: voiced ? "ジャッ" : "チャッ",
      dictionaryFormReading: voiced ? "ジャウ" : "チャウ",
      pos: 助動詞 | 五段_ワア行 | 連用形_促音便,
      syntheticReason: "chau_dropped_sokuon_restore"
    }));
  }
  return dirty ? result : [...tokens];
}

function expandCollapsedAspectAuxContraction(
  tokens: readonly RuntimeHaruToken[],
  lookups: LookupTables
): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    const contraction = collapsedAspectAuxContraction(token);
    const prev = result[result.length - 1];
    const connectiveFused = expandConnectiveFusedAspectAux(tokens, index, prev);
    if (connectiveFused !== null) {
      dirty = true;
      if (connectiveFused.host !== prev) {
        result[result.length - 1] = connectiveFused.host;
      }
      result.push(...connectiveFused.pieces);
      continue;
    }
    const host = prev === undefined ? null : collapsedAspectAuxTeFormHost(prev);
    const potential = collapsedPotentialAspectAuxRestoration(tokens, index, lookups);
    if (
      potential !== null && host !== null &&
      isVoicedTeFormHostToken(host) === potential.contraction.voiced &&
      potential.source.surface.startsWith(potential.contraction.fusedSurface) &&
      potential.source.reading.startsWith(potential.contraction.fusedReading)
    ) {
      dirty = true;
      if (host !== prev) {
        result[result.length - 1] = host;
      }
      result.push(...potentialAspectAuxPieces(potential));
      index += potential.consumed - 1;
      continue;
    }
    const imperative = (token.pos & POS5A) === 命令形_ && !hasStemSelectingAuxiliaryFollower(tokens, index + 1, lookups);
    const fusedConditional = (token.pos & POS5) === 仮定形_融合;
    if (
      contraction === null || (!imperative && !fusedConditional) ||
      host === null || isVoicedTeFormHostToken(host) !== contraction.voiced ||
      !token.surface.startsWith(contraction.fusedSurface) ||
      !token.reading.startsWith(contraction.fusedReading)
    ) {
      result.push(token);
      continue;
    }
    dirty = true;
    if (host !== prev) {
      result[result.length - 1] = host;
    }
    const { head, inner, tail } = splitBoundaryRuntimeStateForPieces(token);
    const reason = "collapsed_aspect_aux_contraction";
    result.push(withoutSubSplits(teParticleToken(contraction.voiced, head as RuntimeHaruToken, `${reason}:te`)));
    const auxPos = 動詞_非自立可能 | contraction.auxInflectionClass;
    if (imperative) {
      const source = { ...inner, ...tail } as RuntimeHaruToken;
      const stripped = rewriteRuntimeTokenSurface(source, { kind: "remove_prefix", prefix: contraction.fusedSurface });
      const restored = rewriteRuntimeTokenSurface(stripped, { kind: "prefix", prefix: contraction.auxOnsetSurface });
      const aux: RuntimeHaruToken = {
        ...restored,
        dictionaryForm: contraction.auxLemma,
        reading: `${contraction.auxOnsetReading}${token.reading.slice(contraction.fusedReading.length)}`,
        dictionaryFormReading: contraction.auxLemmaReading,
        pos: auxPos | (token.pos & POS5),
        dictionaryId: 0,
        syntheticReason: `${reason}:aux`
      };
      delete aux.normalizedForm;
      result.push(withoutSubSplits(aux));
      continue;
    }
    result.push(withoutSubSplits(replacementTokenFrom(inner as RuntimeHaruToken, {
      surface: contraction.auxHypotheticalSurface,
      dictionaryForm: contraction.auxLemma,
      reading: contraction.auxHypotheticalReading,
      dictionaryFormReading: contraction.auxLemmaReading,
      pos: auxPos | 仮定形_一般,
      syntheticReason: `${reason}:aux`
    })));
    result.push(withoutSubSplits(replacementTokenFrom({ ...inner, ...tail } as RuntimeHaruToken, {
      surface: "ば",
      dictionaryForm: "ば",
      reading: "バ",
      dictionaryFormReading: "バ",
      pos: 助詞_接続助詞,
      syntheticReason: `${reason}:ba`
    })));
  }
  return dirty ? result : [...tokens];
}

interface PotentialAspectAuxRestoration {
  readonly contraction: CollapsedAspectAuxContraction;
  readonly source: RuntimeHaruToken;
  readonly consumed: 1 | 2;
  readonly pos5: number;
}

function collapsedPotentialAspectAuxRestoration(
  tokens: readonly RuntimeHaruToken[],
  index: number,
  lookups: LookupTables
): PotentialAspectAuxRestoration | null {
  const token = tokens[index]!;
  const derived = collapsedPotentialAspectAuxContraction(token);
  if (derived !== null) {
    if ((token.pos & POS5) !== 仮定形_融合 && !isTeAuxActivationAccepted(token, tokens[index + 1])) {
      return null;
    }
    return { contraction: derived, source: token, consumed: 1, pos5: token.pos & POS5 };
  }
  const base = collapsedAspectAuxContraction(token);
  const potential = base?.potential;
  if (
    base === null || potential === undefined ||
    (token.pos & POS5A) !== 命令形_ || !hasStemSelectingAuxiliaryFollower(tokens, index + 1, lookups)
  ) {
    return null;
  }
  const contraction: CollapsedAspectAuxContraction = {
    ...base,
    auxLemma: potential.auxLemma,
    auxLemmaReading: potential.auxLemmaReading,
    auxInflectionClass: potential.auxInflectionClass,
    auxHypotheticalSurface: potential.auxHypotheticalSurface,
    auxHypotheticalReading: potential.auxHypotheticalReading,
    derivation: "potential"
  };
  const next = tokens[index + 1]!;
  if ((next.pos & POS0) === 助動詞 && next.surface === "る" && next.reading === "ル") {
    const merged = mergeRuntimeTokenSourceIdentity(
      { ...token, surface: `${token.surface}${next.surface}`, reading: `${token.reading}${next.reading}` },
      [token, next]
    );
    return { contraction, source: merged, consumed: 2, pos5: next.pos & POS5 };
  }
  const selectsMizen = isNegativeAuxiliaryPos(next.pos) || isClassicalNegativeAuxiliaryToken(next) ||
    isFusedNegativeStateChangeVerbToken(next, lookups);
  return { contraction, source: token, consumed: 1, pos5: selectsMizen ? 未然形_一般 : 連用形_一般 };
}

function potentialAspectAuxPieces(restoration: PotentialAspectAuxRestoration): RuntimeHaruToken[] {
  const { contraction, source, pos5 } = restoration;
  const { head, inner, tail } = splitBoundaryRuntimeStateForPieces(source);
  const reason = "collapsed_potential_aspect_aux_contraction";
  const te = withoutSubSplits(teParticleToken(contraction.voiced, head as RuntimeHaruToken, `${reason}:te`));
  const auxPos = 動詞_非自立可能 | contraction.auxInflectionClass;
  if (pos5 === 仮定形_融合) {
    return [
      te,
      withoutSubSplits(replacementTokenFrom(inner as RuntimeHaruToken, {
        surface: contraction.auxHypotheticalSurface,
        dictionaryForm: contraction.auxLemma,
        reading: contraction.auxHypotheticalReading,
        dictionaryFormReading: contraction.auxLemmaReading,
        pos: auxPos | 仮定形_一般,
        syntheticReason: `${reason}:aux`
      })),
      withoutSubSplits(replacementTokenFrom({ ...inner, ...tail } as RuntimeHaruToken, {
        surface: "ば",
        dictionaryForm: "ば",
        reading: "バ",
        dictionaryFormReading: "バ",
        pos: 助詞_接続助詞,
        syntheticReason: `${reason}:ba`
      }))
    ];
  }
  const stripped = rewriteRuntimeTokenSurface(
    { ...inner, ...tail } as RuntimeHaruToken,
    { kind: "remove_prefix", prefix: contraction.fusedSurface }
  );
  const restored = rewriteRuntimeTokenSurface(stripped, { kind: "prefix", prefix: contraction.auxOnsetSurface });
  const aux: RuntimeHaruToken = {
    ...restored,
    dictionaryForm: contraction.auxLemma,
    reading: `${contraction.auxOnsetReading}${source.reading.slice(contraction.fusedReading.length)}`,
    dictionaryFormReading: contraction.auxLemmaReading,
    pos: auxPos | pos5,
    dictionaryId: 0,
    syntheticReason: `${reason}:aux`
  };
  delete aux.normalizedForm;
  return [te, withoutSubSplits(aux)];
}

function expandConnectiveFusedAspectAux(
  tokens: readonly RuntimeHaruToken[],
  index: number,
  prev: RuntimeHaruToken | undefined
): { readonly host: RuntimeHaruToken; readonly pieces: readonly RuntimeHaruToken[] } | null {
  const token = tokens[index]!;
  const contraction = teConnectiveFusedAspectContraction(token, tokens[index + 1]);
  if (contraction === null || prev === undefined) {
    return null;
  }
  const host = collapsedAspectAuxTeFormHost(prev);
  if (
    host === null || isVoicedTeFormHostToken(host) !== contraction.voiced ||
    separatedAs(tokens, index, SEPARATION_BREAKS_MORPHEME_CHAIN) ||
    separatedAs(tokens, index + 1, SEPARATION_BREAKS_MORPHEME_CHAIN)
  ) {
    return null;
  }
  const { head, inner, tail } = splitBoundaryRuntimeStateForPieces(token);
  const aux = replacementTokenFrom({ ...inner, ...tail } as RuntimeHaruToken, {
    surface: contraction.auxOnsetSurface,
    dictionaryForm: contraction.auxLemma,
    reading: contraction.auxOnsetReading,
    dictionaryFormReading: contraction.auxLemmaReading,
    pos: 動詞_非自立可能 | contraction.auxInflectionClass | 連用形_一般,
    syntheticReason: "connective_fused_aspect_aux_contraction:aux"
  });
  return { host, pieces: [withoutSubSplits(head as RuntimeHaruToken), withoutSubSplits(aux)] };
}

function collapsedAspectAuxTeFormHost(token: RuntimeHaruToken): RuntimeHaruToken | null {
  if (isTeFormFusionHostToken(token)) {
    return token;
  }
  const form = token.pos & POS5A;
  if (form === 連用形_ && collapsedAspectAuxContraction(token)?.kind === "te_shimau") {
    return token;
  }
  const ichidanVerb = (token.pos & POS0) === 動詞 && (is上一段(token.pos) || is下一段(token.pos));
  if ((token.pos & POS5) === 未然形_一般 && (ichidanVerb || isVoiceOrCausativeAuxiliaryToken(token))) {
    return { ...token, pos: (token.pos & ~POS5) | 連用形_一般 };
  }
  return null;
}

function hasStemSelectingAuxiliaryFollower(
  tokens: readonly RuntimeHaruToken[],
  nextIndex: number,
  lookups: LookupTables
): boolean {
  const next = tokens[nextIndex];
  if (next === undefined || separatedAs(tokens, nextIndex, SEPARATION_BREAKS_MORPHEME_CHAIN)) {
    return false;
  }
  if ((next.pos & POS0) === 助動詞) {
    return !isAssertiveCopulaFamilyPos(next.pos) && !isPoliteCopulaPos(next.pos);
  }
  return isFusedNegativeStateChangeVerbToken(next, lookups);
}

function withoutSubSplits(token: RuntimeHaruToken): RuntimeHaruToken {
  if (token.splitA === undefined && token.splitB === undefined) {
    return token;
  }
  const { splitA: _splitA, splitB: _splitB, ...rest } = token;
  return rest as RuntimeHaruToken;
}

function restoreProlongedYouComparison(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    const prev = result[result.length - 1];
    const next = tokens[index + 1];
    if (
      (token.pos & POS01) !== 形状詞_助動詞語幹 || token.surface !== "よー" ||
      prev === undefined || !isAttributiveOrHomophonousTerminalInflection(prev.pos) ||
      next === undefined || (next.pos & (POS0 | POS4)) !== (助動詞 | 助動詞_ダ) ||
      !((next.surface === "な" && isAttributiveInflection(next.pos)) ||
        (next.surface === "に" && (next.pos & POS5) === 連用形_ニ))
    ) {
      result.push(token);
      continue;
    }
    dirty = true;
    result.push(replacementTokenFrom(token, {
      surface: "よう",
      dictionaryForm: "よう",
      reading: "ヨウ",
      dictionaryFormReading: "ヨウ",
      pos: token.pos,
      syntheticReason: "prolonged_you_comparison_restore"
    }));
  }
  return dirty ? result : [...tokens];
}

function isMisparsedBaIiSentenceFinalToken(token: RuntimeHaruToken): boolean {
  return token.surface === "ばいい" &&
    (token.pos & POS01) === 助詞_終助詞 &&
    token.dictionaryForm === "ばい";
}

function resplitMisparsedBaIiSentenceFinal(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (const token of tokens) {
    const prev = result[result.length - 1];
    const prevPos5A = (prev?.pos ?? 0) & POS5A;
    const prevPos4 = (prev?.pos ?? 0) & POS4;
    const prevIsConditionalHost = prev !== undefined && (
      ((pos0in(prev.pos, INFLECTABLE_AUX_BITS)) && !is文語助動詞(prev.pos) &&
        (prevPos5A === 仮定形_ || prevPos5A === 連用形_ || prevPos5A === 命令形_)) ||
      (prevPos5A === 仮定形_ && (prevPos4 === 助動詞_ナイ || prevPos4 === 助動詞_ヌ))
    );
    if (!isMisparsedBaIiSentenceFinalToken(token) || !prevIsConditionalHost) {
      result.push(token);
      continue;
    }
    dirty = true;
    const normalizedPrev: RuntimeHaruToken = {
      ...prev,
      pos: (prev.pos & ~POS5) | 仮定形_一般
    };
    if (
      (prev.pos & POS0) === 動詞 &&
      prevPos5A === 連用形_ &&
      prev.dictionaryForm.endsWith("れる")
    ) {
      normalizedPrev.dictionaryForm = `${prev.dictionaryForm.slice(0, -2)}る`;
      normalizedPrev.dictionaryId = 0;
    }
    result[result.length - 1] = normalizedPrev;
    const provenance = inheritedSourceIdentity(token);
    result.push({
      surface: "ば",
      dictionaryForm: "ば",
      reading: "バ",
      dictionaryFormReading: "バ",
      pos: 助詞_接続助詞,
      dictionaryId: 0,
      ...provenance,
      syntheticReason: "ba_ii_resplit_ba"
    });
    result.push({
      surface: "いい",
      dictionaryForm: "いい",
      reading: "イイ",
      dictionaryFormReading: "イイ",
      pos: 形容詞0 | 非自立可能 | 形容詞4 | 終止形_一般,
      dictionaryId: 0,
      ...provenance,
      syntheticReason: "ba_ii_resplit_ii"
    });
  }
  return dirty ? result : [...tokens];
}

function normalizeColloquialNaiAdjectiveTokens(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
  return tokens.map((token) => {
    if ((token.pos & POS01) !== (形容詞0 | 非自立可能) || !isColloquialNaiNeeSurface(token.surface)) {
      return token;
    }
    return {
      ...token,
      dictionaryForm: "ない",
      dictionaryFormReading: "ナイ"
    };
  });
}

function isGodanImperativeYoMistagCandidate(token: RuntimeHaruToken): boolean {
  if ((token.pos & POS0) !== 動詞 || !is下一段(token.pos)) {
    return false;
  }
  const pos5a = token.pos & POS5A;
  if (pos5a !== 命令形_ && pos5a !== 意志推量形_) {
    return false;
  }
  return token.surface.endsWith("よ") && token.surface.length >= 2;
}

const ICHIDAN_TO_GODAN_ROW: ReadonlyMap<number, number> = new Map([
  [下一段_カ行, 五段_カ行],
  [下一段_ガ行, 五段_ガ行],
  [下一段_サ行, 五段_サ行],
  [下一段_タ行, 五段_タ行],
  [下一段_ナ行, 五段_ナ行],
  [下一段_バ行, 五段_バ行],
  [下一段_マ行, 五段_マ行],
  [下一段_ラ行, 五段_ラ行],
  [下一段_ア行, 五段_ワア行]
]);

function recoverColloquialTteAuxBeforeBa(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
  let dirty = false;
  const result = tokens.map((token, index) => {
    if (
      token.surface !== "って" ||
      token.dictionaryForm !== "って" ||
      (token.pos & POS0) !== 助動詞
    ) {
      return token;
    }
    const next = tokens[index + 1];
    if (
      next === undefined ||
      next.dictionaryForm !== "ば" ||
      (next.pos & POS01) !== 助詞_接続助詞
    ) {
      return token;
    }
    dirty = true;
    return {
      ...token,
      pos: 助詞_副助詞,
      dictionaryFormReading: "ッテ",
      syntheticReason: "colloquial_tte_aux_retag"
    };
  });
  return dirty ? result : [...tokens];
}

function recoverImperativeTaggedAuxBeforeBa(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
  let dirty = false;
  const result = tokens.map((token, index) => {
    if (
      (token.pos & POS0) !== 助動詞 ||
      (token.pos & POS5A) !== 命令形_ ||
      is文語助動詞(token.pos)
    ) {
      return token;
    }
    const next = tokens[index + 1];
    if (
      next === undefined ||
      next.dictionaryForm !== "ば" ||
      (next.pos & POS01) !== 助詞_接続助詞
    ) {
      return token;
    }
    dirty = true;
    return {
      ...token,
      pos: (token.pos & ~POS5) | 仮定形_一般,
      syntheticReason: "imperative_tagged_aux_before_ba_retag"
    };
  });
  return dirty ? result : [...tokens];
}

const COPULA_NI_POS = 助動詞 | 助動詞_ダ | 連用形_ | 連用形_ニ;

function recoverCopulaNiBeforeStateChangeImperative(
  tokens: readonly RuntimeHaruToken[]
): RuntimeHaruToken[] {
  let dirty = false;
  const result = tokens.map((token, index) => {
    if (token.surface !== "に" || (token.pos & POS01) !== 助詞_格助詞) {
      return token;
    }
    const head = tokens[index - 1];
    if (head === undefined || !isNaAdjCapable(head)) {
      return token;
    }
    const carrier = tokens[index + 1];
    if (
      carrier === undefined ||
      (carrier.pos & POS01) !== 動詞_非自立可能 ||
      carrier.dictionaryForm !== "なる" ||
      (carrier.pos & POS5A) !== 命令形_
    ) {
      return token;
    }
    dirty = true;
    return {
      ...token,
      pos: COPULA_NI_POS,
      dictionaryForm: "だ",
      syntheticReason: "copula_ni_before_state_change_imperative"
    };
  });
  return dirty ? result : [...tokens];
}

const NARU_IMPERATIVE_POS = 動詞 | 非自立可能 | 五段_ラ行 | 命令形_;

function recoverNaruImperativeMistaggedAsNarePotential(
  tokens: readonly RuntimeHaruToken[]
): RuntimeHaruToken[] {
  let dirty = false;
  const result = tokens.map((token, index) => {
    if (
      token.surface !== "なれ" ||
      (token.pos & POS01) !== 動詞_非自立可能 ||
      token.dictionaryForm !== "なれる" ||
      (token.pos & POS5A) !== 連用形_
    ) {
      return token;
    }
    const ni = tokens[index - 1];
    const head = tokens[index - 2];
    const headIsYouMitaiProjection = head !== undefined &&
      (head.surface === "よう" || head.surface === "みたい") &&
      (head.pos & POS1) === 助動詞語幹;
    const pastMannerHost = headIsYouMitaiProjection &&
      ((tokens[index - 3]?.pos ?? 0) & POS4) === 助動詞_タ;
    const headIsNaruImperativeHost = head !== undefined &&
      (isNaAdjCapable(head) || headIsYouMitaiProjection) &&
      !pastMannerHost;
    if (
      ni === undefined || ni.surface !== "に" || (ni.pos & POS0) !== 助動詞 ||
      !headIsNaruImperativeHost
    ) {
      return token;
    }
    const next = tokens[index + 1];
    if (next !== undefined && (next.pos & POS0) !== 補助記号) {
      return token;
    }
    dirty = true;
    return {
      ...token,
      pos: NARU_IMPERATIVE_POS,
      dictionaryForm: "なる",
      syntheticReason: "naru_imperative_mistagged_as_nare_potential"
    };
  });
  return dirty ? result : [...tokens];
}

type SplitCollapsedTeOkuAuxSpec = {
  readonly surfaceTail: string;
  readonly readingTail: string;
  readonly pos5: number;
  readonly requireVerbRenyouHost?: boolean;
  readonly teFormFusionHostOnly?: boolean;
};

function splitCollapsedTeOkuAuxSpec(
  tokens: readonly RuntimeHaruToken[],
  index: number
): SplitCollapsedTeOkuAuxSpec | null {
  const marker = tokens[index];
  const tail = tokens[index + 1];
  if (marker === undefined || tail === undefined) {
    return null;
  }
  const following = tokens[index + 2];
  if (
    (marker.surface !== "と" && marker.surface !== "ど") ||
    marker.dictionaryForm !== marker.surface ||
    ((marker.pos & POS01) !== 助詞_接続助詞 && (marker.pos & POS01) !== 助詞_格助詞)
  ) {
    return null;
  }
  switch (tail.surface) {
    case "こう":
      return (tail.pos & POS0) === 副詞
        ? { surfaceTail: "こう", readingTail: "コウ", pos5: 意志推量形_ }
        : null;
    case "い":
      return (tail.pos & POS0) === 動詞 &&
        tail.dictionaryForm === "いる" &&
        following?.surface === "て" &&
        (following.pos & POS01) === 助詞_接続助詞
        ? { surfaceTail: "い", readingTail: "イ", pos5: 連用形_イ音便 }
        : null;
    case "き":
      return (tail.pos & POS0) === 動詞 &&
        tail.dictionaryForm === "くる"
        ? { surfaceTail: "き", readingTail: "キ", pos5: 連用形_一般 }
        : null;
    case "か": {
      if (
        (tail.pos & POS0) !== 助詞 ||
        following === undefined ||
        !isCollapsedTeOkuNegationTail(following)
      ) {
        return null;
      }
      return collapsedTeOkuObligationNegationTailAt(tokens, index + 2)
        ? { surfaceTail: "か", readingTail: "カ", pos5: 未然形_一般, teFormFusionHostOnly: true }
        : {
          surfaceTail: "か",
          readingTail: "カ",
          pos5: 未然形_一般,
          requireVerbRenyouHost: true,
          teFormFusionHostOnly: true
        };
    }
    default:
      return null;
  }
}

function isCollapsedTeOkuNegationTail(token: RuntimeHaruToken): boolean {
  const pos0 = token.pos & POS0;
  if (pos0 === 助動詞) {
    const pos4 = token.pos & POS4;
    return pos4 === 助動詞_ナイ || pos4 === 助動詞_ヌ;
  }
  return pos0 === 形容詞0 && (token.dictionaryForm === "ない" || token.dictionaryForm === "無い");
}

function collapsedTeOkuObligationNegationTailAt(
  tokens: readonly RuntimeHaruToken[],
  index: number
): boolean {
  const negation = tokens[index];
  if (negation === undefined) {
    return false;
  }
  if ((negation.pos & POS5) === 仮定形_融合) {
    return true;
  }
  const toIdx = nextNonSpaceIndex(tokens, index + 1, tokens.length);
  const to = toIdx === null ? undefined : tokens[toIdx];
  if (toIdx === null || to === undefined || to.surface !== "と" || (to.pos & POS0) !== 助詞) {
    return false;
  }
  const afterIdx = nextNonSpaceIndex(tokens, toIdx + 1, tokens.length);
  const after = afterIdx === null ? undefined : tokens[afterIdx];
  return after === undefined || isHardTerminalPunctuationToken(after);
}

function collapsedTeOkuHostBlockedByNominalModifier(
  precedingToken: RuntimeHaruToken | undefined
): boolean {
  if (precedingToken === undefined) {
    return false;
  }
  const pos0 = precedingToken.pos & POS0;
  if (pos0 === 接頭辞 || pos0 === 連体詞) {
    return true;
  }
  if (precedingToken.surface === "の" && (precedingToken.pos & POS01) === 助詞_格助詞) {
    return true;
  }
  return pos0in(precedingToken.pos, INFLECTABLE_AUX_BITS) &&
    isAttributiveInflection(precedingToken.pos);
}

function isCollapsedTeOkuSplitHost(token: RuntimeHaruToken): boolean {
  if (isCausativeAuxCollapsedTeOkuSplitHost(token) || isCollapsedShimauAuxCollapsedTeOkuSplitHost(token)) {
    return true;
  }
  if ((token.pos & POS0) !== 動詞) {
    return false;
  }
  const form = token.pos & POS5A;
  return form === 連用形_ ||
    (form === 未然形_ && (is上一段(token.pos) || is下一段(token.pos)));
}

function isCausativeAuxCollapsedTeOkuSplitHost(token: RuntimeHaruToken): boolean {
  if ((token.pos & POS0) !== 助動詞) {
    return false;
  }
  if (!isCausativeAuxLemma(token)) {
    return false;
  }
  const form = token.pos & POS5A;
  return form === 連用形_ || form === 未然形_;
}

function isCausativeAuxLemma(token: Pick<RuntimeHaruToken, "pos" | "dictionaryForm" | "surface">): boolean {
  if ((token.pos & POS0) !== 助動詞) {
    return false;
  }
  const pos4 = token.pos & POS4;
  return (
    pos4 === 下一段_サ行 &&
    (token.dictionaryForm === "せる" || token.dictionaryForm === "させる")
  ) || (
      pos4 === 下一段_マ行 &&
      (token.dictionaryForm === "しめる" || token.surface === "しめ" || token.surface === "しめる")
    );
}

function isCollapsedShimauAuxCollapsedTeOkuSplitHost(token: RuntimeHaruToken): boolean {
  if ((token.pos & POS0) !== 助動詞) {
    return false;
  }
  const form = token.pos & POS5A;
  return (form === 連用形_ || form === 連用形_促音便) &&
    (
      token.dictionaryForm === "ちゃう" ||
      token.dictionaryForm === "じゃう" ||
      token.dictionaryForm === "ちまう" ||
      token.dictionaryForm === "じまう"
    );
}

function collapsedTeOkuMarkerAgreesWithHost(marker: RuntimeHaruToken, host: RuntimeHaruToken): boolean {
  return marker.surface === (isVoicedTeFormHostToken(host) ? "ど" : "と");
}

async function recoverSplitCollapsedTeOkuAux(
  tokens: readonly RuntimeHaruToken[],
  recoverHost: (token: RuntimeHaruToken) => Promise<readonly RuntimeHaruToken[] | null>
): Promise<RuntimeHaruToken[]> {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const marker = tokens[index]!;
    const host = result[result.length - 1];
    const tail = tokens[index + 1];
    const spec = tail === undefined
      ? null
      : splitCollapsedTeOkuAuxSpec(tokens, index);
    const hostIsVerbRenyou = host !== undefined && isCollapsedTeOkuSplitHost(host);
    const hostRecoveryBlocked = spec === null ||
      (!hostIsVerbRenyou && collapsedTeOkuHostBlockedByNominalModifier(result[result.length - 2])) ||
      (spec.requireVerbRenyouHost === true && !hostIsVerbRenyou);
    const normalizedHostTokens = host === undefined || spec === null || hostRecoveryBlocked
      ? null
      : hostIsVerbRenyou
        ? [host]
        : await recoverHost(host);
    if (
      host === undefined ||
      spec === null ||
      normalizedHostTokens === null
    ) {
      result.push(marker);
      continue;
    }
    const normalizedHost = normalizedHostTokens.at(-1);
    if (
      normalizedHost === undefined ||
      (spec.teFormFusionHostOnly === true && !isTeFormFusionHostToken(normalizedHost)) ||
      !collapsedTeOkuMarkerAgreesWithHost(marker, normalizedHost)
    ) {
      result.push(marker);
      continue;
    }

    dirty = true;
    if (normalizedHostTokens.length === 1) {
      if (normalizedHost !== host) {
        result[result.length - 1] = normalizedHost;
      }
    } else {
      result.splice(result.length - 1, 1, ...normalizedHostTokens);
    }
    const sourceSpan = sourceSpanForTokenSlice(tokens, index, index + 2);
    const markerReading = marker.reading || (marker.surface === "ど" ? "ド" : "ト");
    result.push({
      surface: `${marker.surface}${spec.surfaceTail}`,
      dictionaryForm: `${marker.surface}く`,
      reading: `${markerReading}${spec.readingTail}`,
      dictionaryFormReading: `${markerReading}ク`,
      pos: 助動詞 | 五段_カ行 | spec.pos5,
      dictionaryId: 0,
      ...(sourceSpan === null ? {} : { sourceSpan }),
      syntheticReason: "split_collapsed_te_oku_aux"
    });
    index += 1;
  }
  return dirty ? result : [...tokens];
}

async function recoverDirectCollapsedTeOkuAuxHost(
  tokens: readonly RuntimeHaruToken[],
  recoverHost: (token: RuntimeHaruToken) => Promise<RuntimeHaruToken | null>
): Promise<RuntimeHaruToken[]> {
  let dirty = false;
  const result = [...tokens];
  for (let index = 1; index < result.length; index += 1) {
    const aux = result[index]!;
    if (
      (aux.pos & POS0) !== 助動詞 ||
      (aux.dictionaryForm !== "とく" && aux.dictionaryForm !== "どく")
    ) {
      continue;
    }
    const host = result[index - 1]!;
    if (isCollapsedTeOkuSplitHost(host)) {
      continue;
    }
    if ((host.pos & POS0) !== 動詞) {
      continue;
    }
    const normalizedHost = await recoverHost(host);
    if (normalizedHost === null) {
      continue;
    }
    result[index - 1] = normalizedHost;
    dirty = true;
  }
  return dirty ? result : [...tokens];
}

function resplitPastQuotativeTteBeforeBa(
  tokens: readonly RuntimeHaruToken[],
  lookups: LookupTables
): RuntimeHaruToken[] {
  const quotativeContentHeads = lookups.DATTE_QUOTATIVE_CONTENT_HEADS;
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    const isTatte = token.surface === "たって" && token.dictionaryForm === "たって" &&
      (token.pos & POS01) === 助詞_接続助詞;
    const isDatte = token.surface === "だって" && token.dictionaryForm === "だって" &&
      ((token.pos & POS01) === 助詞_格助詞 || (token.pos & POS01) === 助詞_接続助詞);
    const next = tokens[index + 1];
    const prev = result[result.length - 1];
    const beforeInsistenceBa = next !== undefined && next.dictionaryForm === "ば" &&
      (next.pos & POS01) === 助詞_接続助詞;
    const beforeQuotativeHead = next !== undefined && (next.pos & POS0) === 名詞 &&
      quotativeContentHeads.has(next.dictionaryForm || next.baseForm || next.surface);
    const beforeTopicExclamative = next !== undefined &&
      (next.pos & POS01) === 補助記号_読点 &&
      bareTteTopicExclamativeFollowerAhead(tokens, index + 2, lookups, { requireInterrogativeClose: true });
    if (
      !(isTatte || isDatte) ||
      next === undefined ||
      !(beforeInsistenceBa || beforeQuotativeHead || beforeTopicExclamative) ||
      prev === undefined ||
      (prev.pos & POS0) !== 動詞
    ) {
      result.push(token);
      continue;
    }
    dirty = true;
    const provenance = inheritedSourceIdentity(token);
    result.push({
      surface: isTatte ? "た" : "だ",
      dictionaryForm: "た",
      reading: isTatte ? "タ" : "ダ",
      dictionaryFormReading: "タ",
      pos: 助動詞 | 助動詞_タ | 終止形_一般,
      dictionaryId: 0,
      ...provenance,
      syntheticReason: "past_quotative_tteba_resplit_aux"
    });
    result.push({
      surface: "って",
      dictionaryForm: "って",
      reading: "ッテ",
      dictionaryFormReading: "ッテ",
      pos: 助詞_副助詞,
      dictionaryId: 0,
      ...provenance,
      syntheticReason: "past_quotative_tteba_resplit_tte"
    });
  }
  return dirty ? result : [...tokens];
}

const RESOURCE_CACHE_MAX_SIZE = 32;
const morphemeDictionaryStateCache = new Map<string, MorphemeDictionary>();
const patternDictionaryStateCache = new Map<string, PatternDictionary>();
const collocationDictionaryStateCache = new Map<string, CollocationDictionary>();
const reanalysisDictionaryStateCache = new Map<string, ReanalysisDictionary>();

export const SOKUON_CHARS = new Set(["っ", "ッ"]);
export const EMPHASIS_SOKUON_AFTER = new Set(Array.from("！？、。」）】』］｝〉!?.,;:)]}> \t\n\r”’~♡♥…‥〜～―─—"));
export const EMPHASIS_SOKUON_BEFORE = new Set(Array.from("！？、。「（【『［｛〈!?([{< \t\n\r“‘"));
const NO_BOUNDARIES: ReadonlySet<number> = new Set();
const SMALL_VOWEL_KANA: ReadonlySet<string> = new Set(Array.from("ぁぃぅぇぉァィゥェォ"));
export const NON_ATTACHABLE_POS0 = new Set(["補助記号", "記号"]);

const OOV_DICTIONARY_ID = -1;

type TerminalRoleSurfaceChars = readonly (readonly [surface: string, chars: readonly string[]])[];
const _terminalRoleBaseSurfaceCharsCache = new WeakMap<LookupTables, TerminalRoleSurfaceChars>();
function getTerminalRoleBaseSurfaceChars(lookups: LookupTables): TerminalRoleSurfaceChars {
  let cached = _terminalRoleBaseSurfaceCharsCache.get(lookups);
  if (cached === undefined) {
    const surfaces = Array.from(lookups.TERMINAL_ROLE_SFP_BY_SURFACE.keys())
      .sort((left, right) => codepointLength(right) - codepointLength(left));
    cached = surfaces.map((surface) => [surface, Array.from(surface)] as const);
    _terminalRoleBaseSurfaceCharsCache.set(lookups, cached);
  }
  return cached;
}

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

export interface PreparedTranslation {
  readonly sourceText: string;
  readonly tokens: readonly RuntimeHaruToken[];
  readonly pureMeow?: string;
  readonly parentheticalIslands?: readonly ParentheticalIsland[];
  readonly rawTokens?: readonly RuntimeHaruToken[];
  readonly finalizeFlipTokens?: (tokens: RuntimeHaruToken[]) => RuntimeHaruToken[];
  readonly annotationReplay?: {
    readonly segments: readonly AnnotatedSegment[];
    readonly metadata?: ReadonlyMap<number, AnnotationMetadata>;
  };
  readonly preprocessWarnings?: readonly Warning[];
  readonly embeddedTokenSpace?: boolean;
  readonly enclosingDelimiter?: EnclosingDelimiterKind;
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

export interface ParentheticalIsland {
  readonly id: string;
  readonly delimiter: {
    readonly open: string;
    readonly close: string;
  };
  readonly delimiterTextSpan?: {
    readonly open: TokenTextSpan;
    readonly close: TokenTextSpan;
  };
  readonly delimiterAnnotationKeys?: {
    readonly open?: readonly number[];
    readonly close?: readonly number[];
  };
  readonly sourceBoundary: SourceTokenBoundary;
  readonly sourceSpan: SourceTokenSpan;
  readonly proportionalProjection?: ParentheticalProportionalProjection;
  readonly innerPrepared: PreparedTranslation;
  readonly nestingDepth: number;
  readonly rubyAnnotationKey?: number;
  readonly pause?: {
    readonly key: number;
    readonly surface: string;
    readonly point: CharPointAnnotationMetadata;
  };
}

export interface ParentheticalProportionalProjection {
  readonly sourceSpan: SourceTokenSpan;
  readonly sourceOffset: number;
  readonly sourceLength: number;
  readonly sourceSurface: string;
}

interface PreparedRenderResult {
  readonly text: string;
  readonly units: TranslationUnit[];
  readonly warnings: readonly Warning[];
}

export interface TerminalRoleOccurrence {
  readonly pos: number;
  readonly sfp: string;
}

type JsonlFingerprint = readonly (readonly [relativePath: string, size: number, mtimeNs: bigint])[];

const meowSpacePattern = /냐 (?=냐)/gu;
const pureMeowRunPattern = /^(?<body>(?:にゃ|ニャ)+)(?<punct>[。！？!?]+)?$/u;
const literalMeowRunPattern = /(?<![가-힣])냐{2,}(?![가-힣])/gu;

export function findEmphasisSokuonOffsets(text: string, trailingBoundaries: ReadonlySet<number> = NO_BOUNDARIES): Set<number> {
  const offsets = new Set<number>();
  const chars = Array.from(text);
  let index = 0;
  while (index < chars.length) {
    if (!SOKUON_CHARS.has(chars[index] ?? "")) {
      index += 1;
      continue;
    }
    const runStart = index;
    while (index < chars.length && SOKUON_CHARS.has(chars[index] ?? "")) {
      index += 1;
    }
    const runEnd = index;
    const prevChar = runStart > 0 ? chars[runStart - 1] : undefined;
    const nextChar = runEnd < chars.length ? chars[runEnd] : undefined;
    const leading = prevChar === undefined || EMPHASIS_SOKUON_BEFORE.has(prevChar);
    const trailing = nextChar === undefined || EMPHASIS_SOKUON_AFTER.has(nextChar) || trailingBoundaries.has(runEnd);
    const removeFrom = leading || trailing ? runStart : runStart + 1;
    for (let pos = removeFrom; pos < runEnd; pos += 1) {
      offsets.add(pos);
    }
  }
  return offsets;
}

const variationSelectorPattern = /[\u{FE00}-\u{FE0F}\u{E0100}-\u{E01EF}]/gu;

export function stripVariationSelectors(text: string): string {
  return text.replace(variationSelectorPattern, "");
}

export interface StandaloneVoiceMarkEdits {
  readonly removed: ReadonlySet<number>;
  readonly substituted: ReadonlyMap<number, string>;
  readonly markedBases: readonly number[];
}

const SPACING_VOICE_MARK = "゛";
const COMBINING_VOICE_MARK = "゙";

export function findStandaloneVoiceMarkEdits(text: string): StandaloneVoiceMarkEdits | null {
  if (!text.includes(SPACING_VOICE_MARK) && !text.includes(COMBINING_VOICE_MARK)) {
    return null;
  }
  const chars = Array.from(text);
  const removed = new Set<number>();
  const substituted = new Map<number, string>();
  const markedBases = new Set<number>();
  for (let index = 0; index < chars.length; index += 1) {
    const char = chars[index];
    if (char !== SPACING_VOICE_MARK && char !== COMBINING_VOICE_MARK) {
      continue;
    }
    let base = index - 1;
    while (base >= 0 && removed.has(base)) {
      base -= 1;
    }
    const baseChar = base >= 0 ? chars[base] : undefined;
    if (char === COMBINING_VOICE_MARK && base === index - 1 && baseChar !== undefined
      && Array.from(`${baseChar}${char}`.normalize("NFC")).length === 1) {
      continue;
    }
    removed.add(index);
    if (baseChar === "ウ" && base === index - 1) {
      substituted.set(base, "ヴ");
    } else if (baseChar !== undefined && !substituted.has(base) && isVoiceMarkKanaBase(baseChar)) {
      markedBases.add(base);
    }
  }
  return removed.size === 0
    ? null
    : { removed, substituted, markedBases: [...markedBases].sort((left, right) => left - right) };
}

function isVoiceMarkKanaBase(char: string): boolean {
  return /^[\p{Script=Hiragana}\p{Script=Katakana}ー]$/u.test(char);
}

export function applyStandaloneVoiceMarkEdits(text: string, edits: StandaloneVoiceMarkEdits): string {
  return Array.from(text)
    .map((char, index) => (edits.removed.has(index) ? "" : edits.substituted.get(index) ?? char))
    .join("");
}

function projectOffsetAcrossRemoved(offset: number, sortedRemoved: readonly number[], removed: ReadonlySet<number>): number | null {
  return removed.has(offset) ? null : offset - bisectLeft(sortedRemoved, offset);
}

function attachStandaloneVoiceMarkFlags(
  tokens: RuntimeHaruToken[],
  edits: StandaloneVoiceMarkEdits,
  prolonged: ReadonlySet<number>,
  emphasisRemoved: ReadonlySet<number>
): void {
  const stages = [edits.removed, prolonged, emphasisRemoved].map((set) => ({
    set,
    sorted: [...set].sort((left, right) => left - right)
  }));
  const spans = analyzerTokenCharSpans(tokens);
  for (const base of edits.markedBases) {
    let offset: number | null = base;
    for (const stage of stages) {
      if (offset === null) {
        break;
      }
      offset = projectOffsetAcrossRemoved(offset, stage.sorted, stage.set);
    }
    if (offset === null) {
      continue;
    }
    const tokenIndex = spans.findIndex((span) => span.start <= offset! && offset! < span.end);
    const token = tokenIndex >= 0 ? tokens[tokenIndex] : undefined;
    if (token !== undefined) {
      token.sourceVoiceMarkOffsets = [...(token.sourceVoiceMarkOffsets ?? []), offset];
    }
  }
}

export function stripOffsets(text: string, offsets: ReadonlySet<number>): string {
  return Array.from(text).filter((_, index) => !offsets.has(index)).join("");
}

export function findProlongedOrthographyRestorationOffsets(text: string, lookups: LookupTables): Set<number> {
  const offsets = new Set<number>();
  const surfaces = lookups.PROLONGED_ORTHOGRAPHY_RESTORATION_SURFACES;
  if (surfaces.size === 0) {
    return offsets;
  }
  const chars = Array.from(text);
  for (const surface of surfaces) {
    const target = Array.from(surface);
    for (let start = 0; start + target.length <= chars.length; start += 1) {
      if (!target.every((char, offset) => chars[start + offset] === char)) {
        continue;
      }
      target.forEach((char, offset) => {
        if (char === "ー") {
          offsets.add(start + offset);
        }
      });
    }
  }
  return offsets;
}

function restoreProlongedOrthographySurfaces(
  tokens: RuntimeHaruToken[],
  prolongedOffsets: ReadonlySet<number>,
  analysisRemoved: ReadonlySet<number>
): void {
  if (prolongedOffsets.size === 0) {
    return;
  }
  const spans = analyzerTokenCharSpans(tokens);
  const sortedProlonged = [...prolongedOffsets].sort((left, right) => left - right);
  const sortedRemoved = [...analysisRemoved].sort((left, right) => left - right);
  const insertions = new Map<number, number[]>();
  sortedProlonged.forEach((inputOffset, order) => {
    const analysisPos = inputOffset - order;
    const finalPos = analysisPos - bisectLeft(sortedRemoved, analysisPos);
    let host = spans.findIndex((span) => span.start < finalPos && finalPos < span.end);
    let at = host < 0 ? 0 : finalPos - spans[host]!.start;
    if (host < 0) {
      host = spans.findIndex((span) => span.end === finalPos);
      at = host < 0 ? 0 : Array.from(tokens[host]!.surface).length;
    }
    if (host < 0) {
      return;
    }
    insertions.set(host, [...(insertions.get(host) ?? []), at]);
  });
  for (const [index, positions] of insertions) {
    const token = tokens[index]!;
    const chars = Array.from(token.surface);
    for (const at of [...positions].sort((left, right) => right - left)) {
      chars.splice(at, 0, "ー");
    }
    const restoredSurface = chars.join("");
    const previous = token.longVowelReduction;
    const rewritten = rewriteRuntimeTokenSurface(token, { kind: "replace", surface: restoredSurface });
    tokens[index] = {
      ...rewritten,
      longVowelReduction: {
        removedCount: (previous?.removedCount ?? 0) + positions.length,
        reducedSurface: previous?.reducedSurface ?? token.surface
      }
    };
  }
}

function composeRemovedOffsets(
  prolonged: ReadonlySet<number>,
  analysisRemoved: ReadonlySet<number>,
  inputLength: number
): Set<number> {
  const composed = new Set<number>(prolonged);
  let analysisIndex = 0;
  for (let inputIndex = 0; inputIndex < inputLength; inputIndex += 1) {
    if (prolonged.has(inputIndex)) {
      continue;
    }
    if (analysisRemoved.has(analysisIndex)) {
      composed.add(inputIndex);
    }
    analysisIndex += 1;
  }
  return composed;
}

export function collapseMeowSpacing(text: string): string {
  return text.replace(meowSpacePattern, "냐").replace(literalMeowRunPattern, (match) => `${"냐".repeat(Math.max(0, match.length - 1))}냥`);
}

export function translatePureMeowRun(text: string): string | undefined {
  const match = pureMeowRunPattern.exec(text);
  if (match?.groups === undefined) {
    return undefined;
  }
  const body = match.groups.body ?? "";
  const punct = match.groups.punct ?? "";
  const count = Math.floor(body.length / 2);
  if (count <= 0) {
    return undefined;
  }
  return convertPunctuation(`${"냐".repeat(Math.max(0, count - 1))}냥${punct}`);
}

export function stripColloquialNoniTails(text: string, lookups: LookupTables): string {
  if (!text.includes("のに")) {
    return text;
  }
  const chars = Array.from(text);
  let output = "";
  let index = 0;
  while (index < chars.length) {
    if ((chars[index] ?? "") !== "の" || (chars[index + 1] ?? "") !== "に") {
      output += chars[index] ?? "";
      index += 1;
      continue;
    }
    output += "のに";
    let tail = index + 2;
    const char = chars[tail];
    if (char === "ぃ" || char === "ィ") {
      while (tail < chars.length && (chars[tail] === "ぃ" || chars[tail] === "ィ")) {
        tail += 1;
      }
      index = tail >= chars.length || lookups.COLLOQUIAL_NONI_TERMINAL_FOLLOWERS.has(chars[tail] ?? "") ? tail : index + 2;
      continue;
    }
    if (char === "っ") {
      while (tail < chars.length && chars[tail] === "っ") {
        tail += 1;
      }
      const next = chars[tail] ?? "";
      index = next.length === 0 || lookups.COLLOQUIAL_NONI_TERMINAL_FOLLOWERS.has(next) || ("\u4e00" <= next && next <= "\u9fff") ? tail : index + 2;
      continue;
    }
    index += 2;
  }
  return output;
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

  private async extractParentheticalIslands(
    tokens: readonly RuntimeHaruToken[],
    sourceText: string,
    nestingDepth: number
  ): Promise<{ readonly tokens: readonly RuntimeHaruToken[]; readonly islands: readonly ParentheticalIsland[] }> {
    const outer: RuntimeHaruToken[] = [];
    const islands: ParentheticalIsland[] = [];
    const sourceChars = Array.from(sourceText);
    const tokenTextSpans = tokenTextSpansForSourceText(tokens, sourceChars);
    let index = 0;
    while (index < tokens.length) {
      const parenthetical = parentheticalSpanStartingAt(tokens, index, { consumers: ["assembler"] });
      if (parenthetical === null || parenthetical.role !== "parenthetical_span") {
        outer.push(tokens[index]!);
        index += 1;
        continue;
      }
      const sourceSpan = sourceSpanForTokenSlice(tokens, parenthetical.span.start, parenthetical.span.endExclusive);
      if (sourceSpan === null) {
        outer.push(tokens[index]!);
        index += 1;
        continue;
      }
      const openingTextSpan = tokenTextSpans[parenthetical.openingIdx] ?? null;
      const closingTextSpan = tokenTextSpans[parenthetical.closingIdx] ?? null;
      const innerText = openingTextSpan !== null && closingTextSpan !== null && openingTextSpan.end <= closingTextSpan.start
        ? sourceChars.slice(openingTextSpan.end, closingTextSpan.start).join("")
        : tokens
          .slice(parenthetical.openingIdx + 1, parenthetical.closingIdx)
          .map(token => token.surface)
          .join("");
      const innerPrepared = withEnclosingDelimiter(withEmbeddedTokenSpace(shiftPreparedSourceIdentity(
        await this.prepareTranslation(innerText),
        tokens[parenthetical.openingIdx + 1]?.sourceOrdinal ?? sourceSpan.startOrdinal + 1
      ), outer.length > 0 || islands.length > 0), parenthetical.openingSurface);
      islands.push({
        id: `parenthetical:${sourceSpan.startOrdinal}:${sourceSpan.endOrdinal}:${islands.length}`,
        delimiter: {
          open: parenthetical.openingSurface,
          close: parenthetical.closingSurface
        },
        ...(openingTextSpan !== null && closingTextSpan !== null ? {
          delimiterTextSpan: {
            open: openingTextSpan,
            close: closingTextSpan
          }
        } : {}),
        sourceBoundary: sourceBoundaryForRemovedSpan(tokens, parenthetical.span.start, parenthetical.span.endExclusive),
        sourceSpan,
        innerPrepared,
        nestingDepth
      });
      index = parenthetical.span.endExclusive;
    }
    const prepared: PreparedTranslation = { sourceText, tokens: outer, parentheticalIslands: islands };
    absorbParentheticalRubyIslands(prepared);
    return { tokens: prepared.tokens, islands: prepared.parentheticalIslands ?? [] };
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

interface TokenTextSpan {
  readonly start: number;
  readonly end: number;
}

interface NarouRubyInputProjection {
  readonly baseTextSpan: TokenTextSpan;
  readonly baseSurface: string;
  readonly alignment: readonly AlignmentForSurfaceChar[];
}

interface NarouRubyTokenizationInput {
  readonly text: string;
  readonly projections: readonly NarouRubyInputProjection[];
  readonly removedTextSpans: readonly TokenTextSpan[];
}

function collectNarouRubyTokenizationInput(
  sourceText: string,
  baseBarriers: ReadonlySet<number> = new Set()
): NarouRubyTokenizationInput {
  const chars = Array.from(sourceText);
  const output: string[] = [];
  const projections: NarouRubyInputProjection[] = [];
  const removedTextSpans: TokenTextSpan[] = [];
  let index = 0;
  while (index < chars.length) {
    if (chars[index] !== "《") {
      output.push(chars[index] ?? "");
      index += 1;
      continue;
    }
    const close = chars.indexOf("》", index + 1);
    if (close < 0 || chars.slice(index + 1, close).includes("《")) {
      output.push(chars[index] ?? "");
      index += 1;
      continue;
    }
    let baseStart = index;
    while (
      baseStart > 0 &&
      !baseBarriers.has(baseStart) &&
      isKanji(chars[baseStart - 1] ?? "")
    ) {
      baseStart -= 1;
    }
    const baseSurface = chars.slice(baseStart, index).join("");
    const rubyReading = normalizeInferredRubyReadingToKatakana(chars.slice(index + 1, close).join(""));
    const aligned = rubyReading === null || baseSurface.length === 0
      ? null
      : alignReading(baseSurface, rubyReading);
    if (aligned === null) {
      output.push(chars[index] ?? "");
      index += 1;
      continue;
    }
    const baseLength = codepointLength(baseSurface);
    const baseEnd = output.length;
    projections.push({
      baseTextSpan: { start: baseEnd - baseLength, end: baseEnd },
      baseSurface,
      alignment: aligned.map(([surface, reading]) => ({ surface, reading }))
    });
    removedTextSpans.push({ start: index, end: close + 1 });
    index = close + 1;
  }
  return { text: output.join(""), projections, removedTextSpans };
}

function projectDeletionOnlyBoundaries(
  sourceText: string,
  targetText: string,
  sourceBoundaries: ReadonlySet<number>
): ReadonlySet<number> {
  if (sourceBoundaries.size === 0 || sourceText === targetText) {
    return sourceBoundaries;
  }
  const source = Array.from(sourceText);
  const target = Array.from(targetText);
  const prefixMatched: number[] = Array(source.length + 1).fill(0);
  let targetIndex = 0;
  for (let sourceIndex = 0; sourceIndex < source.length; sourceIndex += 1) {
    if (source[sourceIndex] === target[targetIndex]) {
      targetIndex += 1;
    }
    prefixMatched[sourceIndex + 1] = targetIndex;
  }
  const suffixStart: number[] = Array(source.length + 1).fill(target.length);
  targetIndex = target.length - 1;
  suffixStart[source.length] = target.length;
  for (let sourceIndex = source.length - 1; sourceIndex >= 0; sourceIndex -= 1) {
    if (source[sourceIndex] === target[targetIndex]) {
      targetIndex -= 1;
    }
    suffixStart[sourceIndex] = targetIndex + 1;
  }
  const intervals: { readonly start: number; readonly end: number }[] = [];
  for (const boundary of sourceBoundaries) {
    if (boundary < 0 || boundary > source.length) {
      continue;
    }
    const start = suffixStart[boundary] ?? target.length;
    const end = prefixMatched[boundary] ?? 0;
    if (start <= end) {
      intervals.push({ start, end });
    }
  }
  intervals.sort((left, right) => left.start - right.start || left.end - right.end);
  const projected = new Set<number>();
  let mergedStart: number | null = null;
  let mergedEnd: number | null = null;
  const flush = (): void => {
    if (mergedStart === null || mergedEnd === null) return;
    for (let boundary = mergedStart; boundary <= mergedEnd; boundary += 1) {
      projected.add(boundary);
    }
  };
  for (const interval of intervals) {
    if (mergedStart === null || mergedEnd === null || interval.start > mergedEnd + 1) {
      flush();
      mergedStart = interval.start;
      mergedEnd = interval.end;
    } else {
      mergedEnd = Math.max(mergedEnd, interval.end);
    }
  }
  flush();
  return projected;
}

function projectBoundariesAcrossRemovedSpans(
  boundaries: ReadonlySet<number>,
  removedTextSpans: readonly TokenTextSpan[]
): ReadonlySet<number> {
  if (boundaries.size === 0 || removedTextSpans.length === 0) {
    return boundaries;
  }
  const projected = new Set<number>();
  for (const boundary of boundaries) {
    if (removedTextSpans.some((span) => boundary > span.start && boundary < span.end)) {
      continue;
    }
    const removedBefore = removedTextSpans.reduce(
      (total, span) => total + (span.end <= boundary ? span.end - span.start : 0),
      0
    );
    projected.add(boundary - removedBefore);
  }
  return projected;
}

function projectSpansAcrossBoundaryProjection(
  spans: readonly TokenTextSpan[],
  project: (boundaries: ReadonlySet<number>) => ReadonlySet<number>
): readonly TokenTextSpan[] {
  if (spans.length === 0) {
    return spans;
  }
  return spans.flatMap((span) => {
    const [start] = project(new Set([span.start]));
    const [end] = project(new Set([span.end]));
    return start === undefined || end === undefined || end <= start ? [] : [{ start, end }];
  });
}

function projectBoundariesAcrossRemovedOffsets(
  boundaries: ReadonlySet<number>,
  removedOffsets: ReadonlySet<number>
): ReadonlySet<number> {
  if (boundaries.size === 0 || removedOffsets.size === 0) {
    return boundaries;
  }
  const sortedRemoved = [...removedOffsets].sort((left, right) => left - right);
  return new Set([...boundaries].map((boundary) => boundary - bisectLeft(sortedRemoved, boundary)));
}

function projectTerminalRoleOccurrencesAcrossNarouRuby(
  occurrences: readonly TerminalRoleOccurrence[],
  removedTextSpans: readonly TokenTextSpan[]
): readonly TerminalRoleOccurrence[] {
  return occurrences.flatMap((occurrence) => {
    if (removedTextSpans.some((span) => occurrence.pos > span.start && occurrence.pos < span.end)) {
      return [];
    }
    const removedBefore = removedTextSpans.reduce(
      (total, span) => total + (span.end <= occurrence.pos ? span.end - span.start : 0),
      0
    );
    return [{ ...occurrence, pos: occurrence.pos - removedBefore }];
  });
}

function attachNarouRubySourceFragments(
  tokens: RuntimeHaruToken[],
  tokenizationText: string,
  projections: readonly NarouRubyInputProjection[],
  removedOffsets: ReadonlySet<number>
): boolean {
  if (projections.length === 0) {
    return true;
  }
  const projected = projections.map((projection) =>
    projectNarouRubyAcrossRemovedOffsets(projection, removedOffsets)
  );
  if (projected.some((projection) => projection === null)) {
    return false;
  }
  const tokenSpans: readonly (TokenTextSpan | null)[] =
    tokens.every((token) => token.sourceCharSpan !== undefined)
      ? tokens.map((token) => token.sourceCharSpan!)
      : tokenTextSpansForSourceText(tokens, Array.from(tokenizationText));
  const fragmentsByToken = new Map<number, SourceRubyReadingFragment[]>();
  for (const projection of projected) {
    if (projection === null) {
      return false;
    }
    let covered = 0;
    for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex += 1) {
      const token = tokens[tokenIndex]!;
      const tokenSpan = tokenSpans[tokenIndex];
      if (
        tokenSpan === null ||
        tokenSpan === undefined ||
        tokenSpan.end <= projection.baseTextSpan.start ||
        tokenSpan.start >= projection.baseTextSpan.end
      ) {
        continue;
      }
      const overlapStart = Math.max(tokenSpan.start, projection.baseTextSpan.start);
      const overlapEnd = Math.min(tokenSpan.end, projection.baseTextSpan.end);
      const sourceOffset = overlapStart - projection.baseTextSpan.start;
      const tokenOffset = overlapStart - tokenSpan.start;
      const length = overlapEnd - overlapStart;
      const readingsByCharacter = projection.alignment
        .slice(sourceOffset, sourceOffset + length)
        .map((pair) => pair.reading);
      if (
        readingsByCharacter.length !== length ||
        Array.from(token.surface).slice(tokenOffset, tokenOffset + length).join("") !==
          Array.from(projection.baseSurface).slice(sourceOffset, sourceOffset + length).join("")
      ) {
        return false;
      }
      const sourceOrdinal = token.sourceOrdinal;
      if (sourceOrdinal === undefined) {
        return false;
      }
      const fragment: SourceRubyReadingFragment = {
        sourceOrdinal,
        sourceSurface: token.surface,
        coveredStart: tokenOffset,
        coveredEnd: tokenOffset + length,
        readingsByCharacter
      };
      const existing = fragmentsByToken.get(tokenIndex);
      if (existing === undefined) {
        fragmentsByToken.set(tokenIndex, [fragment]);
      } else {
        existing.push(fragment);
      }
      covered += length;
    }
    if (covered !== codepointLength(projection.baseSurface)) {
      return false;
    }
  }
  for (const [tokenIndex, fragments] of fragmentsByToken) {
    tokens[tokenIndex]!.sourceRubyReadingFragments = fragments;
  }
  const allFragments = [...fragmentsByToken.values()].flat();
  const patchabilityProbe = tokens.map((token) => ({ ...token }));
  if (!applySourceRubyReadingFragments(patchabilityProbe, allFragments)) {
    return false;
  }
  return true;
}

function projectNarouRubyAcrossRemovedOffsets(
  projection: NarouRubyInputProjection,
  removedOffsets: ReadonlySet<number>
): NarouRubyInputProjection | null {
  for (const offset of removedOffsets) {
    if (offset >= projection.baseTextSpan.start && offset < projection.baseTextSpan.end) {
      return null;
    }
  }
  const beforeStart = [...removedOffsets].filter((offset) => offset < projection.baseTextSpan.start).length;
  const beforeEnd = [...removedOffsets].filter((offset) => offset < projection.baseTextSpan.end).length;
  return {
    ...projection,
    baseTextSpan: {
      start: projection.baseTextSpan.start - beforeStart,
      end: projection.baseTextSpan.end - beforeEnd
    }
  };
}

interface RawParentheticalIsland {
  readonly openingSurface: string;
  readonly closingSurface: string;
  readonly openingTextSpan: TokenTextSpan;
  readonly closingTextSpan: TokenTextSpan;
  readonly innerText: string;
  readonly outerOffset: number;
}

interface RawParentheticalSplit {
  readonly outerText: string;
  readonly islands: readonly RawParentheticalIsland[];
}

const RAW_PARENTHETICAL_CLOSING_BY_OPENING: ReadonlyMap<string, string> = new Map([
  ["（", "）"],
  ["(", ")"],
  ["[", "]"],
  ["［", "］"]
]);

const RAW_PARENTHETICAL_OPENING_BY_CLOSING: ReadonlyMap<string, string> = new Map(
  [...RAW_PARENTHETICAL_CLOSING_BY_OPENING.entries()].map(([opening, closing]) => [closing, opening])
);

interface RawParentheticalStackFrame {
  readonly openingSurface: string;
  readonly start: number;
}

interface RawParentheticalSpan {
  readonly openingSurface: string;
  readonly closingSurface: string;
  readonly start: number;
  readonly innerStart: number;
  readonly innerEnd: number;
  readonly endExclusive: number;
}

function splitRawParentheticalIslands(sourceText: string): RawParentheticalSplit | null {
  const chars = Array.from(sourceText);
  const spans = collectTopLevelRawParentheticalSpans(chars);
  if (spans.length === 0) {
    return null;
  }
  const islands: RawParentheticalIsland[] = [];
  const outerChars: string[] = [];
  let cursor = 0;
  for (const span of spans) {
    outerChars.push(...chars.slice(cursor, span.start));
    islands.push({
      openingSurface: span.openingSurface,
      closingSurface: span.closingSurface,
      openingTextSpan: { start: span.start, end: span.innerStart },
      closingTextSpan: { start: span.innerEnd, end: span.endExclusive },
      innerText: chars.slice(span.innerStart, span.innerEnd).join(""),
      outerOffset: outerChars.length
    });
    cursor = span.endExclusive;
  }
  outerChars.push(...chars.slice(cursor));
  return { outerText: outerChars.join(""), islands };
}

function collectTopLevelRawParentheticalSpans(chars: readonly string[]): readonly RawParentheticalSpan[] {
  const stack: RawParentheticalStackFrame[] = [];
  const spans: RawParentheticalSpan[] = [];
  for (let index = 0; index < chars.length; index += 1) {
    const ch = chars[index] ?? "";
    if (RAW_PARENTHETICAL_CLOSING_BY_OPENING.has(ch)) {
      stack.push({ openingSurface: ch, start: index });
      continue;
    }
    const expectedOpening = RAW_PARENTHETICAL_OPENING_BY_CLOSING.get(ch);
    if (expectedOpening === undefined || stack.length === 0) {
      continue;
    }
    const top = stack[stack.length - 1]!;
    if (top.openingSurface !== expectedOpening) {
      stack.length = 0;
      continue;
    }
    stack.pop();
    if (stack.length === 0) {
      const span: RawParentheticalSpan = {
        openingSurface: top.openingSurface,
        closingSurface: ch,
        start: top.start,
        innerStart: top.start + 1,
        innerEnd: index,
        endExclusive: index + 1
      };
      if (isRawParentheticalIslandExtractable(chars, span)) {
        spans.push(span);
      }
    }
  }
  return spans;
}

function isRawParentheticalIslandExtractable(
  chars: readonly string[],
  span: RawParentheticalSpan
): boolean {
  if (span.openingSurface === "(" || span.openingSurface === "（") {
    return true;
  }
  if (span.openingSurface !== "[" && span.openingSurface !== "［") {
    return false;
  }
  return !containsJapaneseScript(chars.slice(span.innerStart, span.innerEnd).join(""));
}

function containsJapaneseScript(text: string): boolean {
  return /[\u3040-\u30ff\u3400-\u9fff]/u.test(text);
}

function tokenTextSpansForSourceText(
  tokens: readonly RuntimeHaruToken[],
  sourceChars: readonly string[]
): readonly (TokenTextSpan | null)[] {
  const spans: (TokenTextSpan | null)[] = [];
  let sourceIndex = 0;
  for (const token of tokens) {
    const surfaceChars = Array.from(token.surface);
    let matched = 0;
    let start = -1;
    let end = -1;
    while (matched < surfaceChars.length && sourceIndex < sourceChars.length) {
      if (sourceChars[sourceIndex] === surfaceChars[matched]) {
        if (start < 0) start = sourceIndex;
        end = sourceIndex + 1;
        matched += 1;
      }
      sourceIndex += 1;
    }
    spans.push(matched === surfaceChars.length && start >= 0 ? { start, end } : null);
  }
  return spans;
}

type NominalCompoundProjectionProbe = (token: RuntimeHaruToken) => Promise<string | null>;

interface RawParentheticalSourceIdentityPlan {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly ordinalSpans: readonly (SourceTokenSpan | null)[];
  readonly projectionBoundariesByOrdinal: readonly (readonly SourceCompoundProjectionBoundary[])[];
  readonly loweredTokensByOrdinal: readonly (readonly RuntimeHaruToken[] | null)[];
  readonly islandAnchorOrdinals: readonly number[];
}

async function buildRawParentheticalSourceIdentityPlan(
  tokens: readonly RuntimeHaruToken[],
  tokenTextSpans: readonly (TokenTextSpan | null)[],
  islands: readonly RawParentheticalIsland[],
  islandWidths: readonly number[],
  projectionProbe: NominalCompoundProjectionProbe
): Promise<RawParentheticalSourceIdentityPlan> {
  const result: RuntimeHaruToken[] = [];
  const ordinalSpans: (SourceTokenSpan | null)[] = [];
  const projectionBoundariesByOrdinal: SourceCompoundProjectionBoundary[][] = [];
  const loweredTokensByOrdinal: (readonly RuntimeHaruToken[] | null)[] = [];
  const islandAnchorOrdinals: number[] = [];
  let islandIndex = 0;
  let sourceCursor = 0;
  const reserveIslandAt = (index: number, anchor: number): void => {
    islandAnchorOrdinals[index] = anchor;
  };
  for (let index = 0; index < tokens.length; index += 1) {
    const span = tokenTextSpans[index];
    const token = tokens[index];
    if (token === undefined) {
      continue;
    }
    if (span === null || span === undefined) {
      const sourceSpan = { startOrdinal: sourceCursor, endOrdinal: sourceCursor + 1 };
      result.push(withRuntimeTokenSourceSpan(token, sourceSpan));
      ordinalSpans[index] = sourceSpan;
      projectionBoundariesByOrdinal[index] = [];
      loweredTokensByOrdinal[index] = null;
      sourceCursor += 1;
      continue;
    }
    while (
      islandIndex < islands.length &&
      (islands[islandIndex]?.outerOffset ?? Number.MAX_SAFE_INTEGER) <= span.start
    ) {
      reserveIslandAt(islandIndex, sourceCursor);
      sourceCursor += islandWidths[islandIndex] ?? 0;
      islandIndex += 1;
    }
    const internalIslandIndexes: number[] = [];
    let scanIndex = islandIndex;
    while (
      scanIndex < islands.length &&
      (islands[scanIndex]?.outerOffset ?? Number.MAX_SAFE_INTEGER) < span.end
    ) {
      const offset = islands[scanIndex]?.outerOffset ?? Number.MAX_SAFE_INTEGER;
      if (offset > span.start) {
        internalIslandIndexes.push(scanIndex);
      }
      scanIndex += 1;
    }
    const rawOffsets = internalIslandIndexes.map((candidate) => islands[candidate]!.outerOffset);
    const modalProjectionBoundary = modalAuxiliaryInternalParentheticalProjectionBoundary(
      token,
      span,
      rawOffsets,
      sourceCursor,
      islands,
      islandWidths,
      islandIndex
    );
    if (modalProjectionBoundary !== null) {
      const sourceSpan = {
        startOrdinal: sourceCursor,
        endOrdinal: sourceCursor + 2 + (islandWidths[islandIndex] ?? 0)
      };
      result.push(withRuntimeTokenSourceSpan(token, sourceSpan, {
        projectionBoundaries: [modalProjectionBoundary]
      }));
      ordinalSpans[index] = sourceSpan;
      projectionBoundariesByOrdinal[index] = [modalProjectionBoundary];
      loweredTokensByOrdinal[index] = null;
      reserveIslandAt(islandIndex, sourceCursor + 1);
      sourceCursor = sourceSpan.endOrdinal;
      islandIndex += 1;
      continue;
    }
    const split = nominalInternalParentheticalSplit(token, span, rawOffsets);
    if (split === null) {
      const pieceSplit = nominalInternalParentheticalPieceSplit(token, span, rawOffsets);
      if (pieceSplit !== null) {
        const pieceStartOrdinal = sourceCursor;
        const loweredPieces: RuntimeHaruToken[] = [];
        let pieceRawStart = span.start;
        for (let pieceIndex = 0; pieceIndex < pieceSplit.pieces.length; pieceIndex += 1) {
          const piece = pieceSplit.pieces[pieceIndex]!;
          const pieceRawEnd = pieceRawStart + codepointLength(piece.surface);
          const lowered = withRuntimeTokenSourceSpan(
            { ...piece, sourceCompoundSplitPiece: true },
            { startOrdinal: sourceCursor, endOrdinal: sourceCursor + 1 },
            { attachLeft: pieceIndex > 0 || token.sourceCompoundContinuation === true }
          );
          result.push(lowered);
          loweredPieces.push(lowered);
          sourceCursor += 1;
          while (
            islandIndex < islands.length &&
            (islands[islandIndex]?.outerOffset ?? Number.MAX_SAFE_INTEGER) > pieceRawStart &&
            (islands[islandIndex]?.outerOffset ?? Number.MAX_SAFE_INTEGER) < pieceRawEnd
          ) {
            reserveIslandAt(islandIndex, sourceCursor);
            sourceCursor += islandWidths[islandIndex] ?? 0;
            islandIndex += 1;
          }
          pieceRawStart = pieceRawEnd;
        }
        ordinalSpans[index] = { startOrdinal: pieceStartOrdinal, endOrdinal: sourceCursor };
        projectionBoundariesByOrdinal[index] = [];
        loweredTokensByOrdinal[index] = loweredPieces;
        continue;
      }
      const sourceSpan = { startOrdinal: sourceCursor, endOrdinal: sourceCursor + 1 };
      result.push(withRuntimeTokenSourceSpan(token, sourceSpan));
      ordinalSpans[index] = sourceSpan;
      projectionBoundariesByOrdinal[index] = [];
      loweredTokensByOrdinal[index] = null;
      sourceCursor += 1;
      while (
        islandIndex < islands.length &&
        (islands[islandIndex]?.outerOffset ?? Number.MAX_SAFE_INTEGER) < span.end
      ) {
        reserveIslandAt(islandIndex, sourceCursor);
        sourceCursor += islandWidths[islandIndex] ?? 0;
        islandIndex += 1;
      }
      continue;
    }
    const projectionBoundary = await nominalInternalParentheticalProjectionBoundary(
      token,
      split,
      sourceCursor,
      islands,
      islandWidths,
      islandIndex,
      projectionProbe
    );
    if (projectionBoundary !== null) {
      const sourceSpan = {
        startOrdinal: sourceCursor,
        endOrdinal: sourceCursor + 2 + (islandWidths[islandIndex] ?? 0)
      };
      result.push(withRuntimeTokenSourceSpan(token, sourceSpan, {
        projectionBoundaries: [projectionBoundary]
      }));
      ordinalSpans[index] = sourceSpan;
      projectionBoundariesByOrdinal[index] = [projectionBoundary];
      loweredTokensByOrdinal[index] = null;
      reserveIslandAt(islandIndex, sourceCursor + 1);
      sourceCursor = sourceSpan.endOrdinal;
      islandIndex += 1;
      continue;
    }
    const pieceStartOrdinal = sourceCursor;
    const loweredPieces: RuntimeHaruToken[] = [];
    for (let pieceIndex = 0; pieceIndex < split.pieces.length; pieceIndex += 1) {
      const piece = split.pieces[pieceIndex]!;
      const lowered = withRuntimeTokenSourceSpan(
        piece,
        { startOrdinal: sourceCursor, endOrdinal: sourceCursor + 1 },
        { attachLeft: pieceIndex > 0 || token.sourceCompoundContinuation === true }
      );
      result.push(lowered);
      loweredPieces.push(lowered);
      sourceCursor += 1;
      if (pieceIndex < split.pieces.length - 1) {
        reserveIslandAt(islandIndex, sourceCursor);
        sourceCursor += islandWidths[islandIndex] ?? 0;
        islandIndex += 1;
      }
    }
    ordinalSpans[index] = { startOrdinal: pieceStartOrdinal, endOrdinal: sourceCursor };
    projectionBoundariesByOrdinal[index] = [];
    loweredTokensByOrdinal[index] = loweredPieces;
  }
  while (islandIndex < islands.length) {
    reserveIslandAt(islandIndex, sourceCursor);
    sourceCursor += islandWidths[islandIndex] ?? 0;
    islandIndex += 1;
  }
  return { tokens: result, ordinalSpans, projectionBoundariesByOrdinal, loweredTokensByOrdinal, islandAnchorOrdinals };
}

function remapRawParentheticalPreprocessedTokenSourceIdentities(
  tokens: readonly RuntimeHaruToken[],
  tokenTextSpans: readonly (TokenTextSpan | null)[],
  sourceIdentityPlan: RawParentheticalSourceIdentityPlan
): RuntimeHaruToken[] {
  const result: RuntimeHaruToken[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    const replacement = loweredTokensForRawParentheticalPreprocessedToken(token, sourceIdentityPlan);
    if (replacement !== null) {
      const fragments = token.sourceRubyReadingFragments ?? [];
      if (fragments.length === 0) {
        result.push(...replacement);
        continue;
      }
      const lowered = replacement.map((item) => ({ ...item }));
      const remappedFragments = fragments.map((fragment) => ({
        ...fragment,
        sourceOrdinal: sourceIdentityPlan.ordinalSpans[fragment.sourceOrdinal]?.startOrdinal ??
          fragment.sourceOrdinal
      }));
      if (applySourceRubyReadingFragments(lowered, remappedFragments)) {
        result.push(...lowered);
        continue;
      }
    }
    const sourceSpan = sourceSpanForRawParentheticalPreprocessedToken(token, sourceIdentityPlan);
    if (sourceSpan !== null) {
      result.push(withRuntimeTokenSourceSpan(token, sourceSpan, {
        projectionBoundaries: projectionBoundariesForRawParentheticalPreprocessedToken(token, sourceIdentityPlan),
        rubySourceOrdinal: (sourceOrdinal) =>
          sourceIdentityPlan.ordinalSpans[sourceOrdinal]?.startOrdinal ?? sourceOrdinal
      }));
      continue;
    }
    const textSpan = tokenTextSpans[index];
    if (textSpan !== null && textSpan !== undefined) {
      result.push(token);
      continue;
    }
    result.push(token);
  }
  return result;
}

function loweredTokensForRawParentheticalPreprocessedToken(
  token: RuntimeHaruToken,
  sourceIdentityPlan: RawParentheticalSourceIdentityPlan
): readonly RuntimeHaruToken[] | null {
  const sourceSpan = token.sourceSpan ?? (
    token.sourceOrdinal === undefined
      ? null
      : { startOrdinal: token.sourceOrdinal, endOrdinal: token.sourceOrdinal + 1 }
  );
  if (sourceSpan === null || sourceSpan.endOrdinal !== sourceSpan.startOrdinal + 1) {
    return null;
  }
  return sourceIdentityPlan.loweredTokensByOrdinal[sourceSpan.startOrdinal] ?? null;
}

function sourceSpanForRawParentheticalPreprocessedToken(
  token: RuntimeHaruToken,
  sourceIdentityPlan: RawParentheticalSourceIdentityPlan
): SourceTokenSpan | null {
  const sourceSpan = token.sourceSpan ?? (
    token.sourceOrdinal === undefined
      ? null
      : { startOrdinal: token.sourceOrdinal, endOrdinal: token.sourceOrdinal + 1 }
  );
  if (sourceSpan === null) {
    return null;
  }
  return sourceSpanFromOriginalOrdinalRange(sourceIdentityPlan, sourceSpan.startOrdinal, sourceSpan.endOrdinal);
}

function projectionBoundariesForRawParentheticalPreprocessedToken(
  token: RuntimeHaruToken,
  sourceIdentityPlan: RawParentheticalSourceIdentityPlan
): readonly SourceCompoundProjectionBoundary[] {
  const sourceSpan = token.sourceSpan ?? (
    token.sourceOrdinal === undefined
      ? null
      : { startOrdinal: token.sourceOrdinal, endOrdinal: token.sourceOrdinal + 1 }
  );
  if (sourceSpan === null) {
    return [];
  }
  const boundaries: SourceCompoundProjectionBoundary[] = [];
  for (let ordinal = sourceSpan.startOrdinal; ordinal < sourceSpan.endOrdinal; ordinal += 1) {
    boundaries.push(...(sourceIdentityPlan.projectionBoundariesByOrdinal[ordinal] ?? []));
  }
  return boundaries;
}

function sourceSpanFromOriginalOrdinalRange(
  sourceIdentityPlan: RawParentheticalSourceIdentityPlan,
  startOrdinal: number,
  endOrdinal: number
): SourceTokenSpan | null {
  let start: number | null = null;
  let end: number | null = null;
  for (let ordinal = startOrdinal; ordinal < endOrdinal; ordinal += 1) {
    const span = sourceIdentityPlan.ordinalSpans[ordinal] ?? null;
    if (span === null) {
      continue;
    }
    start = start === null ? span.startOrdinal : Math.min(start, span.startOrdinal);
    end = end === null ? span.endOrdinal : Math.max(end, span.endOrdinal);
  }
  return start === null || end === null ? null : { startOrdinal: start, endOrdinal: end };
}

interface NominalInternalParentheticalSplit {
  readonly pieces: readonly RuntimeHaruToken[];
  readonly rawOffsets: readonly number[];
}

interface NominalInternalParentheticalPieceSplit {
  readonly pieces: readonly RuntimeHaruToken[];
}

interface ModalAuxiliaryInternalProjection {
  readonly dictionaryForms: readonly string[];
  readonly leftSurfaces: readonly string[];
  readonly rightSurface: string;
  readonly leftTargetText: string;
  readonly rightTargetText: string;
}

const MODAL_AUXILIARY_INTERNAL_PROJECTIONS: readonly ModalAuxiliaryInternalProjection[] = [
  {
    dictionaryForms: ["みる", "見る"],
    leftSurfaces: ["み", "見"],
    rightSurface: "よう",
    leftTargetText: "보",
    rightTargetText: "자"
  },
  {
    dictionaryForms: ["おく", "置く"],
    leftSurfaces: ["お", "置"],
    rightSurface: "こう",
    leftTargetText: "두",
    rightTargetText: "자"
  },
  {
    dictionaryForms: ["いく", "行く"],
    leftSurfaces: ["い", "行"],
    rightSurface: "こう",
    leftTargetText: "가",
    rightTargetText: "자"
  },
  {
    dictionaryForms: ["くる", "来る"],
    leftSurfaces: ["こ", "来"],
    rightSurface: "よう",
    leftTargetText: "오",
    rightTargetText: "자"
  },
  {
    dictionaryForms: ["しまう"],
    leftSurfaces: ["しま"],
    rightSurface: "おう",
    leftTargetText: "버리",
    rightTargetText: "자"
  }
];

function modalAuxiliaryInternalParentheticalProjectionBoundary(
  token: RuntimeHaruToken,
  tokenTextSpan: TokenTextSpan,
  rawOffsets: readonly number[],
  sourceCursor: number,
  islands: readonly RawParentheticalIsland[],
  islandWidths: readonly number[],
  islandIndex: number
): SourceCompoundProjectionBoundary | null {
  if (
    rawOffsets.length !== 1 ||
    (token.pos & (POS0 | POS4)) !== (動詞 | 意志推量形_)
  ) {
    return null;
  }
  const island = islands[islandIndex];
  if (
    island === undefined ||
    island.outerOffset !== rawOffsets[0] ||
    (islandWidths[islandIndex] ?? 0) <= 0
  ) {
    return null;
  }
  const relativeOffset = island.outerOffset - tokenTextSpan.start;
  const chars = Array.from(token.surface);
  if (relativeOffset <= 0 || relativeOffset >= chars.length) {
    return null;
  }
  const leftSurface = chars.slice(0, relativeOffset).join("");
  const rightSurface = chars.slice(relativeOffset).join("");
  const projection = MODAL_AUXILIARY_INTERNAL_PROJECTIONS.find((candidate) =>
    candidate.dictionaryForms.includes(token.dictionaryForm) &&
    candidate.leftSurfaces.includes(leftSurface) &&
    candidate.rightSurface === rightSurface
  );
  if (projection === undefined) {
    return null;
  }
  return {
    rawOffset: island.outerOffset,
    sourceBoundary: {
      beforeOrdinal: sourceCursor,
      afterOrdinal: sourceCursor + 1
    },
    leftTargetText: projection.leftTargetText,
    rightTargetText: projection.rightTargetText
  };
}

function nominalInternalParentheticalSplit(
  token: RuntimeHaruToken,
  tokenTextSpan: TokenTextSpan,
  rawOffsets: readonly number[]
): NominalInternalParentheticalSplit | null {
  if (rawOffsets.length === 0 || (token.pos & POS0) !== 名詞) {
    return null;
  }
  for (const split of [token.splitB, token.splitA]) {
    const candidate = splitByRawOffsets(token, tokenTextSpan, split ?? [], rawOffsets);
    if (candidate !== null) {
      return { pieces: candidate, rawOffsets };
    }
  }
  return null;
}

function nominalInternalParentheticalPieceSplit(
  token: RuntimeHaruToken,
  tokenTextSpan: TokenTextSpan,
  rawOffsets: readonly number[]
): NominalInternalParentheticalPieceSplit | null {
  if (rawOffsets.length === 0 || (token.pos & POS0) !== 名詞) {
    return null;
  }
  for (const split of [token.splitB, token.splitA]) {
    const candidate = splitAroundRawOffsetsInsidePieces(token, tokenTextSpan, split ?? [], rawOffsets);
    if (candidate !== null) {
      return { pieces: candidate };
    }
  }
  return null;
}

function splitByRawOffsets(
  token: RuntimeHaruToken,
  tokenTextSpan: TokenTextSpan,
  split: readonly RuntimeHaruToken[],
  rawOffsets: readonly number[]
): readonly RuntimeHaruToken[] | null {
  if (split.length < 2 || !split.every(isNominalParentheticalSplitChild)) {
    return null;
  }
  if (split.map((part) => part.surface).join("") !== token.surface) {
    return null;
  }
  const offsetSet = new Set(rawOffsets);
  const boundaryChildIndexes = new Set<number>();
  let cursor = tokenTextSpan.start;
  for (let index = 0; index < split.length - 1; index += 1) {
    cursor += Array.from(split[index]!.surface).length;
    if (offsetSet.has(cursor)) {
      boundaryChildIndexes.add(index + 1);
    }
  }
  if (boundaryChildIndexes.size !== rawOffsets.length) {
    return null;
  }
  const pieces: RuntimeHaruToken[] = [];
  let pieceStart = 0;
  for (let childIndex = 1; childIndex <= split.length; childIndex += 1) {
    if (childIndex < split.length && !boundaryChildIndexes.has(childIndex)) {
      continue;
    }
    pieces.push(composeParentheticalSplitPiece(token, split.slice(pieceStart, childIndex)));
    pieceStart = childIndex;
  }
  return pieces.length === rawOffsets.length + 1 ? pieces : null;
}

function splitAroundRawOffsetsInsidePieces(
  token: RuntimeHaruToken,
  tokenTextSpan: TokenTextSpan,
  split: readonly RuntimeHaruToken[],
  rawOffsets: readonly number[]
): readonly RuntimeHaruToken[] | null {
  if (split.length < 2 || !split.every(isNominalParentheticalSplitChild)) {
    return null;
  }
  if (split.map((part) => part.surface).join("") !== token.surface) {
    return null;
  }
  let matched = 0;
  let cursor = tokenTextSpan.start;
  for (const part of split) {
    const start = cursor;
    const end = start + codepointLength(part.surface);
    for (const rawOffset of rawOffsets) {
      if (rawOffset > start && rawOffset < end) {
        matched += 1;
      }
    }
    cursor = end;
  }
  return matched === rawOffsets.length ? split : null;
}

async function nominalInternalParentheticalProjectionBoundary(
  token: RuntimeHaruToken,
  split: NominalInternalParentheticalSplit,
  sourceCursor: number,
  islands: readonly RawParentheticalIsland[],
  islandWidths: readonly number[],
  islandIndex: number,
  projectionProbe: NominalCompoundProjectionProbe
): Promise<SourceCompoundProjectionBoundary | null> {
  if (split.pieces.length !== 2 || split.rawOffsets.length !== 1) {
    return null;
  }
  const island = islands[islandIndex];
  if (island === undefined || island.outerOffset !== split.rawOffsets[0]) {
    return null;
  }
  if ((islandWidths[islandIndex] ?? 0) <= 0) {
    return null;
  }
  const compoundText = await projectionProbe(token);
  const leftText = await projectionProbe(split.pieces[0]!);
  const rightText = await projectionProbe(split.pieces[1]!);
  if (compoundText === null || compoundText.length === 0) {
    return null;
  }
  const hasLeft = leftText !== null && leftText.length > 0 && compoundText.startsWith(leftText);
  const hasRight = rightText !== null && rightText.length > 0 && compoundText.endsWith(rightText);
  const leftOffset = hasLeft && leftText !== null ? leftText.length : null;
  const rightOffset = hasRight && rightText !== null ? compoundText.length - rightText.length : null;
  const boundaryOffset = leftOffset !== null && rightOffset !== null
    ? leftOffset === rightOffset ? leftOffset : null
    : leftOffset ?? rightOffset;
  if (boundaryOffset === null || boundaryOffset <= 0 || boundaryOffset >= compoundText.length) {
    return null;
  }
  return {
    rawOffset: island.outerOffset,
    sourceBoundary: {
      beforeOrdinal: sourceCursor,
      afterOrdinal: sourceCursor + 1
    },
    ...(hasLeft && leftText !== null ? { leftTargetText: leftText } : {}),
    ...(hasRight && rightText !== null ? { rightTargetText: rightText } : {}),
    ...(leftText === null || leftText.length === 0 ? {} : { leftSplitTargetText: leftText }),
    ...(rightText === null || rightText.length === 0 ? {} : { rightSplitTargetText: rightText })
  };
}

function isNominalParentheticalSplitChild(token: RuntimeHaruToken): boolean {
  const pos0 = token.pos & POS0;
  return pos0 === 名詞 || pos0 === 接頭辞 || pos0 === 接尾辞;
}

function composeParentheticalSplitPiece(
  parent: RuntimeHaruToken,
  children: readonly RuntimeHaruToken[]
): RuntimeHaruToken {
  if (children.length === 1) {
    return children[0]!;
  }
  const surface = children.map((child) => child.surface).join("");
  const normalizedForm = joinOptionalTokenField(children, "normalizedForm");
  return {
    surface,
    ...(normalizedForm === undefined ? {} : { normalizedForm }),
    dictionaryForm: children.map((child) => child.dictionaryForm).join(""),
    reading: children.map((child) => child.reading).join(""),
    dictionaryFormReading: children.map((child) => child.dictionaryFormReading).join(""),
    pos: parent.pos,
    dictionaryId: parent.dictionaryId,
    splitA: children.flatMap((child) => child.splitA ?? [child]),
    splitB: children
  };
}

function joinOptionalTokenField(
  tokens: readonly RuntimeHaruToken[],
  key: "normalizedForm"
): string | undefined {
  return tokens.every((token) => token[key] !== undefined)
    ? tokens.map((token) => token[key]).join("")
    : undefined;
}

function preparedSourceWidth(prepared: PreparedTranslation): number {
  let maxOrdinal = 0;
  for (const token of prepared.tokens) {
    if (token.sourceSpan !== undefined && token.sourceSpan !== null) {
      maxOrdinal = Math.max(maxOrdinal, token.sourceSpan.endOrdinal);
    } else if (token.sourceOrdinal !== undefined) {
      maxOrdinal = Math.max(maxOrdinal, token.sourceOrdinal + 1);
    }
  }
  for (const island of prepared.parentheticalIslands ?? []) {
    maxOrdinal = Math.max(maxOrdinal, island.sourceSpan.endOrdinal);
  }
  return maxOrdinal;
}

function sourceBoundaryForRawParenthetical(
  outerOffset: number,
  tokens: readonly RuntimeHaruToken[],
  tokenTextSpans: readonly (TokenTextSpan | null)[]
): SourceTokenBoundary {
  let previous: RuntimeHaruToken | undefined;
  let next: RuntimeHaruToken | undefined;
  let containing: RuntimeHaruToken | undefined;
  for (let index = 0; index < tokens.length; index += 1) {
    const span = tokenTextSpans[index];
    const token = tokens[index];
    if (span === undefined || span === null || token === undefined) {
      continue;
    }
    if (span.end <= outerOffset) {
      previous = token;
      continue;
    }
    if (span.start >= outerOffset) {
      next = token;
      break;
    }
    containing = token;
    break;
  }
  const previousSpan = previous?.sourceSpan ?? null;
  const nextSpan = next?.sourceSpan ?? null;
  const containingSpan = containing?.sourceSpan ?? null;
  const containingInternalBoundary = containing === undefined
    ? null
    : sourceCompoundBoundaryForRawOffset(containing, outerOffset);
  if (containingInternalBoundary !== null) {
    return containingInternalBoundary;
  }
  if (previousSpan === null && nextSpan === null && containingSpan !== null) {
    return sourceBoundaryAfterSourceSpan(containingSpan);
  }
  return sourceBoundaryBetweenSourceSpans(previousSpan, nextSpan);
}

function sourceBoundaryBetweenSourceSpans(
  previousSpan: SourceTokenSpan | null,
  nextSpan: SourceTokenSpan | null
): SourceTokenBoundary {
  if (previousSpan !== null && nextSpan !== null) {
    const afterOrdinal = nextSpan.startOrdinal >= previousSpan.endOrdinal
      ? nextSpan.startOrdinal
      : previousSpan.endOrdinal;
    return {
      beforeOrdinal: previousSpan.endOrdinal - 1,
      afterOrdinal
    };
  }
  if (previousSpan !== null) {
    return {
      beforeOrdinal: previousSpan.endOrdinal - 1,
      afterOrdinal: previousSpan.endOrdinal
    };
  }
  if (nextSpan !== null) {
    return {
      beforeOrdinal: nextSpan.startOrdinal > 0 ? nextSpan.startOrdinal - 1 : null,
      afterOrdinal: nextSpan.startOrdinal
    };
  }
  return { beforeOrdinal: null, afterOrdinal: null };
}

function proportionalProjectionForRawParenthetical(
  island: RawParentheticalIsland,
  tokens: readonly RuntimeHaruToken[],
  tokenTextSpans: readonly (TokenTextSpan | null)[]
): { readonly proportionalProjection: ParentheticalProportionalProjection } | null {
  for (let index = 0; index < tokens.length; index += 1) {
    const span = tokenTextSpans[index];
    const token = tokens[index];
    const sourceSpan = token?.sourceSpan ?? null;
    if (
      token === undefined ||
      span === undefined ||
      span === null ||
      sourceSpan === null ||
      island.outerOffset <= span.start ||
      island.outerOffset >= span.end
    ) {
      continue;
    }
    const projection = proportionalProjectionForTokenInternalOffset(
      token,
      island.outerOffset - span.start
    );
    if (projection === null) {
      return null;
    }
    return { proportionalProjection: projection };
  }
  return null;
}

function proportionalProjectionForTokenInternalOffset(
  token: RuntimeHaruToken,
  sourceOffset: number
): ParentheticalProportionalProjection | null {
  const sourceSpan = token.sourceSpan ?? null;
  if (sourceSpan === null) {
    return null;
  }
  const sourceLength = codepointLength(token.surface);
  if (sourceOffset <= 0 || sourceOffset >= sourceLength) {
    return null;
  }
  return {
    sourceSpan,
    sourceOffset,
    sourceLength,
    sourceSurface: token.surface
  };
}

function sourceCompoundBoundaryForRawOffset(
  token: RuntimeHaruToken,
  rawOffset: number
): SourceTokenBoundary | null {
  for (const boundary of token.sourceCompoundProjectionBoundaries ?? []) {
    if (boundary.rawOffset === rawOffset) {
      return boundary.sourceBoundary;
    }
  }
  return null;
}

function sourceSpanForTokenSlice(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  endExclusive: number
): SourceTokenSpan | null {
  let startOrdinal: number | null = null;
  let endOrdinal: number | null = null;
  for (let index = start; index < endExclusive; index += 1) {
    const span = tokens[index]?.sourceSpan;
    if (span === undefined || span === null) {
      continue;
    }
    startOrdinal = startOrdinal === null ? span.startOrdinal : Math.min(startOrdinal, span.startOrdinal);
    endOrdinal = endOrdinal === null ? span.endOrdinal : Math.max(endOrdinal, span.endOrdinal);
  }
  return startOrdinal === null || endOrdinal === null ? null : { startOrdinal, endOrdinal };
}

function sourceBoundaryBeforeSourceSpan(span: SourceTokenSpan): SourceTokenBoundary {
  return {
    beforeOrdinal: span.startOrdinal > 0 ? span.startOrdinal - 1 : null,
    afterOrdinal: span.startOrdinal
  };
}

function sourceBoundaryAfterSourceSpan(span: SourceTokenSpan): SourceTokenBoundary {
  return {
    beforeOrdinal: span.endOrdinal - 1,
    afterOrdinal: span.endOrdinal
  };
}

function sourceBoundaryForRemovedSpan(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  endExclusive: number
): SourceTokenBoundary {
  const previous = sourceSpanForTokenSlice(tokens, Math.max(0, start - 1), start);
  if (previous !== null) {
    return {
      beforeOrdinal: previous.endOrdinal - 1,
      afterOrdinal: previous.endOrdinal
    };
  }
  const next = sourceSpanForTokenSlice(tokens, endExclusive, Math.min(tokens.length, endExclusive + 1));
  if (next !== null) {
    return {
      beforeOrdinal: next.startOrdinal > 0 ? next.startOrdinal - 1 : null,
      afterOrdinal: next.startOrdinal
    };
  }
  return { beforeOrdinal: null, afterOrdinal: null };
}

interface ParentheticalInternalInsertionResult {
  readonly inserted: boolean;
  readonly warning?: Warning;
}

function insertParentheticalIntoInternalTargetBoundary(
  segments: TargetSegment[],
  island: ParentheticalIsland,
  innerSegments: readonly TargetSegment[],
  sourceTokens: readonly RuntimeHaruToken[]
): ParentheticalInternalInsertionResult {
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index]!;
    const boundaryTarget = (segment.sourceInternalBoundaryTargets ?? []).find((target) =>
      sourceBoundaryEquals(target.sourceBoundary, island.sourceBoundary)
    );
    if (boundaryTarget === undefined || segment.sourceSpan === null) {
      continue;
    }
    const targetOffset = targetOffsetForInternalBoundary(segment.text, boundaryTarget);
    if (targetOffset === null) {
      const splitSegments = splitTargetSegmentAtIndependentParentheticalBoundary(
        segment,
        boundaryTarget,
        island
      );
      if (splitSegments !== null) {
        segments.splice(
          index,
          1,
          ...splitSegments.left,
          ...parentheticalTargetSegments(island, innerSegments, "fallback"),
          ...splitSegments.right
        );
        return { inserted: true };
      }
      continue;
    }
    const splitSegments = splitTargetSegmentAtParentheticalBoundary(segment, targetOffset, island);
    if (splitSegments === null) {
      continue;
    }
    segments.splice(
      index,
      1,
      ...splitSegments.left,
      ...parentheticalTargetSegments(island, innerSegments, "exact"),
      ...splitSegments.right
    );
    return { inserted: true };
  }
  for (let index = 0; index < segments.length; index += 1) {
    const splitSegments = splitKoreanSahenLightVerbAtParentheticalBoundary(
      segments,
      index,
      island
    );
    if (splitSegments === null) {
      continue;
    }
    segments.splice(
      index,
      1,
      ...splitSegments.left,
      ...parentheticalTargetSegments(island, innerSegments, "fallback"),
      ...splitSegments.right
    );
    return { inserted: true };
  }
  if (island.pause !== undefined && island.proportionalProjection === undefined) {
    return { inserted: false };
  }
  if (
    hasExactSemanticRightBoundaryForParenthetical(segments, island) &&
    !hasProportionalProjectionTargetSegment(segments, island, sourceTokens)
  ) {
    return { inserted: false };
  }
  for (let index = 0; index < segments.length; index += 1) {
    const splitSegments = splitTargetSegmentAtProportionalParentheticalBoundary(
      segments[index],
      island,
      sourceTokens
    );
    if (splitSegments === null) {
      continue;
    }
    segments.splice(
      index,
      1,
      ...splitSegments.left,
      ...parentheticalTargetSegments(island, innerSegments, "fallback"),
      ...splitSegments.right
    );
    return {
      inserted: true,
      warning: parentheticalProjectionFallbackWarning(island)
    };
  }
  return { inserted: false };
}

function buildParentheticalSplitSegments(
  segment: TargetSegment,
  leftText: string,
  rightText: string,
  sourceSpan: SourceTokenSpan,
  island: ParentheticalIsland,
  extraFields?: Partial<TargetSegment>
): { readonly left: readonly TargetSegment[]; readonly right: readonly TargetSegment[] } | null {
  const leftSourceSpan: SourceTokenSpan = {
    startOrdinal: sourceSpan.startOrdinal,
    endOrdinal: island.sourceSpan.startOrdinal
  };
  const rightSourceSpan: SourceTokenSpan = {
    startOrdinal: island.sourceSpan.endOrdinal,
    endOrdinal: sourceSpan.endOrdinal
  };
  if (
    leftSourceSpan.endOrdinal <= leftSourceSpan.startOrdinal ||
    rightSourceSpan.endOrdinal <= rightSourceSpan.startOrdinal
  ) {
    return null;
  }
  const leftSegment: TargetSegment = {
    ...segment,
    text: leftText,
    sourceSpan: leftSourceSpan,
    boundaryBefore: sourceBoundaryBeforeSourceSpan(leftSourceSpan),
    boundaryAfter: sourceBoundaryAfterSourceSpan(leftSourceSpan),
    attachRight: true,
    sourceInternalBoundaryTargets: [],
    ...extraFields
  };
  const rightSegment: TargetSegment = {
    ...segment,
    text: rightText,
    sourceSpan: rightSourceSpan,
    boundaryBefore: sourceBoundaryBeforeSourceSpan(rightSourceSpan),
    boundaryAfter: sourceBoundaryAfterSourceSpan(rightSourceSpan),
    attachLeft: true,
    sourceInternalBoundaryTargets: [],
    ...extraFields
  };
  return { left: [leftSegment], right: [rightSegment] };
}

function splitTargetSegmentAtIndependentParentheticalBoundary(
  segment: TargetSegment,
  boundaryTarget: NonNullable<TargetSegment["sourceInternalBoundaryTargets"]>[number],
  island: ParentheticalIsland
): { readonly left: readonly TargetSegment[]; readonly right: readonly TargetSegment[] } | null {
  const sourceSpan = segment.sourceSpan;
  const leftText = boundaryTarget.leftSplitTargetText;
  const rightText = boundaryTarget.rightSplitTargetText;
  if (
    sourceSpan === null ||
    leftText === undefined ||
    rightText === undefined ||
    leftText.length === 0 ||
    rightText.length === 0
  ) {
    return null;
  }
  return buildParentheticalSplitSegments(segment, leftText, rightText, sourceSpan, island, { projectionConfidence: "fallback" });
}

function hasProportionalProjectionTargetSegment(
  segments: readonly TargetSegment[],
  island: ParentheticalIsland,
  sourceTokens: readonly RuntimeHaruToken[]
): boolean {
  const insertion = targetInsertionForParenthetical(segments, island);
  const exactRight = insertion.confidence === "exact" ? segments[insertion.index] : undefined;
  if (exactRight !== undefined && isSemanticParentheticalRightSegment(exactRight)) {
    const projection = island.proportionalProjection;
    const rightSourceSpan = exactRight.sourceSpan;
    const projectionToken = projection === undefined
      ? undefined
      : sourceTokens.find((token) =>
        token.sourceSpan !== undefined &&
        token.sourceSpan !== null &&
        sourceSpanEquals(token.sourceSpan, projection.sourceSpan)
      );
    return projection !== undefined &&
      projectionToken !== undefined &&
      (projectionToken.pos & POS0) === 名詞 &&
      rightSourceSpan !== null &&
      rightSourceSpan.startOrdinal === projection.sourceSpan.startOrdinal &&
      sourceSpanContains(rightSourceSpan, projection.sourceSpan) &&
      splitTargetSegmentAtProportionalParentheticalBoundary(exactRight, island, sourceTokens) !== null;
  }
  return segments.some((segment) =>
    splitTargetSegmentAtProportionalParentheticalBoundary(segment, island, sourceTokens) !== null
  );
}

function hasExactSemanticRightBoundaryForParenthetical(
  segments: readonly TargetSegment[],
  island: ParentheticalIsland
): boolean {
  const insertion = targetInsertionForParenthetical(segments, island);
  if (insertion.confidence !== "exact") {
    return false;
  }
  const next = segments[insertion.index];
  return next !== undefined && isSemanticParentheticalRightSegment(next);
}

function isSemanticParentheticalRightSegment(segment: TargetSegment): boolean {
  return segment.text.trim().length > 0 &&
    segment.kind !== "punctuation" &&
    segment.kind !== "quote" &&
    segment.kind !== "parenthetical" &&
    segment.kind !== "annotation";
}

function targetOffsetForInternalBoundary(
  text: string,
  boundaryTarget: NonNullable<TargetSegment["sourceInternalBoundaryTargets"]>[number]
): number | null {
  const leftOffset = boundaryTarget.leftTargetText !== undefined && boundaryTarget.leftTargetText.length > 0 && text.startsWith(boundaryTarget.leftTargetText)
    ? boundaryTarget.leftTargetText.length
    : null;
  const rightOffset = boundaryTarget.rightTargetText !== undefined && boundaryTarget.rightTargetText.length > 0 && text.endsWith(boundaryTarget.rightTargetText)
    ? text.length - boundaryTarget.rightTargetText.length
    : null;
  const offset = leftOffset !== null && rightOffset !== null
    ? leftOffset === rightOffset ? leftOffset : null
    : leftOffset ?? rightOffset;
  return offset !== null && offset > 0 && offset < text.length ? offset : null;
}

function splitTargetSegmentAtParentheticalBoundary(
  segment: TargetSegment,
  targetOffset: number,
  island: ParentheticalIsland
): { readonly left: readonly TargetSegment[]; readonly right: readonly TargetSegment[] } | null {
  const sourceSpan = segment.sourceSpan;
  if (sourceSpan === null) {
    return null;
  }
  const leftText = segment.text.slice(0, targetOffset);
  const rightText = segment.text.slice(targetOffset);
  if (leftText.length === 0 || rightText.length === 0) {
    return null;
  }
  return buildParentheticalSplitSegments(segment, leftText, rightText, sourceSpan, island);
}

function splitKoreanSahenLightVerbAtParentheticalBoundary(
  segments: readonly TargetSegment[],
  index: number,
  island: ParentheticalIsland
): { readonly left: readonly TargetSegment[]; readonly right: readonly TargetSegment[] } | null {
  const segment = segments[index];
  const next = segments[index + 1];
  const sourceSpan = segment?.sourceSpan ?? null;
  if (
    segment === undefined ||
    sourceSpan === null ||
    next === undefined ||
    island.sourceBoundary.afterOrdinal === null ||
    sourceSpan.startOrdinal >= island.sourceBoundary.afterOrdinal ||
    sourceSpan.endOrdinal <= island.sourceSpan.endOrdinal ||
    !segment.text.endsWith("하") ||
    !isHeadTailConnectiveSegment(next)
  ) {
    return null;
  }
  const leftText = segment.text.slice(0, -1);
  if (leftText.length === 0) {
    return null;
  }
  const leftSourceSpan: SourceTokenSpan = {
    startOrdinal: sourceSpan.startOrdinal,
    endOrdinal: island.sourceBoundary.afterOrdinal
  };
  const rightSourceSpan: SourceTokenSpan = {
    startOrdinal: island.sourceSpan.endOrdinal,
    endOrdinal: sourceSpan.endOrdinal
  };
  if (
    leftSourceSpan.endOrdinal <= leftSourceSpan.startOrdinal ||
    rightSourceSpan.endOrdinal <= rightSourceSpan.startOrdinal
  ) {
    return null;
  }
  return {
    left: [{
      ...segment,
      text: leftText,
      sourceSpan: leftSourceSpan,
      boundaryBefore: sourceBoundaryBeforeSourceSpan(leftSourceSpan),
      boundaryAfter: sourceBoundaryAfterSourceSpan(leftSourceSpan),
      sourceInternalBoundaryTargets: []
    }],
    right: [{
      ...segment,
      text: "하",
      sourceSpan: rightSourceSpan,
      boundaryBefore: sourceBoundaryBeforeSourceSpan(rightSourceSpan),
      boundaryAfter: sourceBoundaryAfterSourceSpan(rightSourceSpan),
      attachLeft: true,
      sourceInternalBoundaryTargets: []
    }]
  };
}

function splitTargetSegmentAtProportionalParentheticalBoundary(
  segment: TargetSegment | undefined,
  island: ParentheticalIsland,
  sourceTokens: readonly RuntimeHaruToken[]
): { readonly left: readonly TargetSegment[]; readonly right: readonly TargetSegment[] } | null {
  const sourceSpan = segment?.sourceSpan ?? null;
  const projection = sourceSpan === null
    ? null
    : island.proportionalProjection ?? proportionalProjectionForParentheticalSourceBoundary(
      sourceSpan,
      island,
      sourceTokens
    );
  if (
    segment === undefined ||
    sourceSpan === null ||
    projection === null ||
    segment.text.trim().length === 0 ||
    !sourceSpanContains(sourceSpan, projection.sourceSpan)
  ) {
    return null;
  }
  const sourcePosition = proportionalSourcePositionInSegmentSource(
    sourceSpan,
    projection,
    sourceTokens
  );
  if (sourcePosition === null) {
    return null;
  }
  const targetLength = codepointLength(segment.text);
  if (targetLength < 2) {
    return null;
  }
  const targetCodepointOffset = proportionalTargetCodepointOffset(
    sourcePosition.offset,
    sourcePosition.length,
    targetLength
  );
  if (targetCodepointOffset <= 0 || targetCodepointOffset >= targetLength) {
    return null;
  }
  const targetOffset = codeUnitOffsetForCodepointOffset(segment.text, targetCodepointOffset);
  const leftText = segment.text.slice(0, targetOffset);
  const rightText = segment.text.slice(targetOffset);
  if (leftText.length === 0 || rightText.length === 0) {
    return null;
  }
  return {
    left: [{
      ...segment,
      text: leftText,
      boundaryAfter: null,
      attachRight: true,
      projectionConfidence: "fallback",
      sourceInternalBoundaryTargets: []
    }],
    right: [{
      ...segment,
      text: rightText,
      boundaryBefore: null,
      attachLeft: true,
      projectionConfidence: "fallback",
      sourceInternalBoundaryTargets: []
    }]
  };
}

function proportionalProjectionForParentheticalSourceBoundary(
  segmentSourceSpan: SourceTokenSpan,
  island: ParentheticalIsland,
  sourceTokens: readonly RuntimeHaruToken[]
): ParentheticalProportionalProjection | null {
  const afterOrdinal = island.sourceBoundary.afterOrdinal;
  if (
    afterOrdinal === null ||
    afterOrdinal <= segmentSourceSpan.startOrdinal ||
    afterOrdinal >= segmentSourceSpan.endOrdinal
  ) {
    return null;
  }
  let sourceOffset = 0;
  let sourceLength = 0;
  const sourceSurfaces: string[] = [];
  for (const token of sourceTokens) {
    const span = token.sourceSpan ?? null;
    if (span === null || !sourceSpanContains(segmentSourceSpan, span)) {
      continue;
    }
    const tokenLength = codepointLength(token.surface);
    if (span.endOrdinal <= afterOrdinal) {
      sourceOffset += tokenLength;
    } else if (span.startOrdinal < afterOrdinal) {
      return null;
    }
    sourceLength += tokenLength;
    sourceSurfaces.push(token.surface);
  }
  if (sourceLength <= 0 || sourceOffset <= 0 || sourceOffset >= sourceLength) {
    return null;
  }
  return {
    sourceSpan: segmentSourceSpan,
    sourceOffset,
    sourceLength,
    sourceSurface: sourceSurfaces.join("")
  };
}

function proportionalSourcePositionInSegmentSource(
  segmentSourceSpan: SourceTokenSpan,
  projection: ParentheticalProportionalProjection,
  sourceTokens: readonly RuntimeHaruToken[]
): { readonly offset: number; readonly length: number } | null {
  let offset: number | null = null;
  let length = 0;
  for (const token of sourceTokens) {
    const tokenSpan = token.sourceSpan ?? null;
    if (tokenSpan === null || !sourceSpanContains(segmentSourceSpan, tokenSpan)) {
      continue;
    }
    if (sourceSpanEquals(tokenSpan, projection.sourceSpan)) {
      offset = length + projection.sourceOffset;
    }
    length += codepointLength(token.surface);
  }
  if (offset !== null && length > 0) {
    return { offset, length };
  }
  if (sourceSpanEquals(segmentSourceSpan, projection.sourceSpan)) {
    return { offset: projection.sourceOffset, length: projection.sourceLength };
  }
  return null;
}

function proportionalTargetCodepointOffset(
  sourceOffset: number,
  sourceLength: number,
  targetLength: number
): number {
  const rounded = Math.round((sourceOffset / sourceLength) * targetLength);
  if (rounded < 1) {
    return 1;
  }
  if (rounded >= targetLength) {
    return targetLength - 1;
  }
  return rounded;
}

function codeUnitOffsetForCodepointOffset(text: string, codepointOffset: number): number {
  return Array.from(text).slice(0, codepointOffset).join("").length;
}

function sourceSpanContains(outer: SourceTokenSpan, inner: SourceTokenSpan): boolean {
  return outer.startOrdinal <= inner.startOrdinal && outer.endOrdinal >= inner.endOrdinal;
}

function sourceSpanEquals(left: SourceTokenSpan, right: SourceTokenSpan): boolean {
  return left.startOrdinal === right.startOrdinal && left.endOrdinal === right.endOrdinal;
}

function parentheticalProjectionFallbackWarning(island: ParentheticalIsland): Warning {
  const projection = island.proportionalProjection;
  const sourceSurface = projection?.sourceSurface ?? "source span";
  return {
    type: "parenthetical_projection_fallback",
    severity: "warning",
    opKind: "parenthetical_proportional_projection",
    message: `parenthetical island was restored by proportional target placement inside ${sourceSurface}.`
  };
}

interface ParentheticalTargetInsertion {
  readonly index: number;
  readonly confidence: ProjectionConfidence;
}

function isRestoredParentheticalDelimiterSegment(segment: TargetSegment): boolean {
  return (segment.kind === "parenthetical" || segment.kind === "annotation") &&
    segment.renderPlanKind === null &&
    segment.unit === null;
}

function parentheticalInsertionBeforeLaterRestoredIslands(
  segments: readonly TargetSegment[],
  index: number,
  island: ParentheticalIsland
): number {
  let result = index;
  while (result > 0) {
    const closing = segments[result - 1];
    if (
      closing === undefined ||
      !isRestoredParentheticalDelimiterSegment(closing) ||
      closing.attachLeft !== true
    ) {
      return result;
    }
    let depth = 0;
    let cursor = result - 1;
    for (; cursor >= 0; cursor -= 1) {
      const segment = segments[cursor]!;
      if (!isRestoredParentheticalDelimiterSegment(segment)) {
        continue;
      }
      if (segment.attachLeft === true) {
        depth += 1;
      } else if (segment.attachRight === true) {
        depth -= 1;
        if (depth === 0) {
          break;
        }
      }
    }
    const opening = cursor >= 0 ? segments[cursor] : undefined;
    if (
      opening === undefined ||
      opening.sourceSpan === null ||
      opening.sourceSpan.startOrdinal < island.sourceSpan.endOrdinal
    ) {
      return result;
    }
    result = cursor;
  }
  return result;
}

function targetInsertionForParenthetical(
  segments: readonly TargetSegment[],
  island: ParentheticalIsland
): ParentheticalTargetInsertion {
  let exactAfterIndex: number | null = null;
  for (const [index, segment] of segments.entries()) {
    if (
      sourceBoundaryEquals(segment.boundaryAfter, island.sourceBoundary) &&
      segment.text.trim().length > 0 &&
      !isRestoredParentheticalDelimiterSegment(segment)
    ) {
      exactAfterIndex = index + 1;
    }
  }
  if (exactAfterIndex !== null) {
    return { index: exactAfterIndex, confidence: "exact" };
  }
  for (const [index, segment] of segments.entries()) {
    if (sourceBoundaryEquals(segment.boundaryBefore, island.sourceBoundary)) {
      return { index, confidence: "exact" };
    }
  }
  const afterOrdinal = island.sourceBoundary.afterOrdinal;
  if (afterOrdinal !== null) {
    for (const [index, segment] of segments.entries()) {
      const span = segment.sourceSpan;
      if (span !== null && span.startOrdinal < afterOrdinal && span.endOrdinal > afterOrdinal) {
        return { index: index + 1, confidence: "fallback" };
      }
    }
  }
  for (const [index, segment] of segments.entries()) {
    if (segment.sourceSpan !== null && segment.sourceSpan.startOrdinal >= island.sourceSpan.endOrdinal) {
      return { index, confidence: "fallback" };
    }
  }
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const span = segments[index]?.sourceSpan;
    if (span !== undefined && span !== null && span.endOrdinal <= island.sourceSpan.startOrdinal) {
      return { index: index + 1, confidence: "fallback" };
    }
  }
  return { index: segments.length, confidence: "fallback" };
}

function normalizeParentheticalInsertionAtKoreanBoundary(
  segments: TargetSegment[],
  insertionIndex: number
): number {
  if (insertionIndex <= 0 || insertionIndex >= segments.length) {
    return insertionIndex;
  }
  const previous = segments[insertionIndex - 1];
  const next = segments[insertionIndex];
  if (previous === undefined || next === undefined || !isHeadTailConnectiveSegment(next)) {
    return insertionIndex;
  }
  if (next.text.startsWith("다고") && !previous.text.endsWith("다")) {
    segments[insertionIndex - 1] = { ...previous, text: `${previous.text}다` };
    segments[insertionIndex] = { ...next, text: next.text.slice(1) };
    return insertionIndex;
  }
  if (next.text.startsWith("라는") && !previous.text.endsWith("라")) {
    segments[insertionIndex - 1] = { ...previous, text: `${previous.text}라` };
    segments[insertionIndex] = { ...next, text: next.text.slice(1) };
    return insertionIndex;
  }
  if (isUnsafeKoreanConnectiveInternalBoundary(previous, next)) {
    return insertionIndex + 1;
  }
  return insertionIndex;
}

function isHeadTailConnectiveSegment(segment: TargetSegment): boolean {
  return segment.kind === "connective" && segment.renderPlanKind === "headTailChain";
}

function isUnsafeKoreanConnectiveInternalBoundary(
  previous: TargetSegment,
  next: TargetSegment
): boolean {
  if (next.text !== "지만") {
    return false;
  }
  return previous.kind === "lexeme" || previous.kind === "aux";
}

function parentheticalTargetSegments(
  island: ParentheticalIsland,
  innerSegments: readonly TargetSegment[],
  projectionConfidence: ProjectionConfidence
): readonly TargetSegment[] {
  if (island.pause !== undefined) {
    return [{
      text: island.pause.surface,
      sourceSpan: island.sourceSpan,
      boundaryBefore: sourceBoundaryBeforeSourceSpan(island.sourceSpan),
      boundaryAfter: sourceBoundaryAfterSourceSpan(island.sourceSpan),
      unit: null,
      renderPlanKind: null,
      kind: "punctuation",
      annotationKeys: [island.pause.key],
      attachLeft: true,
      transparentPause: true,
      transparentForAllomorph: true,
      projectionConfidence
    }];
  }
  if (island.rubyAnnotationKey !== undefined) {
    return innerSegments.map(seg => ({
      ...seg,
      annotationKeys: [...(seg.annotationKeys ?? []), island.rubyAnnotationKey!]
    }));
  }
  const openingSpan: SourceTokenSpan = {
    startOrdinal: island.sourceSpan.startOrdinal,
    endOrdinal: island.sourceSpan.startOrdinal + 1
  };
  const closingStartOrdinal = Math.max(island.sourceSpan.startOrdinal, island.sourceSpan.endOrdinal - 1);
  const closingSpan: SourceTokenSpan = {
    startOrdinal: closingStartOrdinal,
    endOrdinal: closingStartOrdinal + 1
  };
  const segmentKind = parentheticalDelimiterTargetSegmentKind(island.delimiter.open);
  return [
    {
      text: island.delimiter.open,
      sourceSpan: openingSpan,
      boundaryBefore: sourceBoundaryBeforeSourceSpan(openingSpan),
      boundaryAfter: sourceBoundaryAfterSourceSpan(openingSpan),
      unit: null,
      renderPlanKind: null,
      kind: segmentKind,
      ...(island.delimiterAnnotationKeys?.open !== undefined ? {
        annotationKeys: island.delimiterAnnotationKeys.open
      } : {}),
      attachRight: true,
      transparentForAllomorph: true,
      projectionConfidence
    },
    ...innerSegments,
    {
      text: island.delimiter.close,
      sourceSpan: closingSpan,
      boundaryBefore: sourceBoundaryBeforeSourceSpan(closingSpan),
      boundaryAfter: sourceBoundaryAfterSourceSpan(closingSpan),
      unit: null,
      renderPlanKind: null,
      kind: segmentKind,
      ...(island.delimiterAnnotationKeys?.close !== undefined ? {
        annotationKeys: island.delimiterAnnotationKeys.close
      } : {}),
      attachLeft: true,
      transparentForAllomorph: true,
      projectionConfidence
    }
  ];
}

function parentheticalDelimiterTargetSegmentKind(openingSurface: string): EnclosingDelimiterKind & TargetSegment["kind"] {
  return openingSurface === "[" || openingSurface === "［"
    ? "annotation"
    : "parenthetical";
}

function restoreWordBoundaryAfterParenthetical(
  segments: TargetSegment[],
  insertionIndex: number,
  islandLength: number
): void {
  if (islandLength === 0) {
    return;
  }
  const before = segments[insertionIndex - 1];
  const afterIndex = insertionIndex + islandLength;
  const after = segments[afterIndex];
  if (before === undefined || after === undefined) {
    return;
  }
  if (before.consumedWordBoundaryAfter !== true || /^\s/u.test(after.text)) {
    return;
  }
  if (!isSemanticParentheticalRightSegment(after)) {
    return;
  }
  segments.splice(afterIndex, 0, {
    text: " ",
    sourceSpan: null,
    boundaryBefore: null,
    boundaryAfter: null,
    unit: null,
    renderPlanKind: null,
    kind: "synthetic",
    transparentForAllomorph: true,
    projectionConfidence: "fallback"
  });
}

function shouldSuppressIntraOwnerSpaceForParenthetical(
  segments: readonly TargetSegment[],
  insertionIndex: number
): boolean {
  const spacer = segments[insertionIndex];
  const previous = segments[insertionIndex - 1];
  const next = segments[insertionIndex + 1];
  return spacer !== undefined &&
    previous !== undefined &&
    next !== undefined &&
    spacer.sourceSpan === null &&
    /^\s+$/.test(spacer.text) &&
    spacer.renderPlanKind !== null &&
    previous.renderPlanKind === spacer.renderPlanKind &&
    next.renderPlanKind === spacer.renderPlanKind &&
    targetSourceSpanEquals(previous.sourceSpan, next.sourceSpan);
}

function targetSourceSpanEquals(
  left: TargetSegment["sourceSpan"],
  right: TargetSegment["sourceSpan"]
): boolean {
  if (left === null || right === null) return false;
  return left.startOrdinal === right.startOrdinal && left.endOrdinal === right.endOrdinal;
}

function sourceBoundaryEquals(
  left: SourceTokenBoundary | null,
  right: SourceTokenBoundary | null
): boolean {
  return left !== null &&
    right !== null &&
    left.beforeOrdinal === right.beforeOrdinal &&
    left.afterOrdinal === right.afterOrdinal;
}

function collectPreparedAnnotationTokens(prepared: PreparedTranslation): RuntimeHaruToken[] {
  const tokens: RuntimeHaruToken[] = [...(prepared.tokens as RuntimeHaruToken[])];
  for (const island of prepared.parentheticalIslands ?? []) {
    tokens.push(...collectPreparedAnnotationTokens(island.innerPrepared));
  }
  return tokens.sort((left, right) => sourceOrderForToken(left) - sourceOrderForToken(right));
}

function assignParentheticalDelimiterAnnotationKeys(
  prepared: PreparedTranslation,
  metadata: ReadonlyMap<number, AnnotationMetadata> | undefined
): void {
  if (metadata === undefined) return;
  for (const [key, point] of metadata) {
    if (point.kind !== "char-point") continue;
    assignParentheticalDelimiterAnnotationKey(prepared, key, point.cleanOffset);
  }
}

function assignParentheticalDelimiterAnnotationKey(
  prepared: PreparedTranslation,
  key: number,
  cleanOffset: number
): boolean {
  for (const island of prepared.parentheticalIslands ?? []) {
    const span = island.delimiterTextSpan;
    if (span !== undefined && cleanOffset === span.open.start) {
      removeAnnotationKeyFromPrepared(prepared, key);
      addParentheticalDelimiterAnnotationKey(island, "open", key);
      return true;
    }
    if (span !== undefined && cleanOffset === span.close.end) {
      removeAnnotationKeyFromPrepared(prepared, key);
      addParentheticalDelimiterAnnotationKey(island, "close", key);
      return true;
    }
    if (assignParentheticalDelimiterAnnotationKey(island.innerPrepared, key, cleanOffset)) {
      return true;
    }
  }
  return false;
}

function addParentheticalDelimiterAnnotationKey(
  island: ParentheticalIsland,
  side: "open" | "close",
  key: number
): void {
  const mutable = island as unknown as {
    delimiterAnnotationKeys?: {
      open?: readonly number[];
      close?: readonly number[];
    };
  };
  const current = mutable.delimiterAnnotationKeys ?? {};
  const keys = new Set(current[side] ?? []);
  keys.add(key);
  mutable.delimiterAnnotationKeys = {
    ...current,
    [side]: Array.from(keys)
  };
}

function assignParentheticalDelimiterSegmentKeys(
  prepared: PreparedTranslation,
  segments: readonly AnnotatedSegment[],
  metadata: ReadonlyMap<number, AnnotationMetadata> | undefined
): void {
  const islands = prepared.parentheticalIslands;
  if (islands === undefined || islands.length === 0) return;

  const charPointKeySet = new Set<number>();
  if (metadata !== undefined) {
    for (const [key, entry] of metadata) {
      if (entry.kind === "char-point") charPointKeySet.add(key);
    }
  }

  const charKeys: (readonly number[])[] = [];
  for (const seg of segments) {
    const keys = charPointKeySet.size > 0
      ? (seg.keys ?? []).filter(k => !charPointKeySet.has(k))
      : (seg.keys ?? []);
    for (const _ch of seg.text) {
      charKeys.push(keys);
    }
  }

  propagateDelimiterKeysFromChars(islands, charKeys, 0);
}

function propagateDelimiterKeysFromChars(
  islands: readonly ParentheticalIsland[],
  charKeys: readonly (readonly number[])[],
  baseOffset: number
): void {
  for (const island of islands) {
    const span = island.delimiterTextSpan;
    if (span === undefined) continue;

    for (let i = span.open.start; i < span.open.end; i += 1) {
      const keys = charKeys[baseOffset + i];
      if (keys !== undefined) {
        for (const key of keys) {
          addParentheticalDelimiterAnnotationKey(island, "open", key);
        }
      }
    }

    for (let i = span.close.start; i < span.close.end; i += 1) {
      const keys = charKeys[baseOffset + i];
      if (keys !== undefined) {
        for (const key of keys) {
          addParentheticalDelimiterAnnotationKey(island, "close", key);
        }
      }
    }

    const innerIslands = island.innerPrepared.parentheticalIslands;
    if (innerIslands !== undefined && innerIslands.length > 0) {
      propagateDelimiterKeysFromChars(innerIslands, charKeys, baseOffset + span.open.end);
    }
  }
}

function removeAnnotationKeyFromPrepared(
  prepared: PreparedTranslation,
  key: number
): void {
  for (const token of prepared.tokens as RuntimeHaruToken[]) {
    removeAnnotationKeyFromToken(token, key);
  }
  for (const island of prepared.parentheticalIslands ?? []) {
    removeAnnotationKeyFromPrepared(island.innerPrepared, key);
  }
}

function removeAnnotationKeyFromToken(token: RuntimeHaruToken, key: number): void {
  if (token.annotationKeys === undefined) return;
  const next = token.annotationKeys.filter((candidate) => candidate !== key);
  if (next.length === 0) {
    delete token.annotationKeys;
  } else if (next.length !== token.annotationKeys.length) {
    token.annotationKeys = next;
  }
}

async function resolvePreparedRubyAnnotations(
  prepared: PreparedTranslation,
  table: ReadonlyMap<number, AnnotationEntry>,
  prepareTranslation: (text: string) => Promise<PreparedTranslation>
): Promise<void> {
  const tokens = prepared.tokens as RuntimeHaruToken[];
  const islandRequests = resolveRubyAnnotations(tokens, table);

  if (islandRequests.length > 0) {
    const newIslands: ParentheticalIsland[] = [];
    for (const req of islandRequests) {
      const anchorOrdinal = req.baseEndOrdinal;

      const innerPrepared = shiftPreparedSourceIdentity(
        await prepareTranslation(req.rubyText),
        anchorOrdinal + 1
      );

      const islandWidth = preparedSourceWidth(innerPrepared);
      const sourceBoundary: SourceTokenBoundary = {
        beforeOrdinal: anchorOrdinal > 0 ? anchorOrdinal - 1 : null,
        afterOrdinal: anchorOrdinal
      };

      newIslands.push({
        id: `ruby:${anchorOrdinal}:${anchorOrdinal + islandWidth}`,
        delimiter: { open: "", close: "" },
        sourceBoundary,
        sourceSpan: { startOrdinal: anchorOrdinal, endOrdinal: anchorOrdinal + islandWidth },
        innerPrepared,
        nestingDepth: 0,
        rubyAnnotationKey: req.rubyAnnotationKey
      });
    }

    if (newIslands.length > 0) {
      const mutable = prepared as unknown as { parentheticalIslands?: ParentheticalIsland[] };
      const existing = mutable.parentheticalIslands ?? [];
      mutable.parentheticalIslands = [...existing, ...newIslands];
    }
  }

  for (const island of prepared.parentheticalIslands ?? []) {
    await resolvePreparedRubyAnnotations(island.innerPrepared, table, prepareTranslation);
  }
}

function transparentPauseJunctions(input: AnnotatedText): ReadonlySet<number> {
  const junctions = new Set<number>();
  for (const [key, entry] of input.table) {
    if (entry.kind !== "transparent-pause") continue;
    const point = input.metadata?.get(key);
    if (point?.kind === "char-point") {
      junctions.add(point.cleanOffset);
    }
  }
  return junctions;
}

function appendTransparentPauseIslands(
  prepared: PreparedTranslation,
  segments: readonly AnnotatedSegment[],
  table: ReadonlyMap<number, AnnotationEntry>,
  metadata: ReadonlyMap<number, AnnotationMetadata> | undefined
): void {
  if (metadata === undefined) return;
  let hasPauseKey = false;
  for (const entry of table.values()) {
    if (entry.kind === "transparent-pause") {
      hasPauseKey = true;
      break;
    }
  }
  if (!hasPauseKey) return;
  const placements = charPointPlacements(segments, collectPreparedTokensInTextOrder(prepared), metadata);
  for (const placement of placements) {
    if (table.get(placement.key)?.kind !== "transparent-pause") continue;
    const point = metadata.get(placement.key);
    if (point?.kind !== "char-point" || point.restore === undefined) continue;
    const target = transparentPauseIslandTarget(prepared, placement);
    if (target === null) continue;
    const island = transparentPauseIsland(placement.key, point, target.boundary, target.anchor, target.projection);
    const mutable = target.owner as unknown as { parentheticalIslands?: ParentheticalIsland[] };
    mutable.parentheticalIslands = [...(mutable.parentheticalIslands ?? []), island];
  }
}

function collectPreparedTokensInTextOrder(prepared: PreparedTranslation): RuntimeHaruToken[] {
  const result: RuntimeHaruToken[] = [];
  const islands = (prepared.parentheticalIslands ?? [])
    .filter((island) => island.rubyAnnotationKey === undefined && island.pause === undefined)
    .sort((left, right) =>
      (left.sourceBoundary.afterOrdinal ?? Number.MAX_SAFE_INTEGER) -
      (right.sourceBoundary.afterOrdinal ?? Number.MAX_SAFE_INTEGER)
    );
  let islandIndex = 0;
  for (const token of prepared.tokens) {
    const ordinal = token.sourceSpan?.startOrdinal ?? token.sourceOrdinal ?? null;
    while (
      islandIndex < islands.length &&
      ordinal !== null &&
      (islands[islandIndex]!.sourceBoundary.afterOrdinal ?? Number.MAX_SAFE_INTEGER) <= ordinal
    ) {
      result.push(...collectPreparedTokensInTextOrder(islands[islandIndex]!.innerPrepared));
      islandIndex += 1;
    }
    result.push(token);
  }
  while (islandIndex < islands.length) {
    result.push(...collectPreparedTokensInTextOrder(islands[islandIndex]!.innerPrepared));
    islandIndex += 1;
  }
  return result;
}

function preparedChainOfToken(
  prepared: PreparedTranslation,
  token: RuntimeHaruToken
): PreparedTranslation[] | null {
  if (prepared.tokens.includes(token)) {
    return [prepared];
  }
  for (const island of prepared.parentheticalIslands ?? []) {
    if (island.pause !== undefined || island.rubyAnnotationKey !== undefined) continue;
    const chain = preparedChainOfToken(island.innerPrepared, token);
    if (chain !== null) {
      return [prepared, ...chain];
    }
  }
  return null;
}

interface TransparentPauseIslandTarget {
  readonly owner: PreparedTranslation;
  readonly boundary: SourceTokenBoundary;
  readonly anchor: number;
  readonly projection?: ParentheticalProportionalProjection;
}

function transparentPauseIslandTarget(
  prepared: PreparedTranslation,
  placement: CharPointPlacement
): TransparentPauseIslandTarget | null {
  if (placement.kind === "inside") {
    const token = placement.insideToken;
    const tokenSpan = token?.sourceSpan ?? null;
    if (token === null || tokenSpan === null || placement.insideOffset === null) {
      return null;
    }
    const chain = preparedChainOfToken(prepared, token);
    if (chain === null) {
      return null;
    }
    const projection = proportionalProjectionForTokenInternalOffset(token, placement.insideOffset);
    return {
      owner: chain[chain.length - 1]!,
      boundary: sourceBoundaryAfterSourceSpan(tokenSpan),
      anchor: tokenSpan.endOrdinal,
      ...(projection === null ? {} : { projection })
    };
  }
  const leftChain = placement.leftToken === null ? null : preparedChainOfToken(prepared, placement.leftToken);
  const rightChain = placement.rightToken === null ? null : preparedChainOfToken(prepared, placement.rightToken);
  const leftSpan = placement.leftToken?.sourceSpan ?? null;
  const rightSpan = placement.rightToken?.sourceSpan ?? null;
  if (leftChain === null && rightChain === null) {
    return null;
  }
  if (leftChain !== null && rightChain !== null) {
    if (leftChain[leftChain.length - 1] === rightChain[rightChain.length - 1]) {
      const boundary = sourceBoundaryBetweenSourceSpans(leftSpan, rightSpan);
      return boundary.afterOrdinal === null
        ? null
        : { owner: leftChain[leftChain.length - 1]!, boundary, anchor: boundary.afterOrdinal };
    }
    let common = 0;
    while (common < leftChain.length && common < rightChain.length && leftChain[common] === rightChain[common]) {
      common += 1;
    }
    const owner = leftChain[common - 1]!;
    const boundary = rightChain.length === common
      ? sourceBoundaryBetweenSourceSpans(null, rightSpan)
      : sourceBoundaryBetweenSourceSpans(leftSpan, null);
    return boundary.afterOrdinal === null ? null : { owner, boundary, anchor: boundary.afterOrdinal };
  }
  const chain = leftChain ?? rightChain!;
  const boundary = leftChain !== null
    ? sourceBoundaryBetweenSourceSpans(leftSpan, null)
    : sourceBoundaryBetweenSourceSpans(null, rightSpan);
  return boundary.afterOrdinal === null
    ? null
    : { owner: chain[chain.length - 1]!, boundary, anchor: boundary.afterOrdinal };
}

function transparentPauseIsland(
  key: number,
  point: CharPointAnnotationMetadata,
  sourceBoundary: SourceTokenBoundary,
  anchorOrdinal: number,
  proportionalProjection: ParentheticalProportionalProjection | undefined
): ParentheticalIsland {
  return {
    id: `pause:${key}`,
    delimiter: { open: "", close: "" },
    sourceBoundary,
    sourceSpan: { startOrdinal: anchorOrdinal, endOrdinal: anchorOrdinal },
    ...(proportionalProjection === undefined ? {} : { proportionalProjection }),
    innerPrepared: { sourceText: "", tokens: [] },
    nestingDepth: 0,
    pause: {
      key,
      surface: outputPauseSurface(point.restore!.surface),
      point
    }
  };
}

function markTransparentPauseIslandMaterialized(island: ParentheticalIsland): void {
  if (island.pause === undefined) return;
  (island.pause.point as { materialized?: true }).materialized = true;
}

const TRANSPARENT_PAUSE_LEFT_DETACH_CHARS = new Set(
  Array.from("。．.!?！？…‥⋯、，,;；：:~～”』」’)）]］}｝")
);

function adjustTransparentPauseInsertionIndex(
  segments: readonly TargetSegment[],
  index: number
): number {
  const isSpacer = (segment: TargetSegment | undefined): boolean =>
    segment !== undefined && segment.sourceSpan === null && /^\s+$/u.test(segment.text);
  let adjusted = index;
  while (adjusted > 0 && isSpacer(segments[adjusted - 1])) {
    adjusted -= 1;
  }
  const leftContent = segments[adjusted - 1];
  const leftChars = Array.from(leftContent?.text.trimEnd() ?? "");
  const leftLast = leftChars[leftChars.length - 1];
  if (leftContent === undefined || (leftLast !== undefined && TRANSPARENT_PAUSE_LEFT_DETACH_CHARS.has(leftLast))) {
    adjusted = index;
    while (isSpacer(segments[adjusted])) {
      adjusted += 1;
    }
  }
  return adjusted;
}

function absorbWhitespaceAfterTransparentPauses(segments: TargetSegment[]): void {
  for (let index = 0; index < segments.length; index += 1) {
    if (segments[index]?.transparentPause !== true) continue;
    const next = index + 1;
    while (next < segments.length) {
      const segment = segments[next]!;
      if (segment.sourceSpan === null && /^\s+$/u.test(segment.text)) {
        segments.splice(next, 1);
        continue;
      }
      const stripped = segment.text.replace(/^\s+/u, "");
      if (stripped !== segment.text && stripped.length > 0) {
        segments[next] = { ...segment, text: stripped };
      }
      break;
    }
  }
}

function sourceOrderForToken(token: RuntimeHaruToken): number {
  return runtimeTokenSourceSpan(token)?.startOrdinal ?? Number.MAX_SAFE_INTEGER;
}

function preparedHasNonPunctuationContent(prepared: PreparedTranslation): boolean {
  return prepared.tokens.some((token) => !isBoundaryPunctuationCategoryToken(token)) ||
    (prepared.parentheticalIslands ?? []).some((island) =>
      island.pause === undefined && preparedHasNonPunctuationContent(island.innerPrepared));
}

function withEmbeddedTokenSpace(prepared: PreparedTranslation, embedded: boolean): PreparedTranslation {
  if (!embedded) {
    return prepared;
  }
  return {
    ...prepared,
    embeddedTokenSpace: true,
    ...(prepared.parentheticalIslands === undefined ? {} : {
      parentheticalIslands: prepared.parentheticalIslands.map((island) => ({
        ...island,
        innerPrepared: withEmbeddedTokenSpace(island.innerPrepared, true)
      }))
    })
  };
}

function withEnclosingDelimiter(prepared: PreparedTranslation, openingSurface: string): PreparedTranslation {
  return { ...prepared, enclosingDelimiter: parentheticalDelimiterTargetSegmentKind(openingSurface) };
}

function shiftPreparedSourceIdentity(prepared: PreparedTranslation, ordinalOffset: number): PreparedTranslation {
  if (ordinalOffset === 0) {
    return prepared;
  }
  return {
    ...prepared,
    tokens: prepared.tokens.map((token) => shiftRuntimeTokenSourceIdentity(token, ordinalOffset)),
    ...(prepared.rawTokens === undefined ? {} : {
      rawTokens: prepared.rawTokens.map((token) => shiftRuntimeTokenSourceIdentity(token, ordinalOffset))
    }),
    ...(prepared.finalizeFlipTokens === undefined ? {} : {
      finalizeFlipTokens: (tokens: RuntimeHaruToken[]) => prepared.finalizeFlipTokens!(
        tokens.map((token) => shiftRuntimeTokenSourceIdentity(token, -ordinalOffset))
      ).map((token) => shiftRuntimeTokenSourceIdentity(token, ordinalOffset))
    }),
    ...(prepared.parentheticalIslands === undefined ? {} : {
      parentheticalIslands: prepared.parentheticalIslands.map((island) => shiftParentheticalIslandSourceIdentity(island, ordinalOffset))
    })
  };
}

function shiftParentheticalIslandSourceIdentity(island: ParentheticalIsland, ordinalOffset: number): ParentheticalIsland {
  return {
    ...island,
    sourceBoundary: shiftSourceBoundary(island.sourceBoundary, ordinalOffset),
    sourceSpan: shiftSourceSpan(island.sourceSpan, ordinalOffset)!,
    innerPrepared: shiftPreparedSourceIdentity(island.innerPrepared, ordinalOffset)
  };
}

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

export function clearPipelineResourceCache(): void {
  morphemeDictionaryStateCache.clear();
  patternDictionaryStateCache.clear();
  collocationDictionaryStateCache.clear();
  reanalysisDictionaryStateCache.clear();
}

export { resolveDataDir, type DataPathOptions } from "./data-paths.js";

function runtimeTokenFromHaru(
  token: HaruToken,
  sourceSpan?: SourceTokenSpan
): RuntimeHaruToken {
  const runtime: RuntimeHaruToken = {
    surface: token.surface,
    ...(token.normalized_form === undefined ? {} : { normalizedForm: token.normalized_form }),
    dictionaryForm: token.dictionary_form,
    reading: token.reading,
    dictionaryFormReading: token.dictionary_form_reading,
    pos: token.pos,
    dictionaryId: token.dictionary_id,
    ...(token.removed_long_vowels === undefined || token.removed_long_vowels <= 0
      ? {}
      : {
        longVowelReduction: {
          removedCount: token.removed_long_vowels,
          reducedSurface: token.reduced_surface ?? token.surface
        }
      }),
    ...separationRuntimeFields(token.whitespace_before, token.whitespace_after),
    ...(token.source_char_start === undefined || token.source_char_end === undefined
      ? {}
      : { sourceCharSpan: { start: token.source_char_start, end: token.source_char_end } })
  };
  if (token.split_a !== undefined) {
    runtime.splitA = token.split_a.map((item) => runtimeTokenFromHaru(item));
  }
  if (token.split_b !== undefined) {
    runtime.splitB = token.split_b.map((item) => runtimeTokenFromHaru(item));
  }
  return sourceSpan === undefined
    ? runtime
    : withRuntimeTokenSourceSpan(runtime, sourceSpan);
}

function separationRuntimeFields(
  before: HaruWhitespaceMark | undefined,
  after: HaruWhitespaceMark | undefined
): Partial<Pick<RuntimeHaruToken, "whitespaceBefore" | "whitespaceAfter" | "sourceLineBreakBefore">> {
  const leading = before === undefined ? undefined : separationEvidenceFromMark(before, false);
  const trailing = after === undefined ? undefined : separationEvidenceFromMark(after, true);
  return {
    ...(leading === undefined ? {} : { whitespaceBefore: leading }),
    ...(trailing === undefined ? {} : { whitespaceAfter: trailing }),
    ...(before?.kind === "line" ? { sourceLineBreakBefore: true as const } : {})
  };
}

function withChunkBreakWitnesses(
  tokens: RuntimeHaruToken[],
  witnesses: ReadonlyMap<number, readonly WhitespaceJunctureBoundaryEvidence[]>
): RuntimeHaruToken[] {
  if (witnesses.size === 0) {
    return tokens;
  }
  return tokens.map((token) => {
    const evidence = token.whitespaceBefore;
    const runOrdinal = evidence?.runOrdinal;
    const runWitnesses = runOrdinal === undefined ? undefined : witnesses.get(runOrdinal);
    if (evidence === undefined || evidence.separation !== "chunk_break" || runWitnesses === undefined) {
      return token;
    }
    return { ...token, whitespaceBefore: { ...evidence, chunkBreakWitnesses: runWitnesses } };
  });
}

const SEPARATION_BY_RUN_MODE: Readonly<Record<WhitespaceRunMode, SeparationKind>> = {
  split: "chunk_break",
  barrier: "word_separator",
  skip: "letter_spacing"
};

function separationEvidenceFromMark(mark: HaruWhitespaceMark, atEdge: boolean): SeparationEvidence {
  const separation = SEPARATION_BY_RUN_MODE[mark.mode];
  return {
    separation,
    kind: mark.kind,
    width: mark.width,
    reason: atEdge
      ? "edge"
      : separation === "letter_spacing"
        ? "letter_spacing"
        : separation === "chunk_break"
          ? (mark.kind === "line" ? "chunk_break:line_break" : "chunk_break:boundary_event")
          : "default_word_separator",
    runOrdinal: mark.runOrdinal
  };
}

function matchTerminalRoleSurfaceChars(chars: readonly string[], idx: number, lookups: LookupTables): readonly [end: number, sfp: string] | undefined {
  for (const [surface, surfaceChars] of getTerminalRoleBaseSurfaceChars(lookups)) {
    if (chars.slice(idx, idx + surfaceChars.length).join("") !== surface) {
      continue;
    }
    let end = idx + surfaceChars.length;
    while (end < chars.length && lookups.TERMINAL_ROLE_LENGTHENERS.has(chars[end] ?? "")) {
      end += 1;
    }
    const sfp = lookups.TERMINAL_ROLE_SFP_BY_SURFACE.get(surface);
    if (sfp === undefined) {
      continue;
    }
    return [end, sfp];
  }
  return undefined;
}

function endsWithTerminalRoleSurfaceChars(chars: readonly string[], end: number, lookups: LookupTables): boolean {
  return getTerminalRoleBaseSurfaceChars(lookups).some(([surface, surfaceChars]) => {
    const start = end - surfaceChars.length;
    return start >= 0 && chars.slice(start, end).join("") === surface;
  });
}

function checkTerminalRoleHostChars(
  chars: readonly string[],
  idx: number,
  lookups: LookupTables,
  finalCheck: (char: string) => boolean
): boolean {
  const match = matchTerminalRoleSurfaceChars(chars, Math.max(0, idx - 2), lookups);
  if (match !== undefined && idx >= 2 && match[0] === idx) {
    return true;
  }

  let cursor = idx - 1;
  let skipped = false;
  while (cursor >= 0 && lookups.TERMINAL_ROLE_HOST_SKIP.has(chars[cursor] ?? "")) {
    skipped = true;
    cursor -= 1;
  }
  if (cursor < 0) {
    return false;
  }
  if (skipped && endsWithTerminalRoleSurfaceChars(chars, cursor + 1, lookups)) {
    return false;
  }
  return finalCheck(chars[cursor] ?? "");
}

function hasTerminalRoleHostChars(chars: readonly string[], idx: number, lookups: LookupTables): boolean {
  return checkTerminalRoleHostChars(chars, idx, lookups, (ch) => !lookups.TERMINAL_ROLE_PREV_DISALLOWED.has(ch));
}

function hasWeakFollowerPredicateHostChars(chars: readonly string[], idx: number, lookups: LookupTables): boolean {
  return checkTerminalRoleHostChars(chars, idx, lookups, (ch) => lookups.TERMINAL_ROLE_WEAK_HOST_ENDINGS.has(ch));
}

export function stripTerminalRoleTails(text: string, lookups: LookupTables): readonly [text: string, occurrences: readonly TerminalRoleOccurrence[]] {
  if (text.length === 0) {
    return [text, []];
  }

  const chars = Array.from(text);
  const stripped: string[] = [];
  const occurrences: TerminalRoleOccurrence[] = [];
  let index = 0;
  while (index < chars.length) {
    let matchedSurface = matchTerminalRoleSurfaceChars(chars, index, lookups);
    if (matchedSurface !== undefined) {
      const [nextIndex] = matchedSurface;
      const nextChar = chars[nextIndex] ?? "";
      if (!hasTerminalRoleHostChars(chars, index, lookups)) {
        matchedSurface = undefined;
      } else if (nextChar.length > 0 && !lookups.TERMINAL_ROLE_FOLLOWERS.has(nextChar)) {
        const chained = matchTerminalRoleSurfaceChars(chars, nextIndex, lookups);
        if (chained === undefined) {
          matchedSurface = undefined;
        }
      } else if (lookups.GRAMMAR_BOUNDARY_CLAUSE_PAUSE_SURFACES.has(nextChar) && !hasWeakFollowerPredicateHostChars(chars, index, lookups)) {
        matchedSurface = undefined;
      }
    }
    if (matchedSurface !== undefined) {
      let [consumeEnd, sfp] = matchedSurface;
      while (true) {
        occurrences.push({ pos: stripped.length, sfp });
        const chained = matchTerminalRoleSurfaceChars(chars, consumeEnd, lookups);
        if (chained === undefined) {
          break;
        }
        const [chainedEnd, chainedSfp] = chained;
        const chainedNextChar = chars[chainedEnd] ?? "";
        if (chainedNextChar.length > 0 && !lookups.TERMINAL_ROLE_FOLLOWERS.has(chainedNextChar)) {
          break;
        }
        sfp = chainedSfp;
        consumeEnd = chainedEnd;
      }
      index = consumeEnd;
      continue;
    }
    stripped.push(chars[index] ?? "");
    index += 1;
  }
  return [stripped.join(""), occurrences];
}

function normalizeCatMeowTokens(tokens: RuntimeHaruToken[]): void {
  for (const [index, token] of tokens.entries()) {
    if (!isMeowParticle(token)) {
      continue;
    }
    const prev = index > 0 ? tokens[index - 1] : undefined;
    const next = index + 1 < tokens.length ? tokens[index + 1] : undefined;
    if (!(isMeowLike(prev) || isMeowLike(next) || (isPunctOrNone(prev) && isPunctOrNone(next)))) {
      continue;
    }
    token.surface = "냐";
    token.dictionaryForm = "냐";
    token.reading = "냐";
    token.pos = 名詞_普通名詞;
  }
}

function isMeowParticle(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined && (token.surface === "にゃ" || token.surface === "ニャ") && (token.pos & POS0) === 助詞;
}

function isMeowLike(token: RuntimeHaruToken | undefined): boolean {
  return isMeowParticle(token) || (token !== undefined && token.surface === "냐" && (token.pos & POS0) === 名詞);
}

function isPunctOrNone(token: RuntimeHaruToken | undefined): boolean {
  return token === undefined || (token.pos & POS0) === 補助記号;
}

function isAllKatakana(text: string): boolean {
  return text.length > 0 && [...text].every((ch) => "゠" <= ch && ch <= "ヿ");
}

function normalizeInferredRubyReadingToKatakana(reading: string): string | null {
  if (/\s/u.test(reading)) {
    return null;
  }
  const katakana = normalizeKana(reading);
  return katakana.length > 0 ? katakana : null;
}

function normalizeDeclaredRubyReadingToKatakana(reading: string): string | null {
  const katakana = normalizeKana(reading.replace(/\s+/gu, ""));
  return katakana.length > 0 ? katakana : null;
}

function isInferredRubyReadingSurface(text: string): boolean {
  return normalizeInferredRubyReadingToKatakana(text) !== null;
}

interface RubyPair {
  readonly baseKey: number;
  readonly rubyKey: number;
  readonly baseIndices: number[];
  readonly rubyIndices: number[];
}

function findRubyPairs(
  tokens: readonly RuntimeHaruToken[],
  table: ReadonlyMap<number, AnnotationEntry>
): RubyPair[] {
  const baseKeys = new Set<number>();
  const rubyKeys = new Set<number>();
  for (const [key, entry] of table) {
    if (entry.kind === "ruby-base") baseKeys.add(key);
    else if (entry.kind === "ruby") rubyKeys.add(key);
  }
  if (baseKeys.size === 0 || rubyKeys.size === 0) return [];

  const pairs: RubyPair[] = [];
  let currentBase: { key: number; indices: number[] } | null = null;

  for (let i = 0; i < tokens.length; i++) {
    const keys = tokens[i]?.annotationKeys;
    if (keys === undefined) {
      if (currentBase !== null) currentBase = null;
      continue;
    }
    const bk = keys.find(k => baseKeys.has(k));
    const rk = keys.find(k => rubyKeys.has(k));

    if (bk !== undefined) {
      if (currentBase === null || currentBase.key !== bk) {
        currentBase = { key: bk, indices: [] };
      }
      currentBase.indices.push(i);
    } else if (rk !== undefined && currentBase !== null) {
      let existing = pairs.find(p => p.baseKey === currentBase!.key && p.rubyKey === rk);
      if (existing === undefined) {
        existing = { baseKey: currentBase.key, rubyKey: rk, baseIndices: [...currentBase.indices], rubyIndices: [] };
        pairs.push(existing);
      }
      existing.rubyIndices.push(i);
    } else {
      currentBase = null;
    }
  }

  return pairs;
}

interface UnabsorbedRubyIslandRequest {
  readonly rubyText: string;
  readonly rubyAnnotationKey: number;
  readonly baseEndOrdinal: number;
}

function resolveRubyAnnotations(
  tokens: RuntimeHaruToken[],
  table: ReadonlyMap<number, AnnotationEntry>
): UnabsorbedRubyIslandRequest[] {
  const pairs = findRubyPairs(tokens, table);
  if (pairs.length === 0) return [];

  const removeSet = new Set<number>();
  const islandRequests: UnabsorbedRubyIslandRequest[] = [];

  for (const pair of pairs) {
    const baseSurface = pair.baseIndices.map(i => tokens[i]!.surface).join("");
    const rubySurface = pair.rubyIndices.map(i => tokens[i]!.surface).join("");
    const rubyKatakana = normalizeDeclaredRubyReadingToKatakana(rubySurface);

    const absorbed = (() => {
      if (rubyKatakana === null) return false;
      const alignment = alignReading(baseSurface, rubyKatakana);
      const baseReading = pair.baseIndices.map(i => tokens[i]!.reading).join("");
      const isJukujikun = alignment === null && rubyKatakana === baseReading;
      if (alignment === null && !isJukujikun) return false;

      if (alignment !== null) {
        let alignIdx = 0;
        for (const i of pair.baseIndices) {
          const token = tokens[i]!;
          const chars = Array.from(token.surface);
          const segments: string[] = [];
          for (let c = 0; c < chars.length && alignIdx < alignment.length; c++, alignIdx++) {
            segments.push(alignment[alignIdx]![1]);
          }
          const newReading = segments.join("");
          if (newReading.length > 0) {
            token.reading = newReading;
            token.dictionaryFormReading = newReading;
          }
        }
      }
      for (const i of pair.baseIndices) {
        const token = tokens[i]!;
        if (token.annotationKeys !== undefined) {
          token.annotationKeys = token.annotationKeys.filter(k => k !== pair.baseKey);
          if (token.annotationKeys.length === 0) delete token.annotationKeys;
        }
      }
      return true;
    })();

    if (!absorbed) {
      const lastBaseToken = tokens[pair.baseIndices[pair.baseIndices.length - 1]!]!;
      const baseEndOrdinal = lastBaseToken.sourceSpan?.endOrdinal
        ?? ((lastBaseToken.sourceOrdinal ?? 0) + 1);
      islandRequests.push({
        rubyText: rubySurface,
        rubyAnnotationKey: pair.rubyKey,
        baseEndOrdinal
      });
    }

    for (const i of pair.rubyIndices) {
      removeSet.add(i);
    }
  }

  if (removeSet.size > 0) {
    let dst = 0;
    for (let src = 0; src < tokens.length; src++) {
      if (!removeSet.has(src)) {
        tokens[dst++] = tokens[src]!;
      }
    }
    tokens.length = dst;
  }

  return islandRequests;
}

interface ParentheticalRubyAbsorption {
  readonly tokenStart: number;
  readonly charStartInToken: number;
  readonly alignment: readonly AlignmentForSurfaceChar[];
}

interface AlignmentForSurfaceChar {
  readonly surface: string;
  readonly reading: string;
}

function absorbParentheticalRubyIslands(prepared: PreparedTranslation): void {
  for (const island of prepared.parentheticalIslands ?? []) {
    absorbParentheticalRubyIslands(island.innerPrepared);
  }

  const islands = prepared.parentheticalIslands ?? [];
  if (islands.length === 0) return;

  const tokens = prepared.tokens as RuntimeHaruToken[];
  const remaining: ParentheticalIsland[] = [];
  for (const island of islands) {
    if (!absorbParentheticalRubyIsland(tokens, island, prepared.sourceText)) {
      remaining.push(island);
    }
  }

  const mutable = prepared as unknown as { parentheticalIslands?: ParentheticalIsland[] };
  if (remaining.length === 0) {
    delete mutable.parentheticalIslands;
  } else if (remaining.length !== islands.length) {
    mutable.parentheticalIslands = remaining;
  }
}

function absorbParentheticalRubyIsland(
  tokens: RuntimeHaruToken[],
  island: ParentheticalIsland,
  sourceText: string
): boolean {
  if (
    island.pause !== undefined ||
    island.rubyAnnotationKey !== undefined ||
    !isPlainKanaParenthetical(island)
  ) {
    return false;
  }

  const rubyKatakana = normalizeInferredRubyReadingToKatakana(island.innerPrepared.sourceText);
  if (rubyKatakana === null) return false;

  const absorption = parentheticalRubyAbsorptionBefore(tokens, island, rubyKatakana);
  if (absorption === null) {
    return parentheticalRubyGlossAlreadyRealizedInHostToken(tokens, island, rubyKatakana, sourceText);
  }

  applyParentheticalRubyAbsorption(tokens, absorption);
  return true;
}

function parentheticalRubyGlossAlreadyRealizedInHostToken(
  tokens: readonly RuntimeHaruToken[],
  island: ParentheticalIsland,
  rubyKatakana: string,
  sourceText: string
): boolean {
  const anchor = island.sourceBoundary.afterOrdinal;
  if (anchor === null) return false;
  const openSpan = island.delimiterTextSpan?.open;
  if (openSpan === undefined) return false;
  const textBeforeIsland = Array.from(sourceText).slice(0, openSpan.start).join("");
  return tokens.some((token) => {
    const span = token.sourceSpan;
    if (span === undefined || span === null) return false;
    if (span.startOrdinal > anchor || anchor > span.endOrdinal) return false;
    const kanjiRun = leadingKanjiRun(token.surface);
    if (kanjiRun.length === 0 || !textBeforeIsland.endsWith(kanjiRun)) return false;
    return tokenReadingRealizesLeadingKanjiGloss(token, rubyKatakana);
  });
}

function leadingKanjiRun(surface: string): string {
  const chars = Array.from(surface);
  let end = 0;
  while (end < chars.length && isKanji(chars[end]!)) {
    end += 1;
  }
  return chars.slice(0, end).join("");
}

function tokenReadingRealizesLeadingKanjiGloss(
  token: RuntimeHaruToken,
  rubyKatakana: string
): boolean {
  if (token.reading === undefined) return false;
  const chars = Array.from(token.surface);
  const kanjiRunEnd = Array.from(leadingKanjiRun(token.surface)).length;
  if (kanjiRunEnd === 0 || kanjiRunEnd === chars.length) return false;
  const kanaTailKatakana = normalizeInferredRubyReadingToKatakana(chars.slice(kanjiRunEnd).join(""));
  if (kanaTailKatakana === null) return false;
  return token.reading === `${rubyKatakana}${kanaTailKatakana}`;
}

function isPlainKanaParenthetical(island: ParentheticalIsland): boolean {
  if (island.delimiter.open !== "(" && island.delimiter.open !== "（") return false;
  if (island.innerPrepared.pureMeow !== undefined) return false;
  if ((island.innerPrepared.parentheticalIslands ?? []).length > 0) return false;
  const innerText = island.innerPrepared.sourceText;
  return innerText.length > 0 && isInferredRubyReadingSurface(innerText);
}

const PARENTHETICAL_RUBY_BASE_CLOSING_KINDS: ReadonlySet<UtteranceClosureKind> = new Set([
  "hard_terminal",
  "matched_delimiter_close",
  "unmatched_trailing",
  "label_separator"
]);

function parentheticalRubyAbsorptionBefore(
  tokens: readonly RuntimeHaruToken[],
  island: ParentheticalIsland,
  rubyKatakana: string
): ParentheticalRubyAbsorption | null {
  const anchor = island.sourceBoundary.afterOrdinal;
  if (anchor === null) return null;

  const before: { readonly token: RuntimeHaruToken; readonly index: number }[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    const span = token.sourceSpan ?? null;
    if (span !== null && span.endOrdinal <= anchor) {
      before.push({ token, index });
    }
  }
  if (before.length === 0) return null;

  const lastBefore = before.length - 1;
  for (let tokenStart = lastBefore; tokenStart >= 0; tokenStart -= 1) {
    if (
      tokenStart < lastBefore &&
      closesUtteranceAs(
        utteranceClosureAt(null, tokens, before[tokenStart]!.index),
        PARENTHETICAL_RUBY_BASE_CLOSING_KINDS
      )
    ) {
      break;
    }
    const suffixTokens = before.slice(tokenStart);
    const surface = suffixTokens.map(({ token }) => token.surface).join("");
    if (minimumAlignedReadingLength(surface) > rubyKatakana.length) break;
    const tokenStartIndex = suffixTokens[0]!.index;
    const tokenStartChar = 0;
    const alignment = alignReading(surface, rubyKatakana);
    if (alignment !== null && Array.from(surface).some(isKanji)) {
      return {
        tokenStart: tokenStartIndex,
        charStartInToken: tokenStartChar,
        alignment: alignment.map(([surfaceChar, reading]) => ({ surface: surfaceChar, reading }))
      };
    }
  }

  const last = before[before.length - 1]!;
  const lastChars = Array.from(last.token.surface);
  for (let charStart = lastChars.length - 1; charStart > 0; charStart -= 1) {
    const surface = lastChars.slice(charStart).join("");
    const alignment = alignReading(surface, rubyKatakana);
    if (alignment !== null && Array.from(surface).some(isKanji)) {
      return {
        tokenStart: last.index,
        charStartInToken: charStart,
        alignment: alignment.map(([surfaceChar, reading]) => ({ surface: surfaceChar, reading }))
      };
    }
  }

  return null;
}

function applyParentheticalRubyAbsorption(
  tokens: RuntimeHaruToken[],
  absorption: ParentheticalRubyAbsorption
): void {
  if (absorption.charStartInToken > 0) {
    splitTokenForParentheticalRuby(tokens, absorption.tokenStart, absorption.charStartInToken);
  }

  let alignmentIndex = 0;
  for (let tokenIndex = absorption.tokenStart; tokenIndex < tokens.length && alignmentIndex < absorption.alignment.length; tokenIndex += 1) {
    const token = tokens[tokenIndex]!;
    const chars = Array.from(token.surface);
    const readings: string[] = [];
    for (let charIndex = 0; charIndex < chars.length && alignmentIndex < absorption.alignment.length; charIndex += 1) {
      const aligned = absorption.alignment[alignmentIndex]!;
      if (aligned.surface !== chars[charIndex]) break;
      readings.push(aligned.reading);
      alignmentIndex += 1;
    }
    if (readings.length > 0) {
      const newReading = readings.join("");
      token.reading = newReading;
      token.dictionaryFormReading = newReading;
    }
  }
}

function splitTokenForParentheticalRuby(
  tokens: RuntimeHaruToken[],
  tokenIndex: number,
  charStart: number
): void {
  const token = tokens[tokenIndex];
  if (token === undefined) return;
  const chars = Array.from(token.surface);
  if (charStart <= 0 || charStart >= chars.length) return;

  const prefixSurface = chars.slice(0, charStart).join("");
  const suffixSurface = chars.slice(charStart).join("");
  const prefix = cloneTokenWithSurfaceAndReading(token, prefixSurface, token.reading);
  const suffix = cloneTokenWithSurfaceAndReading(token, suffixSurface, token.reading);
  tokens.splice(tokenIndex, 1, prefix, suffix);
}

function cloneTokenWithSurfaceAndReading(
  token: RuntimeHaruToken,
  surface: string,
  reading: string
): RuntimeHaruToken {
  const cloned: RuntimeHaruToken = {
    ...rewriteRuntimeTokenSurface(token, { kind: "replace", surface }),
    dictionaryForm: surface,
    reading,
    dictionaryFormReading: reading
  };
  if (token.normalizedForm === token.surface) {
    cloned.normalizedForm = surface;
  }
  delete cloned.splitA;
  delete cloned.splitB;
  return cloned;
}

function followsMimeticAdverbialFrame(
  spans: readonly { readonly token: RuntimeHaruToken }[],
  index: number,
  lookups: LookupTables
): boolean {
  const token = spans[index + 1]?.token;
  if (token === undefined) {
    return false;
  }
  return lookups.SOKUON_MIMETIC_ADVERBIAL_FOLLOWERS.has(token.surface) && (token.pos & POS0) === 助詞;
}

function sokuonLemmaPrefixLength(token: RuntimeHaruToken): number | null {
  const surfaceChars = Array.from(token.surface);
  const lemmaChars = Array.from(token.dictionaryForm);
  if (lemmaChars.length === 0 || lemmaChars.length > surfaceChars.length) {
    return null;
  }
  for (const [index, char] of lemmaChars.entries()) {
    if (surfaceChars[index] !== char) {
      return null;
    }
  }
  if (!surfaceChars.slice(lemmaChars.length).every((char) => SOKUON_CHARS.has(char))) {
    return null;
  }
  return lemmaChars.length;
}

function analyzerTokenCharSpans(tokens: readonly RuntimeHaruToken[]): readonly TokenTextSpan[] {
  const spans: TokenTextSpan[] = [];
  let position = 0;
  for (const token of tokens) {
    const provided = token.sourceCharSpan;
    if (provided === undefined) {
      const end = position + codepointLength(token.surface);
      spans.push({ start: position, end });
      position = end;
      continue;
    }
    spans.push(provided);
    position = provided.end;
  }
  return spans;
}

function checkRealSokuon(
  pass1Tokens: readonly RuntimeHaruToken[],
  pass2Tokens: readonly RuntimeHaruToken[],
  offsets: ReadonlySet<number>,
  lookups: LookupTables,
  pauseJunctions: ReadonlySet<number> = NO_BOUNDARIES
): Set<number> {
  const sortedOffsets = [...offsets].sort((left, right) => left - right);
  const toCleaned = (origPos: number) => origPos - bisectLeft(sortedOffsets, origPos);
  const pass1CharSpans = analyzerTokenCharSpans(pass1Tokens);
  const pass1Spans = pass1Tokens.map((token, index) => ({
    start: pass1CharSpans[index]!.start,
    end: pass1CharSpans[index]!.end,
    token
  }));

  const pass2CharSpans = analyzerTokenCharSpans(pass2Tokens);
  const pass2Spans = new Set<string>();
  const pass2SpanToken = new Map<string, RuntimeHaruToken>();
  for (const [index, token] of pass2Tokens.entries()) {
    const span = pass2CharSpans[index]!;
    const key = `${span.start}:${span.end}`;
    pass2Spans.add(key);
    pass2SpanToken.set(key, token);
  }

  const restore = new Set<number>();
  for (const offset of offsets) {
    let runEnd = offset + 1;
    while (offsets.has(runEnd)) runEnd += 1;
    if (
      pauseJunctions.has(runEnd) &&
      pass2CharSpans.some((span) => span.start < toCleaned(runEnd) && toCleaned(runEnd) < span.end)
    ) {
      restore.add(offset);
      continue;
    }
    for (const [index, { start, end, token }] of pass1Spans.entries()) {
      if (!(start <= offset && offset < end)) {
        continue;
      }
      if ((token.pos & POS0) === 助詞) {
        restore.add(offset);
        break;
      }
      if ((token.pos & POS0) === 副詞 && [...SOKUON_CHARS].some((char) => token.dictionaryForm.includes(char))) {
        const lemmaLength = sokuonLemmaPrefixLength(token);
        const relative = offset - start;
        if (lemmaLength !== null && relative >= lemmaLength) {
          break;
        }
        const corePos: number[] = [];
        for (let p = start; p < end; p += 1) {
          if (!offsets.has(p)) corePos.push(toCleaned(p));
        }
        if (corePos.length > 0) {
          const coreKey = `${Math.min(...corePos)}:${Math.max(...corePos) + 1}`;
          const p2 = pass2SpanToken.get(coreKey);
          if (p2 !== undefined) {
            if (lemmaLength !== null && relative < lemmaLength - 1) {
              restore.add(offset);
              break;
            }
            const mimeticAdverbialFrame =
              lemmaLength !== null && followsMimeticAdverbialFrame(pass1Spans, index, lookups);
            if (mimeticAdverbialFrame || (p2.pos & POS0) !== 副詞) {
              restore.add(offset);
            }
          }
        }
        break;
      }
      if ((token.pos & POS0) !== 感動詞 || ![...SOKUON_CHARS].some((char) => token.dictionaryForm.includes(char))) {
        break;
      }
      const corePositions: number[] = [];
      for (let pos = start; pos < end; pos += 1) {
        if (!offsets.has(pos)) {
          corePositions.push(toCleaned(pos));
        }
      }
      if (corePositions.length === 0) {
        break;
      }
      const coreStart = Math.min(...corePositions);
      const coreEnd = Math.max(...corePositions) + 1;
      if (pass2Spans.has(`${coreStart}:${coreEnd}`)) {
        restore.add(offset);
      }
      break;
    }
  }
  return restore;
}

function removedRunsCrossedAtJunction(
  tokens: readonly RuntimeHaruToken[],
  removeOffsets: ReadonlySet<number>,
  junctions: ReadonlySet<number>
): Set<number> {
  const crossed = new Set<number>();
  if (junctions.size === 0) {
    return crossed;
  }
  const spans = analyzerTokenCharSpans(tokens);
  const sortedRemoved = [...removeOffsets].sort((left, right) => left - right);
  for (const offset of removeOffsets) {
    let runEnd = offset + 1;
    while (removeOffsets.has(runEnd)) runEnd += 1;
    if (!junctions.has(runEnd)) continue;
    const junction = runEnd - bisectLeft(sortedRemoved, runEnd);
    if (spans.some((span) => span.start < junction && junction < span.end)) {
      crossed.add(offset);
    }
  }
  return crossed;
}

function attachEmphasisSokuonFlags(tokens: RuntimeHaruToken[], removedOffsets: ReadonlySet<number>): void {
  const sortedRemoved = [...removedOffsets].sort((left, right) => left - right);
  const toCleaned = (origOffset: number) => origOffset - bisectLeft(sortedRemoved, origOffset);
  const tokenRanges = analyzerTokenCharSpans(tokens);

  for (const origOffset of removedOffsets) {
    const cleanedPos = toCleaned(origOffset);
    for (const [index, range] of tokenRanges.entries()) {
      const token = tokens[index];
      if (token === undefined || pos0in(token.pos, PUNCTUATION_BITS)) {
        continue;
      }
      if (cleanedPos === range.start) {
        token.leadingSokuon = (token.leadingSokuon ?? 0) + 1;
        break;
      }
      if (cleanedPos === range.end) {
        token.trailingSokuon = (token.trailingSokuon ?? 0) + 1;
        break;
      }
    }
  }
}

function attachTerminalRoleFlags(
  tokens: RuntimeHaruToken[],
  occurrences: readonly TerminalRoleOccurrence[],
  removedOffsets: ReadonlySet<number>
): void {
  if (tokens.length === 0 || occurrences.length === 0) {
    return;
  }
  const sortedRemoved = [...removedOffsets].sort((left, right) => left - right);
  const toFinalPos = (origPos: number) => origPos - bisectLeft(sortedRemoved, origPos);
  const charSpans = analyzerTokenCharSpans(tokens);
  const startToIndex = new Map<number, number>();
  for (const [index, span] of charSpans.entries()) {
    if (!startToIndex.has(span.start)) {
      startToIndex.set(span.start, index);
    }
  }
  const position = charSpans[charSpans.length - 1]?.end ?? 0;

  for (const occurrence of occurrences) {
    const finalPos = toFinalPos(occurrence.pos);
    const targetIndex = startToIndex.get(finalPos);
    const target = targetIndex === undefined ? undefined : tokens[targetIndex];
    if (target !== undefined) {
      target.terminalRoleSfpBefore = occurrence.sfp;
      target.terminalRoleSfpBeforeCount = (target.terminalRoleSfpBeforeCount ?? 0) + 1;
      continue;
    }
    if (finalPos !== position) {
      continue;
    }
    for (let index = tokens.length - 1; index >= 0; index -= 1) {
      const token = tokens[index];
      if (token === undefined) {
        continue;
      }
      token.terminalRoleSfpAfter = occurrence.sfp;
      token.terminalRoleSfpAfterCount = (token.terminalRoleSfpAfterCount ?? 0) + 1;
      break;
    }
  }
}

function bisectLeft(values: readonly number[], needle: number): number {
  let lo = 0;
  let hi = values.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if ((values[mid] ?? 0) < needle) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

function difference(left: ReadonlySet<number>, right: ReadonlySet<number>): Set<number> {
  return new Set([...left].filter((item) => !right.has(item)));
}

function codepointLength(text: string): number {
  return Array.from(text).length;
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

function mergeTranslationWarnings(warnings: readonly Warning[]): readonly Warning[] {
  const seen = new Set<string>();
  const merged: Warning[] = [];
  for (const warning of warnings) {
    const key = warningDedupKey(warning);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(warning);
  }
  return merged;
}

function headTailChainWarnings(units: readonly TranslationUnit[], lookups: LookupTables, numeric: NumericTables): readonly Warning[] {
  const warnings: Warning[] = [];
  for (const unit of units) {
    const plan = unit.renderPlan;
    if (isPredicateHeadTailChainRenderPlan(plan)) {
      warnings.push(...plan.realization.warnings);
      warnings.push(...partialTailWarningsFromPredicatePlan(plan));
    } else if (isNominalHeadTailChainRenderPlan(plan)) {
      warnings.push(...collectNominalTailChainCommittedWarnings(plan, lookups, numeric));
    }
  }
  return warnings;
}

function partialTailWarningsFromPredicatePlan(plan: PredicateHeadTailChainRenderPlan): readonly Warning[] {
  const partial = plan.realization.partial;
  if (partial?.decision === "weak_attachment_warning") {
    if (partial.attachmentSpan === undefined) {
      return [];
    }
    if (plan.realization.warnings.some((warning) =>
      warning.type === "tail_boundary_attachment_weak" &&
      warning.span !== undefined &&
      warning.span.start === partial.attachmentSpan?.start &&
      warning.span.end === partial.attachmentSpan?.end
    )) {
      return [];
    }
    return [{
      type: "tail_boundary_attachment_weak",
      severity: "warning",
      opKind: "tail_boundary_attachment",
      span: { start: partial.attachmentSpan.start, end: partial.attachmentSpan.end },
      message: `source-bearing tail boundary preserved without following attachment evidence: ${partial.attachmentSpan.surface}`
    }];
  }
  if (partial?.decision !== "unresolved_suffix_warning") {
    return [];
  }
  const suffixStart = partial.unresolvedSuffixSpan.start;
  const suffixEnd = partial.unresolvedSuffixSpan.end - 1;
  if (plan.realization.warnings.some((warning) =>
    warning.type === "partial_tail_suffix_unresolved" &&
    warning.span !== undefined &&
    warning.span.start === suffixStart &&
    warning.span.end === suffixEnd
  )) {
    return [];
  }
  const suffixSurface = plan.realization.sourceTokens
    ?.slice(suffixStart, partial.unresolvedSuffixSpan.end)
    .map((token) => token.surface)
    .join("") ?? `${suffixStart}-${suffixEnd}`;
  return [{
    type: "partial_tail_suffix_unresolved",
    severity: "warning",
    opKind: "tail_suffix_attachment",
    span: { start: suffixStart, end: suffixEnd },
    message: `source-bearing tail prefix preserved, but suffix attachment is unresolved: ${suffixSurface}`
  }];
}

function translationWarningsFromUnits(
  units: readonly TranslationUnit[],
  tokens: readonly RuntimeHaruToken[],
  lookups: LookupTables,
  numeric: NumericTables
): readonly Warning[] {
  const emittedUnits = units.filter((unit) => !unit.suppressed);
  const chunkWarnings = headTailChainWarnings(emittedUnits, lookups, numeric);
  const terminalMizenFragmentWarnings = terminalMizenLemmaFragmentWarnings(emittedUnits);
  const renderFallbackWarnings = unitRenderFallbackWarnings(emittedUnits);
  const sourceDisfluencyWarnings = sourceDisfluencyUnrestoredWarnings(emittedUnits, lookups, numeric);
  const unitWarnings = emittedUnits.flatMap((unit) => realizedUnitWarnings(unit, tokens, lookups, numeric));
  const provenanceWarnings = tailParserBlockedProvenanceWarnings(emittedUnits);
  return [...chunkWarnings, ...terminalMizenFragmentWarnings, ...renderFallbackWarnings, ...sourceDisfluencyWarnings, ...unitWarnings, ...provenanceWarnings];
}

function realizedUnitWarnings(
  unit: TranslationUnit,
  tokens: readonly RuntimeHaruToken[],
  lookups: LookupTables,
  numeric: NumericTables
): readonly Warning[] {
  if (!hasUnitRawClosureWarning(unit.warnings)) {
    return unit.warnings;
  }
  const realized = unitPreviewText(unit, lookups, numeric);
  return unit.warnings.filter((warning) => rawClosureWarningHoldsForRealization(warning, tokens, realized));
}

function sourceDisfluencyUnrestoredWarnings(units: readonly TranslationUnit[], lookups: LookupTables, numeric: NumericTables): readonly Warning[] {
  const warnings: Warning[] = [];
  for (const unit of units) {
    if (unit.jpHead.stutterPrefix === undefined) {
      continue;
    }
    const preview = unitPreviewText(unit, lookups, numeric);
    if (moraStutterRepeatIndex(preview) !== null) {
      continue;
    }
    const span = spanForUnit(unit);
    warnings.push({
      type: "source_disfluency_unrestored",
      severity: "warning",
      opKind: "mora_stutter_prefix",
      ...(span === undefined ? {} : { span }),
      message: "source-side one-mora stutter prefix was detected, but target output had no Korean syllable to repeat."
    });
  }
  return warnings;
}

function unitPreviewText(unit: TranslationUnit, lookups: LookupTables, numeric: NumericTables): string {
  if (unit.renderPlan === null) {
    return unit.korean;
  }
  try {
    return realizeRenderPlan(unit.renderPlan, { formal: false, lookups, numeric });
  } catch {
    return unit.korean;
  }
}

function terminalMizenLemmaFragmentWarnings(units: readonly TranslationUnit[]): readonly Warning[] {
  const warnings: Warning[] = [];
  for (let index = 0; index < units.length; index += 1) {
    const unit = units[index];
    if (unit === undefined || !isBareMizenLemmaUnit(unit)) {
      continue;
    }
    const next = nextNonSuppressedUnit(units, index + 1);
    if (!isHardTerminalPunctuationUnit(next)) {
      continue;
    }
    const span = spanForUnit(unit);
    warnings.push({
      type: "out_of_subset_default",
      severity: "warning",
      opKind: "terminal_mizen_fragment",
      ...(span === undefined ? {} : { span }),
      message: "Terminal 未然形 fragment rendered as a direct lemma instead of being recovered as a conditional."
    });
  }
  return warnings;
}

function isBareMizenLemmaUnit(unit: TranslationUnit): boolean {
  if (unit.unitType !== UnitType.CONTENT || unit.jpIndices.length !== 1) {
    return false;
  }
  const plan = unit.renderPlan;
  if (plan?.kind !== "lemma" || plan.auxTokens.length > 0) {
    return false;
  }
  const pos0 = unit.jpHead.pos & POS0;
  if (pos0 !== 動詞 && pos0 !== 形容詞0) {
    return false;
  }
  return (unit.jpHead.pos & POS5A) === 未然形_;
}

function nextNonSuppressedUnit(units: readonly TranslationUnit[], start: number): TranslationUnit | undefined {
  for (let index = start; index < units.length; index += 1) {
    const unit = units[index];
    if (unit !== undefined && !unit.suppressed) {
      return unit;
    }
  }
  return undefined;
}

function isHardTerminalPunctuationUnit(unit: TranslationUnit | undefined): boolean {
  if (unit === undefined || unit.unitType !== UnitType.SYMBOL) {
    return false;
  }
  return isHardTerminalPunctuationToken(unit.jpHead);
}

function unitRenderFallbackWarnings(units: readonly TranslationUnit[]): readonly Warning[] {
  const warnings: Warning[] = [];
  for (const unit of units) {
    if (
      unit.renderFallbackReason === null ||
      unit.warnings.some((warning) => warning.type === "render_fallback")
    ) {
      continue;
    }
    const span = spanForUnit(unit);
    warnings.push({
      type: "render_fallback",
      severity: "error",
      opKind: "head_tail_render",
      ...(span === undefined ? {} : { span }),
      message: `shared head-tail render failed; cached surface used. reason: ${unit.renderFallbackReason}`
    });
  }
  return warnings;
}

function tailParserBlockedProvenanceWarnings(units: readonly TranslationUnit[]): readonly Warning[] {
  const warnings: Warning[] = [];
  for (const unit of units) {
    if (unit.provenance !== "tail_parser_blocked") {
      continue;
    }
    const surface = unit.jpIndices.length === 0
      ? unit.jpHead.surface
      : `${unit.jpHead.surface}@${unit.jpIndices.join(",")}`;
    const reason = unit.provenanceReason ?? `tail-parser intake blocked for ${surface}`;
    warnings.push(tailParserBlockedWarning(reason, spanForUnit(unit)));
  }
  return warnings;
}

function spanForUnit(unit: TranslationUnit): Warning["span"] | undefined {
  if (unit.jpIndices.length === 0) {
    return undefined;
  }
  return {
    start: Math.min(...unit.jpIndices),
    end: Math.max(...unit.jpIndices)
  };
}

function tailParserBlockedWarning(reason: string, span?: Warning["span"]): Warning {
  return {
    type: "tail_parser_blocked",
    severity: "error",
    opKind: "tail_parser_intake",
    ...(span === undefined ? {} : { span }),
    message: `tail-parser owner span blocked before commit/render; unsupported intake exposed. reason: ${reason}`
  };
}
