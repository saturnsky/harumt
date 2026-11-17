import { lazyValue } from "../../data-loader.js";
import { loadHeadTailStringSetTable, requireHeadTailStringSet } from "../head-tail/data/string-set-table.js";
import {
  compoundDispatchFormsForHint
} from "../head-tail/tail/predicate-root/postverb-auxiliary-table.js";

export type CompoundFollowingFormSetId =
  | "non_compound_stream_tails"
  | "grammar_element_tails";

const COMPOUND_FOLLOWING_FORM_SET_IDS = new Set<CompoundFollowingFormSetId>([
  "non_compound_stream_tails",
  "grammar_element_tails"
]);

const COMPOUND_FOLLOWING_FORM_SETS: ReadonlyMap<string, ReadonlySet<string>> = lazyValue(() => loadHeadTailStringSetTable(
  "compound_following_forms.jsonl",
  COMPOUND_FOLLOWING_FORM_SET_IDS
));

let _blockedTailForms: ReadonlySet<string> | undefined;

export function compoundBlockedTailForms(): ReadonlySet<string> {
  if (_blockedTailForms === undefined) {
    _blockedTailForms = new Set([
      ...requireHeadTailStringSet(COMPOUND_FOLLOWING_FORM_SETS, "non_compound_stream_tails"),
      ...requireHeadTailStringSet(COMPOUND_FOLLOWING_FORM_SETS, "grammar_element_tails")
    ]);
  }
  return _blockedTailForms;
}

export function sahenProductiveFollowingForms(): ReadonlySet<string> {
  return compoundDispatchFormsForHint("sahen", "sahen_productive");
}

export function tailOnlyProductiveFollowingForms(): ReadonlySet<string> {
  return compoundDispatchFormsForHint("stream", "tail_only_productive");
}

export function uruPotentialTailForms(): ReadonlySet<string> {
  return compoundDispatchFormsForHint("stream", "potential_tail");
}

export function colloquialIntensiveTailForms(): ReadonlySet<string> {
  return compoundDispatchFormsForHint("stream", "colloquial_intensive");
}
