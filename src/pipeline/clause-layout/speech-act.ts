
import {
  hardTerminalPunctuationSurfaceClassForToken,
  isHardTerminalPunctuationToken,
  isNonTerminalClauseBreakPunctuationToken,
  isOpeningPunctuationToken,
  isTrailingPunctuationToken,
  isWeakPunctuationToken,
  type BoundaryToken
} from "../head-tail/boundary/punctuation.js";
import {
  isQuestionParticleKaToken,
  questionContentContinuationAfterKaRelationAt
} from "../head-tail/boundary/marker.js";
import type { BoundaryRelationConsumer } from "../head-tail/boundary/relation.js";
import { matchTeConnectiveHeadAt } from "../head-tail/tail/postverb-tail-classifier.js";
import { quoteMarkerRelationAt } from "../head-tail/boundary/quote-marker.js";
import {
  demoDiscourseConnectiveSpanCovering,
  type DemoDiscourseToken
} from "../demo-discourse.js";
import {
  DETACHED_SEPARATIONS,
  SEPARATION_OPENS_BOUNDARY,
  isTransparentPauseSeparatedFromPreviousToken,
  separatedAs,
  nextNonSpaceIndex,
  previousNonSpaceIndex,
  type ClauseAdjacencyToken
} from "./trivia.js";
import {
  POS0,
  POS01,
  POS4,
  助動詞_ダ,
  助動詞_ナイ,
  助詞_係助詞,
  isAdjectivalRenyouTeFormHostToken,
  感動詞,
  接続詞,
  is助動詞,
  isAdverbCapable,
  isAuxiliarySymbolCategoryToken,
  isClauseClosingInflection,
  isConditionalInflection,
  isConjunctiveParticleToken,
  isIAdjectivePredicateToken,
  isNominalLike,
  isRenyouInflection,
  isTerminalParticleToken,
  isVerbPredicateToken
} from "../../types/pos.js";

export interface UtteranceDirectionToken extends BoundaryToken, ClauseAdjacencyToken {
  readonly pos: number;
}

export interface UtteranceDirectionEvidence {
  readonly standalonePredicate: boolean;
  readonly interjections: readonly string[];
  readonly adverbials: readonly string[];
  readonly insideDirectQuote: boolean;
}

export function collectUtteranceDirectionEvidence(
  tokens: readonly UtteranceDirectionToken[],
  predicateStart: number,
  sets?: UtteranceClosureLookupSets
): UtteranceDirectionEvidence {
  const interjections: string[] = [];
  const adverbials: string[] = [];
  let unitStart = predicateStart;
  for (let index = predicateStart - 1; index >= 0; index -= 1) {
    const token = tokens[index];
    if (token === undefined) break;
    if (isHardTerminalPunctuationToken(token) || isTrailingPunctuationToken(token)) {
      return { standalonePredicate: true, interjections, adverbials, insideDirectQuote: false };
    }
    if (isOpeningPunctuationToken(token)) {
      return { standalonePredicate: true, interjections, adverbials, insideDirectQuote: true };
    }
    if (
      isQuestionParticleKaToken(token) &&
      (
        closesUtteranceForSpeakerDirection(tokens, index + 1) ||
        immediateAcknowledgmentAnchorRepetitionAt(
          tokens,
          index,
          sets?.demoAnaphorAnchors,
          sets?.acknowledgmentCapableKaAt
        )
      )
    ) {
      return { standalonePredicate: true, interjections, adverbials, insideDirectQuote: false };
    }
    const pos0 = token.pos & POS0;
    if (pos0 === 感動詞) {
      interjections.push(token.surface);
      unitStart = index;
      continue;
    }
    if (isAdverbCapable(token) || pos0 === 接続詞) {
      adverbials.push(token.surface);
      unitStart = index;
      continue;
    }
    const lexicalizedConnective = demoDiscourseConnectiveSpanCovering(
      tokens as unknown as readonly DemoDiscourseToken[],
      index
    );
    if (lexicalizedConnective !== null) {
      adverbials.push(
        tokens.slice(lexicalizedConnective.start, lexicalizedConnective.endExclusive)
          .map((atom) => atom.surface)
          .join("")
      );
      unitStart = lexicalizedConnective.start;
      index = lexicalizedConnective.start;
      continue;
    }
    if (isWeakPunctuationToken(token) || isNonArgumentPunctuationToken(token)) {
      unitStart = index;
      continue;
    }
    return {
      standalonePredicate: precedingMaterialLeavesUnit(tokens, unitStart, index, interjections.length),
      interjections,
      adverbials,
      insideDirectQuote: false
    };
  }
  return { standalonePredicate: true, interjections, adverbials, insideDirectQuote: false };
}

