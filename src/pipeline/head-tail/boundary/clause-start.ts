import {
  isBoundaryPunctuationCategoryToken,
  isHardTerminalPunctuationToken
} from "./punctuation.js";
import { skipClausePunctuationForward } from "../../clause-layout/punctuation.js";
import { nominalLinkMarkerRelationForToken } from "./marker.js";
import {
  argumentFrameTransparentBoundaryAdvance,
  copulaFocusContinuationRelationAt
} from "./window.js";
import type {
  BoundaryRelationConsumer,
  ClauseStartEvidenceKind,
  ClauseStartEvidenceRelation
} from "./relation.js";
import type { CopulaFocusParticleLookupSource } from "./window.js";


import { isObligatorilyModifiedFormalNounHead } from "../tail/predicate-root/structural-attributive-head-table.js";
import { isAuxiliaryStemToken, isIndependentWordToken, NOMINAL_BITS, pos0in, POS0, POS01, POS1, POS5A, 格助詞, 記号, 係助詞, 形容詞0, 助詞, 助詞_終助詞, 副詞, 副助詞, 補助記号, 連体詞, 連用形_ } from "../../../types/pos.js";
export interface BoundaryEvidenceToken {
  readonly surface: string;
  readonly dictionaryForm?: string;
  readonly pos: number;
}

export type PredicateStartDetector<Token extends BoundaryEvidenceToken = BoundaryEvidenceToken> = (
  tokens: readonly Token[],
  index: number
) => boolean;

export type ClauseStartEvidenceMode =
  | "argument_frame"
  | "content_prelude";

export type ClauseStartEvidenceRequirement =
  | "tail_argument_frame_continuation"
  | "tail_content_prelude_continuation"
  | "layout_following_predicate_visibility";

export function hasRenyouChuushiClauseContinuationAfter<Token extends BoundaryEvidenceToken>(
  tokens: readonly Token[],
  contentEndIdx: number,
  isPredicateStart: PredicateStartDetector<Token>,
  endExclusive: number = tokens.length,
  lookups?: CopulaFocusParticleLookupSource,
  rightStructure?: ClauseStartRightStructure<Token>
): boolean {
  const limit = Math.min(endExclusive, tokens.length);
  let nextStart = skipClausePunctuationForward(tokens, contentEndIdx + 1, limit);
  if (nextStart >= limit) {
    return false;
  }
  if (rightStructure?.isClauseCoordinationPreludeAt?.(tokens, nextStart) === true) {
    nextStart = skipClausePunctuationForward(tokens, nextStart + 1, limit);
    if (nextStart >= limit) {
      return false;
    }
  }
  return renyouChuushiClauseContinuationFrom(tokens, nextStart, limit, isPredicateStart, lookups, rightStructure);
}

export function renyouChuushiClauseContinuationFrom<Token extends BoundaryEvidenceToken>(
  tokens: readonly Token[],
  start: number,
  endExclusive: number,
  isPredicateStart: PredicateStartDetector<Token>,
  lookups?: CopulaFocusParticleLookupSource,
  rightStructure?: ClauseStartRightStructure<Token>
): boolean {
  if (start >= endExclusive) {
    return false;
  }
  if (isPredicateStart(tokens, start)) {
    return true;
  }
  const relation = clauseStartEvidenceRelationAfter(
    tokens,
    start,
    endExclusive,
    isPredicateStart,
    {
      mode: "argument_frame",
      consumers: ["tail_multi_clause"],
      ...(lookups === undefined ? {} : { lookups }),
      ...(rightStructure?.adnominalHeadStartAfterPredicate === undefined
        ? {}
        : { adnominalHeadStartAfterPredicate: rightStructure.adnominalHeadStartAfterPredicate }),
      ...(rightStructure?.isFrameInternalPauseAt === undefined
        ? {}
        : { isFrameInternalPauseAt: (index: number) => rightStructure.isFrameInternalPauseAt!(tokens, index) }),
      ...(rightStructure?.nominalRunHostPrecedesAdnominalTransit !== true || rightStructure.isNominalRunPredicateAt === undefined
        ? {}
        : {
          adnominalTransitYieldsAt: (runStart: number, predicateIdx: number) =>
            rightStructure.isNominalRunPredicateAt!(tokens, runStart, predicateIdx)
        }),
      ...(rightStructure?.isAdjunctProvenNominalAt === undefined
        ? {}
        : { isAdjunctProvenNominalAt: (index: number) => rightStructure.isAdjunctProvenNominalAt!(tokens, index) }),
      ...(rightStructure?.opaqueNominalSpanEndAt === undefined
        ? {}
        : { opaqueNominalSpanEndAt: (index: number) => rightStructure.opaqueNominalSpanEndAt!(tokens, index) })
    }
  );
  if (
    (relation?.evidence === "direct_predicate" || relation?.evidence === "transparent_span_then_predicate") &&
    rightStructure?.isNominalRunPredicateAt?.(tokens, start, relation.predicateIdx) === true
  ) {
    return true;
  }
  return clauseStartEvidenceSatisfiesRequirement(relation, "tail_argument_frame_continuation");
}

