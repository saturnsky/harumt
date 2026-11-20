import { activeProtoLayout } from "../../../../clause-layout/proto-state.js";
import type { MatcherToken } from "../../../../matchers.js";
import { caseParticleMarkerRelationForToken, copulaDeMarkerRelationForToken, conditionalTailConnectiveRelationForToken, externalNominalizerContinuationRelationAt, caseParticleNiClauseConnectiveRelationAt, nominalLinkMarkerRelationAt, nominalizerAdversativeConnectiveRelationAt, nominalizerQuestionContentConnectiveRelationAt, nominalizerReasonConnectiveRelationAt, predicateNominalizerRelationForToken, questionContentContinuationAfterKaRelationAt, questionReformulationClaimAt, topicFocusMarkerRelationAt } from "../../../boundary/marker.js";
import { quoteMarkerRelationAt } from "../../../boundary/quote-marker.js";
import type { TopicFocusMarkerSurface } from "../../../boundary/relation.js";
import { isHardTerminalPunctuationToken, isWeakPunctuationToken } from "../../../boundary/punctuation.js";
import type { CanonicalReformulationMarkerRelation } from "../../../boundary/ka-ownership.js";
import { looksPronominalNoDe } from "../../../boundary/pronominal-no.js";
import type { SemanticClauseSpan } from "../../../candidate/semantic-classifiers.js";
import { TokenCursor } from "../../../../token-cursor.js";
import { lineMemo } from "../../../line-memo.js";
import { compositeConnectivePatternRelationAt } from "../../connective-span-scanner.js";
import { proportionalReasonDakeNiAdmitted, ueDeAttributiveProjectionAdmitted, ueDeProjectionAdmitted } from "./predicate-projection-connective.js";
import { boundNominalReasonCompositeFollowerAdmitted } from "./tame-connective.js";
import {
  isAruVerbToken,
  isClauseClosingPredicateTailToken,
  isNaiOrNuToken,
  isSuruVerbToken,
  isTeSurfaceConnectiveToken,
  isThoughtVerbToken
} from "../classifiers/tokens.js";
import { isSayVerbToken } from "../../../data/quoted-reporting-sets.js";
import type { ConnectiveKind, ConnectiveSurfaceAllomorph, RetrospectiveQuotativeFlavor } from "../grammar.js";
import { lookupConnectiveBySurface, lookupRetrospectiveQuotativeFlavor } from "../connective-surface-lookup.js";
import { POS0, POS4, POS5A, isAdverbCapable, isConditionalInflection, isImperativeInflection, isRealisInflection, 仮定形_, 助詞, 助動詞 as 助動詞0, 助動詞_タ, 助動詞_レル, 動詞, 未然形_, 名詞, 終止形_, 連体形_, POS01, 助詞_接続助詞, 係助詞 } from "../../../../../types/pos.js";

export interface CompositeConnectiveMatch {
  readonly connective: ConnectiveKind;
  readonly surface: string;
  readonly consumed: number;
  readonly hostBound?: true;
  readonly surfaceAllomorph?: ConnectiveSurfaceAllomorph;
  readonly retrospectiveQuotativeFlavor?: RetrospectiveQuotativeFlavor;
}

function dismissiveParallelMoPatternAdmitted(
  tokens: readonly MatcherToken[],
  pos: number,
  surface: string
): boolean {
  if (surface !== "も何も") {
    return true;
  }
  const host = tokens[pos - 1];
  if (host === undefined || !isClauseClosingPredicateTailToken(host)) {
    return false;
  }
  return !reachesNegatedVerbPredicate(tokens, pos + 3);
}

function reachesNegatedVerbPredicate(tokens: readonly MatcherToken[], idx: number): boolean {
  let cursor = idx;
  while (cursor < tokens.length) {
    const token = tokens[cursor];
    if (token === undefined || isWeakPunctuationToken(token) || isHardTerminalPunctuationToken(token)) {
      return false;
    }
    if (!isAdverbCapable(token)) {
      break;
    }
    cursor += 1;
  }
  return startsNegatedVerbPredicate(tokens, cursor);
}

