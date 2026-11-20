import type { RuntimeHaruToken } from "../../../../../types/token.js";
import { TokenCursor } from "../../../../token-cursor.js";
import type { LookupTables } from "../../../../lookup-tables.js";
import { dewaScopeBridgeRelationAt } from "../../../boundary/marker.js";
import type { AdjCopulaBridgeOp, AuxOpNode, NegationOp, OpSource, PoliteOp, PostverbAuxiliaryOp, CopulaOp, StemNode } from "../grammar.js";
import type { ParseInput } from "../parse-input.js";
import { isPostverbAuxiliaryActivationAccepted } from "../postverb-auxiliary-parser.js";
import { srcSingle, srcSlice } from "../source.js";
import { affirmativeFocusSupportShapeAt, isAruVerbToken, isCopulaJaNegativeBridgeToken, isNaiOrNuToken } from "../classifiers/tokens.js";
import { isAdnominalCopulaMatch, matchCopulaWithMoodReading } from "./copula.js";
import { POS0, POS01, POS4, POS5A, 助動詞, 助動詞_ヌ, 助動詞_マス, 動詞_非自立可能, 未然形_, 連用形_ } from "../../../../../types/pos.js";
import { buildPostverbAuxiliaryOp, createAdjCopulaBridgeOp, createNegationOp, createPoliteOp } from "../op-builders.js";
import { sourceIndexForInputPosition } from "../parse-coordinates.js";
import { isAdjLikeStemNode, opLastSourceToken } from "../parse-stem.js";

export function matchArimasenPoliteNegativeSupport(
  cursor: TokenCursor<RuntimeHaruToken>,
  stem: StemNode,
  ops: readonly AuxOpNode[]
): { readonly polite: PoliteOp; readonly negation: NegationOp } | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const aru = cursor.current();
  const mase = cursor.peek(1);
  const n = cursor.peek(2);
  if (
    aru === undefined ||
    (aru.dictionaryForm || aru.surface) !== "ある" ||
    (aru.pos & (POS01 | POS5A)) !== (動詞_非自立可能 | 連用形_)
  ) {
    return null;
  }
  if (
    mase === undefined ||
    (mase.pos & (POS4 | POS5A)) !== (助動詞_マス | 未然形_)
  ) {
    return null;
  }
  if (
    n === undefined ||
    (n.pos & (POS0 | POS4)) !== (助動詞 | 助動詞_ヌ)
  ) {
    return null;
  }
  if (!canAttachArimasenPoliteNegativeSupport(stem, ops)) {
    return null;
  }
  cursor.advance(3);
  return {
    polite: createPoliteOp({  source: srcSingle(mase, pos + 1) }),
    negation: createNegationOp({

      source: srcSlice(tokens, pos, 3),
      chainDepth: 1,
      chainPast: false,
      stemAux: [],
      preferShortNegation: false
    })
  };
}

export function matchCopulaAtCursor(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables,
  options: { readonly allowAdnominalTerminal?: boolean } = {},
  input?: ParseInput
): { readonly op: CopulaOp; readonly ops?: readonly AuxOpNode[]; readonly adnominal: boolean } | null {
  const pos = cursor.pos;
  const sourceContext = input === undefined
    ? undefined
    : {
      tokens: input.contextTokens ?? input.tokens,
      index: sourceIndexForInputPosition(input, pos)
    };
  const match = matchCopulaWithMoodReading(cursor.tokens, pos, lookups, {
    ...options,
    ...(input?.allowElidedDewaNegativeBody === undefined
      ? {}
      : { elidedDewaNegativeBody: input.allowElidedDewaNegativeBody }),
    ...(sourceContext === undefined ? {} : { sourceContext })
  });
  if (match === null) {
    return null;
  }
  const adnominal = isAdnominalCopulaMatch(cursor.tokens, pos, match, lookups, sourceContext);
  cursor.advance(match.consumed);
  return {
    op: match.op,
    ...(match.ops === undefined ? {} : { ops: match.ops }),
    adnominal
  };
}

