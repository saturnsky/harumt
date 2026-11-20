import type { LookupTables } from "../lookup-tables.js";
import { nextNonSpaceIndex, previousNonSpaceIndex, separatedAs } from "../clause-layout/trivia.js";
import { TokenCursor } from "../token-cursor.js";
import { activeProtoLayout } from "../clause-layout/proto-state.js";
import { detectQuoteSpans } from "../clause-layout/quote-delimiters.js";
import type { QuoteBoundaryFocusParticle } from "../head-tail/tail/predicate-root/grammar.js";
import { type QuoteHostMatch, nounPhraseCanBridgeToQuoteHost } from "../quote/host-taxonomy.js";
import { quoteMarkerSpanAbsorbsScopeBridgeFocus } from "../head-tail/data/scope-bridge-focus-table.js";
import { caseParticleMarkerRelationForToken, dewaScopeBridgeRelationAt, kaMarkerRelationAt, quoteHostSearchBridgeArgumentRelationAt } from "../head-tail/boundary/marker.js";
import { hardTerminalPunctuationRelation, hasHardTerminalPunctuationRelation, isBoundaryPunctuationCategoryToken, isContentInternalConnectorToken, isOpeningPunctuationSurface, isTrailingPunctuationSurface, quoteBridgePunctuationRelationAt } from "../head-tail/boundary/punctuation.js";
import { quoteMarkerRelationAt } from "../head-tail/boundary/quote-marker.js";
import type { RuntimeHaruToken, SeparationKind } from "../../types/token.js";
import type { StructuralQuoteBridgeKind, StructuralQuoteContentSlotKind, StructuralRelationTokenSpan } from "./types.js";
import { POS0, pos0in, POS4, PUNCTUATION_BITS, 記号, 形状詞, 形容詞0, 助詞, 助動詞, 助動詞_ダ, 接頭辞, 接尾辞, 代名詞, 動詞, 副詞, 補助記号, 名詞, 連体詞, isNaAdjCapableNoun, PREDICATE_AUX_BITS } from "../../types/pos.js";
import type { QuoteStructuralRelationIndex } from "./quote.js";

export function quoteContentTailStart(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  end: number
): number | null {
  let phraseStart = start;
  const tailCursor = new TokenCursor(tokens, start, end);
  while (tailCursor.pos < tailCursor.end) {
    const index = tailCursor.pos;
    const token = tailCursor.current();
    tailCursor.advance();
    if (token === undefined) {
      continue;
    }
    if (
      caseParticleMarkerRelationForToken(token, index, {
        acceptedSurfaces: ["が", "を", "に", "で", "から", "より", "へ", "と"],
        consumers: ["quote_content"]
      }) !== null ||
      ((token.surface === "は" || token.surface === "も") && (token.pos & POS0) === 助詞)
    ) {
      phraseStart = index + 1;
      continue;
    }
    if (posLooksPredicateEvidence(token.pos)) {
      phraseStart = index + 1;
    }
  }
  return phraseStart < end ? phraseStart : null;
}

export function posLooksPredicateEvidence(pos: number): boolean {
  const pos0 = pos & POS0;
  if (pos0in(pos0, PREDICATE_AUX_BITS)) {
    return true;
  }
  return isNaAdjCapableNoun({ pos });
}

export function tokenSpan(start: number, endExclusive: number): StructuralRelationTokenSpan {
  return { start, endExclusive };
}

export function explicitQuoteSpanImmediatelyBeforeMarker(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number,
): readonly [number, number] | undefined {
  const closingIdx = previousNonSpaceIndex(tokens, markerIdx);
  if (closingIdx === null) {
    return undefined;
  }
  const quoteSpans = activeProtoLayout()?.quoteSpans ?? detectQuoteSpans(tokens);
  return quoteSpans.find((span) => span[1] === closingIdx);
}

export function quoteMarkerFocusParticleAfterMarker(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number,
  hostIdx: number
): { readonly index: number; readonly surface: QuoteBoundaryFocusParticle } | null {
  const focusIdx = nextNonSpaceIndex(tokens, markerIdx + 1);
  if (focusIdx === null || focusIdx !== markerIdx + 1 || focusIdx >= hostIdx) {
    return null;
  }
  const focus = tokens[focusIdx];
  if (focus?.surface === "で") {
    const scopeBridge = dewaScopeBridgeRelationAt(tokens, focusIdx, {
      consumers: ["quote_content"]
    });
    if (
      scopeBridge === null ||
      !quoteMarkerSpanAbsorbsScopeBridgeFocus(scopeBridge.focusParticle) ||
      scopeBridge.span.endExclusive > hostIdx
    ) {
      return null;
    }
    return { index: scopeBridge.span.endExclusive - 1, surface: "でも" };
  }
  if (focus?.surface !== "は" && focus?.surface !== "も") {
    return null;
  }
  const bridge = quoteHostSearchBridgeArgumentRelationAt(tokens, focusIdx, {
    consumers: ["quote_content"]
  });
  return bridge === null ? null : { index: focusIdx, surface: focus.surface };
}

