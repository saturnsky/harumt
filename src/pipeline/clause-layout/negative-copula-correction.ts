import {
  POS0,
  POS01,
  POS4,
  POS5A,
  助動詞,
  助動詞_ダ,
  助動詞_ナイ,
  助詞_係助詞,
  助詞_副助詞,
  形容詞0,
  連用形_
} from "../../types/pos.js";
import type { BoundaryToken } from "../head-tail/boundary/punctuation.js";
import { dewaScopeBridgeRelationAt } from "../head-tail/boundary/marker.js";
import { isTeConnectiveToken } from "../head-tail/tail/postverb-tail-classifier.js";
import { previousNonSpaceIndex } from "./trivia.js";

export interface NegativeCopulaCorrectionEvidence {
  readonly kind: "negativeCopulaCorrection";
  readonly bridgeIdx: number;
  readonly negationIdx: number;
  readonly connectiveIdx: number;
  readonly splitAt: number;
}

function isCopulaNegationRenyouToken(token: BoundaryToken | undefined): boolean {
  if (token === undefined || (token.pos & POS5A) !== 連用形_) {
    return false;
  }
  if ((token.pos & POS4) === 助動詞_ナイ) {
    return true;
  }
  return (token.pos & POS0) === 形容詞0 &&
    (token.dictionaryForm === "ない" || token.dictionaryForm === "無い");
}

function positiveScopeBridgeMarkerStartBefore(
  tokens: readonly BoundaryToken[],
  negationIdx: number
): number | null {
  const focusIdx = previousNonSpaceIndex(tokens, negationIdx);
  if (focusIdx === null) {
    return null;
  }
  const focus = tokens[focusIdx];
  if (focus === undefined) {
    return null;
  }
  if ((focus.pos & (POS0 | POS4 | POS5A)) === (助動詞 | 助動詞_ダ | 連用形_) && focus.surface === "じゃ") {
    return focusIdx;
  }
  if ((focus.pos & POS01) === 助詞_副助詞 && focus.surface === "でも") {
    return focusIdx;
  }
  if ((focus.pos & POS01) !== 助詞_係助詞) {
    return null;
  }
  const markerIdx = previousNonSpaceIndex(tokens, focusIdx);
  if (markerIdx === null) {
    return null;
  }
  const bridge = dewaScopeBridgeRelationAt(tokens, markerIdx, {
    anchorIdx: markerIdx,
    consumers: ["clause_layout"]
  });
  return bridge !== null && bridge.span.endExclusive === negationIdx ? markerIdx : null;
}

export function negativeCopulaCorrectionShapeAt(
  tokens: readonly BoundaryToken[],
  connectiveIdx: number,
  splitAt: number
): NegativeCopulaCorrectionEvidence | null {
  if (!isTeConnectiveToken(tokens[connectiveIdx]) || splitAt !== connectiveIdx + 1) {
    return null;
  }
  if (((tokens[connectiveIdx + 1]?.pos ?? 0) & POS01) === 助詞_係助詞) {
    return null;
  }
  const negationIdx = previousNonSpaceIndex(tokens, connectiveIdx);
  if (negationIdx === null || !isCopulaNegationRenyouToken(tokens[negationIdx])) {
    return null;
  }
  const bridgeIdx = positiveScopeBridgeMarkerStartBefore(tokens, negationIdx);
  if (bridgeIdx === null) {
    return null;
  }
  return {
    kind: "negativeCopulaCorrection",
    bridgeIdx,
    negationIdx,
    connectiveIdx,
    splitAt
  };
}
