import type { RuntimeHaruToken } from "../../../../../types/token.js";
import type { LookupTables } from "../../../../lookup-tables.js";
import type { IrregularType } from "../../../../../generator/conjugator.js";
import { isSuruVerbToken, isWakeNounToken } from "../classifiers/tokens.js";
import {
  POS0,
  POS4,
  POS5A,
  サ行変格,
  仮定形_,
  形容詞0,
  形状詞,
  終止形_,
  動詞,
  名詞,
  連体形_,
  連用形_,
  助動詞_ジャ,
  助動詞_タ,
  助動詞_ラシイ,
  isNumeralToken,
  isRenyouInflection,
  isLexicalAdverb,
  NOMINAL_BITS, pos0in, INFLECTABLE_BITS, POS01, 接尾辞_名詞的, isNaAdjectiveDerivationalSuffix, isNominalDerivationalSuffix, 助詞_終助詞, 補助記号, isNaAdjCapableNoun, isLexicalPureNaAdjStem, isSahenCapableNominal,
  isGeneralRenyouInflectedToken, isNonIndependentVerbToken, isPrefixAffixToken, isVerbPredicateToken, isSahenLightVerbToken,
  isVolitionalInflection,
  連体詞
} from "../../../../../types/pos.js";
import { isStreamVvCompoundPairAt } from "../../../../compounds/compound-verbs.js";
import { isDetachedFromPreviousToken, previousNonSpaceIndex } from "../../../../clause-layout/trivia.js";
import {
  isClausePunctuationToken,
  isTerminalOnlyInflectionPredicateAt,
  isTerminalOnlyPredicateUnmarkedOnsetAt,
  skipClausePunctuationForward,
  type ClauseToken
} from "../../../../clause-layout/index.js";
import { activeProtoLayout, activeProtoUtteranceRange } from "../../../../clause-layout/proto-state.js";
import {
  runClosesUtteranceAs,
  utteranceClosureRunAfter,
  type UtteranceClosureEvidence,
  type UtteranceClosureKind,
  type UtteranceClosureRunTraversal,
  type UtteranceClosureToken
} from "../../../../clause-layout/utterance-closure.js";
import {
  bareStemNominalUseClausePauseAt,
  bareStemNominalUseHostClass,
  bareStemQuotedHostSlotAt,
  type ContestedBareStemNominalUseSlot
} from "../../../../candidate-runtime.js";
import { hasArgumentFrameBeforeSupportedClauseContinuation } from "../../../boundary/clause-start.js";
import { copulaDeMarkerRelationForToken, copulaElidedNegativeBodyRelationAt } from "../../../boundary/marker.js";
import { pronominalNoCopulaDeFollows, rentaishiPronominalNoHeadSpanAt } from "../../../boundary/pronominal-no.js";
import { skipHostEnclosingQuoteClose } from "../nominal-host-phrase.js";
import { attributiveCopulaTailFollows, matchCopula, terminalNodaCarrierFollowsAdnominalCopula } from "../matchers/copula.js";
import { canStartScopeBridgeBeforeBasicCopula } from "../matchers/scope-bridge.js";
import { resolveDerivationalSuffixProfile } from "../derivational-suffix-table.js";
import { secondaryParticleCanonical } from "../../../../particles/secondary-particle.js";
import { dokoroNegativeHostClass, matchDokoroNegativeCarrierSpanAt } from "../matchers/focus-connective.js";
import { isKanaAbabMimeticKeijoujiHost } from "../../../../semantics/tari-adverbial-marker.js";

export type SahenPredicateHostKind = "nominal" | "verb_renyou";

export interface SahenPredicateHostContext {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly idx: number;
}

