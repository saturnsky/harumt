import { lookupConditionMatches } from "../../context.js";

import {
  isAnimateReferentToken,
  isHumanCollectiveToken,
  isHumanReferentToken,
  isPersonCountToken,
  isPlaceNoun,
  isPlaceScopeNoun,
  isInstrumentNounToken,
  isQuantityMeasureToken,
  isRoleNoun,
  isTemporalArgumentToken
} from "./semantic-classifiers.js";
import { isAdverbCapableNominal, isSahenCapableNominal, isSahenCapableNominalOrCompound } from "../../../types/pos.js";
import type {
  ProjectionBoundaryClass,
  ProjectionBoundarySelector,
  ProjectionCandidateSelector,
  ProjectionHeadModifierKind,
  ProjectionHeadModifierSelector,
  ProjectionPredicateSelector,
  ProjectionTokenSelector,
  ProjectionTokenSemanticClass
} from "../grammar.js";
import type { MatcherToken } from "../../matchers.js";
import type { LookupTables } from "../../lookup-tables.js";

import { POS0, POS0_NAME, POS1, POS1_NAME, POS1_SHIFT, POS4, POS4_NAME, POS4_SHIFT, POS5, POS5_OF_NAME } from "../../../types/pos.js";
export interface ProjectionSelectorToken {
  readonly surface?: string;
  readonly dictionaryForm?: string;
  readonly pos: number;
  readonly splitA?: readonly ProjectionSelectorToken[];
  readonly splitB?: readonly ProjectionSelectorToken[];
}

export interface ProjectionSelectorContext {
  readonly head?: ProjectionSelectorToken;
  readonly precedingTokens?: readonly ProjectionSelectorToken[];
  readonly followingTokens?: readonly ProjectionSelectorToken[];
  readonly followingPredicate?: ProjectionPredicateContext | undefined;
  readonly precedingBoundary?: ProjectionBoundaryContext | undefined;
  readonly followingBoundary?: ProjectionBoundaryContext | undefined;
  readonly followingNounPhrase?: readonly ProjectionSelectorToken[];
  readonly headModifier?: ProjectionHeadModifierContext | undefined;
}

export interface ProjectionBoundaryContext {
  readonly classes: readonly ProjectionBoundaryClass[];
}

export interface ProjectionHeadModifierContext {
  readonly kinds: readonly ProjectionHeadModifierKind[];
}

export interface ProjectionPredicateContext {
  readonly voice?: string | null;
  readonly connectiveRole?: string | null;
  readonly hasNegative?: boolean;
  readonly hasCausative?: boolean;
  readonly hasCausativePassive?: boolean;
  readonly hasRequestTail?: boolean;
  readonly hasBenefactiveTail?: boolean;
  readonly headToken?: ProjectionSelectorToken;
  readonly sourcePredicateShape?: string | null;
  readonly topicClause?: ProjectionPredicateContext;
}

export function projectionCandidateSelectorMatches(
  selector: ProjectionCandidateSelector,
  context: ProjectionSelectorContext,
  lookups: LookupTables
): boolean {
  if (selector.head !== undefined && !projectionTokenMatches(context.head, selector.head, lookups)) {
    return false;
  }
  switch (selector.kind) {
    case "head":
      return true;
    case "head_modifier":
      return projectionHeadModifierMatches(context.headModifier, selector.modifier);
    case "following_token":
      return (context.followingTokens ?? [])
        .slice(0, selector.window ?? 5)
        .some((token) => projectionTokenMatches(token, selector.token, lookups) ||
          (selector.token !== undefined && isSahenCapableNominal(token) && sahenVerbalFormMatches(token, selector.token, lookups)));
    case "following_sequence":
      return followingSequenceMatches(
        context.followingTokens ?? [],
        selector.sequence ?? [],
        selector.window ?? 6,
        selector.start ?? "any",
        lookups
      );
    case "following_predicate":
      return projectionPredicateMatches(context.followingPredicate, selector.predicate, lookups);
    case "preceding_token":
      return (context.precedingTokens ?? [])
        .slice(0, selector.window ?? 5)
        .some((token) => projectionTokenMatches(token, selector.token, lookups));
    case "preceding_sequence":
      return followingSequenceMatches(
        context.precedingTokens ?? [],
        selector.sequence ?? [],
        selector.window ?? 6,
        selector.start ?? "any",
        lookups
      );
    case "following_boundary":
      return projectionBoundaryMatches(context.followingBoundary, selector.boundary);
    case "preceding_boundary":
      return projectionBoundaryMatches(context.precedingBoundary, selector.boundary);
    case "following_noun_phrase":
      return (context.followingNounPhrase ?? [])
        .some((token) => projectionTokenMatches(token, selector.token, lookups));
  }
}

