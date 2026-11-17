
import {
  POS0,
  POS01,
  isAdnominalGenitiveMarkerToken,
  POS4,
  POS5A,
  POS5B,
  INFLECTABLE_AUX_BITS,
  形容詞0,
  終止形_,
  助詞_格助詞,
  助動詞,
  助動詞_ダ,
  接尾辞_名詞的,
  連体形_,
  連用形_一般,
  動詞,
  NOMINAL_BITS,
  isAuxiliaryStemToken,
  isLexicalAdverb,
  isNaAdjCapableNoun,
  isNumeralToken,
  isPrefixAffixToken,
  isPureNaAdjStem,
  isRentaishiToken,
  pos0in
} from "../../types/pos.js";
import {
  separatedAs,
  type ClauseAdjacencyToken
} from "./trivia.js";
import { isAdnominalCopulaToken } from "../head-tail/tail/predicate-root/classifiers/tokens.js";
import type { SeparationKind } from "../../types/token.js";

export interface PrenominalModifierToken extends ClauseAdjacencyToken {
  readonly pos: number;
  readonly surface: string;
}

export type AuxiliaryStemModifierPolicy = "opaque" | "transparent";

export function isNonTerminableAdnominalMarkerToken(
  token: PrenominalModifierToken | undefined
): boolean {
  if (token === undefined) {
    return false;
  }
  return isAdnominalGenitiveMarkerToken(token) ||
    isAdnominalCopulaToken(token) ||
    isRentaishiToken(token) ||
    isPrefixAffixToken(token);
}

export function separatedFromPreviousModifierChainElement<T extends PrenominalModifierToken>(
  tokens: readonly T[],
  idx: number,
  separationRefused: ReadonlySet<SeparationKind>
): boolean {
  return separatedAs(tokens, idx, effectiveSeparationRefused(tokens, idx, separationRefused));
}

function effectiveSeparationRefused<T extends PrenominalModifierToken>(
  tokens: readonly T[],
  idx: number,
  separationRefused: ReadonlySet<SeparationKind>
): ReadonlySet<SeparationKind> {
  if (
    !separationRefused.has("word_separator") ||
    !isNonTerminableAdnominalMarkerToken(tokens[idx - 1])
  ) {
    return separationRefused;
  }
  const refused = new Set(separationRefused);
  refused.delete("word_separator");
  return refused;
}

export type PrenominalModifierChainReach =
  | "adnominal_stack"
  | "head_required_phrase"
  | "likeness_owned_phrase";

function reachRequiresHead(reach: PrenominalModifierChainReach): boolean {
  return reach !== "adnominal_stack";
}

function reachOwnsLikenessMorphology(reach: PrenominalModifierChainReach): boolean {
  return reach === "likeness_owned_phrase";
}

export interface PrenominalModifierChainOptions {
  readonly auxiliaryStem: AuxiliaryStemModifierPolicy;
  readonly separationRefused: ReadonlySet<SeparationKind>;
  readonly reach: PrenominalModifierChainReach;
  readonly isUnmarkedAdnominalHostAt?: (idx: number) => boolean;
  readonly derivedNominalHeadIndexAt?: (idx: number) => number | null;
  readonly permeableGapIdx?: number;
  readonly nominalUnitHeadIndexAt?: (idx: number) => number | null;
  readonly isPredicateBoundAdverbAt?: (idx: number) => boolean;
}

const HEAD_REQUIRED_PHRASE_MODIFIER_TOKEN_BUDGET = 8;

interface ModifierChainAdjacency {
  readonly separatedAt: (idx: number) => boolean;
}

function modifierChainAdjacency<T extends PrenominalModifierToken>(
  tokens: readonly T[],
  options: PrenominalModifierChainOptions
): ModifierChainAdjacency {
  return {
    separatedAt: (idx: number): boolean =>
      idx !== options.permeableGapIdx &&
      separatedFromPreviousModifierChainElement(tokens, idx, options.separationRefused)
  };
}

