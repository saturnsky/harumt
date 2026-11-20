import type { RuntimeHaruToken } from "../../../../../types/token.js";
import { toiuAttributiveTailEnd } from "../../../../semantics/marker-roles.js";
import { TokenCursor } from "../../../../token-cursor.js";
import type { LookupTables } from "../../../../lookup-tables.js";
import { quoteFocusLimitNegationTailStartingAt } from "../../segments/quote-focus.js";
import { copulaDeMarkerRelationForToken, copulaNiMarkerRelationForToken, dewaScopeBridgeRelationAt, kaMarkerRelationAt, nominalLinkMarkerRelationAt, nominalizerCopulaSupportRelationAt, predicateNominalizerRelationForToken } from "../../../boundary/marker.js";
import { activeProtoLayout } from "../../../../clause-layout/proto-state.js";
import { monoModalClauseEvidence } from "../../../../semantics/mono-modal.js";
import { clauseContainsInterrogativeBeforeKa, clauseContainsLexicalizedInterrogativeBefore, clauseContainsPredicateChoiceKaBefore } from "../../../../quote/embedded-question.js";
import { quoteMarkerRelationAt } from "../../../boundary/quote-marker.js";
import { negationFocusParticleForMarker, type AuxLayerNode, type AuxOpNode, type MaiModalOp, type LimitNegationFocus, type LimitNegationModalOp, type HazuModalOp, type KamoModalOp, type ModalOp, type NodaModalOp, type NegationFocusParticle, type OpSource, type ConnectiveOp, type SoudaHearsayModalOp, type TokoroModalOp, type TsumoriModalOp, type MonoModalEvidence, type MonoModalForm, type MonoModalOp, MONO_MODAL_READING_VALUES, MONO_MODAL_NO_EVIDENCE, hostCarriesPreModalPast, type WakeModalOp } from "../grammar.js";
import type { ParseInput } from "../parse-input.js";
import { srcSingle, srcSlice } from "../source.js";
import { isAruVerbToken, DEARI_LISTING_CONNECTIVE_SURFACE, isAffirmativeCopulaSupportVerbToken, isCopulaJaNegativeBridgeToken, isNaiOrNuToken, isPredicativeCopulaSupportVerbAt, isWakeNounToken } from "../classifiers/tokens.js";
import { type ElidedColloquialObligationContext, isObligationSpanStartingAtToken } from "./obligation.js";
import { matchNegationEnding, type NegationEndingMatch } from "./negation-ending.js";
import { isKamoShirenaiLemma, matchKamoShirenaiSequence, type BareKamoAdmissionContext } from "./kamo-modal.js";
import { matchScopeBridgeTail } from "./scope-bridge.js";
import { attributiveCopulaTailFollows, isAssertiveCopulaMarkerToken, terminalNodaCarrierFollowsAdnominalCopula, isBareNodaCarrierTerminalSfpFollower, isHazuNounToken, isQuestionParticleToken } from "./copula.js";
import { POS0, POS01, POS1, POS4, POS5, POS5A, 意志推量形_, 仮定形_, 格助詞, 記号, 係助詞, isNaAdjCapable, 形容詞0, 語幹_, 終止形_, 終助詞, 助詞, 助動詞, 助動詞_ジャ, 助動詞_タ, 助動詞_ダ, 助動詞_デス, 助動詞_マイ, 助動詞_マス, 助動詞_ヤ, 接続助詞, 動詞, 副詞, 副助詞, 文語助動詞_マジ, 補助記号, 名詞, 連体形_, 連用形_, 連用形_促音便, 助詞_係助詞 } from "../../../../../types/pos.js";
import { createConnectiveOp, createModalOp } from "../op-builders.js";
import { classifyAux, isSoudaAuxiliaryStemToken, buildConjectureOp } from "../parser.js";
import { isTailFinalQuestionSfpStart } from "./terminal-sfp.js";
import { isOutgoingQuoteMarkerPosition } from "../quote-tail-context.js";
import { matchYouda, renyouChuushiPauseFollowsSupport } from "./likeness-modal.js";
import { terminalDiscourseSfpRunClosesUtterance, utteranceClosesAtChunkPosition } from "../parse-closure.js";
import { sourceIndexForInputPosition, contextAlignedPosition } from "../parse-coordinates.js";


type ModalMatcher = (
  cursor: TokenCursor<RuntimeHaruToken>,
  stemToken: RuntimeHaruToken,
  ctx: ModalMatchContext
) => ModalMatch | null;

export interface ModalMatch {
  readonly op: ModalOp;
  readonly consumed: number;
  readonly terminal?: AuxLayerNode["terminal"];
  readonly ops?: readonly AuxOpNode[];
}

function modalMatchWithFusedConjecture(
  match: ModalMatch,
  negEnd: NegationEndingMatch,
  tokens: readonly RuntimeHaruToken[],
  start: number
): ModalMatch {
  if (negEnd.conjecture !== true) {
    return match;
  }
  const conjectureIdx = start + match.consumed - 1;
  const conjectureToken = tokens[conjectureIdx];
  if (conjectureToken === undefined) {
    return match;
  }
  return {
    ...match,
    ops: [match.op, buildConjectureOp(srcSingle(conjectureToken, conjectureIdx), false)]
  };
}

export interface ModalMatchContext {
  readonly previousOps: readonly AuxOpNode[];
  readonly lookups?: LookupTables;
  readonly input?: ParseInput;
  readonly elidedColloquialObligationContext?: ElidedColloquialObligationContext;
}

