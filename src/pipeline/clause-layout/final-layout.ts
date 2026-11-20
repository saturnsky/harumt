import type { QuoteStructuralRelation } from "../structural-relation/quote-payload.js";
import type { LexicalAdverbialAffiliation } from "./lexical-adverbial-affiliation.js";
import { useActiveProtoLayout } from "./proto-state.js";
import { quoteMarkerRelationAt } from "../head-tail/boundary/quote-marker.js";
import type { NegativeCopulaCorrectionEvidence } from "./negative-copula-correction.js";
import type { ChuushiClosureEvidence } from "./chuushi-closure.js";
import type { PauseJunctureEvidence, RenyouJunctureEvidence, WhitespaceJunctureEvidence } from "./juncture-verdict.js";
import type { TeUtteranceActEvidence } from "./speech-act.js";
import type { LookupTables } from "../lookup-tables.js";
import type { ClauseTerminalPunctuationRunEvidence, CopulaPauseBridgeEvidence } from "./punctuation.js";
import { previousNonSpaceIndex } from "./trivia.js";
import { balancedDelimiterSpanEndingAtIn, balancedDelimiterSpanOpeningAtIn, enclosingBalancedSpanIn, type BalancedDelimiterSpan } from "./balanced-delimiter.js";
import { utteranceClosureAfter, type UtteranceClosureEvidence, type UtteranceClosureRunEvidence, type UtteranceClosureToken } from "./utterance-closure.js";
import { POS0, isTerminalParticleToken, pos0in, 助動詞, INFLECTABLE_BITS } from "../../types/pos.js";
import { buildProtoLayout } from "./index.js";
import type { BoundaryKind, AttributiveStemProjection, ClauseKind, PredicateSpeechActScope, ClauseToken, ClauseNominalClosureAnchor, PredicateArgumentRoleAssignment, ClauseBoundaryEvent, TailReachEvidence } from "./layout-types.js";
import { boundaryEventsInRangeOf, firstBoundaryEventInRangeOf, findFollowingPredicateEvidenceIndex, utteranceRangeOfTokenIn } from "./navigation.js";
import { leadingConnectiveIndexForRange, leadingQuoteMarkerIndexForRange } from "./nominal-anchor-evidence.js";
import { isBoundaryPunct, isTrailingPunct } from "./punctuation.js";
import { type QuoteSpanInfo, classifyQuoteSpans, spanKeySet, sameSpan } from "./quote-classification.js";
import type { ProtoClauseLayout } from "./proto-layout.js";
import { nominalClosureAnchorForProtoClause, leadingNominalAnchorForProtoClause } from "./nominal-anchors.js";
import { initialConnectiveRoles, predicateArgumentRolesForClause, predicateLikeHasPredicateQuoteCarrier, compoundPredicatePairsForClauses, quoteStructuralRelationsForLayout, QuoteArgumentCandidacyVerdict, quoteHostPrefixParticlesByPredicate, benefactiveRecipientTopicParticlesByPredicate, consumedLexicalParticleIndices, isAdverbialKeijoujiPredicateLike, adverbialAdjunctsByPredicate } from "./predicate-ownership.js";
import { type PredicateLike, sourceContextMayBePredicateAt } from "./predicate-shape.js";
import { adjectiveAdverbialModifierLookupOptions, rentaiDegreeAdverbialModifiedPredicate } from "./adverbial-predicate.js";

export class Clause {
  constructor(
    readonly start: number,
    readonly end: number,
    readonly predicates: readonly number[],
    readonly particleIndices: readonly number[],
    readonly particlesByPredicate: readonly (readonly [number, readonly number[]])[],
    readonly parentIdx: number | null,
    readonly kind: ClauseKind,
    readonly terminatedBy: BoundaryKind | null,
    readonly nominalClosureAnchor: ClauseNominalClosureAnchor | null = null,
    readonly leadingNominalAnchor: ClauseNominalClosureAnchor | null = null,
    readonly leadingConnectiveIdx: number | null = null,
    readonly leadingQuoteMarkerIdx: number | null = null,
    readonly argumentRolesByPredicate: readonly (readonly [number, readonly PredicateArgumentRoleAssignment[]])[] = [],
    readonly attributiveHeadBlockedPredicates: readonly number[] = [],
    readonly punctuationBreaks: readonly number[] = [],
    readonly attributiveStemProjection: AttributiveStemProjection | null = null,
  ) { }

