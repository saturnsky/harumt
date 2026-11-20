
export type ReanalysisFlipKind = "token_substitution" | "rule_reading_pin";

export interface ReanalysisActivation {
  readonly kind: ReanalysisFlipKind;
  readonly rowId: string;
  readonly anchorSourceOrdinal: number | null;
}

export interface ReanalysisConditionResolution {
  readonly id: string;
  readonly met: boolean;
  readonly evidenceNote: string;
}

export interface ReanalysisProposalResolution {
  readonly rowId: string;
  readonly anchorIndex: number;
  readonly anchorSourceOrdinal: number | null;
  readonly flipKind: ReanalysisFlipKind;
  readonly condition: ReanalysisConditionResolution;
  readonly blockers: readonly ReanalysisConditionResolution[];
  readonly confirmed: boolean;
  readonly note?: string;
}

export interface ReanalysisResolutionRecord {
  readonly proposals: readonly ReanalysisProposalResolution[];
}

export interface ReanalysisFlipRequest {
  readonly kind: "reanalysis_flip";
  readonly activations: readonly ReanalysisActivation[];
  readonly resolution: ReanalysisResolutionRecord;
}

export function isReanalysisFlipRequest(value: unknown): value is ReanalysisFlipRequest {
  return typeof value === "object" && value !== null &&
    (value as { kind?: unknown }).kind === "reanalysis_flip";
}

interface RuleReanalysisProposalCarrier {
  reanalysisProposals?: readonly {
    readonly rowId: string;
    readonly consumed: number;
    readonly flipKind: ReanalysisFlipKind;
    readonly conditionId: string;
    readonly blockerIds: readonly string[];
    readonly anchorSourceOrdinal: number | null;
  }[];
  readonly sourceSpan?: { readonly startOrdinal: number } | null;
  readonly sourceOrdinal?: number;
}

export function proposeRuleReanalysis(
  token: RuleReanalysisProposalCarrier,
  proposal: { readonly ruleId: string; readonly conditionId: string; readonly blockerIds?: readonly string[] }
): void {
  const carried = token.reanalysisProposals ?? [];
  if (carried.some((existing) => existing.rowId === proposal.ruleId)) {
    return;
  }
  token.reanalysisProposals = [...carried, {
    rowId: proposal.ruleId,
    consumed: 1,
    flipKind: "rule_reading_pin",
    conditionId: proposal.conditionId,
    blockerIds: proposal.blockerIds ?? [],
    anchorSourceOrdinal: token.sourceSpan?.startOrdinal ?? token.sourceOrdinal ?? null
  }];
}
