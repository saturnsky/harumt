import type { RenderPlan } from "../../../../types/render-plan.js";
import { isHeadTailChainRenderPlan } from "../../../../types/render-plan.js";
import { morphSurface, type RuntimeHaruToken } from "../../../../types/token.js";
import type { MorphemeEntry } from "../../../../types/dictionary.js";
import { isClauseEvidenceTransparentPunctuation, isClausePunctuationToken } from "../../../clause-layout/punctuation.js";
import { candidateConditionsHaveAssemblerOwner, senseHasAssemblerOwnerFrame } from "../../../context-owner.js";
import { isResolvedContentResult, type ContentResult } from "../../../content-types.js";
import { quoteStructuralRelationsForHost } from "../../../structural-relation/quote.js";
import type { LookupTables } from "../../../lookup-tables.js";
import { DERIVATIONAL_SUFFIX_FAIL_CLOSED_PREFIX } from "./derivational-suffix-lowering.js";
import { matchQuotedJudgmentPassiveTail } from "../../../semantics/modality-specs.js";
import { adverbialToCapableKeijoujiHost } from "../../../semantics/tari-adverbial-marker.js";
import { TokenCursor } from "../../../token-cursor.js";
import type { TranslationUnitProvenance } from "../../../translation/unit.js";
import {
  caseParticleMarkerRelationForToken,
  conditionalTailConnectiveRelationForToken,
  copulaNiMarkerRelationForToken,
  dewaScopeBridgeRelationAt,
  nominalLinkMarkerRelationForToken,
  nominalizerAdversativeConnectiveRelationAt,
  nominalizerQuestionContentConnectiveRelationAt,
  nominalizerReasonConnectiveRelationAt,
  registeredClauseConnectiveRelationForToken
} from "../../boundary/marker.js";
import { quoteMarkerRelationAt } from "../../boundary/quote-marker.js";
import { parentheticalSpanStartingAt } from "../../boundary/parenthetical.js";
import { classifyAttributiveHeadKind } from "./structural-attributive-head-table.js";
import {
  isAdnominalCopulaToken,
  isTeSurfaceConnectiveToken
} from "./classifiers/tokens.js";


import {
  POS0,
  POS01,
  isNaAdjCapable,
  isAttributiveCapableNominalHostToken,
  pos0in,
  POS1,
  POS4,
  POS5,
  POS5A,
  PREDICATE_BITS,
  格助詞,
  形状詞,
  形容詞0,
  形容詞4,
  終止形_,
  助詞,
  助詞_係助詞,
  助動詞,
  助動詞_ダ,
  接頭辞,
  接尾辞,
  代名詞,
  動詞,
  副詞,
  名詞,
  連体形_,
  連体詞,
  連用形_,
  감탄사,
  관형사,
  대명사,
  명사,
  부사,
  수사,
  연체사,
  접속사,
  isAuxiliaryStemToken,
  isConjunctionToken,
  isImperativeInflection,
  isPureNaAdjStem,
  isVerbPredicateToken,
  stemFormName,
} from "../../../../types/pos.js";
import {
  candidateSetCandidates,
  candidateSetMembers,
  isResolvedCandidateSet
} from "../../../source-candidate-set.js";
import { candidateProjectionKinds, mixedPosSlot } from "../../../candidate-runtime.js";
import { collectAuxTokens } from "../../../matchers.js";
import { isLexicalAdverb, isNominalLike } from "../../../../types/pos.js";
import type { TailChunkIntakeVerdict } from "./integration/contracts.js";
import type { SfpNode } from "./grammar.js";
export function tailFallbackSpanProvenance(
  tokens: readonly RuntimeHaruToken[],
  cursor: TokenCursor<RuntimeHaruToken>,
  start: number,
  consumed: number,
  renderPlan: RenderPlan | null | undefined,
  tailParserReason: string,
  lookups: LookupTables,
  contentResult?: ContentResult | null,
  predicateIntake?: TailChunkIntakeVerdict
): TranslationUnitProvenance {
  return classifyTailSpanProvenance({
    tokens,
    cursor,
    start,
    consumed,
    renderPlan,
    reason: tailParserReason,
    contentResult: contentResult ?? null,
    mode: "parse_failure",
    lookups,
    ...(predicateIntake === undefined ? {} : { predicateIntake })
  });
}

