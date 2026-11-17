import {
  clauseProjectionEvidenceWindowForToken,
  nextNonSpaceIndex,
  previousNonSpaceIndex,
  type ClauseToken,
} from "../clause-layout/index.js";
import {
  type ClausePhraseItem,
  type PhraseEnumerationLayout,
} from "../clause-layout/phrase-enumeration.js";
import { kaOwnershipKindAt } from "../head-tail/boundary/ka-ownership.js";
import { quoteMarkerRelationAt } from "../head-tail/boundary/quote-marker.js";
import type { LookupTables } from "../lookup-tables.js";
import { POS0, POS01, 連体詞, 助詞_係助詞, 助詞_副助詞, 助詞_格助詞 } from "../../types/pos.js";
import type { StructuralRelation, StructuralRelationMarkerSpan } from "./types.js";

export interface TokaNominalPhraseItem {
  readonly phrases: readonly ClausePhraseItem[];
  readonly markerPhrase: ClausePhraseItem;
  readonly marker: TokaNominalListingMarker;
  readonly kaIdx: number;
  readonly postMarkerParticleIdx: number | null;
  readonly followedByTopicTte: boolean;
}

export interface TokaNominalListingMarker {
  readonly kaIdx: number;
  readonly markerSpan: StructuralRelationMarkerSpan;
  readonly quoteOwned: boolean;
}

interface TokaNominalPhraseItemReach {
  readonly item: TokaNominalPhraseItem;
  readonly nextPhraseIndex: number;
  readonly separatorSpans: readonly StructuralRelationMarkerSpan[];
}

export interface TokaNominalMarkedRun {
  readonly first: TokaNominalPhraseItem;
  readonly markedItems: readonly TokaNominalPhraseItem[];
  readonly separatorSpans: readonly StructuralRelationMarkerSpan[];
  readonly nextPhraseIndex: number;
  readonly termination: "item_particle" | "unreachable_next_item" | "scope_end";
}

export interface TokaNominalListingRunEvidence {
  readonly itemCount: number;
  readonly markerSpans: readonly StructuralRelationMarkerSpan[];
  readonly finalMarkerSpan: StructuralRelationMarkerSpan;
}

export function tokaNominalListingRunEvidenceAt(options: {
  readonly tokens: readonly ClauseToken[];
  readonly layout: PhraseEnumerationLayout;
  readonly lookups: LookupTables;
  readonly markerIdx: number;
  readonly phrases: readonly ClausePhraseItem[];
}): TokaNominalListingRunEvidence | null {
  const { tokens, layout, lookups, markerIdx, phrases } = options;
  const markers = tokaNominalListingMarkersInScope({
    tokens,
    layout,
    lookups,
    quoteRelations: [],
    scopeTokenIdx: markerIdx,
    phrases,
  });
  for (let phraseIndex = 0; phraseIndex < phrases.length; phraseIndex += 1) {
    const scopePhrase = phrases[phraseIndex];
    if (scopePhrase === undefined) {
      continue;
    }
    const run = tokaNominalMarkedRunAt({
      phrases,
      phraseIndex,
      tokens,
      layout,
      markers,
      scopeTokenIdx: scopePhrase.headIdx,
    });
    if (run === null) {
      continue;
    }
    const markerSpans = run.markedItems.map((item) => item.marker.markerSpan);
    const finalMarkerSpan = markerSpans.at(-1) as StructuralRelationMarkerSpan;
    const targetMarker = markers.find((marker) => marker.markerSpan.start === markerIdx);
    const finalMarkerIsProducer = finalMarkerSpan.start === markerIdx;
    const finalItem = run.markedItems.at(-1);
    const targetPhrase = phrases.find((phrase) =>
      phrase.span.start <= markerIdx && markerIdx < phrase.span.endExclusive
    );
    const adjacentOuterQuotativeIdx = targetMarker?.markerSpan.endExclusive ?? -1;
    const finalItemClauseIdx = finalItem === undefined
      ? -1
      : layout.clauseIndexOfToken(finalItem.markerPhrase.headIdx);
    const targetClauseIdx = targetPhrase === undefined
      ? -1
      : layout.clauseIndexOfToken(targetPhrase.headIdx);
    const outerQuoteMarker = targetMarker === undefined
      ? null
      : quoteMarkerRelationAt(tokens, adjacentOuterQuotativeIdx, {
        consumers: ["quote_content"],
      });
    const adjacentOuterQuotative = targetMarker !== undefined &&
      (outerQuoteMarker?.canonicalSurface === "と" || outerQuoteMarker?.canonicalSurface === "って") &&
      finalItem !== undefined &&
      targetPhrase !== undefined &&
      targetMarker.markerSpan.start >= finalMarkerSpan.endExclusive &&
      run.termination === "unreachable_next_item" &&
      finalItemClauseIdx >= 0 &&
      finalItemClauseIdx === targetClauseIdx &&
      finalItem.markerPhrase.clauseOrdinalDelta === targetPhrase.clauseOrdinalDelta;
    if (!finalMarkerIsProducer && !adjacentOuterQuotative) {
      phraseIndex = run.nextPhraseIndex - 1;
      continue;
    }
    return {
      itemCount: run.markedItems.length,
      markerSpans,
      finalMarkerSpan,
    };
  }
  return null;
}

