import { NI_ABSORB_ENDINGS } from "../../../../../generator/particle-map.js";
import type { RuntimeHaruToken } from "../../../../../types/token.js";
import type { LookupTables } from "../../../../lookup-tables.js";
import { matchQuotedJudgmentPassiveTail } from "../../../../semantics/modality-specs.js";
import { TokenCursor } from "../../../../token-cursor.js";
import { isKaraIttePerspectiveTail } from "../../../candidate/semantic-classifiers.js";
import {
  collectFollowingProjectionContextTokens,
  firstFollowingProjectionContextToken,
  projectionContextBoundsForToken
} from "../../../candidate/context.js";
import { caseParticleMarkerRelationForToken, kaMarkerRelationAt, nominalLinkMarkerRelationAt, retrospectiveQuoteIdiomClaimAt } from "../../../boundary/marker.js";
import { quoteMarkerRelationAt } from "../../../boundary/quote-marker.js";
import { utteranceClosureAfter, type UtteranceClosureKind } from "../../../../clause-layout/utterance-closure.js";
import { activeProtoLayout } from "../../../../clause-layout/proto-state.js";
import {
  approximateAmountTailKaRelationAt,
  kaNoYouNiSimileRelationAt,
  kaOwnershipKindAt,
  selfQuestionDiscourseSfpKaRelationAt,
  whIndefiniteKaKindAt
} from "../../../boundary/ka-ownership.js";
import { participatesInStructuralKaParallel } from "../../../../structural-relation/ka-parallel-ownership.js";
import { quoteStructuralRelationAt, quoteStructuralRelationStartingAt, whIndefiniteBareNominalQuoteRelationAt } from "../../../../structural-relation/quote.js";
import { quoteFocusLimitNegationTailStartingAt } from "../../../tail/segments/quote-focus.js";
import { volitionalAttemptMarkerAt } from "../../../tail/predicate-root/classifiers/tokens.js";
import { matchQuotedConcessiveConnectiveAt } from "../../../tail/predicate-root/matchers/connective.js";
import { matchBoundNominalReasonConnectiveAt } from "../../../tail/predicate-root/matchers/bound-nominal-connective.js";
import { matchOutcomeKotoNiNaruSurfaceAt } from "../../../tail/predicate-root/matchers/outcome-koto-ni-naru.js";
import { matchEpistemicHedgePostverbAuxiliary } from "../../../tail/predicate-root/matchers/epistemic-hedge.js";
import type { ProjectionEvidenceLayout } from "../../../../clause-layout/layout-types.js";

import type { NominalFrame, NominalFrameParse } from "./grammar.js";
import type { PredicateNominalHostFrameCandidate } from "./parser.js";

import { POS0, pos0in, PREDICATE_BITS, 副助詞, 形容詞0, 助詞, 助動詞, 接続詞, 動詞 , INFLECTABLE_BITS, isTerminalParticleToken, isVerbPredicateToken } from "../../../../../types/pos.js";
export interface NominalFrameCommittedParticleAssignment {
  readonly role?: string | null;
  readonly korean?: string | null;
  readonly allomorphKey?: string | null;
  readonly commitmentSource?: string | null;
}

export type NominalOwnerArbitrationBlockKind =
  | "particle_absorption"
  | "phrase_owner_requires_content_span"
  | "karai_perspective_not_tail"
  | "demo_negative_tail"
  | "committed_particle_assignment_conflict"
  | "committed_semantic_role_conflict"
  | "marker_followed_by_no"
  | "auxiliary_predicate_tail_continuation"
  | "epistemic_hedge_carrier_continuation"
  | "owned_predicate_chain_continuation"
  | "marker_verb_owns_object_argument"
  | "definition_topic_competition"
  | "missing_following_content"
  | "predicate_nominal_lexical_particle_de"
  | "predicate_nominal_external_predicate_continuation"
  | "predicate_nominal_external_no_continuation"
  | "predicate_nominal_focused_taishi_continuation"
  | "predicate_nominal_external_predicate_boundary"
  | "predicate_nominal_modifier_frame"
  | "predicate_nominal_bound_reason_continuation"
  | "predicate_nominal_outcome_naru_continuation"
  | "transparent_pause_discourse_boundary";

export interface NominalOwnerArbitrationBlock {
  readonly kind: NominalOwnerArbitrationBlockKind;
  readonly reason: string;
}

