
import { POS0, POS4, 動詞, 名詞, 意志推量形_, 接尾辞, 接頭辞 } from "../../types/pos.js";
import {
  type RuntimeHaruToken,
  type SourceCompoundProjectionBoundary,
  type SourceTokenSpan,
  withRuntimeTokenSourceSpan
} from "../../types/token.js";
import { codepointLength } from "../source-coordinate.js";
import { applySourceRubyReadingFragments } from "../source-ruby-replay.js";
import type { TokenTextSpan } from "../source-coordinate.js";
import type { RawParentheticalIsland } from "./raw-parenthetical-split.js";

type NominalCompoundProjectionProbe = (token: RuntimeHaruToken) => Promise<string | null>;

interface RawParentheticalSourceIdentityPlan {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly ordinalSpans: readonly (SourceTokenSpan | null)[];
  readonly projectionBoundariesByOrdinal: readonly (readonly SourceCompoundProjectionBoundary[])[];
  readonly loweredTokensByOrdinal: readonly (readonly RuntimeHaruToken[] | null)[];
  readonly islandAnchorOrdinals: readonly number[];
}

export async function buildRawParentheticalSourceIdentityPlan(
  tokens: readonly RuntimeHaruToken[],
  tokenTextSpans: readonly (TokenTextSpan | null)[],
  islands: readonly RawParentheticalIsland[],
  islandWidths: readonly number[],
  projectionProbe: NominalCompoundProjectionProbe
): Promise<RawParentheticalSourceIdentityPlan> {
  const result: RuntimeHaruToken[] = [];
  const ordinalSpans: (SourceTokenSpan | null)[] = [];
  const projectionBoundariesByOrdinal: SourceCompoundProjectionBoundary[][] = [];
  const loweredTokensByOrdinal: (readonly RuntimeHaruToken[] | null)[] = [];
  const islandAnchorOrdinals: number[] = [];
  let islandIndex = 0;
  let sourceCursor = 0;
  const reserveIslandAt = (index: number, anchor: number): void => {
    islandAnchorOrdinals[index] = anchor;
  };
  for (let index = 0; index < tokens.length; index += 1) {
    const span = tokenTextSpans[index];
    const token = tokens[index];
    if (token === undefined) {
      continue;
    }
    if (span === null || span === undefined) {
      const sourceSpan = { startOrdinal: sourceCursor, endOrdinal: sourceCursor + 1 };
      result.push(withRuntimeTokenSourceSpan(token, sourceSpan));
      ordinalSpans[index] = sourceSpan;
      projectionBoundariesByOrdinal[index] = [];
      loweredTokensByOrdinal[index] = null;
      sourceCursor += 1;
      continue;
    }
    while (
      islandIndex < islands.length &&
      (islands[islandIndex]?.outerOffset ?? Number.MAX_SAFE_INTEGER) <= span.start
    ) {
      reserveIslandAt(islandIndex, sourceCursor);
      sourceCursor += islandWidths[islandIndex] ?? 0;
      islandIndex += 1;
    }
    const internalIslandIndexes: number[] = [];
    let scanIndex = islandIndex;
    while (
      scanIndex < islands.length &&
      (islands[scanIndex]?.outerOffset ?? Number.MAX_SAFE_INTEGER) < span.end
    ) {
      const offset = islands[scanIndex]?.outerOffset ?? Number.MAX_SAFE_INTEGER;
      if (offset > span.start) {
        internalIslandIndexes.push(scanIndex);
      }
      scanIndex += 1;
    }
    const rawOffsets = internalIslandIndexes.map((candidate) => islands[candidate]!.outerOffset);
    const modalProjectionBoundary = modalAuxiliaryInternalParentheticalProjectionBoundary(
      token,
      span,
      rawOffsets,
      sourceCursor,
      islands,
      islandWidths,
      islandIndex
    );
    if (modalProjectionBoundary !== null) {
      const sourceSpan = {
        startOrdinal: sourceCursor,
        endOrdinal: sourceCursor + 2 + (islandWidths[islandIndex] ?? 0)
      };
      result.push(withRuntimeTokenSourceSpan(token, sourceSpan, {
        projectionBoundaries: [modalProjectionBoundary]
      }));
      ordinalSpans[index] = sourceSpan;
      projectionBoundariesByOrdinal[index] = [modalProjectionBoundary];
      loweredTokensByOrdinal[index] = null;
      reserveIslandAt(islandIndex, sourceCursor + 1);
      sourceCursor = sourceSpan.endOrdinal;
      islandIndex += 1;
      continue;
    }
    const split = nominalInternalParentheticalSplit(token, span, rawOffsets);
    if (split === null) {
      const pieceSplit = nominalInternalParentheticalPieceSplit(token, span, rawOffsets);
      if (pieceSplit !== null) {
        const pieceStartOrdinal = sourceCursor;
        const loweredPieces: RuntimeHaruToken[] = [];
        let pieceRawStart = span.start;
        for (let pieceIndex = 0; pieceIndex < pieceSplit.pieces.length; pieceIndex += 1) {
          const piece = pieceSplit.pieces[pieceIndex]!;
          const pieceRawEnd = pieceRawStart + codepointLength(piece.surface);
          const lowered = withRuntimeTokenSourceSpan(
            { ...piece, sourceCompoundSplitPiece: true },
            { startOrdinal: sourceCursor, endOrdinal: sourceCursor + 1 },
            { attachLeft: pieceIndex > 0 || token.sourceCompoundContinuation === true }
          );
          result.push(lowered);
          loweredPieces.push(lowered);
          sourceCursor += 1;
          while (
            islandIndex < islands.length &&
            (islands[islandIndex]?.outerOffset ?? Number.MAX_SAFE_INTEGER) > pieceRawStart &&
            (islands[islandIndex]?.outerOffset ?? Number.MAX_SAFE_INTEGER) < pieceRawEnd
          ) {
            reserveIslandAt(islandIndex, sourceCursor);
            sourceCursor += islandWidths[islandIndex] ?? 0;
            islandIndex += 1;
          }
          pieceRawStart = pieceRawEnd;
        }
        ordinalSpans[index] = { startOrdinal: pieceStartOrdinal, endOrdinal: sourceCursor };
        projectionBoundariesByOrdinal[index] = [];
        loweredTokensByOrdinal[index] = loweredPieces;
        continue;
      }
      const sourceSpan = { startOrdinal: sourceCursor, endOrdinal: sourceCursor + 1 };
      result.push(withRuntimeTokenSourceSpan(token, sourceSpan));
      ordinalSpans[index] = sourceSpan;
      projectionBoundariesByOrdinal[index] = [];
      loweredTokensByOrdinal[index] = null;
      sourceCursor += 1;
      while (
        islandIndex < islands.length &&
        (islands[islandIndex]?.outerOffset ?? Number.MAX_SAFE_INTEGER) < span.end
      ) {
        reserveIslandAt(islandIndex, sourceCursor);
        sourceCursor += islandWidths[islandIndex] ?? 0;
        islandIndex += 1;
      }
      continue;
    }
    const projectionBoundary = await nominalInternalParentheticalProjectionBoundary(
      token,
      split,
      sourceCursor,
      islands,
      islandWidths,
      islandIndex,
      projectionProbe
    );
    if (projectionBoundary !== null) {
      const sourceSpan = {
        startOrdinal: sourceCursor,
        endOrdinal: sourceCursor + 2 + (islandWidths[islandIndex] ?? 0)
      };
      result.push(withRuntimeTokenSourceSpan(token, sourceSpan, {
        projectionBoundaries: [projectionBoundary]
      }));
      ordinalSpans[index] = sourceSpan;
      projectionBoundariesByOrdinal[index] = [projectionBoundary];
      loweredTokensByOrdinal[index] = null;
      reserveIslandAt(islandIndex, sourceCursor + 1);
      sourceCursor = sourceSpan.endOrdinal;
      islandIndex += 1;
      continue;
    }
    const pieceStartOrdinal = sourceCursor;
    const loweredPieces: RuntimeHaruToken[] = [];
    for (let pieceIndex = 0; pieceIndex < split.pieces.length; pieceIndex += 1) {
      const piece = split.pieces[pieceIndex]!;
      const lowered = withRuntimeTokenSourceSpan(
        piece,
        { startOrdinal: sourceCursor, endOrdinal: sourceCursor + 1 },
        { attachLeft: pieceIndex > 0 || token.sourceCompoundContinuation === true }
      );
      result.push(lowered);
      loweredPieces.push(lowered);
      sourceCursor += 1;
      if (pieceIndex < split.pieces.length - 1) {
        reserveIslandAt(islandIndex, sourceCursor);
        sourceCursor += islandWidths[islandIndex] ?? 0;
        islandIndex += 1;
      }
    }
    ordinalSpans[index] = { startOrdinal: pieceStartOrdinal, endOrdinal: sourceCursor };
    projectionBoundariesByOrdinal[index] = [];
    loweredTokensByOrdinal[index] = loweredPieces;
  }
  while (islandIndex < islands.length) {
    reserveIslandAt(islandIndex, sourceCursor);
    sourceCursor += islandWidths[islandIndex] ?? 0;
    islandIndex += 1;
  }
  return { tokens: result, ordinalSpans, projectionBoundariesByOrdinal, loweredTokensByOrdinal, islandAnchorOrdinals };
}