export function tokaNominalMarkedRunAt(options: {
  readonly phrases: readonly ClausePhraseItem[];
  readonly phraseIndex: number;
  readonly tokens: readonly ClauseToken[];
  readonly layout: PhraseEnumerationLayout;
  readonly markers: readonly TokaNominalListingMarker[];
  readonly scopeTokenIdx: number;
}): TokaNominalMarkedRun | null {
  const { phrases, phraseIndex, tokens, layout, markers, scopeTokenIdx } = options;
  const firstReach = tokaNominalPhraseItemReachAt({
    phrases,
    phraseIndex,
    tokens,
    layout,
    markers,
    scopeTokenIdx,
    allowWeakSeparator: false,
  });
  if (firstReach === null || firstReach.item.followedByTopicTte) {
    return null;
  }
  const markedItems: TokaNominalPhraseItem[] = [firstReach.item];
  const separatorSpans: StructuralRelationMarkerSpan[] = [];
  let nextPhraseIndex = firstReach.nextPhraseIndex;
  let termination: TokaNominalMarkedRun["termination"] = "scope_end";
  while (nextPhraseIndex < phrases.length) {
    if (markedItems.at(-1)?.postMarkerParticleIdx !== null) {
      termination = "item_particle";
      break;
    }
    const next = tokaNominalPhraseItemReachAt({
      phrases,
      phraseIndex: nextPhraseIndex,
      tokens,
      layout,
      markers,
      scopeTokenIdx,
      allowWeakSeparator: true,
    });
    if (next === null) {
      termination = "unreachable_next_item";
      break;
    }
    markedItems.push(next.item);
    separatorSpans.push(...next.separatorSpans);
    nextPhraseIndex = next.nextPhraseIndex;
  }
  return markedItems.length < 2 ? null : {
    first: firstReach.item,
    markedItems,
    separatorSpans,
    nextPhraseIndex,
    termination,
  };
}

