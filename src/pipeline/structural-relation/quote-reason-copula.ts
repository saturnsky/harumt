import { previousNonSpaceIndex } from "../clause-layout/trivia.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import type { StructuralRelationTokenSpan } from "./types.js";
import { POS0, POS1, POS4, POS5A, 助詞, 助動詞, 助動詞_ダ, 助動詞_デス, 接続助詞, 連用形_, isPastAuxConditionalForm, isPastAuxiliaryPos } from "../../types/pos.js";

export interface ReasonCopulaQuoteContentMatch {
  readonly reasonMarkerIdx: number;
  readonly copulaStart: number;
  readonly copulaEndExclusive: number;
  readonly past: boolean;
  readonly polite: boolean;
  readonly conjunctive: boolean;
  readonly negative: boolean;
  readonly additiveMo: boolean;
  readonly conjecture: { readonly polite: boolean } | null;
}

export function reasonCopulaQuoteContentMatchBeforeMarker(
  tokens: readonly RuntimeHaruToken[],
  contentSpan: StructuralRelationTokenSpan,
  markerIdx: number,
): ReasonCopulaQuoteContentMatch | null {
  const lastCopulaIdx = previousNonSpaceIndex(tokens, markerIdx, contentSpan.start);
  if (lastCopulaIdx === null || lastCopulaIdx < contentSpan.start || lastCopulaIdx >= contentSpan.endExclusive) {
    return null;
  }
  const copulaShell = reasonCopulaShellEndingAt(tokens, lastCopulaIdx, contentSpan.start);
  if (copulaShell === null) {
    return null;
  }
  const reasonMarkerIdx = previousNonSpaceIndex(tokens, copulaShell.start, contentSpan.start);
  const reasonMarker = reasonMarkerIdx === null ? undefined : tokens[reasonMarkerIdx];
  if (reasonMarkerIdx === null || reasonMarkerIdx < contentSpan.start || !isStrictReasonKaraToken(reasonMarker)) {
    return null;
  }
  return {
    reasonMarkerIdx,
    copulaStart: copulaShell.start,
    copulaEndExclusive: copulaShell.endExclusive,
    past: copulaShell.past,
    polite: copulaShell.polite,
    conjunctive: copulaShell.conjunctive,
    negative: false,
    additiveMo: false,
    conjecture: null,
  };
}

export function quoteContentEndsWithReasonCopulaBeforeQuoteMarker(
  tokens: readonly RuntimeHaruToken[],
  contentSpan: StructuralRelationTokenSpan,
  markerIdx: number,
): boolean {
  return reasonCopulaQuoteContentMatchBeforeMarker(tokens, contentSpan, markerIdx) !== null;
}

function reasonCopulaShellEndingAt(
  tokens: readonly RuntimeHaruToken[],
  lastIdx: number,
  lowerBoundInclusive: number,
): { readonly start: number; readonly endExclusive: number; readonly past: boolean; readonly polite: boolean; readonly conjunctive: boolean } | null {
  const last = tokens[lastIdx];
  if (last === undefined) {
    return null;
  }
  if (isPastAuxiliaryPos(last.pos)) {
    if (isPastAuxConditionalForm(last.pos)) {
      return null;
    }
    const copulaIdx = previousNonSpaceIndex(tokens, lastIdx, lowerBoundInclusive);
    const copula = copulaIdx === null ? undefined : tokens[copulaIdx];
    if (copulaIdx !== null && isBasicCopulaAuxToken(copula)) {
      return {
        start: copulaIdx,
        endExclusive: lastIdx + 1,
        past: true,
        polite: (copula!.pos & POS4) === 助動詞_デス || copula!.dictionaryForm === "です",
        conjunctive: false,
      };
    }
    return null;
  }
  if (isBasicCopulaAuxToken(last)) {
    return {
      start: lastIdx,
      endExclusive: lastIdx + 1,
      past: false,
      polite: (last.pos & POS4) === 助動詞_デス || last.dictionaryForm === "です",
      conjunctive: isCopulaDaRenyouToken(last),
    };
  }
  return null;
}

function isCopulaDaRenyouToken(token: RuntimeHaruToken): boolean {
  return token.surface === "で" &&
    (token.pos & (POS4 | POS5A)) === (助動詞_ダ | 連用形_);
}

export function isBasicCopulaAuxToken(token: RuntimeHaruToken | undefined): token is RuntimeHaruToken {
  if (token === undefined || (token.pos & POS0) !== 助動詞) {
    return false;
  }
  const pos4 = token.pos & POS4;
  return pos4 === 助動詞_ダ ||
    pos4 === 助動詞_デス ||
    token.dictionaryForm === "だ" ||
    token.dictionaryForm === "です";
}

function isStrictReasonKaraToken(token: RuntimeHaruToken | undefined): token is RuntimeHaruToken {
  return token !== undefined &&
    (token.surface === "から" || token.dictionaryForm === "から") &&
    (token.pos & POS0) === 助詞 &&
    (token.pos & POS1) === 接続助詞;
}
