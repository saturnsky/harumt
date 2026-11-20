import type { Voice } from "../../types/render-plan.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import type { ClauseLayout } from "../clause-layout/final-layout.js";
import type { ProtoClauseLayout } from "../clause-layout/proto-layout.js";
import { lookupSetMatches, type LookupTables } from "../lookup-tables.js";
import { quoteStructuralRelationsForHost } from "../structural-relation/quote.js";
import { quoteStructuralRelationLooksBareNominalContent, quoteHostAllowsBareNominalContent } from "../structural-relation/quote-nominal-and-passive.js";
import type { QuoteStructuralRelation } from "../structural-relation/quote-payload.js";
import type { MatcherToken } from "../matchers.js";
import { isAdjNai } from "../matchers.js";
import { hardTerminalPunctuationSurfaceClassForToken } from "../head-tail/boundary/punctuation.js";
import { teMarkerOpensProhibitionPredicateAt } from "../head-tail/tail/postverb-tail-classifier.js";
import { TokenCursor } from "../token-cursor.js";
import {
  argumentNounLookupForms,
  getArgumentNounBeforeParticle,
  getReferentTokenBeforeParticle,
  nounArgumentModifierEvidence,
  PredicateArgumentView,
  tokenInSemanticCategories,
  type PredicateArgument
} from "./helpers.js";
import { enumerateClausePhrasesAfter } from "../clause-layout/phrase-enumeration.js";

import { isCaseParticleToken, isClosingBracketToken, isNominalizerParticleToken, isNominalLike, isNominalScopeParticleToken, isNominalUseBareNaAdjStem, isVerbRenyouPredicateToken, POS0, POS01, POS4, POS5A, isVolitionalSpeechActInflectionToken, 記号, 助詞, 助詞_終助詞, 助動詞_タ, 助動詞_ナイ, 助動詞_ヌ, 補助記号, 命令形_ } from "../../types/pos.js";
import { isCaseParticleNoToken, isGaNoConvertedSubjectParticle, type GaNoClauseSpan } from "./gano-conversion.js";
import { adverbialToCapableKeijoujiHost } from "./tari-adverbial-marker.js";
export type FrameJsonValue =
  | string
  | number
  | boolean
  | null
  | readonly FrameJsonValue[]
  | { readonly [key: string]: FrameJsonValue };

export type FrameJsonMap = { readonly [key: string]: FrameJsonValue };
export type FrameSlotsMap = { readonly [role: string]: ArgumentFiller };

export const SEMANTIC_FRAME_CATEGORIES = ["person", "animate", "place", "role", "time", "action_noun"] as const;

export const FRAME_CHAIN_CONDITION_KEYS = new Set([
  "benefactiveTail", "causative", "causativePassive", "dekiruReading",
  "nareruReading", "negative", "past", "polite", "requestTail", "voice"
]);

export const FRAME_LEXICAL_CONDITION_KEYS = new Set([
  "asSuruVerbAdjacent", "asSuruVerbClauseScoped", "bareNoun", "followingNounLookup", "modifiedHeadNounLookup", "nextContentLookup",
  "nextExtentPhrase", "nextNounLookup", "nextNounSurface", "nextPos", "nextSurface", "nextSurfaceSequence",
  "prevAttributiveContentSurface", "prevAttributiveIntervalVariant", "prevContentPos", "prevPos",
  "prevSurface", "prevCaseExists", "quoteContentHostKind", "reduplicated",
  "quoteContentPlainDaOnly", "quoteContentSlotKind", "quoteSlotKind",
  "temporal"
]);

export const FRAME_CLAUSE_CONDITION_KEYS = new Set([
  "clauseFinal", "clauseInitial", "governingNegative", "governingPast",
  "scopeNegative", "scopeProhibition", "sentenceModality"
]);

export const FRAME_CONDITIONAL_LEXICAL_CONDITION_KEYS = new Set([
  "prevNounLookup", "prevNounSurface", "prevParticleSurface"
]);

export const FRAME_FORBIDDEN_LEXICAL_CONDITION_KEYS = new Set([
  "nextCategory", "prevCaseCategory", "prevCaseNounLookup",
  "prevCaseNounSurface", "prevCategory"
]);

export const FRAME_AUTHORED_LEXICAL_CONDITION_KEYS = new Set([
  ...FRAME_LEXICAL_CONDITION_KEYS,
  ...FRAME_CONDITIONAL_LEXICAL_CONDITION_KEYS
]);

export const PARTICIPANT_CONDITION_PREVIOUS = "previous";
export const PARTICIPANT_CONDITION_NEXT = "next";
export const PARTICIPANT_CONDITION_SUBJECT = "subject";
export const FRAME_PARTICIPANT_CONDITION_POSITIONS = new Set([
  PARTICIPANT_CONDITION_PREVIOUS,
  PARTICIPANT_CONDITION_NEXT,
  PARTICIPANT_CONDITION_SUBJECT
]);
export const PARTICLE_POSITION_PREDICATE_ADJACENT = "predicate_adjacent";
export const FRAME_PARTICLE_POSITIONS = new Set([PARTICLE_POSITION_PREDICATE_ADJACENT]);
export const SLOT_BINDING_ARGUMENT = "argument";
export const SLOT_BINDING_ADNOMINAL_NO = "adnominal_no";
export const SLOT_BINDING_ADNOMINAL_HEAD = "adnominal_head";
export const FRAME_SLOT_BINDINGS = new Set([SLOT_BINDING_ARGUMENT, SLOT_BINDING_ADNOMINAL_NO, SLOT_BINDING_ADNOMINAL_HEAD]);

export function isAdnominalBindingSlot(slot: FrameSlotSpec): boolean {
  return slot.binding === SLOT_BINDING_ADNOMINAL_NO || slot.binding === SLOT_BINDING_ADNOMINAL_HEAD;
}
export const SLOT_TYPE_NOUN = "noun";
export const SLOT_TYPE_CLAUSE = "clause";
export const FRAME_SLOT_TYPES = new Set([SLOT_TYPE_NOUN, SLOT_TYPE_CLAUSE]);
export const FRAME_CLAUSE_SLOT_MARKERS: { readonly [role: string]: ReadonlySet<string> } = {
  wish_content: new Set(["と", "って"]),
  quoted_content: new Set(["と", "って"]),
  question_content: new Set(["かと", "かどうか"]),
  request_content: new Set(["と", "って"])
};
export const PREDICATE_ADJACENT_PARTICLE_SURFACES = new Set(["が", "を", "に", "へ", "で", "から", "まで", "と", "より"]);

export class FrameValidationError extends Error { }
export class UnknownLookupSet extends FrameValidationError { }

export class ArgumentFiller {
  constructor(
    readonly surfaceParticle: string,
    readonly frameParticle: string,
    readonly particleIdx: number,
    readonly headIdx: number,
    readonly surface: string,
    readonly dictionaryForm = "",
    readonly numericCounterHeadForm = "",
    readonly categories: readonly string[] = [],
    readonly borrowed = false,
    readonly nounModified: boolean | null = null,
    readonly voiceTransform: string | null = null,
    readonly slotType = SLOT_TYPE_NOUN,
    readonly markerIdx: number | null = null,
    readonly contentTokenStart: number | null = null,
    readonly contentTokenEnd: number | null = null,
    readonly hostIdx: number | null = null,
    readonly gaNoConverted = false,
    readonly nominalHead: boolean | null = null,
    readonly coordination: NominalCoordinationBinding | null = null
  ) { }
}

export type NominalCoordinationBinding = "undetermined";

export class FrameSlotSpec {
  constructor(
    readonly role: string,
    readonly particles: readonly string[],
    readonly required = true,
    readonly nounLookup: readonly (string | FrameJsonMap)[] = [],
    readonly categories: readonly string[] = [],
    readonly surfaces: readonly string[] = [],
    readonly particlePosition: string | null = null,
    readonly allowBorrowed = false,
    readonly binding: string | null = null,
    readonly slotType = SLOT_TYPE_NOUN,
    readonly markers: readonly string[] = [],
    readonly bare = false,
    readonly excludeCategories: readonly string[] = [],
    readonly absent = false
  ) { }
}

export class FrameParticipantConditionSpec {
  constructor(
    readonly position: string,
    readonly categories: readonly string[]
  ) { }
}

export class FrameSpec {
  constructor(
    readonly frameId: string,
    readonly slots: readonly FrameSlotSpec[],
    readonly chainConditions: FrameJsonMap | null = null,
    readonly lexicalConditions: FrameJsonMap | null = null,
    readonly clauseConditions: FrameJsonMap | null = null,
    readonly participantConditions: readonly FrameParticipantConditionSpec[] = [],
    readonly connectiveRole: readonly string[] = [],
    readonly connectivePreferences: FrameJsonMap | null = null,
    readonly minEvidence = 1,
    readonly defaultFrame = false
  ) { }
}

export class FrameMatch {
  constructor(
    readonly predicateIdx: number,
    readonly translationIdx: number,
    readonly frameId: string,
    readonly slots: FrameSlotsMap,
    readonly priorityGroup: number,
    readonly priorityInGroup = 0,
    readonly senseIndex: number | null = null,
    readonly tieBreakReason: readonly string[] = []
  ) { }
}

export class FrameArgumentView {
  constructor(
    readonly predicateIdx: number,
    readonly fillers: readonly ArgumentFiller[] = [],
    readonly positionFillers: readonly ArgumentFiller[] = [],
    readonly quoteRelations: readonly QuoteStructuralRelation[] = [],
    readonly voiceSupported = true,
    readonly unsupportedReason: string | null = null,
    readonly tokens: readonly RuntimeHaruToken[] = [],
    readonly lookups: LookupTables | null = null,
    readonly adjacencyAnchorIdx: number = predicateIdx
  ) { }
}

