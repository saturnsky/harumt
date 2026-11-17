import type { MorphemeEntry, MorphemeSense } from "../types/dictionary.js";
import { derivationForSense } from "../dictionary/derivation.js";
import {
  stemCandidateProvenanceForTranslation,
  stemCandidateProvenanceKey
} from "./head-tail/tail/predicate-root/stem-candidate-identity.js";
import type { BenefactiveContext, ContentResult, ContentSpan, DekiruReading, RareruReading, RuleResult, RuleTraceEvent, TranslationCandidate } from "../types/pipeline.js";
import { spanLocalRenderPlanNode, type LemmaRealization, type RenderPlan, type Voice } from "../types/render-plan.js";
import type { LookupTables } from "./lookup-tables.js";
import type { CandidateProjectionSource } from "./candidate-observability.js";
import type { ResolvedCandidateSet } from "./source-candidate-set.js";
import type { Warning } from "../types/warning.js";
import {
  caseParticleMarkerRelationForToken,
  copulaNiMarkerRelationForToken,
  nominalLinkMarkerRelationForToken,
  topicFocusMarkerRelationForToken
} from "./head-tail/boundary/marker.js";
import type { CaseParticleMarkerSurface } from "./head-tail/boundary/relation.js";
import { lookupConnectiveBySurface } from "./head-tail/tail/predicate-root/grammar.js";
import { relationConnectiveSpanAt } from "./head-tail/tail/connective-span-scanner.js";
import { boundNominalReasonCompositeFollowerAdmitted } from "./head-tail/tail/predicate-root/matchers/tame-connective.js";
import { parentheticalSpanEndingAt } from "./head-tail/boundary/parenthetical.js";
import {
  isContentInternalConnectorToken,
  isNominalCoordinationSymbolToken,
  quoteBridgePunctuationRelationAt
} from "./head-tail/boundary/punctuation.js";
import { quoteMarkerRelationAt } from "./head-tail/boundary/quote-marker.js";
import { realizeRenderPlan, replaceLemmaRenderPlan, setForcePassiveRenderPlan } from "./rendering/render-plan.js";
import { META_LINGUISTIC_QUOTATIVE_HEADS } from "./head-tail/data/semantic-helper-sets.js";
import { findAdverbialModifierPredicate, type TailReachEvidence } from "./clause-layout/index.js";
import { activeProtoLayout } from "./clause-layout/proto-state.js";
import { AUTHORED_PAUSE_SEPARATIONS, nextNonSpaceIndex, separatedAs } from "./clause-layout/trivia.js";
import { runtimeTokenSourceSpan, type HaruTokenRuntimeFields } from "../types/token.js";

import {
  isCaseParticleToken,
  isConjunctionToken,
  isLexicalBareNaAdjStem,
  isNaAdjCapable,
  isNominalUseBareNaAdjStem,
  isNominalizerParticleToken,
  isSecondaryParticleToken,
  isTariNaAdjStem,
  isNaAdjCapableNoun,
  isNominalDerivationalSuffix,
  isPureNaAdjStem,
  isSahenCapableNominal,
  isVerbPredicateToken,
  NOMINAL_BITS,
  NOMINAL_KEIJOU_BITS,
  POS0,
  POS01,
  POS4,
  pos0in,
  形状詞,
  係助詞,
  助動詞,
  助動詞_ダ,
  助動詞_デス,
  助動詞_マス,
  助詞,
  助詞_終助詞,
  接尾辞_名詞的,
  補助記号,
  名詞,
  동사,
  명사,
  대명사,
  부사,
  형용사,
} from "../types/pos.js";
import { TokenCursor } from "./token-cursor.js";
import type { HeadProjectionKind } from "./head-tail/tail/predicate-root/grammar.js";
import { IU_LEXEME_FORMS } from "./head-tail/data/quoted-reporting-sets.js";
import { isAdverbialMannerNounHead } from "./head-tail/tail/predicate-root/classifiers/tokens.js";
export type NormalizedCandidateCondition = readonly [string, FrozenConditionValue];

export type FrozenConditionValue =
  | string
  | number
  | boolean
  | null
  | readonly FrozenConditionValue[]
  | readonly (readonly [string, FrozenConditionValue])[];

export interface CandidateToken extends Pick<
  HaruTokenRuntimeFields,
  "sourceOrdinal" | "sourceSpan" | "whitespaceBefore" | "transparentPauseAfter"
> {
  surface: string;
  dictionaryForm: string;
  pos: number;
}

export interface MixedPosSlotOptions {
  readonly lookups?: Pick<
    LookupTables,
    | "ADVERBIAL_MODIFIER_MANNER_NOUNS"
    | "ADVERB_COPULA_DEICTIC_EXCLUSIONS"
    | "NOMINAL_COORDINATION_CONNECTIVE_LEMMAS"
    | "NOMINAL_COORDINATION_CASE_PARTICLES"
    | "NOMINAL_COORDINATION_SYMBOL_SURFACES"
  >;
  readonly clauseReach?: ClauseTailReachEvidenceSource;
}

export interface ClauseTailReachEvidenceSource {
  tailReachEvidenceInClause(tokenIdx: number): TailReachEvidence;
}

export interface CandidateGrammar {
  voice: Voice | null;
  nareruReading: string | readonly string[] | null;
  dekiruReading: string | readonly string[] | null;
  negative: boolean;
  past: boolean | null;
  polite: boolean | null;
  causative: boolean;
  causativePassive: boolean;
  requestTail: boolean;
  benefactiveTail: boolean;
  connectiveRole: string | null;
}

