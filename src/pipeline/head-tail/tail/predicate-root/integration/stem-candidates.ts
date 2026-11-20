import type { IrregularType } from "../../../../../generator/conjugator.js";
import { senseCarriesSelectionFrame, senseFramePayloadHasSourceEvidence, senseRequiresAuxChainEvidence } from "../frame-evidence.js";
import type { TokenCursor } from "../../../../token-cursor.js";
import type { RuntimeHaruToken } from "../../../../../types/token.js";
import { morphSurface, rewriteRuntimeTokenSurface } from "../../../../../types/token.js";
import type { MorphemeEntry, MorphemeSense } from "../../../../../types/dictionary.js";
import { derivationForSense, derivationOrder } from "../../../../../dictionary/derivation.js";
import { assertUniqueStemCandidateIdentities, createStemCandidateProjectionOrdinalAllocator, stemCandidateProvenanceForTranslation, stemCandidateProvenanceKey } from "../stem-candidate-identity.js";
import type { NumeralPlan } from "../../../../../types/render-plan.js";
import type { NumericStemBase } from "../../../../../types/numeric-base.js";
import { quantityApproximationMarker } from "../../../../semantics/numeric.js";
import { readNumeralToken } from "../../../../../generator/numerals.js";
import { honorificClusterLookupsFrom, honorificClusterSuffixDecision } from "../../../../honorific-nominal-cluster.js";
import { joinNounPhraseSurface, type NounPhraseSurfacePart } from "../../../../nominal-phrase-surface.js";
import { matchCopula } from "../matchers/copula.js";
import type { StemInput } from "../parse-input.js";
import { isNaiOrNuToken, isTeSurfaceConnectiveToken } from "../classifiers/tokens.js";
import { detectSahenPredicateStart, isNominalCopulaHostPos, isDemonstrativePropositionWakeHostStart, demonstrativePropositionHostAt, isNominalEvidentialRashiiPredicateStart } from "./readiness.js";
import { matchMonoNoConcessiveConnectiveStart } from "../../../boundary/connective-start.js";
import { lookupSetMatches } from "../../../../lookup-tables.js";
import type { LookupTables } from "../../../../lookup-tables.js";
import type { NumericTables } from "../../../../../generator/numeric-lookup.js";
import type { ClauseBoundary } from "../commit.js";
import type { CandidateCapability, CandidateHeadProfile, HeadRealization, HeadHypothesisCandidate, HeadHypothesisCarrier, HeadSourceCapabilityVector, OpSource, PostverbAuxiliaryPayload, StemCandidate, TailNode, VerbConjType } from "../grammar.js";
import { nounStemInterjectionForCandidate, type SourcePredicateShape } from "../grammar.js";
import { loadSuppletiveNegDict } from "../../../../../generator/aux-map.js";
import { conjugate, irregularType } from "../../../../../generator/conjugator.js";
import type { MorphemeDictionary } from "../../../../../dictionary/morpheme.js";
import type { FrameSourceCondition, FrameSourceConditionMatch } from "../../../../context.js";
import { evaluateFrameSourceCondition, normalizeFrameSourceCondition, resolveContext } from "../../../../context.js";
import type { TranslationCandidate } from "../../../../../types/pipeline.js";
import { firstTranslationCandidate, iterTranslationCandidates } from "../../../../candidate-runtime.js";
import { firstAuxLayer } from "../inspect.js";
import { quoteMarkerRelationAt } from "../../../boundary/quote-marker.js";
import { TE_TAIL_CONTINUATION_LEXEME_KIND_BY_FORM } from "../../te-tail-continuation-table.js";
import { shortNegationPolicyForTranslation } from "../short-negation-policy.js";
import { buildVirtualCompoundToken, findCompoundVerbCandidatesAt, lookupNominalRenyouVerbHead, lookupVirtualCompoundEntry } from "../../../../compounds/compound-verbs.js";
import { isPostverbAuxiliaryActivationAccepted, isPostverbAuxiliaryToken, postverbAuxiliaryDeclaresHostAttachForm, postverbAuxiliaryPayloadsForForm } from "../postverb-auxiliary-parser.js";
import { is五段, INFLECTABLE_BITS, POS0, POS01, pos0in, POS1, POS2, POS4, POS4_OF_NAME, POS5, POS5A, POS5A_NAME, POS5A_SHIFT, サ行変格, 形状詞, 形状詞可能, 形容詞0, 五段_ラ行, 語幹_, 終止形_, 助詞, 助詞_接続助詞, 助動詞 as 助動詞0, 助動詞_ダ, 助動詞_ヌ, 助動詞_レル, 下一段_サ行, 動詞, 副詞, 補助記号, 未然形_, 未然形_一般, 名詞, 連体形_, 普通名詞, 連用形_, 대명사, 동사, 명사, 부사, 형용사, inflectionClassName, isAdverbCapable, isAdverbCapableNominal, isBareNaAdjSet, isDesireAuxiliaryPos, isIAdjectivePredicateToken, isLexicalAdverb, isNaAdjCapable, isNaAdjCapableNoun, isKoreanNounAble, koreanNounLemma, isNominalLike, isCounterCapableToken, isNumeralToken, isPastAuxiliaryPos, isPoliteCopulaPos, isSahenCapableNominal, isVerbPredicateToken, isVoiceOrCausativeAuxiliaryToken, stemFormName, 接尾辞_動詞的, isNaAdjectiveDerivationalSuffix } from "../../../../../types/pos.js";
import { rentaishiPronominalNoHeadSpanAt } from "../../../boundary/pronominal-no.js";
import { pronominalNoHeadStemSurface, type PronominalNoHeadStemBase } from "../../../../nominal-phrase-surface.js";
import { nodaAttributive } from "../../../../semantics/grammar-runtime.js";
import { isAdverbCopulaPredicateStart, nounPhraseHeadSpan, type NumericHostSpanReservation, isNominalQuestionTerminalStart } from "./predicate-start-evidence.js";
import { stemTokenEndsWithNoKoto, entryHasPredicateStemTranslation, translationIsPredicateStemCompatible, sourceHasFormalToStateResultCarrier, sourceHasAdverbialSurfacePostverbCarrier } from "./predicate-evidence.js";
import type { DictLookup, IntegrationInput, TailParserSourceStemKind, AdverbialSurfacePostverbKind, ParseSliceSourceHost } from "./contracts.js";
import { adverbHostCarriesCanonicalReformulationMarker, isKeijoujiKanouYouNiProjectionStart, directNounAttachingPostverbAuxiliaries, isNominalRenyouMethodYouIdiomStart, isAdverbialKamoModalPredicateStart, isAdverbialConjecturePredicateStart, isStandaloneNumeralHeadSpan, contextResolvedNounPhraseNumeral, isNounPhraseCopulaPredicateStart, isBareNominalQuoteContentNounPhrase, isSplitSuppletiveNegativeSurfaceStart } from "./head-admission.js";

export type TailParserStemSense = MorphemeSense & {
  readonly korean: string;
  readonly projectionOrdinal: number;
};
type TailParserProjectedStemKind = TailParserSourceStemKind | "adverb";

export interface SplitSuppletiveNegativeStem {
  readonly virtualToken: RuntimeHaruToken;
  readonly firstNegIdx: number;
  readonly stemSourceTokens: readonly RuntimeHaruToken[];
  readonly stemSourceTokenIndices: readonly number[];
}

export interface ContractedNegativeNStem {
  readonly virtualToken: RuntimeHaruToken;
  readonly negativeToken: RuntimeHaruToken;
  readonly stemSourceTokens: readonly RuntimeHaruToken[];
  readonly stemSourceTokenIndices: readonly number[];
}

export interface VirtualCompoundStem {
  readonly virtualToken: RuntimeHaruToken;
  readonly entry: MorphemeEntry;
  readonly consumed: number;
  readonly stemSourceTokens: readonly RuntimeHaruToken[];
  readonly stemSourceTokenIndices: readonly number[];
  readonly sahenHydration?: true;
  readonly numericBase?: NumericStemBase;
  readonly pronominalNoHeadBase?: PronominalNoHeadStemBase;
  readonly propositionHost?: true;
}

export interface ContractedCausativePassiveStem {
  readonly virtualToken: RuntimeHaruToken;
  readonly entry: MorphemeEntry;
  readonly causativeToken: RuntimeHaruToken;
}

export interface SuppletiveNegationMaterialization {
  readonly stem: StemInput;
  readonly sliceOffset: number;
  readonly politeNegative?: {
    readonly politeIdx: number;
    readonly negIdx: number;
  };
}

interface NormalizedTailParserStemKorean {
  readonly korean: string;
  readonly koreanPrefix?: string;
}

export function projectKotodakaraReasonScopeStemTranslation(
  translation: TailParserStemSense,
  stemToken: RuntimeHaruToken,
  tokens: readonly RuntimeHaruToken[],
  start: number,
  stemKind: TailParserSourceStemKind
): TailParserStemSense {
  if (
    stemKind !== "noun" ||
    !stemTokenEndsWithNoKoto(stemToken) ||
    !isKotodakaraReasonScopeTail(tokens, start + 1) ||
    !translation.korean.endsWith(" 일")
  ) {
    return translation;
  }
  return {
    ...translation,
    korean: translation.korean.slice(0, -" 일".length)
  };
}

function isKotodakaraReasonScopeTail(
  tokens: readonly RuntimeHaruToken[],
  copulaIdx: number
): boolean {
  const copula = tokens[copulaIdx];
  if (
    copula === undefined || (copula.pos & (POS0 | POS4)) !== (助動詞0 | 助動詞_ダ)
  ) {
    return false;
  }
  const connective = tokens[copulaIdx + 1];
  return connective !== undefined &&
    (connective.pos & POS0) === 助詞 &&
    (connective.surface === "から" || connective.surface === "し");
}

export function normalizeTailParserStemKorean(
  korean: string,
  stemKind: TailParserProjectedStemKind,
  options: {
    readonly allowInternalObjectMarkerPrefix?: boolean;
    readonly allowLexicalNegativePrefix?: boolean;
  } = {}
): NormalizedTailParserStemKorean | null {
  if (!/\s/u.test(korean)) {
    return { korean };
  }
  if (stemKind === "noun" || stemKind === "adverb") {
    return { korean: korean.trim().replace(/\s+/gu, " ") };
  }
  const parts = korean.trim().split(/\s+/u);
  if (parts.length < 2) {
    return null;
  }
  const final = parts.at(-1)!;
  if (!final.endsWith("다")) {
    return null;
  }
  const prefix = `${parts.slice(0, -1).join(" ")} `;
  const trimmedPrefix = prefix.trim();
  if (trimmedPrefix.endsWith("수") && (final === "있다" || final === "없다")) {
    return { korean };
  }
  if (trimmedPrefix === "못" && (final === "하다" || options.allowLexicalNegativePrefix === true)) {
    return {
      korean: final,
      koreanPrefix: prefix
    };
  }
  if (trimmedPrefix === "안" || trimmedPrefix === "못") {
    return null;
  }
  return {
    korean: final,
    koreanPrefix: prefix
  };
}

export function rangeHasMonoNoConcessiveConnective(
  cursor: TokenCursor<RuntimeHaruToken>,
  range: { readonly start: number; readonly end: number }
): boolean {
  for (let idx = range.start + 1; idx <= range.end; idx += 1) {
    const consumed = matchMonoNoConcessiveConnectiveStart(cursor.fork(idx, range.end + 1, idx));
    if (consumed !== null && idx + consumed - 1 <= range.end) {
      return true;
    }
  }
  return false;
}

export function selectTailParserStemSenses(
  entry: MorphemeEntry,
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  stemKind: "verb" | "adj" | "noun",
  input: Pick<IntegrationInput, "lookups" | "numeric">,
  context: { readonly adverbialModifierContext: boolean } = { adverbialModifierContext: false }
): readonly TailParserStemSense[] | null {
  const senses = entry.senses;
  if (senses === undefined || senses.length === 0) {
    return null;
  }
  const quotePolish = quoteContentLexicalPolishTranslation(entry, tokens, pos, stemKind);
  const baseSenses: TailParserStemSense[] = (quotePolish !== null ? [quotePolish, ...senses] : senses)
    .map((sense) => ({ ...sense, projectionOrdinal: 0 }));
  const expandedSenses = expandLexicalAdverbialSenses(
    assignTailParserProjectionOrdinals(baseSenses, entry),
    stemKind,
    tokens[pos],
    entry,
    context.adverbialModifierContext
  );
  return expandedSenses.filter((sense) =>
    tailParserSenseFrameLocallyPossible(sense, tokens, pos, input)
  );
}

