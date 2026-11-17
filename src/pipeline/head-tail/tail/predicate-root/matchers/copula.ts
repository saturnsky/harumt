import { secondaryParticleCanonical } from "../../../../particles/secondary-particle.js";
import type { RuntimeHaruToken } from "../../../../../types/token.js";
import { isExternalNominalizerConnectiveKind } from "../../../boundary/relation.js";
import type { ScopeBridgeMarkerRelation } from "../../../boundary/relation.js";
import { POS0, POS01, POS1, POS4, POS5, POS5A, 已然形_, 仮定形_, 格助詞, 記号, 終止形_, 助詞, 助詞_係助詞, 助詞_終助詞, 助動詞 as 助動詞0, 助動詞_ジャ, 助動詞_ダ, 助動詞_デス, 助動詞_マス, 助動詞_タイ, 助動詞_マイ, 助動詞_ヤ, 接続助詞, 副助詞, 文語助動詞_ナリ_断定, 補助記号, 名詞, 動詞, 動詞_非自立可能, 未然形_, isAuxiliaryStemToken, isNaAdjCapable, NOMINAL_BITS, pos0in, 連体形_, 連用形_, 連用形_促音便, 意志推量形_, 助詞_接続助詞, 助動詞語幹, isImperativeInflection } from "../../../../../types/pos.js";
import type { LookupTables } from "../../../../lookup-tables.js";
import { copulaDeHostExcludedFromElidedNegativeBody, copulaDeMarkerRelationForToken, copulaElidedNegativeBodyHostAdmits, copulaHonorificSupportRelationAt, copulaNiMarkerRelationForToken, dewaScopeBridgeRelationAt, kaMarkerRelationForToken, nominalLinkMarkerRelationAt, nominalizerCopulaSupportRelationAt, predicateNominalizerRelationForToken } from "../../../boundary/marker.js";
import { explicitTerminalQuestionKaFollowerRelationAt } from "../../../boundary/ka-ownership.js";
import { matchFocusConnectiveAt } from "./focus-connective.js";
import { matchFocusLimitCarrier } from "./focus-limit-carrier.js";
import { matchQuantityExtentDakeAt } from "./quantity-extent.js";
import {
  looksLikePurposeEvaluationNoNi,
  looksPronominalNoNi,
  looksPronominalNoNiResult
} from "../../../boundary/pronominal-no.js";
import type { AuxOpNode, ConnectiveOp, CopulaOp, OpSource } from "../grammar.js";
import { srcSingle, srcSlice } from "../source.js";
import { copulaConcessiveImperativeEvidenceAt } from "../classifiers/copula-concessive.js";
import { quoteStructuralRelationAt } from "../../../../structural-relation/quote.js";
import { activeProtoLayout } from "../../../../clause-layout/proto-state.js";
import {
  DEARE_CONCESSIVE_CONNECTIVE_SURFACE,
  DEAROU_CONCESSIVE_CONNECTIVE_SURFACE,
  DEARU_CONCESSIVE_CONNECTIVE_SURFACE,
  DEARI_LISTING_CONNECTIVE_SURFACE,
  DEARU_SIMULTANEOUS_CONNECTIVE_SURFACE,
  isAffirmativeCopulaSupportVerbToken,
  isAruVerbToken,
  fusedCopulaSupportConnectiveKindOf,
  fusedCopulaSupportHostSlotAt,
  copulaSupportSimultaneousConnectiveTokenCountAt,
  isCopulaJaNegativeBridgeSurface,
  isCopulaJaNegativeBridgeToken,
  isKotoNounToken,
  isMisclassifiedDashiCopulaListingToken,
  isMonoReasonNounToken,
  isSayVerbToken,
  isShimeruCausativeAuxToken,
  isUnrealizableCopulaMizenSupportAuxiliary,
  isWakeNounToken,
  volitionalConcessiveMarkerTokenCountAt,
  copulaHonorificVoiceClusterLength,
  isIntrinsicHonorificCopulaSupportVerbToken,
  isMizenVoiceHonorificCopulaSupportVerbToken,
  isTerminalQuestionSfpParticleStart
} from "../classifiers/tokens.js";
import type { FusedCopulaSupportHostSlot } from "../classifiers/tokens.js";

const COPULA_CHAIN_FUSED_HOST_SLOTS: ReadonlySet<FusedCopulaSupportHostSlot> =
  new Set<FusedCopulaSupportHostSlot>(["copula_host", "none"]);
import { matchNegationEnding, type NegationEndingMatch } from "./negation-ending.js";
import { matchCompositeConnectiveAt } from "./connective.js";
import {
  matchBoundNominalListingConnectiveAt,
  matchBoundNominalReasonConnectiveAt
} from "./bound-nominal-connective.js";
import { matchEpistemicHedgePostverbAuxiliary } from "./epistemic-hedge.js";
import { matchKamoShirenaiSequence } from "./kamo-modal.js";
import {
  matchScopeBridge,
  matchScopeBridgeTail
} from "./scope-bridge.js";
import { isObligationSpanStartingAtToken } from "./obligation.js";
import { postverbAuxiliaryPayloadsForForm } from "../postverb-auxiliary-table.js";
import { TokenCursor } from "../../../../token-cursor.js";
import { nextNonSpaceIndex, previousNonSpaceIndex } from "../../../../clause-layout/trivia.js";
import { activeProtoClosesClauseAtDetachedTerminalNodaAfter } from "../../../../clause-layout/proto-state.js";
import { plainNominalizerFrameEndVerdictAt } from "./nominalizer.js";
import { createConjectureOp, createConnectiveOp, createCopulaOp } from "../op-builders.js";


export function isFusedJaCopulaToken(token: RuntimeHaruToken | undefined): token is RuntimeHaruToken {
  return token !== undefined &&
    token.surface === "じゃ" &&
    (token.pos & (POS4 | POS5A)) === (助動詞_ダ | 連用形_);
}

