import type { RuntimeHaruToken } from "../../../../types/token.js";
import { previousNonSpaceIndex } from "../../../clause-layout/trivia.js";
import { isExplicitQuoteClosingToken } from "../../../clause-layout/index.js";
import { nextClauseNonPunctuationIndex } from "../../../clause-layout/navigation.js";
import { externalNominalizerContinuationRelationAt, nominalLinkMarkerRelationAt } from "../../boundary/marker.js";
import { quoteMarkerRelationAt } from "../../boundary/quote-marker.js";
import { isAppearanceModalAdnominalTailEnd, isLikenessModalAdnominalTailEnd } from "./classifiers/tokens.js";
import { isSayVerbToken } from "../../data/quoted-reporting-sets.js";
import { quoteFocusLimitNegationTailStartingAt } from "../segments/quote-focus.js";
import { TokenCursor } from "../../../token-cursor.js";
import type { LookupTables } from "../../../lookup-tables.js";
import { tokoroSemanticReadingClaimsHead } from "../families/tokoro-semantics.js";
import type { ClauseBoundary } from "./commit.js";
import type { TailRoot } from "./grammar.js";

import {
  isAuxiliaryStemToken,
  isNaAdjCapable,
  NOMINAL_BITS,
  POS0,
  POS01,
  pos0in,
  POS1,
  POS4,
  POS5A,
  PREDICATE_AUX_BITS,
  助詞_係助詞,
  助詞_副助詞,
  助詞_格助詞,
  助動詞,
  助動詞_ダ,
  助動詞_デス,
  助動詞語幹,
  動詞,
  名詞,
  連体形_
} from "../../../../types/pos.js";
export type BoundaryReadinessRelation =
  | {
    readonly kind: "nominal_host_likeness";
    readonly reason: "left_host_not_represented";
  }
  | {
    readonly kind: "external_tokoro_scope";
    readonly reason: "left_host_not_represented";
  }
  | {
    readonly kind: "external_nominalizer_predicate";
    readonly reason: "left_host_not_represented";
  }
  | {
    readonly kind: "external_quote_focus_limit_negation";
    readonly reason: "tail_focus_not_represented";
  };

export function classifyBoundaryReadinessRelation(options: {
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly start: number;
  readonly consumed: number;
  readonly outgoingBoundary: ClauseBoundary;
  readonly lookups: LookupTables;
}): BoundaryReadinessRelation | null {
  const { tokens } = options.cursor;
  if (isNominalHostLikenessChunk(tokens, options.start)) {
    return {
      kind: "nominal_host_likeness",
      reason: "left_host_not_represented"
    };
  }
  if (isExternalTokoroScopeChunk(tokens, options.start, options.lookups)) {
    return {
      kind: "external_tokoro_scope",
      reason: "left_host_not_represented"
    };
  }
  if (isExternalNominalizerPredicateChunk(tokens, options.start)) {
    return {
      kind: "external_nominalizer_predicate",
      reason: "left_host_not_represented"
    };
  }
  if (
    options.outgoingBoundary.kind !== "terminal" &&
    options.outgoingBoundary.connectiveKind === "quotative" &&
    isExternalQuoteFocusLimitNegationTail(options.cursor, options.outgoingBoundary.tokenIdx)
  ) {
    return {
      kind: "external_quote_focus_limit_negation",
      reason: "tail_focus_not_represented"
    };
  }
  return null;
}

export function boundaryReadinessBlocker(
  root: TailRoot,
  relation: BoundaryReadinessRelation
): string | null {
  if (tailRootCanRepresentBoundaryRelation(root, relation)) {
    return null;
  }
  switch (relation.kind) {
    case "nominal_host_likeness":
      return "Nのようだ/みたいだ host not yet represented in TailRoot";
    case "external_tokoro_scope":
      return "external ところ scope host not yet represented in TailRoot";
    case "external_nominalizer_predicate":
      return "external nominalizer predicate host not yet represented in TailRoot";
    case "external_quote_focus_limit_negation":
      return "quote-focus limit-negation tail not yet represented in TailRoot";
  }
}

function tailRootCanRepresentBoundaryRelation(
  root: TailRoot,
  relation: BoundaryReadinessRelation
): boolean {
  switch (relation.kind) {
    case "nominal_host_likeness":
    case "external_tokoro_scope":
    case "external_nominalizer_predicate":
    case "external_quote_focus_limit_negation":
      return false;
  }
}

function isNominalHostLikenessChunk(
  tokens: readonly RuntimeHaruToken[],
  start: number
): boolean {
  const token = tokens[start];
  if (token === undefined || (token.surface !== "よう" && token.surface !== "みたい")) {
    return false;
  }
  if ((token.pos & POS1) !== 助動詞語幹) {
    return false;
  }
  const noIdx = previousNonSpaceIndex(tokens, start);
  if (noIdx === null || nominalLinkMarkerRelationAt(tokens, noIdx, {
    consumers: ["tail_boundary_readiness"]
  }) === null) {
    return false;
  }
  const hostIdx = previousNonSpaceIndex(tokens, noIdx);
  return hostIdx !== null && isNounishToken(tokens[hostIdx]);
}

