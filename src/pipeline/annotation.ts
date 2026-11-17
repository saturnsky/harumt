import type {
  AnnotatedSegment,
  AnnotationMetadata,
} from "../types/annotation.js";
import type { RuntimeHaruToken } from "../types/token.js";


import {
  POS0,
  POS1,
  終助詞,
  助詞,
  補助記号,
  記号,
} from "../types/pos.js";
export interface CharPointPlacement {
  readonly key: number;
  readonly kind: "gap" | "inside";
  readonly leftToken: RuntimeHaruToken | null;
  readonly rightToken: RuntimeHaruToken | null;
  readonly insideToken: RuntimeHaruToken | null;
  readonly insideOffset: number | null;
  readonly trailing: boolean;
}

export function assignAnnotationKeysFromSegments(
  segments: readonly AnnotatedSegment[],
  tokens: RuntimeHaruToken[],
  metadata?: ReadonlyMap<number, AnnotationMetadata>
): CharPointPlacement[] {
  const charPointKeys = charPointMetadata(metadata);
  const originalChars: string[] = [];
  const charKeys: (readonly number[])[] = [];
  for (const seg of segments) {
    const keys = nonCharPointKeys(seg.keys, charPointKeys);
    for (const ch of seg.text) {
      originalChars.push(ch);
      charKeys.push(keys);
    }
  }

  let origIdx = 0;
  const tokenSpans: TokenCharSpan[] = [];
  for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex += 1) {
    const token = tokens[tokenIndex]!;
    const surfaceChars = Array.from(token.surface);
    const keys = new Set<number>();
    let matched = 0;
    let start = -1;
    let end = -1;

    const origIdxBefore = origIdx;
    while (matched < surfaceChars.length && origIdx < originalChars.length) {
      if (originalChars[origIdx] === surfaceChars[matched]) {
        if (start < 0) start = origIdx;
        end = origIdx + 1;
        const segKeys = charKeys[origIdx];
        if (segKeys !== undefined) {
          for (const k of segKeys) {
            keys.add(k);
          }
        }
        matched += 1;
      }
      origIdx += 1;
    }

    if (matched < surfaceChars.length) {
      origIdx = end >= 0 ? end : origIdxBefore;
    }

    if (keys.size > 0) {
      token.annotationKeys = Array.from(keys);
    }
    if (matched === surfaceChars.length && start >= 0) {
      tokenSpans.push({ tokenIndex, start, end });
    }
  }

  return assignCharPointKeysToTokenGaps(tokens, tokenSpans, charPointKeys);
}

export function charPointPlacements(
  segments: readonly AnnotatedSegment[],
  tokens: readonly RuntimeHaruToken[],
  metadata?: ReadonlyMap<number, AnnotationMetadata>
): CharPointPlacement[] {
  const charPointKeys = charPointMetadata(metadata);
  if (charPointKeys.size === 0) return [];
  const originalChars: string[] = [];
  for (const seg of segments) {
    for (const ch of seg.text) {
      originalChars.push(ch);
    }
  }
  return placementsFromSpans(tokens, tokenCharSpans(originalChars, tokens), charPointKeys);
}

function tokenCharSpans(
  originalChars: readonly string[],
  tokens: readonly RuntimeHaruToken[]
): TokenCharSpan[] {
  let origIdx = 0;
  const tokenSpans: TokenCharSpan[] = [];
  for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex += 1) {
    const token = tokens[tokenIndex]!;
    const surfaceChars = Array.from(token.surface);
    let matched = 0;
    let start = -1;
    let end = -1;
    const origIdxBefore = origIdx;
    while (matched < surfaceChars.length && origIdx < originalChars.length) {
      if (originalChars[origIdx] === surfaceChars[matched]) {
        if (start < 0) start = origIdx;
        end = origIdx + 1;
        matched += 1;
      }
      origIdx += 1;
    }
    if (matched < surfaceChars.length) {
      origIdx = end >= 0 ? end : origIdxBefore;
    }
    if (matched === surfaceChars.length && start >= 0) {
      tokenSpans.push({ tokenIndex, start, end });
    }
  }
  return tokenSpans;
}

function charPointMetadata(
  metadata: ReadonlyMap<number, AnnotationMetadata> | undefined
): Map<number, AnnotationMetadata & { readonly kind: "char-point" }> {
  const keys = new Map<number, AnnotationMetadata & { readonly kind: "char-point" }>();
  if (metadata === undefined) return keys;
  for (const [key, entry] of metadata) {
    if (entry.kind === "char-point") {
      keys.set(key, entry);
    }
  }
  return keys;
}

function nonCharPointKeys(
  keys: readonly number[] | undefined,
  charPointKeys: ReadonlyMap<number, AnnotationMetadata & { readonly kind: "char-point" }>
): readonly number[] {
  if (keys === undefined || charPointKeys.size === 0) return keys ?? [];
  return keys.filter((key) => !charPointKeys.has(key));
}

