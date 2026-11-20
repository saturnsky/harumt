import type { RuntimeHaruToken } from "../../../../types/token.js";
import { TokenCursor } from "../../../token-cursor.js";
import type { AuxOpNode, ConditionalFlavor, NegationOp, ConnectiveOp } from "./grammar.js";
import { srcSlice } from "./source.js";
import type { TokoroResultConnectiveMatch } from "./matchers/tokoro-result-connective.js";
import type { CompositeConnectiveMatch } from "./matchers/connective.js";
import { POS4, POS5, POS5A, 仮定形_, 助動詞_タ, 連用形_促音便 } from "../../../../types/pos.js";
import { buildMatchedConnectiveOp } from "./op-builders.js";

export function connectiveOpFromMatch(
  match: CompositeConnectiveMatch | TokoroResultConnectiveMatch,
  cursor: TokenCursor<RuntimeHaruToken>
): ConnectiveOp {
  const pos = cursor.pos;
  cursor.advance(match.consumed);
  return buildMatchedConnectiveOp(
    srcSlice(cursor.tokens, pos, match.consumed),
    match
  );
}

export function connectiveFlavorFields(
  token: RuntimeHaruToken,
  previousOps: readonly AuxOpNode[]
): { readonly conditionalFlavor?: ConditionalFlavor } {
  if (!isTaraConditionalToken(token)) {
    return {};
  }
  const previousOp = previousOps.length > 0 ? previousOps[previousOps.length - 1] : undefined;
  if (previousOp?.kind === "negation" && negationOpEndsWithNaiSokuon(previousOp)) {
    return {
      conditionalFlavor: hasOperatorBeforeFinalNegation(previousOps)
        ? "counterfactual"
        : "plain"
    };
  }
  if (opEndsWithHoshiiSokuon(previousOp)) {
    return { conditionalFlavor: "counterfactual" };
  }
  return { conditionalFlavor: "plain" };
}

function isTaraConditionalToken(token: RuntimeHaruToken): boolean {
  return token.surface === "たら" &&
    (token.pos & (POS4 | POS5A)) === (助動詞_タ | 仮定形_);
}

function negationOpEndsWithNaiSokuon(op: NegationOp): boolean {
  const src = op.source.tokens;
  const last = src.length > 0 ? src[src.length - 1] : undefined;
  if (last === undefined) return false;
  const lemma = last.dictionaryForm || last.surface;
  return (lemma === "ない" || lemma === "無い") &&
    (last.pos & POS5) === 連用形_促音便;
}

function opEndsWithHoshiiSokuon(op: AuxOpNode | undefined): boolean {
  if (op?.kind !== "aspect" || op.aspect !== "te_hoshii") {
    return false;
  }
  const src = op.source.tokens;
  const last = src.length > 0 ? src[src.length - 1] : undefined;
  if (last === undefined) return false;
  const lemma = last.dictionaryForm || last.surface;
  return (lemma === "ほしい" || lemma === "欲しい") &&
    (last.pos & POS5) === 連用形_促音便;
}

function hasOperatorBeforeFinalNegation(previousOps: readonly AuxOpNode[]): boolean {
  const lastIndex = previousOps.length - 1;
  for (let i = 0; i < lastIndex; i++) {
    const op = previousOps[i];
    if (op === undefined) continue;
    if (
      op.kind === "aspect" ||
      op.kind === "modal" ||
      op.kind === "desire" ||
      op.kind === "voice" ||
      op.kind === "conjecture" ||
      op.kind === "scopeBridge" ||
      (op.kind === "idiom" && op.idiom === "potential_koto_ga_dekiru")
    ) {
      return true;
    }
  }
  return false;
}