export function buildCopulaOp(
  source: OpSource,
  variant: CopulaOp["variant"],
  polarity: CopulaOp["polarity"],
  polite: boolean,
  options: Pick<CopulaOp, "basicForm" | "negativeBridgeForm" | "honorific"> = {}
): CopulaOp {
  return createCopulaOp({  source, variant, ...options, polarity, polite });
}

function negativeCopulaBridgeBodyStart(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): number | null {
  if (isCopulaJaNegativeBridgeToken(tokens[pos])) {
    return pos + 1;
  }
  const dewa = dewaScopeBridgeRelationAt(tokens, pos, {
    anchorIdx: pos,
    consumers: ["tail_multi_clause"]
  });
  return dewa?.focusParticle === "wa" ? dewa.span.endExclusive : null;
}

function matchNegativeCopulaBridgeBody(
  tokens: readonly RuntimeHaruToken[],
  bodyStart: number
): NegationEndingMatch | null {
  return matchNegationEnding(tokens, bodyStart, { allowAttributive: true, allowConjecture: true });
}

export function negativeCopulaBridgeOpensAt(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): boolean {
  const bodyStart = negativeCopulaBridgeBodyStart(tokens, pos);
  return bodyStart !== null && matchNegativeCopulaBridgeBody(tokens, bodyStart) !== null;
}

function copulaNegationBridgeMatch(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  consumed: number,
  negEnd: NegationEndingMatch,
  bridgeForm: NonNullable<CopulaOp["negativeBridgeForm"]>
): { readonly op: CopulaOp; readonly ops?: readonly AuxOpNode[]; readonly consumed: number } {
  const copula = buildCopulaOp(
    srcSlice(tokens, pos, consumed),
    "basic",
    "negative",
    negEnd.polite,
    { negativeBridgeForm: bridgeForm }
  );
  if (negEnd.conjecture !== true) {
    return { op: copula, consumed };
  }
  const conjectureIdx = pos + consumed - 1;
  const conjectureToken = tokens[conjectureIdx];
  if (conjectureToken === undefined) {
    return { op: copula, consumed };
  }
  const conjecture = createConjectureOp({
    source: srcSingle(conjectureToken, conjectureIdx),
    polite: false
  });
  return { op: copula, ops: [copula, conjecture], consumed };
}

function isClassicalJaCopulaSurface(surface: string): boolean {
  return isCopulaJaNegativeBridgeSurface(surface);
}

function dialectYaCopulaHostSlotAdmits(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): boolean {
  const token = tokens[pos];
  if (token === undefined) return false;
  if ((token.pos & POS4) !== 助動詞_ヤ) {
    return true;
  }
  if (token.surface !== "や" && token.surface !== "やっ") {
    return false;
  }
  const nextIdx = nextNonSpaceIndex(tokens, pos + 1, tokens.length);
  const next = nextIdx === null ? undefined : tokens[nextIdx];
  if (next === undefined) {
    return true;
  }
  if ((next.pos & POS4) === 助動詞_ダ) {
    return false;
  }
  const pos0 = next.pos & POS0;
  return pos0 === 助詞 || pos0 === 助動詞0 || pos0 === 補助記号 || pos0 === 記号;
}

function adnominalCopulaHostSlotAdmits(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): boolean {
  const previousIdx = previousNonSpaceIndex(tokens, pos);
  const previous = previousIdx === null ? undefined : tokens[previousIdx];
  if (previous === undefined || (previous.pos & POS0) !== 助動詞0) {
    return true;
  }
  const previousPos4 = previous.pos & POS4;
  return previousPos4 !== 助動詞_ダ &&
    previousPos4 !== 助動詞_デス &&
    previousPos4 !== 助動詞_ジャ &&
    previousPos4 !== 助動詞_ヤ;
}

function isClassicalJaConjectureSurface(surface: string): boolean {
  return /^じゃろ(?:[うぅー]+)?$/u.test(surface);
}

export function isAssertiveCopulaMarkerToken(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined) return false;
  const pos5A = token.pos & POS5A;
  if (pos5A !== 終止形_ && pos5A !== 連用形_) return false;
  const pos4 = token.pos & POS4;
  if (pos4 === 助動詞_ダ || pos4 === 助動詞_ヤ) return true;
  return pos4 === 助動詞_ジャ && isClassicalJaCopulaSurface(token.surface);
}

function copulaConjectureConcessiveConsumedAt(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number,
  lookups: LookupTables | undefined,
  sourceContext: { readonly tokens: readonly RuntimeHaruToken[]; readonly index: number } | undefined,
  markerOffsetFromCopula: number
): number | null {
  const consumed = volitionalConcessiveMarkerTokenCountAt(tokens, markerIdx);
  if (consumed === null || lookups === undefined || activeProtoLayout() === null) {
    return null;
  }
  const scanTokens = sourceContext?.tokens ?? tokens;
  const scanIdx = sourceContext === undefined
    ? markerIdx
    : sourceContext.index + markerOffsetFromCopula;
  const marker = tokens[markerIdx];
  if (marker === undefined || scanTokens[scanIdx] !== marker) {
    return null;
  }
  if (volitionalConcessiveMarkerTokenCountAt(scanTokens, scanIdx) !== consumed) {
    return null;
  }
  if (
    quoteStructuralRelationAt(
      new TokenCursor(scanTokens, scanIdx, scanTokens.length),
      lookups
    ) !== undefined
  ) {
    return null;
  }
  const afterMarker = scanTokens[scanIdx + consumed];
  if (afterMarker !== undefined && isSayVerbToken(afterMarker)) {
    return null;
  }
  return consumed;
}

export type ElidedDewaNegativeBodyClosureKind = "question" | "statement";

export interface ElidedDewaNegativeBodyClosure {
  readonly kind: ElidedDewaNegativeBodyClosureKind;
  readonly quoteMarker: boolean;
}

