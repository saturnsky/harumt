import type {
  StructuralRelationConfidence,
  StructuralRelationDiagnostic,
  StructuralRelationDiagnosticName,
  StructuralRelationDiagnosticSeverity,
  StructuralRelationLayoutBoundaryPolicy,
  StructuralRelationMarkerSpan,
  StructuralRelationTokenSpan,
} from "./types.js";

export function buildStructuralRelationDiagnostic(options: {
  readonly name: StructuralRelationDiagnosticName;
  readonly severity: StructuralRelationDiagnosticSeverity;
  readonly message: string;
  readonly relationKind?: string;
  readonly confidence?: StructuralRelationConfidence;
  readonly layoutBoundaryPolicy?: StructuralRelationLayoutBoundaryPolicy;
  readonly clauseId?: string;
  readonly span?: StructuralRelationTokenSpan;
  readonly markerSpans?: readonly StructuralRelationMarkerSpan[];
}): StructuralRelationDiagnostic {
  return {
    name: options.name,
    severity: options.severity,
    message: options.message,
    ...(options.relationKind === undefined ? {} : { relationKind: options.relationKind }),
    ...(options.confidence === undefined ? {} : { confidence: options.confidence }),
    ...(options.layoutBoundaryPolicy === undefined ? {} : { layoutBoundaryPolicy: options.layoutBoundaryPolicy }),
    ...(options.clauseId === undefined ? {} : { clauseId: options.clauseId }),
    ...(options.span === undefined ? {} : { span: options.span }),
    ...(options.markerSpans === undefined ? {} : { markerSpans: options.markerSpans }),
  };
}

export function structuralRelationDegraded(options: {
  readonly message: string;
  readonly relationKind?: string;
  readonly confidence?: StructuralRelationConfidence;
  readonly layoutBoundaryPolicy?: StructuralRelationLayoutBoundaryPolicy;
  readonly clauseId?: string;
  readonly span?: StructuralRelationTokenSpan;
  readonly markerSpans?: readonly StructuralRelationMarkerSpan[];
}): StructuralRelationDiagnostic {
  return buildStructuralRelationDiagnostic({
    name: "structural_relation_degraded",
    severity: "warning",
    ...options,
  });
}

export function layoutBlocker(options: {
  readonly message: string;
  readonly relationKind?: string;
  readonly confidence?: StructuralRelationConfidence;
  readonly layoutBoundaryPolicy?: StructuralRelationLayoutBoundaryPolicy;
  readonly clauseId?: string;
  readonly span?: StructuralRelationTokenSpan;
  readonly markerSpans?: readonly StructuralRelationMarkerSpan[];
}): StructuralRelationDiagnostic {
  return buildStructuralRelationDiagnostic({
    name: "layout_blocker",
    severity: "warning",
    ...options,
  });
}

export function relationConflict(options: {
  readonly message: string;
  readonly relationKind?: string;
  readonly confidence?: StructuralRelationConfidence;
  readonly layoutBoundaryPolicy?: StructuralRelationLayoutBoundaryPolicy;
  readonly clauseId?: string;
  readonly span?: StructuralRelationTokenSpan;
  readonly markerSpans?: readonly StructuralRelationMarkerSpan[];
}): StructuralRelationDiagnostic {
  return buildStructuralRelationDiagnostic({
    name: "relation_conflict",
    severity: "warning",
    ...options,
  });
}

export function projectionUnavailable(options: {
  readonly message: string;
  readonly relationKind?: string;
  readonly confidence?: StructuralRelationConfidence;
  readonly layoutBoundaryPolicy?: StructuralRelationLayoutBoundaryPolicy;
  readonly clauseId?: string;
  readonly span?: StructuralRelationTokenSpan;
  readonly markerSpans?: readonly StructuralRelationMarkerSpan[];
}): StructuralRelationDiagnostic {
  return buildStructuralRelationDiagnostic({
    name: "projection_unavailable",
    severity: "info",
    ...options,
  });
}