function matchHazu(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemToken: RuntimeHaruToken,
  ctx: ModalMatchContext
): ModalMatch | null {
  const { tokens, pos, end: n } = cursor;
  const t0 = tokens[pos];
  if (t0 === undefined || !isHazuNounToken(t0)) return null;

  const t1 = pos + 1 < n ? tokens[pos + 1] : undefined;
  if (t1 === undefined) {
    return canBareBoundModalCarrierTerminate(pos + 1, n)
      ? { op: buildHazuOp(srcSlice(tokens, pos, 1), "affirmative", false), consumed: 1 }
      : null;
  }
  const t1pos4 = t1.pos & POS4;
  const t1pos5A = t1.pos & POS5A;

  const hazuNominalLink = nominalLinkMarkerRelationAt(tokens, pos + 1, { consumers: ["tail_multi_clause"] });
  if (hazuNominalLink !== null) {
    const negEnd = matchNegationEnding(tokens, hazuNominalLink.span.endExclusive, { allowAttributive: true, allowConjecture: true });
    if (negEnd !== null) {
      const consumed = hazuNominalLink.span.endExclusive - pos + negEnd.consumed;
      return modalMatchWithFusedConjecture({
        op: buildHazuOp(srcSlice(tokens, pos, consumed), "negative", negEnd.polite),
        consumed,
        terminal: "attributive"
      }, negEnd, tokens, pos);
    }
    return {
      op: buildHazuOp(srcSlice(tokens, pos, 2), "affirmative", false),
      consumed: 2,
      terminal: "attributive"
    };
  }

  if (t1.surface === "が" && (t1.pos & POS1) === 格助詞) {
    const negEnd = matchNegationEnding(tokens, pos + 2, { allowAttributive: true, allowConjecture: true });
    if (negEnd !== null) {
      return modalMatchWithFusedConjecture({
        op: buildHazuOp(srcSlice(tokens, pos, 2 + negEnd.consumed), "negative", negEnd.polite),
        consumed: 2 + negEnd.consumed
      }, negEnd, tokens, pos);
    }
  }
  if (isCopulaJaNegativeBridgeToken(t1)) {
    const negEnd = matchNegationEnding(tokens, pos + 2, { allowAttributive: true, allowConjecture: true });
    if (negEnd !== null) {
      return modalMatchWithFusedConjecture({
        op: buildHazuOp(srcSlice(tokens, pos, 2 + negEnd.consumed), "negative", negEnd.polite),
        consumed: 2 + negEnd.consumed
      }, negEnd, tokens, pos);
    }
  }
  const hazuDewa = dewaScopeBridgeRelationAt(tokens, pos + 1, {
    anchorIdx: pos,
    consumers: ["tail_multi_clause"]
  });
  if (hazuDewa?.focusParticle === "wa") {
    const negEnd = matchNegationEnding(tokens, hazuDewa.span.endExclusive, { allowAttributive: true, allowConjecture: true });
    if (negEnd !== null) {
      const consumed = hazuDewa.span.endExclusive - pos + negEnd.consumed;
      return modalMatchWithFusedConjecture({
        op: buildHazuOp(srcSlice(tokens, pos, consumed), "negative", negEnd.polite),
        consumed
      }, negEnd, tokens, pos);
    }
  }

  if (t1pos5A === 終止形_ || t1pos5A === 連用形_) {
    if (t1pos4 === 助動詞_ダ) {
      return { op: buildHazuOp(srcSlice(tokens, pos, 2), "affirmative", false), consumed: 2 };
    }
    if (t1pos4 === 助動詞_デス) {
      return { op: buildHazuOp(srcSlice(tokens, pos, 2), "affirmative", true), consumed: 2 };
    }
  }
  if (
    canBareCarrierFeedFollowingTail(cursor, 1, stemToken, ctx) ||
    terminalDiscourseSfpRunClosesUtterance(cursor, ctx.input, 1)
  ) {
    return { op: buildHazuOp(srcSlice(tokens, pos, 1), "affirmative", false), consumed: 1 };
  }
  return null;
}

export function buildHazuOp(
  source: OpSource,
  polarity: "affirmative" | "negative",
  polite: boolean
): HazuModalOp {
  return createModalOp({

    modal: "hazu",
    source,
    polarity,
    polite,
    past: false
  });
}

function matchMono(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemToken: RuntimeHaruToken,
  ctx: ModalMatchContext
): ModalMatch | null {
  const { tokens, pos, end: n } = cursor;
  const lookups = ctx.lookups;
  const t0 = tokens[pos];
  if (
    lookups === undefined ||
    t0 === undefined ||
    (t0.pos & POS0) !== 名詞 ||
    !lookups.MONO_MODAL_CARRIER_FORMS.has(t0.surface)
  ) {
    return null;
  }
  const host = monoModalHostFacts(stemToken, ctx.previousOps);
  if (host === null || !isAttributiveHostEnding(tokens[pos - 1])) {
    return null;
  }
  const copula = monoModalAffirmativeCopulaAt(tokens, pos + 1, n);
  if (copula === null) {
    return null;
  }
  const evidence = monoModalEvidenceAt(ctx, pos, lookups);
  const form: MonoModalForm = lookups.MONO_MODAL_DEFAULT_READING_CARRIER_FORMS.has(t0.surface) ? "mon" : "mono";
  if (!monoModalAdmits(form, host, evidence, copula.past)) {
    return null;
  }
  return {
    op: buildMonoOp(srcSlice(tokens, pos, 1 + copula.consumed), form, evidence, copula.polite),
    consumed: 1 + copula.consumed
  };
}

function isAttributiveHostEnding(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  const pos0 = token.pos & POS0;
  if (pos0 !== 動詞 && pos0 !== 形容詞0 && pos0 !== 助動詞) {
    return true;
  }
  const pos5A = token.pos & POS5A;
  return pos5A === 連体形_ || pos5A === 終止形_;
}

interface MonoModalHostFacts {
  readonly past: boolean;
  readonly desire: boolean;
}

function monoModalHostFacts(
  stemToken: RuntimeHaruToken,
  previousOps: readonly AuxOpNode[]
): MonoModalHostFacts | null {
  const last = previousOps[previousOps.length - 1];
  if (last === undefined) {
    const stemPos0 = stemToken.pos & POS0;
    return stemPos0 === 動詞 || stemPos0 === 形容詞0 ? { past: false, desire: false } : null;
  }
  if (last.kind === "copula" || last.kind === "modal" || last.kind === "connective") {
    return null;
  }
  return {
    past: hostCarriesPreModalPast(previousOps, previousOps.length),
    desire: (last.kind === "desire" && last.form === undefined) ||
      (last.kind === "aspect" && last.aspect === "te_hoshii")
  };
}

function monoModalAffirmativeCopulaAt(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  end: number
): { readonly consumed: number; readonly polite: boolean; readonly past: boolean } | null {
  const copula = idx < end ? tokens[idx] : undefined;
  if (copula === undefined || (copula.pos & POS0) !== 助動詞) {
    return null;
  }
  const pos4 = copula.pos & POS4;
  const isPlain = pos4 === 助動詞_ダ || pos4 === 助動詞_ジャ || pos4 === 助動詞_ヤ;
  const isPolite = pos4 === 助動詞_デス;
  if (!isPlain && !isPolite) {
    return null;
  }
  const pos5A = copula.pos & POS5A;
  const next = idx + 1 < end ? tokens[idx + 1] : undefined;
  if (pos5A === 意志推量形_) {
    return { consumed: 0, polite: false, past: false };
  }
  if (pos5A === 連用形_) {
    return next !== undefined && (next.pos & POS4) === 助動詞_タ && (next.pos & POS5A) !== 仮定形_
      ? { consumed: 1, polite: isPolite, past: true }
      : null;
  }
  if (pos5A !== 終止形_) {
    return null;
  }
  if (next !== undefined && (next.pos & POS0) === 助詞) {
    const pos1 = next.pos & POS1;
    if (
      pos1 === 接続助詞 ||
      (pos1 === 副助詞 && quoteMarkerRelationAt(tokens, idx + 1, { consumers: ["tail_multi_clause"] }) === null)
    ) {
      return null;
    }
    if (pos1 === 終助詞 && kaMarkerRelationAt(tokens, idx + 1, ["tail_multi_clause"]) !== null) {
      return null;
    }
  }
  return { consumed: 1, polite: isPolite, past: false };
}

