import {
  auxHasNegativePolite,
  auxHasPast,
  auxIsPolite,
  collectAuxTokens,
  type MatcherToken
} from "../../../matchers.js";
import { TokenCursor } from "../../../token-cursor.js";

import { quoteMarkerRelationAt } from "../../boundary/quote-marker.js";

import { POS0, POS4, 助詞, 助動詞_ナイ, 動詞 } from "../../../../types/pos.js";
export interface QuoteFocusMarkerFrame {
  readonly quoteIdx: number;
  readonly focusIdx: number;
  readonly focusSurface: "は" | "も";
  readonly surface: "とは" | "とも";
  readonly tokenSpan: {
    readonly start: number;
    readonly end: number;
  };
}

export interface QuoteFocusLimitNegationTailFrame {
  readonly marker: QuoteFocusMarkerFrame;
  readonly limitVerbIdx: number;
  readonly auxStartIdx: number;
  readonly auxEndExclusive: number;
  readonly polite: boolean;
  readonly past: boolean;
  readonly sourceSpan: {
    readonly start: number;
    readonly end: number;
  };
}

export function quoteFocusMarkerStartingAt(
  cursor: TokenCursor<MatcherToken>
): QuoteFocusMarkerFrame | null {
  const { tokens, pos: quoteIdx } = cursor;
  if (quoteIdx < 0 || quoteIdx + 1 >= cursor.end) {
    return null;
  }
  const quote = tokens[quoteIdx];
  const focus = tokens[quoteIdx + 1];
  if (quote === undefined || quoteMarkerRelationAt(tokens, quoteIdx, { consumers: ["quote_content"] })?.canonicalSurface !== "と") {
    return null;
  }
  if (
    focus === undefined ||
    (focus.pos & POS0) !== 助詞 ||
    (focus.surface !== "は" && focus.surface !== "も")
  ) {
    return null;
  }
  return {
    quoteIdx,
    focusIdx: quoteIdx + 1,
    focusSurface: focus.surface,
    surface: focus.surface === "も" ? "とも" : "とは",
    tokenSpan: {
      start: quoteIdx,
      end: quoteIdx + 1
    }
  };
}

function matchLimitNegationTailAt(
  cursor: TokenCursor<MatcherToken>
): { readonly polite: boolean; readonly past: boolean } | null {
  const { pos: limitVerbIdx } = cursor;
  if (limitVerbIdx >= cursor.end) {
    return null;
  }
  const token = cursor.current();
  if (token === undefined || (token.pos & POS0) !== 動詞 || token.dictionaryForm !== "限る") {
    return null;
  }
  const aux = cursor.lookahead(1, collectAuxTokens);
  if (aux.length === 0) {
    return null;
  }
  const firstPos4 = (aux.at(0)?.pos ?? 0) & POS4;
  if (firstPos4 !== 助動詞_ナイ && !auxHasNegativePolite(aux)) {
    return null;
  }
  cursor.advance(1 + aux.length);
  return {
    polite: auxIsPolite(aux),
    past: auxHasPast(aux)
  };
}

export function quoteFocusLimitNegationTailStartingAt(
  cursor: TokenCursor<MatcherToken>
): QuoteFocusLimitNegationTailFrame | null {
  return cursor.tx(c => {
    const quoteIdx = c.pos;
    const marker = quoteFocusMarkerStartingAt(c);
    if (marker === null) {
      return null;
    }
    const limitVerbIdx = marker.focusIdx + 1;
    c.advance(limitVerbIdx - c.pos);
    const tail = matchLimitNegationTailAt(c);
    if (tail === null) {
      return null;
    }
    const auxStartIdx = limitVerbIdx + 1;
    const auxEndExclusive = c.pos;
    return {
      marker,
      limitVerbIdx,
      auxStartIdx,
      auxEndExclusive,
      polite: tail.polite,
      past: tail.past,
      sourceSpan: {
        start: quoteIdx,
        end: auxEndExclusive
      }
    };
  });
}