export function nominalFrameMarkerAdapterBlock(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly parse: NominalFrameParse;
  readonly layout?: ProjectionEvidenceLayout;
  readonly allomorphHint: string | null;
  readonly committedParticleAssignment: NominalFrameCommittedParticleAssignment | null;
  readonly lookups: LookupTables;
}): NominalOwnerArbitrationBlock | null {
  const absorption = nominalFrameMarkerAdapterParticleAbsorptionBlock(options.parse, options.allomorphHint);
  if (absorption !== null) {
    return absorption;
  }
  const stayOutside = nominalFrameMarkerAdapterStayOutsideBlock(options.cursor, options.parse, options.lookups);
  if (stayOutside !== null) {
    return stayOutside;
  }
  const semanticRoleConflict = nominalFrameCommittedSemanticRoleConflictBlock(
    options.parse,
    options.committedParticleAssignment
  );
  if (semanticRoleConflict !== null) {
    return semanticRoleConflict;
  }
  const next = options.tokens[options.parse.nextIndex];
  if (
    options.parse.frame.focus === null &&
    nominalLinkMarkerRelationAt(options.tokens, options.parse.nextIndex, {
      consumers: ["nominal_head_parser"]
    }) !== null
  ) {
    return {
      kind: "marker_followed_by_no",
      reason: "nominal frame marker followed by の stays outside marker adapter"
    };
  }
  if (nominalFrameCanContinueIntoAuxiliaryPredicateTail(options.parse.frame, next, options.lookups)) {
    return {
      kind: "auxiliary_predicate_tail_continuation",
      reason: "nominal frame marker can continue into auxiliary predicate tail"
    };
  }
  if (matchEpistemicHedgePostverbAuxiliary(options.tokens, options.parse.nextIndex - 1) !== null) {
    return {
      kind: "epistemic_hedge_carrier_continuation",
      reason: "nominal frame adnominal copula continues into epistemic hedge carrier frame"
    };
  }
  if (nominalFrameCanContinueIntoOwnedPredicateChain(
    options.cursor,
    options.parse,
    options.layout
  )) {
    return {
      kind: "owned_predicate_chain_continuation",
      reason: "nominal frame marker belongs to a live predicate chain"
    };
  }
  if (nominalFrameMarkerVerbOwnsObjectArgument(options.tokens, options.parse.frame, options.layout)) {
    return {
      kind: "marker_verb_owns_object_argument",
      reason: "nominal frame marker verb owns an accusative argument outside the frame"
    };
  }
  const definitionTopicCompetition = definitionTopicFrameStayOutsideBlock(options.tokens, options.parse.nextIndex);
  if (definitionTopicCompetition !== null) {
    return definitionTopicCompetition;
  }
  if (
    options.parse.frame.requiresFollowingContent === true &&
    !options.cursor.lookahead(options.parse.nextIndex - options.cursor.pos, cursor => hasFollowingContentForNominalFrame(cursor, {
      ...(options.layout === undefined ? {} : { layout: options.layout }),
      tokenIdx: options.parse.frame.source.start
    }))
  ) {
    return {
      kind: "missing_following_content",
      reason: "nominal frame requires following content"
    };
  }
  return null;
}

