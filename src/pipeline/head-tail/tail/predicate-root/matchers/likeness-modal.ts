import type { RuntimeHaruToken } from "../../../../../types/token.js";
import { TokenCursor } from "../../../../token-cursor.js";
import type { LookupTables } from "../../../../lookup-tables.js";
import { copulaDeMarkerRelationForToken, dewaScopeBridgeRelationAt, kaMarkerRelationAt, nominalLinkMarkerRelationAt } from "../../../boundary/marker.js";
import { activeProtoLayout } from "../../../../clause-layout/proto-state.js";
import { closesUtteranceAs, utteranceClosureAfter, type UtteranceClosureKind } from "../../../../clause-layout/utterance-closure.js";
import type { AuxLayerNode, AuxOpNode, ModalOp, OpSource, ConnectiveOp, ScopeBridgeForm, YoudaModalOp, YoudaTerminal } from "../grammar.js";
import { srcSlice } from "../source.js";
import { DEARI_LISTING_CONNECTIVE_SURFACE, DEARU_SIMULTANEOUS_CONNECTIVE_SURFACE, isAffirmativeCopulaSupportVerbToken, isFusedCopulaDewaFocusToken, isFusedCopulaSupportConditionalToken, copulaSupportSimultaneousConnectiveTokenCountAt, isPredicativeCopulaSupportVerbAt } from "../classifiers/tokens.js";
import { isTerminalSfpBeforeClauseEnd } from "./obligation.js";
import { fusedNoYouNiKeijoujiAttributiveAt, keijoujiAttributiveMarkerAt, youNiQuoteDirectiveFollowerAt, youNiQuoteDirectiveProjectionSpanAt } from "./predicate-projection-connective.js";
import { likenessEvaluativeConditionHasConsequentAt, likenessNegativeScopeBodyFollowsAt, matchScopeBridgeTail, scopeBridgeBodyClosesAt } from "./scope-bridge.js";
import { likenessCarrierCopulaSlotAt } from "./copula.js";
import { POS0, POS1, POS4, POS5, POS5A, 意志推量形_, 仮定形_, 終止形_, 助詞, 助動詞_ダ, 助動詞_デス, 助動詞語幹, 連体形_, 連用形_, 連用形_ニ, 連用形_促音便, isNominalLike } from "../../../../../types/pos.js";
import { createConnectiveOp, createModalOp } from "../op-builders.js";
import type { ModalMatch, ModalMatchContext } from "./modal-tail.js";
import { sourceIndexForInputPosition, contextCursorForInputPosition } from "../parse-coordinates.js";

export function matchNoBridgedLikenessModal(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemToken: RuntimeHaruToken,
  ctx: ModalMatchContext
): { readonly op: ModalOp; readonly ops?: readonly AuxOpNode[]; readonly terminal?: AuxLayerNode["terminal"] } | null {
  if (keijoujiAttributiveMarkerAt(cursor.tokens, cursor.pos) !== "no") {
    return null;
  }
  const inner = cursor.fork(cursor.pos + 1, cursor.end, cursor.pos + 1);
  const match = matchYouda(inner, stemToken, ctx);
  if (match === null) {
    return null;
  }
  cursor.advance(1 + match.consumed);
  return {
    op: match.op,
    ...(match.ops === undefined ? {} : { ops: match.ops }),
    ...(match.terminal === undefined ? {} : { terminal: match.terminal })
  };
}

