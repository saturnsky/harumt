
import type {
  AdverbStem,
  AdjStem,
  AttributiveBoundaryPayload,
  AspectSemanticPayload,
  AuxLayerNode,
  AuxOpNode,
  CandidateSetStem,
  HeadHypothesisCarrier,
  HeadTailEvidenceDecision,
  StemCandidate,
  ConnectiveKind,
  ConnectiveOp,
  QuoteBoundaryPayload,
  QuotativeMood,
  RetrospectiveDiscoveryStyle,
  VolitionalAttemptFocusParticle,
  RetrospectiveQuotativeFlavor,
  ModalOp,
  NounStem,
  OpSource,
  SoudaHearsayModalOp,
  SoudaReadingCandidate,
  StemCandidateRealization,
  StemMood,
  StemNode,
  SfpEffect,
  SfpNode,
  SimpleAspectOp,
  TailRoot,
  TokoroModalOp,
  TokoroReadingCandidate,
  VerbStem,
  VoiceOp,
  VoiceReadingCandidate,
  TsumoriModalOp,
  TsumoriReadingCandidate,
  MonoModalEvidence,
  MonoModalOp,
  MonoModalReading
} from "./grammar.js";
import { hostCarriesPreModalPast, nounStemInterjectionForCandidate } from "./grammar.js";
import { monoModalClauseEvidence } from "../../../semantics/mono-modal.js";
import { hasFollowingNegationAfter, isCommittedKaQuestionSfpEffect, isKaFamilyQuestionSfpEffect, quotedMoodForClosingSfpEffect } from "./grammar.js";
import { srcList } from "./source.js";
import type { Warning } from "../../../../types/warning.js";
import type { RuntimeHaruToken } from "../../../../types/token.js";
import { resolveTailEvidenceDecision } from "./tail-evidence-decision.js";
import { stemCandidateIdentitiesEqual, stemCandidateIdentity } from "./stem-candidate-identity.js";
import type { PassiveClass } from "../../../voice-class.js";

import type { ContextGrammar } from "../../../context.js";
import type {
  ClauseLayout,
  PairedVolitionalConcessiveEvidence
} from "../../../clause-layout/index.js";
import { isClauseEvidenceTransparentPunctuation } from "../../../clause-layout/punctuation.js";
import { hasTokoroAboutToSignal, hasTokoroAlmostSignal, isTokoroDesiredResultHead, isTokoroKininaruHead } from "../families/tokoro-semantics.js";
import { lookupSetMatches, type LookupTables } from "../../../lookup-tables.js";
import type { NumericTables } from "../../../../generator/numeric-lookup.js";
import { loadSuppletiveNegDict } from "../../../../generator/aux-map.js";
import { committedStemPrefersShortNegation } from "./short-negation-policy.js";
import { absorbedPassiveAuxStemMood, auxLayerConsumedSourceTokens, auxOpCarriesTypedNegation, auxOpCarriesTypedPoliteness, chainFinalOpHostCategory, negationOpAdmitsShortForm } from "./inspect.js";
import { terminalPolarityScopeStart } from "./operator-head.js";
import { getReferentForms, PredicateArgumentView } from "../../candidate/semantic-classifiers.js";
import {
  caseParticleMarkerRelationForToken,
  kaMarkerRelationAt,
  nominalizerQuestionContentConnectiveRelationAt
} from "../../boundary/marker.js";
import { hydrateBenefactivePayloads } from "./benefactive-hydration.js";
import { isSeruCausativeAuxToken, isShimeruCausativeAuxToken } from "./parser.js";
import { senseRequiresSourceEvidence } from "./frame-evidence.js";
import { quoteStructuralRelationsForHost } from "../../../structural-relation/quote.js";
import { TokenCursor } from "../../../token-cursor.js";
import { clauseContainsInterrogativeBefore, quotedSpeakerRealizationKaHostAllows } from "../../../quote/embedded-question.js";
import { hasSpeakerRealizationEvidence } from "../../../clause-layout/speech-act.js";
import { looksQuestionTakingAfterViaLayout } from "../../../quote/question-taking-enumeration.js";
import { kaFollowedByPostposedNominalMarkerAt, postposedNominalQuestionKaRelationAt, terminalQuestionKaRelationAt, uncertainCauseKaOwnedByExistingStructureAt, uncertainCauseKaRelationAt, conjectureCopulaQuestionKaClosesUtteranceAt } from "../../boundary/ka-ownership.js";
import { hasHardTerminalPunctuationClass, isBoundaryPunctuationCategoryToken } from "../../boundary/punctuation.js";
import { nextNonSpaceIndex, previousNonSpaceIndex } from "../../../clause-layout/trivia.js";
import { getReferentTokenBeforeParticle, isAnimateReferentToken } from "../../../semantics/helpers.js";
import { isKnownTailTerminalSfpSurface } from "../../../semantics/sfp-surface.js";

import { POS0, POS4, POS5A, サ行変格, 動詞, 助動詞, 助動詞_デス, 文語サ行変格, 終助詞, 連用形_, koreanNounLemma } from "../../../../types/pos.js";
import { createTenseOp, createVoiceOp } from "./op-builders.js";
export type ClauseBoundary =
  | { readonly kind: "terminal" }
  | {
    readonly kind: "接続助詞" | "合成接続" | "助動詞-タ仮定" | "助動詞-ダ仮定";
    readonly connectiveKind: ConnectiveKind;
    readonly surface: string;
    readonly surfaceAllomorph?: ConnectiveOp["allomorph"];
    readonly tokenIdx: number;
    readonly tokenSpan: { readonly start: number; readonly end: number };
    readonly quoteBoundary?: QuoteBoundaryPayload;
    readonly quotativeMood?: QuotativeMood;
    readonly retrospectiveQuotativeFlavor?: RetrospectiveQuotativeFlavor;
    readonly retrospectiveDiscoveryStyle?: RetrospectiveDiscoveryStyle;
    readonly attemptFocusParticle?: VolitionalAttemptFocusParticle;
    readonly pairedConcessive?: PairedVolitionalConcessiveEvidence;
    readonly attributiveBoundary?: AttributiveBoundaryPayload;
    readonly quotedQuestionContext?: true;
    readonly adversativeReadingAvailable?: true;
    readonly boundNominalReasonMonoNoun?: true;
  };

export interface ForeignClausePeerRoot {
  readonly kind: string;
}

export interface ClauseTailIR {
  readonly root: TailRoot | ForeignClausePeerRoot;
  readonly clauseIndex: number;
  readonly tokenSpan: { readonly start: number; readonly end: number };
  readonly contentSpan: { readonly start: number; readonly end: number };
  readonly predicateTokenIdx: number;
  readonly outgoingBoundary: ClauseBoundary;
}

export interface CommitContext {
  readonly clauseIndex?: number;
  readonly predicateTokenIdx?: number;
  readonly peerClauses?: readonly ClauseTailIR[];
  readonly ownClause?: ClauseTailIR;
  readonly tokens?: readonly RuntimeHaruToken[];
  readonly layout?: ClauseLayout;
  readonly grammar?: ContextGrammar;
  readonly lookups: LookupTables;
  readonly numeric: NumericTables;
}

export function ownClauseTailIR(ctx: CommitContext): ClauseTailIR | undefined {
  return ctx.ownClause ?? ctx.peerClauses?.[ctx.clauseIndex ?? 0];
}

export interface CommitResult {
  readonly root: TailRoot;
  readonly warnings: readonly Warning[];
}

interface CommittedOpResult {
  readonly op: AuxOpNode;
  readonly stem?: StemNode;
}

interface YatteKuruLookupToken {
  readonly surface: string;
  readonly dictionaryForm: string;
}

export function commitTail(root: TailRoot, ctx: CommitContext): CommitResult {
  const hydratedRoot = hydrateBenefactivePayloads(root, {
    tokens: ctx.tokens,
    predicateTokenIdx: benefactiveHydrationPredicateIdx(ctx),
    lookups: ctx.lookups,
    layout: ctx.layout
  });
  if (hydratedRoot.tail.kind !== "auxLayer") return { root: hydratedRoot, warnings: [] };
  const layer = hydratedRoot.tail;
  const warnings: Warning[] = [];
  const headHypothesis = hydratedRoot.headHypothesis ??
    (layer.stem.kind === "candidateSet" ? layer.stem.headHypothesis : undefined);
  const stemCommit = commitStem(
    layer.stem,
    ctx,
    warnings,
    layer,
    headHypothesis,
    hydratedRoot.headEvidenceDecision
  );
  const opsAfterCandidate = applyStemCandidateDerivedVoice(
    applyStemCandidateEffects(layer.ops, stemCommit.candidate, ctx),
    stemCommit.candidate,
    layer.stem.source
  );
  const suppletiveCommit = commitSuppletiveNegation(stemCommit.stem, opsAfterCandidate);
  const stemAfterSuppletive = suppletiveCommit?.stem ?? stemCommit.stem;
  const opsAfterStem = applyCommittedStemShortNegationPolicy(
    suppletiveCommit?.ops ?? opsAfterCandidate,
    stemAfterSuppletive,
    ctx.lookups
  );
  const structurallyCommittedOps = commitStructuralKaOwnership(opsAfterStem, ctx);
  let committedStem = stemAfterSuppletive;
  const committedOps = structurallyCommittedOps.map((op, index) => {
    const result = commitOp(op, ctx, warnings, structurallyCommittedOps, index, committedStem);
    if (result.stem !== undefined) {
      committedStem = result.stem;
    }
    return result.op;
  });
  const normalizedOps = normalizeHabitualMonoIterativeAspectOps(normalizeRedundantPoliteOverlayPastOps(
    normalizeAdjacentPotentialKotoGaDekiruOps(
      normalizeBungoCausativeSeshimeruOps(
        normalizeRedundantRareruAfterDerivedPotentialOps(
          normalizeHonorificAspectVoiceOps(committedOps)
        ),
        layer.stem.source
      )
    )
  ));
  const newOps = commitSfpClosedExemplificationOps(normalizedOps, committedStem, ctx);
  const committedSfp = commitTerminalSfp(hydratedRoot.sfp, newOps, committedStem, layer.terminal, ctx);
  if (
    committedStem === layer.stem &&
    committedSfp === hydratedRoot.sfp &&
    newOps.length === layer.ops.length &&
    newOps.every((op, i) => op === layer.ops[i])
  ) {
    return {
      root: tailRootWithHeadEvidenceDecision(hydratedRoot, stemCommit.headEvidenceDecision),
      warnings
    };
  }
  const committedLayer: AuxLayerNode = {
    ...layer,
    stem: committedStem,
    ops: newOps
  };
  return {
    root: {
      ...hydratedRoot,
      ...(stemCommit.headEvidenceDecision === undefined
        ? {}
        : { headEvidenceDecision: stemCommit.headEvidenceDecision }),
      sfp: committedSfp,
      tail: withCommittedConsumedSource(committedLayer, committedSfp, layer, hydratedRoot.sfp)
    },
    warnings
  };
}

function withCommittedConsumedSource(
  committedLayer: AuxLayerNode,
  committedSfp: TailRoot["sfp"],
  sourceLayer: AuxLayerNode,
  sourceSfp: TailRoot["sfp"]
): AuxLayerNode {
  const before = auxLayerConsumedSourceTokens(sourceLayer, sourceSfp);
  const after = auxLayerConsumedSourceTokens(committedLayer, committedSfp);
  const tokens: RuntimeHaruToken[] = [];
  const tokenIndices: number[] = [];
  for (const [tokenIndex, token] of [...before.entries()].sort(([left], [right]) => left - right)) {
    if (after.has(tokenIndex)) continue;
    tokens.push(token);
    tokenIndices.push(tokenIndex);
  }
  return tokenIndices.length === 0
    ? committedLayer
    : { ...committedLayer, consumedSource: { tokens, tokenIndices } };
}

function normalizeRedundantRareruAfterDerivedPotentialOps(
  ops: readonly AuxOpNode[]
): readonly AuxOpNode[] {
  const normalized: AuxOpNode[] = [];
  let changed = false;
  for (const op of ops) {
    const previous = normalized[normalized.length - 1];
    if (
      op.kind === "voice" && op.candidates !== undefined && op.candidates.length > 0 &&
      previous?.kind === "voice" && previous.voice === "potential" &&
      previous.candidates === undefined
    ) {
      normalized[normalized.length - 1] = {
        ...previous,
        source: srcList(
          [...previous.source.tokens, ...op.source.tokens],
          [...previous.source.tokenIndices, ...op.source.tokenIndices]
        )
      };
      changed = true;
      continue;
    }
    normalized.push(op);
  }
  return changed ? normalized : ops;
}