export interface CandidateSpanLike {
  renderPlan?: RenderPlan | null;
  renderPlanPolicy?: TranslationCandidate["renderPlanPolicy"];
  voice?: Voice | null;
  nareruReadings?: ReadonlySet<string>;
  dekiruReadings?: ReadonlySet<string>;
  hasNegative?: boolean;
  hasCausative?: boolean;
  hasCausativePassive?: boolean;
  hasRequestTail?: boolean;
  hasBenefactiveTail?: boolean;
  connectiveRole?: string | null;
}

export interface CandidateSyncTarget extends CandidateSpanLike {
  consumed?: number;
  particleRole?: string | null;
  entry?: MorphemeEntry;
  korean?: string;
  koreanPos?: number;
  rareruReadings?: ReadonlySet<string>;
  benefactive?: BenefactiveContext;
  warnings?: readonly Warning[];
}

export function defaultBenefactiveContext(options: BenefactiveContext = {}): BenefactiveContext {
  return {
    patternId: options.patternId ?? null,
    needsBenefactivePivot: options.needsBenefactivePivot ?? false,
    agentParticleIdx: options.agentParticleIdx ?? null,
    recipientParticleIdx: options.recipientParticleIdx ?? null,
    honorificLevel: options.honorificLevel ?? "none",
    recipientSideHumble: options.recipientSideHumble ?? false,
    causativeAgentPolicy: options.causativeAgentPolicy ?? null
  };
}

const COPULA_NOMINAL_IDIOMS = new Set(["無理"]);
const MIXED_POS_NOUN_CASE_MARKER_SURFACES: readonly CaseParticleMarkerSurface[] = ["が", "を", "から", "より", "へ"];
const MIXED_POS_PREDICATE_CONNECTIVE_KINDS = new Set(["adversative", "concession", "reason"]);

export function normalizeCandidateConditions(
  ctx: Readonly<Record<string, FrozenConditionValue>> | null | undefined
): readonly NormalizedCandidateCondition[] {
  if (ctx === undefined || ctx === null) {
    return [];
  }
  return Object.entries(ctx)
    .map(([key, value]) => [key, freezeConditionValue(value)] as const)
    .sort(([left], [right]) => left.localeCompare(right));
}


export function translationCandidateFromDict(
  entry: MorphemeEntry,
  translation: MorphemeSense,
  options: {
    priority?: number;
    conditions?: readonly NormalizedCandidateCondition[];
    renderPlan?: RenderPlan | null;
    korean?: string;
    voice?: Voice | null;
    projectionOrdinal?: number;
  } = {}
): TranslationCandidate {
  const koreanLemma = translation.korean ?? "";
  const koreanPos = translation.koreanPos ?? 명사;
  const renderPlan = options.renderPlan ?? null;
  return {
    priority: options.priority ?? 0,
    conditions: options.conditions ?? [],
    entry,
    translation,
    projectionOrdinal: options.projectionOrdinal ?? 0,
    derivation: derivationForSense(translation, entry),
    koreanLemma,
    koreanPos,
    irregular: translation.irregular ?? null,
    renderPlan,
    korean: options.korean ?? "",
    voice: options.voice ?? null,
    rareruReadings: new Set(),
    nareruReadings: new Set(),
    dekiruReadings: new Set(),
    hasNegative: false,
    hasCausative: false,
    hasCausativePassive: false,
    hasRequestTail: false,
    hasBenefactiveTail: false,
    connectiveRole: null,
    benefactive: defaultBenefactiveContext()
  };
}

export function withRuleTraceEvents(result: RuleResult, ...events: readonly RuleTraceEvent[]): RuleResult {
  if (events.length === 0) {
    return result;
  }
  return {
    ...result,
    traceEvents: [...result.traceEvents ?? [], ...events]
  };
}

export function isPassiveContent(content: Pick<ContentResult, "voice">): boolean {
  return content.voice === "passive";
}

export function isPotentialContent(content: Pick<ContentResult, "voice">): boolean {
  return content.voice === "potential";
}

export function isVoiceOpenContent(content: Pick<ContentResult, "voice">): boolean {
  return content.voice === null;
}

export function defaultContentSpanFields(options: {
  readonly isKeijoujiVerbPredicate?: boolean;
  readonly benefactive?: BenefactiveContext;
} = {}): Pick<ContentSpan, "isKeijoujiVerbPredicate" | "benefactive" | "committedParticleRoles" | "sourceCandidates" | "compoundHeadFrameEntry"> {
  return {
    isKeijoujiVerbPredicate: options.isKeijoujiVerbPredicate ?? false,
    benefactive: defaultBenefactiveContext(options.benefactive),
    committedParticleRoles: {},
    sourceCandidates: null,
    compoundHeadFrameEntry: null
  };
}

export function iterTranslationCandidates(
  entry: MorphemeEntry,
  options: {
    priority?: number;
    conditions?: readonly NormalizedCandidateCondition[];
    renderPlan?: RenderPlan | null;
    korean?: string;
    voice?: Voice | null;
  } = {}
): TranslationCandidate[] {
  const senses = entry.senses ?? [];
  const projectionOrdinals = translationCandidateProjectionOrdinals(entry, senses);
  return senses.map((translation, index) => translationCandidateFromDict(entry, translation, {
    ...options,
    projectionOrdinal: projectionOrdinals[index]!
  }));
}