function assignTailParserProjectionOrdinals(
  senses: readonly TailParserStemSense[],
  entry: MorphemeEntry
): readonly TailParserStemSense[] {
  const counts = new Map<string, number>();
  return senses.map((sense) => {
    const derivation = derivationForSense(sense, entry);
    const provenance = stemCandidateProvenanceForTranslation(sense, derivation);
    const key = stemCandidateProvenanceKey(provenance);
    const projectionOrdinal = counts.get(key) ?? 0;
    counts.set(key, projectionOrdinal + 1);
    return { ...sense, projectionOrdinal };
  });
}

export function tailParserProjectionOrdinalAllocator(
  senses: readonly TailParserStemSense[],
  entry: MorphemeEntry
): ReturnType<typeof createStemCandidateProjectionOrdinalAllocator> {
  return createStemCandidateProjectionOrdinalAllocator(senses.map((sense) => ({
    provenance: stemCandidateProvenanceForTranslation(
      sense,
      derivationForSense(sense, entry)
    ),
    projectionOrdinal: sense.projectionOrdinal
  })));
}

const TAIL_PARSER_EARLY_LEXICAL_CONDITION_KEYS: ReadonlySet<string> = new Set([
  "asSuruVerbAdjacent",
  "bareNoun",
  "nextContentLookup",
  "nextPos",
  "nextSurface",
  "prevParticleSurface",
  "prevPos",
  "prevSurface",
  "reduplicated"
]);

export function tailParserSenseFrameLocallyPossible(
  sense: MorphemeSense,
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  input: Pick<IntegrationInput, "lookups" | "numeric">
): boolean {
  const frames = tailParserSenseFrames(sense);
  if (frames.length === 0) {
    return true;
  }
  return frames.some((frame) => tailParserFrameLocallyPossible(frame, tokens, pos, input));
}

function tailParserSenseFrames(sense: MorphemeSense): readonly Record<string, unknown>[] {
  if (Array.isArray(sense.senseFrames)) {
    return sense.senseFrames.filter(isTailParserRecord);
  }
  return isTailParserRecord(sense.senseFrame) ? [sense.senseFrame] : [];
}

function tailParserFrameLocallyPossible(
  frame: Record<string, unknown>,
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  input: Pick<IntegrationInput, "lookups" | "numeric">
): boolean {
  if (tailParserTruthyFrameDefault(frame.default)) {
    return true;
  }
  const lexicalConditions = frame.lexicalConditions ?? frame.lexical_conditions;
  if (!isTailParserRecord(lexicalConditions)) {
    return true;
  }
  const state = tailParserEarlyLexicalConditionState(lexicalConditions, tokens, pos, input);
  return state !== "fail";
}

function tailParserEarlyLexicalConditionState(
  value: Record<string, unknown>,
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  input: Pick<IntegrationInput, "lookups" | "numeric">
): FrameSourceConditionMatch {
  const condition = normalizeFrameSourceCondition(value);
  if (!tailParserCanEvaluateEarlyLexicalCondition(condition)) {
    return "unknown";
  }
  return evaluateFrameSourceCondition(condition, tokens, pos, {
    layout: null,
    grammar: null,
    final: false,
    lookups: input.lookups,
    numeric: input.numeric
  });
}

function tailParserCanEvaluateEarlyLexicalCondition(condition: FrameSourceCondition): boolean {
  for (const [key, value] of Object.entries(condition)) {
    if (value === undefined) {
      continue;
    }
    if (key === "anyOf") {
      if (!Array.isArray(value) || value.length === 0) {
        return false;
      }
      if (!value.every((branch) => isTailParserRecord(branch) && tailParserCanEvaluateEarlyLexicalCondition(normalizeFrameSourceCondition(branch as FrameSourceCondition)))) {
        return false;
      }
      continue;
    }
    if (!TAIL_PARSER_EARLY_LEXICAL_CONDITION_KEYS.has(key)) {
      return false;
    }
  }
  return true;
}

function isTailParserRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && value !== undefined && typeof value === "object" && !Array.isArray(value);
}

function tailParserTruthyFrameDefault(value: unknown): boolean {
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
  return isTailParserRecord(value) ? Object.keys(value).length > 0 : true;
}

function expandLexicalAdverbialSenses(
  senses: readonly TailParserStemSense[],
  stemKind: TailParserSourceStemKind,
  stemToken: RuntimeHaruToken | undefined,
  entry: MorphemeEntry,
  adverbialModifierContext: boolean
): readonly TailParserStemSense[] {
  if (!adverbialModifierContext) {
    return senses;
  }
  const adjStemLane = stemKind === "adj" && stemToken !== undefined &&
    (isBareNaAdjSet(stemToken) || isIAdjectivePredicateToken(stemToken));
  if (stemKind !== "noun" && !adjStemLane) {
    return senses;
  }
  let synthesized = false;
  const expanded: TailParserStemSense[] = [];
  const nextOrdinalByProvenance = new Map<string, number>();
  for (const sense of senses) {
    const provenance = stemCandidateProvenanceForTranslation(sense, derivationForSense(sense, entry));
    const key = stemCandidateProvenanceKey(provenance);
    nextOrdinalByProvenance.set(
      key,
      Math.max(nextOrdinalByProvenance.get(key) ?? 0, sense.projectionOrdinal + 1)
    );
  }
  let pending: TailParserStemSense[] = [];
  senses.forEach((sense, index) => {
    expanded.push(sense);
    const adverbial = sense.adverbial;
    if (typeof adverbial === "string" && adverbial.length > 0) {
      synthesized = true;
      const provenance = stemCandidateProvenanceForTranslation(sense, derivationForSense(sense, entry));
      const key = stemCandidateProvenanceKey(provenance);
      const projectionOrdinal = nextOrdinalByProvenance.get(key) ?? 0;
      nextOrdinalByProvenance.set(key, projectionOrdinal + 1);
      pending.push(syntheticLexicalAdverbialSense(sense, adverbial, projectionOrdinal));
    }
    const next = senses[index + 1];
    if (next === undefined || next.priorityGroup !== sense.priorityGroup) {
      expanded.push(...pending);
      pending = [];
    }
  });
  return synthesized ? expanded : senses;
}

function syntheticLexicalAdverbialSense(
  source: TailParserStemSense,
  adverbial: string,
  projectionOrdinal: number
): TailParserStemSense {
  return {
    korean: adverbial,
    ...(source.entryId === undefined ? {} : { entryId: source.entryId }),
    ...(source.derivation === undefined ? {} : { derivation: source.derivation }),
    koreanPos: 부사,
    irregular: null,
    ...(source.priorityGroup === undefined ? {} : { priorityGroup: source.priorityGroup }),
    ...(source.priorityInGroup === undefined ? {} : { priorityInGroup: source.priorityInGroup }),
    ...(source.senseIndex === undefined ? {} : { senseIndex: source.senseIndex }),
    ...(source.senseFrame === undefined ? {} : { senseFrame: source.senseFrame }),
    ...(source.senseFrames === undefined ? {} : { senseFrames: source.senseFrames }),
    projectionOrdinal,
    sourceFormat: "senses"
  };
}

export function headHypothesisCandidateFromTranslation(
  translation: TailParserStemSense,
  index: number,
  options: {
    readonly sourceStemKind: TailParserSourceStemKind;
    readonly sourceCapabilities?: HeadSourceCapabilityVector;
    readonly status: HeadHypothesisCandidate["status"];
    readonly stage: HeadHypothesisCandidate["stage"];
    readonly lemma?: string;
    readonly projectedStemKind?: TailParserProjectedStemKind;
    readonly preservedCandidate?: StemCandidate;
    readonly reason?: string;
    readonly adverbialModifierContext?: boolean;
    readonly adverbialSurfaceBridgeContext?: boolean;
    readonly adverbialSurfaceBridgeAllowed?: boolean;
  }
): HeadHypothesisCandidate {
  const lemma = options.lemma ?? translation.korean;
  return {
    index,
    lemma,
    provenance: options.preservedCandidate?.provenance ??
      stemCandidateProvenanceForTranslation(translation, derivationForSense(translation, null)),
    ...(lemma === translation.korean ? {} : { dictionaryLemma: translation.korean }),
    ...(translation.koreanPos === undefined ? {} : { koreanPos: translation.koreanPos }),
    projectedStemKind: options.projectedStemKind ?? tailParserStemKindForTranslation(translation, options.sourceStemKind),
    ...(translation.irregular === undefined ? {} : { irregular: translation.irregular }),
    ...(translation.priorityGroup === undefined ? {} : { priorityGroup: translation.priorityGroup }),
    ...(translation.priorityInGroup === undefined ? {} : { priorityInGroup: translation.priorityInGroup }),
    ...(translation.senseIndex === undefined ? {} : { senseIndex: translation.senseIndex }),
    projectionOrdinal: options.preservedCandidate?.projectionOrdinal ?? translation.projectionOrdinal,
    ...(translation.sourceFormat === undefined ? {} : { sourceFormat: translation.sourceFormat }),
    status: options.status,
    stage: options.stage,
    ...(options.preservedCandidate === undefined ? {} : { preservedCandidate: options.preservedCandidate }),
    ...(options.sourceCapabilities === undefined
      ? {}
      : {
        headProfile: candidateHeadProfileForTranslation(
          translation,
          options.sourceStemKind,
          options.sourceCapabilities,
          options.projectedStemKind ?? tailParserStemKindForTranslation(translation, options.sourceStemKind),
          translation.projectionOrdinal,
          {
            adverbialModifierContext: options.adverbialModifierContext ?? false,
            adverbialSurfaceBridgeContext: options.adverbialSurfaceBridgeContext ?? false,
            adverbialSurfaceBridgeAllowed: options.adverbialSurfaceBridgeAllowed ?? false
          }
        )
      }),
    ...(options.reason === undefined ? {} : { reason: options.reason })
  };
}

export function candidateHasAdmittedHeadCapability(candidate: HeadHypothesisCandidate): boolean {
  return candidate.status === "admitted" &&
    (candidate.headProfile?.capabilities.length ?? 0) > 0;
}

function candidateHeadProfileForTranslation(
  translation: TailParserStemSense,
  sourceStemKind: TailParserSourceStemKind,
  sourceCapabilities: HeadSourceCapabilityVector,
  projectedStemKind: TailParserProjectedStemKind,
  projectionOrder: number,
  context: {
    readonly adverbialModifierContext: boolean;
    readonly adverbialSurfaceBridgeContext: boolean;
    readonly adverbialSurfaceBridgeAllowed: boolean;
  }
): CandidateHeadProfile {
  const orderKey = {
    ...(translation.priorityGroup === undefined ? {} : { priorityGroup: translation.priorityGroup }),
    ...(translation.priorityInGroup === undefined ? {} : { priorityInGroup: translation.priorityInGroup }),
    projectionOrder
  };
  const capabilities: CandidateCapability[] = [];
  const pushCapability = (
    id: CandidateHeadProfile["capabilities"][number]["id"],
    source: CandidateHeadProfile["capabilities"][number]["source"],
    choices: readonly HeadRealization[]
  ): void => {
    if (choices.length === 0) return;
    capabilities.push({ id, source, choices, orderKey });
  };
  const nominalChoice: HeadRealization = {
    category: "nominal",
    projectionKind: translation.koreanPos === 명사 ? "direct_nominal" : "nominalized_predicate"
  };
  const adverbialNominalFallbackChoice: HeadRealization = {
    category: "nominal",
    projectionKind: "adverbial_nominal_fallback"
  };
  const adjectivalChoice: HeadRealization = {
    category: "adjectival_predicate",
    projectionKind: translation.koreanPos === 형용사 ? "direct_adjectival" : "projected_nominal_adjectival"
  };
  const adverbializedAdjectivalChoice: HeadRealization = {
    category: "adjectival_predicate",
    projectionKind: "adverbialized_adjectival"
  };
  const verbalChoice: HeadRealization = {
    category: "verbal_predicate",
    projectionKind: translation.koreanPos === 동사 ? "direct_verbal" : "sahen_verbalized_nominal"
  };
  const adverbializedVerbalChoice: HeadRealization = {
    category: "verbal_predicate",
    projectionKind: "adverbialized_verbal"
  };
  const adverbialChoice: HeadRealization = {
    category: "adverbial",
    projectionKind: "direct_adverbial"
  };
  const adverbialConnectiveRole = translationConnectiveRoles(translation).includes("adverbial");
  const sourceAdverbialCapabilityApplies =
    context.adverbialSurfaceBridgeContext
      ? context.adverbialSurfaceBridgeAllowed
      : sourceCapabilities.adverbialCapable ||
        sourceCapabilities.adverbCapableNominal ||
        sourceCapabilities.naAdjectiveCapable ||
        sourceCapabilities.lexicalAdverb;

  if (
    isKoreanNounAble(translation.koreanPos, translation.nominalized) ||
    (projectedStemKind === "noun" && translation.koreanPos !== 부사) ||
    translation.koreanPos === 부사
  ) {
    pushCapability("lexical_nominal", "lexical_pos", [
      translation.koreanPos === 부사 ? adverbialNominalFallbackChoice : nominalChoice
    ]);
  }
  if (translation.koreanPos === 형용사) {
    pushCapability(
      sourceCapabilities.naAdjectiveCapable ? "na_adjectival" : "i_adjectival",
      sourceCapabilities.naAdjectiveCapable ? "na_adjective_capability" : "i_adjective_inflection",
      context.adverbialModifierContext
        ? [adverbializedAdjectivalChoice, adjectivalChoice]
        : [adjectivalChoice]
    );
  } else if (
    sourceCapabilities.naAdjectiveCapable &&
    (translation.koreanPos === 명사 || projectedStemKind === "noun")
  ) {
    pushCapability("na_adjectival", "na_adjective_capability", [adjectivalChoice]);
  }
  if (translation.koreanPos === 동사) {
    pushCapability(
      "lexical_verbal",
      "lexical_pos",
      context.adverbialModifierContext
        ? [adverbializedVerbalChoice, verbalChoice]
        : [verbalChoice]
    );
  }
  if (sourceCapabilities.sahenVerbalizationCapable && (
    translation.koreanPos === 동사 ||
    translation.koreanPos === 명사 ||
    projectedStemKind === "noun"
  )) {
    pushCapability("sahen_verbal", "sahen_capability", [verbalChoice]);
  }
  if (
    (sourceAdverbialCapabilityApplies ||
      adverbialConnectiveRole ||
      context.adverbialModifierContext) &&
    translation.koreanPos === 부사
  ) {
    pushCapability("adverbial", "adverbial_capability", [adverbialChoice]);
  }
  if (capabilities.length === 0 && translation.koreanPos === undefined) {
    const fallbackChoice = projectedStemKind === "verb"
      ? verbalChoice
      : projectedStemKind === "adj"
        ? adjectivalChoice
        : projectedStemKind === "adverb"
          ? adverbialChoice
          : nominalChoice;
    pushCapability("sense_rendering", "sense_rendering", [fallbackChoice]);
  }
  return { capabilities };
}

