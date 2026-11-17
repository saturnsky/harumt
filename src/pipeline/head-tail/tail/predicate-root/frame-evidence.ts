
export function sourceEvidenceValueTruthy(value: unknown): boolean {
  if (value === null || value === undefined || value === false) {
    return false;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === "object") {
    return Object.keys(value).length > 0;
  }
  return true;
}

export function pythonTruthyFrameDefault(value: unknown): boolean {
  if (value === undefined || value === null || value === false) {
    return false;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    return value.length > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === "object") {
    return Object.keys(value).length > 0;
  }
  return true;
}

export function senseRequiresSourceEvidence(sense: {
  readonly casePreferences?: unknown;
  readonly caseRealization?: unknown;
  readonly slotRealization?: unknown;
  readonly senseFrame?: unknown;
  readonly senseFrames?: unknown;
  readonly senseCaseRealization?: unknown;
  readonly senseSlotRealization?: unknown;
  readonly dropFirstNegativeAux?: boolean;
  readonly dropFirstPassiveAux?: boolean;
  readonly dropFirstCausativeAux?: boolean;
  readonly teIruResultative?: boolean;
  readonly teIruDropAux?: boolean;
  readonly teIruContractToPast?: boolean;
}): boolean {
  return sense.casePreferences !== undefined ||
    sense.caseRealization !== undefined ||
    sense.slotRealization !== undefined ||
    senseFramePayloadHasSourceEvidence(sense.senseFrame) ||
    (Array.isArray(sense.senseFrames) && sense.senseFrames.some(senseFramePayloadHasSourceEvidence)) ||
    sense.senseCaseRealization !== undefined ||
    sense.senseSlotRealization !== undefined ||
    sense.dropFirstNegativeAux === true ||
    sense.dropFirstPassiveAux === true ||
    sense.dropFirstCausativeAux === true ||
    sense.teIruResultative === true ||
    sense.teIruDropAux === true ||
    sense.teIruContractToPast === true;
}

export function senseCarriesSelectionFrame(sense: { readonly senseFrame?: unknown; readonly senseFrames?: unknown }): boolean {
  const frames = Array.isArray(sense.senseFrames) ? sense.senseFrames : sense.senseFrame === undefined ? [] : [sense.senseFrame];
  return frames.some((frame) =>
    frame === null || typeof frame !== "object" || Array.isArray(frame) ||
    !pythonTruthyFrameDefault((frame as Record<string, unknown>).default)
  );
}

export function senseFramePayloadHasSourceEvidence(frame: unknown): boolean {
  if (frame === null || frame === undefined || typeof frame !== "object" || Array.isArray(frame)) {
    return false;
  }
  const typed = frame as Record<string, unknown>;
  if (pythonTruthyFrameDefault(typed.default)) {
    return false;
  }
  return ["slots", "chainConditions", "lexicalConditions", "clauseConditions", "participantConditions", "connectiveRole"]
    .some((key) => sourceEvidenceValueTruthy(typed[key]));
}

function framePayloadHasChainConditions(frame: unknown): boolean {
  if (frame === null || frame === undefined || typeof frame !== "object" || Array.isArray(frame)) {
    return false;
  }
  const typed = frame as Record<string, unknown>;
  if (pythonTruthyFrameDefault(typed.default)) {
    return false;
  }
  return sourceEvidenceValueTruthy(typed.chainConditions) || sourceEvidenceValueTruthy(typed.chain_conditions);
}

export function senseRequiresAuxChainEvidence(sense: {
  readonly senseFrame?: unknown;
  readonly senseFrames?: unknown;
  readonly dropFirstNegativeAux?: boolean;
  readonly dropFirstPassiveAux?: boolean;
  readonly dropFirstCausativeAux?: boolean;
}): boolean {
  return framePayloadHasChainConditions(sense.senseFrame) ||
    (Array.isArray(sense.senseFrames) && sense.senseFrames.some(framePayloadHasChainConditions)) ||
    sense.dropFirstNegativeAux === true ||
    sense.dropFirstPassiveAux === true ||
    sense.dropFirstCausativeAux === true;
}
