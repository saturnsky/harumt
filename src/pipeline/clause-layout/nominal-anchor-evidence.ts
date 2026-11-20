import { TokenCursor } from "../token-cursor.js";
import { quoteMarkerRelationAt } from "../head-tail/boundary/quote-marker.js";
import { isClausePunctuationToken } from "./punctuation.js";
import { nextNonSpaceIndex, previousNonSpaceIndex, DETACHED_SEPARATIONS, separatedAs } from "./trivia.js";
import type { BalancedDelimiterSpan } from "./balanced-delimiter.js";
import { POS0, POS01, POS5A, isNominalLike, pos0in, 形容詞0, 終止形_, 助詞, 助動詞, 接続詞, 接尾辞, 動詞, 補助記号, 連体形_, 連用形_, 動詞_非自立可能, isAuxiliaryStemToken } from "../../types/pos.js";
import type { ClauseKind, ClauseToken, ProjectionEvidenceLayout } from "./layout-types.js";
import { NOUNISH_POS0_NUM, isNounishToken } from "./token-evidence.js";
import { detectQuoteSpans } from "./quote-delimiters.js";

export function isAttributiveHeadNounishToken(token: ClauseToken | undefined): boolean {
  return token !== undefined &&
    NOUNISH_POS0_NUM.has(token.pos & POS0) &&
    !isAuxiliaryStemToken(token);
}
export interface BareKeijoujiAttributiveEvidence {
  readonly hostClass: "na_adjective" | "predicate_sense_nominal";
  readonly katakanaRun: boolean;
}

export type PunctuatedAttributiveTargetReach = "salient_nominal" | "source_required_head";

export function nominalSuffixRunEnd(tokens: readonly ClauseToken[], idx: number, endExclusive: number): number {
  let end = idx;
  while (end + 1 < endExclusive) {
    const next = tokens[end + 1];
    if (next === undefined || (next.pos & POS0) !== 接尾辞 || !isNominalLike(next) ||
      separatedAs(tokens, end + 1, DETACHED_SEPARATIONS)) {
      break;
    }
    end += 1;
  }
  return end;
}

export interface PunctuatedAttributiveTargetClause {
  readonly start: number;
  readonly end: number;
  readonly kind: ClauseKind;
  readonly parentIdx: number | null;
  readonly predicates: readonly number[];
  readonly particleIndices: readonly number[];
  readonly adverbialAdjunctIndices: readonly number[];
}

export function adjacentRelativeParentClause(
  tokens: readonly ClauseToken[],
  clauses: readonly PunctuatedAttributiveTargetClause[],
  clauseIndex: number
): PunctuatedAttributiveTargetClause | null {
  const current = clauses[clauseIndex];
  if (current === undefined || current.kind !== "relative") {
    return null;
  }
  if (current.parentIdx === null || current.parentIdx !== clauseIndex + 1) {
    return null;
  }
  const parent = clauses[current.parentIdx];
  if (parent === undefined || current.end !== parent.start) {
    return null;
  }
  return separatedAs(tokens, parent.start, DETACHED_SEPARATIONS) ? null : parent;
}

export type PrenominalMarkerHeadReachArm = "direct" | "modifier_chain" | "quoted_nominal" | "relative_clause";

export interface PrenominalMarkerHeadReach {
  readonly headIdx: number;
  readonly arm: PrenominalMarkerHeadReachArm;
}

export interface PrenominalMarkerHeadReachLayout extends ProjectionEvidenceLayout {
  balancedDelimiterSpanOpeningAt(openingIdx: number): BalancedDelimiterSpan | undefined;
}

export type ExplicitAdnominalNoHostClass = "pure_keijoushi" | "keijoushi_capable_noun" | "attributive_capable_nominal";

export interface ExplicitAdnominalNoLayout extends PrenominalMarkerHeadReachLayout {
  adnominalNoRelationSlotAccepts(headIdx: number, hostIdx: number): boolean;
  adnominalHeadBearerSlotAccepts(hostIdx: number, headIdx: number): boolean;
}

export interface ExplicitAdnominalNoAttributiveEvidence {
  readonly hostIdx: number;
  readonly markerIdx: number;
  readonly headIdx: number;
  readonly arm: PrenominalMarkerHeadReachArm;
  readonly hostClass: ExplicitAdnominalNoHostClass;
}

export function leadingConnectiveIndexForRange(
  tokens: readonly ClauseToken[],
  start: number,
  endExclusive: number
): number | null {
  const first = nextNonSpaceIndex(tokens, start, endExclusive);
  if (first === null) {
    return null;
  }
  const token = tokens[first];
  return token !== undefined && isLeadingClauseConnectiveToken(token) ? first : null;
}

export function leadingQuoteMarkerIndexForRange(
  tokens: readonly ClauseToken[],
  start: number,
  endExclusive: number
): number | null {
  const first = nextNonSpaceIndex(tokens, start, endExclusive);
  if (first === null) {
    return null;
  }
  return quoteMarkerRelationAt(tokens, first, { consumers: ["clause_layout"] }) !== null ? first : null;
}

export function nominalBodyStartIndex(
  tokens: readonly ClauseToken[],
  start: number,
  endExclusive: number
): number | null {
  const first = nextNonSpaceIndex(tokens, start, endExclusive);
  if (first === null) {
    return null;
  }
  const token = tokens[first];
  if (token !== undefined && isLeadingClauseConnectiveToken(token)) {
    return nextNonSpaceIndex(tokens, first + 1, endExclusive);
  }
  return first;
}

