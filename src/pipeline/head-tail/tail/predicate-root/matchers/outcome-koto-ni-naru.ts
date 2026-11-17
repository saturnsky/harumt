import type { RuntimeHaruToken } from "../../../../../types/token.js";
import {
  POS0,
  POS4,
  POS5A,
  形容詞0,
  助詞,
  助動詞 as 助動詞0,
  助動詞_ダ,
  助動詞_タ,
  動詞,
  終止形_,
  連体形_,
  連用形_
} from "../../../../../types/pos.js";
import { caseParticleMarkerRelationForToken } from "../../../boundary/marker.js";
import {
  SEPARATION_BREAKS_MORPHEME_CHAIN,
  previousNonSpaceIndex,
  separatedAs
} from "../../../../clause-layout/trivia.js";
import { isKotoNounToken } from "../classifiers/tokens.js";
import { IU_LEXEME_FORMS } from "../../../data/quoted-reporting-sets.js";

export interface OutcomeKotoNiNaruSurfaceMatch {
  readonly consumed: number;
  readonly stative: boolean;
}

export function matchOutcomeKotoNiNaruSurfaceAt(
  tokens: readonly RuntimeHaruToken[],
  kotoIdx: number
): OutcomeKotoNiNaruSurfaceMatch | null {
  const koto = tokens[kotoIdx];
  if (koto === undefined || !isKotoNounToken(koto) || koto.surface !== "こと") return null;
  const prevIdx = previousNonSpaceIndex(tokens, kotoIdx);
  const prev = prevIdx === null ? undefined : tokens[prevIdx];
  if (prev === undefined) return null;
  if (prevIdx !== kotoIdx - 1 || separatedAs(tokens, kotoIdx, SEPARATION_BREAKS_MORPHEME_CHAIN)) return null;
  if (["いただく", "頂く", "戴く"].includes(prev.dictionaryForm)) {
    const teIdx = previousNonSpaceIndex(tokens, prevIdx);
    const te = teIdx === null ? undefined : tokens[teIdx];
    if (te !== undefined && te.surface === "て" && teIdx !== null) {
      const causIdx = previousNonSpaceIndex(tokens, teIdx);
      const caus = causIdx === null ? undefined : tokens[causIdx];
      if (
        caus !== undefined &&
        (caus.pos & POS0) === 助動詞0 &&
        ["せる", "させる"].includes(caus.dictionaryForm)
      ) {
        return null;
      }
    }
  }
  if (IU_LEXEME_FORMS.has(prev.dictionaryForm) || prev.surface === "の") {
    return null;
  }
  const prevPos0 = prev.pos & POS0;
  const prevIsVerbalChain =
    prevPos0 === 動詞 ||
    (prevPos0 === 助動詞0 && (prev.pos & POS4) !== 助動詞_ダ) ||
    (prevPos0 === 形容詞0 && (prev.dictionaryForm === "ない" || prev.dictionaryForm === "無い"));
  if (!prevIsVerbalChain) return null;
  const ni = tokens[kotoIdx + 1];
  if (caseParticleMarkerRelationForToken(ni, kotoIdx + 1, {
    acceptedSurfaces: ["に"],
    consumers: ["tail_multi_clause"]
  }) === null) return null;
  const naru = tokens[kotoIdx + 2];
  if (
    naru === undefined ||
    (naru.pos & POS0) !== 動詞 ||
    (naru.dictionaryForm !== "なる" && naru.dictionaryForm !== "成る")
  ) {
    return null;
  }
  const naruPos5A = naru.pos & POS5A;
  if (naruPos5A !== 終止形_ && naruPos5A !== 連体形_ && naruPos5A !== 連用形_) return null;
  let stativeConsumed = 0;
  const t1 = tokens[kotoIdx + 3];
  if (naruPos5A === 連用形_ && t1 !== undefined) {
    if ((t1.pos & POS0) === 助動詞0 && ["てる", "でる"].includes(t1.dictionaryForm)) {
      stativeConsumed = 1;
    } else if (t1.surface === "て" && (t1.pos & POS0) === 助詞) {
      const t2 = tokens[kotoIdx + 4];
      if (
        t2 !== undefined &&
        (t2.pos & POS0) === 動詞 &&
        ["いる", "おる"].includes(t2.dictionaryForm)
      ) {
        stativeConsumed = 2;
      }
    }
  }
  const stative = stativeConsumed > 0;
  if (!stative) {
    if (naruPos5A === 連用形_ && t1 !== undefined && t1.surface === "て" && (t1.pos & POS0) === 助詞) {
      return null;
    }
    if ((prev.pos & POS4) === 助動詞_タ) return null;
  }
  return { consumed: 3 + stativeConsumed, stative };
}
