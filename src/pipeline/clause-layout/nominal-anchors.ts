import { separatedFromPreviousModifierChainElement } from "./attributive-head.js";
import { TokenCursor } from "../token-cursor.js";
import { admittedNominalFrameMarkerEndsAt } from "../head-tail/tail/segments/nominal-frame.js";
import { derivedNominalPhraseHeadIndexAt } from "../head-tail/tail/predicate-root/derivational-suffix-table.js";
import { compositeConnectivePatternRelationAt } from "../head-tail/tail/connective-span-scanner.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import type { LookupTables } from "../lookup-tables.js";
import { isClausePunctuationToken } from "./punctuation.js";
import { nextNonSpaceIndex, DETACHED_SEPARATIONS, hasSourceOrdinalGapBeforeToken, separatedAs } from "./trivia.js";
import { POS0, POS01, isNaAdjCapableNoun, isAttributiveCapableNominalHostToken, isLexicalPureNaAdjStem, isAdnominalGenitiveMarkerToken, 助詞, 助動詞, 助詞_副助詞, 助詞_格助詞, 助詞_係助詞 } from "../../types/pos.js";
import type { ClauseToken, ClauseNominalClosureAnchor } from "./layout-types.js";
import { isNounishToken } from "./token-evidence.js";
import { type PunctuatedAttributiveTargetReach, nominalSuffixRunEnd, type PunctuatedAttributiveTargetClause, adjacentRelativeParentClause, type PrenominalMarkerHeadReach, type PrenominalMarkerHeadReachLayout, type ExplicitAdnominalNoHostClass, type ExplicitAdnominalNoLayout, type ExplicitAdnominalNoAttributiveEvidence, nominalBodyStartIndex, nominalClosureHeadIndex, nominalClosureSuffixIsTerminal, isNominalClosureListSeparator } from "./nominal-anchor-evidence.js";
import { isBareKeijoujiDirectAttributiveHost, isCaseParticleAdnominalLinkAt, leadingNominalAnchorForRange, prenominalMarkerHeadReachAfterToken, adnominalStackHeadIndexFrom, nominalClosurePrefixClassification, isNominalLinkToken } from "./prenominal-head-reach.js";
import type { ProtoClauseLayout } from "./proto-layout.js";

export function nominalClosureAnchorForProtoClause(
  tokens: readonly ClauseToken[],
  proto: ProtoClauseLayout,
  clauseIndex: number
): ClauseNominalClosureAnchor | null {
  const protoClause = proto.protoClauses[clauseIndex];
  if (protoClause === undefined) {
    return null;
  }
  if (protoClause.kind === "relative") {
    if (protoClause.parentIdx === null || protoClause.parentIdx !== clauseIndex + 1) {
      return null;
    }
    const parentClause = proto.protoClauses[protoClause.parentIdx];
    if (parentClause === undefined || protoClause.end !== parentClause.start) {
      return null;
    }
    const parentAnchor = nominalClosureAnchorForRange(tokens, parentClause.start, parentClause.end, {
      requirePrenominalModifier: false,
    });
    if (parentAnchor === null) {
      return null;
    }
    return {
      span: {
        start: protoClause.start,
        endExclusive: parentAnchor.span.endExclusive,
      },
      headIdx: parentAnchor.headIdx,
      modifierPredicateIndices: parentAnchor.modifierPredicateIndices,
    };
  }
  return nominalClosureAnchorForRange(tokens, protoClause.start, protoClause.end, {
    requirePrenominalModifier: true,
  });
}

