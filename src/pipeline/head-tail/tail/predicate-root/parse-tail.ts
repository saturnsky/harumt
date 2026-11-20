import type { RuntimeHaruToken } from "../../../../types/token.js";
import type { ParseOutgoingBoundaryHint } from "./parse-boundary-hint.js";
import { isAdjNai } from "../../../matchers.js";
import { TokenCursor } from "../../../token-cursor.js";
import { YOU_NI_VOLITIONAL_MANNER_HOSTS } from "../../data/semantic-helper-sets.js";
import type { LookupTables } from "../../../lookup-tables.js";
import { tariKeijoujiAdverbialToEvidence } from "../../../semantics/tari-adverbial-marker.js";
import { tosuruResultativeMakeYieldsToAttributiveQuoteHead } from "./tosuru-construction-mode.js";
import { previousNonSpaceIndex } from "../../../clause-layout/trivia.js";
import { conditionalQuoteEllipsisClassForSurface } from "./connective-render-table.js";
import { sourceVerbalPredicateAfterAuxOp } from "./operator-head.js";
import { isTeConnectiveToken, teDeContinuationRelationAt } from "../postverb-tail-classifier.js";
import { type AuxLayerNode, type AuxOpNode, type OpSource, type SfpNode, type ConnectiveOp, type ScopeBridgeOp, retrospectiveQuotativeFlavorForStemMood, type StemNode, type TailNode, type ParsedTailRoot } from "./grammar.js";
import { lookupConnectiveBySurface, connectiveSurfaceRequiresFinalPosition } from "./connective-surface-lookup.js";
import type { ParseInput, StemInput } from "./parse-input.js";
import { canOpenMalformedConditionalFragmentTerminal, canOpenRenyouChuushiTerminal, canOpenStemMalformedConditionalFragmentTerminal, canOpenStemRenyouChuushiTerminal, canOpenOpsRenyouCompoundPrenominalTerminal, canOpenStemRenyouCompoundPrenominalTerminal, missingConditionalMarkerConnective, renyouChuushiPayloadForOp, renyouChuushiPayloadForSource } from "./fragment-recovery.js";
import { declaredProjectionCarrierBranchTerminal } from "./projection-carrier-form-table.js";
import { srcSingle, srcSlice } from "./source.js";
import { isNaiOrNuToken, isSyntheticDeicticStemToken } from "./classifiers/tokens.js";
import { tailOpsEndInPastTense } from "./matchers/tokoro-result-connective.js";
import { type ElidedColloquialObligationContext, tryMatchObligation } from "./matchers/obligation.js";
import { matchNegationEnding } from "./matchers/negation-ending.js";
import { matchGotokuMannerSimileConnectiveAt, matchKaNoYouNiMannerSimileConnectiveAt } from "./matchers/predicate-projection-connective.js";
import { matchElidedNominalizerScopeBridge, matchImplicitNegativeFocusBridge, matchScopeBridge, matchScopeBridgeBeforeBasicCopula } from "./matchers/scope-bridge.js";
import { applyNominalHostQuoteDecoration, skipHostEnclosingQuoteClose } from "./nominal-host-phrase.js";
import { firstAuxLayer, stemHasSourceVerbalPredicateEvidence } from "./inspect.js";
import { POS4, POS5, POS5A, posToString, 仮定形_, 助動詞_ジャ, 助動詞_ダ, 助動詞_デス, 助動詞_ヤ, 未然形_, 命令形_, 連体形_, 連用形_, 連用形_促音便, isAdnominalGenitiveMarkerToken } from "../../../../types/pos.js";
import { buildBoundaryConnectiveOp, createConnectiveOp, createNegationOp, markQuotedQuestionContextOp } from "./op-builders.js";
import { type AuxClassResult, NEGATION_OK, classifyTailAux, isNegationToken, mergeNegationOps, matchFocusedNegation, validateNegationChainStart, applyNegationInabilityPolicy, applyShortTailPolicy, buildOpFromClassification, buildConjectureOp, collectNegationChain } from "./parser.js";
import { connectiveFlavorFields } from "./connective-ops.js";
import { matchDegreeIntensifierIdiom, matchPermissionIdiom, matchTeEvaluationIdiom, matchBaSufficiencyConditionalIdiom, matchNegativeNecessitySumuIdiom, matchKotoGaDekiru, matchExperienceKotoGaAru, matchDecisionKotoNiSuru, matchOutcomeKotoNiNaru, matchDecisionToSuru, matchNegativeNecessityKotoWa, matchOnlyOption, matchWakeImpossibleIdiom, matchInevitableZaruOEnaiIdiom, matchCannotRefrainNegativeDewaIrarenai, matchMethodYouGaNaiIdiom, matchMadeMoNaiIdiom } from "./matchers/lexical-idioms.js";
import { matchLimitNegationModal, matchModalAtCursor } from "./matchers/modal-tail.js";
import { TERMINAL_SFP_RUN_BRIDGE_LIMIT, matchTerminalSfpArbitration, matchPlainNominalizerTerminal, matchPredicateConfirmationJanaiSfp, matchVolitionalConfirmationQuotativeConnective, isVolitionalTerminalContext, matchDialectalRedundantTerminalParticle } from "./matchers/terminal-sfp.js";
import { matchPredicateQuoteCarrier, matchTerminalPastQuoteAllomorphCarrier, predicateQuoteCarrierStartsAt, matchToConditionalConnective, matchElidedHostCommandQuotativeConnective, quotedMoodPayload, absorbBareTeDirectiveIntoCarrier, matchElidedHostPoliteVolitionalQuotativeConnective, matchElidedHostPoliteCopulaQuotativeConnective, matchElidedHostConditionalQuotativeConnective, matchElidedHostQuoteFocusEvenConnective, matchElidedHostQuoteTopicExclamativeSfp, matchBareTteQuotativeConnective, isContractedNegativeConditionalToken, matchQuotativeConnective, matchBareTeRequestQuoteConnective, matchQuoteFocusQuotativeConnective, matchQuestionQuotativeConnective, matchSfpBridgedQuoteCarrier } from "./matchers/predicate-quote.js";
import { quotedPropositionMood } from "./quote-tail-context.js";
import { boundNominalReasonQuoteCarrierHostAt, matchBoundNominalReasonConnective, matchBoundNominalListingConnective, matchTameQuotedJudgmentPassiveConnective, matchTokoroResultConnective, matchTameConnective, matchNodeReasonConnective, matchNoNiAdversativeConnective, matchExternalNominalizerConnective, matchNominalizedEvenIfConnective, matchAdjectivalConcessiveTomoConnective, matchTeMoConnective, matchRenyouFocusSupportEllipsisConnective, matchBareMoConcessiveConnective, matchCopulaMoFocusConnective, matchVolitionalPurposeToConnective, matchDatteFocusParticleConnective, matchSfpClosedExemplificationConnective, matchBareVolitionalClosedExemplificationConnective, bareVolitionalExemplificationBoundaryMood, matchExemplificationConnective, matchTeKaraSequenceConnective, matchTeIraiTemporalSinceConnective, matchZuniConnective, matchTariEnumerativeConnective, matchNaraBaConnective, matchClassicalConditionalBaConnective, matchInventoryCompositeConnective, matchReformulationConnective, matchQuotedConcessiveConnective, matchRetrospectiveQuoteConnective, matchQuestionReformulationConnective, matchHokaAdditiveConnective, matchMonoNoConcessiveConnective, matchKuseNiConcessiveConnective, matchNaBridgedKuseNiConcessiveConnective, matchRenyouNominalCopulaReasonConnective, matchPostpositionalInventoryConnective, canOwnNimoKakawarazuConnective } from "./matchers/connective-tail.js";
import { matchArimasenPoliteNegativeSupport, matchCopulaAtCursor, matchAffirmativeFocusSupport, matchAdjCopulaNegationBridge } from "./matchers/copula-tail.js";
import { matchPredicateProjectionConnective, matchPredicateProjectionConnectiveBeforeTerminalSfp, matchFocusConnective, matchYouNiPredicateProjectionConnective, matchSfpBridgedQuotativeMannerSimileConnective, closedSfpClosesInterrogative, matchAttributiveBridgedYouNiProjectionConnective, matchPredicateProjectionCarrier, closedSfpRunQuotativeMannerSimileAtBoundary, quotativeMannerSimileMatchInParseSlice } from "./matchers/projection-tail.js";
import { matchNoBridgedLikenessModal, matchNominalHostLikenessAtCursor } from "./matchers/likeness-modal.js";
import { matchAttributiveBridgedYouNiPerceptionPostverbAuxiliary, matchPostverbAuxiliary, matchPredicateSuffix, previousOpIsReanchoringDerivationalSuffix, isFusedJaCopulaTerminalBeforeSfp, previousOpIsAffirmativeCopulaNi, previousOpIsSoudaYotaiAdverbialNi, stemCanProjectStateChange, matchFormalToStateResultPostverbAuxiliary, matchAdverbialNiPostverbAuxiliary, matchYouNiNaruPostverbAuxiliary, matchSouNiNaruPostverbAuxiliary, matchSouNiSuruAppearanceBehaviorPostverbAuxiliary, absorbMannerActionControlPastTense, matchYouNiSuruControlPostverbAuxiliary, matchYouNiPerceptionPostverbAuxiliary, matchKaNoYouNiPerceptionPostverbAuxiliary, matchEpistemicHedgePostverbAuxiliary } from "./matchers/postverb-operator.js";
import { utteranceClosureAfterParsePosition, carrierTerminalContextFor } from "./parse-closure.js";
import { sourceIndexForInputPosition, hostEnclosingQuoteCloseInParseSlice, contextCursorForInputPosition } from "./parse-coordinates.js";
import { precedingPrefixFormForStem, isAdjLikeStemNode, isNounLikeStemNode, materializeStemMood, assertStemAnchorBounds, opLastSourceToken, buildStemNode } from "./parse-stem.js";
import { matchBekiAtCursor, matchForbidden, matchNaitoAfterNegativeNounCopula, elidedColloquialObligationContextFor, matchStemHostedSuppletiveObligation } from "./matchers/obligation-tail.js";
import { matchSimpleAspect, matchTsutsuAruAspect, matchTeYaruDeterminedCompletion, matchBenefactive, matchDesiderative, matchMiseru, matchCollapsedAspect, matchSplitCollapsedTeIruNegation, markEllipticTeIruSourceHost, collapsedTeIruTokenMarksEllipticNegative, matchCollapsedHonorific, matchRequest, matchProhibition } from "./matchers/te-aspect.js";
import { hostChainAttachesAsVerbalRenyou, hostChainAttachesAsAdjectivalRenyou, hostChainAttachesAsNegativeRenyou, hostChainAttachesAsNominalCopulaStem } from "./postverb-host-attachment.js";

export interface ParseSuccess {
  readonly ok: true;
  readonly root: ParsedTailRoot;
  readonly consumed: number;
}

export interface ParseFailure {
  readonly ok: false;
  readonly reason: string;
  readonly position: number;
}

export type ParseOutcome = ParseSuccess | ParseFailure;

