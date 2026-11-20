import type { LookupTables } from "../lookup-tables.js";
import type { QuoteHostLike } from "../quote/host-registry.js";
import { nextTransparentEvidenceIndex, previousNonSpaceIndex, previousTransparentEvidenceIndex } from "../clause-layout/trivia.js";
import { TokenCursor } from "../token-cursor.js";
import { activeProtoLayout } from "../clause-layout/proto-state.js";
import type { ParticleKey } from "../../generator/particles.js";
import { QuoteHostMatch, markerBoundRelationalHeadSpanEndAt, isNominalSuffixToken } from "../quote/host-taxonomy.js";
import { caseParticleMarkerRelationForToken, nominalLinkMarkerRelationForToken, quoteHostSearchBridgeArgumentRelationAt } from "../head-tail/boundary/marker.js";
import { quoteMarkerRelationAt } from "../head-tail/boundary/quote-marker.js";
import { isAnimateReferentBeforeNi, isAnimateReferentToken, isHumanReferentToken } from "../head-tail/candidate/semantic-classifiers.js";
import { matchQuotedSareruTailAsClauseQuote } from "../quote/reporting-passive.js";
import { isTeConnectiveToken } from "../head-tail/tail/postverb-tail-classifier.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import { POS0, POS01, pos0in, isProperPersonNameToken, POS4, POS5A, PUNCTUATION_BITS, 記号, 助詞, 助詞_準体助詞, 助動詞, 助動詞_ダ, 接続助詞, 接頭辞, 動詞_非自立可能, 補助記号, 連体詞, 連用形_, isLexicalAdverb, isNaAdjCapableNoun, NOMINAL_BITS, INFLECTABLE_AUX_BITS } from "../../types/pos.js";
import { IU_LEXEME_FORMS } from "../head-tail/data/quoted-reporting-sets.js";
import type { QuoteStructuralRelation } from "./quote-payload.js";
import { quoteContentTailStart, posLooksPredicateEvidence } from "./quote-content-span.js";

const TE_SHIMAU_CONTRACTION_FORMS: ReadonlySet<string> = new Set(["ちゃう", "じゃう", "ちまう", "じまう"]);

export function quoteRelationHostHasPassiveAux(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  end: number = tokens.length
): boolean {
  return quoteHostHasPassiveAuxInRange(tokens, relation.quote.hostMatch.hostIdx + 1, end);
}

export function quoteHostAllowsBareNominalContent(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  lookups: LookupTables
): boolean {
  const registry = lookups.QUOTE_HOST_REGISTRY;
  const host = relation.quote.hostMatch;
  if (
    quoteMarkerPreemptedByNearerQuoteMarker(tokens, relation, lookups) ||
    quoteHostUnreachableFromMarkerClause(tokens, relation)
  ) {
    return false;
  }
  if (registry.hostHasCapability(host, "bare_nominal_quote")) {
    return true;
  }
  if (
    registry.hostHasCapability(host, "bare_nominal_passive_quote") &&
    quoteHostHasBareNominalPassiveEvidence(tokens, relation, lookups)
  ) {
    return true;
  }
  if (
    relation.quote.markerBaseSurface === "って" &&
    registry.hostHasCapability(host, "bare_nominal_colloquial_quote")
  ) {
    return true;
  }
  if (
    registry.hostHasCapability(host, "bare_nominal_hearsay_quote") &&
    quoteHostHasBareNominalHearsayEvidence(tokens, relation, lookups)
  ) {
    return true;
  }
  if (
    registry.hostHasCapability(host, "bare_nominal_object_label_quote") &&
    quoteHostHasLabelableObjectArgumentBeforeMarker(tokens, relation, lookups)
  ) {
    return true;
  }
  if (
    registry.hostHasCapability(host, "bare_nominal_focus_quote") &&
    quoteHostHasBareNominalFocusEvidence(relation)
  ) {
    return true;
  }
  return false;
}

function quoteHostHasBareNominalFocusEvidence(relation: QuoteStructuralRelation): boolean {
  return relation.quote.focusParticle === "でも";
}

