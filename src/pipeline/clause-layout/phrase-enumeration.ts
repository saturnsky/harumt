
import { clauseProjectionEvidenceWindowForToken } from "./navigation.js";
import { isClausePredicateEvidenceToken } from "./token-evidence.js";
import type { ClauseToken, ProjectionEvidenceLayout } from "./layout-types.js";
import {
  isClauseEvidenceTransparentPunctuation,
  isClauseHardTerminalPunctuationToken,
  isClauseOpeningPunctuationToken,
  isClausePunctuationToken
} from "./punctuation.js";
import {
  POS0,
  POS1,
  代名詞,
  副助詞,
  副詞,
  助詞,
  名詞,
  感動詞,
  接尾辞,
  接続詞,
  接頭辞,
  格助詞,
  係助詞,
  連体詞
} from "../../types/pos.js";

export type ClausePhraseItemKind =
  | "predicate_evidence"
  | "predicate"
  | "nominal"
  | "adverbial"
  | "marker_particle"
  | "opaque_span"
  | "punctuation_weak"
  | "other";

export interface ClausePhraseItem {
  readonly kind: ClausePhraseItemKind;
  readonly headIdx: number;
  readonly span: { readonly start: number; readonly endExclusive: number };
  readonly markerParticleIdx: number | null;
  readonly clauseOrdinalDelta: number;
  readonly crossedWeakBoundary: boolean;
}

export type ClausePhraseScope = "clause" | "evidence_window" | "clause_with_np_bridge" | "sentence";

export interface ClausePhraseEnumerationOptions {
  readonly scope?: ClausePhraseScope;
  readonly includeAuxiliary?: boolean;
  readonly limitTokens?: number;
}

export interface QuoteInternalClausePhraseEnumerationOptions {
  readonly includeAuxiliary?: boolean;
  readonly limitTokens?: number;
}

export interface PhraseEnumerationLayout extends ProjectionEvidenceLayout {
  readonly clauseOfPredicateIndex?: ReadonlyMap<number, number>;
  readonly quoteSpans: readonly (readonly [number, number])[];
  enclosingQuoteSpan(tokenIdx: number): readonly [number, number] | undefined;
}

const NOMINAL_RUN_POS0 = new Set<number>([名詞, 代名詞]);
const ADVERBIAL_POS0 = new Set<number>([副詞, 接続詞, 感動詞, 連体詞]);
const NOMINAL_MARKER_POS1 = new Set<number>([格助詞, 係助詞, 副助詞]);

function pos0Of(token: ClauseToken): number {
  return token.pos & POS0;
}

function isNominalMarkerParticle(token: ClauseToken): boolean {
  return pos0Of(token) === 助詞 && NOMINAL_MARKER_POS1.has(token.pos & POS1);
}

function anchorAfter(tokens: readonly ClauseToken[], fromTokenIdx: number): number | null {
  const next = fromTokenIdx + 1;
  return next < tokens.length && tokens[next] !== undefined ? next : null;
}

function anchorBefore(tokens: readonly ClauseToken[], fromTokenIdx: number): number | null {
  const prev = fromTokenIdx - 1;
  return prev >= 0 && tokens[prev] !== undefined ? prev : null;
}

function anchorAtOrAfter(
  tokens: readonly ClauseToken[],
  start: number,
  endExclusive: number
): number | null {
  return start < endExclusive && tokens[start] !== undefined ? start : null;
}

interface QuoteInternalBounds {
  readonly start: number;
  readonly endExclusive: number;
}

function quoteInternalBounds(
  layout: PhraseEnumerationLayout | null,
  tokens: readonly ClauseToken[],
  quoteSpan: readonly [number, number]
): QuoteInternalBounds | null {
  if (layout === null) {
    return null;
  }
  const [openIdx, closeIdx] = quoteSpan;
  if (
    openIdx < 0 ||
    closeIdx <= openIdx + 1 ||
    closeIdx >= tokens.length ||
    !layout.quoteSpans.some(([start, end]) => start === openIdx && end === closeIdx)
  ) {
    return null;
  }
  return { start: openIdx + 1, endExclusive: closeIdx };
}