function matchOutgoingBoundaryHint(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>,
  previousOps: readonly AuxOpNode[],
  stemNode: StemNode,
  stemTok: RuntimeHaruToken
): ConnectiveOp | null {
  return cursor.tx(c => {
    const pos = c.pos;
    const hint = input.outgoingBoundaryHint;
    if (hint === undefined) return null;
    const startIndex = sourceIndexForInputPosition(input, pos);
    if (startIndex !== hint.tokenSpan.start) return null;
    while (c.pos < c.end) {
      const current = sourceIndexForInputPosition(input, c.pos);
      if (current > hint.tokenSpan.end) break;
      c.advance();
      if (current === hint.tokenSpan.end) break;
    }
    const consumed = c.pos - pos;
    if (consumed <= 0) return null;
    const endIndex = sourceIndexForInputPosition(input, c.pos - 1);
    if (endIndex !== hint.tokenSpan.end) return null;
    const previousForm5A = ((input.tokens[pos - 1])?.pos ?? 0) & POS5A;
    const surface = hint.surface === "も" && previousForm5A === 連用形_
      ? "__renyou_mo"
      : hint.surface;
    if (surface === "にもかかわらず" && !canOwnNimoKakawarazuConnective(previousOps, stemNode)) {
      return null;
    }
    if (hint.retrospectiveDiscoveryStyle === "deoni" && !tailOpsEndInPastTense(previousOps)) {
      return null;
    }
    const directQuotative = quotativeMannerSimileMatchInParseSlice(input, c, pos);
    const quotativeReDerive = directQuotative?.closure === "noda_formal_noun"
      ? directQuotative
      : quotativeMannerSimileMatchInParseSlice(input, c, pos + 1);
    const closedRunQuotative = closedSfpRunQuotativeMannerSimileAtBoundary(input, c, pos, hint, stemTok, previousOps);
    if (closedRunQuotative === null) {
      return null;
    }
    const quotativeMood = closedRunQuotative !== undefined && closedSfpClosesInterrogative(closedRunQuotative)
      ? "interrogative"
      : hint.quotativeMood ?? (
        quotativeReDerive?.connective === hint.connectiveKind
          ? quotativeReDerive.mood
          : undefined
      );
    const conditionalQuoteEllipsis = conditionalQuoteEllipsisClassForSurface(surface);
    const boundNominalQuoteCarrierHost = hint.connectiveKind === "bound_nominal_reason" &&
      boundNominalReasonQuoteCarrierHostAt(input, previousOps, input.start);
    const boundaryOp = buildBoundaryConnectiveOp(
      srcSlice(input.tokens, pos, consumed),
      hint.connectiveKind,
      surface,
      hint.surfaceAllomorph
    );
    const hydratedBoundaryOp: ConnectiveOp = {
      ...boundaryOp,
      ...connectiveFlavorFields(input.tokens[pos]!, previousOps),
      ...bareVolitionalExemplificationBoundaryMood(input, c, pos, hint.connectiveKind, previousOps),
      ...(conditionalQuoteEllipsis === undefined
        ? {}
        : { conditionalQuoteEllipsis }),
      ...(quotativeMood === undefined ? {} : { quotativeMood }),
      ...(closedRunQuotative === undefined ? {} : { closedSfp: closedRunQuotative }),
      ...(boundNominalQuoteCarrierHost ? { boundNominalReasonQuoteCarrierHost: true } as const : {}),
      ...(hint.boundNominalReasonMonoNoun === undefined
        ? {}
        : { boundNominalReasonMonoNoun: hint.boundNominalReasonMonoNoun }),
      ...(hint.retrospectiveDiscoveryStyle === undefined
        ? {}
        : { retrospectiveDiscoveryStyle: hint.retrospectiveDiscoveryStyle }),
      ...(hint.attemptFocusParticle === undefined
        ? {}
        : { attemptFocusParticle: hint.attemptFocusParticle }),
      ...(hint.connectiveKind !== "predicate_projection_quote_attributive"
        ? {}
        : input.quoteAttributiveHeadFrame === undefined
          ? {}
          : { quoteAttributiveFlavor: input.quoteAttributiveHeadFrame.flavor }),
      ...(hint.retrospectiveQuotativeFlavor === undefined
        ? {}
        : {
          retrospectiveQuotativeFlavor: retrospectiveQuotativeFlavorForStemMood(
            hint.retrospectiveQuotativeFlavor,
            stemNode.stemMood
          )
        }),
      ...(hint.quoteBoundary === undefined ? {} : { quoteBoundary: hint.quoteBoundary })
    };
    return hint.quotedQuestionContext === true
      ? markQuotedQuestionContextOp(hydratedBoundaryOp)
      : hydratedBoundaryOp;
  });
}

interface TailParseState {
  sfp: SfpNode | null;
  explicitTerminal: AuxLayerNode["terminal"];
  explicitTerminalPayload: AuxLayerNode["terminalPayload"] | undefined;
  adnominalCopulaTerminalMarkerPos: number | null;
}

interface TailTerminalState {
  consumedEnd: number;
  terminal: AuxLayerNode["terminal"];
  terminalPayload: AuxLayerNode["terminalPayload"] | undefined;
}

interface TailParseContext {
  readonly input: ParseInput;
  readonly tokens: readonly RuntimeHaruToken[];
  readonly start: number;
  readonly stemTok: RuntimeHaruToken;
  readonly semanticStemTok: RuntimeHaruToken;
  readonly stemNode: StemNode;
  readonly ops: AuxOpNode[];
  readonly precedingPrefixForm: string | null;
  readonly elidedColloquialObligationContext: ElidedColloquialObligationContext;
  readonly allowElidedNaitoObligation: boolean;
  readonly cursor: TokenCursor<RuntimeHaruToken>;
}

type TailLoopSignal = "continue" | "break" | "next" | { readonly return: ParseOutcome };

type TailLoopSection = (pc: TailParseContext, state: TailParseState, token: RuntimeHaruToken) => TailLoopSignal;

function isStemFragmentForm(pos5A: number): boolean {
  return pos5A === 連用形_ || pos5A === 仮定形_ || pos5A === 未然形_;
}

function isOpsFragmentForm(pos5A: number): boolean {
  return pos5A === 連用形_ || pos5A === 仮定形_;
}

export function parseTail(input: ParseInput): ParseOutcome {
  const { tokens, start, stem } = input;
  const stemTok = tokens[start];
  if (stemTok === undefined) {
    return { ok: false, reason: "stem token out of range", position: start };
  }
  const semanticStemTok = input.semanticStemToken ?? stemTok;

  const hostQuoteClose = hostEnclosingQuoteCloseInParseSlice(input, start);
  const stemHostedObligation = matchStemHostedSuppletiveObligation(input, stemTok);
  const stemNode = applyNominalHostQuoteDecoration(
    buildStemNode(stemHostedObligation?.stem ?? stem, stemTok, start, input.headHypothesis),
    hostQuoteClose?.surface ?? ""
  );
  const ops: AuxOpNode[] = [];
  const precedingPrefixForm = precedingPrefixFormForStem(input);
  const state: TailParseState = {
    sfp: null,
    explicitTerminal: null,
    explicitTerminalPayload: undefined,
    adnominalCopulaTerminalMarkerPos: null
  };
  const elidedColloquialObligationContext = elidedColloquialObligationContextFor(input);
  const allowElidedNaitoObligation = elidedColloquialObligationContext === "terminal";

  const cursor = new TokenCursor(tokens, stemHostedObligation?.cursorStart ?? start + 1);
  if (stemHostedObligation !== null) {
    ops.push(stemHostedObligation.op);
  }

  const pc: TailParseContext = {
    input,
    tokens,
    start,
    stemTok,
    semanticStemTok,
    stemNode,
    ops,
    precedingPrefixForm,
    elidedColloquialObligationContext,
    allowElidedNaitoObligation,
    cursor
  };
  while (cursor.pos < cursor.end) {
    const token = tokens[cursor.pos];
    if (token === undefined) {
      break;
    }
    const signal = runTailLoopSections(pc, state, token);
    if (signal === "continue") {
      continue;
    }
    if (signal === "break") {
      break;
    }
    if (signal !== "next") {
      return signal.return;
    }
  }

  const terminalState: TailTerminalState = {
    consumedEnd: cursor.pos,
    terminal: state.explicitTerminal,
    terminalPayload: state.explicitTerminalPayload
  };
  seedTailTerminal(pc, state, terminalState);
  const fragmentFailure = applyFragmentTerminalInvariant(pc, state, terminalState);
  if (fragmentFailure !== null) {
    return fragmentFailure;
  }
  resolveImperativeAndElidedNominalizerTerminal(pc, terminalState);
  return finalizeTailParse(pc, state, terminalState);
}

function seedTailTerminal(pc: TailParseContext, state: TailParseState, terminalState: TailTerminalState): void {
  const { input, ops, cursor } = pc;
  if (terminalState.terminal === null && ops.length === 0 && input.allowAdverbialModifierTerminal === "none") {
    terminalState.terminal = "adverbial_modifier";
  }
  const lastCarrierOp = ops.at(-1);
  if (
    terminalState.terminal === null &&
    lastCarrierOp?.kind === "predicateProjectionCarrier" &&
    declaredProjectionCarrierBranchTerminal(lastCarrierOp.sourceAllomorph) === "adverbial_modifier"
  ) {
    terminalState.terminal = "adverbial_modifier";
  }
  if (
    terminalState.terminal === "attributive" &&
    state.adnominalCopulaTerminalMarkerPos !== null &&
    cursor.pos > state.adnominalCopulaTerminalMarkerPos + 1
  ) {
    terminalState.terminal = null;
  }
}

function applyFragmentTerminalInvariant(
  pc: TailParseContext,
  state: TailParseState,
  terminalState: TailTerminalState
): ParseOutcome | null {
  const { input, stemNode, ops, cursor } = pc;
  if (ops.length > 0) {
    const opsFragmentFailure = applyOpsFragmentTerminal(pc, state, terminalState);
    if (opsFragmentFailure !== null) {
      return opsFragmentFailure;
    }
  } else if (input.stemTerminalOwnedByCaller === true) {
    const hostTok = stemNode.source.tokens[0];
    if (
      terminalState.terminal === null &&
      hostTok !== undefined &&
      state.sfp === null &&
      canOpenStemRenyouChuushiTerminal(input, stemNode, hostTok)
    ) {
      terminalState.terminal = "renyou_chuushi";
      terminalState.terminalPayload = renyouChuushiPayloadForSource(stemNode.source, input.renyouChuushiTerminalRole);
    }
  } else if (terminalState.terminal !== "adverbial_modifier") {
    const stemTok = stemNode.source.tokens[0];
    if (stemTok !== undefined && isStemFragmentForm(stemTok.pos & POS5A) && state.sfp?.effect !== "na_soft_imperative") {
      if (canOpenStemRenyouCompoundPrenominalTerminal(input, stemNode, stemTok)) {
        terminalState.terminal = "attributive";
      } else if (canOpenStemRenyouChuushiTerminal(input, stemNode, stemTok)) {
        terminalState.terminal = "renyou_chuushi";
        terminalState.terminalPayload = renyouChuushiPayloadForSource(stemNode.source, input.renyouChuushiTerminalRole);
      } else if (canOpenStemMalformedConditionalFragmentTerminal(input, stemNode, stemTok)) {
        ops.push(missingConditionalMarkerConnective(stemNode.source));
      } else {
        return {
          ok: false,
          reason: `stem ends with fragment form (surface=${stemTok.surface}, pos5A=${posToString(stemTok.pos)}) — chain/connect signal without terminal`,
          position: cursor.pos
        };
      }
    }
  }
  return null;
}

