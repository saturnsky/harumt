import type { AuxOpNode, ConnectiveOp } from "./grammar.js";
import { isChainableHeadOp } from "./operator-head.js";
import type { LookupTables } from "../../../lookup-tables.js";
import type { RuntimeHaruToken } from "../../../../types/token.js";
import { kaOwnershipKindAt } from "../../boundary/ka-ownership.js";


export const BARE_NOUN_STEM_FOCUS_CONNECTIVES = [
  "focus_additive_denaku",
  "focus_additive_negative",
  "focus_reversal_dokoro_ka",
  "focus_limit_de",
  "focus_limit_nara"
] as const;

export type BareNounStemFocusConnective = typeof BARE_NOUN_STEM_FOCUS_CONNECTIVES[number];

export const BARE_NOUN_STEM_QUOTE_CONNECTIVES = [
  "quotative",
  "question_content_alternative",
  "question_quotative",
  "cognitive_complement",
  "wish_complement",
  "request_complement",
  "quoted_concessive",
  "retrospective_quotative"
] as const;

export const BARE_NOUN_STEM_IMPLICIT_COPULA_CONNECTIVES = [
  "question_content",
  "question_quotative",
  "question_reformulation",
  "reformulation",
  "exemplification"
] as const;

export function isBareNounStemFocusConnective(
  connective: ConnectiveOp["connective"]
): connective is BareNounStemFocusConnective {
  return (BARE_NOUN_STEM_FOCUS_CONNECTIVES as readonly string[]).includes(connective);
}

function isQuestionRetrospectiveConnective(connective: ConnectiveOp): boolean {
  return connective.retrospectiveQuotativeFlavor === "question_retrospective";
}

export function isBareNounStemQuoteConnective(connective: ConnectiveOp): boolean {
  return !isQuestionRetrospectiveConnective(connective) &&
    (BARE_NOUN_STEM_QUOTE_CONNECTIVES as readonly string[]).includes(connective.connective);
}

export function isBareNounStemImplicitCopulaConnective(connective: ConnectiveOp): boolean {
  return isQuestionRetrospectiveConnective(connective) ||
    (BARE_NOUN_STEM_IMPLICIT_COPULA_CONNECTIVES as readonly string[]).includes(connective.connective);
}

export function isQuestionContentConnective(connective: ConnectiveOp): boolean {
  return connective.connective === "question_content" ||
    connective.connective === "question_quotative";
}

export function opChainCanHostBareNounStem(ops: readonly AuxOpNode[]): boolean {
  const first = ops[0];
  if (first === undefined || first.kind === "copula") {
    return true;
  }
  if (ops.length === 1 && first.kind === "connective") {
    return isBareNounStemFocusConnective(first.connective) ||
      isBareNounStemQuoteConnective(first) ||
      isBareNounStemImplicitCopulaConnective(first);
  }
  return isChainableHeadOp(first);
}

export function opChainCanHostBareNounStemBeforeCommitment(
  ops: readonly AuxOpNode[],
  tokens: readonly RuntimeHaruToken[],
  lookups: LookupTables
): boolean {
  const first = ops[0];
  if (
    ops.length === 1 &&
    first?.kind === "connective" &&
    first.connective === "alternative" &&
    questionOwnedKaMarker(first, tokens, lookups)
  ) {
    return true;
  }
  return opChainCanHostBareNounStem(ops);
}

function questionOwnedKaMarker(
  connective: ConnectiveOp,
  tokens: readonly RuntimeHaruToken[],
  lookups: LookupTables
): boolean {
  const markerIdx = connective.source.tokenIndices.at(-1);
  return markerIdx !== undefined && kaOwnershipKindAt(tokens, markerIdx, lookups) === "question";
}
