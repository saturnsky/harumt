import { prenominalModifierChainHeadIndex, separatedFromPreviousModifierChainElement } from "./attributive-head.js";
import { TokenCursor } from "../token-cursor.js";
import { nominalLinkMarkerRelationForToken } from "../head-tail/boundary/marker.js";
import { derivedNominalPhraseHeadIndexAt } from "../head-tail/tail/predicate-root/derivational-suffix-table.js";
import type { LookupTables } from "../lookup-tables.js";
import { isClausePunctuationToken } from "./punctuation.js";
import { nextNonSpaceIndex, DETACHED_SEPARATIONS, hasSourceOrdinalGapBeforeToken, separatedAs } from "./trivia.js";
import { EXPLICIT_OPENING_QUOTATION_SURFACES } from "./quote-delimiters.js";
import { isPureKatakanaSurface } from "../../utils/char-class.js";
import { isPredicateArgumentParticle } from "../head-tail/candidate/semantic-classifiers.js";
import { classifyAttributiveHeadKind, isInferentialBoundAttributiveHead } from "../head-tail/tail/predicate-root/structural-attributive-head-table.js";
import { POS0, POS01, isAdverbCapableNominal, isAttributiveCapableNominalHostToken, isNominalLike, isLexicalBareNaAdjStem, isSahenCapableNominal, isSubstantiveNounToken, isAdnominalGenitiveMarkerToken, pos0in, 形状詞, 形容詞0, 助詞, 接頭辞, 接尾辞, 連体詞, NOMINAL_BITS, 助詞_格助詞 } from "../../types/pos.js";
import type { ClauseToken, LexicalNominalHeadClaims, ClauseNominalClosureAnchor, ClauseNominalHeadAnchor, ProjectionEvidenceClause, ProjectionEvidenceLayout } from "./layout-types.js";
import { isNounishToken } from "./token-evidence.js";
import { isAttributiveHeadNounishToken, type BareKeijoujiAttributiveEvidence, type PrenominalMarkerHeadReach, type PrenominalMarkerHeadReachLayout, nominalBodyStartIndex, type NominalClosurePrefixClassification, isMatchedNominalQuoteBoundary, rangeHasPrenominalPredicateModifier, isNominalClosureListSeparator, isPrenominalPredicateModifierToken, isInternalPredicateConnectiveToken, isAdnominalCopulaAux } from "./nominal-anchor-evidence.js";
import { isPostposedVocativeHead } from "./vocative.js";
import { isInsideClauseOpaqueNominalFrameSurface } from "./nominal-frame-reach.js";
import { detectQuoteSpans } from "./quote-delimiters.js";

function bareKeijoujiDirectAttributiveHostEvidence(
  tokens: readonly ClauseToken[],
  index: number,
  lookups: LookupTables
): BareKeijoujiAttributiveEvidence | null {
  const token = tokens[index];
  if (
    token === undefined ||
    !isLexicalBareNaAdjStem(token) ||
    isInsideClauseOpaqueNominalFrameSurface(tokens, index)
  ) {
    return null;
  }
  return bareDirectAttributiveHeadEvidence(tokens, index, lookups, "na_adjective", "ordinary_nominal_only");
}

function bareNominalDirectAttributiveHostEvidence(
  tokens: readonly ClauseToken[],
  index: number,
  lookups: LookupTables,
  claims: LexicalNominalHeadClaims | undefined
): BareKeijoujiAttributiveEvidence | null {
  const token = tokens[index];
  if (
    token === undefined ||
    claims === undefined ||
    !isAttributiveCapableNominalHostToken(token) ||
    isSahenCapableNominal(token) ||
    isAdverbCapableNominal(token) ||
    !claims.predicateSenseDeclaredAt(index) ||
    isInsideClauseOpaqueNominalFrameSurface(tokens, index)
  ) {
    return null;
  }
  return bareDirectAttributiveHeadEvidence(tokens, index, lookups, "predicate_sense_nominal", "any_head_kind");
}

function bareDirectAttributiveHeadEvidence(
  tokens: readonly ClauseToken[],
  index: number,
  lookups: LookupTables,
  hostClass: BareKeijoujiAttributiveEvidence["hostClass"],
  headKinds: "ordinary_nominal_only" | "any_head_kind"
): BareKeijoujiAttributiveEvidence | null {
  const token = tokens[index]!;
  const head = tokens[index + 1];
  if (
    head === undefined ||
    !isAttributiveHeadNounishToken(head) ||
    !isSubstantiveNounToken(head) ||
    separatedAs(tokens, index + 1, DETACHED_SEPARATIONS) ||
    hasSourceOrdinalGapBeforeToken(tokens, index + 1) ||
    isPostposedVocativeHead(tokens, index + 1, lookups)
  ) {
    return null;
  }
  const headKind = classifyAttributiveHeadKind({
    surface: head.surface,
    dictionaryForm: head.dictionaryForm,
    reading: "",
    dictionaryFormReading: "",
    pos: head.pos,
    dictionaryId: 0,
  });
  if (
    headKinds === "ordinary_nominal_only"
      ? headKind !== "ordinary_nominal"
      : headKind === "reason_or_purpose" || headKind === "likeness" || isInferentialBoundAttributiveHead(head)
  ) {
    return null;
  }
  return {
    hostClass,
    katakanaRun: isPureKatakanaSurface(token.surface) && isPureKatakanaSurface(head.surface)
  };
}

