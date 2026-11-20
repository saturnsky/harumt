
import type { RuntimeHaruToken } from "../../types/token.js";
import { codepointLength } from "../source-coordinate.js";
import type { TokenTextSpan } from "../source-coordinate.js";

export function stripOffsets(text: string, offsets: ReadonlySet<number>): string {
  return Array.from(text).filter((_, index) => !offsets.has(index)).join("");
}

export function analyzerTokenCharSpans(tokens: readonly RuntimeHaruToken[]): readonly TokenTextSpan[] {
  const spans: TokenTextSpan[] = [];
  let position = 0;
  for (const token of tokens) {
    const provided = token.sourceCharSpan;
    if (provided === undefined) {
      const end = position + codepointLength(token.surface);
      spans.push({ start: position, end });
      position = end;
      continue;
    }
    spans.push(provided);
    position = provided.end;
  }
  return spans;
}

export function difference(left: ReadonlySet<number>, right: ReadonlySet<number>): Set<number> {
  return new Set([...left].filter((item) => !right.has(item)));
}