function isNonArgumentPunctuationToken(token: UtteranceDirectionToken): boolean {
  return isAuxiliarySymbolCategoryToken(token);
}

function precedingMaterialLeavesUnit(
  tokens: readonly UtteranceDirectionToken[],
  unitStart: number,
  edgeIdx: number,
  interjectionCount: number
): boolean {
  const boundary = tokens[unitStart];
  const transparentPauseBoundary = isTransparentPauseSeparatedFromPreviousToken(tokens, unitStart);
  const weakBoundary = transparentPauseBoundary ||
    separatedAs(tokens, unitStart, SEPARATION_OPENS_BOUNDARY) ||
    isWeakPunctuationToken(boundary);
  if (!weakBoundary) {
    return false;
  }
  if (closesWithClauseFinalPredicate(tokens, edgeIdx)) {
    return true;
  }
  return (interjectionCount > 0 || transparentPauseBoundary) &&
    !isPredicateBoundArgumentEdge(tokens, edgeIdx);
}

export function closesWithClauseFinalPredicate(
  tokens: readonly UtteranceDirectionToken[],
  index: number
): boolean {
  const token = tokens[index];
  if (token === undefined) {
    return false;
  }
  if (isTerminalParticleToken(token)) {
    const previousIdx = previousNonSpaceIndex(tokens, index);
    return previousIdx !== null && closesWithClauseFinalPredicate(tokens, previousIdx);
  }
  const predicative = isVerbPredicateToken(token) ||
    isIAdjectivePredicateToken(token) ||
    is助動詞(token.pos);
  return predicative && isClauseClosingInflection(token.pos);
}

function marksPrecedingClauseBoundary(
  tokens: readonly UtteranceDirectionToken[],
  index: number
): boolean {
  const token = tokens[index];
  if (token === undefined) {
    return false;
  }
  if (closesWithClauseFinalPredicate(tokens, index) || isConjunctiveParticleToken(token)) {
    return true;
  }
  const predicative = isVerbPredicateToken(token) ||
    isIAdjectivePredicateToken(token) ||
    is助動詞(token.pos);
  return predicative && (isRenyouInflection(token.pos) || isConditionalInflection(token.pos));
}

const PHRASE_HOST_LOOKBACK = 3;

function isPredicateBoundArgumentEdge(
  tokens: readonly UtteranceDirectionToken[],
  edgeIdx: number
): boolean {
  const index = interjectionalParticleTransparentIndex(tokens, edgeIdx);
  const token = tokens[index];
  if (token === undefined || isNominalLike(token)) {
    return false;
  }
  if (marksPrecedingClauseBoundary(tokens, index) && !carriesTopicFocusParticle(tokens, index)) {
    return false;
  }
  return hasLexicalPhraseHost(tokens, index);
}

function interjectionalParticleTransparentIndex(
  tokens: readonly UtteranceDirectionToken[],
  index: number
): number {
  let cursor = index;
  for (let depth = 0; depth < 2; depth += 1) {
    const token = tokens[cursor];
    if (
      token === undefined ||
      !isTerminalParticleToken(token) ||
      closesWithClauseFinalPredicate(tokens, cursor)
    ) {
      return cursor;
    }
    const previousIdx = previousNonSpaceIndex(tokens, cursor);
    if (previousIdx === null) {
      return cursor;
    }
    cursor = previousIdx;
  }
  return cursor;
}