export function classifyTailSpanProvenance(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly start: number;
  readonly consumed: number;
  readonly renderPlan: RenderPlan | null | undefined;
  readonly reason: string;
  readonly contentResult?: ContentResult | null;
  readonly mode: "parse_failure" | "readiness_blocker" | "contested_claim_yield";
  readonly lookups: LookupTables;
  readonly predicateIntake?: TailChunkIntakeVerdict;
}): TranslationUnitProvenance {
  if (options.mode === "contested_claim_yield") {
    return "assembler";
  }
  if (
    renderPlanIsAssemblerOwnedNonTail(options.renderPlan) ||
    spanHasAssemblerCollocationOwner(options.tokens, options.start, options.consumed) ||
    spanIsParentheticalKanaGlossFragment(options.tokens, options.start, options.consumed, options.reason) ||
    spanIsFunctionalCopulaFocusPhrase(options.tokens, options.start, options.consumed, options.reason) ||
    spanIsQuotedTopicFocusPhrase(options.tokens, options.start, options.consumed, options.reason) ||
    spanIsNominalAdjacencyAssemblerPhrase(options.tokens, options.start, options.consumed, options.reason) ||
    spanIsAdnominalModifierAssemblerPhrase(options.tokens, options.start, options.consumed, options.reason) ||
    spanIsStandaloneAdnominalModifierPhrase(options.tokens, options.start, options.consumed, options.reason) ||
    spanIsExternalNominalOwnerSplit(options.tokens, options.start, options.consumed, options.reason) ||
    spanIsKeijoujiNiAdverbialPhrase(options.tokens, options.start, options.consumed) ||
    spanIsKeijoujiNoAdnominalPhrase(options.tokens, options.start, options.consumed, options.reason) ||
    spanIsVerbRenyouNoAdnominalPhrase(options.tokens, options.start, options.consumed, options.reason) ||
    spanIsTariAdverbialToSuruCompound(options.tokens, options.start, options.consumed) ||
    isQuoteDiscourseIdiomSpan(options.tokens, options.start, options.consumed) ||
    toClauseSemanticOwnerOwnsSpan(options.tokens, options.start, options.consumed) ||
    structuredConnectiveRenderPlanOwnsFailureBoundary(options) ||
    structuredRenderPlanOwnsNonTailFallbackSpan(options)
  ) {
    return "assembler";
  }
  const base = spanProvenance(options.tokens, options.start, options.consumed, options.renderPlan);
  if (base !== "assembler") {
    return base;
  }
  if (
    (options.mode === "readiness_blocker" || tailParserFailureIsIntakeBlocked(options.reason)) &&
    (
      contentResultResolvedAssemblerContextOwner(options.contentResult) ||
      contentResultIsNonPredicateAssemblerOwner(options.contentResult) ||
      sourceEvidencedLexicalNonPredicateOwnsSpan(options) ||
      quoteContentHostOwnsSpan(options.cursor.fork(options.start, options.cursor.end, options.start), options.start, options.consumed, options.lookups)
    )
  ) {
    return "assembler";
  }
  if (
    options.mode === "parse_failure" &&
    (
      contentResultResolvedAssemblerContextOwner(options.contentResult) ||
      contentResultIsNonPredicateAssemblerOwner(options.contentResult) ||
      sourceEvidencedLexicalNonPredicateOwnsSpan(options) ||
      outOfDomainPredicateAnchorHasLexicalOwner(options)
    )
  ) {
    return "assembler";
  }
  if (options.mode === "readiness_blocker") {
    return "tail_parser_blocked";
  }
  if (tailParserFailureIsFragmentContinuation(options)) {
    return "assembler";
  }
  return tailParserFailureProvenance(options.reason);
}

function spanProvenance(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  consumed: number,
  renderPlan: RenderPlan | null | undefined
): TranslationUnitProvenance {
  if (
    renderPlanIsAssemblerOwnedNonTail(renderPlan) ||
    isQuoteDiscourseIdiomSpan(tokens, start, consumed)
  ) {
    return "assembler";
  }
  return "assembler";
}

function spanHasAssemblerCollocationOwner(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  consumed: number,
): boolean {
  for (let offset = 0; offset < consumed; offset += 1) {
    if (tokens[start + offset]?.collocDone === true) {
      return true;
    }
  }
  return false;
}

function spanIsParentheticalKanaGlossFragment(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  consumed: number,
  reason: string
): boolean {
  if (!reason.includes("partial parse not in subset") && !reason.includes("parser consumed")) {
    return false;
  }
  const parenthetical = enclosingNonQuoteParentheticalSpan(tokens, start);
  if (parenthetical === null) {
    return false;
  }
  const firstFieldStart = parenthetical.openingIdx + 1;
  const firstFieldEnd = parentheticalFirstFieldEnd(tokens, parenthetical.openingIdx, parenthetical.closingIdx);
  if (start < firstFieldStart || start >= firstFieldEnd) {
    return false;
  }
  if (start + consumed > firstFieldEnd) {
    return false;
  }
  return spanIsKanaGloss(tokens, firstFieldStart, firstFieldEnd);
}

function enclosingNonQuoteParentheticalSpan(
  tokens: readonly RuntimeHaruToken[],
  index: number
): ReturnType<typeof parentheticalSpanStartingAt> {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const parenthetical = parentheticalSpanStartingAt(tokens, cursor, {
      consumers: ["tail_boundary_readiness"]
    });
    if (
      parenthetical !== null &&
      parenthetical.role !== "explicit_quote_span" &&
      parenthetical.span.start < index &&
      index < parenthetical.span.endExclusive
    ) {
      return parenthetical;
    }
  }
  return null;
}

function parentheticalFirstFieldEnd(
  tokens: readonly RuntimeHaruToken[],
  openingIdx: number,
  closingIdx: number
): number {
  for (let idx = openingIdx + 1; idx < closingIdx; idx += 1) {
    const token = tokens[idx];
    if (
      token === undefined ||
      token.surface === "、" ||
      token.surface === "," ||
      token.surface === "，" ||
      isClausePunctuationToken(token)
    ) {
      return idx;
    }
  }
  return closingIdx;
}

function spanIsKanaGloss(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  endExclusive: number
): boolean {
  if (start >= endExclusive) {
    return false;
  }
  for (let idx = start; idx < endExclusive; idx += 1) {
    const token = tokens[idx];
    if (token === undefined) {
      continue;
    }
    if (!/^[\u3040-\u309f\u30a0-\u30ffー]+$/u.test(token.surface)) {
      return false;
    }
  }
  return true;
}

