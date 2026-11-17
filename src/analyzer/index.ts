import type { Dictionary, UserLexiconEntry } from "./dictionary.js";
import { tokenizeForHaru, type HaruToken, type HaruPos } from "./haru-compat.js";
import {
  prolongedReductionKeyPart,
  type ProlongedReductionContract
} from "./reduction-variant.js";
import { policyKey, type WhitespacePolicy } from "./whitespace-policy.js";

export type { HaruToken, HaruPos };
export type SudachiDictType = "full" | "core" | "small";

export class SudachiAnalyzer {
  private readonly dictionary: Dictionary;
  private cache: Map<string, HaruToken[]> | undefined;

  constructor(dictionary: Dictionary) {
    this.dictionary = dictionary;
  }

  replaceUserLexicon(entries: readonly UserLexiconEntry[]): void {
    this.dictionary.replaceUserLexicon(entries);
  }

  setCache(cache: Map<string, HaruToken[]>): void {
    this.cache = cache;
  }

  getCache(): Map<string, HaruToken[]> | undefined {
    return this.cache;
  }

  tokenize(
    text: string,
    policy: WhitespacePolicy | boolean = "legacy-split",
    prolongedReduction?: ProlongedReductionContract
  ): HaruToken[] {
    const resolved = normalizeWhitespacePolicyArgument(policy);
    const options = prolongedReduction === undefined
      ? { policy: resolved }
      : { policy: resolved, prolongedReduction };
    if (this.cache !== undefined) {
      const key = `${prolongedReductionKeyPart(prolongedReduction)}${policyKey(resolved)}${text}`;
      const cached = this.cache.get(key);
      if (cached !== undefined) {
        return [...cached];
      }
      const result = tokenizeForHaru(this.dictionary, text, options);
      this.cache.set(key, result);
      return [...result];
    }
    return tokenizeForHaru(this.dictionary, text, options);
  }
}

function normalizeWhitespacePolicyArgument(
  policy: WhitespacePolicy | boolean
): WhitespacePolicy {
  if (policy === true) {
    return "legacy-split";
  }
  if (policy === false) {
    return "raw";
  }
  return policy;
}