export function matchYouda(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemToken: RuntimeHaruToken,
  ctx?: ModalMatchContext
): ModalMatch | null {
  const { tokens, pos, end: n } = cursor;
  const t0 = tokens[pos];
  if (t0 === undefined) return null;
  if (ctx?.lookups !== undefined && youNiQuoteDirectiveProjectionCoordinate(tokens, pos, ctx.lookups)) {
    return null;
  }
  const kaNoYouda = matchKaNoYouda(cursor);
  if (kaNoYouda !== null) return kaNoYouda;
  if (t0.surface !== "よう" && t0.surface !== "みたい") return null;
  if ((t0.pos & POS1) !== 助動詞語幹) return null;
  const form: "youda" | "mitai" = t0.surface === "よう" ? "youda" : "mitai";

  if (pos + 1 >= n) {
    return { op: buildYoudaOp(srcSlice(tokens, pos, 1), form, false, "predicative"), consumed: 1 };
  }
  const t1 = pos + 1 < n ? tokens[pos + 1] : undefined;
  if (t1 === undefined) {
    return null;
  }
  const t1pos4 = t1.pos & POS4;
  const t1pos5A = t1.pos & POS5A;
  const tailCtx: YoudaTailContext = { cursor, ctx, tokens, pos, form, t1, t1pos4, t1pos5A };

  if (!isNominalLike(stemToken) && cursor.lookahead(1, isTerminalSfpBeforeClauseEnd)) {
    return { op: buildYoudaOp(srcSlice(tokens, pos, 1), form, false, "predicative"), consumed: 1 };
  }

  if (t1pos4 === 助動詞_ダ && t1pos5A === 仮定形_) {
    return { op: buildYoudaOp(srcSlice(tokens, pos, 1), form, false, "predicative"), consumed: 1 };
  }

  const dewaOrCondition = matchYoudaDewaBridgeOrCondition(tailCtx);
  if (dewaOrCondition !== null) return dewaOrCondition;
  if (cursor.lookahead(1, c => matchScopeBridgeTail(c, null)) !== null) {
    return { op: buildYoudaOp(srcSlice(tokens, pos, 1), form, false, "predicative"), consumed: 1 };
  }

  if (t1.surface === "だって") {
    return { op: buildYoudaOp(srcSlice(tokens, pos, 1), form, false, "predicative"), consumed: 1 };
  }

  if (isFusedCopulaSupportConditionalToken(t1)) {
    const youda = buildYoudaOp(srcSlice(tokens, pos, 1), form, false, "predicative");
    const connective: ConnectiveOp = createConnectiveOp({
      connective: "conditional",
      surface: "ば",
      source: srcSlice(tokens, pos + 1, 1)
    });
    return { op: youda, ops: [youda, connective], consumed: 2 };
  }

  if ((t1pos4 === 助動詞_ダ || t1pos4 === 助動詞_デス) && t1pos5A === 意志推量形_) {
    return { op: buildYoudaOp(srcSlice(tokens, pos, 1), form, false, "predicative"), consumed: 1 };
  }
  if (t1pos5A !== 終止形_ && t1pos5A !== 連用形_ && t1pos5A !== 連体形_) return null;

  const copulaSupport = matchYoudaCopulaSupportChain(tailCtx);
  if (copulaSupport !== null) return copulaSupport;

  const slot = likenessCarrierCopulaSlotAt(tokens, pos + 1);
  if (slot !== null) {
    const terminal: YoudaTerminal = slot.slot === "adnominal" ? "attributive_na" : "predicative";
    return {
      op: buildYoudaOp(srcSlice(tokens, pos, 2), form, slot.polite, terminal),
      consumed: 2
    };
  }
  return null;
}

interface YoudaTailContext {
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly ctx: ModalMatchContext | undefined;
  readonly tokens: readonly RuntimeHaruToken[];
  readonly pos: number;
  readonly form: "youda" | "mitai";
  readonly t1: RuntimeHaruToken;
  readonly t1pos4: number;
  readonly t1pos5A: number;
}