function spanIsFunctionalCopulaFocusPhrase(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  consumed: number,
  reason: string
): boolean {
  if (!reason.includes("unrecognized aux")) {
    return false;
  }
  const focusIdx = tailParserFailureTokenIndexInTokenStream({ tokens, start, reason });
  if (focusIdx === null || focusIdx < start || focusIdx > start + consumed) {
    return false;
  }
  const relation = dewaScopeBridgeRelationAt(tokens, focusIdx - 1, {
    anchorIdx: start,
    consumers: ["tail_boundary_readiness"]
  });
  return relation !== null && relation.span.endExclusive === focusIdx + 1;
}

function spanIsQuotedTopicFocusPhrase(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  consumed: number,
  reason: string
): boolean {
  if (!reason.includes("unrecognized aux")) {
    return false;
  }
  const focusIdx = tailParserFailureTokenIndexInTokenStream({ tokens, start, reason });
  const endExclusive = start + consumed;
  if (focusIdx === null || focusIdx <= start || focusIdx > endExclusive + 1) {
    return false;
  }
  const focus = tokens[focusIdx];
  if (focus?.surface !== "は" || (focus.pos & POS01) !== 助詞_係助詞) {
    return false;
  }
  if (!isOpeningQuoteLikeToken(tokens[focusIdx + 1])) {
    return false;
  }
  return isTopicFocusPhrasePrefixEndToken(tokens[focusIdx - 1]);
}

function isOpeningQuoteLikeToken(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  return token.surface === "「" ||
    token.surface === "『" ||
    token.surface === "（" ||
    token.surface === "(";
}

function isTopicFocusPhrasePrefixEndToken(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined || (token.pos & POS0) !== 助詞) {
    return false;
  }
  return (token.pos & POS1) === 格助詞 ||
    token.surface === "て" ||
    token.surface === "について";
}

function spanIsNominalAdjacencyAssemblerPhrase(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  consumed: number,
  reason: string
): boolean {
  if (!reason.includes("unrecognized aux")) {
    return false;
  }
  const failedIdx = tailParserFailureTokenIndexAtSpanEnd({ tokens, start, consumed, reason });
  if (failedIdx === null || failedIdx !== start + consumed) {
    return false;
  }
  const prefixEnd = failedIdx;
  if (prefixEnd <= start) {
    return false;
  }
  const follower = tokens[failedIdx];
  if (!isOrdinaryNominalHeadToken(follower)) {
    return false;
  }
  for (let idx = start; idx < prefixEnd; idx += 1) {
    if (!isNominalAdjacencyModifierToken(tokens[idx])) {
      return false;
    }
  }
  return true;
}

function isNominalAdjacencyModifierToken(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  if (pos0in(token.pos, (1 << 形状詞) | (1 << 連体詞) | (1 << 接頭辞))) {
    return true;
  }
  if ((token.pos & POS0) === 名詞) {
    return true;
  }
  return (token.pos & POS0) === 助動詞 &&
    (
      (token.pos & POS5A) === 連体形_ ||
      (token.pos & POS5A) === 終止形_
    );
}

function spanIsAdnominalModifierAssemblerPhrase(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  consumed: number,
  reason: string
): boolean {
  const failedIdx = tailParserFailureTokenIndexInTokenStream({ tokens, start, reason });
  const endExclusive = start + consumed;
  if (
    failedIdx === null ||
    failedIdx < start ||
    failedIdx > endExclusive ||
    failedIdx < endExclusive - 1
  ) {
    return false;
  }
  const marker = tokens[failedIdx];
  if (!isAdnominalCopulaToken(marker)) {
    return false;
  }
  if (!isNominalHostStartAfterAdnominalMarker(tokens, failedIdx + 1)) {
    return false;
  }
  for (let idx = start; idx < failedIdx; idx += 1) {
    if (!isAdnominalModifierPrefixToken(tokens[idx])) {
      return false;
    }
  }
  return failedIdx > start;
}

function spanIsStandaloneAdnominalModifierPhrase(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  consumed: number,
  reason: string
): boolean {
  const failedIdx = tailParserFailureTokenIndexInTokenStream({ tokens, start, reason });
  const endExclusive = start + consumed;
  if (failedIdx === null || (failedIdx !== endExclusive && failedIdx !== endExclusive - 1)) {
    return false;
  }
  const marker = tokens[failedIdx];
  if (!isAdnominalCopulaToken(marker)) {
    return false;
  }
  const follower = tokens[Math.max(endExclusive, failedIdx + 1)];
  if (follower !== undefined && !isClausePunctuationToken(follower)) {
    return false;
  }
  for (let idx = start; idx < failedIdx; idx += 1) {
    if (!isAdnominalModifierPrefixToken(tokens[idx])) {
      return false;
    }
  }
  return failedIdx > start;
}

function spanIsExternalNominalOwnerSplit(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  consumed: number,
  reason: string
): boolean {
  if (!reason.includes("unrecognized aux")) {
    return false;
  }
  const failedIdx = tailParserFailureTokenIndexInTokenStream({ tokens, start, reason });
  const endExclusive = start + consumed;
  if (failedIdx === null || failedIdx <= start) {
    return false;
  }
  const bridgeIdx =
    failedIdx === endExclusive + 1 && isExternalNominalOwnerBridgeToken(tokens[endExclusive])
      ? endExclusive
      : null;
  if (failedIdx > endExclusive && bridgeIdx === null) {
    return false;
  }
  if (!isExternalNominalOwnerBoundaryToken(tokens, failedIdx)) {
    return false;
  }
  const prefixEnd = bridgeIdx ?? failedIdx;
  for (let idx = start; idx < prefixEnd; idx += 1) {
    if (!isExternalNominalOwnerPrefixTokenAt(tokens, start, idx)) {
      return false;
    }
  }
  return true;
}