function carriesTopicFocusParticle(
  tokens: readonly UtteranceDirectionToken[],
  index: number
): boolean {
  return matchTeConnectiveHeadAt(tokens, index)?.focusParticle !== undefined;
}

function hasLexicalPhraseHost(
  tokens: readonly UtteranceDirectionToken[],
  index: number
): boolean {
  let cursor: number | null = previousNonSpaceIndex(tokens, index);
  for (let depth = 0; cursor !== null && depth < PHRASE_HOST_LOOKBACK; depth += 1) {
    const token = tokens[cursor];
    if (token === undefined) {
      return false;
    }
    if (isNominalLike(token) || isVerbPredicateToken(token) || isIAdjectivePredicateToken(token)) {
      return true;
    }
    if (marksPrecedingClauseBoundary(tokens, cursor)) {
      return false;
    }
    cursor = previousNonSpaceIndex(tokens, cursor);
  }
  return false;
}

export interface SpeakerRealizationLookupSets {
  readonly demoAnaphorAnchors: ReadonlySet<string>;
  readonly receiptInterjections: ReadonlySet<string>;
}

export interface UtteranceClosureLookupSets {
  readonly utteranceBreakDashSurfaces: ReadonlySet<string>;
  readonly closureMarkerIdx?: number;
  readonly demoAnaphorAnchors?: ReadonlySet<string>;
  readonly acknowledgmentCapableKaAt?: (kaIdx: number) => boolean;
}

function anchorForm(token: Pick<UtteranceDirectionToken, "dictionaryForm" | "surface">): string {
  return token.dictionaryForm !== undefined && token.dictionaryForm.length > 0
    ? token.dictionaryForm
    : token.surface;
}

function acknowledgmentRepetitionSuccessorMarkerIdx(
  tokens: readonly UtteranceDirectionToken[],
  markerIdx: number,
  anchors: ReadonlySet<string>,
  acknowledgmentCapableKaAt: ((kaIdx: number) => boolean) | undefined
): number | null {
  const marker = tokens[markerIdx];
  if (marker === undefined || !isQuestionParticleKaToken(marker)) {
    return null;
  }
  if (acknowledgmentCapableKaAt !== undefined && !acknowledgmentCapableKaAt(markerIdx)) {
    return null;
  }
  const hostIdx = previousNonSpaceIndex(tokens, markerIdx);
  const host = hostIdx === null ? undefined : tokens[hostIdx];
  if (host === undefined || !anchors.has(anchorForm(host))) {
    return null;
  }
  const nextHostIdx = nextNonSpaceIndex(tokens, markerIdx + 1);
  const nextHost = nextHostIdx === null ? undefined : tokens[nextHostIdx];
  if (nextHostIdx === null || nextHost === undefined || !anchors.has(anchorForm(nextHost))) {
    return null;
  }
  const nextMarkerIdx = nextNonSpaceIndex(tokens, nextHostIdx + 1);
  const nextMarker = nextMarkerIdx === null ? undefined : tokens[nextMarkerIdx];
  if (nextMarkerIdx === null || nextMarker === undefined || !isQuestionParticleKaToken(nextMarker)) {
    return null;
  }
  return acknowledgmentCapableKaAt === undefined || acknowledgmentCapableKaAt(nextMarkerIdx)
    ? nextMarkerIdx
    : null;
}

export function immediateAcknowledgmentAnchorRepetitionAt(
  tokens: readonly UtteranceDirectionToken[],
  markerIdx: number,
  anchors: ReadonlySet<string> | undefined,
  acknowledgmentCapableKaAt?: (kaIdx: number) => boolean
): boolean {
  if (anchors === undefined || markerIdx < 0) {
    return false;
  }
  let runEndMarkerIdx = acknowledgmentRepetitionSuccessorMarkerIdx(
    tokens,
    markerIdx,
    anchors,
    acknowledgmentCapableKaAt
  );
  if (runEndMarkerIdx === null) {
    return false;
  }
  for (;;) {
    const next = acknowledgmentRepetitionSuccessorMarkerIdx(
      tokens,
      runEndMarkerIdx,
      anchors,
      acknowledgmentCapableKaAt
    );
    if (next === null) {
      break;
    }
    runEndMarkerIdx = next;
  }
  return questionContentContinuationAfterKaRelationAt(tokens, runEndMarkerIdx, {
    consumers: ["embedded_question"],
    limit: tokens.length
  }) === null;
}