function projectionHeadModifierMatches(
  modifier: ProjectionHeadModifierContext | undefined,
  selector: ProjectionHeadModifierSelector | undefined
): boolean {
  if (modifier === undefined) {
    return false;
  }
  const kinds = selector?.kinds;
  return kinds === undefined || kinds.some((kind) => modifier.kinds.includes(kind));
}

function projectionPredicateMatches(
  layoutPredicate: ProjectionPredicateContext | undefined,
  selector: ProjectionPredicateSelector | undefined,
  lookups: LookupTables
): boolean {
  if (layoutPredicate === undefined || selector === undefined) {
    return false;
  }
  if (selector.owner === "any") {
    return projectionSinglePredicateMatches(layoutPredicate, selector, lookups) ||
      (layoutPredicate.topicClause !== undefined && projectionSinglePredicateMatches(layoutPredicate.topicClause, selector, lookups));
  }
  const predicate = selector.owner === "topic_clause"
    ? layoutPredicate.topicClause ?? layoutPredicate
    : layoutPredicate;
  return projectionSinglePredicateMatches(predicate, selector, lookups);
}

function projectionPredicateHeadMatches(
  predicate: ProjectionPredicateContext,
  selector: ProjectionTokenSelector,
  lookups: LookupTables
): boolean {
  const head = predicate.headToken;
  if (projectionTokenMatches(head, selector, lookups)) {
    return true;
  }
  return head !== undefined &&
    predicate.sourcePredicateShape === "sahen_verbalization" &&
    sahenVerbalFormMatches(head, selector, lookups);
}

function sahenVerbalFormMatches(
  token: ProjectionSelectorToken,
  selector: ProjectionTokenSelector,
  lookups: LookupTables
): boolean {
  const noun = token.dictionaryForm || token.surface || "";
  return noun.length > 0 &&
    projectionTokenMatches({ ...token, dictionaryForm: `${noun}する`, surface: `${noun}する` }, selector, lookups);
}

function projectionSinglePredicateMatches(
  predicate: ProjectionPredicateContext,
  selector: ProjectionPredicateSelector,
  lookups: LookupTables
): boolean {
  return (selector.head === undefined || projectionPredicateHeadMatches(predicate, selector.head, lookups)) &&
    matchesOneOf(selector.sourcePredicateShape, predicate.sourcePredicateShape ?? undefined) &&
    matchesOneOf(selector.voice, predicate.voice ?? undefined) &&
    matchesOneOf(selector.connectiveRole, predicate.connectiveRole ?? undefined) &&
    matchesBoolean(selector.hasNegative, predicate.hasNegative) &&
    matchesBoolean(selector.hasCausative, predicate.hasCausative) &&
    matchesBoolean(selector.hasCausativePassive, predicate.hasCausativePassive) &&
    matchesBoolean(selector.hasRequestTail, predicate.hasRequestTail) &&
    matchesBoolean(selector.hasBenefactiveTail, predicate.hasBenefactiveTail);
}

export function projectionTokenMatches(
  token: ProjectionSelectorToken | undefined,
  selector: ProjectionTokenSelector | undefined,
  lookups: LookupTables
): boolean {
  if (token === undefined || selector === undefined) {
    return false;
  }
  return matchesOneOf(selector.surface, token.surface) &&
    matchesOneOf(selector.dictionaryForm, token.dictionaryForm || token.surface) &&
    matchesLookup(selector.lookup, token.dictionaryForm, token.surface, lookups) &&
    matchesSemantic(selector.semantic, token, lookups) &&
    matchesOneOf(selector.pos0, POS0_NAME[token.pos & POS0]) &&
    matchesOneOf(selector.pos1, POS1_NAME[(token.pos & POS1) >> POS1_SHIFT]) &&
    matchesOneOf(selector.pos4, POS4_NAME[(token.pos & POS4) >> POS4_SHIFT]) &&
    matchesPos5(selector.pos5, token.pos & POS5);
}

