import type { RuntimeHaruToken } from "../../../../../types/token.js";
import { TokenCursor } from "../../../../token-cursor.js";
import type { LookupTables } from "../../../../lookup-tables.js";
import { quoteStructuralRelationStartingAt } from "../../../../structural-relation/quote.js";
import { predicateNominalizerRelationForToken } from "../../../boundary/marker.js";
import type { UtteranceClosureKind } from "../../../../clause-layout/utterance-closure.js";
import type { AuxOpNode, OpSource, PredicateProjectionCarrierOp, PredicateProjectionCarrierSourceAllomorph, SfpNode, ConnectiveOp } from "../grammar.js";
import { isCommittedKaQuestionSfpEffect, quotedMoodForClosingSfpEffect } from "../grammar.js";
import type { ParseInput } from "../parse-input.js";
import { PROJECTION_CARRIER_FORMS, projectionCarrierHostAttaches, projectionCarrierTokenMatches } from "../projection-carrier-form-table.js";
import { srcSingle, srcSlice } from "../source.js";
import { isClauseClosingPredicateTailToken, isAruVerbToken, isEquivalenceCarrierAdnominalToken, isEquivalenceCarrierPredicativeNoun, isNaiOrNuToken } from "../classifiers/tokens.js";
import { matchNiChigaiNaiProjectionCarrierAt, matchNiKimatteIruProjectionCarrierAt } from "./projection-carrier.js";
import { matchFocusConnectiveAt, matchDokoroNegativeCarrierSpanAt, dokoroNegativeHostClass, dokoroSituationDeicticBase } from "./focus-connective.js";
import { matchFocusLimitCarrier } from "./focus-limit-carrier.js";
import { isSecondaryParticle, isDegreeExtentParticle } from "../../../../particles/secondary-particle.js";
import { buildQuotativeMannerSimileConnectiveOp, type PredicateProjectionConnectiveMatch, matchPredicateProjectionConnectiveAt, matchQuotativeMannerSimileConnectiveAt, type QuotativeMannerSimileConnectiveMatch, keijoujiAttributiveMarkerAt, matchGotokuMannerSimileConnectiveAt, matchYouNiPredicateProjectionConnectiveAt } from "./predicate-projection-connective.js";
import { attributiveCopulaTailFollows } from "./copula.js";
import { POS0, POS01, POS4, POS5A, 意志推量形_, 終止形_, 助詞, 助動詞, 助動詞_タ, 助動詞_ダ, 助動詞_デス, 動詞_非自立可能, 連体形_, 連用形_, 助詞_副助詞, 助詞_係助詞, 助詞_格助詞 } from "../../../../../types/pos.js";
import { buildMatchedConnectiveOp, buildPredicateProjectionCarrierOp, createPredicateProjectionCarrierOp, createConnectiveOp } from "../op-builders.js";
import { connectiveOpFromMatch } from "../connective-ops.js";
import { startsKamoModal } from "./modal-tail.js";
import { TERMINAL_SFP_RUN_BRIDGE_LIMIT, matchTerminalSfpArbitration, isTailFinalQuestionSfpStart, remainderIsChainFinalSfpRun } from "./terminal-sfp.js";
import { isParallelPredicateMoOwnershipYieldAtCursor } from "./connective-tail.js";
import { terminalDiscourseSfpRunClosesUtterance } from "../parse-closure.js";
import { contextAlignedPosition, contextCursorForInputPosition } from "../parse-coordinates.js";
import { previousOpsHaveExperiencePastAttributive } from "../parse-stem.js";

interface PredicateProjectionConnectiveOptions {
  readonly allowNoQuoteReportingProjection?: boolean;
  readonly lookups: LookupTables;
  readonly quoteAttributiveHeadFrame?: ParseInput["quoteAttributiveHeadFrame"];
  readonly purposeMotionClosureAfterMarker?: (markerPos: number) => UtteranceClosureKind;
}

