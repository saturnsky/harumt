
import { outputPauseSurface } from "../../transform/transparent-pause.js";
import type {
  AnnotatedSegment,
  AnnotatedText,
  AnnotationEntry,
  AnnotationMetadata,
  CharPointAnnotationMetadata
} from "../../types/annotation.js";
import type { TargetSegment } from "../../types/projection.js";
import type { RuntimeHaruToken, SourceTokenBoundary } from "../../types/token.js";
import { type CharPointPlacement, charPointPlacements } from "../annotation.js";
import {
  proportionalProjectionForTokenInternalOffset,
  sourceBoundaryAfterSourceSpan,
  sourceBoundaryBetweenSourceSpans
} from "./parenthetical-source-boundary.js";
import type { ParentheticalIsland, ParentheticalProportionalProjection, PreparedTranslation } from "./prepared-translation.js";

export function transparentPauseJunctions(input: AnnotatedText): ReadonlySet<number> {
  const junctions = new Set<number>();
  for (const [key, entry] of input.table) {
    if (entry.kind !== "transparent-pause") continue;
    const point = input.metadata?.get(key);
    if (point?.kind === "char-point") {
      junctions.add(point.cleanOffset);
    }
  }
  return junctions;
}

export function appendTransparentPauseIslands(
  prepared: PreparedTranslation,
  segments: readonly AnnotatedSegment[],
  table: ReadonlyMap<number, AnnotationEntry>,
  metadata: ReadonlyMap<number, AnnotationMetadata> | undefined
): void {
  if (metadata === undefined) return;
  let hasPauseKey = false;
  for (const entry of table.values()) {
    if (entry.kind === "transparent-pause") {
      hasPauseKey = true;
      break;
    }
  }
  if (!hasPauseKey) return;
  const placements = charPointPlacements(segments, collectPreparedTokensInTextOrder(prepared), metadata);
  for (const placement of placements) {
    if (table.get(placement.key)?.kind !== "transparent-pause") continue;
    const point = metadata.get(placement.key);
    if (point?.kind !== "char-point" || point.restore === undefined) continue;
    const target = transparentPauseIslandTarget(prepared, placement);
    if (target === null) continue;
    const island = transparentPauseIsland(placement.key, point, target.boundary, target.anchor, target.projection);
    const mutable = target.owner as unknown as { parentheticalIslands?: ParentheticalIsland[] };
    mutable.parentheticalIslands = [...(mutable.parentheticalIslands ?? []), island];
  }
}

function collectPreparedTokensInTextOrder(prepared: PreparedTranslation): RuntimeHaruToken[] {
  const result: RuntimeHaruToken[] = [];
  const islands = (prepared.parentheticalIslands ?? [])
    .filter((island) => island.rubyAnnotationKey === undefined && island.pause === undefined)
    .sort((left, right) =>
      (left.sourceBoundary.afterOrdinal ?? Number.MAX_SAFE_INTEGER) -
      (right.sourceBoundary.afterOrdinal ?? Number.MAX_SAFE_INTEGER)
    );
  let islandIndex = 0;
  for (const token of prepared.tokens) {
    const ordinal = token.sourceSpan?.startOrdinal ?? token.sourceOrdinal ?? null;
    while (
      islandIndex < islands.length &&
      ordinal !== null &&
      (islands[islandIndex]!.sourceBoundary.afterOrdinal ?? Number.MAX_SAFE_INTEGER) <= ordinal
    ) {
      result.push(...collectPreparedTokensInTextOrder(islands[islandIndex]!.innerPrepared));
      islandIndex += 1;
    }
    result.push(token);
  }
  while (islandIndex < islands.length) {
    result.push(...collectPreparedTokensInTextOrder(islands[islandIndex]!.innerPrepared));
    islandIndex += 1;
  }
  return result;
}

function preparedChainOfToken(
  prepared: PreparedTranslation,
  token: RuntimeHaruToken
): PreparedTranslation[] | null {
  if (prepared.tokens.includes(token)) {
    return [prepared];
  }
  for (const island of prepared.parentheticalIslands ?? []) {
    if (island.pause !== undefined || island.rubyAnnotationKey !== undefined) continue;
    const chain = preparedChainOfToken(island.innerPrepared, token);
    if (chain !== null) {
      return [prepared, ...chain];
    }
  }
  return null;
}

interface TransparentPauseIslandTarget {
  readonly owner: PreparedTranslation;
  readonly boundary: SourceTokenBoundary;
  readonly anchor: number;
  readonly projection?: ParentheticalProportionalProjection;
}

