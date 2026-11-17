
import { caseParticleMarkerRelationForToken } from "../head-tail/boundary/marker.js";
import { TokenCursor } from "../token-cursor.js";


import { POS0, POS5A, 形容詞0, 名詞, 連用形_, isAdverbCapableNominal } from "../../types/pos.js";
export interface ParticleCommonToken {
  readonly surface: string;
  readonly dictionaryForm: string;
  readonly pos: number;
}

export function isDemoMinimumContextForParticle(
  cursor: TokenCursor<ParticleCommonToken>
): boolean {
  if (cursor.peek(1) === undefined) {
    return false;
  }
  const tok = cursor.peek(1);
  if (tok === undefined) {
    return false;
  }
  const p5A = (tok.pos & POS5A);
  if ((tok.pos & POS0) === 形容詞0 && p5A === 連用形_) {
    return true;
  }
  if (
    (tok.pos & POS0) === 名詞 &&
    tok.dictionaryForm === "遠く" &&
    isAdverbCapableNominal(tok)
  ) {
    return true;
  }
  return (
    tok.dictionaryForm === "前" &&
    cursor.peek(2) !== undefined &&
    caseParticleMarkerRelationForToken(cursor.peek(2), cursor.pos + 2, {
      acceptedSurfaces: ["に"],
      consumers: ["assembler"]
    }) !== null
  );
}

export function isUchiTemporalHeadToken(token: ParticleCommonToken): boolean {
  return (
    token.dictionaryForm === "うち" ||
    token.dictionaryForm === "内" ||
    token.surface === "うち" ||
    token.surface === "内"
  );
}