function normalizeBungoCausativeSeshimeruOps(
  ops: readonly AuxOpNode[],
  stemSource: OpSource
): readonly AuxOpNode[] {
  if (!isBungoSeshimeruSahenHost(stemSource)) {
    return ops;
  }
  const normalized: AuxOpNode[] = [];
  let changed = false;
  for (const op of ops) {
    const previous = normalized[normalized.length - 1];
    if (
      op.kind === "voice" && op.voice === "causative" &&
      previous?.kind === "voice" && previous.voice === "causative" &&
      isBungoShimeruCausativeSource(op.source) &&
      isBungoSeRenyouCausativeSource(previous.source)
    ) {
      normalized[normalized.length - 1] = {
        ...op,
        source: srcList(
          [...previous.source.tokens, ...op.source.tokens],
          [...previous.source.tokenIndices, ...op.source.tokenIndices]
        )
      };
      changed = true;
      continue;
    }
    normalized.push(op);
  }
  return changed ? normalized : ops;
}

function normalizeRedundantPoliteOverlayPastOps(
  ops: readonly AuxOpNode[]
): readonly AuxOpNode[] {
  const normalized: AuxOpNode[] = [];
  let changed = false;
  for (const op of ops) {
    const previous = normalized[normalized.length - 1];
    const beforePrevious = normalized[normalized.length - 2];
    if (
      op.kind === "tense" && op.tense === "past" &&
      previous?.kind === "polite" && isDesuRenyouPoliteSource(previous.source) &&
      beforePrevious?.kind === "tense" && beforePrevious.tense === "past"
    ) {
      normalized[normalized.length - 2] = {
        ...beforePrevious,
        source: srcList(
          [...beforePrevious.source.tokens, ...op.source.tokens],
          [...beforePrevious.source.tokenIndices, ...op.source.tokenIndices]
        )
      };
      changed = true;
      continue;
    }
    normalized.push(op);
  }
  return changed ? normalized : ops;
}

function isDesuRenyouPoliteSource(source: OpSource): boolean {
  const token = singleSourceToken(source);
  return token !== undefined &&
    (token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_デス) &&
    (token.pos & POS5A) === 連用形_;
}

function isBungoSeRenyouCausativeSource(source: OpSource): boolean {
  const token = singleSourceToken(source);
  return token !== undefined &&
    isSeruCausativeAuxToken(token) &&
    token.surface === "せ" &&
    (token.pos & POS5A) === 連用形_;
}

function isBungoShimeruCausativeSource(source: OpSource): boolean {
  const token = singleSourceToken(source);
  return token !== undefined && isShimeruCausativeAuxToken(token);
}

function isBungoSeshimeruSahenHost(source: OpSource): boolean {
  const token = source.tokens.at(-1);
  if (token === undefined || (token.pos & POS0) !== 動詞) {
    return false;
  }
  const conjugation = token.pos & POS4;
  return conjugation === サ行変格 || conjugation === 文語サ行変格;
}

function singleSourceToken(source: OpSource): RuntimeHaruToken | undefined {
  return source.tokens.length === 1 ? source.tokens[0] : undefined;
}

function normalizeAdjacentPotentialKotoGaDekiruOps(
  ops: readonly AuxOpNode[]
): readonly AuxOpNode[] {
  const normalized: AuxOpNode[] = [];
  let changed = false;
  for (const op of ops) {
    const previous = normalized[normalized.length - 1];
    if (
      op.kind === "idiom" && op.idiom === "potential_koto_ga_dekiru" &&
      previous?.kind === "idiom" && previous.idiom === "potential_koto_ga_dekiru" &&
      previous.particleKind === op.particleKind &&
      previous.focusParticle === op.focusParticle
    ) {
      normalized[normalized.length - 1] = {
        ...previous,
        source: srcList(
          [...previous.source.tokens, ...op.source.tokens],
          [...previous.source.tokenIndices, ...op.source.tokenIndices]
        )
      };
      changed = true;
      continue;
    }
    normalized.push(op);
  }
  return changed ? normalized : ops;
}

const DOUBLED_HONORIFIC_FOLDABLE_ASPECTS: ReadonlySet<string> = new Set(["te_kuru", "te_iku"]);

function normalizeHonorificAspectVoiceOps(ops: readonly AuxOpNode[]): readonly AuxOpNode[] {
  const normalized: AuxOpNode[] = [];
  for (let index = 0; index < ops.length; index += 1) {
    const op = ops[index]!;
    const aspect = ops[index + 1];
    if (
      op.kind === "voice" &&
      op.voice === "passive" &&
      aspect?.kind === "aspect" &&
      aspect.aspect === "te_iru"
    ) {
      const followingVoice = ops[index + 2];
      if (followingVoice?.kind === "voice" && followingVoice.voice === "honorific") {
        let lastHonorific = followingVoice;
        let lastIndex = index + 2;
        while (true) {
          const nextVoice = ops[lastIndex + 1];
          if (nextVoice?.kind !== "voice" || nextVoice.voice !== "honorific") break;
          lastHonorific = nextVoice;
          lastIndex += 1;
        }
        normalized.push(op, aspect, lastHonorific);
        index = lastIndex;
        continue;
      }
    }
    const followingVoice = ops[index + 2];
    const trailingHonorific = followingVoice?.kind === "voice" && followingVoice.voice === "honorific"
      ? followingVoice
      : undefined;
    if (
      op.kind !== "voice" ||
      op.voice !== "honorific" ||
      aspect?.kind !== "aspect" ||
      (aspect.aspect !== "te_iru" &&
        !(DOUBLED_HONORIFIC_FOLDABLE_ASPECTS.has(aspect.aspect) && trailingHonorific !== undefined))
    ) {
      normalized.push(op);
      continue;
    }
    normalized.push(aspect);
    if (trailingHonorific !== undefined) {
      normalized.push(trailingHonorific);
      index += 2;
    } else {
      normalized.push(op);
      index += 1;
    }
  }
  return normalized.every((op, index) => op === ops[index]) ? ops : normalized;
}

function commitStructuralKaOwnership(
  ops: readonly AuxOpNode[],
  ctx: CommitContext
): readonly AuxOpNode[] {
  const tokens = ctx.tokens;
  const layout = ctx.layout;
  if (tokens === undefined || layout === undefined) return ops;
  const committed: AuxOpNode[] = [];
  for (let index = 0; index < ops.length; index += 1) {
    const op = ops[index]!;
    if (op.kind !== "connective" || op.connective !== "question_content") {
      committed.push(op);
      continue;
    }
    const markerIdx = op.source.tokenIndices.at(-1);
    if (markerIdx === undefined) {
      committed.push(op);
      continue;
    }
    if (uncertainCauseKaOwnedByExistingStructureAt(tokens, markerIdx, layout, ctx.lookups)) {
      const preceding = committed.at(-1);
      if (
        preceding?.kind === "connective" &&
        (preceding.connective === "reason" || preceding.connective === "te_form")
      ) {
        committed.pop();
      }
      committed.push(op);
      continue;
    }
    const relation = uncertainCauseKaRelationAt(tokens, markerIdx, layout);
    if (relation?.evidence === "connective_clause") {
      continue;
    }
    committed.push(op);
  }
  return committed.length === ops.length && committed.every((op, index) => op === ops[index])
    ? ops
    : committed;
}

function tailRootWithHeadEvidenceDecision(
  root: TailRoot,
  decision: HeadTailEvidenceDecision | undefined
): TailRoot {
  return decision === undefined
    ? root
    : {
      ...root,
      headEvidenceDecision: decision
    };
}

function benefactiveHydrationPredicateIdx(ctx: CommitContext): number | undefined {
  const predicateIdx = ctx.predicateTokenIdx;
  if (predicateIdx === undefined || ctx.layout === undefined || ctx.layout.clauseOfPredicate(predicateIdx) !== undefined) {
    return predicateIdx;
  }
  const peer = ownClauseTailIR(ctx);
  const contentStart = peer?.predicateTokenIdx === predicateIdx ? peer.contentSpan.start : undefined;
  return contentStart !== undefined && ctx.layout.clauseOfPredicate(contentStart) !== undefined
    ? contentStart
    : predicateIdx;
}

function commitSfpClosedExemplificationOps(
  ops: readonly AuxOpNode[],
  stem: AuxLayerNode["stem"],
  ctx: CommitContext
): readonly AuxOpNode[] {
  let changed = false;
  const committed = ops.map((op, index) => {
    if (op.kind === "connective" && op.closedSfp !== undefined) {
      const closedSfp = commitTerminalSfp(op.closedSfp, ops.slice(0, index), stem, null, ctx);
      if (closedSfp === op.closedSfp || closedSfp === null) {
        return op;
      }
      changed = true;
      return { ...op, closedSfp };
    }
    if (op.kind === "predicateQuoteCarrier" && op.quotedSfp !== undefined) {
      const quotedSfp = commitTerminalSfp(op.quotedSfp, ops.slice(0, index), stem, null, ctx);
      if (quotedSfp === op.quotedSfp || quotedSfp === null) {
        return op;
      }
      changed = true;
      const quotedMood = committedQuotedSfpMood(quotedSfp.effect) ?? op.quotedChainMood;
      const { quotedMood: _parsedMood, ...rest } = op;
      return { ...rest, quotedSfp, ...(quotedMood === undefined || quotedMood === "declarative" ? {} : { quotedMood }) };
    }
    return op;
  });
  return changed ? committed : ops;
}

function committedQuotedSfpMood(effect: SfpEffect | null | undefined): "imperative" | "interrogative" | null {
  return quotedMoodForClosingSfpEffect(effect) ?? (isCommittedKaQuestionSfpEffect(effect) ? "interrogative" : null);
}

function commitTerminalSfp(
  sfp: SfpNode | null,
  ops: readonly AuxOpNode[],
  stem: AuxLayerNode["stem"],
  terminal: AuxLayerNode["terminal"],
  ctx: CommitContext
): SfpNode | null {
  if (sfp === null) {
    return bareTerminalNodaSpeakerRealizationSfp(ops, stem, terminal, ctx);
  }
  const questionRealizationEffect = sfp.effect === "ka_ne" || sfp.effect === "kai"
    ? committedQuestionEffectForKa(ops, ctx)
    : sfp.questionRealizationEffect;
  const sourceEffect = sfp.effect === "ka" ? committedQuestionEffectForKa(ops, ctx) : sfp.effect;
  const convertedEffect = sfp.unambiguousProhibitive === true
    ? sourceEffect
    : committedTerminalSfpEffect(sourceEffect, ops, stem, ctx);
  const realizationAxis: SfpNode["realizationAxis"] =
    sfp.effect === "ka" && terminalNodaKaClosesAsSpeakerRealization(sfp, ops, ctx)
      ? "noda"
      : terminalKaClosesAsSpeakerAcknowledgment(sfp, ops, ctx)
        ? "deictic_acknowledgment"
        : undefined;
  const effect = realizationAxis === undefined ? convertedEffect : "realization";
  const questionRole = committedTerminalQuestionRole(questionRealizationEffect ?? convertedEffect, ops, ctx);
  const conjectureQuestionRole = committedConjectureQuestionRole(sfp, ops, ctx);
  if (
    effect === sfp.effect &&
    realizationAxis === sfp.realizationAxis &&
    questionRealizationEffect === sfp.questionRealizationEffect &&
    questionRole === sfp.questionRole &&
    conjectureQuestionRole === sfp.conjectureQuestionRole
  ) {
    return sfp;
  }
  return {
    ...sfp,
    effect,
    ...(realizationAxis === undefined ? {} : { realizationAxis }),
    ...(questionRealizationEffect === undefined ? {} : { questionRealizationEffect }),
    ...(questionRole === undefined ? {} : { questionRole }),
    ...(conjectureQuestionRole === undefined ? {} : { conjectureQuestionRole })
  };
}

function committedConjectureQuestionRole(
  sfp: SfpNode,
  ops: readonly AuxOpNode[],
  ctx: CommitContext
): SfpNode["conjectureQuestionRole"] | undefined {
  if (!ops.some((op) => op.kind === "conjecture" || (op.kind === "copula" && op.variant === "conjecture"))) {
    return undefined;
  }
  if (isKaFamilyQuestionSfpEffect(sfp.effect) || sfp.effect === "kana") {
    return "self_directed";
  }
  if (
    (sfp.effect !== "plain_q" && sfp.effect !== "polite_q") ||
    ctx.tokens === undefined
  ) {
    return undefined;
  }
  const questionIdx = sfp.source.tokenIndices[0];
  return questionIdx !== undefined && clauseContainsInterrogativeBefore(
    ctx.tokens,
    questionIdx,
    ctx.lookups,
    ctx.layout
  )
    ? "self_directed"
    : undefined;
}