export class EvidenceScore {
  constructor(
    readonly chain = 0,
    readonly connective = 0,
    readonly participant = 0,
    readonly required = 0,
    readonly surface = 0,
    readonly lookup = 0,
    readonly category = 0,
    readonly position = 0,
    readonly lexical = 0,
    readonly nonBorrowed = 0,
    readonly total = 0,
    readonly clause = 0
  ) { }

  key(): readonly number[] {
    return [
      this.chain,
      this.connective,
      this.participant,
      this.required,
      this.surface,
      this.lookup,
      this.category,
      this.position,
      this.lexical,
      this.clause,
      this.nonBorrowed,
      this.total
    ];
  }

  reasons(): readonly string[] {
    const pairs: readonly (readonly [string, number])[] = [
      ["chain_evidence", this.chain],
      ["connective_evidence", this.connective],
      ["participant_evidence", this.participant],
      ["required_evidence", this.required],
      ["surface_evidence", this.surface],
      ["lookup_evidence", this.lookup],
      ["category_evidence", this.category],
      ["position_evidence", this.position],
      ["lexical_evidence", this.lexical],
      ["clause_evidence", this.clause],
      ["non_borrowed_evidence", this.nonBorrowed],
      ["total_evidence", this.total]
    ];
    return pairs.filter(([, value]) => value > 0).map(([name]) => name);
  }
}

export class FrameEvaluation {
  constructor(
    readonly frame: FrameSpec,
    readonly matched: boolean,
    readonly filledSlots: FrameSlotsMap,
    readonly unfilledRequiredSlots: readonly string[] = [],
    readonly rejectedReason: string | null = null,
    readonly slotEvidenceSkippedReason: string | null = null,
    readonly evidence: EvidenceScore = new EvidenceScore()
  ) { }
}

export class FrameEvidenceInput {
  constructor(
    readonly index: number,
    readonly translationIdx: number,
    readonly korean: string,
    readonly priorityGroup: number,
    readonly priorityInGroup: number,
    readonly senseIndex: number | null = null,
    readonly frameData: FrameJsonMap | null = null
  ) { }
}

export class FrameEvidenceCandidateResult {
  constructor(
    readonly candidate: FrameEvidenceInput,
    readonly evaluation: FrameEvaluation | null
  ) { }

  get frameId(): string | null {
    return this.evaluation?.frame.frameId ?? null;
  }

  get matched(): boolean {
    return this.evaluation?.matched ?? false;
  }

  get evidence(): EvidenceScore {
    if (this.evaluation === null || !this.evaluation.matched) {
      return new EvidenceScore();
    }
    return this.evaluation.evidence;
  }
}

export class FrameEvidenceSelection {
  constructor(
    readonly selected: FrameEvidenceCandidateResult,
    readonly candidates: readonly FrameEvidenceCandidateResult[],
    readonly tieBreakReason: readonly string[] = []
  ) { }
}

export class ConditionEvidenceResult {
  constructor(
    readonly matched: boolean,
    readonly rejectedReason: string | null = null
  ) { }
}

export type LookupResolver = (name: string) => ReadonlySet<string>;
export type ConditionEvidenceEvaluator = (
  candidate: FrameEvidenceInput,
  kind: string,
  conditions: FrameJsonMap
) => ConditionEvidenceResult;

export type PredicateGrammarForClause = {
  readonly negative?: boolean | null;
  readonly past?: boolean | null;
  readonly requestTail?: boolean | null;
};

export type PredicateGrammarLookup = (predicateIdx: number) => PredicateGrammarForClause | null;

export function hasFrameSourceConditions(value: FrameJsonValue): boolean {
  if (!isFrameJsonMap(value) || isAdnominalDeclarationOnlyFrameJson(value)) {
    return false;
  }
  return ["slots", "chainConditions", "lexicalConditions", "clauseConditions", "participantConditions", "connectiveRole"].some((key) => key in value);
}

export function isAdnominalDeclarationOnlyFrameJson(value: FrameJsonValue | undefined): boolean {
  if (value === undefined || !isFrameJsonMap(value) || value.default !== true) {
    return false;
  }
  if (["chainConditions", "lexicalConditions", "clauseConditions", "participantConditions", "connectiveRole"].some((key) => key in value)) {
    return false;
  }
  const slots = value.slots;
  return Array.isArray(slots) && slots.length > 0 && slots.every((slot) =>
    isFrameJsonMap(slot) && (slot.binding === SLOT_BINDING_ADNOMINAL_NO || slot.binding === SLOT_BINDING_ADNOMINAL_HEAD)
  );
}

export function normalizeTranslationPriorityGroups(senses: readonly FrameJsonValue[]): readonly (readonly FrameJsonValue[])[] {
  if (senses.length === 0) {
    return [];
  }
  if (senses.every(isFrameJsonMap)) {
    return senses.map((item) => [item]);
  }
  if (senses.every(Array.isArray)) {
    const groups: FrameJsonValue[][] = [];
    for (const item of senses) {
      if (!Array.isArray(item) || item.length === 0) {
        throw new FrameValidationError("empty translation priority group");
      }
      if (!item.every(isFrameJsonMap)) {
        throw new FrameValidationError("translation priority groups must contain mappings");
      }
      groups.push(item);
    }
    return groups;
  }
  throw new FrameValidationError("senses must be either 1D or 2D");
}

export function frameSpecFromDict(data: FrameJsonMap): FrameSpec {
  const frameIdValue = data.id ?? data.frameId;
  if (typeof frameIdValue !== "string" || frameIdValue.length === 0) {
    throw new FrameValidationError("frame requires non-empty id");
  }
  const rawSlots = data.slots;
  let slots: readonly FrameSlotSpec[] = [];
  if (rawSlots !== undefined && rawSlots !== null) {
    if (!Array.isArray(rawSlots)) {
      throw new FrameValidationError("frame requires slots array");
    }
    slots = rawSlots.map(slotSpecFromDict);
  }
  if (slots.filter((slot) => slot.slotType === SLOT_TYPE_CLAUSE).length > 1) {
    throw new FrameValidationError("frame allows at most one clause slot");
  }
  const chainConditions = conditionMapping(data.chainConditions, "chain_conditions");
  const lexicalConditions = conditionMapping(data.lexicalConditions, "lexical_conditions");
  const clauseConditions = conditionMapping(data.clauseConditions, "clause_conditions");
  const participantConditions = participantConditionsTuple(data.participantConditions);
  const connectiveRole = stringTuple(data.connectiveRole);
  const connectivePreferences = conditionMapping(data.connectivePreferences ?? data.connective_preferences, "connective_preferences");
  const minEvidence = data.minEvidence ?? 1;
  if (typeof minEvidence !== "number" || !Number.isInteger(minEvidence) || minEvidence < 0) {
    throw new FrameValidationError("frame min_evidence must be a non-negative integer");
  }
  const defaultFrame = data.default === true;
  if (!defaultFrame && slots.length === 0 && chainConditions === null && lexicalConditions === null && clauseConditions === null && participantConditions.length === 0 && connectiveRole.length === 0) {
    throw new FrameValidationError("non-default frame requires slots or source-side conditions");
  }
  return new FrameSpec(
    frameIdValue,
    slots,
    chainConditions,
    lexicalConditions,
    clauseConditions,
    participantConditions,
    connectiveRole,
    connectivePreferences,
    minEvidence,
    defaultFrame
  );
}

export function voiceValue(voice: Voice | string | null): string {
  return voice ?? "active";
}

export function buildFrameArgumentView(
  tokens: readonly RuntimeHaruToken[],
  predicateIdx: number,
  options: {
    readonly lookups: LookupTables;
    readonly layout?: ClauseLayout | null;
    readonly protoLayout?: ProtoClauseLayout | null;
    readonly connectiveRoles?: ReadonlyMap<number, string> | null;
    readonly includeBorrowed?: boolean;
    readonly voice?: Voice | string | null;
  }
): FrameArgumentView {
  const lookups = options.lookups;
  const layout = options.layout ?? null;
  const value = voiceValue(options.voice ?? null);
  const adjacencyAnchorIdx = options.layout?.compoundLeadingEdge(predicateIdx) ?? predicateIdx;
  const positionFillers = predicateAdjacentPositionFillers(tokens, adjacencyAnchorIdx, lookups, layout);
  const quoteRelations = layout !== null
    ? layout.quoteRelationsOfHost(predicateIdx)
    : quoteStructuralRelationsForHost(new TokenCursor(tokens, predicateIdx, tokens.length), lookups);
  if (value !== "active") {
    return new FrameArgumentView(
      predicateIdx,
      [],
      positionFillers,
      quoteRelations,
      false,
      "voice_unsupported",
      tokens,
      lookups,
      adjacencyAnchorIdx
    );
  }
  const rawArguments = new PredicateArgumentView(tokens, predicateIdx, {
    lookups,
    layout: options.layout ?? null,
    protoLayout: options.protoLayout ?? null,
    connectiveRoles: options.connectiveRoles ?? null
  }).arguments({ includeBorrowed: options.includeBorrowed ?? false });
  const predicateClause = layout?.clauseOfPredicate(predicateIdx)
    ?? options.protoLayout?.clauseContaining(predicateIdx)
    ?? null;
  const coordination = nominalCoordinationBindingsOf(tokens, rawArguments, layout, lookups);
  const rawFillers = rawArguments.map((argument) =>
    argumentToFiller(tokens, argument, lookups, layout, predicateIdx, predicateClause, coordination.get(argument.particleIdx) ?? null));
  const rawParticleIndices = new Set(rawFillers.map((filler) => filler.particleIdx));
  const quotePrefixFillers = quoteHostPrefixArgumentFillers(tokens, layout, predicateIdx, lookups)
    .filter((filler) => !rawParticleIndices.has(filler.particleIdx));
  for (const filler of quotePrefixFillers) {
    rawParticleIndices.add(filler.particleIdx);
  }
  const quotePeripheralFillers = quoteHostPeripheralArgumentFillers(tokens, quoteRelations, lookups, layout)
    .filter((filler) => !rawParticleIndices.has(filler.particleIdx));
  return new FrameArgumentView(
    predicateIdx,
    [...rawFillers, ...quotePrefixFillers, ...quotePeripheralFillers],
    positionFillers,
    quoteRelations,
    true,
    null,
    tokens,
    lookups,
    adjacencyAnchorIdx
  );
}