export function detectSahenPredicateStart(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  context?: SahenPredicateHostContext
): {
  readonly nounToken: RuntimeHaruToken;
  readonly suruToken: RuntimeHaruToken;
  readonly hostKind: SahenPredicateHostKind;
} | null {
  const noun = tokens[idx];
  if (noun === undefined) return null;
  const suru = tokens[idx + 1];
  if (
    suru === undefined ||
    !isSuruVerbToken(suru)
  ) {
    return null;
  }
  if (sahenPredicateCarrierHost(noun)) {
    return { nounToken: noun, suruToken: suru, hostKind: "nominal" };
  }
  if (renyouNominalLightVerbHost(context?.tokens ?? tokens, context?.idx ?? idx, suru)) {
    return { nounToken: noun, suruToken: suru, hostKind: "verb_renyou" };
  }
  return null;
}

export function isSahenLightVerbCarrierToken(
  token: RuntimeHaruToken | undefined,
  lookups: LookupTables
): boolean {
  if (token === undefined || (token.pos & POS0) !== 動詞) {
    return false;
  }
  if (isSahenLightVerbToken(token)) {
    return true;
  }
  const lemma = token.dictionaryForm || token.surface;
  return lookups.HONORIFIC_SAHEN_LIGHT_VERBS.has(lemma) || lookups.NO_SAHEN_POTENTIAL_LIGHT_VERBS.has(lemma);
}

function sahenPredicateCarrierHost(token: RuntimeHaruToken): boolean {
  return ((token.pos & POS0) === 名詞 && isSahenCapableNominal(token)) ||
    isKanaAbabMimeticKeijoujiHost(token);
}

function renyouNominalLightVerbHost(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  suru: RuntimeHaruToken
): boolean {
  const host = tokens[idx];
  if (host === undefined || !isVerbPredicateToken(host) || !isGeneralRenyouInflectedToken(host)) {
    return false;
  }
  if (!isNonIndependentVerbToken(suru) || isDetachedFromPreviousToken(tokens, idx + 1)) {
    return false;
  }
  if (idx > 0 && isStreamVvCompoundPairAt(tokens, idx - 1)) {
    return false;
  }
  const prefixIdx = previousNonSpaceIndex(tokens, idx);
  return prefixIdx === null || !isPrefixAffixToken(tokens[prefixIdx]!);
}

export function isNominalEvidentialRashiiPredicateStart(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  lookups?: LookupTables
): boolean {
  const noun = tokens[idx];
  if (noun === undefined || !isNominalCopulaHostPos(noun.pos)) return false;
  const rashiiIdx = nounCompoundSuffixRunEnd(tokens, idx + 1, noun, lookups);
  const rashii = tokens[rashiiIdx];
  if (rashii === undefined || (rashii.pos & POS4) !== 助動詞_ラシイ) return false;
  const form = rashii.pos & POS5A;
  if (form === 終止形_) return true;
  if (form === 連用形_) {
    const ta = tokens[rashiiIdx + 1];
    if (ta === undefined || (ta.pos & POS4) !== 助動詞_タ) return false;
    const taForm = ta.pos & POS5A;
    if (taForm === 終止形_) return true;
    return taForm === 連体形_ && evidentialRashiiPredicateTailFollows(tokens, rashiiIdx + 2, lookups);
  }
  return form === 連体形_ && evidentialRashiiPredicateTailFollows(tokens, rashiiIdx + 1, lookups);
}

function evidentialRashiiPredicateTailFollows(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  lookups?: LookupTables
): boolean {
  if (attributiveCopulaTailFollows(tokens, pos, lookups)) {
    return true;
  }
  return terminalNodaCarrierFollowsAdnominalCopula(tokens, pos) &&
    nodaCarrierChainClosesClause(tokens, pos, lookups);
}

function nodaCarrierChainClosesClause(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  lookups?: LookupTables
): boolean {
  const copula = tokens[pos + 1];
  if (copula === undefined || (copula.pos & POS5A) !== 連用形_) {
    return true;
  }
  const ta = tokens[pos + 2];
  if (ta === undefined || (ta.pos & POS4) !== 助動詞_タ) {
    return false;
  }
  const taForm = ta.pos & POS5A;
  if (taForm === 終止形_) {
    return true;
  }
  return taForm === 連体形_ && attributiveCopulaTailFollows(tokens, pos + 3, lookups);
}