function committedTerminalSfpEffect(
  effect: SfpEffect | null,
  ops: readonly AuxOpNode[],
  stem: AuxLayerNode["stem"],
  ctx: CommitContext
): SfpEffect | null {
  if (effect !== "na_prohib") {
    return effect;
  }
  if (terminalNaShouldReadAsExclamatory(ops, stem, ctx)) {
    return "na_excl";
  }
  return effect;
}

function bareTerminalNodaSpeakerRealizationSfp(
  ops: readonly AuxOpNode[],
  stem: AuxLayerNode["stem"],
  terminal: AuxLayerNode["terminal"],
  ctx: CommitContext
): SfpNode | null {
  if (terminal === "attributive") {
    return null;
  }
  const tokens = ctx.tokens;
  const predicateStart = ctx.predicateTokenIdx;
  if (tokens === undefined || predicateStart === undefined) {
    return null;
  }
  if (!ops.some((op) => op.kind === "modal" && op.modal === "noda" && !op.polite)) {
    return null;
  }
  if (ops.some(auxOpCarriesTypedPoliteness)) {
    return null;
  }
  if (ops.some(auxOpCarriesTypedNegation)) {
    return null;
  }
  const closeIndex = terminalChainCloseIndex(ops, stem);
  if (closeIndex === null) {
    return null;
  }
  if (!hasSpeakerRealizationEvidence(tokens, predicateStart, closeIndex, {
    demoAnaphorAnchors: ctx.lookups.SPEECH_ACT_DEMO_ANAPHOR_ANCHORS,
    receiptInterjections: ctx.lookups.SPEECH_ACT_RECEIPT_INTERJECTIONS
  })) {
    return null;
  }
  return buildSpeakerRealizationSfpNode();
}

function terminalChainCloseIndex(
  ops: readonly AuxOpNode[],
  stem: AuxLayerNode["stem"]
): number | null {
  let last = -1;
  const scan = (source: OpSource | undefined): void => {
    if (source === undefined) return;
    for (const tokenIndex of source.tokenIndices) {
      if (tokenIndex > last) last = tokenIndex;
    }
  };
  scan(stem.source);
  for (const op of ops) scan(op.source);
  return last < 0 ? null : last + 1;
}

function buildSpeakerRealizationSfpNode(): SfpNode {
  return {
    effect: "realization",
    realizationAxis: "noda",
    surface: "",
    consumed: 0,
    repeatCount: 0,
    source: { tokens: [], tokenIndices: [] }
  };
}

function terminalKaClosesAsSpeakerAcknowledgment(
  sfp: SfpNode,
  ops: readonly AuxOpNode[],
  ctx: CommitContext
): boolean {
  if (!isKaFamilyQuestionSfpEffect(sfp.effect) || ops.length > 0) {
    return false;
  }
  return sfp.speakerAcknowledgment === true;
}

function terminalNodaKaClosesAsSpeakerRealization(
  sfp: SfpNode,
  ops: readonly AuxOpNode[],
  ctx: CommitContext
): boolean {
  const tokens = ctx.tokens;
  const predicateStart = ctx.predicateTokenIdx;
  if (tokens === undefined || predicateStart === undefined) {
    return false;
  }
  if (!ops.some((op) => op.kind === "modal" && op.modal === "noda" && !op.polite)) {
    return false;
  }
  if (ops.some(auxOpCarriesTypedPoliteness)) {
    return false;
  }
  const kaIdx = sfp.source.tokenIndices.at(-1);
  if (kaIdx === undefined) {
    return false;
  }
  if (!quotedSpeakerRealizationKaHostAllows(tokens, kaIdx, tokens.length, ctx.lookups)) {
    return false;
  }
  return hasSpeakerRealizationEvidence(tokens, predicateStart, kaIdx + 1, {
    demoAnaphorAnchors: ctx.lookups.SPEECH_ACT_DEMO_ANAPHOR_ANCHORS,
    receiptInterjections: ctx.lookups.SPEECH_ACT_RECEIPT_INTERJECTIONS
  });
}

function terminalNaShouldReadAsExclamatory(
  ops: readonly AuxOpNode[],
  stem: AuxLayerNode["stem"],
  ctx: CommitContext
): boolean {
  const finalSemanticOp = terminalNaFinalSemanticOp(ops);
  if (finalSemanticOp?.kind === "aspect" && finalSemanticOp.aspect === "te_iru") {
    return true;
  }
  if (ctx.grammar?.voice === "passive") {
    return false;
  }
  if (ops.some((op) => op.kind === "voice" && op.voice === "potential")) {
    return true;
  }
  if (ops.some((op) => op.kind === "voice" && op.candidates?.includes("potential") === true)) {
    return true;
  }
  if (stem.kind === "verb" && stem.lemma.endsWith("수 있다")) {
    return true;
  }
  if (stem.kind === "adj") {
    return true;
  }
  const finalScopedOp = [...ops].reverse().find((op) => op.kind !== "polite" && op.kind !== "tense");
  if (finalScopedOp?.kind === "negation") {
    return true;
  }
  if (hasExplicitInanimateSubject(ctx)) {
    return true;
  }
  return false;
}

function terminalNaFinalSemanticOp(ops: readonly AuxOpNode[]): AuxOpNode | undefined {
  let finalIdx = ops.length - 1;
  while (finalIdx >= 0 && (ops[finalIdx]?.kind === "polite" || ops[finalIdx]?.kind === "tense")) {
    finalIdx -= 1;
  }
  const finalOp = ops[finalIdx];
  if (finalOp?.kind !== "voice" || finalOp.voice !== "honorific") {
    return finalOp;
  }
  const preceding = ops[finalIdx - 1];
  return preceding?.kind === "aspect" && preceding.aspect === "te_iru"
    ? preceding
    : finalOp;
}

function hasExplicitInanimateSubject(ctx: CommitContext): boolean {
  const predicateIdx = ctx.predicateTokenIdx;
  if (predicateIdx === undefined || ctx.tokens === undefined || ctx.layout === undefined) return false;
  const clause = ctx.layout.clauseOfPredicate(predicateIdx);
  if (clause === undefined) return false;
  const referents = clause.particlesOf(predicateIdx)
    .filter((idx) => ctx.tokens?.[idx]?.surface === "が")
    .map((particleIdx) => getReferentTokenBeforeParticle(ctx.tokens!, particleIdx, ctx.lookups))
    .filter((token): token is RuntimeHaruToken => token !== null);
  return referents.length > 0 && referents.every((token) => !isAnimateReferentToken(token, ctx.lookups));
}

function committedQuestionEffectForKa(
  ops: readonly AuxOpNode[],
  ctx: CommitContext
): SfpEffect {
  if (isNegativeConfirmationQuestionOps(ops)) {
    return "neg_confirm_q";
  }
  const finalNegationIdx = findLastOpIndex(ops, "negation", terminalPolarityScopeStart(ops));
  if (finalNegationIdx >= 0) {
    const postNegConjecture = ops
      .slice(finalNegationIdx + 1)
      .find((op): op is Extract<AuxOpNode, { readonly kind: "conjecture" }> => op.kind === "conjecture");
    if (postNegConjecture !== undefined) {
      return postNegConjecture.polite ? "polite_q" : "ka";
    }
    const beforeNegation = ops.slice(0, finalNegationIdx);
    const hasPoliteBeforeNegation = beforeNegation.some(opCarriesTerminalPoliteness);
    const hasProgressiveBeforeNegation = beforeNegation.some((op) =>
      op.kind === "aspect" && op.aspect === "te_iru"
    );
    if (hasProgressiveBeforeNegation) {
      return "neg_confirm_q";
    }
    if (hasPoliteBeforeNegation) {
      if (hasReasonQuestionEvidenceBeforePredicate(ctx)) {
        return "polite_q";
      }
      return canProjectNegativePoliteQuestionAsInvitation(
        beforeNegation,
        negativeQuestionChainIsPast(ops, finalNegationIdx)
      )
        ? "neg_invite_q"
        : "polite_q";
    }
    return "neg_plain_q";
  }
  if (ops.some(opCarriesTerminalPoliteness)) {
    return "polite_q";
  }
  return "ka";
}

function opCarriesTerminalPoliteness(op: AuxOpNode): boolean {
  if (op.kind === "polite") return true;
  if (op.kind === "modal" || op.kind === "conjecture" || op.kind === "scopeBridge") {
    return op.polite;
  }
  if (op.kind === "idiom") {
    return ("polite" in op && op.polite === true);
  }
  return false;
}

function isNegativeConfirmationQuestionOps(ops: readonly AuxOpNode[]): boolean {
  const last = ops.at(-1);
  if (
    last?.kind === "scopeBridge" &&
    last.polarity === "negative" &&
    last.chainDepth === 1
  ) {
    return true;
  }
  if (
    last?.kind === "copula" &&
    last.polarity === "negative" &&
    !last.polite &&
    negativeCopulaSourceLooksConfirmatory(last.source)
  ) {
    return true;
  }
  if (last?.kind === "negation" && !last.chainPast) {
    const bridge = ops.at(-2);
    return bridge?.kind === "adjCopulaBridge" &&
      adjCopulaBridgeSourceLooksConfirmatory(bridge.source);
  }
  return false;
}

function negativeCopulaSourceLooksConfirmatory(source: OpSource): boolean {
  const surfaces = source.tokens.map((token) => token.surface);
  return surfaces.some((surface) => surface === "じゃ" || surface === "では") ||
    surfaces.some((surface) => surface === "は");
}

function adjCopulaBridgeSourceLooksConfirmatory(source: OpSource): boolean {
  const surfaces = source.tokens.map((token) => token.surface);
  return surfaces.some((surface) => surface === "じゃ" || surface === "では") ||
    surfaces.some((surface) => surface === "は");
}

function negativeQuestionChainIsPast(
  ops: readonly AuxOpNode[],
  finalNegationIdx: number
): boolean {
  const finalNegation = ops[finalNegationIdx];
  if (finalNegation?.kind === "negation" && finalNegation.chainPast) {
    return true;
  }
  return ops
    .slice(finalNegationIdx + 1)
    .some((op) => op.kind === "tense" && op.tense === "past");
}

function canProjectNegativePoliteQuestionAsInvitation(
  beforeNegation: readonly AuxOpNode[],
  past: boolean
): boolean {
  if (past) {
    return false;
  }
  const headOps = beforeNegation.filter((op) => op.kind !== "polite");
  if (headOps.length === 0) {
    return true;
  }
  const lastHead = headOps[headOps.length - 1];
  return lastHead?.kind === "aspect" &&
    (
      lastHead.aspect === "te_kureru" ||
      lastHead.aspect === "te_kudasaru" ||
      lastHead.aspect === "te_moraeru" ||
      lastHead.aspect === "te_itadakeru"
    );
}

function committedTerminalQuestionRole(
  effect: SfpEffect | null,
  ops: readonly AuxOpNode[],
  ctx: CommitContext
): SfpNode["questionRole"] | undefined {
  if (hasReasonQuestionEvidenceBeforePredicate(ctx)) {
    return undefined;
  }
  const benefactiveIdx = findLastBenefactiveOpIndex(ops);
  if (benefactiveIdx < 0) {
    return undefined;
  }
  const benefactive = ops[benefactiveIdx]!;
  if (benefactive.kind !== "aspect") {
    return undefined;
  }
  if (!benefactiveSubjectAllowsRequest(ctx)) {
    return undefined;
  }
  const tailOps = ops.slice(benefactiveIdx + 1);
  if (
    tailOps.some((op) =>
      (op.kind === "tense" && op.tense === "past") ||
      (op.kind === "negation" && op.chainPast)
    )
  ) {
    return undefined;
  }
  if (effect === "polite_q") {
    if (
      (benefactive.aspect === "te_kudasaru" || benefactive.aspect === "te_kureru") &&
      !tailOps.some((op) => op.kind === "negation")
    ) {
      return "request";
    }
    if (
      !tailOps.some((op) => op.kind === "negation") &&
      (benefactive.aspect === "te_moraeru" || benefactive.aspect === "te_itadakeru") &&
      ops.some((op) => op.kind === "voice" && op.voice === "causative")
    ) {
      return ops.slice(0, benefactiveIdx).some((op) => op.kind === "negation")
        ? "request"
        : "permission";
    }
    return undefined;
  }
  if (effect !== "neg_invite_q" && effect !== "neg_plain_q" && effect !== "plain_q") {
    return undefined;
  }
  const negativeRequest = tailOps.some((op) => op.kind === "negation");
  return negativeRequest && (benefactive.aspect === "te_kureru" ||
    benefactive.aspect === "te_kudasaru" ||
    benefactive.aspect === "te_moraeru" ||
    benefactive.aspect === "te_itadakeru")
    ? "request"
    : !negativeRequest && effect === "plain_q" && benefactive.aspect === "te_kureru"
      ? "request"
      : undefined;
}