export function isExternalTokoroScopeChunk(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  lookups: LookupTables
): boolean {
  const token = tokens[start];
  if (
    token === undefined ||
    token.surface !== "ところ" ||
    token.dictionaryForm !== "ところ" ||
    (token.pos & POS0) !== 名詞
  ) {
    return false;
  }
  if (tokoroSemanticReadingOwnerClaimsHead(tokens, start, lookups)) {
    return true;
  }
  const previous = previousNonSpaceIndex(tokens, start);
  return previous !== null && externalScopeClauseEndsAt(tokens, previous);
}

function tokoroSemanticReadingOwnerClaimsHead(
  tokens: readonly RuntimeHaruToken[],
  headIdx: number,
  lookups: LookupTables
): boolean {
  return tokoroSemanticReadingClaimsHead({
    tokens,
    headIdx,
    headToken: tokens[headIdx],
    lookups
  });
}

function externalScopeClauseEndsAt(
  tokens: readonly RuntimeHaruToken[],
  index: number
): boolean {
  const token = tokens[index];
  if (token === undefined || (token.pos & POS5A) !== 連体形_) {
    return false;
  }
  return !isNamingQuoteLinkEnd(tokens, index) &&
    !isNaAdjectivalAttributiveEnd(tokens, index) &&
    !isLikenessModalAdnominalAttributiveEnd(tokens, index);
}

export function appearanceModalPlaceAspectHeadIsNounPhraseHead(
  tokens: readonly RuntimeHaruToken[],
  headIdx: number
): boolean {
  const nextIdx = nextClauseNonPunctuationIndex(tokens, headIdx + 1, tokens.length);
  const next = nextIdx === null ? undefined : tokens[nextIdx];
  if (next === undefined) {
    return true;
  }
  if ((next.pos & POS0) === 助動詞) {
    const pos4 = next.pos & POS4;
    if (pos4 === 助動詞_ダ || pos4 === 助動詞_デス) {
      return false;
    }
  }
  const particleKind = next.pos & POS01;
  return particleKind === 助詞_格助詞 || particleKind === 助詞_係助詞 || particleKind === 助詞_副助詞;
}

function isLikenessModalAdnominalAttributiveEnd(
  tokens: readonly RuntimeHaruToken[],
  index: number
): boolean {
  if (isLikenessModalAdnominalTailEnd(tokens, index)) {
    return true;
  }
  return isAppearanceModalAdnominalTailEnd(tokens, index) &&
    appearanceModalPlaceAspectHeadIsNounPhraseHead(tokens, index + 1);
}

function isNamingQuoteLinkEnd(
  tokens: readonly RuntimeHaruToken[],
  index: number
): boolean {
  const token = tokens[index];
  if (token === undefined || !isSayVerbToken(token)) {
    return false;
  }
  const markerIdx = previousNonSpaceIndex(tokens, index);
  if (
    markerIdx === null ||
    quoteMarkerRelationAt(tokens, markerIdx, {
      consumers: ["tail_boundary_readiness"]
    }) === null
  ) {
    return false;
  }
  return !isLexicalUtteranceQuoteComplement(tokens, markerIdx);
}

function isLexicalUtteranceQuoteComplement(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number
): boolean {
  const complementIdx = previousNonSpaceIndex(tokens, markerIdx);
  const complement = complementIdx === null ? undefined : tokens[complementIdx];
  if (complement === undefined) {
    return false;
  }
  return isExplicitQuoteClosingToken(complement) ||
    pos0in(complement.pos, PREDICATE_AUX_BITS);
}

function isNaAdjectivalAttributiveEnd(
  tokens: readonly RuntimeHaruToken[],
  index: number
): boolean {
  const copula = tokens[index];
  if (
    copula === undefined ||
    (copula.pos & POS0) !== 助動詞 ||
    copula.dictionaryForm !== "だ"
  ) {
    return false;
  }
  const stemIdx = previousNonSpaceIndex(tokens, index);
  const stem = stemIdx === null ? undefined : tokens[stemIdx];
  return stem !== undefined && isNaAdjCapable(stem) && !isAuxiliaryStemToken(stem);
}

function isExternalNominalizerPredicateChunk(
  tokens: readonly RuntimeHaruToken[],
  start: number
): boolean {
  const token = tokens[start];
  if (
    token === undefined ||
    token.surface !== "対し" ||
    token.dictionaryForm !== "対する" ||
    (token.pos & POS0) !== 動詞
  ) {
    return false;
  }
  for (let idx = Math.max(0, start - 5); idx < start; idx += 1) {
    const relation = externalNominalizerContinuationRelationAt(tokens, idx, {
      requireEnd: false,
      consumers: ["tail_boundary_readiness"]
    });
    if (
      relation?.connectiveKind === "external_nominalizer_comparison" &&
      relation.span.endExclusive > start
    ) {
      const hostIdx = previousNonSpaceIndex(tokens, idx);
      return hostIdx !== null;
    }
  }
  return false;
}

function isExternalQuoteFocusLimitNegationTail(
  cursor: TokenCursor<RuntimeHaruToken>,
  quoteIdx: number
): boolean {
  return quoteFocusLimitNegationTailStartingAt(cursor.fork(quoteIdx, cursor.tokens.length, quoteIdx)) !== null;
}

function isNounishToken(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined && pos0in(token.pos, NOMINAL_BITS);
}