export function remapRawParentheticalPreprocessedTokenSourceIdentities(
  tokens: readonly RuntimeHaruToken[],
  tokenTextSpans: readonly (TokenTextSpan | null)[],
  sourceIdentityPlan: RawParentheticalSourceIdentityPlan
): RuntimeHaruToken[] {
  const result: RuntimeHaruToken[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    const replacement = loweredTokensForRawParentheticalPreprocessedToken(token, sourceIdentityPlan);
    if (replacement !== null) {
      const fragments = token.sourceRubyReadingFragments ?? [];
      if (fragments.length === 0) {
        result.push(...replacement);
        continue;
      }
      const lowered = replacement.map((item) => ({ ...item }));
      const remappedFragments = fragments.map((fragment) => ({
        ...fragment,
        sourceOrdinal: sourceIdentityPlan.ordinalSpans[fragment.sourceOrdinal]?.startOrdinal ??
          fragment.sourceOrdinal
      }));
      if (applySourceRubyReadingFragments(lowered, remappedFragments)) {
        result.push(...lowered);
        continue;
      }
    }
    const sourceSpan = sourceSpanForRawParentheticalPreprocessedToken(token, sourceIdentityPlan);
    if (sourceSpan !== null) {
      result.push(withRuntimeTokenSourceSpan(token, sourceSpan, {
        projectionBoundaries: projectionBoundariesForRawParentheticalPreprocessedToken(token, sourceIdentityPlan),
        rubySourceOrdinal: (sourceOrdinal) =>
          sourceIdentityPlan.ordinalSpans[sourceOrdinal]?.startOrdinal ?? sourceOrdinal
      }));
      continue;
    }
    const textSpan = tokenTextSpans[index];
    if (textSpan !== null && textSpan !== undefined) {
      result.push(token);
      continue;
    }
    result.push(token);
  }
  return result;
}