function isExternalNominalOwnerBridgeToken(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  if (token.surface !== "なく") {
    return false;
  }
  return (token.pos & (POS0 | POS4 | POS5A)) === (形容詞0 | 形容詞4 | 連用形_);
}

function isExternalNominalOwnerBoundaryToken(
  tokens: readonly RuntimeHaruToken[],
  index: number
): boolean {
  const token = tokens[index];
  if (token === undefined) {
    return false;
  }
  if (isOrdinaryNominalHeadToken(token)) {
    return true;
  }
  if ((token.pos & POS0) === 接頭辞) {
    return isOrdinaryNominalHeadToken(tokens[index + 1]);
  }
  if (
    pos0in(token.pos, PREDICATE_BITS) &&
    ((token.pos & POS5A) === 連体形_ || (token.pos & POS5A) === 終止形_)
  ) {
    return true;
  }
  return false;
}

function isExternalNominalOwnerPrefixTokenAt(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  index: number
): boolean {
  const token = tokens[index];
  if (token === undefined) {
    return false;
  }
  const pos0 = token.pos & POS0;
  if (
    pos0 === 名詞 ||
    pos0 === 代名詞 ||
    pos0 === 接尾辞 ||
    pos0 === 接頭辞 ||
    pos0 === 形容詞0 ||
    pos0 === 形状詞 ||
    pos0 === 動詞 ||
    pos0 === 連体詞
  ) {
    return true;
  }
  if (pos0 === 助動詞) {
    const form5 = token.pos & POS5;
    return (form5 & POS5A) === 終止形_ ||
      (form5 & POS5A) === 連体形_ ||
      (form5 & POS5A) === 連用形_;
  }
  if (
    pos0 === 助詞 &&
    token.surface === "は" &&
    index > start &&
    tokens[index - 1]?.surface === "で"
  ) {
    return true;
  }
  return pos0 === 助詞 &&
    (token.surface === "と" || token.surface === "で" || token.surface === "なく");
}

function isAdnominalModifierPrefixToken(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined &&
    (
      (token.pos & POS0) === 副詞 ||
      (token.pos & POS0) === 形状詞 ||
      (token.pos & POS0) === 名詞 ||
      (token.pos & POS0) === 動詞 ||
      (token.pos & POS0) === 形容詞0
    );
}

function isNominalHostStartAfterAdnominalMarker(
  tokens: readonly RuntimeHaruToken[],
  index: number
): boolean {
  const token = tokens[index];
  if (isOrdinaryNominalHeadToken(token)) {
    return true;
  }
  if (
    token !== undefined &&
    pos0in(token.pos, (1 << 連体詞) | (1 << 接頭辞)) &&
    isOrdinaryNominalHeadToken(tokens[index + 1])
  ) {
    return true;
  }
  return token !== undefined &&
    (token.pos & (POS0 | POS5A)) === (動詞 | 連用形_) &&
    isOrdinaryNominalHeadToken(tokens[index + 1]);
}

function isOrdinaryNominalHeadToken(token: RuntimeHaruToken | undefined): boolean {
  if (!isNominalHeadToken(token)) {
    return false;
  }
  return classifyAttributiveHeadKind(token) === "ordinary_nominal";
}

function spanIsKeijoujiNiAdverbialPhrase(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  consumed: number
): boolean {
  if (consumed !== 2) {
    return false;
  }
  const head = tokens[start];
  const ni = tokens[start + 1];
  if (head === undefined || ni === undefined) {
    return false;
  }
  if (
    copulaNiMarkerRelationForToken(ni, start + 1, {
      consumers: ["tail_boundary_readiness"]
    }) === null
  ) {
    return false;
  }
  return isNaAdjCapable(head);
}

function spanIsNoAdnominalPhrase(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  consumed: number,
  reason: string,
  isHeadMatch: (head: RuntimeHaruToken) => boolean,
  recordRejectReason: string | null = null
): boolean {
  const noIdx = reason.includes("unrecognized aux")
    ? tailParserFailureTokenIndexAtSpanEnd({ tokens, start, consumed, reason })
    : recordRejectReason !== null && reason === recordRejectReason
      ? start + consumed
      : null;
  if (noIdx === null || noIdx !== start + consumed) {
    return false;
  }
  const head = tokens[start];
  const no = tokens[noIdx];
  const host = tokens[noIdx + 1];
  if (head === undefined || !isHeadMatch(head)) {
    return false;
  }
  if (
    nominalLinkMarkerRelationForToken(no, noIdx, {
      consumers: ["tail_boundary_readiness"]
    }) === null
  ) {
    return false;
  }
  return isNominalHeadToken(host);
}

const EXPLICIT_ADNOMINAL_NO_RECORD_REJECT_REASON = "production family 'keijouji_bare_attributive' requested reject";
const NOMINAL_EXPLICIT_ADNOMINAL_NO_RECORD_REJECT_REASON = "production family 'nominal_explicit_no_attributive' requested reject";

function spanIsKeijoujiNoAdnominalPhrase(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  consumed: number,
  reason: string
): boolean {
  return spanIsNoAdnominalPhrase(tokens, start, consumed, reason, isNaAdjCapable, EXPLICIT_ADNOMINAL_NO_RECORD_REJECT_REASON) ||
    spanIsNoAdnominalPhrase(
      tokens, start, consumed, reason, isAttributiveCapableNominalHostToken, NOMINAL_EXPLICIT_ADNOMINAL_NO_RECORD_REJECT_REASON
    );
}

function spanIsVerbRenyouNoAdnominalPhrase(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  consumed: number,
  reason: string
): boolean {
  return spanIsNoAdnominalPhrase(
    tokens, start, consumed, reason,
    (head) => (head.pos & (POS0 | POS5A)) === (動詞 | 連用形_)
  );
}