export function quoteStructuralRelationLooksBareNominalContent(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation
): boolean {
  if (relation.quote.markerBaseSurface !== "と" && relation.quote.markerBaseSurface !== "って") {
    return false;
  }
  if (relation.quote.slotKind !== "quoted_content" || relation.quote.contentSpan.endExclusive !== relation.quote.markerIdx) {
    return false;
  }
  const phraseStart = quoteContentTailStart(tokens, relation.quote.contentSpan.start, relation.quote.contentSpan.endExclusive);
  if (phraseStart === null) {
    return false;
  }
  if (quoteContentTailIsPredicateBoundTame(tokens, relation, phraseStart)) {
    return false;
  }
  let sawNominalHead = false;
  const nominalCursor = new TokenCursor(tokens, phraseStart, relation.quote.contentSpan.endExclusive);
  while (nominalCursor.pos < nominalCursor.end) {
    const index = nominalCursor.pos;
    const token = nominalCursor.current();
    const pos0 = (token?.pos ?? 0) & POS0;
    nominalCursor.advance();
    if (pos0in(pos0, NOMINAL_BITS)) {
      sawNominalHead = true;
      continue;
    }
    if (pos0 === 接頭辞 || pos0 === 連体詞 || isNominalSuffixToken(token)) {
      continue;
    }
    if (nominalLinkMarkerRelationForToken(token, index, { consumers: ["quote_content"] }) !== null) {
      continue;
    }
    return false;
  }
  return sawNominalHead;
}

function quoteBareNominalContentHasAdjectivalDistribution(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation
): boolean {
  if (!quoteStructuralRelationLooksBareNominalContent(tokens, relation)) {
    return false;
  }
  const phraseStart = quoteContentTailStart(tokens, relation.quote.contentSpan.start, relation.quote.contentSpan.endExclusive);
  if (phraseStart === null) {
    return false;
  }
  const adjCursor = new TokenCursor(tokens, phraseStart, relation.quote.contentSpan.endExclusive);
  while (adjCursor.pos < adjCursor.end) {
    const token = adjCursor.current();
    const pos0 = (token?.pos ?? 0) & POS0;
    adjCursor.advance();
    if (token !== undefined && pos0in(pos0, NOMINAL_BITS) && isNaAdjCapableNoun(token)) {
      return true;
    }
  }
  return false;
}

export function quoteContentRightEdgeHasAdjectivalDistribution(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation
): boolean {
  if (
    relation.quote.markerBaseSurface !== "と" ||
    relation.quote.slotKind !== "quoted_content" ||
    relation.quote.contentSpan.endExclusive !== relation.quote.markerIdx
  ) {
    return false;
  }
  const headIdx = previousNonSpaceIndex(tokens, relation.quote.markerIdx, relation.quote.contentSpan.start);
  if (headIdx === null) {
    return false;
  }
  const token = tokens[headIdx];
  return token !== undefined && pos0in(token.pos & POS0, NOMINAL_BITS) && isNaAdjCapableNoun(token);
}

function quoteContentTailIsPredicateBoundTame(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  tailStart: number,
): boolean {
  const tailHead = onlyContentTokenInSpan(tokens, tailStart, relation.quote.contentSpan.endExclusive);
  if (tailHead === null) {
    return false;
  }
  const token = tokens[tailHead];
  const form = token?.dictionaryForm || token?.surface;
  if (form !== "ため" && form !== "為") {
    return false;
  }
  const predCursor = new TokenCursor(tokens, relation.quote.contentSpan.start, tailStart);
  while (predCursor.pos < predCursor.end) {
    if (posLooksPredicateEvidence(predCursor.current()?.pos ?? 0)) {
      return true;
    }
    predCursor.advance();
  }
  return false;
}

function onlyContentTokenInSpan(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  endExclusive: number,
): number | null {
  let only: number | null = null;
  const onlyCursor = new TokenCursor(tokens, start, endExclusive);
  while (onlyCursor.pos < onlyCursor.end) {
    const index = onlyCursor.pos;
    onlyCursor.advance();
    if (only !== null) {
      return null;
    }
    only = index;
  }
  return only;
}