export function translationCandidateProjectionOrdinals(
  entry: MorphemeEntry,
  senses: readonly MorphemeSense[]
): readonly number[] {
  const counts = new Map<string, number>();
  return senses.map((sense) => {
    const derivation = derivationForSense(sense, entry);
    const key = stemCandidateProvenanceKey(stemCandidateProvenanceForTranslation(sense, derivation));
    const projectionOrdinal = counts.get(key) ?? 0;
    counts.set(key, projectionOrdinal + 1);
    return projectionOrdinal;
  });
}

export function firstTranslationCandidate(
  entry: MorphemeEntry,
  options: {
    priority?: number;
    conditions?: readonly NormalizedCandidateCondition[];
    renderPlan?: RenderPlan | null;
    korean?: string;
    voice?: Voice | null;
  } = {}
): TranslationCandidate | undefined {
  return iterTranslationCandidates(entry, options)[0];
}

export function mixedPosSlot(
  cursor: TokenCursor<CandidateToken>,
  auxTokens: readonly CandidateToken[],
  options: MixedPosSlotOptions = {}
): string | undefined {
  const startToken = cursor.current();
  const next = cursor.peek(1);
  if (startToken === undefined) {
    return undefined;
  }
  if (next !== undefined) {
    if (
      cursor.lookahead(1, isQuotedNominalTail) ||
      cursor.lookahead(1, isMetaLinguisticQuotativeTail)
    ) {
      return "quoted_nominal";
    }
    const noLinkRelation = nominalLinkMarkerRelationForToken(next, cursor.pos + 1, {
      consumers: ["content_head_dispatch"]
    });
    const clausePrefixSpanAhead = cursor.lookahead(1, (c) => relationConnectiveSpanAt(c));
    const clausePrefixConnectiveAhead = clausePrefixSpanAhead?.targetSlot === "clause_prefix" &&
      (clausePrefixSpanAhead.connectiveKind !== "tame_reason" ||
        boundNominalReasonCompositeFollowerAdmitted(cursor.tokens, clausePrefixSpanAhead.endExclusive));
    if (
      !clausePrefixConnectiveAhead &&
      (nounArgumentMarkerFollows(next, cursor.pos + 1) || noLinkRelation !== null)
    ) {
      if (noLinkRelation !== null && (startToken.pos & POS0) === 形状詞) {
        return "keijouji_suffix";
      }
      return "noun_particle";
    }
    if ((next.pos & POS01) === 接尾辞_名詞的 && next.surface === "さ") {
      return "nominalized_suffix";
    }
    const stemNominalSlot = bareStemNominalUseSlot(cursor, startToken, auxTokens, options);
    if (stemNominalSlot !== undefined) {
      return stemNominalSlot;
    }
    if (next.surface === "そう" && pos0in(next.pos, NOMINAL_KEIJOU_BITS)) {
      return "keijouji_suffix";
    }
    if ((next.pos & POS0) === 助詞 && mixedPosPredicateConnectiveSurface(next.surface)) {
      return "copula_predicate";
    }
    if (
      auxTokens.length === 0 &&
      (next.pos & POS01) === 助詞_終助詞 &&
      isNaAdjCapableNoun(startToken)
    ) {
      let sfpRunOffset = 2;
      let afterSfpRun = cursor.peek(sfpRunOffset);
      while (afterSfpRun !== undefined && (afterSfpRun.pos & POS01) === 助詞_終助詞) {
        sfpRunOffset += 1;
        afterSfpRun = cursor.peek(sfpRunOffset);
      }
      if (afterSfpRun === undefined || (afterSfpRun.pos & POS0) === 補助記号) {
        return COPULA_NOMINAL_IDIOMS.has(startToken.dictionaryForm) ? "copula_nominal_idiom" : "copula_predicate";
      }
    }
    if (auxTokens.length === 0 && pos0in(startToken.pos, NOMINAL_BITS) && (next.pos & POS0) === 名詞) {
      return "noun_only_compound";
    }
  }

  const firstAux = auxTokens[0];
  if (firstAux !== undefined) {
    const auxOffset = 1 + auxTokens.length;
    const afterAux = cursor.peek(auxOffset);
    if (firstAux.surface === "な" && firstAux.dictionaryForm === "だ" && (afterAux !== undefined && pos0in(afterAux.pos, NOMINAL_BITS))) {
      return "keijouji_suffix";
    }
    if (
      auxTokens.length === 1 &&
      copulaNiMarkerRelationForToken(firstAux, cursor.pos + auxOffset - 1, {
        consumers: ["content_resolver"]
      }) !== null &&
      afterAux !== undefined && isVerbPredicateToken(afterAux) &&
      ["なる", "なれる"].includes(afterAux.dictionaryForm)
    ) {
      return "naru_complement";
    }
    if (
      auxTokens.length === 1 &&
      copulaNiMarkerRelationForToken(firstAux, cursor.pos + auxOffset - 1, {
        consumers: ["content_resolver"]
      }) !== null &&
      afterAux !== undefined && isVerbPredicateToken(afterAux) &&
      afterAux.dictionaryForm === "する"
    ) {
      return "keijouji_adverbial";
    }
    if (
      auxTokens.length === 1 &&
      copulaNiMarkerRelationForToken(firstAux, cursor.pos + auxOffset - 1, {
        consumers: ["content_resolver"]
      }) !== null &&
      (adverbialModifierPredicateForMixedPosSlot(cursor, cursor.pos + auxOffset - 1, options) !== null ||
        isTerminalCopulaNiAdverbialFragment(cursor, auxOffset))
    ) {
      return "keijouji_adverbial";
    }
    if (isCopulaSlotAuxToken(firstAux)) {
      return COPULA_NOMINAL_IDIOMS.has(startToken.dictionaryForm) ? "copula_nominal_idiom" : "copula_predicate";
    }
  }

  return undefined;
}