export interface ClauseStartRightStructure<Token extends BoundaryEvidenceToken = BoundaryEvidenceToken> {
  readonly isClauseCoordinationPreludeAt?: (tokens: readonly Token[], index: number) => boolean;
  readonly adnominalHeadStartAfterPredicate?: (predicateIdx: number) => number | null;
  readonly isNominalRunPredicateAt?: (tokens: readonly Token[], start: number, predicateIdx: number) => boolean;
  readonly isFrameInternalPauseAt?: (tokens: readonly Token[], index: number) => boolean;
  readonly nominalRunHostPrecedesAdnominalTransit?: boolean;
  readonly isAdjunctProvenNominalAt?: (tokens: readonly Token[], index: number) => boolean;
  readonly opaqueNominalSpanEndAt?: (tokens: readonly Token[], index: number) => number | null;
  readonly isMeasurePhraseHeadAt?: (tokens: readonly Token[], index: number) => boolean;
}

export function hasArgumentFrameBeforeSupportedClauseContinuation<Token extends BoundaryEvidenceToken>(
  tokens: readonly Token[],
  start: number,
  endExclusive: number,
  isPredicateStart: PredicateStartDetector<Token>,
  lookups?: CopulaFocusParticleLookupSource,
  adnominalHeadStartAfterPredicate?: (predicateIdx: number) => number | null,
  isFrameInternalPauseAt?: (index: number) => boolean
): boolean {
  const relation = clauseStartEvidenceRelationAfter(
    tokens,
    start,
    endExclusive,
    isPredicateStart,
    {
      mode: "argument_frame",
      consumers: ["tail_multi_clause"],
      ...(lookups === undefined ? {} : { lookups }),
      ...(adnominalHeadStartAfterPredicate === undefined ? {} : { adnominalHeadStartAfterPredicate }),
      ...(isFrameInternalPauseAt === undefined ? {} : { isFrameInternalPauseAt })
    }
  );
  return clauseStartEvidenceSatisfiesRequirement(relation, "tail_argument_frame_continuation");
}

export function isRefusedUtteranceHeadToken(head: { readonly surface: string; readonly pos: number }): boolean {
  if (isAuxiliaryStemToken(head)) {
    return true;
  }
  return pos0in(head.pos, NOMINAL_BITS) && isObligatorilyModifiedFormalNounHead(head);
}

export interface EllipticFollowerLookupSource {
  set(section: string, key: string): ReadonlySet<string>;
}

export function connectiveAdmitsEllipticFollowerClause(
  connectiveKind: string | undefined,
  lookups: EllipticFollowerLookupSource
): boolean {
  if (connectiveKind === undefined) {
    return false;
  }
  return lookups.set("connective_elliptic_follower", "admitted_kinds").has(connectiveKind);
}

export type EllipticFollowerContentRequirement = "any_non_sfp" | "independent_word";