function forwardScopeEnd(
  layout: PhraseEnumerationLayout | null,
  tokens: readonly ClauseToken[],
  anchor: number,
  options: ClausePhraseEnumerationOptions
): number {
  let end = tokens.length;
  if (layout !== null) {
    const scope = options.scope ?? "clause";
    if (scope === "clause") {
      end = layout.clauseOfToken(anchor)?.end ?? end;
    } else if (scope === "evidence_window" || scope === "clause_with_np_bridge") {
      end = clauseProjectionEvidenceWindowForToken(layout, tokens, anchor)?.end
        ?? layout.clauseOfToken(anchor)?.end
        ?? end;
    }
  }
  if (options.limitTokens !== undefined) {
    end = Math.min(end, anchor + options.limitTokens);
  }
  return end;
}

function backwardScopeStart(
  layout: PhraseEnumerationLayout | null,
  tokens: readonly ClauseToken[],
  anchor: number,
  options: ClausePhraseEnumerationOptions
): number {
  let start = 0;
  if (layout !== null) {
    const scope = options.scope ?? "clause";
    if (scope === "clause") {
      start = layout.clauseOfToken(anchor)?.start ?? start;
    } else if (scope === "evidence_window" || scope === "clause_with_np_bridge") {
      start = clauseProjectionEvidenceWindowForToken(layout, tokens, anchor)?.start
        ?? layout.clauseOfToken(anchor)?.start
        ?? start;
    }
  }
  if (options.scope === "sentence" || layout === null) {
    for (let i = anchor - 1; i >= start; i -= 1) {
      const token = tokens[i];
      if (token !== undefined && isClauseHardTerminalPunctuationToken(token)) {
        start = i + 1;
        break;
      }
    }
  }
  if (options.limitTokens !== undefined) {
    start = Math.max(start, anchor - options.limitTokens + 1);
  }
  return start;
}

interface SegmentState {
  readonly layout: PhraseEnumerationLayout | null;
  readonly tokens: readonly ClauseToken[];
  readonly anchorClauseIdx: number;
  readonly includeAuxiliary: boolean;
  crossedWeakBoundary: boolean;
}

function buildItem(
  state: SegmentState,
  kind: ClausePhraseItemKind,
  headIdx: number,
  start: number,
  endExclusive: number,
  markerParticleIdx: number | null
): ClausePhraseItem {
  let clauseOrdinalDelta = 0;
  if (state.layout !== null && state.anchorClauseIdx >= 0) {
    const itemClauseIdx = state.layout.clauseIndexOfToken(headIdx);
    if (itemClauseIdx >= 0) {
      clauseOrdinalDelta = itemClauseIdx - state.anchorClauseIdx;
    }
  }
  return {
    kind,
    headIdx,
    span: { start, endExclusive },
    markerParticleIdx,
    clauseOrdinalDelta,
    crossedWeakBoundary: state.crossedWeakBoundary
  };
}

interface SegmentForwardResult {
  readonly items: readonly ClausePhraseItem[];
  readonly nextIndex: number;
  readonly stoppedAtHardTerminal: boolean;
}

