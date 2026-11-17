const SURFACE_CARRIER_CONTINUATION_AUXILIARIES = new Set(["続ける", "つづける"]);
const SURFACE_CARRIER_COMPLETION_AUXILIARIES = new Set(["終わる", "おわる", "終える"]);
const SURFACE_CARRIER_INCEPTION_AUXILIARIES = new Set(["始める", "はじめる"]);

export function isSurfaceCarrierReactionReasonAuxiliary(lemma: string | null | undefined): boolean {
  if (lemma === undefined || lemma === null) {
    return false;
  }
  return SURFACE_CARRIER_CONTINUATION_AUXILIARIES.has(lemma) ||
    SURFACE_CARRIER_COMPLETION_AUXILIARIES.has(lemma);
}

export function isWideScopeNegativeSurfaceCarrierAuxiliary(lemma: string | null | undefined): boolean {
  if (lemma === undefined || lemma === null) {
    return false;
  }
  return isSurfaceCarrierReactionReasonAuxiliary(lemma) ||
    SURFACE_CARRIER_INCEPTION_AUXILIARIES.has(lemma);
}