export function isSupportedClauseStart(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  lookups?: LookupTables
): boolean {
  const next = tokens[idx];
  if (next === undefined) return false;
  const nextPos0 = next.pos & POS0;
  if (pos0in(nextPos0, INFLECTABLE_BITS)) return true;
  if (nextPos0 === 形状詞) {
    return isKeijoujiCopulaPredicateStart(tokens, idx) ||
      detectSahenPredicateStart(tokens, idx) !== null;
  }
  return detectSahenPredicateStart(tokens, idx) !== null ||
    isNounCopulaPredicateStart(tokens, idx, { lookups }) ||
    isAdverbHostCopulaDePredicateStart(tokens, idx, lookups) ||
    isNominalEvidentialRashiiPredicateStart(tokens, idx, lookups);
}

export function isNominalCopulaHostPos(pos: number): boolean {
  const pos0 = pos & POS0;
  return pos0in(pos0, NOMINAL_BITS);
}

export interface NounCopulaPredicateStartOptions {
  readonly nounPhraseEndExclusive?: number;
  readonly lookups?: LookupTables | undefined;
}

export function adverbHostCopulaDeMarkerAt(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  lookups: LookupTables | undefined
): number | null {
  const host = tokens[idx];
  if (host === undefined || !isLexicalAdverb(host) || lookups === undefined) {
    return null;
  }
  if (lookups.ADVERB_COPULA_DEICTIC_EXCLUSIONS.has(host.dictionaryForm || host.surface)) {
    return null;
  }
  const copulaIdx = idx + 1;
  const copula = tokens[copulaIdx];
  return copula !== undefined &&
    isRenyouInflection(copula.pos) &&
    copulaDeMarkerRelationForToken(copula, copulaIdx) !== null
    ? copulaIdx
    : null;
}

export function isAdverbHostCopulaDePredicateStart(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  lookups: LookupTables | undefined
): boolean {
  const copulaIdx = adverbHostCopulaDeMarkerAt(tokens, idx, lookups);
  return copulaIdx !== null && copulaStartsPredicateAt(tokens, copulaIdx, lookups);
}

export function isNounCopulaPredicateStart(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  options: NounCopulaPredicateStartOptions = {}
): boolean {
  const noun = tokens[idx];
  if (noun === undefined || !isNominalCopulaHostPos(noun.pos)) return false;
  const afterSuffix = Math.max(
    nounCompoundSuffixRunEnd(tokens, idx + 1, noun, options.lookups),
    options.nounPhraseEndExclusive ?? idx + 1
  );
  const copulaIdx = afterSuffix === idx + 1
    ? skipHostEnclosingQuoteClose(tokens, idx, afterSuffix)
    : afterSuffix;
  if (
    isNumeralToken(noun) &&
    afterSuffix > idx + 1 &&
    ((tokens[copulaIdx]?.pos ?? 0) & POS4) === 助動詞_ジャ
  ) {
    return false;
  }
  const derivedCopulaIdx = predicateDerivationalSuffixEnd(tokens, noun, copulaIdx);
  return copulaStartsPredicateAt(tokens, copulaIdx, options.lookups) ||
    (derivedCopulaIdx !== null && copulaStartsPredicateAt(tokens, derivedCopulaIdx, options.lookups));
}

export function nounCompoundSuffixRunEnd(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  head: RuntimeHaruToken | undefined = tokens[idx - 1],
  lookups?: LookupTables
): number {
  const afterNominal = nominalSuffixRunEndForHead(tokens, idx, head, lookups);
  const suffix = tokens[afterNominal];
  if (head === undefined || suffix === undefined || !isNaAdjectiveDerivationalSuffix(suffix)) {
    return afterNominal;
  }
  return resolveDerivationalSuffixProfile(head, suffix.dictionaryForm)?.hostForm === "noun_compound"
    ? afterNominal + 1
    : afterNominal;
}

export function copulaStartsPredicateAt(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  lookups: LookupTables | undefined
): boolean {
  return matchCopula(tokens, idx, lookups) !== null ||
    canStartScopeBridgeBeforeBasicCopula(tokens, idx) ||
    copulaElidedNegativeBodyRelationAt(tokens, idx, { consumers: ["tail_boundary_readiness"] }) !== null ||
    isNounFocusCopulaPredicateStart(tokens, idx - 1, lookups);
}