export function buildHeadHypothesisCarrier(options: {
  readonly sourceStemKind: TailParserSourceStemKind;
  readonly admittedStemKind: TailParserProjectedStemKind;
  readonly source: OpSource;
  readonly sourceCapabilities: HeadSourceCapabilityVector;
  readonly originalCandidateCount: number;
  readonly candidates: readonly HeadHypothesisCandidate[];
  readonly currentWinnerIndex?: number;
}): HeadHypothesisCarrier {
  assertUniqueStemCandidateIdentities(options.candidates.flatMap((candidate) =>
    candidate.preservedCandidate === undefined ? [] : [candidate.preservedCandidate]
  ));
  const admittedCandidateCount = options.candidates.filter((candidate) => candidate.status === "admitted").length;
  const droppedCandidateCount = options.candidates.filter((candidate) => candidate.status === "dropped").length;
  const preservedCandidateCount = options.candidates.filter((candidate) => candidate.preservedCandidate !== undefined).length;
  return {
    sourceStemKind: options.sourceStemKind,
    admittedStemKind: options.admittedStemKind,
    source: options.source,
    sourceCapabilities: options.sourceCapabilities,
    originalCandidateCount: options.originalCandidateCount,
    preservedCandidateCount,
    admittedCandidateCount,
    droppedCandidateCount,
    candidates: options.candidates,
    ...(options.currentWinnerIndex === undefined ? {} : { currentWinnerIndex: options.currentWinnerIndex })
  };
}

export function headSourceCapabilityVector(token: RuntimeHaruToken): HeadSourceCapabilityVector {
  const naAdjectiveCapable = isNaAdjCapable(token);
  return {
    nominalLike: isNominalLike(token),
    iAdjectivePredicate: isIAdjectivePredicateToken(token),
    verbPredicate: isVerbPredicateToken(token),
    naAdjectiveCapable,
    keijouCapable: naAdjectiveCapable,
    naAdjectiveCapableNoun: isNaAdjCapableNoun(token),
    bareNaAdjectiveSet: isBareNaAdjSet(token),
    sahenVerbalizationCapable: isSahenCapableNominal(token),
    adverbialCapable: isAdverbCapable(token),
    adverbCapableNominal: isAdverbCapableNominal(token),
    lexicalAdverb: isLexicalAdverb(token),
    inflectionClass: inflectionClassName(token.pos),
    stemForm: stemFormName(token.pos)
  };
}

export async function tailParserStemEntry(
  dictionary: DictLookup,
  token: RuntimeHaruToken,
  entry: MorphemeEntry,
  stemKind: TailParserSourceStemKind,
  inflectingAuxHost: boolean,
  nominalTargetPredicateContext: boolean
): Promise<MorphemeEntry> {
  const baseEntry = await inflectedBasePredicateEntry(
    dictionary,
    token,
    entry,
    stemKind,
    inflectingAuxHost,
    nominalTargetPredicateContext
  );
  return baseEntry ?? entry;
}

async function inflectedBasePredicateEntry(
  dictionary: DictLookup,
  token: RuntimeHaruToken,
  entry: MorphemeEntry,
  stemKind: TailParserSourceStemKind,
  inflectingAuxHost: boolean,
  nominalTargetPredicateContext: boolean
): Promise<MorphemeEntry | null> {
  if (!canUseInflectedBasePredicateEntry(token, entry, stemKind, inflectingAuxHost)) {
    return null;
  }
  if (dictionary.lookup === undefined) {
    return null;
  }
  const baseForm = entry.dictionaryForm ?? token.dictionaryForm;
  const baseReading = entry.dictionaryFormReading ?? token.dictionaryFormReading;
  const base = await dictionary.lookup(baseForm, baseReading, token.pos);
  if (base === undefined || !entryHasPredicateStemTranslation(base, stemKind, nominalTargetPredicateContext)) {
    return null;
  }
  return mergeBaseAndSurfacePredicateEntries(base, entry, stemKind, nominalTargetPredicateContext);
}

function canUseInflectedBasePredicateEntry(
  token: RuntimeHaruToken,
  entry: MorphemeEntry,
  stemKind: TailParserSourceStemKind,
  inflectingAuxHost: boolean
): boolean {
  if (
    token.dictionaryForm.length === 0 ||
    token.dictionaryForm === morphSurface(token)
  ) {
    return false;
  }
  const form5A = token.pos & POS5A;
  const nonPredicateOverrideBridge = inflectingAuxHost &&
    surfaceEntryLacksPredicateStemSense(entry, stemKind);
  if (stemKind === "verb") {
    return isVerbPredicateToken(token) && (form5A === 連用形_ || nonPredicateOverrideBridge);
  }
  if (stemKind === "adj") {
    return isIAdjectivePredicateToken(token) &&
      (form5A === 連用形_ || form5A === 語幹_ || nonPredicateOverrideBridge);
  }
  return false;
}

function surfaceEntryLacksPredicateStemSense(
  entry: MorphemeEntry,
  stemKind: TailParserSourceStemKind
): boolean {
  return (entry.senses ?? []).length > 0 && !entryHasPredicateStemTranslation(entry, stemKind);
}

export function tokenHostsInflectingPredicateAuxiliary(
  token: RuntimeHaruToken | undefined
): boolean {
  if (token === undefined) {
    return false;
  }
  return isNaiOrNuToken(token) ||
    isPastAuxiliaryPos(token.pos) ||
    isDesireAuxiliaryPos(token.pos) ||
    isPoliteCopulaPos(token.pos) ||
    isVoiceOrCausativeAuxiliaryToken(token);
}

export function tokenOpensPredicateConnectiveHost(
  token: RuntimeHaruToken | undefined
): boolean {
  return token !== undefined && isTeSurfaceConnectiveToken(token);
}

function mergeBaseAndSurfacePredicateEntries(
  baseEntry: MorphemeEntry,
  surfaceEntry: MorphemeEntry,
  stemKind: TailParserSourceStemKind,
  copularNominalTarget: boolean
): MorphemeEntry {
  const baseSenses = baseEntry.senses ?? [];
  const surfaceSenses = surfaceEntry.senses ?? [];
  if (surfaceSenses.length === 0) {
    return baseEntry;
  }
  const surfaceHasPredicateStem = surfaceSenses.some((translation) =>
    translationIsPredicateStemCompatible(translation, stemKind, copularNominalTarget)
  );
  const primarySenses = surfaceHasPredicateStem ? surfaceSenses : baseSenses;
  const secondarySenses = surfaceHasPredicateStem
    ? baseSenses
    : copularNominalTarget
      ? surfaceSenses.filter((translation) =>
        translationIsPredicateStemCompatible(translation, stemKind, copularNominalTarget))
      : surfaceSenses;
  const merged: MorphemeSense[] = [];
  const seen = new Set<string>();
  const primaryLemmas = new Set(primarySenses.map((translation) =>
    `${translation.korean}\u0000${translation.koreanPos ?? ""}`
  ));
  const ordered = mergedPredicateSensePriority(
    primarySenses,
    secondarySenses.filter((translation) =>
      !primaryLemmas.has(`${translation.korean}\u0000${translation.koreanPos ?? ""}`)
    )
  );
  for (const translation of ordered) {
    const key = [
      translation.korean,
      translation.koreanPos ?? "",
      translation.irregular ?? "",
      JSON.stringify(translation.senseFrames ?? translation.senseFrame ?? null)
    ].join("\u0000");
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(translation);
  }
  return {
    ...baseEntry,
    senses: merged
  };
}

function mergedPredicateSensePriority(
  primarySenses: readonly MorphemeSense[],
  secondarySenses: readonly MorphemeSense[]
): MorphemeSense[] {
  const isDefault = (translation: MorphemeSense): boolean => !mergedSenseHasSourceFrame(translation);
  const conditioned: MorphemeSense[] = [];
  let nextGroup = 0;
  for (const senses of [primarySenses, secondarySenses]) {
    const groups = [...new Set(senses.filter((t) => !isDefault(t)).map((t) => t.priorityGroup ?? 0))].sort((a, b) => a - b);
    for (const group of groups) {
      senses
        .filter((translation) => !isDefault(translation) && (translation.priorityGroup ?? 0) === group)
        .forEach((translation, order) => {
          conditioned.push({ ...translation, priorityGroup: nextGroup, priorityInGroup: order });
        });
      nextGroup += 1;
    }
  }
  const defaults = [...primarySenses, ...secondarySenses]
    .filter(isDefault)
    .map((translation) => ({ ...translation, priorityGroup: nextGroup }));
  return [...conditioned, ...defaults];
}

function mergedSenseHasSourceFrame(translation: MorphemeSense): boolean {
  const frames: readonly unknown[] = Array.isArray(translation.senseFrames) ? translation.senseFrames : [translation.senseFrame];
  return frames.some(senseFramePayloadHasSourceEvidence);
}

function quoteContentLexicalPolishTranslation(
  entry: MorphemeEntry,
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  stemKind: TailParserSourceStemKind
): MorphemeSense | null {
  void tokens; void pos;
  if (stemKind !== "noun" || entry.dictionaryForm !== "本当") {
    return null;
  }
  return {
    korean: "사실",
    derivation: "quote_content_polish",
    koreanPos: 명사,
    senseFrame: {
      id: "quote_content_polish",
      lexicalConditions: {
        quoteContentSlotKind: "quoted_content",
        quoteContentHostKind: ["thought", "report", "question"],
        quoteContentPlainDaOnly: true
      }
    }
  };
}