function matchKaNoYouda(cursor: TokenCursor<RuntimeHaruToken>): ModalMatch | null {
  const { tokens, pos } = cursor;
  if (kaMarkerRelationAt(tokens, pos, ["tail_multi_clause"]) !== null) {
    const you = tokens[pos + 2];
    if (
      nominalLinkMarkerRelationAt(tokens, pos + 1, { consumers: ["tail_multi_clause"] }) !== null &&
      you?.surface === "よう" &&
      (you.pos & POS1) === 助動詞語幹
    ) {
      const after = tokens[pos + 3];
      if (after === undefined) {
        return { op: buildYoudaOp(srcSlice(tokens, pos, 3), "youda", false, "predicative"), consumed: 3 };
      }
      if (cursor.lookahead(3, c => matchScopeBridgeTail(c, null)) !== null) {
        return { op: buildYoudaOp(srcSlice(tokens, pos, 3), "youda", false, "predicative"), consumed: 3 };
      }
      if (after.surface === "だって") {
        return { op: buildYoudaOp(srcSlice(tokens, pos, 3), "youda", false, "predicative"), consumed: 3 };
      }
      const afterPos4 = after.pos & POS4;
      const afterPos5A = after.pos & POS5A;
      if (
        ((afterPos4 & POS4) === 助動詞_ダ || (afterPos4 & POS4) === 助動詞_デス) &&
        ((afterPos5A & POS5A) === 終止形_ || (afterPos5A & POS5A) === 連用形_ || (afterPos5A & POS5A) === 連体形_)
      ) {
        const terminal: YoudaTerminal = (afterPos5A & POS5A) === 連体形_ ? "attributive_na" : "predicative";
        return {
          op: buildYoudaOp(srcSlice(tokens, pos, 4), "youda", (afterPos4 & POS4) === 助動詞_デス, terminal),
          consumed: 4
        };
      }
    }
  }
  return null;
}

function matchYoudaDewaBridgeOrCondition(tailCtx: YoudaTailContext): ModalMatch | null {
  const { cursor, ctx, tokens, pos, form, t1 } = tailCtx;
  const dewaRelation = dewaScopeBridgeRelationAt(tokens, pos + 1, {
    anchorIdx: pos,
    consumers: ["tail_multi_clause"]
  });
  if (dewaRelation !== null) {
    const bridgeForm: ScopeBridgeForm = dewaRelation.focusParticle === "mo" ? "demo" : "dewa";
    const markerConsumed = dewaRelation.span.endExclusive - (pos + 1);
    const bridgeCloses = cursor.lookahead(
      1 + markerConsumed,
      c => (scopeBridgeBodyClosesAt(c, bridgeForm, pos + 1) ? true : null)
    ) === true;
    if (
      bridgeCloses ||
      dewaRelation.focusParticle !== "wa" ||
      likenessNegativeScopeBodyFollowsAt(tokens, dewaRelation.span.endExclusive) ||
      !youdaEvaluativeConditionHasConsequent(cursor, ctx, pos, markerConsumed)
    ) {
      return { op: buildYoudaOp(srcSlice(tokens, pos, 1), form, false, "predicative"), consumed: 1 };
    }
    return youdaEvaluativeConditionMatch(tokens, pos, form, markerConsumed);
  }
  if (isFusedCopulaDewaFocusToken(t1)) {
    const bridgeCloses = cursor.lookahead(
      2,
      c => (scopeBridgeBodyClosesAt(c, "ja", pos + 1) ? true : null)
    ) === true;
    if (
      !bridgeCloses &&
      !likenessNegativeScopeBodyFollowsAt(tokens, pos + 2) &&
      youdaEvaluativeConditionHasConsequent(cursor, ctx, pos, 1)
    ) {
      return youdaEvaluativeConditionMatch(tokens, pos, form, 1);
    }
  }
  return null;
}

function matchYoudaCopulaSupportChain(tailCtx: YoudaTailContext): ModalMatch | null {
  const { cursor, ctx, tokens, pos, form, t1, t1pos4, t1pos5A } = tailCtx;
  if (
    t1pos4 === 助動詞_ダ &&
    t1pos5A === 連用形_ &&
    copulaDeMarkerRelationForToken(t1, pos + 1, { consumers: ["tail_multi_clause"] }) !== null
  ) {
    if (isPredicativeCopulaSupportVerbAt(tokens, pos + 2)) {
      return { op: buildYoudaOp(srcSlice(tokens, pos, 3), form, false, "predicative"), consumed: 3 };
    }
    const youdaSimultaneousTokens = copulaSupportSimultaneousConnectiveTokenCountAt(tokens, pos + 2);
    if (youdaSimultaneousTokens !== null) {
      const youda = buildYoudaOp(srcSlice(tokens, pos, 3), form, false, "predicative");
      const connective: ConnectiveOp = createConnectiveOp({
        connective: "simultaneous",
        surface: DEARU_SIMULTANEOUS_CONNECTIVE_SURFACE,
        source: srcSlice(tokens, pos + 1, 2 + youdaSimultaneousTokens)
      });
      return { op: youda, ops: [youda, connective], consumed: 3 + youdaSimultaneousTokens };
    }
    const support = tokens[pos + 2];
    if (isAffirmativeCopulaSupportVerbToken(support)) {
      if ((support.pos & POS5) === 連用形_促音便) {
        return { op: buildYoudaOp(srcSlice(tokens, pos, 3), form, false, "predicative"), consumed: 3 };
      }
      if ((support.pos & POS5A) === 連用形_ && renyouChuushiPauseFollowsSupport(cursor, ctx, pos + 3)) {
        const youda = buildYoudaOp(srcSlice(tokens, pos, 3), form, false, "predicative");
        const connective: ConnectiveOp = createConnectiveOp({
          connective: "listing",
          surface: DEARI_LISTING_CONNECTIVE_SURFACE,
          source: srcSlice(tokens, pos + 1, 2)
        });
        return { op: youda, ops: [youda, connective], consumed: 3 };
      }
    }
  }
  return null;
}

