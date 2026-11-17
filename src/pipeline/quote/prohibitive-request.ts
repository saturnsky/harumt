import { copulaDeMarkerRelationForToken } from "../head-tail/boundary/marker.js";
import { isTrailingPunctuationToken, type BoundaryToken } from "../head-tail/boundary/punctuation.js";
import { isCopulaSupportCapableToken, isNaiOrNuToken } from "../head-tail/tail/predicate-root/classifiers/tokens.js";
import { isChoudaiRequestContinuationToken } from "../head-tail/tail/postverb-tail-classifier.js";
import { previousNonSpaceIndex } from "../clause-layout/trivia.js";

import { POS0, POS5A, 終止形_, 動詞, 命令形_, POS01, 助動詞, 助詞_接続助詞, 助詞_終助詞, 形容詞0, 連用形_ } from "../../types/pos.js";
export function quoteMarkerPrecededByRequestCommandContent(
  tokens: readonly BoundaryToken[],
  markerPos: number
): boolean {
  const previousIdx = previousRequestCommandContentToken(tokens, markerPos - 1);
  if (previousIdx === null) {
    return false;
  }
  const previous = tokens[previousIdx];
  if (previous !== undefined && (previous.pos & (POS0 | POS5A)) === (動詞 | 命令形_)) {
    return true;
  }
  if (previous !== undefined && isChoudaiRequestContinuationToken(previous)) {
    const bridgeIdx = previousRequestCommandContentToken(tokens, previousIdx - 1);
    return quoteMarkerPrecededByBareTeRequestContent(tokens, bridgeIdx);
  }
  if (quoteMarkerPrecededByBareTeRequestContent(tokens, previousIdx)) {
    return true;
  }
  if (!isProhibitiveNaToken(previous)) {
    return false;
  }
  const beforeNaIdx = previousRequestCommandContentToken(tokens, previousIdx - 1);
  if (beforeNaIdx === null) {
    return false;
  }
  const beforeNa = tokens[beforeNaIdx];
  return beforeNa !== undefined && (beforeNa.pos & (POS0 | POS5A)) === (動詞 | 終止形_);
}

export function isProhibitiveNaToken(token: BoundaryToken | undefined): boolean {
  return token !== undefined && (token.dictionaryForm || token.surface) === "な" && (token.pos & POS01) === 助詞_終助詞;
}

function quoteMarkerPrecededByBareTeRequestContent(
  tokens: readonly BoundaryToken[],
  teIdx: number | null
): boolean {
  const te = teIdx === null ? undefined : tokens[teIdx];
  if (!isTeConnectiveQuoteRequestToken(te)) {
    return false;
  }
  const beforeTeIdx = previousRequestCommandContentToken(tokens, (teIdx ?? 0) - 1);
  const beforeTe = beforeTeIdx === null ? undefined : tokens[beforeTeIdx];
  if (isNaiOrNuTerminalToken(beforeTe)) {
    return true;
  }
  if (bareTeRequestHeadBelongsToCopulaContinuation(tokens, beforeTeIdx)) {
    return false;
  }
  return isTeFormPredicateHeadToken(beforeTe);
}

function bareTeRequestHeadBelongsToCopulaContinuation(
  tokens: readonly BoundaryToken[],
  supportIdx: number | null
): boolean {
  const support = supportIdx === null ? undefined : tokens[supportIdx];
  if (!isCopulaSupportCapableToken(support)) {
    return false;
  }
  const deIdx = previousNonSpaceIndex(tokens, supportIdx ?? 0);
  return deIdx !== null &&
    copulaDeMarkerRelationForToken(tokens[deIdx], deIdx, {
      consumers: ["quote_content"]
    }) !== null;
}

function isTeConnectiveQuoteRequestToken(token: BoundaryToken | undefined): boolean {
  return token !== undefined &&
    (token.pos & POS01) === 助詞_接続助詞 &&
    (token.surface === "て" || token.surface === "で");
}

function isNaiOrNuTerminalToken(token: BoundaryToken | undefined): boolean {
  const form = token?.dictionaryForm || token?.surface;
  return token !== undefined &&
    (form === "ない" || form === "ぬ") &&
    (token.pos & POS5A) === 終止形_;
}

export function isTeFormPredicateHeadToken(token: BoundaryToken | undefined): boolean {
  if (token === undefined || (token.pos & POS5A) !== 連用形_) {
    return false;
  }
  if (isNaiOrNuToken(token)) {
    return false;
  }
  const pos0 = token.pos & POS0;
  return pos0 === 動詞 || pos0 === 形容詞0 || pos0 === 助動詞;
}

export function previousRequestCommandContentToken(tokens: readonly BoundaryToken[], start: number): number | null {
  let index = start;
  while (index >= 0) {
    const token = tokens[index];
    if (requestCommandQuoteSeparator(token)) {
      index -= 1;
      continue;
    }
    return token === undefined ? null : index;
  }
  return null;
}

function requestCommandQuoteSeparator(token: BoundaryToken | undefined): boolean {
  return token !== undefined && (isTrailingPunctuationToken(token));
}