export function punctuatedAttributiveTargetAnchor(
  tokens: readonly ClauseToken[],
  clauses: readonly PunctuatedAttributiveTargetClause[],
  targetClauseIndex: number,
  reach: PunctuatedAttributiveTargetReach = "salient_nominal"
): ClauseNominalClosureAnchor | null {
  if (reach === "source_required_head") {
    return sourceRequiredHeadTargetAnchor(tokens, clauses, targetClauseIndex);
  }
  const targetClause = clauses[targetClauseIndex];
  if (targetClause === undefined) {
    return null;
  }
  const relativeTarget = targetClause.kind === "relative";
  const modifierPredicateIndices: number[] = [];
  let currentIdx = targetClauseIndex;
  for (let step = 0; step < clauses.length; step += 1) {
    const current = clauses[currentIdx];
    if (current === undefined) {
      return null;
    }
    const targetStep = currentIdx === targetClauseIndex;
    const linkedParent = adjacentRelativeParentClause(tokens, clauses, currentIdx);
    const closureAnchor = targetStep && relativeTarget
      ? (linkedParent === null
        ? null
        : nominalClosureAnchorForRange(tokens, linkedParent.start, linkedParent.end, {
          requirePrenominalModifier: false,
        }))
      : nominalClosureAnchorForRange(tokens, current.start, current.end, {
        requirePrenominalModifier: targetStep,
      });
    const anchor = closureAnchor ??
      leadingNominalAnchorForRange(tokens, current.start, current.end, {
        requirePrenominalModifier: targetStep,
        allowArgumentParticleBoundary: relativeTarget,
      });
    if (anchor !== null) {
      return {
        span: { start: targetClause.start, endExclusive: anchor.span.endExclusive },
        headIdx: anchor.headIdx,
        modifierPredicateIndices: [...modifierPredicateIndices, ...anchor.modifierPredicateIndices],
      };
    }
    if (linkedParent === null) {
      return null;
    }
    if (
      !targetStep &&
      (current.particleIndices.length > 0 || current.adverbialAdjunctIndices.length > 0)
    ) {
      return null;
    }
    const modifierPredicate = current.predicates.at(-1);
    if (modifierPredicate !== undefined) {
      modifierPredicateIndices.push(modifierPredicate);
    }
    currentIdx += 1;
  }
  return null;
}

function sourceRequiredHeadTargetAnchor(
  tokens: readonly ClauseToken[],
  clauses: readonly PunctuatedAttributiveTargetClause[],
  targetClauseIndex: number
): ClauseNominalClosureAnchor | null {
  const targetClause = clauses[targetClauseIndex];
  if (targetClause === undefined) {
    return null;
  }
  const withTargetStart = (anchor: ClauseNominalClosureAnchor, modifiers: readonly number[]): ClauseNominalClosureAnchor => ({
    span: { start: targetClause.start, endExclusive: anchor.span.endExclusive },
    headIdx: anchor.headIdx,
    modifierPredicateIndices: [...modifiers, ...anchor.modifierPredicateIndices],
  });
  if (targetClause.kind !== "relative") {
    const anchor = sourceRequiredHeadNominalAnchorForRange(tokens, targetClause.start, targetClause.end);
    return anchor === null ? null : withTargetStart(anchor, []);
  }
  const modifierPredicateIndices: number[] = [];
  let currentIdx = targetClauseIndex;
  for (let step = 0; step < clauses.length; step += 1) {
    const current = clauses[currentIdx];
    const parent = adjacentRelativeParentClause(tokens, clauses, currentIdx);
    if (current === undefined || parent === null) {
      return null;
    }
    const modifierPredicate = current.predicates.at(-1);
    if (modifierPredicate !== undefined) {
      modifierPredicateIndices.push(modifierPredicate);
    }
    const anchor = sourceRequiredHeadNominalAnchorForRange(tokens, parent.start, parent.end);
    if (anchor !== null) {
      return withTargetStart(anchor, modifierPredicateIndices);
    }
    if (parent.kind !== "relative" || parent.particleIndices.length > 0 || parent.adverbialAdjunctIndices.length > 0) {
      return null;
    }
    currentIdx += 1;
  }
  return null;
}

