
import { QUOTED_REPORTING_PASSIVE_DIRECT_FORMS } from "../head-tail/data/quoted-reporting-sets.js";
import { previousNonSpaceIndex } from "../clause-layout/trivia.js";
import { quoteMarkerRelationAt } from "../head-tail/boundary/quote-marker.js";
import { TokenCursor } from "../token-cursor.js";


import { POS0, POS4, POS5A, 助詞, 助動詞, 助動詞_レル, 動詞, 未然形_, NOMINAL_BITS, pos0in } from "../../types/pos.js";
export interface QuotedReportingPassiveToken {
  readonly surface: string;
  readonly dictionaryForm: string;
  readonly pos: number;
}

export {
  QUOTED_REPORTING_ADVERSATIVE_SURFACES,
  QUOTED_REPORTING_PASSIVE_DIRECT_FORMS,
  QUOTED_REPORTING_SARERU_FORMS
} from "../head-tail/data/quoted-reporting-sets.js";

export function isMizenkeiForm(token: QuotedReportingPassiveToken): boolean {
  return (token.pos & POS5A) === 未然形_;
}

export function isRareruAuxToken(token: QuotedReportingPassiveToken): boolean {
  return (token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_レル);
}

export function matchQuotedPassiveTailTokens(
  cursor: TokenCursor<QuotedReportingPassiveToken>,
  predicateForms: readonly string[]
): readonly [predicatePos: number, passivePos: number, markerSurface: string | null] | null {
  const { tokens, pos } = cursor;
  const n = cursor.end;
  const quoteMarker = quoteMarkerRelationAt(tokens, pos, { consumers: ["quoted_reporting_passive"] });
  if (pos >= n || quoteMarker?.canonicalSurface !== "と" || ((tokens[pos]?.pos ?? 0) & POS0) !== 助詞) {
    return null;
  }
  let marker: string | null = null;
  let predPos = pos + 1;
  if (
    predPos < n &&
    (tokens[predPos]?.surface === "も" || tokens[predPos]?.surface === "は") &&
    ((tokens[predPos]?.pos ?? 0) & POS0) === 助詞
  ) {
    marker = tokens[predPos]?.surface ?? null;
    predPos += 1;
  }
  const passivePos = predPos + 1;
  if (passivePos >= n) {
    return null;
  }
  const predicate = tokens[predPos];
  const passive = tokens[passivePos];
  if (
    predicate !== undefined &&
    passive !== undefined &&
    (predicate.pos & POS0) === 動詞 &&
    predicateForms.includes(predicate.dictionaryForm) &&
    isMizenkeiForm(predicate) &&
    isRareruAuxToken(passive)
  ) {
    return [predPos, passivePos, marker];
  }
  return null;
}

export function markerPrecededByBareNominalLabel(
  tokens: readonly QuotedReportingPassiveToken[],
  markerIdx: number
): boolean {
  const prevIdx = previousNonSpaceIndex(tokens, markerIdx);
  if (prevIdx === null) {
    return false;
  }
  const prevPos0 = (tokens[prevIdx]?.pos ?? 0) & POS0;
  return pos0in(prevPos0, NOMINAL_BITS);
}

export function matchQuotedSareruTailAsClauseQuote(
  cursor: TokenCursor<QuotedReportingPassiveToken>
): readonly [predicatePos: number, passivePos: number, markerSurface: string | null] | null {
  const { tokens, pos: markerIdx } = cursor;
  if (markerPrecededByBareNominalLabel(tokens, markerIdx)) {
    return null;
  }
  return matchQuotedPassiveTailTokens(cursor, QUOTED_REPORTING_PASSIVE_DIRECT_FORMS);
}