function spanIsTariAdverbialToSuruCompound(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  consumed: number
): boolean {
  if (consumed < 3) {
    return false;
  }
  const head = tokens[start];
  const to = tokens[start + 1];
  const suru = tokens[start + 2];
  if (!adverbialToCapableKeijoujiHost(head)) {
    return false;
  }
  if (
    caseParticleMarkerRelationForToken(to, start + 1, {
      acceptedSurfaces: ["と"],
      consumers: ["tail_boundary_readiness"]
    }) === null
  ) {
    return false;
  }
  return suru !== undefined && (suru.pos & POS0) === 動詞 && suru.dictionaryForm === "する";
}

function isNominalHeadToken(token: RuntimeHaruToken | undefined): token is RuntimeHaruToken {
  if (token === undefined) {
    return false;
  }
  const pos0 = token.pos & POS0;
  return pos0 === 名詞 ||
    pos0 === 代名詞 ||
    pos0 === 接尾辞;
}

function renderPlanIsAssemblerOwnedNonTail(plan: RenderPlan | null | undefined): boolean {
  if (plan === null || plan === undefined) {
    return false;
  }
  return (
    plan.kind === "attributive" ||
    plan.kind === "hybridPostAux" ||
    plan.kind === "copulaPredicate" ||
    plan.kind === "conjugatedLemma" ||
    plan.kind === "keijoujiAdverb" ||
    plan.kind === "keijoujiState" ||
    plan.kind === "youdaModality" ||
    plan.kind === "reasonBecause" ||
    plan.kind === "nominalConnectiveScope" ||
    plan.kind === "nominalDemoAru" ||
    plan.kind === "lexicalParticleAdverbial" ||
    plan.kind === "compoundNominalSuffix"
  );
}

function structuredConnectiveRenderPlanOwnsFailureBoundary(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly start: number;
  readonly consumed: number;
  readonly renderPlan: RenderPlan | null | undefined;
  readonly reason: string;
  readonly contentResult?: ContentResult | null;
}): boolean {
  if (!tailParserFailureAtRecognizedConnectiveBoundary(options)) {
    return false;
  }
  return renderPlanDirectlyOwnsStructuredConnective(options.renderPlan) ||
    renderPlanDirectlyOwnsStructuredConnective(options.contentResult?.renderPlan);
}

function tailParserFailureAtRecognizedConnectiveBoundary(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly start: number;
  readonly consumed: number;
  readonly reason: string;
}): boolean {
  if (!options.reason.includes("unrecognized aux")) {
    return false;
  }
  const failedIdx = tailParserFailureTokenIndex(options);
  if (failedIdx === null) {
    return false;
  }
  const token = options.tokens[failedIdx];
  if (token === undefined) {
    return false;
  }
  const consumers = ["tail_boundary_readiness"] as const;
  return (
    quoteMarkerRelationAt(options.tokens, failedIdx, { consumers }) !== null ||
    conditionalTailConnectiveRelationForToken(token, failedIdx, { consumers }) !== null ||
    registeredClauseConnectiveRelationForToken(token, failedIdx, { consumers }) !== null ||
    nominalizerReasonConnectiveRelationAt(options.tokens, failedIdx, { consumers }) !== null ||
    nominalizerQuestionContentConnectiveRelationAt(options.tokens, failedIdx, { consumers }) !== null ||
    nominalizerAdversativeConnectiveRelationAt(options.tokens, failedIdx, { consumers }) !== null
  );
}

function tailParserFailureTokenIndex(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly start: number;
  readonly consumed: number;
  readonly reason: string;
}): number | null {
  const index = tailParserFailureTokenIndexInTokenStream(options);
  if (index === null) {
    return null;
  }
  const endExclusive = options.start + options.consumed;
  return index >= options.start && index < endExclusive ? index : null;
}

function tailParserFailureTokenIndexInTokenStream(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly start: number;
  readonly reason: string;
}): number | null {
  const match = /position\s+(\d+)\s+\(surface=([^)]+)\)/u.exec(options.reason);
  if (match === null) {
    return null;
  }
  const parsed = Number.parseInt(match[1] ?? "", 10);
  if (!Number.isInteger(parsed)) {
    return null;
  }
  const surface = match[2] ?? "";
  const relative = options.start + parsed;
  if (relative >= 0 && relative < options.tokens.length && tokenMatchesSurface(options.tokens[relative], surface)) {
    return relative;
  }
  const absolute = parsed;
  if (absolute >= 0 && absolute < options.tokens.length && tokenMatchesSurface(options.tokens[absolute], surface)) {
    return absolute;
  }
  return null;
}

function tailParserFailureTokenIndexAtSpanEnd(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly start: number;
  readonly consumed: number;
  readonly reason: string;
}): number | null {
  const match = /position\s+(\d+)\s+\(surface=([^)]+)\)/u.exec(options.reason);
  if (match === null) {
    return tailParserFailureTokenIndexInTokenStream(options);
  }
  const parsed = Number.parseInt(match[1] ?? "", 10);
  const surface = match[2] ?? "";
  const relative = options.start + parsed;
  if (relative === options.start + options.consumed && tokenMatchesSurface(options.tokens[relative], surface)) {
    return relative;
  }
  const absolute = parsed;
  if (absolute === options.start + options.consumed && tokenMatchesSurface(options.tokens[absolute], surface)) {
    return absolute;
  }
  return tailParserFailureTokenIndexInTokenStream(options);
}

