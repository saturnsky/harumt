import { lazyValue } from "../../../data-loader.js";
import {
  loadHeadTailStringSetTable,
  requireHeadTailStringSet
} from "./string-set-table.js";

export type SemanticHelperSetId =
  | "mono_no_adversative_head_nouns"
  | "mono_no_adversative_adverbs"
  | "mono_no_genitive_head_nouns"
  | "pronominal_no_de_predicate_forms"
  | "pronominal_no_de_head_surfaces"
  | "plain_te_permission_attributive_heads"
  | "meta_linguistic_quotative_heads"
  | "typification_quotative_heads"
  | "sfp_na_exclamatory_nominalizers"
  | "you_ni_volitional_manner_hosts"
  | "you_ni_simile_manner_hosts"
  | "you_ni_speech_manner_hosts"
  | "niwa_evaluation_extent_predicates"
  | "wh_indefinite_demo_hosts"
  | "equivalence_carrier_nouns"
  | "carrier_only_equivalence_nouns"
  | "mono_formal_noun_forms"
  | "mono_reason_copula_de_forms"
  | "mono_explanatory_sfp_forms"
  | "volitional_attempt_carrier_predicates"
  | "volitional_intent_content_predicates";

const SEMANTIC_HELPER_SET_IDS = new Set<SemanticHelperSetId>([
  "mono_no_adversative_head_nouns",
  "mono_no_adversative_adverbs",
  "mono_no_genitive_head_nouns",
  "pronominal_no_de_predicate_forms",
  "pronominal_no_de_head_surfaces",
  "plain_te_permission_attributive_heads",
  "meta_linguistic_quotative_heads",
  "typification_quotative_heads",
  "sfp_na_exclamatory_nominalizers",
  "you_ni_volitional_manner_hosts",
  "you_ni_simile_manner_hosts",
  "you_ni_speech_manner_hosts",
  "niwa_evaluation_extent_predicates",
  "wh_indefinite_demo_hosts",
  "equivalence_carrier_nouns",
  "carrier_only_equivalence_nouns",
  "mono_formal_noun_forms",
  "mono_reason_copula_de_forms",
  "mono_explanatory_sfp_forms",
  "volitional_attempt_carrier_predicates",
  "volitional_intent_content_predicates"
]);

const SEMANTIC_HELPER_SETS = lazyValue(() => loadHeadTailStringSetTable(
  "semantic_helper_sets.jsonl",
  SEMANTIC_HELPER_SET_IDS
));

export const MONO_NO_ADVERSATIVE_HEAD_NOUNS: ReadonlySet<string> = lazyValue(() => requireHeadTailStringSet(
  SEMANTIC_HELPER_SETS,
  "mono_no_adversative_head_nouns"
));

export const MONO_NO_ADVERSATIVE_ADVERBS: ReadonlySet<string> = lazyValue(() => requireHeadTailStringSet(
  SEMANTIC_HELPER_SETS,
  "mono_no_adversative_adverbs"
));

export const MONO_NO_GENITIVE_HEAD_NOUNS: ReadonlySet<string> = lazyValue(() => requireHeadTailStringSet(
  SEMANTIC_HELPER_SETS,
  "mono_no_genitive_head_nouns"
));

export const PRONOMINAL_NO_DE_PREDICATE_FORMS: ReadonlySet<string> = lazyValue(() => requireHeadTailStringSet(
  SEMANTIC_HELPER_SETS,
  "pronominal_no_de_predicate_forms"
));

export const PRONOMINAL_NO_DE_HEAD_SURFACES: ReadonlySet<string> = lazyValue(() => requireHeadTailStringSet(
  SEMANTIC_HELPER_SETS,
  "pronominal_no_de_head_surfaces"
));

export const PLAIN_TE_PERMISSION_ATTRIBUTIVE_HEADS: ReadonlySet<string> = lazyValue(() => requireHeadTailStringSet(
  SEMANTIC_HELPER_SETS,
  "plain_te_permission_attributive_heads"
));

export const META_LINGUISTIC_QUOTATIVE_HEADS: ReadonlySet<string> = lazyValue(() => requireHeadTailStringSet(
  SEMANTIC_HELPER_SETS,
  "meta_linguistic_quotative_heads"
));

export const TYPIFICATION_QUOTATIVE_HEADS: ReadonlySet<string> = lazyValue(() => requireHeadTailStringSet(
  SEMANTIC_HELPER_SETS,
  "typification_quotative_heads"
));

export const SFP_NA_EXCLAMATORY_NOMINALIZERS: ReadonlySet<string> = lazyValue(() => requireHeadTailStringSet(
  SEMANTIC_HELPER_SETS,
  "sfp_na_exclamatory_nominalizers"
));

export const YOU_NI_VOLITIONAL_MANNER_HOSTS: ReadonlySet<string> = lazyValue(() => requireHeadTailStringSet(
  SEMANTIC_HELPER_SETS,
  "you_ni_volitional_manner_hosts"
));

export const YOU_NI_SIMILE_MANNER_HOSTS: ReadonlySet<string> = lazyValue(() => requireHeadTailStringSet(
  SEMANTIC_HELPER_SETS,
  "you_ni_simile_manner_hosts"
));

export const YOU_NI_SPEECH_MANNER_HOSTS: ReadonlySet<string> = lazyValue(() => requireHeadTailStringSet(
  SEMANTIC_HELPER_SETS,
  "you_ni_speech_manner_hosts"
));

export const NIWA_EVALUATION_EXTENT_PREDICATES: ReadonlySet<string> = lazyValue(() => requireHeadTailStringSet(
  SEMANTIC_HELPER_SETS,
  "niwa_evaluation_extent_predicates"
));

export const WH_INDEFINITE_DEMO_HOSTS: ReadonlySet<string> = lazyValue(() => requireHeadTailStringSet(
  SEMANTIC_HELPER_SETS,
  "wh_indefinite_demo_hosts"
));

export const EQUIVALENCE_CARRIER_NOUNS: ReadonlySet<string> = lazyValue(() => requireHeadTailStringSet(
  SEMANTIC_HELPER_SETS,
  "equivalence_carrier_nouns"
));

export const CARRIER_ONLY_EQUIVALENCE_NOUNS: ReadonlySet<string> = lazyValue(() => requireHeadTailStringSet(
  SEMANTIC_HELPER_SETS,
  "carrier_only_equivalence_nouns"
));

export const MONO_FORMAL_NOUN_FORMS: ReadonlySet<string> = lazyValue(() => requireHeadTailStringSet(
  SEMANTIC_HELPER_SETS,
  "mono_formal_noun_forms"
));

export const MONO_REASON_COPULA_DE_FORMS: ReadonlySet<string> = lazyValue(() => requireHeadTailStringSet(
  SEMANTIC_HELPER_SETS,
  "mono_reason_copula_de_forms"
));

export const MONO_EXPLANATORY_SFP_FORMS: ReadonlySet<string> = lazyValue(() => requireHeadTailStringSet(
  SEMANTIC_HELPER_SETS,
  "mono_explanatory_sfp_forms"
));

export const VOLITIONAL_ATTEMPT_CARRIER_PREDICATES: ReadonlySet<string> = lazyValue(() => requireHeadTailStringSet(
  SEMANTIC_HELPER_SETS,
  "volitional_attempt_carrier_predicates"
));

export const VOLITIONAL_INTENT_CONTENT_PREDICATES: ReadonlySet<string> = lazyValue(() => requireHeadTailStringSet(
  SEMANTIC_HELPER_SETS,
  "volitional_intent_content_predicates"
));
