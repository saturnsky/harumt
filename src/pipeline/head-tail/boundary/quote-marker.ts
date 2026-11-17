import type { BoundaryToken } from "./punctuation.js";
import type { BoundaryRelationConsumer, QuoteMarkerContinuationRelation, QuoteMarkerRelation } from "./relation.js";
import { nextNonSpaceIndex } from "../../clause-layout/trivia.js";
import { isSayVerbToken } from "../tail/predicate-root/classifiers/tokens.js";
import { canonicalTerminalSfpSurface } from "../../semantics/sfp-surface.js";


import { POS0, POS01, POS5A, 助詞, 助詞_接続助詞, 動詞, 命令形_ } from "../../../types/pos.js";
const SINGLE_TOKEN_QUOTATIVE_SURFACES = new Set(["と", "って", "なんて", "などと"]);

function isCommandFormTeQuoteCarrierAllomorphAt(
  tokens: readonly BoundaryToken[],
  index: number
): boolean {
  const te = tokens[index];
  if (
    te === undefined ||
    te.surface !== "て" ||
    (te.pos & POS01) !== 助詞_接続助詞
  ) {
    return false;
  }
  const command = tokens[index - 1];
  if (
    command === undefined ||
    (command.pos & (POS0 | POS5A)) !== (動詞 | 命令形_)
  ) {
    return false;
  }
  const sayIdx = nextNonSpaceIndex(tokens, index + 1);
  if (sayIdx === null) {
    return false;
  }
  const say = tokens[sayIdx];
  if (say === undefined || !isSayVerbToken(say)) {
    return false;
  }
  const afterSayIdx = nextNonSpaceIndex(tokens, sayIdx + 1);
  const afterSay = afterSayIdx === null ? undefined : tokens[afterSayIdx];
  return canonicalTerminalSfpSurface(afterSay?.surface) !== "か";
}

interface QuoteMarkerOptions {
  readonly consumers?: readonly BoundaryRelationConsumer[];
}

export function quoteMarkerRelationAt(
  tokens: readonly BoundaryToken[],
  index: number,
  options: QuoteMarkerOptions = {}
): QuoteMarkerRelation | null {
  const token = tokens[index];
  if (token === undefined) {
    return null;
  }
  if (SINGLE_TOKEN_QUOTATIVE_SURFACES.has(token.surface)) {
    return buildQuoteMarkerRelation({
      start: index,
      endExclusive: index + 1,
      surface: token.surface as QuoteMarkerRelation["canonicalSurface"],
      canonicalSurface: token.surface as QuoteMarkerRelation["canonicalSurface"],
      tokenCount: 1,
      reason: "quotative marker surface",
      consumers: options.consumers
    });
  }
  if (isCommandFormTeQuoteCarrierAllomorphAt(tokens, index)) {
    return buildQuoteMarkerRelation({
      start: index,
      endExclusive: index + 1,
      surface: "って",
      canonicalSurface: "って",
      tokenCount: 1,
      reason: "imperative-final te spells the って quote carrier",
      consumers: options.consumers
    });
  }
  if (token.surface !== "など") {
    return null;
  }
  const toIdx = nextNonSpaceIndex(tokens, index + 1);
  if (toIdx === null || tokens[toIdx]?.surface !== "と") {
    return null;
  }
  return buildQuoteMarkerRelation({
    start: index,
    endExclusive: toIdx + 1,
    surface: "などと",
    canonicalSurface: "などと",
    tokenCount: 2,
    reason: "quotative marker split across など + と",
    consumers: options.consumers
  });
}

export function tokaTteCompositeQuoteCandidateAt(
  tokens: readonly BoundaryToken[],
  index: number,
  options: QuoteMarkerOptions = {}
): QuoteMarkerRelation | null {
  if (tokens[index]?.surface !== "と") return null;
  const kaIdx = nextNonSpaceIndex(tokens, index + 1);
  const tteIdx = kaIdx === null ? null : nextNonSpaceIndex(tokens, kaIdx + 1);
  if (kaIdx === null || tteIdx === null || tokens[kaIdx]?.surface !== "か" || tokens[tteIdx]?.surface !== "って") {
    return null;
  }
  return buildQuoteMarkerRelation({
    start: index,
    endExclusive: tteIdx + 1,
    surface: "とかって",
    canonicalSurface: "とかって",
    tokenCount: 3,
    reason: "uncommitted composite quote candidate と+か+って",
    consumers: options.consumers
  });
}