function predicateDerivationalSuffixEnd(
  tokens: readonly RuntimeHaruToken[],
  head: RuntimeHaruToken,
  idx: number
): number | null {
  const suffix = tokens[idx];
  if (
    suffix === undefined ||
    (!isNaAdjectiveDerivationalSuffix(suffix) && !isNominalDerivationalSuffix(suffix))
  ) {
    return null;
  }
  const profile = resolveDerivationalSuffixProfile(head, suffix.dictionaryForm);
  return profile === undefined || profile.hostForm === "noun_compound" ? null : idx + 1;
}

function nominalSuffixRunEndForHead(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  head: RuntimeHaruToken | undefined,
  lookups: LookupTables | undefined
): number {
  const first = tokens[idx];
  if (
    head !== undefined &&
    first !== undefined &&
    isNominalDerivationalSuffix(first) &&
    matchCopula(tokens, idx + 1, lookups) !== null
  ) {
    const profile = resolveDerivationalSuffixProfile(head, first.dictionaryForm);
    if (profile !== undefined && profile.hostForm !== "noun_compound") {
      return idx;
    }
  }
  return skipNominalSuffixes(tokens, idx);
}

export function skipNominalSuffixes(tokens: readonly RuntimeHaruToken[], idx: number): number {
  let j = idx;
  while (true) {
    const token = tokens[j];
    if (token === undefined || (token.pos & POS01) !== 接尾辞_名詞的) {
      return j;
    }
    j++;
  }
}

export function isKeijoujiCopulaPredicateStart(tokens: readonly RuntimeHaruToken[], idx: number): boolean {
  const head = tokens[idx];
  if (head === undefined || (head.pos & POS0) !== 形状詞) return false;
  return matchCopula(tokens, idx + 1) !== null ||
    canStartScopeBridgeBeforeBasicCopula(tokens, idx + 1);
}

function isNounFocusCopulaPredicateStart(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  lookups?: LookupTables
): boolean {
  if (
    matchDokoroNegativeCarrierSpanAt(tokens, idx + 1) !== null &&
    dokoroNegativeHostClass(tokens[idx], lookups) !== null
  ) {
    return true;
  }
  const focus = tokens[idx + 1];
  if (!isNominalCopulaFocusParticle(focus)) {
    return false;
  }
  return matchCopula(tokens, idx + 2, lookups) !== null;
}

function isNominalCopulaFocusParticle(token: RuntimeHaruToken | undefined): boolean {
  const canonical = secondaryParticleCanonical(token);
  return canonical === "ばかり" || canonical === "だけ";
}

export function isBareKeijoujiZeroTailPredicateStart(tokens: readonly RuntimeHaruToken[], idx: number): boolean {
  const token = tokens[idx];
  if (token === undefined) {
    return false;
  }
  return ((token.pos & POS0) === 形状詞 || isZeroCopulaNaAdjCapableNounPredicateStart(tokens, idx)) &&
    canParseZeroTailPredicateHead(tokens, idx);
}

export function isZeroCopulaNaAdjCapableNounPredicateStart(
  tokens: readonly RuntimeHaruToken[],
  idx: number
): boolean {
  const token = tokens[idx];
  if (token === undefined || !isNaAdjCapableNoun(token)) {
    return false;
  }
  const next = tokens[idx + 1];
  if (next === undefined || (next.pos & POS01) !== 助詞_終助詞) {
    return false;
  }
  let j = idx + 2;
  while (tokens[j] !== undefined && (tokens[j]!.pos & POS01) === 助詞_終助詞) {
    j += 1;
  }
  const after = tokens[j];
  return after === undefined || (after.pos & POS0) === 補助記号;
}

export function isSupportedConditionalContinuation(
  tokens: readonly RuntimeHaruToken[],
  nextStart: number,
  lookups?: LookupTables
): boolean {
  return isSupportedClauseStart(tokens, nextStart, lookups) ||
    isKeijoujiCopulaPredicateStart(tokens, nextStart);
}