export function hasEllipticFollowerClauseEvidence<Token extends BoundaryEvidenceToken>(
  tokens: readonly Token[],
  start: number,
  endExclusive: number,
  isPredicateStart: PredicateStartDetector<Token>,
  contentRequirement: EllipticFollowerContentRequirement = "any_non_sfp"
): boolean {
  let sawContent = false;
  for (let idx = start; idx < endExclusive; idx += 1) {
    const token = tokens[idx];
    if (token === undefined) {
      break;
    }
    if (isHardTerminalPunctuationToken(token)) {
      return sawContent;
    }
    if (isBoundaryPunctuationCategoryToken(token)) {
      continue;
    }
    if ((token.pos & POS01) === 助詞_終助詞) {
      continue;
    }
    if (isPredicateStart(tokens, idx)) {
      return false;
    }
    if (contentRequirement === "any_non_sfp" || isIndependentWordToken(token)) {
      sawContent = true;
    }
  }
  return sawContent;
}

export function clauseStartEvidenceSatisfiesRequirement(
  relation: ClauseStartEvidenceRelation | null,
  requirement: ClauseStartEvidenceRequirement
): boolean {
  if (relation === null) {
    return false;
  }
  switch (requirement) {
    case "tail_argument_frame_continuation":
      return relation.evidence === "argument_frame_then_predicate";
    case "tail_content_prelude_continuation":
      return true;
    case "layout_following_predicate_visibility":
      return true;
  }
}

export function clauseStartEvidenceRelationAfter<Token extends BoundaryEvidenceToken>(
  tokens: readonly Token[],
  start: number,
  endExclusive: number,
  isPredicateStart: PredicateStartDetector<Token>,
  options: {
    readonly mode: ClauseStartEvidenceMode;
    readonly consumers: readonly BoundaryRelationConsumer[];
    readonly isTransparentPunctuation?: (tokens: readonly Token[], index: number) => boolean;
    readonly lookups?: CopulaFocusParticleLookupSource;
    readonly adnominalHeadStartAfterPredicate?: (predicateIdx: number) => number | null;
    readonly isFrameInternalPauseAt?: (index: number) => boolean;
    readonly adnominalTransitYieldsAt?: (start: number, predicateIdx: number) => boolean;
    readonly isAdjunctProvenNominalAt?: (index: number) => boolean;
    readonly opaqueNominalSpanEndAt?: (index: number) => number | null;
  }
): ClauseStartEvidenceRelation | null {
  let sawArgumentMarker = false;
  let sawAdverbialPrelude = false;
  let sawTransparentSpan = false;
  let sawContentPrelude = false;
  for (let idx = start; idx < endExclusive; idx += 1) {
    const tok = tokens[idx];
    if (tok === undefined) {
      return null;
    }
    const opaqueSpanEnd = options.opaqueNominalSpanEndAt?.(idx) ?? null;
    if (opaqueSpanEnd !== null && opaqueSpanEnd > idx + 1 && opaqueSpanEnd <= endExclusive) {
      idx = opaqueSpanEnd - 1;
      continue;
    }
    if (isBoundaryPunctuationCategoryToken(tok)) {
      const transparent = (options.isTransparentPunctuation?.(tokens, idx) ??
        (options.mode === "content_prelude" || argumentFrameTransparentBoundaryAdvance(
          tokens,
          idx,
          preferredConsumer(options.consumers),
          {
            upperBoundExclusive: endExclusive
          }
        ) !== null)) ||
        options.isFrameInternalPauseAt?.(idx) === true;
      if (transparent) {
        sawTransparentSpan = true;
        continue;
      }
      return null;
    }
    if (isPredicateStart(tokens, idx)) {
      const headStart = sawArgumentMarker || sawAdverbialPrelude || options.adnominalTransitYieldsAt?.(start, idx) === true
        ? null
        : options.adnominalHeadStartAfterPredicate?.(idx) ?? null;
      if (headStart !== null && headStart > idx && headStart < endExclusive) {
        sawContentPrelude = true;
        idx = headStart - 1;
        continue;
      }
      return {
        kind: "clause_start_evidence",
        span: { start, endExclusive: idx + 1 },
        strength: "readiness",
        reason: clauseStartEvidenceReason(sawArgumentMarker, sawAdverbialPrelude, sawTransparentSpan, sawContentPrelude),
        consumers: options.consumers,
        evidence: clauseStartEvidenceKind(sawArgumentMarker, sawAdverbialPrelude, sawTransparentSpan, sawContentPrelude),
        predicateIdx: idx
      };
    }
    if (isCopulaFocusContinuationMarker(tokens, idx, options.lookups)) {
      continue;
    }
    if (isClauseArgumentOrTopicMarker(tok)) {
      sawArgumentMarker = true;
      continue;
    }
    if (isClauseAdverbialPrelude(tok) || options.isAdjunctProvenNominalAt?.(idx) === true) {
      sawAdverbialPrelude = true;
      continue;
    }
    if (options.mode === "content_prelude" && isClauseContentPrelude(tok)) {
      sawContentPrelude = true;
    }
  }
  return null;
}