function matchPredicateProjectionConnectiveWith(
  cursor: TokenCursor<RuntimeHaruToken>,
  options: PredicateProjectionConnectiveOptions,
  requireEnd: boolean
): PredicateProjectionConnectiveMatch | null {
  return matchPredicateProjectionConnectiveAt(cursor.tokens, cursor.pos, {
    requireEnd,
    allowNoQuoteReportingProjection: options.allowNoQuoteReportingProjection === true,
    lookups: options.lookups,
    ...(options.quoteAttributiveHeadFrame === undefined
      ? {}
      : { quoteAttributiveHeadFrame: options.quoteAttributiveHeadFrame }),
    ...(options.purposeMotionClosureAfterMarker === undefined
      ? {}
      : { purposeMotionClosureAfterMarker: options.purposeMotionClosureAfterMarker })
  });
}

export function matchPredicateProjectionConnective(
  cursor: TokenCursor<RuntimeHaruToken>,
  options: PredicateProjectionConnectiveOptions
): ConnectiveOp | null {
  const match = matchPredicateProjectionConnectiveWith(cursor, options, true);
  return match === null ? null : connectiveOpFromMatch(match, cursor);
}

export function matchPredicateProjectionConnectiveBeforeTerminalSfp(
  cursor: TokenCursor<RuntimeHaruToken>,
  options: PredicateProjectionConnectiveOptions & { readonly stemToken: RuntimeHaruToken }
): ConnectiveOp | null {
  const openMatch = matchPredicateProjectionConnectiveWith(cursor, options, false);
  if (
    openMatch === null ||
    !remainderIsChainFinalSfpRun(cursor, cursor.pos + openMatch.consumed, options.stemToken)
  ) {
    return null;
  }
  return connectiveOpFromMatch(openMatch, cursor);
}

export function matchFocusConnective(
  cursor: TokenCursor<RuntimeHaruToken>
): ConnectiveOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const match = matchFocusConnectiveAt(tokens, pos);
  if (match === null) return null;
  cursor.advance(match.consumed);
  return buildMatchedConnectiveOp(srcSlice(tokens, pos, match.consumed), match);
}

export function matchYouNiPredicateProjectionConnective(
  cursor: TokenCursor<RuntimeHaruToken>,
  options: { readonly allowZeroNiPurpose?: boolean; readonly lookups: LookupTables }
): ConnectiveOp | null {
  const match = matchYouNiPredicateProjectionConnectiveAt(cursor.tokens, cursor.pos, {
    requireEnd: true,
    allowZeroNiPurpose: options.allowZeroNiPurpose === true,
    lookups: options.lookups
  });
  return match === null ? null : connectiveOpFromMatch(match, cursor);
}

export function matchSfpBridgedQuotativeMannerSimileConnective(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>,
  ops: readonly AuxOpNode[],
  stemTok: RuntimeHaruToken
): ConnectiveOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const sfp = cursor.current();
  const directMatch = quotativeMannerSimileMatchInParseSlice(input, cursor, pos);
  if (directMatch?.closure === "noda_formal_noun") {
    if (ops.some(op => op.kind === "idiom" && op.idiom === "obligation")) return null;
    cursor.advance(directMatch.consumed);
    return buildQuotativeMannerSimileConnectiveOp(srcSlice(tokens, pos, directMatch.consumed), "", directMatch);
  }
  const match = quotativeMannerSimileMatchInParseSlice(input, cursor, pos + 1);
  if (sfp !== undefined && match?.closure === "neutral_terminal_sfp") {
    const consumed = 1 + match.consumed;
    cursor.advance(consumed);
    return buildQuotativeMannerSimileConnectiveOp(
      srcSlice(tokens, pos, consumed),
      sfp.surface,
      match
    );
  }
  return matchClosedSfpRunQuotativeMannerSimileConnective(input, cursor, ops, stemTok);
}