interface TokenCharSpan {
  readonly tokenIndex: number;
  readonly start: number;
  readonly end: number;
}

function addAnnotationKey(token: RuntimeHaruToken | undefined, key: number): void {
  if (token === undefined) return;
  const keys = new Set(token.annotationKeys ?? []);
  keys.add(key);
  token.annotationKeys = Array.from(keys);
}

function markTransparentPauseBefore(token: RuntimeHaruToken | undefined): void {
  if (token !== undefined) token.transparentPauseBefore = true;
}

function markTransparentPauseAfter(
  token: RuntimeHaruToken | undefined,
  point: AnnotationMetadata & { readonly kind: "char-point" }
): void {
  if (token === undefined) return;
  token.transparentPauseAfter = true;
  if (point.transparentPauseRun !== undefined) {
    token.transparentPauseRunAfter = point.transparentPauseRun;
  }
}

function tokenGapNeighbours(
  spans: readonly TokenCharSpan[],
  gap: number
): { readonly left: TokenCharSpan | null; readonly right: TokenCharSpan | null; readonly inside: TokenCharSpan | null } {
  let left: TokenCharSpan | null = null;
  let right: TokenCharSpan | null = null;
  for (const span of spans) {
    if (gap > span.start && gap < span.end) {
      return { left: null, right: null, inside: span };
    }
    if (span.end <= gap) left = span;
    if (right === null && span.start >= gap) right = span;
  }
  return { left, right, inside: null };
}

function placementsFromSpans(
  tokens: readonly RuntimeHaruToken[],
  spans: readonly TokenCharSpan[],
  charPointKeys: ReadonlyMap<number, AnnotationMetadata & { readonly kind: "char-point" }>
): CharPointPlacement[] {
  if (charPointKeys.size === 0 || spans.length === 0) return [];
  const placements: CharPointPlacement[] = [];
  for (const [key, point] of charPointKeys) {
    const { left, right, inside } = tokenGapNeighbours(spans, point.cleanOffset);
    if (inside !== null) {
      placements.push({
        key,
        kind: "inside",
        leftToken: null,
        rightToken: null,
        insideToken: tokens[inside.tokenIndex] ?? null,
        insideOffset: point.cleanOffset - inside.start,
        trailing: false
      });
      continue;
    }
    const leftToken = left === null ? null : tokens[left.tokenIndex] ?? null;
    const rightToken = right === null ? null : tokens[right.tokenIndex] ?? null;
    if (leftToken === null && rightToken === null) continue;
    placements.push({
      key,
      kind: "gap",
      leftToken,
      rightToken,
      insideToken: null,
      insideOffset: null,
      trailing: right !== null && charPointRightBoundaryToken(tokens[right.tokenIndex])
    });
  }
  return placements;
}

function assignCharPointKeysToTokenGaps(
  tokens: RuntimeHaruToken[],
  spans: readonly TokenCharSpan[],
  charPointKeys: ReadonlyMap<number, AnnotationMetadata & { readonly kind: "char-point" }>
): CharPointPlacement[] {
  const placements = placementsFromSpans(tokens, spans, charPointKeys);
  for (const placement of placements) {
    const point = charPointKeys.get(placement.key);
    if (point === undefined) continue;
    if (placement.kind === "inside") {
      addAnnotationKey(placement.insideToken ?? undefined, placement.key);
      continue;
    }
    if (placement.trailing) {
      markCharPointAsTrailing(point);
      if (placement.leftToken !== null) {
        addAnnotationKey(placement.leftToken, placement.key);
        markTransparentPauseAfter(placement.leftToken, point);
      }
      continue;
    }
    if (point.attach === "left" || point.attach === "both") {
      if (placement.leftToken !== null) {
        addAnnotationKey(placement.leftToken, placement.key);
        markTransparentPauseAfter(placement.leftToken, point);
      }
    }
    if (point.attach === "right" || point.attach === "both") {
      if (placement.rightToken !== null) {
        addAnnotationKey(placement.rightToken, placement.key);
        markTransparentPauseBefore(placement.rightToken);
      }
    }
  }
  return placements;
}

function charPointRightBoundaryToken(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined) return false;
  const pos0 = token.pos & POS0;
  if (pos0 === 補助記号 || pos0 === 記号) return true;
  return pos0 === 助詞 && (token.pos & POS1) === 終助詞;
}

function markCharPointAsTrailing(
  point: AnnotationMetadata & { readonly kind: "char-point" }
): void {
  if (point.cleanOffset >= point.cleanLength) return;
  (point as { cleanLength: number }).cleanLength = point.cleanOffset;
}