function monoModalEvidenceAt(ctx: ModalMatchContext, pos: number, lookups: LookupTables): MonoModalEvidence {
  const input = ctx.input;
  if (input === undefined) {
    return MONO_MODAL_NO_EVIDENCE;
  }
  const tokens = input.contextTokens ?? input.tokens;
  return monoModalClauseEvidence(tokens, sourceIndexForInputPosition(input, pos), lookups, activeProtoLayout());
}

function monoModalAdmits(
  form: MonoModalForm,
  host: MonoModalHostFacts,
  evidence: MonoModalEvidence,
  copulaPast: boolean
): boolean {
  if (form === "mon") {
    return true;
  }
  return host.desire ||
    evidence.admirativeAdverb ||
    (evidence.frequencyAdverb && (host.past || copulaPast));
}

export function buildMonoOp(
  source: OpSource,
  form: MonoModalForm,
  evidence: MonoModalEvidence,
  polite: boolean
): MonoModalOp {
  return createModalOp({
    modal: "mono",
    source,
    form,
    reading: "nominal",
    candidates: MONO_MODAL_READING_VALUES,
    evidence,
    polite,
    past: false
  });
}

export const BARE_KAMO_EVIDENCE_SCOPE = { scope: "sentence" } as const;

function bareKamoAdmissionContext(
  ctx: ModalMatchContext,
  pos: number
): BareKamoAdmissionContext | undefined {
  const input = ctx.input;
  if (input === undefined || ctx.lookups === undefined) {
    return undefined;
  }
  const tokens = input.contextTokens ?? input.tokens;
  const kaIndex = sourceIndexForInputPosition(input, pos);
  const layout = activeProtoLayout() ?? undefined;

  return {
    tokens,
    kaIndex,
    clauseContainsInterrogative: clauseContainsInterrogativeBeforeKa(tokens, kaIndex, ctx.lookups, layout, BARE_KAMO_EVIDENCE_SCOPE) ||
      clauseContainsLexicalizedInterrogativeBefore(tokens, kaIndex, ctx.lookups, layout, BARE_KAMO_EVIDENCE_SCOPE),
    clauseContainsPredicateChoiceKa: clauseContainsPredicateChoiceKaBefore(tokens, kaIndex, layout)
  };
}

function matchKamo(
  cursor: TokenCursor<RuntimeHaruToken>,
  _stemToken: RuntimeHaruToken,
  ctx: ModalMatchContext
): ModalMatch | null {
  const { tokens, pos } = cursor;
  return cursor.lookahead(0, c => {
    const match = matchKamoShirenaiSequence(c, bareKamoAdmissionContext(ctx, pos));
    if (match === null) {
      return null;
    }
    const consumed = c.pos - pos;
    return {
      op: buildKamoOp(srcSlice(tokens, pos, consumed), match.polite, match.bare),
      consumed
    };
  });
}

export function buildKamoOp(source: OpSource, polite: boolean, bare = false): KamoModalOp {
  return createModalOp({

    modal: "kamo",
    source,
    polite,
    past: false,
    outerLayers: 0,
    bare
  });
}

export function matchNoda(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemToken: RuntimeHaruToken,
  ctx: ModalMatchContext
): ModalMatch | null {
  const { tokens, pos, end: n } = cursor;
  const t0 = tokens[pos];
  const nominalizer = predicateNominalizerRelationForToken(t0, pos, {
    requirement: "terminal_noda_marker",
    consumers: ["tail_multi_clause"]
  });
  if (nominalizer?.nominalizerKind !== "no") return null;
  const previousOp = ctx.previousOps[ctx.previousOps.length - 1];
  const previousOpIsNoda = previousOp?.kind === "modal" && previousOp.modal === "noda";

  const t1 = tokens[pos + 1];
  if (t1 === undefined) {
    if (previousOpIsNoda) return null;
    return canBareNodaCarrierTerminate(pos + 1, n)
      ? { op: buildNodaOp(srcSlice(tokens, pos, 1), false), consumed: 1 }
      : null;
  }
  if (isBareNodaCarrierTerminalSfpFollower(t1)) {
    if (previousOpIsNoda) return null;
    return { op: buildNodaOp(srcSlice(tokens, pos, 1), false), consumed: 1 };
  }
  const fusedSupport = nominalizerCopulaSupportRelationAt(tokens, pos);
  if (fusedSupport?.form === "fused_connective" && fusedSupport.fusedIdx === pos + 1) {
    const noda = buildNodaOp(srcSlice(tokens, pos, 1), false);
    const connective: ConnectiveOp = createConnectiveOp({
      connective: fusedSupport.connectiveKind === "conditional" ? "conditional" : "even_if",
      surface: fusedSupport.connectiveSurface,
      source: srcSlice(tokens, pos + 1, 1)
    });
    return { op: noda, ops: [noda, connective], consumed: 2 };
  }
  const t1pos4 = t1.pos & POS4;
  const t1pos5A = t1.pos & POS5A;
  if (t1pos5A !== 終止形_ && t1pos5A !== 連用形_) {
    return canBareCarrierFeedFollowingTail(cursor, 1, stemToken, ctx) ||
      bareNodaCarrierPrecedesToiuCarrier(ctx.input, cursor, pos + 1)
      ? { op: buildNodaOp(srcSlice(tokens, pos, 1), false), consumed: 1 }
      : null;
  }

  if (t1pos4 === 助動詞_ダ || t1pos4 === 助動詞_ジャ || t1pos4 === 助動詞_ヤ) {
    const support = matchNodaCopulaSupport(tokens, pos + 1);
    if (support !== null) {
      return {
        op: buildNodaOp(
          srcSlice(tokens, pos, 1 + support.consumed),
          support.polite,
          support.pastConditional
        ),
        consumed: 1 + support.consumed
      };
    }
    const t2 = tokens[pos + 2];
    const isCopulaPastConditional =
      t1pos5A === 連用形_ &&
      t2?.surface === "たら" &&
      (t2.pos & (POS4 | POS5A)) === (助動詞_タ | 仮定形_);
    return { op: buildNodaOp(srcSlice(tokens, pos, 2), false, isCopulaPastConditional), consumed: 2 };
  }
  if (t1pos4 === 助動詞_デス) {
    return { op: buildNodaOp(srcSlice(tokens, pos, 2), true), consumed: 2 };
  }
  if (
    canBareCarrierFeedFollowingTail(cursor, 1, stemToken, ctx) ||
    bareNodaCarrierPrecedesToiuCarrier(ctx.input, cursor, pos + 1)
  ) {
    return { op: buildNodaOp(srcSlice(tokens, pos, 1), false), consumed: 1 };
  }
  return null;
}