function quoteHostHasBareNominalHearsayEvidence(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  lookups: LookupTables
): boolean {
  if (
    relation.quote.hostMatch.kind !== "question" ||
    !quoteStructuralRelationLooksBareNominalContent(tokens, relation) ||
    !quoteMarkerBelongsToHostPredicate(tokens, relation)
  ) {
    return false;
  }
  return !quoteHostHasSamePredicateObjectArgument(tokens, relation) &&
    !quoteHostHasCompanionCueBetweenMarkerAndHost(tokens, relation, lookups) &&
    !quoteBareNominalContentFillsHostCompanionSlot(tokens, relation, lookups);
}

function quoteBareNominalContentFillsHostCompanionSlot(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  lookups: LookupTables
): boolean {
  const headIdx = previousNominalHeadBefore(tokens, relation.quote.markerIdx, relation.quote.contentSpan.start);
  const head = headIdx === null ? undefined : tokens[headIdx];
  if (head === undefined || !isProperPersonNameToken(head) || !isHumanReferentToken(head, lookups)) {
    return false;
  }
  return quoteHostHasAdditiveParticipantBetweenMarkerAndHost(tokens, relation, lookups);
}

function quoteHostHasAdditiveParticipantBetweenMarkerAndHost(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  lookups: LookupTables
): boolean {
  const clause = activeProtoLayout()?.clauseContaining(relation.quote.hostMatch.hostIdx);
  const hostStart = relation.quote.hostMatch.supportIdx ?? relation.quote.hostMatch.hostIdx;
  const end = Math.min(hostStart, clause?.end ?? hostStart);
  for (let index = relation.quote.markerIdx + 1; index < end; index += 1) {
    const headIdx = previousNominalHeadBefore(tokens, index, relation.quote.markerIdx + 1);
    const participant = headIdx === null ? undefined : tokens[headIdx];
    if (headIdx === null || participant === undefined || !isAnimateReferentToken(participant, lookups)) {
      continue;
    }
    const bridge = quoteHostSearchBridgeArgumentRelationAt(tokens, index, {
      consumers: ["quote_content"],
      headIdx
    });
    if (bridge?.argumentKind === "subject_topic" && bridge.surface === "も") {
      return true;
    }
  }
  return false;
}

export function quoteHostHasBareNominalPassiveEvidence(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  lookups: LookupTables
): boolean {
  if (!quoteReportingPassiveHostNeedsCompanionDisambiguation(relation.quote.hostMatch, lookups)) {
    return quoteRelationHostHasPassiveAux(tokens, relation);
  }
  if (!quoteStructuralRelationLooksBareNominalContent(tokens, relation)) {
    return false;
  }
  return quoteReportingPassiveMarkerEvidence(tokens, relation, lookups);
}

export function quoteReportingPassiveMarkerEvidence(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  lookups: LookupTables
): boolean {
  if (
    relation.quote.markerBaseSurface !== "と" ||
    !quoteRelationHostHasPassiveAux(tokens, relation) ||
    !quoteMarkerBelongsToHostPredicate(tokens, relation) ||
    !quoteMarkerImmediatelyPrecedesHost(tokens, relation)
  ) {
    return false;
  }
  return !quoteHostHasSamePredicateObjectArgument(tokens, relation) &&
    !quoteHostHasCompanionCueBetweenMarkerAndHost(tokens, relation, lookups);
}

export function quoteReportingPassiveHostNeedsCompanionDisambiguation(
  host: QuoteHostLike,
  lookups: LookupTables
): boolean {
  return lookups.QUOTE_HOST_REGISTRY.hostHasCapability(host, "companion_disambiguated_passive_quote");
}

