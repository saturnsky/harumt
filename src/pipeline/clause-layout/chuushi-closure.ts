import {
  POS0,
  POS01,
  POS1,
  POS4,
  POS5A,
  助詞,
  助詞_係助詞,
  助詞_格助詞,
  助動詞,
  助動詞_ナイ,
  動詞,
  動詞_非自立可能,
  形容詞0,
  形容詞的,
  接続助詞,
  接尾辞,
  終助詞,
  連用形_,
  isAuxiliaryStemToken,
  isBoundFormPos0,
  isAdverbCapableNominal,
  isConjunctionToken,
  isNominalLike,
  isGeneralRenyouInflectedToken,
  isNonIndependentAdjectiveToken,
  isParticleToken,
  isPrefixAffixToken,
  isRenyouInflection,
  isNonIndependentVerbToken,
  isIndependentWordToken,
  isIAdjectivePredicateToken,
  isSahenCapableNominal,
  isSahenVerbalizableNominalOrCompound,
  isTerminalParticleToken
} from "../../types/pos.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import type { LookupTables } from "../lookup-tables.js";
import { isStreamVvCompoundPairAt, isStreamVvCompoundShapeAt } from "../compounds/compound-verbs.js";
import {
  clauseStartEvidenceRelationAfter,
  hasEllipticFollowerClauseEvidence,
  hasRenyouChuushiClauseContinuationAfter,
  isClauseArgumentOrTopicMarkerToken,
  isRefusedUtteranceHeadToken,
  renyouChuushiClauseContinuationFrom,
  type ClauseStartRightStructure,
  type PredicateStartDetector
} from "../head-tail/boundary/clause-start.js";
import {
  copulaDeMarkerRelationForToken,
  dewaScopeBridgeRelationAt,
  externalNominalizerContinuationRelationAt,
  nominalLinkMarkerRelationForToken
} from "../head-tail/boundary/marker.js";
import { parentheticalSpanStartingAt } from "../head-tail/boundary/parenthetical.js";
import { isHardTerminalPunctuationToken, isTrailingPunctuationToken, type BoundaryToken } from "../head-tail/boundary/punctuation.js";
import { classifyTeTailContinuation, isTeConnectiveToken } from "../head-tail/tail/postverb-tail-classifier.js";
import { predicateSuffixKindForDictionaryForm } from "../head-tail/tail/predicate-root/derivational-suffix-table.js";
import { isCopulaJaNegativeBridgeToken } from "../head-tail/tail/predicate-root/classifiers/tokens.js";
import { classifyAttributiveHeadKind } from "../head-tail/tail/predicate-root/structural-attributive-head-table.js";
import { renyouChuushiTerminalClosesOp } from "../head-tail/tail/predicate-root/fragment-recovery.js";
import { matchCopula } from "../head-tail/tail/predicate-root/matchers/copula.js";
import { isSahenLightVerbCarrierToken } from "../head-tail/tail/predicate-root/integration/readiness.js";
import { isLikenessCarrierStemToken, matchScopeBridgeBeforeBasicCopula } from "../head-tail/tail/predicate-root/matchers/scope-bridge.js";
import { classifySingleAuxTokenOps } from "../head-tail/tail/predicate-root/parser.js";
import { TokenCursor } from "../token-cursor.js";
import { skipClausePunctuationForward } from "./index.js";
import { isClausePunctuationToken } from "./punctuation.js";
import { nextNonSpaceIndex, previousNonSpaceIndex, separatedAs, type ClauseAdjacencyToken } from "./trivia.js";
import {
  runClosesUtteranceAs,
  utteranceClosureRunAfter,
  type UtteranceClosureKind,
  type UtteranceClosureScope
} from "./utterance-closure.js";
import type { SeparationKind } from "../../types/token.js";

export type ChuushiClosureHostKind = "te" | "renyou";
export type ChuushiClosureRight = "governed" | "elliptic" | "detached";
export type ChuushiClosureDetachedKind = "vocative" | "interjection" | "utterance_head" | "evaluation";