function matchNodaDatteHearsay(
  cursor: TokenCursor<RuntimeHaruToken>,
  _stemToken: RuntimeHaruToken,
  _ctx: ModalMatchContext
): ModalMatch | null {
  const { tokens, pos } = cursor;
  const t0 = tokens[pos];
  const nominalizer = predicateNominalizerRelationForToken(t0, pos, {
    requirement: "terminal_noda_marker",
    consumers: ["tail_multi_clause"]
  });
  if (nominalizer?.nominalizerKind !== "no") return null;

  const copula = tokens[pos + 1];
  const datte = tokens[pos + 2];
  const copulaPos4 = (copula?.pos ?? 0) & POS4;
  const copulaPos5A = (copula?.pos ?? 0) & POS5A;
  if (
    copula === undefined ||
    copulaPos5A !== 終止形_ ||
    datte === undefined ||
    (datte.pos & POS0) !== 助詞
  ) {
    return null;
  }
  const hearsayMarker =
    copulaPos4 === 助動詞_ダ || copulaPos4 === 助動詞_デス ? "って"
      : copulaPos4 === 助動詞_ヤ ? "て"
        : null;
  if (hearsayMarker === null || datte.surface !== hearsayMarker) {
    return null;
  }
  if (tokens[pos + 3] !== undefined) {
    return null;
  }
  return {
    op: buildSoudaHearsayOp(srcSlice(tokens, pos, 3), copulaPos4 === 助動詞_デス, "hearsay"),
    consumed: 3
  };
}

function canBareNodaCarrierTerminate(pos: number, end: number): boolean {
  return pos >= end;
}

function matchNodaCopulaSupport(
  tokens: readonly RuntimeHaruToken[],
  dePos: number
): { readonly consumed: number; readonly polite: boolean; readonly pastConditional: boolean } | null {
  const relation = nominalizerCopulaSupportRelationAt(tokens, dePos - 1);
  if (relation === null || relation.form !== "separate" || relation.copulaIdx !== dePos) {
    return null;
  }
  const support = tokens[relation.supportIdx]!;
  const next = tokens[dePos + 2];
  const politeConjecture =
    next !== undefined &&
    (next.pos & (POS4 | POS5A)) === (助動詞_マス | 意志推量形_);
  const pastConditional =
    (support.pos & POS5) === 連用形_促音便 &&
    next?.surface === "たら" &&
    (next.pos & (POS4 | POS5A)) === (助動詞_タ | 仮定形_);
  return {
    consumed: politeConjecture ? 3 : 2,
    polite: relation.polite,
    pastConditional
  };
}

function bareNodaCarrierPrecedesToiuCarrier(
  input: ParseInput | undefined,
  cursor: TokenCursor<RuntimeHaruToken>,
  pos: number
): boolean {
  const context = input === undefined
    ? { tokens: cursor.tokens as readonly RuntimeHaruToken[], index: pos }
    : contextAlignedPosition(input, cursor, pos);
  return toiuAttributiveTailEnd(context.tokens, context.index, context.tokens.length) !== null;
}

function canBareCarrierFeedFollowingTail(
  cursor: TokenCursor<RuntimeHaruToken>,
  offset: number,
  stemToken: RuntimeHaruToken,
  ctx: ModalMatchContext
): boolean {
  const { tokens, pos: basePos } = cursor;
  const pos = basePos + offset;
  const next = tokens[pos];
  if (next === undefined) return false;
  if (cursor.lookahead(offset, c => tryMatchModal(c, stemToken, ctx)) !== null) {
    return true;
  }
  if (cursor.lookahead(offset, isTailFinalQuestionSfpStart)) {
    return true;
  }
  if (isOutgoingQuoteMarkerPosition(ctx.input, cursor, pos)) {
    return true;
  }
  const cls = classifyAux(next, tokens[pos + 1]).classifications;
  if (cls.includes("negation")) {
    return false;
  }
  return cls.includes("conjecture") ||
    cls.includes("conjecture_polite") ||
    cls.includes("rashii") ||
    cls.includes("connective");
}

function canBareBoundModalCarrierTerminate(pos: number, end: number): boolean {
  return pos >= end;
}

export function startsKamoModal(cursor: TokenCursor<RuntimeHaruToken>): boolean {
  const { tokens, pos } = cursor;
  return kaMarkerRelationAt(tokens, pos, ["tail_multi_clause"]) !== null &&
    tokens[pos + 1]?.surface === "も" &&
    tokens[pos + 2] !== undefined &&
    isKamoShirenaiLemma(tokens[pos + 2]!);
}

export function buildNodaOp(source: OpSource, polite: boolean, past = false): NodaModalOp {
  return createModalOp({

    modal: "noda",
    source,
    polite,
    past
  });
}

export function wakeExplanatoryCopulaPolite(
  t0: RuntimeHaruToken | undefined,
  t1: RuntimeHaruToken | undefined,
  options: { readonly terminalOnly?: boolean } = {}
): boolean | null {
  if (!isWakeNounToken(t0) || t1 === undefined) {
    return null;
  }
  const t1pos5A = t1.pos & POS5A;
  const formAccepted = options.terminalOnly === true
    ? t1pos5A === 終止形_
    : t1pos5A === 終止形_ || t1pos5A === 連用形_;
  if (!formAccepted) {
    return null;
  }
  const t1pos4 = t1.pos & POS4;
  if (t1pos4 === 助動詞_ダ) {
    return false;
  }
  if (t1pos4 === 助動詞_デス) {
    return true;
  }
  return null;
}