export function predicateNominalFrameStayOutsideBlock(
  cursor: TokenCursor<RuntimeHaruToken>,
  candidate: PredicateNominalHostFrameCandidate,
  nextIndex: number,
  options: { readonly layout?: ProjectionEvidenceLayout; readonly lookups: LookupTables }
): NominalOwnerArbitrationBlock | null {
  const { tokens, end: limit } = cursor;
  const frame = candidate.frame;
  const next = tokens[nextIndex];
  if (candidate.nominalizerKind === "quote") {
    const quotedBlock = quotedPredicateHostDefinitionStayOutsideBlock(tokens, candidate, options.lookups);
    if (quotedBlock !== null) {
      return quotedBlock;
    }
  }
  if (
    candidate.nominalizerKind === "no" &&
    frame.ownerArbitration?.predicateNominalNoLexicalParticle === true
  ) {
    return {
      kind: "predicate_nominal_lexical_particle_de",
      reason: "predicate nominal no + lexical particle frame stays outside NP parser"
    };
  }
  if (nominalFrameDemoNegativeTailShouldStayOutsideNpParser(frame, next)) {
    return {
      kind: "demo_negative_tail",
      reason: "でも + negative adjective tail stays outside NP parser"
    };
  }
  if (frame.frameKind === "nominal_modifier") {
    return {
      kind: "predicate_nominal_modifier_frame",
      reason: "predicate nominalizer + nominal modifier frame remains a marker adapter"
    };
  }
  if (
    candidate.nominalizerKind === "koto" &&
    matchOutcomeKotoNiNaruSurfaceAt(tokens, candidate.nominalizerStart) !== null
  ) {
    return {
      kind: "predicate_nominal_outcome_naru_continuation",
      reason: "predicate nominal frame cedes to outcome koto-ni-naru idiom"
    };
  }
  if (
    frame.ownerArbitration?.boundNominalReasonContinuation === true &&
    matchBoundNominalReasonConnectiveAt(tokens, candidate.nominalizerStart) !== null
  ) {
    return {
      kind: "predicate_nominal_bound_reason_continuation",
      reason: "predicate nominal frame cedes to bound nominal reason connective"
    };
  }
  if (tokenStartsExternalNominalFrameAuxiliaryPredicateTail(next, options.lookups)) {
    return {
      kind: "auxiliary_predicate_tail_continuation",
      reason: "predicate nominal frame continues into auxiliary predicate tail"
    };
  }
  if (
    frame.ownerArbitration?.externalNominalizerPredicate === true &&
    tokenContinuesExternalNominalizerPredicate(next)
  ) {
    return {
      kind: "predicate_nominal_external_predicate_continuation",
      reason: "nominal frame marker continues external nominalizer predicate"
    };
  }
  if (
    frame.ownerArbitration?.externalNominalizerPredicate === true &&
    nominalLinkMarkerRelationAt(tokens, nextIndex, {
      consumers: ["nominal_head_parser"]
    }) !== null
  ) {
    return {
      kind: "predicate_nominal_external_no_continuation",
      reason: "external nominalizer frame followed by の remains outside NP parser"
    };
  }
  if (
    frame.ownerArbitration?.externalNominalizerPredicate === true &&
    frame.focus !== null &&
    frame.focus !== "の" &&
    nextIndex < limit
  ) {
    return {
      kind: "predicate_nominal_focused_taishi_continuation",
      reason: "focused external nominalizer frame remains outside NP parser"
    };
  }
  if (
    frame.ownerArbitration?.externalNominalizerPredicate === true &&
    frame.focus !== "の" &&
    nextIndex < limit &&
    predicateNominalFrameSeesExternalPredicateBoundary(cursor.fork(nextIndex, limit), frame.source.start, options.layout, options.lookups)
  ) {
    return {
      kind: "predicate_nominal_external_predicate_boundary",
      reason: "external nominalizer frame sees external predicate boundary evidence"
    };
  }
  if (
    frame.requiresFollowingContent === true &&
    !cursor.lookahead(nextIndex - cursor.pos, c => hasFollowingContentForNominalFrame(c, {
      ...(options.layout === undefined ? {} : { layout: options.layout }),
      tokenIdx: frame.source.start
    }))
  ) {
    return {
      kind: "missing_following_content",
      reason: "predicate nominal frame requires following content"
    };
  }
  return null;
}


export function nominalPhraseFrameFollowingContentBlock(
  cursor: TokenCursor<RuntimeHaruToken>,
  frame: NominalFrame,
  nextIndex: number,
  layout: ProjectionEvidenceLayout | undefined
): NominalOwnerArbitrationBlock | null {
  if (frame.focus !== "の" || frame.requiresFollowingContent !== true) {
    return null;
  }
  return cursor.lookahead(nextIndex - cursor.pos, c => hasFollowingContentForNominalFrame(c, {
    ...(layout === undefined ? {} : { layout }),
    tokenIdx: frame.source.start
  }))
    ? null
    : {
      kind: "missing_following_content",
      reason: "adnominal phrase-owner nominal frame requires following content"
    };
}

function nominalFrameMarkerAdapterParticleAbsorptionBlock(
  parse: NominalFrameParse,
  renderedHead: string | null
): NominalOwnerArbitrationBlock | null {
  if (renderedHead === null || renderedHead.length === 0) {
    return null;
  }
  const sourceTokens = parse.frame.source.tokens;
  if (sourceTokens.length !== 1) {
    return null;
  }
  if (caseParticleMarkerRelationForToken(sourceTokens[0], 0, {
    acceptedSurfaces: ["に", "で"],
    consumers: ["nominal_head_parser"]
  }) === null) {
    return null;
  }
  if (parse.frame.projection.kind !== "particle") {
    return null;
  }
  return [...NI_ABSORB_ENDINGS].some((ending) => renderedHead.endsWith(ending))
    ? {
      kind: "particle_absorption",
      reason: "nominal frame marker yields to particle absorption"
    }
    : null;
}