export function hasSupportedClauseContinuation(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  endExclusive: number,
  lookups?: LookupTables
): boolean {
  const firstContent = skipClausePunctuationForward(tokens, start, endExclusive);
  if (firstContent >= endExclusive) {
    return false;
  }
  for (let idx = firstContent; idx < endExclusive; idx += 1) {
    const tok = tokens[idx];
    if (tok === undefined) return false;
    if (isClausePunctuationToken(tok)) continue;
    if (isSupportedClauseStart(tokens, idx, lookups)) return true;
  }
  return hasArgumentFrameBeforeSupportedClauseContinuation(
    tokens,
    firstContent,
    endExclusive,
    (frameTokens, frameIdx) => isSupportedClauseStart(frameTokens, frameIdx, lookups),
    lookups
  );
}

export function boundNominalReasonClauseContinuationEvidenceAt(
  tokens: readonly RuntimeHaruToken[],
  lastConnectiveIdx: number,
  continuationStart: number,
  lookups?: LookupTables
): boolean {
  const utterance = activeProtoUtteranceRange(Math.max(lastConnectiveIdx, 0));
  if (utterance === null) return false;
  return hasSupportedClauseContinuation(
    tokens,
    continuationStart,
    Math.min(utterance.endExclusive, tokens.length),
    lookups
  );
}

export function hasPredicateProjectionClauseContinuation(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  endExclusive: number,
  lookups?: LookupTables
): boolean {
  if (hasSupportedClauseContinuation(tokens, start, endExclusive, lookups)) {
    return true;
  }
  const firstContent = skipClausePunctuationForward(tokens, start, endExclusive);
  return firstContent < endExclusive && isKeijoujiCopulaPredicateStart(tokens, firstContent);
}

export function canParseZeroTailPredicateHead(
  tokens: readonly RuntimeHaruToken[],
  start: number
): boolean {
  return zeroTailPredicateHeadAdmission(tokens, start) !== null;
}

export function zeroTailPredicateHeadContestedSlot(
  tokens: readonly RuntimeHaruToken[],
  start: number
): ContestedBareStemNominalUseSlot | null {
  return zeroTailPredicateHeadAdmission(tokens, start)?.contestedBy ?? null;
}

interface ZeroTailPredicateHeadAdmission {
  readonly contestedBy: ContestedBareStemNominalUseSlot | null;
}

function zeroTailPredicateHeadAdmission(
  tokens: readonly RuntimeHaruToken[],
  start: number
): ZeroTailPredicateHeadAdmission | null {
  const token = tokens[start];
  if (token === undefined) {
    return null;
  }
  const closure = zeroTailPredicateHeadClosesUtterance(tokens, start);
  if (closure === null) {
    return null;
  }
  const pos0 = token.pos & POS0;
  if (pos0 === 形状詞) {
    return closure;
  }
  if (isZeroCopulaNaAdjCapableNounPredicateStart(tokens, start)) {
    return closure;
  }
  if (pos0 !== 動詞 && pos0 !== 形容詞0) {
    return null;
  }
  const form5A = token.pos & POS5A;
  return form5A === 終止形_ || form5A === 連体形_ || form5A === 仮定形_ || isVolitionalInflection(token.pos)
    ? closure
    : null;
}

const ZERO_TAIL_HEAD_UTTERANCE_CLOSURES: ReadonlySet<UtteranceClosureKind> = new Set<UtteranceClosureKind>([
  "eos",
  "hard_terminal"
]);

const BARE_KEIJOUJI_ZERO_TAIL_UTTERANCE_CLOSURES: ReadonlySet<UtteranceClosureKind> =
  new Set<UtteranceClosureKind>([
    ...ZERO_TAIL_HEAD_UTTERANCE_CLOSURES,
    "matched_delimiter_close",
    "unmatched_trailing",
    "weak_pause",
    "label_separator",
    "decorative_terminal",
    "clause_boundary"
  ]);

