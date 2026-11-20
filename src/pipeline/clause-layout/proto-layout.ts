import type { LexicalAdverbialAffiliation } from "./lexical-adverbial-affiliation.js";
import type { NegativeCopulaCorrectionEvidence } from "./negative-copula-correction.js";
import type { ChuushiClosureEvidence } from "./chuushi-closure.js";
import type { PauseJunctureEvidence, RenyouJunctureEvidence, WhitespaceJunctureEvidence } from "./juncture-verdict.js";
import type { TeUtteranceActEvidence } from "./speech-act.js";
import type { VolitionalIntentBindingEvidence } from "./volitional-intent-binding.js";
import type { LookupTables } from "../lookup-tables.js";
import type { ClauseTerminalPunctuationRunEvidence, CopulaPauseBridgeEvidence } from "./punctuation.js";
import { balancedDelimiterSpanEndingAtIn, balancedDelimiterSpanOpeningAtIn, enclosingBalancedSpanIn, type BalancedDelimiterSpan } from "./balanced-delimiter.js";
import { utteranceClosureAfter, type UtteranceClosureEvidence, type UtteranceClosureRunEvidence, type UtteranceClosureToken } from "./utterance-closure.js";
import { isPredicateArgumentParticle } from "../head-tail/candidate/semantic-classifiers.js";
import type { HostlessInterjectionEvidence } from "./hostless-interjection.js";
import type { BoundaryKind, ClauseKind, ClauseToken, LexicalNominalHeadClaims, ClauseBoundaryEvent, DemoDiscourseLeftBoundaryEvidenceKind, DemoDiscourseLeftBoundaryEvidence, HardTerminalEllipsisRunEvidence, AnaphoricConjectureSelfQuestionEvidence, TailReachEvidence } from "./layout-types.js";
import { clauseCarriesInterrogativeForm, boundaryEventsInRangeOf, firstBoundaryEventInRangeOf, findPrecedingPredicateEvidenceIndex, findFollowingPredicateEvidenceIndex, extraClausalRun, utteranceRangeOfTokenIn, type ClauseProjectionEvidenceWindow, clauseProjectionEvidenceWindowForToken } from "./navigation.js";
import { isClausePredicateEvidenceToken } from "./token-evidence.js";
import type { BareKeijoujiAttributiveEvidence } from "./nominal-anchor-evidence.js";
import { indicesInRange, lastNonSpaceIndex } from "./trivia.js";
import type { DetachedUtteranceOnsetEvidence } from "./utterance-boundaries.js";
import { isBoundaryPunct, isTrailingPunct } from "./punctuation.js";

export class ProtoClause {
  constructor(
    readonly start: number,
    readonly end: number,
    readonly kind: ClauseKind,
    readonly terminatedBy: BoundaryKind | null,
    readonly particleIndices: readonly number[],
    readonly parentIdx: number | null
  ) { }
}