function applyOpsFragmentTerminal(
  pc: TailParseContext,
  state: TailParseState,
  terminalState: TailTerminalState
): ParseOutcome | null {
  const { input, stemNode, ops, cursor } = pc;
  const lastOp = ops[ops.length - 1]!;
  if (
    lastOp.kind !== "connective" &&
    !(lastOp.kind === "copula" && lastOp.variant === "conditional_nara") &&
    !(lastOp.kind === "modal" && lastOp.modal === "youda" && lastOp.terminal === "adverbial_ni") &&
    !isElidedColloquialObligationTerminal(lastOp)
  ) {
    const lastTok = opLastSourceToken(lastOp);
    if (
      lastTok !== undefined &&
      isOpsFragmentForm(lastTok.pos & POS5A) &&
      state.sfp?.effect !== "na_soft_imperative" &&
      !isFusedJaCopulaTerminalBeforeSfp(lastOp, lastTok, state.sfp)
    ) {
      if (
        input.allowAdverbialModifierTerminal === "copula_ni" &&
        (previousOpIsAffirmativeCopulaNi(ops) || previousOpIsSoudaYotaiAdverbialNi(ops))
      ) {
        terminalState.terminal = "adverbial_modifier";
      } else if (canOpenOpsRenyouCompoundPrenominalTerminal(input, stemNode, ops, lastTok)) {
        terminalState.terminal = "attributive";
      } else if (canOpenRenyouChuushiTerminal(input, stemNode, ops, lastOp, lastTok)) {
        terminalState.terminal = "renyou_chuushi";
        terminalState.terminalPayload = renyouChuushiPayloadForOp(lastOp, input.renyouChuushiTerminalRole);
      } else if (canOpenMalformedConditionalFragmentTerminal(input, stemNode, lastOp, lastTok)) {
        ops.push(missingConditionalMarkerConnective(lastOp.source));
      } else if (input.stopAtUnparsedTail === true) {
        const trimmedEnd = trimTrailingFragmentOps(ops, isOpsFragmentForm);
        if (trimmedEnd === null) {
          return {
            ok: false,
            reason: `ops end with fragment form (kind=${lastOp.kind}, surface=${lastTok.surface}, pos5A=${posToString(lastTok.pos)}) — chain/connect signal without terminal`,
            position: cursor.pos
          };
        }
        terminalState.consumedEnd = trimmedEnd;
      } else {
        return {
          ok: false,
          reason: `ops end with fragment form (kind=${lastOp.kind}, surface=${lastTok.surface}, pos5A=${posToString(lastTok.pos)}) — chain/connect signal without terminal`,
          position: cursor.pos
        };
      }
    }
  }
  return null;
}

function resolveImperativeAndElidedNominalizerTerminal(pc: TailParseContext, terminalState: TailTerminalState): void {
  const { input, stemNode, ops, cursor } = pc;
  if (terminalState.terminal === null && ops.length > 0) {
    const lastOp = ops[ops.length - 1]!;
    if (lastOp.kind !== "aspect" && lastOp.kind !== "connective") {
      const lastTok = opLastSourceToken(lastOp);
      if (lastTok !== undefined && (lastTok.pos & POS5A) === 命令形_) {
        terminalState.terminal = "imperative";
      }
    }
  }

  if (terminalState.terminal === null && ops.length === 0) {
    const cmdTok = stemNode.source.tokens[stemNode.conjugationAnchor] ?? stemNode.source.tokens[0];
    if (cmdTok !== undefined && (cmdTok.pos & POS5A) === 命令形_) {
      terminalState.terminal = "imperative";
    }
  }

  if (
    terminalState.terminal === null &&
    input.allowElidedNominalizerTerminal === true &&
    cursor.pos >= cursor.end
  ) {
    terminalState.terminal = "nominalized";
    terminalState.terminalPayload = {
      kind: "nominalized",
      nominalizerSource: "elided",
      source: { tokens: [], tokenIndices: [] }
    };
  }
}

function finalizeTailParse(
  pc: TailParseContext,
  state: TailParseState,
  terminalState: TailTerminalState
): ParseOutcome {
  const { input, start, stemNode, ops, cursor } = pc;
  const inabilityOps = applyNegationInabilityPolicy(ops, stemNode, input.lookups);
  const policyOps = stemNode.kind === "verb" || stemNode.kind === "adj"
    ? applyShortTailPolicy(inabilityOps, stemNode.kind, stemNode, input.lookups)
    : inabilityOps;
  const normalizedOps = normalizeTosuruModeForTerminal(policyOps, terminalState.terminalPayload);
  const layer: AuxLayerNode = {
    kind: "auxLayer",
    stem: stemNode,
    ops: normalizedOps,
    terminal: terminalState.terminal,
    ...(terminalState.terminalPayload === undefined ? {} : { terminalPayload: terminalState.terminalPayload })
  };

  const streamStart = input.streamStart ?? 0;
  let finalizedRoot: ParsedTailRoot;
  try {
    finalizedRoot = relocateRoot(
      { tail: layer, sfp: state.sfp },
      streamStart,
      input.prependSource,
      input.conjugationAnchor,
      input.semanticAnchors,
      input.sourceIndexMap,
      input.stemSourceOverride
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: `relocateRoot: ${message}`, position: cursor.pos };
  }

  return {
    ok: true,
    root: finalizedRoot,
    consumed: terminalState.consumedEnd - start
  };
}

const TAIL_LOOP_SECTIONS: readonly TailLoopSection[] = [
  parseTailHostBoundary,
  parseTailLimitNegationAndDegreeIdiom,
  parseTailInitialCopula,
  parseTailObligationAndNegativeConditional,
  parseTailKotoAndLexicalIdioms,
  parseTailPostverbAuxiliaries,
  parseTailTeFamilyAspects,
  parseTailQuoteCarriers,
  parseTailScopeBridgesAndBoundNominals,
  parseTailReasonAndConcessiveConnectives,
  parseTailPredicateProjections,
  parseTailLikenessAndPurposeCarriers,
  parseTailNoAndFocusConnectives,
  parseTailEnumerativeAndConditionalConnectives,
  parseTailQuotativeConnectives,
  parseTailNominalizerTerminalAndModals,
  parseTailTerminalSfp,
  parseTailClassifiedAux
];

function runTailLoopSections(
  pc: TailParseContext,
  state: TailParseState,
  token: RuntimeHaruToken
): TailLoopSignal {
  for (const section of TAIL_LOOP_SECTIONS) {
    const signal = section(pc, state, token);
    if (signal !== "next") {
      return signal;
    }
  }
  return "next";
}

function parseTailHostBoundary(
  pc: TailParseContext,
  state: TailParseState,
  token: RuntimeHaruToken
): TailLoopSignal {
  const { input, tokens, start, stemNode, ops, cursor } = pc;
  if (
    input.allowExplicitAdnominalNoTerminal === true &&
    ops.length === 0 &&
    cursor.pos === cursor.end - 1 &&
    isAdnominalGenitiveMarkerToken(token)
  ) {
    cursor.advance();
    state.explicitTerminal = "attributive";
    return "break";
  }
  if (ops.length === 0 && isNounLikeStemNode(stemNode)) {
    const contextTokens = input.contextTokens ?? tokens;
    const sourceHostStart = sourceIndexForInputPosition(input, start);
    const sourcePos = sourceIndexForInputPosition(input, cursor.pos);
    if (skipHostEnclosingQuoteClose(contextTokens, sourceHostStart, sourcePos) !== sourcePos) {
      cursor.advance();
      return "continue";
    }
  }
  if (
    !predicateQuoteCarrierStartsAt(cursor, input.lookups, input) &&
    tariKeijoujiAdverbialToEvidence(contextCursorForInputPosition(input, cursor.pos), {
      allowProtoFollowingPredicateEvidence: true,
      lookups: input.lookups
    }) !== null
  ) {
    return "break";
  }
  return "next";
}

function parseTailLimitNegationAndDegreeIdiom(
  pc: TailParseContext,
  state: TailParseState,
  token: RuntimeHaruToken
): TailLoopSignal {
  const { input, stemNode, ops, cursor } = pc;
  const limitNegationMatch = matchLimitNegationModal(cursor);
  if (limitNegationMatch !== null) {
    ops.push(limitNegationMatch);
    return "continue";
  }

  if (
    hostChainAttachesAsNominalCopulaStem(stemNode, ops) ||
    hostChainAttachesAsAdjectivalRenyou(stemNode, ops) ||
    hostChainAttachesAsNegativeRenyou(stemNode, ops) ||
    hostChainAttachesAsVerbalRenyou(stemNode, ops)
  ) {
    const degreeIntensifierMatch = matchDegreeIntensifierIdiom(cursor, input.lookups);
    if (degreeIntensifierMatch !== null) {
      ops.push(degreeIntensifierMatch);
      return "continue";
    }
  }
  return "next";
}

