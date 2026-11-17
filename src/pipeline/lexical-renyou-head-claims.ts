import type { MorphemeDictionary } from "../dictionary/morpheme.js";
import type { RuntimeHaruToken } from "../types/token.js";
import { POS0, 動詞, 形容詞0, isGeneralRenyouInflectedToken } from "../types/pos.js";
import { isStreamVvCompoundPairAt, isStreamVvCompoundShapeAt, streamVvCompoundShapeHasRegisteredOwnerAt } from "./compounds/compound-verbs.js";
import { renyouTokenLacksPredicateSense } from "./head-tail/tail/predicate-root/integration.js";
import { renyouLexicalNounCompoundCandidateEnds } from "./head-tail/head/adapters/nominal/renyou-nominal-head.js";
import type { LexicalRenyouHeadClaims } from "./clause-layout/index.js";

export async function collectLexicalRenyouHeadClaims(
  dictionary: MorphemeDictionary,
  tokens: readonly RuntimeHaruToken[]
): Promise<LexicalRenyouHeadClaims> {
  const nonPredicateHeads = new Set<number>();
  const registeredCompoundV1s = new Set<number>();
  const lexicalNounCompoundEnds = new Map<number, number>();
  for (const [index, token] of tokens.entries()) {
    const pos0 = token.pos & POS0;
    if ((pos0 !== 動詞 && pos0 !== 形容詞0) || !isGeneralRenyouInflectedToken(token)) {
      continue;
    }
    if (await renyouTokenLacksPredicateSense(dictionary, token)) {
      nonPredicateHeads.add(index);
    }
    if (
      pos0 === 動詞 &&
      isStreamVvCompoundShapeAt(tokens, index) &&
      !isStreamVvCompoundPairAt(tokens, index) &&
      await streamVvCompoundShapeHasRegisteredOwnerAt(tokens, index, dictionary as never)
    ) {
      registeredCompoundV1s.add(index);
    }
    for (const end of renyouLexicalNounCompoundCandidateEnds(tokens, index)) {
      const span = tokens.slice(index, end + 1);
      const surface = span.map((spanToken) => spanToken.surface).join("");
      const reading = span.map((spanToken) => spanToken.reading).join("");
      if ((await dictionary.lookup(surface, reading, "名詞") ?? null) !== null) {
        lexicalNounCompoundEnds.set(index, end);
        break;
      }
    }
  }
  return { nonPredicateHeads, registeredCompoundV1s, lexicalNounCompoundEnds };
}