export function matchFrame(
  frame: FrameSpec,
  argumentView: FrameArgumentView,
  options: {
    readonly candidate?: FrameEvidenceInput | null;
    readonly conditionEvaluator?: ConditionEvidenceEvaluator | null;
    readonly predicateIdx: number;
    readonly translationIdx?: number;
    readonly priorityGroup?: number;
    readonly priorityInGroup?: number;
    readonly senseIndex?: number | null;
    readonly lookupResolver: LookupResolver;
  }
): readonly [FrameMatch | null, FrameEvaluation] {
  const filledSlots: { [role: string]: ArgumentFiller } = {};
  const unfilledRequired: string[] = [];
  let score = new EvidenceScore();
  const [conditionScore, conditionReason] = conditionEvidenceScore(frame, options.candidate ?? null, options.conditionEvaluator ?? null);
  if (conditionReason !== null) {
    return [
      null,
      new FrameEvaluation(frame, false, {}, [], conditionReason, null, conditionScore)
    ];
  }
  score = addScore(score, conditionScore);

  let slotSkippedReason: string | null = null;
  if (!argumentView.voiceSupported && frame.slots.length > 0) {
    const unsupportedVoiceReason = argumentView.unsupportedReason ?? "voice_unsupported";
    for (const slot of frame.slots) {
      if (slot.slotType === SLOT_TYPE_CLAUSE) {
        const relation = matchingStructuralRelation(slot, argumentView);
        if (relation === null) {
          if (slot.required) {
            unfilledRequired.push(slot.role);
          }
          continue;
        }
        filledSlots[slot.role] = structuralRelationToFiller(relation, slot.role);
        score = addScore(score, clauseSlotEvidenceScore());
        continue;
      }
      if (isAdnominalBindingSlot(slot)) {
        if (slot.required) {
          unfilledRequired.push(slot.role);
        }
        continue;
      }
      if (slot.particlePosition === null || slot.absent) {
        slotSkippedReason = unsupportedVoiceReason;
        continue;
      }
      slotSkippedReason = unsupportedVoiceReason;
      const matching = argumentView.positionFillers.filter((filler) =>
        filler.nominalHead !== false &&
        slot.particles.includes(filler.frameParticle) &&
        slotPositionMatches(slot, filler, argumentView.adjacencyAnchorIdx)
      );
      if (matching.length === 0) {
        if (slot.required) {
          return [
            null,
            new FrameEvaluation(frame, false, filledSlots, unfilledRequired, `slot_position_mismatch:${slot.role}`, slotSkippedReason, score)
          ];
        }
        continue;
      }
      score = addScore(score, slotPositionOnlyEvidenceScore(slot));
    }
  } else if (argumentView.voiceSupported) {
    for (const slot of frame.slots) {
      if (slot.slotType === SLOT_TYPE_CLAUSE) {
        const relation = matchingStructuralRelation(slot, argumentView);
        if (relation === null) {
          if (slot.required) {
            unfilledRequired.push(slot.role);
          }
          continue;
        }
        filledSlots[slot.role] = structuralRelationToFiller(relation, slot.role);
        score = addScore(score, clauseSlotEvidenceScore());
        continue;
      }
      if (isAdnominalBindingSlot(slot)) {
        if (slot.required) {
          unfilledRequired.push(slot.role);
        }
        continue;
      }
      const slotFillers = argumentView.fillers.filter((filler) =>
        filler.nominalHead !== false &&
        slotAcceptsFillerParticle(slot, filler) &&
        (slot.allowBorrowed || !filler.borrowed)
      );
      if (slot.absent) {
        const present = slotFillers.some((filler) =>
          slotPositionMatches(slot, filler, argumentView.adjacencyAnchorIdx) &&
          slotConstraintsMatch(frame, slot, filler, options.lookupResolver)
        );
        if (present) {
          return [
            null,
            new FrameEvaluation(frame, false, filledSlots, unfilledRequired, `absent_slot_present:${slot.role}`, null, score)
          ];
        }
        continue;
      }
      if (slotFillers.length === 0) {
        if (slot.required) {
          unfilledRequired.push(slot.role);
        }
        continue;
      }
      const matching = slotFillers.filter((filler) =>
        slotPositionMatches(slot, filler, argumentView.adjacencyAnchorIdx) &&
        slotConstraintsMatch(frame, slot, filler, options.lookupResolver)
      );
      if (matching.length === 0) {
        if (slot.required) {
          return [
            null,
            new FrameEvaluation(frame, false, filledSlots, unfilledRequired, `slot_mismatch:${slot.role}`, null, score)
          ];
        }
        continue;
      }
      const filler = chooseSlotFiller(matching);
      filledSlots[slot.role] = filler;
      score = addScore(score, slotEvidenceScore(slot, filler));
    }
  }

  if (unfilledRequired.length > 0 && !frame.defaultFrame) {
    return [
      null,
      new FrameEvaluation(frame, false, filledSlots, unfilledRequired, `missing_required_slot:${unfilledRequired[0]}`, slotSkippedReason, score)
    ];
  }
  if (!frame.defaultFrame && score.total < frame.minEvidence) {
    return [
      null,
      new FrameEvaluation(frame, false, filledSlots, unfilledRequired, "insufficient_evidence", slotSkippedReason, score)
    ];
  }
  const match = new FrameMatch(
    options.predicateIdx,
    options.translationIdx ?? 0,
    frame.frameId,
    filledSlots,
    options.priorityGroup ?? 0,
    options.priorityInGroup ?? 0,
    options.senseIndex ?? null,
    score.reasons()
  );
  return [
    match,
    new FrameEvaluation(frame, true, filledSlots, unfilledRequired, null, slotSkippedReason, score)
  ];
}

export function selectFrameMatch(
  frames: readonly FrameSpec[],
  argumentView: FrameArgumentView,
  options: {
    readonly candidate?: FrameEvidenceInput | null;
    readonly predicateIdx: number;
    readonly translationIdx?: number;
    readonly priorityGroup?: number;
    readonly priorityInGroup?: number;
    readonly senseIndex?: number | null;
    readonly lookupResolver: LookupResolver;
    readonly conditionEvaluator?: ConditionEvidenceEvaluator | null;
  }
): readonly [FrameMatch | null, readonly FrameEvaluation[]] {
  const evaluations: FrameEvaluation[] = [];
  const matched: Array<readonly [readonly number[], number, FrameMatch]> = [];
  for (const [order, frame] of frames.entries()) {
    const [match, evaluation] = matchFrame(frame, argumentView, {
      candidate: options.candidate ?? null,
      predicateIdx: options.predicateIdx,
      translationIdx: options.translationIdx ?? 0,
      priorityGroup: options.priorityGroup ?? 0,
      priorityInGroup: options.priorityInGroup ?? 0,
      senseIndex: options.senseIndex ?? null,
      lookupResolver: options.lookupResolver,
      conditionEvaluator: options.conditionEvaluator ?? null
    });
    evaluations.push(evaluation);
    if (match !== null) {
      matched.push([evaluation.evidence.key(), order, match]);
    }
  }
  if (matched.length === 0) {
    return [null, evaluations];
  }
  matched.sort((left, right) => compareFrameMatchTuple(right, left));
  const [bestKey, , best] = matched[0]!;
  const reasons = [...best.tieBreakReason];
  if (matched.slice(1).some(([key]) => arrayEquals(key, bestKey))) {
    reasons.push("declaration_order");
  }
  if (arrayEquals(reasons, best.tieBreakReason)) {
    return [best, evaluations];
  }
  return [
    new FrameMatch(
      best.predicateIdx,
      best.translationIdx,
      best.frameId,
      best.slots,
      best.priorityGroup,
      best.priorityInGroup,
      best.senseIndex,
      reasons.length === 0 ? ["declaration_order"] : reasons
    ),
    evaluations
  ];
}

export function selectFrameEvidenceCandidate(
  candidates: readonly FrameEvidenceInput[],
  argumentView: FrameArgumentView,
  options: {
    readonly predicateIdx: number;
    readonly lookupResolver: LookupResolver;
    readonly conditionEvaluator?: ConditionEvidenceEvaluator | null;
  }
): FrameEvidenceSelection | null {
  if (candidates.length <= 1) {
    return null;
  }
  const evaluated = candidates.map((candidate) =>
    new FrameEvidenceCandidateResult(
      candidate,
      evaluateFrameEvidenceInput(candidate, argumentView, {
        predicateIdx: options.predicateIdx,
        lookupResolver: options.lookupResolver,
        conditionEvaluator: options.conditionEvaluator ?? null
      })
    )
  );
  if (!evaluated.some((result) => result.matched)) {
    return null;
  }
  const selected = [...evaluated].sort((left, right) =>
    compareEvidenceCandidate(right, left)
  )[0]!;
  return new FrameEvidenceSelection(
    selected,
    evaluated,
    frameEvidenceTieBreakReason(evaluated, selected)
  );
}