export interface ChuushiClosureEvidence {
  readonly kind: "chuushiClosure";
  readonly hostKind: ChuushiClosureHostKind;
  readonly connectiveIdx: number;
  readonly splitAt: number;
  readonly predicateIdx: number;
  readonly followerIdx: number;
  readonly right: ChuushiClosureRight;
  readonly detachedKind?: ChuushiClosureDetachedKind;
  readonly rightTopicIdx?: number;
  readonly boundaryOwner?: "pause_punctuation" | "lexical_compound" | "lexical_head" | "nominal_frame" | "adjectival_renyou";
}

export interface ChuushiClosureRightInputs {
  readonly governedBy: "construction" | "predicate" | null;
  readonly edgeDetachedKind: "vocative" | "interjection" | null;
  readonly separatedUtteranceHead: boolean;
  readonly discourseOnsetHead: boolean;
  readonly elliptic: boolean;
  readonly ownTopicQuestion: boolean;
}

export function chuushiClosureRight(
  inputs: ChuushiClosureRightInputs
): { readonly right: ChuushiClosureRight; readonly detachedKind?: ChuushiClosureDetachedKind } | null {
  if (inputs.governedBy === "construction") {
    return { right: "governed" };
  }
  if (inputs.edgeDetachedKind !== null) {
    return { right: "detached", detachedKind: inputs.edgeDetachedKind };
  }
  if (inputs.governedBy === "predicate") {
    return { right: "governed" };
  }
  if (inputs.separatedUtteranceHead || inputs.discourseOnsetHead) {
    return { right: "detached", detachedKind: "utterance_head" };
  }
  if (inputs.elliptic && inputs.ownTopicQuestion) {
    return { right: "detached", detachedKind: "utterance_head" };
  }
  if (inputs.elliptic) {
    return { right: "elliptic" };
  }
  return null;
}

export interface TeChuushiClosureLeft {
  readonly connectiveIdx: number;
  readonly splitAt: number;
  readonly predicateIdx: number;
  readonly followerIdx: number;
}

export function teChuushiClosureLeftAt(
  tokens: readonly BoundaryToken[],
  connectiveIdx: number,
  splitAt: number
): TeChuushiClosureLeft | null {
  if (!isTeConnectiveToken(tokens[connectiveIdx]) || splitAt !== connectiveIdx + 1) {
    return null;
  }
  const followerIdx = nextNonSpaceIndex(tokens, splitAt, tokens.length);
  const follower = followerIdx === null ? undefined : tokens[followerIdx];
  if (followerIdx === null || follower === undefined || isBoundFormPos0(follower.pos)) {
    return null;
  }
  const hostIdx = previousNonSpaceIndex(tokens, connectiveIdx);
  const host = hostIdx === null ? undefined : tokens[hostIdx];
  if (host === undefined || !(isRenyouInflection(host.pos) || (host.pos & POS4) === 助動詞_ナイ)) {
    return null;
  }
  const predicateIdx = teHostContentPredicateIndex(tokens, connectiveIdx);
  if (predicateIdx === null) {
    return null;
  }
  return { connectiveIdx, splitAt, predicateIdx, followerIdx };
}

export function teUtteranceFinalLeftAt(
  tokens: readonly (BoundaryToken & ClauseAdjacencyToken)[],
  connectiveIdx: number
): { readonly connectiveIdx: number; readonly predicateIdx: number } | null {
  if (!isTeConnectiveToken(tokens[connectiveIdx])) {
    return null;
  }
  const hostIdx = previousNonSpaceIndex(tokens, connectiveIdx);
  const host = hostIdx === null ? undefined : tokens[hostIdx];
  if (host === undefined || !(isRenyouInflection(host.pos) || (host.pos & POS4) === 助動詞_ナイ)) {
    return null;
  }
  let cursor = nextNonSpaceIndex(tokens, connectiveIdx + 1, tokens.length);
  while (cursor !== null && tokens[cursor] !== undefined && isTerminalParticleToken(tokens[cursor]!) && !separatedAs(tokens, cursor, CHUNK_BREAK_SEPARATION)) {
    cursor = nextNonSpaceIndex(tokens, cursor + 1, tokens.length);
  }
  const closer = cursor === null ? undefined : tokens[cursor];
  if (
    cursor !== null &&
    closer !== undefined &&
    !isHardTerminalPunctuationToken(closer) &&
    !isTrailingPunctuationToken(closer) &&
    !separatedAs(tokens, cursor, CHUNK_BREAK_SEPARATION)
  ) {
    return null;
  }
  const predicateIdx = teHostContentPredicateIndex(tokens, connectiveIdx);
  return predicateIdx === null ? null : { connectiveIdx, predicateIdx };
}