  get primaryPredicate(): number | null {
    return this.predicates[0] ?? null;
  }

  particlesOf(predicateIdx: number): readonly number[] {
    return this.particlesByPredicate.find(([idx]) => idx === predicateIdx)?.[1] ?? [];
  }

  argumentRolesOf(predicateIdx: number): readonly PredicateArgumentRoleAssignment[] {
    return this.argumentRolesByPredicate.find(([idx]) => idx === predicateIdx)?.[1] ?? [];
  }

  canBindAttributiveHead(predicateIdx: number): boolean {
    return !this.attributiveHeadBlockedPredicates.includes(predicateIdx);
  }
}

export class ClauseLayout {
  readonly clauseOfPredicateIndex = new Map<number, number>();
  readonly predicateOfParticle = new Map<number, number>();
  private readonly selectedFrameThemeTopicParticlesByPredicate = new Map<number, Set<number>>();
  private readonly quoteHostPrefixParticleOwner = new Map<number, number>();
  private readonly benefactiveRecipientTopicParticleOwner = new Map<number, number>();
  private readonly quoteHostPrefixByPredicate = new Map<number, readonly number[]>();
  private readonly adverbialAdjunctOwner = new Map<number, number>();
  private readonly adverbialAdjunctsByPredicateMap = new Map<number, readonly number[]>();

  constructor(
    readonly clauses: readonly Clause[],
    readonly clauseOfTokenIndex: readonly number[],
    readonly quoteSpans: readonly (readonly [number, number])[] = [],
    readonly quoteSpanInfos: readonly QuoteSpanInfo[] = [],
    readonly quoteHostPrefixParticles: readonly (readonly [number, readonly number[]])[] = [],
    readonly benefactiveRecipientTopicParticles: readonly (readonly [number, readonly number[]])[] = [],
    readonly connectiveRoles = new Map<number, string>(),
    readonly compoundPredicatePairs: ReadonlyMap<number, number> = new Map(),
    readonly adverbialAdjunctsByPredicate: readonly (readonly [number, readonly number[]])[] = [],
    readonly terminalPunctuationRuns: readonly ClauseTerminalPunctuationRunEvidence[] = [],
    private readonly speechActScopesByPredicate: readonly (readonly [number, PredicateSpeechActScope])[] = [],
    readonly copulaPauseBridges: readonly CopulaPauseBridgeEvidence[] = [],
    readonly balancedDelimiterSpans: readonly BalancedDelimiterSpan[] = [],
    private readonly quoteHostByQuotedPredicate: readonly (readonly [number, number])[] = [],
    readonly utteranceClosureRuns: ReadonlyMap<number, UtteranceClosureRunEvidence> =
      new Map<number, UtteranceClosureRunEvidence>(),
    readonly negativeCopulaCorrections: ReadonlyMap<number, NegativeCopulaCorrectionEvidence> =
      new Map<number, NegativeCopulaCorrectionEvidence>(),
    readonly unmarkedMainClauseBoundaries: ReadonlySet<number> = new Set<number>(),
    readonly decorativeTerminalClosures: ReadonlySet<number> = new Set<number>(),
    private readonly quoteHostByMarker: readonly (readonly [number, number])[] = [],
    private readonly quoteAttributiveCarrierHeads: ReadonlyMap<number, number> = new Map<number, number>(),
    readonly chuushiClosures: ReadonlyMap<number, ChuushiClosureEvidence> = new Map<number, ChuushiClosureEvidence>(),
    readonly teUtteranceActs: ReadonlyMap<number, TeUtteranceActEvidence> = new Map<number, TeUtteranceActEvidence>(),
    readonly renyouJunctures: ReadonlyMap<number, RenyouJunctureEvidence> = new Map<number, RenyouJunctureEvidence>(),
    readonly whitespaceJunctures: ReadonlyMap<number, WhitespaceJunctureEvidence> = new Map<number, WhitespaceJunctureEvidence>(),
    readonly pauseJunctures: ReadonlyMap<number, PauseJunctureEvidence> = new Map<number, PauseJunctureEvidence>(),
    readonly lexicalAdverbialAffiliations: ReadonlyMap<number, LexicalAdverbialAffiliation> = new Map<number, LexicalAdverbialAffiliation>(),
    private readonly quoteRelations: readonly QuoteStructuralRelation[] = [],
    readonly boundaryEvents: ReadonlyMap<number, ClauseBoundaryEvent> = new Map<number, ClauseBoundaryEvent>()
  ) {
    for (const [clauseIndex, clause] of clauses.entries()) {
      for (const predicate of clause.predicates) {
        this.clauseOfPredicateIndex.set(predicate, clauseIndex);
      }
      for (const [predicate, particles] of clause.particlesByPredicate) {
        for (const particle of particles) {
          this.predicateOfParticle.set(particle, predicate);
        }
      }
    }
    for (const [predicate, particles] of quoteHostPrefixParticles) {
      this.quoteHostPrefixByPredicate.set(predicate, particles);
      for (const particle of particles) {
        this.quoteHostPrefixParticleOwner.set(particle, predicate);
      }
    }
    for (const [predicate, particles] of benefactiveRecipientTopicParticles) {
      for (const particle of particles) {
        this.benefactiveRecipientTopicParticleOwner.set(particle, predicate);
      }
    }
    for (const [predicate, adjuncts] of adverbialAdjunctsByPredicate) {
      this.adverbialAdjunctsByPredicateMap.set(predicate, adjuncts);
      for (const adjunct of adjuncts) {
        this.adverbialAdjunctOwner.set(adjunct, predicate);
      }
    }
  }