function canAttachArimasenPoliteNegativeSupport(
  stem: StemNode,
  ops: readonly AuxOpNode[]
): boolean {
  const lastOp = ops[ops.length - 1];
  if (lastOp === undefined) {
    return isAdjLikeStemNode(stem);
  }
  const last = opLastSourceToken(lastOp);
  if (last === undefined || (last.pos & POS5A) !== 連用形_) {
    return false;
  }
  if (lastOp.kind === "desire") {
    return lastOp.form !== "tagaru";
  }
  if (lastOp.kind === "aspect" && lastOp.aspect === "te_hoshii") {
    return true;
  }
  if (lastOp.kind === "negation") {
    return true;
  }
  if (lastOp.kind === "copula" && lastOp.polarity === "negative") {
    return true;
  }
  return false;
}

export function matchAffirmativeFocusSupport(
  cursor: TokenCursor<RuntimeHaruToken>
): PostverbAuxiliaryOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const shape = affirmativeFocusSupportShapeAt(tokens, pos);
  const support = tokens[pos + 1];
  if (shape === null || support === undefined || !isPostverbAuxiliaryActivationAccepted(support, tokens[pos + 2])) {
    return null;
  }
  cursor.advance(2);
  return buildPostverbAuxiliaryOp(srcSlice(tokens, pos, 2), {
    kind: "focus_support",
    opChainHost: "inflecting_predicate_lemma",
    supportFocus: shape.focus
  });
}

export function matchAdjCopulaNegationBridge(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): { readonly op: AdjCopulaBridgeOp; readonly nextPos: number } | null {
  const t0 = tokens[pos];
  if (t0 === undefined) return null;
  if (isCopulaJaNegativeBridgeToken(t0)) {
    const supportAru = supportAruBeforeMasen(tokens, pos + 1);
    const next = tokens[pos + 1];
    if (!supportAru && (next === undefined || !isNaiOrNuToken(next))) {
      return null;
    }
    const consumed = supportAru ? 2 : 1;
    return {
      op: buildAdjCopulaBridgeOp(srcSlice(tokens, pos, consumed), "ja", supportAru),
      nextPos: pos + consumed
    };
  }

  const adjDewa = dewaScopeBridgeRelationAt(tokens, pos, {
    anchorIdx: pos,
    consumers: ["tail_multi_clause"]
  });
  if (adjDewa?.focusParticle === "wa") {
    const supportAru = supportAruBeforeMasen(tokens, adjDewa.span.endExclusive);
    const next = tokens[adjDewa.span.endExclusive];
    if (!supportAru && (next === undefined || !isNaiOrNuToken(next))) {
      return null;
    }
    const consumed = adjDewa.span.endExclusive - pos + (supportAru ? 1 : 0);
    return {
      op: buildAdjCopulaBridgeOp(srcSlice(tokens, pos, consumed), "dewa", supportAru),
      nextPos: pos + consumed
    };
  }

  return null;
}

export function buildAdjCopulaBridgeOp(
  source: OpSource,
  form: AdjCopulaBridgeOp["form"],
  supportAru: boolean
): AdjCopulaBridgeOp {
  return createAdjCopulaBridgeOp({  source, form, supportAru });
}

function supportAruBeforeMasen(tokens: readonly RuntimeHaruToken[], pos: number): boolean {
  const aru = tokens[pos];
  const masu = tokens[pos + 1];
  const nu = tokens[pos + 2];
  return (
    isAruVerbToken(aru) &&
    (aru.pos & POS5A) === 連用形_ &&
    masu !== undefined &&
    (masu.pos & (POS4 | POS5A)) === (助動詞_マス | 未然形_) &&
    nu !== undefined &&
    (nu.pos & POS4) === 助動詞_ヌ
  );
}