function elidedDewaNegativeBodyHostAdmits(
  tokens: readonly RuntimeHaruToken[],
  copulaIdx: number,
  markerKind: ScopeBridgeMarkerRelation["markerKind"],
  closure: ElidedDewaNegativeBodyClosureKind,
  sourceContext?: {
    readonly tokens: readonly RuntimeHaruToken[];
    readonly index: number;
  }
): boolean {
  const host = tokens[copulaIdx - 1];
  if (host === undefined || isAuxiliaryStemToken(host)) {
    return false;
  }
  const preceding = tokenBeforeElidedDewaHost(tokens, copulaIdx - 1, sourceContext);
  if (copulaDeHostExcludedFromElidedNegativeBody(tokens, copulaIdx - 1, preceding)) {
    return false;
  }
  if (markerKind === "particle") {
    return closure === "question" && copulaElidedNegativeBodyHostAdmits(tokens, copulaIdx, preceding);
  }
  const naAdjHost = isNaAdjCapable(host);
  if (!naAdjHost && !pos0in(host.pos & POS0, NOMINAL_BITS)) {
    return false;
  }
  return closure === "question" ||
    naAdjHost ||
    isKotoNounToken(host) ||
    isMonoReasonNounToken(host);
}

function tokenBeforeElidedDewaHost(
  tokens: readonly RuntimeHaruToken[],
  hostIdx: number,
  sourceContext?: {
    readonly tokens: readonly RuntimeHaruToken[];
    readonly index: number;
  }
): RuntimeHaruToken | undefined {
  if (hostIdx >= 1) {
    return tokens[hostIdx - 1];
  }
  if (sourceContext === undefined || sourceContext.tokens === tokens) {
    return undefined;
  }
  const absoluteHost = sourceContext.index - 1;
  if (absoluteHost < 1 || sourceContext.tokens[absoluteHost] !== tokens[hostIdx]) {
    return undefined;
  }
  return sourceContext.tokens[absoluteHost - 1];
}

export function elidedDewaNegativeBodyHostAdmitsAt(
  tokens: readonly RuntimeHaruToken[],
  copulaIdx: number,
  closure: ElidedDewaNegativeBodyClosureKind
): boolean {
  const bridge = dewaScopeBridgeRelationAt(tokens, copulaIdx, {
    anchorIdx: copulaIdx,
    consumers: ["tail_multi_clause"]
  });
  if (bridge?.focusParticle !== "wa") {
    return false;
  }
  return elidedDewaNegativeBodyHostAdmits(tokens, copulaIdx, bridge.markerKind, closure);
}

