import { lazyValue } from "../../../../data-loader.js";
import type { RuntimeHaruToken } from "../../../../types/token.js";
import { isAuxiliaryStemToken } from "../../../../types/pos.js";
import {
  loadHeadTailStringSetTable,
  requireHeadTailStringSet
} from "../../data/string-set-table.js";
import type { AttributiveBoundaryHeadKind } from "./grammar.js";

type StructuralAttributiveHeadSetId =
  | "future_commitment"
  | "scope_or_bound"
  | "assembler_resumable_scope_carrier"
  | "inferential_bound"
  | "likeness_transparent_formal_noun"
  | "likeness_place_aspect_head"
  | "reason_or_purpose"
  | "likeness"
  | "stative_point"
  | "external_relation"
  | "external_relation_nominal_modifier"
  | "obligatorily_modified_formal_noun"
  | "quoted_topic_formal_noun"
  | "toiu_appositive_content_head";

const STRUCTURAL_ATTRIBUTIVE_HEAD_SET_IDS = new Set<StructuralAttributiveHeadSetId>([
  "future_commitment",
  "scope_or_bound",
  "assembler_resumable_scope_carrier",
  "inferential_bound",
  "likeness_transparent_formal_noun",
  "likeness_place_aspect_head",
  "reason_or_purpose",
  "likeness",
  "stative_point",
  "external_relation",
  "external_relation_nominal_modifier",
  "obligatorily_modified_formal_noun",
  "quoted_topic_formal_noun",
  "toiu_appositive_content_head"
]);

const STRUCTURAL_ATTRIBUTIVE_HEAD_SETS: ReadonlyMap<string, ReadonlySet<string>> = lazyValue(() => loadHeadTailStringSetTable(
  "structural_attributive_heads.jsonl",
  STRUCTURAL_ATTRIBUTIVE_HEAD_SET_IDS
));

const ATTRIBUTIVE_FUTURE_COMMITMENT_HEADS: ReadonlySet<string> = lazyValue(() => requireHeadTailStringSet(
  STRUCTURAL_ATTRIBUTIVE_HEAD_SETS,
  "future_commitment"
));
const ATTRIBUTIVE_SCOPE_OR_BOUND_HEADS: ReadonlySet<string> = lazyValue(() => requireHeadTailStringSet(
  STRUCTURAL_ATTRIBUTIVE_HEAD_SETS,
  "scope_or_bound"
));
const ASSEMBLER_RESUMABLE_SCOPE_CARRIER_HEADS: ReadonlySet<string> = lazyValue(() => requireHeadTailStringSet(
  STRUCTURAL_ATTRIBUTIVE_HEAD_SETS,
  "assembler_resumable_scope_carrier"
));
const ATTRIBUTIVE_INFERENTIAL_BOUND_HEADS: ReadonlySet<string> = lazyValue(() => requireHeadTailStringSet(
  STRUCTURAL_ATTRIBUTIVE_HEAD_SETS,
  "inferential_bound"
));
const ATTRIBUTIVE_LIKENESS_TRANSPARENT_FORMAL_NOUN_HEADS: ReadonlySet<string> = lazyValue(() => requireHeadTailStringSet(
  STRUCTURAL_ATTRIBUTIVE_HEAD_SETS,
  "likeness_transparent_formal_noun"
));
const ATTRIBUTIVE_LIKENESS_PLACE_ASPECT_HEADS: ReadonlySet<string> = lazyValue(() => requireHeadTailStringSet(
  STRUCTURAL_ATTRIBUTIVE_HEAD_SETS,
  "likeness_place_aspect_head"
));
const ATTRIBUTIVE_REASON_OR_PURPOSE_HEADS: ReadonlySet<string> = lazyValue(() => requireHeadTailStringSet(
  STRUCTURAL_ATTRIBUTIVE_HEAD_SETS,
  "reason_or_purpose"
));
const ATTRIBUTIVE_LIKENESS_HEADS: ReadonlySet<string> = lazyValue(() => requireHeadTailStringSet(
  STRUCTURAL_ATTRIBUTIVE_HEAD_SETS,
  "likeness"
));
const ATTRIBUTIVE_STATIVE_POINT_HEADS: ReadonlySet<string> = lazyValue(() => requireHeadTailStringSet(
  STRUCTURAL_ATTRIBUTIVE_HEAD_SETS,
  "stative_point"
));
const ATTRIBUTIVE_EXTERNAL_RELATION_HEADS: ReadonlySet<string> = lazyValue(() => requireHeadTailStringSet(
  STRUCTURAL_ATTRIBUTIVE_HEAD_SETS,
  "external_relation"
));
const ATTRIBUTIVE_EXTERNAL_RELATION_NOMINAL_MODIFIER_HEADS: ReadonlySet<string> = lazyValue(() => requireHeadTailStringSet(
  STRUCTURAL_ATTRIBUTIVE_HEAD_SETS,
  "external_relation_nominal_modifier"
));
const OBLIGATORILY_MODIFIED_FORMAL_NOUN_HEADS: ReadonlySet<string> = lazyValue(() => requireHeadTailStringSet(
  STRUCTURAL_ATTRIBUTIVE_HEAD_SETS,
  "obligatorily_modified_formal_noun"
));
const QUOTED_TOPIC_FORMAL_NOUN_HEADS: ReadonlySet<string> = lazyValue(() => requireHeadTailStringSet(
  STRUCTURAL_ATTRIBUTIVE_HEAD_SETS,
  "quoted_topic_formal_noun"
));
const TOIU_APPOSITIVE_CONTENT_HEADS: ReadonlySet<string> = lazyValue(() => requireHeadTailStringSet(
  STRUCTURAL_ATTRIBUTIVE_HEAD_SETS,
  "toiu_appositive_content_head"
));