function matchClosedSfpRunQuotativeMannerSimileConnective(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>,
  ops: readonly AuxOpNode[],
  stemTok: RuntimeHaruToken
): ConnectiveOp | null {
  const { tokens } = cursor;
  const sfpStart = cursor.pos;
  if (cursor.current() === undefined) {
    return null;
  }
  return cursor.tx((c) => {
    for (let attempt = 0; attempt < TERMINAL_SFP_RUN_BRIDGE_LIMIT; attempt += 1) {
      if (matchTerminalSfpArbitration(input, c, stemTok, ops) === null) {
        return null;
      }
      const match = quotativeMannerSimileMatchInParseSlice(input, c, c.pos);
      if (match === null) {
        continue;
      }
      if (
        match.closure !== "terminal_particle_run" ||
        contextAlignedPosition(input, c, c.pos).index - match.leadingSfpCount !==
          contextAlignedPosition(input, c, sfpStart).index
      ) {
        return null;
      }
      const closedSfp = closedSfpOfQuotativeMannerSimileRun(input, c.fork(sfpStart, c.pos), stemTok, ops);
      if (closedSfp === null) {
        return null;
      }
      const sfpSurface = tokens.slice(sfpStart, c.pos).map((token) => token.surface).join("");
      c.advance(match.consumed);
      return closedSfpQuotativeMannerSimileOp(srcSlice(tokens, sfpStart, c.pos - sfpStart), sfpSurface, match, closedSfp);
    }
    return null;
  });
}

function closedSfpOfQuotativeMannerSimileRun(
  input: ParseInput,
  bounded: TokenCursor<RuntimeHaruToken>,
  stemTok: RuntimeHaruToken,
  ops: readonly AuxOpNode[]
): SfpNode | null {
  let first: SfpNode | null = null;
  for (let attempt = 0; attempt < TERMINAL_SFP_RUN_BRIDGE_LIMIT && bounded.pos < bounded.end; attempt += 1) {
    const next = matchTerminalSfpArbitration(input, bounded, stemTok, ops);
    if (next === null) {
      return null;
    }
    first ??= next;
  }
  return bounded.pos === bounded.end ? first : null;
}

export function closedSfpClosesInterrogative(closedSfp: SfpNode): boolean {
  return quotedMoodForClosingSfpEffect(closedSfp.effect) === "interrogative" ||
    isCommittedKaQuestionSfpEffect(closedSfp.effect);
}

function closedSfpQuotativeMannerSimileOp(
  source: OpSource,
  sfpSurface: string,
  match: QuotativeMannerSimileConnectiveMatch,
  closedSfp: SfpNode
): ConnectiveOp {
  const mood = closedSfpClosesInterrogative(closedSfp) ? "interrogative" : match.mood;
  return {
    ...buildQuotativeMannerSimileConnectiveOp(source, sfpSurface, { ...match, mood }),
    closedSfp
  };
}

export function matchAttributiveBridgedYouNiProjectionConnective(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): ConnectiveOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  if (keijoujiAttributiveMarkerAt(tokens, pos) === null) {
    return null;
  }
  const match = matchYouNiPredicateProjectionConnectiveAt(tokens, pos + 1, {
    requireEnd: true,
    lookups
  }) ?? matchGotokuMannerSimileConnectiveAt(tokens, pos + 1);
  if (match === null || (match.surface !== "ように" && match.surface !== "ごとく" && match.surface !== "如く")) {
    return null;
  }
  const consumed = 1 + match.consumed;
  cursor.advance(consumed);
  return createConnectiveOp({

    connective: match.connective,
    surface: match.surface,
    source: srcSlice(tokens, pos, consumed)
  });
}

