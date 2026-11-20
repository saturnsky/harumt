import { isPredicateQuestionContentKaCandidate, looksQuestionTakingAfter } from "../quote/embedded-question.js";
import { TokenCursor } from "../token-cursor.js";
import { copulaDeHostProvesAdjunctReading, isRealizedQuantityPhraseHead, quoteHostSearchBridgeArgumentRelationAt } from "../head-tail/boundary/marker.js";
import type { RenyouVerbReadingFacts } from "./renyou-verb-reading.js";
import { chuushiClosureRight, isChuushiClauseCoordinationPreludeToken, isChuushiNominalRunPredicateAt, isVerbReadingFollowerRunPredicateAt, renyouChuushiClosureEllipticAfter, renyouChuushiClosureGovernedAfter, renyouChuushiClosureLeftAt, type ChuushiClosureEvidence } from "./chuushi-closure.js";
import { pauseJunctureEvidence, renyouJunctureEvidence, undecidedRenyouClosureDisposition, whitespaceJunctureEvidence, type PauseJunctureCohesionEvidence, type PauseJunctureEvidence, type RenyouJunctureCohesionEvidence, type RenyouJunctureEvidence, type WhitespaceAdnominalLicense, type WhitespaceJunctureBoundaryEvidence, type WhitespaceJunctureCohesionEvidence, type WhitespaceJunctureEvidence } from "./juncture-verdict.js";
import { isSupportedClauseStart } from "../head-tail/tail/predicate-root/integration/readiness.js";
import { kaOwnershipKindAt } from "../head-tail/boundary/ka-ownership.js";
import { renyouNominalHeadAdmissionAt } from "../head-tail/head/adapters/nominal/renyou-nominal-head.js";
import { matchCopula } from "../head-tail/tail/predicate-root/matchers/copula.js";
import { copulaConcessiveConditionEvidenceWithLayout } from "../head-tail/tail/predicate-root/classifiers/copula-concessive.js";
import type { CopulaConcessiveConditionEvidence } from "./copula-concessive.js";
import type { ClauseStartRightStructure } from "../head-tail/boundary/clause-start.js";
import { isHostedConnectiveMarkerAt } from "../head-tail/tail/connective-span-scanner.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import type { LookupTables } from "../lookup-tables.js";
import { collectCopulaPauseBridgeEvidence, isClauseDecorativeTerminalPunctuationToken, isClauseEvidenceTransparentPunctuation, isClausePunctuationToken } from "./punctuation.js";
import { nextNonSpaceIndex, previousNonSpaceIndex, SEPARATION_OPENS_BOUNDARY, isWitnessedChunkBreakBefore, separatedAs } from "./trivia.js";
import type { BalancedDelimiterSpan } from "./balanced-delimiter.js";
import type { UtteranceClosureRunEvidence } from "./utterance-closure.js";
import { demoDiscourseUtteranceInitialMatchLengthAt } from "../demo-discourse.js";
import { POS0, POS1, POS5A, 形容詞0, 助詞, 助動詞, 接尾辞, 形容詞的, 命令形_, isAuxiliaryStemToken } from "../../types/pos.js";
import { type BoundaryKind, type ClauseToken, type LexicalRenyouHeadClaims, type ClauseNominalClosureAnchor, ClauseBoundaryEvent, type PairedVolitionalConcessiveEvidence, type DemoDiscourseLeftBoundaryEvidence } from "./layout-types.js";
import { upsertBoundaryEvent, hasFollowingClausePredicateEvidence } from "./boundary-event-common.js";
import { isClausePredicateEvidenceToken } from "./token-evidence.js";
import type { BareKeijoujiAttributiveEvidence } from "./nominal-anchor-evidence.js";
import { leadingNominalAnchorForRange } from "./prenominal-head-reach.js";
import { chuushiClosureDetachedRightInputs, chuushiClosureRightUtteranceShape, hasSeparatedFinitePredicateBoundary, isConditionalBaParticle } from "./connective-boundaries.js";
import { type DetachedUtteranceOnsetEvidence, pauseEdgeVerdictAt, type UtteranceEdgeEvidence, isCopulaTailContinuationStart } from "./utterance-boundaries.js";
import { isInsideAnyNominalFrameSurface } from "./nominal-frame-reach.js";
import { type ProtoClauseLayout, protoLayoutFromBoundaryEvents } from "./proto-layout.js";
import type { ClauseBoundaryDetectionResult, ClauseBoundaryDetectionContext, ClauseBoundaryDetectionState } from "./boundary-detection.js";
import { gapPermeableAttributiveHeadReach } from "./attributive-boundaries.js";

function decorativeTerminalClosureIndices(
  tokens: readonly ClauseToken[],
  lookups: LookupTables
): ReadonlySet<number> {
  const surfaces = lookups.GRAMMAR_BOUNDARY_DECORATIVE_TERMINAL_SYMBOL_SURFACES;
  const indices = new Set<number>();
  if (surfaces.size === 0) {
    return indices;
  }
  for (const [index, token] of tokens.entries()) {
    if (isClauseDecorativeTerminalPunctuationToken(token, surfaces)) {
      indices.add(index);
    }
  }
  return indices;
}