export class ProtoClauseLayout {
  constructor(
    readonly tokens: readonly ClauseToken[],
    readonly protoClauses: readonly ProtoClause[],
    readonly quoteSpans: readonly (readonly [number, number])[],
    readonly clauseOfTokenIndex: readonly number[],
    readonly demoDiscourseLeftBoundaries: readonly DemoDiscourseLeftBoundaryEvidence[] = [],
    readonly hardTerminalEllipsisRuns: readonly HardTerminalEllipsisRunEvidence[] = [],
    readonly anaphoricConjectureSelfQuestions: readonly AnaphoricConjectureSelfQuestionEvidence[] = [],
    readonly terminalPunctuationRuns: readonly ClauseTerminalPunctuationRunEvidence[] = [],
    readonly bareKeijoujiAttributiveHeads: ReadonlyMap<number, BareKeijoujiAttributiveEvidence> =
      new Map<number, BareKeijoujiAttributiveEvidence>(),
    readonly renyouCompoundPrenominalHeads: ReadonlySet<number> = new Set<number>(),
    readonly decorativeTerminalClosures: ReadonlySet<number> = new Set<number>(),
    readonly detachedTerminalNodaClosures: ReadonlySet<number> = new Set<number>(),
    readonly utteranceClosureRuns: ReadonlyMap<number, UtteranceClosureRunEvidence> =
      new Map<number, UtteranceClosureRunEvidence>(),
    readonly punctuationBreakIndices: ReadonlySet<number> = new Set<number>(),
    readonly copulaPauseBridges: readonly CopulaPauseBridgeEvidence[] = [],
    readonly balancedDelimiterSpans: readonly BalancedDelimiterSpan[] = [],
    readonly negativeCopulaCorrections: ReadonlyMap<number, NegativeCopulaCorrectionEvidence> =
      new Map<number, NegativeCopulaCorrectionEvidence>(),
    readonly detachedUtteranceOnsetBoundaries: ReadonlyMap<number, DetachedUtteranceOnsetEvidence> =
      new Map<number, DetachedUtteranceOnsetEvidence>(),
    readonly unmarkedMainClauseBoundaries: ReadonlySet<number> = new Set<number>(),
    readonly quoteAttributiveCarrierHeads: ReadonlyMap<number, number> = new Map<number, number>(),
    readonly chuushiClosures: ReadonlyMap<number, ChuushiClosureEvidence> = new Map<number, ChuushiClosureEvidence>(),
    readonly teUtteranceActs: ReadonlyMap<number, TeUtteranceActEvidence> = new Map<number, TeUtteranceActEvidence>(),
    readonly renyouJunctures: ReadonlyMap<number, RenyouJunctureEvidence> = new Map<number, RenyouJunctureEvidence>(),
    readonly whitespaceJunctures: ReadonlyMap<number, WhitespaceJunctureEvidence> = new Map<number, WhitespaceJunctureEvidence>(),
    readonly pauseJunctures: ReadonlyMap<number, PauseJunctureEvidence> = new Map<number, PauseJunctureEvidence>(),
    readonly lexicalAdverbialAffiliations: ReadonlyMap<number, LexicalAdverbialAffiliation> = new Map<number, LexicalAdverbialAffiliation>(),
    readonly hostlessInterjections: ReadonlyMap<number, HostlessInterjectionEvidence> = new Map<number, HostlessInterjectionEvidence>(),
    readonly lexicalNominalHeadClaims: LexicalNominalHeadClaims | null = null,
    readonly volitionalIntentBindings: ReadonlyMap<number, VolitionalIntentBindingEvidence> = new Map<number, VolitionalIntentBindingEvidence>(),
    readonly embeddedTokenSpace: boolean = false,
    readonly boundaryEvents: ReadonlyMap<number, ClauseBoundaryEvent> = new Map<number, ClauseBoundaryEvent>(),
  ) { }

  boundaryEventAt(splitAt: number): ClauseBoundaryEvent | undefined {
    return this.boundaryEvents.get(splitAt);
  }

  boundaryEventsInRange(start: number, endExclusive: number): readonly ClauseBoundaryEvent[] {
    return boundaryEventsInRangeOf(this.boundaryEvents, start, endExclusive);
  }

  firstBoundaryEventInRange(start: number, endExclusive: number): ClauseBoundaryEvent | undefined {
    return firstBoundaryEventInRangeOf(this.boundaryEvents, start, endExclusive);
  }

  volitionalIntentBindingAt(markerIdx: number): VolitionalIntentBindingEvidence | undefined {
    return this.volitionalIntentBindings.get(markerIdx);
  }

  adnominalNoRelationSlotAccepts(headIdx: number, hostIdx: number): boolean {
    return this.lexicalNominalHeadClaims?.adnominalNoRelationSlotAccepts(headIdx, hostIdx) === true;
  }

  adnominalHeadBearerSlotAccepts(hostIdx: number, headIdx: number): boolean {
    return this.lexicalNominalHeadClaims?.adnominalHeadBearerSlotAccepts(hostIdx, headIdx) === true;
  }

  hostlessInterjectionAt(markerIdx: number): HostlessInterjectionEvidence | undefined {
    return this.hostlessInterjections.get(markerIdx);
  }

  lexicalAdverbialAffiliationAt(particleIdx: number): LexicalAdverbialAffiliation | undefined {
    return this.lexicalAdverbialAffiliations.get(particleIdx);
  }

  renyouJunctureAt(splitAt: number): RenyouJunctureEvidence | undefined {
    return this.renyouJunctures.get(splitAt);
  }

  whitespaceJunctureAt(gapIdx: number): WhitespaceJunctureEvidence | undefined {
    return this.whitespaceJunctures.get(gapIdx);
  }