function parseTailInitialCopula(
  pc: TailParseContext,
  state: TailParseState,
  token: RuntimeHaruToken
): TailLoopSignal {
  const { input, tokens, stemTok, stemNode, ops, cursor } = pc;
  if (isNounLikeStemNode(stemNode) && ops.length === 0) {
    const nominalLikenessMatch = matchNominalHostLikenessAtCursor(cursor);
    if (nominalLikenessMatch !== null) {
      ops.push(...nominalLikenessMatch);
      return "continue";
    }
    const focusBridgeOp = cursor.tx(c =>
      matchScopeBridgeBeforeBasicCopula(c, { allowFocusIdentityBridge: true }));
    if (focusBridgeOp !== null) {
      pushScopeBridgeOps(ops, focusBridgeOp, cursor.tokens);
      return "continue";
    }
    const copulaStart = cursor.pos;
    const copulaMatch = matchCopulaAtCursor(cursor, input.lookups, {
      allowAdnominalTerminal: input.allowAdnominalCopulaTerminal === true && stemCanProjectStateChange(stemNode)
    }, input);
    if (copulaMatch !== null) {
      if (copulaMatch.adnominal) {
        state.explicitTerminal = "attributive";
        state.adnominalCopulaTerminalMarkerPos = copulaStart;
      }
      ops.push(...(copulaMatch.ops ?? [copulaMatch.op]));
      return "continue";
    }
  }

  if (previousOpIsReanchoringDerivationalSuffix(ops)) {
    const derivedCopulaStart = cursor.pos;
    const derivedCopulaMatch = matchCopulaAtCursor(cursor, input.lookups, {
      allowAdnominalTerminal: input.allowAdnominalCopulaTerminal === true
    }, input);
    if (derivedCopulaMatch !== null) {
      if (derivedCopulaMatch.adnominal) {
        state.explicitTerminal = "attributive";
        state.adnominalCopulaTerminalMarkerPos = derivedCopulaStart;
      }
      ops.push(...(derivedCopulaMatch.ops ?? [derivedCopulaMatch.op]));
      return "continue";
    }
    const derivedFocusBridgeOp = cursor.tx(matchScopeBridgeBeforeBasicCopula);
    if (derivedFocusBridgeOp !== null) {
      pushScopeBridgeOps(ops, derivedFocusBridgeOp, cursor.tokens);
      return "continue";
    }
  }

  if (isAdjLikeStemNode(stemNode) && ops.length === 0) {
    const adjFocusBridgeOp = cursor.tx(matchScopeBridgeBeforeBasicCopula);
    if (adjFocusBridgeOp !== null) {
      pushScopeBridgeOps(ops, adjFocusBridgeOp, cursor.tokens);
      return "continue";
    }
    const bridge = matchAdjCopulaNegationBridge(tokens, cursor.pos);
    if (bridge !== null) {
      ops.push(bridge.op);
      cursor.advance(bridge.nextPos - cursor.pos);
      return "continue";
    }
    const copulaStart = cursor.pos;
    const copulaMatch = cursor.tx(c => {
      const match = matchCopulaAtCursor(c, input.lookups, {
        allowAdnominalTerminal: input.allowAdnominalCopulaTerminal === true
      }, input);
      if (match === null) {
        return null;
      }
      const predicateCopula =
        match.op.variant === "basic" &&
        match.op.polarity === "affirmative" &&
        (
          (stemTok.pos & POS5A) === 連体形_ ||
          isSyntheticDeicticStemToken(stemTok)
        );
      return match.adnominal || predicateCopula ? match : null;
    });
    if (copulaMatch !== null) {
      const adnominalCopula = copulaMatch.adnominal;
      if (adnominalCopula) {
        state.explicitTerminal = "attributive";
        state.adnominalCopulaTerminalMarkerPos = copulaStart;
      }
      ops.push(...(copulaMatch.ops ?? [copulaMatch.op]));
      return "continue";
    }
  }

  const renyouNominalCopulaConnective = matchRenyouNominalCopulaReasonConnective(cursor, stemTok, stemNode);
  if (renyouNominalCopulaConnective !== null) {
    ops.push(renyouNominalCopulaConnective);
    return "continue";
  }
  return "next";
}

function parseTailObligationAndNegativeConditional(
  pc: TailParseContext,
  state: TailParseState,
  token: RuntimeHaruToken
): TailLoopSignal {
  const { input, start, stemTok, stemNode, ops, elidedColloquialObligationContext, allowElidedNaitoObligation, cursor } = pc;
  const obligationOp = cursor.tx(c => tryMatchObligation(c, elidedColloquialObligationContext));
  if (obligationOp !== null) {
    ops.push(obligationOp);
    return "continue";
  }

  if (isContractedNegativeConditionalToken(token)) {
    const chainStartFailure = validateNegationChainStart({
      pos: cursor.pos,
      start,
      stemTok,
      token,
      previousOp: ops.length > 0 ? ops[ops.length - 1] : undefined
    });
    if (chainStartFailure !== null) {
      return { return: chainStartFailure };
    }
    ops.push(
      createNegationOp({

        source: srcSingle(token, cursor.pos),
        chainDepth: 1,
        chainPast: false,
        stemAux: [],
        preferShortNegation: false
      }),
      createConnectiveOp({

        connective: "conditional",
        surface: token.surface,
        conditionalFlavor: "plain",
        source: srcSingle(token, cursor.pos)
      })
    );
    cursor.advance();
    return "continue";
  }

  const nounCopulaNaitoMatch = matchNaitoAfterNegativeNounCopula(
    cursor,
    ops,
    allowElidedNaitoObligation
  );
  if (nounCopulaNaitoMatch !== null) {
    ops.push(nounCopulaNaitoMatch);
    return "continue";
  }

  const bekiMatch = matchBekiAtCursor(input, cursor);
  if (bekiMatch !== null) {
    ops.push(...(bekiMatch.ops ?? [bekiMatch.op]));
    return "continue";
  }

  const forbiddenMatch = matchForbidden(cursor, stemNode, ops);
  if (forbiddenMatch !== null) {
    ops.push(forbiddenMatch);
    return "continue";
  }
  return "next";
}

function parseTailKotoAndLexicalIdioms(
  pc: TailParseContext,
  state: TailParseState,
  token: RuntimeHaruToken
): TailLoopSignal {
  const { input, stemTok, ops, cursor } = pc;
  const dekiruMatch = matchKotoGaDekiru(cursor, input.lookups);
  if (dekiruMatch !== null) {
    ops.push(dekiruMatch);
    return "continue";
  }

  const experienceMatch = matchExperienceKotoGaAru(cursor, ops);
  if (experienceMatch !== null) {
    ops.push(experienceMatch);
    return "continue";
  }

  const decisionKotoNiSuruMatch = matchDecisionKotoNiSuru(cursor);
  if (decisionKotoNiSuruMatch !== null) {
    ops.push(decisionKotoNiSuruMatch);
    return "continue";
  }

  const decisionToSuruMatch = matchDecisionToSuru(cursor, ops, stemTok);
  if (decisionToSuruMatch !== null) {
    ops.push(decisionToSuruMatch);
    return "continue";
  }

  const outcomeKotoNiNaruMatch = matchOutcomeKotoNiNaru(cursor);
  if (outcomeKotoNiNaruMatch !== null) {
    ops.push(outcomeKotoNiNaruMatch);
    return "continue";
  }

  const negativeNecessityKotoWaMatch = matchNegativeNecessityKotoWa(cursor, ops, stemTok);
  if (negativeNecessityKotoWaMatch !== null) {
    ops.push(negativeNecessityKotoWaMatch);
    return "continue";
  }

  const onlyOptionMatch = matchOnlyOption(cursor, stemTok);
  if (onlyOptionMatch !== null) {
    ops.push(onlyOptionMatch);
    return "continue";
  }

  const wakeImpossibleMatch = matchWakeImpossibleIdiom(cursor);
  if (wakeImpossibleMatch !== null) {
    ops.push(wakeImpossibleMatch);
    return "continue";
  }

  const cannotRefrainMatch = matchCannotRefrainNegativeDewaIrarenai(cursor, ops);
  if (cannotRefrainMatch !== null) {
    ops.push(cannotRefrainMatch);
    return "continue";
  }

  const inevitableZaruMatch = matchInevitableZaruOEnaiIdiom(cursor);
  if (inevitableZaruMatch !== null) {
    ops.push(inevitableZaruMatch);
    return "continue";
  }

  const methodYouGaNaiMatch = matchMethodYouGaNaiIdiom(cursor);
  if (methodYouGaNaiMatch !== null) {
    ops.push(methodYouGaNaiMatch);
    return "continue";
  }

  const madeMoNaiMatch = matchMadeMoNaiIdiom(cursor);
  if (madeMoNaiMatch !== null) {
    ops.push(madeMoNaiMatch);
    return "continue";
  }

  const tsutsuAruMatch = matchTsutsuAruAspect(cursor);
  if (tsutsuAruMatch !== null) {
    ops.push(tsutsuAruMatch);
    return "continue";
  }
  return "next";
}

function parseTailPostverbAuxiliaries(
  pc: TailParseContext,
  state: TailParseState,
  token: RuntimeHaruToken
): TailLoopSignal {
  const { input, stemTok, stemNode, ops, precedingPrefixForm, cursor } = pc;
  const formalToStateResultMatch = matchFormalToStateResultPostverbAuxiliary(cursor, stemNode, ops, {
    suppressToSuruControl: input.suppressFormalToSuruControl === true
  });
  if (formalToStateResultMatch !== null) {
    ops.push(formalToStateResultMatch);
    return "continue";
  }

  const adverbialNiPostverbMatch = matchAdverbialNiPostverbAuxiliary(cursor, stemTok, stemNode);
  if (adverbialNiPostverbMatch !== null) {
    ops.push(adverbialNiPostverbMatch);
    return "continue";
  }

  const postverbAuxiliaryMatch = matchPostverbAuxiliary(
    cursor,
    stemTok,
    stemNode,
    ops,
    input.lookups,
    precedingPrefixForm,
    carrierTerminalContextFor(input),
  );
  if (postverbAuxiliaryMatch !== null) {
    ops.push(postverbAuxiliaryMatch);
    return "continue";
  }

  const predicateSuffixMatch = matchPredicateSuffix(cursor, stemNode, stemTok, ops, input.lookups);
  if (predicateSuffixMatch !== null) {
    ops.push(predicateSuffixMatch);
    return "continue";
  }
  return "next";
}

function parseTailTeFamilyAspects(
  pc: TailParseContext,
  state: TailParseState,
  token: RuntimeHaruToken
): TailLoopSignal {
  const { input, stemTok, semanticStemTok, stemNode, ops, cursor } = pc;
  const splitCollapsedTeIruNegation = matchSplitCollapsedTeIruNegation(cursor, ops, stemNode);
  if (splitCollapsedTeIruNegation !== null) {
    ops.push(splitCollapsedTeIruNegation);
    return "continue";
  }

  const aspectMatch = ops.at(-1)?.kind === "polite"
    ? null
    : matchSimpleAspect(cursor, semanticStemTok, input.lookups);
  if (aspectMatch !== null) {
    ops.push(...aspectMatch);
    return "continue";
  }

  const teYaruDeterminedCompletionMatch = matchTeYaruDeterminedCompletion(cursor, stemTok, input.lookups);
  if (teYaruDeterminedCompletionMatch !== null) {
    ops.push(teYaruDeterminedCompletionMatch);
    return "continue";
  }

  const benefactiveMatch = matchBenefactive(cursor, stemTok, input.lookups, ops);
  if (benefactiveMatch !== null) {
    ops.push(benefactiveMatch);
    return "continue";
  }

  const requestMatch = matchRequest(cursor, input.lookups);
  if (requestMatch !== null) {
    ops.push(requestMatch);
    return "continue";
  }

  const prohibitionMatch = matchProhibition(cursor, input);
  if (prohibitionMatch !== null) {
    ops.push(prohibitionMatch);
    return "continue";
  }

  const bareTeRequestQuoteMatch = matchBareTeRequestQuoteConnective(input, cursor);
  if (bareTeRequestQuoteMatch !== null) {
    ops.push(bareTeRequestQuoteMatch);
    return "continue";
  }

  const collapsedMatch = matchCollapsedAspect(cursor);
  if (collapsedMatch !== null) {
    const collapsedNegation = matchNegationEnding(cursor.tokens, cursor.pos, { allowAttributive: true });
    const afterCollapsedNegation = collapsedNegation === null
      ? undefined
      : cursor.tokens[cursor.pos + collapsedNegation.consumed];
    const feedsNaideProhibition = afterCollapsedNegation?.surface === "で" &&
      isTeConnectiveToken(afterCollapsedNegation);
    const ellipticNegative = collapsedTeIruTokenMarksEllipticNegative(collapsedMatch) &&
      ops.reduce(
        sourceVerbalPredicateAfterAuxOp,
        stemHasSourceVerbalPredicateEvidence(stemNode),
      ) &&
      cursor.current() !== undefined &&
      (isAdjNai(cursor.current()!) || isNegationToken(cursor.current()!)) &&
      collapsedNegation !== null &&
      !feedsNaideProhibition;
    ops.push(ellipticNegative ? markEllipticTeIruSourceHost(collapsedMatch) : collapsedMatch);
    return "continue";
  }

  const collapsedHonorificMatch = matchCollapsedHonorific(cursor);
  if (collapsedHonorificMatch !== null) {
    ops.push(collapsedHonorificMatch);
    return "continue";
  }

  const desiderativeMatch = matchDesiderative(cursor, input.lookups);
  if (desiderativeMatch !== null) {
    ops.push(desiderativeMatch);
    return "continue";
  }

  const miseruMatch = matchMiseru(cursor, input.lookups);
  if (miseruMatch !== null) {
    ops.push(miseruMatch);
    return "continue";
  }
  return "next";
}