function nominalFrameMarkerAdapterStayOutsideBlock(
  cursor: TokenCursor<RuntimeHaruToken>,
  parse: NominalFrameParse,
  lookups: LookupTables
): NominalOwnerArbitrationBlock | null {
  if (parse.frame.ownerMode === "phrase_owner") {
    return {
      kind: "phrase_owner_requires_content_span",
      reason: "phrase-owner nominal frame cannot be consumed as marker adapter"
    };
  }
  if (parse.frame.ownerArbitration?.standpointPerspectiveTail === true) {
    return !cursor.lookahead(parse.frame.source.start - cursor.pos, c => isKaraIttePerspectiveTail(c, lookups))
      ? {
        kind: "karai_perspective_not_tail",
        reason: "standpoint frame is not a perspective tail here"
      }
      : null;
  }
  if (nominalFrameDemoNegativeTailShouldStayOutsideNpParser(parse.frame, cursor.tokens[parse.nextIndex])) {
    return {
      kind: "demo_negative_tail",
      reason: "でも + negative adjective tail stays outside marker adapter"
    };
  }
  return null;
}

function nominalFrameCommittedSemanticRoleConflictBlock(
  parse: NominalFrameParse,
  assignment: NominalFrameCommittedParticleAssignment | null
): NominalOwnerArbitrationBlock | null {
  if (parse.frame.frameKind === "lexical_particle" && assignment !== null) {
    return !nominalFrameProjectionMatchesCommittedAssignment(parse.frame, assignment)
      ? {
        kind: "committed_particle_assignment_conflict",
        reason: "nominal frame projection conflicts with committed particle assignment"
      }
      : null;
  }
  if (
    assignment?.commitmentSource !== "case_realization" &&
    assignment?.commitmentSource !== "slot_realization" &&
    assignment?.commitmentSource !== "role_case_opt_in"
  ) {
    return null;
  }
  return parse.frame.source.tokens.slice(1).some((sourceToken) => (sourceToken.pos & POS0) === 動詞)
    ? {
      kind: "committed_semantic_role_conflict",
      reason: "nominal frame marker overlaps committed semantic role owner"
    }
    : null;
}

export function hasFollowingContentForNominalFrame(
  cursor: TokenCursor<RuntimeHaruToken>,
  options: {
    readonly layout?: ProjectionEvidenceLayout;
    readonly tokenIdx?: number;
  } = {}
): boolean {
  const { tokens, pos: start } = cursor;
  if (followingContentStartsWithQuotedJudgmentPassiveTail(cursor)) {
    return true;
  }
  const token = firstFollowingProjectionContextToken(tokens, start, {
    limit: projectionContextUpperBound(cursor, options.tokenIdx ?? start, options.layout)
  });
  return token === undefined ? false : tokenIsNominalFrameFollowingContent(token);
}

function followingContentStartsWithQuotedJudgmentPassiveTail(
  cursor: TokenCursor<RuntimeHaruToken>
): boolean {
  const match = matchQuotedJudgmentPassiveTail(cursor);
  return match !== null;
}

function predicateNominalFrameSeesExternalPredicateBoundary(
  cursor: TokenCursor<RuntimeHaruToken>,
  frameStart: number,
  layout: ProjectionEvidenceLayout | undefined,
  lookups: LookupTables
): boolean {
  const { tokens, pos: start, end: limit } = cursor;
  const upperBound = projectionContextUpperBound(cursor, frameStart, layout);
  const token = firstFollowingProjectionContextToken(tokens, start, {
    limit: upperBound
  });
  if (isLikelyPredicateStartToken(token)) {
    return true;
  }
  if (followingContextHasExternalPredicateWithoutNominalContentEvidence(cursor.fork(start, upperBound), lookups)) {
    return true;
  }
  if (upperBound > start) {
    return false;
  }
  return followingContextHasExternalPredicateWithoutNominalContentEvidence(cursor.fork(start, limit), lookups) ||
    isLikelyPredicateStartToken(firstFollowingProjectionContextToken(tokens, start, { limit }));
}

function followingContextHasExternalPredicateWithoutNominalContentEvidence(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): boolean {
  const { tokens, pos: start, end: limit } = cursor;
  const following = collectFollowingProjectionContextTokens(tokens, start, { limit, maxCount: 8 });
  if (following.length > 0 && following.every((token) => !isLikelyPredicateStartToken(token))) {
    return true;
  }
  const predicate = following.find((token) => isLikelyPredicateStartToken(token));
  if (predicate === undefined) {
    return false;
  }
  return !getPredicateNominalTaishiContentPredicates(lookups).has(predicate.dictionaryForm || predicate.surface);
}

