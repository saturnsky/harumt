import type { AdnominalEnding, AuxLayerNode } from "./grammar.js";
import type { AttributiveProjectionPolicy } from "./renderers/base-model.js";

export function headRequiredAdnominalEnding(layer: AuxLayerNode): AdnominalEnding | null {
  const payload = layer.terminalPayload;
  return payload?.kind === "attributiveBoundary" && payload.headRequiredComplement?.kind === "adnominal"
    ? payload.headRequiredComplement.ending
    : null;
}

export function headRequiresNominalKiComplement(layer: AuxLayerNode): boolean {
  const payload = layer.terminalPayload;
  return layer.terminal === "attributive" &&
    payload?.kind === "attributiveBoundary" &&
    payload.headRequiredComplement?.kind === "nominal_ki";
}

function headRequiredEndingPolicy(layer: AuxLayerNode): AttributiveProjectionPolicy {
  switch (headRequiredAdnominalEnding(layer)) {
    case "ㄹ/을": return "head_required_future";
    case "ㄴ/은": return "result_state";
    default: return "present";
  }
}

export function predicateMoodRequestsFutureProjection(layer: AuxLayerNode): boolean {
  return layer.attributiveMood?.kind === "conjecture";
}

export function attributiveProjectionPolicy(layer: AuxLayerNode): AttributiveProjectionPolicy {
  const headPolicy = headRequiredEndingPolicy(layer);
  return headPolicy === "head_required_future" || !predicateMoodRequestsFutureProjection(layer)
    ? headPolicy
    : "future";
}

export function headRequiredPastAttributivePolicy(layer: AuxLayerNode): "future" | "present" {
  return headRequiredAdnominalEnding(layer) === "ㄹ/을" || predicateMoodRequestsFutureProjection(layer)
    ? "future"
    : "present";
}

export function committedAttributiveProjectionPolicy(
  layer: AuxLayerNode,
  boundaryRequestsFuture: boolean
): AttributiveProjectionPolicy {
  const headPolicy = attributiveProjectionPolicy(layer);
  return headPolicy === "head_required_future" || !boundaryRequestsFuture
    ? headPolicy
    : "future";
}

export function headRequiresFutureAttributiveProjection(layer: AuxLayerNode): boolean {
  return headRequiredAdnominalEnding(layer) === "ㄹ/을";
}