export function matchCopula(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  lookups?: LookupTables,
  options?: {
    readonly allowAdnominalTerminal?: boolean;
    readonly elidedDewaNegativeBody?: ElidedDewaNegativeBodyClosure;
    readonly sourceContext?: {
      readonly tokens: readonly RuntimeHaruToken[];
      readonly index: number;
    };
  }
): { readonly op: CopulaOp; readonly ops?: readonly AuxOpNode[]; readonly consumed: number } | null {
  const t0 = tokens[pos];
  if (t0 === undefined) return null;
  const t0pos4 = t0.pos & POS4;
  const t0pos5A = t0.pos & POS5A;

  if (t0.surface === "なら" && (t0pos4 & POS4) === 助動詞_ダ && t0pos5A === 仮定形_) {
    const t1 = tokens[pos + 1];
    if (isShimeruCausativeAuxToken(t1)) {
      return {
        op: buildCopulaOp(srcSlice(tokens, pos, 1), "basic", "affirmative", false),
        consumed: 1
      };
    }
    const formalConditionalConsumed =
      t1?.surface === "ば" && (t1.pos & POS01) === 助詞_接続助詞
        ? 2
        : 1;
    return {
      op: buildCopulaOp(
        srcSlice(tokens, pos, formalConditionalConsumed),
        "conditional_nara",
        "affirmative",
        false
      ),
      consumed: formalConditionalConsumed
    };
  }

  if (
    t0.surface === "な" &&
    (t0pos4 & POS4) === 助動詞_ダ &&
    t0pos5A === 連体形_ &&
    adnominalCopulaHostSlotAdmits(tokens, pos) &&
    (
      adnominalCopulaTailFollows(tokens, pos + 1, lookups, followerSourceContext(options?.sourceContext)) ||
      options?.allowAdnominalTerminal === true
    )
  ) {
    return {
      op: buildCopulaOp(srcSlice(tokens, pos, 1), "basic", "affirmative", false),
      consumed: 1
    };
  }

  if (
    (t0pos4 & POS4) === 助動詞_デス &&
    t0pos5A === 連体形_ &&
    adnominalCopulaTailFollows(tokens, pos + 1, lookups)
  ) {
    return {
      op: buildCopulaOp(srcSlice(tokens, pos, 1), "basic", "affirmative", true),
      consumed: 1
    };
  }

  if (
    (t0pos4 & POS4) === 文語助動詞_ナリ_断定 &&
    t0pos5A === 已然形_ &&
    ((tokens[pos + 1]?.pos ?? 0) & POS01) === 助詞_接続助詞 &&
    tokens[pos + 1]?.surface === "ば"
  ) {
    return {
      op: buildCopulaOp(srcSlice(tokens, pos, 2), "conditional_nara", "affirmative", false),
      consumed: 2
    };
  }

  const fusedSupportConnective = COPULA_CHAIN_FUSED_HOST_SLOTS.has(fusedCopulaSupportHostSlotAt(tokens, pos))
    ? fusedCopulaSupportConnectiveKindOf(t0)
    : null;
  if (fusedSupportConnective === "conditional") {
    return {
      op: buildCopulaOp(srcSlice(tokens, pos, 1), "conditional_nara", "affirmative", false),
      consumed: 1
    };
  }
  if (fusedSupportConnective === "concessive") {
    const copula = buildCopulaOp(srcSlice(tokens, pos, 1), "basic", "affirmative", false);
    const connective: ConnectiveOp = createConnectiveOp({
      connective: "even_if",
      surface: DEARU_CONCESSIVE_CONNECTIVE_SURFACE,
      source: srcSlice(tokens, pos, 1)
    });
    return { op: copula, ops: [copula, connective], consumed: 1 };
  }

  if (
    (t0pos4 & POS4) === 文語助動詞_ナリ_断定 &&
    (t0pos5A === 終止形_ || t0pos5A === 連用形_ || t0pos5A === 連体形_)
  ) {
    return {
      op: buildCopulaOp(srcSlice(tokens, pos, 1), "basic", "affirmative", false),
      consumed: 1
    };
  }

  if (
    t0pos5A === 意志推量形_ &&
    (
      (t0pos4 & POS4) === 助動詞_ダ ||
      (t0pos4 & POS4) === 助動詞_デス ||
      (t0pos4 & POS4) === 助動詞_ヤ ||
      ((t0pos4 & POS4) === 助動詞_ジャ && isClassicalJaConjectureSurface(t0.surface))
    )
  ) {
    const conjectureConcessive = (t0pos4 & POS4) === 助動詞_デス ? null : copulaConjectureConcessiveConsumedAt(
      tokens,
      pos + 1,
      lookups,
      options?.sourceContext,
      1
    );
    if (conjectureConcessive !== null) {
      const consumed = 1 + conjectureConcessive;
      const source = srcSlice(tokens, pos, consumed);
      const concessiveCopula = buildCopulaOp(source, "basic", "affirmative", false);
      const connective: ConnectiveOp = createConnectiveOp({
        connective: "even_if",
        surface: DEAROU_CONCESSIVE_CONNECTIVE_SURFACE,
        source
      });
      return { op: concessiveCopula, ops: [concessiveCopula, connective], consumed };
    }
    return {
      op: buildCopulaOp(
        srcSlice(tokens, pos, 1),
        "conjecture",
        "affirmative",
        (t0pos4 & POS4) === 助動詞_デス
      ),
      consumed: 1
    };
  }

  if (isCopulaJaNegativeBridgeToken(t0)) {
    const negEnd = matchNegativeCopulaBridgeBody(tokens, pos + 1);
    if (negEnd !== null) {
      return copulaNegationBridgeMatch(tokens, pos, 1 + negEnd.consumed, negEnd, "ja");
    }
    const support = tokens[pos + 1];
    const mai = tokens[pos + 2];
    if (
      support !== undefined &&
      (support.pos & POS0) === 動詞 &&
      (support.dictionaryForm === "ある" || support.dictionaryForm === "有る") &&
      mai !== undefined &&
      (mai.pos & POS4) === 助動詞_マイ
    ) {
      return {
        op: buildCopulaOp(
          srcSlice(tokens, pos, 2),
          "basic",
          "negative",
          false,
          { negativeBridgeForm: "ja" }
        ),
        consumed: 2
      };
    }
  }

  const copulaDewa = dewaScopeBridgeRelationAt(tokens, pos, {
    anchorIdx: pos,
    consumers: ["tail_multi_clause"]
  });
  if (copulaDewa?.focusParticle === "wa") {
    const negEnd = matchNegativeCopulaBridgeBody(tokens, copulaDewa.span.endExclusive);
    if (negEnd !== null) {
      return copulaNegationBridgeMatch(
        tokens,
        pos,
        copulaDewa.span.endExclusive - pos + negEnd.consumed,
        negEnd,
        "dewa"
      );
    }
    const supportIdx = nextNonSpaceIndex(tokens, copulaDewa.span.endExclusive, tokens.length);
    const maiIdx = supportIdx === null ? null : nextNonSpaceIndex(tokens, supportIdx + 1, tokens.length);
    const support = supportIdx === null ? undefined : tokens[supportIdx];
    const mai = maiIdx === null ? undefined : tokens[maiIdx];
    if (
      supportIdx !== null &&
      maiIdx !== null &&
      support !== undefined &&
      (support.pos & POS0) === 動詞 &&
      (support.dictionaryForm === "ある" || support.dictionaryForm === "有る") &&
      mai !== undefined &&
      (mai.pos & POS4) === 助動詞_マイ
    ) {
      const consumed = supportIdx - pos + 1;
      return {
        op: buildCopulaOp(
          srcSlice(tokens, pos, consumed),
          "basic",
          "negative",
          false,
          { negativeBridgeForm: "dewa" }
        ),
        consumed
      };
    }
    if (
      options?.elidedDewaNegativeBody !== undefined &&
      options.elidedDewaNegativeBody.quoteMarker === false &&
      elidedDewaNegativeBodyHostAdmits(
        tokens,
        pos,
        copulaDewa.markerKind,
        options.elidedDewaNegativeBody.kind,
        options.sourceContext
      ) &&
      nextNonSpaceIndex(tokens, copulaDewa.span.endExclusive, tokens.length) === null
    ) {
      const consumed = copulaDewa.span.endExclusive - pos;
      return {
        op: buildCopulaOp(
          srcSlice(tokens, pos, consumed),
          "basic",
          "negative",
          false,
          { negativeBridgeForm: "dewa" }
        ),
        consumed
      };
    }
  }

  const copulaDe = copulaDeMarkerRelationForToken(t0, pos, { consumers: ["tail_multi_clause"] });

  {
    const honorific = copulaHonorificSupportSpanAt(tokens, pos);
    if (honorific !== null) {
      return {
        op: buildCopulaOp(
          srcSlice(tokens, pos, honorific.consumed),
          honorific.variant,
          honorific.polarity,
          honorific.polite,
          { honorific: true }
        ),
        consumed: honorific.consumed
      };
    }
  }

  if (copulaDe !== null && t0pos5A === 連用形_) {
    if (isObligationSpanStartingAtToken(tokens, pos + 1)) {
      return {
        op: buildCopulaOp(srcSlice(tokens, pos, 1), "basic", "affirmative", false),
        consumed: 1
      };
    }
    const negEnd = matchNegationEnding(tokens, pos + 1, { allowAttributive: true });
    if (negEnd !== null) {
      return {
        op: buildCopulaOp(
          srcSlice(tokens, pos, 1 + negEnd.consumed),
          "basic",
          "negative",
          negEnd.polite
        ),
        consumed: 1 + negEnd.consumed
      };
    }
  }

  if (copulaDe !== null && t0pos5A === 連用形_) {
    const aru = tokens[pos + 1];
    const aruPos5A = (aru?.pos ?? 0) & POS5A;
    if (isAffirmativeCopulaSupportVerbToken(aru)) {
      const copula = buildCopulaOp(
        srcSlice(tokens, pos, 2),
        aruPos5A === 意志推量形_ ? "conjecture" : "basic",
        "affirmative",
        false
      );
      if (aruPos5A === 意志推量形_) {
        const supportConcessive = copulaConjectureConcessiveConsumedAt(
          tokens,
          pos + 2,
          lookups,
          options?.sourceContext,
          2
        );
        if (supportConcessive !== null) {
          const consumed = 2 + supportConcessive;
          const source = srcSlice(tokens, pos, consumed);
          const concessiveCopula = buildCopulaOp(source, "basic", "affirmative", false);
          const connective: ConnectiveOp = createConnectiveOp({
            connective: "even_if",
            surface: DEAROU_CONCESSIVE_CONNECTIVE_SURFACE,
            source
          });
          return { op: concessiveCopula, ops: [concessiveCopula, connective], consumed };
        }
        return { op: copula, consumed: 2 };
      }
      if ((aru.pos & POS5) === 連用形_促音便) {
        return { op: copula, consumed: 2 };
      }
      if (aruPos5A === 連用形_) {
        const following = tokens[pos + 2];
        if (following !== undefined && (following.pos & POS4) === 助動詞_タイ) {
          return { op: copula, consumed: 2 };
        }
        const polite = tokens[pos + 2];
        if (polite !== undefined && (polite.pos & POS4) === 助動詞_マス) {
          return { op: copula, consumed: 2 };
        }
        if (postverbAuxiliaryPayloadsForForm(tokens[pos + 2]?.dictionaryForm)
          .some((auxiliary) => auxiliary.kind === "potential")) {
          return { op: copula, consumed: 2 };
        }
        const simultaneousTokens = copulaSupportSimultaneousConnectiveTokenCountAt(tokens, pos + 1);
        if (simultaneousTokens !== null) {
          const consumed = 2 + simultaneousTokens;
          const connective: ConnectiveOp = createConnectiveOp({

            connective: "simultaneous",
            surface: DEARU_SIMULTANEOUS_CONNECTIVE_SURFACE,
            source: srcSlice(tokens, pos, consumed)
          });
          return { op: copula, ops: [copula, connective], consumed };
        }
        const connective: ConnectiveOp = createConnectiveOp({

          connective: "listing",
          surface: DEARI_LISTING_CONNECTIVE_SURFACE,
          source: srcSlice(tokens, pos, 2)
        });
        return { op: copula, ops: [copula, connective], consumed: 2 };
      }
      if (aruPos5A === 未然形_ && !isUnrealizableCopulaMizenSupportAuxiliary(tokens[pos + 2])) {
        return { op: copula, consumed: 2 };
      }
      if (aruPos5A === 終止形_ || aruPos5A === 連体形_) {
        return {
          op: copula,
          consumed: 2
        };
      }
      if (isImperativeInflection(aru.pos)) {
        if (
          copulaConcessiveImperativeEvidenceAt(
            options?.sourceContext?.tokens ?? tokens,
            options?.sourceContext?.index ?? pos,
            lookups
          ) !== null
        ) {
          const connective: ConnectiveOp = createConnectiveOp({
            connective: "even_if",
            surface: DEARE_CONCESSIVE_CONNECTIVE_SURFACE,
            source: srcSlice(tokens, pos, 2)
          });
          return { op: copula, ops: [copula, connective], consumed: 2 };
        }
        return { op: copula, consumed: 2 };
      }
    }
  }

  if (isMisclassifiedDashiCopulaListingToken(t0)) {
    const source = srcSingle(t0, pos);
    const copula = buildCopulaOp(source, "basic", "affirmative", false);
    const connective: ConnectiveOp = createConnectiveOp({

      connective: "listing",
      surface: "し",
      source
    });
    return { op: copula, ops: [copula, connective], consumed: 1 };
  }

  if (
    (isAssertiveCopulaMarkerToken(t0) && dialectYaCopulaHostSlotAdmits(tokens, pos)) ||
    ((t0pos5A === 終止形_ || t0pos5A === 連用形_) && (t0pos4 & POS4) === 助動詞_デス)
  ) {
    const polite = (t0pos4 & POS4) === 助動詞_デス;
    const adverbialNi = copulaNiMarkerRelationForToken(t0, pos, {
      consumers: ["tail_multi_clause"]
    }) !== null;
    return {
      op: buildCopulaOp(
        srcSlice(tokens, pos, 1),
        "basic",
        "affirmative",
        polite,
        adverbialNi ? { basicForm: "adverbial_ni" } : {}
      ),
      consumed: 1
    };
  }
  return null;
}

