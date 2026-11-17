
import { lazyValue } from "../../../data-loader.js";
import {
  loadHeadTailStringSetTable,
  requireHeadTailStringArray,
  requireHeadTailStringSet
} from "./string-set-table.js";

export type QuotedReportingSetId =
  | "iu_lexeme_forms"
  | "passive_direct_extra_forms"
  | "sareru_forms"
  | "adversative_surfaces"
  | "nominal_exemplification_quote_markers";

const QUOTED_REPORTING_SET_IDS = new Set<QuotedReportingSetId>([
  "iu_lexeme_forms",
  "passive_direct_extra_forms",
  "sareru_forms",
  "adversative_surfaces",
  "nominal_exemplification_quote_markers"
]);

const QUOTED_REPORTING_SETS = lazyValue(() => loadHeadTailStringSetTable(
  "quoted_reporting_sets.jsonl",
  QUOTED_REPORTING_SET_IDS
));

export const IU_LEXEME_FORMS: ReadonlySet<string> = lazyValue(() => requireHeadTailStringSet(
  QUOTED_REPORTING_SETS,
  "iu_lexeme_forms"
));

export const NOMINAL_EXEMPLIFICATION_QUOTE_MARKERS: ReadonlySet<string> = lazyValue(() => requireHeadTailStringSet(
  QUOTED_REPORTING_SETS,
  "nominal_exemplification_quote_markers"
));

export const QUOTED_REPORTING_PASSIVE_DIRECT_FORMS: readonly string[] = lazyValue(() => [
  ...IU_LEXEME_FORMS,
  ...requireHeadTailStringArray(QUOTED_REPORTING_SETS, "passive_direct_extra_forms")
]);

export const QUOTED_REPORTING_SARERU_FORMS: readonly string[] = lazyValue(() => requireHeadTailStringArray(
  QUOTED_REPORTING_SETS,
  "sareru_forms"
));

export const QUOTED_REPORTING_ADVERSATIVE_SURFACES: ReadonlySet<string> = lazyValue(() => requireHeadTailStringSet(
  QUOTED_REPORTING_SETS,
  "adversative_surfaces"
));
