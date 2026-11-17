import type { RuntimeHaruToken } from "../types/token.js";
import { mergeRuntimeTokenSourceIdentity, rewriteRuntimeTokenSurface } from "../types/token.js";
import {
  POS0,
  POS4,
  POS5A,
  形容詞0,
  形容詞4,
  動詞,
  名詞,
  助動詞 as 助動詞0,
  助動詞_ナイ,
  助動詞_ヌ,
  終止形_,
  連体形_, POS01, 助詞_格助詞, 助詞_接続助詞,
} from "../types/pos.js";


const SINGLE_TOKEN_WORTH_MATRICES: ReadonlySet<string> = new Set(["足る", "足りる", "堪える", "耐える"]);
const SAHEN_NOUN_WORTH_MATRICES: ReadonlySet<string> = new Set(["値"]);
const SUPPLETIVE_NEGATIVE_LEMMA: ReadonlyMap<string, string> = new Map([
  ["堪える", "堪えない"],
  ["耐える", "耐えない"]
]);
const M_EXTENT_NEGATIVE_LEMMA: ReadonlyMap<string, string> = new Map([
  ["過ぎる", "過ぎない"]
]);

function isNiComplementHostPredicate(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined || (token.pos & POS0) !== 動詞) {
    return false;
  }
  const form = token.pos & POS5A;
  return form === 終止形_ || form === 連体形_;
}

function isNiComplementMatrixHostAny(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  if ((token.pos & POS0) === 名詞) {
    return true;
  }
  return isNiComplementHostPredicate(token);
}

function isNiCaseParticle(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined &&
    token.surface === "に" &&
    (token.pos & POS01) === 助詞_格助詞;
}

function isDirectNegationAux(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined &&
    (token.pos & POS0) === 助動詞0 &&
    ((token.pos & POS4) === 助動詞_ナイ || (token.pos & POS4) === 助動詞_ヌ);
}

function isSuruVerb(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined && (token.pos & POS0) === 動詞 && token.dictionaryForm === "する";
}

function isNaruVerb(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined && (token.pos & POS0) === 動詞 && token.dictionaryForm === "なる";
}

function isTeConnectiveParticle(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined &&
    (token.pos & POS01) === 助詞_接続助詞 &&
    (token.surface === "て" || token.surface === "で");
}

function isIruAuxVerb(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined && (token.pos & POS0) === 動詞 && token.dictionaryForm === "いる";
}

function isTeruContractedAux(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined && (token.pos & POS0) === 助動詞0 && token.dictionaryForm === "てる";
}

function flipPos0Pos4ToAdjective(pos: number): number {
  return (pos & ~(POS0 | POS4)) | 形容詞0 | 形容詞4;
}

function adjectiveFlippedToken(
  inflectionSource: RuntimeHaruToken,
  options: {
    readonly sourceTokens: readonly [RuntimeHaruToken, ...RuntimeHaruToken[]];
    readonly dictionaryForm: string;
    readonly reading: string;
  }
): RuntimeHaruToken {
  const sourceAligned = rewriteRuntimeTokenSurface(inflectionSource, {
    kind: "merge",
    sources: options.sourceTokens
  });
  const sourceMerged = mergeRuntimeTokenSourceIdentity(sourceAligned, options.sourceTokens);
  return {
    ...sourceMerged,
    dictionaryForm: options.dictionaryForm,
    reading: options.reading,
    dictionaryFormReading: inflectionSource.dictionaryFormReading,
    pos: flipPos0Pos4ToAdjective(inflectionSource.pos),
    dictionaryId: 0,
    syntheticReason: "ni_complement_matrix_flip"
  };
}

export function flipNiComplementMatrixPredicates(
  tokens: readonly RuntimeHaruToken[]
): RuntimeHaruToken[] {
  let mutated = false;
  const result: RuntimeHaruToken[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    const host = tokens[i - 2];
    const ni = tokens[i - 1];
    if (isNiComplementHostPredicate(host) && isNiCaseParticle(ni)) {
      if ((token.pos & POS0) === 動詞 && SINGLE_TOKEN_WORTH_MATRICES.has(token.dictionaryForm)) {
        const suppletiveNegativeLemma = SUPPLETIVE_NEGATIVE_LEMMA.get(token.dictionaryForm);
        if (suppletiveNegativeLemma !== undefined && isDirectNegationAux(tokens[i + 1])) {
          const naiToken = tokens[i + 1]!;
          result.push(adjectiveFlippedToken(naiToken, {
            sourceTokens: [token, naiToken],
            dictionaryForm: suppletiveNegativeLemma,
            reading: `${token.reading}${naiToken.reading}`
          }));
          mutated = true;
          i += 1;
          continue;
        }
        result.push({
          ...token,
          pos: flipPos0Pos4ToAdjective(token.pos),
          syntheticReason: "ni_complement_matrix_flip"
        });
        mutated = true;
        continue;
      }
      const suru = tokens[i + 1];
      if (
        (token.pos & POS0) === 名詞 &&
        SAHEN_NOUN_WORTH_MATRICES.has(token.dictionaryForm) &&
        isSuruVerb(suru)
      ) {
        result.push(adjectiveFlippedToken(suru!, {
          sourceTokens: [token, suru!],
          dictionaryForm: `${token.dictionaryForm}する`,
          reading: `${token.reading}${suru!.reading}`
        }));
        mutated = true;
        i += 1;
        continue;
      }
      if ((token.pos & POS0) === 動詞 && token.dictionaryForm === "決まる") {
        const te = tokens[i + 1];
        const iru = tokens[i + 2];
        if (isTeConnectiveParticle(te) && isIruAuxVerb(iru)) {
          result.push(adjectiveFlippedToken(iru!, {
            sourceTokens: [token, te!, iru!],
            dictionaryForm: "決まっている",
            reading: `${token.reading}${te!.reading}${iru!.reading}`
          }));
          mutated = true;
          i += 2;
          continue;
        }
        if (isTeruContractedAux(te)) {
          result.push(adjectiveFlippedToken(te!, {
            sourceTokens: [token, te!],
            dictionaryForm: "決まっている",
            reading: `${token.reading}${te!.reading}`
          }));
          mutated = true;
          i += 1;
          continue;
        }
      }
    }
    if (
      (token.pos & POS0) === 動詞 &&
      M_EXTENT_NEGATIVE_LEMMA.has(token.dictionaryForm) &&
      isNiCaseParticle(ni) &&
      isNiComplementMatrixHostAny(host) &&
      isDirectNegationAux(tokens[i + 1]) &&
      !isNaruVerb(tokens[i + 2])
    ) {
      const naiToken = tokens[i + 1]!;
      result.push(adjectiveFlippedToken(naiToken, {
        sourceTokens: [token, naiToken],
        dictionaryForm: M_EXTENT_NEGATIVE_LEMMA.get(token.dictionaryForm)!,
        reading: `${token.reading}${naiToken.reading}`
      }));
      mutated = true;
      i += 1;
      continue;
    }
    result.push(token);
  }
  return mutated ? result : (tokens as RuntimeHaruToken[]);
}