function quoteMarkerImmediatelyPrecedesHost(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation
): boolean {
  const hostStart = relation.quote.hostMatch.supportIdx ?? relation.quote.hostMatch.hostIdx;
  const next = nextTransparentEvidenceIndex(tokens, relation.quote.markerIdx + 1, {
    endExclusive: hostStart + 1,
    isTransparentToken: (token) => {
      const pos0 = token.pos & POS0;
      return pos0 === 補助記号 || pos0 === 記号;
    }
  });
  return next?.index === hostStart;
}

function quoteMarkerPreemptedByNearerQuoteMarker(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  lookups: LookupTables
): boolean {
  const proto = activeProtoLayout();
  const clause = proto?.clauseContaining(relation.quote.hostMatch.hostIdx);
  if (proto === null || clause === undefined) {
    return false;
  }
  const hostStart = relation.quote.hostMatch.supportIdx ?? relation.quote.hostMatch.hostIdx;
  for (const particleIdx of clause.particleIndices) {
    if (particleIdx <= relation.quote.markerIdx || particleIdx >= hostStart) {
      continue;
    }
    if (quoteMarkerRelationAt(tokens, particleIdx, { consumers: ["quote_content"] }) === null) {
      continue;
    }
    if (companionCueFollowsMarker(tokens, particleIdx, hostStart, lookups)) {
      continue;
    }
    return true;
  }
  return false;
}

function companionCueFollowsMarker(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number,
  endExclusive: number,
  lookups: LookupTables
): boolean {
  const evidence = nextTransparentEvidenceIndex(tokens, markerIdx + 1, {
    endExclusive,
    isTransparentToken: (token) => {
      const pos0 = token.pos & POS0;
      return pos0 === 補助記号 || pos0 === 記号;
    }
  });
  if (evidence === null) {
    return false;
  }
  return companionCueSpanEndAt(tokens, evidence.index, endExclusive, lookups) !== null;
}

function quoteHostUnreachableFromMarkerClause(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation
): boolean {
  const proto = activeProtoLayout();
  if (proto === null) {
    return false;
  }
  const hostClauseIdx = proto.clauseIndexOfToken(relation.quote.hostMatch.hostIdx);
  const hostClause = hostClauseIdx < 0 ? undefined : proto.protoClauses[hostClauseIdx];
  if (hostClause === undefined || hostClause.kind !== "relative") {
    return false;
  }
  if (relation.quote.markerIdx >= hostClause.start && relation.quote.markerIdx < hostClause.end) {
    return false;
  }
  return !quoteMarkerClauseSuppliesHostArgument(tokens, relation);
}

function quoteMarkerClauseSuppliesHostArgument(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation
): boolean {
  const proto = activeProtoLayout();
  const clause = proto?.clauseContaining(relation.quote.markerIdx);
  if (proto === null || clause === undefined) {
    return false;
  }
  for (const particleIdx of clause.particleIndices) {
    if (particleIdx === relation.quote.markerIdx) {
      continue;
    }
    if (
      caseParticleMarkerRelationForToken(tokens[particleIdx], particleIdx, {
        consumers: ["quote_content"]
      }) === null
    ) {
      continue;
    }
    const ownerPredicateIdx = proto.followingPredicateEvidenceIndexAfter(tokens, particleIdx, {
      limit: relation.quote.hostMatch.hostIdx + 1
    });
    if (ownerPredicateIdx === relation.quote.hostMatch.hostIdx) {
      return true;
    }
  }
  return false;
}

function quoteMarkerBelongsToHostPredicate(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation
): boolean {
  const proto = activeProtoLayout();
  if (proto === null) {
    return false;
  }
  const ownerPredicateIdx = proto.followingPredicateEvidenceIndexAfter(tokens, relation.quote.markerIdx, {
    limit: relation.quote.hostMatch.hostIdx + 1
  });
  return ownerPredicateIdx === relation.quote.hostMatch.hostIdx;
}

