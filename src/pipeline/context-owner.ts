import type { CandidateConditionValue } from "../types/pipeline.js";

export function candidateConditionsHaveAssemblerOwner(
  conditions: readonly (readonly [string, CandidateConditionValue])[]
): boolean {
  return conditions.some(([key, value]) =>
    key === "quoteSlotKind" ||
    key === "connectiveRole" ||
    conditionValueHasAssemblerOwnerKey(value)
  );
}

export function senseHasAssemblerOwnerFrame(sense: {
  readonly senseFrame?: unknown;
  readonly senseFrames?: readonly unknown[];
} | null | undefined): boolean {
  if (sense === null || sense === undefined) {
    return false;
  }
  const frames = Array.isArray(sense.senseFrames)
    ? sense.senseFrames
    : [sense.senseFrame];
  return frames.some(frameHasAssemblerOwnerKey);
}

function frameHasAssemblerOwnerKey(frame: unknown): boolean {
  if (frame === null || frame === undefined || typeof frame !== "object" || Array.isArray(frame)) {
    return false;
  }
  if (Object.prototype.hasOwnProperty.call(frame, "connectiveRole")) {
    return true;
  }
  const lexical = (frame as { readonly lexicalConditions?: unknown }).lexicalConditions;
  return conditionValueHasAssemblerOwnerKey(lexical as CandidateConditionValue);
}

function conditionValueHasAssemblerOwnerKey(value: CandidateConditionValue): boolean {
  if (value === null || typeof value !== "object") {
    return false;
  }
  if (Array.isArray(value)) {
    return value.some((item) => conditionValueHasAssemblerOwnerKey(item as CandidateConditionValue));
  }
  return Object.prototype.hasOwnProperty.call(value, "quoteSlotKind") ||
    Object.prototype.hasOwnProperty.call(value, "connectiveRole");
}