interface ProvisionalBoundaryEvents {
  readonly junctureCohesionSources: JunctureCohesionSources;
  readonly bridgedPunctuationEnds: ReadonlySet<number>;
  readonly preRenyouEvents: readonly ClauseBoundaryEvent[];
  readonly decorativeTerminalClosures: ReadonlySet<number>;
  readonly preRenyouLayout: ProtoClauseLayout;
}

export interface RenyouClosureBoundaryEvents {
  readonly eventlessRenyouClosures: Map<number, ChuushiClosureEvidence>;
  readonly renyouJunctureScan: ReturnType<typeof collectRenyouChuushiClosures>;
  readonly events: readonly ClauseBoundaryEvent[];
  readonly evidenceLayout: ProtoClauseLayout;
}

export function settleProvisionalBoundaryEvents(ctx: ClauseBoundaryDetectionContext, state: ClauseBoundaryDetectionState): ProvisionalBoundaryEvents {
  const { tokens, lookups, runtimeTokens, quoteSpans, balancedDelimiterSpans, bareKeijoujiAttributiveHeads, pairedConcessiveBySplitAt } = ctx;
  const { raw, questionContentPunctuationBridgeCandidates, chuushiClosureCandidates, attributiveModifierChainHeadBySplitAt, renyouCompoundPrenominalSplits } = state;
  const provisionalEvents = sortedClauseBoundaryEvents(
    raw,
    pairedConcessiveBySplitAt,
    attributiveModifierChainHeadBySplitAt,
    renyouCompoundPrenominalSplits,
    chuushiClosureCandidates
  );
  const provisionalLayout = protoLayoutFromBoundaryEvents(tokens, provisionalEvents, quoteSpans);
  const junctureCohesionSources: JunctureCohesionSources = {
    balancedDelimiterSpans,
    bareKeijoujiAttributiveHeads,
    copulaConcessiveConditions: copulaConcessiveConditionEvidenceWithLayout(runtimeTokens, lookups, provisionalLayout)
  };
  const bridgedPunctuationEnds = new Set(
    questionContentPunctuationBridgeCandidates
      .filter((candidate) => hasQuestionContentContinuationAcrossSubjectTopicBridge(
        runtimeTokens,
        candidate.kaIdx,
        candidate.span.endExclusive,
        provisionalLayout,
        lookups,
      ))
      .map((candidate) => candidate.span.endExclusive),
  );
  const preRenyouEvents = provisionalEvents.filter((event) => !bridgedPunctuationEnds.has(event.splitAt));
  const decorativeTerminalClosures = decorativeTerminalClosureIndices(tokens, lookups);
  const preRenyouLayout = protoLayoutFromBoundaryEvents(tokens, preRenyouEvents, quoteSpans, {
    balancedDelimiterSpans,
    decorativeTerminalClosures
  });
  return { junctureCohesionSources, bridgedPunctuationEnds, preRenyouEvents, decorativeTerminalClosures, preRenyouLayout };
}

export function addRenyouChuushiClosureEvents(
  ctx: ClauseBoundaryDetectionContext,
  state: ClauseBoundaryDetectionState,
  provisional: ProvisionalBoundaryEvents
): RenyouClosureBoundaryEvents {
  const { tokens, lookups, options, runtimeTokens, quoteSpans, balancedDelimiterSpans, pairedConcessiveBySplitAt } = ctx;
  const { raw, chuushiClosureCandidates, attributiveModifierChainHeadBySplitAt, renyouCompoundPrenominalSplits } = state;
  const { bridgedPunctuationEnds, preRenyouEvents, decorativeTerminalClosures, preRenyouLayout } = provisional;
  let renyouClosureAdded = false;
  const eventlessRenyouClosures = new Map<number, ChuushiClosureEvidence>();
  const renyouJunctureScan = collectRenyouChuushiClosures(runtimeTokens, preRenyouLayout, raw, lookups, options.lexicalRenyouHeadClaims, options.renyouVerbReadings);
  for (const closure of renyouJunctureScan.closures.values()) {
    if (closure.boundaryOwner !== undefined) {
      eventlessRenyouClosures.set(closure.splitAt, closure);
      continue;
    }
    if (!raw.has(closure.splitAt)) {
      upsertBoundaryEvent(ctx, state, closure.splitAt, "connective", { witnessesWhitespaceSplit: false });
    }
    if (raw.get(closure.splitAt) === "connective") {
      chuushiClosureCandidates.set(closure.splitAt, closure);
      renyouClosureAdded = true;
    }
  }
  const events = renyouClosureAdded
    ? sortedClauseBoundaryEvents(
      raw,
      pairedConcessiveBySplitAt,
      attributiveModifierChainHeadBySplitAt,
      renyouCompoundPrenominalSplits,
      chuushiClosureCandidates
    ).filter((event) => !bridgedPunctuationEnds.has(event.splitAt))
    : preRenyouEvents;
  const evidenceLayout = renyouClosureAdded
    ? protoLayoutFromBoundaryEvents(tokens, events, quoteSpans, { balancedDelimiterSpans, decorativeTerminalClosures })
    : preRenyouLayout;
  return { eventlessRenyouClosures, renyouJunctureScan, events, evidenceLayout };
}