const TERMINAL_ONLY_INFLECTION_ZERO_TAIL_UTTERANCE_CLOSURES: ReadonlySet<UtteranceClosureKind> =
  new Set<UtteranceClosureKind>([
    ...ZERO_TAIL_HEAD_UTTERANCE_CLOSURES,
    "matched_delimiter_close",
    "unmatched_trailing",
    "weak_pause",
    "label_separator",
    "decorative_terminal",
    "clause_boundary"
  ]);

export function terminalOnlyInflectionClosesUtteranceAfter<T extends UtteranceClosureToken & ClauseToken>(
  tokens: readonly T[],
  lastIdx: number
): boolean {
  const scope = activeProtoLayout();
  const traversal = utteranceClosureRunAfter(scope, tokens, lastIdx + 1);
  if (
    runClosesUtteranceAs(traversal, TERMINAL_ONLY_INFLECTION_ZERO_TAIL_UTTERANCE_CLOSURES) ||
    openingDelimiterClosesZeroTailHead(traversal, "terminal_only_inflection", tokens)
  ) {
    return true;
  }
  return scope === null && !traversal.traversed && traversal.endedBy === "content" &&
    isTerminalOnlyPredicateUnmarkedOnsetAt(tokens, traversal.endIdx);
}

export function terminalOnlyPredicateEndpointClosesBefore(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  idx: number
): boolean {
  const hostIdx = idx - 1;
  if (hostIdx < start || !isTerminalOnlyInflectionPredicateAt(tokens, hostIdx)) {
    return false;
  }
  return terminalOnlyInflectionClosesUtteranceAfter(tokens, hostIdx);
}

type ZeroTailHeadClosureHostClass = "bare_keijouji" | "terminal_only_inflection" | "inflected";

function zeroTailHeadClosureHostClass(head: RuntimeHaruToken | undefined): ZeroTailHeadClosureHostClass {
  if (head === undefined) {
    return "inflected";
  }
  if (isLexicalPureNaAdjStem(head)) {
    return "bare_keijouji";
  }
  return isVolitionalInflection(head.pos) ? "terminal_only_inflection" : "inflected";
}

const ZERO_TAIL_UTTERANCE_CLOSURES_BY_HOST_CLASS: Readonly<Record<ZeroTailHeadClosureHostClass, ReadonlySet<UtteranceClosureKind>>> = {
  bare_keijouji: BARE_KEIJOUJI_ZERO_TAIL_UTTERANCE_CLOSURES,
  terminal_only_inflection: TERMINAL_ONLY_INFLECTION_ZERO_TAIL_UTTERANCE_CLOSURES,
  inflected: ZERO_TAIL_HEAD_UTTERANCE_CLOSURES
};

function contestedNominalUseSlotOfClosure(
  evidence: UtteranceClosureEvidence,
  tokens: readonly RuntimeHaruToken[],
  start: number
): ContestedBareStemNominalUseSlot | null {
  const hostOwnedBySlot = bareStemNominalUseHostClass(tokens[start]) !== null;
  if (!hostOwnedBySlot) {
    return null;
  }
  if (evidence.closure === "matched_delimiter_close") {
    return bareStemQuotedHostSlotAt(tokens, start);
  }
  return evidence.closure === "weak_pause" && bareStemNominalUseClausePauseAt(tokens, start)
    ? "stem_clause_pause"
    : null;
}

function weakPauseClosesZeroTailPredicateHead(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  hostClass: ZeroTailHeadClosureHostClass
): boolean {
  if (hostClass === "terminal_only_inflection") {
    return true;
  }
  return bareStemNominalUseHostClass(tokens[start]) !== null &&
    bareStemNominalUseClausePauseAt(tokens, start);
}