function startsNegatedVerbPredicate(tokens: readonly MatcherToken[], idx: number): boolean {
  const verb = tokens[idx];
  if (verb === undefined || (verb.pos & POS0) !== 動詞 || isAruVerbToken(verb)) {
    return false;
  }
  for (let cursor = idx + 1; cursor <= idx + 3; cursor += 1) {
    const token = tokens[cursor];
    if (token === undefined) {
      return false;
    }
    if (isNaiOrNuToken(token)) {
      return true;
    }
    if ((token.pos & POS0) !== 助動詞0) {
      return false;
    }
  }
  return false;
}

export function matchCompositeConnectiveAt(
  cursor: TokenCursor<MatcherToken>,
  options: { readonly requireEnd?: boolean; readonly clause?: SemanticClauseSpan | null } = {}
): CompositeConnectiveMatch | null {
  const requireEnd = options.requireEnd ?? true;
  const clause = options.clause ?? null;
  return lineMemo(
    cursor.tokens as object,
    `cc|${requireEnd ? 1 : 0}|${cursor.pos}|${cursor.end}|${clause === null ? "-" : `${clause.start}:${clause.end}`}`,
    () => computeMatchCompositeConnectiveAt(cursor, requireEnd, clause),
    activeProtoLayout()
  );
}

function computeMatchCompositeConnectiveAt(
  cursor: TokenCursor<MatcherToken>,
  requireEnd: boolean,
  clause: SemanticClauseSpan | null
): CompositeConnectiveMatch | null {
  const tokens = cursor.tokens;
  const pos = cursor.pos;
  const t0 = tokens[pos];
  if (t0 === undefined) return null;

  const endOk = (consumed: number): boolean => !requireEnd || pos + consumed >= cursor.end || tokens[pos + consumed] === undefined;
  const reasonQuotedJudgmentPassive = matchReasonQuotedJudgmentPassiveConnectiveAt(tokens, pos, { requireEnd });
  if (reasonQuotedJudgmentPassive !== null) {
    return reasonQuotedJudgmentPassive;
  }
  const nominalizedQuestionAlternative = matchNominalizedQuestionAlternativeAt(tokens, pos, { requireEnd });
  if (nominalizedQuestionAlternative !== null) {
    return nominalizedQuestionAlternative;
  }
  const connectivePattern = compositeConnectivePatternRelationAt(cursor, {
    consumers: ["tail_multi_clause"],
    lookupConnectiveKind: lookupConnectiveBySurface
  });
  if (connectivePattern !== null && endOk(connectivePattern.tokenCount)) {
    const connective = lookupConnectiveBySurface(connectivePattern.surface);
    const rowKindAdmitted = (
      connective !== "predicate_projection_proportional_reason" ||
      proportionalReasonDakeNiAdmitted(tokens, pos + connectivePattern.tokenCount)
    ) && (
      connective !== "predicate_projection_ue_de" ||
      ueDeProjectionAdmitted(tokens, pos, pos + connectivePattern.tokenCount)
    ) && (
      connective !== "predicate_projection_ue_de_attributive" ||
      ueDeAttributiveProjectionAdmitted(tokens, pos, pos + connectivePattern.tokenCount)
    ) && (
      connective !== "tame_reason" ||
      boundNominalReasonCompositeFollowerAdmitted(tokens, pos + connectivePattern.tokenCount)
    ) && (
      caseParticleMarkerRelationForToken(t0, pos, {
        acceptedSurfaces: ["に"],
        consumers: ["tail_multi_clause"]
      }) === null ||
      caseParticleNiClauseConnectiveRelationAt(tokens, pos, { consumers: ["tail_multi_clause"] }) !== null
    );
    if (connective !== undefined && rowKindAdmitted && dismissiveParallelMoPatternAdmitted(tokens, pos, connectivePattern.surface)) {
      return {
        connective,
        surface: connectivePattern.surface,
        consumed: connectivePattern.tokenCount,
        ...(connectivePattern.hostIndex === undefined ? {} : { hostBound: true as const })
      };
    }
  }

  const kaAlternative = questionContentContinuationAfterKaRelationAt(tokens, pos, {
    consumers: ["tail_multi_clause"],
    limit: tokens.length,
    requireAdjacent: true
  });
  if (kaAlternative?.continuationKind === "question_alternative_marker") {
    const consumed = kaAlternative.span.endExclusive - pos;
    if (endOk(consumed)) {
      return { connective: "question_content_alternative", surface: "かどうか", consumed };
    }
  }

  const nominalizerQuestion = nominalizerQuestionContentConnectiveRelationAt(tokens, pos, {
    allowTerminalKa: !requireEnd,
    consumers: ["tail_multi_clause"]
  });
  if (nominalizerQuestion !== null) {
    const consumed = nominalizerQuestion.span.endExclusive - pos;
    if (endOk(consumed)) {
      return { connective: "question_content", surface: nominalizerQuestion.surface, consumed };
    }
  }

  const nominalizerReason = nominalizerReasonConnectiveRelationAt(tokens, pos, {
    consumers: ["tail_multi_clause"]
  });
  if (nominalizerReason !== null && !cursor.lookahead(0, (c) => looksPronominalNoDe(c, { clause }))) {
    const consumed = nominalizerReason.span.endExclusive - pos;
    if (endOk(consumed)) {
      return { connective: "reason", surface: nominalizerReason.surface, consumed };
    }
  }

  const externalNominalizer = externalNominalizerContinuationRelationAt(tokens, pos, {
    requireEnd,
    consumers: ["tail_multi_clause"]
  });
  if (externalNominalizer !== null) {
    return {
      connective: externalNominalizer.connectiveKind,
      surface: externalNominalizer.surface,
      consumed: externalNominalizer.span.endExclusive - pos
    };
  }

  const nominalizerAdversative = nominalizerAdversativeConnectiveRelationAt(tokens, pos, {
    consumers: ["tail_multi_clause"]
  });
  if (nominalizerAdversative !== null) {
    const consumed = nominalizerAdversative.span.endExclusive - pos;
    if (endOk(consumed)) {
      return { connective: "adversative", surface: nominalizerAdversative.surface, consumed };
    }
  }

  return null;
}