export function stemKindForTailParserSource(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  pos0: number,
  numeric: NumericTables,
  lookups?: LookupTables,
  sourceHost?: ParseSliceSourceHost
): TailParserSourceStemKind {
  if (pos0 === 動詞) {
    return "verb";
  }
  if (pos0 === 形容詞0) {
    return "adj";
  }
  if (pos0 === 副詞 && isAdverbialKamoModalPredicateStart(tokens, start, lookups)) {
    return "adj";
  }
  if (pos0 === 副詞 && isAdverbialConjecturePredicateStart(tokens, start, lookups)) {
    return "adj";
  }
  if (pos0 === 副詞 && isAdverbCopulaPredicateStart(tokens, start, lookups)) {
    return "noun";
  }
  if (pos0 === 副詞 && sourceHasAdverbialSurfacePostverbCarrier(tokens, start)) {
    return "noun";
  }
  if (pos0 === 副詞 && adverbHostCarriesCanonicalReformulationMarker(tokens, start, numeric, lookups, sourceHost)) {
    return "noun";
  }
  if (pos0 === 形状詞) {
    return matchCopula(tokens, start + 1, lookups) === null &&
      !sourceHasTosuruCarrier(tokens, start) &&
      detectSahenPredicateStart(tokens, start) === null
      ? "adj"
      : "noun";
  }
  if (
    pos0 === 名詞 &&
    ((tokens[start]?.pos ?? 0) & POS2) === 形状詞可能 &&
    sourceHasFormalToStateResultCarrier(tokens, start)
  ) {
    return "adj";
  }
  if (
    pos0 === 名詞 &&
    ((tokens[start]?.pos ?? 0) & POS2) === 形状詞可能 &&
    isKeijoujiKanouYouNiProjectionStart(tokens, start, lookups)
  ) {
    return "adj";
  }
  return "noun";
}

function sourceHasTosuruCarrier(tokens: readonly RuntimeHaruToken[], start: number): boolean {
  const carrier = tokens[start + 2];
  const carrierForm5A = (carrier?.pos ?? 0) & POS5A;
  return quoteMarkerRelationAt(tokens, start + 1, {
    consumers: ["tail_multi_clause"]
  })?.canonicalSurface === "と" &&
    carrier !== undefined &&
    carrier.dictionaryForm === "する" &&
    (carrierForm5A === 連体形_ || carrierForm5A === 終止形_);
}

function isFrameFreeKoreanAdverbTailSense(translation: TailParserStemSense): boolean {
  return translation.koreanPos === 부사 && !stemTranslationHasFrameEvidence(translation);
}

export function adverbialSurfaceCandidateSetCanBridge(
  senses: readonly TailParserStemSense[],
  kind: AdverbialSurfacePostverbKind | null
): boolean {
  if (kind === null) {
    return false;
  }
  const frameFreeAdverbs = senses.filter(isFrameFreeKoreanAdverbTailSense);
  if (frameFreeAdverbs.length === 0) {
    return false;
  }
  if (kind === "control") {
    return true;
  }
  const hasNominalResultCandidate = senses.some((sense) => sense.koreanPos === 명사 || sense.koreanPos === 대명사);
  return !(hasNominalResultCandidate && frameFreeAdverbs.length > 1);
}

interface StemCandidateProjection {
  readonly entry?: MorphemeEntry | null;
  readonly stemKind?: TailParserProjectedStemKind;
  readonly lemma?: string;
  readonly koreanPos?: number;
  readonly irregular?: IrregularType | null;
  readonly conj?: VerbConjType;
  readonly shortNegationPolicy?: StemCandidate["shortNegationPolicy"];
  readonly koreanPrefix?: string;
  readonly koreanSuffix?: string;
  readonly projectionOrdinal?: number;
  readonly senseFrame?: unknown;
  readonly senseFrames?: readonly unknown[];
  readonly teIruResultative?: true;
}

export function confineNominalTargetMarkToAdjectivalSource(
  stem: StemInput,
  sourcePredicateShape: SourcePredicateShape
): StemInput {
  if (sourcePredicateShape === "i_adjective") {
    return stem;
  }
  if (stem.kind === "noun" && stem.nominalTargetForVerbalSource === true) {
    const { nominalTargetForVerbalSource: _unmarked, ...rest } = stem;
    void _unmarked;
    return rest;
  }
  if (stem.kind === "candidateSet") {
    return {
      ...stem,
      candidates: stem.candidates.map((candidate) => {
        if (candidate.nominalTargetForVerbalSource !== true) {
          return candidate;
        }
        const { nominalTargetForVerbalSource: _unmarked, ...rest } = candidate;
        void _unmarked;
        return rest;
      })
    };
  }
  return stem;
}

export function stemCandidateFromTranslation(
  translation: TailParserStemSense,
  stemKind: TailParserSourceStemKind,
  conjForVerb: VerbConjType | undefined,
  projection: StemCandidateProjection = {}
): StemCandidate {
  const candidateStemKind = projection.stemKind ?? tailParserStemKindForTranslation(translation, stemKind);
  const lemma = projection.lemma ?? translation.korean;
  const koreanPos = projection.koreanPos ?? translation.koreanPos ?? koreanPosForProjectedStemKind(candidateStemKind);
  const irregular = projection.irregular !== undefined ? projection.irregular : translation.irregular ?? null;
  const conj = projection.conj ?? (candidateStemKind === "verb" ? conjForVerb : undefined);
  const shortNegationPolicy = projection.shortNegationPolicy ??
    shortNegationPolicyForStemTranslation(translation, candidateStemKind);
  const koreanPrefix = projection.koreanPrefix ?? translation.koreanPrefix;
  const koreanSuffix = projection.koreanSuffix ?? translation.koreanSuffix;
  const derivation = derivationForSense(translation, projection.entry ?? null);
  const derivationOrderIndex = projection.entry === undefined
    ? undefined
    : derivationOrder(projection.entry, derivation.id);
  const translationWithSense = translation;
  return {
    provenance: stemCandidateProvenanceForTranslation(translation, derivation),
    lemma,
    ...(translationWithSense.intrinsicHonorific === undefined
      ? {}
      : { intrinsicHonorific: translationWithSense.intrinsicHonorific }),
    irregular,
    ...(koreanPos === undefined ? {} : { koreanPos }),
    ...(translation.nominalized === undefined ? {} : { nominalized: translation.nominalized }),
    ...(translation.adverbial === undefined ? {} : { adverbial: translation.adverbial }),
    ...(translation.koreanPolite === undefined ? {} : { koreanPolite: translation.koreanPolite }),
    ...(conj === undefined ? {} : { conj }),
    ...(translation.connectiveRole === undefined
      ? {}
      : { connectiveRole: translation.connectiveRole }),
    ...(translationWithSense.connectivePreferences === undefined ? {} : { connectivePreferences: translationWithSense.connectivePreferences }),
    ...(translationWithSense.casePreferences === undefined ? {} : { casePreferences: translationWithSense.casePreferences }),
    ...(translationWithSense.caseRealization === undefined ? {} : { caseRealization: translationWithSense.caseRealization }),
    ...(translationWithSense.slotRealization === undefined ? {} : { slotRealization: translationWithSense.slotRealization }),
    ...(projection.senseFrame !== undefined
      ? { senseFrame: projection.senseFrame }
      : translationWithSense.senseFrame === undefined
        ? {}
        : { senseFrame: translationWithSense.senseFrame }),
    ...(projection.senseFrames !== undefined
      ? { senseFrames: projection.senseFrames }
      : translationWithSense.senseFrames === undefined ? {} : { senseFrames: translationWithSense.senseFrames }),
    ...(translationWithSense.senseCaseRealization === undefined ? {} : { senseCaseRealization: translationWithSense.senseCaseRealization }),
    ...(translationWithSense.senseSlotRealization === undefined ? {} : { senseSlotRealization: translationWithSense.senseSlotRealization }),
    ...(translationWithSense.priorityGroup === undefined ? {} : { priorityGroup: translationWithSense.priorityGroup }),
    ...(translationWithSense.priorityInGroup === undefined ? {} : { priorityInGroup: translationWithSense.priorityInGroup }),
    ...(translationWithSense.senseIndex === undefined ? {} : { senseIndex: translationWithSense.senseIndex }),
    projectionOrdinal: projection.projectionOrdinal ?? translationWithSense.projectionOrdinal,
    derivation,
    ...(derivationOrderIndex === undefined ? {} : { derivationOrder: derivationOrderIndex }),
    ...(translationWithSense.sourceFormat === undefined ? {} : { sourceFormat: translationWithSense.sourceFormat }),
    ...(translation.dropFirstNegativeAux === true ? { dropFirstNegativeAux: true as const } : {}),
    ...(translation.dropFirstPassiveAux === true ? { dropFirstPassiveAux: true as const } : {}),
    ...(translation.dropFirstCausativeAux === true ? { dropFirstCausativeAux: true as const } : {}),
    ...(translation.teIruResultative === true ? { teIruResultative: true as const } : {}),
    ...(projection.teIruResultative === true ? { teIruResultative: true as const } : {}),
    ...(stemTranslationHasTeIruDropAux(translation, stemKind) ? { teIruDropAux: true as const } : {}),
    ...(translation.teIruContractToPast === true ? { teIruContractToPast: true as const } : {}),
    ...(shortNegationPolicy === undefined ? {} : { shortNegationPolicy }),
    ...(stemKind !== "noun" && candidateStemKind === "noun"
      ? { nominalTargetForVerbalSource: true as const }
      : {}),
    ...(koreanPrefix === undefined ? {} : { koreanPrefix }),
    ...(koreanSuffix === undefined ? {} : { koreanSuffix })
  };
}

function koreanPosForProjectedStemKind(stemKind: TailParserProjectedStemKind): number {
  if (stemKind === "verb") {
    return 동사;
  }
  if (stemKind === "adj") {
    return 형용사;
  }
  if (stemKind === "adverb") {
    return 부사;
  }
  return 명사;
}

function sahenStemProjection(translation: TailParserStemSense): StemCandidateProjection {
  if (translation.koreanPos === 동사 && translation.korean.endsWith("다")) {
    return {
      stemKind: "verb",
      lemma: translation.korean,
      irregular: translation.irregular ?? null,
      koreanPos: 동사,
      conj: translation.korean.endsWith("하다") ? "sahen" : "godan",
      ...(translation.koreanPrefix === undefined ? {} : { koreanPrefix: translation.koreanPrefix }),
      ...(translation.koreanSuffix === undefined ? {} : { koreanSuffix: translation.koreanSuffix })
    };
  }
  if (translation.koreanPos === 형용사 && translation.korean.endsWith("다")) {
    return {
      stemKind: "adj",
      lemma: translation.korean,
      irregular: translation.irregular ?? null,
      koreanPos: 형용사,
      ...(translation.koreanPrefix === undefined ? {} : { koreanPrefix: translation.koreanPrefix }),
      ...(translation.koreanSuffix === undefined ? {} : { koreanSuffix: translation.koreanSuffix })
    };
  }
  return {
    stemKind: "verb",
    lemma: `${translation.korean}하다`,
    irregular: "여",
    koreanPos: 동사,
    conj: "sahen",
    shortNegationPolicy: "sahen_split",
    ...(translation.koreanPrefix === undefined ? {} : { koreanPrefix: translation.koreanPrefix }),
    ...(translation.koreanSuffix === undefined ? {} : { koreanSuffix: translation.koreanSuffix })
  };
}

export function sahenStemProjectionCandidates(
  translation: TailParserStemSense,
  sahenNounSurface: string,
  lookups: LookupTables,
  allocateProjectionOrdinal: () => number,
  options: { readonly followingAgentiveAux?: boolean } = {}
): readonly StemCandidateProjection[] {
  const base = sahenStemProjection(translation);
  if (
    translation.koreanPos === 동사 ||
    !lookups.SEMANTIC_PATIENT_RESULT_SAHEN_NOUNS.has(sahenNounSurface) ||
    options.followingAgentiveAux === true
  ) {
    return [base];
  }
  const prefixSuffix = {
    ...(translation.koreanPrefix === undefined ? {} : { koreanPrefix: translation.koreanPrefix }),
    ...(translation.koreanSuffix === undefined ? {} : { koreanSuffix: translation.koreanSuffix })
  };
  return [
    {
      ...base,
      senseFrame: {
        id: "patient_result_sahen_transitive",
        lexicalConditions: { prevCaseExists: ["を"] }
      }
    },
    {
      stemKind: "verb",
      lemma: `${translation.korean}되다`,
      irregular: null,
      koreanPos: 동사,
      shortNegationPolicy: "long_only",
      teIruResultative: true,
      projectionOrdinal: allocateProjectionOrdinal(),
      ...prefixSuffix
    }
  ];
}

export function sahenPredicateHasFollowingAgentiveAux(
  tokens: readonly RuntimeHaruToken[],
  sahenVerbIdx: number,
  lookups: LookupTables
): boolean {
  const next = tokens[sahenVerbIdx + 1];
  if (
    next !== undefined && (next.pos & POS0) === 助動詞0 &&
    (next.dictionaryForm === "せる" || next.dictionaryForm === "させる")
  ) {
    return true;
  }
  const connective = tokens[sahenVerbIdx + 1];
  const postverb = tokens[sahenVerbIdx + 2];
  const postverbLemma = postverb?.dictionaryForm || postverb?.surface;
  return connective?.surface === "て" &&
    (connective.pos & POS0) === 助詞 &&
    postverb !== undefined && (postverb.pos & POS0) === 動詞 &&
    postverbLemma !== undefined && (
      lookups.PATIENT_RESULT_AGENTIVE_AUXILIARIES.has(postverbLemma) ||
      TE_TAIL_CONTINUATION_LEXEME_KIND_BY_FORM.get(postverbLemma) === "benefactive"
    );
}