export function matchPredicateProjectionCarrier(
  cursor: TokenCursor<RuntimeHaruToken>,
  previousOps: readonly AuxOpNode[] = [],
  lookups?: LookupTables,
  input?: ParseInput,
  stemToken?: RuntimeHaruToken
): PredicateProjectionCarrierOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const dokoroNegative = matchFocusDokoroNegativeCarrier(tokens, pos, stemToken, lookups);
  if (dokoroNegative !== null) {
    return consumePredicateProjectionCarrierMatch(cursor, dokoroNegative);
  }
  const recentPastBakari = matchRecentPastBakariCarrier(tokens, pos, previousOps, lookups);
  if (recentPastBakari !== null) {
    return consumePredicateProjectionCarrierMatch(cursor, recentPastBakari);
  }
  const declaredForm = matchDeclaredProjectionCarrierForm(tokens, pos, lookups);
  if (declaredForm !== null) {
    return consumePredicateProjectionCarrierMatch(cursor, declaredForm);
  }
  const equivalenceDouzen = matchEquivalenceDouzenCarrier(cursor, input);
  if (equivalenceDouzen !== null) {
    return consumePredicateProjectionCarrierMatch(cursor, equivalenceDouzen);
  }
  const dake = matchFocusLimitCarrier(cursor);
  if (dake !== null) {
    return consumePredicateProjectionCarrierMatch(cursor, dake);
  }
  const untilCopula = matchUntilCopularCarrier(tokens, pos, previousOps);
  if (untilCopula !== null) {
    return consumePredicateProjectionCarrierMatch(cursor, untilCopula);
  }
  const untilBareSfp = matchUntilBareTerminalSfpCarrier(cursor, input);
  if (untilBareSfp !== null) {
    return consumePredicateProjectionCarrierMatch(cursor, untilBareSfp);
  }
  const degree = tokens[pos];
  const degreeCopula = matchDegreeExtentAmountCarrier(tokens, pos);
  if (degreeCopula !== null) {
    return consumePredicateProjectionCarrierMatch(cursor, degreeCopula);
  }
  if (
    degree !== undefined &&
    isDegreeExtentParticle(degree) &&
    (tokens[pos + 1] === undefined ||
      cursor.lookahead(1, startsKamoModal) ||
      cursor.lookahead(1, isTailFinalQuestionSfpStart) ||
      terminalDiscourseSfpRunClosesUtterance(cursor, input, 1))
  ) {
    cursor.advance(1);
    return buildPredicateProjectionCarrierOp(
      srcSingle(degree, pos),
      "degree_extent",
      degree.surface,
      null,
      false,
      false
    );
  }
  const niChigaiNai = matchNiChigaiNaiProjectionCarrierAt(tokens, pos);
  if (niChigaiNai !== null) {
    return consumePredicateProjectionCarrierMatch(cursor, niChigaiNai);
  }
  const niKimatteIru = matchNiKimatteIruProjectionCarrierAt(tokens, pos);
  if (niKimatteIru === null) {
    return null;
  }
  return consumePredicateProjectionCarrierMatch(cursor, niKimatteIru);
}

function consumePredicateProjectionCarrierMatch(
  cursor: TokenCursor<RuntimeHaruToken>,
  match: { readonly op: PredicateProjectionCarrierOp; readonly consumed: number }
): PredicateProjectionCarrierOp {
  cursor.advance(match.consumed);
  return match.op;
}

export function matchFocusDokoroNegativeCarrier(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  stemToken: RuntimeHaruToken | undefined,
  lookups?: LookupTables
): { readonly op: PredicateProjectionCarrierOp; readonly consumed: number } | null {
  const span = matchDokoroNegativeCarrierSpanAt(tokens, pos);
  const hostClass = dokoroNegativeHostClass(stemToken, lookups);
  if (span === null || hostClass === null) {
    return null;
  }
  const surface = tokens.slice(pos, pos + span.consumed).map((token) => token.surface).join("");
  const situationBase = hostClass === "situation_deictic"
    ? dokoroSituationDeicticBase(stemToken, lookups)
    : undefined;
  const allomorph: PredicateProjectionCarrierSourceAllomorph =
    hostClass === "situation_deictic" ? "dokoro_situation_deictic" :
      hostClass === "situation_sahen" ? "dokoro_situation_sahen" :
        hostClass === "situation_verb" ? "dokoro_situation_verb" : "dokoro_scalar";
  const op = createPredicateProjectionCarrierOp({
    carrier: "limit_dokoro_negative",
    sourceAllomorph: allomorph,
    surface,
    source: srcSlice(tokens, pos, span.consumed),
    polite: span.polite,
    past: false,
    ...(situationBase === undefined ? {} : { hostSituationBase: situationBase })
  });
  return { op, consumed: span.consumed };
}

function isEquivalenceCarrierHostToken(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined || !isClauseClosingPredicateTailToken(token)) {
    return false;
  }
  return (token.pos & POS0) === 助動詞 ||
    (token.pos & POS01) === 動詞_非自立可能 ||
    isNaiOrNuToken(token);
}

