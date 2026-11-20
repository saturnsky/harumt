
import { type RuntimeHaruToken, inheritedSourceIdentity } from "../../types/token.js";
import type { LookupTables } from "../lookup-tables.js";
import { POS0, POS01, 助詞_格助詞, 助動詞, 助動詞_タ, 終止形_一般, 助詞_副助詞, 助詞_接続助詞, 動詞, 名詞, 補助記号_読点 } from "../../types/pos.js";
import { bareTteTopicExclamativeFollowerAhead } from "../head-tail/tail/predicate-root/classifiers/tokens.js";

export function resplitPastQuotativeTteBeforeBa(
  tokens: readonly RuntimeHaruToken[],
  lookups: LookupTables
): RuntimeHaruToken[] {
  const quotativeContentHeads = lookups.DATTE_QUOTATIVE_CONTENT_HEADS;
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    const isTatte = token.surface === "たって" && token.dictionaryForm === "たって" &&
      (token.pos & POS01) === 助詞_接続助詞;
    const isDatte = token.surface === "だって" && token.dictionaryForm === "だって" &&
      ((token.pos & POS01) === 助詞_格助詞 || (token.pos & POS01) === 助詞_接続助詞);
    const next = tokens[index + 1];
    const prev = result[result.length - 1];
    const beforeInsistenceBa = next !== undefined && next.dictionaryForm === "ば" &&
      (next.pos & POS01) === 助詞_接続助詞;
    const beforeQuotativeHead = next !== undefined && (next.pos & POS0) === 名詞 &&
      quotativeContentHeads.has(next.dictionaryForm || next.baseForm || next.surface);
    const beforeTopicExclamative = next !== undefined &&
      (next.pos & POS01) === 補助記号_読点 &&
      bareTteTopicExclamativeFollowerAhead(tokens, index + 2, lookups, { requireInterrogativeClose: true });
    if (
      !(isTatte || isDatte) ||
      next === undefined ||
      !(beforeInsistenceBa || beforeQuotativeHead || beforeTopicExclamative) ||
      prev === undefined ||
      (prev.pos & POS0) !== 動詞
    ) {
      result.push(token);
      continue;
    }
    dirty = true;
    const provenance = inheritedSourceIdentity(token);
    result.push({
      surface: isTatte ? "た" : "だ",
      dictionaryForm: "た",
      reading: isTatte ? "タ" : "ダ",
      dictionaryFormReading: "タ",
      pos: 助動詞 | 助動詞_タ | 終止形_一般,
      dictionaryId: 0,
      ...provenance,
      syntheticReason: "past_quotative_tteba_resplit_aux"
    });
    result.push({
      surface: "って",
      dictionaryForm: "って",
      reading: "ッテ",
      dictionaryFormReading: "ッテ",
      pos: 助詞_副助詞,
      dictionaryId: 0,
      ...provenance,
      syntheticReason: "past_quotative_tteba_resplit_tte"
    });
  }
  return dirty ? result : [...tokens];
}