export function assembleClauseBoundaryDetectionResult(
  ctx: ClauseBoundaryDetectionContext,
  state: ClauseBoundaryDetectionState,
  detachedTerminalNodaClosures: ReadonlySet<number>,
  provisional: ProvisionalBoundaryEvents,
  renyou: RenyouClosureBoundaryEvents,
  utteranceEdges: UtteranceEdgeEvidence
): ClauseBoundaryDetectionResult {
  const { tokens, lookups, runtimeTokens, lexicalAdverbialAffiliations, balancedDelimiterSpans, bareKeijoujiAttributiveHeads, whitespaceAdnominalLicenses } = ctx;
  const { raw, demoDiscourseLeftBoundaries, hardTerminalEllipsisRuns, pauseJunctureBoundaryEvidence, anaphoricConjectureSelfQuestions, punctuationBreakIndices, negativeCopulaCorrections, teUtteranceActs, volitionalIntentBindings, renyouCompoundPrenominalSplits, quoteAttributiveCarrierBySplitAt, nonWhitespaceWitnessSplits, whitespaceWitnessSplits } = state;
  const { junctureCohesionSources, bridgedPunctuationEnds, decorativeTerminalClosures } = provisional;
  const { eventlessRenyouClosures, renyouJunctureScan, events } = renyou;
  const { onsetScope, utteranceClosureRuns, detachedUtteranceOnsetBoundaries, terminalPunctuationRuns } = utteranceEdges;
  return {
    events,
    demoDiscourseLeftBoundaries,
    hardTerminalEllipsisRuns: hardTerminalEllipsisRuns.filter((run) =>
      !bridgedPunctuationEnds.has(run.span.endExclusive)
    ),
    anaphoricConjectureSelfQuestions,
    terminalPunctuationRuns,
    copulaPauseBridges: collectCopulaPauseBridgeEvidence(
      tokens,
      isCopulaTailContinuationStart,
      punctuationBreakIndices,
      (edgeIdx) => pauseEdgeVerdictAt(tokens, edgeIdx, onsetScope.pauseEdgeArgumentScopeAt(edgeIdx))
    ),
    balancedDelimiterSpans,
    bareKeijoujiAttributiveHeads,
    renyouCompoundPrenominalHeads: new Set(
      [...renyouCompoundPrenominalSplits].filter((splitAt) => raw.get(splitAt) === "attributive")
    ),
    quoteAttributiveCarrierHeads: new Map(
      [...quoteAttributiveCarrierBySplitAt]
        .filter(([splitAt]) => events.some((event) => event.splitAt === splitAt && event.kind === "attributive"))
        .map(([, markerAndHead]) => markerAndHead)
    ),
    decorativeTerminalClosures,
    detachedTerminalNodaClosures,
    utteranceClosureRuns,
    punctuationBreakIndices,
    negativeCopulaCorrections,
    chuushiClosures: new Map([
      ...events.flatMap((event) => event.chuushiClosure === undefined ? [] : [[event.splitAt, event.chuushiClosure] as const]),
      ...eventlessRenyouClosures
    ]),
    renyouJunctures: renyouJunctureScan.junctures,
    teUtteranceActs: new Map([...teUtteranceActs].filter(([, act]) =>
      act.position === "utterance_final" ||
      events.some((event) => event.chuushiClosure?.connectiveIdx === act.connectiveIdx))),
    whitespaceChunkBreakWitnesses: whitespaceChunkBreakWitnessesFrom(tokens, {
      events,
      nonWitnessSplits: new Set(
        [...nonWhitespaceWitnessSplits].filter((splitAt) => !whitespaceWitnessSplits.has(splitAt))
      ),
      utteranceOnsets: demoDiscourseLeftBoundaries,
      utteranceClosureRuns,
      detachedTerminalNodaClosures,
      detachedUtteranceOnsetBoundaries
    }),
    detachedUtteranceOnsetBoundaries,
    whitespaceJunctures: collectWhitespaceJunctures(
      tokens,
      runtimeTokens,
      lookups,
      junctureCohesionSources,
      whitespaceAdnominalLicenses
    ),
    pauseJunctureBoundaryEvidence,
    pauseJunctures: collectPauseJunctures(tokens, runtimeTokens, lookups, junctureCohesionSources),
    lexicalAdverbialAffiliations,
    volitionalIntentBindings,
  };
}

