
import type { RuntimeHaruToken, SeparationKind } from "../../types/token.js";
import { SEPARATION_OPENS_BOUNDARY, separatedAs } from "../clause-layout/trivia.js";
import { quoteMarkerRelationAt } from "../head-tail/boundary/quote-marker.js";
import { POS0, POS01, POS1, pos0in, 接尾辞, 補助記号, 名詞的, 助詞_終助詞, NOMINAL_BITS } from "../../types/pos.js";

export function isPreprocessClauseTerminalBoundary(
  tokens: readonly RuntimeHaruToken[],
  followerIndex: number,
  options: {
    readonly admittedSeparations?: ReadonlySet<SeparationKind>;
    readonly admitQuoteMarker?: boolean;
  } = {}
): boolean {
  let cursor = followerIndex;
  for (;;) {
    const sfp = tokens[cursor];
    if (sfp === undefined || (sfp.pos & POS01) !== 助詞_終助詞) {
      break;
    }
    cursor += 1;
  }
  const next = tokens[cursor];
  if (next === undefined) {
    return true;
  }
  if (separatedAs(tokens, cursor, options.admittedSeparations ?? SEPARATION_OPENS_BOUNDARY)) {
    return true;
  }
  if (options.admitQuoteMarker === true && quoteMarkerRelationAt(tokens, cursor) !== null) {
    return true;
  }
  return (next.pos & POS0) === 補助記号;
}

export function hasAttributiveFollower(next: RuntimeHaruToken | undefined): boolean {
  if (next === undefined) {
    return false;
  }
  const nextPos0 = next.pos & POS0;
  return pos0in(nextPos0, NOMINAL_BITS) ||
    (nextPos0 === 接尾辞 && (next.pos & POS1) === 名詞的);
}

export const NO_WHITESPACE_BOUNDARY_EVIDENCE: ReadonlySet<SeparationKind> = new Set<SeparationKind>();