  pauseJunctureAt(gapIdx: number): PauseJunctureEvidence | undefined {
    return this.pauseJunctures.get(gapIdx);
  }

  chuushiClosureAt(splitAt: number): ChuushiClosureEvidence | undefined {
    return this.chuushiClosures.get(splitAt);
  }

  teUtteranceActAt(connectiveIdx: number): TeUtteranceActEvidence | undefined {
    return this.teUtteranceActs.get(connectiveIdx);
  }

  unmarkedMainClauseBoundaryAt(splitAt: number): boolean {
    return this.unmarkedMainClauseBoundaries.has(splitAt);
  }

  decorativeTerminalClosureAt(tokenIdx: number): boolean {
    return this.decorativeTerminalClosures.has(tokenIdx);
  }

  detachedUtteranceOnsetEdgeAt(index: number): number | undefined {
    return this.detachedUtteranceOnsetBoundaries.get(index)?.edgeIdx;
  }

  copulaPauseBridgeAt(copulaStart: number): CopulaPauseBridgeEvidence | undefined {
    return this.copulaPauseBridges.find((evidence) => evidence.copulaStart === copulaStart);
  }

  negativeCopulaCorrectionAt(splitAt: number): NegativeCopulaCorrectionEvidence | undefined {
    return this.negativeCopulaCorrections.get(splitAt);
  }

  enclosingBalancedSpan(tokenIdx: number): BalancedDelimiterSpan | undefined {
    return enclosingBalancedSpanIn(this.balancedDelimiterSpans, tokenIdx);
  }

  balancedDelimiterSpanEndingAt(closingIdx: number): BalancedDelimiterSpan | undefined {
    return balancedDelimiterSpanEndingAtIn(this.balancedDelimiterSpans, closingIdx);
  }

  balancedDelimiterSpanOpeningAt(openingIdx: number): BalancedDelimiterSpan | undefined {
    return balancedDelimiterSpanOpeningAtIn(this.balancedDelimiterSpans, openingIdx);
  }

  tailReachInClause(tokenIdx: number): number {
    return this.tailReachEvidenceInClause(tokenIdx).endExclusive;
  }

  tailReachEvidenceInClause(tokenIdx: number): TailReachEvidence {
    const clause = this.clauseOfToken(tokenIdx);
    if (clause === undefined) {
      return { endExclusive: tokenIdx, clampedBy: "clause_end" };
    }
    let brk: number | null = null;
    for (const index of this.punctuationBreakIndices) {
      if (index >= tokenIdx && index < clause.end && (brk === null || index < brk)) {
        brk = index;
      }
    }
    const span = this.enclosingBalancedSpan(tokenIdx);
    if (span !== undefined && span.contentEndExclusive <= Math.min(brk ?? clause.end, clause.end)) {
      return { endExclusive: span.contentEndExclusive, clampedBy: "balanced_span" };
    }
    if (brk !== null && brk <= clause.end) {
      return {
        endExclusive: brk,
        clampedBy: this.terminalPunctuationRunContaining(brk) === undefined
          ? "clause_pause"
          : "utterance_close"
      };
    }
    return { endExclusive: clause.end, clampedBy: "clause_end" };
  }

  isBareKeijoujiAttributiveHead(tokenIdx: number): boolean {
    return this.bareKeijoujiAttributiveHeads.has(tokenIdx);
  }

  bareKeijoujiAttributiveEvidenceAt(tokenIdx: number): BareKeijoujiAttributiveEvidence | undefined {
    return this.bareKeijoujiAttributiveHeads.get(tokenIdx);
  }

  quoteAttributiveCarrierHeadOfMarker(markerIdx: number): number | undefined {
    return this.quoteAttributiveCarrierHeads.get(markerIdx);
  }

  isRenyouCompoundPrenominalHead(tokenIdx: number): boolean {
    return this.renyouCompoundPrenominalHeads.has(tokenIdx);
  }

  closesClauseAtDetachedTerminalNoda(splitAt: number): boolean {
    return this.detachedTerminalNodaClosures.has(splitAt);
  }

  utteranceClosureRunAt(endIdx: number): UtteranceClosureRunEvidence | undefined {
    return this.utteranceClosureRuns.get(endIdx);
  }

  clauseCarriesInterrogativeFormAt(
    tokens: readonly ClauseToken[],
    hostIdx: number,
    lookups: LookupTables
  ): boolean {
    return clauseCarriesInterrogativeForm(tokens, this, hostIdx, lookups);
  }