function projectionContextUpperBound(
  cursor: TokenCursor<RuntimeHaruToken>,
  tokenIdx: number,
  layout: ProjectionEvidenceLayout | undefined
): number {
  const { tokens, end: limit } = cursor;
  return projectionContextBoundsForToken({
    tokens,
    tokenIdx,
    fallbackUpperBound: limit,
    ...(layout === undefined ? {} : { layout })
  }).upperBound ?? limit;
}

export function nominalFrameCanContinueIntoAuxiliaryPredicateTail(
  frame: NominalFrame,
  next: RuntimeHaruToken | undefined,
  lookups: LookupTables
): boolean {
  return frame.source.tokens.some((token) => pos0in(token.pos, INFLECTABLE_BITS)) &&
    tokenStartsExternalNominalFrameAuxiliaryPredicateTail(next, lookups);
}

function nominalFrameCanContinueIntoOwnedPredicateChain(
  cursor: TokenCursor<RuntimeHaruToken>,
  parse: NominalFrameParse,
  layout: ProjectionEvidenceLayout | undefined
): boolean {
  const { tokens, end: limit } = cursor;
  if (!nominalFrameCompetesWithOwnedPredicateChain(tokens, parse)) {
    return false;
  }
  if (!nominalFrameSourceHasPredicateOwnedCaseParticle(parse.frame, layout)) {
    return false;
  }
  const upperBound = projectionContextUpperBound(cursor, parse.frame.source.start, layout);
  const following = firstFollowingProjectionContextToken(tokens, parse.nextIndex, {
    limit: upperBound
  });
  if (isLikelyPredicateStartToken(following)) {
    return true;
  }
  if (!nominalFrameSourceClauseTerminatesAsConnective(parse.frame, layout)) {
    return false;
  }
  const crossBoundaryFollowing = firstFollowingProjectionContextToken(tokens, parse.nextIndex, {
    limit
  });
  return isLikelyPredicateStartToken(crossBoundaryFollowing);
}

function nominalFrameCompetesWithOwnedPredicateChain(
  tokens: readonly RuntimeHaruToken[],
  parse: NominalFrameParse
): boolean {
  const frame = parse.frame;
  const policy = frame.ownerArbitration?.ownedPredicateChainContinuation;
  return policy !== undefined &&
    !nominalFrameSourceHasRejectedSurface(frame, policy.rejectSourceSurfaces ?? []) &&
    !nominalFramePrecedingContextHasRejectedSurface(tokens, frame, policy.rejectPrecedingSurfaces ?? [], policy.rejectPrecedingWindow ?? 0);
}

function nominalFrameSourceHasRejectedSurface(frame: NominalFrame, rejectedSurfaces: readonly string[]): boolean {
  return rejectedSurfaces.length > 0 &&
    frame.source.tokens.some((token) => rejectedSurfaces.includes(token.surface));
}

function nominalFramePrecedingContextHasRejectedSurface(
  tokens: readonly RuntimeHaruToken[],
  frame: NominalFrame,
  rejectedSurfaces: readonly string[],
  window: number
): boolean {
  if (rejectedSurfaces.length === 0 || window <= 0) {
    return false;
  }
  const lowerBound = Math.max(0, frame.source.start - window);
  for (let idx = lowerBound; idx < frame.source.start; idx += 1) {
    if (rejectedSurfaces.includes(tokens[idx]?.surface ?? "")) {
      return true;
    }
  }
  return false;
}

function nominalFrameSourceHasPredicateOwnedCaseParticle(
  frame: NominalFrame,
  layout: ProjectionEvidenceLayout | undefined
): boolean {
  const ownerPredicateOfParticle = predicateOwnerLookup(layout);
  if (ownerPredicateOfParticle === null) {
    return false;
  }
  for (const [offset, token] of frame.source.tokens.entries()) {
    if ((token.pos & POS0) !== 助詞) {
      continue;
    }
    const particleIdx = frame.source.start + offset;
    const ownerIdx = ownerPredicateOfParticle(particleIdx);
    if (ownerIdx === undefined || ownerIdx < frame.source.start || ownerIdx >= frame.source.end) {
      continue;
    }
    const ownerToken = frame.source.tokens[ownerIdx - frame.source.start];
    if (ownerToken !== undefined && pos0in(ownerToken.pos, PREDICATE_BITS)) {
      return true;
    }
  }
  return false;
}