export interface CopulaHonorificSupportSpan {
  readonly consumed: number;
  readonly variant: CopulaOp["variant"];
  readonly polarity: CopulaOp["polarity"];
  readonly polite: boolean;
}

export function copulaHonorificSupportSpanAt(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): CopulaHonorificSupportSpan | null {
  const marker = tokens[pos];
  if (marker === undefined) {
    return null;
  }
  const host = tokens[pos - 1];
  if (host !== undefined && isAuxiliaryStemToken(host)) {
    return null;
  }
  const markerAdmitted =
    (copulaDeMarkerRelationForToken(marker, pos, { consumers: ["tail_multi_clause"] }) !== null &&
      (marker.pos & POS5A) === 連用形_) ||
    copulaHonorificSupportRelationAt(tokens, pos, { consumers: ["tail_multi_clause"] }) !== null;
  return markerAdmitted ? matchCopulaHonorificSupportSpan(tokens, pos) : null;
}

export function conjecturalCopulaHonorificSupportSpanStartAt(
  tokens: readonly RuntimeHaruToken[],
  index: number
): number | null {
  for (let markerIdx = index - 1; markerIdx >= 0 && index - markerIdx <= MAX_COPULA_HONORIFIC_SUPPORT_SPAN; markerIdx -= 1) {
    const span = copulaHonorificSupportSpanAt(tokens, markerIdx);
    if (span !== null && span.variant === "conjecture" && markerIdx + span.consumed - 1 === index) {
      return markerIdx;
    }
  }
  return null;
}