function transparentPauseIslandTarget(
  prepared: PreparedTranslation,
  placement: CharPointPlacement
): TransparentPauseIslandTarget | null {
  if (placement.kind === "inside") {
    const token = placement.insideToken;
    const tokenSpan = token?.sourceSpan ?? null;
    if (token === null || tokenSpan === null || placement.insideOffset === null) {
      return null;
    }
    const chain = preparedChainOfToken(prepared, token);
    if (chain === null) {
      return null;
    }
    const projection = proportionalProjectionForTokenInternalOffset(token, placement.insideOffset);
    return {
      owner: chain[chain.length - 1]!,
      boundary: sourceBoundaryAfterSourceSpan(tokenSpan),
      anchor: tokenSpan.endOrdinal,
      ...(projection === null ? {} : { projection })
    };
  }
  const leftChain = placement.leftToken === null ? null : preparedChainOfToken(prepared, placement.leftToken);
  const rightChain = placement.rightToken === null ? null : preparedChainOfToken(prepared, placement.rightToken);
  const leftSpan = placement.leftToken?.sourceSpan ?? null;
  const rightSpan = placement.rightToken?.sourceSpan ?? null;
  if (leftChain === null && rightChain === null) {
    return null;
  }
  if (leftChain !== null && rightChain !== null) {
    if (leftChain[leftChain.length - 1] === rightChain[rightChain.length - 1]) {
      const boundary = sourceBoundaryBetweenSourceSpans(leftSpan, rightSpan);
      return boundary.afterOrdinal === null
        ? null
        : { owner: leftChain[leftChain.length - 1]!, boundary, anchor: boundary.afterOrdinal };
    }
    let common = 0;
    while (common < leftChain.length && common < rightChain.length && leftChain[common] === rightChain[common]) {
      common += 1;
    }
    const owner = leftChain[common - 1]!;
    const boundary = rightChain.length === common
      ? sourceBoundaryBetweenSourceSpans(null, rightSpan)
      : sourceBoundaryBetweenSourceSpans(leftSpan, null);
    return boundary.afterOrdinal === null ? null : { owner, boundary, anchor: boundary.afterOrdinal };
  }
  const chain = leftChain ?? rightChain!;
  const boundary = leftChain !== null
    ? sourceBoundaryBetweenSourceSpans(leftSpan, null)
    : sourceBoundaryBetweenSourceSpans(null, rightSpan);
  return boundary.afterOrdinal === null
    ? null
    : { owner: chain[chain.length - 1]!, boundary, anchor: boundary.afterOrdinal };
}

function transparentPauseIsland(
  key: number,
  point: CharPointAnnotationMetadata,
  sourceBoundary: SourceTokenBoundary,
  anchorOrdinal: number,
  proportionalProjection: ParentheticalProportionalProjection | undefined
): ParentheticalIsland {
  return {
    id: `pause:${key}`,
    delimiter: { open: "", close: "" },
    sourceBoundary,
    sourceSpan: { startOrdinal: anchorOrdinal, endOrdinal: anchorOrdinal },
    ...(proportionalProjection === undefined ? {} : { proportionalProjection }),
    innerPrepared: { sourceText: "", tokens: [] },
    nestingDepth: 0,
    pause: {
      key,
      surface: outputPauseSurface(point.restore!.surface),
      point
    }
  };
}

export function markTransparentPauseIslandMaterialized(island: ParentheticalIsland): void {
  if (island.pause === undefined) return;
  (island.pause.point as { materialized?: true }).materialized = true;
}

const TRANSPARENT_PAUSE_LEFT_DETACH_CHARS = new Set(
  Array.from("。．.!?！？…‥⋯、，,;；：:~～”』」’)）]］}｝")
);

export function adjustTransparentPauseInsertionIndex(
  segments: readonly TargetSegment[],
  index: number
): number {
  const isSpacer = (segment: TargetSegment | undefined): boolean =>
    segment !== undefined && segment.sourceSpan === null && /^\s+$/u.test(segment.text);
  let adjusted = index;
  while (adjusted > 0 && isSpacer(segments[adjusted - 1])) {
    adjusted -= 1;
  }
  const leftContent = segments[adjusted - 1];
  const leftChars = Array.from(leftContent?.text.trimEnd() ?? "");
  const leftLast = leftChars[leftChars.length - 1];
  if (leftContent === undefined || (leftLast !== undefined && TRANSPARENT_PAUSE_LEFT_DETACH_CHARS.has(leftLast))) {
    adjusted = index;
    while (isSpacer(segments[adjusted])) {
      adjusted += 1;
    }
  }
  return adjusted;
}

export function absorbWhitespaceAfterTransparentPauses(segments: TargetSegment[]): void {
  for (let index = 0; index < segments.length; index += 1) {
    if (segments[index]?.transparentPause !== true) continue;
    const next = index + 1;
    while (next < segments.length) {
      const segment = segments[next]!;
      if (segment.sourceSpan === null && /^\s+$/u.test(segment.text)) {
        segments.splice(next, 1);
        continue;
      }
      const stripped = segment.text.replace(/^\s+/u, "");
      if (stripped !== segment.text && stripped.length > 0) {
        segments[next] = { ...segment, text: stripped };
      }
      break;
    }
  }
}