function nominalFrameMarkerVerbOwnsObjectArgument(
  tokens: readonly RuntimeHaruToken[],
  frame: NominalFrame,
  layout: ProjectionEvidenceLayout | undefined
): boolean {
  if (frame.ownerArbitration?.markerVerbOwnsObjectArgument !== true) {
    return false;
  }
  const ownerPredicateOfParticle = predicateOwnerLookup(layout);
  if (ownerPredicateOfParticle === null) {
    return false;
  }
  const verbIndices = new Set<number>();
  for (const [offset, token] of frame.source.tokens.entries()) {
    if (isVerbPredicateToken(token)) {
      verbIndices.add(frame.source.start + offset);
    }
  }
  const clause = layout?.clauseOfToken(frame.source.start) as { readonly particleIndices?: readonly number[] } | undefined;
  for (const idx of clause?.particleIndices ?? []) {
    if (idx >= frame.source.start) {
      continue;
    }
    if (caseParticleMarkerRelationForToken(tokens[idx], idx, {
      acceptedSurfaces: ["を"],
      consumers: ["nominal_head_parser"]
    }) === null) {
      continue;
    }
    const owner = ownerPredicateOfParticle(idx);
    if (owner !== undefined && verbIndices.has(owner)) {
      return true;
    }
  }
  return false;
}

function predicateOwnerLookup(
  layout: ProjectionEvidenceLayout | undefined
): ((particleIdx: number) => number | undefined) | null {
  const candidate = layout as { ownerPredicateOfParticle?: unknown } | undefined;
  const method = candidate?.ownerPredicateOfParticle;
  if (typeof method !== "function") {
    return null;
  }
  return (particleIdx: number) => method.call(candidate, particleIdx) as number | undefined;
}

function nominalFrameSourceClauseTerminatesAsConnective(
  frame: NominalFrame,
  layout: ProjectionEvidenceLayout | undefined
): boolean {
  const clause = layout?.clauseOfToken(frame.source.start) as { terminatedBy?: unknown } | undefined;
  return clause?.terminatedBy === "connective";
}

function quotedPredicateHostDefinitionStayOutsideBlock(
  tokens: readonly RuntimeHaruToken[],
  candidate: PredicateNominalHostFrameCandidate,
  lookups: LookupTables
): NominalOwnerArbitrationBlock | null {
  const markerIdx = candidate.nominalizerStart;
  const markerCursor = new TokenCursor(tokens, markerIdx, tokens.length, markerIdx);
  if (quoteStructuralRelationStartingAt(markerCursor, lookups) !== undefined) {
    return {
      kind: "definition_topic_competition",
      reason: "predicate host とは is owned by the quote host relation"
    };
  }
  if (matchQuotedConcessiveConnectiveAt(tokens, markerIdx, { requireEnd: false }) !== null) {
    return {
      kind: "definition_topic_competition",
      reason: "predicate host とは is owned by the quoted concessive connective"
    };
  }
  if (quoteFocusLimitNegationTailStartingAt(markerCursor.fork(markerIdx, tokens.length, markerIdx)) !== null) {
    return {
      kind: "definition_topic_competition",
      reason: "predicate host とは is owned by the limitation negation tail"
    };
  }
  if (volitionalAttemptMarkerAt(tokens, markerIdx) !== null) {
    return {
      kind: "definition_topic_competition",
      reason: "predicate host とは is owned by the volitional attempt marker"
    };
  }
  if (quoteMarkerRelationAt(tokens, candidate.frame.source.end, { consumers: ["nominal_head_parser"] })?.canonicalSurface === "って") {
    return {
      kind: "definition_topic_competition",
      reason: "predicate host とは closes quoted utterance content"
    };
  }
  if (closesUtteranceAfterTerminalParticles(tokens, candidate.frame.source.end)) {
    return {
      kind: "definition_topic_competition",
      reason: "predicate host とは closing the utterance is the elided-host exclamative topic"
    };
  }
  return null;
}

function definitionTopicFrameStayOutsideBlock(
  tokens: readonly RuntimeHaruToken[],
  nextIndex: number
): NominalOwnerArbitrationBlock | null {
  const next = tokens[nextIndex];
  const form = next?.dictionaryForm || next?.surface || "";
  return form === "言う" || form === "いう" || form === "限る"
    ? {
      kind: "definition_topic_competition",
      reason: "definition topic marker competes with quote or limited-scope continuation"
    }
    : null;
}

function nominalFrameDemoNegativeTailShouldStayOutsideNpParser(
  frame: NominalFrame,
  next: RuntimeHaruToken | undefined
): boolean {
  const form = next?.dictionaryForm || next?.surface;
  return frame.ownerArbitration?.demoNegativeTail === true &&
    next !== undefined && (next.pos & POS0) === 形容詞0 &&
    (form === "ない" || form === "無い");
}

