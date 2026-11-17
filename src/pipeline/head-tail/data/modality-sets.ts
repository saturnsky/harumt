
import { lazyValue } from "../../../data-loader.js";
import { loadHeadTailStringSetTable, requireHeadTailStringSet } from "./string-set-table.js";

export type ModalitySetId =
  | "retrospective_thought_verbs"
  | "copula_intrinsic_honorific_support_verbs"
  | "copula_mizen_voice_honorific_support_verbs";

const MODALITY_SET_IDS = new Set<ModalitySetId>([
  "retrospective_thought_verbs",
  "copula_intrinsic_honorific_support_verbs",
  "copula_mizen_voice_honorific_support_verbs"
]);

const MODALITY_SETS = lazyValue(() => loadHeadTailStringSetTable(
  "modality_sets.jsonl",
  MODALITY_SET_IDS
));

export const RETROSPECTIVE_THOUGHT_VERBS: ReadonlySet<string> = lazyValue(() => requireHeadTailStringSet(
  MODALITY_SETS,
  "retrospective_thought_verbs"
));

export const COPULA_INTRINSIC_HONORIFIC_SUPPORT_VERBS: ReadonlySet<string> = lazyValue(() => requireHeadTailStringSet(
  MODALITY_SETS,
  "copula_intrinsic_honorific_support_verbs"
));

export const COPULA_MIZEN_VOICE_HONORIFIC_SUPPORT_VERBS: ReadonlySet<string> = lazyValue(() => requireHeadTailStringSet(
  MODALITY_SETS,
  "copula_mizen_voice_honorific_support_verbs"
));