function benefactiveSubjectAllowsRequest(ctx: CommitContext): boolean {
  const tokens = ctx.tokens;
  const layout = ctx.layout;
  const predicateIdx = benefactiveHydrationPredicateIdx(ctx);
  if (tokens === undefined || layout === undefined || predicateIdx === undefined) {
    return true;
  }
  const subjects = layout.argumentRolesOf(predicateIdx)
    .filter((argument) => argument.role === "subject_topic");
  if (subjects.length === 0) {
    return true;
  }
  return subjects.every((argument) => {
    const referent = getReferentTokenBeforeParticle(tokens, argument.particleIdx, ctx.lookups);
    if (referent === null) {
      return false;
    }
    const form = referent.dictionaryForm || referent.surface;
    return getReferentForms(form, ctx.lookups).some((candidate) =>
      ctx.lookups.SECOND_PERSON_PRONOUNS.has(candidate)
    );
  });
}

function findLastBenefactiveOpIndex(ops: readonly AuxOpNode[]): number {
  for (let idx = ops.length - 1; idx >= 0; idx -= 1) {
    const op = ops[idx];
    if (
      op?.kind === "aspect" &&
      (
        op.aspect === "te_ageru" ||
        op.aspect === "te_kureru" ||
        op.aspect === "te_kudasaru" ||
        op.aspect === "te_morau" ||
        op.aspect === "te_itadaku" ||
        op.aspect === "te_moraeru" ||
        op.aspect === "te_itadakeru"
      )
    ) {
      return idx;
    }
  }
  return -1;
}

function findLastOpIndex(
  ops: readonly AuxOpNode[],
  kind: AuxOpNode["kind"],
  fromIdx = 0
): number {
  for (let idx = ops.length - 1; idx >= fromIdx; idx -= 1) {
    if (ops[idx]?.kind === kind) {
      return idx;
    }
  }
  return -1;
}

function hasReasonQuestionEvidenceBeforePredicate(ctx: CommitContext): boolean {
  const tokens = ctx.tokens;
  const predicateIdx = ctx.predicateTokenIdx;
  if (tokens === undefined || predicateIdx === undefined) {
    return false;
  }
  const start = terminalRoleEvidenceScanStart(ctx, predicateIdx);
  let sawReason = false;
  for (let idx = start; idx < predicateIdx; idx += 1) {
    if (sawReason && isQuestionClosureBeforePredicate(tokens, idx, predicateIdx)) {
      return false;
    }
    if (isReasonQuestionToken(tokens, idx)) {
      sawReason = true;
    }
  }
  return sawReason;
}

function terminalRoleEvidenceScanStart(ctx: CommitContext, predicateIdx: number): number {
  const clause = ctx.layout?.clauses.find((candidate) =>
    candidate.start <= predicateIdx && predicateIdx < candidate.end
  );
  if (clause === undefined) {
    return ownClauseTailIR(ctx)?.contentSpan.start ?? 0;
  }
  const previousPredicate = clause.predicates
    .filter((candidate) => candidate < predicateIdx)
    .reduce((max, candidate) => Math.max(max, candidate), -1);
  return previousPredicate >= clause.start ? previousPredicate + 1 : clause.start;
}

function isQuestionClosureBeforePredicate(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  predicateIdx: number
): boolean {
  const token = tokens[idx];
  if (token === undefined) {
    return false;
  }
  if (kaMarkerRelationAt(tokens, idx, ["tail_multi_clause"]) !== null) {
    return true;
  }
  const noKa = nominalizerQuestionContentConnectiveRelationAt(tokens, idx, {
    allowTerminalKa: true,
    consumers: ["tail_multi_clause"]
  });
  const kaIdx = noKa?.span.endExclusive === undefined ? -1 : noKa.span.endExclusive - 1;
  return noKa !== null &&
    noKa.surface === "のか" &&
    kaMarkerRelationAt(tokens, kaIdx, ["tail_multi_clause"])?.particleSubtype1 === 終助詞 &&
    kaIdx < predicateIdx;
}

function isReasonQuestionToken(tokens: readonly RuntimeHaruToken[], idx: number): boolean {
  const token = tokens[idx];
  if (token === undefined) {
    return false;
  }
  const surface = token.surface;
  const lemma = token.dictionaryForm || surface;
  if (surface === "なぜ" || surface === "何故" || lemma === "なぜ" || lemma === "何故" ||
    surface === "どうして" || lemma === "どうして") {
    return true;
  }
  return (surface === "何" || surface === "なん" || lemma === "何" || lemma === "なん") &&
    caseParticleMarkerRelationForToken(tokens[idx + 1], idx + 1, {
      acceptedSurfaces: ["で"],
      consumers: ["tail_multi_clause"]
    }) !== null;
}

interface StemCommitResult {
  readonly stem: StemNode;
  readonly candidate?: StemCandidate;
  readonly headEvidenceDecision?: HeadTailEvidenceDecision;
}

function commitStem(
  stem: StemNode,
  ctx: CommitContext,
  warnings: Warning[],
  layer: AuxLayerNode,
  headHypothesis: HeadHypothesisCarrier | undefined,
  rootDecision: HeadTailEvidenceDecision | undefined
): StemCommitResult {
  const outgoingBoundary = ownClauseTailIR(ctx)?.outgoingBoundary;
  if (stem.kind !== "candidateSet") {
    const headEvidenceDecision = resolveTailEvidenceDecision({
      stem,
      ops: layer.ops,
      ...(outgoingBoundary === undefined ? {} : { outgoingBoundary }),
      terminal: layer.terminal,
      ...(layer.terminalPayload === undefined ? {} : { terminalPayload: layer.terminalPayload }),
      ...(headHypothesis === undefined ? {} : { headHypothesis }),
      ...(ctx.tokens === undefined ? {} : { tokens: ctx.tokens }),
      ...(ctx.layout === undefined ? {} : { layout: ctx.layout }),
      ...(ctx.predicateTokenIdx === undefined ? {} : { predicateTokenIdx: ctx.predicateTokenIdx })
    }) ?? undefined;
    return {
      stem,
      ...(headEvidenceDecision === undefined ? {} : { headEvidenceDecision })
    };
  }
  const winnerIdx = committedSenseCandidateIndex(stem, rootDecision, warnings);
  const winner = stem.candidates[winnerIdx]!;
  const committedStem = stem.committedSense === undefined
    ? { ...stem, committedSense: stemCandidateIdentity(winner) }
    : stem;
  return {
    stem: resolveCandidateSetStem(committedStem, {
      allowAdverbStem: committedSenseRealizationAllowsAdverbStem(committedStem),
      warnings,
      ...passiveClassOptionForDroppedPassiveAux(layer.ops),
      ...stemMoodOptionForDroppedPassiveAux(layer.ops),
      ...(committedStem.committedSenseRealization === undefined
        ? {}
        : { committedSenseRealization: committedStem.committedSenseRealization })
    }),
    candidate: winner
  };
}

function committedSenseCandidateIndex(
  stem: CandidateSetStem,
  decision: HeadTailEvidenceDecision | undefined,
  warnings: Warning[]
): number {
  const committedSense = stem.committedSense;
  if (committedSense !== undefined) {
    const index = stem.candidates.findIndex((candidate) =>
      stemCandidateIdentitiesEqual(stemCandidateIdentity(candidate), committedSense)
    );
    if (index >= 0) {
      return index;
    }
  }
  const message = committedSense === undefined
    ? "CandidateSetStem materialization requires committedSense"
    : "CandidateSetStem committedSense does not identify a candidate in this set";
  const fallbackIdentity = decision?.candidateOpenSet[0];
  const fallbackIndex = fallbackIdentity === undefined
    ? 0
    : stem.candidates.findIndex((candidate) =>
      stemCandidateIdentitiesEqual(stemCandidateIdentity(candidate), fallbackIdentity)
    );
  const winnerIndex = fallbackIndex < 0 ? 0 : fallbackIndex;
  warnings.push({
    type: "assembly_invariant",
    severity: "error",
    opKind: "stem_committed_sense",
    candidates: stem.candidates.map((candidate) => candidate.lemma),
    winner: stem.candidates[winnerIndex]?.lemma ?? "",
    message: `${message}; fallback materialized the first candidate in the decision open set.`
  });
  return winnerIndex;
}

function committedSenseRealizationAllowsAdverbStem(stem: CandidateSetStem): boolean {
  return stem.committedSenseRealization?.category === "adverbial" &&
    stem.committedSenseRealization.projectionKinds.includes("direct_adverbial");
}

function firstPassiveClassInOps(ops: readonly AuxOpNode[]): PassiveClass | undefined {
  return ops.find((op): op is VoiceOp =>
    op.kind === "voice" &&
    (op.voice === "passive" || op.voice === "causative_passive") &&
    op.passiveClass !== undefined
  )?.passiveClass;
}

function passiveClassOptionForDroppedPassiveAux(
  ops: readonly AuxOpNode[]
): { readonly passiveClassForDroppedPassiveAux?: PassiveClass } {
  const passiveClass = firstPassiveClassInOps(ops);
  return passiveClass === undefined ? {} : { passiveClassForDroppedPassiveAux: passiveClass };
}

function stemMoodOptionForDroppedPassiveAux(
  ops: readonly AuxOpNode[]
): { readonly stemMoodForDroppedPassiveAux?: StemMood } {
  const mood = absorbedPassiveAuxStemMood(ops);
  return mood === undefined ? {} : { stemMoodForDroppedPassiveAux: mood };
}

function absorbedPassiveClassForCommittedStem(options: {
  readonly inherited: PassiveClass | undefined;
  readonly dropFirstPassiveAux: boolean;
  readonly passiveClassForDroppedPassiveAux: PassiveClass | undefined;
  readonly absorbedPassiveAux: boolean;
}): PassiveClass | undefined {
  if (!options.absorbedPassiveAux) {
    return undefined;
  }
  if (options.dropFirstPassiveAux) {
    return options.passiveClassForDroppedPassiveAux ?? options.inherited;
  }
  return options.inherited;
}

function stemCandidateHasCommitEvidence(candidate: StemCandidate): boolean {
  return senseRequiresSourceEvidence(candidate);
}

function applyStemCandidateEffects(
  ops: readonly AuxOpNode[],
  candidate: StemCandidate | undefined,
  ctx?: CommitContext
): readonly AuxOpNode[] {
  let result = ops;
  if (candidate !== undefined) {
    if (candidate.dropFirstCausativeAux === true) {
      result = removeFirstOp(result, (op) => op.kind === "voice" && op.voice === "causative");
    }
    if (candidate.dropFirstPassiveAux === true) {
      result = removeFirstOp(result, (op) => op.kind === "voice" && (op.voice === "passive" || op.voice === "causative_passive"));
    }
    if (candidate.dropFirstNegativeAux === true) {
      result = dropFirstNegativeAuxOp(result);
    }
    result = applyStemCandidateAspectSemantics(result, candidate);
  }
  result = applyQuoteHostAspectSemantics(result, ctx);
  return result;
}

function applyStemCandidateDerivedVoice(
  ops: readonly AuxOpNode[],
  candidate: StemCandidate | undefined,
  source: OpSource
): readonly AuxOpNode[] {
  const voice = derivedVoiceKind(candidate);
  if (
    voice === null ||
    derivedVoicePassiveAlreadyLowered(candidate) ||
    ops.some((op) => op.kind === "voice" && op.voice === voice)
  ) {
    return ops;
  }
  const op: VoiceOp = createVoiceOp({

    source,
    voice,
    forcePassive: false,
    adversativePassive: false,
    adversativePassiveAgentPromoted: false
  });
  return [op, ...ops];
}

function derivedVoiceKind(candidate: StemCandidate | undefined): Extract<VoiceOp["voice"], "passive" | "potential" | "honorific"> | null {
  const id = candidate?.derivation?.id;
  return id === "passive" || id === "potential" || id === "honorific" ? id : null;
}

function derivedVoicePassiveAlreadyLowered(candidate: StemCandidate | undefined): boolean {
  return candidate?.derivation?.id === "passive" && candidate.dropFirstPassiveAux === true;
}