  clauseIndexOfToken(tokenIdx: number): number {
    return this.clauseOfTokenIndex[tokenIdx] ?? -1;
  }

  utteranceRangeOfToken(tokenIdx: number): { readonly start: number; readonly endExclusive: number } {
    return utteranceRangeOfTokenIn(this.clauseOfTokenIndex.length, this.terminalPunctuationRuns, tokenIdx);
  }

  clauseOfToken(tokenIdx: number): Clause | undefined {
    const index = this.clauseIndexOfToken(tokenIdx);
    return index < 0 ? undefined : this.clauses[index];
  }

  tailReachInClause(tokenIdx: number): number {
    return this.tailReachEvidenceInClause(tokenIdx).endExclusive;
  }

  tailReachEvidenceInClause(tokenIdx: number): TailReachEvidence {
    const clause = this.clauseOfToken(tokenIdx);
    if (clause === undefined) {
      return { endExclusive: tokenIdx, clampedBy: "clause_end" };
    }
    const brk = clause.punctuationBreaks.find((index) => index >= tokenIdx) ?? null;
    const reach = Math.min(brk ?? clause.end, clause.end);
    const span = this.enclosingBalancedSpan(tokenIdx);
    if (span !== undefined && span.contentEndExclusive <= reach) {
      return { endExclusive: span.contentEndExclusive, clampedBy: "balanced_span" };
    }
    if (brk !== null && brk < clause.end) {
      return {
        endExclusive: reach,
        clampedBy: this.terminalPunctuationRunContaining(brk) === undefined
          ? "clause_pause"
          : "utterance_close"
      };
    }
    return { endExclusive: reach, clampedBy: "clause_end" };
  }

  terminalPunctuationRunAfter(contentEndIdx: number): ClauseTerminalPunctuationRunEvidence | undefined {
    return this.terminalPunctuationRuns.find((evidence) => evidence.contentEndIdx === contentEndIdx);
  }

  utteranceClosureRunAt(endIdx: number): UtteranceClosureRunEvidence | undefined {
    return this.utteranceClosureRuns.get(endIdx);
  }

  copulaPauseBridgeAt(copulaStart: number): CopulaPauseBridgeEvidence | undefined {
    return this.copulaPauseBridges.find((evidence) => evidence.copulaStart === copulaStart);
  }

  negativeCopulaCorrectionAt(splitAt: number): NegativeCopulaCorrectionEvidence | undefined {
    return this.negativeCopulaCorrections.get(splitAt);
  }

  chuushiClosureAt(splitAt: number): ChuushiClosureEvidence | undefined {
    return this.chuushiClosures.get(splitAt);
  }

  boundaryEventAt(splitAt: number): ClauseBoundaryEvent | undefined {
    return this.boundaryEvents.get(splitAt);
  }

  boundaryEventsInRange(start: number, endExclusive: number): readonly ClauseBoundaryEvent[] {
    return boundaryEventsInRangeOf(this.boundaryEvents, start, endExclusive);
  }

