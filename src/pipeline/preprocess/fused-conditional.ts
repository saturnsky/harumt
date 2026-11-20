
import { type RuntimeHaruToken, inheritedSourceIdentity } from "../../types/token.js";
import {
  POS0,
  POS01,
  POS4,
  pos0in,
  POS5,
  POS5A,
  仮定形_,
  仮定形_一般,
  仮定形_融合,
  形容詞0,
  形容詞4,
  助動詞_ナイ,
  助動詞_ヌ,
  終止形_一般,
  助詞_接続助詞,
  動詞,
  命令形_,
  連用形_,
  非自立可能,
  助詞_終助詞,
  INFLECTABLE_AUX_BITS,
  is文語助動詞
} from "../../types/pos.js";

function isPositiveFusedConditionalToken(token: RuntimeHaruToken): boolean {
  if ((token.pos & POS5) !== 仮定形_融合) {
    return false;
  }
  const pos0 = token.pos & POS0;
  if (pos0 === 動詞) {
    return true;
  }
  if (pos0 === 形容詞0) {
    return token.dictionaryForm !== "ない" && token.dictionaryForm !== "無い";
  }
  return false;
}

export function expandFusedConditionalConnectiveSplits(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (const token of tokens) {
    if (!isPositiveFusedConditionalToken(token)) {
      result.push(token);
      continue;
    }
    dirty = true;
    result.push({
      ...token,
      pos: (token.pos & ~POS5) | 仮定形_一般,
      syntheticReason: "fused_conditional_stem"
    });
    result.push({
      surface: "ば",
      dictionaryForm: "ば",
      reading: "バ",
      dictionaryFormReading: "バ",
      pos: 助詞_接続助詞,
      dictionaryId: 0,
      ...inheritedSourceIdentity(token),
      syntheticReason: "fused_conditional_ba"
    });
  }
  return dirty ? result : [...tokens];
}

function isMisparsedBaIiSentenceFinalToken(token: RuntimeHaruToken): boolean {
  return token.surface === "ばいい" &&
    (token.pos & POS01) === 助詞_終助詞 &&
    token.dictionaryForm === "ばい";
}

export function resplitMisparsedBaIiSentenceFinal(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (const token of tokens) {
    const prev = result[result.length - 1];
    const prevPos5A = (prev?.pos ?? 0) & POS5A;
    const prevPos4 = (prev?.pos ?? 0) & POS4;
    const prevIsConditionalHost = prev !== undefined && (
      ((pos0in(prev.pos, INFLECTABLE_AUX_BITS)) && !is文語助動詞(prev.pos) &&
        (prevPos5A === 仮定形_ || prevPos5A === 連用形_ || prevPos5A === 命令形_)) ||
      (prevPos5A === 仮定形_ && (prevPos4 === 助動詞_ナイ || prevPos4 === 助動詞_ヌ))
    );
    if (!isMisparsedBaIiSentenceFinalToken(token) || !prevIsConditionalHost) {
      result.push(token);
      continue;
    }
    dirty = true;
    const normalizedPrev: RuntimeHaruToken = {
      ...prev,
      pos: (prev.pos & ~POS5) | 仮定形_一般
    };
    if (
      (prev.pos & POS0) === 動詞 &&
      prevPos5A === 連用形_ &&
      prev.dictionaryForm.endsWith("れる")
    ) {
      normalizedPrev.dictionaryForm = `${prev.dictionaryForm.slice(0, -2)}る`;
      normalizedPrev.dictionaryId = 0;
    }
    result[result.length - 1] = normalizedPrev;
    const provenance = inheritedSourceIdentity(token);
    result.push({
      surface: "ば",
      dictionaryForm: "ば",
      reading: "バ",
      dictionaryFormReading: "バ",
      pos: 助詞_接続助詞,
      dictionaryId: 0,
      ...provenance,
      syntheticReason: "ba_ii_resplit_ba"
    });
    result.push({
      surface: "いい",
      dictionaryForm: "いい",
      reading: "イイ",
      dictionaryFormReading: "イイ",
      pos: 形容詞0 | 非自立可能 | 形容詞4 | 終止形_一般,
      dictionaryId: 0,
      ...provenance,
      syntheticReason: "ba_ii_resplit_ii"
    });
  }
  return dirty ? result : [...tokens];
}