  closesUtteranceBefore(endIdx: number): boolean {
    const evidence = this.utteranceClosureRuns.get(endIdx);
    return evidence !== undefined && evidence.run !== "formal_noun_dependent";
  }

  closesUtteranceBeforeGivenFormalNounHead(endIdx: number): boolean {
    return this.utteranceClosureRuns.get(endIdx)?.run === "formal_noun_dependent";
  }

  demoDiscourseLeftBoundaryAt(connectiveIdx: number): DemoDiscourseLeftBoundaryEvidence | undefined {
    return this.demoDiscourseLeftBoundaries.find((evidence) => evidence.connectiveIdx === connectiveIdx);
  }

  demoDiscourseLeftBoundaryKindAt(
    connectiveIdx: number,
    boundaryKind: DemoDiscourseLeftBoundaryEvidenceKind
  ): boolean {
    return this.demoDiscourseLeftBoundaries.some((evidence) =>
      evidence.connectiveIdx === connectiveIdx && evidence.boundaryKind === boundaryKind);
  }

  anaphoricConjectureSelfQuestionAt(markerIdx: number): AnaphoricConjectureSelfQuestionEvidence | undefined {
    return this.anaphoricConjectureSelfQuestions.find((evidence) => evidence.markerIdx === markerIdx);
  }

  terminalPunctuationRunAfter(contentEndIdx: number): ClauseTerminalPunctuationRunEvidence | undefined {
    return this.terminalPunctuationRuns.find((evidence) => evidence.contentEndIdx === contentEndIdx);
  }

  terminalPunctuationRunContaining(tokenIdx: number): ClauseTerminalPunctuationRunEvidence | undefined {
    return this.terminalPunctuationRuns.find((evidence) => evidence.tokenIndices.includes(tokenIdx));
  }

  utteranceClosureAfter<T extends UtteranceClosureToken>(
    tokens: readonly T[],
    afterIdx: number
  ): UtteranceClosureEvidence {
    return utteranceClosureAfter(this, tokens, afterIdx);
  }

  utteranceRangeOfToken(tokenIdx: number): { readonly start: number; readonly endExclusive: number } {
    return utteranceRangeOfTokenIn(this.clauseOfTokenIndex.length, this.terminalPunctuationRuns, tokenIdx);
  }

  clauseContaining(tokenIdx: number): ProtoClause | undefined {
    const index = this.clauseOfTokenIndex[tokenIdx];
    return index === undefined ? undefined : this.protoClauses[index];
  }

  clauseIndexOfToken(tokenIdx: number): number {
    return this.clauseOfTokenIndex[tokenIdx] ?? -1;
  }

  clauseOfToken(tokenIdx: number): ProtoClause | undefined {
    return this.clauseContaining(tokenIdx);
  }

  followingPredicateEvidenceIndexAfter(
    tokens: readonly ClauseToken[],
    tokenIdx: number,
    options: {
      readonly limit?: number;
      readonly includeAuxiliary?: boolean;
    } = {}
  ): number | null {
    return findFollowingPredicateEvidenceIndex(this, tokens, tokenIdx, options, (token) =>
      isClausePredicateEvidenceToken(token, { includeAuxiliary: options.includeAuxiliary ?? true })
    );
  }

  postposedModifiedPredicateIndexBefore(
    tokens: readonly ClauseToken[],
    tokenIdx: number,
    options: {
      readonly limit?: number;
      readonly includeAuxiliary?: boolean;
    } = {}
  ): number | null {
    return findPrecedingPredicateEvidenceIndex(this, tokens, tokenIdx, options, (token) =>
      isClausePredicateEvidenceToken(token, { includeAuxiliary: options.includeAuxiliary ?? true })
    );
  }

  clauseTokensBeforeAreExtraClausal(tokens: readonly ClauseToken[], tokenIdx: number): boolean {
    const clause = this.clauseOfToken(tokenIdx);
    if (clause === undefined) {
      return false;
    }
    return extraClausalRun(tokens, clause.start, tokenIdx);
  }

  utteranceTokensBeforeAreExtraClausal(tokens: readonly ClauseToken[], tokenIdx: number): boolean {
    const utteranceStart = this.utteranceRangeOfToken(tokenIdx).start;
    if (this.embeddedTokenSpace && utteranceStart === 0) {
      return false;
    }
    return extraClausalRun(tokens, utteranceStart, tokenIdx);
  }