function matchNominalizedQuestionAlternativeAt(
  tokens: readonly MatcherToken[],
  pos: number,
  options: { readonly requireEnd: boolean }
): CompositeConnectiveMatch | null {
  const nominalizer = predicateNominalizerRelationForToken(tokens[pos], pos, {
    requirement: "tail_connective_marker",
    consumers: ["tail_multi_clause"]
  });
  if (nominalizer?.nominalizerKind !== "no") {
    return null;
  }
  const alternative = questionContentContinuationAfterKaRelationAt(tokens, pos + 1, {
    consumers: ["tail_multi_clause"],
    limit: tokens.length,
    requireAdjacent: true
  });
  if (alternative?.continuationKind !== "question_alternative_marker") {
    return null;
  }
  const consumed = alternative.span.endExclusive - pos;
  if (options.requireEnd && tokens[pos + consumed] !== undefined) {
    return null;
  }
  return {
    connective: "question_content_alternative",
    surface: tokens.slice(pos, alternative.span.endExclusive).map((token) => token.surface).join(""),
    consumed
  };
}

function matchReasonQuotedJudgmentPassiveConnectiveAt(
  tokens: readonly MatcherToken[],
  pos: number,
  options: { readonly requireEnd?: boolean } = {}
): CompositeConnectiveMatch | null {
  const requireEnd = options.requireEnd ?? true;
  const endOk = (consumed: number): boolean => !requireEnd || tokens[pos + consumed] === undefined;
  const reason = tokens[pos];
  if (
    caseParticleMarkerRelationForToken(reason, pos, {
      acceptedSurfaces: ["から"],
      acceptedParticleSubtypes: ["格助詞", "接続助詞"],
      consumers: ["tail_multi_clause"]
    }) === null
  ) {
    return null;
  }
  if (
    copulaDeMarkerRelationForToken(tokens[pos + 1], pos + 1, {
      consumers: ["tail_multi_clause"]
    }) === null
  ) {
    return null;
  }
  const aru = tokens[pos + 2];
  if (!isAruVerbToken(aru)) {
    return null;
  }
  const aruForm5A = aru.pos & POS5A;
  if (aruForm5A !== 終止形_ && aruForm5A !== 連体形_) {
    return null;
  }
  const quoteMarker = quoteMarkerRelationAt(tokens, pos + 3, {
    consumers: ["tail_multi_clause"]
  });
  if (quoteMarker?.canonicalSurface !== "と") {
    return null;
  }
  const suruIdx = quoteMarker.span.endExclusive;
  const suru = tokens[suruIdx];
  if (
    suru === undefined ||
    !isSuruVerbToken(suru) ||
    (suru.pos & POS5A) !== 未然形_
  ) {
    return null;
  }
  const passive = tokens[suruIdx + 1];
  if (
    passive === undefined || (passive.pos & (POS0 | POS4)) !== (助動詞0 | 助動詞_レル)
  ) {
    return null;
  }
  const afterPassive = suruIdx + 2;
  const adversative = tokens[afterPassive];
  const consumed =
    adversative !== undefined && adversative.surface === "が" && (adversative.pos & POS01) === 助詞_接続助詞
      ? afterPassive + 1 - pos
      : afterPassive - pos;
  if (!endOk(consumed)) {
    return null;
  }
  return {
    connective: "reason_quoted_judgment_passive",
    surface: tokens.slice(pos, pos + consumed).map((token) => token.surface).join(""),
    consumed
  };
}