const CHUNK_BREAK_SEPARATION: ReadonlySet<SeparationKind> = new Set<SeparationKind>(["chunk_break"]);

function teHostContentPredicateIndex(
  tokens: readonly BoundaryToken[],
  connectiveIdx: number
): number | null {
  let idx = previousNonSpaceIndex(tokens, connectiveIdx);
  while (idx !== null) {
    const token = tokens[idx];
    if (token === undefined) {
      return null;
    }
    if ((token.pos & POS0) === 助動詞) {
      idx = previousNonSpaceIndex(tokens, idx);
      continue;
    }
    if (isNonIndependentVerbToken(token)) {
      const prevIdx = previousNonSpaceIndex(tokens, idx);
      const prev = prevIdx === null ? undefined : tokens[prevIdx];
      if (prev !== undefined && isSahenCapableNominal(prev)) {
        return prevIdx;
      }
      if (prevIdx !== null && isTeConnectiveToken(prev)) {
        idx = previousNonSpaceIndex(tokens, prevIdx);
        continue;
      }
    }
    return idx;
  }
  return null;
}

export function isChuushiClosureTopicMarkerToken(token: BoundaryToken | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  const pos01 = token.pos & POS01;
  return (pos01 === 助詞_係助詞 && token.surface === "は") || (pos01 === 助詞_格助詞 && token.surface === "が");
}


export interface RenyouChuushiClosureLeft {
  readonly connectiveIdx: number;
  readonly splitAt: number;
  readonly predicateIdx: number;
  readonly followerIdx: number;
  readonly lexicalCompoundCandidate: boolean;
}

export function renyouChuushiClosureLeftAt(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  lookups: LookupTables
): RenyouChuushiClosureLeft | null {
  const token = tokens[idx];
  if (token === undefined || !isGeneralRenyouInflectedToken(token)) {
    return null;
  }
  const next = tokens[idx + 1];
  if (next === undefined || isHardTerminalPunctuationToken(next) || renyouHeadBunsetsuContinuesInto(next)) {
    return null;
  }
  if (
    copulaDeMarkerRelationForToken(token, idx, { consumers: ["clause_layout"] })?.isAssertiveCopulaFamily === true ||
    isCopulaNegativeRenyouBoundaryEnd(tokens, idx, lookups)
  ) {
    return null;
  }
  const prevIdx = previousNonSpaceIndex(tokens, idx);
  const prev = prevIdx === null ? undefined : tokens[prevIdx];
  switch (token.pos & POS0) {
    case 動詞:
      if (
        (prev !== undefined && isPrefixAffixToken(prev)) ||
        (isStreamVvCompoundPairAt(tokens, idx) && !isTeAttachedAuxiliaryVerb(token, prev, lookups)) ||
        isExternalNominalizerComparisonPredicateFragment(tokens, idx)
      ) {
        return null;
      }
      break;
    case 形容詞0:
      if (
        (prev !== undefined && isPrefixAffixToken(prev)) ||
        (!isAuxiliaryAdjectiveChainEnd(token, prev) && !isClausePunctuationToken(next))
      ) {
        return null;
      }
      break;
    case 助動詞:
      if (!isAuxChainRenyouChuushiBoundaryEnd(tokens, idx)) {
        return null;
      }
      break;
    case 接尾辞:
      if (
        (token.pos & POS1) !== 形容詞的 ||
        (predicateSuffixKindForDictionaryForm(token.dictionaryForm) === null && !isAuxChainRenyouChuushiBoundaryEnd(tokens, idx))
      ) {
        return null;
      }
      break;
    default:
      return null;
  }
  const followerIdx = nextNonSpaceIndex(tokens, idx + 1, tokens.length);
  if (followerIdx === null) {
    return null;
  }
  return {
    connectiveIdx: idx,
    splitAt: idx + 1,
    predicateIdx: teHostContentPredicateIndex(tokens, idx + 1) ?? idx,
    followerIdx,
    lexicalCompoundCandidate: (token.pos & POS0) === 動詞 && !isTeAttachedAuxiliaryVerb(token, prev, lookups) &&
      isStreamVvCompoundShapeAt(tokens, idx)
  };
}