function parseTailQuoteCarriers(
  pc: TailParseContext,
  state: TailParseState,
  token: RuntimeHaruToken
): TailLoopSignal {
  const { input, stemTok, stemNode, ops, cursor } = pc;
  const outgoingBoundaryHintMatch = matchOutgoingBoundaryHint(input, cursor, ops, stemNode, stemTok);
  if (outgoingBoundaryHintMatch !== null) {
    ops.push(outgoingBoundaryHintMatch);
    return "continue";
  }

  if (matchDialectalRedundantTerminalParticle(input, cursor, ops)) {
    return "continue";
  }

  const terminalPastQuoteAllomorphMatch = matchTerminalPastQuoteAllomorphCarrier(input, cursor, ops);
  if (terminalPastQuoteAllomorphMatch !== null) {
    ops.push(terminalPastQuoteAllomorphMatch);
    return "continue";
  }

  const reformulationMatch = matchReformulationConnective(cursor, input);
  if (reformulationMatch !== null) {
    ops.push(reformulationMatch);
    return "continue";
  }

  const predicateQuoteCarrierMatch = input.stopAtUnparsedTail === true
    ? null
    : matchPredicateQuoteCarrier(cursor, input.lookups, stemTok, ops, input);
  if (predicateQuoteCarrierMatch !== null) {
    ops.push(absorbBareTeDirectiveIntoCarrier(ops, predicateQuoteCarrierMatch, stemTok));
    return "continue";
  }

  const volitionalConfirmationQuotativeMatch = matchVolitionalConfirmationQuotativeConnective(input, cursor, stemTok, ops);
  if (volitionalConfirmationQuotativeMatch !== null) {
    ops.push(volitionalConfirmationQuotativeMatch);
    return "continue";
  }

  const predicateConfirmationJanaiBeforeBridgeMatch = isVolitionalTerminalContext(stemTok, ops)
    ? matchPredicateConfirmationJanaiSfp(input, cursor, stemTok, ops)
    : null;
  if (predicateConfirmationJanaiBeforeBridgeMatch !== null) {
    state.sfp = predicateConfirmationJanaiBeforeBridgeMatch;
    return "break";
  }
  return "next";
}

function parseTailScopeBridgesAndBoundNominals(
  pc: TailParseContext,
  state: TailParseState,
  token: RuntimeHaruToken
): TailLoopSignal {
  const { input, start, stemNode, ops, cursor } = pc;
  const implicitFocusOp = cursor.tx(c => matchImplicitNegativeFocusBridge(c, stemNode, ops[ops.length - 1]));
  if (implicitFocusOp !== null) {
    pushScopeBridgeOps(ops, implicitFocusOp, cursor.tokens);
    return "continue";
  }
  const elidedNominalizerBridgeOp = cursor.tx(c => matchElidedNominalizerScopeBridge(c, ops[ops.length - 1]));
  if (elidedNominalizerBridgeOp !== null) {
    ops.push(elidedNominalizerBridgeOp);
    return "continue";
  }
  const scopeBridgeOp = cursor.tx(c => matchScopeBridge(c, {
    allowElidedNegativeBody: input.allowElidedDewaNegativeBody !== undefined
  }));
  if (scopeBridgeOp !== null) {
    pushScopeBridgeOps(ops, scopeBridgeOp, cursor.tokens);
    return "continue";
  }

  const boundNominalReasonMatch = matchBoundNominalReasonConnective(input, cursor);
  if (boundNominalReasonMatch !== null) {
    ops.push(
      boundNominalReasonQuoteCarrierHostAt(input, ops, start)
        ? { ...boundNominalReasonMatch, boundNominalReasonQuoteCarrierHost: true }
        : boundNominalReasonMatch
    );
    return "continue";
  }
  const boundNominalListingMatch = matchBoundNominalListingConnective(cursor);
  if (boundNominalListingMatch !== null) {
    ops.push(boundNominalListingMatch);
    return "continue";
  }
  return "next";
}

function parseTailReasonAndConcessiveConnectives(
  pc: TailParseContext,
  state: TailParseState,
  token: RuntimeHaruToken
): TailLoopSignal {
  const { input, stemTok, ops, cursor } = pc;
  const tameQuotedJudgmentPassiveMatch = matchTameQuotedJudgmentPassiveConnective(cursor);
  if (tameQuotedJudgmentPassiveMatch !== null) {
    ops.push(tameQuotedJudgmentPassiveMatch);
    return "continue";
  }

  const tameConnectiveMatch = matchTameConnective(cursor, ops, stemTok, input.lookups);
  if (tameConnectiveMatch !== null) {
    ops.push(tameConnectiveMatch);
    return "continue";
  }

  const tokoroResultConnectiveMatch = matchTokoroResultConnective(input, cursor, ops);
  if (tokoroResultConnectiveMatch !== null) {
    ops.push(tokoroResultConnectiveMatch);
    return "continue";
  }

  const hokaAdditiveMatch = matchHokaAdditiveConnective(cursor);
  if (hokaAdditiveMatch !== null) {
    ops.push(hokaAdditiveMatch);
    return "continue";
  }
  const monoNoConcessiveMatch = matchMonoNoConcessiveConnective(cursor);
  if (monoNoConcessiveMatch !== null) {
    ops.push(monoNoConcessiveMatch);
    return "continue";
  }
  const kuseNiConcessiveMatch = cursor.tx(c => matchKuseNiConcessiveConnective(c, stemTok)) ??
    cursor.tx(matchNaBridgedKuseNiConcessiveConnective);
  if (kuseNiConcessiveMatch !== null) {
    ops.push(kuseNiConcessiveMatch);
    return "continue";
  }
  return "next";
}

function parseTailPredicateProjections(
  pc: TailParseContext,
  state: TailParseState,
  token: RuntimeHaruToken
): TailLoopSignal {
  const { input, stemTok, ops, cursor } = pc;
  const predicateProjectionConnectiveOptions = {
    allowNoQuoteReportingProjection: input.allowNoQuoteReportingProjection === true,
    lookups: input.lookups,
    ...(input.quoteAttributiveHeadFrame === undefined
      ? {}
      : { quoteAttributiveHeadFrame: input.quoteAttributiveHeadFrame }),
    purposeMotionClosureAfterMarker: (markerPos: number) => utteranceClosureAfterParsePosition(input, markerPos)
  };
  const predicateProjectionConnectiveMatch = matchPredicateProjectionConnective(
    cursor,
    predicateProjectionConnectiveOptions
  );
  if (predicateProjectionConnectiveMatch !== null) {
    ops.push(predicateProjectionConnectiveMatch);
    return "continue";
  }
  const focusConnectiveMatch = matchFocusConnective(cursor);
  if (focusConnectiveMatch !== null) {
    ops.push(focusConnectiveMatch);
    return "continue";
  }
  const predicateProjectionCarrierMatch = matchPredicateProjectionCarrier(cursor, ops, input.lookups, input, stemTok);
  if (predicateProjectionCarrierMatch !== null) {
    ops.push(predicateProjectionCarrierMatch);
    return "continue";
  }
  const predicateProjectionBeforeSfpMatch = matchPredicateProjectionConnectiveBeforeTerminalSfp(cursor, {
    ...predicateProjectionConnectiveOptions,
    stemToken: stemTok
  });
  if (predicateProjectionBeforeSfpMatch !== null) {
    ops.push(predicateProjectionBeforeSfpMatch);
    return "continue";
  }
  return "next";
}

function parseTailLikenessAndPurposeCarriers(
  pc: TailParseContext,
  state: TailParseState,
  token: RuntimeHaruToken
): TailLoopSignal {
  const { input, stemTok, ops, cursor } = pc;
  const youNiNaruPostverbMatch = matchYouNiNaruPostverbAuxiliary(cursor, carrierTerminalContextFor(input));
  if (youNiNaruPostverbMatch !== null) {
    ops.push(youNiNaruPostverbMatch);
    return "continue";
  }

  const souNiNaruPostverbMatch = matchSouNiNaruPostverbAuxiliary(cursor);
  if (souNiNaruPostverbMatch !== null) {
    ops.push(souNiNaruPostverbMatch);
    return "continue";
  }

  const souNiSuruBehaviorPostverbMatch = matchSouNiSuruAppearanceBehaviorPostverbAuxiliary(cursor);
  if (souNiSuruBehaviorPostverbMatch !== null) {
    ops.push(souNiSuruBehaviorPostverbMatch);
    return "continue";
  }

  const hostIsVolitionalMannerHost =
    YOU_NI_VOLITIONAL_MANNER_HOSTS.has(stemTok.dictionaryForm || stemTok.surface);
  const youNiSuruControlPostverbMatch = matchYouNiSuruControlPostverbAuxiliary(cursor, hostIsVolitionalMannerHost, carrierTerminalContextFor(input));
  if (youNiSuruControlPostverbMatch !== null) {
    absorbMannerActionControlPastTense(ops, youNiSuruControlPostverbMatch);
    ops.push(youNiSuruControlPostverbMatch);
    return "continue";
  }

  const kaNoYouNiPerceptionPostverbMatch = matchKaNoYouNiPerceptionPostverbAuxiliary(cursor);
  if (kaNoYouNiPerceptionPostverbMatch !== null) {
    ops.push(kaNoYouNiPerceptionPostverbMatch);
    return "continue";
  }

  const kaNoYouNiSimileMatch = matchKaNoYouNiMannerSimileConnectiveAt(
    cursor.tokens,
    cursor.pos,
    input.lookups
  );
  if (kaNoYouNiSimileMatch !== null) {
    ops.push(createConnectiveOp({
      connective: kaNoYouNiSimileMatch.connective,
      surface: kaNoYouNiSimileMatch.surface,
      source: srcSlice(cursor.tokens, cursor.pos, kaNoYouNiSimileMatch.consumed)
    }));
    cursor.advance(kaNoYouNiSimileMatch.consumed);
    return "continue";
  }

  const youNiPerceptionPostverbMatch = matchYouNiPerceptionPostverbAuxiliary(cursor);
  if (youNiPerceptionPostverbMatch !== null) {
    ops.push(youNiPerceptionPostverbMatch);
    return "continue";
  }

  const epistemicHedgePostverbMatch = matchEpistemicHedgePostverbAuxiliary(cursor);
  if (epistemicHedgePostverbMatch !== null) {
    ops.push(epistemicHedgePostverbMatch);
    return "continue";
  }

  const youNiProjectionConnectiveMatch = matchYouNiPredicateProjectionConnective(cursor, {
    allowZeroNiPurpose: input.allowZeroNiPurposeTerminal === true,
    lookups: input.lookups
  });
  if (youNiProjectionConnectiveMatch !== null) {
    ops.push(youNiProjectionConnectiveMatch);
    return "continue";
  }

  const gotokuMatch = matchGotokuMannerSimileConnectiveAt(cursor.tokens, cursor.pos);
  if (gotokuMatch !== null) {
    ops.push(createConnectiveOp({
      connective: gotokuMatch.connective,
      surface: gotokuMatch.surface,
      source: srcSlice(cursor.tokens, cursor.pos, gotokuMatch.consumed)
    }));
    cursor.advance(gotokuMatch.consumed);
    return "continue";
  }

  const bridgedPerception = matchAttributiveBridgedYouNiPerceptionPostverbAuxiliary(cursor);
  if (bridgedPerception !== null) {
    ops.push(bridgedPerception);
    return "continue";
  }

  const bridgedProjection = matchAttributiveBridgedYouNiProjectionConnective(cursor, input.lookups);
  if (bridgedProjection !== null) {
    ops.push(bridgedProjection);
    return "continue";
  }

  const sfpBridgedQuotative = matchSfpBridgedQuotativeMannerSimileConnective(input, cursor, ops, stemTok);
  if (sfpBridgedQuotative !== null) {
    ops.push(sfpBridgedQuotative);
    return "continue";
  }
  return "next";
}

