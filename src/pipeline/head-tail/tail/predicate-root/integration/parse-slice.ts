import type { RuntimeHaruToken } from "../../../../../types/token.js";
import { 助動詞 as 助動詞0, 助動詞_ダ, 終止形_, 助詞_接続助詞 } from "../../../../../types/pos.js";
import { isMisclassifiedDashiCopulaListingToken } from "../classifiers/tokens.js";

export interface TailParseSliceInput {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly sourceIndexMap?: readonly number[];
}

export function rangeIndices(start: number, endExclusive: number): readonly number[] {
  const indices: number[] = [];
  for (let index = start; index < endExclusive; index += 1) {
    indices.push(index);
  }
  return indices;
}

export function expandFusedDashiCopulaListingParseSlice(
  tokens: readonly RuntimeHaruToken[],
  sourceIndexMap: readonly number[] | undefined,
  defaultSourceIndexMap: readonly number[]
): TailParseSliceInput {
  let changed = false;
  const expandedTokens: RuntimeHaruToken[] = [];
  const expandedSourceIndexMap: number[] = [];
  for (let idx = 0; idx < tokens.length; idx += 1) {
    const token = tokens[idx]!;
    const sourceIndex = sourceIndexMap?.[idx] ?? defaultSourceIndexMap[idx] ?? idx;
    if (idx > 0 && isMisclassifiedDashiCopulaListingToken(token)) {
      changed = true;
      expandedTokens.push(fusedDashiCopulaToken(token), fusedDashiListingToken(token));
      expandedSourceIndexMap.push(sourceIndex, sourceIndex);
      continue;
    }
    expandedTokens.push(token);
    expandedSourceIndexMap.push(sourceIndex);
  }
  if (!changed) {
    return sourceIndexMap === undefined
      ? { tokens }
      : { tokens, sourceIndexMap };
  }
  return { tokens: expandedTokens, sourceIndexMap: expandedSourceIndexMap };
}

function fusedDashiCopulaToken(token: RuntimeHaruToken): RuntimeHaruToken {
  return {
    ...token,
    surface: "だ",
    dictionaryForm: "だ",
    reading: "ダ",
    dictionaryFormReading: "ダ",
    pos: 助動詞0 | 助動詞_ダ | 終止形_,
    syntheticReason: "misclassified_dashi_copula_listing:copula"
  };
}

function fusedDashiListingToken(token: RuntimeHaruToken): RuntimeHaruToken {
  return {
    ...token,
    surface: "し",
    dictionaryForm: "し",
    reading: "シ",
    dictionaryFormReading: "シ",
    pos: 助詞_接続助詞,
    syntheticReason: "misclassified_dashi_copula_listing:connective"
  };
}
