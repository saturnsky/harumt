
import type { RuntimeHaruToken } from "../types/token.js";

import type { SenseFrame } from "../dictionary/sense-normalization.js";
import { camelizeKeys } from "../dictionary/data-section.js";
import type { RenderPlan } from "../types/render-plan.js";
import { temporalIntervalVariantHeadedAt } from "./head-tail/tail/predicate-root/temporal-interval-head.js";
import { clauseProjectionEvidenceWindowForToken } from "./clause-layout/navigation.js";
import type { Clause, ClauseLayout } from "./clause-layout/final-layout.js";
import {
  isClauseContentHeadTransparentToken,
  nextNonSpaceIndex,
  nextTransparentEvidenceIndex,
  previousNonSpaceIndex,
  previousTransparentEvidenceIndex
} from "./clause-layout/trivia.js";
import { extentPhraseMatchesCondition, readExtentPhraseAt } from "./semantics/extent-phrase.js";
import {
  caseParticleMarkerRelationForToken,
  nominalLinkMarkerRelationForToken,
  predicateNominalizerRelationForToken,
  pronominalNoMarkerRelationForToken
} from "./head-tail/boundary/marker.js";
import { quoteMarkerRelationAt } from "./head-tail/boundary/quote-marker.js";
import {
  NOMINAL_BITS,
  POS_DEPTH_MASK,
  POS0,
  POS01,
  pos0in,
  POS4,
  POS5A,
  isSahenCapableNominal,
  posFromStrings,
  PREDICATE_BITS,
  PUNCTUATION_BITS,
  記号,
  形状詞,
  形容詞0,
  助詞,
  助詞_格助詞,
  助詞_係助詞,
  助詞_副助詞,
  助動詞,
  助動詞_ダ,
  接頭辞,
  接尾辞,
  動詞,
  副詞,
  補助記号,
  名詞_数詞,
  名詞_普通名詞,
  連体詞,
  連用形_,
} from "../types/pos.js";
import { isVerbLemma } from "./matchers.js";
import { lookupSetFromValues, lookupSetMatches, TAME_FORMS } from "./lookup-tables.js";
import type { LookupTables } from "./lookup-tables.js";
import type { NumericTables } from "../generator/numeric-lookup.js";
import { TokenCursor } from "./token-cursor.js";
import {
  ConditionEvidenceResult,
  FrameArgumentView,
  FrameEvidenceInput,
  type FrameJsonMap,
  type FrameJsonValue,
  buildFrameArgumentView,
  evaluateClauseConditions,
  frameEvidenceSelectionTraceDetail,
  frameSpecFromDict,
  hasFrameSourceConditions,
  type LookupResolver,
  namedLookupResolver,
  selectFrameEvidenceCandidate,
  selectFrameMatch,
  UnknownLookupSet
} from "./semantics/frame.js";
import { quoteStructuralRelationIndex, quoteStructuralRelationsForHost } from "./structural-relation/quote.js";
import { quoteStructuralRelationLooksBareNominalContent, quoteHostAllowsBareNominalContent } from "./structural-relation/quote-nominal-and-passive.js";
import type { QuoteStructuralRelation } from "./structural-relation/quote-payload.js";
import { argumentNounLookupForms, argumentNounLookupMatches, getArgumentNounBeforeParticle, isTimeExpressionBeforeParticle, PredicateArgumentView, tokenInSemanticCategories } from "./semantics/helpers.js";
import { TraceCollector, TraceEvent } from "./trace.js";
import { DETACHED_SEPARATIONS, separatedAs } from "./clause-layout/trivia.js";
import { activeProtoLayout } from "./clause-layout/proto-state.js";

export type FrameSourceConditionMatch = "match" | "fail" | "unknown";

export interface FrameSourceCondition {
  anyOf?: readonly FrameSourceCondition[];
  argumentCategory?: Record<string, ArgumentConditionValue>;
  argumentNounSurface?: Record<string, ArgumentConditionValue>;
  asSuruVerbAdjacent?: boolean;
  asSuruVerbClauseScoped?: boolean;
  bareNoun?: boolean;
  reduplicated?: boolean;
  benefactiveTail?: boolean;
  causative?: boolean;
  causativePassive?: boolean;
  connectiveRole?: string | readonly string[];
  dekiruReading?: string | readonly string[];
  followingNounLookup?: LookupConditionValue;
  modifiedHeadNounLookup?: LookupConditionValue;
  nareruReading?: string | readonly string[];
  negative?: boolean;
  nextCategory?: string | readonly string[];
  nextContentLookup?: LookupConditionValue;
  nextExtentPhrase?: unknown;
  nextNounLookup?: LookupConditionValue;
  nextNounSurface?: readonly string[];
  nextPos?: readonly (readonly string[])[];
  nextSurface?: readonly string[];
  nextSurfaceSequence?: readonly (readonly string[])[];
  past?: boolean;
  polite?: boolean;
  quoteSlotKind?: unknown;
  quoteContentHostKind?: unknown;
  quoteContentPlainDaOnly?: boolean;
  quoteContentSlotKind?: unknown;
  prevCategory?: string | readonly string[];
  prevCaseCategory?: Record<string, string | readonly string[]>;
  prevCaseExists?: readonly string[];
  prevCaseNounLookup?: Record<string, unknown>;
  prevCaseNounSurface?: Record<string, unknown>;
  prevContentPos?: readonly (readonly string[])[];
  prevAttributiveContentSurface?: string | readonly string[];
  prevAttributiveIntervalVariant?: string | readonly string[];
  prevNounLookup?: LookupConditionValue;
  prevNounSurface?: readonly string[];
  prevParticleSurface?: readonly string[];
  prevPos?: readonly (readonly string[])[];
  prevSurface?: readonly string[];
  requestTail?: boolean;
  temporal?: boolean;
  voice?: string | readonly string[];
}

type ArgumentConditionValue =
  | string
  | readonly string[]
  | {
    readonly values?: string | readonly string[];
    readonly value?: string | readonly string[];
    readonly category?: string | readonly string[];
    readonly lookup?: LookupConditionValue;
    readonly allowBorrowed?: boolean;
  };

export type LookupConditionValue =
  | string
  | readonly string[]
  | {
    sets?: string | readonly string[];
    extras?: readonly string[];
    exclude?: readonly string[];
  }
  | null
  | number
  | boolean;

export interface ContextGrammar {
  benefactiveTail?: boolean | null;
  causative?: boolean | null;
  causativePassive?: boolean | null;
  connectiveRole?: string | readonly string[] | null;
  dekiruReading?: string | readonly string[] | null;
  nareruReading?: string | readonly string[] | null;
  negative?: boolean | null;
  past?: boolean | null;
  polite?: boolean | null;
  requestTail?: boolean | null;
  voice?: string | readonly string[] | null;
}

export interface ContextSense {
  korean?: string;
  koreanPos?: number;
  priorityGroup?: number | string | boolean | null;
  priorityInGroup?: number | string | boolean | null;
  senseIndex?: number | string | boolean | null;
  sourceFormat?: "senses";
  senseFrame?: SenseFrameLike | null;
  senseFrames?: readonly SenseFrameLike[] | string | number | boolean | null;
}

export interface ContextSenseEntry {
  dictionaryForm?: string;
  senses?: readonly ContextSense[];
  sourceFormat?: "senses";
}

interface ContextResolveOptions {
  cursor?: TokenCursor<RuntimeHaruToken>;
  grammar?: ContextGrammar | null;
  final?: boolean;
  layout?: ClauseLayout | null;
  contentMap?: ContextContentMap | null;
  trace?: TraceCollector | null;
  lookups: LookupTables;
  numeric: NumericTables;
}

interface ContextContentSpan {
  readonly consumed?: number;
  readonly renderPlan?: RenderPlan | {
    readonly kind?: string;
  } | null;
}

export type ContextContentMap =
  | ReadonlyMap<number, ContextContentSpan>
  | { readonly [index: number]: ContextContentSpan | undefined };

export interface SenseFrameLike extends SenseFrame {
  default?: FrameJsonValue;
}

const SUPPORTED_FRAME_SOURCE_KEY_LIST = [
  "anyOf",
  "argumentCategory",
  "argumentNounSurface",
  "asSuruVerbAdjacent",
  "asSuruVerbClauseScoped",
  "bareNoun",
  "reduplicated",
  "benefactiveTail",
  "causative",
  "causativePassive",
  "connectiveRole",
  "dekiruReading",
  "followingNounLookup",
  "modifiedHeadNounLookup",
  "nareruReading",
  "negative",
  "nextCategory",
  "nextContentLookup",
  "nextExtentPhrase",
  "nextNounLookup",
  "nextNounSurface",
  "nextPos",
  "nextSurface",
  "nextSurfaceSequence",
  "past",
  "polite",
  "prevAttributiveContentSurface",
  "prevAttributiveIntervalVariant",
  "prevCaseCategory",
  "prevCaseExists",
  "prevCaseNounLookup",
  "prevCaseNounSurface",
  "prevCategory",
  "prevContentPos",
  "prevNounLookup",
  "prevNounSurface",
  "prevParticleSurface",
  "prevPos",
  "prevSurface",
  "requestTail",
  "quoteContentHostKind",
  "quoteContentPlainDaOnly",
  "quoteContentSlotKind",
  "quoteSlotKind",
  "temporal",
  "voice"
] as const;

export const SUPPORTED_FRAME_SOURCE_KEYS: ReadonlySet<string> = new Set(SUPPORTED_FRAME_SOURCE_KEY_LIST);

export function resolveContext<T extends ContextSenseEntry>(entry: T, tokens: readonly RuntimeHaruToken[], pos: number, options: ContextResolveOptions): T;
export function resolveContext(
  entry: ContextSenseEntry,
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  options: ContextResolveOptions
): ContextSenseEntry {
  const tameOverride = resolveTameTranslation(entry, tokens, pos, options.lookups);
  if (tameOverride !== undefined) {
    return tameOverride;
  }

  const senses = entry.senses ?? [];
  if (senses.length <= 1) {
    return entry;
  }

  if (sensePriorityPlan(senses).hasPriorityMetadata) {
    const resolved = resolveSensesPriorityGroups(entry, senses, tokens, pos, options);
    if (resolved !== undefined) {
      return resolved;
    }
  }

  return entry;
}