const MAX_COPULA_HONORIFIC_SUPPORT_SPAN = 4;

function matchCopulaHonorificSupportSpan(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): CopulaHonorificSupportSpan | null {
  const support = tokens[pos + 1];
  if (support === undefined) {
    return null;
  }
  if (isMizenVoiceHonorificCopulaSupportVerbToken(support) && (support.pos & POS5A) === 未然形_) {
    const cluster = copulaHonorificVoiceClusterLength(tokens, pos + 2);
    if (cluster === null) {
      return null;
    }
    return honorificSupportSpan(tokens, pos, 2 + cluster);
  }
  if (isIntrinsicHonorificCopulaSupportVerbToken(support)) {
    return honorificSupportSpan(tokens, pos, 2);
  }
  return null;
}

function honorificSupportSpan(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  consumed: number
): CopulaHonorificSupportSpan {
  const last = tokens[pos + consumed - 1];
  const lastForm = (last?.pos ?? 0) & POS5A;
  if (lastForm === 意志推量形_) {
    return { consumed, variant: "conjecture", polarity: "affirmative", polite: false };
  }
  if (
    (lastForm === 未然形_ || lastForm === 連用形_) &&
    !isObligationSpanStartingAtToken(tokens, pos + consumed, "none")
  ) {
    const negEnd = matchNegationEnding(tokens, pos + consumed, { allowAttributive: true });
    if (negEnd !== null) {
      return {
        consumed: consumed + negEnd.consumed,
        variant: "basic",
        polarity: "negative",
        polite: negEnd.polite
      };
    }
  }
  return { consumed, variant: "basic", polarity: "affirmative", polite: false };
}

export function isAdnominalCopulaMatch(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  match: { readonly op: CopulaOp; readonly consumed: number },
  lookups?: LookupTables,
  sourceContext?: CopulaSourceContext
): boolean {
  const token = tokens[pos];
  return match.consumed === 1 &&
    match.op.kind === "copula" &&
    match.op.variant === "basic" &&
    match.op.polarity === "affirmative" &&
    token?.surface === "な" &&
    (token.pos & (POS4 | POS5A)) === (助動詞_ダ | 連体形_) &&
    !attributiveCopulaTailFollows(tokens, pos + 1, lookups, followerSourceContext(sourceContext));
}

export interface CopulaSourceContext {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly index: number;
}

function followerSourceContext(context: CopulaSourceContext | undefined): CopulaSourceContext | undefined {
  return context === undefined ? undefined : { tokens: context.tokens, index: context.index + 1 };
}

function attributiveCopulaCompositeConnectiveFollows(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups?: LookupTables
): boolean {
  const tokens = cursor.tokens;
  const pos = cursor.pos;
  const match = matchCompositeConnectiveAt(cursor.fork(), { requireEnd: false });
  if (match?.connective === "question_content") {
    const kaIdx = pos + match.consumed - 1;
    return explicitTerminalQuestionKaFollowerRelationAt(tokens, kaIdx) === null;
  }
  if (match?.connective === "question_content_alternative") {
    return true;
  }
  if (match?.connective === "reason" && match.surface === "ので") {
    return true;
  }
  if (match?.connective === "predicate_projection_proportional_reason") {
    return true;
  }
  if (match?.connective === "adversative" && match.surface === "のに") {
    return lookups !== undefined &&
      !cursor.lookahead(0, c => looksPronominalNoNiResult(c, lookups)) &&
      !cursor.lookahead(0, c => looksPronominalNoNi(c, lookups)) &&
      !cursor.lookahead(0, c => looksLikePurposeEvaluationNoNi(c, lookups));
  }
  return match !== null && isExternalNominalizerConnectiveKind(match.connective);
}

export function attributiveCopulaTailFollows(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  lookups?: LookupTables,
  sourceContext?: CopulaSourceContext
): boolean {
  const cursor = new TokenCursor(tokens, pos, tokens.length);
  return attributiveCopulaTailFollowsCursor(cursor, lookups, sourceContext);
}

function attributiveCopulaTailFollowsCursor(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups?: LookupTables,
  sourceContext?: CopulaSourceContext
): boolean {
  if (attributiveCopulaCompositeConnectiveFollows(cursor, lookups)) {
    return true;
  }
  const token = cursor.current();
  const canonical = secondaryParticleCanonical(token);
  if (canonical === "ほど" || canonical === "くらい") {
    return true;
  }
  return focusScopeCarrierFollowsAttributiveCopula(cursor) ||
    quantityExtentFollowsAttributiveCopula(cursor, lookups, sourceContext);
}

function quantityExtentFollowsAttributiveCopula(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables | undefined,
  sourceContext: CopulaSourceContext | undefined
): boolean {
  if (lookups === undefined) {
    return false;
  }
  const token = cursor.current();
  const scanTokens = sourceContext?.tokens ?? cursor.tokens;
  const scanIdx = sourceContext?.index ?? cursor.pos;
  if (token === undefined || scanTokens[scanIdx] !== token) {
    return false;
  }
  return matchQuantityExtentDakeAt(scanTokens, scanIdx, lookups, activeProtoLayout()) !== null;
}

