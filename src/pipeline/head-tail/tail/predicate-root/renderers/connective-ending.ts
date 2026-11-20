import type { RuntimeHaruToken } from "../../../../../types/token.js";
import { POS4, POS5A, 仮定形_, 助動詞_ダ, isPastAuxConditionalForm } from "../../../../../types/pos.js";
import { canonicalMedialProlongationConnectiveSurface } from "../connective-surface-table.js";
import { CONNECTIVE_RENDER_MAP } from "../connective-render-table.js";
import type { ConnectiveOp } from "../grammar.js";

export function resolveConnectiveEnding(
  surface: string,
  isVerb: boolean,
  past: boolean
): { ending: string; pastViaEnding: boolean; suffixText?: string } | null {
  const rule = CONNECTIVE_RENDER_MAP.get(surface);
  if (rule === undefined) return null;
  if (rule.pastBehavior === "ignore" || rule.pastBehavior === "natural") {
    const ending = !isVerb && rule.adjEnding !== undefined ? rule.adjEnding : rule.korean;
    return { ending, pastViaEnding: true, ...(rule.suffixText === undefined ? {} : { suffixText: rule.suffixText }) };
  }
  if (past) {
    const adjPast = !isVerb ? (rule.adjPastEnding ?? rule.pastEnding) : rule.pastEnding;
    if (adjPast !== undefined) {
      return { ending: adjPast, pastViaEnding: true, ...(rule.suffixText === undefined ? {} : { suffixText: rule.suffixText }) };
    }
    const baseAdj = !isVerb && rule.adjEnding !== undefined ? rule.adjEnding : rule.korean;
    return { ending: baseAdj, pastViaEnding: false, ...(rule.suffixText === undefined ? {} : { suffixText: rule.suffixText }) };
  }
  const ending = !isVerb && rule.adjEnding !== undefined ? rule.adjEnding : rule.korean;
  return { ending, pastViaEnding: true, ...(rule.suffixText === undefined ? {} : { suffixText: rule.suffixText }) };
}

export function connectiveRenderSurface(connective: ConnectiveOp): string {
  if (connective.source.tokens.some(isConditionalNaraAuxToken)) {
    return "なら";
  }
  if (connective.source.tokens.some((token) => isPastAuxConditionalForm(token.pos))) {
    return canonicalMedialProlongationConnectiveSurface(connective.surface);
  }
  return connective.surface;
}

function isConditionalNaraAuxToken(token: RuntimeHaruToken): boolean {
  return token.dictionaryForm === "だ" &&
    token.reading === "ナラ" &&
    (token.pos & (POS4 | POS5A)) === (助動詞_ダ | 仮定形_);
}