function loweredTokensForRawParentheticalPreprocessedToken(
  token: RuntimeHaruToken,
  sourceIdentityPlan: RawParentheticalSourceIdentityPlan
): readonly RuntimeHaruToken[] | null {
  const sourceSpan = token.sourceSpan ?? (
    token.sourceOrdinal === undefined
      ? null
      : { startOrdinal: token.sourceOrdinal, endOrdinal: token.sourceOrdinal + 1 }
  );
  if (sourceSpan === null || sourceSpan.endOrdinal !== sourceSpan.startOrdinal + 1) {
    return null;
  }
  return sourceIdentityPlan.loweredTokensByOrdinal[sourceSpan.startOrdinal] ?? null;
}

function sourceSpanForRawParentheticalPreprocessedToken(
  token: RuntimeHaruToken,
  sourceIdentityPlan: RawParentheticalSourceIdentityPlan
): SourceTokenSpan | null {
  const sourceSpan = token.sourceSpan ?? (
    token.sourceOrdinal === undefined
      ? null
      : { startOrdinal: token.sourceOrdinal, endOrdinal: token.sourceOrdinal + 1 }
  );
  if (sourceSpan === null) {
    return null;
  }
  return sourceSpanFromOriginalOrdinalRange(sourceIdentityPlan, sourceSpan.startOrdinal, sourceSpan.endOrdinal);
}