function tokenMatchesSurface(token: RuntimeHaruToken | undefined, surface: string): boolean {
  if (token === undefined) {
    return false;
  }
  return token.surface === surface || token.dictionaryForm === surface;
}

function renderPlanDirectlyOwnsStructuredConnective(plan: RenderPlan | null | undefined): boolean {
  if (plan === null || plan === undefined) {
    return false;
  }

  if ("connective" in plan && plan.connective !== undefined && plan.connective !== null) {
    return true;
  }

  if ("terminalConnective" in plan && plan.terminalConnective !== undefined && plan.terminalConnective !== null) {
    return true;
  }
  return plan.kind === "legacySurfaceComposition" && plan.connectiveRoleSource === "semantic";
}

function structuredRenderPlanOwnsNonTailFallbackSpan(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly start: number;
  readonly consumed: number;
  readonly renderPlan: RenderPlan | null | undefined;
  readonly reason: string;
  readonly contentResult?: ContentResult | null;
}): boolean {
  return structuredPrefixOwnerSurvivesSuffixBoundary(options) ||
    headTailChainRenderPlanOwnsFallbackSpan(options.renderPlan) ||
    headTailChainRenderPlanOwnsFallbackSpan(options.contentResult?.renderPlan) ||
    attributiveLegacySurfaceCompositionOwnsFallbackSpan(options.renderPlan) ||
    attributiveLegacySurfaceCompositionOwnsFallbackSpan(options.contentResult?.renderPlan);
}

function headTailChainRenderPlanOwnsFallbackSpan(plan: RenderPlan | null | undefined): boolean {
  return isHeadTailChainRenderPlan(plan);
}

function structuredPrefixOwnerSurvivesSuffixBoundary(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly start: number;
  readonly consumed: number;
  readonly renderPlan: RenderPlan | null | undefined;
  readonly reason: string;
  readonly contentResult?: ContentResult | null;
}): boolean {
  const failedIdx = tailParserFailureTokenIndexInTokenStream(options);
  if (failedIdx === null || failedIdx < options.start + options.consumed) {
    return false;
  }
  return renderPlanIsStructuredNonFallbackOwner(options.renderPlan) ||
    renderPlanIsStructuredNonFallbackOwner(options.contentResult?.renderPlan);
}

function renderPlanIsStructuredNonFallbackOwner(plan: RenderPlan | string | null | undefined): boolean {
  if (plan === null || plan === undefined || typeof plan === "string") {
    return false;
  }
  if (isHeadTailChainRenderPlan(plan) || renderPlanDirectlyOwnsStructuredConnective(plan)) {
    return true;
  }
  if (plan.kind === "legacySurfaceComposition") {
    return renderPlanIsStructuredLegacySurfaceCompositionOwner(plan);
  }
  return SOURCE_BEARING_RENDER_PLAN_KINDS.has(plan.kind);
}

const SOURCE_BEARING_RENDER_PLAN_KINDS: ReadonlySet<RenderPlan["kind"]> = new Set([
  "lemma",
  "attributive",
  "hybridPostAux",
  "giveRequest",
  "predicateScope",
  "predicateNominalScope",
  "noda",
  "copulaPredicate",
  "particleizedLemma",
  "conjugatedLemma",
  "semanticCarrierPredicate",
  "pronominalNoNominal",
  "discourseConnective",
  "youdaModality",
  "reasonBecause",
  "nominalConnectiveScope",
  "nominalDemoAru",
  "compoundNominalSuffix",
  "wakeExplanation"
]);

function renderPlanIsStructuredLegacySurfaceCompositionOwner(plan: Extract<RenderPlan, { readonly kind: "legacySurfaceComposition" }>): boolean {
  if (plan.connectiveRoleSource === "semantic") {
    return true;
  }
  return renderPlanIsStructuredNonFallbackOwner(plan.prefix) ||
    renderPlanIsStructuredNonFallbackOwner(plan.suffix);
}

function attributiveLegacySurfaceCompositionOwnsFallbackSpan(plan: RenderPlan | string | null | undefined): boolean {
  if (plan === null || plan === undefined || typeof plan === "string") {
    return false;
  }
  if (plan.kind === "attributive") {
    return true;
  }
  if (plan.kind !== "legacySurfaceComposition") {
    return false;
  }
  return attributiveLegacySurfaceCompositionOwnsFallbackSpan(plan.prefix) ||
    attributiveLegacySurfaceCompositionOwnsFallbackSpan(plan.suffix);
}

function isQuoteDiscourseIdiomSpan(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  consumed: number,
): boolean {
  return spanHasSurfaceSequence(tokens, start, consumed, ["と", "は", "いえ"]) ||
    spanHasSurfaceSequence(tokens, start, consumed, ["と", "は", "いう", "もの", "の"]) ||
    spanHasSurfaceSequence(tokens, start, consumed, ["と", "は", "言う", "もの", "の"]);
}

function spanHasSurfaceSequence(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  consumed: number,
  surfaces: readonly string[]
): boolean {
  if (surfaces.length > consumed) {
    return false;
  }
  for (let offset = 0; offset <= consumed - surfaces.length; offset += 1) {
    let matched = true;
    for (let inner = 0; inner < surfaces.length; inner += 1) {
      const tok = tokens[start + offset + inner];
      if (tok === undefined) {
        matched = false;
        break;
      }
      const form = tok.dictionaryForm || tok.surface;
      if (tok.surface !== surfaces[inner] && form !== surfaces[inner]) {
        matched = false;
        break;
      }
    }
    if (matched) {
      return true;
    }
  }
  return false;
}

