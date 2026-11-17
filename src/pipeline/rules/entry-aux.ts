import type { ContentCtx } from "../content-types.js";
import {
  ruleAdverbialAdjective,
  ruleYouda,
  type ModalityResolver
} from "./modality.js";
import type { RuleResult } from "../../types/pipeline.js";
import type { LookupTables } from "../lookup-tables.js";

export type EntryAuxResolver = ModalityResolver;
export type EntryAuxRule = (resolver: EntryAuxResolver, ctx: ContentCtx, isPotential: boolean, lookups: LookupTables) => RuleResult | null | Promise<RuleResult | null>;

export type EntryAuxRuleName =
  | "ruleYouda"
  | "ruleAdverbialAdjective";

export const ENTRY_AUX_RULE_NAMES: readonly EntryAuxRuleName[] = [
  "ruleYouda",
  "ruleAdverbialAdjective"
];

export const ENTRY_AUX_RULES: readonly EntryAuxRule[] = [
  ruleYouda,
  ruleAdverbialAdjective
];