export function isBareKeijoujiDirectAttributiveHost(
  tokens: readonly ClauseToken[],
  index: number,
  lookups: LookupTables
): boolean {
  return bareKeijoujiDirectAttributiveHostEvidence(tokens, index, lookups) !== null;
}

export function bareKeijoujiAttributiveHeadIndices(
  tokens: readonly ClauseToken[],
  lookups: LookupTables,
  lexicalNominalHeadClaims: LexicalNominalHeadClaims | undefined
): ReadonlyMap<number, BareKeijoujiAttributiveEvidence> {
  const heads = new Map<number, BareKeijoujiAttributiveEvidence>();
  for (let index = 0; index + 1 < tokens.length; index += 1) {
    const evidence = bareKeijoujiDirectAttributiveHostEvidence(tokens, index, lookups) ??
      bareNominalDirectAttributiveHostEvidence(tokens, index, lookups, lexicalNominalHeadClaims);
    if (evidence !== null) {
      heads.set(index + 1, evidence);
    }
  }
  return heads;
}

export function isCaseParticleAdnominalLinkAt(tokens: readonly ClauseToken[], index: number): boolean {
  const token = tokens[index];
  const next = tokens[index + 1];
  return token !== undefined && next !== undefined &&
    (token.pos & POS01) === 助詞_格助詞 && isNominalLinkToken(next, index + 1);
}

export function leadingNominalAnchorForRange(
  tokens: readonly ClauseToken[],
  start: number,
  endExclusive: number,
  options: {
    readonly requirePrenominalModifier: boolean;
    readonly allowArgumentParticleBoundary: boolean;
    readonly allowMatchedNominalQuoteBoundary?: boolean;
  }
): ClauseNominalClosureAnchor | null {
  const first = nominalBodyStartIndex(tokens, start, endExclusive);
  if (first === null) {
    return null;
  }
  let best: ClauseNominalClosureAnchor | null = null;
  const c = new TokenCursor(tokens, first, endExclusive);
  while (c.pos < c.end) {
    const token = c.current();
    if (token === undefined) {
      c.advance();
      continue;
    }
    if (!isNounishToken(token)) {
      c.advance();
      continue;
    }
    const prefix = nominalClosurePrefixClassification(tokens, first, c.pos, endExclusive, {
      ...(options.allowMatchedNominalQuoteBoundary === undefined
        ? {}
        : { allowMatchedNominalQuoteBoundary: options.allowMatchedNominalQuoteBoundary })
    });
    if (!prefix.ok) {
      return best;
    }
    if (options.requirePrenominalModifier && !prefix.hasPrenominalModifier) {
      c.advance();
      continue;
    }
    if (!hasLeadingNominalBoundaryAfterHead(tokens, c.pos + 1, endExclusive, options)) {
      c.advance();
      continue;
    }
    best = {
      span: { start: first, endExclusive: c.pos + 1 },
      headIdx: c.pos,
      modifierPredicateIndices: prefix.modifierPredicateIndices,
    };
    c.advance();
  }
  return best;
}

export function leadingNominalHeadAfterToken(
  layout: ProjectionEvidenceLayout,
  tokens: readonly ClauseToken[],
  anchorIdx: number
): number | null {
  return leadingNominalHeadAfterTokenWithOptions(layout, tokens, anchorIdx, {});
}