function tamePrevNoNounForm(tokens: readonly RuntimeHaruToken[], pos: number): string | null {
  const noIndex = previousNonSpaceIndex(tokens, pos);
  if (noIndex === null) {
    return null;
  }
  const noToken = tokens[noIndex];
  if (!hasContextNoMarker(noToken, noIndex)) {
    return null;
  }
  const index = previousNonSpaceIndex(tokens, noIndex);
  if (index === null) {
    return null;
  }
  const token = tokens[index];
  if (token === undefined || !pos0in(token.pos, NOMINAL_BITS | (1 << 形状詞))) {
    return null;
  }
  return token.dictionaryForm || token.surface;
}

function tamePrevPredicateForm(tokens: readonly RuntimeHaruToken[], pos: number): string | null {
  const index = previousNonSpaceIndex(tokens, pos);
  if (index === null) {
    return null;
  }
  const token = tokens[index];
  if (token !== undefined && (token.pos & POS0) === 動詞) {
    return token.dictionaryForm || token.surface;
  }
  return null;
}

function tamePrevSuruNounForm(tokens: readonly RuntimeHaruToken[], pos: number): string | null {
  const suruIndex = previousNonSpaceIndex(tokens, pos);
  if (suruIndex === null) {
    return null;
  }
  const suru = tokens[suruIndex];
  if (suru?.dictionaryForm !== "する") {
    return null;
  }
  const stemIndex = previousNonSpaceIndex(tokens, suruIndex);
  if (stemIndex === null) {
    return null;
  }
  const stem = tokens[stemIndex];
  if (stem !== undefined && isSahenCapableNominal(stem)) {
    return stem.dictionaryForm || stem.surface;
  }
  return null;
}

function tameSuffixKind(tokens: readonly RuntimeHaruToken[], pos: number): string {
  const index = nextNonSpaceIndex(tokens, pos + 1);
  if (index === null) {
    return "end";
  }
  const token = tokens[index];
  if (caseParticleMarkerRelationForToken(token, index, {
    acceptedSurfaces: ["に"],
    consumers: ["projection_context"]
  }) !== null) {
    return "ni";
  }
  if (hasContextNoMarker(token, index)) {
    return "no";
  }
  if (token !== undefined && pos0in(token.pos, PUNCTUATION_BITS)) {
    return "punct";
  }
  return "other";
}

function tameNextSurface(tokens: readonly RuntimeHaruToken[], pos: number, offset = 1): string | null {
  let index = pos;
  for (let count = 0; count < offset; count += 1) {
    const next = nextNonSpaceIndex(tokens, index + 1);
    if (next === null) {
      return null;
    }
    index = next;
  }
  return tokens[index]?.surface ?? null;
}

function tameAvailableReasonKorean(entry: ContextSenseEntry): string {
  const senses = entry.senses ?? [];
  for (const preferred of ["때문에", "때문"] as const) {
    if (senses.some((translation) => translation.korean === preferred)) {
      return preferred;
    }
  }
  return "때문에";
}

function tameReorder(entry: ContextSenseEntry, preferred: string): ContextSenseEntry | undefined {
  const senses = entry.senses ?? [];
  for (const [index, translation] of senses.entries()) {
    if (translation.korean !== preferred) {
      continue;
    }
    if (index === 0) {
      return entry;
    }
    return {
      ...entry,
      senses: [
        translation,
        ...senses.filter((_, candidateIndex) => candidateIndex !== index)
      ]
    };
  }
  return undefined;
}

function resolveTameTranslation(
  entry: ContextSenseEntry,
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  lookups: LookupTables
): ContextSenseEntry | undefined {
  const dictionaryForm = entry.dictionaryForm ?? "";
  if (!TAME_FORMS.has(dictionaryForm)) {
    return undefined;
  }
  const senses = entry.senses ?? [];
  if (senses.length <= 1) {
    return undefined;
  }

  const tameReasonNouns = lookups.TAME_REASON_NOUNS;
  const tamePurposeNouns = lookups.TAME_PURPOSE_NOUNS;
  const tameReasonPredicates = lookups.TAME_REASON_PREDICATES;
  const tameReasonSuruNouns = lookups.TAME_REASON_SURU_NOUNS;

  const suffix = tameSuffixKind(tokens, pos);
  const nounForm = tamePrevNoNounForm(tokens, pos);
  if (suffix === "ni" && nounForm !== null) {
    if (tameReasonNouns.has(nounForm)) {
      return tameReorder(entry, tameAvailableReasonKorean(entry));
    }
    if (tamePurposeNouns.has(nounForm)) {
      return tameReorder(entry, "위해");
    }
  }

  if (suffix === "punct") {
    const predicateForm = tamePrevPredicateForm(tokens, pos);
    if (predicateForm !== null && tameReasonPredicates.has(predicateForm)) {
      return tameReorder(entry, tameAvailableReasonKorean(entry));
    }
    if (predicateForm === "する") {
      const suruNounForm = tamePrevSuruNounForm(tokens, pos);
      if (suruNounForm !== null && tameReasonSuruNouns.has(suruNounForm)) {
        return tameReorder(entry, tameAvailableReasonKorean(entry));
      }
    }
    return undefined;
  }

  if (suffix === "other" && tameNextSurface(tokens, pos) === "だけ") {
    if (tameNextSurface(tokens, pos, 2) === "に") {
      if (nounForm !== null && tamePurposeNouns.has(nounForm)) {
        return tameReorder(entry, "위해");
      }
      if (tamePrevPredicateForm(tokens, pos) !== null && nounForm === null) {
        return tameReorder(entry, "위해");
      }
    }
    return undefined;
  }

  if (suffix !== "ni") {
    return undefined;
  }

  if (tamePrevPredicateForm(tokens, pos) !== null && nounForm === null) {
    return tameReorder(entry, "위해");
  }

  let reasonLike = false;
  const upper = Math.min(pos + 8, tokens.length);
  const tameScanner = new TokenCursor(tokens, pos + 2, upper);
  while (tameScanner.current() !== undefined) {
    const token = tameScanner.current()!;
    const tpos0 = token.pos & POS0;
    if (tpos0 === 補助記号 || tpos0 === 記号) {
      break;
    }
    if (tpos0 === 助詞 && (token.surface === "は" || token.surface === "が")) {
      reasonLike = true;
      break;
    }
    if (tpos0 === 動詞) {
      break;
    }
    tameScanner.advance();
  }
  return tameReorder(entry, reasonLike ? tameAvailableReasonKorean(entry) : "위해");
}


export function resolveContextWithLayout<T extends ContextSenseEntry>(
  entry: T,
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  options: {
    layout: ClauseLayout;
    contentMap?: ContextContentMap | null;
    grammar?: ContextGrammar | null;
    final?: boolean;
    trace?: TraceCollector | null;
    lookups: LookupTables;
    numeric: NumericTables;
  }
): T {
  return resolveContext(entry, tokens, pos, options);
}