export function tokaNominalListingMarkersInScope(options: {
  readonly tokens: readonly ClauseToken[];
  readonly layout: PhraseEnumerationLayout;
  readonly lookups: LookupTables;
  readonly quoteRelations: readonly StructuralRelation[];
  readonly scopeTokenIdx: number;
  readonly phrases: readonly ClausePhraseItem[];
}): readonly TokaNominalListingMarker[] {
  const { tokens, layout, lookups, quoteRelations, scopeTokenIdx, phrases } = options;
  const evidenceWindow = clauseProjectionEvidenceWindowForToken(layout, tokens, scopeTokenIdx);
  if (evidenceWindow === undefined) {
    return [];
  }
  const streamStart = phrases[0]?.span.start;
  const streamEndExclusive = phrases.at(-1)?.span.endExclusive;
  if (streamStart === undefined || streamEndExclusive === undefined) {
    return [];
  }
  const markers: TokaNominalListingMarker[] = [];
  for (let kaIdx = evidenceWindow.start; kaIdx < evidenceWindow.end; kaIdx += 1) {
    if (
      kaOwnershipKindAt(tokens, kaIdx, lookups) !== "toka_listing" ||
      !tokaNominalSameQuoteScope(layout, scopeTokenIdx, kaIdx)
    ) {
      continue;
    }
    const toIdx = previousNonSpaceIndex(tokens, kaIdx, evidenceWindow.start);
    if (toIdx === null) {
      continue;
    }
    const markerSpan: StructuralRelationMarkerSpan = {
      start: toIdx,
      endExclusive: kaIdx + 1,
      surface: tokens.slice(toIdx, kaIdx + 1).map((token) => token.surface).join(""),
      role: "toka_nominal_listing_marker",
    };
    if (markerSpan.start < streamStart || markerSpan.endExclusive > streamEndExclusive) {
      continue;
    }
    markers.push({
      kaIdx,
      markerSpan,
      quoteOwned: quoteRelations.some((relation) => relation.markerSpans.some((quoteSpan) =>
        tokenSpansOverlap(markerSpan, quoteSpan)
      )),
    });
  }
  return markers;
}

export function tokaNominalListingContinuationAfter(
  markers: readonly TokaNominalListingMarker[],
  runEndExclusive: number,
): "none" | "continues" | "quote_owned" {
  let continues = false;
  for (const marker of markers) {
    if (marker.markerSpan.start < runEndExclusive) {
      continue;
    }
    if (marker.quoteOwned) {
      return "quote_owned";
    }
    continues = true;
  }
  return continues ? "continues" : "none";
}

function tokaNominalPhraseItemAt(
  phrase: ClausePhraseItem | undefined,
  tokens: readonly ClauseToken[],
  markers: readonly TokaNominalListingMarker[],
): TokaNominalPhraseItem | null {
  if (phrase?.kind !== "nominal") {
    return null;
  }
  for (const marker of markers) {
    const { kaIdx, markerSpan } = marker;
    if (kaIdx <= phrase.headIdx || kaIdx >= phrase.span.endExclusive) {
      continue;
    }
    if (markerSpan.start <= phrase.headIdx || phrase.markerParticleIdx !== markerSpan.start) {
      return null;
    }
    const afterKa = nextNonSpaceIndex(tokens, kaIdx + 1, phrase.span.endExclusive);
    const followedByTopicTte = afterKa !== null && isTokaNominalTopicTte(tokens[afterKa]);
    if (afterKa !== null && !followedByTopicTte && !isTokaNominalTrailingParticle(tokens[afterKa])) {
      return null;
    }
    return {
      phrases: [phrase],
      markerPhrase: phrase,
      marker,
      kaIdx,
      postMarkerParticleIdx: afterKa,
      followedByTopicTte,
    };
  }
  return null;
}

