import type { MatcherToken } from "../../matchers.js";
import { isVerbLemma } from "../../matchers.js";
import { previousNonSpaceIndex } from "../../clause-layout/trivia.js";

import { POS0, 記号, 助詞, 補助記号, 名詞 } from "../../../types/pos.js";
import {
  caseParticleMarkerRelationForToken,
  nominalLinkMarkerRelationAt
} from "./marker.js";

export function isNoSeiNiSuruContext(tokens: readonly MatcherToken[], suruIdx: number): boolean {
  const suru = tokens[suruIdx];
  if (suruIdx < 0 || suruIdx >= tokens.length || !suru || !isVerbLemma(suru, "する")) {
    return false;
  }
  const niIdx = previousNonSpaceIndex(tokens, suruIdx);
  if (niIdx === null || caseParticleMarkerRelationForToken(tokens[niIdx], niIdx, {
    acceptedSurfaces: ["に"],
    consumers: ["semantic_helpers"]
  }) === null) {
    return false;
  }
  const headIdx = previousNonSpaceIndex(tokens, niIdx);
  if (headIdx === null || tokens[headIdx]?.dictionaryForm !== "せい" || ((tokens[headIdx]?.pos ?? 0) & POS0) !== 名詞) {
    return false;
  }
  const noIdx = previousNonSpaceIndex(tokens, headIdx);
  if (noIdx === null || nominalLinkMarkerRelationAt(tokens, noIdx, { consumers: ["semantic_helpers"] }) === null) {
    return false;
  }
  const ownerIdx = previousNonSpaceIndex(tokens, noIdx);
  if (ownerIdx === null) {
    return false;
  }
  const ownerPos0 = ((tokens[ownerIdx]?.pos ?? 0) & POS0);
  return (ownerPos0 & POS0) !== 助詞 && (ownerPos0 & POS0) !== 補助記号 && (ownerPos0 & POS0) !== 記号;
}