function projectionBoundariesForRawParentheticalPreprocessedToken(
  token: RuntimeHaruToken,
  sourceIdentityPlan: RawParentheticalSourceIdentityPlan
): readonly SourceCompoundProjectionBoundary[] {
  const sourceSpan = token.sourceSpan ?? (
    token.sourceOrdinal === undefined
      ? null
      : { startOrdinal: token.sourceOrdinal, endOrdinal: token.sourceOrdinal + 1 }
  );
  if (sourceSpan === null) {
    return [];
  }
  const boundaries: SourceCompoundProjectionBoundary[] = [];
  for (let ordinal = sourceSpan.startOrdinal; ordinal < sourceSpan.endOrdinal; ordinal += 1) {
    boundaries.push(...(sourceIdentityPlan.projectionBoundariesByOrdinal[ordinal] ?? []));
  }
  return boundaries;
}

function sourceSpanFromOriginalOrdinalRange(
  sourceIdentityPlan: RawParentheticalSourceIdentityPlan,
  startOrdinal: number,
  endOrdinal: number
): SourceTokenSpan | null {
  let start: number | null = null;
  let end: number | null = null;
  for (let ordinal = startOrdinal; ordinal < endOrdinal; ordinal += 1) {
    const span = sourceIdentityPlan.ordinalSpans[ordinal] ?? null;
    if (span === null) {
      continue;
    }
    start = start === null ? span.startOrdinal : Math.min(start, span.startOrdinal);
    end = end === null ? span.endOrdinal : Math.max(end, span.endOrdinal);
  }
  return start === null || end === null ? null : { startOrdinal: start, endOrdinal: end };
}

interface NominalInternalParentheticalSplit {
  readonly pieces: readonly RuntimeHaruToken[];
  readonly rawOffsets: readonly number[];
}

interface NominalInternalParentheticalPieceSplit {
  readonly pieces: readonly RuntimeHaruToken[];
}

interface ModalAuxiliaryInternalProjection {
  readonly dictionaryForms: readonly string[];
  readonly leftSurfaces: readonly string[];
  readonly rightSurface: string;
  readonly leftTargetText: string;
  readonly rightTargetText: string;
}

const MODAL_AUXILIARY_INTERNAL_PROJECTIONS: readonly ModalAuxiliaryInternalProjection[] = [
  {
    dictionaryForms: ["みる", "見る"],
    leftSurfaces: ["み", "見"],
    rightSurface: "よう",
    leftTargetText: "보",
    rightTargetText: "자"
  },
  {
    dictionaryForms: ["おく", "置く"],
    leftSurfaces: ["お", "置"],
    rightSurface: "こう",
    leftTargetText: "두",
    rightTargetText: "자"
  },
  {
    dictionaryForms: ["いく", "行く"],
    leftSurfaces: ["い", "行"],
    rightSurface: "こう",
    leftTargetText: "가",
    rightTargetText: "자"
  },
  {
    dictionaryForms: ["くる", "来る"],
    leftSurfaces: ["こ", "来"],
    rightSurface: "よう",
    leftTargetText: "오",
    rightTargetText: "자"
  },
  {
    dictionaryForms: ["しまう"],
    leftSurfaces: ["しま"],
    rightSurface: "おう",
    leftTargetText: "버리",
    rightTargetText: "자"
  }
];

