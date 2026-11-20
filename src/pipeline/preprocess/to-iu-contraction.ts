
import { type RuntimeHaruToken, inheritedSourceIdentity } from "../../types/token.js";
import { teBenefactiveContinuationMetadataForToken } from "../head-tail/tail/postverb-tail-classifier.js";
import {
  POS0,
  POS01,
  POS4,
  POS5,
  POS5A,
  助詞_格助詞,
  助動詞,
  動詞,
  意志推量形_,
  連体形_,
  連用形_促音便,
  命令形_,
  五段_タ行,
  五段_ワア行,
  助詞_準体助詞
} from "../../types/pos.js";
import { isCopulaAuxToken } from "../semantics/copula-tail-runtime.js";

const COLLOQUIAL_IU_AUX_LEMMAS: ReadonlySet<string> = new Set(["っちゅう", "ちゅう", "っつう", "っつー"]);
const COLLOQUIAL_TSUU_LEMMAS: ReadonlySet<string> = new Set(["つー", "つう"]);
const COLLOQUIAL_TSUU_SURFACES: ReadonlySet<string> = new Set(["つー", "つう", "つっ"]);
function isVolitionalTteExplanation(tokens: readonly RuntimeHaruToken[], index: number): boolean {
  const token = tokens[index]!;
  if (token.surface !== "って" || token.dictionaryForm !== "って") return false;
  if ((token.pos & (POS0 | POS4 | POS5A)) !== (助動詞 | 五段_ワア行 | 連体形_)) return false;
  const previous = tokens[index - 1];
  if (previous === undefined || (previous.pos & (POS0 | POS5A)) !== (動詞 | 意志推量形_)) return false;
  const nominalizer = tokens[index + 1];
  if (nominalizer === undefined || nominalizer.surface !== "ん" || (nominalizer.pos & POS01) !== 助詞_準体助詞) return false;
  const copula = tokens[index + 2];
  return copula !== undefined && isCopulaAuxToken(copula);
}

export function expandColloquialToIuContraction(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!, next = tokens[index + 1];
    const splitIu = token.surface === "っつ" && token.dictionaryForm === "っつ" && (token.pos & (POS0 | POS4)) === (助動詞 | 五段_ワア行) &&
      next?.surface === "うっ" &&
      next.dictionaryForm === "うつ" && (next.pos & (POS0 | POS4 | POS5)) === (動詞 | 五段_タ行 | 連用形_促音便);
    const isIuAux = (token.pos & (POS0 | POS4)) === (助動詞 | 五段_ワア行) &&
      (COLLOQUIAL_IU_AUX_LEMMAS.has(token.dictionaryForm) ||
        (COLLOQUIAL_TSUU_LEMMAS.has(token.dictionaryForm) && COLLOQUIAL_TSUU_SURFACES.has(token.surface)) ||
        isVolitionalTteExplanation(tokens, index));
    if (!isIuAux && !splitIu) {
      result.push(token);
      continue;
    }
    dirty = true;
    const previous = result[result.length - 1];
    if (previous?.surface === "くれ" &&
        teBenefactiveContinuationMetadataForToken(previous)?.aspect === "te_kureru") {
      result[result.length - 1] = {
        ...previous,
        pos: (previous.pos & ~POS5) | 命令形_,
        syntheticReason: "colloquial_iu_preceding_kure_imperative"
      };
    }
    const provenance = inheritedSourceIdentity(token);
    result.push({
      surface: "と", dictionaryForm: "と", reading: "ト", dictionaryFormReading: "ト",
      pos: 助詞_格助詞, dictionaryId: 0, ...provenance,
      syntheticReason: "colloquial_iu_to"
    });
    result.push({
      surface: "いう", dictionaryForm: "いう", reading: "イウ", dictionaryFormReading: "イウ",
      pos: 動詞 | 五段_ワア行 | ((splitIu ? next!.pos : token.pos) & POS5),
      dictionaryId: 0, ...provenance,
      syntheticReason: "colloquial_iu_iu"
    });
    if (splitIu) index += 1;
  }
  return dirty ? result : [...tokens];
}