function reformulationFocusParticleAt(
  tokens: readonly MatcherToken[],
  idx: number
): TopicFocusMarkerSurface | null {
  return topicFocusMarkerRelationAt(tokens, idx, {
    acceptedSurfaces: ["は", "も"],
    acceptedParticleSubtypes: [係助詞],
    consumers: ["tail_multi_clause"]
  })?.markerSurface ?? null;
}

export function matchReformulationConnectiveAt(
  tokens: readonly MatcherToken[],
  pos: number,
  options: {
    readonly requireEnd?: boolean;
    readonly canonicalRelation: CanonicalReformulationMarkerRelation | null;
  }
): CompositeConnectiveMatch | null {
  const requireEnd = options.requireEnd ?? true;
  const relation = options.canonicalRelation;
  if (relation !== null && relation.eligibleForQuotePreemption) {
    const consumed = relation.span.endExclusive - relation.quoteMarkerIdx;
    if (requireEnd && tokens[pos + consumed] !== undefined) return null;
    return {
      connective: "reformulation",
      surface: tokens.slice(pos, pos + consumed).map((token) => token.surface).join(""),
      surfaceAllomorph: "reformulation_ka",
      consumed
    };
  }
  if (relation !== null && relation.politeAuxSpan === null) {
    const consumed = relation.span.endExclusive - relation.quoteMarkerIdx;
    if (requireEnd && tokens[pos + consumed] !== undefined) return null;
    return {
      connective: "reformulation",
      surface: tokens.slice(pos, pos + consumed).map((token) => token.surface).join(""),
      consumed
    };
  }

  const quoteMarker = quoteMarkerRelationAt(tokens, pos, {
    consumers: ["tail_multi_clause"]
  });
  if (quoteMarker?.canonicalSurface !== "と" && quoteMarker?.canonicalSurface !== "って") {
    return null;
  }
  const sayIdx = quoteMarker.span.endExclusive;
  const say = tokens[sayIdx];
  const yoriIdx = sayIdx + 1;
  const yori = tokens[yoriIdx];
  if (
    say === undefined ||
    !isSayVerbToken(say) ||
    yori === undefined ||
    caseParticleMarkerRelationForToken(yori, yoriIdx, {
      acceptedSurfaces: ["より"],
      consumers: ["tail_multi_clause"]
    }) === null
  ) {
    return null;
  }
  const focus = reformulationFocusParticleAt(tokens, yoriIdx + 1);
  const consumed = yoriIdx + 1 + (focus === null ? 0 : 1) - pos;
  if (requireEnd && tokens[pos + consumed] !== undefined) return null;
  return {
    connective: "reformulation",
    surface: tokens.slice(pos, pos + consumed).map((token) => token.surface).join(""),
    consumed
  };
}