function quoteHostHasSamePredicateObjectArgument(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation
): boolean {
  const proto = activeProtoLayout();
  const clause = proto?.clauseContaining(relation.quote.hostMatch.hostIdx);
  if (proto === null || clause === undefined) {
    return false;
  }
  for (const particleIdx of clause.particleIndices) {
    if (particleIdx >= relation.quote.hostMatch.hostIdx || particleIdx === relation.quote.markerIdx) {
      continue;
    }
    if (
      caseParticleMarkerRelationForToken(tokens[particleIdx], particleIdx, {
        acceptedSurfaces: ["を"],
        consumers: ["quote_content"]
      }) === null
    ) {
      continue;
    }
    const ownerPredicateIdx = proto.followingPredicateEvidenceIndexAfter(tokens, particleIdx, {
      limit: relation.quote.hostMatch.hostIdx + 1
    });
    if (ownerPredicateIdx === relation.quote.hostMatch.hostIdx) {
      return true;
    }
  }
  return false;
}

function companionCueSpanEndAt(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  endExclusive: number,
  lookups: LookupTables
): number | null {
  return markerBoundRelationalHeadSpanEndAt(
    tokens, idx, endExclusive, lookups, ["bare_nominal_hearsay_companion_cues"]
  );
}

function quoteHostHasCompanionCueBetweenMarkerAndHost(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  lookups: LookupTables
): boolean {
  const proto = activeProtoLayout();
  const clause = proto?.clauseContaining(relation.quote.hostMatch.hostIdx);
  const hostStart = relation.quote.hostMatch.supportIdx ?? relation.quote.hostMatch.hostIdx;
  const end = Math.min(hostStart, clause?.end ?? hostStart);
  let index = relation.quote.markerIdx + 1;
  while (index < end) {
    const evidence = nextTransparentEvidenceIndex(tokens, index, {
      endExclusive: end,
      isTransparentToken: (token) => {
        const pos0 = token.pos & POS0;
        return pos0 === 補助記号 || pos0 === 記号;
      }
    });
    if (evidence === null) {
      return false;
    }
    index = evidence.index;
    const token = tokens[index];
    if (token === undefined) {
      return false;
    }
    if (companionCueSpanEndAt(tokens, index, end, lookups) !== null) {
      return true;
    }
    index += 1;
  }
  return false;
}

function quoteHostHasLabelableObjectArgumentBeforeMarker(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  lookups: LookupTables
): boolean {
  const proto = activeProtoLayout();
  const clause = proto?.clauseContaining(relation.quote.hostMatch.hostIdx);
  if (proto === null || clause === undefined) {
    return false;
  }
  for (const particleIdx of clause.particleIndices) {
    if (particleIdx >= relation.quote.markerIdx || particleIdx >= relation.quote.hostMatch.hostIdx) {
      continue;
    }
    if (
      caseParticleMarkerRelationForToken(tokens[particleIdx], particleIdx, {
        acceptedSurfaces: ["を"],
        consumers: ["quote_content"]
      }) !== null
    ) {
      const ownerPredicateIdx = proto.followingPredicateEvidenceIndexAfter(tokens, particleIdx, {
        limit: relation.quote.hostMatch.hostIdx + 1
      });
      if (ownerPredicateIdx !== relation.quote.hostMatch.hostIdx) {
        continue;
      }
      const objectHeadIdx = previousNominalHeadBefore(tokens, particleIdx, clause.start);
      const objectHead = objectHeadIdx === null ? undefined : tokens[objectHeadIdx];
      const objectForm = objectHead?.dictionaryForm || objectHead?.surface;
      return lookups.QUOTE_HOST_REGISTRY.evidenceSetHas("bare_nominal_object_label_object_nouns", objectForm);
    }
  }
  return false;
}

function previousNominalHeadBefore(
  tokens: readonly RuntimeHaruToken[],
  beforeIdx: number,
  lowerBound: number
): number | null {
  const evidence = previousTransparentEvidenceIndex(tokens, beforeIdx, {
    lowerBoundInclusive: lowerBound,
    isTransparentToken: (token) => isNominalSuffixToken(token)
  });
  if (evidence === null) {
    return null;
  }
  const token = tokens[evidence.index];
  if (token !== undefined && (pos0in(token.pos, NOMINAL_BITS))) {
    return evidence.index;
  }
  return null;
}