  firstBoundaryEventInRange(start: number, endExclusive: number): ClauseBoundaryEvent | undefined {
    return firstBoundaryEventInRangeOf(this.boundaryEvents, start, endExclusive);
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

  lexicalAdverbialAffiliationAt(particleIdx: number): LexicalAdverbialAffiliation | undefined {
    return this.lexicalAdverbialAffiliations.get(particleIdx);
  }

  teUtteranceActAt(connectiveIdx: number): TeUtteranceActEvidence | undefined {
    return this.teUtteranceActs.get(connectiveIdx);
  }

  closesAsDetachedUtterance(clause: { readonly end: number; readonly terminatedBy: BoundaryKind | null }): boolean {
    return clause.terminatedBy === "connective" && this.chuushiClosures.get(clause.end)?.right === "detached";
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

  terminalPunctuationRunContaining(tokenIdx: number): ClauseTerminalPunctuationRunEvidence | undefined {
    return this.terminalPunctuationRuns.find((evidence) => evidence.tokenIndices.includes(tokenIdx));
  }

  unmarkedMainClauseBoundaryAt(splitAt: number): boolean {
    return this.unmarkedMainClauseBoundaries.has(splitAt);
  }

  decorativeTerminalClosureAt(tokenIdx: number): boolean {
    return this.decorativeTerminalClosures.has(tokenIdx);
  }

  utteranceClosureAfter<T extends UtteranceClosureToken>(
    tokens: readonly T[],
    afterIdx: number
  ): UtteranceClosureEvidence {
    return utteranceClosureAfter(this, tokens, afterIdx);
  }

  clauseOfPredicate(predicateIdx: number): Clause | undefined {
    const index = this.clauseOfPredicateIndex.get(predicateIdx);
    return index === undefined ? undefined : this.clauses[index];
  }

  speechActScopeOfPredicate(predicateIdx: number): PredicateSpeechActScope {
    return this.speechActScopesByPredicate.find(([predicate]) => predicate === predicateIdx)?.[1] ?? "unresolved";
  }

  quoteHostOfQuotedPredicate(predicateIdx: number): number | undefined {
    return this.quoteHostByQuotedPredicate.find(([quoted]) => quoted === predicateIdx)?.[1];
  }

  quoteHostOfMarker(markerTokenIdx: number): number | undefined {
    return this.quoteHostByMarker.find(([marker]) => marker === markerTokenIdx)?.[1];
  }

  quoteRelationsOfHost(hostIdx: number): readonly QuoteStructuralRelation[] {
    return this.quoteRelations.filter((relation) => relation.quote.hostMatch.hostIdx === hostIdx);
  }

  quoteAttributiveCarrierHeadOfMarker(markerTokenIdx: number): number | undefined {
    return this.quoteAttributiveCarrierHeads.get(markerTokenIdx);
  }

  compoundHeadOfPredicate(predicateIdx: number): number | undefined {
    return this.compoundPredicatePairs.get(predicateIdx);
  }

  compoundTailOfPredicate(predicateIdx: number): number | undefined {
    for (const [tail, head] of this.compoundPredicatePairs) {
      if (head === predicateIdx) {
        return tail;
      }
    }
    return undefined;
  }

  compoundLeadingEdge(predicateIdx: number): number {
    return this.compoundPredicatePairs.get(predicateIdx) ?? predicateIdx;
  }

  clauseIndexOfPredicate(predicateIdx: number): number | undefined {
    return this.clauseOfPredicateIndex.get(predicateIdx);
  }

  argumentRolesOf(predicateIdx: number): readonly PredicateArgumentRoleAssignment[] {
    const assignments = this.clauseOfPredicate(predicateIdx)?.argumentRolesOf(predicateIdx) ?? [];
    const themeTopics = this.selectedFrameThemeTopicParticlesByPredicate.get(predicateIdx);
    if (themeTopics === undefined || themeTopics.size === 0) {
      return assignments;
    }
    return assignments.map((assignment) =>
      themeTopics.has(assignment.particleIdx)
        ? { particleIdx: assignment.particleIdx, role: "theme_topic" }
        : assignment
    );
  }

  materializeSelectedFrameThemeTopic(predicateIdx: number, particleIdx: number): boolean {
    const assignment = this.clauseOfPredicate(predicateIdx)
      ?.argumentRolesOf(predicateIdx)
      .find((candidate) => candidate.particleIdx === particleIdx);
    if (
      assignment === undefined ||
      assignment.role === "oblique_topic" ||
      assignment.role === "prefixed_focus" ||
      assignment.role === "object"
    ) {
      return false;
    }
    let particles = this.selectedFrameThemeTopicParticlesByPredicate.get(predicateIdx);
    if (particles === undefined) {
      particles = new Set();
      this.selectedFrameThemeTopicParticlesByPredicate.set(predicateIdx, particles);
    }
    particles.add(particleIdx);
    return true;
  }

  canBindAttributiveHead(predicateIdx: number): boolean {
    return this.clauseOfPredicate(predicateIdx)?.canBindAttributiveHead(predicateIdx) ?? false;
  }

  sameClause(a: number, b: number): boolean {
    const left = this.clauseIndexOfToken(a);
    return left >= 0 && left === this.clauseIndexOfToken(b);
  }

  nextPredicateInClauseAfter(tokenIdx: number): number | undefined {
    return this.clauseOfToken(tokenIdx)?.predicates.find((predicate) => predicate > tokenIdx);
  }

  previousPredicateInClause(tokenIdx: number): number | undefined {
    return this.clauseOfToken(tokenIdx)?.predicates.findLast((predicate) =>
      predicate < tokenIdx && this.sameQuoteScope(predicate, tokenIdx));
  }

  predicateOccurrenceBefore(
    tokens: readonly ClauseToken[], contentMap: ReadonlyMap<number, PredicateLike>, tokenIdx: number,
  ): { readonly predicateIdx: number; readonly closureIdx: number } | undefined {
    const predicateIdx = this.previousPredicateInClause(tokenIdx) ?? [...contentMap].findLast(
      ([idx, span]) => idx < tokenIdx && this.sameClause(idx, tokenIdx) && this.sameQuoteScope(idx, tokenIdx) &&
        span.renderPlan?.kind === "headTailChain" && span.renderPlan.realization?.kind === "predicate")?.[0];
    const closureIdx = previousNonSpaceIndex(tokens, tokenIdx, this.clauseOfToken(tokenIdx)?.start ?? tokenIdx);
    return closureIdx !== null && predicateIdx !== undefined && this.sameQuoteScope(closureIdx, tokenIdx) &&
      (pos0in(tokens[closureIdx]?.pos ?? 0, INFLECTABLE_BITS) || ((tokens[closureIdx]?.pos ?? 0) & POS0) === 助動詞)
      ? { predicateIdx, closureIdx } : undefined;
  }

  primaryPredicateOfChildClause(boundaryIdx: number): number | undefined {
    return this.childClauseEndingAt(boundaryIdx)?.predicates
      .find((predicate) => this.sameQuoteScope(predicate, boundaryIdx));
  }

  predicateBeforeNominalClosure(headIdx: number): number | undefined {
    return this.childClauseEndingAt(headIdx)?.predicates
      .findLast((predicate) => this.sameQuoteScope(predicate, headIdx));
  }

  private childClauseEndingAt(boundaryIdx: number): Clause | undefined {
    const parentIdx = this.clauseIndexOfToken(boundaryIdx);
    return this.clauses.find((clause) => clause.parentIdx === parentIdx && clause.end === boundaryIdx);
  }

  ownerPredicateOfParticle(particleIdx: number): number | undefined {
    return this.predicateOfParticle.get(particleIdx) ?? this.benefactiveRecipientTopicParticleOwner.get(particleIdx);
  }

  followingPredicateEvidenceIndexAfter(
    tokens: readonly ClauseToken[],
    tokenIdx: number,
    options: {
      readonly limit?: number;
      readonly includeAuxiliary?: boolean;
    } = {}
  ): number | null {
    return findFollowingPredicateEvidenceIndex(this, tokens, tokenIdx, options, (token, index) =>
      this.clauseOfPredicateIndex.has(index) &&
      (options.includeAuxiliary !== false || (token.pos & POS0) !== 助動詞)
    );
  }

  quoteHostPrefixParticlesOf(predicateIdx: number): readonly number[] {
    return this.quoteHostPrefixByPredicate.get(predicateIdx) ?? [];
  }

  adverbialAdjunctsOf(predicateIdx: number): readonly number[] {
    return this.adverbialAdjunctsByPredicateMap.get(predicateIdx) ?? [];
  }

  predicateOfAdverbialAdjunct(adjunctIdx: number): number | undefined {
    return this.adverbialAdjunctOwner.get(adjunctIdx);
  }

  parentOf(clauseIdx: number): Clause | undefined {
    const parent = this.clauses[clauseIdx]?.parentIdx;
    return parent === undefined || parent === null ? undefined : this.clauses[parent];
  }

  enclosingQuoteSpans(tokenIdx: number): ReadonlySet<readonly [number, number]> {
    return new Set(this.quoteSpans.filter(([start, end]) => start < tokenIdx && tokenIdx < end));
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

  quoteSpanInfoContaining(tokenIdx: number): QuoteSpanInfo | undefined {
    const span = this.enclosingQuoteSpan(tokenIdx);
    if (span === undefined) {
      return undefined;
    }
    return this.quoteSpanInfos.find((info) => sameSpan(info.span, span));
  }

  sameQuoteScope(a: number, b: number): boolean {
    return spanKeySet(this.enclosingQuoteSpans(a)) === spanKeySet(this.enclosingQuoteSpans(b));
  }

  isQuoteTrappedArgument(particleIdx: number, predicateIdx: number): boolean {
    if (this.quoteHostPrefixParticleOwner.get(particleIdx) === predicateIdx) {
      return false;
    }
    const span = this.enclosingQuoteSpan(particleIdx);
    if (span === undefined) {
      return false;
    }
    return !(span[0] <= predicateIdx && predicateIdx <= span[1]);
  }

  isQuoteSealedPredicate(particleIdx: number, predicateIdx: number): boolean {
    const particleSpans = this.enclosingQuoteSpans(particleIdx);
    const predicateSpans = this.enclosingQuoteSpans(predicateIdx);
    if (particleSpans.size >= predicateSpans.size) {
      return false;
    }
    for (const particleSpan of particleSpans) {
      if (![...predicateSpans].some((predicateSpan) => sameSpan(predicateSpan, particleSpan))) {
        return false;
      }
    }
    return true;
  }
}


export function buildClauseLayoutFromProto(
  proto: ProtoClauseLayout,
  tokens: readonly ClauseToken[],
  contentMap: ReadonlyMap<number, PredicateLike> | { readonly [index: number]: PredicateLike },
  lookups: LookupTables,
  options: {
    readonly consumedLexicalParticleIndices?: ReadonlySet<number> | readonly number[];
    readonly requireCachedQuoteRelations?: boolean;
  } = {}
): ClauseLayout {
  return useActiveProtoLayout(proto, () =>
    buildClauseLayoutInProtoScope(proto, tokens, contentMap, lookups, options));
}

function buildClauseLayoutInProtoScope(
  proto: ProtoClauseLayout,
  tokens: readonly ClauseToken[],
  contentMap: ReadonlyMap<number, PredicateLike> | { readonly [index: number]: PredicateLike },
  lookups: LookupTables,
  options: {
    readonly consumedLexicalParticleIndices?: ReadonlySet<number> | readonly number[];
    readonly requireCachedQuoteRelations?: boolean;
  }
): ClauseLayout {
  if (proto.protoClauses.length === 0) {
    return new ClauseLayout([], []);
  }
  const contentEntries = sortedContentEntries(contentMap);
  const contentEntriesByClause = proto.protoClauses.map((protoClause) =>
    contentEntries.filter(([idx]) => protoClause.start <= idx && idx < protoClause.end)
  );
  const quoteSpanInfos = classifyQuoteSpans(tokens, contentEntries, proto.quoteSpans);
  const quoteRelations = quoteStructuralRelationsForLayout(
    tokens,
    proto,
    lookups,
    options.requireCachedQuoteRelations === true
  );
  const quoteHostPrefixParticles = quoteHostPrefixParticlesByPredicate(tokens, proto, quoteRelations);
  const benefactiveRecipientTopicParticles = benefactiveRecipientTopicParticlesByPredicate(tokens, proto, contentEntriesByClause);
  const quoteHostPrefixOwner = new Map<number, number>();
  for (const [predicate, particles] of quoteHostPrefixParticles) {
    for (const particle of particles) {
      quoteHostPrefixOwner.set(particle, predicate);
    }
  }
  const quoteArgumentCandidacy = new QuoteArgumentCandidacyVerdict(
    quoteRelations,
    quoteHostPrefixOwner
  );
  const benefactiveRecipientTopicOwner = new Map<number, number>();
  for (const [predicate, particles] of benefactiveRecipientTopicParticles) {
    for (const particle of particles) {
      benefactiveRecipientTopicOwner.set(particle, predicate);
    }
  }
  const adverbialAdjuncts = adverbialAdjunctsByPredicate(tokens, proto, contentEntries, lookups);
  const consumedLexicalParticles = consumedLexicalParticleIndices(tokens, contentEntries, options.consumedLexicalParticleIndices);
  const clauses = proto.protoClauses.map((protoClause, clauseIndex) => {
    const clauseContentEntries = contentEntriesByClause[clauseIndex] ?? [];
    const predicates = clauseContentEntries
      .filter(([idx, span]) =>
        sourceContextMayBePredicateAt(tokens, idx, span, { limit: protoClause.end }) &&
        !isAdverbialKeijoujiPredicateLike(tokens, idx, proto, clauseIndex, contentEntries, lookups) &&
        rentaiDegreeAdverbialModifiedPredicate(tokens, idx, adjectiveAdverbialModifierLookupOptions(lookups)) === null
      )
      .map(([idx]) => idx);
    const particleMap = new Map(predicates.map((predicate) => [predicate, [] as number[]]));
    const particleIndices = protoClause.particleIndices.filter((particle) => !consumedLexicalParticles.has(particle));
    for (const particle of particleIndices) {
      let owner = quoteHostPrefixOwner.get(particle);
      if (owner === undefined || !particleMap.has(owner)) {
        owner = predicates.find((predicate) =>
          predicate > particle &&
          !proto.isQuoteTrapped(particle, predicate) &&
          quoteArgumentCandidacy.allows(particle, predicate)
        );
      }
      if (owner !== undefined) {
        particleMap.get(owner)?.push(particle);
      }
    }
    for (const [particle, owner] of benefactiveRecipientTopicOwner) {
      if (particleMap.has(owner) && protoClause.start <= particle && particle < protoClause.end) {
        particleMap.get(owner)?.push(particle);
      }
    }
    const perPredicate = predicates.map((predicate) => {
      const particles = [...new Set(particleMap.get(predicate) ?? [])].sort((left, right) => left - right);
      return [predicate, particles] as const;
    });
    const argumentRolesByPredicate = predicateArgumentRolesForClause(
      tokens,
      proto,
      protoClause,
      predicates,
      perPredicate,
      clauseContentEntries,
      quoteArgumentCandidacy,
    );
    return new Clause(
      protoClause.start,
      protoClause.end,
      predicates,
      particleIndices,
      perPredicate,
      protoClause.parentIdx,
      protoClause.kind,
      protoClause.terminatedBy,
      nominalClosureAnchorForProtoClause(tokens, proto, clauseIndex),
      leadingNominalAnchorForProtoClause(tokens, proto, clauseIndex, predicates),
      leadingConnectiveIndexForRange(tokens, protoClause.start, protoClause.end),
      leadingQuoteMarkerIndexForRange(tokens, protoClause.start, protoClause.end),
      argumentRolesByPredicate,
      clauseContentEntries
        .filter(([, span]) => predicateLikeHasPredicateQuoteCarrier(span))
        .map(([predicate]) => predicate),
      protoClausePunctuationBreaks(proto, protoClause),
      protoClause.terminatedBy === "attributive" && proto.isRenyouCompoundPrenominalHead(protoClause.end)
        ? "renyou_compound_prenominal"
        : null,
    );
  });
  const quotedSpeechActSpans = [
    ...proto.quoteSpans.map(([start, endExclusive]) => ({ start, endExclusive })),
    ...quoteRelations.map((relation) => relation.quote.contentSpan),
  ];
  const speechActScopes = clauses.flatMap((clause) => clause.predicates.map((predicateIdx) => [
    predicateIdx,
    quotedSpeechActSpans.some(({ start, endExclusive }) => start <= predicateIdx && predicateIdx < endExclusive) ||
      contentEntries.some(([idx, span]) => idx === predicateIdx && predicateLikeHasPredicateQuoteCarrier(span, true))
      ? "quoted_content"
      : contentEntries.some(([idx, span]) => idx === predicateIdx &&
        tokens.slice(idx, idx + (span.consumed ?? 1)).some((token) => token.transparentPauseAfter === true))
        ? "matrix"
        : clause.kind !== "main" || clause.predicates.at(-1) === predicateIdx && (
          proto.terminalPunctuationRuns.some((run) => clause.start <= run.contentEndIdx && run.contentEndIdx < clause.end &&
            quoteMarkerRelationAt(tokens, run.contentEndIdx, { consumers: ["clause_layout"] }) !== null) ||
          clause.end === tokens.length && quoteMarkerRelationAt(tokens,
            previousNonSpaceIndex(tokens, clause.end, clause.start) ?? -1, { consumers: ["clause_layout"] }) !== null)
        ? "unresolved"
        : "matrix",
  ] as const));
  const quoteHostByQuotedPredicate = clauses.flatMap((clause) => clause.predicates.flatMap((predicateIdx) => {
    const relation = quoteRelations.find(({ quote }) =>
      quote.contentSpan.start <= predicateIdx && predicateIdx < quote.contentSpan.endExclusive
    );
    const hostIdx = relation?.quote.hostMatch.hostIdx;
    return hostIdx === undefined ? [] : [[predicateIdx, hostIdx] as const];
  }));
  const quoteHostByMarker = quoteRelations.flatMap(({ quote }) => {
    const positions: (readonly [number, number])[] = [];
    for (let idx = quote.markerSpan.start; idx < quote.markerSpan.endExclusive; idx += 1) {
      positions.push([idx, quote.hostMatch.hostIdx] as const);
    }
    return positions;
  });
  return new ClauseLayout(
    clauses,
    proto.clauseOfTokenIndex,
    proto.quoteSpans,
    quoteSpanInfos,
    quoteHostPrefixParticles,
    benefactiveRecipientTopicParticles,
    initialConnectiveRoles(tokens, clauses),
    compoundPredicatePairsForClauses(tokens, clauses),
    adverbialAdjuncts,
    proto.terminalPunctuationRuns,
    speechActScopes,
    proto.copulaPauseBridges,
    proto.balancedDelimiterSpans,
    quoteHostByQuotedPredicate,
    proto.utteranceClosureRuns,
    proto.negativeCopulaCorrections,
    proto.unmarkedMainClauseBoundaries,
    proto.decorativeTerminalClosures,
    quoteHostByMarker,
    proto.quoteAttributiveCarrierHeads,
    proto.chuushiClosures,
    new Map([...proto.teUtteranceActs].map(([idx, act]) => {
      const quote = quoteRelations.find(({ quote: candidate }) =>
        candidate.contentSpan.start <= act.connectiveIdx && act.connectiveIdx < candidate.contentSpan.endExclusive)?.quote;
      const closesQuotedUtterance = quote !== undefined &&
        tokens.slice(act.connectiveIdx + 1, quote.contentSpan.endExclusive)
          .every((token) => isBoundaryPunct(token) || isTrailingPunct(token) || isTerminalParticleToken(token));
      return [idx, {
        ...act,
        ...(closesQuotedUtterance ? { position: "utterance_final" as const } : {}),
        scope: quote === undefined ? "matrix" as const : "quoted_content" as const
      }];
    })),
    proto.renyouJunctures,
    proto.whitespaceJunctures,
    proto.pauseJunctures,
    proto.lexicalAdverbialAffiliations,
    quoteRelations,
    proto.boundaryEvents,
  );
}

function protoClausePunctuationBreaks(
  proto: ProtoClauseLayout,
  clause: { readonly start: number; readonly end: number }
): readonly number[] {
  const breaks: number[] = [];
  for (const idx of proto.punctuationBreakIndices) {
    if (idx >= clause.start && idx < clause.end) {
      breaks.push(idx);
    }
  }
  return breaks.sort((left, right) => left - right);
}


export function buildClauseLayout(
  tokens: readonly ClauseToken[],
  contentMap: ReadonlyMap<number, PredicateLike> | { readonly [index: number]: PredicateLike },
  lookups: LookupTables
): ClauseLayout {
  return buildClauseLayoutFromProto(buildProtoLayout(tokens, lookups), tokens, contentMap, lookups);
}

function sortedContentEntries(contentMap: ReadonlyMap<number, PredicateLike> | { readonly [index: number]: PredicateLike }): readonly (readonly [number, PredicateLike])[] {
  if (contentMap instanceof Map) {
    return [...contentMap.entries()].sort(([left], [right]) => left - right);
  }
  return Object.entries(contentMap)
    .map(([idx, span]) => [Number(idx), span] as const)
    .sort(([left], [right]) => left - right);
}