function isAuxiliaryAdjectiveChainEnd(token: RuntimeHaruToken, prev: RuntimeHaruToken | undefined): boolean {
  return isNonIndependentAdjectiveToken(token) && prev !== undefined && isRenyouInflection(prev.pos);
}

function isTeAttachedAuxiliaryVerb(token: RuntimeHaruToken, prev: RuntimeHaruToken | undefined, lookups: LookupTables): boolean {
  return isTeConnectiveToken(prev) && classifyTeTailContinuation(token, lookups) !== null;
}

export function renyouChuushiClosureGovernedAfter(
  tokens: readonly RuntimeHaruToken[],
  contentEndIdx: number,
  reach: number,
  isPredicateStart: PredicateStartDetector<RuntimeHaruToken>,
  lookups: LookupTables,
  rightStructure?: ClauseStartRightStructure<RuntimeHaruToken>
): boolean {
  if (skipClausePunctuationForward(tokens, contentEndIdx + 1, tokens.length) >= reach) {
    return false;
  }
  if (hasRenyouChuushiClauseContinuationAfter(
      tokens,
      contentEndIdx,
      isPredicateStart,
      tokens.length,
      lookups,
      rightStructure
    )) {
    return true;
  }
  const punctIdx = contentEndIdx + 1;
  const punct = tokens[punctIdx];
  if (punct === undefined || !isClausePunctuationToken(punct)) {
    return false;
  }
  const nextContent = skipRenyouContinuationBoundaryNoiseForward(tokens, punctIdx, reach);
  if (nextContent >= reach) {
    return false;
  }
  return renyouChuushiClauseContinuationFrom(tokens, nextContent, reach, isPredicateStart, lookups, rightStructure);
}

const RENYOU_ELLIPTIC_UTTERANCE_CLOSURES: ReadonlySet<UtteranceClosureKind> = new Set<UtteranceClosureKind>([
  "eos",
  "hard_terminal",
  "matched_delimiter_close",
  "unmatched_trailing"
]);

export function renyouChuushiClosureEllipticAfter<T extends RuntimeHaruToken>(
  tokens: readonly T[],
  followerIdx: number,
  scope: UtteranceClosureScope,
  frame?: {
    readonly isPredicateStart: PredicateStartDetector<T>;
    readonly lookups: LookupTables;
    readonly reach: number;
    readonly rightStructure?: ClauseStartRightStructure<T>;
    readonly markedFragment?: RenyouMarkedFragmentInputs<T>;
  }
): boolean {
  if (isEllipticPredicativeNounClosureAt(tokens, followerIdx, scope, frame?.lookups)) {
    return true;
  }
  if (frame === undefined) {
    return false;
  }
  for (let headIdx = followerIdx + 1; headIdx < frame.reach; headIdx += 1) {
    if (
      isChuushiNominalRunPredicateAt(tokens, followerIdx, headIdx, frame.lookups) &&
      isEllipticPredicativeNounClosureAt(tokens, headIdx, scope, frame.lookups, followerIdx)
    ) {
      return true;
    }
  }
  if (frame.markedFragment !== undefined && isRenyouMarkedArgumentFragmentClosure(tokens, scope, frame.markedFragment)) {
    return true;
  }
  const rightStructure = frame.rightStructure;
  const isEllipticPredicateHeadAt = (candidateTokens: readonly T[], index: number): boolean =>
    isEllipticPredicativeNounClosureAt(candidateTokens, index, scope, frame.lookups) ||
    (rightStructure?.isMeasurePhraseHeadAt?.(candidateTokens, index) === true &&
      runClosesUtteranceAs(utteranceClosureRunAfter(scope, candidateTokens, index + 1), RENYOU_ELLIPTIC_UTTERANCE_CLOSURES));
  const relation = clauseStartEvidenceRelationAfter(
    tokens,
    followerIdx,
    tokens.length,
    (candidateTokens, index) => frame.isPredicateStart(candidateTokens, index) || isEllipticPredicateHeadAt(candidateTokens, index),
    {
      mode: "argument_frame",
      consumers: ["clause_layout"],
      lookups: frame.lookups,
      ...(rightStructure?.adnominalHeadStartAfterPredicate === undefined
        ? {}
        : { adnominalHeadStartAfterPredicate: rightStructure.adnominalHeadStartAfterPredicate }),
      ...(rightStructure?.isFrameInternalPauseAt === undefined
        ? {}
        : { isFrameInternalPauseAt: (index: number) => rightStructure.isFrameInternalPauseAt!(tokens, index) })
    }
  );
  return relation?.evidence === "argument_frame_then_predicate" &&
    !frame.isPredicateStart(tokens, relation.predicateIdx) &&
    isEllipticPredicateHeadAt(tokens, relation.predicateIdx);
}

