import { assertNever, type AspectKind, type AuxOpNode, type IdiomKind } from "./grammar.js";

export const HEAD_AUX_OP_KINDS = [
  "postverbAuxiliary",
  "predicateProjectionCarrier",
  "predicateQuoteCarrier",
  "predicateSuffix",
  "aspect",
  "modal",
  "scopeBridge",
  "desire",
  "voice",
  "conjecture",
  "idiom"
] as const;

const SIMPLE_ASPECT_KIND_VALUES = [
  "te_iru", "te_aru", "te_iku", "te_kuru", "te_oku", "te_shimau", "te_miru", "te_mawaru", "tsutsu_aru"
] as const satisfies readonly AspectKind[];
const SIMPLE_ASPECT_KINDS: ReadonlySet<AspectKind> = new Set(SIMPLE_ASPECT_KIND_VALUES);

export const CHAINABLE_ASPECT_KIND_VALUES = [
  ...SIMPLE_ASPECT_KIND_VALUES,
  "te_morau", "te_ageru", "te_kureru", "te_kudasaru", "te_itadaku",
  "te_moraeru", "te_itadakeru",
  "te_hoshii",
  "te_miseru"
] as const satisfies readonly AspectKind[];
const CHAINABLE_ASPECT_KINDS: ReadonlySet<AspectKind> = new Set(CHAINABLE_ASPECT_KIND_VALUES);