function nominalFrameProjectionMatchesCommittedAssignment(
  frame: NominalFrame,
  assignment: NominalFrameCommittedParticleAssignment
): boolean {
  return nominalProjectionValueMatchesCommittedAssignment(frame.projection, assignment);
}

function nominalProjectionValueMatchesCommittedAssignment(
  projection: NominalFrame["projection"],
  assignment: NominalFrameCommittedParticleAssignment
): boolean {
  if (projection.kind === "particle") {
    return (
      assignment.allomorphKey === projection.particleKey
    );
  }
  if (projection.kind === "deterministic") {
    return (
      assignment.korean === projection.korean &&
      (assignment.allomorphKey === undefined || assignment.allomorphKey === null)
    );
  }
  if (projection.kind === "hostSuffix") {
    return false;
  }
  if (projection.kind === "candidateSet") {
    return projection.candidates.some((candidate) => {
      if (candidate.projection !== undefined) {
        return nominalProjectionValueMatchesCommittedAssignment(candidate.projection, assignment);
      }
      if (candidate.korean !== undefined) {
        return (
          assignment.korean === candidate.korean &&
          (assignment.allomorphKey === undefined || assignment.allomorphKey === null)
        );
      }
      return false;
    });
  }
  return false;
}

function tokenIsNominalFrameFollowingContent(token: RuntimeHaruToken): boolean {
  const pos0 = token.pos & POS0;
  if (pos0 === 助詞 || pos0 === 助動詞 || pos0 === 接続詞) {
    return false;
  }
  return true;
}

const _externalNominalFrameAuxTailForms = new WeakMap<LookupTables, ReadonlySet<string>>();
function getExternalNominalFrameAuxTailForms(lookups: LookupTables): ReadonlySet<string> {
  let cached = _externalNominalFrameAuxTailForms.get(lookups);
  if (cached === undefined) {
    cached = lookupSetOrThrow(lookups, "nominal_frame_external_auxiliary_predicate_tail_forms");
    _externalNominalFrameAuxTailForms.set(lookups, cached);
  }
  return cached;
}
const _predicateNominalTaishiContentPredicates = new WeakMap<LookupTables, ReadonlySet<string>>();
function getPredicateNominalTaishiContentPredicates(lookups: LookupTables): ReadonlySet<string> {
  let cached = _predicateNominalTaishiContentPredicates.get(lookups);
  if (cached === undefined) {
    cached = lookupSetOrThrow(lookups, "nominal_frame_predicate_nominal_taishi_content_predicates");
    _predicateNominalTaishiContentPredicates.set(lookups, cached);
  }
  return cached;
}

function tokenStartsExternalNominalFrameAuxiliaryPredicateTail(
  token: RuntimeHaruToken | undefined,
  lookups: LookupTables,
): boolean {
  if (token === undefined || (token.pos & POS0) !== 動詞) {
    return false;
  }
  return getExternalNominalFrameAuxTailForms(lookups).has(token.dictionaryForm || token.surface);
}

function lookupSetOrThrow(lookups: LookupTables, name: string): ReadonlySet<string> {
  const lookup = lookups.named(name);
  if (lookup === undefined) {
    throw new Error(`missing named lookup set: ${name}`);
  }
  return lookup;
}

function tokenContinuesExternalNominalizerPredicate(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  const form = token.dictionaryForm || token.surface;
  if ((token.pos & POS0) === 助動詞) {
    return true;
  }
  if ((token.pos & POS0) === 形容詞0 && (form === "ない" || form === "無い")) {
    return true;
  }
  if ((token.pos & POS0) === 動詞 && form === "対する") {
    return true;
  }
  return false;
}

function isLikelyPredicateStartToken(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  return pos0in(token.pos, PREDICATE_BITS);
}