function leadingNominalHeadAfterTokenWithOptions(
  layout: ProjectionEvidenceLayout,
  tokens: readonly ClauseToken[],
  anchorIdx: number,
  options: { readonly allowMatchedNominalQuoteBoundary?: boolean }
): number | null {
  const clause = layout.clauseOfToken(anchorIdx);
  if (clause === undefined) {
    return null;
  }
  const start = nextNonSpaceIndex(tokens, anchorIdx + 1, clause.end);
  if (start === null) {
    return null;
  }
  if (
    isClausePunctuationToken(tokens[start]) &&
    options.allowMatchedNominalQuoteBoundary !== true
  ) {
    return null;
  }
  if (clause.kind === "relative" && clause.parentIdx !== null) {
    const parent = layout.clauseOfToken(clause.end);
    if (
      parent === undefined ||
      parent.start !== clause.end ||
      layout.clauseIndexOfToken(parent.start) !== clause.parentIdx
    ) {
      return null;
    }
    if (
      isClausePunctuationToken(tokens[start]) &&
      !detectQuoteSpans(tokens).some(([openingIdx, closingIdx]) =>
        openingIdx === start && closingIdx < parent.end
      )
    ) {
      return null;
    }
    const parentAnchor = leadingNominalAnchorForRange(tokens, parent.start, parent.end, {
      requirePrenominalModifier: false,
      allowArgumentParticleBoundary: true,
      ...(options.allowMatchedNominalQuoteBoundary === undefined
        ? {}
        : { allowMatchedNominalQuoteBoundary: options.allowMatchedNominalQuoteBoundary })
    });
    return parentAnchor?.headIdx ?? null;
  }
  if (
    isClausePunctuationToken(tokens[start]) &&
    !detectQuoteSpans(tokens).some(([openingIdx, closingIdx]) =>
      openingIdx === start && closingIdx < clause.end
    )
  ) {
    return null;
  }
  return leadingNominalAnchorForRange(tokens, start, clause.end, {
    requirePrenominalModifier: false,
    allowArgumentParticleBoundary: true,
    ...(options.allowMatchedNominalQuoteBoundary === undefined
      ? {}
      : { allowMatchedNominalQuoteBoundary: options.allowMatchedNominalQuoteBoundary })
  })?.headIdx ?? null;
}

export function prenominalMarkerHeadReachAfterToken<
  T extends ClauseToken & {
    readonly splitA?: readonly T[];
    readonly splitB?: readonly T[];
  }
>(
  layout: PrenominalMarkerHeadReachLayout,
  tokens: readonly T[],
  markerIdx: number,
  lookups: LookupTables
): PrenominalMarkerHeadReach | null {
  const marker = tokens[markerIdx];
  if (marker === undefined || !isAdnominalGenitiveMarkerToken(marker)) {
    return null;
  }
  const clause = layout.clauseOfToken(markerIdx);
  if (clause === undefined) {
    return null;
  }
  const start = markerIdx + 1;
  if (start >= tokens.length) {
    return null;
  }
  if (EXPLICIT_OPENING_QUOTATION_SURFACES.has(tokens[start]?.surface ?? "")) {
    if (separatedFromPreviousModifierChainElement(tokens, start, DETACHED_SEPARATIONS)) {
      return null;
    }
    const anchor = leadingQuoteAttributiveNominalHeadAnchorAfterToken(layout, tokens, markerIdx);
    if (anchor === null) {
      return null;
    }
    const span = layout.balancedDelimiterSpanOpeningAt(start);
    if (span === undefined || anchor.tokenIdx <= span.openingIdx || anchor.tokenIdx >= span.closingIdx) {
      return null;
    }
    return { headIdx: anchor.tokenIdx, arm: "quoted_nominal" };
  }
  const headIdx = adnominalStackHeadIndexFrom(layout, tokens, start, clause);
  if (headIdx === null) {
    return null;
  }
  return { headIdx, arm: headIdx === start ? "direct" : "modifier_chain" };
}

export function adnominalStackHeadIndexFrom<
  T extends ClauseToken & {
    readonly splitA?: readonly T[];
    readonly splitB?: readonly T[];
  }
>(
  layout: PrenominalMarkerHeadReachLayout,
  tokens: readonly T[],
  start: number,
  clause: ProjectionEvidenceClause,
  isUnmarkedAdnominalHostAt?: (idx: number) => boolean
): number | null {
  let reachEnd = clause.end;
  let scope: ProjectionEvidenceClause | undefined = clause;
  while (scope !== undefined && scope.kind === "relative") {
    const parent = layout.clauseOfToken(scope.end);
    if (parent === undefined || parent.start !== scope.end) {
      break;
    }
    reachEnd = parent.end;
    scope = parent;
  }
  return prenominalModifierChainHeadIndex(tokens, start, reachEnd, {
    auxiliaryStem: "opaque",
    separationRefused: DETACHED_SEPARATIONS,
    reach: "adnominal_stack",
    derivedNominalHeadIndexAt: (hostIdx) => derivedNominalPhraseHeadIndexAt(tokens, hostIdx),
    ...(isUnmarkedAdnominalHostAt === undefined ? {} : { isUnmarkedAdnominalHostAt })
  });
}

export function leadingQuoteAttributiveNominalHeadAnchorAfterToken<
  T extends ClauseToken & {
    readonly splitA?: readonly T[];
    readonly splitB?: readonly T[];
  }