function parseTailNoAndFocusConnectives(
  pc: TailParseContext,
  state: TailParseState,
  token: RuntimeHaruToken
): TailLoopSignal {
  const { input, stemTok, stemNode, ops, cursor } = pc;
  const nodeConnectiveMatch = cursor.tx(c => matchNodeReasonConnective(c, input.lookups))
    ?? cursor.tx(c => matchNoNiAdversativeConnective(c, stemTok, input));
  if (nodeConnectiveMatch !== null) {
    ops.push(nodeConnectiveMatch);
    return "continue";
  }
  const externalNominalizerMatch = matchExternalNominalizerConnective(cursor);
  if (externalNominalizerMatch !== null) {
    ops.push(externalNominalizerMatch);
    return "continue";
  }
  const nominalizedEvenIfMatch = matchNominalizedEvenIfConnective(cursor);
  if (nominalizedEvenIfMatch !== null) {
    ops.push(nominalizedEvenIfMatch);
    return "continue";
  }
  const negativeNecessitySumuMatch = matchNegativeNecessitySumuIdiom(cursor, ops, stemNode);
  if (negativeNecessitySumuMatch !== null) {
    ops.push(negativeNecessitySumuMatch);
    return "continue";
  }
  const teEvaluationMatch = matchTeEvaluationIdiom(cursor, input.lookups);
  if (teEvaluationMatch !== null) {
    ops.push(teEvaluationMatch);
    return "continue";
  }
  const permissionMatch = matchPermissionIdiom(cursor, stemNode, ops, input.lookups);
  if (permissionMatch !== null) {
    ops.push(permissionMatch);
    return "continue";
  }
  const baSufficiencyMatch = matchBaSufficiencyConditionalIdiom(cursor);
  if (baSufficiencyMatch !== null) {
    ops.push(baSufficiencyMatch);
    return "continue";
  }
  const focusedNegationMatch = cursor.tx(matchFocusedNegation);
  if (focusedNegationMatch !== null) {
    ops.push(...focusedNegationMatch);
    return "continue";
  }
  const focusSupportMatch = matchAffirmativeFocusSupport(cursor);
  if (focusSupportMatch !== null) {
    ops.push(focusSupportMatch);
    return "continue";
  }
  const teMoMatch = matchTeMoConnective(cursor, stemTok, input);
  if (teMoMatch !== null) {
    ops.push(teMoMatch);
    return "continue";
  }
  const tomoConcessiveMatch = matchAdjectivalConcessiveTomoConnective(cursor);
  if (tomoConcessiveMatch !== null) {
    ops.push(tomoConcessiveMatch);
    return "continue";
  }
  const copulaMoFocusMatch = matchCopulaMoFocusConnective(cursor, input);
  if (copulaMoFocusMatch !== null) {
    ops.push(copulaMoFocusMatch);
    return "continue";
  }
  const renyouFocusEllipsisMatch = matchRenyouFocusSupportEllipsisConnective(cursor, input);
  if (renyouFocusEllipsisMatch !== null) {
    ops.push(renyouFocusEllipsisMatch);
    return "continue";
  }
  const bareMoConcessionMatch = matchBareMoConcessiveConnective(cursor, input);
  if (bareMoConcessionMatch !== null) {
    ops.push(bareMoConcessionMatch);
    return "continue";
  }
  return "next";
}

function parseTailEnumerativeAndConditionalConnectives(
  pc: TailParseContext,
  state: TailParseState,
  token: RuntimeHaruToken
): TailLoopSignal {
  const { input, stemTok, stemNode, ops, cursor } = pc;
  const terminalTokaCarrier = input.stopAtUnparsedTail === true
    ? null
    : matchPredicateQuoteCarrier(cursor, input.lookups, stemTok, ops, input, {
        allowTerminalToka: true
      });
  if (terminalTokaCarrier !== null) {
    ops.push(terminalTokaCarrier);
    return "continue";
  }
  const datteFocusMatch = matchDatteFocusParticleConnective(input, cursor, ops);
  if (datteFocusMatch !== null) {
    ops.push(datteFocusMatch);
    return "continue";
  }
  const teKaraMatch = matchTeKaraSequenceConnective(cursor);
  if (teKaraMatch !== null) {
    ops.push(teKaraMatch);
    return "continue";
  }
  const teIraiMatch = matchTeIraiTemporalSinceConnective(cursor);
  if (teIraiMatch !== null) {
    ops.push(teIraiMatch);
    return "continue";
  }
  const zuniMatch = matchZuniConnective(cursor, ops, stemNode);
  if (zuniMatch !== null) {
    ops.push(zuniMatch);
    return "continue";
  }
  const tariMatch = matchTariEnumerativeConnective(cursor);
  if (tariMatch !== null) {
    ops.push(tariMatch);
    return "continue";
  }
  const naraBaMatch = matchNaraBaConnective(cursor);
  if (naraBaMatch !== null) {
    ops.push(naraBaMatch);
    return "continue";
  }
  const taraBaMatch = matchClassicalConditionalBaConnective(cursor, ops);
  if (taraBaMatch !== null) {
    ops.push(taraBaMatch);
    return "continue";
  }
  const inventoryCompositeMatch = matchInventoryCompositeConnective(cursor, stemTok);
  if (inventoryCompositeMatch !== null) {
    ops.push(inventoryCompositeMatch);
    return "continue";
  }
  const postpositionalConnectiveMatch = matchPostpositionalInventoryConnective(cursor, ops, stemNode);
  if (postpositionalConnectiveMatch !== null) {
    ops.push(postpositionalConnectiveMatch);
    return "continue";
  }
  return "next";
}

function parseTailQuotativeConnectives(
  pc: TailParseContext,
  state: TailParseState,
  token: RuntimeHaruToken
): TailLoopSignal {
  const { input, stemTok, stemNode, ops, allowElidedNaitoObligation, cursor } = pc;
  const bareVolitionalExemplification = matchBareVolitionalClosedExemplificationConnective(input, cursor);
  if (bareVolitionalExemplification !== null) {
    ops.push({ ...bareVolitionalExemplification, closedChainMood: quotedPropositionMood(stemTok, ops, null) });
    return "continue";
  }
  const exemplificationMatch = matchExemplificationConnective(cursor, input.lookups);
  if (exemplificationMatch !== null) {
    ops.push(exemplificationMatch);
    return "continue";
  }
  const quotedConcessiveMatch = matchQuotedConcessiveConnective(cursor);
  if (quotedConcessiveMatch !== null) {
    ops.push(quotedConcessiveMatch);
    return "continue";
  }
  const retrospectiveQuoteMatch = matchRetrospectiveQuoteConnective(cursor, stemNode);
  if (retrospectiveQuoteMatch !== null) {
    ops.push(retrospectiveQuoteMatch);
    return "continue";
  }
  const questionReformulationMatch = matchQuestionReformulationConnective(cursor);
  if (questionReformulationMatch !== null) {
    ops.push(questionReformulationMatch);
    return "continue";
  }
  const questionQuotativeMatch = matchQuestionQuotativeConnective(cursor);
  if (questionQuotativeMatch !== null) {
    ops.push(questionQuotativeMatch);
    return "continue";
  }
  const quoteFocusMatch = matchQuoteFocusQuotativeConnective(cursor, ops);
  if (quoteFocusMatch !== null) {
    ops.push(quoteFocusMatch);
    return "continue";
  }
  const quotativeMatch = matchQuotativeConnective(input, cursor);
  if (quotativeMatch !== null) {
    ops.push(quotativeMatch);
    return "continue";
  }
  const bareTteMatch = matchBareTteQuotativeConnective(cursor);
  if (bareTteMatch !== null) {
    ops.push(bareTteMatch);
    return "continue";
  }
  const lastOpForToCond = ops.length > 0 ? ops[ops.length - 1] : undefined;
  const isAfterNegation = lastOpForToCond?.kind === "negation";
  const politeVolitionalQuotativeMatch =
    matchElidedHostPoliteVolitionalQuotativeConnective(input, cursor, ops);
  if (politeVolitionalQuotativeMatch !== null) {
    ops.push(politeVolitionalQuotativeMatch);
    return "continue";
  }
  const volitionalPurposeToMatch = matchVolitionalPurposeToConnective(input, cursor, stemTok, ops);
  if (volitionalPurposeToMatch !== null) {
    ops.push(volitionalPurposeToMatch);
    return "continue";
  }
  const commandQuotativeMatch = matchElidedHostCommandQuotativeConnective(cursor, ops);
  if (commandQuotativeMatch !== null) {
    ops.push(commandQuotativeMatch);
    return "continue";
  }
  const politeCopulaQuotativeMatch = matchElidedHostPoliteCopulaQuotativeConnective(cursor, ops);
  if (politeCopulaQuotativeMatch !== null) {
    ops.push(politeCopulaQuotativeMatch);
    return "continue";
  }
  const conditionalQuotativeMatch = matchElidedHostConditionalQuotativeConnective(input, cursor, ops);
  if (conditionalQuotativeMatch !== null) {
    ops.push(conditionalQuotativeMatch);
    return "continue";
  }
  const quoteFocusEvenMatch = matchElidedHostQuoteFocusEvenConnective(input, cursor);
  if (quoteFocusEvenMatch !== null) {
    ops.push(quoteFocusEvenMatch);
    return "continue";
  }
  const quoteTopicExclamativeMatch = matchElidedHostQuoteTopicExclamativeSfp(input, cursor, ops);
  if (quoteTopicExclamativeMatch !== null) {
    state.sfp = quoteTopicExclamativeMatch;
    return "break";
  }
  if (!isAfterNegation || !allowElidedNaitoObligation) {
    const terminalBareToCarrier = input.stopAtUnparsedTail === true
      ? null
      : matchPredicateQuoteCarrier(cursor, input.lookups, stemTok, ops, input, {
          allowTerminalBareTo: true
        });
    if (terminalBareToCarrier !== null) {
      ops.push(absorbBareTeDirectiveIntoCarrier(ops, terminalBareToCarrier, stemTok));
      return "continue";
    }
    const toCondMatch = matchToConditionalConnective(cursor);
    if (toCondMatch !== null) {
      ops.push(toCondMatch);
      return "continue";
    }
  }
  return "next";
}