export function evaluateFrameSourceCondition(
  ctx: FrameSourceCondition | FrameJsonMap,
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  options: ContextResolveOptions
): FrameSourceConditionMatch {
  ctx = normalizeFrameSourceCondition(ctx);
  const unsupported = Object.keys(ctx).filter((key) => !SUPPORTED_FRAME_SOURCE_KEYS.has(key));
  if (unsupported.length > 0) {
    throw new Error(`unsupported source condition key(s): ${unsupported.sort().join(", ")}`);
  }

  const final = options.final ?? true;
  let state: FrameSourceConditionMatch = "match";

  if (ctx.anyOf !== undefined) {
    const baseState = evaluateFrameSourceCondition(withoutAnyOf(ctx), tokens, pos, options);
    if (baseState !== "match") {
      return baseState;
    }
    let sawUnknown = false;
    for (const branch of ctx.anyOf) {
      const branchState = evaluateFrameSourceCondition(branch, tokens, pos, options);
      if (branchState === "match") {
        return "match";
      }
      if (branchState === "unknown") {
        sawUnknown = true;
      }
    }
    return sawUnknown ? "unknown" : "fail";
  }

  if (ctx.quoteSlotKind !== undefined) {
    state = mergeMatchState(state, quoteSlotKindMatches(ctx.quoteSlotKind, tokens, pos, final, options.lookups, options.cursor));
    if (state === "fail") {
      return "fail";
    }
  }
  if (ctx.quoteContentSlotKind !== undefined || ctx.quoteContentHostKind !== undefined || ctx.quoteContentPlainDaOnly !== undefined) {
    state = mergeMatchState(state, quoteContentSourceConditionMatches(ctx, tokens, pos, final, options.lookups, options.cursor));
    if (state === "fail") {
      return "fail";
    }
  }
  if (ctx.bareNoun !== undefined && ctx.bareNoun !== isBareNounContext(tokens, pos)) {
    return "fail";
  }
  if (ctx.reduplicated !== undefined && ctx.reduplicated !== isReduplicatedAt(tokens, pos)) {
    return "fail";
  }
  if (ctx.prevPos !== undefined && !posPrefixAt(tokens, pos - 1, ctx.prevPos)) {
    return "fail";
  }
  if (ctx.nextPos !== undefined) {
    const directNextMatches = posPrefixAt(tokens, pos + 1, ctx.nextPos);
    const transparentNext = transparentCopulaFocusNextIndex(tokens, pos);
    if (
      !directNextMatches &&
      (transparentNext === null || !posPrefixAt(tokens, transparentNext, ctx.nextPos))
    ) {
      return "fail";
    }
  }
  if (ctx.prevContentPos !== undefined) {
    const previous = findPreviousContentForContext(tokens, pos, options.layout ?? null, options.contentMap ?? null);
    if (previous === undefined || !anyPosPrefixMatch(previous.pos, ctx.prevContentPos)) {
      return "fail";
    }
  }
  if (ctx.prevCategory !== undefined) {
    const previous = findPreviousNounForContext(tokens, pos, options.layout ?? null, options.lookups);
    const categories = typeof ctx.prevCategory === "string" ? [ctx.prevCategory] : ctx.prevCategory;
    if (previous === undefined || !tokenInSemanticCategories(previous, categories, options.lookups)) {
      return "fail";
    }
  }
  if (ctx.nextCategory !== undefined) {
    const next = findNextNounForContext(tokens, pos, options.layout ?? null);
    const categories = typeof ctx.nextCategory === "string" ? [ctx.nextCategory] : ctx.nextCategory;
    if (next === undefined || !tokenInSemanticCategories(next, categories, options.lookups)) {
      return "fail";
    }
  }
  if (ctx.prevSurface !== undefined && !ctx.prevSurface.includes(tokens[pos - 1]?.surface ?? "")) {
    return "fail";
  }
  if (ctx.nextSurface !== undefined && !ctx.nextSurface.includes(tokens[pos + 1]?.surface ?? "")) {
    return "fail";
  }
  if (ctx.nextSurfaceSequence !== undefined && !nextSurfaceSequenceMatches(tokens, pos, ctx.nextSurfaceSequence)) {
    return "fail";
  }
  if (ctx.prevParticleSurface !== undefined) {
    const previous = tokens[pos - 1];
    if (previous === undefined || (previous.pos & POS0) !== 助詞 || !ctx.prevParticleSurface.includes(previous.surface)) {
      return "fail";
    }
  }
  if (ctx.prevNounSurface !== undefined) {
    const noun = findPreviousNounForContext(tokens, pos, options.layout ?? null, options.lookups);
    if (noun === undefined || !ctx.prevNounSurface.includes(noun.dictionaryForm)) {
      return "fail";
    }
  }
  if (ctx.nextNounSurface !== undefined) {
    const noun = findNextNounForContext(tokens, pos, options.layout ?? null);
    if (noun === undefined || !ctx.nextNounSurface.includes(noun.dictionaryForm)) {
      return "fail";
    }
  }
  if (ctx.prevNounLookup !== undefined) {
    const noun = findPreviousNounForContext(tokens, pos, options.layout ?? null, options.lookups);
    if (noun === undefined || !lookupConditionMatches(ctx.prevNounLookup, argumentNounLookupForms(noun), options.lookups)) {
      return "fail";
    }
  }
  if (ctx.prevCaseNounSurface !== undefined && !prevCaseNounSurfaceMatches(ctx.prevCaseNounSurface, tokens, pos, options.layout ?? null, options.lookups)) {
    return "fail";
  }
  if (ctx.prevCaseNounLookup !== undefined && !prevCaseNounLookupMatches(ctx.prevCaseNounLookup, tokens, pos, options.layout ?? null, options.lookups)) {
    return "fail";
  }
  if (ctx.prevCaseExists !== undefined && !prevCaseExistsMatches(ctx.prevCaseExists, tokens, pos, options.layout ?? null)) {
    return "fail";
  }
  if (ctx.prevCaseCategory !== undefined && !prevCaseCategoryMatches(ctx.prevCaseCategory, tokens, pos, options.layout ?? null, options.lookups)) {
    return "fail";
  }
  state = mergeMatchState(state, evaluateArgumentNounSurfaceCondition(ctx.argumentNounSurface, tokens, pos, options.layout ?? null, final, options.lookups));
  state = mergeMatchState(state, evaluateArgumentCategoryCondition(ctx.argumentCategory, tokens, pos, options.layout ?? null, final, options.lookups));
  if (state === "fail") {
    return "fail";
  }
  if (ctx.nextNounLookup !== undefined) {
    const noun = findNextNounForContext(tokens, pos, options.layout ?? null);
    if (noun === undefined || !lookupConditionMatches(ctx.nextNounLookup, argumentNounLookupForms(noun), options.lookups)) {
      return "fail";
    }
  }
  if (ctx.modifiedHeadNounLookup !== undefined) {
    const noun = findModifiedHeadNounForContext(tokens, pos);
    if (noun === undefined || !lookupConditionMatches(ctx.modifiedHeadNounLookup, argumentNounLookupForms(noun), options.lookups)) {
      return "fail";
    }
  }
  if (ctx.nextContentLookup !== undefined) {
    const next = findNextContentForContext(tokens, pos, options.layout ?? null);
    if (next === undefined || !lookupConditionMatches(ctx.nextContentLookup, [next.dictionaryForm, next.surface], options.lookups)) {
      return "fail";
    }
  }
  if (ctx.nextExtentPhrase !== undefined) {
    const extentLayout = options.layout ?? null;
    const nextIndex = findNextContentIndexForContext(tokens, pos, extentLayout);
    const extentEnd = extentLayout === null
      ? tokens.length
      : Math.min(extentPhraseEvidenceEnd(extentLayout, tokens, pos), tokens.length);
    const reading = nextIndex === null ? null : readExtentPhraseAt(new TokenCursor(tokens, nextIndex, extentEnd), options.numeric);
    if (reading === null || !extentPhraseMatchesCondition(reading, ctx.nextExtentPhrase, options.numeric)) {
      return "fail";
    }
  }
  if (ctx.followingNounLookup !== undefined) {
    const noun = findFollowingNounForContext(tokens, pos, options.layout ?? null);
    if (noun === undefined && (options.layout === undefined || options.layout === null) && !final) {
      state = mergeMatchState(state, "unknown");
      if (state === "fail") {
        return "fail";
      }
    } else if (noun === undefined || !lookupConditionMatches(ctx.followingNounLookup, argumentNounLookupForms(noun), options.lookups)) {
      return "fail";
    }
  }
  state = mergeMatchState(state, evaluatePrevAttributiveContentSurface(ctx.prevAttributiveContentSurface, tokens, pos, options.layout ?? null, final));
  if (state === "fail") {
    return "fail";
  }
  state = mergeMatchState(state, evaluatePrevAttributiveIntervalVariant(ctx.prevAttributiveIntervalVariant, pos, options.contentMap ?? null, final));
  if (state === "fail") {
    return "fail";
  }
  if (ctx.asSuruVerbAdjacent === true && !isAsSuruVerbAdjacent(tokens, pos)) {
    return "fail";
  }
  if (ctx.asSuruVerbClauseScoped === true && !isAsSuruVerbClauseScoped(tokens, pos, options.layout ?? null)) {
    return "fail";
  }
  if (ctx.temporal === true && !isTimeExpressionBeforeParticle(tokens, pos + 1, options.lookups)) {
    return "fail";
  }
  if (hasUnevaluatedSupportedFrameSourceCondition(ctx)) {
    return "fail";
  }

  state = mergeMatchState(state, evaluateVoiceCondition(ctx.voice, options.grammar, final));
  state = mergeMatchState(state, evaluateEnumCondition("nareruReading", ctx.nareruReading, options.grammar, final));
  state = mergeMatchState(state, evaluateEnumCondition("dekiruReading", ctx.dekiruReading, options.grammar, final));
  state = mergeMatchState(state, evaluateBoolCondition("negative", ctx.negative, options.grammar, final));
  state = mergeMatchState(state, evaluateBoolCondition("past", ctx.past, options.grammar, final));
  state = mergeMatchState(state, evaluateBoolCondition("polite", ctx.polite, options.grammar, final));
  state = mergeMatchState(state, evaluateBoolCondition("causative", ctx.causative, options.grammar, final));
  state = mergeMatchState(state, evaluateBoolCondition("causativePassive", ctx.causativePassive, options.grammar, final));
  state = mergeMatchState(state, evaluateBoolCondition("requestTail", ctx.requestTail, options.grammar, final));
  state = mergeMatchState(state, evaluateBoolCondition("benefactiveTail", ctx.benefactiveTail, options.grammar, final));
  state = mergeMatchState(state, evaluateEnumCondition("connectiveRole", ctx.connectiveRole, options.grammar, final));

  return state;
}

function isReduplicatedAt(tokens: readonly RuntimeHaruToken[], pos: number): boolean {
  const token = tokens[pos];
  if (token === undefined) {
    return false;
  }
  const sameLexeme = (other: RuntimeHaruToken | undefined): boolean =>
    other !== undefined && other.dictionaryForm === token.dictionaryForm && other.surface === token.surface;
  return (sameLexeme(tokens[pos - 1]) && !separatedAs(tokens, pos, DETACHED_SEPARATIONS))
    || (sameLexeme(tokens[pos + 1]) && !separatedAs(tokens, pos + 1, DETACHED_SEPARATIONS));
}

function nextSurfaceSequenceMatches(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  sequences: readonly (readonly string[])[]
): boolean {
  return sequences.some((sequence) =>
    sequence.length > 0 &&
    sequence.every((surface, offset) => tokens[pos + 1 + offset]?.surface === surface)
  );
}

function hasUnevaluatedSupportedFrameSourceCondition(ctx: FrameSourceCondition): boolean {
  void ctx;
  return false;
}

function frameConditionCursor(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  cursor: TokenCursor<RuntimeHaruToken> | undefined
): TokenCursor<RuntimeHaruToken> {
  return cursor ?? new TokenCursor(tokens, pos, tokens.length);
}

function quoteSlotKindMatches(
  value: unknown,
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  final: boolean,
  lookups: LookupTables,
  cursor?: TokenCursor<RuntimeHaruToken>
): FrameSourceConditionMatch {
  const expectedValues = typeof value === "string"
    ? [value]
    : isReadonlyStringArray(value)
      ? value
      : [];
  if (expectedValues.length === 0) {
    return "fail";
  }
  const expected = new Set(expectedValues);
  const relationCursor = frameConditionCursor(tokens, pos, cursor);
  for (const relation of quoteStructuralRelationsForHost(relationCursor.fork(pos, relationCursor.end, pos), lookups)) {
    if (
      expected.has(relation.quote.slotKind) &&
      !quoteSlotKindBlockedByBareNominalPolicy(tokens, relation, lookups)
    ) {
      return "match";
    }
  }
  const sawMarker = hasQuoteMarkerInContext(tokens);
  if (sawMarker) {
    return "fail";
  }
  return final ? "fail" : "unknown";
}

function quoteSlotKindBlockedByBareNominalPolicy(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  lookups: LookupTables
): boolean {
  return relation.quote.slotKind === "quoted_content" &&
    quoteStructuralRelationLooksBareNominalContent(tokens, relation) &&
    !quoteHostAllowsBareNominalContent(tokens, relation, lookups);
}

function quoteContentSourceConditionMatches(
  ctx: FrameSourceCondition,
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  final: boolean,
  lookups: LookupTables,
  cursor?: TokenCursor<RuntimeHaruToken>
): FrameSourceConditionMatch {
  const slotExpected = stringSourceConditionSet(ctx.quoteContentSlotKind);
  const hostExpected = stringSourceConditionSet(ctx.quoteContentHostKind);
  const plainDaOnly = ctx.quoteContentPlainDaOnly;
  const relationCursor = frameConditionCursor(tokens, pos, cursor);
  const relations = Array.from(quoteStructuralRelationIndex(relationCursor.fork(0, relationCursor.end, 0), lookups).winners());
  for (const relation of relations) {
    if (!quoteRelationContainsToken(relation, pos)) {
      continue;
    }
    if (slotExpected !== null && !slotExpected.has(relation.quote.slotKind)) {
      continue;
    }
    if (hostExpected !== null && !hostExpected.has(relation.quote.hostMatch.kind)) {
      continue;
    }
    if (plainDaOnly !== undefined && quoteContentHasPlainDaOnly(tokens, pos, relation) !== plainDaOnly) {
      continue;
    }
    return "match";
  }
  const sawMarker = hasQuoteMarkerInContext(tokens);
  if (sawMarker) {
    return "fail";
  }
  return final ? "fail" : "unknown";
}