function renyouClosureBoundaryOwner(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  splitAt: number,
  raw: ReadonlyMap<number, BoundaryKind>,
  cohesion: readonly RenyouJunctureCohesionEvidence[]
): NonNullable<ChuushiClosureEvidence["boundaryOwner"]> | null {
  let punctuationEnd = splitAt;
  while (punctuationEnd < tokens.length && isClausePunctuationToken(tokens[punctuationEnd])) {
    punctuationEnd += 1;
  }
  if (punctuationEnd > splitAt && raw.get(punctuationEnd) === "punctuation") return "pause_punctuation";
  for (const kind of ["lexical_compound", "lexical_head", "nominal_frame"] as const) {
    if (cohesion.some((evidence) => evidence.kind === kind)) return kind;
  }
  if (isAdjectivalRenyouToken(tokens[idx])) return "adjectival_renyou";
  return null;
}

function renyouJunctureCohesionEvidence(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  left: { readonly splitAt: number; readonly followerIdx: number; readonly lexicalCompoundCandidate: boolean },
  raw: ReadonlyMap<number, BoundaryKind>,
  claims: LexicalRenyouHeadClaims | undefined,
  lookups: LookupTables,
  layout: ProtoClauseLayout
): readonly RenyouJunctureCohesionEvidence[] {
  const evidence: RenyouJunctureCohesionEvidence[] = [];
  if (raw.get(left.splitAt) === "attributive") evidence.push({ kind: "attributive_endpoint" });
  if (isHostedConnectiveMarkerAt(tokens, left.followerIdx)) {
    evidence.push({ kind: "hosted_connective", markerIdx: left.followerIdx });
  }
  if (left.lexicalCompoundCandidate && claims?.registeredCompoundV1s.has(idx) === true) {
    evidence.push({ kind: "lexical_compound" });
  }
  if (claims?.nonPredicateHeads.has(idx) === true) evidence.push({ kind: "lexical_head" });
  if (isInsideAnyNominalFrameSurface(tokens, idx, lookups, layout)) evidence.push({ kind: "nominal_frame" });
  evidence.push(...renyouNominalHeadCohesion(tokens, idx, lookups, claims));
  return evidence;
}

function renyouNominalHeadCohesion(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  lookups: LookupTables,
  claims: LexicalRenyouHeadClaims | undefined
): readonly RenyouJunctureCohesionEvidence[] {
  const admission = renyouNominalHeadAdmissionAt(tokens, idx, lookups, {
    lexicalNounCompoundEnd: claims?.lexicalNounCompoundEnds.get(idx) ?? null
  });
  if (admission === null) return [];
  switch (admission.kind) {
    case "derivational_suffix":
    case "noun_compound_suffix":
      return [{ kind: "nominal_suffix_head", suffixIdx: admission.suffixIdx }];
    case "honorific_prefix_compound":
      return [{ kind: "nominal_compound_head", spanEnd: admission.hostIdx }];
    case "lexical_noun_compound":
      return [{ kind: "nominal_compound_head", spanEnd: admission.nounEnd }];
    case "honorific_prefix":
    case "bare_case_particle":
      return [];
  }
}

function isAdjectivalRenyouToken(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined &&
    ((token.pos & POS0) === 形容詞0 || (token.pos & (POS0 | POS1)) === (接尾辞 | 形容詞的));
}