function zeroTailPredicateHeadClosesUtterance(
  tokens: readonly RuntimeHaruToken[],
  start: number
): ZeroTailPredicateHeadAdmission | null {
  const hostClass = zeroTailHeadClosureHostClass(tokens[start]);
  const admitted = ZERO_TAIL_UTTERANCE_CLOSURES_BY_HOST_CLASS[hostClass];
  const traversal = utteranceClosureRunAfter(activeProtoLayout(), tokens, start + 1);
  const admittedClosures = traversal.closures.filter((evidence) => admitted.has(evidence.closure));
  const decisive = admittedClosures.find((evidence) => evidence.closure !== "weak_pause");
  if (decisive !== undefined) {
    return { contestedBy: contestedNominalUseSlotOfClosure(decisive, tokens, start) };
  }
  const pause = admittedClosures.find((evidence) => evidence.closure === "weak_pause");
  if (pause !== undefined && weakPauseClosesZeroTailPredicateHead(tokens, start, hostClass)) {
    return { contestedBy: contestedNominalUseSlotOfClosure(pause, tokens, start) };
  }
  if (openingDelimiterClosesZeroTailHead(traversal, hostClass, tokens)) {
    return { contestedBy: null };
  }
  const closedWithoutRunEvidence = !traversal.traversed
    ? traversal.endedBy === "content"
    : traversal.detachedAtEnd;
  return closedWithoutRunEvidence ? { contestedBy: null } : null;
}

function openingDelimiterClosesZeroTailHead<T extends UtteranceClosureToken>(
  traversal: UtteranceClosureRunTraversal,
  hostClass: ZeroTailHeadClosureHostClass,
  tokens: readonly T[]
): boolean {
  if (traversal.endedBy !== "opening_delimiter") {
    return false;
  }
  switch (hostClass) {
    case "bare_keijouji":
      return traversal.openingRole === "bracketed_span";
    case "terminal_only_inflection":
      return traversal.openingRole === "bracketed_span" || traversal.openingRole === "explicit_quote_span" ||
        (traversal.openingRole === "parenthetical_span" && postposedParentheticalClosesUtterance(traversal, tokens));
    case "inflected":
      return false;
  }
}

function postposedParentheticalClosesUtterance<T extends UtteranceClosureToken>(
  traversal: UtteranceClosureRunTraversal,
  tokens: readonly T[]
): boolean {
  const scope = activeProtoLayout();
  const span = scope?.balancedDelimiterSpanOpeningAt(traversal.endIdx);
  if (scope === null || span === undefined) {
    return false;
  }
  const after = utteranceClosureRunAfter(scope, tokens, span.closingIdx + 1);
  return runClosesUtteranceAs(after, TERMINAL_ONLY_INFLECTION_ZERO_TAIL_UTTERANCE_CLOSURES);
}

export function quotedBareKeijoujiHostScanEnd(
  tokens: readonly RuntimeHaruToken[],
  start: number
): number | null {
  const head = tokens[start];
  if (head === undefined || !isLexicalPureNaAdjStem(head)) {
    return null;
  }
  const reach = activeProtoLayout()?.tailReachEvidenceInClause(start);
  return reach !== undefined && reach.clampedBy === "balanced_span" && reach.endExclusive === start + 1
    ? start
    : null;
}

export function isRentaishiPronominalNoPredicateStart(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  lookups: LookupTables | undefined
): boolean {
  const span = rentaishiPronominalNoHeadSpanAt(tokens, idx);
  if (span === null) {
    return false;
  }
  if (pronominalNoCopulaDeFollows(tokens[span.endExclusive])) {
    return false;
  }
  return copulaStartsPredicateAt(tokens, span.endExclusive, lookups);
}

export function isDemonstrativePropositionWakeHostStart(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  lookups: LookupTables | undefined
): boolean {
  return demonstrativePropositionHostAt(tokens, idx, lookups) !== null &&
    isWakeNounToken(tokens[idx + 1]);
}

export function demonstrativePropositionHostAt(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  lookups: LookupTables | undefined
): readonly [korean: string, irregular: IrregularType | null] | null {
  const token = tokens[idx];
  if (token === undefined || lookups === undefined || (token.pos & POS0) !== 連体詞) {
    return null;
  }
  const table = lookups.DEMONSTRATIVE_ADNOMINAL_PROPOSITION_HOSTS;
  return table.get(token.surface) ?? table.get(token.dictionaryForm) ?? null;
}