export function hasSpeakerRealizationEvidence(
  tokens: readonly UtteranceDirectionToken[],
  predicateStart: number,
  closeIndex: number,
  sets: SpeakerRealizationLookupSets
): boolean {
  if (!closesUtteranceForSpeakerDirection(tokens, closeIndex)) {
    return false;
  }
  const evidence = collectUtteranceDirectionEvidence(tokens, predicateStart);
  if (!evidence.standalonePredicate || evidence.adverbials.length > 0) {
    return false;
  }
  if (!evidence.interjections.every((surface) => sets.receiptInterjections.has(surface))) {
    return false;
  }
  const stem = tokens[predicateStart];
  const anchored = stem !== undefined && sets.demoAnaphorAnchors.has(anchorForm(stem));
  return anchored || evidence.interjections.length > 0;
}

export function closesUtteranceForSpeakerDirection(
  tokens: readonly UtteranceDirectionToken[],
  index: number,
  sets?: UtteranceClosureLookupSets
): boolean {
  if (
    immediateAcknowledgmentAnchorRepetitionAt(
      tokens,
      sets?.closureMarkerIdx ?? (previousNonSpaceIndex(tokens, index) ?? -1),
      sets?.demoAnaphorAnchors,
      sets?.acknowledgmentCapableKaAt
    )
  ) {
    return true;
  }
  const cursor = nextNonSpaceIndex(tokens, index);
  if (cursor === null) return true;
  const closureIdx = adjacentInterjectionTransparentIndex(tokens, cursor);
  const token = closureIdx === null ? undefined : tokens[closureIdx];
  if (closureIdx === null || token === undefined) return true;
  if (terminalPunctuationRunCarriesQuestion(tokens, closureIdx)) return false;
  if (
    detachmentAdmittingClosureMarker(
      tokens,
      sets?.closureMarkerIdx ?? previousNonSpaceIndex(tokens, index)
    ) &&
    (
      separatedAs(tokens, closureIdx, DETACHED_SEPARATIONS) ||
      (
        sets !== undefined &&
        isNonTerminalClauseBreakPunctuationToken(token, sets.utteranceBreakDashSurfaces)
      )
    )
  ) {
    return true;
  }
  return isHardTerminalPunctuationToken(token) ||
    isTrailingPunctuationToken(token) ||
    isWeakPunctuationToken(token);
}

function terminalPunctuationRunCarriesQuestion(
  tokens: readonly UtteranceDirectionToken[],
  index: number
): boolean {
  return terminalPunctuationRunQuestionIndex(tokens, index) !== null;
}

export function terminalPunctuationRunQuestionIndex<T extends UtteranceDirectionToken>(
  tokens: readonly T[],
  index: number,
  consumers: readonly BoundaryRelationConsumer[] = ["clause_layout"]
): number | null {
  let cursor: number | null = index;
  while (cursor !== null) {
    const token = tokens[cursor];
    if (token === undefined || !isHardTerminalPunctuationToken(token)) {
      return null;
    }
    if (hardTerminalPunctuationSurfaceClassForToken(token, cursor, consumers) === "question") {
      return cursor;
    }
    cursor = nextNonSpaceIndex(tokens, cursor + 1);
  }
  return null;
}