export function wakeExplanatoryCopulaConjecture(
  t0: RuntimeHaruToken | undefined,
  t1: RuntimeHaruToken | undefined
): boolean | null {
  if (!isWakeNounToken(t0) || t1 === undefined) {
    return null;
  }
  if ((t1.pos & POS5A) !== 意志推量形_) {
    return null;
  }
  const t1pos4 = t1.pos & POS4;
  if (t1pos4 === 助動詞_ダ) {
    return false;
  }
  if (t1pos4 === 助動詞_デス) {
    return true;
  }
  return null;
}

function matchWake(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemToken: RuntimeHaruToken,
  ctx: ModalMatchContext
): ModalMatch | null {
  const { tokens, pos } = cursor;
  const t0 = tokens[pos];
  if (!isWakeNounToken(t0)) return null;
  const t1 = tokens[pos + 1];
  if (t1 === undefined) {
    return null;
  }
  const t1pos5A = t1.pos & POS5A;

  if (
    (t1.pos & POS4) === 助動詞_ダ &&
    t1pos5A === 連用形_ &&
    copulaDeMarkerRelationForToken(t1, pos + 1, { consumers: ["tail_multi_clause"] }) !== null &&
    isPredicativeCopulaSupportVerbAt(tokens, pos + 2)
  ) {
    return {
      op: buildWakeOp(srcSlice(tokens, pos, 3), "explanatory", "affirmative", false),
      consumed: 3
    };
  }

  const explanatoryPolite = wakeExplanatoryCopulaPolite(t0, t1);
  if (explanatoryPolite !== null) {
    return { op: buildWakeOp(srcSlice(tokens, pos, 2), "explanatory", "affirmative", explanatoryPolite), consumed: 2 };
  }
  const directNegEnd = matchNegationEnding(tokens, pos + 1, { allowAttributive: true, allowConjecture: true });
  if (directNegEnd !== null) {
    return modalMatchWithFusedConjecture({
      op: buildWakeOp(srcSlice(tokens, pos, 1 + directNegEnd.consumed), "rhetorical_no_way", "negative", directNegEnd.polite),
      consumed: 1 + directNegEnd.consumed
    }, directNegEnd, tokens, pos);
  }
  if (
    isAruVerbToken(t1) &&
    (t1pos5A === 終止形_ || t1pos5A === 連体形_)
  ) {
    const afterAru = tokens[pos + 2];
    if (
      afterAru === undefined ||
      isQuestionParticleToken(afterAru) ||
      (afterAru.pos & POS0) === 補助記号 ||
      (afterAru.pos & POS0) === 記号
    ) {
      return {
        op: buildWakeOp(srcSlice(tokens, pos, 2), "rhetorical_possibility", "affirmative", false),
        consumed: 2
      };
    }
  }
  if (t1.surface === "が" && (t1.pos & POS1) === 格助詞) {
    const negEnd = matchNegationEnding(tokens, pos + 2, { allowAttributive: true, allowConjecture: true });
    if (negEnd !== null) {
      return modalMatchWithFusedConjecture({
        op: buildWakeOp(srcSlice(tokens, pos, 2 + negEnd.consumed), "rhetorical_no_way", "negative", negEnd.polite),
        consumed: 2 + negEnd.consumed
      }, negEnd, tokens, pos);
    }
  }
  const wakeDewa = dewaScopeBridgeRelationAt(tokens, pos + 1, {
    anchorIdx: pos,
    consumers: ["tail_multi_clause"]
  });
  if (wakeDewa?.focusParticle === "wa") {
    const negEnd = matchNegationEnding(tokens, wakeDewa.span.endExclusive, { allowAttributive: true, allowConjecture: true });
    if (negEnd !== null) {
      const consumed = wakeDewa.span.endExclusive - pos + negEnd.consumed;
      return modalMatchWithFusedConjecture({
        op: buildWakeOp(srcSlice(tokens, pos, consumed), "partial_negation", "negative", negEnd.polite),
        consumed
      }, negEnd, tokens, pos);
    }
  }
  if (t1.surface === "でも" && (t1.pos & POS1) === 副助詞) {
    const negEnd = matchNegationEnding(tokens, pos + 2, { allowAttributive: true, allowConjecture: true });
    if (negEnd !== null) {
      return modalMatchWithFusedConjecture({
        op: buildWakeOp(srcSlice(tokens, pos, 2 + negEnd.consumed), "weakened_partial_negation", "negative", negEnd.polite),
        consumed: 2 + negEnd.consumed
      }, negEnd, tokens, pos);
    }
  }
  if (canBareCarrierFeedFollowingTail(cursor, 1, stemToken, ctx)) {
    return { op: buildWakeOp(srcSlice(tokens, pos, 1), "explanatory", "affirmative", false), consumed: 1 };
  }
  return null;
}

export function buildWakeOp(
  source: OpSource,
  variant: "explanatory" | "rhetorical_no_way" | "rhetorical_possibility" | "partial_negation" | "weakened_partial_negation",
  polarity: "affirmative" | "negative",
  polite: boolean
): WakeModalOp {
  return createModalOp({

    modal: "wake",
    source,
    variant,
    polarity,
    polite,
    past: false
  });
}

function matchMai(
  cursor: TokenCursor<RuntimeHaruToken>
): ModalMatch | null {
  const { tokens, pos } = cursor;
  const t0 = tokens[pos];
  if (
    t0 === undefined ||
    ((t0.pos & POS4) !== 助動詞_マイ && (t0.pos & POS4) !== 文語助動詞_マジ)
  ) {
    return null;
  }
  const t0pos5A = t0.pos & POS5A;
  if (t0pos5A !== 終止形_ && t0pos5A !== 連体形_ && t0pos5A !== 連用形_) {
    return null;
  }
  return { op: buildMaiOp(srcSlice(tokens, pos, 1)), consumed: 1 };
}

export function buildMaiOp(source: OpSource): MaiModalOp {
  return createModalOp({

    modal: "mai",
    source,
    polite: false,
    past: false
  });
}

export function buildLimitNegationOp(
  source: OpSource,
  focus: LimitNegationFocus,
  polite: boolean
): LimitNegationModalOp {
  return createModalOp({

    modal: "limit_negation",
    source,
    focus,
    polite,
    past: false
  });
}

export function matchLimitNegationModal(
  cursor: TokenCursor<RuntimeHaruToken>
): LimitNegationModalOp | null {
  const { tokens, pos } = cursor;
  const frame = quoteFocusLimitNegationTailStartingAt(cursor.fork());
  if (frame === null) {
    return null;
  }
  const negEnd = matchNegationEnding(tokens, frame.limitVerbIdx + 1, { allowAttributive: true });
  if (negEnd === null || frame.limitVerbIdx + 1 + negEnd.consumed > cursor.end) {
    return null;
  }
  const consumed = frame.limitVerbIdx + 1 + negEnd.consumed - pos;
  cursor.advance(consumed);
  return buildLimitNegationOp(
    srcSlice(tokens, pos, consumed),
    frame.marker.focusSurface === "も" ? "mo" : "wa",
    negEnd.polite
  );
}