function focusScopeCarrierFollowsAttributiveCopula(
  cursor: TokenCursor<RuntimeHaruToken>
): boolean {
  return matchFocusConnectiveAt(cursor.tokens, cursor.pos) !== null ||
    matchFocusLimitCarrier(cursor.fork()) !== null;
}

export function adnominalCopulaTailFollows(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  lookups?: LookupTables,
  sourceContext?: CopulaSourceContext
): boolean {
  const cursor = new TokenCursor(tokens, pos, tokens.length);
  if (attributiveCopulaTailFollowsCursor(cursor, lookups, sourceContext)) {
    return true;
  }
  if (semanticCarrierFollowsAdnominalCopula(tokens, pos, cursor)) {
    return true;
  }
  if (plainNominalizerFrameEndFollowsAdnominalCopula(tokens, pos, lookups)) {
    return true;
  }
  return terminalNodaCarrierFollowsAdnominalCopula(tokens, pos);
}

function plainNominalizerFrameEndFollowsAdnominalCopula(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  lookups?: LookupTables
): boolean {
  if (lookups === undefined) {
    return false;
  }
  const verdict = plainNominalizerFrameEndVerdictAt(tokens, pos, lookups);
  if (verdict === "particle_follower") {
    return true;
  }
  if (verdict !== "zero_follower") {
    return false;
  }
  return !activeProtoClosesClauseAtDetachedTerminalNodaAfter(tokens, pos + 1);
}

export function semanticCarrierFollowsAdnominalCopula(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  cursor: TokenCursor<RuntimeHaruToken>
): boolean {
  return matchEpistemicHedgePostverbAuxiliary(tokens, pos) !== null ||
    matchBoundNominalReasonConnectiveAt(tokens, pos) !== null ||
    matchBoundNominalListingConnectiveAt(tokens, pos) !== null ||
    likenessCarrierFollowsAdnominalCopula(tokens, pos) ||
    scopeOrBoundCarrierFollowsAdnominalCopula(cursor);
}

function likenessCarrierFollowsAdnominalCopula(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): boolean {
  const stem = tokens[pos];
  if (
    stem === undefined ||
    (stem.pos & POS1) !== 助動詞語幹 ||
    (stem.surface !== "よう" && stem.surface !== "みたい")
  ) {
    return false;
  }
  const slot = likenessCarrierCopulaSlotAt(tokens, pos + 1);
  return slot !== null &&
    slot.slot !== "adverbial_ni" &&
    !unrealizableLikenessCarrierModalFollows(tokens, pos);
}

function unrealizableLikenessCarrierModalFollows(
  tokens: readonly RuntimeHaruToken[],
  carrierIdx: number
): boolean {
  for (let idx = carrierIdx + 1; idx < tokens.length; idx += 1) {
    const token = tokens[idx];
    if (token === undefined) {
      return false;
    }
    if ((token.pos & POS4) === 助動詞_マイ) {
      return true;
    }
    const pos0 = token.pos & POS0;
    const isCarrierChainToken = pos0 === 助動詞0 ||
      (token.pos & POS01) === 動詞_非自立可能 ||
      (token.pos & POS01) === 助詞_係助詞;
    if (!isCarrierChainToken) {
      return false;
    }
  }
  return false;
}

export type LikenessCarrierCopulaSlot = "adnominal" | "predicative" | "adverbial_ni";

export function likenessCarrierCopulaSlotAt(
  tokens: readonly RuntimeHaruToken[],
  idx: number
): { readonly slot: LikenessCarrierCopulaSlot; readonly polite: boolean } | null {
  const token = tokens[idx];
  if (token === undefined) return null;
  const pos4 = token.pos & POS4;
  const dialectYa = pos4 === 助動詞_ヤ && isAssertiveCopulaMarkerToken(token);
  if (pos4 !== 助動詞_ダ && pos4 !== 助動詞_デス && !dialectYa) return null;
  const polite = pos4 === 助動詞_デス;
  if (copulaNiMarkerRelationForToken(token, idx, { consumers: ["tail_multi_clause"] }) !== null) {
    return { slot: "adverbial_ni", polite };
  }
  const form = token.pos & POS5A;
  if (form === 連体形_) return { slot: "adnominal", polite };
  if (form === 終止形_ || form === 連用形_ || form === 仮定形_) {
    return { slot: "predicative", polite };
  }
  return null;
}

function scopeOrBoundCarrierFollowsAdnominalCopula(
  cursor: TokenCursor<RuntimeHaruToken>
): boolean {
  if (cursor.lookahead(0, matchScopeBridge) !== null) {
    return true;
  }
  return hazuCarrierFollowsAdnominalCopula(cursor) ||
    wakeCarrierFollowsAdnominalCopula(cursor);
}

function hazuCarrierFollowsAdnominalCopula(
  cursor: TokenCursor<RuntimeHaruToken>
): boolean {
  const t0 = cursor.current();
  if (t0 === undefined || !isHazuNounToken(t0)) return false;

  const t1 = cursor.peek(1);
  if (t1 === undefined) {
    return true;
  }
  const t1pos4 = t1.pos & POS4;
  const t1pos5A = t1.pos & POS5A;

  const hazuNominalLink = nominalLinkMarkerRelationAt(cursor.tokens, cursor.pos + 1, { consumers: ["tail_multi_clause"] });
  if (hazuNominalLink !== null) {
    return true;
  }
  if (t1.surface === "が" && (t1.pos & POS1) === 格助詞) {
    return matchNegationEnding(cursor.tokens, cursor.pos + 2, { allowAttributive: true }) !== null;
  }
  if (isCopulaJaNegativeBridgeToken(t1)) {
    return matchNegationEnding(cursor.tokens, cursor.pos + 2, { allowAttributive: true }) !== null;
  }
  const hazuDewa = dewaScopeBridgeRelationAt(cursor.tokens, cursor.pos + 1, {
    anchorIdx: cursor.pos,
    consumers: ["tail_multi_clause"]
  });
  if (hazuDewa?.focusParticle === "wa") {
    return matchNegationEnding(cursor.tokens, hazuDewa.span.endExclusive, { allowAttributive: true }) !== null;
  }
  if (t1pos5A === 終止形_ || t1pos5A === 連用形_) {
    return t1pos4 === 助動詞_ダ || t1pos4 === 助動詞_デス;
  }
  return cursor.lookahead(1, canBareBoundCarrierFeedFollowingTail);
}