export function contentTokenEndForMarker(tokens: readonly RuntimeHaruToken[], markerIdx: number, slotKind: StructuralQuoteContentSlotKind): number {
  if (slotKind === "question_content") {
    const prevIdx = previousNonSpaceIndex(tokens, markerIdx);
    if (
      prevIdx !== null &&
      kaMarkerRelationAt(tokens, prevIdx, ["quote_content"]) !== null
    ) {
      return prevIdx;
    }
  }
  return markerIdx;
}

const QUOTE_CONTENT_STOP_SEPARATIONS: ReadonlySet<SeparationKind> = new Set<SeparationKind>([
  "chunk_break",
  "word_separator"
]);

export function quoteContentTokenStart(
  tokens: readonly RuntimeHaruToken[],
  fallbackStart: number,
  contentTokenEnd: number,
  priorRelations: QuoteStructuralRelationIndex,
  options: { readonly allowQuotedListPunctuation?: boolean } = {}
): number {
  let index = contentTokenEnd - 1;
  let start = contentTokenEnd;
  while (index >= 0) {
    const token = tokens[index];
    const pos0 = (token?.pos ?? 0) & POS0;
    if (separatedAs(tokens, index, QUOTE_CONTENT_STOP_SEPARATIONS)) {
      if (quoteContentSpanTokenCanContinue(token)) {
        start = index;
      }
      break;
    }
    if (quoteBridgePunctuationCanJoinQuoteContent(tokens, index, contentTokenEnd, priorRelations)) {
      start = index;
      index -= 1;
      continue;
    }
    if (quoteContentInternalConnectorCanJoin(tokens, index, contentTokenEnd)) {
      start = index;
      index -= 1;
      continue;
    }
    if (
      options.allowQuotedListPunctuation === true &&
      quoteContentQuotedListPunctuationCanJoin(tokens[index])
    ) {
      start = index;
      index -= 1;
      continue;
    }
    if (pos0 === 補助記号 || pos0 === 記号 || hasHardTerminalPunctuationRelation(token, index, ["quote_content"])) {
      break;
    }
    if (quoteContentSpanTokenCanContinue(token)) {
      start = index;
      index -= 1;
      continue;
    }
    break;
  }
  return start < contentTokenEnd ? start : fallbackStart;
}

export function quoteCognitiveCopularContentCanBridgePunctuation(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number,
  hostMatch: QuoteHostMatch,
  lookups: LookupTables
): boolean {
  const marker = quoteMarkerRelationAt(tokens, markerIdx, {
    consumers: ["quote_content"]
  });
  if (
    marker?.canonicalSurface !== "と" ||
    !lookups.QUOTE_HOST_REGISTRY.hostHasCapability(hostMatch, "cognitive_complement")
  ) {
    return false;
  }
  const copulaIdx = previousNonSpaceIndex(tokens, markerIdx);
  const copula = copulaIdx === null ? undefined : tokens[copulaIdx];
  return copula !== undefined && (copula.pos & (POS0 | POS4)) === (助動詞 | 助動詞_ダ);
}

function quoteContentQuotedListPunctuationCanJoin(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined || !pos0in(token.pos & POS0, PUNCTUATION_BITS)) {
    return false;
  }
  const surface = token.surface;
  return isOpeningPunctuationSurface(surface) ||
    isTrailingPunctuationSurface(surface) ||
    surface.includes("→") ||
    isContentInternalConnectorToken(token);
}

function quoteBridgePunctuationCanJoinQuoteContent(
  tokens: readonly RuntimeHaruToken[],
  index: number,
  markerIdx: number,
  priorRelations: QuoteStructuralRelationIndex
): boolean {
  if (quoteBridgePunctuationRelationAt(tokens, index, {
    consumers: ["quote_content"]
  }) === null) {
    return false;
  }
  const next = nextNonSpaceIndex(tokens, index + 1);
  if (next === markerIdx) {
    return true;
  }
  if (next === null || next >= markerIdx) {
    return false;
  }
  const nested = priorRelations.canonicalWinnerAt(next);
  return nested !== undefined &&
    nested.quote.slotKind === "quoted_content" &&
    nested.quote.markerIdx === next &&
    nested.quote.hostMatch.hostIdx < markerIdx &&
    nested.quote.markerSpan.endExclusive <= markerIdx;
}