export function attachedDerivedNominalHeadIndexAt<T extends PrenominalModifierToken>(
  tokens: readonly T[],
  idx: number,
  end: number,
  derivedNominalHeadIndexAt: ((hostIdx: number) => number | null) | undefined,
  separationRefused: ReadonlySet<SeparationKind>
): number | null {
  if (
    derivedNominalHeadIndexAt === undefined ||
    separatedFromPreviousModifierChainElement(tokens, idx, separationRefused)
  ) {
    return null;
  }
  const headIdx = derivedNominalHeadIndexAt(idx);
  if (headIdx === null || headIdx >= end) {
    return null;
  }
  for (let inner = idx + 1; inner <= headIdx; inner += 1) {
    if (separatedFromPreviousModifierChainElement(tokens, inner, separationRefused)) {
      return null;
    }
  }
  return headIdx;
}

export function prenominalModifierChainHeadIndex<T extends PrenominalModifierToken>(
  tokens: readonly T[],
  start: number,
  end: number,
  options: PrenominalModifierChainOptions
): number | null {
  const headRequired = reachRequiresHead(options.reach);
  const likenessOwned = reachOwnsLikenessMorphology(options.reach);
  const adjacency = modifierChainAdjacency(tokens, options);
  let idx = start;
  let consumedModifier = false;
  let trailingAdverb = false;
  let consumedTokens = 0;
  const withinBudget = (consumed: number): boolean => {
    consumedTokens += consumed;
    return !headRequired || consumedTokens <= HEAD_REQUIRED_PHRASE_MODIFIER_TOKEN_BUDGET;
  };
  while (idx < end) {
    const token = tokens[idx];
    if (token === undefined) {
      return null;
    }
    if (consumedModifier && adjacency.separatedAt(idx)) {
      return null;
    }
    const pos = token.pos & POS0;
    const quantityEnd = quantityAdnominalGenitiveEnd(tokens, idx, end, adjacency);
    if (quantityEnd !== null && !adjacency.separatedAt(idx)) {
      if (!withinBudget(quantityEnd - idx)) {
        return null;
      }
      consumedModifier = true;
      trailingAdverb = false;
      idx = quantityEnd;
      continue;
    }
    if (options.isUnmarkedAdnominalHostAt?.(idx) === true && !adjacency.separatedAt(idx)) {
      if (!withinBudget(1)) {
        return null;
      }
      consumedModifier = true;
      trailingAdverb = false;
      idx = idx + 1;
      continue;
    }
    const derivedHeadIdx = attachedDerivedNominalHeadIndexAt(
      tokens,
      idx,
      end,
      options.derivedNominalHeadIndexAt,
      options.separationRefused
    );
    if (derivedHeadIdx !== null) {
      if (trailingAdverb && !headRequired) {
        return null;
      }
      return derivedHeadIdx;
    }
    const nominalUnitHeadIdx = options.nominalUnitHeadIndexAt?.(idx) ?? null;
    if (nominalUnitHeadIdx !== null && nominalUnitHeadIdx < end) {
      if (trailingAdverb && !headRequired) {
        return null;
      }
      return nominalUnitHeadIdx;
    }
    if (pos0in(pos, NOMINAL_BITS) && !isNaAdjCapableNounModifierAt(tokens, idx, end, options, adjacency)) {
      if (trailingAdverb && !headRequired) {
        return null;
      }
      if (options.auxiliaryStem === "opaque" && isAuxiliaryStemToken(token)) {
        return null;
      }
      return idx;
    }
    if (adjacency.separatedAt(idx)) {
      return null;
    }
    if (isRentaishiToken(token) || isPrefixAffixToken(token)) {
      if (!withinBudget(1)) {
        return null;
      }
      consumedModifier = true;
      trailingAdverb = false;
      idx = idx + 1;
      continue;
    }
    if (pos === 形容詞0 && ((token.pos & POS5A) === 連体形_ || (token.pos & POS5A) === 終止形_)) {
      if (!withinBudget(1)) {
        return null;
      }
      consumedModifier = true;
      trailingAdverb = false;
      idx = idx + 1;
      continue;
    }
    if (isLexicalAdverb(token)) {
      if (options.isPredicateBoundAdverbAt?.(idx) === true) {
        return null;
      }
      const markedFragmentStart = likenessOwned
        ? adverbialToMarkedPredicateStart(tokens, idx, end, adjacency)
        : null;
      if (markedFragmentStart !== null) {
        if (!withinBudget(markedFragmentStart - idx)) {
          return null;
        }
        consumedModifier = true;
        trailingAdverb = false;
        idx = markedFragmentStart;
        continue;
      }
      if (!withinBudget(1)) {
        return null;
      }
      consumedModifier = true;
      trailingAdverb = true;
      idx = idx + 1;
      continue;
    }
    if (isNaAdjectiveDistributionHost(token, options)) {
      const copulaIdx = idx + 1;
      if (
        isAdnominalCopulaAt(tokens, copulaIdx, end) &&
        !adjacency.separatedAt(copulaIdx)
      ) {
        if (!withinBudget(copulaIdx + 1 - idx)) {
          return null;
        }
        consumedModifier = true;
        trailingAdverb = false;
        idx = copulaIdx + 1;
        continue;
      }
    }
    if (likenessOwned) {
      const conjunctiveEnd = naAdjectiveConjunctiveLinkEnd(tokens, idx, end, options, adjacency);
      if (conjunctiveEnd !== null) {
        if (!withinBudget(conjunctiveEnd - idx)) {
          return null;
        }
        consumedModifier = true;
        trailingAdverb = false;
        idx = conjunctiveEnd;
        continue;
      }
    }
    if (headRequired) {
      const relativeClauseEnd = adnominalPredicateFragmentEnd(tokens, idx, end, options, adjacency);
      if (relativeClauseEnd !== null) {
        if (!withinBudget(relativeClauseEnd - idx)) {
          return null;
        }
        consumedModifier = true;
        trailingAdverb = false;
        idx = relativeClauseEnd;
        continue;
      }
    }
    return null;
  }
  return null;
}