export type BareStemNominalUseHostClass = "bare_na_adj_stem" | "na_adj_capable_noun";

export function isBareStemNominalUseHostToken(
  token: (CandidateToken | { readonly pos: number }) | undefined
): boolean {
  return token !== undefined && isNominalUseBareNaAdjStem(token) && isSingleSourceMorphemeToken(token);
}

function slotAdmitsTariBareStemHost(slot: string | null | undefined): boolean {
  return slot === "stem_coordination";
}

export function bareStemNominalUseHostClass(
  token: (CandidateToken | { readonly pos: number }) | undefined,
  slot: string | null | undefined = null
): BareStemNominalUseHostClass | null {
  if (!isBareStemNominalUseHostToken(token)) {
    return null;
  }
  if (isTariNaAdjStem(token!) && !slotAdmitsTariBareStemHost(slot)) {
    return null;
  }
  return isPureNaAdjStem(token!) ? "bare_na_adj_stem" : "na_adj_capable_noun";
}

function isSingleSourceMorphemeToken(token: CandidateToken | { readonly pos: number }): boolean {
  const span = runtimeTokenSourceSpan(token as CandidateToken);
  return span === undefined || span === null || span.endOrdinal - span.startOrdinal <= 1;
}

function bareStemNominalUseSlot(
  cursor: TokenCursor<CandidateToken>,
  startToken: CandidateToken,
  auxTokens: readonly CandidateToken[],
  options: MixedPosSlotOptions
): string | undefined {
  if (cursor.peek(1) === undefined || auxTokens.length > 0 || !isBareStemNominalUseHostToken(startToken)) {
    return undefined;
  }
  const slot = observedBareStemNominalUseSlot(cursor, options);
  return slot !== undefined && bareStemNominalUseHostClass(startToken, slot) !== null ? slot : undefined;
}

function nounArgumentMarkerFollows(next: CandidateToken, index: number): boolean {
  return caseParticleMarkerRelationForToken(next, index, {
    acceptedSurfaces: MIXED_POS_NOUN_CASE_MARKER_SURFACES,
    consumers: ["content_head_dispatch"]
  }) !== null ||
    topicFocusMarkerRelationForToken(next, index, {
      acceptedParticleSubtypes: [係助詞],
      consumers: ["content_head_dispatch"]
    }) !== null;
}

function observedBareStemNominalUseSlot(
  cursor: TokenCursor<CandidateToken>,
  options: MixedPosSlotOptions
): string | undefined {
  const next = cursor.peek(1);
  if (next === undefined) {
    return undefined;
  }
  if (isNominalDerivationalSuffix(next)) {
    return "nominal_suffix_compound";
  }
  if (bareStemLexicalMentionSpanAt(cursor.tokens, cursor.pos)) {
    return "quoted_lexical_mention";
  }
  if (nominalCoordinationMarkerFollowsBareStemHost(cursor, next, options)) {
    return "stem_coordination";
  }
  if (clausePauseFollowsBareStemHost(cursor, options)) {
    return "stem_clause_pause";
  }
  return undefined;
}

function nominalCoordinationMarkerFollowsBareStemHost(
  cursor: TokenCursor<CandidateToken>,
  next: CandidateToken,
  options: MixedPosSlotOptions
): boolean {
  if (isContentInternalConnectorToken(next) ||
    isNominalCoordinationSymbolToken(next, options.lookups?.NOMINAL_COORDINATION_SYMBOL_SURFACES ?? EMPTY_SURFACE_SET)) {
    return true;
  }
  const caseParticles = options.lookups?.NOMINAL_COORDINATION_CASE_PARTICLES ?? EMPTY_SURFACE_SET;
  if (isCaseParticleToken(next) && caseParticles.has(next.surface)) {
    return coordinationParticleJoinsFollowingNominalItem(cursor, options);
  }
  const lemmas = options.lookups?.NOMINAL_COORDINATION_CONNECTIVE_LEMMAS ?? EMPTY_SURFACE_SET;
  if (!lemmas.has(next.dictionaryForm)) {
    return false;
  }
  if (isConjunctionToken(next)) {
    return true;
  }
  return isSecondaryParticleToken(next) && coordinationParticleJoinsFollowingNominalItem(cursor, options);
}

function coordinationParticleJoinsFollowingNominalItem(
  cursor: TokenCursor<CandidateToken>,
  options: MixedPosSlotOptions
): boolean {
  const following = cursor.peek(2);
  if (following === undefined || !pos0in(following.pos, NOMINAL_BITS)) {
    return false;
  }
  if (!coordinationMarkerBindsHostAndFollowingItem(cursor, options)) {
    return false;
  }
  const preceding = cursor.pos > 0 ? cursor.peek(-1) : undefined;
  return preceding === undefined || !isNominalizerParticleToken(preceding);
}