function applyCommittedStemShortNegationPolicy(
  ops: readonly AuxOpNode[],
  stem: StemNode,
  lookups: LookupTables
): readonly AuxOpNode[] {
  if (stem.kind !== "verb") {
    return ops;
  }
  const negIdx = ops.findIndex((op) => op.kind === "negation");
  if (negIdx < 0) {
    return ops;
  }
  const neg = ops[negIdx];
  if (
    neg === undefined || neg.kind !== "negation" || neg.chainDepth !== 1 ||
    !negationOpAdmitsShortForm(neg)
  ) {
    return ops;
  }
  const preferShortNegation = committedStemPrefersShortNegation(
    ops,
    stem.lemma,
    stem.shortNegationPolicy,
    lookups.LONG_NEGATION_PREFERRED_KOREAN_LEMMAS
  );
  if (neg.preferShortNegation === preferShortNegation) {
    return ops;
  }
  const result = [...ops];
  result[negIdx] = { ...neg, preferShortNegation };
  return result;
}

function applyStemCandidateAspectSemantics(
  ops: readonly AuxOpNode[],
  candidate: StemCandidate
): readonly AuxOpNode[] {
  const teIruIndex = ops.findIndex((op) => op.kind === "aspect" && op.aspect === "te_iru");
  if (teIruIndex < 0) {
    return ops;
  }
  const op = ops[teIruIndex] as SimpleAspectOp;
  const hasFollowingNegation = hasFollowingNegationAfter(ops, teIruIndex);
  const committed = commitStemCandidateAspectOp(op, candidate, hasFollowingNegation);
  if (committed === op) {
    return ops;
  }
  return ops.map((next, index) =>
    index === teIruIndex && next.kind === "aspect" && next.aspect === "te_iru"
      ? committed
      : next
  );
}

export function commitStemCandidateAspectOp(
  op: SimpleAspectOp,
  candidate: StemCandidate,
  hasFollowingNegation: boolean
): SimpleAspectOp {
  const semantic = teIruSemanticFromStemCandidate(candidate, hasFollowingNegation);
  return semantic === null ? op : { ...op, semantic };
}

function teIruSemanticFromStemCandidate(
  candidate: StemCandidate,
  hasFollowingNegation: boolean
): AspectSemanticPayload | null {
  if (candidate.teIruContractToPast === true) {
    return {
      reading: "contracted_past",
      renderStrategy: "contract_to_past",
      projection: "stative_perfect"
    };
  }
  if (candidate.teIruDropAux === true) {
    return {
      reading: "drop_aux",
      renderStrategy: "drop_aux",
      projection: "default"
    };
  }
  if (candidate.teIruResultative === true) {
    return {
      reading: "resultative_state",
      renderStrategy: hasFollowingNegation ? "negative_resultative_state" : "resultative_state",
      projection: "default"
    };
  }
  if (hasFollowingNegation && stemCandidateHasFrameId(candidate, "completion_do_noun")) {
    return {
      reading: "negative_completion",
      renderStrategy: "negative_completion",
      projection: "default"
    };
  }
  return null;
}

export function commitReportQuoteHostNegativeAspectOp(op: SimpleAspectOp): SimpleAspectOp {
  if (op.aspect !== "te_iru" || op.semantic !== undefined) {
    return op;
  }
  return {
    ...op,
    semantic: {
      reading: "negative_completion",
      role: "quote_host_report_negative",
      renderStrategy: "negative_completion",
      projection: "default"
    }
  };
}

function applyQuoteHostAspectSemantics(
  ops: readonly AuxOpNode[],
  ctx: CommitContext | undefined
): readonly AuxOpNode[] {
  if (ctx === undefined || !commitContextPredicateIsReportQuoteHost(ctx)) {
    return ops;
  }
  const teIruIndex = ops.findIndex((op) => op.kind === "aspect" && op.aspect === "te_iru");
  if (teIruIndex < 0 || !hasFollowingNegationAfter(ops, teIruIndex)) {
    return ops;
  }
  const op = ops[teIruIndex] as SimpleAspectOp;
  if (op.semantic !== undefined) {
    return ops;
  }
  return ops.map((next, index) =>
    index === teIruIndex && next.kind === "aspect" && next.aspect === "te_iru"
      ? commitReportQuoteHostNegativeAspectOp(op)
      : next
  );
}

function commitContextPredicateIsReportQuoteHost(ctx: CommitContext): boolean {
  const tokens = ctx.tokens;
  const predicateTokenIdx = ctx.predicateTokenIdx;
  if (tokens === undefined || predicateTokenIdx === undefined) {
    return false;
  }
  const cursor = new TokenCursor(tokens, predicateTokenIdx, tokens.length);
  return quoteStructuralRelationsForHost(cursor, ctx.lookups).some((relation) =>
    relation.quote.hostMatch.kind === "report"
  );
}

function stemCandidateHasFrameId(candidate: StemCandidate, frameId: string): boolean {
  return stemCandidateFrameIds(candidate).includes(frameId);
}

function stemCandidateFrameIds(candidate: StemCandidate): readonly string[] {
  const ids: string[] = [];
  collectFrameIds(candidate.senseFrame, ids);
  collectFrameIds(candidate.senseFrames, ids);
  return ids;
}

function collectFrameIds(value: unknown, ids: string[]): void {
  if (value === null || value === undefined) {
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectFrameIds(item, ids);
    }
    return;
  }
  if (typeof value !== "object") {
    return;
  }
  const record = value as { readonly id?: unknown; readonly frame?: unknown; readonly frames?: unknown };
  if (typeof record.id === "string") {
    ids.push(record.id);
  }
  collectFrameIds(record.frame, ids);
  collectFrameIds(record.frames, ids);
}

function removeFirstOp(
  ops: readonly AuxOpNode[],
  predicate: (op: AuxOpNode) => boolean
): readonly AuxOpNode[] {
  const index = ops.findIndex(predicate);
  return index < 0 ? ops : ops.filter((_, i) => i !== index);
}

function commitSuppletiveNegation(
  stem: StemNode,
  ops: readonly AuxOpNode[]
): { readonly stem: StemNode; readonly ops: readonly AuxOpNode[] } | null {
  if (stem.kind !== "verb" && stem.kind !== "adj") {
    return null;
  }
  if (stem.commitment === "suppletive_negation") {
    return null;
  }
  const suppletive = loadSuppletiveNegDict().get(stem.lemma);
  if (suppletive === undefined) {
    return null;
  }
  const first = ops[0];
  if (
    first === undefined || first.kind !== "negation" || first.chainDepth !== 1 ||
    !negationOpAdmitsShortForm(first)
  ) {
    return null;
  }
  const [lemma, irregular] = suppletive;
  const shared = {
    source: stem.source,
    conjugationAnchor: stem.conjugationAnchor,
    semanticAnchors: stem.semanticAnchors,
    commitment: "suppletive_negation" as const,
    ...(stem.sourcePredicateShape === undefined ? {} : { sourcePredicateShape: stem.sourcePredicateShape }),
    ...(stem.koreanPrefix === undefined ? {} : { koreanPrefix: stem.koreanPrefix }),
    ...(stem.koreanSuffix === undefined ? {} : { koreanSuffix: stem.koreanSuffix })
  };
  const nextStem: StemNode = lemma === "없다"
    ? { kind: "adj", lemma, irregular, ...shared }
    : stem.kind === "verb"
      ? { kind: "verb", lemma, irregular, conj: stem.conj, ...shared }
      : { kind: "adj", lemma, irregular, ...shared };
  return { stem: nextStem, ops: dropFirstNegativeAuxOp(ops) };
}

function dropFirstNegativeAuxOp(ops: readonly AuxOpNode[]): readonly AuxOpNode[] {
  const index = ops.findIndex((op) => op.kind === "negation");
  if (index < 0) {
    return ops;
  }
  const negation = ops[index];
  if (negation?.kind !== "negation") {
    return ops;
  }
  const without = ops.filter((_, i) => i !== index);
  if (!negation.chainPast || without.some((op) => op.kind === "tense" && op.tense === "past")) {
    return without;
  }
  const pastOp: AuxOpNode = createTenseOp({

    source: negation.source,
    tense: "past"
  });
  return [
    ...without.slice(0, index),
    pastOp,
    ...without.slice(index)
  ];
}

export function resolveCandidateSetLayer(layer: AuxLayerNode): AuxLayerNode {
  if (layer.stem.kind !== "candidateSet") return layer;
  const winner = layer.stem.candidates[committedSenseCandidateIndex(layer.stem, undefined, [])];
  const stem = resolveCandidateSetStem(layer.stem);
  const effected = applyStemCandidateDerivedVoice(
    applyStemCandidateEffects(layer.ops, winner, undefined),
    winner,
    layer.stem.source
  );
  const passiveIndex = stem.absorbedPassiveAux === true && winner?.dropFirstPassiveAux !== true
    ? effected.findIndex((op) => op.kind === "voice" && op.voice === "passive")
    : -1;
  const ops = passiveIndex < 0 ? effected : effected.filter((_, index) => index !== passiveIndex);
  return { ...layer, stem, ops };
}

export function resolveCandidateSetStem(
  stem: CandidateSetStem,
  options: {
    readonly allowAdverbStem?: boolean;
    readonly committedSenseRealization?: StemCandidateRealization | null;
    readonly passiveClassForDroppedPassiveAux?: PassiveClass;
    readonly stemMoodForDroppedPassiveAux?: StemMood;
    readonly warnings?: Warning[];
  } = {}
): VerbStem | AdjStem | NounStem | AdverbStem {
  const winnerIdx = committedSenseCandidateIndex(stem, undefined, options.warnings ?? []);
  const winner = stem.candidates[winnerIdx]!;
  const sharedFields = resolvedCandidateStemSharedFields(
    stem,
    winner,
    options.passiveClassForDroppedPassiveAux,
    options.stemMoodForDroppedPassiveAux
  );
  const winnerStemKind = stemKindForSelectedCandidateRealization(stem, winner, options);
  if (winnerStemKind === "verb") {
    return {
      kind: "verb",
      lemma: winner.lemma,
      conj: winner.conj ?? "godan",
      irregular: winner.irregular,
      ...sharedFields
    };
  }
  if (winnerStemKind === "noun") {
    const lemma = koreanNounLemma(winner.lemma, winner.koreanPos, winner.nominalized);
    return {
      kind: "noun",
      lemma,
      ...(lemma === winner.lemma ? {} : { nominalizedFrom: "predicate" as const }),
      ...(winner.nominalTargetForVerbalSource === true
        ? { nominalTargetForVerbalSource: true as const }
        : {}),
      ...((options.committedSenseRealization ?? stem.committedSenseRealization)?.projectionKinds
        .includes("adverbial_nominal_fallback") === true
        ? { adverbialNominalFallback: true as const }
        : {}),
      ...nounStemInterjectionForCandidate(winner),
      sahen: false,
      ...sharedFields
    };
  }
  if (winnerStemKind === "adverb") {
    return {
      kind: "adverb",
      lemma: winner.lemma,
      ...sharedFields
    };
  }
  return {
    kind: "adj",
    lemma: winner.lemma,
    irregular: winner.irregular,
    ...sharedFields
  };
}

function stemKindForSelectedCandidateRealization(
  stem: CandidateSetStem,
  winner: CandidateSetStem["candidates"][number],
  options: {
    readonly allowAdverbStem?: boolean;
    readonly committedSenseRealization?: StemCandidateRealization | null;
    readonly warnings?: Warning[];
  }
): "verb" | "adj" | "noun" | "adverb" {
  const category = options.committedSenseRealization?.category ?? stem.committedSenseRealization?.category;
  if (category === "verbal_predicate") {
    return "verb";
  }
  if (category === "adjectival_predicate") {
    return "adj";
  }
  if (category === "nominal") {
    return "noun";
  }
  if (category === "adverbial") {
    return options.allowAdverbStem === true ? "adverb" : "noun";
  }
  switch (stem.sourcePredicateShape) {
    case "i_adjective":
      return winner.nominalTargetForVerbalSource === true ? "noun" : "adj";
    case "na_adjective":
      return "adj";
    case "verb":
    case "sahen_verbalization":
      return "verb";
    case "nominal":
    case "particle_phrase":
      return "noun";
    case "lexical_adverb":
      return options.allowAdverbStem === true ? "adverb" : "noun";
    default:
      return missingSourcePredicateShapeFallback(options.warnings);
  }
}

function missingSourcePredicateShapeFallback(warnings: Warning[] | undefined): "noun" {
  const message = "CandidateSetStem collapse requires a selected realization category or source predicate shape";
  warnings?.push({
    type: "assembly_invariant",
    severity: "error",
    opKind: "stem_source_predicate_shape",
    winner: "noun",
    message: `${message}; fallback conservatively materialized a noun stem.`
  });
  return "noun";
}