function segmentForwardResult(state: SegmentState, start: number, endBound: number): SegmentForwardResult {
  const { tokens, layout } = state;
  const items: ClausePhraseItem[] = [];
  let i = start;
  while (i < endBound) {
    const token = tokens[i];
    if (token === undefined) {
      break;
    }
    if (isClauseHardTerminalPunctuationToken(token)) {
      return { items, nextIndex: i, stoppedAtHardTerminal: true };
    }
    const pos0 = pos0Of(token);
    if (isClauseOpeningPunctuationToken(token) && layout?.enclosingQuoteSpan !== undefined) {
      const span = layout.enclosingQuoteSpan(i + 1);
      if (span !== undefined && span[0] === i && span[1] < endBound) {
        items.push(buildItem(state, "opaque_span", i, i, span[1] + 1, null));
        i = span[1] + 1;
        continue;
      }
    }
    if (isClauseEvidenceTransparentPunctuation(token)) {
      items.push(buildItem(state, "punctuation_weak", i, i, i + 1, null));
      if (layout !== null) {
        const clauseHere = layout.clauseIndexOfToken(i);
        const next = anchorAfter(tokens, i);
        if (next !== null && clauseHere >= 0 && layout.clauseIndexOfToken(next) !== clauseHere) {
          state.crossedWeakBoundary = true;
        }
      }
      i += 1;
      continue;
    }
    if (isClausePunctuationToken(token)) {
      items.push(buildItem(state, "other", i, i, i + 1, null));
      i += 1;
      continue;
    }
    if (isClausePredicateEvidenceToken(token, { includeAuxiliary: state.includeAuxiliary })) {
      const runStart = i;
      let runEnd = i + 1;
      let hasCommittedPredicate = state.layout?.clauseOfPredicateIndex?.has(i) === true;
      while (runEnd < endBound) {
        const next = tokens[runEnd];
        if (next === undefined) {
          break;
        }
        if (!isClausePredicateEvidenceToken(next, { includeAuxiliary: true })) {
          break;
        }
        if (state.layout?.clauseOfPredicateIndex?.has(runEnd) === true) {
          hasCommittedPredicate = true;
        }
        runEnd += 1;
      }
      items.push(buildItem(state, hasCommittedPredicate ? "predicate" : "predicate_evidence", runStart, runStart, runEnd, null));
      i = runEnd;
      continue;
    }
    const startsNominal = NOMINAL_RUN_POS0.has(pos0) ||
      (pos0 === 接頭辞 && (() => {
        const next = anchorAfter(tokens, i);
        return next !== null && next < endBound && NOMINAL_RUN_POS0.has(pos0Of(tokens[next]!));
      })());
    if (startsNominal) {
      const runStart = i;
      let headIdx = i;
      let runEnd = i + 1;
      while (runEnd < endBound) {
        const next = tokens[runEnd];
        if (next === undefined) {
          break;
        }
        const nextPos0 = pos0Of(next);
        if (!NOMINAL_RUN_POS0.has(nextPos0) && nextPos0 !== 接尾辞 && nextPos0 !== 接頭辞) {
          break;
        }
        headIdx = runEnd;
        runEnd += 1;
      }
      let markerParticleIdx: number | null = null;
      let spanEnd = runEnd;
      while (spanEnd < endBound) {
        const next = tokens[spanEnd];
        if (next === undefined) {
          break;
        }
        if (!isNominalMarkerParticle(next)) {
          break;
        }
        if (markerParticleIdx === null) {
          markerParticleIdx = spanEnd;
        }
        spanEnd += 1;
      }
      items.push(buildItem(state, "nominal", headIdx, runStart, spanEnd, markerParticleIdx));
      i = spanEnd;
      continue;
    }
    if (ADVERBIAL_POS0.has(pos0)) {
      items.push(buildItem(state, "adverbial", i, i, i + 1, null));
      i += 1;
      continue;
    }
    if (pos0 === 助詞) {
      items.push(buildItem(state, "marker_particle", i, i, i + 1, null));
      i += 1;
      continue;
    }
    items.push(buildItem(state, "other", i, i, i + 1, null));
    i += 1;
  }
  return { items, nextIndex: i, stoppedAtHardTerminal: false };
}

function segmentForward(state: SegmentState, start: number, endBound: number): readonly ClausePhraseItem[] {
  return segmentForwardResult(state, start, endBound).items;
}

function makeState(
  layout: PhraseEnumerationLayout | null,
  tokens: readonly ClauseToken[],
  anchor: number,
  options: ClausePhraseEnumerationOptions
): SegmentState {
  return {
    layout,
    tokens,
    anchorClauseIdx: layout === null ? -1 : layout.clauseIndexOfToken(anchor),
    includeAuxiliary: options.includeAuxiliary !== false,
    crossedWeakBoundary: false
  };
}

export function* enumerateClausePhrasesAfter(
  layout: PhraseEnumerationLayout | null,
  tokens: readonly ClauseToken[],
  fromTokenIdx: number,
  options: ClausePhraseEnumerationOptions = {}
): Generator<ClausePhraseItem> {
  const anchor = anchorAfter(tokens, fromTokenIdx);
  if (anchor === null) {
    return;
  }
  const endBound = forwardScopeEnd(layout, tokens, anchor, options);
  const state = makeState(layout, tokens, anchor, options);
  yield* segmentForward(state, anchor, endBound);
}

