
import { type RuntimeHaruToken, rewriteRuntimeTokenSurface } from "../../types/token.js";
import type { LookupTables } from "../lookup-tables.js";
import { analyzerTokenCharSpans } from "./analyzer-input-offsets.js";
import { bisectLeft } from "../source-coordinate.js";

export function findProlongedOrthographyRestorationOffsets(text: string, lookups: LookupTables): Set<number> {
  const offsets = new Set<number>();
  const surfaces = lookups.PROLONGED_ORTHOGRAPHY_RESTORATION_SURFACES;
  if (surfaces.size === 0) {
    return offsets;
  }
  const chars = Array.from(text);
  for (const surface of surfaces) {
    const target = Array.from(surface);
    for (let start = 0; start + target.length <= chars.length; start += 1) {
      if (!target.every((char, offset) => chars[start + offset] === char)) {
        continue;
      }
      target.forEach((char, offset) => {
        if (char === "ー") {
          offsets.add(start + offset);
        }
      });
    }
  }
  return offsets;
}

export function restoreProlongedOrthographySurfaces(
  tokens: RuntimeHaruToken[],
  prolongedOffsets: ReadonlySet<number>,
  analysisRemoved: ReadonlySet<number>
): void {
  if (prolongedOffsets.size === 0) {
    return;
  }
  const spans = analyzerTokenCharSpans(tokens);
  const sortedProlonged = [...prolongedOffsets].sort((left, right) => left - right);
  const sortedRemoved = [...analysisRemoved].sort((left, right) => left - right);
  const insertions = new Map<number, number[]>();
  sortedProlonged.forEach((inputOffset, order) => {
    const analysisPos = inputOffset - order;
    const finalPos = analysisPos - bisectLeft(sortedRemoved, analysisPos);
    let host = spans.findIndex((span) => span.start < finalPos && finalPos < span.end);
    let at = host < 0 ? 0 : finalPos - spans[host]!.start;
    if (host < 0) {
      host = spans.findIndex((span) => span.end === finalPos);
      at = host < 0 ? 0 : Array.from(tokens[host]!.surface).length;
    }
    if (host < 0) {
      return;
    }
    insertions.set(host, [...(insertions.get(host) ?? []), at]);
  });
  for (const [index, positions] of insertions) {
    const token = tokens[index]!;
    const chars = Array.from(token.surface);
    for (const at of [...positions].sort((left, right) => right - left)) {
      chars.splice(at, 0, "ー");
    }
    const restoredSurface = chars.join("");
    const previous = token.longVowelReduction;
    const rewritten = rewriteRuntimeTokenSurface(token, { kind: "replace", surface: restoredSurface });
    tokens[index] = {
      ...rewritten,
      longVowelReduction: {
        removedCount: (previous?.removedCount ?? 0) + positions.length,
        reducedSurface: previous?.reducedSurface ?? token.surface
      }
    };
  }
}

export function composeRemovedOffsets(
  prolonged: ReadonlySet<number>,
  analysisRemoved: ReadonlySet<number>,
  inputLength: number
): Set<number> {
  const composed = new Set<number>(prolonged);
  let analysisIndex = 0;
  for (let inputIndex = 0; inputIndex < inputLength; inputIndex += 1) {
    if (prolonged.has(inputIndex)) {
      continue;
    }
    if (analysisRemoved.has(analysisIndex)) {
      composed.add(inputIndex);
    }
    analysisIndex += 1;
  }
  return composed;
}