function resolvedCandidateStemSharedFields(
  stem: CandidateSetStem,
  winner: CandidateSetStem["candidates"][number],
  passiveClassForDroppedPassiveAux: PassiveClass | undefined,
  stemMoodForDroppedPassiveAux: StemMood | undefined
) {
  const koreanPrefix = combineStemPrefix(stem.koreanPrefix, winner.koreanPrefix);
  const koreanSuffix = combineStemSuffix(stem.koreanSuffix, winner.koreanSuffix);
  const commitment = winner.dropFirstNegativeAux === true
    ? "suppletive_negation"
    : !stemCandidateHasCommitEvidence(winner)
      ? stem.commitment
      : "resolved_sense";
  const shortNegationPolicy = winner.shortNegationPolicy ?? stem.shortNegationPolicy;
  const absorbedPassiveAux = winner.dropFirstPassiveAux === true || stem.absorbedPassiveAux === true;
  const absorbedPassiveClass = absorbedPassiveClassForCommittedStem({
    inherited: stem.absorbedPassiveClass,
    dropFirstPassiveAux: winner.dropFirstPassiveAux === true,
    passiveClassForDroppedPassiveAux,
    absorbedPassiveAux
  });
  const stemMood = stem.stemMood ??
    (winner.dropFirstPassiveAux === true ? stemMoodForDroppedPassiveAux : undefined);
  return {
    source: stem.source,
    conjugationAnchor: stem.conjugationAnchor,
    semanticAnchors: stem.semanticAnchors,
    ...(stemMood === undefined ? {} : { stemMood }),
    ...(commitment === undefined ? {} : { commitment }),
    ...(shortNegationPolicy === undefined ? {} : { shortNegationPolicy }),
    ...(absorbedPassiveAux ? { absorbedPassiveAux: true as const } : {}),
    ...(absorbedPassiveClass === undefined ? {} : { absorbedPassiveClass }),
    ...(stem.sourcePredicateShape === undefined ? {} : { sourcePredicateShape: stem.sourcePredicateShape }),
    ...(koreanPrefix === undefined ? {} : { koreanPrefix }),
    ...(koreanSuffix === undefined ? {} : { koreanSuffix })
  };
}

function combineStemPrefix(parentPrefix: string | undefined, winnerPrefix: string | undefined): string | undefined {
  const value = `${parentPrefix ?? ""}${winnerPrefix ?? ""}`;
  return value.length === 0 ? undefined : value;
}

function combineStemSuffix(parentSuffix: string | undefined, winnerSuffix: string | undefined): string | undefined {
  const value = `${winnerSuffix ?? ""}${parentSuffix ?? ""}`;
  return value.length === 0 ? undefined : value;
}

function commitOp(
  op: AuxOpNode,
  ctx: CommitContext,
  warnings: Warning[],
  ops: readonly AuxOpNode[],
  index: number,
  stem: StemNode
): CommittedOpResult {
  if (op.kind === "connective" && op.connective === "question_content") {
    return { op: commitQuestionContentRole(op, ctx, stem, ops) };
  }
  if (op.kind === "voice" && op.candidates !== undefined) {
    if (isPassiveVoiceAfterCausative(op, ops, index)) {
      const { candidates: _candidates, ...deterministic } = op;
      return { op: deterministic };
    }
    return { op: commitVoiceReading(op, ctx, warnings, contextualVoiceReading(op, ops, index)) };
  }
  if (op.kind === "modal") {
    return { op: commitModalReading(op, ctx, warnings, ops, index, stem) };
  }
  if (op.kind === "aspect" && op.aspect === "te_iru") {
    return { op: commitMadaActiveTeIruNegativeCompletion(op, ctx, ops, index, stem) };
  }
  if (op.kind === "aspect" && op.aspect === "te_kuru") {
    return commitYatteKuruLexicalizedArrival(op, ctx, ops, index, stem) ?? { op };
  }
  if (op.kind === "postverbAuxiliary" && op.auxiliary.kind === "potential") {
    return {
      op: commitPotentialComposition(op, ctx.grammar?.dekiruReading)
    };
  }
  return { op };
}

export function commitPotentialComposition(
  op: Extract<AuxOpNode, { readonly kind: "postverbAuxiliary" }>,
  dekiruReading: ContextGrammar["dekiruReading"] | undefined
): Extract<AuxOpNode, { readonly kind: "postverbAuxiliary" }> {
  if (
    op.auxiliary.kind !== "potential" ||
    dekiruReading !== "ability" ||
    op.potentialComposition === "reinforce_existing"
  ) {
    return op;
  }
  return { ...op, potentialComposition: "reinforce_existing" };
}

function commitQuestionContentRole(
  op: Extract<AuxOpNode, { readonly kind: "connective" }>,
  ctx: CommitContext,
  stem: StemNode,
  ops: readonly AuxOpNode[],
): Extract<AuxOpNode, { readonly kind: "connective" }> {
  if (op.questionContentRole === "terminal") {
    return op;
  }
  const markerIdx = op.source.tokenIndices.at(-1);
  if (markerIdx === undefined || ctx.tokens === undefined || ctx.layout === undefined) {
    return op;
  }
  const followerIdx = nextNonSpaceIndex(ctx.tokens, markerIdx + 1, ctx.tokens.length);
  const immediateFollower = followerIdx === null ? undefined : ctx.tokens[followerIdx];
  if (conjectureCopulaQuestionKaClosesUtteranceAt(ctx.tokens, markerIdx, ctx.lookups)) {
    return commitQuestionContentRoleOp(op, "terminal");
  }
  if (
    immediateFollower !== undefined &&
    isClauseEvidenceTransparentPunctuation(immediateFollower) &&
    ops.some((candidate) => candidate.kind === "modal" && candidate.modal === "noda") &&
    ops.some((candidate) => candidate.kind === "conjecture")
  ) {
    return commitQuestionContentRoleOp(op, "terminal");
  }
  if (kaFollowedByPostposedNominalMarkerAt(ctx.tokens, markerIdx)) {
    return commitQuestionContentRoleOp(op, "embedded");
  }
  if (stem.kind === "noun" && postposedNominalQuestionKaRelationAt(ctx.tokens, markerIdx, ctx.layout) !== null) {
    return commitQuestionContentRoleOp(op, "terminal");
  }
  if (stem.kind !== "noun") {
    if (looksQuestionTakingAfterViaLayout(
      ctx.layout,
      ctx.tokens,
      markerIdx + 1,
      ctx.tokens.length,
      ctx.lookups,
      { traverseMatrixArguments: true }
    )) {
      return commitQuestionContentRoleOp(op, "embedded");
    }
    const terminal = terminalQuestionKaRelationAt(ctx.tokens, markerIdx, {
      ownedByExistingStructure: op.ownedByStructuralKaParallel === true,
      lookups: ctx.lookups,
    });
    const hasExplicitQuestionBoundary = followerIdx !== null && hasHardTerminalPunctuationClass(
      ctx.tokens[followerIdx],
      followerIdx,
      ["question", "exclamation"],
      ["clause_layout"]
    );
    const closesUtterance = terminal !== null &&
      (terminal.evidence === "volitional_host" || terminal.evidence === "polite_host");
    return terminal !== null && (closesUtterance || hasExplicitQuestionBoundary)
      ? commitQuestionContentRoleOp(op, "terminal")
      : op;
  }
  if (looksQuestionTakingAfterViaLayout(
    ctx.layout,
    ctx.tokens,
    markerIdx + 1,
    ctx.tokens.length,
    ctx.lookups,
    { traverseMatrixArguments: true }
  )) {
    return commitQuestionContentRoleOp(op, "embedded");
  }
  const terminal = terminalQuestionKaRelationAt(ctx.tokens, markerIdx, {
    ownedByExistingStructure: op.ownedByStructuralKaParallel === true,
    lookups: ctx.lookups,
  });
  const clause = ctx.layout.clauseOfToken(markerIdx);
  const clauseTerminalIdx = clause === undefined ? null : previousNonSpaceIndex(ctx.tokens, clause.end);
  const hasExplicitQuestionBoundary = clauseTerminalIdx !== null && hasHardTerminalPunctuationClass(
    ctx.tokens[clauseTerminalIdx],
    clauseTerminalIdx,
    ["question", "exclamation"],
    ["clause_layout"]
  );
  if (terminal !== null || hasExplicitQuestionBoundary) {
    return commitQuestionContentRoleOp(op, "terminal");
  }
  const follower = followerIdx === null ? undefined : ctx.tokens[followerIdx];
  const hasTerminalSfpFollower = follower !== undefined && isKnownTailTerminalSfpSurface(follower);
  if (
    follower !== undefined &&
    (isBoundaryPunctuationCategoryToken(follower) || hasTerminalSfpFollower)
  ) {
    return commitQuestionContentRoleOp(op, "terminal");
  }
  return commitQuestionContentRoleOp(op, "embedded");
}

export function commitQuestionContentRoleOp(
  op: Extract<AuxOpNode, { readonly kind: "connective" }>,
  role: "embedded" | "terminal"
): Extract<AuxOpNode, { readonly kind: "connective" }> {
  return op.questionContentRole === role ? op : { ...op, questionContentRole: role };
}

function commitMadaActiveTeIruNegativeCompletion(
  op: SimpleAspectOp,
  ctx: CommitContext,
  ops: readonly AuxOpNode[],
  index: number,
  stem: StemNode
): SimpleAspectOp {
  if (op.semantic !== undefined || !hasFollowingNegationAfter(ops, index) || stem.kind !== "verb") {
    return op;
  }
  if (ops.slice(0, index).some((candidate) => candidate.kind === "voice")) {
    return op;
  }
  const dictForm = stemSourceDictionaryForm(stem);
  if (!sameClauseMadaBeforePredicate(ctx) || !hasMadaActiveCompletionPatientEvidence(ctx, dictForm)) {
    return op;
  }
  return {
    ...op,
    semantic: {
      reading: "negative_completion",
      role: "mada_active_completion",
      renderStrategy: "negative_completion",
      projection: "default"
    }
  };
}

function sameClauseMadaBeforePredicate(ctx: CommitContext): boolean {
  const tokens = ctx.tokens;
  const predicateIdx = ctx.predicateTokenIdx;
  const clause = predicateIdx === undefined ? undefined : ctx.layout?.clauseOfPredicate(predicateIdx);
  if (tokens === undefined || predicateIdx === undefined || clause === undefined) {
    return false;
  }
  const start = terminalRoleEvidenceScanStart(ctx, predicateIdx);
  for (let idx = Math.max(clause.start, start); idx < predicateIdx; idx += 1) {
    const token = tokens[idx];
    if (token === undefined) {
      continue;
    }
    const lemma = token.dictionaryForm || token.surface;
    if (token.surface === "まだ" || lemma === "まだ" || token.surface === "未だ" || lemma === "未だ") {
      return true;
    }
  }
  return false;
}

function hasMadaActiveCompletionPatientEvidence(ctx: CommitContext, dictForm: string | null): boolean {
  const tokens = ctx.tokens;
  const predicateIdx = ctx.predicateTokenIdx;
  if (tokens === undefined || predicateIdx === undefined || ctx.layout === undefined) {
    return false;
  }
  const topicAllowed = dictForm !== null && ctx.lookups.TE_IRU_MADA_ACTIVE_COMPLETION_TOPIC_VERBS.has(dictForm);
  return new PredicateArgumentView(tokens, predicateIdx, {
    lookups: ctx.lookups,
    layout: ctx.layout
  }).arguments().some((argument) => {
    const surface = argument.particle.surface;
    return surface === "を" || (topicAllowed && (surface === "は" || surface === "も"));
  });
}

function commitYatteKuruLexicalizedArrival(
  op: SimpleAspectOp,
  ctx: CommitContext,
  ops: readonly AuxOpNode[],
  index: number,
  stem: StemNode
): CommittedOpResult | null {
  if (stem.kind !== "verb" || !isYaruSourceStem(stem, ctx)) {
    return null;
  }
  if (index !== 0) {
    return null;
  }
  if (op.semantic !== undefined && op.semantic.reading !== "generic") {
    return null;
  }
  const tokens = ctx.tokens;
  const predicateIdx = ctx.predicateTokenIdx;
  if (tokens === undefined || predicateIdx === undefined || ctx.layout === undefined) {
    return null;
  }
  const argumentsForYaru = new PredicateArgumentView(tokens, predicateIdx, {
    lookups: ctx.lookups,
    layout: ctx.layout
  }).arguments();
  const hasOwnedObject = argumentsForYaru.some((argument) => argument.particle.surface === "を");
  if (hasOwnedObject) {
    return null;
  }
  const hasArrivalArgument = argumentsForYaru.some((argument) => isYatteKuruArrivalArgument(argument, ctx));
  const hasNonTemporalArrivalArgument = argumentsForYaru.some((argument) =>
    isYatteKuruArrivalArgument(argument, ctx) && !isYatteKuruTemporalSourceArgument(argument, ctx)
  );
  const hasContinuationCue = !hasNonTemporalArrivalArgument &&
    (sameClauseHasYatteKuruContinuationCue(ctx) || sameClauseHasYatteKuruTemporalSourceCue(ctx));
  const hasCompositionalArgument = !hasNonTemporalArrivalArgument && argumentsForYaru.some((argument) =>
    isYatteKuruCompositionalArgument(argument, ctx)
  );
  const hasCompositionalAttributiveHead =
    !hasNonTemporalArrivalArgument && hasYatteKuruCompositionalAttributiveHead(ctx, argumentsForYaru);
  const hasPotential = ops.slice(index + 1).some((candidate) =>
    candidate.kind === "voice" && candidate.voice === "potential"
  );
  const hasBareImperative = op.terminalMood === "imperative" && !hasArrivalArgument;
  if (
    hasContinuationCue ||
    hasCompositionalArgument ||
    hasCompositionalAttributiveHead ||
    (hasPotential && !hasArrivalArgument) ||
    hasBareImperative
  ) {
    return null;
  }
  return {
    stem: {
      ...stem,
      lemma: "찾아오다",
      irregular: null
    },
    op: {
      ...op,
      semantic: {
        reading: "lexicalized_motion",
        candidates: ["lexicalized_motion", "generic"],
        role: "yatte_kuru_arrival",
        renderStrategy: "drop_aux",
        projection: "default"
      }
    }
  };
}

