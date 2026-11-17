import {
  assertNever,
  type AspectKind,
  type AuxOpNode,
  type ConnectiveKind,
  type IdiomKind,
  type ModalKind
} from "./grammar.js";

export const RENDER_SUPPORTED_IDIOM_KINDS = [
  "obligation",
  "permission",
  "sufficiency_conditional",
  "potential_koto_ga_dekiru",
  "forbidden",
  "te_evaluation",
  "negative_necessity_sumu",
  "negative_necessity_koto_wa",
  "inevitable_zaru_o_enai",
  "cannot_refrain_negative_dewa_irarenai",
  "method_you_ga_nai",
  "wake_impossible",
  "negative_necessity_made_mo",
  "only_option_shika_nai",
  "experience_koto_ga_aru",
  "decision_koto_ni_suru",
  "outcome_koto_ni_naru",
  "degree_intensifier"
] as const satisfies readonly IdiomKind[];

export const RENDER_SUPPORTED_MODAL_KINDS = [
  "hazu",
  "kamo",
  "noda",
  "wake",
  "youda",
  "souda_hearsay",
  "rashii",
  "tsumori",
  "tokoro",
  "mai",
  "limit_negation",
  "mono"
] as const satisfies readonly ModalKind[];

export const RENDER_SUPPORTED_ASPECT_KINDS = [
  "te_iru",
  "te_aru",
  "te_oku",
  "te_shimau",
  "te_miru",
  "te_mawaru",
  "te_kuru",
  "te_iku",
  "tsutsu_aru",
  "te_morau",
  "te_ageru",
  "te_kureru",
  "te_kudasaru",
  "te_itadaku",
  "te_moraeru",
  "te_itadakeru",
  "te_kudasai",
  "te_kure_tanomu",
  "naide_kudasai",
  "te_hoshii",
  "te_miseru"
] as const satisfies readonly AspectKind[];

export const RENDER_SUPPORTED_CONNECTIVE_KINDS = [
  "te_form",
  "adversative",
  "conditional",
  "listing",
  "simultaneous",
  "sequence_after",
  "sequence_immediate",
  "stative_hold",
  "temporal_since",
  "reason",
  "reason_quoted_judgment_passive",
  "inevitable_reason",
  "concession",
  "even_if",
  "quotative",
  "alternative",
  "additive_besides",
  "question_content",
  "question_content_alternative",
  "question_quotative",
  "cognitive_complement",
  "wish_complement",
  "request_complement",
  "purpose_evaluation_nominalizer",
  "external_nominalizer_comparison",
  "external_nominalizer_concessive",
  "external_nominalizer_additive",
  "external_nominalizer_conformity",
  "bound_nominal_reason",
  "bound_nominal_listing",
  "tame_reason",
  "tame_purpose",
  "predicate_projection_tame_gerund",
  "predicate_projection_derivational_nominal_m",
  "origin",
  "reformulation",
  "quoted_concessive",
  "retrospective_quotative",
  "question_reformulation",
  "predicate_projection_degree_extent",
  "predicate_projection_quantity_extent",
  "predicate_projection_proportional_reason",
  "predicate_projection_correlative_degree",
  "predicate_projection_comparison",
  "predicate_projection_parallel_change",
  "predicate_projection_repeated_occasion",
  "predicate_projection_occasion",
  "predicate_projection_intentional_purpose",
  "predicate_projection_evaluation_extent",
  "predicate_projection_concession_echo",
  "predicate_projection_until",
  "predicate_projection_until_attributive",
  "predicate_projection_as_far_as",
  "established_premise",
  "predicate_projection_ni_complement",
  "predicate_projection_ni_complement_m",
  "predicate_projection_ni_complement_outcome",
  "predicate_projection_ni_complement_worth",
  "predicate_projection_ni_complement_cannot_bear",
  "predicate_projection_no_quote_reporting",
  "predicate_projection_additive_ue_ni",
  "predicate_projection_ue_de",
  "predicate_projection_ue_de_attributive",
  "predicate_projection_gatera",
  "purpose_motion",
  "volitional_purpose",
  "predicate_projection_purpose_beku",
  "predicate_projection_quote_attributive",
  "predicate_projection_simultaneous_time",
  "focus_additive_denaku",
  "focus_additive_negative",
  "focus_limit_de",
  "focus_limit_nara",
  "recent_past_bakari_ni_reason",
  "focus_reversal_dokoro_ka",
  "exemplification",
  "predicate_projection_purpose",
  "predicate_projection_wish_terminal",
  "predicate_projection_manner_simile",
  "predicate_projection_manner_volitional",
  "predicate_projection_manner_simile_action",
  "predicate_projection_quotative_manner_simile",
  "predicate_projection_quotative_manner_simile_attributive"
] as const satisfies readonly ConnectiveKind[];