export function matchEquivalenceDouzenCarrier(
  cursor: TokenCursor<RuntimeHaruToken>,
  input?: ParseInput
): { readonly op: PredicateProjectionCarrierOp; readonly consumed: number } | null {
  const { tokens, pos } = cursor;
  const marker = tokens[pos];
  if (
    marker === undefined ||
    marker.surface !== "も" ||
    (marker.pos & POS01) !== 助詞_係助詞 ||
    !isEquivalenceCarrierHostToken(tokens[pos - 1]) ||
    isParallelPredicateMoOwnershipYieldAtCursor(cursor, input)
  ) {
    return null;
  }
  const build = (
    consumed: number,
    allomorph: "equivalence_bare" | "equivalence_copular" | "equivalence_adnominal",
    polite: boolean,
    past: boolean
  ): { readonly op: PredicateProjectionCarrierOp; readonly consumed: number } => ({
    op: buildPredicateProjectionCarrierOp(
      srcSlice(tokens, pos, consumed),
      "equivalence_douzen",
      tokens.slice(pos, pos + consumed).map((token) => token.surface).join(""),
      allomorph,
      polite,
      past
    ),
    consumed
  });
  if (isEquivalenceCarrierAdnominalToken(tokens[pos + 1])) {
    return build(2, "equivalence_adnominal", false, false);
  }
  if (!isEquivalenceCarrierPredicativeNoun(tokens[pos + 1])) {
    return null;
  }
  const follower = tokens[pos + 2];
  if (follower === undefined) {
    return build(2, "equivalence_bare", false, false);
  }
  if (follower.surface === "の" && (follower.pos & POS0) === 助詞) {
    return build(3, "equivalence_adnominal", false, false);
  }
  if (
    input !== undefined &&
    isQuoteMarkerFollowerAt(input, pos + 2)
  ) {
    return build(2, "equivalence_bare", false, false);
  }
  const followerPos4 = follower.pos & POS4;
  const followerPos5A = follower.pos & POS5A;
  const dearu = matchEquivalenceDouzenDearuFollower(tokens, pos);
  if (dearu !== null) {
    return build(dearu.consumed, "equivalence_copular", false, dearu.past);
  }
  if (followerPos4 === 助動詞_ダ || followerPos4 === 助動詞_デス) {
    if (
      followerPos5A === 意志推量形_ ||
      (followerPos5A === 連体形_ && predicateNominalizerRelationForToken(tokens[pos + 3], pos + 3, {
        requirement: "terminal_noda_marker",
        consumers: ["tail_multi_clause"]
      })?.nominalizerKind === "no")
    ) {
      return build(2, "equivalence_bare", false, false);
    }
    const pastAux = tokens[pos + 3];
    const copulaPast = followerPos5A === 連用形_ &&
      pastAux !== undefined && (pastAux.pos & POS4) === 助動詞_タ;
    if (followerPos5A !== 終止形_ && !copulaPast) {
      return null;
    }
    return build(
      copulaPast ? 4 : 3,
      "equivalence_copular",
      followerPos4 === 助動詞_デス,
      copulaPast
    );
  }
  if (
    terminalDiscourseSfpRunClosesUtterance(cursor, input, 2) ||
    cursor.lookahead(2, isTailFinalQuestionSfpStart)
  ) {
    return build(2, "equivalence_bare", false, false);
  }
  return null;
}

function matchEquivalenceDouzenDearuFollower(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): { readonly consumed: number; readonly past: boolean } | null {
  const copula = tokens[pos + 2];
  if (
    copula === undefined ||
    (copula.surface !== "で" && (copula.pos & POS4) !== 助動詞_ダ) ||
    (copula.pos & POS5A) !== 連用形_
  ) {
    return null;
  }
  const aru = tokens[pos + 3];
  if (!isAruVerbToken(aru)) {
    return null;
  }
  const aruPos5A = aru.pos & POS5A;
  if (aruPos5A !== 終止形_ && aruPos5A !== 連用形_ && aruPos5A !== 連体形_) {
    return null;
  }
  const pastAux = tokens[pos + 4];
  return aruPos5A === 連用形_ && pastAux !== undefined && (pastAux.pos & POS4) === 助動詞_タ
    ? { consumed: 5, past: true }
    : { consumed: 4, past: false };
}