function quoteRelationContainsToken(relation: QuoteStructuralRelation, pos: number): boolean {
  return relation.quote.contentSpan.start <= pos && pos <= relation.quote.contentSpan.endExclusive;
}

function quoteContentHasPlainDaOnly(
  tokens: readonly RuntimeHaruToken[],
  contentPredicateIdx: number,
  relation: QuoteStructuralRelation
): boolean {
  const auxStart = contentPredicateIdx + 1;
  if (auxStart >= relation.quote.markerIdx) {
    return false;
  }
  const auxTokens = tokens.slice(auxStart, relation.quote.markerIdx);
  return auxTokens.length === 1 &&
    auxTokens[0]?.surface === "だ" &&
    auxTokens[0].dictionaryForm === "だ" &&
    (auxTokens[0].pos & POS4) === 助動詞_ダ;
}

function stringSourceConditionSet(value: unknown): ReadonlySet<string> | null {
  if (typeof value === "string") {
    return new Set([value]);
  }
  if (isReadonlyStringArray(value)) {
    return new Set(value);
  }
  return null;
}


export function evaluateFrameSourceConditionWithLayout(
  ctx: FrameSourceCondition | FrameJsonMap,
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  options: {
    layout: ClauseLayout;
    contentMap?: ContextContentMap | null;
    grammar?: ContextGrammar | null;
    final?: boolean;
    lookups: LookupTables;
    numeric: NumericTables;
  }
): FrameSourceConditionMatch {
  return evaluateFrameSourceCondition(ctx, tokens, pos, options);
}


export function resolveLookupConditionSet(value: LookupConditionValue, lookups: LookupTables): ReadonlySet<string> {
  if (typeof value === "string") {
    return namedLookupSet(value, lookups);
  }
  if (isStringArray(value)) {
    const result = new Set<string>();
    for (const name of value) {
      for (const item of namedLookupSet(name, lookups)) {
        result.add(item);
      }
    }
    return lookupSetFromValues(result);
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return lookupSetFromValues([]);
  }

  const result = new Set<string>();
  const exclude = new Set<string>();
  const sets = value.sets === undefined ? [] : typeof value.sets === "string" ? [value.sets] : value.sets;
  for (const name of sets) {
    for (const item of namedLookupSet(name, lookups)) {
      result.add(item);
    }
  }
  for (const extra of value.extras ?? []) {
    result.add(extra);
  }
  for (const item of value.exclude ?? []) {
    result.delete(item);
    exclude.add(item);
  }
  return lookupSetFromValues(result, exclude);
}

export function lookupConditionMatches(value: LookupConditionValue, forms: readonly string[], lookups: LookupTables): boolean {
  const candidates = uniqueLookupForms(forms);
  if (candidates.length === 0) {
    return false;
  }
  if (typeof value === "string") {
    const set = namedLookupSet(value, lookups);
    return candidates.some((form) => lookupSetMatches(set, form));
  }
  if (isStringArray(value)) {
    return value.some((name) => candidates.some((form) => lookupSetMatches(namedLookupSet(name, lookups), form)));
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const include = new Set<string>();
  const exclude = new Set<string>();
  const sets = value.sets === undefined ? [] : typeof value.sets === "string" ? [value.sets] : value.sets;
  for (const name of sets) {
    for (const item of namedLookupSet(name, lookups)) {
      include.add(item);
    }
  }
  for (const extra of value.extras ?? []) {
    include.add(extra);
  }
  for (const excluded of value.exclude ?? []) {
    exclude.add(excluded);
  }
  const resolved = lookupSetFromValues(include, exclude);
  return candidates.some((form) => lookupSetMatches(resolved, form));
}

function uniqueLookupForms(forms: readonly string[]): readonly string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const form of forms) {
    if (form.length === 0 || seen.has(form)) {
      continue;
    }
    seen.add(form);
    result.push(form);
  }
  return result;
}


function namedLookupSet(name: string, lookups: LookupTables): ReadonlySet<string> {
  return lookups.named(name) ?? new Set();
}

function boundNamedLookupResolver(lookups: LookupTables): LookupResolver {
  return (name: string): ReadonlySet<string> => namedLookupResolver(name, lookups);
}

function isStringArray(value: LookupConditionValue): value is readonly string[] {
  return Array.isArray(value);
}

interface SensePriorityPlan {
  readonly groups: readonly (readonly [number, ContextSense])[][];
  readonly hasPriorityMetadata: boolean;
  readonly fallbackGroup: readonly (readonly [number, ContextSense])[] | undefined;
  readonly groupsToCheck: readonly (readonly [number, ContextSense])[][];
  readonly anyGroupToCheckLayoutDependent: boolean;
}

const sensePriorityPlanCache = new WeakMap<readonly ContextSense[], SensePriorityPlan>();

function sensePriorityPlan(senses: readonly ContextSense[]): SensePriorityPlan {
  const cached = sensePriorityPlanCache.get(senses);
  if (cached !== undefined) {
    return cached;
  }
  const groups = translationPriorityGroups(senses);
  const last = groups.at(-1);
  const fallbackGroup = last !== undefined && isFallbackGroup(last) ? last : undefined;
  const groupsToCheck = fallbackGroup === undefined ? groups : groups.slice(0, -1);
  const plan: SensePriorityPlan = {
    groups,
    hasPriorityMetadata: hasSensePriorityMetadata(senses),
    fallbackGroup,
    groupsToCheck,
    anyGroupToCheckLayoutDependent: groupsToCheck.some(groupHasFinalLayoutDependentFrameSourceConditions),
  };
  sensePriorityPlanCache.set(senses, plan);
  return plan;
}

export function isStagedSourceDomain(senses: readonly ContextSense[] | undefined | null): boolean {
  if (senses === undefined || senses === null || senses.length <= 1) {
    return false;
  }
  const plan = sensePriorityPlan(senses);
  return plan.hasPriorityMetadata && plan.groupsToCheck.length > 0;
}

function resolveSensesPriorityGroups(
  entry: ContextSenseEntry,
  senses: readonly ContextSense[],
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  options: ContextResolveOptions
): ContextSenseEntry | undefined {
  const plan = sensePriorityPlan(senses);
  if (plan.groups.length === 0) {
    return undefined;
  }
  const { fallbackGroup, groupsToCheck } = plan;
  if ((options.layout ?? null) === null && plan.anyGroupToCheckLayoutDependent) {
    return undefined;
  }

  for (const group of groupsToCheck) {
    const matched = group.filter(([, translation]) => translationMatchState(translation, tokens, pos, options) === "match");
    if (matched.length > 0) {
      const [selectedIndex, selected] = selectSensesGroupCandidate(matched, tokens, pos, options);
      return selectTranslation(entry, senses, selectedIndex, selected);
    }
  }

  if (fallbackGroup === undefined) {
    return undefined;
  }
  if (fallbackGroup.length === 1) {
    const fallback = fallbackGroup[0]!;
    return selectTranslation(entry, senses, fallback[0], fallback[1]);
  }
  if (groupsToCheck.length === 0) {
    return undefined;
  }
  return selectTranslationGroup(entry, senses, fallbackGroup);
}

function groupHasFinalLayoutDependentFrameSourceConditions(group: readonly (readonly [number, ContextSense])[]): boolean {
  return group.some(([, translation]) => {
    const frames = frameDataAlternatives(translation).filter(hasFrameSourceConditions);
    return frames.length > 0 && frames.every(frameNeedsFinalClauseLayoutForSourceMatch);
  });
}


function translationMatchState(
  translation: ContextSense,
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  options: ContextResolveOptions
): FrameSourceConditionMatch {
  const frameData = frameDataAlternatives(translation).filter(hasFrameSourceConditions);
  if (frameData.length > 0 && options.layout !== undefined && options.layout !== null) {
    return translationFrameAlternativeMatches(translation, tokens, pos, options.layout, options.grammar ?? null, options.lookups, options.numeric, options.contentMap ?? null)
      ? "match"
      : "fail";
  }
  if (frameData.length > 0) {
    return senseSourceFrameMatch(translation, tokens, pos, options.grammar ?? null, options.lookups, options.numeric, options.contentMap ?? null);
  }
  return "match";
}

function hasSensePriorityMetadata(senses: readonly ContextSense[]): boolean {
  return senses.some((translation) =>
    translation.priorityGroup !== undefined &&
    translation.priorityInGroup !== undefined
  );
}

function translationPriorityGroups(senses: readonly ContextSense[]): readonly (readonly [number, ContextSense])[][] {
  const groups = new Map<number, [number, ContextSense][]>();
  senses.forEach((translation, index) => {
    const group = intMetadata(translation, "priorityGroup", index);
    const existing = groups.get(group);
    if (existing === undefined) {
      groups.set(group, [[index, translation]]);
    } else {
      existing.push([index, translation]);
    }
  });
  return [...groups.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, group]) => group.sort((left, right) => translationPriorityInGroup(left) - translationPriorityInGroup(right)));
}

function translationPriorityInGroup(item: readonly [number, ContextSense]): number {
  const [index, translation] = item;
  return intMetadata(translation, "priorityInGroup", index);
}

function isFallbackGroup(group: readonly (readonly [number, ContextSense])[]): boolean {
  return group.length > 0 && group.every(([, translation]) => isFallbackTranslation(translation));
}

function isFallbackTranslation(translation: ContextSense): boolean {
  if (hasSenseFramesField(translation)) {
    return false;
  }
  const frame = translation.senseFrame;
  return frame === undefined || frame === null || pythonTruthyFrameDefault(frame);
}