function collectRenyouChuushiClosures(
  tokens: readonly RuntimeHaruToken[],
  layout: ProtoClauseLayout,
  raw: ReadonlyMap<number, BoundaryKind>,
  lookups: LookupTables,
  claims: LexicalRenyouHeadClaims | undefined,
  renyouVerbReadings: RenyouVerbReadingFacts | undefined
): {
  readonly closures: ReadonlyMap<number, ChuushiClosureEvidence>;
  readonly junctures: ReadonlyMap<number, RenyouJunctureEvidence>;
} {
  const closures = new Map<number, ChuushiClosureEvidence>();
  const junctures = new Map<number, RenyouJunctureEvidence>();
  const isPredicateStart = (candidateTokens: readonly RuntimeHaruToken[], idx: number): boolean =>
    isSupportedClauseStart(candidateTokens, idx, lookups);
  const rightStructure: ClauseStartRightStructure<RuntimeHaruToken> = {
    isClauseCoordinationPreludeAt: (candidateTokens, index) =>
      isChuushiClauseCoordinationPreludeToken(candidateTokens[index], lookups),
    isNominalRunPredicateAt: (candidateTokens, start, predicateIdx) =>
      isChuushiNominalRunPredicateAt(candidateTokens, start, predicateIdx, lookups),
    adnominalHeadStartAfterPredicate: (predicateIdx) => {
      const clause = layout.clauseOfToken(predicateIdx);
      return clause !== undefined && raw.get(clause.end) === "attributive" ? clause.end : null;
    }
  };
  for (let idx = 0; idx < tokens.length; idx += 1) {
    const left = renyouChuushiClosureLeftAt(tokens, idx, lookups);
    if (left === null) {
      const cohesion = renyouNominalHeadCohesion(tokens, idx, lookups, claims);
      if (cohesion.length > 0) {
        junctures.set(idx + 1, renyouJunctureEvidence({
          hostIdx: idx,
          splitAt: idx + 1,
          followerIdx: idx + 1,
          boundary: [],
          cohesion
        }));
      }
      continue;
    }
    const cohesion = renyouJunctureCohesionEvidence(tokens, idx, left, raw, claims, lookups, layout);
    const reach = Math.min(layout.projectionEvidenceWindowForToken(tokens, idx)?.end ?? idx + 1, tokens.length);
    const isFrameInternalPauseAt = (candidateTokens: readonly RuntimeHaruToken[], index: number): boolean => {
      const token = candidateTokens[index];
      return index > idx && index < reach && token !== undefined && isClauseEvidenceTransparentPunctuation(token);
    };
    const verbReadingHost = renyouVerbReadings?.has(idx) === true;
    const frameStructure: ClauseStartRightStructure<RuntimeHaruToken> = {
      ...rightStructure,
      ...(verbReadingHost
        ? {
          nominalRunHostPrecedesAdnominalTransit: true,
          isNominalRunPredicateAt: (candidateTokens: readonly RuntimeHaruToken[], start: number, predicateIdx: number) =>
            isVerbReadingFollowerRunPredicateAt(candidateTokens, start, predicateIdx, lookups, (index) =>
              isFrameInternalPauseAt(candidateTokens, index)),
          isAdjunctProvenNominalAt: (candidateTokens: readonly RuntimeHaruToken[], index: number) =>
            copulaDeHostProvesAdjunctReading(candidateTokens, index),
          opaqueNominalSpanEndAt: (_candidateTokens: readonly RuntimeHaruToken[], index: number) =>
            layout.balancedDelimiterSpanOpeningAt(index)?.endExclusive ?? null,
          isMeasurePhraseHeadAt: (candidateTokens: readonly RuntimeHaruToken[], index: number) =>
            isRealizedQuantityPhraseHead(candidateTokens, index)
        }
        : {}),
      isFrameInternalPauseAt
    };
    const governed = renyouChuushiClosureGovernedAfter(tokens, idx, reach, isPredicateStart, lookups, frameStructure);
    const rightShape = chuushiClosureRightUtteranceShape(tokens, left.splitAt);
    const detachedInputs = chuushiClosureDetachedRightInputs(tokens, left.followerIdx, lookups);
    const predicateVisible = hasFollowingClausePredicateEvidence(
      new TokenCursor<ClauseToken>(tokens, left.splitAt, tokens.length),
      (openingIdx) => layout.balancedDelimiterSpanOpeningAt(openingIdx)
    );
    const onsetEvidence = detachedInputs.separatedUtteranceHead || detachedInputs.discourseOnsetHead;
    const predicateGoverns = governed || (predicateVisible && onsetEvidence);
    const closureRight = chuushiClosureRight({
      governedBy: predicateGoverns ? "predicate" : null,
      ...detachedInputs,
      ownTopicQuestion: rightShape.topicIdx !== undefined && rightShape.closesAsQuestion,
      elliptic: !governed && renyouChuushiClosureEllipticAfter(tokens, left.followerIdx, layout, {
        isPredicateStart,
        lookups,
        reach,
        rightStructure: frameStructure,
        markedFragment: {
          splitAt: left.splitAt,
          reach,
          isPredicateEvidenceAt: (candidateTokens, index) => {
            const candidate = candidateTokens[index];
            return (candidate !== undefined && isClausePredicateEvidenceToken(candidate)) ||
              isPredicateStart(candidateTokens, index);
          }
        }
      })
    });
    const right = closureRight?.right ?? null;
    const juncture = renyouJunctureEvidence({
      hostIdx: idx,
      splitAt: left.splitAt,
      followerIdx: left.followerIdx,
      boundary: right === null ? [] : [{ kind: "chuushi_closure", right }],
      cohesion
    });
    if (juncture.verdict !== null) {
      junctures.set(left.splitAt, juncture);
    }
    if (
      right === null ||
      juncture.verdict === "cohesion" ||
      (juncture.verdict === "undecided" && undecidedRenyouClosureDisposition(cohesion) === "suppress")
    ) {
      continue;
    }
    const boundaryOwner = renyouClosureBoundaryOwner(tokens, idx, left.splitAt, raw, cohesion);
    closures.set(left.splitAt, {
      kind: "chuushiClosure",
      hostKind: "renyou",
      connectiveIdx: left.connectiveIdx,
      splitAt: left.splitAt,
      predicateIdx: left.predicateIdx,
      followerIdx: left.followerIdx,
      ...closureRight!,
      ...(boundaryOwner === null ? {} : { boundaryOwner })
    });
  }
  return { closures, junctures };
}