export interface RenyouMarkedFragmentInputs<T extends RuntimeHaruToken> {
  readonly splitAt: number;
  readonly reach: number;
  readonly isPredicateEvidenceAt: PredicateStartDetector<T>;
}

function isRenyouMarkedArgumentFragmentClosure<T extends RuntimeHaruToken>(
  tokens: readonly T[],
  scope: UtteranceClosureScope,
  inputs: RenyouMarkedFragmentInputs<T>
): boolean {
  const lead = utteranceClosureRunAfter(scope, tokens, inputs.splitAt);
  if (lead.endedBy !== "content") {
    return false;
  }
  const start = lead.endIdx;
  if (
    start >= inputs.reach ||
    (lead.traversed &&
      (lead.closures.length !== start - inputs.splitAt ||
        !lead.closures.every((evidence) => evidence.closure === "weak_pause")))
  ) {
    return false;
  }
  const first = tokens[start];
  if (first === undefined || !isIndependentWordToken(first) || isRefusedUtteranceHeadToken(first)) {
    return false;
  }
  let end = start;
  while (end < inputs.reach && !isClausePunctuationToken(tokens[end])) {
    end += 1;
  }
  const lastIdx = previousNonSpaceIndex(tokens, end);
  const last = lastIdx === null ? undefined : tokens[lastIdx];
  if (lastIdx === null || lastIdx <= start || last === undefined || !isClauseArgumentOrTopicMarkerToken(last)) {
    return false;
  }
  return hasEllipticFollowerClauseEvidence(tokens, start, lastIdx + 1, inputs.isPredicateEvidenceAt, "independent_word") &&
    runClosesUtteranceAs(utteranceClosureRunAfter(scope, tokens, lastIdx + 1), RENYOU_ELLIPTIC_UTTERANCE_CLOSURES);
}

function isEllipticPredicativeNounClosureAt<T extends RuntimeHaruToken>(
  tokens: readonly T[],
  index: number,
  scope: UtteranceClosureScope,
  lookups?: LookupTables,
  nominalRunStart: number = index
): boolean {
  const token = tokens[index];
  if (
    token === undefined ||
    !isIndependentWordToken(token) ||
    classifyAttributiveHeadKind(token) !== "ordinary_nominal"
  ) {
    return false;
  }
  if (!runClosesUtteranceAs(utteranceClosureRunAfter(scope, tokens, index + 1), RENYOU_ELLIPTIC_UTTERANCE_CLOSURES)) {
    return false;
  }
  if (isSahenVerbalizableNominalOrCompound(token)) {
    return true;
  }
  if (!isNominalLike(token) || lookups === undefined) {
    return false;
  }
  const nouns = lookups.set("semantic", "predicative_event_state_result_nouns");
  let surface = "";
  let lemma = "";
  for (let start = index; start >= nominalRunStart; start -= 1) {
    surface = tokens[start]!.surface + surface;
    lemma = tokens[start]!.dictionaryForm + lemma;
    if (nouns.has(surface) || nouns.has(lemma)) {
      return true;
    }
  }
  return false;
}