function tokaNominalPhraseItemReachAt(options: {
  readonly phrases: readonly ClausePhraseItem[];
  readonly phraseIndex: number;
  readonly tokens: readonly ClauseToken[];
  readonly layout: PhraseEnumerationLayout;
  readonly markers: readonly TokaNominalListingMarker[];
  readonly scopeTokenIdx: number;
  readonly allowWeakSeparator: boolean;
}): TokaNominalPhraseItemReach | null {
  const { phrases, phraseIndex, tokens, layout, markers, scopeTokenIdx, allowWeakSeparator } = options;
  const itemPhrases: ClausePhraseItem[] = [];
  const separatorSpans: StructuralRelationMarkerSpan[] = [];
  let index = phraseIndex;
  while (phrases[index]?.kind === "punctuation_weak") {
    if (!allowWeakSeparator) {
      return null;
    }
    const separator = phrases[index] as ClausePhraseItem;
    separatorSpans.push({
      start: separator.span.start,
      endExclusive: separator.span.endExclusive,
      surface: tokens.slice(separator.span.start, separator.span.endExclusive)
        .map((token) => token.surface).join(""),
      role: "toka_nominal_listing_separator",
    });
    index += 1;
  }
  if (isTokaNominalPrenominalPhrase(phrases[index], phrases[index + 1], tokens)) {
    itemPhrases.push(phrases[index] as ClausePhraseItem);
    index += 1;
  }
  while (isTokaNominalGenitiveBridgePhrase(phrases[index], tokens)) {
    itemPhrases.push(phrases[index] as ClausePhraseItem);
    index += 1;
  }
  const marked = tokaNominalPhraseItemAt(phrases[index], tokens, markers);
  if (marked === null) {
    return null;
  }
  const phrasesInItem = [...itemPhrases, ...marked.phrases];
  const evidenceWindow = clauseProjectionEvidenceWindowForToken(layout, tokens, scopeTokenIdx);
  if (evidenceWindow === undefined || !phrasesInItem.every((phrase) =>
    phrase.headIdx >= evidenceWindow.start &&
    phrase.headIdx < evidenceWindow.end &&
    tokaNominalSameQuoteScope(layout, scopeTokenIdx, phrase.headIdx)
  )) {
    return null;
  }
  return {
    item: { ...marked, phrases: phrasesInItem },
    nextPhraseIndex: index + 1,
    separatorSpans,
  };
}

function isTokaNominalPrenominalPhrase(
  phrase: ClausePhraseItem | undefined,
  nominal: ClausePhraseItem | undefined,
  tokens: readonly ClauseToken[],
): boolean {
  const token = phrase === undefined ? undefined : tokens[phrase.headIdx];
  return phrase?.kind === "adverbial" && nominal?.kind === "nominal" && token !== undefined &&
    (token.pos & POS0) === 連体詞 &&
    nextNonSpaceIndex(tokens, phrase.span.endExclusive, nominal.span.endExclusive) === nominal.span.start;
}

function isTokaNominalGenitiveBridgePhrase(
  phrase: ClausePhraseItem | undefined,
  tokens: readonly ClauseToken[],
): phrase is ClausePhraseItem {
  if (phrase?.kind !== "nominal" || phrase.markerParticleIdx === null) {
    return false;
  }
  const particleIdx = phrase.markerParticleIdx;
  const particle = tokens[particleIdx];
  return particle?.surface === "の" && (particle.pos & POS01) === 助詞_格助詞 &&
    nextNonSpaceIndex(tokens, particleIdx + 1, phrase.span.endExclusive) === null;
}

function isTokaNominalTrailingParticle(token: ClauseToken | undefined): boolean {
  return token !== undefined &&
    ((token.pos & POS01) === 助詞_格助詞 || (token.pos & POS01) === 助詞_係助詞);
}

function isTokaNominalTopicTte(token: ClauseToken | undefined): boolean {
  return token?.surface === "って" && (token.pos & POS01) === 助詞_副助詞;
}

function tokaNominalSameQuoteScope(
  layout: PhraseEnumerationLayout,
  leftIdx: number,
  rightIdx: number,
): boolean {
  const finalLayout = layout as PhraseEnumerationLayout & {
    sameQuoteScope?: (left: number, right: number) => boolean;
  };
  if (finalLayout.sameQuoteScope !== undefined) {
    return finalLayout.sameQuoteScope(leftIdx, rightIdx);
  }
  const left = layout.enclosingQuoteSpan?.(leftIdx);
  const right = layout.enclosingQuoteSpan?.(rightIdx);
  return left === undefined
    ? right === undefined
    : right !== undefined && left[0] === right[0] && left[1] === right[1];
}

function tokenSpansOverlap(
  left: { readonly start: number; readonly endExclusive: number },
  right: { readonly start: number; readonly endExclusive: number },
): boolean {
  return left.start < right.endExclusive && right.start < left.endExclusive;
}