function selectSensesGroupCandidate(
  matched: readonly (readonly [number, ContextSense])[],
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  options: ContextResolveOptions
): readonly [number, ContextSense] {
  const layout = options.layout ?? null;
  const lookups = options.lookups;
  if (matched.length <= 1 || layout === null) {
    return matched[0]!;
  }
  const argumentView = buildFrameArgumentView(tokens, pos, {
    lookups,
    layout,
    connectiveRoles: layout.connectiveRoles,
    includeBorrowed: true,
    voice: grammarVoiceForFrame(options.grammar ?? null)
  });
  const inputs = matched.flatMap(([translationIndex, translation]) =>
    frameEvidenceInputsFromTranslation(translationIndex, translation)
  );
  const selection = selectFrameEvidenceCandidate(inputs, argumentView, {
    predicateIdx: pos,
    lookupResolver: boundNamedLookupResolver(lookups),
    conditionEvaluator: frameConditionEvaluator(tokens, pos, layout, options.grammar ?? null, lookups, options.numeric)
  });
  if (selection === null) {
    return matched[0]!;
  }
  const trace = options.trace ?? null;
  if (trace !== null) {
    trace.record(new TraceEvent(
      pos,
      "commitment",
      "frame_evidence_selection",
      true,
      frameEvidenceSelectionTraceDetail(selection, { clauseIdx: layout.clauseIndexOfToken(pos) })
    ));
  }
  const selectedIndex = selection.selected.candidate.index;
  const selected = matched.find(([translationIndex]) => translationIndex === selectedIndex);
  return selected ?? matched[0]!;
}

function frameEvidenceInputsFromTranslation(translationIndex: number, translation: ContextSense): readonly FrameEvidenceInput[] {
  const frameData = frameDataAlternatives(translation);
  const alternatives = frameData.length === 0 ? [null] : frameData;
  return alternatives.map((frame) =>
    new FrameEvidenceInput(
      translationIndex,
      translationIndex,
      translation.korean ?? "",
      intMetadata(translation, "priorityGroup", translationIndex),
      intMetadata(translation, "priorityInGroup", translationIndex),
      optionalIntMetadata(translation, "senseIndex"),
      frame
    )
  );
}

function frameDataAlternatives(translation: ContextSense): readonly FrameJsonMap[] {
  const frames = senseFramesSequence(translation);
  if (frames !== null) {
    return frames.filter(isFrameJsonMap);
  }
  let frameData: FrameJsonMap | null = null;
  if (isFrameJsonMap(translation.senseFrame) && hasFrameSourceConditions(translation.senseFrame)) {
    frameData = translation.senseFrame;
  } else if (isFrameJsonMap(translation.senseFrame)) {
    frameData = translation.senseFrame;
  }
  return frameData === null ? [] : [frameData];
}

function frameConditionEvaluator(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  layout: ClauseLayout | null,
  grammar: ContextGrammar | null,
  lookups: LookupTables,
  numeric: NumericTables,
  contentMap: ContextContentMap | null = null
) {
  return (_candidate: FrameEvidenceInput, kind: string, conditions: FrameJsonMap): ConditionEvidenceResult => {
    if (kind === "clause") {
      if (layout === null) {
        return new ConditionEvidenceResult(false, "clause_unknown");
      }
      return evaluateClauseConditions(tokens, pos, layout, null, conditions);
    }
    if (kind === "participant") {
      return new ConditionEvidenceResult(false, "participant_context_unavailable");
    }
    const state = evaluateFrameSourceCondition(conditions, tokens, pos, {
      layout,
      contentMap,
      grammar,
      final: true,
      lookups,
      numeric
    });
    if (state === "match") {
      return new ConditionEvidenceResult(true);
    }
    return new ConditionEvidenceResult(false, `${kind}_${state}`);
  };
}

export function translationFrameAlternativeMatchesWithoutLayout(
  translation: ContextSense,
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  grammar: ContextGrammar | null,
  lookups: LookupTables,
  numeric: NumericTables,
  contentMap: ContextContentMap | null = null,
  cursor?: TokenCursor<RuntimeHaruToken>
): boolean {
  return senseSourceFrameMatch(translation, tokens, pos, grammar, lookups, numeric, contentMap, cursor) === "match";
}

export function senseSourceFrameMatch(
  translation: ContextSense,
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  grammar: ContextGrammar | null,
  lookups: LookupTables,
  numeric: NumericTables,
  contentMap: ContextContentMap | null = null,
  cursor?: TokenCursor<RuntimeHaruToken>
): FrameSourceConditionMatch {
  const frameData = frameDataAlternatives(translation).filter(hasFrameSourceConditions);
  if (frameData.length === 0) {
    return "match";
  }
  if (frameData.every(frameNeedsFinalClauseLayoutForSourceMatch)) {
    return "unknown";
  }
  const proto = activeProtoLayout();
  if (proto === null && frameData.every(frameNeedsProtoClauseLayoutForSourceMatch)) {
    return "unknown";
  }
  const frames = frameData.map((frame) => frameSpecFromDict(frame));
  const relationCursor = frameConditionCursor(tokens, pos, cursor);
  const argumentView = proto === null
    ? new FrameArgumentView(pos, [], [], quoteStructuralRelationsForHost(relationCursor.fork(pos, relationCursor.end, pos), lookups), true, null, tokens, lookups)
    : buildFrameArgumentView(tokens, pos, {
      lookups,
      protoLayout: proto,
      connectiveRoles: null,
      includeBorrowed: true,
      voice: grammarVoiceForFrame(grammar)
    });
  const candidate = new FrameEvidenceInput(
    0,
    0,
    translation.korean ?? "",
    intMetadata(translation, "priorityGroup", 0),
    intMetadata(translation, "priorityInGroup", 0),
    optionalIntMetadata(translation, "senseIndex"),
    frameData[0] ?? null
  );
  try {
    const [match] = selectFrameMatch(frames, argumentView, {
      candidate,
      predicateIdx: pos,
      lookupResolver: boundNamedLookupResolver(lookups),
      conditionEvaluator: frameConditionEvaluator(tokens, pos, null, grammar, lookups, numeric, contentMap)
    });
    return match === null ? "fail" : "match";
  } catch (error) {
    if (error instanceof UnknownLookupSet) {
      return "fail";
    }
    throw error;
  }
}

function frameNeedsFinalClauseLayoutForSourceMatch(frame: FrameJsonMap): boolean {
  return "clauseConditions" in frame ||
    "participantConditions" in frame ||
    lexicalConditionsNeedFinalClauseLayout(frame.lexicalConditions);
}

function frameNeedsProtoClauseLayoutForSourceMatch(frame: FrameJsonMap): boolean {
  return "slots" in frame;
}

function lexicalConditionsNeedFinalClauseLayout(value: FrameJsonValue | undefined): boolean {
  if (!isFrameJsonMap(value)) {
    return false;
  }
  return "prevCaseExists" in value || "asSuruVerbClauseScoped" in value;
}

export function translationFrameAlternativeMatches(
  translation: ContextSense,
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  layout: ClauseLayout,
  grammar: ContextGrammar | null,
  lookups: LookupTables,
  numeric: NumericTables,
  contentMap: ContextContentMap | null = null
): boolean {
  const frameData = frameDataAlternatives(translation);
  if (frameData.length === 0) {
    return true;
  }
  const frames = frameData.map((frame) => frameSpecFromDict(frame));
  const argumentView = buildFrameArgumentView(tokens, pos, {
    lookups,
    layout,
    connectiveRoles: layout.connectiveRoles,
    includeBorrowed: true,
    voice: grammarVoiceForFrame(grammar)
  });
  const candidate = new FrameEvidenceInput(
    0,
    0,
    translation.korean ?? "",
    intMetadata(translation, "priorityGroup", 0),
    intMetadata(translation, "priorityInGroup", 0),
    optionalIntMetadata(translation, "senseIndex"),
    frameData[0] ?? null
  );
  try {
    const [match] = selectFrameMatch(frames, argumentView, {
      candidate,
      predicateIdx: pos,
      lookupResolver: boundNamedLookupResolver(lookups),
      conditionEvaluator: frameConditionEvaluator(tokens, pos, layout, grammar, lookups, numeric, contentMap)
    });
    return match !== null;
  } catch (error) {
    if (error instanceof UnknownLookupSet) {
      return false;
    }
    throw error;
  }
}

function hasSenseFramesField(translation: ContextSense): boolean {
  return senseFramesSequence(translation) !== null;
}

function senseFramesSequence(translation: ContextSense): readonly SenseFrameLike[] | null {
  if (Array.isArray(translation.senseFrames)) {
    return translation.senseFrames;
  }
  return null;
}

function intMetadata(translation: ContextSense, key: "priorityGroup" | "priorityInGroup", fallback: number): number {
  const value = translation[key];
  const result = pythonIntMetadataValue(value);
  return result ?? fallback;
}

function optionalIntMetadata(translation: ContextSense, key: "senseIndex"): number | null {
  const value = translation[key];
  return pythonIntMetadataValue(value);
}