function matchesSemantic(
  values: readonly ProjectionTokenSemanticClass[] | undefined,
  token: ProjectionSelectorToken,
  lookups: LookupTables
): boolean {
  if (values === undefined) {
    return true;
  }
  const fullToken = projectionSelectorTokenAsMatcherToken(token);
  if (fullToken === null) {
    return false;
  }
  return values.some((value) => {
    switch (value) {
      case "animate_referent":
        return isAnimateReferentToken(fullToken, lookups);
      case "human_collective":
        return isHumanCollectiveToken(fullToken, lookups);
      case "human_referent":
        return isHumanReferentToken(fullToken, lookups);
      case "person_count":
        return isPersonCountToken(fullToken, lookups);
      case "quantity_measure":
        return isQuantityMeasureToken(fullToken, lookups);
      case "place_noun":
        return isPlaceNoun(fullToken, lookups);
      case "place_scope_noun":
        return isPlaceScopeNoun(fullToken, lookups);
      case "instrument_noun":
        return isInstrumentNounToken(fullToken, lookups);
      case "role_noun":
        return isRoleNoun(fullToken, lookups);
      case "time_argument":
        return isTemporalArgumentToken(fullToken, lookups);
      case "adverb_capable_nominal":
        return isAdverbCapableNominal(fullToken);
      case "occasion_action_event_noun":
        return isOccasionActionEventNounToken(token, lookups);
    }
  });
}

function isOccasionActionEventNounToken(token: ProjectionSelectorToken, lookups: LookupTables): boolean {
  if (isSahenCapableNominalOrCompound(token)) {
    return true;
  }
  const set = lookups.named("semantic.occasion_action_event_nouns");
  if (set === undefined) {
    return false;
  }
  if (lookupHasTokenForm(token, set)) {
    return true;
  }
  const subs = token.splitB ?? token.splitA;
  if (subs !== undefined && subs.length > 0) {
    return lookupHasTokenForm(subs[subs.length - 1]!, set);
  }
  return false;
}

function lookupHasTokenForm(token: ProjectionSelectorToken, set: ReadonlySet<string>): boolean {
  if (token.dictionaryForm !== undefined && set.has(token.dictionaryForm)) return true;
  if (token.surface !== undefined && set.has(token.surface)) return true;
  return false;
}

function projectionSelectorTokenAsMatcherToken(token: ProjectionSelectorToken): MatcherToken | null {
  if (token.surface === undefined || token.dictionaryForm === undefined) {
    return null;
  }
  return {
    surface: token.surface,
    dictionaryForm: token.dictionaryForm,
    pos: token.pos
  };
}

function matchesLookup(
  lookup: ProjectionTokenSelector["lookup"],
  dictionaryForm: string | undefined,
  surface: string | undefined,
  lookups: LookupTables
): boolean {
  if (lookup === undefined) {
    return true;
  }
  return lookupConditionMatches(lookup, [dictionaryForm ?? "", surface ?? ""], lookups);
}

function matchesOneOf(values: readonly string[] | undefined, actual: string | undefined): boolean {
  return values === undefined || (actual !== undefined && values.includes(actual));
}

function matchesPos5(values: readonly string[] | undefined, actual: number): boolean {
  if (values === undefined) return true;
  return values.some((v) => POS5_OF_NAME[v] === actual);
}

function matchesBoolean(expected: boolean | undefined, actual: boolean | undefined): boolean {
  return expected === undefined || actual === expected;
}

function followingSequenceMatches(
  tokens: readonly ProjectionSelectorToken[],
  sequence: readonly ProjectionTokenSelector[],
  window: number,
  startMode: "next" | "any",
  lookups: LookupTables
): boolean {
  if (sequence.length === 0) {
    return false;
  }
  const windowed = tokens.slice(0, window);
  const maxStart = startMode === "next" ? 0 : windowed.length - sequence.length;
  for (let start = 0; start <= maxStart; start += 1) {
    let ok = true;
    for (let offset = 0; offset < sequence.length; offset += 1) {
      const token = windowed[start + offset];
      const tokenSelector = sequence[offset];
      if (token === undefined || tokenSelector === undefined || !projectionTokenMatches(token, tokenSelector, lookups)) {
        ok = false;
        break;
      }
    }
    if (ok) {
      return true;
    }
  }
  return false;
}

function projectionBoundaryMatches(
  boundary: ProjectionBoundaryContext | undefined,
  selector: ProjectionBoundarySelector | undefined
): boolean {
  if (boundary === undefined || selector === undefined) {
    return false;
  }
  return selector.classes === undefined ||
    selector.classes.some((value) => boundary.classes.includes(value));
}
