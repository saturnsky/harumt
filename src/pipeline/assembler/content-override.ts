import type { RenderPlan } from "../../types/render-plan.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import { 終止形_一般, 助動詞, 助動詞_タ, 助動詞_ダ, 助動詞_デス, 連用形_一般, 連用形_促音便, 관형사 } from "../../types/pos.js";

export function koreanOverrideRenderPlan(token: RuntimeHaruToken, koreanPos: number): RenderPlan | null {
  if (token.syntheticReason === "demonstrative_tame_discourse") {
    return {
      kind: "discourseConnective",
      payload: {
        id: "demonstrative_tame_discourse",
        demonstrative: demonstrativeTameKind(token),
        koreanPos
      }
    };
  }
  if (token.syntheticReason === "sentence_initial_toiu_wakeda") {
    return {
      kind: "wakeExplanation",
      payload: {
        prefix: { kind: "fixedText", text: "그런", koreanPos: 관형사 },
        headKind: "register_noun",
        tailKind: "wakeda",
        auxTokens: sentenceInitialToiuWakedaAuxTokens(token),
        connectiveEnding: null
      }
    };
  }
  if (token.koreanOverrideByRegister !== undefined) {
    return {
      kind: "registerText",
      casual: token.koreanOverrideByRegister.casual,
      formal: token.koreanOverrideByRegister.formal,
      koreanPos
    };
  }
  if (token.koreanOverride !== undefined) {
    return {
      kind: "fixedText",
      text: token.koreanOverride,
      koreanPos
    };
  }
  return null;
}

function sentenceInitialToiuWakedaAuxTokens(token: RuntimeHaruToken): readonly RuntimeHaruToken[] {
  if (token.surface.endsWith("でした")) {
    return [
      syntheticCopulaAuxToken("でし", "です", "デシ", 助動詞_デス, 連用形_一般),
      syntheticCopulaAuxToken("た", "た", "タ", 助動詞_タ, 終止形_一般)
    ];
  }
  if (token.surface.endsWith("だった")) {
    return [
      syntheticCopulaAuxToken("だっ", "だ", "ダッ", 助動詞_ダ, 連用形_促音便),
      syntheticCopulaAuxToken("た", "た", "タ", 助動詞_タ, 終止形_一般)
    ];
  }
  if (token.surface.endsWith("です")) {
    return [syntheticCopulaAuxToken("です", "です", "デス", 助動詞_デス, 終止形_一般)];
  }
  return [];
}

function syntheticCopulaAuxToken(
  surface: string,
  dictionaryForm: string,
  reading: string,
  pos4: number,
  pos5A: number
): RuntimeHaruToken {
  return {
    surface,
    dictionaryForm,
    reading,
    dictionaryFormReading: reading,
    pos: 助動詞 | pos4 | pos5A,
    dictionaryId: 0
  };
}

function demonstrativeTameKind(token: RuntimeHaruToken): "sono" | "kono" | null {
  const source = token.dictionaryForm || token.surface;
  if (source.startsWith("その")) {
    return "sono";
  }
  if (source.startsWith("この")) {
    return "kono";
  }
  return null;
}