function sourceRequiredHeadNominalAnchorForRange(
  tokens: readonly ClauseToken[],
  start: number,
  endExclusive: number
): ClauseNominalClosureAnchor | null {
  const first = nominalBodyStartIndex(tokens, start, endExclusive);
  if (first === null) {
    return null;
  }
  for (let idx = first; idx < endExclusive; idx += 1) {
    const token = tokens[idx];
    if (token === undefined) {
      return null;
    }
    const headIdx = isNounishToken(token)
      ? nominalSuffixRunEnd(tokens, idx, endExclusive)
      : derivedNominalPhraseHeadIndexAt(tokens, idx);
    if (headIdx === null || headIdx >= endExclusive) {
      continue;
    }
    const prefix = nominalClosurePrefixClassification(tokens, first, idx, endExclusive, {
      sourceRequiredHead: true,
    });
    if (!prefix.ok) {
      return null;
    }
    if (!sourceRequiredHeadNominalPhraseClosesAt(tokens, headIdx + 1, endExclusive)) {
      continue;
    }
    return {
      span: { start: first, endExclusive: headIdx + 1 },
      headIdx,
      modifierPredicateIndices: prefix.modifierPredicateIndices,
    };
  }
  return null;
}

function sourceRequiredHeadNominalPhraseClosesAt(
  tokens: readonly ClauseToken[],
  start: number,
  endExclusive: number
): boolean {
  const index = nextNonSpaceIndex(tokens, start, endExclusive);
  if (index === null) {
    return true;
  }
  const token = tokens[index];
  if (token === undefined || isClausePunctuationToken(token)) {
    return true;
  }
  if ((token.pos & POS0) === 助詞) {
    if (isNominalLinkToken(token, index) || isNominalClosureListSeparator(token)) {
      return false;
    }
    if (isCaseParticleAdnominalLinkAt(tokens, index)) {
      return false;
    }
    const pos01 = token.pos & POS01;
    return pos01 === 助詞_格助詞 || pos01 === 助詞_係助詞 || pos01 === 助詞_副助詞;
  }
  return (token.pos & POS0) === 助動詞 &&
    (token.dictionaryForm === "だ" || token.dictionaryForm === "です");
}

export function leadingNominalAnchorForProtoClause(
  tokens: readonly ClauseToken[],
  proto: ProtoClauseLayout,
  clauseIndex: number,
  predicates: readonly number[]
): ClauseNominalClosureAnchor | null {
  const protoClause = proto.protoClauses[clauseIndex];
  if (protoClause === undefined) {
    return null;
  }
  if (protoClause.kind === "relative") {
    if (protoClause.parentIdx === null || protoClause.parentIdx !== clauseIndex + 1) {
      return null;
    }
    const ownAnchor = leadingNominalAnchorForRange(tokens, protoClause.start, protoClause.end, {
      requirePrenominalModifier: true,
      allowArgumentParticleBoundary: true,
    });
    if (ownAnchor !== null) {
      return ownAnchor;
    }
    const parentClause = proto.protoClauses[protoClause.parentIdx];
    if (parentClause === undefined || protoClause.end !== parentClause.start) {
      return null;
    }
    const parentAnchor = leadingNominalAnchorForRange(tokens, parentClause.start, parentClause.end, {
      requirePrenominalModifier: false,
      allowArgumentParticleBoundary: true,
    });
    if (parentAnchor === null) {
      return null;
    }
    return {
      span: {
        start: protoClause.start,
        endExclusive: parentAnchor.span.endExclusive,
      },
      headIdx: parentAnchor.headIdx,
      modifierPredicateIndices: [predicates.at(-1), ...parentAnchor.modifierPredicateIndices]
        .filter((idx): idx is number => idx !== undefined),
    };
  }
  return leadingNominalAnchorForRange(tokens, protoClause.start, protoClause.end, {
    requirePrenominalModifier: true,
    allowArgumentParticleBoundary: false,
  });
}

function nominalClosureAnchorForRange(
  tokens: readonly ClauseToken[],
  start: number,
  endExclusive: number,
  options: { readonly requirePrenominalModifier: boolean }
): ClauseNominalClosureAnchor | null {
  const first = nominalBodyStartIndex(tokens, start, endExclusive);
  if (first === null) {
    return null;
  }
  const head = nominalClosureHeadIndex(tokens, first, endExclusive);
  if (head === null) {
    return null;
  }
  if (!nominalClosureSuffixIsTerminal(tokens, head + 1, endExclusive)) {
    return null;
  }
  const prefix = nominalClosurePrefixClassification(tokens, first, head, endExclusive);
  if (!prefix.ok) {
    return null;
  }
  if (options.requirePrenominalModifier && !prefix.hasPrenominalModifier) {
    return null;
  }
  return {
    span: { start: first, endExclusive: head + 1 },
    headIdx: head,
    modifierPredicateIndices: prefix.modifierPredicateIndices,
  };
}

