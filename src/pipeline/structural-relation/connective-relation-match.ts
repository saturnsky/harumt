import type { RelationConnectiveSpanMatch } from "../head-tail/tail/connective-span-scanner.js";
import { structuralRelationDegraded } from "./diagnostics.js";
import type { ClauseProjectionForm, StructuralRelation, StructuralRelationDiagnostic, StructuralRelationMarkerSpan } from "./types.js";

export type CollectResult =
  | { readonly kind: "relation"; readonly relation: StructuralRelation }
  | { readonly kind: "diagnostic"; readonly diagnostic: StructuralRelationDiagnostic }
  | { readonly kind: "none" };

export function degraded(match: RelationConnectiveSpanMatch, markerStart: number, message: string): CollectResult {
  const markerSpan = markerSpanFromMatch(markerStart, match);
  return {
    kind: "diagnostic",
    diagnostic: structuralRelationDegraded({
      message,
      relationKind: match.relationPolicy,
      confidence: "weak",
      ...layoutBoundaryDiagnosticPayload(match),
      span: markerSpan,
      markerSpans: [markerSpan],
    }),
  };
}

export function markerSpanFromMatch(start: number, match: RelationConnectiveSpanMatch, role = `${match.relationPolicy}_marker`): StructuralRelationMarkerSpan {
  return {
    start,
    endExclusive: match.endExclusive,
    surface: match.surface,
    role,
  };
}

export function projectionRequest(sourceForm: ClauseProjectionForm, match: RelationConnectiveSpanMatch): StructuralRelation["projection"] {
  return {
    sourceForm,
    connectiveKind: match.connectiveKind,
    ...(match.targetSlot === undefined ? {} : { targetSlot: match.targetSlot }),
  };
}

export function layoutBoundaryRelationPayload(match: RelationConnectiveSpanMatch): Pick<StructuralRelation, "layoutBoundaryPolicy"> {
  return match.layoutBoundaryPolicy === undefined ? {} : { layoutBoundaryPolicy: match.layoutBoundaryPolicy };
}

export function renderEnabledRelationPayload(match: RelationConnectiveSpanMatch): Pick<StructuralRelation, "renderEnabledByDefault"> {
  return match.renderEnabledByDefault === true ? { renderEnabledByDefault: true } : {};
}

export function layoutBoundaryDiagnosticPayload(match: RelationConnectiveSpanMatch): Pick<StructuralRelationDiagnostic, "layoutBoundaryPolicy"> {
  return match.layoutBoundaryPolicy === undefined ? {} : { layoutBoundaryPolicy: match.layoutBoundaryPolicy };
}