function quoteHostHasPassiveAuxInRange(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  end: number
): boolean {
  let index = pos;
  while (index < end) {
    const evidence = nextTransparentEvidenceIndex(tokens, index, { endExclusive: end });
    if (evidence === null) {
      return false;
    }
    index = evidence.index;
    const token = tokens[index];
    if (token === undefined) {
      return false;
    }
    if ((token.pos & POS0) === 助動詞) {
      const form = token.dictionaryForm || token.surface;
      if (form === "れる" || form === "られる") {
        return true;
      }
      index += 1;
      continue;
    }
    if (pos0in(token.pos, (1 << 助詞) | PUNCTUATION_BITS)) {
      return false;
    }
    return false;
  }
  return false;
}

export function quoteReportingPassiveIsBeTold(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  lookups: LookupTables
): boolean {
  return !quoteRelationHostIsAttributive(tokens, relation) &&
    quoteReportingPassiveHostEventIsBeTold(tokens, relation, lookups);
}

export function quoteReportingPassiveHostRealizesBeTold(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  lookups: LookupTables,
  committedContentBeTold: boolean | null
): boolean {
  if (quoteRelationHostIsAttributive(tokens, relation)) {
    return quoteReportingPassiveHostEventIsBeTold(tokens, relation, lookups);
  }
  return committedContentBeTold ?? quoteReportingPassiveIsBeTold(tokens, relation, lookups);
}

export function quoteReportingPassiveHostEventIsBeTold(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  lookups: LookupTables
): boolean {
  if (
    relation.quote.slotKind !== "quoted_content" ||
    !quoteRelationHostIsIu(relation) ||
    !quoteRelationHostHasPassiveAux(tokens, relation)
  ) {
    return false;
  }
  if (quoteRelationHasAnimateNiAgent(tokens, relation, lookups)) {
    return true;
  }
  if (quoteRelationHostHasNominalizerTail(tokens, relation)) {
    return true;
  }
  if (quoteRelationHostHasTeIruAux(tokens, relation)) {
    return false;
  }
  if (quoteRelationHostHasTeFormConnectiveTail(tokens, relation)) {
    return true;
  }
  if (quoteRelationLooksBareNominalLabel(tokens, relation)) {
    return false;
  }
  return quoteRelationHostHasPastAux(tokens, relation);
}

function quoteRelationHostHasTeFormConnectiveTail(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation
): boolean {
  let index = relation.quote.hostMatch.hostIdx + 1;
  while (index < tokens.length) {
    const token = tokens[index];
    if (token === undefined) {
      return false;
    }
    const pos0 = token.pos & POS0;
    if (isTeConnectiveToken(token)) {
      return !teFollowedByStateAspectAux(tokens, index + 1);
    }
    if (TE_SHIMAU_CONTRACTION_FORMS.has(token.dictionaryForm || token.surface)) {
      return teShimauFollowedByConnectiveContinuation(tokens, index + 1);
    }
    if (pos0 === 助動詞 || (token.pos & POS01) === 動詞_非自立可能) {
      index += 1;
      continue;
    }
    return false;
  }
  return false;
}

function teFollowedByStateAspectAux(
  tokens: readonly RuntimeHaruToken[],
  from: number
): boolean {
  let index = from;
  while (index < tokens.length) {
    const token = tokens[index];
    if (token === undefined) {
      return false;
    }
    const form = token.dictionaryForm || token.surface;
    return form === "いる" || form === "てる" || form === "おる" || form === "居る";
  }
  return false;
}

function teShimauFollowedByConnectiveContinuation(
  tokens: readonly RuntimeHaruToken[],
  from: number
): boolean {
  let index = from;
  while (index < tokens.length) {
    const token = tokens[index];
    if (token === undefined) {
      return false;
    }
    const pos0 = token.pos & POS0;
    if ((token.pos & POS01) === (助詞 | 接続助詞) || isTeConnectiveToken(token)) {
      return true;
    }
    if (pos0 === 助動詞 || (token.pos & POS01) === 動詞_非自立可能) {
      index += 1;
      continue;
    }
    return false;
  }
  return false;
}