interface WhitespaceChunkBreakInputs {
  readonly events: readonly ClauseBoundaryEvent[];
  readonly nonWitnessSplits: ReadonlySet<number>;
  readonly utteranceOnsets: readonly DemoDiscourseLeftBoundaryEvidence[];
  readonly utteranceClosureRuns: ReadonlyMap<number, UtteranceClosureRunEvidence>;
  readonly detachedTerminalNodaClosures: ReadonlySet<number>;
  readonly detachedUtteranceOnsetBoundaries: ReadonlyMap<number, DetachedUtteranceOnsetEvidence>;
}

function whitespaceChunkBreakWitnessesFrom(
  tokens: readonly ClauseToken[],
  inputs: WhitespaceChunkBreakInputs
): ReadonlyMap<number, readonly WhitespaceJunctureBoundaryEvidence[]> {
  const witnesses = new Map<number, WhitespaceJunctureBoundaryEvidence[]>();
  const add = (index: number, witness: WhitespaceJunctureBoundaryEvidence): void => {
    const token = tokens[index];
    const runOrdinal = token?.whitespaceBefore?.runOrdinal;
    if (runOrdinal === undefined || token === undefined) {
      return;
    }
    const p0 = token.pos & POS0;
    if ((p0 === 助詞 || p0 === 助動詞) &&
      demoDiscourseUtteranceInitialMatchLengthAt(tokens, index) === null) {
      return;
    }
    const registered = witnesses.get(runOrdinal);
    if (registered === undefined) {
      witnesses.set(runOrdinal, [witness]);
    } else if (!registered.some((existing) => sameWhitespaceJunctureWitness(existing, witness))) {
      registered.push(witness);
    }
  };
  for (const event of inputs.events) {
    if (inputs.nonWitnessSplits.has(event.splitAt)) {
      continue;
    }
    add(event.splitAt, { kind: "boundary_event", event: event.kind });
  }
  for (const onset of inputs.utteranceOnsets) {
    add(onset.connectiveIdx, { kind: "utterance_onset" });
  }
  for (const splitAt of inputs.detachedTerminalNodaClosures) {
    add(splitAt, { kind: "detached_noda_closure" });
  }
  for (const onset of inputs.detachedUtteranceOnsetBoundaries.values()) {
    add(onset.gapIdx, { kind: "detached_utterance_onset" });
  }
  for (let index = 1; index < tokens.length; index += 1) {
    if (tokens[index]?.whitespaceBefore === undefined) {
      continue;
    }
    const closureRun = inputs.utteranceClosureRuns.get(index);
    if (closureRun !== undefined) {
      add(index, { kind: "utterance_closure_run", run: closureRun.run });
      continue;
    }
    if (hasSeparatedFinitePredicateBoundary(tokens, index)) {
      add(index, { kind: "separated_finite" });
    }
    if (hasImperativeClosureBeforeGap(tokens, index)) {
      add(index, { kind: "imperative_closure" });
    }
  }
  return witnesses;
}

function sameWhitespaceJunctureWitness(
  left: WhitespaceJunctureBoundaryEvidence,
  right: WhitespaceJunctureBoundaryEvidence
): boolean {
  if (left.kind !== right.kind) {
    return false;
  }
  if (left.kind === "boundary_event" && right.kind === "boundary_event") {
    return left.event === right.event;
  }
  if (left.kind === "utterance_closure_run" && right.kind === "utterance_closure_run") {
    return left.run === right.run;
  }
  return true;
}

function collectWhitespaceJunctures(
  tokens: readonly ClauseToken[],
  runtimeTokens: readonly RuntimeHaruToken[],
  lookups: LookupTables,
  cohesionSources: JunctureCohesionSources,
  adnominalLicenses: ReadonlyMap<number, WhitespaceAdnominalLicense>
): ReadonlyMap<number, WhitespaceJunctureEvidence> {
  const junctures = new Map<number, WhitespaceJunctureEvidence>();
  for (let gapIdx = 1; gapIdx < tokens.length; gapIdx += 1) {
    const separation = tokens[gapIdx]?.whitespaceBefore;
    const witnesses = separation?.chunkBreakWitnesses;
    if (!isWitnessedChunkBreakBefore(tokens, gapIdx) || separation?.runOrdinal === undefined || witnesses === undefined) {
      continue;
    }
    const adnominalLicense = adnominalLicenses.get(gapIdx);
    const attributiveEvent = witnesses.some((witness) =>
      witness.kind === "boundary_event" && witness.event === "attributive");
    junctures.set(gapIdx, whitespaceJunctureEvidence({
      gapIdx,
      runOrdinal: separation.runOrdinal,
      boundary: witnesses.filter((witness) =>
        !(witness.kind === "boundary_event" && witness.event === "attributive")),
      cohesion: [
        ...(attributiveEvent ? [{ kind: "attributive_event" as const }] : []),
        ...whitespaceJunctureCohesionAt(tokens, runtimeTokens, gapIdx, lookups, cohesionSources)
      ],
      ...(adnominalLicense === undefined ? {} : { adnominalLicense })
    }));
  }
  return junctures;
}