function matchSoudaHearsay(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemToken: RuntimeHaruToken,
  ctx: ModalMatchContext
): ModalMatch | null {
  const { tokens, pos, end: n } = cursor;
  const t0 = tokens[pos];
  if (t0 === undefined) return null;

  const isDirectAfterStem = pos >= 1 && tokens[pos - 1] === stemToken;
  const stemPos5A = stemToken.pos & POS5A;
  const recoveredYotaiStem =
    t0.surface === "そう" &&
    (t0.pos & POS0) === 副詞 &&
    isDirectAfterStem &&
    (stemPos5A === 連用形_ || stemPos5A === 語幹_);
  if (!isSoudaAuxiliaryStemToken(t0) && !recoveredYotaiStem) return null;

  let reading: "hearsay" | "yotai" = "hearsay";
  if (isDirectAfterStem) {
    if (stemPos5A === 連用形_ || stemPos5A === 語幹_ || isBareNaAdjYotaiStemToken(stemToken)) {
      reading = "yotai";
    }
  } else if (isDirectAfterYotaiCarrier(ctx.previousOps, pos)) {
    reading = "yotai";
  }

  const t1 = pos + 1 < n ? tokens[pos + 1] : undefined;
  if (t1 === undefined) {
    return { op: buildSoudaHearsayOp(srcSlice(tokens, pos, 1), false, reading), consumed: 1 };
  }
  const t1pos4 = t1.pos & POS4;
  const t1pos5A = t1.pos & POS5A;
  const t1IsPoliteCopula = t1pos4 === 助動詞_デス;
  const t1IsAdnominalCopula = t1pos5A === 連体形_ &&
    ((t1.surface === "な" && t1pos4 === 助動詞_ダ) || t1IsPoliteCopula);
  const nominalizerSupportsAdnominalCopula = t1IsAdnominalCopula &&
    predicateNominalizerRelationForToken(tokens[pos + 2], pos + 2, {
      requirement: "tail_connective_marker",
      consumers: ["tail_multi_clause"]
    })?.nominalizerKind === "no";
  const terminalNodaSupportsAdnominalCopula = t1IsAdnominalCopula &&
    t1.surface === "な" &&
    predicateNominalizerRelationForToken(tokens[pos + 2], pos + 2, {
      requirement: "terminal_noda_marker",
      consumers: ["tail_multi_clause"]
    })?.nominalizerKind === "no";
  const adnominalHeadTerminal = t1IsAdnominalCopula &&
    reading === "yotai" &&
    t1.surface === "な" &&
    ctx.input?.allowAdnominalCopulaTerminal === true &&
    pos + 2 >= n &&
    !nominalizerSupportsAdnominalCopula;
  if (
    t1IsAdnominalCopula &&
    (
      nominalizerSupportsAdnominalCopula ||
      terminalNodaSupportsAdnominalCopula ||
      (reading === "yotai" &&
        t1.surface === "な" &&
        ctx.lookups !== undefined &&
        attributiveCopulaTailFollows(tokens, pos + 2, ctx.lookups)) ||
      adnominalHeadTerminal ||
      (reading === "hearsay" &&
        t1.surface === "な" &&
        utteranceClosesAtChunkPosition(cursor, pos + 2, ctx.input))
    )
  ) {
    return {
      op: buildSoudaHearsayOp(srcSlice(tokens, pos, 2), t1IsPoliteCopula, reading),
      consumed: 2,
      ...(adnominalHeadTerminal ? { terminal: "attributive" as const } : {})
    };
  }
  if (t1pos5A !== 終止形_ && t1pos5A !== 連用形_) {
    const bareFocusNegation = reading === "yotai"
      ? soudaAppearanceFocusNegationAt(tokens, pos + 1)
      : null;
    if (bareFocusNegation !== null) {
      const consumed = 2 + bareFocusNegation.supportConsumed;
      return {
        op: buildSoudaHearsayOp(srcSlice(tokens, pos, consumed), false, reading, bareFocusNegation.particle),
        consumed
      };
    }
    return canBareCarrierFeedFollowingTail(cursor, 1, stemToken, ctx) ||
      terminalDiscourseSfpRunClosesUtterance(cursor, ctx.input, 1)
      ? { op: buildSoudaHearsayOp(srcSlice(tokens, pos, 1), false, reading), consumed: 1 }
      : null;
  }

  if (
    t1pos4 === 助動詞_ダ &&
    t1pos5A === 連用形_ &&
    copulaNiMarkerRelationForToken(t1, pos + 1, { consumers: ["tail_multi_clause"] }) !== null
  ) {
    const focusNegation = soudaAppearanceFocusNegationAt(tokens, pos + 2);
    if (focusNegation !== null) {
      const consumed = 3 + focusNegation.supportConsumed;
      return {
        op: buildSoudaHearsayOp(srcSlice(tokens, pos, consumed), false, reading, focusNegation.particle),
        consumed
      };
    }
  }

  const soudaDewa = dewaScopeBridgeRelationAt(tokens, pos + 1, {
    anchorIdx: pos,
    consumers: ["tail_multi_clause"]
  });
  if (
    soudaDewa?.focusParticle === "wa" &&
    matchNegationEnding(tokens, soudaDewa.span.endExclusive, { allowAttributive: true }) !== null
  ) {
    const consumed = soudaDewa.span.endExclusive - pos;
    return { op: buildSoudaHearsayOp(srcSlice(tokens, pos, consumed), false, reading), consumed };
  }

  if (
    t1pos4 === 助動詞_ダ &&
    t1pos5A === 連用形_ &&
    (copulaDeMarkerRelationForToken(t1, pos + 1, { consumers: ["tail_multi_clause"] }) !== null ||
      copulaNiMarkerRelationForToken(t1, pos + 1, { consumers: ["tail_multi_clause"] }) !== null) &&
    isPredicativeCopulaSupportVerbAt(tokens, pos + 2)
  ) {
    return { op: buildSoudaHearsayOp(srcSlice(tokens, pos, 3), false, reading), consumed: 3 };
  }

  if (isAssertiveCopulaMarkerToken(t1)) {
    return { op: buildSoudaHearsayOp(srcSlice(tokens, pos, 2), false, reading), consumed: 2 };
  }
  if (t1pos4 === 助動詞_デス) {
    return { op: buildSoudaHearsayOp(srcSlice(tokens, pos, 2), true, reading), consumed: 2 };
  }
  return null;
}

