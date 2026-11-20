
import { alignReading } from "../../generator/kanji-alignment.js";
import { normalizeKana } from "../../generator/readings.js";
import type { AnnotationEntry } from "../../types/annotation.js";
import type { RuntimeHaruToken, SourceTokenBoundary } from "../../types/token.js";
import type { ParentheticalIsland, PreparedTranslation } from "./prepared-translation.js";
import { preparedSourceWidth, shiftPreparedSourceIdentity } from "./prepared-tree.js";

export async function resolvePreparedRubyAnnotations(
  prepared: PreparedTranslation,
  table: ReadonlyMap<number, AnnotationEntry>,
  prepareTranslation: (text: string) => Promise<PreparedTranslation>
): Promise<void> {
  const tokens = prepared.tokens as RuntimeHaruToken[];
  const islandRequests = resolveRubyAnnotations(tokens, table);

  if (islandRequests.length > 0) {
    const newIslands: ParentheticalIsland[] = [];
    for (const req of islandRequests) {
      const anchorOrdinal = req.baseEndOrdinal;

      const innerPrepared = shiftPreparedSourceIdentity(
        await prepareTranslation(req.rubyText),
        anchorOrdinal + 1
      );

      const islandWidth = preparedSourceWidth(innerPrepared);
      const sourceBoundary: SourceTokenBoundary = {
        beforeOrdinal: anchorOrdinal > 0 ? anchorOrdinal - 1 : null,
        afterOrdinal: anchorOrdinal
      };

      newIslands.push({
        id: `ruby:${anchorOrdinal}:${anchorOrdinal + islandWidth}`,
        delimiter: { open: "", close: "" },
        sourceBoundary,
        sourceSpan: { startOrdinal: anchorOrdinal, endOrdinal: anchorOrdinal + islandWidth },
        innerPrepared,
        nestingDepth: 0,
        rubyAnnotationKey: req.rubyAnnotationKey
      });
    }

    if (newIslands.length > 0) {
      const mutable = prepared as unknown as { parentheticalIslands?: ParentheticalIsland[] };
      const existing = mutable.parentheticalIslands ?? [];
      mutable.parentheticalIslands = [...existing, ...newIslands];
    }
  }

  for (const island of prepared.parentheticalIslands ?? []) {
    await resolvePreparedRubyAnnotations(island.innerPrepared, table, prepareTranslation);
  }
}

export function normalizeInferredRubyReadingToKatakana(reading: string): string | null {
  if (/\s/u.test(reading)) {
    return null;
  }
  const katakana = normalizeKana(reading);
  return katakana.length > 0 ? katakana : null;
}

function normalizeDeclaredRubyReadingToKatakana(reading: string): string | null {
  const katakana = normalizeKana(reading.replace(/\s+/gu, ""));
  return katakana.length > 0 ? katakana : null;
}

export function isInferredRubyReadingSurface(text: string): boolean {
  return normalizeInferredRubyReadingToKatakana(text) !== null;
}

interface RubyPair {
  readonly baseKey: number;
  readonly rubyKey: number;
  readonly baseIndices: number[];
  readonly rubyIndices: number[];
}

function findRubyPairs(
  tokens: readonly RuntimeHaruToken[],
  table: ReadonlyMap<number, AnnotationEntry>
): RubyPair[] {
  const baseKeys = new Set<number>();
  const rubyKeys = new Set<number>();
  for (const [key, entry] of table) {
    if (entry.kind === "ruby-base") baseKeys.add(key);
    else if (entry.kind === "ruby") rubyKeys.add(key);
  }
  if (baseKeys.size === 0 || rubyKeys.size === 0) return [];

  const pairs: RubyPair[] = [];
  let currentBase: { key: number; indices: number[] } | null = null;

  for (let i = 0; i < tokens.length; i++) {
    const keys = tokens[i]?.annotationKeys;
    if (keys === undefined) {
      if (currentBase !== null) currentBase = null;
      continue;
    }
    const bk = keys.find(k => baseKeys.has(k));
    const rk = keys.find(k => rubyKeys.has(k));

    if (bk !== undefined) {
      if (currentBase === null || currentBase.key !== bk) {
        currentBase = { key: bk, indices: [] };
      }
      currentBase.indices.push(i);
    } else if (rk !== undefined && currentBase !== null) {
      let existing = pairs.find(p => p.baseKey === currentBase!.key && p.rubyKey === rk);
      if (existing === undefined) {
        existing = { baseKey: currentBase.key, rubyKey: rk, baseIndices: [...currentBase.indices], rubyIndices: [] };
        pairs.push(existing);
      }
      existing.rubyIndices.push(i);
    } else {
      currentBase = null;
    }
  }

  return pairs;
}

interface UnabsorbedRubyIslandRequest {
  readonly rubyText: string;
  readonly rubyAnnotationKey: number;
  readonly baseEndOrdinal: number;
}

function resolveRubyAnnotations(
  tokens: RuntimeHaruToken[],
  table: ReadonlyMap<number, AnnotationEntry>
): UnabsorbedRubyIslandRequest[] {
  const pairs = findRubyPairs(tokens, table);
  if (pairs.length === 0) return [];

  const removeSet = new Set<number>();
  const islandRequests: UnabsorbedRubyIslandRequest[] = [];

  for (const pair of pairs) {
    const baseSurface = pair.baseIndices.map(i => tokens[i]!.surface).join("");
    const rubySurface = pair.rubyIndices.map(i => tokens[i]!.surface).join("");
    const rubyKatakana = normalizeDeclaredRubyReadingToKatakana(rubySurface);

    const absorbed = (() => {
      if (rubyKatakana === null) return false;
      const alignment = alignReading(baseSurface, rubyKatakana);
      const baseReading = pair.baseIndices.map(i => tokens[i]!.reading).join("");
      const isJukujikun = alignment === null && rubyKatakana === baseReading;
      if (alignment === null && !isJukujikun) return false;

      if (alignment !== null) {
        let alignIdx = 0;
        for (const i of pair.baseIndices) {
          const token = tokens[i]!;
          const chars = Array.from(token.surface);
          const segments: string[] = [];
          for (let c = 0; c < chars.length && alignIdx < alignment.length; c++, alignIdx++) {
            segments.push(alignment[alignIdx]![1]);
          }
          const newReading = segments.join("");
          if (newReading.length > 0) {
            token.reading = newReading;
            token.dictionaryFormReading = newReading;
          }
        }
      }
      for (const i of pair.baseIndices) {
        const token = tokens[i]!;
        if (token.annotationKeys !== undefined) {
          token.annotationKeys = token.annotationKeys.filter(k => k !== pair.baseKey);
          if (token.annotationKeys.length === 0) delete token.annotationKeys;
        }
      }
      return true;
    })();

    if (!absorbed) {
      const lastBaseToken = tokens[pair.baseIndices[pair.baseIndices.length - 1]!]!;
      const baseEndOrdinal = lastBaseToken.sourceSpan?.endOrdinal
        ?? ((lastBaseToken.sourceOrdinal ?? 0) + 1);
      islandRequests.push({
        rubyText: rubySurface,
        rubyAnnotationKey: pair.rubyKey,
        baseEndOrdinal
      });
    }

    for (const i of pair.rubyIndices) {
      removeSet.add(i);
    }
  }

  if (removeSet.size > 0) {
    let dst = 0;
    for (let src = 0; src < tokens.length; src++) {
      if (!removeSet.has(src)) {
        tokens[dst++] = tokens[src]!;
      }
    }
    tokens.length = dst;
  }

  return islandRequests;
}