export const RENYOU_CHUUSHI_PAUSE_CLOSURES: ReadonlySet<UtteranceClosureKind> = new Set<UtteranceClosureKind>([
  "eos",
  "hard_terminal",
  "matched_delimiter_close",
  "unmatched_trailing",
  "weak_pause",
  "clause_boundary"
]);

export function renyouChuushiPauseFollowsSupport(
  cursor: TokenCursor<RuntimeHaruToken>,
  ctx: ModalMatchContext | undefined,
  pos: number
): boolean {
  const tokens = ctx?.input === undefined
    ? cursor.tokens
    : ctx.input.contextTokens ?? ctx.input.tokens;
  const idx = ctx?.input === undefined ? pos : sourceIndexForInputPosition(ctx.input, pos);
  return closesUtteranceAs(
    utteranceClosureAfter(activeProtoLayout(), tokens, idx),
    RENYOU_CHUUSHI_PAUSE_CLOSURES
  );
}

function youNiQuoteDirectiveProjectionCoordinate(
  tokens: readonly RuntimeHaruToken[],
  youIdx: number,
  lookups: LookupTables
): boolean {
  const span = youNiQuoteDirectiveProjectionSpanAt(tokens, youIdx, lookups);
  return span !== null && youNiQuoteDirectiveFollowerAt(tokens, span.markerEndExclusive, lookups);
}

function youdaEvaluativeConditionHasConsequent(
  cursor: TokenCursor<RuntimeHaruToken>,
  ctx: ModalMatchContext | undefined,
  pos: number,
  markerConsumed: number
): boolean {
  const contextCursor = ctx?.input === undefined
    ? cursor.fork(pos, cursor.tokens.length, pos)
    : contextCursorForInputPosition(ctx.input, pos);
  return likenessEvaluativeConditionHasConsequentAt(
    contextCursor,
    contextCursor.pos + 1 + markerConsumed
  );
}

function youdaEvaluativeConditionMatch(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  form: "youda" | "mitai",
  markerConsumed: number
): ModalMatch {
  const youda = buildYoudaOp(srcSlice(tokens, pos, 1), form, false, "predicative");
  const connective: ConnectiveOp = createConnectiveOp({
    connective: "conditional",
    surface: "では",
    source: srcSlice(tokens, pos + 1, markerConsumed)
  });
  return { op: youda, ops: [youda, connective], consumed: 1 + markerConsumed };
}

export function buildYoudaOp(
  source: OpSource,
  form: "youda" | "mitai",
  polite: boolean,
  terminal: YoudaTerminal = "predicative"
): YoudaModalOp {
  return createModalOp({

    modal: "youda",
    source,
    form,
    terminal,
    reading: "likeness",
    candidates: ["likeness"],
    polite,
    past: false
  });
}