const RENDER_SUPPORTED_IDIOM_KIND_SET: ReadonlySet<IdiomKind> = new Set(RENDER_SUPPORTED_IDIOM_KINDS);
const RENDER_SUPPORTED_MODAL_KIND_SET: ReadonlySet<ModalKind> = new Set(RENDER_SUPPORTED_MODAL_KINDS);
const RENDER_SUPPORTED_ASPECT_KIND_SET: ReadonlySet<AspectKind> = new Set(RENDER_SUPPORTED_ASPECT_KINDS);
const RENDER_SUPPORTED_CONNECTIVE_KIND_SET: ReadonlySet<ConnectiveKind> = new Set(RENDER_SUPPORTED_CONNECTIVE_KINDS);

export type RenderSupportOutcome =
  | { readonly ok: true; readonly text: ""; readonly polite: false }
  | { readonly ok: false; readonly reason: string };

export function checkOpInSubset(op: AuxOpNode): RenderSupportOutcome {
  if (op.kind === "negation" || op.kind === "tense" || op.kind === "polite") {
    return { ok: true, text: "", polite: false };
  }
  if (op.kind === "classicalAuxResidue") {
    return { ok: true, text: "", polite: false };
  }
  if (op.kind === "conjecture" || op.kind === "desire" || op.kind === "voice") {
    return { ok: true, text: "", polite: false };
  }
  if (op.kind === "idiom") {
    if (RENDER_SUPPORTED_IDIOM_KIND_SET.has(op.idiom)) {
      return { ok: true, text: "", polite: false };
    }
    return { ok: false, reason: `idiom kind '${op.idiom}' not yet supported` };
  }
  if (op.kind === "modal") {
    if (RENDER_SUPPORTED_MODAL_KIND_SET.has(op.modal)) {
      return { ok: true, text: "", polite: false };
    }
    return { ok: false, reason: `modal kind '${op.modal}' not yet supported` };
  }
  if (op.kind === "scopeBridge") {
    return { ok: true, text: "", polite: false };
  }
  if (op.kind === "copula") {
    return { ok: true, text: "", polite: false };
  }
  if (op.kind === "adjCopulaBridge") {
    return { ok: true, text: "", polite: false };
  }
  if (op.kind === "postverbAuxiliary") {
    return { ok: true, text: "", polite: false };
  }
  if (op.kind === "predicateProjectionCarrier") {
    return { ok: true, text: "", polite: false };
  }
  if (op.kind === "predicateQuoteCarrier") {
    return { ok: true, text: "", polite: false };
  }
  if (op.kind === "predicateSuffix") {
    return { ok: true, text: "", polite: false };
  }
  if (op.kind === "aspect") {
    if (RENDER_SUPPORTED_ASPECT_KIND_SET.has(op.aspect)) {
      return { ok: true, text: "", polite: false };
    }
    return { ok: false, reason: `aspect kind '${op.aspect}' not yet supported` };
  }
  if (op.kind === "connective") {
    if (RENDER_SUPPORTED_CONNECTIVE_KIND_SET.has(op.connective)) {
      return { ok: true, text: "", polite: false };
    }
    return { ok: false, reason: `connective kind '${op.connective}' not yet supported` };
  }
  return assertNever(op);
}