function wakeCarrierFollowsAdnominalCopula(
  cursor: TokenCursor<RuntimeHaruToken>
): boolean {
  const t0 = cursor.current();
  if (!isWakeNounToken(t0)) return false;
  const t1 = cursor.peek(1);
  if (t1 === undefined) {
    return false;
  }
  const t1pos4 = t1.pos & POS4;
  const t1pos5A = t1.pos & POS5A;

  if (t1pos5A === 終止形_ || t1pos5A === 連用形_) {
    if (t1pos4 === 助動詞_ダ || t1pos4 === 助動詞_デス) {
      return true;
    }
  }
  if (matchNegationEnding(cursor.tokens, cursor.pos + 1, { allowAttributive: true }) !== null) {
    return true;
  }
  if (
    isAruVerbToken(t1) &&
    (t1pos5A === 終止形_ || t1pos5A === 連体形_)
  ) {
    const afterAru = cursor.peek(2);
    if (
      afterAru === undefined ||
      isQuestionParticleToken(afterAru) ||
      (afterAru.pos & POS0) === 補助記号 ||
      (afterAru.pos & POS0) === 記号
    ) {
      return true;
    }
  }
  if (t1.surface === "が" && (t1.pos & POS1) === 格助詞) {
    return matchNegationEnding(cursor.tokens, cursor.pos + 2, { allowAttributive: true }) !== null;
  }
  const wakeDewa = dewaScopeBridgeRelationAt(cursor.tokens, cursor.pos + 1, {
    anchorIdx: cursor.pos,
    consumers: ["tail_multi_clause"]
  });
  if (wakeDewa?.focusParticle === "wa") {
    return matchNegationEnding(cursor.tokens, wakeDewa.span.endExclusive, { allowAttributive: true }) !== null;
  }
  if (t1.surface === "でも" && (t1.pos & POS1) === 副助詞) {
    return matchNegationEnding(cursor.tokens, cursor.pos + 2, { allowAttributive: true }) !== null;
  }
  return cursor.lookahead(1, canBareBoundCarrierFeedFollowingTail);
}

function canBareBoundCarrierFeedFollowingTail(
  cursor: TokenCursor<RuntimeHaruToken>
): boolean {
  const next = cursor.current();
  if (next === undefined) return false;
  if (cursor.lookahead(0, matchKamoShirenaiSequence) !== null) {
    return true;
  }
  if (isTerminalQuestionSfpParticleStart(cursor)) {
    return true;
  }
  if (cursor.lookahead(0, c => matchScopeBridgeTail(c, null)) !== null) {
    return true;
  }
  const nextPos4 = next.pos & POS4;
  const nextPos5A = next.pos & POS5A;
  return (
    (
      nextPos5A === 意志推量形_ &&
      (nextPos4 === 助動詞_ダ || nextPos4 === 助動詞_デス || nextPos4 === 助動詞_ヤ)
    ) ||
    (nextPos5A === 仮定形_ && nextPos4 === 助動詞_ダ) ||
    nextPos4 === 助動詞_デス ||
    next.dictionaryForm === "らしい" ||
    (
      (next.pos & POS0) === 助詞 &&
      ((next.pos & POS1) === 接続助詞 || (next.pos & POS1) === 副助詞)
    )
  );
}

function isQuestionParticleToken(token: RuntimeHaruToken | undefined): boolean {
  return kaMarkerRelationForToken(token, -1, ["tail_multi_clause"]) !== null;
}

export function terminalNodaCarrierFollowsAdnominalCopula(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): boolean {
  const nominalizer = predicateNominalizerRelationForToken(tokens[pos], pos, {
    requirement: "terminal_noda_marker",
    consumers: ["tail_multi_clause"]
  });
  if (nominalizer?.nominalizerKind !== "no") {
    return false;
  }
  const next = tokens[pos + 1];
  if (next === undefined) {
    return true;
  }
  if ((next.pos & POS0) === 補助記号) {
    return true;
  }
  if (isBareNodaCarrierTerminalSfpFollower(next)) {
    return true;
  }
  if (activeProtoClosesClauseAtDetachedTerminalNodaAfter(tokens, pos + 1)) {
    return true;
  }
  if (nominalizerCopulaSupportRelationAt(tokens, pos)?.form === "fused_connective") {
    return true;
  }
  const nextPos4 = next.pos & POS4;
  const nextPos5A = next.pos & POS5A;
  if (
    (nextPos4 === 助動詞_ダ || nextPos4 === 助動詞_ジャ || nextPos4 === 助動詞_デス || nextPos4 === 助動詞_ヤ) &&
    (nextPos5A === 終止形_ || nextPos5A === 連用形_)
  ) {
    return true;
  }
  return new TokenCursor(tokens, pos, tokens.length).lookahead(1, canBareBoundCarrierFeedFollowingTail);
}

function isBareNodaCarrierTerminalSfpFollower(token: RuntimeHaruToken): boolean {
  return (token.pos & POS01) === 助詞_終助詞;
}

function isHazuNounToken(token: RuntimeHaruToken): boolean {
  return (token.pos & POS0) === 名詞 &&
    ((token.dictionaryForm || token.surface) === "はず" || (token.dictionaryForm || token.surface) === "筈");
}