function modalAuxiliaryInternalParentheticalProjectionBoundary(
  token: RuntimeHaruToken,
  tokenTextSpan: TokenTextSpan,
  rawOffsets: readonly number[],
  sourceCursor: number,
  islands: readonly RawParentheticalIsland[],
  islandWidths: readonly number[],
  islandIndex: number
): SourceCompoundProjectionBoundary | null {
  if (
    rawOffsets.length !== 1 ||
    (token.pos & (POS0 | POS4)) !== (動詞 | 意志推量形_)
  ) {
    return null;
  }
  const island = islands[islandIndex];
  if (
    island === undefined ||
    island.outerOffset !== rawOffsets[0] ||
    (islandWidths[islandIndex] ?? 0) <= 0
  ) {
    return null;
  }
  const relativeOffset = island.outerOffset - tokenTextSpan.start;
  const chars = Array.from(token.surface);
  if (relativeOffset <= 0 || relativeOffset >= chars.length) {
    return null;
  }
  const leftSurface = chars.slice(0, relativeOffset).join("");
  const rightSurface = chars.slice(relativeOffset).join("");
  const projection = MODAL_AUXILIARY_INTERNAL_PROJECTIONS.find((candidate) =>
    candidate.dictionaryForms.includes(token.dictionaryForm) &&
    candidate.leftSurfaces.includes(leftSurface) &&
    candidate.rightSurface === rightSurface
  );
  if (projection === undefined) {
    return null;
  }
  return {
    rawOffset: island.outerOffset,
    sourceBoundary: {
      beforeOrdinal: sourceCursor,
      afterOrdinal: sourceCursor + 1
    },
    leftTargetText: projection.leftTargetText,
    rightTargetText: projection.rightTargetText
  };
}

function nominalInternalParentheticalSplit(
  token: RuntimeHaruToken,
  tokenTextSpan: TokenTextSpan,
  rawOffsets: readonly number[]
): NominalInternalParentheticalSplit | null {
  if (rawOffsets.length === 0 || (token.pos & POS0) !== 名詞) {
    return null;
  }
  for (const split of [token.splitB, token.splitA]) {
    const candidate = splitByRawOffsets(token, tokenTextSpan, split ?? [], rawOffsets);
    if (candidate !== null) {
      return { pieces: candidate, rawOffsets };
    }
  }
  return null;
}

function nominalInternalParentheticalPieceSplit(
  token: RuntimeHaruToken,
  tokenTextSpan: TokenTextSpan,
  rawOffsets: readonly number[]
): NominalInternalParentheticalPieceSplit | null {
  if (rawOffsets.length === 0 || (token.pos & POS0) !== 名詞) {
    return null;
  }
  for (const split of [token.splitB, token.splitA]) {
    const candidate = splitAroundRawOffsetsInsidePieces(token, tokenTextSpan, split ?? [], rawOffsets);
    if (candidate !== null) {
      return { pieces: candidate };
    }
  }
  return null;
}

function splitByRawOffsets(
  token: RuntimeHaruToken,
  tokenTextSpan: TokenTextSpan,
  split: readonly RuntimeHaruToken[],
  rawOffsets: readonly number[]
): readonly RuntimeHaruToken[] | null {
  if (split.length < 2 || !split.every(isNominalParentheticalSplitChild)) {
    return null;
  }
  if (split.map((part) => part.surface).join("") !== token.surface) {
    return null;
  }
  const offsetSet = new Set(rawOffsets);
  const boundaryChildIndexes = new Set<number>();
  let cursor = tokenTextSpan.start;
  for (let index = 0; index < split.length - 1; index += 1) {
    cursor += Array.from(split[index]!.surface).length;
    if (offsetSet.has(cursor)) {
      boundaryChildIndexes.add(index + 1);
    }
  }
  if (boundaryChildIndexes.size !== rawOffsets.length) {
    return null;
  }
  const pieces: RuntimeHaruToken[] = [];
  let pieceStart = 0;
  for (let childIndex = 1; childIndex <= split.length; childIndex += 1) {
    if (childIndex < split.length && !boundaryChildIndexes.has(childIndex)) {
      continue;
    }
    pieces.push(composeParentheticalSplitPiece(token, split.slice(pieceStart, childIndex)));
    pieceStart = childIndex;
  }
  return pieces.length === rawOffsets.length + 1 ? pieces : null;
}

