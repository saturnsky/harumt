import { lazyValue } from "../../../data-loader.js";
import {
  loadHeadTailStringSetTable,
  requireHeadTailStringSet
} from "./string-set-table.js";

export type NiPredicateComplementSetId =
  | "ni_complement_skip"
  | "ni_complement_m_extent"
  | "ni_complement_outcome"
  | "ni_complement_worth"
  | "ni_complement_cannot_bear";

const NI_PREDICATE_COMPLEMENT_SET_IDS = new Set<NiPredicateComplementSetId>([
  "ni_complement_skip",
  "ni_complement_m_extent",
  "ni_complement_outcome",
  "ni_complement_worth",
  "ni_complement_cannot_bear"
]);

const NI_PREDICATE_COMPLEMENT_SETS = lazyValue(() => loadHeadTailStringSetTable(
  "ni_predicate_complements.jsonl",
  NI_PREDICATE_COMPLEMENT_SET_IDS
));

export const NI_COMPLEMENT_SKIP_MATRICES: ReadonlySet<string> = lazyValue(() => requireHeadTailStringSet(
  NI_PREDICATE_COMPLEMENT_SETS,
  "ni_complement_skip"
));

export const NI_COMPLEMENT_M_EXTENT_MATRICES: ReadonlySet<string> = lazyValue(() => requireHeadTailStringSet(
  NI_PREDICATE_COMPLEMENT_SETS,
  "ni_complement_m_extent"
));

export const NI_COMPLEMENT_OUTCOME_MATRICES: ReadonlySet<string> = lazyValue(() => requireHeadTailStringSet(
  NI_PREDICATE_COMPLEMENT_SETS,
  "ni_complement_outcome"
));

export const NI_COMPLEMENT_WORTH_MATRICES: ReadonlySet<string> = lazyValue(() => requireHeadTailStringSet(
  NI_PREDICATE_COMPLEMENT_SETS,
  "ni_complement_worth"
));

export const NI_COMPLEMENT_CANNOT_BEAR_MATRICES: ReadonlySet<string> = lazyValue(() => requireHeadTailStringSet(
  NI_PREDICATE_COMPLEMENT_SETS,
  "ni_complement_cannot_bear"
));