function isQuoteMarkerFollowerAt(input: ParseInput, markerPos: number): boolean {
  const relation = quoteStructuralRelationStartingAt(
    contextCursorForInputPosition(input, markerPos),
    input.lookups
  );
  return relation !== undefined && relation.quote.slotKind === "quoted_content";
}

export function matchRecentPastBakariCarrier(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  previousOps: readonly AuxOpNode[],
  lookups?: LookupTables
): { readonly op: PredicateProjectionCarrierOp; readonly consumed: number } | null {
  if (!previousOpsHaveExperiencePastAttributive(previousOps)) {
    return null;
  }
  if (!isSecondaryParticle(tokens[pos], "ばかり")) {
    return null;
  }

  const adnominalCarrier = matchRecentPastBakariAdnominalCarrier(tokens, pos);
  if (adnominalCarrier !== null) {
    return adnominalCarrier;
  }
  const follower = matchBakariCopulaFollower(tokens, pos + 1, lookups);
  if (follower === null) {
    return null;
  }
  const consumed = 1 + follower.consumed;
  return {
    op: buildPredicateProjectionCarrierOp(
      srcSlice(tokens, pos, consumed),
      "recent_past_bakari",
      tokens.slice(pos, pos + consumed).map((t) => t.surface).join(""),
      follower.verbSupport ? "recent_past_verb_support" : "recent_past_copular",
      follower.polite,
      true
    ),
    consumed
  };
}

function matchRecentPastBakariAdnominalCarrier(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): { readonly op: PredicateProjectionCarrierOp; readonly consumed: number } | null {
  const no = tokens[pos + 1];
  if (no === undefined || no.surface !== "の") {
    return null;
  }
  const consumed = 2;
  return {
    op: buildPredicateProjectionCarrierOp(
      srcSlice(tokens, pos, consumed),
      "recent_past_bakari",
      tokens.slice(pos, pos + consumed).map((t) => t.surface).join(""),
      "recent_past_adnominal",
      false,
      true
    ),
    consumed
  };
}

function matchBakariCopulaFollower(
  tokens: readonly RuntimeHaruToken[],
  followerStart: number,
  lookups?: LookupTables
): { readonly consumed: number; readonly polite: boolean; readonly past: boolean; readonly verbSupport: boolean } | null {
  const copula = tokens[followerStart];
  if (copula === undefined) {
    return null;
  }
  const copulaPos4 = copula.pos & POS4;
  const copulaPos5A = copula.pos & POS5A;
  if ((copula.surface === "で" || copulaPos4 === 助動詞_ダ) && copulaPos5A === 連用形_) {
    const aru = tokens[followerStart + 1];
    if (isAruVerbToken(aru)) {
      const aruPos5A = aru.pos & POS5A;
      if (aruPos5A === 終止形_ || aruPos5A === 連用形_ || aruPos5A === 連体形_) {
        const pastAux = tokens[followerStart + 2];
        const aruPast = aruPos5A === 連用形_ && pastAux !== undefined && (pastAux.pos & POS4) === 助動詞_タ;
        return { consumed: aruPast ? 3 : 2, polite: false, past: aruPast, verbSupport: true };
      }
    }
  }
  const adnominalNa =
    copula.surface === "な" &&
    copulaPos4 === 助動詞_ダ &&
    copulaPos5A === 連体形_;
  const adnominalFeedsTail =
    adnominalNa &&
    lookups !== undefined &&
    attributiveCopulaTailFollows(tokens, followerStart + 1, lookups);
  const adnominalFeedsNoda =
    adnominalNa &&
    predicateNominalizerRelationForToken(tokens[followerStart + 1], followerStart + 1, {
      requirement: "terminal_noda_marker",
      consumers: ["tail_multi_clause"]
    })?.nominalizerKind === "no";
  if (
    !adnominalFeedsTail &&
    !adnominalFeedsNoda &&
    !((copulaPos4 === 助動詞_ダ || copulaPos4 === 助動詞_デス) &&
      (copulaPos5A === 終止形_ || copulaPos5A === 連用形_))
  ) {
    return null;
  }
  const pastAux = tokens[followerStart + 1];
  const copulaPast = copulaPos5A === 連用形_ && pastAux !== undefined && (pastAux.pos & POS4) === 助動詞_タ;
  return {
    consumed: copulaPast ? 2 : 1,
    polite: copulaPos4 === 助動詞_デス,
    past: copulaPast,
    verbSupport: false
  };
}