export function stemInputFromCandidate(
  candidate: StemCandidate,
  sourceStemKind: TailParserSourceStemKind
): StemInput {
  const candidateStemKind = tailParserStemKindForCandidate(candidate, sourceStemKind);
  if (stemCandidateNeedsDeferredCommit(candidate)) {
    if (candidateStemKind === "noun") {
      return {
        kind: "noun",
        lemma: candidate.lemma,
        ...(candidate.nominalTargetForVerbalSource === true
          ? { nominalTargetForVerbalSource: true as const }
          : {}),
        ...nounStemInterjectionForCandidate(candidate),
        ...(candidate.koreanPrefix === undefined ? {} : { koreanPrefix: candidate.koreanPrefix }),
        ...(candidate.koreanSuffix === undefined ? {} : { koreanSuffix: candidate.koreanSuffix })
      };
    }
    return {
      kind: "candidateSet",
      candidates: [candidate]
    };
  }
  if (candidateStemKind === "noun") {
    return {
      kind: "noun",
      lemma: candidate.lemma,
      ...(candidate.nominalTargetForVerbalSource === true
        ? { nominalTargetForVerbalSource: true as const }
        : {}),
      ...nounStemInterjectionForCandidate(candidate),
      ...(candidate.koreanPrefix === undefined ? {} : { koreanPrefix: candidate.koreanPrefix }),
      ...(candidate.koreanSuffix === undefined ? {} : { koreanSuffix: candidate.koreanSuffix })
    };
  }
  return {
    kind: candidateStemKind,
    lemma: candidate.lemma,
    irregular: candidate.irregular,
    ...(candidateStemKind === "verb" && candidate.conj !== undefined ? { conj: candidate.conj } : {}),
    ...(candidate.shortNegationPolicy === undefined ? {} : { shortNegationPolicy: candidate.shortNegationPolicy }),
    ...(candidate.dropFirstPassiveAux === true ? { absorbedPassiveAux: true as const } : {}),
    ...(candidate.koreanPrefix === undefined ? {} : { koreanPrefix: candidate.koreanPrefix }),
    ...(candidate.koreanSuffix === undefined ? {} : { koreanSuffix: candidate.koreanSuffix })
  };
}

function tailParserStemKindForCandidate(
  candidate: StemCandidate,
  sourceStemKind: TailParserSourceStemKind
): TailParserProjectedStemKind {
  if (candidate.koreanPos === 형용사) {
    return "adj";
  }
  if (candidate.koreanPos === 동사) {
    return "verb";
  }
  if (candidate.koreanPos === 명사) {
    return "noun";
  }
  if (candidate.koreanPos === 부사) {
    return "adverb";
  }
  return sourceStemKind;
}

export function tailParserStemKindForTranslation(
  translation: TailParserStemSense,
  sourceStemKind: TailParserSourceStemKind
): TailParserProjectedStemKind {
  if (translation.koreanPos === 형용사) {
    return "adj";
  }
  if (translation.koreanPos === 동사) {
    return "verb";
  }
  if (translation.koreanPos === 명사) {
    return "noun";
  }
  if (translation.koreanPos === 부사) {
    return "adverb";
  }
  return sourceStemKind;
}

function translationConnectiveRoles(translation: TailParserStemSense): readonly string[] {
  const role = translation.connectiveRole;
  const roles = [
    ...(role === undefined ? [] : Array.isArray(role) ? role : [role]),
    ...connectiveRolesFromFramePayload(translation.senseFrame),
    ...(Array.isArray(translation.senseFrames) ? translation.senseFrames.flatMap(connectiveRolesFromFramePayload) : [])
  ];
  if (roles.length === 0) {
    return [];
  }
  return [...new Set(roles)];
}

function connectiveRolesFromFramePayload(frame: unknown): readonly string[] {
  if (frame === null || frame === undefined || typeof frame !== "object" || Array.isArray(frame)) {
    return [];
  }
  const role = (frame as Record<string, unknown>).connectiveRole;
  if (typeof role === "string") {
    return [role];
  }
  if (Array.isArray(role) && role.every((item): item is string => typeof item === "string")) {
    return role;
  }
  return [];
}

export function stemTranslationNeedsCommitSelection(
  translation: TailParserStemSense,
  sourceStemKind: TailParserSourceStemKind
): boolean {
  return stemTranslationHasFrameEvidence(translation) ||
    translation.dropFirstNegativeAux === true ||
    translation.dropFirstPassiveAux === true ||
    translation.dropFirstCausativeAux === true ||
    translation.teIruResultative === true ||
    stemTranslationHasTeIruDropAux(translation, sourceStemKind) ||
    translation.teIruContractToPast === true;
}

export function stemCandidateNeedsDeferredCommit(candidate: StemCandidate): boolean {
  return candidate.intrinsicHonorific === true ||
    stemCandidateNeedsDerivedVoiceCommit(candidate) ||
    senseCarriesSelectionFrame(candidate) ||
    candidate.casePreferences !== undefined ||
    candidate.caseRealization !== undefined ||
    candidate.slotRealization !== undefined ||
    candidate.senseCaseRealization !== undefined ||
    candidate.senseSlotRealization !== undefined ||
    candidate.dropFirstNegativeAux === true ||
    candidate.dropFirstPassiveAux === true ||
    candidate.dropFirstCausativeAux === true ||
    candidate.teIruResultative === true ||
    candidate.teIruDropAux === true ||
    candidate.teIruContractToPast === true;
}

function stemCandidateNeedsDerivedVoiceCommit(candidate: StemCandidate): boolean {
  const id = candidate.derivation?.id;
  if (id !== "passive" && id !== "potential" && id !== "honorific") {
    return false;
  }
  return !(id === "passive" && candidate.dropFirstPassiveAux === true);
}

function stemTranslationHasFrameEvidence(translation: TailParserStemSense): boolean {
  return senseFramePayloadHasSourceEvidence(translation.senseFrame) ||
    (Array.isArray(translation.senseFrames) && translation.senseFrames.some(senseFramePayloadHasSourceEvidence)) ||
    translation.casePreferences !== undefined ||
    translation.caseRealization !== undefined ||
    translation.slotRealization !== undefined ||
    translation.senseCaseRealization !== undefined ||
    translation.senseSlotRealization !== undefined;
}

function stemTranslationHasTeIruDropAux(
  translation: TailParserStemSense,
  sourceStemKind: TailParserSourceStemKind
): boolean {
  return translation.teIruDropAux === true ||
    (sourceStemKind === "verb" && translation.koreanPos === 형용사);
}

function shortNegationPolicyForStemTranslation(
  translation: TailParserStemSense,
  stemKind: TailParserProjectedStemKind
): StemCandidate["shortNegationPolicy"] | undefined {
  if (stemKind === "adverb") {
    return undefined;
  }
  return shortNegationPolicyForTranslation(translation.korean, {
    stemKind,
    ...(translation.shortNegationPolicy === undefined ? {} : { explicitPolicy: translation.shortNegationPolicy }),
    ...(translation.dropFirstCausativeAux === true ? { dropFirstCausativeAux: true } : {})
  });
}

export function suppletiveBaseStemForMaterialization(
  stem: StemInput,
  senses: readonly TailParserStemSense[],
  stemKind: TailParserSourceStemKind,
  conjForVerb: VerbConjType | undefined
): { readonly stem: StemInput; readonly korean: string } | null {
  if (stemKind === "noun") {
    return null;
  }
  if (stem.kind !== "candidateSet") {
    return { stem, korean: stem.lemma };
  }
  const candidate = senses.find((translation) =>
    !stemTranslationHasFrameEvidence(translation) &&
    !stemTranslationHasDerivedVoice(translation) &&
    loadSuppletiveNegDict().has(translation.korean)
  );
  if (candidate === undefined) {
    return null;
  }
  return {
    korean: candidate.korean,
    stem: {
      kind: stemKind,
      lemma: candidate.korean,
      irregular: candidate.irregular ?? null,
      ...(conjForVerb === undefined ? {} : { conj: conjForVerb })
    }
  };
}

function stemTranslationHasDerivedVoice(translation: TailParserStemSense): boolean {
  const derivation = (translation as { readonly derivation?: unknown }).derivation;
  return derivation === "passive" || derivation === "potential" || derivation === "honorific";
}

export function detectSplitSuppletiveNegativeStem(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  baseOffset: number
): SplitSuppletiveNegativeStem | null {
  if (!isSplitSuppletiveNegativeSurfaceStart(tokens, start)) {
    return null;
  }
  const first = tokens[start]!;
  const second = tokens[start + 1]!;
  const dictionaryForm = `${first.surface}かる`;
  const virtualToken: RuntimeHaruToken = {
    ...rewriteRuntimeTokenSurface(first, { kind: "merge", sources: [first, second] }),
    dictionaryForm,
    reading: "ワカラ",
    dictionaryFormReading: "ワカル",
    pos: 動詞 | 五段_ラ行 | 未然形_一般,
    syntheticReason: "tail_parser_split_suppletive_negative_stem",
    splitB: [first, second]
  };
  return {
    virtualToken,
    firstNegIdx: start + 2,
    stemSourceTokens: [first, second],
    stemSourceTokenIndices: [baseOffset + start, baseOffset + start + 1]
  };
}

export function detectContractedNegativeNStem(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  baseOffset: number
): ContractedNegativeNStem | null {
  const token = tokens[start];
  const connector = tokens[start + 1];
  if (
    token === undefined || connector === undefined || (token.pos & POS0) !== 動詞 || !is五段(token.pos) || connector.surface !== "で" || (connector.pos & POS01) !== 助詞_接続助詞
  ) {
    return null;
  }
  const surfaceStem = godanDictionaryFormToMizenStem(token.dictionaryForm);
  const readingStem = godanDictionaryFormToMizenStem(token.dictionaryFormReading);
  if (surfaceStem === null || readingStem === null) {
    return null;
  }
  const expectedSurface = `${surfaceStem}ん`;
  if (token.surface !== expectedSurface) {
    return null;
  }

  const virtualToken: RuntimeHaruToken = {
    ...token,
    surface: surfaceStem,
    reading: readingStem,
    pos: (token.pos & ~POS5) | 未然形_一般,
    syntheticReason: "tail_parser_contracted_negative_n_stem",
    splitB: [token]
  };
  const negativeToken: RuntimeHaruToken = {
    ...token,
    surface: "ん",
    normalizedForm: "ぬ",
    dictionaryForm: "ぬ",
    reading: "ン",
    dictionaryFormReading: "ヌ",
    pos: 助動詞0 | 助動詞_ヌ | 終止形_,
    syntheticReason: "tail_parser_contracted_negative_n_aux",
    splitB: [token]
  };
  return {
    virtualToken,
    negativeToken,
    stemSourceTokens: [token],
    stemSourceTokenIndices: [baseOffset + start]
  };
}

function garuDerivedSenses(
  entry: MorphemeEntry | undefined,
  accepts: (koreanPos: number) => boolean,
  deriveKorean: (candidate: TranslationCandidate) => string
): readonly MorphemeSense[] {
  if (entry === undefined) {
    return [];
  }
  return iterTranslationCandidates(entry)
    .filter((candidate) => accepts(candidate.koreanPos) && !senseRequiresAuxChainEvidence(candidate.translation))
    .map((candidate) => {
      const source = candidate.translation;
      const targetRoles = gaTargetRolesOfSense(source);
      return {
        korean: deriveKorean(candidate),
        koreanPos: 동사,
        irregular: "여" as IrregularType,
        ...(source.senseFrame === undefined ? {} : { senseFrame: garuDerivedFrame(source.senseFrame, targetRoles) }),
        ...(source.senseFrames === undefined ? {} : { senseFrames: source.senseFrames.map((frame) => garuDerivedFrame(frame, targetRoles)) }),
        ...(source.casePreferences === undefined ? {} : { casePreferences: source.casePreferences }),
        ...(source.caseRealization === undefined ? {} : { caseRealization: source.caseRealization }),
        ...(source.slotRealization === undefined ? {} : { slotRealization: source.slotRealization }),
        ...(source.senseCaseRealization === undefined ? {} : { senseCaseRealization: source.senseCaseRealization }),
        ...(source.senseSlotRealization === undefined ? {} : { senseSlotRealization: source.senseSlotRealization }),
        ...(source.priorityGroup === undefined ? {} : { priorityGroup: source.priorityGroup }),
        ...(source.priorityInGroup === undefined ? {} : { priorityInGroup: source.priorityInGroup })
      } satisfies MorphemeSense;
    });
}