function isBareNaAdjYotaiStemToken(stemToken: RuntimeHaruToken): boolean {
  return isNaAdjCapable(stemToken);
}

function isNegationStemYotaiCarrier(op: AuxOpNode): boolean {
  if (op.kind !== "negation") return false;
  const last = op.source.tokens[op.source.tokens.length - 1];
  return last !== undefined && isNaiOrNuToken(last) && (last.pos & POS5A) === 語幹_;
}

function isDirectAfterYotaiCarrier(previousOps: readonly AuxOpNode[], pos: number): boolean {
  const previous = previousOps[previousOps.length - 1];
  if (previous === undefined) return false;
  if (previous.kind === "tense" || previous.kind === "polite") {
    return false;
  }
  if (previous.kind === "negation" && !isNegationStemYotaiCarrier(previous)) {
    return false;
  }
  const lastIdx = previous.source.tokenIndices[previous.source.tokenIndices.length - 1];
  if (lastIdx !== pos - 1) return false;
  const lastToken = previous.source.tokens[previous.source.tokens.length - 1];
  const pos5A = (lastToken?.pos ?? 0) & POS5A;
  return pos5A === 連用形_ || pos5A === 語幹_;
}

export function buildSoudaHearsayOp(
  source: OpSource,
  polite: boolean,
  reading: "hearsay" | "yotai",
  negationFocusParticle?: NegationFocusParticle
): SoudaHearsayModalOp {
  return createModalOp({

    modal: "souda_hearsay",
    source,
    reading,
    candidates: [reading],
    polite,
    past: false,
    ...(negationFocusParticle === undefined ? {} : { negationFocusParticle })
  });
}

function soudaAppearanceFocusNegationAt(
  tokens: readonly RuntimeHaruToken[],
  focusIdx: number
): { readonly particle: NegationFocusParticle; readonly supportConsumed: number } | null {
  const focus = tokens[focusIdx];
  if (focus === undefined || (focus.pos & POS01) !== 助詞_係助詞) {
    return null;
  }
  const particle = negationFocusParticleForMarker(focus.surface);
  if (particle === null || matchNegationEnding(tokens, focusIdx + 1, { allowAttributive: true }) === null) {
    return null;
  }
  return {
    particle,
    supportConsumed: isPredicativeCopulaSupportVerbAt(tokens, focusIdx + 1) ? 1 : 0
  };
}

function matchTonokotoHearsay(
  cursor: TokenCursor<RuntimeHaruToken>,
  _stemToken: RuntimeHaruToken,
  _ctx: ModalMatchContext
): ModalMatch | null {
  const { tokens, pos } = cursor;
  const token = tokens[pos];
  if (token === undefined || token.dictionaryForm !== "とのことだ") {
    return null;
  }
  if (token.surface !== "とのことだ" && token.surface !== "とのことです") {
    return null;
  }
  return {
    op: buildSoudaHearsayOp(srcSlice(tokens, pos, 1), token.surface === "とのことです", "hearsay"),
    consumed: 1
  };
}

function matchTsumori(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemToken: RuntimeHaruToken,
  ctx: ModalMatchContext
): ModalMatch | null {
  const { tokens, pos, end: n } = cursor;
  const t0 = tokens[pos];
  if (t0 === undefined || !isTsumoriHeadToken(t0)) return null;
  const t1 = tokens[pos + 1];
  if (t1 === undefined) {
    return canBareBoundModalCarrierTerminate(pos + 1, n)
      ? { op: buildTsumoriOp(srcSlice(tokens, pos, 1), false, "affirmative"), consumed: 1 }
      : null;
  }
  const t1pos4 = t1.pos & POS4;
  const t1pos5A = t1.pos & POS5A;

  if (t1.surface === "は" && (t1.pos & POS1) === 係助詞) {
    const negEnd = matchNegationEnding(tokens, pos + 2, { allowAttributive: true });
    if (negEnd !== null) {
      return {
        op: buildTsumoriOp(srcSlice(tokens, pos, 2 + negEnd.consumed), negEnd.polite, "topic_negative"),
        consumed: 2 + negEnd.consumed
      };
    }
  }

  const tsumoriDewa = dewaScopeBridgeRelationAt(tokens, pos + 1, {
    anchorIdx: pos,
    consumers: ["tail_multi_clause"]
  });
  if (tsumoriDewa?.focusParticle === "wa") {
    const negEnd = matchNegationEnding(tokens, tsumoriDewa.span.endExclusive, { allowAttributive: true });
    if (negEnd !== null) {
      const consumed = tsumoriDewa.span.endExclusive - pos + negEnd.consumed;
      return {
        op: buildTsumoriOp(srcSlice(tokens, pos, consumed), negEnd.polite, "copula_negative"),
        consumed
      };
    }
  }
  if (isCopulaJaNegativeBridgeToken(t1)) {
    const negEnd = matchNegationEnding(tokens, pos + 2, { allowAttributive: true });
    if (negEnd !== null) {
      return {
        op: buildTsumoriOp(srcSlice(tokens, pos, 2 + negEnd.consumed), negEnd.polite, "copula_negative"),
        consumed: 2 + negEnd.consumed
      };
    }
  }

  if (
    copulaDeMarkerRelationForToken(t1, pos + 1, { consumers: ["tail_multi_clause"] }) !== null &&
    t1pos4 === 助動詞_ダ &&
    t1pos5A === 連用形_ &&
    !isObligationSpanStartingAtToken(
      tokens,
      pos + 2,
      ctx.elidedColloquialObligationContext ?? "terminal"
    )
  ) {
    const negEnd = matchNegationEnding(tokens, pos + 2, { allowAttributive: true });
    if (negEnd !== null) {
      return {
        op: buildTsumoriOp(srcSlice(tokens, pos, 2 + negEnd.consumed), negEnd.polite, "copula_negative"),
        consumed: 2 + negEnd.consumed
      };
    }
  }

  if (t1pos5A !== 終止形_ && t1pos5A !== 連用形_) {
    return canBareCarrierFeedFollowingTail(cursor, 1, stemToken, ctx) ||
      terminalDiscourseSfpRunClosesUtterance(cursor, ctx.input, 1)
      ? { op: buildTsumoriOp(srcSlice(tokens, pos, 1), false, "affirmative"), consumed: 1 }
      : null;
  }
  if (t1pos4 === 助動詞_ダ) {
    return { op: buildTsumoriOp(srcSlice(tokens, pos, 2), false, "affirmative"), consumed: 2 };
  }
  if (t1pos4 === 助動詞_デス) {
    return { op: buildTsumoriOp(srcSlice(tokens, pos, 2), true, "affirmative"), consumed: 2 };
  }
  if (
    canBareCarrierFeedFollowingTail(cursor, 1, stemToken, ctx) ||
    terminalDiscourseSfpRunClosesUtterance(cursor, ctx.input, 1)
  ) {
    return { op: buildTsumoriOp(srcSlice(tokens, pos, 1), false, "affirmative"), consumed: 1 };
  }
  return null;
}