function adnominalPredicateFragmentEnd<T extends PrenominalModifierToken>(
  tokens: readonly T[],
  idx: number,
  end: number,
  options: PrenominalModifierChainOptions,
  adjacency: ModifierChainAdjacency
): number | null {
  const first = tokens[idx];
  if (first === undefined) {
    return null;
  }
  let cursor: number;
  if ((first.pos & POS0) === 動詞) {
    cursor = idx;
  } else if (isNaAdjectiveDistributionHost(first, options)) {
    cursor = idx + 1;
    const suffix = tokens[cursor];
    if (
      cursor >= end ||
      suffix === undefined ||
      !pos0in(suffix.pos, INFLECTABLE_AUX_BITS) ||
      adjacency.separatedAt(cursor)
    ) {
      return null;
    }
  } else {
    return null;
  }
  while (cursor < end) {
    const token = tokens[cursor];
    if (token === undefined || !pos0in(token.pos, INFLECTABLE_AUX_BITS)) {
      return null;
    }
    if (cursor > idx && adjacency.separatedAt(cursor)) {
      return null;
    }
    if ((token.pos & POS5A) === 連体形_) {
      return cursor + 1;
    }
    cursor = cursor + 1;
  }
  return null;
}

function adverbialToMarkedPredicateStart<T extends PrenominalModifierToken>(
  tokens: readonly T[],
  idx: number,
  end: number,
  adjacency: ModifierChainAdjacency
): number | null {
  const markerIdx = idx + 1;
  const marker = tokens[markerIdx];
  if (
    markerIdx >= end ||
    marker === undefined ||
    marker.surface !== "と" ||
    (marker.pos & POS01) !== 助詞_格助詞 ||
    adjacency.separatedAt(markerIdx)
  ) {
    return null;
  }
  const predicateIdx = markerIdx + 1;
  const predicate = tokens[predicateIdx];
  if (
    predicateIdx >= end ||
    predicate === undefined ||
    !pos0in(predicate.pos, INFLECTABLE_AUX_BITS) ||
    adjacency.separatedAt(predicateIdx)
  ) {
    return null;
  }
  return predicateIdx;
}