function gaTargetRolesOfSense(translation: MorphemeSense): ReadonlySet<string> {
  const roles = new Set<string>();
  for (const realization of [translation.caseRealization, translation.senseCaseRealization]) {
    if (realization === undefined || realization === null) {
      continue;
    }
    for (const [role, value] of Object.entries(realization)) {
      if (caseSpecIsObject(value) || (isPlainRecord(value) && !isRoleWideCaseSpecRecord(value) && caseSpecIsObject(value["が"]))) {
        roles.add(role);
      }
    }
  }
  return roles;
}

function caseSpecIsObject(value: unknown): boolean {
  return value === "을/를" || (isPlainRecord(value) && value.allomorphKey === "을/를");
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRoleWideCaseSpecRecord(value: Record<string, unknown>): boolean {
  return "allomorphKey" in value || "korean" in value || "role" in value;
}

function garuDerivedFrame<F extends NonNullable<MorphemeSense["senseFrame"]>>(frame: F, targetRoles: ReadonlySet<string>): F {
  if (targetRoles.size === 0 || frame.slots === undefined) {
    return frame;
  }
  let changed = false;
  const slots = frame.slots.map((slot) => {
    if (slot.role === undefined || !targetRoles.has(slot.role) || slot.particles?.includes("が") !== true) {
      return slot;
    }
    changed = true;
    return { ...slot, particles: [...new Set(slot.particles.map((particle) => particle === "が" ? "を" : particle))] };
  });
  return changed ? { ...frame, slots } : frame;
}

export async function detectGaruSyntheticStem(
  input: IntegrationInput,
  range: { readonly start: number; readonly end: number },
  baseOffset: number
): Promise<VirtualCompoundStem | null> {
  if (range.start + 1 > range.end) {
    return null;
  }
  const head = input.tokens[range.start];
  const garu = input.tokens[range.start + 1];
  if (head === undefined || garu === undefined) {
    return null;
  }

  const isSuffixGaru = isGaruSuffixToken(garu);
  const isAuxTagaru = isTagaruAuxToken(head, garu);
  if (!isSuffixGaru && !isAuxTagaru) {
    return null;
  }

  const virtualToken = buildGaruVirtualToken(head, garu, isAuxTagaru ? "たがる" : "がる");
  let entry: MorphemeEntry;

  if (isAuxTagaru) {
    const headEntry = await input.dictionary.lookupTokenRelaxed(head);
    const senses = garuDerivedSenses(
      headEntry,
      (pos) => pos === 동사,
      (candidate) => `${conjugate(candidate.koreanLemma, irregularType(candidate.irregular), "고")} 싶어하다`
    );
    if (senses.length === 0) {
      return null;
    }
    entry = buildSyntheticGaruEntry(virtualToken, senses);
  } else {
    const lexicalEntry = await lookupLexicalizedGaruEntry(input.dictionary, head, garu, virtualToken);
    if (lexicalEntry !== null) {
      entry = lexicalEntry;
    } else if (head.dictionaryForm === "欲する") {
      entry = buildSyntheticGaruEntry(virtualToken, [{ korean: "갖고 싶어하다", koreanPos: 동사, irregular: "여" }]);
    } else if ((head.pos & POS0) === 形容詞0 || (head.pos & POS0) === 形状詞) {
      const headEntry = await input.dictionary.lookupTokenRelaxed(head);
      const senses = garuDerivedSenses(
        headEntry,
        (pos) => pos === 동사 || pos === 형용사,
        (candidate) => `${conjugate(candidate.koreanLemma, irregularType(candidate.irregular), "아/어")}하다`
      );
      if (senses.length === 0) {
        return null;
      }
      entry = buildSyntheticGaruEntry(virtualToken, senses);
    } else {
      return null;
    }
  }

  return {
    virtualToken,
    entry,
    consumed: 2,
    stemSourceTokens: [head, garu],
    stemSourceTokenIndices: [baseOffset + range.start, baseOffset + range.start + 1]
  };
}

function resolveLemmaEntryInContext(
  entry: MorphemeEntry | undefined,
  input: IntegrationInput,
  pos: number
): MorphemeEntry | undefined {
  if (entry === undefined) {
    return undefined;
  }
  return resolveContext(entry, input.tokens, pos, { lookups: input.lookups, numeric: input.numeric });
}

async function withStandaloneNumeralLexicalOwner(
  plan: NumeralPlan,
  input: IntegrationInput,
  pos: number
): Promise<NumeralPlan> {
  const head = input.tokens[pos];
  if (head === undefined) {
    return plan;
  }
  const lookup = await input.dictionary.lookupTokenRelaxed(head)
    ?? await input.synthesizeEntry?.(head, { nextToken: input.tokens[pos + 1] ?? null });
  const entry = resolveLemmaEntryInContext(lookup, input, pos);
  if (entry === undefined || isSurfaceEchoFallbackEntry(entry)) {
    return plan;
  }
  const candidate = firstTranslationCandidate(entry);
  return candidate === undefined ? plan : { ...plan, lexicalOwnerSurface: candidate.koreanLemma };
}

function isSurfaceEchoFallbackEntry(entry: MorphemeEntry): boolean {
  return entry.synthetic === true && entry.syntheticReason === "surface_fallback";
}

function nounCompoundHeadKorean(entry: MorphemeEntry): string | null {
  for (const candidate of iterTranslationCandidates(entry)) {
    if (isKoreanNounAble(candidate.koreanPos, candidate.translation.nominalized)) {
      return koreanNounLemma(candidate.koreanLemma, candidate.koreanPos, candidate.translation.nominalized);
    }
  }
  return null;
}

function boundQuantityBeforeCounterNoun(
  input: IntegrationInput,
  localStart: number,
  baseOffset: number,
  contextTokens: readonly RuntimeHaruToken[] | undefined
): boolean {
  const previous = tokenBeforeNounPhraseHead(input, localStart, baseOffset, contextTokens);
  if (previous === undefined) {
    return false;
  }
  return readNumeralToken(previous, {
    zeroQuantitySurfaces: input.numeric.ZERO_QUANTITY_NUMERALS,
    counterCombined: true
  }) !== undefined;
}

function tokenBeforeNounPhraseHead(
  input: IntegrationInput,
  localStart: number,
  baseOffset: number,
  contextTokens: readonly RuntimeHaruToken[] | undefined
): RuntimeHaruToken | undefined {
  if (localStart >= 1) {
    return input.tokens[localStart - 1];
  }
  if (contextTokens === undefined || contextTokens === input.tokens) {
    return undefined;
  }
  const absoluteStart = baseOffset + localStart;
  if (absoluteStart < 1 || contextTokens[absoluteStart] !== input.tokens[localStart]) {
    return undefined;
  }
  return contextTokens[absoluteStart - 1];
}

export async function detectNounPhraseHeadStem(
  input: IntegrationInput,
  range: { readonly start: number; readonly end: number },
  baseOffset: number,
  outgoingBoundary?: ClauseBoundary,
  contextTokens?: readonly RuntimeHaruToken[]
): Promise<VirtualCompoundStem | null> {
  const head = input.tokens[range.start];
  if (head === undefined || !isNominalCopulaHostPos(head.pos)) {
    return null;
  }
  const reserved = matchedNumericHostReservation(input, baseOffset + range.start);
  const span = nounPhraseHeadSpan(input.cursor, range.start, input.numeric, reserved, input.lookups);
  const suffixEnd = span.endExclusive;
  const standaloneNumeralHead = isStandaloneNumeralHeadSpan(span, range.start);
  if (isNumeralToken(head) && span.numeral === null) {
    return null;
  }
  if (suffixEnd === range.start + 1 && span.numeral === null) {
    return null;
  }
  if (
    !isNounPhraseCopulaPredicateStart(input.cursor, range.start, input.numeric, input.lookups, reserved) &&
    !isNominalEvidentialRashiiPredicateStart(input.tokens, range.start, input.lookups) &&
    !isNominalQuestionTerminalStart(input.cursor, range.start, input.numeric, input.lookups) &&
    !isBareNominalQuoteContentNounPhrase(outgoingBoundary, baseOffset + span.endExclusive)
  ) {
    return null;
  }
  const parts: NounPhraseSurfacePart[] = [];
  const lastSpanToken = input.tokens[suffixEnd - 1];
  const endsWithDerivationalSuffix =
    lastSpanToken !== undefined && isNaAdjectiveDerivationalSuffix(lastSpanToken);
  let numericBase: NumericStemBase | null = null;
  let suffixLoopStart: number;
  if (span.numeral !== null) {
    const numeral = reserved !== null
      ? reserved.plan
      : contextResolvedNounPhraseNumeral(
        input,
        range.start,
        baseOffset,
        { ...span, numeral: span.numeral },
        contextTokens
      );
    const numeralPlan = numeral.kind !== "numeral" || !standaloneNumeralHead
      ? numeral
      : await withStandaloneNumeralLexicalOwner(numeral, input, range.start);
    numericBase = { plan: numeralPlan };
    suffixLoopStart = span.suffixStart;
  } else {
    const headLookup = await input.dictionary.lookupTokenRelaxed(head)
      ?? await input.synthesizeEntry?.(head, { nextToken: input.tokens[range.start + 1] ?? null });
    const headEntry = resolveLemmaEntryInContext(headLookup, input, range.start);
    const headCandidate = headEntry === undefined ? undefined : firstTranslationCandidate(headEntry);
    if (headCandidate === undefined || headEntry === undefined) {
      return null;
    }
    const headKorean = endsWithDerivationalSuffix
      ? nounCompoundHeadKorean(headEntry)
      : headCandidate.koreanLemma;
    if (headKorean === null) {
      return null;
    }
    parts.push({ korean: headKorean, isSuffixNoun1Char: false, isNominal: true });
    suffixLoopStart = span.suffixStart;
  }
  const honorificLookups = honorificClusterLookupsFrom(input.lookups);
  for (let k = suffixLoopStart; k < suffixEnd; k++) {
    const suffixToken = input.tokens[k]!;
    const clusterDecision = honorificClusterSuffixDecision(input.tokens, k, honorificLookups);
    if (clusterDecision?.kind === "absorbed") {
      continue;
    }
    if (clusterDecision?.kind === "override") {
      parts.push({
        korean: clusterDecision.realization.korean,
        attachLeft: clusterDecision.realization.attachLeft,
        isSuffixNoun1Char: false,
        isNominal: false
      });
      continue;
    }
    const numeralCounterHead = numericBase !== null &&
      numericBase.plan.kind === "numeral" &&
      (numericBase.plan.counterKey.length > 0 || numericBase.plan.amountFormatted === true);
    const numeralBoundCounterNoun = isCounterCapableToken(head) &&
      boundQuantityBeforeCounterNoun(input, range.start, baseOffset, contextTokens);
    const approximationMarker = numeralCounterHead || numeralBoundCounterNoun
      ? quantityApproximationMarker(suffixToken, input.numeric)
      : undefined;
    if (approximationMarker !== undefined) {
      parts.push({
        korean: approximationMarker.korean,
        attachLeft: false,
        isSuffixNoun1Char: false,
        isNominal: false
      });
      continue;
    }
    const suffixEntry = resolveLemmaEntryInContext(await input.dictionary.lookupTokenRelaxed(suffixToken), input, k);
    const suffixCandidate = suffixEntry === undefined ? undefined : firstTranslationCandidate(suffixEntry);
    if (suffixCandidate === undefined) {
      return null;
    }
    parts.push({
      korean: suffixCandidate.koreanLemma,
      attachLeft: suffixCandidate.translation.attachLeft ?? true,
      attachRight: suffixCandidate.translation.attachRight,
      isSuffixNoun1Char: false,
      isNominal: false
    });
  }
  const consumed = span.endExclusive - range.start;
  const sourceTokens = input.tokens.slice(range.start, range.start + consumed);
  const surface = sourceTokens.map((token) => token.surface).join("");
  const lemma = numericBase === null ? joinNounPhraseSurface(parts) : surface;
  if (lemma.length === 0 || range.start + consumed - 1 > range.end) {
    return null;
  }
  const reading = sourceTokens.map((token) => token.reading).join("");
  const virtualToken: RuntimeHaruToken = {
    ...rewriteRuntimeTokenSurface(head, { kind: "merge", sources: sourceTokens }),
    dictionaryForm: surface,
    reading,
    dictionaryFormReading: reading,
    syntheticReason: "tail_parser_noun_phrase_head"
  };
  const entry: MorphemeEntry = {
    surface,
    dictionaryForm: surface,
    reading,
    dictionaryFormReading: reading,
    pos: virtualToken.pos,
    conjugationType: virtualToken.pos & POS4,
    conjugationForm: POS5A_NAME[(virtualToken.pos & POS5A) >> POS5A_SHIFT] ?? "*",
    senses: [{ korean: lemma, koreanPos: 명사, irregular: null }],
    synthetic: true,
    syntheticReason: "tail_parser_noun_phrase_head"
  };
  return {
    virtualToken,
    entry,
    consumed,
    stemSourceTokens: sourceTokens,
    stemSourceTokenIndices: sourceTokens.map((_, offset) => baseOffset + range.start + offset),
    ...(numericBase === null
      ? {}
      : { numericBase: parts.length === 0 ? numericBase : { ...numericBase, suffixParts: parts } })
  };
}

export async function detectRentaishiPronominalNoHeadStem(
  input: IntegrationInput,
  range: { readonly start: number; readonly end: number },
  baseOffset: number
): Promise<VirtualCompoundStem | null> {
  const span = rentaishiPronominalNoHeadSpanAt(input.tokens, range.start);
  if (span === null || span.endExclusive - 1 > range.end) {
    return null;
  }
  const head = input.tokens[range.start]!;
  const headLookup = await input.dictionary.lookupTokenRelaxed(head)
    ?? await input.synthesizeEntry?.(head, { nextToken: input.tokens[range.start + 1] ?? null });
  const headEntry = resolveLemmaEntryInContext(headLookup, input, range.start);
  const headCandidate = headEntry === undefined ? undefined : firstTranslationCandidate(headEntry);
  if (headCandidate === undefined) {
    return null;
  }
  const pronominalNoHeadBase: PronominalNoHeadStemBase = {
    prefix: nodaAttributive(
      headCandidate.koreanLemma,
      headCandidate.irregular,
      headCandidate.koreanPos,
      [],
      null,
      { lookups: input.lookups }
    )
  };
  const lemma = pronominalNoHeadStemSurface(pronominalNoHeadBase, { formal: true, fullForm: true });
  if (lemma.length === 0) {
    return null;
  }
  const consumed = span.endExclusive - range.start;
  const sourceTokens = input.tokens.slice(range.start, span.endExclusive);
  const surface = sourceTokens.map((token) => token.surface).join("");
  const reading = sourceTokens.map((token) => token.reading).join("");
  const virtualToken: RuntimeHaruToken = {
    ...rewriteRuntimeTokenSurface(head, { kind: "merge", sources: sourceTokens }),
    pos: 名詞 | 普通名詞,
    dictionaryForm: surface,
    reading,
    dictionaryFormReading: reading,
    syntheticReason: "tail_parser_rentaishi_pronominal_no_head"
  };
  const entry: MorphemeEntry = {
    surface,
    dictionaryForm: surface,
    reading,
    dictionaryFormReading: reading,
    pos: virtualToken.pos,
    conjugationType: virtualToken.pos & POS4,
    conjugationForm: POS5A_NAME[(virtualToken.pos & POS5A) >> POS5A_SHIFT] ?? "*",
    senses: [{ korean: lemma, koreanPos: 명사, irregular: null }],
    synthetic: true,
    syntheticReason: "tail_parser_rentaishi_pronominal_no_head"
  };
  return {
    virtualToken,
    entry,
    consumed,
    stemSourceTokens: sourceTokens,
    stemSourceTokenIndices: sourceTokens.map((_, offset) => baseOffset + range.start + offset),
    pronominalNoHeadBase
  };
}

export function detectDemonstrativePropositionHostStem(
  input: IntegrationInput,
  range: { readonly start: number; readonly end: number },
  baseOffset: number
): VirtualCompoundStem | null {
  if (range.end <= range.start || !isDemonstrativePropositionWakeHostStart(input.tokens, range.start, input.lookups)) {
    return null;
  }
  const host = demonstrativePropositionHostAt(input.tokens, range.start, input.lookups);
  if (host === null) {
    return null;
  }
  const [korean, irregular] = host;
  const head = input.tokens[range.start]!;
  const virtualToken: RuntimeHaruToken = {
    ...head,
    pos: 副詞,
    syntheticReason: "tail_parser_demonstrative_proposition_host"
  };
  const entry: MorphemeEntry = {
    surface: head.surface,
    dictionaryForm: head.dictionaryForm,
    reading: head.reading,
    dictionaryFormReading: head.dictionaryFormReading,
    pos: 副詞,
    conjugationType: 0,
    conjugationForm: "*",
    senses: [{ korean, koreanPos: 형용사, irregular }],
    synthetic: true,
    syntheticReason: "tail_parser_demonstrative_proposition_host"
  };
  return {
    virtualToken,
    entry,
    consumed: 1,
    stemSourceTokens: [head],
    stemSourceTokenIndices: [baseOffset + range.start],
    propositionHost: true
  };
}

export function propositionHostChainBindsWake(root: { readonly tail: TailNode }): boolean {
  const op = firstAuxLayer(root.tail)?.ops[0];
  if (op === undefined) {
    return false;
  }
  return (op.kind === "modal" && op.modal === "wake" && op.variant !== "explanatory") ||
    (op.kind === "idiom" && op.idiom === "wake_impossible") ||
    (op.kind === "scopeBridge" && op.head === "wake");
}

function matchedNumericHostReservation(
  input: IntegrationInput,
  absoluteStart: number
): NumericHostSpanReservation | null {
  const reservation = input.numericHostReservation;
  return reservation !== undefined && reservation.tokenIdx === absoluteStart
    ? { consumed: reservation.consumed, plan: reservation.plan }
    : null;
}

function isGaruSuffixToken(token: RuntimeHaruToken): boolean {
  return (token.pos & POS01) === 接尾辞_動詞的 && token.dictionaryForm === "がる";
}

function isTagaruAuxToken(head: RuntimeHaruToken, token: RuntimeHaruToken): boolean {
  return (head.pos & POS0) === 動詞 &&
    (token.pos & POS0) === 助動詞0 &&
    token.dictionaryForm === "たがる";
}

function buildGaruVirtualToken(
  head: RuntimeHaruToken,
  garu: RuntimeHaruToken,
  dictionarySuffix: "がる" | "たがる"
): RuntimeHaruToken {
  const headReading = head.reading;
  const suffixReading = dictionarySuffix === "たがる" ? "タガル" : "ガル";
  return {
    ...rewriteRuntimeTokenSurface(garu, { kind: "merge", sources: [head, garu] }),
    dictionaryForm: `${head.surface}${dictionarySuffix}`,
    reading: `${headReading}${garu.reading}`,
    dictionaryFormReading: `${headReading}${suffixReading}`,
    pos: 動詞 | ((garu.pos & POS4) !== 0 ? (garu.pos & POS4) : 五段_ラ行) | (garu.pos & POS5),
    syntheticReason: dictionarySuffix === "たがる"
      ? "tail_parser_tagaru_compound_stem"
      : "tail_parser_garu_compound_stem"
  };
}

async function lookupLexicalizedGaruEntry(
  dictionary: DictLookup,
  head: RuntimeHaruToken,
  garu: RuntimeHaruToken,
  virtualToken: RuntimeHaruToken
): Promise<MorphemeEntry | null> {
  if (head.surface.length === 0 || head.reading.length === 0) {
    return null;
  }
  const lookupToken: RuntimeHaruToken = {
    ...virtualToken,
    dictionaryForm: `${head.surface}がる`,
    dictionaryFormReading: `${head.reading}ガル`,
    syntheticReason: "tail_parser_lexicalized_garu_lookup"
  };
  const entry = await dictionary.lookupTokenRelaxed(lookupToken);
  return entry ?? null;
}

function buildSyntheticGaruEntry(
  virtualToken: RuntimeHaruToken,
  senses: readonly MorphemeSense[]
): MorphemeEntry {
  return {
    surface: virtualToken.surface,
    dictionaryForm: virtualToken.dictionaryForm,
    reading: virtualToken.reading,
    dictionaryFormReading: virtualToken.dictionaryFormReading,
    pos: virtualToken.pos,
    conjugationType: (virtualToken.pos & POS4) !== 0 ? (virtualToken.pos & POS4) : 五段_ラ行,
    conjugationForm: POS5A_NAME[(virtualToken.pos & POS5A) >> POS5A_SHIFT] ?? "*",
    senses: [...senses],
    synthetic: true,
    ...(virtualToken.syntheticReason === undefined ? {} : { syntheticReason: virtualToken.syntheticReason })
  };
}

export async function detectVirtualCompoundDictionaryStem(
  input: IntegrationInput,
  range: { readonly start: number; readonly end: number },
  baseOffset: number
): Promise<VirtualCompoundStem | null> {
  for (const candidate of findCompoundVerbCandidatesAt(input.tokens, range.start, {
    includeSingleSplitA: false,
    includeStreamVv: true,
    includeSahenShiV: true,
    includeNounIntensiveTail: false
  })) {
    if (candidate.consumed <= 1 || range.start + candidate.consumed - 1 > range.end) {
      continue;
    }
    const virtualToken = buildVirtualCompoundToken(candidate) as RuntimeHaruToken;
    const entry = await lookupVirtualCompoundEntry(
      input.dictionary as unknown as MorphemeDictionary,
      virtualToken
    );
    if (entry === null) {
      continue;
    }
    const sourceTokens = input.tokens.slice(range.start, range.start + candidate.consumed);
    return {
      virtualToken,
      entry,
      consumed: candidate.consumed,
      stemSourceTokens: sourceTokens,
      stemSourceTokenIndices: sourceTokens.map((_, idx) => baseOffset + range.start + idx)
    };
  }
  return null;
}

export async function detectNominalRenyouPostverbAuxiliaryStem(
  input: IntegrationInput,
  range: { readonly start: number; readonly end: number },
  baseOffset: number
): Promise<VirtualCompoundStem | null> {
  if (input.dictionary.lookup === undefined || range.start + 1 > range.end) {
    return null;
  }
  const head = input.tokens[range.start];
  const tail = input.tokens[range.start + 1];
  if (
    head === undefined ||
    tail === undefined ||
    (head.pos & POS0) !== 名詞 ||
    !isPostverbAuxiliaryToken(tail)
  ) {
    return null;
  }
  const auxiliaries = directNounAttachingPostverbAuxiliaries(tail.dictionaryForm);
  if (
    auxiliaries.length === 0 ||
    !isPostverbAuxiliaryActivationAccepted(tail, input.tokens[range.start + 2])
  ) {
    return null;
  }
  const recovered = await lookupNominalRenyouVerbHead({
    lookupTokenRelaxed: async (token) =>
      await input.dictionary.lookupTokenRelaxed(token as RuntimeHaruToken) ?? null,
    lookup: async (dictionaryForm, reading, pos) =>
      await input.dictionary.lookup!(dictionaryForm, reading, pos)
  }, head);
  if (recovered === null) {
    return null;
  }
  const [entry, verbToken] = recovered;
  if (!auxiliaries.some((auxiliary) => postverbAuxiliaryCanHostRecoveredStem(auxiliary, verbToken, input.lookups))) {
    return null;
  }
  return {
    virtualToken: verbToken as RuntimeHaruToken,
    entry,
    consumed: 1,
    stemSourceTokens: [head],
    stemSourceTokenIndices: [baseOffset + range.start]
  };
}

export async function detectNominalRenyouMethodYouIdiomStem(
  input: IntegrationInput,
  range: { readonly start: number; readonly end: number },
  baseOffset: number
): Promise<VirtualCompoundStem | null> {
  if (input.dictionary.lookup === undefined || range.start + 1 > range.end) {
    return null;
  }
  const head = input.tokens[range.start];
  if (head === undefined || !isNominalRenyouMethodYouIdiomStart(input.tokens, range.start)) {
    return null;
  }
  const recovered = await lookupNominalRenyouVerbHead({
    lookupTokenRelaxed: async (token) =>
      await input.dictionary.lookupTokenRelaxed(token as RuntimeHaruToken) ?? null,
    lookup: async (dictionaryForm, reading, pos) =>
      await input.dictionary.lookup!(dictionaryForm, reading, pos)
  }, head);
  if (recovered === null) {
    return null;
  }
  const [entry, verbToken] = recovered;
  return {
    virtualToken: verbToken as RuntimeHaruToken,
    entry,
    consumed: 1,
    stemSourceTokens: [head],
    stemSourceTokenIndices: [baseOffset + range.start]
  };
}

export async function detectSahenPotentialDifficultyStem(
  input: IntegrationInput,
  range: { readonly start: number; readonly end: number },
  baseOffset: number
): Promise<VirtualCompoundStem | null> {
  const head = input.tokens[range.start];
  const potential = input.tokens[range.start + 1];
  const difficulty = input.tokens[range.start + 2];
  if (
    head === undefined ||
    potential === undefined ||
    difficulty === undefined ||
    !isSahenCapableNominal(head) ||
    !postverbAuxiliaryPayloadsForForm(potential.dictionaryForm)
      .some((payload) => payload.kind === "potential" &&
        payload.followingAuxiliaryKind === "difficulty" &&
        postverbAuxiliaryDeclaresHostAttachForm(payload, "sahen_stem")) ||
    !postverbAuxiliaryPayloadsForForm(difficulty.dictionaryForm)
      .some((payload) => payload.kind === "difficulty")
  ) {
    return null;
  }
  const entry = await input.dictionary.lookupTokenRelaxed(head);
  if (entry === undefined) {
    return null;
  }
  return {
    virtualToken: {
      ...head,
      pos: 動詞 | サ行変格 | 連用形_,
      syntheticReason: "sahen_potential_difficulty_hydration"
    },
    entry,
    consumed: 1,
    stemSourceTokens: [head],
    stemSourceTokenIndices: [baseOffset + range.start],
    sahenHydration: true
  };
}

function postverbAuxiliaryCanHostRecoveredStem(
  auxiliary: PostverbAuxiliaryPayload,
  token: Pick<RuntimeHaruToken, "dictionaryForm" | "surface">,
  lookups: LookupTables
): boolean {
  const lookupName = auxiliary.hostLookup;
  return lookupName === undefined ||
    postverbAuxiliaryHostLookupMatches(lookupName, token, lookups);
}

function postverbAuxiliaryHostLookupMatches(
  lookupName: string,
  token: Pick<RuntimeHaruToken, "dictionaryForm" | "surface">,
  lookups: LookupTables
): boolean {
  const lookup = lookups.named(lookupName);
  if (lookup === undefined) {
    return false;
  }
  return lookupSetMatches(lookup, token.dictionaryForm) ||
    lookupSetMatches(lookup, token.surface);
}

export async function detectDictionaryBackedLexicalSplitStem(
  input: IntegrationInput,
  range: { readonly start: number; readonly end: number },
  baseOffset: number
): Promise<VirtualCompoundStem | null> {
  const maxEnd = Math.min(range.end, range.start + 3);
  for (let end = maxEnd; end > range.start; end -= 1) {
    const sourceTokens = input.tokens.slice(range.start, end + 1);
    if (!isDictionaryBackedLexicalSplitCandidate(sourceTokens)) {
      continue;
    }
    for (const virtualToken of lexicalSplitVirtualTokens(sourceTokens)) {
      const entry = await lookupDictionaryBackedLexicalSplitEntry(input.dictionary, virtualToken);
      if (entry === null) {
        continue;
      }
      return {
        virtualToken,
        entry,
        consumed: sourceTokens.length,
        stemSourceTokens: sourceTokens,
        stemSourceTokenIndices: sourceTokens.map((_, idx) => baseOffset + range.start + idx)
      };
    }
  }
  return null;
}

function isDictionaryBackedLexicalSplitCandidate(tokens: readonly RuntimeHaruToken[]): boolean {
  if (tokens.length < 2) {
    return false;
  }
  const last = tokens[tokens.length - 1];
  if (last === undefined || !pos0in(last.pos, INFLECTABLE_BITS)) {
    return false;
  }
  if (!tokens.slice(1, -1).some((token) => (token.pos & POS0) === 助動詞0)) {
    return false;
  }
  return tokens.every((token) =>
    token.surface.length > 0 &&
    /^[\u3040-\u309f]+$/u.test(token.surface) &&
    (token.pos & POS0) !== 助詞 &&
    (token.pos & POS0) !== 補助記号
  );
}

function lexicalSplitVirtualTokens(tokens: readonly RuntimeHaruToken[]): readonly RuntimeHaruToken[] {
  const last = tokens[tokens.length - 1]!;
  const surface = tokens.map((token) => token.surface).join("");
  const reading = tokens.map((token) => token.reading).join("");
  const candidates = lexicalSplitDictionaryFormCandidates(surface, reading);
  const merged = rewriteRuntimeTokenSurface(last, { kind: "merge", sources: tokens });
  return candidates.map(({ dictionaryForm, dictionaryFormReading }) => ({
    ...merged,
    dictionaryForm,
    dictionaryFormReading,
    reading,
    pos: 動詞 | (last.pos & POS4) | (last.pos & POS5),
    syntheticReason: "tail_parser_dictionary_backed_lexical_split",
    splitB: tokens
  }));
}

function lexicalSplitDictionaryFormCandidates(
  surface: string,
  reading: string
): readonly { readonly dictionaryForm: string; readonly dictionaryFormReading: string }[] {
  const candidates: { dictionaryForm: string; dictionaryFormReading: string }[] = [{
    dictionaryForm: surface,
    dictionaryFormReading: reading
  }];
  if (surface.endsWith("へ") && reading.endsWith("ヘ")) {
    candidates.push({
      dictionaryForm: `${surface.slice(0, -"へ".length)}ふ`,
      dictionaryFormReading: `${reading.slice(0, -"ヘ".length)}フ`
    });
  }
  return dedupeLexicalSplitCandidates(candidates);
}

function dedupeLexicalSplitCandidates(
  candidates: readonly { readonly dictionaryForm: string; readonly dictionaryFormReading: string }[]
): readonly { readonly dictionaryForm: string; readonly dictionaryFormReading: string }[] {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = `${candidate.dictionaryForm}\u0000${candidate.dictionaryFormReading}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

async function lookupDictionaryBackedLexicalSplitEntry(
  dictionary: DictLookup,
  virtualToken: RuntimeHaruToken
): Promise<MorphemeEntry | null> {
  const entry = await dictionary.lookup?.(
    virtualToken.dictionaryForm,
    virtualToken.dictionaryFormReading,
    virtualToken.pos
  );
  return entry === undefined ? null : entry;
}

export async function detectContractedGodanCausativePassiveStem(
  input: IntegrationInput,
  range: { readonly start: number; readonly end: number }
): Promise<ContractedCausativePassiveStem | null> {
  if (range.start + 1 > range.end) {
    return null;
  }
  const token = input.tokens[range.start];
  const passive = input.tokens[range.start + 1];
  if (token === undefined || passive === undefined) {
    return null;
  }
  if (!isContractedGodanCausativeStemToken(token) || !isRareruAuxToken(passive)) {
    return null;
  }

  const originalEntry = await input.dictionary.lookupTokenRelaxed(token);
  if (originalEntry !== undefined) {
    return null;
  }

  const base = contractedGodanCausativeBase(token);
  if (base === null) {
    return null;
  }
  const virtualToken: RuntimeHaruToken = {
    ...rewriteRuntimeTokenSurface(token, { kind: "remove_suffix", suffix: "さ" }),
    dictionaryForm: base.dictionaryForm,
    reading: base.reading,
    dictionaryFormReading: base.dictionaryFormReading,
    pos: 動詞 | (token.pos & POS1) | (POS4_OF_NAME[base.conjugationType] ?? 0) | 未然形_一般,
    syntheticReason: "tail_parser_contracted_godan_causative_passive_stem",
    splitB: [token]
  };
  const entry = await input.dictionary.lookupTokenRelaxed(virtualToken);
  if (entry === undefined) {
    return null;
  }

  const causativeToken: RuntimeHaruToken = {
    ...rewriteRuntimeTokenSurface(token, { kind: "replace", surface: "させ" }),
    dictionaryForm: "させる",
    reading: "サセ",
    dictionaryFormReading: "サセル",
    pos: 助動詞0 | 下一段_サ行 | 未然形_一般,
    syntheticReason: "tail_parser_contracted_godan_causative_passive_aux",
    splitB: [token]
  };
  return {
    virtualToken,
    entry,
    causativeToken
  };
}

function isContractedGodanCausativeStemToken(token: RuntimeHaruToken): boolean {
  const form5A = token.pos & POS5A;
  return (token.pos & POS0) === 動詞 &&
    form5A === 未然形_ &&
    token.surface.endsWith("さ") &&
    token.reading.endsWith("サ") &&
    token.dictionaryForm.endsWith("す");
}

function isRareruAuxToken(token: RuntimeHaruToken): boolean {
  return (token.pos & (POS0 | POS4)) === (助動詞0 | 助動詞_レル);
}

function contractedGodanCausativeBase(token: RuntimeHaruToken): {
  readonly surface: string;
  readonly dictionaryForm: string;
  readonly reading: string;
  readonly dictionaryFormReading: string;
  readonly conjugationType: string;
} | null {
  const surfaceStem = token.surface.slice(0, -"さ".length);
  const readingStem = token.reading.slice(0, -"サ".length);
  const surfaceEnding = godanMizenEndingToDictionaryEnding(surfaceStem.at(-1));
  const readingEnding = godanMizenEndingToDictionaryEnding(readingStem.at(-1));
  if (surfaceEnding === null || readingEnding === null) {
    return null;
  }
  return {
    surface: surfaceStem,
    dictionaryForm: `${surfaceStem.slice(0, -surfaceEnding.source.length)}${surfaceEnding.target}`,
    reading: readingStem,
    dictionaryFormReading: `${readingStem.slice(0, -readingEnding.source.length)}${readingEnding.target}`,
    conjugationType: surfaceEnding.conjugationType
  };
}

function godanMizenEndingToDictionaryEnding(char: string | undefined): {
  readonly source: string;
  readonly target: string;
  readonly conjugationType: string;
} | null {
  switch (char) {
    case "わ": return { source: "わ", target: "う", conjugationType: "五段-ワア行" };
    case "ワ": return { source: "ワ", target: "ウ", conjugationType: "五段-ワア行" };
    case "か": return { source: "か", target: "く", conjugationType: "五段-カ行" };
    case "カ": return { source: "カ", target: "ク", conjugationType: "五段-カ行" };
    case "が": return { source: "が", target: "ぐ", conjugationType: "五段-ガ行" };
    case "ガ": return { source: "ガ", target: "グ", conjugationType: "五段-ガ行" };
    case "さ": return { source: "さ", target: "す", conjugationType: "五段-サ行" };
    case "サ": return { source: "サ", target: "ス", conjugationType: "五段-サ行" };
    case "た": return { source: "た", target: "つ", conjugationType: "五段-タ行" };
    case "タ": return { source: "タ", target: "ツ", conjugationType: "五段-タ行" };
    case "な": return { source: "な", target: "ぬ", conjugationType: "五段-ナ行" };
    case "ナ": return { source: "ナ", target: "ヌ", conjugationType: "五段-ナ行" };
    case "ば": return { source: "ば", target: "ぶ", conjugationType: "五段-バ行" };
    case "バ": return { source: "バ", target: "ブ", conjugationType: "五段-バ行" };
    case "ま": return { source: "ま", target: "む", conjugationType: "五段-マ行" };
    case "マ": return { source: "マ", target: "ム", conjugationType: "五段-マ行" };
    case "ら": return { source: "ら", target: "る", conjugationType: "五段-ラ行" };
    case "ラ": return { source: "ラ", target: "ル", conjugationType: "五段-ラ行" };
    default: return null;
  }
}

function godanDictionaryFormToMizenStem(form: string | undefined): string | null {
  if (form === undefined || form.length === 0) {
    return null;
  }
  const ending = form.at(-1);
  let mizen: string;
  switch (ending) {
    case "う": mizen = "わ"; break;
    case "ウ": mizen = "ワ"; break;
    case "く": mizen = "か"; break;
    case "ク": mizen = "カ"; break;
    case "ぐ": mizen = "が"; break;
    case "グ": mizen = "ガ"; break;
    case "す": mizen = "さ"; break;
    case "ス": mizen = "サ"; break;
    case "つ": mizen = "た"; break;
    case "ツ": mizen = "タ"; break;
    case "ぬ": mizen = "な"; break;
    case "ヌ": mizen = "ナ"; break;
    case "ぶ": mizen = "ば"; break;
    case "ブ": mizen = "バ"; break;
    case "む": mizen = "ま"; break;
    case "ム": mizen = "マ"; break;
    case "る": mizen = "ら"; break;
    case "ル": mizen = "ラ"; break;
    default: return null;
  }
  return `${form.slice(0, -1)}${mizen}`;
}