interface JunctureCohesionSources extends JunctureNominalUnitSources {
  readonly copulaConcessiveConditions: ReadonlyMap<number, CopulaConcessiveConditionEvidence>;
}

export interface JunctureNominalUnitSources {
  readonly balancedDelimiterSpans: readonly BalancedDelimiterSpan[];
  readonly bareKeijoujiAttributiveHeads: ReadonlyMap<number, BareKeijoujiAttributiveEvidence>;
}

function whitespaceJunctureCohesionAt(
  tokens: readonly ClauseToken[],
  runtimeTokens: readonly RuntimeHaruToken[],
  gapIdx: number,
  lookups: LookupTables,
  cohesionSources: JunctureCohesionSources
): readonly WhitespaceJunctureCohesionEvidence[] {
  const leftIdx = previousNonSpaceIndex(tokens, gapIdx);
  const left = leftIdx === null ? undefined : tokens[leftIdx];
  const right = tokens[gapIdx];
  if (leftIdx === null || left === undefined || right === undefined) {
    return [];
  }
  if (isJunctureBoundFollowerToken(right)) {
    return [{ kind: "bound_follower" }];
  }
  if (kaOwnershipKindAt(runtimeTokens, leftIdx, lookups) === "kadouka") {
    return [{ kind: "kadouka_complement" }];
  }
  return hostedJunctureCohesionAt(tokens, runtimeTokens, leftIdx, gapIdx, lookups, cohesionSources);
}

function hostedJunctureCohesionAt(
  tokens: readonly ClauseToken[],
  runtimeTokens: readonly RuntimeHaruToken[],
  leftIdx: number,
  gapIdx: number,
  lookups: LookupTables,
  cohesionSources: JunctureCohesionSources
): readonly (WhitespaceJunctureCohesionEvidence & PauseJunctureCohesionEvidence)[] {
  if (cohesionSources.copulaConcessiveConditions.has(leftIdx - 1)) {
    return [{ kind: "copula_concessive_condition" }];
  }
  for (const copulaIdx of [leftIdx, leftIdx - 1]) {
    const copula = copulaIdx >= 0 ? matchCopula(runtimeTokens, copulaIdx, lookups) : null;
    if (copula !== null && copulaIdx + copula.consumed > gapIdx) {
      return [{ kind: "copula_chain" }];
    }
  }
  const headIdx = gapPermeableAttributiveHeadReach(tokens, runtimeTokens, leftIdx, gapIdx, lookups, cohesionSources);
  return headIdx === null ? [] : [{ kind: "attributive_head_reach", headIdx }];
}

function isJunctureBoundFollowerToken(right: ClauseToken): boolean {
  const rightPos0 = right.pos & POS0;
  return rightPos0 === 助詞 || rightPos0 === 助動詞 || isAuxiliaryStemToken(right);
}

function collectPauseJunctures(
  tokens: readonly ClauseToken[],
  runtimeTokens: readonly RuntimeHaruToken[],
  lookups: LookupTables,
  cohesionSources: JunctureCohesionSources
): ReadonlyMap<number, PauseJunctureEvidence> {
  const junctures = new Map<number, PauseJunctureEvidence>();
  for (let gapIdx = 1; gapIdx < tokens.length; gapIdx += 1) {
    const run = tokens[gapIdx - 1]?.transparentPauseRunAfter;
    const right = tokens[gapIdx];
    if (run === undefined || right === undefined) {
      continue;
    }
    const cohesion: readonly PauseJunctureCohesionEvidence[] = isJunctureBoundFollowerToken(right)
      ? [{ kind: "bound_follower" }]
      : hostedJunctureCohesionAt(tokens, runtimeTokens, gapIdx - 1, gapIdx, lookups, cohesionSources);
    junctures.set(gapIdx, pauseJunctureEvidence({
      gapIdx,
      runOrdinal: run.ellipsisRunOrdinal,
      boundary: run.boundaryEvidence,
      cohesion
    }));
  }
  return junctures;
}

function sortedClauseBoundaryEvents(
  raw: ReadonlyMap<number, BoundaryKind>,
  pairedConcessiveBySplitAt: ReadonlyMap<number, PairedVolitionalConcessiveEvidence> = new Map(),
  attributiveModifierChainHeadBySplitAt: ReadonlyMap<number, number> = new Map(),
  renyouCompoundPrenominalSplits: ReadonlySet<number> = new Set(),
  chuushiClosureBySplitAt: ReadonlyMap<number, ChuushiClosureEvidence> = new Map()
): readonly ClauseBoundaryEvent[] {
  return [...raw.entries()]
    .sort(([left], [right]) => left - right)
    .map(([splitAt, kind]) => new ClauseBoundaryEvent(
      splitAt,
      kind,
      pairedConcessiveBySplitAt.get(splitAt),
      kind === "attributive" ? attributiveModifierChainHeadBySplitAt.get(splitAt) : undefined,
      kind === "attributive" && renyouCompoundPrenominalSplits.has(splitAt)
        ? "renyou_compound_prenominal"
        : undefined,
      kind === "connective" ? chuushiClosureBySplitAt.get(splitAt) : undefined
    ));
}