function parseTailNominalizerTerminalAndModals(
  pc: TailParseContext,
  state: TailParseState,
  token: RuntimeHaruToken
): TailLoopSignal {
  const { input, stemTok, stemNode, ops, elidedColloquialObligationContext, cursor } = pc;
  const closesAsQuotativeMannerAttributive = ops.at(-1)?.kind === "connective" &&
    (ops.at(-1) as ConnectiveOp).connective === "predicate_projection_quotative_manner_simile_attributive";
  const nominalizerTerminal = closesAsQuotativeMannerAttributive ? null : matchPlainNominalizerTerminal(
    input,
    cursor,
    input.allowPlainNominalizerTerminal === true,
    input.lookups
  );
  if (nominalizerTerminal !== null) {
    state.explicitTerminal = "nominalized";
    state.explicitTerminalPayload = nominalizerTerminal;
    return "break";
  }

  const arimasenSupportMatch = matchArimasenPoliteNegativeSupport(cursor, stemNode, ops);
  if (arimasenSupportMatch !== null) {
    const lastOp = ops[ops.length - 1];
    if (lastOp?.kind === "negation") {
      ops[ops.length - 1] = mergeNegationOps(lastOp, arimasenSupportMatch.negation);
      ops.push(arimasenSupportMatch.polite);
    } else {
      ops.push(arimasenSupportMatch.polite, arimasenSupportMatch.negation);
    }
    return "continue";
  }

  const noBridgedModal = matchNoBridgedLikenessModal(cursor, stemTok, {
    previousOps: ops,
    lookups: input.lookups,
    input,
    elidedColloquialObligationContext
  });
  if (noBridgedModal !== null) {
    ops.push(...(noBridgedModal.ops ?? [noBridgedModal.op]));
    if (noBridgedModal.terminal !== undefined) {
      state.explicitTerminal = noBridgedModal.terminal;
      return "break";
    }
    return "continue";
  }

  const modalMatch = matchModalAtCursor(cursor, stemTok, {
    previousOps: ops,
    lookups: input.lookups,
    input,
    elidedColloquialObligationContext
  });
  if (modalMatch !== null) {
    ops.push(...(modalMatch.ops ?? [modalMatch.op]));
    if (modalMatch.terminal !== undefined) {
      state.explicitTerminal = modalMatch.terminal;
      return "break";
    }
    return "continue";
  }
  return "next";
}

function parseTailTerminalSfp(
  pc: TailParseContext,
  state: TailParseState,
  token: RuntimeHaruToken
): TailLoopSignal {
  const { input, stemTok, ops, cursor } = pc;
  const sfpBridgedQuoteCarrier = cursor.tx((c) => matchSfpBridgedQuoteCarrier(input, c, stemTok, ops));
  if (sfpBridgedQuoteCarrier !== null) {
    {
      const bridgedMood = quotedPropositionMood(
        stemTok, ops, sfpBridgedQuoteCarrier.quotedSfp
      );
      const chainMood = sfpBridgedQuoteCarrier.carrier.quotedMood;
      ops.push(absorbBareTeDirectiveIntoCarrier(ops, {
        ...sfpBridgedQuoteCarrier.carrier,
        quotedSfp: sfpBridgedQuoteCarrier.quotedSfp,
        ...quotedMoodPayload(bridgedMood),
        ...(chainMood === undefined ? {} : { quotedChainMood: chainMood })
      }, stemTok));
    }
    state.sfp = matchTerminalSfpArbitration(input, cursor, stemTok, ops);
    return "break";
  }

  const sfpClosedExemplification = cursor.tx((c) => {
    let closedSfp: SfpNode | null = null;
    for (let attempt = 0; attempt < TERMINAL_SFP_RUN_BRIDGE_LIMIT; attempt += 1) {
      const next = matchTerminalSfpArbitration(input, c, stemTok, ops);
      if (next === null) {
        return null;
      }
      if (closedSfp === null) {
        closedSfp = next;
      }
      const connective = matchSfpClosedExemplificationConnective(input, c);
      if (connective !== null) {
        return { ...connective, closedSfp, closedChainMood: quotedPropositionMood(stemTok, ops, null) };
      }
    }
    return null;
  });
  if (sfpClosedExemplification !== null) {
    ops.push(sfpClosedExemplification);
    return "continue";
  }

  const terminalSfpMatch = matchTerminalSfpArbitration(input, cursor, stemTok, ops);
  if (terminalSfpMatch !== null) {
    state.sfp = terminalSfpMatch;
    return "break";
  }
  return "next";
}

function parseTailClassifiedAux(
  pc: TailParseContext,
  state: TailParseState,
  token: RuntimeHaruToken
): TailLoopSignal {
  const { input, tokens, start, stemTok, stemNode, ops, cursor } = pc;
  const precedingIdx = previousNonSpaceIndex(tokens, cursor.pos);
  const pairedConcessiveNegativeAux =
    input.outgoingBoundaryHint?.pairedConcessive?.negativeAuxIdx ===
    sourceIndexForInputPosition(input, cursor.pos);
  const result = pairedConcessiveNegativeAux
    ? NEGATION_OK
    : classifyTailAux(
      token,
      tokens[cursor.pos + 1],
      stemNode,
      precedingIdx === null ? undefined : tokens[precedingIdx],
      ops
    );
  const connectivePositionSignal = rejectTailConnectiveOutOfPosition(pc, token, result);
  if (connectivePositionSignal !== "next") {
    return connectivePositionSignal;
  }
  if (result.classifications.length === 0) {
    return recoverUnclassifiedTailToken(pc, state, token, result);
  }

  if (
    result.classifications.length === 1 &&
    result.classifications[0] === "negation" &&
    isNaiOrNuToken(token)
  ) {
    const chainStartFailure = validateNegationChainStart({
      pos: cursor.pos,
      start,
      stemTok,
      token,
      previousOp: ops.length > 0 ? ops[ops.length - 1] : undefined
    });
    if (chainStartFailure !== null) {
      return { return: chainStartFailure };
    }
    ops.push(collectNegationChain(cursor, pairedConcessiveNegativeAux));
    return "continue";
  }

  for (const cls of result.classifications) {
    const built = buildOpFromClassification(cls, token, cursor.pos, ops);
    const previous = ops.at(-1);
    if (
      built.kind === "negation" &&
      previous?.kind === "negation" &&
      ((previous.source.tokens.at(-1)?.pos ?? 0) & POS5A) === 連用形_
    ) {
      ops[ops.length - 1] = mergeNegationOps(previous, built);
    } else {
      ops.push(built);
    }
  }
  cursor.advance();
  return "continue";
}

function rejectTailConnectiveOutOfPosition(
  pc: TailParseContext,
  token: RuntimeHaruToken,
  result: AuxClassResult
): TailLoopSignal {
  const { input, tokens, cursor } = pc;
  const classifiedConnective = result.classifications.includes("connective")
    ? lookupConnectiveBySurface(token.surface)
    : undefined;
  if (
    classifiedConnective !== undefined &&
    connectiveSurfaceRequiresFinalPosition(classifiedConnective, token.surface) &&
    cursor.pos + 1 < cursor.end
  ) {
    if (input.stopAtUnparsedTail === true) {
      return "break";
    }
    return { return: {
      ok: false,
      reason: `position ${cursor.pos} (surface=${token.surface}): connective is admitted only at chain-final position`,
      position: cursor.pos
    } };
  }
  if (
    result.classifications.includes("connective") &&
    teDeContinuationRelationAt(tokens, cursor.pos, {
      consumers: ["tail_multi_clause"],
      lookups: input.lookups
    }) !== null
  ) {
    if (input.stopAtUnparsedTail === true) {
      return "break";
    }
    return { return: {
      ok: false,
      reason: `position ${cursor.pos} (surface=${token.surface}): te/de connective opens postverb operator tail`,
      position: cursor.pos
    } };
  }
  return "next";
}

function recoverUnclassifiedTailToken(
  pc: TailParseContext,
  state: TailParseState,
  token: RuntimeHaruToken,
  result: AuxClassResult
): TailLoopSignal {
  const { input, ops, cursor } = pc;
  const p4 = token.pos & POS4;
  const dialectYaOnRealizedChain = p4 === 助動詞_ヤ && (
    ops.some((op) => op.kind === "copula") ||
    (
      (token.pos & POS5) === 連用形_促音便 &&
      ops.some((op) => op.kind === "tense")
    )
  );
  if (
    !dialectYaOnRealizedChain &&
    (p4 === 助動詞_ダ || p4 === 助動詞_デス || p4 === 助動詞_ジャ || p4 === 助動詞_ヤ)
  ) {
    const copulaStart = cursor.pos;
    const copulaRecovery = matchCopulaAtCursor(cursor, input.lookups, {
      allowAdnominalTerminal: input.allowAdnominalCopulaTerminal === true
    }, input);
    if (copulaRecovery !== null) {
      if (copulaRecovery.adnominal) {
        state.explicitTerminal = "attributive";
        state.adnominalCopulaTerminalMarkerPos = copulaStart;
      }
      ops.push(...(copulaRecovery.ops ?? [copulaRecovery.op]));
      return "continue";
    }
  }
  if (input.stopAtUnparsedTail === true) {
    return "break";
  }
  const reason = result.reason ?? `out-of-subset token: pos=${JSON.stringify(token.pos)}`;
  return { return: {
    ok: false,
    reason: `position ${cursor.pos} (surface=${token.surface}): ${reason}`,
    position: cursor.pos
  } };
}

function trimTrailingFragmentOps(
  ops: AuxOpNode[],
  isFragmentForm: (pos5A: number) => boolean
): number | null {
  let end: number | null = null;
  while (ops.length > 0) {
    const lastOp = ops[ops.length - 1]!;
    const lastTok = opLastSourceToken(lastOp);
    if (lastTok === undefined || !isFragmentForm(lastTok.pos & POS5A)) {
      return end;
    }
    const start = lastOp.source.tokenIndices[0];
    if (start === undefined) {
      return null;
    }
    end = start;
    ops.pop();
  }
  return end;
}