function isYaruSourceStem(stem: StemNode, ctx: CommitContext): boolean {
  const form = stemSourceDictionaryForm(stem);
  return form !== null && ctx.lookups.TE_KURU_YARU_SOURCE_LEMMAS.has(form);
}

function isYatteKuruArrivalArgument(
  argument: ReturnType<PredicateArgumentView["arguments"]>[number],
  ctx: CommitContext
): boolean {
  const particle = argument.particle.surface;
  if (!ctx.lookups.TE_KURU_YARU_ARRIVAL_PARTICLES.has(particle)) {
    return false;
  }
  if (particle === "に") {
    if (argumentMatchesYatteKuruLookup(argument, ctx.lookups.TE_KURU_YARU_NONARRIVAL_NI_REFERENTS)) {
      return false;
    }
    return true;
  }
  if (particle === "から") {
    const referent = argument.referent;
    if (referent === null) {
      return true;
    }
    return !argumentMatchesYatteKuruLookup(argument, ctx.lookups.TE_KURU_YARU_NONARRIVAL_KARA_REFERENTS) &&
      !argumentMatchesYatteKuruLookup(argument, ctx.lookups.TEMPORAL_NOUNS) &&
      !argumentMatchesYatteKuruLookup(argument, ctx.lookups.TEMPORAL_COUNTER_NOUNS) &&
      !yatteKuruArgumentPreviousTokenMatches(argument, ctx, ctx.lookups.TEMPORAL_COUNTER_NOUNS);
  }
  if (particle !== "まで") {
    return true;
  }
  const referent = argument.referent;
  if (referent === null) {
    return true;
  }
  const surface = referent.surface;
  const lemma = referent.dictionaryForm || surface;
  return !ctx.lookups.TE_KURU_YARU_NONARRIVAL_MADE_REFERENTS.has(surface) &&
    !ctx.lookups.TE_KURU_YARU_NONARRIVAL_MADE_REFERENTS.has(lemma);
}

function isYatteKuruTemporalSourceArgument(
  argument: ReturnType<PredicateArgumentView["arguments"]>[number],
  ctx: CommitContext
): boolean {
  return argument.particle.surface === "から" &&
    (
      argumentMatchesYatteKuruLookup(argument, ctx.lookups.TE_KURU_YARU_NONARRIVAL_KARA_REFERENTS) ||
      argumentMatchesYatteKuruLookup(argument, ctx.lookups.TEMPORAL_NOUNS) ||
      argumentMatchesYatteKuruLookup(argument, ctx.lookups.TEMPORAL_COUNTER_NOUNS) ||
      yatteKuruArgumentPreviousTokenMatches(argument, ctx, ctx.lookups.TEMPORAL_COUNTER_NOUNS)
    );
}

function isYatteKuruCompositionalArgument(
  argument: ReturnType<PredicateArgumentView["arguments"]>[number],
  ctx: CommitContext
): boolean {
  if (!isYatteKuruDomainDeParticle(argument, ctx) || argument.referent === null) {
    return false;
  }
  return argumentMatchesYatteKuruLookup(argument, ctx.lookups.TE_KURU_YARU_COMPOSITIONAL_DE_REFERENTS);
}

function isYatteKuruDomainDeParticle(
  argument: ReturnType<PredicateArgumentView["arguments"]>[number],
  ctx: CommitContext
): boolean {
  const surface = argument.particle.surface;
  if (surface === "で" || surface === "でも") {
    return true;
  }
  if (surface !== "も") {
    return false;
  }
  return ctx.tokens?.[argument.particleIdx - 1]?.surface === "で";
}

function hasYatteKuruCompositionalAttributiveHead(
  ctx: CommitContext,
  argumentsForYaru: readonly ReturnType<PredicateArgumentView["arguments"]>[number][]
): boolean {
  const head = yatteKuruAttributiveParentHead(ctx);
  if (
    head === null ||
    !tokenMatchesYatteKuruLookup(head, ctx.lookups.TE_KURU_YARU_COMPOSITIONAL_ATTRIBUTIVE_HEADS)
  ) {
    return false;
  }
  const hasSubjectOrTopic = argumentsForYaru.some((argument) => isSubjectOrTopicParticle(argument.particle.surface));
  if (!hasSubjectOrTopic) {
    return true;
  }
  return argumentsForYaru.some((argument) =>
    isSubjectOrTopicParticle(argument.particle.surface) &&
    argument.referent !== null &&
    tokenMatchesYatteKuruLookup(argument.referent, ctx.lookups.TE_KURU_YARU_COMPOSITIONAL_SUBJECT_REFERENTS)
  );
}

function yatteKuruAttributiveParentHead(ctx: CommitContext): RuntimeHaruToken | null {
  const tokens = ctx.tokens;
  const predicateIdx = ctx.predicateTokenIdx;
  const layout = ctx.layout;
  if (tokens === undefined || predicateIdx === undefined || layout === undefined) {
    return null;
  }
  const clause = layout.clauseOfPredicate(predicateIdx);
  const clauseIdx = layout.clauseIndexOfPredicate(predicateIdx);
  if (clause === undefined || clauseIdx === undefined || clause.kind !== "relative") {
    return null;
  }
  const parent = layout.parentOf(clauseIdx);
  if (parent === undefined || parent.start !== clause.end) {
    return null;
  }
  return tokens[parent.start] ?? null;
}

function isSubjectOrTopicParticle(surface: string): boolean {
  return surface === "が" || surface === "は" || surface === "も";
}

function tokenMatchesYatteKuruLookup(token: YatteKuruLookupToken, lookup: ReadonlySet<string>): boolean {
  const surface = token.surface;
  const lemma = token.dictionaryForm || surface;
  return lookupSetMatches(lookup, surface) || lookupSetMatches(lookup, lemma);
}

function argumentMatchesYatteKuruLookup(
  argument: ReturnType<PredicateArgumentView["arguments"]>[number],
  lookup: ReadonlySet<string>
): boolean {
  return (argument.referent !== null && tokenMatchesYatteKuruLookup(argument.referent, lookup)) ||
    (argument.noun !== null && tokenMatchesYatteKuruLookup(argument.noun, lookup));
}

function yatteKuruArgumentPreviousTokenMatches(
  argument: ReturnType<PredicateArgumentView["arguments"]>[number],
  ctx: CommitContext,
  lookup: ReadonlySet<string>
): boolean {
  const tokens = ctx.tokens;
  if (tokens === undefined) {
    return false;
  }
  const previous = tokens[argument.particleIdx - 1];
  const beforePrevious = tokens[argument.particleIdx - 2];
  return (previous !== undefined && tokenMatchesYatteKuruLookup(previous, lookup)) ||
    (beforePrevious !== undefined && tokenMatchesYatteKuruLookup(beforePrevious, lookup));
}

function sameClauseHasYatteKuruContinuationCue(ctx: CommitContext): boolean {
  const tokens = ctx.tokens;
  const predicateIdx = ctx.predicateTokenIdx;
  const clause = predicateIdx === undefined ? undefined : ctx.layout?.clauseOfPredicate(predicateIdx);
  if (tokens === undefined || predicateIdx === undefined || clause === undefined) {
    return false;
  }
  const start = clause.start;
  for (let idx = start; idx < predicateIdx; idx += 1) {
    const token = tokens[idx];
    if (token === undefined) {
      continue;
    }
    if (tokenMatchesYatteKuruCue(token, ctx)) {
      return true;
    }
    const prev = idx > start ? tokens[idx - 1] : undefined;
    if (prev !== undefined && combinedTokensMatchYatteKuruCue(prev, token, ctx)) {
      return true;
    }
  }
  return false;
}

function sameClauseHasYatteKuruTemporalSourceCue(ctx: CommitContext): boolean {
  const tokens = ctx.tokens;
  const predicateIdx = ctx.predicateTokenIdx;
  const clause = predicateIdx === undefined ? undefined : ctx.layout?.clauseOfPredicate(predicateIdx);
  if (tokens === undefined || predicateIdx === undefined || clause === undefined) {
    return false;
  }
  for (let idx = clause.start; idx < predicateIdx; idx += 1) {
    const token = tokens[idx];
    if (token === undefined || token.surface !== "から") {
      continue;
    }
    const previous = tokens[idx - 1];
    const beforePrevious = tokens[idx - 2];
    if (
      (previous !== undefined && (
        tokenMatchesYatteKuruLookup(previous, ctx.lookups.TE_KURU_YARU_NONARRIVAL_KARA_REFERENTS) ||
        tokenMatchesYatteKuruLookup(previous, ctx.lookups.TEMPORAL_NOUNS) ||
        tokenMatchesYatteKuruLookup(previous, ctx.lookups.TEMPORAL_COUNTER_NOUNS)
      )) ||
      (beforePrevious !== undefined && tokenMatchesYatteKuruLookup(beforePrevious, ctx.lookups.TEMPORAL_COUNTER_NOUNS))
    ) {
      return true;
    }
  }
  return false;
}

function tokenMatchesYatteKuruCue(token: RuntimeHaruToken, ctx: CommitContext): boolean {
  const surface = token.surface;
  const lemma = token.dictionaryForm || surface;
  return ctx.lookups.TE_KURU_YARU_CONTINUATION_CUES.has(surface) ||
    ctx.lookups.TE_KURU_YARU_CONTINUATION_CUES.has(lemma);
}

function combinedTokensMatchYatteKuruCue(
  left: RuntimeHaruToken,
  right: RuntimeHaruToken,
  ctx: CommitContext
): boolean {
  const leftSurface = left.surface;
  const rightSurface = right.surface;
  const leftLemma = left.dictionaryForm || leftSurface;
  const rightLemma = right.dictionaryForm || rightSurface;
  const cues = ctx.lookups.TE_KURU_YARU_CONTINUATION_CUES;
  return cues.has(`${leftSurface}${rightSurface}`) ||
    cues.has(`${leftLemma}${rightLemma}`);
}

function stemSourceDictionaryForm(stem: StemNode): string | null {
  const token = stem.source.tokens.at(-1);
  const form = token?.dictionaryForm || token?.surface || "";
  return form.length === 0 ? null : form;
}

function isPassiveVoiceAfterCausative(op: VoiceOp, ops: readonly AuxOpNode[], index: number): boolean {
  const prev = ops[index - 1];
  return op.voice === "passive" && prev?.kind === "voice" && prev.voice === "causative";
}

function commitModalReading(
  op: ModalOp,
  ctx: CommitContext,
  warnings: Warning[],
  ops: readonly AuxOpNode[],
  index: number,
  stem: StemNode
): ModalOp {
  if (op.modal === "tokoro" && op.candidates !== undefined) {
    return commitTokoroReading(op, ctx, warnings, ops, index, stem);
  }
  if (op.modal === "souda_hearsay" && op.candidates !== undefined) {
    return commitSoudaReading(op, ctx, warnings);
  }
  if (op.modal === "tsumori") {
    return commitTsumoriReading(op, ops, index);
  }
  if (op.modal === "mono") {
    return commitMonoReading(op, ops, index, monoModalCommitEvidence(op, ctx));
  }
  return op;
}

function contextualVoiceReading(
  op: VoiceOp,
  ops: readonly AuxOpNode[],
  index: number
): VoiceReadingCandidate | null {
  if (op.candidates?.includes("potential") !== true) {
    return null;
  }
  const previous = ops[index - 1];
  if (previous?.kind === "aspect" && previous.aspect === "te_iru") {
    return previous.followingRareruReading ?? "potential";
  }
  return null;
}