export function matchQuotedConcessiveConnectiveAt(
  tokens: readonly MatcherToken[],
  pos: number,
  options: { readonly requireEnd?: boolean } = {}
): CompositeConnectiveMatch | null {
  const requireEnd = options.requireEnd ?? true;
  const endOk = (consumed: number): boolean => !requireEnd || tokens[pos + consumed] === undefined;
  const first = tokens[pos];
  if (first === undefined || (first.pos & POS0) !== 助詞) return null;

  if (caseParticleMarkerRelationForToken(first, pos, {
    acceptedSurfaces: ["から"],
    acceptedParticleSubtypes: ["格助詞", "接続助詞"],
    consumers: ["tail_multi_clause"]
  }) !== null) {
    const nextQuoteMarker = quoteMarkerRelationAt(tokens, pos + 1, {
      consumers: ["tail_multi_clause"]
    });
    if (nextQuoteMarker?.canonicalSurface === "って" && endOk(2)) {
      return { connective: "quoted_concessive", surface: "からって", consumed: 2 };
    }
    const say = tokens[pos + 2];
    const te = tokens[pos + 3];
    const quoteMarker = quoteMarkerRelationAt(tokens, pos + 1, {
      consumers: ["tail_multi_clause"]
    });
    if (
      quoteMarker?.canonicalSurface === "と" &&
      say !== undefined &&
      isSayVerbToken(say) &&
      isTeSurfaceConnectiveToken(te) &&
      endOk(4)
    ) {
      return { connective: "quoted_concessive", surface: `から${quoteMarker.surface}${say.surface}${te.surface}`, consumed: 4 };
    }
    return null;
  }

  const quoteMarker = quoteMarkerRelationAt(tokens, pos, {
    consumers: ["tail_multi_clause"]
  });
  if (quoteMarker?.canonicalSurface !== "と" && quoteMarker?.canonicalSurface !== "って") return null;
  const second = tokens[quoteMarker.span.endExclusive];
  if (second === undefined) return null;

  if (isSayVerbToken(second)) {
    const te = tokens[quoteMarker.span.endExclusive + 1];
    const mo = tokens[quoteMarker.span.endExclusive + 2];
    const consumed = quoteMarker.span.endExclusive + 3 - pos;
    if (isTeSurfaceConnectiveToken(te) && mo?.surface === "も" && (mo.pos & POS0) === 助詞 && endOk(consumed)) {
      return { connective: "quoted_concessive", surface: `${quoteMarker.surface}${second.surface}${te.surface}${mo.surface}`, consumed };
    }
    const negative = tokens[quoteMarker.span.endExclusive + 1];
    const made = tokens[quoteMarker.span.endExclusive + 2];
    const madeMo = tokens[quoteMarker.span.endExclusive + 3];
    const naiMadeMoConsumed = quoteMarker.span.endExclusive + 4 - pos;
    if (
      isQuotedConcessiveNegativeToken(negative) &&
      made?.surface === "まで" &&
      (made.pos & POS0) === 助詞 &&
      madeMo?.surface === "も" &&
      (madeMo.pos & POS0) === 助詞 &&
      endOk(naiMadeMoConsumed)
    ) {
      return {
        connective: "quoted_concessive",
        surface: `${quoteMarker.surface}${second.surface}${negative.surface}${made.surface}${madeMo.surface}`,
        consumed: naiMadeMoConsumed
      };
    }
    return null;
  }

  if (second.surface !== "は" || (second.pos & POS0) !== 助詞) return null;
  const say = tokens[quoteMarker.span.endExclusive + 1];
  if (say === undefined || !isSayVerbToken(say)) return null;
  const negative = tokens[quoteMarker.span.endExclusive + 2];
  const made = tokens[quoteMarker.span.endExclusive + 3];
  const mo = tokens[quoteMarker.span.endExclusive + 4];
  const naiMadeMoConsumed = quoteMarker.span.endExclusive + 5 - pos;
  if (
    isQuotedConcessiveNegativeToken(negative) &&
    made?.surface === "まで" &&
    (made.pos & POS0) === 助詞 &&
    mo?.surface === "も" &&
    (mo.pos & POS0) === 助詞 &&
    endOk(naiMadeMoConsumed)
  ) {
    return {
      connective: "quoted_concessive",
      surface: `${quoteMarker.surface}${second.surface}${say.surface}${negative.surface}${made.surface}${mo.surface}`,
      consumed: naiMadeMoConsumed
    };
  }
  const mono = tokens[quoteMarker.span.endExclusive + 2];
  const no = tokens[quoteMarker.span.endExclusive + 3];
  const mononoConsumed = quoteMarker.span.endExclusive + 4 - pos;
  if (
    mono?.surface === "もの" &&
    (mono.pos & POS0) === 名詞 &&
    nominalLinkMarkerRelationAt(tokens, quoteMarker.span.endExclusive + 3, {
      consumers: ["tail_multi_clause"]
    }) !== null &&
    endOk(mononoConsumed)
  ) {
    return { connective: "quoted_concessive", surface: `${quoteMarker.surface}${second.surface}${say.surface}${mono.surface}${no!.surface}`, consumed: mononoConsumed };
  }
  const topicTe = tokens[quoteMarker.span.endExclusive + 2];
  const topicTeMo = tokens[quoteMarker.span.endExclusive + 3];
  const topicTeMoConsumed = quoteMarker.span.endExclusive + 4 - pos;
  if (
    isTeSurfaceConnectiveToken(topicTe) &&
    topicTeMo?.surface === "も" &&
    (topicTeMo.pos & POS0) === 助詞 &&
    endOk(topicTeMoConsumed)
  ) {
    return {
      connective: "quoted_concessive",
      surface: `${quoteMarker.surface}${second.surface}${say.surface}${topicTe.surface}${topicTeMo.surface}`,
      consumed: topicTeMoConsumed
    };
  }
  if (!isQuotedConcessiveIeInflection(say)) return null;
  const doIdx = quoteMarker.span.endExclusive + 2;
  const doToken = tokens[doIdx];
  const hasDo = doToken?.surface === "ど" && (doToken.pos & POS0) === 助詞;
  const doMo = hasDo ? tokens[doIdx + 1] : undefined;
  const hasDoMo = doMo?.surface === "も" && (doMo.pos & POS0) === 助詞;
  const consumed = doIdx + (hasDo ? 1 : 0) + (hasDoMo ? 1 : 0) - pos;
  if (endOk(consumed)) {
    return {
      connective: "quoted_concessive",
      surface: tokens.slice(pos, pos + consumed).map((token) => token.surface).join(""),
      consumed
    };
  }
  return null;
}