export function* enumerateClausePhrasesBefore(
  layout: PhraseEnumerationLayout | null,
  tokens: readonly ClauseToken[],
  fromTokenIdx: number,
  options: ClausePhraseEnumerationOptions = {}
): Generator<ClausePhraseItem> {
  const anchor = anchorBefore(tokens, fromTokenIdx);
  if (anchor === null) {
    return;
  }
  const startBound = backwardScopeStart(layout, tokens, anchor, options);
  const state = makeState(layout, tokens, anchor, options);
  const items = segmentForward(state, startBound, anchor + 1);
  for (let i = items.length - 1; i >= 0; i -= 1) {
    yield items[i]!;
  }
}

export function enumerateQuoteInternalClausePhraseStreams(
  layout: PhraseEnumerationLayout,
  tokens: readonly ClauseToken[],
  quoteSpan: readonly [number, number],
  options: QuoteInternalClausePhraseEnumerationOptions = {}
): readonly (readonly ClausePhraseItem[])[] {
  const bounds = quoteInternalBounds(layout, tokens, quoteSpan);
  if (bounds === null) {
    return [];
  }
  const streams: ClausePhraseItem[][] = [];
  let cursor = bounds.start;
  while (cursor < bounds.endExclusive) {
    const anchor = anchorAtOrAfter(tokens, cursor, bounds.endExclusive);
    if (anchor === null) {
      break;
    }
    const endBound = options.limitTokens === undefined
      ? bounds.endExclusive
      : Math.min(bounds.endExclusive, anchor + options.limitTokens);
    const result = segmentForwardResult(
      makeState(layout, tokens, anchor, options),
      anchor,
      endBound,
    );
    if (result.items.length > 0) {
      streams.push([...result.items]);
    }
    if (!result.stoppedAtHardTerminal || result.nextIndex >= bounds.endExclusive) {
      break;
    }
    cursor = result.nextIndex + 1;
  }
  return streams;
}

export function clausePhraseReachStreamForToken(
  layout: PhraseEnumerationLayout,
  tokens: readonly ClauseToken[],
  tokenIdx: number,
): readonly ClausePhraseItem[] {
  const quoteSpan = layout.enclosingQuoteSpan(tokenIdx);
  if (quoteSpan !== undefined) {
    return enumerateQuoteInternalClausePhraseStreams(layout, tokens, quoteSpan)
      .find((stream) => stream.some((phrase) =>
        phrase.span.start <= tokenIdx && tokenIdx < phrase.span.endExclusive
      )) ?? [];
  }
  const evidenceWindow = clauseProjectionEvidenceWindowForToken(layout, tokens, tokenIdx);
  return evidenceWindow === undefined
    ? []
    : [...enumerateClausePhrasesAfter(layout, tokens, evidenceWindow.start - 1, {
        scope: "evidence_window",
      })];
}

export function firstPredicateEvidenceAfter(
  layout: PhraseEnumerationLayout | null,
  tokens: readonly ClauseToken[],
  fromTokenIdx: number,
  options: ClausePhraseEnumerationOptions = {}
): ClausePhraseItem | null {
  for (const item of enumerateClausePhrasesAfter(layout, tokens, fromTokenIdx, options)) {
    if (item.kind === "predicate" || item.kind === "predicate_evidence") {
      return item;
    }
  }
  return null;
}

export function firstMainClausePredicateEvidenceAfter(
  layout: PhraseEnumerationLayout | null,
  tokens: readonly ClauseToken[],
  fromTokenIdx: number,
  options: ClausePhraseEnumerationOptions = {}
): ClausePhraseItem | null {
  if (layout === null) {
    return null;
  }
  for (const item of enumerateClausePhrasesAfter(layout, tokens, fromTokenIdx, options)) {
    if (
      (item.kind === "predicate" || item.kind === "predicate_evidence") &&
      layout.clauseOfToken(item.headIdx)?.kind === "main"
    ) {
      return item;
    }
  }
  return null;
}

export function hasPredicateEvidenceAfter(
  layout: PhraseEnumerationLayout | null,
  tokens: readonly ClauseToken[],
  fromTokenIdx: number,
  options: ClausePhraseEnumerationOptions = {}
): boolean {
  return firstPredicateEvidenceAfter(layout, tokens, fromTokenIdx, options) !== null;
}