function quoteContentHostOwnsSpan(
  cursor: TokenCursor<RuntimeHaruToken>,
  start: number,
  consumed: number,
  lookups: LookupTables
): boolean {
  const endExclusive = start + consumed;
  for (let hostIdx = start; hostIdx < endExclusive; hostIdx += 1) {
    const relations = quoteStructuralRelationsForHost(cursor.fork(hostIdx, cursor.end, hostIdx), lookups);
    if (relations.length > 0) {
      return true;
    }
  }
  return false;
}

function toClauseSemanticOwnerOwnsSpan(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  consumed: number
): boolean {
  const endExclusive = start + consumed;
  const spanCursor = new TokenCursor(tokens, start, endExclusive);
  for (let markerIdx = start; markerIdx < endExclusive; markerIdx += 1) {
    const marker = quoteMarkerRelationAt(tokens, markerIdx, {
      consumers: ["tail_multi_clause"]
    });
    if (marker?.canonicalSurface !== "と") {
      continue;
    }
    if (cognitiveToClauseHostOwnsSpan(tokens, markerIdx, endExclusive)) {
      return true;
    }
    if (spanCursor.lookahead(markerIdx - start, cursor => quotedJudgmentPassiveHostOwnsSpan(cursor, start))) {
      return true;
    }
  }
  return false;
}

function cognitiveToClauseHostOwnsSpan(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number,
  endExclusive: number
): boolean {
  const hostIdx = markerIdx + 1;
  const host = tokens[hostIdx];
  if (host === undefined || (host.pos & POS0) !== 動詞) {
    return false;
  }
  const hostForm = host.dictionaryForm || host.surface;
  const afterHost = hostIdx + 1;
  if (
    hostForm === "知る" &&
    afterHost + 1 < endExclusive &&
    tokens[afterHost]?.surface === "ず" &&
    ((tokens[afterHost].pos) & POS0) === 助動詞 &&
    caseParticleMarkerRelationForToken(tokens[afterHost + 1], afterHost + 1, {
      acceptedSurfaces: ["に"],
      consumers: ["tail_boundary_readiness"]
    }) !== null
  ) {
    return true;
  }
  if (
    (hostForm === "知る" || hostForm === "気づく" || hostForm === "気付く") &&
    afterHost < endExclusive &&
    isTeSurfaceConnectiveToken(tokens[afterHost])
  ) {
    return true;
  }
  return false;
}

function quotedJudgmentPassiveHostOwnsSpan(
  cursor: TokenCursor<RuntimeHaruToken>,
  start: number
): boolean {
  const { tokens, pos: markerIdx } = cursor;
  const hasCopula = spanHasCopulaAuxBeforeMarker(tokens, start, markerIdx);
  return matchQuotedJudgmentPassiveTail(cursor, {
    hasCopulaBeforeMarker: hasCopula,
    nominalHead: true
  }) !== null;
}

function spanHasCopulaAuxBeforeMarker(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  markerIdx: number
): boolean {
  for (let index = start; index < markerIdx; index += 1) {
    const token = tokens[index];
    if (token !== undefined && (token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_ダ)) {
      return true;
    }
  }
  return false;
}

function tailParserFailureProvenance(reason: string): TranslationUnitProvenance {
  if (reason === "zero-tail predicate head requires terminal/attributive form") {
    return "assembler";
  }
  if (reason.startsWith("renderer:") || reason.includes("not yet represented in TailRoot")) {
    return "tail_parser_blocked";
  }
  if (
    reason.includes("not a tail-parser chunk start") ||
    reason.includes("tail chunk requires at least one tail token") ||
    reason.includes("assembler-owned request quote host") ||
    reason.startsWith(DERIVATIONAL_SUFFIX_FAIL_CLOSED_PREFIX)
  ) {
    return "assembler";
  }
  if (tailParserFailureIsIntakeBlocked(reason)) {
    return "tail_parser_blocked";
  }
  return "legacy_tail";
}

function tailParserFailureIsIntakeBlocked(reason: string): boolean {
  return (
    reason.includes("translation has source-frame conditions") ||
    reason.includes("Phase 5.5")
  );
}

function tailParserFailureIsFragmentContinuation(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly start: number;
  readonly consumed: number;
  readonly reason: string;
}): boolean {
  if (
    !options.reason.includes("chain/connect signal without terminal") &&
    !options.reason.includes("ops end with fragment form") &&
    !options.reason.includes("stem ends with fragment form")
  ) {
    return false;
  }
  const after = options.start + options.consumed;
  if (after >= options.tokens.length) {
    return false;
  }
  const continuation = skipClauseEvidenceTransparentPunctuationForward(options.tokens, after, options.tokens.length);
  return continuation > after &&
    continuation < options.tokens.length &&
    !isClausePunctuationToken(options.tokens[continuation]);
}

function skipClauseEvidenceTransparentPunctuationForward(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  endExclusive: number
): number {
  let index = start;
  while (index < endExclusive) {
    const token = tokens[index];
    const parenthetical = parentheticalSpanStartingAt(tokens, index, {
      consumers: ["tail_boundary_readiness"]
    });
    if (parenthetical !== null && parenthetical.role !== "explicit_quote_span") {
      index = parenthetical.span.endExclusive;
      continue;
    }
    if (token === undefined || !isClauseEvidenceTransparentPunctuation(token)) {
      break;
    }
    index += 1;
  }
  return index;
}