function isQuotedConcessiveIeInflection(token: MatcherToken): boolean {
  return isConditionalInflection(token.pos) || isRealisInflection(token.pos) || isImperativeInflection(token.pos);
}

function isQuotedConcessiveNegativeToken(token: MatcherToken | undefined): token is MatcherToken {
  return token !== undefined &&
    (token.pos & POS0) === 助動詞0 &&
    isNaiOrNuToken(token) &&
    (token.surface === "ない" || token.surface === "ぬ" || token.surface === "ん");
}

export function matchRetrospectiveQuoteConnectiveAt(
  tokens: readonly MatcherToken[],
  pos: number,
  options: { readonly requireEnd?: boolean } = {}
): CompositeConnectiveMatch | null {
  const requireEnd = options.requireEnd ?? true;
  const endOk = (consumed: number): boolean => !requireEnd || tokens[pos + consumed] === undefined;

  const first = tokens[pos];
  if (first === undefined || (first.pos & POS0) !== 助詞) return null;

  const quoteMarker = quoteMarkerRelationAt(tokens, pos, {
    consumers: ["tail_multi_clause"]
  });
  if (quoteMarker?.canonicalSurface === "と" || quoteMarker?.canonicalSurface === "って") {
    const thoughtIdx = quoteMarker.span.endExclusive;
    const thought = tokens[thoughtIdx];
    const tail = tokens[thoughtIdx + 1];
    if (thought === undefined || !isThoughtVerbToken(thought)) return null;
    if (!isRetrospectiveTaraTail(tail)) return null;
    const consumed = thoughtIdx + 2 - pos;
    if (!endOk(consumed)) return null;
    const surface = `${first.surface}${thought.surface}${tail!.surface}`;
    const retrospectiveQuotativeFlavor = lookupRetrospectiveQuotativeFlavor(surface);
    if (retrospectiveQuotativeFlavor !== "direct_thought") return null;
    return {
      connective: "retrospective_quotative",
      surface,
      consumed,
      retrospectiveQuotativeFlavor
    };
  }

  const questionQuote = questionContentContinuationAfterKaRelationAt(tokens, pos, {
    consumers: ["tail_multi_clause"],
    requireAdjacent: true,
    limit: tokens.length
  });
  if (questionQuote?.continuationKind === "question_quote_marker") {
    const thought = tokens[questionQuote.span.endExclusive];
    const tail = tokens[questionQuote.span.endExclusive + 1];
    if (thought === undefined || !isThoughtVerbToken(thought)) return null;
    if (!isQuestionRetrospectiveTail(tail)) return null;
    const consumed = questionQuote.span.endExclusive + 2 - pos;
    if (!endOk(consumed)) return null;
    const surface = `かと${thought.surface}${tail!.surface}`;
    const retrospectiveQuotativeFlavor = lookupRetrospectiveQuotativeFlavor(surface);
    if (retrospectiveQuotativeFlavor !== "question_retrospective") return null;
    return {
      connective: "retrospective_quotative",
      surface,
      consumed,
      retrospectiveQuotativeFlavor
    };
  }

  return null;
}

export function matchQuestionReformulationConnectiveAt(
  tokens: readonly MatcherToken[],
  pos: number,
  options: { readonly requireEnd?: boolean } = {}
): CompositeConnectiveMatch | null {
  const requireEnd = options.requireEnd ?? true;
  const claim = questionReformulationClaimAt(tokens, pos, { consumers: ["tail_multi_clause"] });
  if (claim === null) return null;
  const consumed = claim.span.endExclusive - pos;
  if (requireEnd && tokens[pos + consumed] !== undefined) return null;
  return {
    connective: "question_reformulation",
    surface: tokens.slice(pos, claim.span.endExclusive).map((token) => token.surface).join(""),
    consumed
  };
}

function isRetrospectiveTaraTail(token: MatcherToken | undefined): boolean {
  return token !== undefined && (token.pos & (POS0 | POS4 | POS5A)) === (助動詞0 | 助動詞_タ | 仮定形_);
}

function isQuestionRetrospectiveTail(token: MatcherToken | undefined): boolean {
  if (token === undefined) return false;
  if (isRetrospectiveTaraTail(token)) return true;
  return conditionalTailConnectiveRelationForToken(token, -1, {
    consumers: ["tail_multi_clause"]
  }) !== null;
}