>(
  layout: ProjectionEvidenceLayout,
  tokens: readonly T[],
  anchorIdx: number
): ClauseNominalHeadAnchor<T> | null {
  const tokenIdx = leadingNominalHeadAfterTokenWithOptions(layout, tokens, anchorIdx, {
    allowMatchedNominalQuoteBoundary: true
  });
  if (tokenIdx === null) {
    return null;
  }
  const sourceToken = tokens[tokenIdx];
  if (sourceToken === undefined) {
    return null;
  }
  const split = sourceToken.splitB ?? sourceToken.splitA;
  const morphologicalHead = split?.at(-1);
  const headToken = morphologicalHead !== undefined && isNounishToken(morphologicalHead)
    ? morphologicalHead
    : sourceToken;
  return { tokenIdx, sourceToken, headToken };
}

function hasLeadingNominalBoundaryAfterHead(
  tokens: readonly ClauseToken[],
  start: number,
  endExclusive: number,
  options: {
    readonly allowArgumentParticleBoundary: boolean;
    readonly allowMatchedNominalQuoteBoundary?: boolean;
  },
): boolean {
  let index = nextNonSpaceIndex(tokens, start, endExclusive);
  if (
    options.allowMatchedNominalQuoteBoundary === true &&
    index !== null &&
    detectQuoteSpans(tokens).some(([, closingIdx]) => closingIdx === index)
  ) {
    index = nextNonSpaceIndex(tokens, index + 1, endExclusive);
  }
  if (index === null) {
    return true;
  }
  const token = tokens[index];
  if (token === undefined) {
    return true;
  }
  if (isClausePunctuationToken(token)) {
    return true;
  }
  if (!isLeadingNominalContinuationParticle(tokens, index, options)) {
    return false;
  }
  return true;
}

export function nominalClosurePrefixClassification(
  tokens: readonly ClauseToken[],
  start: number,
  head: number,
  endExclusive: number,
  options: {
    readonly allowMatchedNominalQuoteBoundary?: boolean;
    readonly sourceRequiredHead?: boolean;
  } = {},
): NominalClosurePrefixClassification {
  let hasPrenominalModifier = false;
  const modifierPredicateIndices: number[] = [];
  const hasPredicateModifier = rangeHasPrenominalPredicateModifier(tokens, start, head);
  const c = new TokenCursor(tokens, start, head);
  while (c.pos < c.end) {
    const token = c.current();
    if (token === undefined) {
      c.advance();
      continue;
    }
    if (hasPredicateModifier && isPredicateArgumentParticle(token)) {
      c.advance();
      continue;
    }
    if (isNominalLinkToken(token, c.pos)) {
      hasPrenominalModifier = true;
      c.advance();
      continue;
    }
    if (isAdnominalCopulaAux(token)) {
      hasPrenominalModifier = true;
      c.advance();
      continue;
    }
    if (isNominalClosureListSeparator(token)) {
      c.advance();
      continue;
    }
    if (
      options.sourceRequiredHead === true &&
      (((token.pos & POS0) === 接尾辞 && isNominalLike(token)) || isCaseParticleAdnominalLinkAt(tokens, c.pos))
    ) {
      c.advance();
      continue;
    }
    if (
      options.allowMatchedNominalQuoteBoundary === true &&
      isMatchedNominalQuoteBoundary(tokens, c.pos, start, head, endExclusive)
    ) {
      hasPrenominalModifier = true;
      c.advance();
      continue;
    }
    const pos0 = token.pos & POS0;
    if (pos0 === 接頭辞 || pos0 === 連体詞 || pos0 === 形容詞0 || pos0 === 形状詞) {
      hasPrenominalModifier = true;
      c.advance();
      continue;
    }
    if (isPrenominalPredicateModifierToken(tokens, c.pos, head)) {
      hasPrenominalModifier = true;
      modifierPredicateIndices.push(c.pos);
      c.advance();
      continue;
    }
    if (isInternalPredicateConnectiveToken(token)) {
      c.advance();
      continue;
    }
    if (pos0in(pos0, NOMINAL_BITS)) {
      c.advance();
      continue;
    }
    return { ok: false };
  }
  return { ok: true, hasPrenominalModifier, modifierPredicateIndices };
}

export function isNominalLinkToken(token: ClauseToken, index: number): boolean {
  return nominalLinkMarkerRelationForToken(token, index, { consumers: ["clause_layout"] }) !== null;
}

function isLeadingNominalContinuationParticle(
  tokens: readonly ClauseToken[],
  index: number,
  options: { readonly allowArgumentParticleBoundary: boolean },
): boolean {
  const token = tokens[index];
  if (token === undefined) {
    return false;
  }
  if (isNominalLinkToken(token, index)) {
    return false;
  }
  if (options.allowArgumentParticleBoundary && (token.pos & POS0) === 助詞 && token.surface === "を") {
    return true;
  }
  return (token.pos & POS0) === 助詞 && (token.surface === "が" || token.surface === "は" || token.surface === "も");
}