function coordinationMarkerBindsHostAndFollowingItem(
  cursor: TokenCursor<CandidateToken>,
  options: MixedPosSlotOptions
): boolean {
  const source: ClauseTailReachEvidenceSource | null = options.clauseReach ?? activeProtoLayout();
  if (source === null) {
    return false;
  }
  const hostIdx = cursor.pos;
  const markerIdx = hostIdx + 1;
  const followingIdx = markerIdx + 1;
  if (source.tailReachEvidenceInClause(hostIdx).endExclusive <= markerIdx) {
    return false;
  }
  if (source.tailReachEvidenceInClause(markerIdx).endExclusive <= followingIdx) {
    return false;
  }
  return !separatedAs(cursor.tokens, markerIdx, AUTHORED_PAUSE_SEPARATIONS) &&
    !separatedAs(cursor.tokens, followingIdx, AUTHORED_PAUSE_SEPARATIONS);
}

function clausePauseFollowsBareStemHost(
  cursor: TokenCursor<CandidateToken>,
  options: MixedPosSlotOptions
): boolean {
  const source: ClauseTailReachEvidenceSource | null = options.clauseReach ?? activeProtoLayout();
  if (source === null) {
    return false;
  }
  const hostIdx = cursor.pos;
  const evidence = source.tailReachEvidenceInClause(hostIdx);
  if (evidence.clampedBy !== "clause_pause" || evidence.endExclusive !== hostIdx + 1) {
    return false;
  }
  const markerIdx = nextNonSpaceIndex(cursor.tokens, hostIdx + 2, cursor.tokens.length);
  return markerIdx === null ||
    quoteMarkerRelationAt(cursor.tokens, markerIdx, { consumers: ["content_head_dispatch"] }) === null;
}

export function bareStemLexicalMentionSpanAt(
  tokens: readonly CandidateToken[],
  idx: number
): boolean {
  const span = parentheticalSpanEndingAt(tokens, idx + 1, { consumers: ["content_head_dispatch"] });
  return span !== null && span.openingIdx === idx - 1;
}

export function bareStemQuotedHostSlotAt(
  tokens: readonly CandidateToken[],
  idx: number
): "quoted_nominal" | "quoted_lexical_mention" | null {
  if (!bareStemLexicalMentionSpanAt(tokens, idx)) {
    return null;
  }
  const cursor = new TokenCursor(tokens, idx, tokens.length, idx);
  return cursor.lookahead(1, isQuotedNominalTail) ? "quoted_nominal" : "quoted_lexical_mention";
}

export function bareStemNominalUseClausePauseAt(
  tokens: readonly CandidateToken[],
  idx: number,
  options: MixedPosSlotOptions = {}
): boolean {
  return clausePauseFollowsBareStemHost(new TokenCursor(tokens, idx, tokens.length, idx), options);
}

const EMPTY_SURFACE_SET: ReadonlySet<string> = new Set();

function adverbialModifierPredicateForMixedPosSlot(
  cursor: TokenCursor<CandidateToken>,
  niIdx: number,
  options: MixedPosSlotOptions
): number | null {
  const head = cursor.current();
  if (head === undefined) {
    return null;
  }
  const allowLightVerbPredicate = options.lookups !== undefined &&
    isAdverbialMannerNounHead(head, options.lookups.ADVERBIAL_MODIFIER_MANNER_NOUNS);
  return findAdverbialModifierPredicate(cursor.tokens, niIdx, {
    allowLightVerbPredicate,
    ...(options.lookups === undefined
      ? {}
      : { deicticProPredicates: options.lookups.ADVERB_COPULA_DEICTIC_EXCLUSIONS })
  });
}

function isTerminalCopulaNiAdverbialFragment(
  cursor: TokenCursor<CandidateToken>,
  afterAuxOffset: number
): boolean {
  let offset = afterAuxOffset;
  let token = cursor.peek(offset);
  if (token === undefined || (token.pos & POS0) === 補助記号) {
    return true;
  }
  if ((token.pos & POS01) !== 助詞_終助詞) {
    return false;
  }
  do {
    offset += 1;
    token = cursor.peek(offset);
  } while (token !== undefined && (token.pos & POS01) === 助詞_終助詞);
  return token === undefined || (token.pos & POS0) === 補助記号;
}

function isCopulaSlotAuxToken(token: CandidateToken): boolean {
  if ((token.pos & POS0) !== 助動詞) {
    return false;
  }
  const pos4 = token.pos & POS4;
  return token.dictionaryForm === "だ" ||
    token.dictionaryForm === "です" ||
    pos4 === 助動詞_ダ ||
    pos4 === 助動詞_デス;
}

function mixedPosPredicateConnectiveSurface(surface: string): boolean {
  const kind = lookupConnectiveBySurface(surface);
  return kind !== undefined && MIXED_POS_PREDICATE_CONNECTIVE_KINDS.has(kind);
}

function isQuotedNominalTail(cursor: TokenCursor<CandidateToken>): boolean {
  const token = cursor.current();
  const quoteSpan = parentheticalSpanEndingAt(cursor.tokens, cursor.pos, {
    consumers: ["content_head_dispatch"]
  });
  if (token === undefined || quoteSpan?.role !== "explicit_quote_span") {
    return false;
  }
  cursor.advance();
  if (quoteBridgePunctuationRelationAt(cursor.tokens, cursor.pos, { consumers: ["content_head_dispatch"] }) !== null) {
    cursor.advance();
  }
  if (cursor.peek(1) === undefined) {
    return false;
  }
  const marker = quoteMarkerRelationAt(cursor.tokens, cursor.pos, { consumers: ["content_head_dispatch"] });
  return marker !== null &&
    (marker.canonicalSurface === "と" || marker.canonicalSurface === "って") &&
    IU_LEXEME_FORMS.has(cursor.peek(1)?.dictionaryForm ?? "");
}