function naAdjectiveConjunctiveLinkEnd<T extends PrenominalModifierToken>(
  tokens: readonly T[],
  idx: number,
  end: number,
  options: PrenominalModifierChainOptions,
  adjacency: ModifierChainAdjacency
): number | null {
  const token = tokens[idx];
  if (token === undefined || !isNaAdjectiveDistributionHost(token, options)) {
    return null;
  }
  const copulaIdx = idx + 1;
  if (copulaIdx >= end || adjacency.separatedAt(copulaIdx)) {
    return null;
  }
  return isConjunctiveCopulaAt(tokens, copulaIdx, end) ? copulaIdx + 1 : null;
}

function quantityAdnominalGenitiveEnd<T extends PrenominalModifierToken>(
  tokens: readonly T[],
  idx: number,
  end: number,
  adjacency: ModifierChainAdjacency
): number | null {
  const token = tokens[idx];
  if (token === undefined) {
    return null;
  }
  const isQuantityStem = isPureNaAdjStem(token)
    ? !isAuxiliaryStemToken(token)
    : isNumeralToken(token);
  if (!isQuantityStem) {
    return null;
  }
  const step = (cursor: number): number | null => {
    const next = cursor;
    if (next >= end) {
      return null;
    }
    return adjacency.separatedAt(next) ? null : next;
  };
  let cursor = step(idx + 1);
  while (cursor !== null && (tokens[cursor]!.pos & POS01) === 接尾辞_名詞的) {
    cursor = step(cursor + 1);
  }
  if (cursor === null) {
    return null;
  }
  const genitive = tokens[cursor];
  if (genitive === undefined || !isAdnominalGenitiveMarkerToken(genitive)) {
    return null;
  }
  return cursor + 1;
}

function isNaAdjectiveDistributionHost(
  token: PrenominalModifierToken,
  options: PrenominalModifierChainOptions
): boolean {
  if (isPureNaAdjStem(token)) {
    return options.auxiliaryStem === "transparent" || !isAuxiliaryStemToken(token);
  }
  return isNaAdjCapableNoun(token);
}

function isAdnominalCopulaAt<T extends PrenominalModifierToken>(
  tokens: readonly T[],
  idx: number,
  end: number
): boolean {
  return idx < end && isAdnominalCopulaToken(tokens[idx]);
}

function isConjunctiveCopulaAt<T extends PrenominalModifierToken>(
  tokens: readonly T[],
  idx: number,
  end: number
): boolean {
  const copula = tokens[idx];
  return idx < end &&
    copula !== undefined &&
    (copula.pos & (POS0 | POS4 | POS5A | POS5B)) === (助動詞 | 助動詞_ダ | 連用形_一般);
}

function isNaAdjCapableNounModifierAt<T extends PrenominalModifierToken>(
  tokens: readonly T[],
  idx: number,
  end: number,
  options: PrenominalModifierChainOptions,
  adjacency: ModifierChainAdjacency
): boolean {
  const token = tokens[idx];
  if (token === undefined || !isNaAdjCapableNoun(token)) {
    return false;
  }
  const copulaIdx = idx + 1;
  if (isAdnominalCopulaAt(tokens, copulaIdx, end)) {
    return true;
  }
  return reachOwnsLikenessMorphology(options.reach) && isConjunctiveCopulaAt(tokens, copulaIdx, end);
}