function quoteRelationHostHasNominalizerTail(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation
): boolean {
  let index = relation.quote.hostMatch.hostIdx + 1;
  while (index < tokens.length) {
    const token = tokens[index];
    if (token === undefined) {
      return false;
    }
    const pos0 = token.pos & POS0;
    if ((token.pos & POS01) === 助詞_準体助詞) {
      return true;
    }
    if (pos0 === 助動詞 || (token.pos & POS01) === 動詞_非自立可能) {
      index += 1;
      continue;
    }
    return false;
  }
  return false;
}

function quoteRelationHostHasPastAux(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation
): boolean {
  let index = relation.quote.hostMatch.hostIdx + 1;
  while (index < tokens.length) {
    const token = tokens[index];
    if (token === undefined) {
      return false;
    }
    const pos0 = token.pos & POS0;
    if (pos0 === 助動詞 || pos0 === 助詞 || (token.pos & POS01) === 動詞_非自立可能) {
      if ((token.dictionaryForm || token.surface) === "た") {
        return true;
      }
      index += 1;
      continue;
    }
    return false;
  }
  return false;
}

function quoteRelationHostIsAttributive(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation
): boolean {
  let index = relation.quote.hostMatch.hostIdx + 1;
  while (index < tokens.length) {
    const token = tokens[index];
    if (token === undefined) {
      return false;
    }
    const pos0 = token.pos & POS0;
    if (pos0 === 助動詞 || (token.pos & POS01) === 動詞_非自立可能) {
      index += 1;
      continue;
    }
    return pos0in(pos0, NOMINAL_BITS);
  }
  return false;
}

function quoteRelationHostIsIu(relation: QuoteStructuralRelation): boolean {
  return IU_LEXEME_FORMS.has(relation.quote.hostMatch.hostForm);
}

function quoteRelationHostHasTeIruAux(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation
): boolean {
  let index = relation.quote.hostMatch.hostIdx + 1;
  while (index < tokens.length) {
    const token = tokens[index];
    if (token === undefined) {
      return false;
    }
    const pos0 = token.pos & POS0;
    if (pos0 === 助動詞 || pos0 === 助詞 || (token.pos & POS01) === 動詞_非自立可能) {
      const form = token.dictionaryForm || token.surface;
      if (form === "いる" || form === "てる" || form === "おる" || form === "居る") {
        return true;
      }
      index += 1;
      continue;
    }
    return false;
  }
  return false;
}

function quoteRelationHasAnimateNiAgent(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  lookups: LookupTables
): boolean {
  const proto = activeProtoLayout();
  const hostIdx = relation.quote.hostMatch.hostIdx;
  const clause = proto?.clauseContaining(hostIdx);
  const contentStart = relation.quote.contentSpan.start;
  const markerIdx = relation.quote.markerIdx;
  if (proto !== null && clause !== undefined) {
    for (const particleIdx of clause.particleIndices) {
      if (particleIdx >= hostIdx || (particleIdx >= contentStart && particleIdx <= markerIdx)) {
        continue;
      }
      if (
        caseParticleMarkerRelationForToken(tokens[particleIdx], particleIdx, {
          acceptedSurfaces: ["に"],
          consumers: ["quote_content"]
        }) !== null &&
        isAnimateReferentBeforeNi(tokens, particleIdx, lookups)
      ) {
        return true;
      }
    }
    return false;
  }
  for (let index = markerIdx + 1; index < hostIdx; index += 1) {
    if (
      caseParticleMarkerRelationForToken(tokens[index], index, {
        acceptedSurfaces: ["に"],
        consumers: ["quote_content"]
      }) !== null &&
      isAnimateReferentBeforeNi(tokens, index, lookups)
    ) {
      return true;
    }
  }
  return false;
}

