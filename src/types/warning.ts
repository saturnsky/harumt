
export type WarningSeverity = "info" | "warning" | "error";

export type WarningType =
  | "non_standard_normalize"
  | "ambiguity_default"
  | "out_of_subset_default"
  | "dictionary_entry_issue"
  | "tail_parser_blocked"
  | "nominal_head_blocked"
  | "unsupported_grammar"
  | "partial_tail_suffix_unresolved"
  | "tail_boundary_attachment_weak"
  | "source_disfluency_unrestored"
  | "parenthetical_projection_fallback"
  | "render_fallback"
  | "assembly_invariant"
  | "reanalysis_flip_skipped"
  | "ruby_fragment_replay_unapplied"
  | "production_ownership_overlap";

export interface Warning {
  readonly type: WarningType;
  readonly severity: WarningSeverity;
  readonly opKind: string;
  readonly candidates?: readonly string[];
  readonly winner?: string;
  readonly span?: {
    readonly start: number;
    readonly end: number;
  };
  readonly message: string;
}

export function warningDedupKey(warning: Warning): string {
  const span = warning.span === undefined ? "" : `${warning.span.start}:${warning.span.end}`;
  const candidates = warning.candidates?.join(",") ?? "";
  return [
    warning.type,
    warning.severity,
    warning.opKind,
    span,
    warning.winner ?? "",
    candidates,
    warning.message
  ].join("\u0000");
}