export function frameEvidenceSelectionTraceDetail(
  selection: FrameEvidenceSelection,
  options: { readonly clauseIdx?: number | null } = {}
): { [key: string]: FrameTraceValue } {
  const selected = selection.selected;
  const selectedDetail = frameEvidenceCandidateTraceDetail(selected);
  selectedDetail.tie_break_reason = selection.tieBreakReason;
  return {
    owner: "semantic_frame",
    evidence: "frame_condition",
    classification: "required",
    effect: "reorder",
    selected: selected.candidate.korean,
    selected_frame_id: selected.frameId,
    selected_translation_idx: selected.candidate.translationIdx,
    selected_priority_group: selected.candidate.priorityGroup,
    selected_priority_in_group: selected.candidate.priorityInGroup,
    selected_sense_index: selected.candidate.senseIndex,
    selected_detail: selectedDetail,
    candidates: selection.candidates.map(frameEvidenceCandidateTraceDetail),
    ...(options.clauseIdx === undefined || options.clauseIdx === null ? {} : { clause_idx: options.clauseIdx })
  };
}

export type FrameTraceValue =
  | string
  | number
  | boolean
  | null
  | readonly FrameTraceValue[]
  | { readonly [key: string]: FrameTraceValue };

export function frameEvidenceCandidateTraceDetail(result: FrameEvidenceCandidateResult): { [key: string]: FrameTraceValue } {
  const candidate = result.candidate;
  const detail: { [key: string]: FrameTraceValue } = {
    translation_idx: candidate.translationIdx,
    korean: candidate.korean,
    priority_group: candidate.priorityGroup,
    priority_in_group: candidate.priorityInGroup,
    matched: result.matched,
    frame_id: result.frameId,
    evidence_categories: result.evidence.reasons(),
    evidence_key: result.evidence.key()
  };
  if (candidate.senseIndex !== null) {
    detail.sense_index = candidate.senseIndex;
  }
  if (result.evaluation !== null && !result.evaluation.matched) {
    detail.reason = result.evaluation.rejectedReason;
  }
  if (result.evaluation?.slotEvidenceSkippedReason !== undefined && result.evaluation.slotEvidenceSkippedReason !== null) {
    detail.slot_evidence_skipped_reason = result.evaluation.slotEvidenceSkippedReason;
  }
  if (result.evaluation !== null) {
    detail.slots = Object.fromEntries(
      Object.entries(result.evaluation.filledSlots)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([role, filler]) => [role, fillerTraceDetail(filler)])
    );
  }
  return detail;
}

export function frameMatchTraceDetail(match: FrameMatch): { [key: string]: FrameTraceValue } {
  const evidenceCategories = match.tieBreakReason.filter((reason) => reason !== "declaration_order");
  const tieBreakReason = match.tieBreakReason.filter((reason) => reason === "declaration_order");
  return {
    frame_id: match.frameId,
    translation_idx: match.translationIdx,
    priority_group: match.priorityGroup,
    priority_in_group: match.priorityInGroup,
    slots: Object.fromEntries(
      Object.entries(match.slots)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([role, filler]) => [role, fillerTraceDetail(filler)])
    ),
    evidence_categories: evidenceCategories,
    tie_break_reason: tieBreakReason,
    ...(match.senseIndex === null ? {} : { sense_index: match.senseIndex })
  };
}

export function frameSkipTraceDetail(options: {
  readonly frameId: string;
  readonly reason: string;
  readonly priorityGroup?: number;
  readonly priorityInGroup?: number;
  readonly senseIndex?: number | null;
  readonly translationIdx?: number;
}): { [key: string]: FrameTraceValue } {
  return {
    frame_id: options.frameId,
    translation_idx: options.translationIdx ?? 0,
    priority_group: options.priorityGroup ?? 0,
    priority_in_group: options.priorityInGroup ?? 0,
    reason: options.reason,
    ...(options.senseIndex === undefined || options.senseIndex === null ? {} : { sense_index: options.senseIndex })
  };
}

export function namedLookupResolver(name: string, lookups: LookupTables): ReadonlySet<string> {
  const resolved = lookups.named(name);
  if (resolved === undefined) {
    throw new Error(name);
  }
  return resolved;
}

export function evaluateClauseConditions(
  tokens: readonly RuntimeHaruToken[],
  tokenIdx: number,
  layout: ClauseLayout,
  getPredicateGrammar: PredicateGrammarLookup | null,
  conditions: FrameJsonMap
): ConditionEvidenceResult {
  const clause = layout.clauseOfToken(tokenIdx);
  if (clause === undefined) {
    return new ConditionEvidenceResult(false, "clause_missing");
  }
  for (const [key, expected] of Object.entries(conditions)) {
    switch (key) {
      case "clauseFinal": {
        const actual = clauseContentEdgeIndex(tokens, clause, "last") === tokenIdx;
        if (!matchesBooleanCondition(expected, actual)) {
          return new ConditionEvidenceResult(false, "clause_final_mismatch");
        }
        break;
      }
      case "clauseInitial": {
        const actual = clauseContentEdgeIndex(tokens, clause, "first") === tokenIdx &&
          noPriorClauseConditionContentInSentence(tokens, clause.start);
        if (!matchesBooleanCondition(expected, actual)) {
          return new ConditionEvidenceResult(false, "clause_initial_mismatch");
        }
        break;
      }
      case "governingNegative": {
        const grammar = governingPredicateGrammar(tokens, tokenIdx, layout, getPredicateGrammar);
        if (!matchesNullableBooleanCondition(expected, grammar?.negative ?? null)) {
          return new ConditionEvidenceResult(false, "governing_negative_mismatch");
        }
        break;
      }
      case "scopeNegative": {
        const grammar = scopePredicateGrammar(tokens, tokenIdx, layout, getPredicateGrammar);
        if (!matchesNullableBooleanCondition(expected, grammar?.negative ?? null)) {
          return new ConditionEvidenceResult(false, "scope_negative_mismatch");
        }
        break;
      }
      case "scopeProhibition": {
        if (!matchesBooleanCondition(expected, scopeHasProhibitionPredicate(tokens, tokenIdx, layout))) {
          return new ConditionEvidenceResult(false, "scope_prohibition_mismatch");
        }
        break;
      }
      case "governingPast": {
        const grammar = governingPredicateGrammar(tokens, tokenIdx, layout, getPredicateGrammar);
        if (!matchesNullableBooleanCondition(expected, grammar?.past ?? null)) {
          return new ConditionEvidenceResult(false, "governing_past_mismatch");
        }
        break;
      }
      case "sentenceModality": {
        const tags = sentenceModalityTags(tokens, tokenIdx, layout, getPredicateGrammar);
        const expectedTags = stringList(expected, "sentence_modality");
        if (expectedTags.length === 0 || !expectedTags.some((tag) => tags.has(tag))) {
          return new ConditionEvidenceResult(false, "sentence_modality_mismatch");
        }
        break;
      }
      default:
        return new ConditionEvidenceResult(false, `unsupported_clause_condition:${key}`);
    }
  }
  return new ConditionEvidenceResult(true);
}


function evaluateFrameEvidenceInput(
  candidate: FrameEvidenceInput,
  argumentView: FrameArgumentView,
  options: {
    readonly predicateIdx: number;
    readonly lookupResolver: LookupResolver;
    readonly conditionEvaluator?: ConditionEvidenceEvaluator | null;
  }
): FrameEvaluation | null {
  if (candidate.frameData === null) {
    return null;
  }
  const frame = frameSpecFromDict(candidate.frameData);
  const [, evaluation] = matchFrame(frame, argumentView, {
    candidate,
    conditionEvaluator: options.conditionEvaluator ?? null,
    predicateIdx: options.predicateIdx,
    translationIdx: candidate.translationIdx,
    priorityGroup: candidate.priorityGroup,
    priorityInGroup: candidate.priorityInGroup,
    senseIndex: candidate.senseIndex,
    lookupResolver: options.lookupResolver
  });
  return evaluation;
}

function frameEvidenceTieBreakReason(
  candidates: readonly FrameEvidenceCandidateResult[],
  selected: FrameEvidenceCandidateResult
): readonly string[] {
  const selectedKey = selected.evidence.key();
  return candidates.some((candidate) => candidate !== selected && arrayEquals(candidate.evidence.key(), selectedKey))
    ? ["declaration_order"]
    : [];
}