  projectionEvidenceWindowForToken(
    tokens: readonly ClauseToken[],
    tokenIdx: number
  ): ClauseProjectionEvidenceWindow | undefined {
    return clauseProjectionEvidenceWindowForToken(this, tokens, tokenIdx);
  }

  connectiveConsequentReachEnd(
    tokens: readonly ClauseToken[],
    tokenIdx: number
  ): number | undefined {
    const window = this.projectionEvidenceWindowForToken(tokens, tokenIdx);
    if (window === undefined) {
      return undefined;
    }
    const span = this.enclosingBalancedSpan(tokenIdx);
    return span === undefined ? window.end : Math.min(window.end, span.contentEndExclusive);
  }

  enclosingQuoteSpan(tokenIdx: number): readonly [number, number] | undefined {
    let best: readonly [number, number] | undefined;
    for (const span of this.quoteSpans) {
      const [start, end] = span;
      if (start < tokenIdx && tokenIdx < end && (best === undefined || end - start < best[1] - best[0])) {
        best = span;
      }
    }
    return best;
  }

  isQuoteTrapped(particleIdx: number, predicateIdx: number): boolean {
    const span = this.enclosingQuoteSpan(particleIdx);
    if (span === undefined) {
      return false;
    }
    return !(span[0] <= predicateIdx && predicateIdx <= span[1]);
  }
}