export function matchDeclaredProjectionCarrierForm(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  lookups?: LookupTables
): { readonly op: PredicateProjectionCarrierOp; readonly consumed: number } | null {
  for (const form of PROJECTION_CARRIER_FORMS) {
    if (!projectionCarrierHostAttaches(form.host, tokens[pos - 1])) {
      continue;
    }
    if (!form.marker.every((condition, offset) => projectionCarrierTokenMatches(condition, tokens[pos + offset]))) {
      continue;
    }
    const followerStart = pos + form.marker.length;
    if (matchFocusConnectiveAt(tokens, followerStart - 1) !== null) {
      continue;
    }
    for (const branch of form.branches) {
      let followerConsumed: number | null = null;
      let polite = false;
      let past = false;
      if (branch.follower.kind === "copula") {
        const copula = matchBakariCopulaFollower(tokens, followerStart, lookups);
        if (copula !== null) {
          followerConsumed = copula.consumed;
          polite = copula.polite;
          past = copula.past;
        }
      } else if (branch.follower.tokens.every((condition, offset) =>
        projectionCarrierTokenMatches(condition, tokens[followerStart + offset]))) {
        followerConsumed = branch.follower.tokens.length;
      }
      if (followerConsumed === null) {
        continue;
      }
      const consumed = form.marker.length + followerConsumed;
      return {
        op: buildPredicateProjectionCarrierOp(
          srcSlice(tokens, pos, consumed),
          form.carrier,
          tokens.slice(pos, pos + consumed).map((t) => t.surface).join(""),
          branch.allomorph,
          polite,
          past
        ),
        consumed
      };
    }
  }
  return null;
}

function matchUntilCopularCarrier(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  previousOps: readonly AuxOpNode[]
): { readonly op: PredicateProjectionCarrierOp; readonly consumed: number } | null {
  const made = tokens[pos];
  if (made === undefined || made.surface !== "まで" || (made.pos & POS01) !== 助詞_副助詞) {
    return null;
  }
  const copula = tokens[pos + 1];
  if (copula === undefined) {
    return null;
  }
  const pos4 = copula.pos & POS4;
  const pos5A = copula.pos & POS5A;
  if (pos4 !== 助動詞_ダ && pos4 !== 助動詞_デス) {
    return null;
  }
  const polite = pos4 === 助動詞_デス;
  let consumed: number;
  let past: boolean;
  if (pos5A === 終止形_) {
    consumed = 2;
    past = false;
  } else if (
    pos5A === 連用形_ &&
    tokens[pos + 2] !== undefined &&
    (tokens[pos + 2]!.pos & POS4) === 助動詞_タ
  ) {
    consumed = 3;
    past = true;
  } else {
    return null;
  }
  const limitAssertion = previousOpsHaveExperiencePastAttributive(previousOps);
  const surface = tokens.slice(pos, pos + consumed).map((t) => t.surface).join("");
  return {
    op: limitAssertion
      ? buildPredicateProjectionCarrierOp(
        srcSlice(tokens, pos, consumed),
        "limit_dake",
        surface,
        "limit_copular",
        polite,
        past
      )
      : buildPredicateProjectionCarrierOp(
        srcSlice(tokens, pos, consumed),
        "until_extent",
        surface,
        null,
        polite,
        past
      ),
    consumed
  };
}

function matchUntilBareTerminalSfpCarrier(
  cursor: TokenCursor<RuntimeHaruToken>,
  input?: ParseInput
): { readonly op: PredicateProjectionCarrierOp; readonly consumed: number } | null {
  const { tokens, pos } = cursor;
  const made = tokens[pos];
  if (
    made === undefined ||
    made.surface !== "まで" ||
    (made.pos & POS01) !== 助詞_副助詞
  ) {
    return null;
  }
  const ni = tokens[pos + 1];
  const markerConsumed = ni !== undefined && ni.surface === "に" && (ni.pos & POS01) === 助詞_格助詞
    ? 2
    : 1;
  if (
    !terminalDiscourseSfpRunClosesUtterance(cursor, input, markerConsumed) &&
    !cursor.lookahead(markerConsumed, isTailFinalQuestionSfpStart)
  ) {
    return null;
  }
  return {
    op: buildPredicateProjectionCarrierOp(
      srcSlice(tokens, pos, markerConsumed),
      "until_extent",
      tokens.slice(pos, pos + markerConsumed).map((token) => token.surface).join(""),
      null,
      false,
      false
    ),
    consumed: markerConsumed
  };
}

