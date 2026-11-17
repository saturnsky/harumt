import {
  POS0,
  POS4,
  isSahenCapableNominal,
  動詞,
  助動詞,
  助動詞_レル,
  名詞
} from "../../../../types/pos.js";

interface SahenLightVerbEvidenceToken {
  readonly pos: number;
  readonly dictionaryForm?: string;
}

export function hasActiveSahenLightVerbProjection(
  tokens: readonly SahenLightVerbEvidenceToken[],
  hostTokenIdx: number
): boolean {
  const token = tokens[hostTokenIdx];
  if (token === undefined || (token.pos & POS0) !== 名詞) {
    return false;
  }
  if (!isSahenCapableNominal(token)) {
    return false;
  }
  const lightVerb = tokens[hostTokenIdx + 1];
  if (
    lightVerb === undefined ||
    (lightVerb.pos & POS0) !== 動詞 ||
    lightVerb.dictionaryForm !== "する"
  ) {
    return false;
  }
  const following = tokens[hostTokenIdx + 2];
  return following === undefined ||
    (following.pos & (POS0 | POS4)) !== (助動詞 | 助動詞_レル);
}