function matchNominalHostLikeness(
  cursor: TokenCursor<RuntimeHaruToken>
): ModalMatch | null {
  const { tokens, pos, end: n } = cursor;
  const t0 = tokens[pos];
  if (t0 === undefined) return null;
  if (
    keijoujiAttributiveMarkerAt(tokens, pos) === "no" ||
    fusedNoYouNiKeijoujiAttributiveAt(tokens, pos)
  ) {
    return null;
  }
  if (t0.surface === "のように" && (t0.pos & POS0) === 助詞) {
    return { op: buildYoudaOp(srcSlice(tokens, pos, 1), "youda", false, "adverbial_ni"), consumed: 1 };
  }
  const hasNoMarker = nominalLinkMarkerRelationAt(tokens, pos, {
    consumers: ["tail_multi_clause"]
  }) !== null;
  const likenessPos = hasNoMarker ? pos + 1 : pos;
  const likeness = tokens[likenessPos];
  if (likeness === undefined || (likeness.surface !== "よう" && likeness.surface !== "みたい")) {
    return null;
  }
  if ((likeness.pos & POS1) !== 助動詞語幹) {
    return null;
  }
  if (!hasNoMarker && likeness.surface !== "みたい") {
    return null;
  }
  const form: "youda" | "mitai" = likeness.surface === "よう" ? "youda" : "mitai";
  const copulaPos = likenessPos + 1;
  if (copulaPos >= n) return null;
  const copula = tokens[copulaPos];
  if (copula === undefined) return null;
  const copulaPos4 = copula.pos & POS4;
  const copulaPos5A = copula.pos & POS5A;

  if (dewaScopeBridgeRelationAt(tokens, copulaPos, {
    anchorIdx: likenessPos,
    consumers: ["tail_multi_clause"]
  }) !== null && cursor.lookahead(copulaPos - pos, c => matchScopeBridgeTail(c, null)) !== null) {
    return { op: buildYoudaOp(srcSlice(tokens, pos, likenessPos - pos + 1), form, false, "predicative"), consumed: likenessPos - pos + 1 };
  }

  if (copula.surface === "だって" && (copula.pos & POS0) === 助詞) {
    return { op: buildYoudaOp(srcSlice(tokens, pos, likenessPos - pos + 1), form, false, "predicative"), consumed: likenessPos - pos + 1 };
  }

  if (copulaPos5A !== 終止形_ && copulaPos5A !== 連用形_ && copulaPos5A !== 連体形_) {
    return null;
  }
  const consumed = copulaPos - pos + 1;

  if (
    copulaPos4 === 助動詞_ダ &&
    copulaPos5A === 連用形_ &&
    copulaDeMarkerRelationForToken(copula, copulaPos, { consumers: ["tail_multi_clause"] }) !== null
  ) {
    if (isPredicativeCopulaSupportVerbAt(tokens, copulaPos + 1)) {
      return {
        op: buildYoudaOp(srcSlice(tokens, pos, consumed + 1), form, false, "predicative"),
        consumed: consumed + 1
      };
    }
    const nominalSimultaneousTokens = copulaSupportSimultaneousConnectiveTokenCountAt(tokens, copulaPos + 1);
    if (nominalSimultaneousTokens !== null) {
      const youda = buildYoudaOp(srcSlice(tokens, pos, consumed + 1), form, false, "predicative");
      const connective: ConnectiveOp = createConnectiveOp({
        connective: "simultaneous",
        surface: DEARU_SIMULTANEOUS_CONNECTIVE_SURFACE,
        source: srcSlice(tokens, copulaPos, 2 + nominalSimultaneousTokens)
      });
      return { op: youda, ops: [youda, connective], consumed: consumed + 1 + nominalSimultaneousTokens };
    }
  }

  if (copulaPos4 === 助動詞_ダ) {
    const terminal: YoudaTerminal = copulaPos5A === 連体形_
      ? "attributive_na"
      : (copula.pos & POS5) === 連用形_ニ
        ? "adverbial_ni"
        : "predicative";
    return { op: buildYoudaOp(srcSlice(tokens, pos, consumed), form, false, terminal), consumed };
  }
  if (copulaPos4 === 助動詞_デス) {
    return { op: buildYoudaOp(srcSlice(tokens, pos, consumed), form, true), consumed };
  }
  return null;
}

export function matchNominalHostLikenessAtCursor(
  cursor: TokenCursor<RuntimeHaruToken>
): readonly AuxOpNode[] | null {
  const match = matchNominalHostLikeness(cursor);
  if (match === null) {
    return null;
  }
  cursor.advance(match.consumed);
  return match.ops ?? [match.op];
}