export function quoteContentInternalConnectorCanJoin(
  tokens: readonly RuntimeHaruToken[],
  index: number,
  upperBoundExclusive: number
): boolean {
  const token = tokens[index];
  if (!isContentInternalConnectorToken(token)) {
    return false;
  }
  const prevIdx = previousNonSpaceIndex(tokens, index);
  const nextIdx = nextNonSpaceIndex(tokens, index + 1);
  if (prevIdx === null || nextIdx === null || nextIdx >= upperBoundExclusive) {
    return false;
  }
  return quoteContentSpanTokenCanContinue(tokens[prevIdx]) && quoteContentSpanTokenCanContinue(tokens[nextIdx]);
}

function quoteContentSpanTokenCanContinue(token: RuntimeHaruToken | undefined): boolean {
  const pos0 = (token?.pos ?? 0) & POS0;
  return (
    pos0 === 名詞 ||
    pos0 === 代名詞 ||
    pos0 === 動詞 ||
    pos0 === 形容詞0 ||
    pos0 === 形状詞 ||
    pos0 === 助詞 ||
    pos0 === 助動詞 ||
    pos0 === 接頭辞 ||
    pos0 === 接尾辞 ||
    pos0 === 連体詞 ||
    pos0 === 副詞
  );
}

export function defaultContentTokenStartFallback(markerIdx: number): number {
  return Math.max(0, markerIdx - 1);
}

export function terminalSfpQuoteMarkerBridgeSpan(
  tokens: readonly RuntimeHaruToken[],
  terminalSfp: import("../head-tail/tail/predicate-root/grammar.js").SfpNode,
  markerIdx: number
): StructuralRelationTokenSpan | null {
  const sfpIndices = terminalSfp.source.tokenIndices;
  const sfpEnd = sfpIndices.length === 0 ? -1 : sfpIndices[sfpIndices.length - 1]!;
  if (sfpEnd < 0 || markerIdx <= sfpEnd + 1) {
    return null;
  }
  let start: number | null = null;
  let endExclusive = sfpEnd + 1;
  for (let index = sfpEnd + 1; index < markerIdx; index += 1) {
    const token = tokens[index];
    if (token === undefined) {
      continue;
    }
    const punctuation = quoteBridgePunctuationRelationAt(tokens, index, {
      consumers: ["quote_content"]
    }) !== null ||
      hardTerminalPunctuationRelation(token, index, ["quote_content"]) !== null ||
      isBoundaryPunctuationCategoryToken(token);
    if (!punctuation) {
      continue;
    }
    start ??= index;
    endExclusive = index + 1;
  }
  return start === null ? null : { start, endExclusive };
}

export function bridgeKindBetweenMarkerAndHost(tokens: readonly RuntimeHaruToken[], markerIdx: number, hostMatch: QuoteHostMatch, lookups: LookupTables): StructuralQuoteBridgeKind | null {
  const hostStart = hostMatch.supportIdx !== null ? hostMatch.supportIdx : hostMatch.hostIdx;
  if (hostStart <= markerIdx + 1) {
    return null;
  }
  let sawPunctuation = false;
  let sawTimeAdverb = false;
  let index = markerIdx + 1;
  while (index < hostStart) {
    const token = tokens[index];
    const pos0 = (token?.pos ?? 0) & POS0;
    const surface = token?.surface;
    if (quoteBridgePunctuationRelationAt(tokens, index, {
      consumers: ["quote_content"]
    }) !== null) {
      sawPunctuation = true;
      index += 1;
      continue;
    }
    if (pos0 === 名詞 && token !== undefined && lookups.EMBEDDED_QUESTION_TIME_ADVERB_NOUNS.has(token.dictionaryForm || (surface ?? ""))) {
      sawTimeAdverb = true;
      index += 1;
      continue;
    }
    if (pos0 === 助詞 || pos0 === 代名詞 || pos0 === 副詞 || pos0 === 形容詞0 || pos0 === 形状詞) {
      index += 1;
      continue;
    }
    if (pos0 === 名詞 && nounPhraseCanBridgeToQuoteHost(tokens, index, hostStart)) {
      index += 1;
      continue;
    }
    index += 1;
  }
  if (sawPunctuation && sawTimeAdverb) {
    return "time_adverb_punctuation";
  }
  if (sawPunctuation) {
    return "punctuation";
  }
  return null;
}