function pythonIntMetadataValue(value: number | string | boolean | null | undefined): number | null {
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function isFrameJsonMap(value: FrameJsonValue | SenseFrameLike | null | undefined): value is FrameJsonMap {
  return value !== null && value !== undefined && typeof value === "object" && !Array.isArray(value);
}

function pythonTruthyFrameDefault(frame: SenseFrameLike | FrameJsonMap): boolean {
  const value = frame.default;
  if (value === undefined || value === null || value === false) {
    return false;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    return value.length > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === "object") {
    return Object.keys(value).length > 0;
  }
  return true;
}

export function grammarVoiceForFrame(grammar: ContextGrammar | null): string | null {
  const voice = grammar?.voice;
  if (voice === undefined || voice === null) {
    return null;
  }
  return typeof voice === "string" ? voice : JSON.stringify(voice);
}

function selectTranslation(
  entry: ContextSenseEntry,
  senses: readonly ContextSense[],
  index: number,
  selected: ContextSense
): ContextSenseEntry {
  if (index === 0) {
    return entry;
  }
  return {
    ...entry,
    senses: [
      selected,
      ...senses.filter((_, candidateIndex) => candidateIndex !== index)
    ]
  };
}

function selectTranslationGroup(
  entry: ContextSenseEntry,
  senses: readonly ContextSense[],
  selectedGroup: readonly (readonly [number, ContextSense])[]
): ContextSenseEntry {
  const selectedIndices = new Set(selectedGroup.map(([index]) => index));
  if (selectedGroup.every(([index], order) => index === order)) {
    return entry;
  }
  return {
    ...entry,
    senses: [
      ...selectedGroup.map(([, selected]) => selected),
      ...senses.filter((_, candidateIndex) => !selectedIndices.has(candidateIndex))
    ]
  };
}

function withoutAnyOf(ctx: FrameSourceCondition): FrameSourceCondition {
  const { anyOf: _anyOf, ...rest } = ctx;
  return rest;
}

export function normalizeFrameSourceCondition(ctx: FrameSourceCondition | FrameJsonMap): FrameSourceCondition {
  return camelizeKeys(ctx) as FrameSourceCondition;
}

function mergeMatchState(left: FrameSourceConditionMatch, right: FrameSourceConditionMatch): FrameSourceConditionMatch {
  if (left === "fail" || right === "fail") {
    return "fail";
  }
  if (left === "unknown" || right === "unknown") {
    return "unknown";
  }
  return "match";
}

function evaluateBoolCondition(
  key: keyof ContextGrammar,
  expected: boolean | undefined,
  grammar: ContextGrammar | null | undefined,
  final: boolean
): FrameSourceConditionMatch {
  if (expected === undefined) {
    return "match";
  }
  const actual = grammar?.[key];
  if (actual === undefined || actual === null) {
    return final ? "fail" : "unknown";
  }
  return Boolean(actual) === expected ? "match" : "fail";
}

function evaluateVoiceCondition(
  expected: string | readonly string[] | undefined,
  grammar: ContextGrammar | null | undefined,
  final: boolean
): FrameSourceConditionMatch {
  if (expected === undefined) {
    return "match";
  }
  const actual = grammar?.voice;
  if (actual === undefined || actual === null) {
    return final ? "fail" : "unknown";
  }
  const expectedValues = typeof expected === "string" ? [expected] : expected;
  const actualValues = typeof actual === "string" ? [actual] : actual;
  return actualValues.some((value) => expectedValues.includes(value)) ? "match" : "fail";
}

function evaluateEnumCondition(
  key: keyof ContextGrammar,
  expected: string | readonly string[] | undefined,
  grammar: ContextGrammar | null | undefined,
  final: boolean
): FrameSourceConditionMatch {
  if (expected === undefined) {
    return "match";
  }
  const actual = grammar?.[key];
  if (actual === undefined || actual === null) {
    return final ? "fail" : "unknown";
  }
  const expectedValues = new Set(typeof expected === "string" ? [expected] : expected);
  const actualValues = typeof actual === "string" || typeof actual === "boolean" ? [String(actual)] : actual.map((item) => String(item));
  return actualValues.some((item) => expectedValues.has(item)) ? "match" : "fail";
}

function posPrefixAt(tokens: readonly RuntimeHaruToken[], pos: number, prefixes: readonly (readonly string[])[]): boolean {
  const token = tokens[pos];
  return token !== undefined && anyPosPrefixMatch(token.pos, prefixes);
}

function transparentCopulaFocusNextIndex(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): number | null {
  const copula = tokens[pos + 1];
  const focus = tokens[pos + 2];
  if (
    copula === undefined ||
    focus === undefined ||
    focus.surface !== "も" ||
    (focus.pos & POS01) !== 助詞_係助詞
  ) {
    return null;
  }
  const copulaPos4 = copula.pos & POS4;
  const copulaPos5A = copula.pos & POS5A;
  if (
    copula.surface === "で" &&
    ((copula.pos & POS0) === 助詞 || copulaPos4 === 助動詞_ダ) &&
    copulaPos5A === 連用形_
  ) {
    return pos + 3;
  }
  return null;
}

function anyPosPrefixMatch(tokenPos: number, prefixes: readonly (readonly string[])[]): boolean {
  return prefixes.some((prefix) => {
    const numericPrefix = posFromStrings(prefix);
    const depth = prefix.length;
    if (depth <= 0 || depth > POS_DEPTH_MASK.length) return false;
    const mask = POS_DEPTH_MASK[depth] ?? 0;
    return (tokenPos & mask) === (numericPrefix & mask);
  });
}

export function isBareNounContext(tokens: readonly RuntimeHaruToken[], pos: number): boolean {
  const token = tokens[pos];
  if (token === undefined || !pos0in(token.pos, NOMINAL_BITS)) {
    return false;
  }
  const previousIndex = previousNonSpaceIndex(tokens, pos);
  if (previousIndex === null) {
    return true;
  }
  const previous = tokens[previousIndex];
  if (previous === undefined) {
    return true;
  }
  if (pos0in(previous.pos, PUNCTUATION_BITS)) {
    return true;
  }
  return (previous.pos & POS0) === 助詞 && !hasContextNoMarker(previous, previousIndex);
}

function hasContextNoMarker(token: RuntimeHaruToken | undefined, index: number): boolean {
  return nominalLinkMarkerRelationForToken(token, index, {
    consumers: ["projection_context"]
  }) !== null ||
    pronominalNoMarkerRelationForToken(token, index, {
      requirement: "case_particle_tail",
      consumers: ["projection_context"]
    }) !== null ||
    predicateNominalizerRelationForToken(token, index, {
      requirement: "quote_tail_marker",
      consumers: ["projection_context"]
    }) !== null;
}

function hasQuoteMarkerInContext(tokens: readonly RuntimeHaruToken[]): boolean {
  return tokens.some((_, index) =>
    quoteMarkerRelationAt(tokens, index, { consumers: ["projection_context"] }) !== null
  );
}

export function isAsSuruVerbAdjacent(tokens: readonly RuntimeHaruToken[], pos: number): boolean {
  const nextIndex = nextNonSpaceIndex(tokens, pos + 1) ?? tokens.length;
  const next = tokens[nextIndex];
  return next !== undefined && isSuruVerb(next);
}

export function isAsSuruVerbClauseScoped(tokens: readonly RuntimeHaruToken[], pos: number, layout: ClauseLayout | null = null): boolean {
  if (isAsSuruVerbAdjacent(tokens, pos)) {
    return true;
  }

  const particleIndex = nextNonSpaceIndex(tokens, pos + 1);
  if (particleIndex !== null) {
    const index = particleIndex;
    const token = tokens[index];
    if (token !== undefined && (token.pos & POS01) === 助詞_格助詞) {
      const ownerIdx = layout?.ownerPredicateOfParticle(index);
      if (ownerIdx !== undefined && layout !== null && !layout.isQuoteTrappedArgument(index, ownerIdx)) {
        const owner = tokens[ownerIdx];
        if (owner !== undefined && isSuruVerb(owner)) {
          return true;
        }
        if (token.surface === "が" && (owner?.dictionaryForm === "できる" || owner?.dictionaryForm === "出来る")) {
          return true;
        }
      }
    }
  }

  const markerIndex = nextTransparentEvidenceIndex(tokens, pos + 1, {
    isTransparentToken: (token) => (token.pos & POS01) === 助詞_副助詞
  })?.index ?? tokens.length;
  const marker = tokens[markerIndex];
  if (((marker?.pos ?? 0) & POS01) === 助詞_係助詞 && ["は", "も"].includes(marker?.surface ?? "")) {
    const verbIndex = nextTransparentEvidenceIndex(tokens, markerIndex + 1, {
      isTransparentToken: (token) => {
        const p0 = token.pos & POS0;
        return p0 === 副詞 || p0 === 助動詞;
      }
    })?.index ?? tokens.length;
    const verb = tokens[verbIndex];
    return ((verb?.pos ?? 0) & POS0) === 動詞 && ["できる", "出来る"].includes(verb?.dictionaryForm ?? "");
  }

  return false;
}

function isSuruVerb(token: RuntimeHaruToken): boolean {
  return isVerbLemma(token, "する");
}


function prevCaseNounSurfaceMatches(
  expectedByParticle: Record<string, unknown>,
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  layout: ClauseLayout | null,
  lookups: LookupTables
): boolean {
  const clause = layout?.clauseOfToken(pos);
  const lower = clause?.start ?? 0;
  for (const [particleSurface, expected] of Object.entries(expectedByParticle)) {
    if (typeof expected !== "string" && !isReadonlyStringArray(expected)) {
      return false;
    }
    const expectedSet = new Set(typeof expected === "string" ? [expected] : expected);
    if (!hasPreviousCaseNounSurface(tokens, pos, particleSurface, expectedSet, layout, lower, lookups)) {
      return false;
    }
  }
  return true;
}

function prevCaseNounLookupMatches(
  expectedByParticle: Record<string, unknown>,
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  layout: ClauseLayout | null,
  lookups: LookupTables
): boolean {
  const clause = layout?.clauseOfToken(pos);
  const lower = clause?.start ?? 0;
  for (const [particleSurface, value] of Object.entries(expectedByParticle)) {
    if (!isLookupConditionValue(value)) {
      return false;
    }
    if (!hasPreviousCaseNounLookup(tokens, pos, particleSurface, value, layout, lower, lookups)) {
      return false;
    }
  }
  return true;
}

function prevCaseCategoryMatches(
  expectedByParticle: Record<string, string | readonly string[]>,
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  layout: ClauseLayout | null,
  lookups: LookupTables
): boolean {
  const clause = layout?.clauseOfToken(pos);
  const lower = clause?.start ?? 0;
  for (const [particleSurface, expected] of Object.entries(expectedByParticle)) {
    const categories = typeof expected === "string" ? [expected] : expected;
    if (!hasPreviousCaseCategory(tokens, pos, particleSurface, categories, layout, lower, lookups)) {
      return false;
    }
  }
  return true;
}

function prevCaseExistsMatches(
  particleSurfaces: readonly string[],
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  layout: ClauseLayout | null
): boolean {
  if (layout === null || particleSurfaces.length === 0) {
    return false;
  }
  const clause = layout.clauseOfToken(pos);
  if (clause === undefined) {
    return false;
  }
  const predicateIdx = clause.predicates.includes(pos)
    ? pos
    : pos > 0 && clause.predicates.includes(pos - 1)
      ? pos - 1
      : null;
  const particleIndices = predicateIdx === null
    ? predicateLessSahenNominalHostParticleIndices(tokens, pos, clause)
    : clause.particlesOf(predicateIdx);
  for (const particleIdx of particleIndices) {
    const particle = tokens[particleIdx];
    if (
      particle !== undefined &&
      (particle.pos & POS0) === 助詞 &&
      particleSurfaces.includes(particle.surface) &&
      previousCaseParticleCanReachSahenHost(tokens, particleIdx, pos, clause)
    ) {
      return true;
    }
  }
  return false;
}

function previousCaseParticleCanReachSahenHost(
  tokens: readonly RuntimeHaruToken[],
  particleIdx: number,
  pos: number,
  clause: Clause
): boolean {
  const stemIdx = sahenNominalHostStemIndex(tokens, pos) ?? pos;
  if (particleIdx >= stemIdx || particleIdx < clause.start || stemIdx >= clause.end) {
    return false;
  }
  return nextTransparentEvidenceIndex(tokens, particleIdx + 1, {
    endExclusive: stemIdx,
    transparentSpanEndExclusive: sahenHostTransparentModifierSpanEndExclusive,
    isTransparentToken: (token) => {
      const p0 = token.pos & POS0;
      return p0 === 副詞 || p0 === 助詞 || p0 === 接頭辞;
    }
  }) === null;
}

function sahenHostTransparentModifierSpanEndExclusive(
  tokens: readonly RuntimeHaruToken[],
  index: number,
  endExclusive: number
): number | null {
  const token = tokens[index];
  if (token === undefined) {
    return null;
  }
  const pos0 = token.pos & POS0;
  if (pos0 === 形容詞0 && (token.pos & POS5A) === 連用形_) {
    return index + 1;
  }
  if (pos0 !== 形状詞 || index + 1 >= endExclusive) {
    return null;
  }
  const copula = tokens[index + 1];
  if (
    copula !== undefined &&
    (copula.pos & (POS0 | POS4 | POS5A)) === (助動詞 | 助動詞_ダ | 連用形_)
  ) {
    return index + 2;
  }
  return null;
}

function predicateLessSahenNominalHostParticleIndices(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  clause: Clause
): readonly number[] {
  if (clause.predicates.length !== 0) {
    return [];
  }
  const stemIdx = sahenNominalHostStemIndex(tokens, pos);
  if (stemIdx === null || stemIdx < clause.start || stemIdx >= clause.end) {
    return [];
  }
  return clause.particleIndices.filter((idx) =>
    idx < stemIdx &&
    isContextPredicateArgumentParticle(tokens[idx])
  );
}

function sahenNominalHostStemIndex(tokens: readonly RuntimeHaruToken[], pos: number): number | null {
  const before = tokens[pos - 1];
  const here = tokens[pos];
  if (isSuruLikeToken(here) && before !== undefined && isSahenCapableNominal(before)) {
    return pos - 1;
  }
  if (here !== undefined && isSahenCapableNominal(here) && isSuruLikeToken(tokens[pos + 1])) {
    return pos;
  }
  return null;
}

function isSuruLikeToken(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined && (token.pos & POS0) === 動詞 && (token.dictionaryForm === "する" || token.surface === "する" || token.surface === "し");
}

function isContextPredicateArgumentParticle(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined || (token.pos & POS0) !== 助詞) {
    return false;
  }
  return (token.pos & POS01) === 助詞_格助詞 || token.surface === "まで";
}