function matchDegreeExtentAmountCarrier(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): { readonly op: PredicateProjectionCarrierOp; readonly consumed: number } | null {
  const degree = tokens[pos];
  if (degree === undefined || !isDegreeExtentParticle(degree)) {
    return null;
  }
  const degreeSurface = degree.surface;
  const copula = tokens[pos + 1];
  if (copula === undefined) {
    return null;
  }
  const pos4 = copula.pos & POS4;
  const pos5A = copula.pos & POS5A;
  if (pos4 !== 助動詞_ダ && pos4 !== 助動詞_デス) {
    return null;
  }
  const polite = pos4 === 助動詞_デス;
  if (
    pos4 === 助動詞_ダ &&
    pos5A === 連体形_ &&
    copula.surface === "な" &&
    predicateNominalizerRelationForToken(tokens[pos + 2], pos + 2, {
      requirement: "terminal_noda_marker",
      consumers: ["tail_multi_clause"]
    })?.nominalizerKind === "no"
  ) {
    return {
      op: buildPredicateProjectionCarrierOp(
        srcSlice(tokens, pos, 2),
        "degree_extent_amount",
        `${degreeSurface}${copula.surface}`,
        null,
        false
      ),
      consumed: 2
    };
  }
  if (pos5A === 終止形_) {
    return {
      op: buildPredicateProjectionCarrierOp(
        srcSlice(tokens, pos, 2),
        "degree_extent_amount",
        `${degreeSurface}${copula.surface}`,
        null,
        polite
      ),
      consumed: 2
    };
  }
  if (pos5A === 連用形_) {
    const past = tokens[pos + 2];
    if (past !== undefined && (past.pos & POS4) === 助動詞_タ) {
      return {
        op: buildPredicateProjectionCarrierOp(
          srcSlice(tokens, pos, 3),
          "degree_extent_amount",
          tokens.slice(pos, pos + 3).map((t) => t.surface).join(""),
          null,
          polite,
          true
        ),
        consumed: 3
      };
    }
  }
  return null;
}

export function closedSfpRunQuotativeMannerSimileAtBoundary(
  input: ParseInput,
  c: TokenCursor<RuntimeHaruToken>,
  sfpStart: number,
  hint: NonNullable<ParseInput["outgoingBoundaryHint"]>,
  stemTok: RuntimeHaruToken,
  previousOps: readonly AuxOpNode[]
): SfpNode | null | undefined {
  if (
    hint.connectiveKind !== "predicate_projection_quotative_manner_simile" &&
    hint.connectiveKind !== "predicate_projection_quotative_manner_simile_attributive"
  ) {
    return undefined;
  }
  const mitaiPos = c.pos - 2;
  if (mitaiPos <= sfpStart) {
    return undefined;
  }
  const match = quotativeMannerSimileMatchInParseSlice(input, c.fork(mitaiPos), mitaiPos);
  if (
    match?.closure !== "terminal_particle_run" ||
    contextAlignedPosition(input, c, mitaiPos).index - match.leadingSfpCount !==
      contextAlignedPosition(input, c, sfpStart).index
  ) {
    return undefined;
  }
  return closedSfpOfQuotativeMannerSimileRun(input, c.fork(sfpStart, mitaiPos), stemTok, previousOps);
}

export function quotativeMannerSimileMatchInParseSlice(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>,
  pos: number
): QuotativeMannerSimileConnectiveMatch | null {
  const context = contextAlignedPosition(input, cursor, pos);
  const match = matchQuotativeMannerSimileConnectiveAt(context.tokens, context.index, input.lookups);
  return match !== null && pos + match.consumed <= cursor.end ? match : null;
}
