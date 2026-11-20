
import { type RuntimeHaruToken, rewriteRuntimeTokenSurface } from "../../types/token.js";
import { 助詞_接続助詞 } from "../../types/pos.js";

export function replacementTokenFrom(
  source: RuntimeHaruToken,
  identity: {
    readonly surface: string;
    readonly dictionaryForm: string;
    readonly reading: string;
    readonly dictionaryFormReading: string;
    readonly pos: number;
    readonly syntheticReason: string;
  }
): RuntimeHaruToken {
  const rewritten = rewriteRuntimeTokenSurface(source, { kind: "replace", surface: identity.surface });
  const replaced: RuntimeHaruToken = {
    ...rewritten,
    dictionaryForm: identity.dictionaryForm,
    reading: identity.reading,
    dictionaryFormReading: identity.dictionaryFormReading,
    pos: identity.pos,
    dictionaryId: 0,
    syntheticReason: identity.syntheticReason
  };
  delete replaced.normalizedForm;
  return replaced;
}

export function teParticleToken(voiced: boolean, source: RuntimeHaruToken, reason: string): RuntimeHaruToken {
  return replacementTokenFrom(source, {
    surface: voiced ? "で" : "て",
    dictionaryForm: voiced ? "で" : "て",
    reading: voiced ? "デ" : "テ",
    dictionaryFormReading: voiced ? "デ" : "テ",
    pos: 助詞_接続助詞,
    syntheticReason: reason
  });
}