function compareEvidenceCandidate(left: FrameEvidenceCandidateResult, right: FrameEvidenceCandidateResult): number {
  const leftKey = left.evidence.key();
  const rightKey = right.evidence.key();
  for (let idx = 0; idx < Math.max(leftKey.length, rightKey.length); idx += 1) {
    const diff = (leftKey[idx] ?? 0) - (rightKey[idx] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }
  return right.candidate.priorityInGroup - left.candidate.priorityInGroup;
}

function matchingStructuralRelation(slot: FrameSlotSpec, argumentView: FrameArgumentView): QuoteStructuralRelation | null {
  return argumentView.quoteRelations.find((relation) =>
    structuralRelationFillsClauseRole(relation, slot.role) &&
    slot.markers.includes(structuralRelationFrameMarker(relation, slot.role)) &&
    !structuralRelationBlockedByBareNominalPolicy(relation, argumentView)
  ) ?? null;
}

function structuralRelationFillsClauseRole(relation: QuoteStructuralRelation, role: string): boolean {
  return relation.quote.slotKind === role ||
    (role === "question_content" && relation.quote.contentForce === "question");
}

function structuralRelationToFiller(relation: QuoteStructuralRelation, role: string): ArgumentFiller {
  const marker = structuralRelationFrameMarker(relation, role);
  return new ArgumentFiller(
    marker,
    marker,
    relation.quote.markerIdx,
    relation.quote.contentSpan.start,
    role,
    role,
    "",
    [],
    false,
    null,
    null,
    SLOT_TYPE_CLAUSE,
    relation.quote.markerIdx,
    relation.quote.contentSpan.start,
    relation.quote.contentSpan.endExclusive,
    relation.quote.hostMatch.hostIdx
  );
}

function structuralRelationFrameMarker(relation: QuoteStructuralRelation, role: string): string {
  if (role !== "question_content") {
    return relation.quote.markerBaseSurface;
  }
  return relation.quote.markerBaseSurface === "かどうか" ? "かどうか" : "かと";
}

function structuralRelationBlockedByBareNominalPolicy(
  relation: QuoteStructuralRelation,
  argumentView: FrameArgumentView
): boolean {
  const lookups = argumentView.lookups;
  if (
    lookups === null ||
    relation.quote.slotKind !== "quoted_content" ||
    !quoteStructuralRelationLooksBareNominalContent(argumentView.tokens, relation)
  ) {
    return false;
  }
  return !quoteHostAllowsBareNominalContent(argumentView.tokens, relation, lookups);
}

function clauseSlotEvidenceScore(): EvidenceScore {
  return new EvidenceScore(0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 3, 1);
}

function argumentToFiller(tokens: readonly MatcherToken[], argument: {
  readonly particleIdx: number;
  readonly particle: MatcherToken;
  readonly referent: MatcherToken | null;
  readonly noun: MatcherToken | null;
  readonly borrowed: boolean;
}, lookups: LookupTables, layout: ClauseLayout | null, predicateIdx: number, clause: GaNoClauseSpan | null,
coordination: NominalCoordinationBinding | null): ArgumentFiller {
  const noun = argument.noun ?? argument.referent;
  const surface = noun?.surface ?? "";
  const dictionaryForm = noun?.dictionaryForm || surface;
  const particle = argument.particle.surface || "";
  const headIdx = findHeadIndex(tokens, argument.particleIdx, noun);
  const converted = gaNoConverted(tokens, argument, predicateIdx, clause, lookups);
  return new ArgumentFiller(
    particle,
    particle,
    argument.particleIdx,
    headIdx,
    surface,
    dictionaryForm,
    noun?.numericCounterHeadForm ?? "",
    semanticCategories(noun, lookups),
    argument.borrowed,
    noun === null ? null : nounArgumentModifierEvidence(tokens, headIdx, layout),
    null,
    SLOT_TYPE_NOUN,
    null,
    null,
    null,
    null,
    converted,
    hasNominalArgumentHead(argument.noun, argument.referent, argument.particle, tokens[argument.particleIdx - 1] ?? null),
    coordination
  );
}

function nominalCoordinationBindingsOf(
  tokens: readonly RuntimeHaruToken[],
  rawArguments: readonly PredicateArgument[],
  layout: ClauseLayout | null,
  lookups: LookupTables
): ReadonlyMap<number, NominalCoordinationBinding> {
  const bindings = new Map<number, NominalCoordinationBinding>();
  if (layout === null) {
    return bindings;
  }
  const coordinators = lookups.NOMINAL_COORDINATION_CASE_PARTICLES;
  const ownByParticle = new Map(rawArguments.filter((argument) => !argument.borrowed).map((argument) => [argument.particleIdx, argument]));
  for (const argument of ownByParticle.values()) {
    if (!isCaseParticleToken(argument.particle) || !coordinators.has(argument.particle.surface)) {
      continue;
    }
    const next = enumerateClausePhrasesAfter(layout, tokens, argument.particleIdx, { scope: "clause" }).next();
    const item = next.done === true ? undefined : next.value;
    if (
      item === undefined ||
      item.kind !== "nominal" ||
      item.crossedWeakBoundary ||
      item.span.start !== argument.particleIdx + 1 ||
      item.markerParticleIdx === null
    ) {
      continue;
    }
    if (!ownByParticle.has(item.markerParticleIdx)) {
      continue;
    }
    bindings.set(argument.particleIdx, "undetermined");
  }
  return bindings;
}

function gaNoConverted(
  tokens: readonly MatcherToken[],
  argument: { readonly particleIdx: number; readonly borrowed: boolean },
  predicateIdx: number,
  clause: GaNoClauseSpan | null,
  lookups: LookupTables
): boolean {
  return !argument.borrowed &&
    isCaseParticleNoToken(tokens[argument.particleIdx]) &&
    isGaNoConvertedSubjectParticle(tokens, argument.particleIdx, predicateIdx, { clause, lookups });
}

function quoteHostPrefixArgumentFillers(
  tokens: readonly MatcherToken[],
  layout: ClauseLayout | null,
  predicateIdx: number,
  lookups: LookupTables
): readonly ArgumentFiller[] {
  if (layout === null) {
    return [];
  }
  return layout.quoteHostPrefixParticlesOf(predicateIdx).flatMap((particleIdx) => {
    const particle = tokens[particleIdx];
    if (particle === undefined || (particle.pos & POS0) !== 助詞) {
      return [];
    }
    const nominal = getArgumentNounBeforeParticle(tokens, particleIdx, lookups);
    const noun = nominal ?? getReferentTokenBeforeParticle(tokens, particleIdx, lookups);
    if (noun === null) {
      return [];
    }
    const headIdx = findHeadIndex(tokens, particleIdx, noun);
    return [nounArgumentFiller(particle.surface, particleIdx, headIdx, noun, hasNominalArgumentHead(nominal, noun, particle, tokens[particleIdx - 1] ?? null), lookups, nounArgumentModifierEvidence(tokens, headIdx, layout))];
  });
}

function quoteHostPeripheralArgumentFillers(
  tokens: readonly MatcherToken[],
  relations: readonly QuoteStructuralRelation[],
  lookups: LookupTables,
  layout: ClauseLayout | null
): readonly ArgumentFiller[] {
  const fillers: ArgumentFiller[] = [];
  const seen = new Set<number>();
  for (const relation of relations) {
    for (let index = relation.quote.contentSpan.start - 1; index >= 0; index -= 1) {
      const token = tokens[index];
      if (token === undefined) {
        continue;
      }
      const tp0 = token.pos & POS0;
      if (tp0 === 補助記号 || tp0 === 記号) {
        break;
      }
      if (tp0 !== 助詞 || !PREDICATE_ADJACENT_PARTICLE_SURFACES.has(token.surface) || seen.has(index)) {
        continue;
      }
      const nominal = getArgumentNounBeforeParticle(tokens, index, lookups);
      const noun = nominal ?? getReferentTokenBeforeParticle(tokens, index, lookups);
      if (noun === null) {
        continue;
      }
      seen.add(index);
      const headIdx = findHeadIndex(tokens, index, noun);
      fillers.push(nounArgumentFiller(token.surface, index, headIdx, noun, hasNominalArgumentHead(nominal, noun, token, tokens[index - 1] ?? null), lookups, nounArgumentModifierEvidence(tokens, headIdx, layout)));
    }
  }
  return fillers;
}

function predicateAdjacentPositionFillers(tokens: readonly MatcherToken[], predicateIdx: number, lookups: LookupTables, layout: ClauseLayout | null): readonly ArgumentFiller[] {
  const particleIdx = predicateIdx - 1;
  if (particleIdx < 0 || particleIdx >= tokens.length) {
    return [];
  }
  const particle = tokens[particleIdx];
  if (particle === undefined || (particle.pos & POS0) !== 助詞) {
    return [];
  }
  const nominal = getArgumentNounBeforeParticle(tokens, particleIdx, lookups);
  const noun = nominal ?? getReferentTokenBeforeParticle(tokens, particleIdx, lookups);
  const surface = noun?.surface ?? "";
  const dictionaryForm = noun?.dictionaryForm || surface;
  const particleSurface = particle.surface || "";
  const headIdx = findHeadIndex(tokens, particleIdx, noun);
  return [
    new ArgumentFiller(
      particleSurface,
      particleSurface,
      particleIdx,
      headIdx,
      surface,
      dictionaryForm,
      noun?.numericCounterHeadForm ?? "",
      semanticCategories(noun, lookups),
      false,
      noun === null ? null : nounArgumentModifierEvidence(tokens, headIdx, layout),
      null,
      SLOT_TYPE_NOUN,
      null,
      null,
      null,
      null,
      false,
      hasNominalArgumentHead(nominal, noun, particle, tokens[particleIdx - 1] ?? null)
    )
  ];
}

function hasNominalArgumentHead(
  nominal: MatcherToken | null,
  referent: MatcherToken | null,
  particle: MatcherToken,
  beforeParticle: MatcherToken | null
): boolean {
  if (nominal !== null) {
    return true;
  }
  const keijoujiNominalUse = referent !== null && isNominalUseBareNaAdjStem(referent) &&
    !(particle.surface === "と" && adverbialToCapableKeijoujiHost(referent));
  if (
    referent !== null &&
    (isNominalLike(referent) || keijoujiNominalUse || referent === beforeParticle && isVerbRenyouPredicateToken(referent))
  ) {
    return true;
  }
  return beforeParticle !== null &&
    (isNominalScopeParticleToken(beforeParticle) || isNominalizerParticleToken(beforeParticle) || isClosingBracketToken(beforeParticle));
}

function nounArgumentFiller(
  particleSurface: string,
  particleIdx: number,
  headIdx: number,
  noun: MatcherToken,
  nominalHead: boolean,
  lookups: LookupTables,
  nounModified: boolean | null
): ArgumentFiller {
  return new ArgumentFiller(
    particleSurface,
    particleSurface,
    particleIdx,
    headIdx,
    noun.surface,
    noun.dictionaryForm || noun.surface,
    noun.numericCounterHeadForm ?? "",
    semanticCategories(noun, lookups),
    false,
    nounModified,
    null,
    SLOT_TYPE_NOUN,
    null,
    null,
    null,
    null,
    false,
    nominalHead
  );
}

function findHeadIndex(tokens: readonly MatcherToken[], particleIdx: number, noun: MatcherToken | null): number {
  if (noun === null) {
    return -1;
  }
  if (particleIdx >= 0 && particleIdx < tokens.length && tokens[particleIdx] === noun) {
    return particleIdx;
  }
  const start = Math.min(particleIdx - 1, tokens.length - 1);
  for (let idx = start; idx >= 0; idx -= 1) {
    const token = tokens[idx];
    if (token === noun || (token !== undefined && sameTokenIdentity(token, noun))) {
      return idx;
    }
  }
  return tokens.findIndex((token) => token === noun);
}

function sameTokenIdentity(left: MatcherToken, right: MatcherToken): boolean {
  return left.surface === right.surface &&
    left.dictionaryForm === right.dictionaryForm &&
    left.pos === right.pos;
}

function semanticCategories(token: MatcherToken | null, lookups: LookupTables): readonly string[] {
  if (token === null) {
    return [];
  }
  return SEMANTIC_FRAME_CATEGORIES.filter((category) => tokenInSemanticCategories(token, [category], lookups));
}

function governingPredicateGrammar(
  tokens: readonly RuntimeHaruToken[],
  tokenIdx: number,
  layout: ClauseLayout,
  getPredicateGrammar: PredicateGrammarLookup | null
): PredicateGrammarForClause | null {
  const predicateIdx = layout.nextPredicateInClauseAfter(tokenIdx);
  if (predicateIdx === undefined) {
    return null;
  }
  const grammar = getPredicateGrammar?.(predicateIdx) ?? null;
  const raw = rawPredicateTailGrammar(tokens, predicateIdx, layout);
  return {
    negative: grammar?.negative === true || raw.negative === true
      ? true
      : grammar?.negative ?? raw.negative ?? null,
    past: grammar?.past === true || raw.past === true
      ? true
      : grammar?.past ?? raw.past ?? null,
    requestTail: grammar?.requestTail ?? null
  };
}

function npiLicensedByQuoteHostNegation(
  tokens: readonly RuntimeHaruToken[],
  tokenIdx: number,
  layout: ClauseLayout,
  getPredicateGrammar: PredicateGrammarLookup | null
): boolean {
  const quotedPredicateIdx = layout.nextPredicateInClauseAfter(tokenIdx);
  if (
    quotedPredicateIdx === undefined ||
    layout.speechActScopeOfPredicate(quotedPredicateIdx) !== "quoted_content"
  ) {
    return false;
  }
  const hostIdx = layout.quoteHostOfQuotedPredicate(quotedPredicateIdx);
  if (
    hostIdx === undefined ||
    hostIdx !== layout.nextPredicateInClauseAfter(quotedPredicateIdx) ||
    layout.speechActScopeOfPredicate(hostIdx) === "quoted_content"
  ) {
    return false;
  }
  if (predicateGrammarAt(tokens, quotedPredicateIdx, layout, getPredicateGrammar)?.negative === true) {
    return false;
  }
  return getPredicateGrammar?.(hostIdx)?.negative === true;
}

function scopePredicateGrammar(
  tokens: readonly RuntimeHaruToken[],
  tokenIdx: number,
  layout: ClauseLayout,
  getPredicateGrammar: PredicateGrammarLookup | null
): PredicateGrammarForClause | null {
  const governing = governingPredicateGrammar(tokens, tokenIdx, layout, getPredicateGrammar);
  const self = predicateGrammarAt(tokens, tokenIdx, layout, getPredicateGrammar);
  const npiLicensed = npiLicensedByQuoteHostNegation(tokens, tokenIdx, layout, getPredicateGrammar);
  if (governing === null || self === null) {
    const single = governing ?? self;
    if (single === null) {
      return npiLicensed ? { negative: true, past: null, requestTail: null } : null;
    }
    return npiLicensed && single.negative !== true ? { ...single, negative: true } : single;
  }
  const negative = governing.negative === true || self.negative === true
    ? true
    : governing.negative ?? self.negative ?? null;
  return {
    negative: negative === true
      ? true
      : npiLicensedByQuoteHostNegation(tokens, tokenIdx, layout, getPredicateGrammar)
        ? true
        : negative,
    past: governing.past === true || self.past === true
      ? true
      : governing.past ?? self.past ?? null,
    requestTail: governing.requestTail ?? self.requestTail ?? null
  };
}

function predicateGrammarAt(
  tokens: readonly RuntimeHaruToken[],
  predicateIdx: number,
  layout: ClauseLayout,
  getPredicateGrammar: PredicateGrammarLookup | null
): PredicateGrammarForClause | null {
  const grammar = getPredicateGrammar?.(predicateIdx) ?? null;
  const raw = rawPredicateTailGrammar(tokens, predicateIdx, layout);
  if (grammar === null && raw.negative === null && raw.past === null && raw.requestTail === null) {
    return null;
  }
  return {
    negative: grammar?.negative === true || raw.negative === true
      ? true
      : grammar?.negative ?? raw.negative ?? null,
    past: grammar?.past === true || raw.past === true
      ? true
      : grammar?.past ?? raw.past ?? null,
    requestTail: grammar?.requestTail ?? raw.requestTail ?? null
  };
}

function sentenceModalityTags(
  tokens: readonly RuntimeHaruToken[],
  tokenIdx: number,
  layout: ClauseLayout,
  getPredicateGrammar: PredicateGrammarLookup | null
): ReadonlySet<string> {
  const tags = new Set<string>();
  const terminal = terminalMarkerModality(tokens, tokenIdx, layout);
  if (terminal !== null) {
    tags.add(terminal);
  }
  const predicateIdx = layout.nextPredicateInClauseAfter(tokenIdx);
  if (predicateIdx !== undefined) {
    for (const token of predicateTailTokens(tokens, predicateIdx, layout)) {
      const pos5a = token.pos & POS5A;
      if (pos5a === 命令形_) {
        tags.add("imperative");
      }
      if (isVolitionalSpeechActInflectionToken(token)) {
        tags.add("hortative");
      }
    }
    const grammar = getPredicateGrammar?.(predicateIdx) ?? null;
    if (grammar?.requestTail === true) {
      tags.add("request");
    }
  }
  if (tags.size === 0) {
    tags.add("declarative");
  }
  return tags;
}

function rawPredicateTailGrammar(
  tokens: readonly RuntimeHaruToken[],
  predicateIdx: number,
  layout: ClauseLayout
): PredicateGrammarForClause {
  let negative: boolean | null = null;
  let past: boolean | null = null;
  for (const token of predicateTailTokens(tokens, predicateIdx, layout)) {
    if (
      (token.pos & POS4) === 助動詞_ナイ ||
      (token.pos & POS4) === 助動詞_ヌ ||
      isAdjNai(token)
    ) {
      negative = true;
    }
    if ((token.pos & POS4) === 助動詞_タ || token.dictionaryForm === "た" || token.surface === "た") {
      past = true;
    }
  }
  return { negative, past, requestTail: null };
}


function predicateTailTokens(
  tokens: readonly RuntimeHaruToken[],
  predicateIdx: number,
  layout: ClauseLayout
): readonly RuntimeHaruToken[] {
  return predicateTailIndices(tokens, predicateIdx, layout).map((idx) => tokens[idx]!);
}

function predicateTailIndices(
  tokens: readonly RuntimeHaruToken[],
  predicateIdx: number,
  layout: ClauseLayout
): readonly number[] {
  const clause = layout.clauseOfToken(predicateIdx);
  if (clause === undefined) {
    return tokens[predicateIdx] === undefined ? [] : [predicateIdx];
  }
  const end = predicateTailScopeEnd(predicateIdx, clause.end, layout);
  const result: number[] = [];
  for (let idx = predicateIdx; idx < end; idx += 1) {
    const token = tokens[idx];
    if (token === undefined) {
      continue;
    }
    const tp0 = token.pos & POS0;
    if (tp0 === 補助記号 || tp0 === 記号) {
      break;
    }
    result.push(idx);
  }
  return result;
}

function scopeHasProhibitionPredicate(
  tokens: readonly RuntimeHaruToken[],
  tokenIdx: number,
  layout: ClauseLayout
): boolean {
  const predicateIdx = layout.nextPredicateInClauseAfter(tokenIdx);
  return predicateIdx !== undefined &&
    predicateTailIndices(tokens, predicateIdx, layout).some((idx) => teMarkerOpensProhibitionPredicateAt(tokens, idx));
}

function predicateTailScopeEnd(
  predicateIdx: number,
  clauseEnd: number,
  layout: ClauseLayout
): number {
  const scope = layout.speechActScopeOfPredicate(predicateIdx);
  let next = layout.nextPredicateInClauseAfter(predicateIdx);
  while (next !== undefined && next < clauseEnd) {
    if (layout.speechActScopeOfPredicate(next) !== scope) {
      return next;
    }
    next = layout.nextPredicateInClauseAfter(next);
  }
  return clauseEnd;
}

function terminalMarkerModality(
  tokens: readonly RuntimeHaruToken[],
  tokenIdx: number,
  layout: ClauseLayout
): string | null {
  const clause = layout.clauseOfToken(tokenIdx);
  if (clause === undefined) {
    return null;
  }
  for (let idx = clause.end - 1; idx >= clause.start; idx -= 1) {
    const token = tokens[idx];
    if (token === undefined) {
      continue;
    }
    const tp0 = token.pos & POS0;
    if (tp0 === 補助記号 || tp0 === 記号) {
      const surfaceClass = hardTerminalPunctuationSurfaceClassForToken(token, idx, ["clause_layout"]);
      if (surfaceClass === "question") {
        return "interrogative";
      }
      if (surfaceClass === "exclamation") {
        return "exclamatory";
      }
      continue;
    }
    if (token.surface === "か" && (token.pos & POS01) === 助詞_終助詞) {
      return "interrogative";
    }
    return null;
  }
  return null;
}

function clauseContentEdgeIndex(
  tokens: readonly RuntimeHaruToken[],
  clause: NonNullable<ReturnType<ClauseLayout["clauseOfToken"]>>,
  edge: "first" | "last"
): number | null {
  if (edge === "first") {
    for (let idx = clause.start; idx < clause.end; idx += 1) {
      if (isClauseConditionContentToken(tokens[idx])) {
        return idx;
      }
    }
    return null;
  }
  for (let idx = clause.end - 1; idx >= clause.start; idx -= 1) {
    if (isClauseConditionContentToken(tokens[idx])) {
      return idx;
    }
  }
  return null;
}

function isClauseConditionContentToken(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  const tp0 = token.pos & POS0;
  if (tp0 === 補助記号 || tp0 === 記号) {
    return false;
  }
  return (token.pos & POS01) !== 助詞_終助詞;
}

function noPriorClauseConditionContentInSentence(tokens: readonly RuntimeHaruToken[], beforeIdx: number): boolean {
  for (let idx = beforeIdx - 1; idx >= 0; idx -= 1) {
    const token = tokens[idx];
    if (token === undefined) {
      continue;
    }
    const np0 = token.pos & POS0;
    if (np0 === 補助記号 || np0 === 記号) {
      if (["。", "?", "？", "!", "！"].includes(token.surface)) {
        return true;
      }
      continue;
    }
    if (isClauseConditionContentToken(token)) {
      return false;
    }
  }
  return true;
}

function matchesBooleanCondition(expected: FrameJsonValue, actual: boolean): boolean {
  return typeof expected === "boolean" && expected === actual;
}

function matchesNullableBooleanCondition(expected: FrameJsonValue, actual: boolean | null): boolean {
  return typeof expected === "boolean" && actual === expected;
}

function slotAcceptsFillerParticle(slot: FrameSlotSpec, filler: ArgumentFiller): boolean {
  if (slot.particles.includes(filler.frameParticle)) {
    return true;
  }
  return filler.gaNoConverted && slot.particles.includes("が");
}

function slotConstraintsMatch(frame: FrameSpec, slot: FrameSlotSpec, filler: ArgumentFiller, lookupResolver: LookupResolver): boolean {
  if (slot.surfaces.length > 0 && !slot.surfaces.includes(filler.surface) && !slot.surfaces.includes(filler.dictionaryForm)) {
    return false;
  }
  if (slot.bare && filler.nounModified !== false) {
    return false;
  }
  if (
    slot.categories.length > 0 &&
    !slot.categories.some((category) => filler.categories.includes(category)) &&
    !slotAllowsSelfReferenceExperiencer(frame, slot, filler)
  ) {
    return false;
  }
  if (slot.excludeCategories.some((category) => filler.categories.includes(category))) {
    return false;
  }
  if (slot.nounLookup.length > 0) {
    if (!lookupSpecsMatch(slot.nounLookup, filler, lookupResolver)) {
      return false;
    }
  }
  return true;
}

export function isAdnominalNoRelationSlot(slot: FrameSlotSpec): boolean {
  return slot.slotType === SLOT_TYPE_NOUN && slot.binding === SLOT_BINDING_ADNOMINAL_NO;
}

export function adnominalNoRelationSlotAcceptsHost(
  frame: FrameSpec,
  slot: FrameSlotSpec,
  host: MatcherToken,
  lookups: LookupTables
): boolean {
  if (!isAdnominalNoRelationSlot(slot)) {
    return false;
  }
  const filler = new ArgumentFiller(
    "の",
    "の",
    -1,
    -1,
    host.surface,
    host.dictionaryForm || host.surface,
    host.numericCounterHeadForm ?? "",
    semanticCategories(host, lookups)
  );
  return slotConstraintsMatch(frame, slot, filler, (name) => namedLookupResolver(name, lookups));
}

export function isAdnominalHeadBearerSlot(slot: FrameSlotSpec): boolean {
  return slot.slotType === SLOT_TYPE_NOUN && slot.binding === SLOT_BINDING_ADNOMINAL_HEAD;
}

export function adnominalHeadBearerSlotAcceptsHead(
  frame: FrameSpec,
  slot: FrameSlotSpec,
  head: MatcherToken,
  lookups: LookupTables
): boolean {
  if (!isAdnominalHeadBearerSlot(slot)) {
    return false;
  }
  const filler = new ArgumentFiller(
    "の",
    "の",
    -1,
    -1,
    head.surface,
    head.dictionaryForm || head.surface,
    head.numericCounterHeadForm ?? "",
    semanticCategories(head, lookups)
  );
  return slotConstraintsMatch(frame, slot, filler, (name) => namedLookupResolver(name, lookups));
}

function slotAllowsSelfReferenceExperiencer(frame: FrameSpec, slot: FrameSlotSpec, filler: ArgumentFiller): boolean {
  return frame.frameId === "wakaru_experiencer_borrowed_theme" &&
    slot.role === "experiencer" &&
    slot.categories.includes("person") &&
    (filler.surface === "本人" || filler.dictionaryForm === "本人");
}

function lookupSpecsMatch(specs: readonly (string | FrameJsonMap)[], filler: ArgumentFiller, lookupResolver: LookupResolver): boolean {
  const include = new Set<string>();
  const exclude = new Set<string>();
  for (const spec of specs) {
    if (typeof spec === "string") {
      for (const value of lookupResolverOrThrow(lookupResolver, spec)) {
        include.add(value);
      }
      continue;
    }
    for (const lookupName of stringList(spec.sets, "lookup spec sets")) {
      for (const value of lookupResolverOrThrow(lookupResolver, lookupName)) {
        include.add(value);
      }
    }
    for (const extra of stringList(spec.extras, "lookup spec extras")) {
      include.add(extra);
    }
    for (const item of stringList(spec.exclude, "lookup spec exclude")) {
      exclude.add(item);
    }
  }
  const forms = argumentNounLookupForms(filler);
  return forms.some((form) => lookupSetMatches(include, form)) &&
    !forms.some((form) => lookupSetMatches(exclude, form));
}

function lookupResolverOrThrow(lookupResolver: LookupResolver, name: string): ReadonlySet<string> {
  try {
    return lookupResolver(name);
  } catch (_error) {
    throw new UnknownLookupSet(name);
  }
}

function stringList(value: FrameJsonValue | undefined, message: string): readonly string[] {
  if (value === undefined || value === null) {
    return [];
  }
  if (typeof value === "string") {
    return [value];
  }
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new FrameValidationError(`${message} must be strings`);
  }
  return value;
}