export function isChuushiNominalRunPredicateAt(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  predicateIdx: number,
  lookups: LookupTables
): boolean {
  if (predicateIdx <= start) {
    return false;
  }
  const predicate = tokens[predicateIdx];
  if (
    predicate === undefined ||
    !(isNominalLike(predicate) || (isSahenLightVerbCarrierToken(predicate, lookups) && isNominalLike(tokens[predicateIdx - 1] ?? { pos: 0 })))
  ) {
    return false;
  }
  return isChuushiNominalRunSpan(tokens, start, predicateIdx);
}

function isChuushiNominalRunSpan(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  end: number,
  isRunInternalPauseAt?: (index: number) => boolean
): boolean {
  for (let index = start; index < end; index += 1) {
    const token = tokens[index];
    if (token !== undefined && index > start && isNominalRunInternalLinkAt(tokens, index)) {
      continue;
    }
    if (
      token !== undefined && index > start && index + 1 <= end && isRunInternalPauseAt?.(index) === true &&
      isNominalLike(tokens[index - 1]!) && isNominalLike(tokens[index + 1]!)
    ) {
      continue;
    }
    if (token === undefined || !(isNominalLike(token) || isPrefixAffixToken(token)) || isAdverbCapableNominal(token)) {
      return false;
    }
  }
  return true;
}

export function isVerbReadingFollowerRunPredicateAt(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  predicateIdx: number,
  lookups: LookupTables,
  isRunInternalPauseAt: (index: number) => boolean
): boolean {
  if (predicateIdx <= start) {
    return false;
  }
  const predicate = tokens[predicateIdx];
  const last = tokens[predicateIdx - 1];
  if (predicate === undefined || last === undefined) {
    return false;
  }
  if (isNominalLike(predicate) || (isSahenLightVerbCarrierToken(predicate, lookups) && isNominalLike(last))) {
    return isChuushiNominalRunSpan(tokens, start, predicateIdx, isRunInternalPauseAt);
  }
  if (!isNominalLike(last)) {
    return false;
  }
  if (
    isLikenessCarrierStemToken(predicate) ||
    isIAdjectivePredicateToken(predicate)
  ) {
    return isChuushiNominalRunSpan(tokens, start, predicateIdx);
  }
  return false;
}

function isNominalRunInternalLinkAt(tokens: readonly RuntimeHaruToken[], index: number): boolean {
  const prev = tokens[index - 1];
  const next = tokens[index + 1];
  return nominalLinkMarkerRelationForToken(tokens[index], index, { consumers: ["clause_layout"] }) !== null &&
    prev !== undefined && isNominalLike(prev) &&
    next !== undefined && (isNominalLike(next) || isPrefixAffixToken(next));
}

export function isChuushiClauseCoordinationPreludeToken(
  token: RuntimeHaruToken | undefined,
  lookups: LookupTables
): boolean {
  return token !== undefined &&
    isConjunctionToken(token) &&
    lookups.set("chuushi_closure", "clause_coordination_conjunction_lemmas").has(token.dictionaryForm || token.surface);
}

export function renyouHeadBunsetsuContinuesInto(next: RuntimeHaruToken | undefined): boolean {
  if (next === undefined) {
    return false;
  }
  return isBoundFormPos0(next.pos) ||
    isAuxiliaryStemToken(next) ||
    isNonIndependentAdjectiveToken(next) ||
    isImmediatePredicateTailContinuationAfterRenyou(next);
}

export function isAuxChainRenyouChuushiBoundaryEnd(
  tokens: readonly RuntimeHaruToken[],
  end: number
): boolean {
  const token = tokens[end];
  if (token === undefined || !isGeneralRenyouInflectedToken(token)) {
    return false;
  }
  const host = tokens[end - 1];
  if (host === undefined || isParticleToken(host)) {
    return false;
  }
  const next = tokens[end + 1];
  if (renyouHeadBunsetsuContinuesInto(next)) {
    return false;
  }
  const ops = classifySingleAuxTokenOps(token, next, end);
  const last = ops[ops.length - 1];
  return last !== undefined && renyouChuushiTerminalClosesOp(last);
}