function isCopulaFocusContinuationMarker(
  tokens: readonly BoundaryEvidenceToken[],
  idx: number,
  lookups: CopulaFocusParticleLookupSource | undefined
): boolean {
  return copulaFocusContinuationRelationAt(tokens, idx, {
    consumer: "tail_boundary_readiness",
    ...(lookups === undefined ? {} : { lookups })
  }) !== null;
}

export function isClauseArgumentOrTopicMarkerToken(token: BoundaryEvidenceToken): boolean {
  return isClauseArgumentOrTopicMarker(token);
}

export function isClauseAdverbialPreludeToken(token: BoundaryEvidenceToken): boolean {
  return isClauseAdverbialPrelude(token);
}

function isClauseArgumentOrTopicMarker(token: BoundaryEvidenceToken): boolean {
  if ((token.pos & POS0) !== 助詞) {
    return false;
  }
  const pos1 = token.pos & POS1;
  if (pos1 !== 格助詞 && pos1 !== 係助詞 && pos1 !== 副助詞) {
    return false;
  }
  return nominalLinkMarkerRelationForToken(token, -1, {
    consumers: ["tail_multi_clause"]
  }) === null;
}

function isClauseAdverbialPrelude(token: BoundaryEvidenceToken): boolean {
  const pos0 = token.pos & POS0;
  if (pos0 === 副詞 || pos0 === 連体詞) {
    return true;
  }
  if (pos0 === 形容詞0 && (token.pos & POS5A) === 連用形_) {
    return true;
  }
  return false;
}

function isClauseContentPrelude(token: BoundaryEvidenceToken): boolean {
  const pos0 = token.pos & POS0;
  return pos0 !== 補助記号 && pos0 !== 記号;
}

function clauseStartEvidenceKind(
  sawArgumentMarker: boolean,
  sawAdverbialPrelude: boolean,
  sawTransparentSpan: boolean,
  sawContentPrelude: boolean
): ClauseStartEvidenceKind {
  if (sawArgumentMarker || sawAdverbialPrelude) {
    return "argument_frame_then_predicate";
  }
  if (sawContentPrelude) {
    return "content_prelude_then_predicate";
  }
  if (sawTransparentSpan) {
    return "transparent_span_then_predicate";
  }
  return "direct_predicate";
}

function clauseStartEvidenceReason(
  sawArgumentMarker: boolean,
  sawAdverbialPrelude: boolean,
  sawTransparentSpan: boolean,
  sawContentPrelude: boolean
): string {
  return clauseStartEvidenceKind(
    sawArgumentMarker,
    sawAdverbialPrelude,
    sawTransparentSpan,
    sawContentPrelude
  );
}

function preferredConsumer(consumers: readonly BoundaryRelationConsumer[]): BoundaryRelationConsumer {
  return consumers[0] ?? "tail_multi_clause";
}