export function whIndefiniteKaConstructionAdmittedAt(
  cursor: TokenCursor<RuntimeHaruToken>,
  kaIdx: number,
  lookups: LookupTables
): boolean {
  const tokens = cursor.tokens;
  const kaRelation = kaMarkerRelationAt(tokens, kaIdx, ["nominal_head_parser"]);
  if (kaRelation === null) {
    return false;
  }
  if (
    kaRelation.particleSubtype1 !== 副助詞 &&
    whIndefiniteKaQuoteMarkerClaimedAt(cursor, kaIdx, lookups)
  ) {
    return false;
  }
  if (kaOwnershipKindAt(tokens, kaIdx, lookups) !== "wh_indefinite") {
    return false;
  }
  const kind = whIndefiniteKaKindAt(tokens, kaIdx, lookups);
  if (kind === null) {
    return false;
  }
  if (approximateAmountTailKaRelationAt(tokens, kaIdx, lookups) !== null) {
    return false;
  }
  if (whIndefiniteKaTerminalDiscourseQuestionAt(tokens, kaIdx)) {
    return false;
  }
  if (participatesInStructuralKaParallel(cursor.fork(kaIdx, cursor.end, kaIdx), lookups)) {
    return false;
  }
  if (kaNoYouNiSimileRelationAt(tokens, kaIdx, lookups) !== null) {
    return false;
  }
  if (whIndefiniteKaQuoteQuestionContentAt(cursor, kaIdx, lookups)) {
    return false;
  }
  return true;
}

function whIndefiniteKaTerminalDiscourseQuestionAt(
  tokens: readonly RuntimeHaruToken[],
  kaIdx: number
): boolean {
  const relation = selfQuestionDiscourseSfpKaRelationAt(tokens, kaIdx);
  if (relation?.subtype !== "ne") {
    return false;
  }
  return closesUtteranceAfterTerminalParticles(tokens, relation.sfpIdx + 1);
}

function closesUtteranceAfterTerminalParticles(
  tokens: readonly RuntimeHaruToken[],
  fromIdx: number
): boolean {
  let after = fromIdx;
  while (after < tokens.length && isTerminalParticleToken(tokens[after]!)) {
    after += 1;
  }
  return WH_INDEFINITE_KA_TERMINAL_QUESTION_CLOSURES.has(
    utteranceClosureAfter(activeProtoLayout(), tokens, after).closure
  );
}

export function uncertainCauseKaConstructionAdmittedAt(
  tokens: readonly RuntimeHaruToken[],
  kaIdx: number,
  lookups: LookupTables
): boolean {
  if (kaMarkerRelationAt(tokens, kaIdx, ["nominal_head_parser"]) === null) {
    return false;
  }
  if (kaOwnershipKindAt(tokens, kaIdx, lookups) !== "question") {
    return false;
  }
  return !whIndefiniteKaQuoteMarkerFollowsAt(tokens, kaIdx);
}

function whIndefiniteKaQuoteMarkerFollowsAt(
  tokens: readonly RuntimeHaruToken[],
  kaIdx: number
): boolean {
  const afterKa = kaIdx + 1;
  if (afterKa >= tokens.length) {
    return false;
  }
  return quoteMarkerRelationAt(tokens, afterKa, { consumers: ["nominal_head_parser"] }) !== null;
}

function whIndefiniteKaQuoteMarkerClaimedAt(
  cursor: TokenCursor<RuntimeHaruToken>,
  kaIdx: number,
  lookups: LookupTables
): boolean {
  const tokens = cursor.tokens;
  const afterKa = kaIdx + 1;
  if (afterKa >= tokens.length) {
    return false;
  }
  const marker = quoteMarkerRelationAt(tokens, afterKa, { consumers: ["nominal_head_parser"] });
  if (marker === null) {
    return false;
  }
  if (marker.canonicalSurface !== "と" || marker.tokenCount !== 1) {
    return true;
  }
  if (retrospectiveQuoteIdiomClaimAt(tokens, kaIdx, { consumers: ["nominal_head_parser"] }) !== null) {
    return true;
  }
  return whIndefiniteBareNominalQuoteRelationAt(cursor.fork(afterKa, tokens.length, afterKa), lookups) !== null;
}

const WH_INDEFINITE_KA_TERMINAL_QUESTION_CLOSURES: ReadonlySet<UtteranceClosureKind> = new Set([
  "eos",
  "hard_terminal",
  "matched_delimiter_close",
  "unmatched_trailing",
  "decorative_terminal"
]);

function whIndefiniteKaQuoteQuestionContentAt(
  cursor: TokenCursor<RuntimeHaruToken>,
  kaIdx: number,
  lookups: LookupTables
): boolean {
  const limit = cursor.tokens.length;
  if (quoteStructuralRelationAt(cursor.fork(kaIdx, limit, kaIdx), lookups)?.quote.slotKind === "question_content") {
    return true;
  }
  if (!whIndefiniteKaQuoteMarkerFollowsAt(cursor.tokens, kaIdx)) {
    return false;
  }
  const afterKa = kaIdx + 1;
  return quoteStructuralRelationAt(cursor.fork(afterKa, limit, afterKa), lookups)?.quote.slotKind ===
    "question_content";
}