export function nominalClosureHeadIndex(
  tokens: readonly ClauseToken[],
  start: number,
  endExclusive: number,
): number | null {
  let index = previousNonSpaceIndex(tokens, endExclusive, start);
  while (index !== null && isNominalClosureTerminalToken(tokens, index, start)) {
    index = previousNonSpaceIndex(tokens, index, start);
  }
  const token = index === null ? undefined : tokens[index];
  return token !== undefined && isNounishToken(token) ? index : null;
}

export function nominalClosureSuffixIsTerminal(
  tokens: readonly ClauseToken[],
  start: number,
  endExclusive: number,
): boolean {
  const c = new TokenCursor(tokens, start, endExclusive);
  while (c.pos < c.end) {
    const token = c.current();
    if (token === undefined || isClausePunctuationToken(token)) {
      c.advance();
      continue;
    }
    if (!isNominalClosureTerminalToken(tokens, c.pos, start)) {
      return false;
    }
    c.advance();
  }
  return true;
}

export type NominalClosurePrefixClassification =
  | { readonly ok: true; readonly hasPrenominalModifier: boolean; readonly modifierPredicateIndices: readonly number[] }
  | { readonly ok: false };

export function isMatchedNominalQuoteBoundary(
  tokens: readonly ClauseToken[],
  tokenIdx: number,
  prefixStart: number,
  headIdx: number,
  endExclusive: number,
): boolean {
  return detectQuoteSpans(tokens).some(([spanStart, spanEnd]) =>
    spanStart >= prefixStart &&
    spanStart < headIdx &&
    spanEnd < endExclusive &&
    (tokenIdx === spanStart || (tokenIdx === spanEnd && spanEnd < headIdx))
  );
}

export function rangeHasPrenominalPredicateModifier(
  tokens: readonly ClauseToken[],
  start: number,
  head: number,
): boolean {
  for (let index = start; index < head; index += 1) {
    if (isPrenominalPredicateModifierToken(tokens, index, head)) {
      return true;
    }
  }
  return false;
}

export function isNominalClosureListSeparator(token: ClauseToken): boolean {
  if ((token.pos & POS0) === 補助記号 && (token.surface === "・" || token.surface === "、")) {
    return true;
  }
  return (token.pos & POS0) === 助詞 && token.surface === "や";
}

function isLeadingClauseConnectiveToken(token: ClauseToken): boolean {
  return (token.pos & POS0) === 接続詞;
}

function isNominalClosureTerminalToken(
  tokens: readonly ClauseToken[],
  index: number,
  lowerBoundInclusive: number,
): boolean {
  const token = tokens[index];
  if (token === undefined) {
    return false;
  }
  if (pos0in(token.pos, 1 << 補助記号)) {
    return true;
  }
  if (isNominalClosureTerminalParticle(token)) {
    return true;
  }
  if (isNominalClosureTerminalAux(token)) {
    return true;
  }
  if (
    (token.pos & POS01) === 動詞_非自立可能 && (token.dictionaryForm === "ある" || token.dictionaryForm === "有る")
  ) {
    const previous = previousNonSpaceIndex(tokens, index, lowerBoundInclusive);
    const previousToken = previous === null ? undefined : tokens[previous];
    return previousToken !== undefined && (previousToken.pos & POS0) === 助動詞 &&
      (previousToken.dictionaryForm === "だ" || previousToken.dictionaryForm === "です");
  }
  return false;
}

function isNominalClosureTerminalParticle(token: ClauseToken): boolean {
  return (token.pos & POS0) === 助詞 && (token.surface === "は" || token.surface === "も" || token.surface === "が" || token.surface === "を");
}

function isNominalClosureTerminalAux(token: ClauseToken): boolean {
  if ((token.pos & POS0) !== 助動詞) {
    return false;
  }
  const dictionaryForm = token.dictionaryForm || token.surface;
  return dictionaryForm === "だ" ||
    dictionaryForm === "です" ||
    dictionaryForm === "た" ||
    dictionaryForm === "ます";
}

export function isPrenominalPredicateModifierToken(
  tokens: readonly ClauseToken[],
  index: number,
  head: number,
): boolean {
  const token = tokens[index];
  if (token === undefined) {
    return false;
  }
  const pos0 = token.pos & POS0;
  if (pos0 === 動詞) {
    return isShuushiOrRentaiToken(token) || isDirectRenyouNominalModifierToken(tokens, index, head);
  }
  if (pos0 === 形容詞0) {
    return isShuushiOrRentaiToken(token);
  }
  return false;
}

export function isInternalPredicateConnectiveToken(token: ClauseToken): boolean {
  return (token.pos & POS0) === 動詞 && isRenyouModifierToken(token);
}

export function isAdnominalCopulaAux(token: ClauseToken): boolean {
  return (token.pos & (POS0 | POS5A)) === (助動詞 | 連体形_) && (token.dictionaryForm === "だ" || token.dictionaryForm === "です");
}

function isShuushiOrRentaiToken(token: ClauseToken): boolean {
  const conj5A = token.pos & POS5A;
  return conj5A === 終止形_ || conj5A === 連体形_;
}

function isRenyouModifierToken(token: ClauseToken): boolean {
  return (token.pos & POS5A) === 連用形_;
}

function isDirectRenyouNominalModifierToken(
  tokens: readonly ClauseToken[],
  index: number,
  head: number,
): boolean {
  const token = tokens[index];
  if (token === undefined || !isRenyouModifierToken(token)) {
    return false;
  }
  const next = nextNonSpaceIndex(tokens, index + 1, head + 1);
  return next === head;
}