function adjacentInterjectionTransparentIndex(
  tokens: readonly UtteranceDirectionToken[],
  index: number
): number | null {
  let cursor: number | null = index;
  while (cursor !== null) {
    const token = tokens[cursor];
    if (token === undefined || (token.pos & POS0) !== 感動詞) {
      return cursor;
    }
    if (separatedAs(tokens, cursor, DETACHED_SEPARATIONS)) {
      return cursor;
    }
    cursor = nextNonSpaceIndex(tokens, cursor + 1);
  }
  return null;
}

export function detachmentAdmittingClosureMarker(
  tokens: readonly UtteranceDirectionToken[],
  markerIdx: number | null
): boolean {
  return markerIdx !== null && isQuestionParticleKaToken(tokens[markerIdx]);
}


export type TeIisashiSignal = "quote_report_host" | "nonvolitional_predicate" | "stative_operator" | "adjectival_host";

export interface TeUtteranceActEvidence {
  readonly kind: "teUtteranceAct";
  readonly connectiveIdx: number;
  readonly predicateIdx: number;
  readonly position: "utterance_final" | "closure_left";
  readonly iisashiSignals: readonly TeIisashiSignal[];
  readonly scope?: "matrix" | "quoted_content";
}

export interface TeUtteranceActLookupSets {
  readonly reportHostVerbs: ReadonlySet<string>;
  readonly nonvolitionalVerbs: ReadonlySet<string>;
  readonly stativeOperatorForms: ReadonlySet<string>;
}

export function teIisashiSignalsAt(
  tokens: readonly UtteranceDirectionToken[],
  anchor: { readonly connectiveIdx: number; readonly predicateIdx: number },
  sets: TeUtteranceActLookupSets
): readonly TeIisashiSignal[] {
  const signals: TeIisashiSignal[] = [];
  const predicate = tokens[anchor.predicateIdx];
  if (predicate === undefined) {
    return signals;
  }
  const prevIdx = previousNonSpaceIndex(tokens, anchor.predicateIdx);
  const hostIdx = previousNonSpaceIndex(tokens, anchor.connectiveIdx);
  if (
    prevIdx !== null &&
    hostIdx === anchor.predicateIdx &&
    sets.reportHostVerbs.has(anchorForm(predicate)) &&
    quoteMarkerRelationAt(tokens, prevIdx, { consumers: ["clause_layout"] }) !== null
  ) {
    signals.push("quote_report_host");
  }
  if (sets.nonvolitionalVerbs.has(anchorForm(predicate))) {
    signals.push("nonvolitional_predicate");
  }
  for (let idx = anchor.predicateIdx + 1; idx < anchor.connectiveIdx; idx += 1) {
    const token = tokens[idx];
    if (token !== undefined && sets.stativeOperatorForms.has(anchorForm(token))) {
      signals.push("stative_operator");
      break;
    }
  }
  const host = hostIdx === null ? undefined : tokens[hostIdx];
  if (host !== undefined && isAdjectivalRenyouTeFormHostToken(host) && !teHostClosesNegativeCopulaBridge(tokens, hostIdx!)) {
    signals.push("adjectival_host");
  }
  return signals;
}

export function teHostClosesNegativeCopulaBridge(tokens: readonly UtteranceDirectionToken[], hostIdx: number): boolean {
  const host = tokens[hostIdx];
  if (host === undefined || !(host.dictionaryForm === "ない" || host.dictionaryForm === "無い" || (host.pos & POS4) === 助動詞_ナイ)) {
    return false;
  }
  const prevIdx = previousNonSpaceIndex(tokens, hostIdx);
  const prev = prevIdx === null ? undefined : tokens[prevIdx];
  if (prev === undefined) {
    return false;
  }
  if ((prev.pos & POS4) === 助動詞_ダ || prev.surface === "じゃ") {
    return true;
  }
  if ((prev.pos & POS01) === 助詞_係助詞 && (prev.surface === "は" || prev.surface === "も")) {
    const beforeIdx = previousNonSpaceIndex(tokens, prevIdx!);
    const before = beforeIdx === null ? undefined : tokens[beforeIdx];
    return before !== undefined && ((before.pos & POS4) === 助動詞_ダ || before.surface === "で");
  }
  return false;
}