function hasQuestionContentContinuationAcrossSubjectTopicBridge(
  tokens: readonly RuntimeHaruToken[],
  kaIdx: number,
  continuationStart: number,
  layout: ProtoClauseLayout,
  lookups: LookupTables,
): boolean {
  if (!isPredicateQuestionContentKaCandidate(
    new TokenCursor(tokens, kaIdx, tokens.length, kaIdx),
    lookups,
  )) {
    return false;
  }
  const bridgeArgument = subjectTopicBridgeArgumentSpanAt(tokens, continuationStart, layout);
  if (bridgeArgument === null) {
    return false;
  }
  return looksQuestionTakingAfter(
    new TokenCursor(tokens, bridgeArgument.span.endExclusive, tokens.length, bridgeArgument.span.endExclusive),
    lookups,
    { scope: "sentence", hostCapability: "content" },
  );
}

function subjectTopicBridgeArgumentSpanAt(
  tokens: readonly RuntimeHaruToken[],
  continuationStart: number,
  layout: ProtoClauseLayout,
): NonNullable<ReturnType<typeof quoteHostSearchBridgeArgumentRelationAt>> | null {
  const clauseIndex = layout.clauseIndexOfToken(continuationStart);
  if (clauseIndex < 0) {
    return null;
  }
  const clause = layout.protoClauses[clauseIndex];
  if (clause === undefined) {
    return null;
  }
  const anchor = clause.kind === "relative"
    ? finalLeadingNominalAnchorForRelativeChain(tokens, layout, clauseIndex)
    : leadingNominalAnchorForRange(tokens, continuationStart, clause.end, {
      requirePrenominalModifier: false,
      allowArgumentParticleBoundary: true,
    });
  if (anchor === null) {
    return null;
  }
  const markerIdx = nextNonSpaceIndex(tokens, anchor.span.endExclusive);
  if (markerIdx === null) {
    return null;
  }
  const bridgeArgument = quoteHostSearchBridgeArgumentRelationAt(tokens, markerIdx, {
    headIdx: anchor.headIdx,
    consumers: ["clause_layout"],
  });
  return bridgeArgument?.argumentKind === "subject_topic"
    ? {
      ...bridgeArgument,
      span: { start: anchor.span.start, endExclusive: bridgeArgument.span.endExclusive },
    }
    : null;
}

function finalLeadingNominalAnchorForRelativeChain(
  tokens: readonly ClauseToken[],
  layout: ProtoClauseLayout,
  clauseIndex: number,
): ClauseNominalClosureAnchor | null {
  const firstClause = layout.protoClauses[clauseIndex];
  if (firstClause === undefined || firstClause.kind !== "relative") {
    return null;
  }
  const visited = new Set<number>();
  let currentClause = firstClause;
  let currentClauseIndex = clauseIndex;
  while (currentClause.kind === "relative") {
    if (visited.has(currentClauseIndex)) {
      return null;
    }
    visited.add(currentClauseIndex);
    const parentClauseIndex = currentClause.parentIdx;
    if (parentClauseIndex === null) {
      return null;
    }
    const parentClause = layout.protoClauses[parentClauseIndex];
    if (
      parentClause === undefined ||
      currentClause.end !== parentClause.start ||
      layout.clauseIndexOfToken(parentClause.start) !== parentClauseIndex
    ) {
      return null;
    }
    const parentAnchor = leadingNominalAnchorForRange(tokens, parentClause.start, parentClause.end, {
      requirePrenominalModifier: false,
      allowArgumentParticleBoundary: true,
    });
    if (parentAnchor === null) {
      return null;
    }
    if (parentClause.kind !== "relative") {
      return {
        span: {
          start: firstClause.start,
          endExclusive: parentAnchor.span.endExclusive,
        },
        headIdx: parentAnchor.headIdx,
        modifierPredicateIndices: parentAnchor.modifierPredicateIndices,
      };
    }
    currentClause = parentClause;
    currentClauseIndex = parentClauseIndex;
  }
  return null;
}

function hasImperativeClosureBeforeGap(
  tokens: readonly ClauseToken[],
  splitAt: number,
): boolean {
  const following = tokens[splitAt];
  if (following === undefined || !separatedAs(tokens, splitAt, SEPARATION_OPENS_BOUNDARY)) {
    return false;
  }
  return ((tokens[splitAt - 1]?.pos ?? 0) & POS5A) === 命令形_ && !isConditionalBaParticle(following);
}