function contentResultResolvedAssemblerContextOwner(result: ContentResult | null | undefined): boolean {
  if (result === null || result === undefined) {
    return false;
  }
  const set = result.sourceCandidates;
  if (isResolvedCandidateSet(set)) {
    const winner = set.winner.candidate;
    return candidateConditionsHaveAssemblerOwner(winner.conditions) ||
      senseHasAssemblerOwnerFrame(winner.translation);
  }
  const members = candidateSetMembers(set);
  if (members.length === 0) {
    return false;
  }
  return members.every((member) =>
    candidateConditionsHaveAssemblerOwner(member.candidate.conditions) ||
    senseHasAssemblerOwnerFrame(member.candidate.translation)
  );
}

function contentResultIsNonPredicateAssemblerOwner(result: ContentResult | null | undefined): boolean {
  if (result === null || result === undefined) {
    return false;
  }
  if (result.consumed !== 1) {
    return false;
  }
  if (isResolvedContentResult(result)) {
    return isNonPredicateOwnerKoreanPos(result.koreanPos);
  }
  const members = candidateSetMembers(result.sourceCandidates);
  return members.length > 0 &&
    members.every((member) => isNonPredicateOwnerKoreanPos(member.candidate.koreanPos));
}

function outOfDomainPredicateAnchorHasLexicalOwner(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly start: number;
  readonly consumed: number;
  readonly contentResult?: ContentResult | null;
  readonly predicateIntake?: TailChunkIntakeVerdict;
  readonly lookups: LookupTables;
}): boolean {
  const result = options.contentResult;
  if (
    options.predicateIntake !== "out_of_domain" ||
    result === null || result === undefined ||
    options.consumed !== 1 ||
    result.consumed !== 1 ||
    result.renderPlan?.kind !== "lemma" ||
    result.warnings.some((warning) => warning.type === "unsupported_grammar")
  ) {
    return false;
  }
  const token = options.tokens[options.start];
  if (token === undefined) {
    return false;
  }
  const inventory = candidateSetCandidates(result.sourceCandidates);
  const hasProjection = (kind: "direct_adverbial" | "direct_nominal"): boolean =>
    inventory.some((candidate) => candidateProjectionKinds(candidate).includes(kind));
  if (isLexicalAdverb(token)) {
    return hasProjection("direct_adverbial");
  }
  if (isNominalLike(token)) {
    const slotCursor = options.cursor.fork(options.start, options.cursor.end, options.start);
    const auxTokens = collectAuxTokens(slotCursor.fork(options.start + 1, options.cursor.end, options.start + 1));
    return mixedPosSlot(slotCursor, auxTokens, { lookups: options.lookups }) === "noun_particle" &&
      hasProjection("direct_nominal");
  }
  return false;
}

function sourceEvidencedLexicalNonPredicateOwnsSpan(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly start: number;
  readonly consumed: number;
  readonly contentResult?: ContentResult | null;
}): boolean {
  const result = options.contentResult;
  if (
    result === null || result === undefined ||
    result.consumed !== options.consumed ||
    result.entry === null ||
    result.entry.synthetic === true ||
    result.warnings.some((warning) => warning.type === "unsupported_grammar")
  ) {
    return false;
  }
  const plan = result.renderPlan;
  if (
    plan?.kind !== "lemma" ||
    plan.auxTokens.length > 0 ||
    (plan.connective !== undefined && plan.connective !== null) ||
    plan.renyouChuushiRole !== undefined
  ) {
    return false;
  }
  if (!lexicalHeadConsumptionMatchesTerminalSfp(options.start, options.consumed, plan.terminalSfp ?? null)) {
    return false;
  }
  const head = options.tokens[options.start];
  if (head === undefined || !tokenHasNonPredicateLexicalSourceEvidence(head, result.entry)) {
    return false;
  }
  if (isResolvedContentResult(result)) {
    return isLexicalNonPredicateKoreanPos(result.koreanPos);
  }
  const members = candidateSetMembers(result.sourceCandidates);
  return members.length > 0 &&
    members.every((member) => isLexicalNonPredicateKoreanPos(member.candidate.koreanPos));
}

function lexicalHeadConsumptionMatchesTerminalSfp(
  start: number,
  consumed: number,
  terminalSfp: SfpNode | null
): boolean {
  if (consumed === 1) {
    return true;
  }
  if (terminalSfp === null || consumed < 2 || terminalSfp.consumed !== consumed - 1) {
    return false;
  }
  const indices = terminalSfp.source.tokenIndices;
  return indices.length === consumed - 1 &&
    indices.every((tokenIndex, offset) => tokenIndex === start + 1 + offset);
}

function tokenHasNonPredicateLexicalSourceEvidence(
  token: RuntimeHaruToken,
  entry: MorphemeEntry
): boolean {
  if (isConjunctionToken(token)) {
    return true;
  }
  if (isPureNaAdjStem(token)) {
    return !isAuxiliaryStemToken(token);
  }
  if (isVerbPredicateToken(token) && isImperativeInflection(token.pos)) {
    const form = stemFormName(token.pos);
    return entry.surface === morphSurface(token) &&
      typeof entry.conjugationForm === "string" &&
      form !== null &&
      form.startsWith(entry.conjugationForm);
  }
  return false;
}

function isLexicalNonPredicateKoreanPos(koreanPos: number | null | undefined): boolean {
  return isNonPredicateOwnerKoreanPos(koreanPos) || koreanPos === 감탄사 || koreanPos === 접속사;
}

function isNonPredicateOwnerKoreanPos(koreanPos: number | null | undefined): boolean {
  return (
    koreanPos === 명사 ||
    koreanPos === 대명사 ||
    koreanPos === 수사 ||
    koreanPos === 부사 ||
    koreanPos === 관형사 ||
    koreanPos === 연체사
  );
}
