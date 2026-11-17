import type { RuntimeHaruToken } from "../types/token.js";
import {
  explanatoryMonReadingAt,
  isAdnominalHostedMonSfpToken,
  isExplanatoryMonNounToken,
  quoteCarrierHeadIndices
} from "../pipeline/semantics/explanatory-mon-reading.js";
import { 助詞_終助詞, 名詞_普通名詞 } from "../types/pos.js";


export const EXPLANATORY_MON_SFP_RETAG_REASON = "explanatory_mon_sfp_retag";
export const ATTRIBUTIVE_MON_NOUN_RETAG_REASON = "attributive_mon_noun_retag";

function explanatorySfpRetaggedToken(token: RuntimeHaruToken): RuntimeHaruToken {
  return {
    ...token,
    pos: 助詞_終助詞,
    dictionaryId: 0,
    syntheticReason: EXPLANATORY_MON_SFP_RETAG_REASON
  };
}

export function retagExplanatoryMonAsSentenceFinalParticle(
  tokens: readonly RuntimeHaruToken[]
): RuntimeHaruToken[] {
  let mutated = false;
  let carrierHeads: ReadonlySet<number> | null = null;
  const result: RuntimeHaruToken[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    if (isAdnominalHostedMonSfpToken(tokens, i)) {
      result.push({ ...token, pos: 名詞_普通名詞, dictionaryId: 0, syntheticReason: ATTRIBUTIVE_MON_NOUN_RETAG_REASON });
      mutated = true;
      continue;
    }
    if (
      isExplanatoryMonNounToken(token) &&
      explanatoryMonReadingAt(null, tokens, i, carrierHeads ??= quoteCarrierHeadIndices(tokens)).kind === "explanatory_sfp"
    ) {
      result.push(explanatorySfpRetaggedToken(token));
      mutated = true;
      continue;
    }
    result.push(token);
  }
  return mutated ? result : (tokens as RuntimeHaruToken[]);
}