function slotPositionMatches(slot: FrameSlotSpec, filler: ArgumentFiller, predicateIdx: number): boolean {
  if (slot.particlePosition === null) {
    return true;
  }
  if (slot.particlePosition === PARTICLE_POSITION_PREDICATE_ADJACENT) {
    return filler.particleIdx === predicateIdx - 1;
  }
  return false;
}

function chooseSlotFiller(fillers: readonly ArgumentFiller[]): ArgumentFiller {
  return [...fillers].sort((left, right) =>
    Number(left.borrowed) - Number(right.borrowed) || left.particleIdx - right.particleIdx
  )[0]!;
}

function slotPositionOnlyEvidenceScore(slot: FrameSlotSpec): EvidenceScore {
  const required = slot.required ? 1 : 0;
  const position = slot.particlePosition === null ? 0 : 1;
  return new EvidenceScore(0, 0, 0, required, 0, 0, 0, position, 0, 0, required + position);
}

function slotEvidenceScore(slot: FrameSlotSpec, filler: ArgumentFiller): EvidenceScore {
  const required = slot.required ? 1 : 0;
  const surface = slot.surfaces.length > 0 ? 1 : 0;
  const lookup = slot.nounLookup.length > 0 ? 1 : 0;
  const category = slot.categories.length > 0 ? 1 : 0;
  const position = slot.particlePosition === null ? 0 : 1;
  return new EvidenceScore(
    0,
    0,
    0,
    required,
    surface,
    lookup,
    category,
    position,
    0,
    filler.borrowed ? 0 : 1,
    required + surface + lookup + category + position
  );
}