export function quoteRelationLooksBareNominalLabel(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation
): boolean {
  if (relation.quote.markerSurface === "とかって") {
    return false;
  }
  if (quoteRelationHasCopulaAux(tokens, relation)) {
    return false;
  }
  if (quoteRelationLooksPredicateBoundTame(tokens, relation)) {
    return false;
  }
  const last = previousNonSpaceIndex(tokens, relation.quote.markerIdx, relation.quote.contentSpan.start);
  if (last === null || last < relation.quote.contentSpan.start) {
    return false;
  }
  const pos0 = (tokens[last]?.pos ?? 0) & POS0;
  return pos0in(pos0, NOMINAL_BITS);
}

function quoteRelationLooksPredicateBoundTame(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation
): boolean {
  const last = previousNonSpaceIndex(tokens, relation.quote.markerIdx, relation.quote.contentSpan.start);
  const tail = last === null ? undefined : tokens[last];
  const tailForm = tail?.dictionaryForm || tail?.surface;
  if (last === null || (tailForm !== "ため" && tailForm !== "為")) {
    return false;
  }
  for (let index = relation.quote.contentSpan.start; index < last; index += 1) {
    const pos0 = ((tokens[index]?.pos ?? 0) & POS0);
    if (pos0in(pos0, INFLECTABLE_AUX_BITS)) {
      return true;
    }
  }
  return false;
}

function quoteRelationHasCopulaAux(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation
): boolean {
  for (let index = relation.quote.contentSpan.start; index < relation.quote.markerIdx; index += 1) {
    const token = tokens[index];
    if (token === undefined || (token.pos & (POS0 | POS4)) !== (助動詞 | 助動詞_ダ)) {
      continue;
    }
    if ((token.pos & POS5A) === 連用形_) {
      continue;
    }
    return true;
  }
  return false;
}

export function quoteRelationContentLooksLabelIsh(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation
): boolean {
  return quoteRelationLooksBareNominalLabel(tokens, relation) || quoteRelationHasCopulaAux(tokens, relation);
}

export function quoteNominalRoleParticleFromRelation(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  lookups: LookupTables
): ParticleKey | null {
  if (
    relation.quote.markerBaseSurface !== "と" ||
    !quoteReportingPassiveHostNeedsCompanionDisambiguation(relation.quote.hostMatch, lookups) ||
    !quoteHostHasBareNominalPassiveEvidence(tokens, relation, lookups) ||
    quoteBareNominalContentHasAdjectivalDistribution(tokens, relation)
  ) {
    return null;
  }
  return "으로/로";
}

export function quoteStructuralRelationLooksAdverbialToContent(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation
): boolean {
  if (
    relation.quote.slotKind !== "quoted_content" ||
    relation.quote.contentSpan.endExclusive !== relation.quote.markerIdx ||
    relation.quote.markerBaseSurface !== "と"
  ) {
    return false;
  }
  const tailStart = quoteContentTailStart(tokens, relation.quote.contentSpan.start, relation.quote.contentSpan.endExclusive);
  if (tailStart === null) {
    return false;
  }
  let adverbIdx: number | null = null;
  let index = tailStart;
  while (index < relation.quote.contentSpan.endExclusive) {
    const evidence = nextTransparentEvidenceIndex(tokens, index, {
      endExclusive: relation.quote.contentSpan.endExclusive
    });
    if (evidence === null) {
      return adverbIdx !== null;
    }
    index = evidence.index;
    const token = tokens[index];
    if (token === undefined) {
      return adverbIdx !== null;
    }
    if (adverbIdx !== null || !isLexicalAdverb(token)) {
      return false;
    }
    adverbIdx = index;
    index += 1;
  }
  const token = adverbIdx === null ? undefined : tokens[adverbIdx];
  return token !== undefined;
}

export function quoteHostMatchForPassiveSareru(
  cursor: TokenCursor<RuntimeHaruToken>
): QuoteHostMatch | null {
  const match = matchQuotedSareruTailAsClauseQuote(cursor);
  if (match === null) {
    return null;
  }
  const { tokens } = cursor;
  const [predicateIdx] = match;
  return new QuoteHostMatch("report", tokens[predicateIdx]?.dictionaryForm || "する", predicateIdx);
}