function isMetaLinguisticQuotativeTail(cursor: TokenCursor<CandidateToken>): boolean {
  if (cursor.peek(2) === undefined) {
    return false;
  }
  const marker = quoteMarkerRelationAt(cursor.tokens, cursor.pos, { consumers: ["content_head_dispatch"] });
  if (marker === null || (marker.canonicalSurface !== "と" && marker.canonicalSurface !== "って")) {
    return false;
  }
  const carrier = cursor.peek(1);
  if (carrier === undefined || !IU_LEXEME_FORMS.has(carrier.dictionaryForm ?? "")) {
    return false;
  }
  const head = cursor.peek(2);
  return head !== undefined &&
    (head.pos & POS0) === 名詞 &&
    META_LINGUISTIC_QUOTATIVE_HEADS.has(head.dictionaryForm);
}

export function pruneCandidatesBySlotOrder(
  candidates: readonly TranslationCandidate[],
  candidateMatches: readonly string[],
  _slot: string | null | undefined,
  options: { final: boolean }
): readonly [readonly TranslationCandidate[], readonly string[]] {
  void options;
  return [candidates, candidateMatches];
}

export function candidateProjectionKinds(candidate: TranslationCandidate): readonly HeadProjectionKind[] {
  const kinds: HeadProjectionKind[] = [];
  const push = (kind: HeadProjectionKind): void => {
    if (!kinds.includes(kind)) {
      kinds.push(kind);
    }
  };
  if (candidate.lexicalParticleAdverbial !== undefined && candidate.lexicalParticleAdverbial !== null) {
    push("direct_adverbial");
  }
  if (candidateHasNominalizedNounProjection(candidate)) {
    push("nominalized_predicate");
  } else if (candidateHasStemRootNominalProjection(candidate)) {
    push("stem_root_nominal");
  } else if (candidateHasVerbalNominalMProjection(candidate)) {
    push("verbal_nominal_m");
  } else if (candidate.koreanPos === 명사 || candidate.koreanPos === 대명사) {
    push("direct_nominal");
  } else if (candidate.koreanPos === 형용사) {
    push("direct_adjectival");
    push("adverbialized_adjectival");
  } else if (candidate.koreanPos === 동사) {
    push("direct_verbal");
    push("adverbialized_verbal");
  } else if (candidate.koreanPos === 부사) {
    push("direct_adverbial");
  }
  const sourcePos = candidate.entry?.pos;
  if (candidate.koreanPos === 부사) {
    push("adverbial_nominal_fallback");
  }
  const derivedPredicateProjectable =
    (candidate.koreanPos === 명사 || candidateHasNominalizedNounProjection(candidate)) &&
    !candidateHasVerbalNominalMProjection(candidate);
  if (typeof sourcePos === "number") {
    if (derivedPredicateProjectable && isNaAdjCapable({ pos: sourcePos })) {
      push("projected_nominal_adjectival");
    }
    if (derivedPredicateProjectable && isSahenCapableNominal({ pos: sourcePos })) {
      push("sahen_verbalized_nominal");
    }
  }
  return kinds;
}

export type ContestedBareStemNominalUseSlot =
  | "stem_clause_pause"
  | "quoted_lexical_mention"
  | "quoted_nominal";

export function isBareStemNominalUseSlot(slot: string | null | undefined): boolean {
  return slot === "nominal_suffix_compound" ||
    slot === "quoted_lexical_mention" ||
    slot === "stem_coordination" ||
    slot === "stem_clause_pause";
}

export function bareStemNominalUseYieldsToVerbalPredicateHost(
  candidates: readonly TranslationCandidate[]
): boolean {
  let verbalPredicate = false;
  for (const candidate of candidates) {
    const kinds = candidateProjectionKinds(candidate);
    if (kinds.includes("stem_root_nominal") || kinds.includes("direct_adjectival")) {
      return false;
    }
    if (kinds.includes("direct_verbal")) {
      verbalPredicate = true;
    }
  }
  return verbalPredicate;
}

export function bareStemNominalUseHasSubstituteNounLexeme(
  candidates: readonly TranslationCandidate[]
): boolean {
  return candidates.some((candidate) => candidateProjectionKinds(candidate).includes("direct_nominal"));
}

export function nominalizedNounProjectionAllowedForSlot(slot: string | null | undefined): boolean {
  return slot === "noun_particle" ||
    slot === "nominalized_suffix" ||
    slot === "nominal_suffix_compound" ||
    slot === "quoted_lexical_mention" ||
    slot === "stem_coordination" ||
    slot === "stem_clause_pause";
}

export function stemRootNominalProjectionAllowedForSlot(
  slot: string | null | undefined,
  evidence: { readonly lexicalMentionSpan: boolean }
): boolean {
  switch (slot) {
    case "noun_particle":
    case "nominalized_suffix":
    case "nominal_suffix_compound":
    case "quoted_lexical_mention":
    case "stem_coordination":
    case "stem_clause_pause":
      return true;
    case "quoted_nominal":
      return evidence.lexicalMentionSpan;
    default:
      return false;
  }
}

export function verbalNominalMProjectionAllowedForSlot(slot: string | null | undefined): boolean {
  return slot === "noun_particle" || slot === "stem_coordination";
}

export function candidateHasStemRootNominalProjection(candidate: TranslationCandidate): boolean {
  return candidate.nominalProjection === "stem_root";
}