function conditionEvidenceScore(
  frame: FrameSpec,
  candidate: FrameEvidenceInput | null,
  conditionEvaluator: ConditionEvidenceEvaluator | null
): readonly [EvidenceScore, string | null] {
  let score = new EvidenceScore();
  if (frame.chainConditions !== null && Object.keys(frame.chainConditions).length > 0) {
    const result = evaluateConditions(candidate, "chain", frame.chainConditions, conditionEvaluator);
    if (!result.matched) {
      return [score, result.rejectedReason ?? "chain_mismatch"];
    }
    const count = Object.keys(frame.chainConditions).length;
    score = addScore(score, new EvidenceScore(count, 0, 0, 0, 0, 0, 0, 0, 0, 0, count));
  }
  if (frame.connectiveRole.length > 0) {
    const result = evaluateConditions(candidate, "connective", { connectiveRole: frame.connectiveRole }, conditionEvaluator);
    if (!result.matched) {
      return [score, result.rejectedReason ?? "connective_mismatch"];
    }
    score = addScore(score, new EvidenceScore(0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1));
  }
  if (frame.participantConditions.length > 0) {
    const context = participantConditionsContext(frame.participantConditions);
    const result = evaluateConditions(candidate, "participant", context, conditionEvaluator);
    if (!result.matched) {
      return [score, result.rejectedReason ?? "participant_mismatch"];
    }
    const count = frame.participantConditions.length;
    score = addScore(score, new EvidenceScore(0, 0, count, 0, 0, 0, 0, 0, 0, 0, count));
  }
  if (frame.lexicalConditions !== null && Object.keys(frame.lexicalConditions).length > 0) {
    const result = evaluateConditions(candidate, "lexical", frame.lexicalConditions, conditionEvaluator);
    if (!result.matched) {
      return [score, result.rejectedReason ?? "lexical_mismatch"];
    }
    const count = Object.keys(frame.lexicalConditions).length;
    score = addScore(score, new EvidenceScore(0, 0, 0, 0, 0, 0, 0, 0, count, 0, count));
  }
  if (frame.clauseConditions !== null && Object.keys(frame.clauseConditions).length > 0) {
    const result = evaluateConditions(candidate, "clause", frame.clauseConditions, conditionEvaluator);
    if (!result.matched) {
      return [score, result.rejectedReason ?? "clause_mismatch"];
    }
    const count = Object.keys(frame.clauseConditions).length;
    score = addScore(score, new EvidenceScore(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, count, count));
  }
  return [score, null];
}