function commitVoiceReading(
  op: VoiceOp,
  ctx: CommitContext,
  warnings: Warning[],
  contextualWinner: VoiceReadingCandidate | null = null
): VoiceOp {
  if (op.candidates === undefined || op.candidates.length === 0) return op;
  const grammarWinner = voiceReadingFromGrammar(ctx.grammar?.voice, op.candidates);
  const winner: VoiceReadingCandidate = contextualWinner ?? grammarWinner ?? op.candidates[0]!;
  if (op.candidates.length > 1 && contextualWinner === null && grammarWinner === null) {
    warnings.push({
      type: "ambiguity_default",
      severity: "info",
      opKind: "voice_reading",
      candidates: op.candidates,
      winner,
      message: `助動詞-レル 의 reading ambiguity (${op.candidates.join("/")}) — commit phase default winner = ${winner}.`
    });
  }
  if (op.voice === winner) return op;
  return { ...op, voice: winner };
}

function voiceReadingFromGrammar(
  voice: ContextGrammar["voice"] | undefined,
  candidates: readonly VoiceReadingCandidate[]
): VoiceReadingCandidate | null {
  if (voice === undefined || voice === null) {
    return null;
  }
  const values = typeof voice === "string" ? [voice] : voice;
  const narrowed = values.filter((value): value is VoiceReadingCandidate =>
    (value === "passive" || value === "potential" || value === "honorific") &&
    candidates.includes(value)
  );
  return narrowed.length === 1 ? narrowed[0]! : null;
}

function commitTokoroReading(
  op: TokoroModalOp,
  ctx: CommitContext,
  warnings: Warning[],
  ops: readonly AuxOpNode[],
  index: number,
  stem: StemNode
): TokoroModalOp {
  if (op.candidates === undefined || op.candidates.length === 0) return op;
  const committed = commitTokoroByDeterministicEvidence(op, ctx, ops, index, stem);
  const winner: TokoroReadingCandidate = committed.reading ?? op.candidates[0]!;
  if (op.candidates.length > 1) {
    warnings.push({
      type: "ambiguity_default",
      severity: "info",
      opKind: "tokoro_reading",
      candidates: op.candidates,
      winner,
      message: `ところだ 의 의미 ambiguity (시점/장소/의도) — commit phase default winner = ${winner}. Phase 5 commit phase 영역.`
    });
  }
  if (committed !== op) return committed;
  if (op.reading === winner) return op;
  return { ...op, reading: winner };
}

function commitTokoroByDeterministicEvidence(
  op: TokoroModalOp,
  ctx: CommitContext,
  ops: readonly AuxOpNode[],
  index: number,
  stem: StemNode
): TokoroModalOp {
  const hasPostPast = ops.slice(index + 1).some((next) => next.kind === "tense" || (next.kind === "negation" && next.chainPast));
  if (tokoroStemIsIntention(stem, op, ctx.tokens)) {
    return commitTokoroModalFromEvidence(op, { stemReading: "intention" });
  }
  if (tokoroStemIsPlaceLike(stem, op, ctx.tokens)) {
    return commitTokoroModalFromEvidence(op, {
      stemReading: tokoroIsKininaruFixedHead(op, ctx.tokens) ? "fixed_place" : "place"
    });
  }
  const evidence = tokoroContextEvidence(ctx.tokens, op, ctx.lookups);
  const hasProgressAspect = ops.slice(0, index).some((prev) => prev.kind === "aspect" && prev.aspect === "te_iru");
  const committed = commitTokoroModalFromEvidence(op, {
    stemReading: null,
    hasProgressAspect,
    hasPostPast,
    ...evidence
  });
  if (committed !== op) {
    return committed;
  }
  return tokoroHostSupportsAspectualReading(stem, ops, index, ctx.lookups)
    ? committed
    : commitTokoroModalFromEvidence(op, { stemReading: "place" });
}

function tokoroHostSupportsAspectualReading(
  stem: StemNode,
  ops: readonly AuxOpNode[],
  index: number,
  lookups: LookupTables
): boolean {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const op = ops[cursor];
    if (preservesHostEventPhase(op)) {
      continue;
    }
    const category = chainFinalOpHostCategory(op);
    if (category !== undefined) {
      return category === "verbal_predicate";
    }
  }
  return stem.kind === "verb" || tokoroStemIsStageLevelAdjective(stem, lookups);
}

function tokoroStemIsStageLevelAdjective(stem: StemNode, lookups: LookupTables): boolean {
  if (stem.kind !== "adj") {
    return false;
  }
  return stem.source.tokens.some((token) =>
    lookups.TOKORO_STAGE_LEVEL_ADJECTIVE_FORMS.has(token.dictionaryForm || token.surface)
  );
}

function preservesHostEventPhase(op: AuxOpNode | undefined): boolean {
  if (op === undefined) {
    return false;
  }
  return op.kind === "desire" || (op.kind === "aspect" && op.aspect === "te_hoshii");
}

export interface TokoroCommitEvidence {
  readonly stemReading: "intention" | "place" | "fixed_place" | null;
  readonly hasProgressAspect?: boolean;
  readonly hasPostPast?: boolean;
  readonly almost?: boolean;
  readonly aboutTo?: boolean;
  readonly just?: boolean;
}

export function commitTokoroModalFromEvidence(
  op: TokoroModalOp,
  evidence: TokoroCommitEvidence
): TokoroModalOp {
  if (evidence.stemReading === "intention") {
    return { ...op, reading: "intention", variant: "temporal", candidates: ["intention"], nominalNoun: "바" };
  }
  if (evidence.stemReading === "place" || evidence.stemReading === "fixed_place") {
    return {
      ...op,
      reading: "place",
      variant: "temporal",
      candidates: ["place"],
      nominalNoun: evidence.stemReading === "fixed_place" ? "부분" : "곳"
    };
  }
  if (evidence.hasProgressAspect === true) {
    return { ...op, reading: "temporal", variant: "progress_observation", candidates: ["temporal"] };
  }
  if (evidence.hasPostPast === true && evidence.almost === true) {
    return { ...op, reading: "temporal", variant: "almost", candidates: ["temporal"] };
  }
  if (evidence.hasPostPast !== true && evidence.almost === true) {
    return { ...op, reading: "place", variant: "temporal", candidates: ["place"] };
  }
  if (evidence.aboutTo === true || (evidence.hasPostPast === true && evidence.just === true)) {
    return { ...op, reading: "temporal", variant: "about_to", candidates: ["temporal"] };
  }
  return op;
}

function tokoroStemIsIntention(
  stem: StemNode,
  op: TokoroModalOp,
  tokens: readonly RuntimeHaruToken[] | undefined
): boolean {
  const headIdx = tokoroHeadIndex(op);
  if (tokens !== undefined && headIdx !== null && isTokoroDesiredResultHead(tokens, headIdx)) {
    return true;
  }
  const surfaces = stem.source.tokens.map((token) => token.dictionaryForm || token.surface);
  return surfaces.includes("望む");
}

function tokoroStemIsPlaceLike(
  stem: StemNode,
  op: TokoroModalOp,
  tokens: readonly RuntimeHaruToken[] | undefined
): boolean {
  if (op.source.tokens[0]?.surface === "所") return true;
  const headIdx = tokoroHeadIndex(op);
  if (tokens !== undefined && headIdx !== null && isTokoroKininaruHead(tokens, headIdx)) {
    return true;
  }
  const surfaces = stem.source.tokens.map((token) => token.dictionaryForm || token.surface);
  return surfaces.some((surface) => surface === "生える" || surface === "住む" || surface === "働く" || surface === "向かう");
}

function tokoroHeadIndex(op: TokoroModalOp): number | null {
  return op.source.tokenIndices[0] ?? null;
}

function tokoroIsKininaruFixedHead(
  op: TokoroModalOp,
  tokens: readonly RuntimeHaruToken[] | undefined
): boolean {
  const headIdx = tokoroHeadIndex(op);
  return tokens !== undefined && headIdx !== null && isTokoroKininaruHead(tokens, headIdx);
}

function tokoroContextEvidence(
  tokens: readonly RuntimeHaruToken[] | undefined,
  op: TokoroModalOp,
  lookups: LookupTables
): { readonly almost: boolean; readonly aboutTo: boolean; readonly just: boolean } {
  if (tokens === undefined) return { almost: false, aboutTo: false, just: false };
  const firstIdx = op.source.tokenIndices[0] ?? 0;
  const start = Math.max(0, firstIdx - 8);
  const left = tokens.slice(start, firstIdx).map((token) => token.surface);
  return {
    almost: hasTokoroAlmostSignal(tokens, firstIdx, lookups),
    aboutTo: hasTokoroAboutToSignal(tokens, firstIdx, lookups),
    just: left.some((s) => s === "ちょうど" || s === "丁度")
  };
}

function commitSoudaReading(op: SoudaHearsayModalOp, _ctx: CommitContext, warnings: Warning[]): SoudaHearsayModalOp {
  if (op.candidates === undefined || op.candidates.length === 0) return op;
  const winner: SoudaReadingCandidate = op.candidates[0]!;
  if (op.candidates.length > 1) {
    warnings.push({
      type: "ambiguity_default",
      severity: "info",
      opKind: "souda_reading",
      candidates: op.candidates,
      winner,
      message: `そうだ 의 reading ambiguity (전언 hearsay / 양태 yotai) — commit phase default winner = ${winner}. Phase 5 commit phase 가 context 평가 후 winner 변경 영역.`
    });
  }
  if (op.reading === winner) return op;
  return { ...op, reading: winner };
}

export function commitTsumoriReading(
  op: TsumoriModalOp,
  ops: readonly AuxOpNode[],
  index: number
): TsumoriModalOp {
  const winner: TsumoriReadingCandidate = hostCarriesPreModalPast(ops, index)
    ? "counterfactual_assumption"
    : "intention";
  if (op.reading === winner && op.candidates?.length === 1 && op.candidates[0] === winner) {
    return op;
  }
  return { ...op, reading: winner, candidates: [winner] };
}

function normalizeHabitualMonoIterativeAspectOps(ops: readonly AuxOpNode[]): readonly AuxOpNode[] {
  let result: AuxOpNode[] | null = null;
  ops.forEach((op, index) => {
    if (op.kind !== "modal" || op.modal !== "mono" || op.reading !== "habitual") {
      return;
    }
    let hostIdx = index - 1;
    while (hostIdx >= 0 && (ops[hostIdx]?.kind === "tense" || ops[hostIdx]?.kind === "negation")) {
      hostIdx -= 1;
    }
    const host = ops[hostIdx];
    if (
      host === undefined ||
      host.kind !== "aspect" ||
      host.aspect !== "te_iru" ||
      (host as SimpleAspectOp).semantic?.renderStrategy !== undefined
    ) {
      return;
    }
    result ??= [...ops];
    result[hostIdx] = {
      ...(host as SimpleAspectOp),
      semantic: { reading: "drop_aux", renderStrategy: "drop_aux", projection: "default" }
    };
  });
  return result ?? ops;
}

function monoModalCommitEvidence(op: MonoModalOp, ctx: CommitContext): MonoModalEvidence {
  const carrierIdx = op.source.tokenIndices[0];
  if (ctx.tokens === undefined || ctx.layout === undefined || carrierIdx === undefined) {
    return op.evidence;
  }
  return monoModalClauseEvidence(ctx.tokens, carrierIdx, ctx.lookups, ctx.layout, {
    finalLayout: ctx.layout,
    hostPredicateIdx: ctx.predicateTokenIdx ?? null
  });
}

export function commitMonoReading(
  op: MonoModalOp,
  ops: readonly AuxOpNode[],
  index: number,
  evidence: MonoModalEvidence
): MonoModalOp {
  const previous = ops[index - 1];
  const hostPast = hostCarriesPreModalPast(ops, index);
  const hostDesire = (previous?.kind === "desire" && previous.form === undefined) ||
    (previous?.kind === "aspect" && previous.aspect === "te_hoshii");
  const hostPotential = ops.slice(0, index).some((candidate) =>
    candidate.kind === "voice" && candidate.voice === "potential"
  );
  const next = ops[index + 1];
  const copulaPast = next?.kind === "tense" && next.tense === "past";
  const reading: MonoModalReading =
    hostDesire || evidence.admirativeAdverb || (evidence.evaluativeFrequencyAdverb && hostPotential)
      ? "admirative"
      : evidence.frequencyAdverb && (hostPast || copulaPast)
        ? "habitual"
        : "nominal";
  const past = hostPast && reading !== "nominal";
  if (op.reading === reading && op.past === past && op.candidates?.length === 1) {
    return op;
  }
  return { ...op, evidence, reading, candidates: [reading], past };
}

