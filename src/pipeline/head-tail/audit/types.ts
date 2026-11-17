export type HeadTailGuardrailKind =
  | "owner_evidence_contract"
  | "continuation_matrix"
  | "grammar_case_intake"
  | "compatibility_wrapper_guardrail"
  | "legacy_residual_audit"
  | "module_boundary_audit";

export interface HeadTailGuardrailDescriptor {
  readonly id: string;
  readonly kind: HeadTailGuardrailKind;
  readonly required: boolean;
  readonly description: string;
}