function participantConditionsContext(conditions: readonly FrameParticipantConditionSpec[]): FrameJsonMap {
  const context: { [key: string]: FrameJsonValue } = {};
  for (const condition of conditions) {
    const key = participantConditionContextKey(condition.position);
    const current = context[key];
    const target = Array.isArray(current) ? [...current] : [];
    for (const category of condition.categories) {
      if (!target.includes(category)) {
        target.push(category);
      }
    }
    context[key] = target;
  }
  return context;
}

function participantConditionContextKey(position: string): "prevCategory" | "nextCategory" | "subjectCategory" {
  if (position === PARTICIPANT_CONDITION_PREVIOUS) {
    return "prevCategory";
  }
  if (position === PARTICIPANT_CONDITION_SUBJECT) {
    return "subjectCategory";
  }
  return "nextCategory";
}

function evaluateConditions(
  candidate: FrameEvidenceInput | null,
  kind: string,
  conditions: FrameJsonMap,
  conditionEvaluator: ConditionEvidenceEvaluator | null
): ConditionEvidenceResult {
  if (Object.keys(conditions).length === 0) {
    return new ConditionEvidenceResult(true);
  }
  if (conditionEvaluator === null || candidate === null) {
    if (kind === "clause") {
      return new ConditionEvidenceResult(true);
    }
    return new ConditionEvidenceResult(false, `${kind}_evaluator_missing`);
  }
  return conditionEvaluator(candidate, kind, conditions);
}

function addScore(left: EvidenceScore, right: EvidenceScore): EvidenceScore {
  return new EvidenceScore(
    left.chain + right.chain,
    left.connective + right.connective,
    left.participant + right.participant,
    left.required + right.required,
    left.surface + right.surface,
    left.lookup + right.lookup,
    left.category + right.category,
    left.position + right.position,
    left.lexical + right.lexical,
    left.nonBorrowed + right.nonBorrowed,
    left.total + right.total,
    left.clause + right.clause
  );
}

function fillerTraceDetail(filler: ArgumentFiller): { [key: string]: FrameTraceValue } {
  return {
    slot_type: filler.slotType,
    surface_particle: filler.surfaceParticle,
    frame_particle: filler.frameParticle,
    particle_idx: filler.particleIdx,
    head_idx: filler.headIdx,
    surface: filler.surface,
    dictionary_form: filler.dictionaryForm,
    categories: filler.categories,
    borrowed: filler.borrowed,
    ...(filler.nounModified === null ? {} : { noun_modified: filler.nounModified }),
    ...(filler.voiceTransform === null ? {} : { voice_transform: filler.voiceTransform }),
    ...(filler.markerIdx === null ? {} : { marker_idx: filler.markerIdx }),
    ...(filler.contentTokenStart === null ? {} : { content_token_start: filler.contentTokenStart }),
    ...(filler.contentTokenEnd === null ? {} : { content_token_end: filler.contentTokenEnd }),
    ...(filler.hostIdx === null ? {} : { host_idx: filler.hostIdx })
  };
}

function compareFrameMatchTuple(left: readonly [readonly number[], number, FrameMatch], right: readonly [readonly number[], number, FrameMatch]): number {
  for (let idx = 0; idx < Math.max(left[0].length, right[0].length); idx += 1) {
    const diff = (left[0][idx] ?? 0) - (right[0][idx] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }
  return right[1] - left[1];
}

function arrayEquals<T>(left: readonly T[], right: readonly T[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function slotSpecFromDict(value: FrameJsonValue): FrameSlotSpec {
  if (!isFrameJsonMap(value)) {
    throw new FrameValidationError("frame slot must be mapping");
  }
  const role = value.role;
  if (typeof role !== "string" || role.length === 0) {
    throw new FrameValidationError("frame slot requires role");
  }
  const slotType = optionalEnumString(value.slotType, FRAME_SLOT_TYPES, "slot_type") ?? SLOT_TYPE_NOUN;
  const absent = value.absent;
  if (absent !== undefined && absent !== null && typeof absent !== "boolean") {
    throw new FrameValidationError("frame slot absent must be boolean");
  }
  const required = absent === true ? false : value.required === undefined ? true : Boolean(value.required);
  if (slotType === SLOT_TYPE_CLAUSE) {
    if (absent === true) {
      throw new FrameValidationError("clause frame slot cannot be absent");
    }
    const markers = stringTuple(value.markers);
    if (markers.length === 0) {
      throw new FrameValidationError("clause frame slot requires markers");
    }
    const allowed = FRAME_CLAUSE_SLOT_MARKERS[role];
    if (allowed === undefined) {
      throw new FrameValidationError("clause frame slot has unsupported role");
    }
    const unknownMarkers = markers.filter((marker) => !allowed.has(marker));
    if (unknownMarkers.length > 0) {
      throw new FrameValidationError("clause frame slot has unsupported markers");
    }
    const forbidden = ["particles", "surfaces", "nounLookup", "lookup", "categories", "excludeCategories", "particlePosition", "caseRealization", "slotRealization", "bare"]
      .filter((key) => key in value);
    if (forbidden.length > 0) {
      throw new FrameValidationError("clause frame slot has noun-side fields");
    }
    return new FrameSlotSpec(
      role,
      [],
      required,
      [],
      [],
      [],
      null,
      false,
      null,
      slotType,
      markers
    );
  }
  const particles = stringTuple(value.particles);
  const categories = stringTuple(value.categories);
  const surfaces = stringTuple(value.surfaces);
  const particlePosition = optionalEnumString(value.particlePosition, FRAME_PARTICLE_POSITIONS, "slot particle_position");
  const allowBorrowed = value.allowBorrowed === true;
  if (particlePosition !== null && allowBorrowed) {
    throw new FrameValidationError("frame slot particle_position cannot allow borrowed fillers");
  }
  const binding = optionalEnumString(value.binding, FRAME_SLOT_BINDINGS, "slot binding");
  if (particles.length === 0) {
    throw new FrameValidationError("frame slot requires particles");
  }
  const adnominalBinding = binding === SLOT_BINDING_ADNOMINAL_NO || binding === SLOT_BINDING_ADNOMINAL_HEAD;
  if (adnominalBinding && (particles.length !== 1 || particles[0] !== "の" || particlePosition !== null || allowBorrowed)) {
    throw new FrameValidationError(`${binding} slot binding requires particles ["の"] without particle_position or allow_borrowed`);
  }
  if (adnominalBinding && categories.length === 0 && surfaces.length === 0 &&
    lookupSpecsTuple(value.nounLookup ?? value.lookup).length === 0) {
    throw new FrameValidationError(`${binding} slot binding requires a filler constraint (surfaces, noun_lookup, or categories)`);
  }
  const bare = value.bare;
  if (bare !== undefined && bare !== null && typeof bare !== "boolean") {
    throw new FrameValidationError("frame slot bare must be boolean");
  }
  return new FrameSlotSpec(
    role,
    particles,
    required,
    lookupSpecsTuple(value.nounLookup ?? value.lookup),
    categories,
    surfaces,
    particlePosition,
    allowBorrowed,
    binding,
    slotType,
    [],
    bare === true,
    excludeCategoriesTuple(value.excludeCategories),
    absent === true
  );
}

function excludeCategoriesTuple(value: FrameJsonValue | undefined): readonly string[] {
  const categories = stringTuple(value);
  const known = new Set<string>(SEMANTIC_FRAME_CATEGORIES);
  if (categories.some((category) => !known.has(category))) {
    throw new FrameValidationError("frame slot exclude_categories has unsupported category");
  }
  return categories;
}

function participantConditionsTuple(value: FrameJsonValue | undefined): readonly FrameParticipantConditionSpec[] {
  if (value === undefined || value === null) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new FrameValidationError("participant_conditions must be array");
  }
  return value.map((item) => {
    if (!isFrameJsonMap(item)) {
      throw new FrameValidationError("participant condition must be mapping");
    }
    const position = optionalEnumString(item.position, FRAME_PARTICIPANT_CONDITION_POSITIONS, "participant condition position");
    if (position === null) {
      throw new FrameValidationError("participant condition requires position");
    }
    return new FrameParticipantConditionSpec(position, stringTuple(item.categories));
  });
}

function conditionMapping(value: FrameJsonValue | undefined, name: string): FrameJsonMap | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (!isFrameJsonMap(value)) {
    throw new FrameValidationError(`${name} must be mapping`);
  }
  return value;
}

function stringTuple(value: FrameJsonValue | undefined): readonly string[] {
  if (value === undefined || value === null) {
    return [];
  }
  if (typeof value === "string") {
    return [value];
  }
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new FrameValidationError("expected string or string array");
  }
  return value;
}

function lookupSpecsTuple(value: FrameJsonValue | undefined): readonly (string | FrameJsonMap)[] {
  if (value === undefined || value === null) {
    return [];
  }
  if (typeof value === "string" || isFrameJsonMap(value)) {
    return [value];
  }
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string" || isFrameJsonMap(item))) {
    throw new FrameValidationError("lookup specs must be string, mapping, or array");
  }
  return value;
}

function optionalEnumString(value: FrameJsonValue | undefined, allowed: ReadonlySet<string>, name: string): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== "string" || !allowed.has(value)) {
    throw new FrameValidationError(`invalid ${name}`);
  }
  return value;
}

function isFrameJsonMap(value: FrameJsonValue): value is FrameJsonMap {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
