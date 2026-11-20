
import type { HaruTokenRuntimeFields, RuntimeHaruToken, SourceTokenSpan } from "../types/token.js";
import { computeSourceSpan } from "../types/token.js";

export function sourceSpanForTokenSlice(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  endExclusive: number
): SourceTokenSpan | null {
  let startOrdinal: number | null = null;
  let endOrdinal: number | null = null;
  for (let index = start; index < endExclusive; index += 1) {
    const span = tokens[index]?.sourceSpan;
    if (span === undefined || span === null) {
      continue;
    }
    startOrdinal = startOrdinal === null ? span.startOrdinal : Math.min(startOrdinal, span.startOrdinal);
    endOrdinal = endOrdinal === null ? span.endOrdinal : Math.max(endOrdinal, span.endOrdinal);
  }
  return startOrdinal === null || endOrdinal === null ? null : { startOrdinal, endOrdinal };
}

export function bisectLeft(values: readonly number[], needle: number): number {
  let lo = 0;
  let hi = values.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if ((values[mid] ?? 0) < needle) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

export function codepointLength(text: string): number {
  return Array.from(text).length;
}

export interface TerminalRoleOccurrence {
  readonly pos: number;
  readonly sfp: string;
}

export interface TokenTextSpan {
  readonly start: number;
  readonly end: number;
}

export interface AssemblerToken extends HaruTokenRuntimeFields {
  readonly surface: string;
  readonly dictionaryForm: string;
  readonly reading?: string;
  readonly dictionaryFormReading?: string;
  readonly pos: number;
}

export function sourceSpanForTokenIndexes(
  tokens: readonly Pick<AssemblerToken, "sourceOrdinal" | "sourceSpan">[],
  indexes: Iterable<number>
): SourceTokenSpan | null {
  function* iterTokens() {
    for (const index of indexes) {
      const token = tokens[index];
      if (token !== undefined) {
        yield token;
      }
    }
  }
  return computeSourceSpan(iterTokens()) ?? null;
}
