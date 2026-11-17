import { lazyValue } from "../../../../data-loader.js";
import {
  loadHeadTailStringSetTable,
  requireHeadTailStringSet
} from "../../data/string-set-table.js";

const TOSURU_RESULTATIVE_HEAD_SET_IDS = new Set([
  "resultative_make_heads"
] as const);

export const TOSURU_RESULTATIVE_MAKE_HEADS: ReadonlySet<string> = lazyValue(() =>
  requireHeadTailStringSet(
    loadHeadTailStringSetTable("tosuru_resultative_heads.jsonl", TOSURU_RESULTATIVE_HEAD_SET_IDS),
    "resultative_make_heads"
  )
);