export function datteQuoteMarkerRelationAt(
  tokens: readonly BoundaryToken[],
  index: number,
  options: QuoteMarkerOptions = {}
): QuoteMarkerRelation | null {
  const token = tokens[index];
  if (token === undefined || token.surface !== "だって" || (token.pos & POS0) !== 助詞) {
    return null;
  }
  return buildQuoteMarkerRelation({
    start: index,
    endExclusive: index + 1,
    surface: "だって",
    canonicalSurface: "だって",
    tokenCount: 1,
    reason: "caller-confirmed ambiguous だって quote marker",
    consumers: options.consumers
  });
}

export function tokaQuoteMarkerRelationAt(
  tokens: readonly BoundaryToken[],
  index: number,
  options: QuoteMarkerOptions = {}
): QuoteMarkerRelation | null {
  const to = tokens[index];
  if (to === undefined || to.surface !== "と" || (to.pos & POS0) !== 助詞) {
    return null;
  }
  const kaIdx = nextNonSpaceIndex(tokens, index + 1);
  const ka = kaIdx === null ? undefined : tokens[kaIdx];
  if (kaIdx === null || ka === undefined || ka.surface !== "か" || (ka.pos & POS0) !== 助詞) {
    return null;
  }
  return buildQuoteMarkerRelation({
    start: index,
    endExclusive: kaIdx + 1,
    surface: "とか",
    canonicalSurface: "とか",
    tokenCount: 2,
    reason: "caller-confirmed ambiguous とか quote marker",
    consumers: options.consumers
  });
}

export function quoteMarkerContinuationRelationAt(
  tokens: readonly BoundaryToken[],
  index: number,
  options: QuoteMarkerOptions = {}
): QuoteMarkerContinuationRelation | null {
  const marker = quoteMarkerRelationAt(tokens, index, options);
  if (marker?.canonicalSurface !== "と") {
    return null;
  }
  const supportIdx = nextNonSpaceIndex(tokens, marker.span.endExclusive);
  const support = supportIdx === null ? undefined : tokens[supportIdx];
  if (supportIdx === null || support === undefined || (support.dictionaryForm || support.surface) !== "する") {
    return null;
  }
  const tailIdx = nextNonSpaceIndex(tokens, supportIdx + 1);
  const tail = tailIdx === null ? undefined : tokens[tailIdx];
  if (tailIdx === null || tail?.surface !== "て") {
    return null;
  }
  return {
    kind: "quote_marker_continuation",
    span: { start: marker.span.start, endExclusive: tailIdx + 1 },
    strength: "readiness",
    reason: "quotative と + する + て continuation frame",
    consumers: options.consumers ?? ["quote_content", "clause_layout"],
    role: "toshite_frame",
    markerIdx: marker.span.start,
    supportIdx,
    tailIdx,
    markerSurface: "と",
    canonicalSurface: "として"
  };
}


function buildQuoteMarkerRelation(options: {
  readonly start: number;
  readonly endExclusive: number;
  readonly surface: QuoteMarkerRelation["canonicalSurface"];
  readonly canonicalSurface: QuoteMarkerRelation["canonicalSurface"];
  readonly tokenCount: number;
  readonly reason: string;
  readonly consumers: readonly BoundaryRelationConsumer[] | undefined;
}): QuoteMarkerRelation {
  return {
    kind: "quote_marker",
    span: { start: options.start, endExclusive: options.endExclusive },
    strength: "readiness",
    reason: options.reason,
    consumers: options.consumers ?? ["quote_content", "clause_layout"],
    surface: options.surface,
    role: "quotative_marker",
    canonicalSurface: options.canonicalSurface,
    tokenCount: options.tokenCount
  };
}