function splitAroundRawOffsetsInsidePieces(
  token: RuntimeHaruToken,
  tokenTextSpan: TokenTextSpan,
  split: readonly RuntimeHaruToken[],
  rawOffsets: readonly number[]
): readonly RuntimeHaruToken[] | null {
  if (split.length < 2 || !split.every(isNominalParentheticalSplitChild)) {
    return null;
  }
  if (split.map((part) => part.surface).join("") !== token.surface) {
    return null;
  }
  let matched = 0;
  let cursor = tokenTextSpan.start;
  for (const part of split) {
    const start = cursor;
    const end = start + codepointLength(part.surface);
    for (const rawOffset of rawOffsets) {
      if (rawOffset > start && rawOffset < end) {
        matched += 1;
      }
    }
    cursor = end;
  }
  return matched === rawOffsets.length ? split : null;
}

async function nominalInternalParentheticalProjectionBoundary(
  token: RuntimeHaruToken,
  split: NominalInternalParentheticalSplit,
  sourceCursor: number,
  islands: readonly RawParentheticalIsland[],
  islandWidths: readonly number[],
  islandIndex: number,
  projectionProbe: NominalCompoundProjectionProbe
): Promise<SourceCompoundProjectionBoundary | null> {
  if (split.pieces.length !== 2 || split.rawOffsets.length !== 1) {
    return null;
  }
  const island = islands[islandIndex];
  if (island === undefined || island.outerOffset !== split.rawOffsets[0]) {
    return null;
  }
  if ((islandWidths[islandIndex] ?? 0) <= 0) {
    return null;
  }
  const compoundText = await projectionProbe(token);
  const leftText = await projectionProbe(split.pieces[0]!);
  const rightText = await projectionProbe(split.pieces[1]!);
  if (compoundText === null || compoundText.length === 0) {
    return null;
  }
  const hasLeft = leftText !== null && leftText.length > 0 && compoundText.startsWith(leftText);
  const hasRight = rightText !== null && rightText.length > 0 && compoundText.endsWith(rightText);
  const leftOffset = hasLeft && leftText !== null ? leftText.length : null;
  const rightOffset = hasRight && rightText !== null ? compoundText.length - rightText.length : null;
  const boundaryOffset = leftOffset !== null && rightOffset !== null
    ? leftOffset === rightOffset ? leftOffset : null
    : leftOffset ?? rightOffset;
  if (boundaryOffset === null || boundaryOffset <= 0 || boundaryOffset >= compoundText.length) {
    return null;
  }
  return {
    rawOffset: island.outerOffset,
    sourceBoundary: {
      beforeOrdinal: sourceCursor,
      afterOrdinal: sourceCursor + 1
    },
    ...(hasLeft && leftText !== null ? { leftTargetText: leftText } : {}),
    ...(hasRight && rightText !== null ? { rightTargetText: rightText } : {}),
    ...(leftText === null || leftText.length === 0 ? {} : { leftSplitTargetText: leftText }),
    ...(rightText === null || rightText.length === 0 ? {} : { rightSplitTargetText: rightText })
  };
}

function isNominalParentheticalSplitChild(token: RuntimeHaruToken): boolean {
  const pos0 = token.pos & POS0;
  return pos0 === 名詞 || pos0 === 接頭辞 || pos0 === 接尾辞;
}

function composeParentheticalSplitPiece(
  parent: RuntimeHaruToken,
  children: readonly RuntimeHaruToken[]
): RuntimeHaruToken {
  if (children.length === 1) {
    return children[0]!;
  }
  const surface = children.map((child) => child.surface).join("");
  const normalizedForm = joinOptionalTokenField(children, "normalizedForm");
  return {
    surface,
    ...(normalizedForm === undefined ? {} : { normalizedForm }),
    dictionaryForm: children.map((child) => child.dictionaryForm).join(""),
    reading: children.map((child) => child.reading).join(""),
    dictionaryFormReading: children.map((child) => child.dictionaryFormReading).join(""),
    pos: parent.pos,
    dictionaryId: parent.dictionaryId,
    splitA: children.flatMap((child) => child.splitA ?? [child]),
    splitB: children
  };
}

function joinOptionalTokenField(
  tokens: readonly RuntimeHaruToken[],
  key: "normalizedForm"
): string | undefined {
  return tokens.every((token) => token[key] !== undefined)
    ? tokens.map((token) => token[key]).join("")
    : undefined;
}