export function classifyAttributiveHeadKind(token: RuntimeHaruToken): AttributiveBoundaryHeadKind {
  const key = token.dictionaryForm;
  const surface = token.surface;
  if (ATTRIBUTIVE_FUTURE_COMMITMENT_HEADS.has(key) || ATTRIBUTIVE_FUTURE_COMMITMENT_HEADS.has(surface)) {
    return "future_commitment";
  }
  if (ATTRIBUTIVE_SCOPE_OR_BOUND_HEADS.has(key) || ATTRIBUTIVE_SCOPE_OR_BOUND_HEADS.has(surface)) {
    return "scope_or_bound";
  }
  if (ATTRIBUTIVE_REASON_OR_PURPOSE_HEADS.has(key) || ATTRIBUTIVE_REASON_OR_PURPOSE_HEADS.has(surface)) {
    return "reason_or_purpose";
  }
  if (
    isAuxiliaryStemToken(token) &&
    (ATTRIBUTIVE_LIKENESS_HEADS.has(key) || ATTRIBUTIVE_LIKENESS_HEADS.has(surface))
  ) {
    return "likeness";
  }
  if (ATTRIBUTIVE_STATIVE_POINT_HEADS.has(key) || ATTRIBUTIVE_STATIVE_POINT_HEADS.has(surface)) {
    return "stative_point";
  }
  if (ATTRIBUTIVE_EXTERNAL_RELATION_HEADS.has(key) || ATTRIBUTIVE_EXTERNAL_RELATION_HEADS.has(surface)) {
    return "external_relation";
  }
  return "ordinary_nominal";
}

export function isExternalRelationNominalModifierHead(token: RuntimeHaruToken): boolean {
  return ATTRIBUTIVE_EXTERNAL_RELATION_NOMINAL_MODIFIER_HEADS.has(token.dictionaryForm) ||
    ATTRIBUTIVE_EXTERNAL_RELATION_NOMINAL_MODIFIER_HEADS.has(token.surface);
}

export function isInferentialBoundAttributiveHead(
  token: { readonly surface: string; readonly dictionaryForm?: string }
): boolean {
  return (token.dictionaryForm !== undefined && ATTRIBUTIVE_INFERENTIAL_BOUND_HEADS.has(token.dictionaryForm)) ||
    ATTRIBUTIVE_INFERENTIAL_BOUND_HEADS.has(token.surface);
}

export function isLikenessTransparentFormalNounHead(token: RuntimeHaruToken): boolean {
  return ATTRIBUTIVE_LIKENESS_TRANSPARENT_FORMAL_NOUN_HEADS.has(token.dictionaryForm) ||
    ATTRIBUTIVE_LIKENESS_TRANSPARENT_FORMAL_NOUN_HEADS.has(token.surface);
}

export function isLikenessPlaceAspectAttributiveHead(token: RuntimeHaruToken): boolean {
  return ATTRIBUTIVE_LIKENESS_PLACE_ASPECT_HEADS.has(token.dictionaryForm) ||
    ATTRIBUTIVE_LIKENESS_PLACE_ASPECT_HEADS.has(token.surface);
}

export function isAssemblerResumableScopeCarrierHead(token: RuntimeHaruToken): boolean {
  const key = token.dictionaryForm || token.surface;
  return ASSEMBLER_RESUMABLE_SCOPE_CARRIER_HEADS.has(key) ||
    ASSEMBLER_RESUMABLE_SCOPE_CARRIER_HEADS.has(token.surface);
}

export function isObligatorilyModifiedFormalNounHead(
  token: { readonly surface: string }
): boolean {
  return OBLIGATORILY_MODIFIED_FORMAL_NOUN_HEADS.has(token.surface);
}

export function isQuotedTopicFormalNounHead(token: { readonly surface: string }): boolean {
  return QUOTED_TOPIC_FORMAL_NOUN_HEADS.has(token.surface);
}

export function isToiuAppositiveContentHead(
  token: { readonly surface: string; readonly dictionaryForm?: string }
): boolean {
  return (token.dictionaryForm !== undefined && TOIU_APPOSITIVE_CONTENT_HEADS.has(token.dictionaryForm)) ||
    TOIU_APPOSITIVE_CONTENT_HEADS.has(token.surface);
}