export function protoLayoutFromBoundaryEvents(
  tokens: readonly ClauseToken[],
  events: readonly ClauseBoundaryEvent[],
  quoteSpans: readonly (readonly [number, number])[],
  evidence: {
    readonly demoDiscourseLeftBoundaries?: readonly DemoDiscourseLeftBoundaryEvidence[];
    readonly hardTerminalEllipsisRuns?: readonly HardTerminalEllipsisRunEvidence[];
    readonly anaphoricConjectureSelfQuestions?: readonly AnaphoricConjectureSelfQuestionEvidence[];
    readonly terminalPunctuationRuns?: readonly ClauseTerminalPunctuationRunEvidence[];
    readonly bareKeijoujiAttributiveHeads?: ReadonlyMap<number, BareKeijoujiAttributiveEvidence>;
    readonly renyouCompoundPrenominalHeads?: ReadonlySet<number>;
    readonly quoteAttributiveCarrierHeads?: ReadonlyMap<number, number>;
    readonly decorativeTerminalClosures?: ReadonlySet<number>;
    readonly detachedTerminalNodaClosures?: ReadonlySet<number>;
    readonly utteranceClosureRuns?: ReadonlyMap<number, UtteranceClosureRunEvidence>;
    readonly punctuationBreakIndices?: ReadonlySet<number>;
    readonly copulaPauseBridges?: readonly CopulaPauseBridgeEvidence[];
    readonly balancedDelimiterSpans?: readonly BalancedDelimiterSpan[];
    readonly negativeCopulaCorrections?: ReadonlyMap<number, NegativeCopulaCorrectionEvidence>;
    readonly detachedUtteranceOnsetBoundaries?: ReadonlyMap<number, DetachedUtteranceOnsetEvidence>;
    readonly chuushiClosures?: ReadonlyMap<number, ChuushiClosureEvidence>;
    readonly teUtteranceActs?: ReadonlyMap<number, TeUtteranceActEvidence>;
    readonly renyouJunctures?: ReadonlyMap<number, RenyouJunctureEvidence>;
    readonly whitespaceJunctures?: ReadonlyMap<number, WhitespaceJunctureEvidence>;
    readonly pauseJunctures?: ReadonlyMap<number, PauseJunctureEvidence>;
    readonly lexicalAdverbialAffiliations?: ReadonlyMap<number, LexicalAdverbialAffiliation>;
    readonly hostlessInterjections?: ReadonlyMap<number, HostlessInterjectionEvidence>;
    readonly lexicalNominalHeadClaims?: LexicalNominalHeadClaims;
    readonly volitionalIntentBindings?: ReadonlyMap<number, VolitionalIntentBindingEvidence>;
    readonly embeddedTokenSpace?: boolean;
  } = {},
): ProtoClauseLayout {
  const n = tokens.length;
  const starts = [0, ...events.map((event) => event.splitAt)];
  const ends = [...events.map((event) => event.splitAt), n];
  if (!starts.every((start, index) => start < (ends[index] ?? n))) {
    throw new Error("empty clause detected (dedup invariant broken)");
  }
  const eventByEnd = new Map(events.map((event) => [event.splitAt, event.kind] as const));
  const boundaryEvents = new Map(events.map((event) => [event.splitAt, event] as const));

  const clauses = starts.map((start, index) => {
    const end = ends[index] ?? n;
    let terminatedBy = eventByEnd.get(end) ?? null;
    const last = lastNonSpaceIndex(tokens, start, end);
    if (terminatedBy === null && last !== null && (isBoundaryPunct(tokens[last]!) || isTrailingPunct(tokens[last]!))) {
      terminatedBy = "punctuation";
    }
    const kind: ClauseKind = terminatedBy === "attributive" ? "relative" : terminatedBy === "connective" ? "subordinate" : "main";
    const parentIdx = kind === "relative" && index + 1 < starts.length ? index + 1 : null;
    const particles = indicesInRange(start, end).filter((idx) => isPredicateArgumentParticle(tokens[idx]!));
    return new ProtoClause(start, end, kind, terminatedBy, particles, parentIdx);
  });

  const clauseOfToken = Array.from({ length: n }, () => 0);
  clauses.forEach((clause, clauseIndex) => {
    for (let index = clause.start; index < clause.end; index += 1) {
      clauseOfToken[index] = clauseIndex;
    }
  });
  const unmarkedMainClauseBoundaries = new Set<number>();
  for (const clause of clauses) {
    if (clause.kind !== "main" || clause.terminatedBy !== "punctuation" || clause.end >= n) {
      continue;
    }
    const last = lastNonSpaceIndex(tokens, clause.start, clause.end);
    const lastToken = last === null ? undefined : tokens[last];
    if (lastToken !== undefined && !isBoundaryPunct(lastToken) && !isTrailingPunct(lastToken)) {
      unmarkedMainClauseBoundaries.add(clause.end);
    }
  }
  return new ProtoClauseLayout(
    tokens,
    clauses,
    quoteSpans,
    clauseOfToken,
    evidence.demoDiscourseLeftBoundaries ?? [],
    evidence.hardTerminalEllipsisRuns ?? [],
    evidence.anaphoricConjectureSelfQuestions ?? [],
    evidence.terminalPunctuationRuns ?? [],
    evidence.bareKeijoujiAttributiveHeads ?? new Map<number, BareKeijoujiAttributiveEvidence>(),
    evidence.renyouCompoundPrenominalHeads ?? new Set<number>(),
    evidence.decorativeTerminalClosures ?? new Set<number>(),
    evidence.detachedTerminalNodaClosures ?? new Set<number>(),
    evidence.utteranceClosureRuns ?? new Map<number, UtteranceClosureRunEvidence>(),
    evidence.punctuationBreakIndices ?? new Set<number>(),
    evidence.copulaPauseBridges ?? [],
    evidence.balancedDelimiterSpans ?? [],
    evidence.negativeCopulaCorrections ?? new Map<number, NegativeCopulaCorrectionEvidence>(),
    evidence.detachedUtteranceOnsetBoundaries ?? new Map<number, DetachedUtteranceOnsetEvidence>(),
    unmarkedMainClauseBoundaries,
    evidence.quoteAttributiveCarrierHeads ?? new Map<number, number>(),
    evidence.chuushiClosures ?? new Map<number, ChuushiClosureEvidence>(),
    evidence.teUtteranceActs ?? new Map<number, TeUtteranceActEvidence>(),
    evidence.renyouJunctures ?? new Map<number, RenyouJunctureEvidence>(),
    evidence.whitespaceJunctures ?? new Map<number, WhitespaceJunctureEvidence>(),
    evidence.pauseJunctures ?? new Map<number, PauseJunctureEvidence>(),
    evidence.lexicalAdverbialAffiliations ?? new Map<number, LexicalAdverbialAffiliation>(),
    evidence.hostlessInterjections ?? new Map<number, HostlessInterjectionEvidence>(),
    evidence.lexicalNominalHeadClaims ?? null,
    evidence.volitionalIntentBindings ?? new Map<number, VolitionalIntentBindingEvidence>(),
    evidence.embeddedTokenSpace === true,
    boundaryEvents,
  );
}