function isTsumoriHeadToken(token: RuntimeHaruToken): boolean {
  if ((token.pos & POS0) !== 名詞) return false;
  const head = token.dictionaryForm || token.surface;
  return head === "つもり" || head === "積もり";
}

export function buildTsumoriOp(
  source: OpSource,
  polite: boolean,
  variant: TsumoriModalOp["variant"]
): TsumoriModalOp {
  return createModalOp({

    modal: "tsumori",
    source,
    variant,
    reading: "intention",
    candidates: ["intention"],
    polarity: variant === "affirmative" ? "affirmative" : "negative",
    polite,
    past: false
  });
}

function matchTokoro(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemToken: RuntimeHaruToken,
  ctx: ModalMatchContext
): ModalMatch | null {
  const { tokens, pos } = cursor;
  const t0 = tokens[pos];
  if (t0 === undefined || t0.surface !== "ところ" || (t0.pos & POS0) !== 名詞) return null;
  const t1 = tokens[pos + 1];
  if (t1 === undefined) return null;
  const t1pos4 = t1.pos & POS4;
  const t1pos5A = t1.pos & POS5A;
  if (
    isTokoroAdnominalCopulaBridge(t1) &&
    tokoroAdnominalCopulaTailFollows(tokens, pos + 2, ctx.lookups)
  ) {
    return { op: buildTokoroOp(srcSlice(tokens, pos, 2), t1pos4 === 助動詞_デス), consumed: 2 };
  }
  const focusBridge = cursor.lookahead(1, c => matchScopeBridgeTail(c, null));
  if (focusBridge !== null && focusBridge.polarity === "affirmative") {
    return { op: buildTokoroOp(srcSlice(tokens, pos, 1), false), consumed: 1 };
  }
  if (t1pos5A !== 終止形_ && t1pos5A !== 連用形_) {
    return canBareCarrierFeedFollowingTail(cursor, 1, stemToken, ctx)
      ? { op: buildTokoroOp(srcSlice(tokens, pos, 1), false), consumed: 1 }
      : null;
  }

  if (
    copulaDeMarkerRelationForToken(t1, pos + 1, { consumers: ["tail_multi_clause"] }) !== null &&
    t1pos5A === 連用形_
  ) {
    if (isPredicativeCopulaSupportVerbAt(tokens, pos + 2)) {
      return { op: buildTokoroOp(srcSlice(tokens, pos, 3), false), consumed: 3 };
    }
    const support = tokens[pos + 2];
    if (isAffirmativeCopulaSupportVerbToken(support)) {
      if ((support.pos & POS5) === 連用形_促音便) {
        return { op: buildTokoroOp(srcSlice(tokens, pos, 3), false), consumed: 3 };
      }
      if ((support.pos & POS5A) === 連用形_ && renyouChuushiPauseFollowsSupport(cursor, ctx, pos + 3)) {
        const tokoro = buildTokoroOp(srcSlice(tokens, pos, 3), false);
        const connective: ConnectiveOp = createConnectiveOp({
          connective: "listing",
          surface: DEARI_LISTING_CONNECTIVE_SURFACE,
          source: srcSlice(tokens, pos + 1, 2)
        });
        return { op: tokoro, ops: [tokoro, connective], consumed: 3 };
      }
    }
  }

  if (t1pos4 === 助動詞_ダ) {
    return { op: buildTokoroOp(srcSlice(tokens, pos, 2), false), consumed: 2 };
  }
  if (t1pos4 === 助動詞_デス) {
    return { op: buildTokoroOp(srcSlice(tokens, pos, 2), true), consumed: 2 };
  }
  if (canBareCarrierFeedFollowingTail(cursor, 1, stemToken, ctx)) {
    return { op: buildTokoroOp(srcSlice(tokens, pos, 1), false), consumed: 1 };
  }
  return null;
}

function isTokoroAdnominalCopulaBridge(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  const pos4 = token.pos & POS4;
  const pos5A = token.pos & POS5A;
  return (pos4 === 助動詞_ダ || pos4 === 助動詞_デス) &&
    pos5A === 連体形_;
}

function tokoroAdnominalCopulaTailFollows(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  lookups?: LookupTables
): boolean {
  return attributiveCopulaTailFollows(tokens, pos, lookups) ||
    terminalNodaCarrierFollowsAdnominalCopula(tokens, pos);
}

export function buildTokoroOp(
  source: OpSource,
  polite: boolean
): TokoroModalOp {
  return createModalOp({

    modal: "tokoro",
    source,
    variant: "temporal",
    candidates: ["temporal", "place", "intention"],
    reading: "temporal",
    polite,
    past: false
  });
}

const MODAL_MATCHERS: readonly ModalMatcher[] = [
  matchHazu, matchKamo, matchNodaDatteHearsay, matchNoda,
  matchWake, matchMai, matchYouda, matchSoudaHearsay, matchTonokotoHearsay, matchTsumori, matchTokoro, matchMono
];

function tryMatchModal(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemToken: RuntimeHaruToken,
  ctx: ModalMatchContext
): ModalMatch | null {
  for (const matcher of MODAL_MATCHERS) {
    const match = matcher(cursor, stemToken, ctx);
    if (match !== null) return match;
  }
  return null;
}

export function matchModalAtCursor(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemToken: RuntimeHaruToken,
  ctx: ModalMatchContext
): { readonly op: ModalOp; readonly ops?: readonly AuxOpNode[]; readonly terminal?: AuxLayerNode["terminal"] } | null {
  const match = tryMatchModal(cursor, stemToken, ctx);
  if (match === null) {
    return null;
  }
  cursor.advance(match.consumed);
  return {
    op: match.op,
    ...(match.ops === undefined ? {} : { ops: match.ops }),
    ...(match.terminal === undefined ? {} : { terminal: match.terminal })
  };
}

export const MONO_MODAL_SAMPLE_NO_EVIDENCE: MonoModalEvidence = MONO_MODAL_NO_EVIDENCE;