function pureKeijoujiNoMarkerHeadReach<
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
  const clause = layout.clauseOfToken(markerIdx);
  const start = markerIdx + 1;
  if (
    marker === undefined ||
    !isAdnominalGenitiveMarkerToken(marker) ||
    clause === undefined ||
    start >= tokens.length ||
    separatedFromPreviousModifierChainElement(tokens, start, DETACHED_SEPARATIONS)
  ) {
    return null;
  }
  const isUnmarkedAdnominalHostAt = (hostIdx: number): boolean => isBareKeijoujiDirectAttributiveHost(tokens, hostIdx, lookups);
  const chainHeadIdx = adnominalStackHeadIndexFrom(layout, tokens, start, clause, isUnmarkedAdnominalHostAt);
  if (chainHeadIdx !== null) {
    return { headIdx: chainHeadIdx, arm: chainHeadIdx === start ? "direct" : "modifier_chain" };
  }
  if (clause.kind !== "relative" || clause.end <= start) {
    return null;
  }
  const parent = layout.clauseOfToken(clause.end);
  if (parent === undefined || parent.start !== clause.end) {
    return null;
  }
  const headIdx = adnominalStackHeadIndexFrom(layout, tokens, clause.end, parent, isUnmarkedAdnominalHostAt);
  return headIdx === null ? null : { headIdx, arm: "relative_clause" };
}

export function explicitAdnominalNoAttributiveEvidence(
  layout: ExplicitAdnominalNoLayout,
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number,
  lookups: LookupTables
): ExplicitAdnominalNoAttributiveEvidence | null {
  const hostIdx = markerIdx - 1;
  const host = tokens[hostIdx];
  if (host === undefined) {
    return null;
  }
  const hostClass: ExplicitAdnominalNoHostClass | null = isLexicalPureNaAdjStem(host)
    ? "pure_keijoushi"
    : isNaAdjCapableNoun(host)
      ? "keijoushi_capable_noun"
      : isAttributiveCapableNominalHostToken(host) ? "attributive_capable_nominal" : null;
  if (
    hostClass === null ||
    separatedAs(tokens, markerIdx, DETACHED_SEPARATIONS) ||
    hasSourceOrdinalGapBeforeToken(tokens, markerIdx) ||
    compositeConnectivePatternRelationAt(new TokenCursor(tokens, markerIdx, tokens.length, markerIdx)) !== null
  ) {
    return null;
  }
  const nounHost = hostClass !== "pure_keijoushi";
  const capabilityHost = nounHost && lookups.NO_ATTRIBUTIVE_CAPABLE_HOSTS.has(host.dictionaryForm);
  if (nounHost && !capabilityHost && hostClass !== "keijoushi_capable_noun") {
    return null;
  }
  const reach = prenominalMarkerHeadReachAfterToken(layout, tokens, markerIdx, lookups) ??
    (nounHost ? null : pureKeijoujiNoMarkerHeadReach(layout, tokens, markerIdx, lookups));
  if (reach === null) {
    return null;
  }
  if (
    nounHost &&
    (
      reach.arm !== "direct" ||
      admittedNominalFrameMarkerEndsAt({ tokens, markerStart: markerIdx, lookups, layout }).length > 0 ||
      layout.adnominalNoRelationSlotAccepts(reach.headIdx, hostIdx) ||
      (!capabilityHost && !layout.adnominalHeadBearerSlotAccepts(hostIdx, reach.headIdx))
    )
  ) {
    return null;
  }
  return { hostIdx, markerIdx, headIdx: reach.headIdx, arm: reach.arm, hostClass };
}