export function isImmediatePredicateTailContinuationAfterRenyou(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  if ((token.pos & POS0) === 助動詞) {
    return true;
  }
  if ((token.pos & POS0) === 助詞) {
    const pos1 = token.pos & POS1;
    return pos1 === 接続助詞 ||
      pos1 === 終助詞 ||
      token.surface === "は" ||
      token.surface === "も";
  }
  return (token.pos & POS01) === 動詞_非自立可能;
}

function skipRenyouContinuationBoundaryNoiseForward(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  endExclusive: number
): number {
  let index = start;
  while (index < endExclusive) {
    const parenthetical = parentheticalSpanStartingAt(tokens, index, {
      consumers: ["tail_boundary_readiness"]
    });
    if (parenthetical !== null && parenthetical.role !== "explicit_quote_span") {
      index = parenthetical.span.endExclusive;
      continue;
    }
    if (!isClausePunctuationToken(tokens[index])) {
      break;
    }
    index += 1;
  }
  return index;
}

function isExternalNominalizerComparisonPredicateFragment(
  tokens: readonly RuntimeHaruToken[],
  contentEndIdx: number
): boolean {
  const predicate = tokens[contentEndIdx];
  if (predicate === undefined || (predicate.dictionaryForm || predicate.surface) !== "対する") {
    return false;
  }
  const relation = externalNominalizerContinuationRelationAt(tokens, contentEndIdx - 2, {
    requireEnd: false,
    consumers: ["tail_multi_clause"]
  });
  return relation?.connectiveKind === "external_nominalizer_comparison" &&
    relation.span.endExclusive > contentEndIdx;
}

export function isCopulaNegativeRenyouBoundaryEnd(
  tokens: readonly RuntimeHaruToken[],
  end: number,
  lookups: LookupTables
): boolean {
  const token = tokens[end];
  if (
    token === undefined || (token.pos & (POS0 | POS5A)) !== (形容詞0 | 連用形_) || token.dictionaryForm !== "ない" && token.dictionaryForm !== "無い"
  ) {
    return false;
  }
  if (isImmediatePredicateTailContinuationAfterRenyou(tokens[end + 1])) {
    return false;
  }
  const previous = tokens[end - 1];
  if (copulaDeMarkerRelationForToken(previous, end - 1, { consumers: ["tail_multi_clause"] }) !== null) {
    return true;
  }
  const dewa = dewaScopeBridgeRelationAt(tokens, end - 2, {
    anchorIdx: end - 2,
    consumers: ["tail_multi_clause"]
  });
  if (dewa !== null && dewa.focusParticle === "wa" && dewa.span.endExclusive === end) {
    return true;
  }
  return demoScopeBridgeNegativeRenyouEndsAt(tokens, end) ||
    jaCopulaNegativeRenyouEndsAt(tokens, end, lookups);
}

function jaCopulaNegativeRenyouEndsAt(
  tokens: readonly RuntimeHaruToken[],
  end: number,
  lookups: LookupTables
): boolean {
  const bridgeIdx = end - 1;
  if (bridgeIdx < 0 || !isCopulaJaNegativeBridgeToken(tokens[bridgeIdx])) {
    return false;
  }
  const copula = matchCopula(tokens, bridgeIdx, lookups);
  return copula !== null &&
    copula.op.polarity === "negative" &&
    bridgeIdx + copula.consumed === end + 1;
}

function demoScopeBridgeNegativeRenyouEndsAt(
  tokens: readonly RuntimeHaruToken[],
  end: number
): boolean {
  for (const markerStart of [end - 1, end - 2]) {
    if (markerStart < 0) {
      continue;
    }
    const bridge = matchScopeBridgeBeforeBasicCopula(new TokenCursor(tokens, markerStart, end + 1));
    if (bridge === null || bridge.form !== "demo" || bridge.polarity !== "negative") {
      continue;
    }
    const indices = bridge.source.tokenIndices;
    if (indices[indices.length - 1] === end) {
      return true;
    }
  }
  return false;
}