export const CHAINABLE_IDIOM_KIND_VALUES = [
  "obligation",
  "permission",
  "sufficiency_conditional",
  "te_evaluation",
  "potential_koto_ga_dekiru",
  "forbidden",
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
const CHAINABLE_IDIOM_KINDS: ReadonlySet<IdiomKind> = new Set(CHAINABLE_IDIOM_KIND_VALUES);

export function isSimpleAspectOpKind(aspect: AspectKind): boolean {
  return SIMPLE_ASPECT_KINDS.has(aspect);
}

export function isChainableAspectOpKind(aspect: AspectKind): boolean {
  return CHAINABLE_ASPECT_KINDS.has(aspect);
}

export function isChainableIdiomOpKind(idiom: IdiomKind): boolean {
  return CHAINABLE_IDIOM_KINDS.has(idiom);
}

function isHeadOpCore(op: AuxOpNode, chainableOnly: boolean): boolean {
  if (op.kind === "postverbAuxiliary") return true;
  if (op.kind === "predicateProjectionCarrier") return true;
  if (op.kind === "predicateQuoteCarrier") return true;
  if (op.kind === "predicateSuffix") return true;
  if (op.kind === "aspect") return chainableOnly ? CHAINABLE_ASPECT_KINDS.has(op.aspect) : true;
  return op.kind === "modal" || op.kind === "scopeBridge" ||
    op.kind === "desire" || op.kind === "voice" ||
    op.kind === "conjecture" ||
    (op.kind === "idiom" && isChainableIdiomOpKind(op.idiom));
}

export function isChainableHeadOp(op: AuxOpNode): boolean {
  return isHeadOpCore(op, true);
}

export function isHeadOp(op: AuxOpNode): boolean {
  return isHeadOpCore(op, false);
}

export function isOperatorWrapBoundaryHeadOp(op: AuxOpNode): boolean {
  return op.kind === "connective" || isHeadOp(op);
}

export function terminalPolarityScopeStart(ops: readonly AuxOpNode[]): number {
  let lastTeComplementIdx = -1;
  for (let idx = 0; idx < ops.length; idx += 1) {
    if (ops[idx]?.kind === "aspect") {
      lastTeComplementIdx = idx;
    }
  }
  return lastTeComplementIdx + 1;
}

export function operatorCreatesPotentialPredicate(op: AuxOpNode): boolean {
  if (op.kind === "voice") {
    return op.voice === "potential";
  }
  if (op.kind === "idiom") {
    return op.idiom === "potential_koto_ga_dekiru";
  }
  return op.kind === "postverbAuxiliary" &&
    (op.auxiliary.kind === "potential" ||
      op.auxiliary.kind === "completion_potential" ||
      op.auxiliary.kind === "adverbial_potential");
}

export function operatorCreatesSourceVerbalPredicate(op: AuxOpNode): boolean {
  return sourceVerbalPredicateAfterAuxOp(false, op);
}

export function sourceVerbalPredicateAfterAuxOp(
  current: boolean,
  op: AuxOpNode,
): boolean {
  switch (op.kind) {
    case "postverbAuxiliary":
    case "voice":
      return true;
    case "aspect":
      switch (op.aspect) {
        case "te_hoshii":
          return false;
        case "te_iru":
        case "te_aru":
        case "te_iku":
        case "te_kuru":
        case "te_oku":
        case "te_shimau":
        case "te_miru":
        case "te_mawaru":
        case "tsutsu_aru":
        case "te_ageru":
        case "te_kureru":
        case "te_kudasaru":
        case "te_morau":
        case "te_itadaku":
        case "te_moraeru":
        case "te_itadakeru":
        case "te_kudasai":
        case "te_kure_tanomu":
        case "naide_kudasai":
        case "te_miseru":
          return true;
        default:
          return assertNever(op);
      }
    case "predicateSuffix":
      return false;
    case "desire":
      return op.form === "tagaru";
    case "modal":
      switch (op.modal) {
        case "rashii":
          return false;
        case "wake":
        case "hazu":
        case "kamo":
        case "noda":
        case "youda":
        case "souda_hearsay":
        case "tsumori":
        case "tokoro":
        case "mai":
        case "mono":
          return current;
        case "limit_negation":
          return true;
        default:
          return assertNever(op);
      }
    case "predicateProjectionCarrier":
      {
        const sourceAllomorph = op.sourceAllomorph;
        switch (sourceAllomorph) {
        case "limit_verb_support":
        case "recent_past_verb_support":
        case "certainty_verb_support":
          return true;
        case "limit_bare":
        case "limit_copular":
        case "recent_past_adnominal":
        case "recent_past_copular":
        case "certainty_adjectival":
        case "equivalence_bare":
        case "equivalence_copular":
        case "equivalence_adnominal":
        case "dokoro_situation_deictic":
        case "dokoro_situation_sahen":
        case "dokoro_situation_verb":
        case "dokoro_scalar":
          return false;
        case "imminent_adnominal":
        case "imminent_adverbial":
        case "imminent_copular":
          return false;
        case null:
          return current;
        default:
          return assertNever(sourceAllomorph);
        }
      }
    case "idiom":
      switch (op.idiom) {
        case "potential_koto_ga_dekiru":
          return true;
        case "forbidden":
          {
            const sourceAllomorph = op.sourceAllomorph;
            switch (sourceAllomorph) {
            case "verb_ikeru":
            case "verb_naru":
            case "verb_iku":
            case "verb_dialect_aku":
              return true;
            case "copular_dame":
              return false;
            default:
              return assertNever(sourceAllomorph);
            }
          }
        case "obligation":
        case "permission":
        case "sufficiency_conditional":
        case "te_evaluation":
        case "negative_necessity_sumu":
        case "negative_necessity_koto_wa":
        case "inevitable_zaru_o_enai":
        case "cannot_refrain_negative_dewa_irarenai":
        case "method_you_ga_nai":
        case "wake_impossible":
        case "negative_necessity_made_mo":
        case "only_option_shika_nai":
        case "experience_koto_ga_aru":
        case "decision_koto_ni_suru":
        case "outcome_koto_ni_naru":
        case "degree_intensifier":
          return current;
        default:
          return assertNever(op);
      }
    case "predicateQuoteCarrier":
      {
        const style = op.style;
        switch (style) {
          case "suru_attributive":
          case "naru_result":
            return true;
          case "compact_toiu":
          case "question_toiu": {
            const allomorph = op.allomorph;
            switch (allomorph) {
              case "toiu":
              case "tteiu":
                return true;
              case "other":
                return current;
              default:
                return assertNever(allomorph);
            }
          }
          default:
            return assertNever(style);
        }
      }
    case "negation":
    case "tense":
    case "polite":
    case "classicalAuxResidue":
    case "conjecture":
    case "copula":
    case "scopeBridge":
    case "adjCopulaBridge":
    case "connective":
      return current;
    default:
      return assertNever(op);
  }
}

export function multiAspectPathCanUseOperatorFold(
  ops: readonly Extract<AuxOpNode, { readonly kind: "aspect" }>[]
): boolean {
  return ops.length >= 2 && ops.every(isChainableHeadOp);
}