function findPreviousCaseNoun(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  particleSurface: string,
  layout: ClauseLayout | null,
  lower: number,
  lookups: LookupTables,
  predicate: (noun: RuntimeHaruToken) => boolean,
): boolean {
  for (let particleIdx = pos - 1; particleIdx >= lower; particleIdx -= 1) {
    const particle = tokens[particleIdx];
    if (particle === undefined || (particle.pos & POS0) !== 助詞 || particle.surface !== particleSurface) {
      continue;
    }
    if (layout !== null && layout.isQuoteTrappedArgument(particleIdx, pos)) {
      continue;
    }
    const noun = findNounBeforeParticle(tokens, particleIdx, lookups);
    if (noun !== undefined && predicate(noun)) {
      return true;
    }
  }
  return false;
}

function hasPreviousCaseCategory(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  particleSurface: string,
  categories: readonly string[],
  layout: ClauseLayout | null,
  lower: number,
  lookups: LookupTables
): boolean {
  return findPreviousCaseNoun(tokens, pos, particleSurface, layout, lower, lookups,
    (noun) => tokenInSemanticCategories(noun, categories, lookups));
}

function evaluateArgumentNounSurfaceCondition(
  expectedByParticle: Record<string, ArgumentConditionValue> | undefined,
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  layout: ClauseLayout | null,
  final: boolean,
  lookups: LookupTables
): FrameSourceConditionMatch {
  return evaluateArgumentCondition(expectedByParticle, tokens, pos, layout, final, "surface", lookups);
}

function evaluateArgumentCategoryCondition(
  expectedByParticle: Record<string, ArgumentConditionValue> | undefined,
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  layout: ClauseLayout | null,
  final: boolean,
  lookups: LookupTables
): FrameSourceConditionMatch {
  return evaluateArgumentCondition(expectedByParticle, tokens, pos, layout, final, "category", lookups);
}

function evaluateArgumentCondition(
  expectedByParticle: Record<string, ArgumentConditionValue> | undefined,
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  layout: ClauseLayout | null,
  final: boolean,
  mode: "surface" | "category",
  lookups: LookupTables
): FrameSourceConditionMatch {
  if (expectedByParticle === undefined) {
    return "match";
  }
  const proto = activeProtoLayout();
  if (layout === null && proto === null) {
    return final ? "fail" : "unknown";
  }
  if (layout !== null && layout.clauseOfPredicate(pos) === undefined) {
    return "fail";
  }
  const connectiveRoles = layout === null || layout.connectiveRoles.size === 0 ? null : layout.connectiveRoles;
  const view = new PredicateArgumentView(tokens, pos, {
    lookups,
    layout,
    protoLayout: proto,
    connectiveRoles
  });
  let state: FrameSourceConditionMatch = "match";
  for (const [particleSurface, rawValue] of Object.entries(expectedByParticle)) {
    const values = normalizeArgumentValue(rawValue, lookups);
    if (values === null) {
      return "fail";
    }
    if (argumentViewMatches(view, mode, particleSurface, values, false)) {
      continue;
    }
    if (!argumentValueAllowsBorrow(rawValue)) {
      return "fail";
    }
    if (argumentViewMatches(view, mode, particleSurface, values, true)) {
      continue;
    }
    if (connectiveRoles === null) {
      if (final) {
        return "fail";
      }
      state = "unknown";
      continue;
    }
    return "fail";
  }
  return state;
}

function argumentViewMatches(
  view: PredicateArgumentView,
  mode: "surface" | "category",
  particleSurface: string,
  values: ReadonlySet<string>,
  includeBorrowed: boolean
): boolean {
  return mode === "surface"
    ? view.hasArgumentNounSurface(particleSurface, [...values], { includeBorrowed })
    : view.hasArgumentCategory(particleSurface, [...values], { includeBorrowed });
}

function normalizeArgumentValue(value: ArgumentConditionValue, lookups: LookupTables): ReadonlySet<string> | null {
  if (typeof value === "string") {
    return new Set([value]);
  }
  if (isReadonlyStringArray(value)) {
    return new Set(value);
  }
  const collected = new Set<string>();
  let hadAny = false;
  const raw = value.values ?? value.value ?? value.category;
  if (raw !== undefined) {
    hadAny = true;
    if (typeof raw === "string") {
      collected.add(raw);
    } else if (isReadonlyStringArray(raw)) {
      for (const item of raw) {
        collected.add(item);
      }
    } else {
      return null;
    }
  }
  if (value.lookup !== undefined) {
    hadAny = true;
    for (const item of resolveLookupConditionSet(value.lookup, lookups)) {
      collected.add(item);
    }
  }
  return hadAny ? collected : null;
}

function argumentValueAllowsBorrow(value: ArgumentConditionValue): boolean {
  if (typeof value !== "object" || isReadonlyStringArray(value)) {
    return true;
  }
  const allowBorrowed = value.allowBorrowed;
  return allowBorrowed === undefined ? true : Boolean(allowBorrowed);
}

function isReadonlyStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isLookupConditionValue(value: unknown): value is LookupConditionValue {
  if (typeof value === "string" || isReadonlyStringArray(value)) {
    return true;
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (record.sets === undefined || typeof record.sets === "string" || isReadonlyStringArray(record.sets)) &&
    (record.extras === undefined || isReadonlyStringArray(record.extras)) &&
    (record.exclude === undefined || isReadonlyStringArray(record.exclude));
}

function hasPreviousCaseNounSurface(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  particleSurface: string,
  expected: ReadonlySet<string>,
  layout: ClauseLayout | null,
  lower: number,
  lookups: LookupTables
): boolean {
  return findPreviousCaseNoun(tokens, pos, particleSurface, layout, lower, lookups,
    (noun) => argumentNounLookupMatches(noun, expected));
}

function hasPreviousCaseNounLookup(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  particleSurface: string,
  expected: LookupConditionValue,
  layout: ClauseLayout | null,
  lower: number,
  lookups: LookupTables
): boolean {
  return findPreviousCaseNoun(tokens, pos, particleSurface, layout, lower, lookups,
    (noun) => lookupConditionMatches(expected, argumentNounLookupForms(noun), lookups));
}

function findNounBeforeParticle(tokens: readonly RuntimeHaruToken[], particlePos: number, lookups: LookupTables): RuntimeHaruToken | undefined {
  const noun = getArgumentNounBeforeParticle(tokens, particlePos, lookups);
  return noun === null ? undefined : {
    surface: noun.surface,
    dictionaryForm: noun.dictionaryForm,
    reading: noun.reading ?? "",
    dictionaryFormReading: noun.dictionaryFormReading ?? "",
    pos: noun.pos,
    dictionaryId: noun.dictionaryId ?? -1,
    ...(noun.numericCounterHeadForm !== undefined ? { numericCounterHeadForm: noun.numericCounterHeadForm } : {})
  };
}


function findPreviousNounForContext(tokens: readonly RuntimeHaruToken[], pos: number, layout: ClauseLayout | null, lookups: LookupTables): RuntimeHaruToken | undefined {
  const clause = layout?.clauseOfToken(pos);
  if (layout !== null && clause !== undefined) {
    for (const particleIdx of [...clause.particlesOf(pos)].reverse()) {
      if (particleIdx >= pos) {
        continue;
      }
      if (layout.isQuoteTrappedArgument(particleIdx, pos)) {
        continue;
      }
      const noun = findNounBeforeParticle(tokens, particleIdx, lookups);
      if (noun !== undefined) {
        return noun;
      }
    }
  }
  const lower = clause?.start ?? 0;
  const evidence = previousTransparentEvidenceIndex(tokens, pos, {
    lowerBoundInclusive: lower,
    isTransparentToken: isContextContentHeadTransparentToken
  });
  if (evidence === null) {
    return undefined;
  }
  const combined = numericCounterContextToken(tokens, evidence.index);
  if (combined !== undefined) {
    return combined;
  }
  const token = tokens[evidence.index];
  return token !== undefined && pos0in(token.pos, NOMINAL_BITS) ? token : undefined;
}

function numericCounterContextToken(tokens: readonly RuntimeHaruToken[], index: number): RuntimeHaruToken | undefined {
  if (index <= 0 || index >= tokens.length) {
    return undefined;
  }
  const counter = tokens[index];
  const number = tokens[index - 1];
  if (counter === undefined || number === undefined || (counter.pos & POS0) !== 接尾辞 || (number.pos & POS01) !== 名詞_数詞) {
    return undefined;
  }
  const surface = `${number.surface}${counter.surface}`;
  if (surface.length === 0) {
    return undefined;
  }
  return {
    surface,
    dictionaryForm: surface,
    reading: `${number.reading}${counter.reading}`,
    dictionaryFormReading: `${number.dictionaryFormReading}${counter.dictionaryFormReading}`,
    pos: 名詞_普通名詞,
    dictionaryId: -1,
    numericCounterHeadForm: counter.dictionaryForm || counter.surface
  };
}

function findPreviousContentForContext(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  layout: ClauseLayout | null,
  contentMap: ContextContentMap | null
): RuntimeHaruToken | undefined {
  const clause = layout?.clauseOfToken(pos);
  const lower = clause?.start ?? 0;
  const found = scanPreviousContentForContext(tokens, pos - 1, lower, layout, contentMap);
  if (found !== undefined) {
    return found;
  }
  if (
    layout !== null &&
    clause !== undefined &&
    clause.start > 0 &&
    !pos0in(tokens[clause.start]?.pos ?? 0, PUNCTUATION_BITS)
  ) {
    const previousClause = layout.clauseOfToken(clause.start - 1);
    if (
      previousClause !== undefined &&
      previousClause.terminatedBy === "connective" &&
      !layout.closesAsDetachedUtterance(previousClause)
    ) {
      return scanPreviousContentForContext(tokens, clause.start - 1, previousClause.start, layout, contentMap);
    }
  }
  return undefined;
}

function scanPreviousContentForContext(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  lower: number,
  layout: ClauseLayout | null,
  contentMap: ContextContentMap | null
): RuntimeHaruToken | undefined {
  for (let index = start; index >= lower; index -= 1) {
    const spanStart = adverbialNiContentSpanStartCovering(contentMap, index, lower);
    if (spanStart !== null) {
      index = spanStart;
      continue;
    }
    const token = tokens[index];
    if (token === undefined) {
      return undefined;
    }
    if ((token.pos & POS0) === 助動詞 || isContextContentHeadTransparentToken(token)) {
      continue;
    }
    if (layout === null && pos0in(token.pos, PUNCTUATION_BITS)) {
      return undefined;
    }
    return token;
  }
  return undefined;
}

function adverbialNiContentSpanStartCovering(
  contentMap: ContextContentMap | null,
  index: number,
  lower: number
): number | null {
  if (contentMap === null) {
    return null;
  }
  for (let start = index; start >= lower; start -= 1) {
    const span = contextContentSpanAt(contentMap, start);
    if (span === undefined || span.renderPlan?.kind !== "lexicalParticleAdverbial") {
      continue;
    }
    const consumed = Math.max(1, span.consumed ?? 1);
    if (start <= index && index < start + consumed) {
      return start;
    }
  }
  return null;
}

function contextContentSpanAt(
  contentMap: ContextContentMap,
  index: number
): ContextContentSpan | undefined {
  if (contentMap instanceof Map) {
    return contentMap.get(index);
  }
  const indexed = contentMap as { readonly [index: number]: ContextContentSpan | undefined };
  return indexed[index];
}

function evaluatePrevAttributiveContentSurface(
  expected: string | readonly string[] | undefined,
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  layout: ClauseLayout | null,
  final: boolean
): FrameSourceConditionMatch {
  if (expected === undefined) {
    return "match";
  }
  if (layout === null) {
    return final ? "fail" : "unknown";
  }
  const expectedSet = new Set(typeof expected === "string" ? [expected] : expected);
  for (const clause of findPreviousAttributiveClausesForContext(pos, layout)) {
    for (const form of iterAttributiveContentForms(tokens, clause)) {
      if (expectedSet.has(form)) {
        return "match";
      }
    }
  }
  return "fail";
}

function evaluatePrevAttributiveIntervalVariant(
  expected: string | readonly string[] | undefined,
  pos: number,
  contentMap: ContextContentMap | null,
  final: boolean
): FrameSourceConditionMatch {
  if (expected === undefined) {
    return "match";
  }
  if (contentMap === null) {
    return final ? "fail" : "unknown";
  }
  const spans: readonly (ContextContentSpan | undefined)[] = contentMap instanceof Map
    ? [...contentMap.values()]
    : Object.values(contentMap as { readonly [index: number]: ContextContentSpan | undefined });
  const variant = temporalIntervalVariantHeadedAt(
    spans.map((span) => span?.renderPlan as RenderPlan | null | undefined),
    pos
  );
  if (variant === null) {
    return "fail";
  }
  const expectedSet = new Set(typeof expected === "string" ? [expected] : expected);
  return expectedSet.has(variant) ? "match" : "fail";
}

function findPreviousAttributiveClausesForContext(
  pos: number,
  layout: ClauseLayout
): readonly NonNullable<ReturnType<ClauseLayout["clauseOfToken"]>>[] {
  const currentClauseIdx = layout.clauseIndexOfToken(pos);
  if (currentClauseIdx < 0) {
    return [];
  }
  return layout.clauses.filter((clause) =>
    clause.kind === "relative" &&
    clause.terminatedBy === "attributive" &&
    clause.parentIdx === currentClauseIdx &&
    clause.end === pos
  );
}

function iterAttributiveContentForms(
  tokens: readonly RuntimeHaruToken[],
  clause: NonNullable<ReturnType<ClauseLayout["clauseOfToken"]>>
): readonly string[] {
  const forms: string[] = [];
  for (let index = clause.start; index < clause.end; index += 1) {
    const token = tokens[index];
    if (token === undefined || !isAttributiveContextContentToken(token)) {
      continue;
    }
    const form = token.dictionaryForm || token.surface;
    if (form.length > 0) {
      forms.push(form);
    }
  }
  return forms;
}

function isAttributiveContextContentToken(token: RuntimeHaruToken): boolean {
  return pos0in(token.pos, NOMINAL_BITS | PREDICATE_BITS | (1 << 動詞) | (1 << 副詞) | (1 << 連体詞));
}

function findNextNounForContext(tokens: readonly RuntimeHaruToken[], pos: number, layout: ClauseLayout | null): RuntimeHaruToken | undefined {
  const clause = layout?.clauseOfToken(pos);
  const upper = clause === undefined ? tokens.length : contextScanUpper(tokens, clause);
  const cursor = new TokenCursor(tokens, pos + 1, upper);
  while (cursor.current() !== undefined) {
    const token = cursor.current()!;
    if (pos0in(token.pos, (1 << 助動詞) | (1 << 助詞))) {
      cursor.advance();
      continue;
    }
    return pos0in(token.pos, NOMINAL_BITS) ? token : undefined;
  }
  return undefined;
}

function findModifiedHeadNounForContext(tokens: readonly RuntimeHaruToken[], pos: number): RuntimeHaruToken | undefined {
  const index = nextNonSpaceIndex(tokens, pos + 1);
  if (index === null) {
    return undefined;
  }
  const token = tokens[index];
  return token !== undefined && pos0in(token.pos, NOMINAL_BITS) ? token : undefined;
}

function findNextContentForContext(tokens: readonly RuntimeHaruToken[], pos: number, layout: ClauseLayout | null): RuntimeHaruToken | undefined {
  const index = findNextContentIndexForContext(tokens, pos, layout);
  return index === null ? undefined : tokens[index];
}

function extentPhraseEvidenceEnd(
  layout: ClauseLayout,
  tokens: readonly RuntimeHaruToken[],
  pos: number
): number {
  const windowEnd = clauseProjectionEvidenceWindowForToken(layout, tokens, pos)?.end ?? tokens.length;
  const clause = layout.clauseOfToken(pos);
  if (clause === undefined || clause.kind !== "relative" || clause.parentIdx === null) {
    return windowEnd;
  }
  const parent = layout.clauseOfToken(clause.end);
  if (
    parent === undefined ||
    layout.clauseIndexOfToken(clause.end) !== clause.parentIdx ||
    parent.start !== clause.end
  ) {
    return windowEnd;
  }
  return Math.max(windowEnd, parent.end);
}

function findNextContentIndexForContext(tokens: readonly RuntimeHaruToken[], pos: number, layout: ClauseLayout | null): number | null {
  const clause = layout?.clauseOfToken(pos);
  const upper = clause === undefined ? tokens.length : contextScanUpper(tokens, clause);
  const cursor = new TokenCursor(tokens, pos + 1, upper);
  while (cursor.current() !== undefined) {
    const token = cursor.current()!;
    if (pos0in(token.pos, (1 << 助動詞) | (1 << 助詞) | (1 << 補助記号) | (1 << 記号))) {
      cursor.advance();
      continue;
    }
    return cursor.pos;
  }
  return null;
}

function findFollowingNounForContext(tokens: readonly RuntimeHaruToken[], pos: number, layout: ClauseLayout | null): RuntimeHaruToken | undefined {
  const clause = layout?.clauseOfToken(pos);
  const upper = clause !== undefined && layout !== null ? followingNounScanUpper(tokens, pos, clause, layout) : tokens.length;
  const cursor = new TokenCursor(tokens, pos + 1, upper);
  while (cursor.current() !== undefined) {
    const token = cursor.current()!;
    if (pos0in(token.pos, PUNCTUATION_BITS)) {
      break;
    }
    if (pos0in(token.pos, NOMINAL_BITS)) {
      return token;
    }
    cursor.advance();
  }
  return undefined;
}

function isContextContentHeadTransparentToken(token: RuntimeHaruToken | undefined): boolean {
  return isClauseContentHeadTransparentToken(token);
}

function contextScanUpper(tokens: readonly RuntimeHaruToken[], clause: NonNullable<ReturnType<ClauseLayout["clauseOfToken"]>>): number {
  return clause.terminatedBy === "attributive" ? Math.min(clause.end + 1, tokens.length) : clause.end;
}

function followingNounScanUpper(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  clause: NonNullable<ReturnType<ClauseLayout["clauseOfToken"]>>,
  layout: ClauseLayout
): number {
  const upper = contextScanUpper(tokens, clause);
  const clauseIdx = layout.clauseIndexOfToken(pos);
  if (clauseIdx < 0 || clause.terminatedBy !== "connective") {
    return upper;
  }
  const nextClause = layout.clauses[clauseIdx + 1];
  if (nextClause !== undefined && nextClause.start === clause.end && nextClause.terminatedBy === "attributive" && nextClause.predicates.length === 0) {
    return Math.min(nextClause.end + 1, tokens.length);
  }
  return upper;
}