export function candidateHasNominalizedNounProjection(candidate: TranslationCandidate): boolean {
  return candidate.nominalProjection === "nominalized";
}

export function candidateHasVerbalNominalMProjection(candidate: TranslationCandidate): boolean {
  return candidate.nominalProjection === "verbal_nominal_m";
}

export function candidateProjectionSource(candidate: TranslationCandidate): CandidateProjectionSource {
  if (candidateHasNominalizedNounProjection(candidate)) {
    return "nominalized_noun_slot";
  }
  if (candidateHasStemRootNominalProjection(candidate)) {
    return "stem_root_nominal_slot";
  }
  if (candidateHasVerbalNominalMProjection(candidate)) {
    return "verbal_nominal_m_slot";
  }
  return candidate.lexicalParticleAdverbial === undefined || candidate.lexicalParticleAdverbial === null
    ? "dictionary_sense"
    : "lexical_particle_adverbial";
}

export function realizeResolvedCandidateSet(
  target: CandidateSyncTarget,
  set: ResolvedCandidateSet
): void {
  const candidate = set.winner.candidate;
  target.entry = candidate.entry;
  target.renderPlan = spanLocalRenderPlanNode(candidate.renderPlan ?? null);
  target.renderPlanPolicy = candidate.renderPlanPolicy ?? "normal";
  if (candidate.lexicalParticleAdverbial !== undefined && candidate.lexicalParticleAdverbial !== null) {
    target.consumed = candidate.lexicalParticleAdverbial.consumed;
    target.particleRole = candidate.lexicalParticleAdverbial.particleRole;
    target.renderPlan = spanLocalRenderPlanNode(candidate.lexicalParticleAdverbial.renderPlan);
  }
  target.korean = candidate.korean ?? "";
  target.koreanPos = candidate.koreanPos;
  target.voice = candidate.voice ?? null;
  target.rareruReadings = candidate.rareruReadings ?? new Set();
  target.nareruReadings = candidate.nareruReadings ?? new Set();
  target.dekiruReadings = candidate.dekiruReadings ?? new Set();
  target.hasNegative = candidate.hasNegative ?? false;
  target.hasCausative = candidate.hasCausative ?? false;
  target.hasCausativePassive = candidate.hasCausativePassive ?? false;
  target.hasRequestTail = candidate.hasRequestTail ?? false;
  target.hasBenefactiveTail = candidate.hasBenefactiveTail ?? false;
  target.connectiveRole = candidate.connectiveRole ?? null;
  target.benefactive = candidate.benefactive;
  target.warnings = candidate.warnings ?? [];
}

export function applyResolvedVoice(
  candidate: TranslationCandidate,
  resolvedVoice: Voice
): TranslationCandidate {
  let renderPlan = candidate.renderPlan ?? null;
  if (renderPlan !== null && resolvedVoice === "passive") {
    renderPlan = setForcePassiveRenderPlan(renderPlan, true) ?? renderPlan;
  }

  const korean = renderPlan !== null ? "" : candidate.korean ?? "";
  return {
    ...candidate,
    renderPlan,
    voice: resolvedVoice,
    rareruReadings: resolveRareruReadings(candidate.rareruReadings, resolvedVoice),
    korean
  };
}

export function applyResolvedDekiruReadings(
  candidate: TranslationCandidate,
  readings: ReadonlySet<DekiruReading>
): TranslationCandidate {
  if (sameSet(candidate.dekiruReadings, readings)) {
    return candidate;
  }
  return {
    ...candidate,
    dekiruReadings: new Set(readings)
  };
}

export function applyHonorificRareruFallback(candidate: TranslationCandidate): TranslationCandidate {
  let renderPlan = candidate.renderPlan ?? null;
  if (renderPlan !== null) {
    const rewrittenPlan = replaceLemmaRenderPlan(renderPlan, {
      koreanLemma: candidate.koreanLemma,
      irregular: candidate.irregular,
      koreanPos: candidate.koreanPos,
      dropFirstPassiveAux: true
    });
    renderPlan = rewrittenPlan ?? renderPlan;
  }

  const korean = renderPlan !== null ? "" : candidate.korean ?? "";
  return {
    ...candidate,
    renderPlan,
    voice: "active",
    rareruReadings: new Set<RareruReading>(["honorific"]),
    korean
  };
}

export function candidateGrammar(candidate: TranslationCandidate): CandidateGrammar {
  const renderPlan = candidate.renderPlan ?? null;
  const planGrammar = extractPlanCommitmentGrammar(renderPlan);
  const auxTokens = extractPlanAuxTokens(renderPlan);
  const auxFeatures = auxTokens === undefined ? { past: null, polite: null } : extractAuxFeatures(auxTokens);
  return {
    voice: candidate.voice ?? planGrammar?.voice ?? null,
    nareruReading: serializeReadings(candidate.nareruReadings) ?? planGrammar?.nareruReading ?? null,
    dekiruReading: serializeReadings(candidate.dekiruReadings) ?? planGrammar?.dekiruReading ?? null,
    negative: (candidate.hasNegative ?? false) || (planGrammar?.negative ?? false),
    past: auxFeatures.past ?? planGrammar?.past ?? null,
    polite: auxFeatures.polite ?? planGrammar?.polite ?? null,
    causative: (candidate.hasCausative ?? false) || (planGrammar?.causative ?? false),
    causativePassive: (candidate.hasCausativePassive ?? false) || (planGrammar?.causativePassive ?? false),
    requestTail: (candidate.hasRequestTail ?? false) || (planGrammar?.requestTail ?? false),
    benefactiveTail: (candidate.hasBenefactiveTail ?? false) || (planGrammar?.benefactiveTail ?? false),
    connectiveRole: candidate.connectiveRole ?? planGrammar?.connectiveRole ?? null
  };
}