export interface TailContinuationInput {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly hostIdx: number;
  readonly semanticHostIdx?: number;
  readonly cursorStart: number;
  readonly reachEndExclusive: number;
  readonly stem: StemInput;
  readonly lookups: LookupTables;
  readonly allowZeroNiPurposeTerminal?: boolean;
  readonly clauseContinuesAfterReach?: boolean;
  readonly allowElidedColloquialObligation?: ElidedColloquialObligationContext;
  readonly outgoingBoundaryHint?: ParseOutgoingBoundaryHint;
}

export interface TailContinuation {
  readonly ops: readonly AuxOpNode[];
  readonly sfp: SfpNode | null;
  readonly terminal: AuxLayerNode["terminal"];
  readonly terminalPayload?: AuxLayerNode["terminalPayload"];
  readonly endExclusive: number;
}

export function parseTailContinuation(input: TailContinuationInput): TailContinuation | null {
  const { tokens, hostIdx, cursorStart, reachEndExclusive } = input;
  const hostToken = tokens[hostIdx];
  if (hostToken === undefined || cursorStart <= hostIdx || reachEndExclusive < cursorStart) {
    return null;
  }
  const parseSlice = [hostToken, ...tokens.slice(cursorStart, reachEndExclusive)];
  const semanticHostToken = input.semanticHostIdx === undefined ? undefined : tokens[input.semanticHostIdx];
  const parsed = parseTail({
    tokens: parseSlice,
    start: 0,
    stem: input.stem,
    lookups: input.lookups,
    contextTokens: tokens,
    stopAtUnparsedTail: true,
    stemTerminalOwnedByCaller: true,
    allowRenyouChuushiTerminal: input.clauseContinuesAfterReach === true,
    ...(semanticHostToken === undefined ? {} : { semanticStemToken: semanticHostToken }),
    ...(input.allowZeroNiPurposeTerminal === true ? { allowZeroNiPurposeTerminal: true } : {}),
    ...(input.allowElidedColloquialObligation === undefined
      ? {}
      : { allowElidedColloquialObligation: input.allowElidedColloquialObligation }),
    ...(input.outgoingBoundaryHint === undefined ? {} : { outgoingBoundaryHint: input.outgoingBoundaryHint }),
    sourceIndexMap: [hostIdx, ...continuationIndices(cursorStart, reachEndExclusive)]
  });
  if (!parsed.ok) {
    return null;
  }
  const layer = firstAuxLayer(parsed.root.tail);
  if (layer === null) {
    return null;
  }
  return {
    ops: layer.ops,
    sfp: parsed.root.sfp,
    terminal: layer.terminal,
    ...(layer.terminalPayload === undefined ? {} : { terminalPayload: layer.terminalPayload }),
    endExclusive: cursorStart + (parsed.consumed - 1)
  };
}

function continuationIndices(start: number, endExclusive: number): readonly number[] {
  const indices: number[] = [];
  for (let idx = start; idx < endExclusive; idx += 1) {
    indices.push(idx);
  }
  return indices;
}

function isElidedColloquialObligationTerminal(op: AuxOpNode): boolean {
  return op.kind === "idiom" &&
    op.idiom === "obligation" &&
    (op.variant === "colloquial_nakya" || op.variant === "colloquial_nakucha") &&
    op.source.tokens.length <= 2;
}

function relocateRoot(
  root: ParsedTailRoot,
  streamStart: number,
  prependSource: OpSource | undefined,
  finalConjugationAnchor: number | undefined,
  finalSemanticAnchors: readonly number[] | undefined,
  sourceIndexMap: readonly number[] | undefined,
  stemSourceOverride: OpSource | undefined
): ParsedTailRoot {
  if (prependSource !== undefined &&
    prependSource.tokens.length !== prependSource.tokenIndices.length) {
    throw new Error(
      `relocateRoot: prependSource length mismatch (tokens=${prependSource.tokens.length}, ` +
      `tokenIndices=${prependSource.tokenIndices.length}) — OpSource pair invariant 위반`
    );
  }
  if (stemSourceOverride !== undefined &&
    stemSourceOverride.tokens.length !== stemSourceOverride.tokenIndices.length) {
    throw new Error(
      `relocateRoot: stemSourceOverride length mismatch (tokens=${stemSourceOverride.tokens.length}, ` +
      `tokenIndices=${stemSourceOverride.tokenIndices.length}) — OpSource pair invariant 위반`
    );
  }

  const mapIndex = (i: number): number => sourceIndexMap?.[i] ?? (i + streamStart);

  const shiftSource = (src: OpSource): OpSource => ({
    tokens: src.tokens,
    tokenIndices: src.tokenIndices.map(mapIndex)
  });

  const finalizeTopStem = (stem: StemNode): StemNode => {
    const baseSource = stemSourceOverride ?? shiftSource(stem.source);
    if (prependSource === undefined || prependSource.tokens.length === 0) {
      const needsAnchorOverride =
        stemSourceOverride !== undefined ||
        finalConjugationAnchor !== undefined ||
        finalSemanticAnchors !== undefined;
      if (!needsAnchorOverride) {
        switch (stem.kind) {
          case "verb": return { ...stem, source: baseSource };
          case "adj": return { ...stem, source: baseSource };
          case "noun": return { ...stem, source: baseSource };
          case "adverb": return { ...stem, source: baseSource };
          case "candidateSet": return { ...stem, source: baseSource };
        }
      }
      const conjugationAnchor = finalConjugationAnchor ?? stem.conjugationAnchor;
      const semanticAnchors = finalSemanticAnchors ?? stem.semanticAnchors;
      assertStemAnchorBounds(baseSource, conjugationAnchor, semanticAnchors);
      switch (stem.kind) {
        case "verb": return { ...stem, source: baseSource, conjugationAnchor, semanticAnchors };
        case "adj": return { ...stem, source: baseSource, conjugationAnchor, semanticAnchors };
        case "noun": return { ...stem, source: baseSource, conjugationAnchor, semanticAnchors };
        case "adverb": return { ...stem, source: baseSource, conjugationAnchor, semanticAnchors };
        case "candidateSet": return { ...stem, source: baseSource, conjugationAnchor, semanticAnchors };
      }
    }
    const newSource: OpSource = {
      tokens: [...prependSource.tokens, ...baseSource.tokens],
      tokenIndices: [...prependSource.tokenIndices, ...baseSource.tokenIndices]
    };
    const conjugationAnchor = finalConjugationAnchor ?? prependSource.tokens.length;
    const semanticAnchors = finalSemanticAnchors ??
      Array.from({ length: prependSource.tokens.length }, (_, i) => i);
    assertStemAnchorBounds(newSource, conjugationAnchor, semanticAnchors);
    switch (stem.kind) {
      case "verb": return { ...stem, source: newSource, conjugationAnchor, semanticAnchors };
      case "adj": return { ...stem, source: newSource, conjugationAnchor, semanticAnchors };
      case "noun": return { ...stem, source: newSource, conjugationAnchor, semanticAnchors };
      case "adverb": return { ...stem, source: newSource, conjugationAnchor, semanticAnchors };
      case "candidateSet": return { ...stem, source: newSource, conjugationAnchor, semanticAnchors };
    }
  };

  const walkAuxOp = (op: AuxOpNode): AuxOpNode => {
    if ("inner" in op && (op as { inner?: TailNode }).inner !== undefined) {
      throw new Error(
        `relocateRoot: AuxOp.inner not supported (op kind=${op.kind}) — walker 갱신 필요`
      );
    }
    if (op.kind === "connective" && op.closedSfp !== undefined) {
      return {
        ...op,
        source: shiftSource(op.source),
        closedSfp: { ...op.closedSfp, source: shiftSource(op.closedSfp.source) }
      };
    }
    if (op.kind === "predicateQuoteCarrier" && op.quotedSfp !== undefined) {
      return {
        ...op,
        source: shiftSource(op.source),
        quotedSfp: { ...op.quotedSfp, source: shiftSource(op.quotedSfp.source) }
      };
    }
    return { ...op, source: shiftSource(op.source) };
  };

  const walkTerminalPayload = (payload: NonNullable<AuxLayerNode["terminalPayload"]>): NonNullable<AuxLayerNode["terminalPayload"]> =>
    payload.kind === "renyouChuushi" ? { ...payload, source: shiftSource(payload.source) } : payload;

  const walkAuxLayer = (layer: AuxLayerNode, isTopLevel: boolean): AuxLayerNode => ({
    ...layer,
    stem: isTopLevel
      ? materializeStemMood(finalizeTopStem(layer.stem))
      : { ...layer.stem, source: shiftSource(layer.stem.source) },
    ops: layer.ops.map(walkAuxOp),
    ...(layer.terminalPayload === undefined ? {} : { terminalPayload: walkTerminalPayload(layer.terminalPayload) })
  });

  const walkTail = (tail: TailNode, isTopLevel: boolean): TailNode => {
    if (tail.kind === "auxLayer") return walkAuxLayer(tail, isTopLevel);
    return {
      ...tail,
      inner: walkAuxLayer(tail.inner, isTopLevel),
      source: shiftSource(tail.source),
      outer: walkTail(tail.outer, false)
    };
  };

  return {
    ...root,
    tail: walkTail(root.tail, true),
    sfp: root.sfp !== null ? { ...root.sfp, source: shiftSource(root.sfp.source) } : null
  };
}

export function normalizeTosuruModeForTerminal(
  ops: readonly AuxOpNode[],
  terminalPayload: AuxLayerNode["terminalPayload"] | undefined
): readonly AuxOpNode[] {
  if (terminalPayload?.kind !== "attributiveBoundary") {
    return ops;
  }
  const follower = terminalPayload.source.tokens[0];
  if (follower === undefined) {
    return ops;
  }
  let changed = false;
  const normalized = ops.map((op): AuxOpNode => {
    if (
      op.kind !== "predicateQuoteCarrier" ||
      op.style !== "suru_attributive" ||
      op.tosuruMode !== "resultative_make"
    ) {
      return op;
    }
    const carrier = op.source.tokens.at(-1);
    if (carrier === undefined || !tosuruResultativeMakeYieldsToAttributiveQuoteHead(carrier, follower)) {
      return op;
    }
    changed = true;
    return { ...op, tosuruMode: "quote" };
  });
  return changed ? normalized : ops;
}

function pushScopeBridgeOps(
  ops: AuxOpNode[],
  bridge: ScopeBridgeOp,
  tokens: readonly RuntimeHaruToken[]
): void {
  ops.push(bridge);
  if (bridge.conjecture !== true) {
    return;
  }
  const conjectureIdx = bridge.source.tokenIndices[bridge.source.tokenIndices.length - 1];
  const conjectureToken = conjectureIdx === undefined ? undefined : tokens[conjectureIdx];
  if (conjectureToken === undefined || conjectureIdx === undefined) {
    return;
  }
  ops.push(buildConjectureOp(srcSingle(conjectureToken, conjectureIdx), false));
}