export function spanGrammar(span: CandidateSpanLike): CandidateGrammar {
  const renderPlan = span.renderPlan ?? null;
  const planGrammar = extractPlanCommitmentGrammar(renderPlan);
  const auxTokens = extractPlanAuxTokens(renderPlan);
  const auxFeatures = auxTokens === undefined ? { past: null, polite: null } : extractAuxFeatures(auxTokens);
  return {
    voice: span.voice ?? planGrammar?.voice ?? null,
    nareruReading: serializeReadings(span.nareruReadings) ?? planGrammar?.nareruReading ?? null,
    dekiruReading: serializeReadings(span.dekiruReadings) ?? planGrammar?.dekiruReading ?? null,
    negative: (span.hasNegative ?? false) || (planGrammar?.negative ?? false),
    past: auxFeatures.past ?? planGrammar?.past ?? null,
    polite: auxFeatures.polite ?? planGrammar?.polite ?? null,
    causative: (span.hasCausative ?? false) || (planGrammar?.causative ?? false),
    causativePassive: (span.hasCausativePassive ?? false) || (planGrammar?.causativePassive ?? false),
    requestTail: (span.hasRequestTail ?? false) || (planGrammar?.requestTail ?? false),
    benefactiveTail: (span.hasBenefactiveTail ?? false) || (planGrammar?.benefactiveTail ?? false),
    connectiveRole: span.connectiveRole ?? planGrammar?.connectiveRole ?? null
  };
}

export function candidateSurfaceText(candidate: TranslationCandidate, options: { formal?: boolean; lookups: LookupTables }): string {
  const renderPlan = candidate.renderPlan ?? null;
  if (renderPlan === null || renderPlan === undefined) {
    return candidate.korean ?? "";
  }
  return realizeRenderPlan(renderPlan, { formal: options.formal ?? false, lookups: options.lookups });
}

function extractPlanAuxTokens(plan: RenderPlan | null | undefined): readonly CandidateToken[] | undefined {
  if (plan === null || plan === undefined) {
    return undefined;
  }
  if (plan.kind === "lemma" || plan.kind === "attributive") {
    return (plan as LemmaRealization).auxTokens;
  }
  if (plan.kind === "legacySurfaceComposition") {
    const suffix = typeof plan.suffix === "string" ? undefined : plan.suffix;
    const prefix = typeof plan.prefix === "string" ? undefined : plan.prefix;
    return extractPlanAuxTokens(suffix) ?? extractPlanAuxTokens(prefix);
  }
  return undefined;
}

function extractPlanCommitmentGrammar(plan: RenderPlan | null | undefined): CandidateGrammar | undefined {
  if (plan === null || plan === undefined) {
    return undefined;
  }
  if (plan.kind === "headTailChain" && plan.realization.kind === "predicate") {
    return plan.realization.commitmentGrammar as CandidateGrammar | undefined;
  }
  if (plan.kind === "legacySurfaceComposition") {
    const suffix = typeof plan.suffix === "string" ? undefined : plan.suffix;
    const prefix = typeof plan.prefix === "string" ? undefined : plan.prefix;
    return extractPlanCommitmentGrammar(suffix) ?? extractPlanCommitmentGrammar(prefix);
  }
  return undefined;
}

function extractAuxFeatures(auxTokens: readonly CandidateToken[]): { past: boolean | null; polite: boolean | null } {
  let past: boolean | null = null;
  let polite: boolean | null = null;
  for (const token of auxTokens) {
    const pos4 = token.pos & POS4;
    if (["た", "だ"].includes(token.dictionaryForm) || ["た", "だ"].includes(token.surface)) {
      past = true;
    }
    if (
      ["ます", "です"].includes(token.dictionaryForm) ||
      ["ます", "です"].includes(token.surface) ||
      pos4 === 助動詞_マス ||
      pos4 === 助動詞_デス
    ) {
      polite = true;
    }
  }
  return { past, polite };
}

function serializeReadings(readings: ReadonlySet<string> | undefined): string | readonly string[] | null {
  if (readings === undefined || readings.size === 0) {
    return null;
  }
  const values = [...readings].sort();
  return values.length === 1 ? values[0] ?? null : values;
}

function resolveRareruReadings(
  readings: ReadonlySet<RareruReading> | undefined,
  resolvedVoice: Voice
): ReadonlySet<RareruReading> {
  if (readings === undefined || readings.size === 0) {
    return readings ?? new Set();
  }
  if (resolvedVoice === "passive") {
    return new Set<RareruReading>(["passive"]);
  }
  if (resolvedVoice === "potential") {
    return new Set<RareruReading>(["potential"]);
  }
  return new Set();
}

function sameSet<T>(left: ReadonlySet<T> | undefined, right: ReadonlySet<T>): boolean {
  if (left === undefined) {
    return right.size === 0;
  }
  return left.size === right.size && [...left].every((value) => right.has(value));
}

function freezeConditionValue(value: unknown): FrozenConditionValue {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => freezeConditionValue(item));
  }
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([key, item]) => [key, freezeConditionValue(item)] as const)
      .sort(([left], [right]) => left.localeCompare(right));
  }
  return String(value);
}
