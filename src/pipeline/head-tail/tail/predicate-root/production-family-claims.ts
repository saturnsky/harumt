import type {
  ProductionClaimExpression as Expr,
  ProductionClaimOpSelector
} from "./production-claim-access.js";
import {
  productionOpPattern,
  type AspectPredicateArgs,
  type BenefactiveAspectPredicateArgs,
  type ConnectivePredicateArgs,
  type CopulaPredicateArgs,
  type ForbiddenIdiomPredicateArgs,
  type ModalPredicateArgs,
  type NegationPredicateArgs,
  type NegativeNecessitySumuIdiomPredicateArgs,
  type ObligationIdiomPredicateArgs,
  type PostverbAuxiliaryPredicateArgs,
  type PotentialKotoDekiruPredicateArgs,
  type PermissionIdiomPredicateArgs,
  type PredicateProjectionCarrierPredicateArgs,
  type PredicateQuoteCarrierPredicateArgs,
  type ProductionOpPredicatePattern,
  type RequestAspectPredicateArgs,
  type ScopeBridgePredicateArgs,
  type SoudaHearsayModalPredicateArgs,
  type TensePredicateArgs,
  type VoicePredicateArgs,
  type YoudaModalPredicateArgs
} from "./production-admission-contract.js";
import {
  HEAD_AUX_OP_KINDS
} from "./operator-head.js";

type ExpressionOf<K extends Expr["kind"]> = Extract<Expr, { readonly kind: K }>;
type FirstSelector = Extract<ProductionClaimOpSelector, { readonly kind: "first_of_kinds" }>;

const all = (...terms: readonly Expr[]): Expr => ({ kind: "all", terms });
const any = (...terms: readonly Expr[]): Expr => ({ kind: "any", terms });
const not = (term: Expr): Expr => ({ kind: "not", term });
const lengthEquals = (value: number): Expr => ({
  kind: "sequence_length",
  comparison: "equals",
  value
});
const lengthAtLeast = (value: number): Expr => ({
  kind: "sequence_length",
  comparison: "at_least",
  value
});
const absolute = (index: number): ProductionClaimOpSelector => ({ kind: "absolute", index });
const relative = (offset: number): ProductionClaimOpSelector => ({ kind: "relative", offset });
const first = (
  opKinds: FirstSelector["opKinds"],
  offset: number,
  startIndex?: number
): ProductionClaimOpSelector => ({
  kind: "first_of_kinds",
  opKinds,
  offset,
  ...(startIndex === undefined ? {} : { startIndex })
});
const op = (
  selector: ProductionClaimOpSelector,
  ...patterns: readonly ProductionOpPredicatePattern[]
): Expr => ({
  kind: "sequence_op",
  selector,
  patterns
});
const kind = (value: ProductionOpPredicatePattern["kind"]): ProductionOpPredicatePattern => ({
  kind: value
} as ProductionOpPredicatePattern);
const connective = (args: ConnectivePredicateArgs = {}): ProductionOpPredicatePattern =>
  productionOpPattern("connective", "connective_fields", args);
const typedConditionalQuote = (): ProductionOpPredicatePattern =>
  productionOpPattern("connective", "typed_conditional_quote", {});
const copulaPattern = (args: CopulaPredicateArgs = {}): ProductionOpPredicatePattern =>
  productionOpPattern("copula", "copula_fields", args);
const tense = (args: TensePredicateArgs = {}): ProductionOpPredicatePattern =>
  productionOpPattern("tense", "tense_fields", args);
const modal = (args: ModalPredicateArgs = {}): ProductionOpPredicatePattern =>
  productionOpPattern("modal", "modal_fields", args);
const youdaModal = (args: YoudaModalPredicateArgs = {}): ProductionOpPredicatePattern =>
  productionOpPattern("modal", "youda_modal_fields", args);
const soudaHearsayModal = (
  args: SoudaHearsayModalPredicateArgs = {}
): ProductionOpPredicatePattern =>
  productionOpPattern("modal", "souda_hearsay_modal_fields", args);
const scopeBridge = (args: ScopeBridgePredicateArgs = {}): ProductionOpPredicatePattern =>
  productionOpPattern("scopeBridge", "scope_bridge_fields", args);
const aspect = (args: AspectPredicateArgs = {}): ProductionOpPredicatePattern =>
  productionOpPattern("aspect", "aspect_fields", args);
const benefactiveAspect = (
  args: BenefactiveAspectPredicateArgs
): ProductionOpPredicatePattern =>
  productionOpPattern("aspect", "benefactive_aspect", args);
const voice = (args: VoicePredicateArgs): ProductionOpPredicatePattern =>
  productionOpPattern("voice", "voice_fields", args);
const postverbAuxiliary = (
  args: PostverbAuxiliaryPredicateArgs
): ProductionOpPredicatePattern =>
  productionOpPattern("postverbAuxiliary", "postverb_auxiliary_fields", args);
const potentialKotoDekiru = (
  args: PotentialKotoDekiruPredicateArgs
): ProductionOpPredicatePattern =>
  productionOpPattern("idiom", "potential_koto_dekiru_fields", args);
const negation = (
  args: NegationPredicateArgs
): ProductionOpPredicatePattern =>
  productionOpPattern("negation", "negation_fields", args);
const quoteCarrier = (
  args: PredicateQuoteCarrierPredicateArgs = {}
): ProductionOpPredicatePattern =>
  productionOpPattern("predicateQuoteCarrier", "predicate_quote_carrier_fields", args);
const projectionCarrier = (
  args: PredicateProjectionCarrierPredicateArgs = {}
): ProductionOpPredicatePattern =>
  productionOpPattern(
    "predicateProjectionCarrier",
    "predicate_projection_carrier_fields",
    args
  );
const plainTeHoshii = (): ProductionOpPredicatePattern =>
  productionOpPattern("aspect", "plain_te_hoshii", {});
const requestAspect = (args: RequestAspectPredicateArgs = {}): ProductionOpPredicatePattern =>
  productionOpPattern("aspect", "request_aspect", args);
const requestCommandBase = (): readonly ProductionOpPredicatePattern[] => [
  productionOpPattern("aspect", "request_command_base_aspect", {}),
  kind("postverbAuxiliary"),
  kind("voice")
];
const chainableAspect = (): ProductionOpPredicatePattern =>
  productionOpPattern("aspect", "chainable_aspect", {});
const chainableIdiom = (): ProductionOpPredicatePattern =>
  productionOpPattern("idiom", "chainable_idiom", {});
const permissionIdiom = (
  args: PermissionIdiomPredicateArgs = {}
): ProductionOpPredicatePattern =>
  productionOpPattern("idiom", "permission_idiom_fields", args);
const forbiddenIdiom = (
  args: ForbiddenIdiomPredicateArgs = {}
): ProductionOpPredicatePattern =>
  productionOpPattern("idiom", "forbidden_idiom_fields", args);
const obligationIdiom = (
  args: ObligationIdiomPredicateArgs = {}
): ProductionOpPredicatePattern =>
  productionOpPattern("idiom", "obligation_idiom_fields", args);
const negativeNecessitySumuIdiom = (
  args: NegativeNecessitySumuIdiomPredicateArgs = {}
): ProductionOpPredicatePattern =>
  productionOpPattern("idiom", "negative_necessity_sumu_idiom_fields", args);
const opPresence = (selector: ProductionClaimOpSelector, isPresent: boolean): Expr => ({
  kind: "sequence_op_presence",
  selector,
  present: isPresent
});
const aggregate = (id: string): Expr => ({ kind: "aggregate", id });
const kindCount = (
  opKinds: ExpressionOf<"kind_count">["opKinds"],
  cap: number,
  comparison: "equals" | "greater_than",
  value: number
): Expr => ({ kind: "kind_count", opKinds, cap, comparison, value });
const terminal = (...values: ExpressionOf<"terminal_membership">["values"]): Expr => ({
  kind: "terminal_membership",
  values
});
const quoteBinding = (
  ...values: Extract<Expr, { readonly kind: "root_membership" }>["values"]
): Expr => ({ kind: "root_membership", axis: "quote_binding", values });
function host(
  axis: "stem_kind",
  ...values: Extract<Expr, { readonly kind: "host_membership"; readonly axis: "stem_kind" }>["values"]
): Expr;
function host(
  axis: "stem_mood",
  ...values: Extract<Expr, { readonly kind: "host_membership"; readonly axis: "stem_mood" }>["values"]
): Expr;
function host(
  axis: "source_predicate_shape",
  ...values: Extract<
    Expr,
    { readonly kind: "host_membership"; readonly axis: "source_predicate_shape" }
  >["values"]
): Expr;
function host(
  axis: "source_clause_closing",
  ...values: readonly boolean[]
): Expr;
function host(
  axis: "stem_kind" | "stem_mood" | "source_predicate_shape" | "source_clause_closing",
  ...values: readonly unknown[]
): Expr {
  return { kind: "host_membership", axis, values } as Expr;
}
const projection = (
  mode: "supports_kind" | "supports_category" | "admits_only_category",
  value: ExpressionOf<"projection">["value"]
): Expr => ({ kind: "projection", mode, value });

const WISH_COMPLEMENT_AT = (selector: ProductionClaimOpSelector): Expr => op(
  selector,
  connective({ connectiveIn: ["wish_complement"] })
);
const QUOTE_TERMINAL_AT = (selector: ProductionClaimOpSelector): Expr => op(
  selector,
  connective({ connectiveIn: ["quotative", "question_quotative"] })
);
const TYPED_CONDITIONAL_QUOTE_AT = (selector: ProductionClaimOpSelector): Expr =>
  op(selector, typedConditionalQuote());
const NEGATED_TO_CONDITIONAL_ALIAS = all(
  op(
    relative(-2),
    connective({
      connectiveIn: ["quotative"],
      conditionalFlavor: "absent",
      conditionalQuoteEllipsisNotIn: ["prohibitive_concern"]
    })
  ),
  op(relative(-3), kind("negation"))
);
const CHAINABLE_HEAD_AT = (selector: ProductionClaimOpSelector): Expr => any(
  op(
    selector,
    ...HEAD_AUX_OP_KINDS
      .filter((opKind) => opKind !== "aspect" && opKind !== "idiom")
      .map(kind)
  ),
  op(selector, chainableAspect()),
  op(selector, chainableIdiom())
);

export const ATTRIBUTIVE_INTERNAL_TE_CLAIM: Expr = all(
  not(kindCount(["predicateQuoteCarrier"], 1, "greater_than", 0)),
  any(
    projection("supports_kind", "direct_verbal"),
    projection("supports_kind", "direct_adjectival")
  ),
  kindCount(["connective"], 2, "equals", 1),
  op(first(HEAD_AUX_OP_KINDS, -1), connective({ connectiveIn: ["te_form"] })),
  CHAINABLE_HEAD_AT(first(HEAD_AUX_OP_KINDS, 0))
);

const LEGACY_EXEMPLIFICATION_SHAPE = any(
  aggregate("has_exemplification"),
  all(
    op(relative(-2), connective({ connectiveIn: ["quotative"] })),
    op(relative(-1), connective({ connectiveIn: ["question_content"] }))
  )
);

const CARRIER_INTERNAL_NORMALIZATION = all(
  op(first(["predicateQuoteCarrier"], 0, 1), kind("predicateQuoteCarrier")),
  aggregate("carrier_normalization_listing_te")
);

const LEGACY_CARRIER_CONTEXT_LICENSE = all(
  op(first(["predicateQuoteCarrier"], 0), kind("predicateQuoteCarrier")),
  any(
    all(QUOTE_TERMINAL_AT(relative(-1)), aggregate("carrier_quote_prefix_listing_te")),
    all(
      op(
        first(["predicateQuoteCarrier"], -1),
        connective({ connectiveIn: ["te_form", "listing", "sequence_after"] })
      ),
      not(aggregate("carrier_preceding_prefix_has_connective")),
      aggregate("carrier_suffix_wrappers_allowed")
    )
  )
);

export const CARRIER_INTERNAL_CONNECTIVE_CLAIM: Expr = all(
  not(LEGACY_EXEMPLIFICATION_SHAPE),
  any(LEGACY_CARRIER_CONTEXT_LICENSE, CARRIER_INTERNAL_NORMALIZATION)
);

const NOUN_COPULA_REASON_BEFORE_QUOTE = all(
  terminal(null),
  any(
    projection("supports_category", "nominal"),
    projection("supports_category", "adjectival_predicate")
  ),
  opPresence(first(["connective"], -1), true),
  {
    kind: "first_of_kinds_at_relative",
    opKinds: ["connective"],
    relativeOffset: -2
  },
  op(absolute(0), copulaPattern({ variantIn: ["basic"] })),
  op(first(["connective"], 0), connective({ connectiveIn: ["reason"] })),
  op(first(["connective"], 1), connective({ connectiveIn: ["quotative"] })),
  aggregate("noun_quote_wrappers_allowed")
);

const QUOTE_MAIN_CONDITIONAL = any(
  TYPED_CONDITIONAL_QUOTE_AT(relative(-2)),
  op(
    relative(-2),
    copulaPattern({ variantIn: ["conditional_nara"], polarityIn: ["affirmative"] })
  ),
  NEGATED_TO_CONDITIONAL_ALIAS
);

export const QUOTE_MID_CHAIN_CLAIM: Expr = any(
  NOUN_COPULA_REASON_BEFORE_QUOTE,
  all(
    lengthAtLeast(2),
    any(QUOTE_TERMINAL_AT(relative(-1)), WISH_COMPLEMENT_AT(relative(-1))),
    not(kindCount(["predicateQuoteCarrier"], 1, "greater_than", 0)),
    any(
      QUOTE_MAIN_CONDITIONAL,
      all(WISH_COMPLEMENT_AT(relative(-1)), aggregate("quote_prefix_has_connective")),
      all(not(WISH_COMPLEMENT_AT(relative(-1))), aggregate("quote_prefix_has_listing_te"))
    )
  )
);

const REASON_SCOPE_RESIDUAL = any(
  op(relative(-1), connective({ connectiveIn: ["focus_limit_de"] })),
  op(
    relative(-1),
    projectionCarrier({ carrierIn: ["limit_dake", "limit_dake_negative", "limit_dokoro_negative"] })
  )
);

const copulaReasonBranch = (residual: boolean): Expr => {
  const reasonOffset = residual ? -3 : -2;
  const carrierOffset = residual ? -2 : -1;
  const reason = relative(reasonOffset);
  const copula = absolute(0);
  const reasonAt = (absoluteIndex: number): Expr => lengthEquals(absoluteIndex - reasonOffset);
  const common = all(
    lengthAtLeast(3),
    residual ? REASON_SCOPE_RESIDUAL : all(not(REASON_SCOPE_RESIDUAL), terminal("attributive", "nominalized")),
    op(copula, copulaPattern({ variantIn: ["basic"] })),
    op(reason, connective({ connectiveIn: ["reason"] })),
    op(
      relative(carrierOffset),
      quoteCarrier({ styleIn: ["compact_toiu"], allomorphIn: ["toiu", "tteiu"] })
    )
  );
  const affirmative = op(copula, copulaPattern({ polarityIn: ["affirmative"] }));
  const pastAtOne = op(absolute(1), tense({ tenseIn: ["past"] }));
  return all(
    common,
    any(
      all(
        host("source_predicate_shape", "na_adjective"),
        op(reason, connective({ surfaceAllomorphIn: ["kara"] })),
        affirmative,
        reasonAt(1),
        any(
          projection("supports_category", "adjectival_predicate"),
          projection("supports_category", "verbal_predicate"),
          projection("supports_category", "nominal")
        )
      ),
      all(
        host("source_predicate_shape", "nominal"),
        projection("supports_category", "nominal"),
        any(
          all(reasonAt(1), affirmative),
          all(
            op(reason, connective({ surfaceAllomorphIn: ["kara"] })),
            any(
              all(affirmative, reasonAt(2), pastAtOne),
              all(
                not(affirmative),
                any(
                  reasonAt(1),
                  all(reasonAt(2), pastAtOne),
                  all(
                    reasonAt(3),
                    op(absolute(1), kind("polite")),
                    op(absolute(2), tense({ tenseIn: ["past"] }))
                  )
                )
              )
            )
          )
        )
      )
    )
  );
};

export const COPULA_REASON_QUOTE_CARRIER_CLAIM: Expr = any(
  copulaReasonBranch(false),
  copulaReasonBranch(true)
);

export const VERBAL_REASON_QUOTE_CARRIER_CLAIM: Expr = all(
  terminal("attributive", "nominalized"),
  host("source_predicate_shape", "verb", "i_adjective", "sahen_verbalization"),
  any(
    projection("supports_category", "verbal_predicate"),
    projection("supports_category", "adjectival_predicate")
  ),
  not(op(absolute(0), kind("copula"))),
  op(
    first(["predicateQuoteCarrier"], 0),
    quoteCarrier({ styleIn: ["compact_toiu"], allomorphIn: ["toiu", "tteiu"] })
  ),
  opPresence(first(["predicateQuoteCarrier"], 1), false),
  op(
    first(["predicateQuoteCarrier"], -1),
    connective({ connectiveIn: ["reason"] })
  ),
  kindCount(["connective"], 2, "equals", 1)
);

export const REASON_COPULA_CONDITIONAL_CLAIM: Expr = all(
  {
    kind: "first_of_kinds_at_relative",
    opKinds: ["connective"],
    relativeOffset: -3
  },
  op(
    first(["connective"], 0),
    connective({ connectiveIn: ["reason"], surfaceAllomorphIn: ["kara"] })
  ),
  op(
    first(["connective"], 1),
    copulaPattern({ variantIn: ["basic"], polarityIn: ["affirmative"] })
  ),
  op(
    first(["connective"], 2),
    connective({ connectiveIn: ["conditional"], surfaceAllomorphIn: ["tara"] })
  )
);

export const SEQUENCE_AFTER_COPULA_CLAIM: Expr = all(
  lengthAtLeast(2),
  op(first(["connective"], 0), connective({ connectiveIn: ["sequence_after"] })),
  op(
    relative(-1),
    copulaPattern({ variantIn: ["basic"] }),
    kind("polite"),
    kind("tense"),
    kind("conjecture"),
    scopeBridge({ headIn: [null], polarityIn: ["negative"] })
  ),
  aggregate("sequence_after_copula_shell_kinds"),
  aggregate("sequence_after_copula_shell_basic_copula"),
  aggregate("sequence_after_copula_shell_bare_negative_bridge"),
  kindCount(["connective"], 2, "equals", 1)
);

export const CONDITIONAL_QUOTE_CARRIER_CLAIM: Expr = all(
  op(first(["predicateQuoteCarrier"], -1), kind("connective")),
  any(
    all(
      terminal("attributive"),
      {
        kind: "first_of_kinds_at_relative",
        opKinds: ["predicateQuoteCarrier"],
        relativeOffset: -1
      },
      op(
        first(["predicateQuoteCarrier"], 0),
        quoteCarrier({ styleIn: ["compact_toiu"] })
      ),
      op(
        first(["predicateQuoteCarrier"], -1),
        connective({
          connectiveIn: ["conditional"],
          conditionalQuoteEllipsisNotIn: ["prohibitive_concern"]
        })
      ),
      not(aggregate("conditional_carrier_has_earlier_connective"))
    ),
    all(
      op(
        first(["predicateQuoteCarrier"], -1),
        connective({ connectiveIn: ["conditional"] })
      ),
      not(aggregate("conditional_carrier_has_earlier_connective")),
      op(
        first(["predicateQuoteCarrier"], 1),
        modal({ modalIn: ["youda"] })
      ),
      opPresence(first(["predicateQuoteCarrier"], 2), false)
    )
  )
);

const NOMINAL_HOST_LIKENESS_HEAD: Expr = all(
  host("stem_kind", "noun"),
  op(absolute(0), modal({ modalIn: ["youda"] }))
);

export const ADVERSATIVE_QUOTE_CARRIER_CLAIM: Expr = all(
  any(
    terminal("attributive"),
    all(
      terminal(null),
      op(
        first(["predicateQuoteCarrier"], 0),
        quoteCarrier({ sourceTerminal: true })
      )
    )
  ),
  {
    kind: "first_of_kinds_at_relative",
    opKinds: ["predicateQuoteCarrier"],
    relativeOffset: -1
  },
  op(
    first(["predicateQuoteCarrier"], 0),
    quoteCarrier({ styleIn: ["compact_toiu"] })
  ),
  op(
    first(["predicateQuoteCarrier"], -1),
    connective({ connectiveIn: ["adversative"] })
  ),
  not(aggregate("adversative_carrier_has_earlier_connective")),
  not(NOMINAL_HOST_LIKENESS_HEAD)
);

export const CONDITIONAL_QUOTE_ELLIPSIS_CLAIM: Expr = all(
  terminal(null),
  {
    kind: "first_of_kinds_at_relative",
    opKinds: ["predicateQuoteCarrier"],
    relativeOffset: -1
  },
  op(
    first(["predicateQuoteCarrier"], 0),
    quoteCarrier({ styleIn: ["compact_toiu"], allomorphIn: ["other"], sourceTerminal: true })
  ),
  any(
    all(
      op(
        first(["predicateQuoteCarrier"], -1),
        connective({
          connectiveIn: ["conditional"],
          surfaceAllomorphIn: ["ba"],
          conditionalQuoteEllipsisNotIn: ["prohibitive_concern"]
        })
      ),
      not(aggregate("conditional_quote_ellipsis_has_negation_prefix"))
    ),
    op(
      first(["predicateQuoteCarrier"], -1),
      connective({
        connectiveIn: ["conditional"],
        surfaceAllomorphIn: ["tara"],
        conditionalQuoteEllipsisNotIn: ["prohibitive_concern"]
      })
    )
  ),
  kindCount(["connective"], 2, "equals", 1)
);

export const EXEMPLIFICATION_MID_CHAIN_CLAIM: Expr = LEGACY_EXEMPLIFICATION_SHAPE;

const LEGACY_REASON_QUOTE_CARRIER = all(
  projection("supports_category", "nominal"),
  opPresence(first(["predicateQuoteCarrier"], -2), true),
  op(
    first(["predicateQuoteCarrier"], -1),
    connective({ connectiveIn: ["reason"] })
  ),
  op(
    absolute(0),
    copulaPattern({ variantIn: ["basic"], polarityIn: ["affirmative"] })
  ),
  aggregate("legacy_reason_wrappers_allowed")
);

export const EMBEDDED_QUESTION_MID_CHAIN_CLAIM: Expr = all(
  op(
    relative(-1),
    connective({ connectiveIn: ["question_content", "question_content_alternative"] })
  ),
  aggregate("embedded_prefix_has_connective"),
  not(LEGACY_EXEMPLIFICATION_SHAPE),
  not(LEGACY_REASON_QUOTE_CARRIER)
);

export const REASON_QUOTE_CARRIER_RESIDUAL_CLAIM: Expr = LEGACY_REASON_QUOTE_CARRIER;

const PLAIN_COPULA_AT = (selector: ProductionClaimOpSelector): Expr => op(
  selector,
  copulaPattern({
    variantIn: ["basic"],
    polarityIn: ["affirmative"],
    basicForm: "absent",
    politeIn: [false]
  })
);
const PLAIN_TE_HOSHII_AT = (selector: ProductionClaimOpSelector): Expr => op(
  selector,
  plainTeHoshii()
);
const COPULAR_DESIDERATIVE_CONNECTIVE_AT = (selector: ProductionClaimOpSelector): Expr => op(
  selector,
  connective({ connectiveIn: ["adversative", "quotative", "wish_complement"] })
);
const LIMIT_DAKE_AT = (selector: ProductionClaimOpSelector): Expr => op(
  selector,
  projectionCarrier({ carrierIn: ["limit_dake"], politeNotTrue: true, pastNotTrue: true })
);

const PLAIN_COPULAR_TE_HOSHII = all(
  PLAIN_COPULA_AT(absolute(0)),
  PLAIN_TE_HOSHII_AT(absolute(1))
);

export const COPULAR_TE_HOSHII_CLAIM: Expr = any(
  all(
    host("source_predicate_shape", "nominal"),
    projection("supports_category", "nominal"),
    any(
      all(lengthEquals(2), PLAIN_COPULAR_TE_HOSHII),
      all(lengthEquals(3), PLAIN_COPULAR_TE_HOSHII, op(absolute(2), tense({ tenseIn: ["past"] }))),
      all(lengthEquals(3), PLAIN_COPULAR_TE_HOSHII, COPULAR_DESIDERATIVE_CONNECTIVE_AT(absolute(2))),
      all(lengthEquals(2), LIMIT_DAKE_AT(absolute(0)), PLAIN_TE_HOSHII_AT(absolute(1)))
    )
  ),
  all(
    host("source_predicate_shape", "na_adjective"),
    projection("supports_category", "adjectival_predicate"),
    lengthEquals(2),
    PLAIN_COPULAR_TE_HOSHII
  )
);

export const COPULAR_BENEFACTIVE_REQUEST_CLAIM: Expr = all(
  host("source_predicate_shape", "nominal"),
  projection("supports_category", "nominal"),
  lengthEquals(2),
  PLAIN_COPULA_AT(absolute(0)),
  any(
    op(absolute(1), requestAspect({ aspectIn: ["te_kure_tanomu"] })),
    op(absolute(1), benefactiveAspect({ aspectIn: ["te_moraeru"] }))
  )
);

const PLAIN_DESIRE_AT = (selector: ProductionClaimOpSelector): Expr => op(
  selector,
  kind("desire")
);

const NOUN_COPULA_DESIRE_HOST: Expr = any(
  all(
    host("source_predicate_shape", "nominal"),
    projection("supports_category", "nominal")
  ),
  all(
    host("source_predicate_shape", "na_adjective"),
    projection("supports_category", "adjectival_predicate")
  )
);

const NOUN_COPULA_DESIRE_CORE: Expr = all(
  lengthAtLeast(2),
  PLAIN_COPULA_AT(absolute(0)),
  PLAIN_DESIRE_AT(absolute(1)),
  not(kindCount(["tense"], 2, "greater_than", 1)),
  not(kindCount(["negation"], 2, "greater_than", 1)),
  not(kindCount(["polite"], 3, "greater_than", 2))
);

export const NOUN_COPULA_DESIRE_CLAIM: Expr = all(
  NOUN_COPULA_DESIRE_HOST,
  NOUN_COPULA_DESIRE_CORE,
  any(
    all(
      quoteBinding("unbound"),
      terminal(null),
      { kind: "sfp_presence", present: false },
      aggregate("noun_copula_desire_terminal_wrappers")
    ),
    all(
      quoteBinding("unbound"),
      terminal(null),
      { kind: "sfp_presence", present: true },
      {
        kind: "sfp_effect_membership",
        values: ["ka", "plain_q", "polite_q", "ne", "na_excl", "kana", "yone_confirm", "explanatory"]
      },
      aggregate("noun_copula_desire_terminal_wrappers")
    ),
    all(
      terminal(null),
      { kind: "sfp_presence", present: false },
      op(
        relative(-1),
        connective({
          connectiveIn: ["adversative", "conditional", "reason", "quotative"]
        })
      ),
      aggregate("noun_copula_desire_pre_final_wrappers")
    ),
    all(
      quoteBinding("unbound"),
      terminal("attributive"),
      { kind: "sfp_presence", present: false },
      op(
        relative(-1),
        quoteCarrier({ styleIn: ["compact_toiu"] })
      ),
      aggregate("noun_copula_desire_pre_final_wrappers")
    )
  )
);

const PLAIN_NEGATIVE_NOUN_COPULA_AT = (selector: ProductionClaimOpSelector): Expr => op(
  selector,
  copulaPattern({
    variantIn: ["basic"],
    polarityIn: ["negative"],
    basicForm: "absent",
    negativeBridgeFormIn: ["absent", "ja"],
    politeIn: [false]
  })
);
const PLAIN_TEMO_II_PERMISSION_AT = (selector: ProductionClaimOpSelector): Expr => op(
  selector,
  permissionIdiom({ variantIn: ["ii"], connectiveSurfaceIn: ["ても"] })
);
const NOUN_COPULA_PERMISSION_CORE = all(
  PLAIN_NEGATIVE_NOUN_COPULA_AT(absolute(0)),
  PLAIN_TEMO_II_PERMISSION_AT(absolute(1))
);

export const NOUN_COPULA_PERMISSION_CLAIM: Expr = all(
  host("source_predicate_shape", "nominal"),
  projection("supports_category", "nominal"),
  any(
    all(lengthEquals(2), NOUN_COPULA_PERMISSION_CORE),
    all(
      lengthEquals(3),
      NOUN_COPULA_PERMISSION_CORE,
      any(
        op(
          absolute(2),
          connective({ connectiveIn: ["conditional"], surfaceAllomorphIn: ["to"] })
        ),
        op(
          absolute(2),
          connective({ connectiveIn: ["quotative"], surfaceAllomorphIn: ["to"] })
        ),
        op(
          absolute(2),
          connective({ connectiveIn: ["adversative"], surfaceAllomorphIn: ["other"] })
        )
      )
    )
  )
);

const PLAIN_AFFIRMATIVE_NOUN_COPULA_AT = (selector: ProductionClaimOpSelector): Expr => op(
  selector,
  copulaPattern({
    variantIn: ["basic"],
    polarityIn: ["affirmative"],
    basicForm: "absent",
    negativeBridgeFormIn: ["absent"],
    politeIn: [false]
  })
);
const PLAIN_FORBIDDEN_AT = (selector: ProductionClaimOpSelector): Expr => op(
  selector,
  forbiddenIdiom({
    polarityIn: ["negative"],
    politeIn: [false],
    pastIn: [false],
    inner: "absent"
  })
);
const NOUN_COPULA_FORBIDDEN_CORE = all(
  PLAIN_AFFIRMATIVE_NOUN_COPULA_AT(absolute(0)),
  PLAIN_FORBIDDEN_AT(absolute(1))
);

export const NOUN_COPULA_FORBIDDEN_CLAIM: Expr = any(
  all(
    host("source_predicate_shape", "nominal"),
    projection("supports_category", "nominal"),
    any(
      all(lengthEquals(2), NOUN_COPULA_FORBIDDEN_CORE),
      all(
        lengthEquals(3),
        NOUN_COPULA_FORBIDDEN_CORE,
        op(
          absolute(2),
          connective({ connectiveIn: ["quotative"], surfaceAllomorphIn: ["to"] })
        )
      )
    )
  ),
  all(
    host("source_predicate_shape", "na_adjective"),
    projection("supports_category", "adjectival_predicate"),
    lengthEquals(3),
    NOUN_COPULA_FORBIDDEN_CORE,
    op(
      absolute(2),
      connective({ connectiveIn: ["quotative"], surfaceAllomorphIn: ["to"] })
    )
  )
);

const PLAIN_NEGATIVE_NOUN_COPULA_LIKENESS_AT = (
  selector: ProductionClaimOpSelector
): Expr => op(
  selector,
  copulaPattern({
    variantIn: ["basic"],
    polarityIn: ["negative"],
    basicForm: "absent",
    negativeBridgeFormIn: ["absent", "dewa", "ja"],
    politeIn: [false]
  })
);
const ATTRIBUTIVE_YOUDA_LIKENESS_AT = (selector: ProductionClaimOpSelector): Expr => op(
  selector,
  youdaModal({
    formIn: ["youda"],
    terminalIn: ["attributive_na"],
    readingIn: ["likeness"],
    politeIn: [false],
    pastIn: [false],
    inner: "absent"
  })
);

export const NOUN_COPULA_NEGATIVE_LIKENESS_CLAIM: Expr = all(
  host("source_predicate_shape", "nominal"),
  projection("supports_category", "nominal"),
  lengthEquals(2),
  PLAIN_NEGATIVE_NOUN_COPULA_LIKENESS_AT(absolute(0)),
  ATTRIBUTIVE_YOUDA_LIKENESS_AT(absolute(1))
);

export const NOUN_COPULA_REPORTED_ATTRIBUTIVE_CLAIM: Expr = all(
  quoteBinding("unbound"),
  host("source_predicate_shape", "nominal"),
  projection("supports_category", "nominal"),
  terminal("attributive"),
  lengthEquals(2),
  PLAIN_AFFIRMATIVE_NOUN_COPULA_AT(absolute(0)),
  op(absolute(1), soudaHearsayModal({
    readingIn: ["hearsay"],
    politeIn: [false],
    pastIn: [false],
    inner: "absent"
  }))
);

export const NOUN_SCOPE_BRIDGE_ATTRIBUTIVE_BRIDGE_ARGS: readonly ScopeBridgePredicateArgs[] = [
  {
    headIn: [null],
    formIn: ["demo"],
    particleIn: ["mo"],
    polarityIn: ["affirmative"],
    chainDepthIn: [0],
    politeIn: [false]
  },
  {
    headIn: [null],
    formIn: ["demo"],
    particleIn: ["mo"],
    polarityIn: ["negative"],
    chainDepthIn: [1],
    politeIn: [false]
  }
];

export const NOUN_SCOPE_BRIDGE_ATTRIBUTIVE_CLAIM: Expr = all(
  host("source_predicate_shape", "nominal", "lexical_adverb"),
  projection("supports_category", "nominal"),
  lengthEquals(2),
  op(absolute(0), ...NOUN_SCOPE_BRIDGE_ATTRIBUTIVE_BRIDGE_ARGS.map(scopeBridge)),
  op(absolute(1), kind("polite"), tense({ tenseIn: ["past"] }))
);

const PREDICATE_CONFIRM_COPULA = (
  ...polite: readonly boolean[]
): ProductionOpPredicatePattern =>
  copulaPattern({
    variantIn: ["basic"],
    polarityIn: ["negative"],
    basicForm: "absent",
    negativeBridgeFormIn: ["ja"],
    politeIn: polite
  });

const PREDICATE_CONFIRM_BRIDGE_NEGATION = negation({
  chainDepthIn: [1],
  chainPastIn: [false]
});

const PREDICATE_CONFIRM_QUESTION_HOST_CHAIN = (width: 1 | 2 | 3): Expr =>
  aggregate(`predicate_confirm_question_host_chain_kinds_${width}`);

const PREDICATE_CONFIRM_HOST_TERMINATES = (markerWidth: number): Expr => any(
  aggregate(`predicate_confirm_host_chain_closes_${markerWidth}`),
  all(
    not(lengthAtLeast(markerWidth + 1)),
    host("source_clause_closing", true)
  )
);

const PREDICATE_CONFIRM_MARKER_SPAN = (
  bridge: ProductionOpPredicatePattern,
  requireTerminatingHost = false
): Expr => {
  const hostTerminates = (markerWidth: number): readonly Expr[] =>
    requireTerminatingHost ? [PREDICATE_CONFIRM_HOST_TERMINATES(markerWidth)] : [];
  return any(
    all(
      lengthAtLeast(1),
      ...hostTerminates(1),
      PREDICATE_CONFIRM_QUESTION_HOST_CHAIN(1),
      op(relative(-1), PREDICATE_CONFIRM_COPULA(false, true))
    ),
    all(
      lengthAtLeast(2),
      ...hostTerminates(2),
      PREDICATE_CONFIRM_QUESTION_HOST_CHAIN(2),
      op(relative(-2), PREDICATE_CONFIRM_COPULA(false, true)),
      op(relative(-1), kind("polite"))
    ),
    all(
      lengthAtLeast(2),
      ...hostTerminates(2),
      PREDICATE_CONFIRM_QUESTION_HOST_CHAIN(2),
      op(relative(-2), bridge),
      op(relative(-1), PREDICATE_CONFIRM_BRIDGE_NEGATION)
    ),
    all(
      lengthAtLeast(3),
      ...hostTerminates(3),
      PREDICATE_CONFIRM_QUESTION_HOST_CHAIN(3),
      op(relative(-3), bridge),
      op(relative(-2), PREDICATE_CONFIRM_BRIDGE_NEGATION),
      op(relative(-1), kind("polite"))
    ),
    all(
      lengthAtLeast(3),
      ...hostTerminates(3),
      PREDICATE_CONFIRM_QUESTION_HOST_CHAIN(3),
      op(relative(-3), bridge),
      op(relative(-2), kind("polite")),
      op(relative(-1), PREDICATE_CONFIRM_BRIDGE_NEGATION)
    )
  );
};

export const PREDICATE_COPULA_NEGATIVE_CONFIRM_CLAIM: Expr = all(
  host("source_predicate_shape", "verb", "i_adjective", "sahen_verbalization"),
  any(
    projection("supports_category", "verbal_predicate"),
    projection("supports_category", "adjectival_predicate"),
    projection("supports_category", "nominal")
  ),
  any(
    all(
      {
        kind: "sfp_effect_membership",
        values: ["ka", "polite_q", "neg_confirm_q", "neg_plain_q"]
      },
      PREDICATE_CONFIRM_MARKER_SPAN(kind("adjCopulaBridge"))
    ),
    all(
      any(
        { kind: "sfp_presence", present: false },
        { kind: "sfp_effect_membership", values: ["plain_q"] }
      ),
      PREDICATE_CONFIRM_MARKER_SPAN(
        productionOpPattern("adjCopulaBridge", "adj_copula_bridge_fields", { formIn: ["ja"] }),
        true
      )
    )
  )
);

export const PREDICATE_COPULA_PROGRESSIVE_CONFIRM_CLAIM: Expr = all(
  lengthAtLeast(2),
  aggregate("predicate_confirm_host_chain_kinds"),
  op(relative(-1), PREDICATE_CONFIRM_COPULA(false, true))
);

const VOLITIONAL_NEGATIVE_INVITE_COPULA = op(
  absolute(0),
  copulaPattern({
    variantIn: ["basic"],
    polarityIn: ["negative"],
    basicForm: "absent",
    negativeBridgeFormIn: ["ja"],
    politeIn: [false]
  })
);

export const VOLITIONAL_NEGATIVE_INVITE_CLAIM: Expr = all(
  host("stem_kind", "verb"),
  host("stem_mood", "volitional"),
  host("source_predicate_shape", "verb", "sahen_verbalization"),
  projection("supports_category", "verbal_predicate"),
  VOLITIONAL_NEGATIVE_INVITE_COPULA,
  any(
    lengthEquals(1),
    all(
      lengthEquals(2),
      op(absolute(1), connective({
        connectiveIn: ["question_quotative"],
        surfaceAllomorphIn: ["to"]
      }))
    )
  )
);

export const VOLITIONAL_QUESTION_QUOTATIVE_CLAIM: Expr = all(
  quoteBinding("unbound"),
  host("stem_kind", "verb"),
  host("stem_mood", "volitional"),
  host("source_predicate_shape", "verb"),
  projection("supports_category", "verbal_predicate"),
  lengthEquals(1),
  op(absolute(0), connective({
    connectiveIn: ["question_quotative"],
    surfaceAllomorphIn: ["tte"]
  }))
);

export const VOLITIONAL_REFORMULATION_QUESTION_CLAIM: Expr = all(
  quoteBinding("unbound"),
  host("stem_kind", "verb"),
  host("stem_mood", "volitional"),
  host("source_predicate_shape", "verb"),
  projection("supports_category", "verbal_predicate"),
  lengthEquals(1),
  op(absolute(0), connective({
    connectiveIn: ["reformulation"],
    surfaceAllomorphIn: ["reformulation_ka"]
  }))
);

const PREDICATE_QUOTE_TTE_NOMINALIZED_CONNECTIVE = connective({
  connectiveIn: ["quotative"],
  surfaceAllomorphIn: ["tte"]
});
const PREDICATE_QUOTE_TTE_NOMINALIZED_TE_SHIMAU = aspect({
  aspectIn: ["te_shimau"],
  teFocusParticle: "absent",
  teFocusTarget: "absent",
  ellipticTeIruSourceHost: "absent",
  terminalMood: "absent",
  semantic: "absent",
  collapsed: "absent",
  followingRareruReading: "absent"
});

export const PREDICATE_QUOTE_TTE_NOMINALIZED_CLAIM: Expr = all(
  quoteBinding("unbound"),
  terminal("nominalized"),
  any(
    all(
      host("stem_kind", "verb"),
      host("source_predicate_shape", "verb", "i_adjective"),
      projection("supports_category", "verbal_predicate")
    ),
    all(
      host("stem_kind", "adj"),
      host("source_predicate_shape", "verb", "i_adjective"),
      projection("supports_category", "adjectival_predicate")
    )
  ),
  any(
    all(
      lengthEquals(1),
      op(absolute(0), PREDICATE_QUOTE_TTE_NOMINALIZED_CONNECTIVE)
    ),
    all(
      lengthEquals(2),
      op(absolute(0), kind("negation")),
      op(absolute(1), PREDICATE_QUOTE_TTE_NOMINALIZED_CONNECTIVE)
    ),
    all(
      lengthEquals(2),
      op(absolute(0), obligationIdiom({
        variantIn: [
          "standard_nakute_wa",
          "standard_nakereba",
          "colloquial_nakya",
          "colloquial_nakucha",
          "colloquial_naito"
        ],
        polarityIn: ["affirmative"],
        politeIn: [false],
        pastIn: [false],
        inner: "absent"
      })),
      op(absolute(1), PREDICATE_QUOTE_TTE_NOMINALIZED_CONNECTIVE)
    ),
    all(
      host("stem_kind", "verb"),
      host("source_predicate_shape", "verb"),
      projection("supports_category", "verbal_predicate"),
      lengthEquals(4),
      op(absolute(0), PREDICATE_QUOTE_TTE_NOMINALIZED_TE_SHIMAU),
      op(absolute(1), kind("polite")),
      op(absolute(2), tense({ tenseIn: ["past"] })),
      op(absolute(3), PREDICATE_QUOTE_TTE_NOMINALIZED_CONNECTIVE)
    )
  )
);

const ADVERBIAL_CHANGE_OP = postverbAuxiliary({
  auxiliaryKindIn: ["adverbial_change"]
});
const ADVERBIAL_CHANGE_PLAIN_ASPECT = (
  aspectIn: NonNullable<AspectPredicateArgs["aspectIn"]>
): ProductionOpPredicatePattern => aspect({
  aspectIn,
  teFocusParticle: "absent",
  teFocusTarget: "absent",
  ellipticTeIruSourceHost: "absent",
  terminalMood: "absent",
  semantic: "absent",
  collapsed: "absent",
  followingRareruReading: "absent"
});
const ADVERBIAL_CHANGE_RESULTATIVE_TE_IRU = aspect({
  aspectIn: ["te_iru"],
  teFocusParticle: "absent",
  teFocusTarget: "absent",
  ellipticTeIruSourceHost: "absent",
  terminalMood: "absent",
  semanticRenderStrategyIn: ["resultative_state"],
  collapsed: "absent",
  followingRareruReading: "absent"
});

export const ADVERBIAL_CHANGE_ATTRIBUTIVE_CLAIM: Expr = all(
  quoteBinding("unbound"),
  host("stem_kind", "adverb"),
  projection("supports_category", "adverbial"),
  op(absolute(0), ADVERBIAL_CHANGE_OP),
  any(
    all(
      terminal("attributive", "nominalized"),
      host("source_predicate_shape", "lexical_adverb", "nominal"),
      any(
        lengthEquals(1),
        all(
          lengthEquals(2),
          op(absolute(1), tense({ tenseIn: ["past"] }))
        )
      )
    ),
    all(
      terminal("attributive"),
      host("source_predicate_shape", "nominal"),
      lengthEquals(3),
      op(absolute(1), ADVERBIAL_CHANGE_PLAIN_ASPECT(["te_shimau"])),
      op(absolute(2), ADVERBIAL_CHANGE_PLAIN_ASPECT(["te_iru"]))
    ),
    all(
      terminal("attributive"),
      host("source_predicate_shape", "lexical_adverb"),
      lengthEquals(4),
      op(absolute(1), ADVERBIAL_CHANGE_PLAIN_ASPECT(["te_shimau"])),
      op(absolute(2), tense({ tenseIn: ["past"] })),
      op(absolute(3), quoteCarrier({
        styleIn: ["compact_toiu"],
        allomorphIn: ["toiu"]
      }))
    ),
    all(
      terminal("attributive"),
      host("source_predicate_shape", "lexical_adverb"),
      op(absolute(1), ADVERBIAL_CHANGE_RESULTATIVE_TE_IRU),
      any(
        lengthEquals(2),
        all(
          lengthEquals(3),
          op(absolute(2), tense({ tenseIn: ["past"] }))
        )
      )
    )
  )
);

export const ACCUSTOMED_PAST_ATTRIBUTIVE_CLAIM: Expr = all(
  quoteBinding("unbound"),
  host("stem_kind", "verb"),
  host("source_predicate_shape", "verb", "sahen_verbalization"),
  projection("supports_category", "verbal_predicate"),
  terminal("attributive"),
  lengthEquals(2),
  op(absolute(0), postverbAuxiliary({ auxiliaryKindIn: ["accustomed"] })),
  op(absolute(1), tense({ tenseIn: ["past"] }))
);

export const ATTRIBUTIVE_HOST_STEM_KINDS = [
  "verb",
  "adj",
  "noun",
  "candidateSet"
] as const;

export const ATTRIBUTIVE_HOST_SOURCE_SHAPES = [
  "verb",
  "sahen_verbalization",
  "i_adjective",
  "na_adjective",
  "nominal",
  "lexical_adverb"
] as const;

export const ATTRIBUTIVE_COPULA_LANE_SOURCE_SHAPES = [
  ...ATTRIBUTIVE_HOST_SOURCE_SHAPES,
  "particle_phrase"
] as const;

export const NOUN_COPULA_BARE_ATTRIBUTIVE_COPULA_VARIANTS = [
  "basic",
  "conjecture"
] as const satisfies NonNullable<CopulaPredicateArgs["variantIn"]>;

const ATTRIBUTIVE_QUOTE_BOUND_SFP_BINDING: Expr = any(
  all(quoteBinding("unbound"), { kind: "sfp_presence", present: false }),
  quoteBinding("quoted_content")
);

const SEMANTIC_OPERATOR_ATTRIBUTIVE_HOST: Expr = all(
  ATTRIBUTIVE_QUOTE_BOUND_SFP_BINDING,
  host("stem_kind", ...ATTRIBUTIVE_HOST_STEM_KINDS),
  host("source_predicate_shape", ...ATTRIBUTIVE_HOST_SOURCE_SHAPES),
  terminal("attributive")
);

const ATTRIBUTIVE_COPULA_LANE_HOST: Expr = all(
  ATTRIBUTIVE_QUOTE_BOUND_SFP_BINDING,
  host("stem_kind", ...ATTRIBUTIVE_HOST_STEM_KINDS),
  host("source_predicate_shape", ...ATTRIBUTIVE_COPULA_LANE_SOURCE_SHAPES),
  terminal("attributive")
);

export const PLAIN_PREDICATE_ATTRIBUTIVE_CLAIM: Expr = all(
  ATTRIBUTIVE_QUOTE_BOUND_SFP_BINDING,
  host("stem_kind", "verb", "adj", "noun", "candidateSet"),
  host("source_predicate_shape", "verb", "i_adjective", "sahen_verbalization"),
  terminal("attributive"),
  aggregate("plain_attributive_core_kinds"),
  aggregate("plain_attributive_core_tense_past")
);

export const NOUN_COPULA_BARE_ATTRIBUTIVE_CLAIM: Expr = all(
  ATTRIBUTIVE_COPULA_LANE_HOST,
  op(absolute(0), copulaPattern({ variantIn: [...NOUN_COPULA_BARE_ATTRIBUTIVE_COPULA_VARIANTS] })),
  aggregate("noun_copula_bare_attributive_suffix_core_kinds"),
  aggregate("noun_copula_bare_attributive_suffix_tense_past")
);

export const NOMINAL_FOCUS_PREFIX_ATTRIBUTIVE_CLAIM: Expr = all(
  ATTRIBUTIVE_QUOTE_BOUND_SFP_BINDING,
  host("stem_kind", "noun", "candidateSet"),
  host("source_predicate_shape", "nominal"),
  terminal("attributive"),
  lengthEquals(0)
);

export const NOMINAL_EXPLICIT_NO_ATTRIBUTIVE_CLAIM: Expr = all(
  ATTRIBUTIVE_QUOTE_BOUND_SFP_BINDING,
  host("stem_kind", "adj", "verb", "noun", "candidateSet"),
  host("source_predicate_shape", "nominal"),
  terminal("attributive"),
  lengthEquals(0)
);

export const NOMINAL_BARE_ATTRIBUTIVE_CLAIM: Expr = all(
  ATTRIBUTIVE_QUOTE_BOUND_SFP_BINDING,
  host("stem_kind", "adj", "verb", "noun", "candidateSet"),
  host("source_predicate_shape", "nominal"),
  terminal("attributive"),
  lengthEquals(0)
);

export const KEIJOUJI_BARE_ATTRIBUTIVE_CLAIM: Expr = all(
  ATTRIBUTIVE_QUOTE_BOUND_SFP_BINDING,
  host("stem_kind", "adj", "verb", "noun", "adverb", "candidateSet"),
  host("source_predicate_shape", "na_adjective"),
  terminal("attributive"),
  lengthEquals(0)
);

export const PLAIN_PREDICATE_QUOTE_CARRIER_ATTRIBUTIVE_CLAIM: Expr = all(
  ATTRIBUTIVE_QUOTE_BOUND_SFP_BINDING,
  host("stem_kind", "verb", "adj", "noun", "candidateSet"),
  host(
    "source_predicate_shape",
    "verb",
    "sahen_verbalization",
    "i_adjective",
    "na_adjective",
    "nominal"
  ),
  terminal("attributive"),
  op(relative(-1), quoteCarrier()),
  aggregate("plain_quote_carrier_prefix_core_kinds"),
  aggregate("plain_quote_carrier_prefix_tense_past")
);

export const NOUN_COPULA_QUOTE_CARRIER_ATTRIBUTIVE_CLAIM: Expr = all(
  ATTRIBUTIVE_QUOTE_BOUND_SFP_BINDING,
  host("stem_kind", "verb", "adj", "noun", "candidateSet"),
  host(
    "source_predicate_shape",
    "verb",
    "sahen_verbalization",
    "i_adjective",
    "na_adjective",
    "nominal",
    "lexical_adverb"
  ),
  terminal("attributive"),
  op(absolute(0), kind("copula")),
  op(relative(-1), quoteCarrier()),
  aggregate("noun_copula_quote_carrier_prefix_core_kinds"),
  aggregate("noun_copula_quote_carrier_prefix_tense_past")
);

export const PLAIN_PREDICATE_SEMANTIC_OPERATOR_ATTRIBUTIVE_CLAIM: Expr = all(
  SEMANTIC_OPERATOR_ATTRIBUTIVE_HOST,
  aggregate("plain_semantic_operator_core_kinds"),
  aggregate("plain_semantic_operator_tense_past"),
  aggregate("plain_semantic_operator_present")
);

export const PLAIN_PREDICATE_SEMANTIC_OPERATOR_QUOTE_CARRIER_ATTRIBUTIVE_CLAIM: Expr = all(
  SEMANTIC_OPERATOR_ATTRIBUTIVE_HOST,
  op(relative(-1), quoteCarrier()),
  aggregate("plain_semantic_operator_quote_carrier_prefix_core_kinds"),
  aggregate("plain_semantic_operator_quote_carrier_prefix_tense_past"),
  aggregate("plain_semantic_operator_quote_carrier_prefix_present")
);

export const NOUN_COPULA_SEMANTIC_OPERATOR_ATTRIBUTIVE_CLAIM: Expr = all(
  SEMANTIC_OPERATOR_ATTRIBUTIVE_HOST,
  op(absolute(0), kind("copula")),
  aggregate("noun_copula_semantic_operator_core_kinds"),
  aggregate("noun_copula_semantic_operator_tense_past"),
  aggregate("noun_copula_semantic_operator_present")
);

export const NOUN_COPULA_SEMANTIC_OPERATOR_QUOTE_CARRIER_ATTRIBUTIVE_CLAIM: Expr = all(
  SEMANTIC_OPERATOR_ATTRIBUTIVE_HOST,
  op(absolute(0), kind("copula")),
  op(relative(-1), quoteCarrier()),
  aggregate("noun_copula_semantic_operator_quote_carrier_prefix_core_kinds"),
  aggregate("noun_copula_semantic_operator_quote_carrier_prefix_tense_past"),
  aggregate("noun_copula_semantic_operator_quote_carrier_prefix_present")
);

export const PLAIN_PREDICATE_OPERATOR_CHAIN_ATTRIBUTIVE_CLAIM: Expr = all(
  SEMANTIC_OPERATOR_ATTRIBUTIVE_HOST,
  aggregate("plain_operator_chain_attributive_kinds"),
  aggregate("plain_operator_chain_attributive_tense_past"),
  aggregate("plain_operator_chain_attributive_extended_present")
);

export const NOUN_COPULA_OPERATOR_CHAIN_ATTRIBUTIVE_CLAIM: Expr = all(
  ATTRIBUTIVE_COPULA_LANE_HOST,
  op(absolute(0), kind("copula")),
  aggregate("noun_copula_operator_chain_attributive_kinds"),
  aggregate("noun_copula_operator_chain_attributive_tense_past"),
  aggregate("noun_copula_operator_chain_attributive_extended_present")
);

export const COPULA_PROJECTION_ATTRIBUTIVE_CLAIM: Expr = all(
  ATTRIBUTIVE_COPULA_LANE_HOST,
  aggregate("copula_projection_attributive_kinds"),
  aggregate("copula_projection_attributive_tense_past"),
  aggregate("copula_projection_attributive_suffix_copula_present")
);

export const CLAUSE_CONNECTIVE_KINDS = [
  "te_form",
  "conditional",
  "adversative",
  "reason",
  "listing",
  "even_if",
  "simultaneous",
  "alternative",
  "sequence_after",
  "concession",
  "sequence_immediate",
  "stative_hold",
  "volitional_purpose"
] as const;

const CLAUSE_CONNECTIVE_AT_CHAIN_END = op(
  relative(-1),
  connective({ connectiveIn: CLAUSE_CONNECTIVE_KINDS })
);

const VERBAL_CLAUSE_CHAIN_HOST: Expr = any(
  all(
    host("stem_kind", "verb", "adj", "candidateSet"),
    host("source_predicate_shape", "verb", "i_adjective", "sahen_verbalization")
  ),
  all(
    host("stem_kind", "noun"),
    host("source_predicate_shape", "i_adjective")
  )
);

export const PLAIN_PREDICATE_CLAUSE_CONNECTIVE_CLAIM: Expr = all(
  quoteBinding("unbound", "quoted_content"),
  VERBAL_CLAUSE_CHAIN_HOST,
  terminal(null),
  CLAUSE_CONNECTIVE_AT_CHAIN_END,
  aggregate("plain_clause_connective_prefix_basic_kinds")
);

export const NOUN_COPULA_CLAUSE_CONNECTIVE_CLAIM: Expr = all(
  quoteBinding("unbound", "quoted_content"),
  host("stem_kind", "noun", "adj", "verb", "candidateSet"),
  host("source_predicate_shape", "na_adjective", "nominal", "particle_phrase", "lexical_adverb"),
  terminal(null),
  op(absolute(0), kind("copula")),
  CLAUSE_CONNECTIVE_AT_CHAIN_END,
  aggregate("noun_copula_clause_connective_prefix_basic_kinds")
);

export const PLAIN_PREDICATE_RENYOU_CHUUSHI_CLAIM: Expr = all(
  quoteBinding("unbound", "quoted_content"),
  VERBAL_CLAUSE_CHAIN_HOST,
  terminal("renyou_chuushi"),
  aggregate("plain_renyou_chuushi_basic_kinds")
);

export const NOUN_COPULA_RENYOU_CHUUSHI_CLAIM: Expr = all(
  quoteBinding("unbound", "quoted_content"),
  host("stem_kind", "noun", "adj", "verb", "candidateSet"),
  host("source_predicate_shape", "na_adjective", "nominal", "particle_phrase", "lexical_adverb"),
  terminal("renyou_chuushi"),
  op(absolute(0), kind("copula")),
  aggregate("noun_copula_renyou_chuushi_basic_kinds")
);

export const PLAIN_PREDICATE_SEMANTIC_OPERATOR_CLAUSE_CONNECTIVE_CLAIM: Expr = all(
  quoteBinding("unbound", "quoted_content"),
  VERBAL_CLAUSE_CHAIN_HOST,
  terminal(null),
  CLAUSE_CONNECTIVE_AT_CHAIN_END,
  aggregate("plain_semantic_clause_connective_prefix_kinds"),
  aggregate("plain_semantic_clause_connective_prefix_semantic_present")
);

export const NOUN_COPULA_SEMANTIC_OPERATOR_CLAUSE_CONNECTIVE_CLAIM: Expr = all(
  quoteBinding("unbound", "quoted_content"),
  host("stem_kind", "noun", "adj", "verb", "candidateSet"),
  host("source_predicate_shape", "na_adjective", "nominal", "particle_phrase", "lexical_adverb"),
  terminal(null),
  op(absolute(0), kind("copula")),
  CLAUSE_CONNECTIVE_AT_CHAIN_END,
  aggregate("noun_copula_semantic_clause_connective_prefix_kinds"),
  aggregate("noun_copula_semantic_clause_connective_prefix_semantic_present")
);

export const PLAIN_PREDICATE_SEMANTIC_OPERATOR_RENYOU_CHUUSHI_CLAIM: Expr = all(
  quoteBinding("unbound", "quoted_content"),
  VERBAL_CLAUSE_CHAIN_HOST,
  terminal("renyou_chuushi"),
  aggregate("plain_semantic_renyou_chuushi_kinds"),
  aggregate("plain_semantic_renyou_chuushi_semantic_present")
);

export const NOUN_COPULA_SEMANTIC_OPERATOR_RENYOU_CHUUSHI_CLAIM: Expr = all(
  quoteBinding("unbound", "quoted_content"),
  host("stem_kind", "noun", "adj", "verb", "candidateSet"),
  host("source_predicate_shape", "na_adjective", "nominal", "particle_phrase", "lexical_adverb"),
  terminal("renyou_chuushi"),
  op(absolute(0), kind("copula")),
  aggregate("noun_copula_semantic_renyou_chuushi_kinds"),
  aggregate("noun_copula_semantic_renyou_chuushi_semantic_present")
);

const BARE_NONVERBAL_CLAUSE_CHAIN_HOST: Expr = all(
  host("stem_kind", "noun", "adj", "verb", "candidateSet", "adverb"),
  host("source_predicate_shape", "na_adjective", "nominal", "lexical_adverb")
);

export const BARE_NOMINAL_CLAUSE_CONNECTIVE_CLAIM: Expr = all(
  quoteBinding("unbound", "quoted_content"),
  BARE_NONVERBAL_CLAUSE_CHAIN_HOST,
  terminal(null),
  CLAUSE_CONNECTIVE_AT_CHAIN_END,
  aggregate("bare_nominal_clause_connective_prefix_basic_kinds")
);

export const BARE_NOMINAL_SEMANTIC_OPERATOR_CLAUSE_CONNECTIVE_CLAIM: Expr = all(
  quoteBinding("unbound", "quoted_content"),
  BARE_NONVERBAL_CLAUSE_CHAIN_HOST,
  terminal(null),
  CLAUSE_CONNECTIVE_AT_CHAIN_END,
  aggregate("bare_nominal_semantic_clause_connective_prefix_kinds"),
  aggregate("bare_nominal_semantic_clause_connective_prefix_semantic_present")
);

export const BARE_NOMINAL_RENYOU_CHUUSHI_CLAIM: Expr = all(
  quoteBinding("unbound", "quoted_content"),
  BARE_NONVERBAL_CLAUSE_CHAIN_HOST,
  terminal("renyou_chuushi"),
  aggregate("bare_nominal_renyou_chuushi_basic_kinds")
);

export const BARE_NOMINAL_SEMANTIC_OPERATOR_RENYOU_CHUUSHI_CLAIM: Expr = all(
  quoteBinding("unbound", "quoted_content"),
  BARE_NONVERBAL_CLAUSE_CHAIN_HOST,
  terminal("renyou_chuushi"),
  aggregate("bare_nominal_semantic_renyou_chuushi_kinds"),
  aggregate("bare_nominal_semantic_renyou_chuushi_semantic_present")
);

export const PREDICATE_COPULA_PROJECTION_CLAUSE_CONNECTIVE_CLAIM: Expr = all(
  quoteBinding("unbound", "quoted_content"),
  VERBAL_CLAUSE_CHAIN_HOST,
  terminal(null),
  CLAUSE_CONNECTIVE_AT_CHAIN_END,
  aggregate("predicate_copula_projection_clause_connective_prefix_kinds"),
  aggregate("predicate_copula_projection_clause_connective_prefix_copula_present")
);

export const PREDICATE_COPULA_PROJECTION_RENYOU_CHUUSHI_CLAIM: Expr = all(
  quoteBinding("unbound", "quoted_content"),
  VERBAL_CLAUSE_CHAIN_HOST,
  terminal("renyou_chuushi"),
  aggregate("predicate_copula_projection_renyou_chuushi_kinds"),
  aggregate("predicate_copula_projection_renyou_chuushi_copula_present")
);

export const NOMINAL_COPULA_PROJECTION_CLAUSE_CONNECTIVE_CLAIM: Expr = all(
  quoteBinding("unbound", "quoted_content"),
  host("stem_kind", "noun", "adj", "verb", "candidateSet"),
  host("source_predicate_shape", "na_adjective", "nominal", "particle_phrase", "lexical_adverb"),
  terminal(null),
  CLAUSE_CONNECTIVE_AT_CHAIN_END,
  aggregate("nominal_copula_projection_clause_connective_kinds"),
  aggregate("nominal_copula_projection_clause_connective_suffix_copula_present")
);

export const NOMINAL_COPULA_PROJECTION_RENYOU_CHUUSHI_CLAIM: Expr = all(
  quoteBinding("unbound", "quoted_content"),
  host("stem_kind", "noun", "adj", "verb", "candidateSet"),
  host("source_predicate_shape", "na_adjective", "nominal", "particle_phrase", "lexical_adverb"),
  terminal("renyou_chuushi"),
  aggregate("nominal_copula_projection_renyou_chuushi_kinds"),
  aggregate("nominal_copula_projection_renyou_chuushi_suffix_copula_present")
);

export const PLAIN_PREDICATE_TERMINAL_CLAIM: Expr = all(
  quoteBinding("unbound", "quoted_content"),
  VERBAL_CLAUSE_CHAIN_HOST,
  terminal(null),
  aggregate("plain_predicate_terminal_basic_kinds")
);

export const NOUN_COPULA_TERMINAL_CLAIM: Expr = all(
  quoteBinding("unbound", "quoted_content"),
  host("stem_kind", "noun", "adj", "verb", "candidateSet"),
  host("source_predicate_shape", "na_adjective", "nominal", "particle_phrase", "lexical_adverb"),
  terminal(null),
  op(absolute(0), kind("copula")),
  aggregate("noun_copula_terminal_basic_kinds")
);

export const NOUN_COPULA_ADVERBIAL_MODIFIER_CLAIM: Expr = all(
  quoteBinding("unbound", "quoted_content"),
  host("stem_kind", "noun", "adj", "verb", "candidateSet", "adverb"),
  terminal("adverbial_modifier"),
  any(
    all(
      host("source_predicate_shape", "na_adjective", "nominal", "particle_phrase", "lexical_adverb"),
      any(
        lengthEquals(0),
        all(
          op(absolute(0), kind("copula")),
          aggregate("noun_copula_adverbial_modifier_basic_kinds")
        )
      )
    ),
    all(
      host("source_predicate_shape", "i_adjective"),
      lengthEquals(0)
    )
  )
);

export const PREDICATE_APPEARANCE_ADVERBIAL_MODIFIER_CLAIM: Expr = all(
  quoteBinding("unbound", "quoted_content"),
  host("stem_kind", "verb", "adj", "noun", "candidateSet"),
  host(
    "source_predicate_shape",
    "verb",
    "sahen_verbalization",
    "i_adjective",
    "na_adjective",
    "nominal"
  ),
  terminal("adverbial_modifier"),
  op(relative(-1), soudaHearsayModal({ readingIn: ["yotai"], inner: "absent" })),
  aggregate("predicate_appearance_adverbial_modifier_prefix_kinds")
);

export const PREDICATE_PROJECTION_CARRIER_ADVERBIAL_MODIFIER_CLAIM: Expr = all(
  quoteBinding("unbound", "quoted_content"),
  host("stem_kind", "verb", "candidateSet"),
  host("source_predicate_shape", "verb", "sahen_verbalization"),
  terminal("adverbial_modifier"),
  op(relative(-1), projectionCarrier({ carrierIn: ["imminent_nbakari"] })),
  aggregate("predicate_projection_carrier_adverbial_modifier_prefix_kinds")
);

export const BARE_NOMINAL_TERMINAL_CLAIM: Expr = all(
  quoteBinding("unbound", "quoted_content"),
  BARE_NONVERBAL_CLAUSE_CHAIN_HOST,
  terminal(null),
  aggregate("bare_nominal_terminal_basic_kinds")
);

export const PREDICATE_COPULA_PROJECTION_TERMINAL_CLAIM: Expr = all(
  quoteBinding("unbound", "quoted_content"),
  VERBAL_CLAUSE_CHAIN_HOST,
  terminal(null),
  aggregate("predicate_copula_projection_terminal_kinds"),
  aggregate("predicate_copula_projection_terminal_copula_present")
);

export const NOMINAL_COPULA_PROJECTION_TERMINAL_CLAIM: Expr = all(
  quoteBinding("unbound", "quoted_content"),
  host("stem_kind", "noun", "adj", "verb", "candidateSet"),
  host("source_predicate_shape", "na_adjective", "nominal", "particle_phrase", "lexical_adverb"),
  terminal(null),
  aggregate("nominal_copula_projection_terminal_kinds"),
  aggregate("nominal_copula_projection_terminal_suffix_copula_present")
);


export const IMPERATIVE_HOST_STEM_KINDS = [
  "verb",
  "adj",
  "candidateSet"
] as const;

export const IMPERATIVE_HOST_SOURCE_SHAPES = [
  "verb",
  "sahen_verbalization",
  "i_adjective"
] as const;

export const IMPERATIVE_COPULA_LANE_STEM_KINDS = [
  "verb",
  "adj",
  "noun",
  "candidateSet"
] as const;

export const IMPERATIVE_COPULA_LANE_SOURCE_SHAPES = [
  "na_adjective",
  "nominal"
] as const;

type ImperativeChainOpKind = ProductionOpPredicatePattern["kind"];

const IMPERATIVE_CHAIN_OPS = [
  { kind: "voice", head: true, pattern: kind("voice") },
  { kind: "postverbAuxiliary", head: true, pattern: kind("postverbAuxiliary") },
  { kind: "aspect", head: true, pattern: chainableAspect() },
  { kind: "polite", head: false, pattern: kind("polite") }
] as const satisfies readonly {
  readonly kind: ImperativeChainOpKind;
  readonly head: boolean;
  readonly pattern: ProductionOpPredicatePattern;
}[];

export const IMPERATIVE_CHAIN_OP_KINDS: readonly ImperativeChainOpKind[] =
  IMPERATIVE_CHAIN_OPS.map((entry) => entry.kind);

export const IMPERATIVE_CHAIN_HEAD_OP_KINDS: readonly ImperativeChainOpKind[] =
  IMPERATIVE_CHAIN_OPS.filter((entry) => entry.head).map((entry) => entry.kind);

export const IMPERATIVE_CHAIN_OP_PATTERNS: readonly ProductionOpPredicatePattern[] =
  IMPERATIVE_CHAIN_OPS.map((entry) => entry.pattern);

export const IMPERATIVE_STATE_CHANGE_AUX_KINDS = [
  "state_change",
  "make_state_change",
  "make_state_change_causative"
] as const;

const IMPERATIVE_HOST: Expr = all(
  quoteBinding("unbound", "quoted_content"),
  host("stem_kind", ...IMPERATIVE_HOST_STEM_KINDS),
  host("source_predicate_shape", ...IMPERATIVE_HOST_SOURCE_SHAPES),
  terminal("imperative")
);

export const PLAIN_PREDICATE_IMPERATIVE_TERMINAL_CLAIM: Expr = all(
  IMPERATIVE_HOST,
  lengthEquals(0)
);

export const PLAIN_PREDICATE_OPERATOR_CHAIN_IMPERATIVE_TERMINAL_CLAIM: Expr = all(
  IMPERATIVE_HOST,
  lengthAtLeast(1),
  aggregate("plain_operator_chain_imperative_kinds"),
  aggregate("plain_operator_chain_imperative_chainable_aspect"),
  any(
    aggregate("plain_operator_chain_imperative_head_present"),
    all(lengthEquals(1), op(absolute(0), kind("polite")))
  )
);

export const COPULA_IMPERATIVE_TERMINAL_CLAIM: Expr = all(
  quoteBinding("unbound", "quoted_content"),
  host("stem_kind", ...IMPERATIVE_COPULA_LANE_STEM_KINDS),
  host("source_predicate_shape", ...IMPERATIVE_COPULA_LANE_SOURCE_SHAPES),
  terminal("imperative"),
  lengthEquals(1),
  op(absolute(0), copulaPattern({
    variantIn: ["basic"],
    polarityIn: ["affirmative"],
    politeIn: [false]
  }))
);

export const NOUN_COPULA_STATE_CHANGE_IMPERATIVE_TERMINAL_CLAIM: Expr = all(
  quoteBinding("unbound", "quoted_content"),
  host("stem_kind", ...IMPERATIVE_COPULA_LANE_STEM_KINDS),
  host("source_predicate_shape", ...IMPERATIVE_COPULA_LANE_SOURCE_SHAPES),
  terminal("imperative"),
  lengthEquals(2),
  op(absolute(0), copulaPattern({
    variantIn: ["basic"],
    polarityIn: ["affirmative"],
    politeIn: [false]
  })),
  op(absolute(1), postverbAuxiliary({
    auxiliaryKindIn: [...IMPERATIVE_STATE_CHANGE_AUX_KINDS]
  }))
);


export const IMPERATIVE_NEGATION_COMPLEMENT_NEGATION_ARGS = {
  chainDepthIn: [1],
  chainPastIn: [false]
} as const satisfies NegationPredicateArgs;

export const IMPERATIVE_NEGATION_COMPLEMENT_CARRIER_AUX_KINDS = [
  "scope_control"
] as const;

export const IMPERATIVE_NEGATION_COMPLEMENT_NOMINAL_STEM_KINDS = ["noun"] as const;

export const IMPERATIVE_NEGATION_COMPLEMENT_NOMINAL_SOURCE_SHAPES = ["nominal"] as const;

const IMPERATIVE_NEGATION_COMPLEMENT_SFP_GUARD: Expr = not({
  kind: "sfp_effect_membership",
  values: ["quotative_command"]
});

const IMPERATIVE_NEGATION_COMPLEMENT_SCOPE_CONTROL: Expr = all(
  IMPERATIVE_HOST,
  IMPERATIVE_NEGATION_COMPLEMENT_SFP_GUARD,
  lengthEquals(2),
  op(absolute(0), negation(IMPERATIVE_NEGATION_COMPLEMENT_NEGATION_ARGS)),
  op(absolute(1), postverbAuxiliary({
    auxiliaryKindIn: [...IMPERATIVE_NEGATION_COMPLEMENT_CARRIER_AUX_KINDS]
  }))
);

const IMPERATIVE_NEGATION_COMPLEMENT_POLITE_REQUEST: Expr = all(
  IMPERATIVE_HOST,
  IMPERATIVE_NEGATION_COMPLEMENT_SFP_GUARD,
  kindCount(["negation"], 2, "equals", 1),
  kindCount(["polite"], 1, "equals", 1),
  aggregate("imperative_negation_complement_voice_prefix"),
  op(first(["negation"], 0), negation(IMPERATIVE_NEGATION_COMPLEMENT_NEGATION_ARGS)),
  op(first(["negation"], 1), benefactiveAspect({ aspectIn: ["te_kudasaru"] })),
  aggregate("imperative_negation_complement_polite_suffix")
);

const IMPERATIVE_NEGATION_COMPLEMENT_NOUN_COPULA: Expr = all(
  quoteBinding("unbound", "quoted_content"),
  IMPERATIVE_NEGATION_COMPLEMENT_SFP_GUARD,
  host("stem_kind", ...IMPERATIVE_NEGATION_COMPLEMENT_NOMINAL_STEM_KINDS),
  host("source_predicate_shape", ...IMPERATIVE_NEGATION_COMPLEMENT_NOMINAL_SOURCE_SHAPES),
  terminal("imperative"),
  lengthEquals(4),
  op(absolute(0), copulaPattern({
    variantIn: ["basic"],
    polarityIn: ["affirmative"],
    politeIn: [false]
  })),
  op(absolute(1), postverbAuxiliary({
    auxiliaryKindIn: [...IMPERATIVE_STATE_CHANGE_AUX_KINDS]
  })),
  op(absolute(2), negation(IMPERATIVE_NEGATION_COMPLEMENT_NEGATION_ARGS)),
  op(absolute(3), postverbAuxiliary({
    auxiliaryKindIn: [...IMPERATIVE_NEGATION_COMPLEMENT_CARRIER_AUX_KINDS]
  }))
);

export const PREDICATE_NEGATION_COMPLEMENT_IMPERATIVE_TERMINAL_CLAIM: Expr = any(
  IMPERATIVE_NEGATION_COMPLEMENT_SCOPE_CONTROL,
  IMPERATIVE_NEGATION_COMPLEMENT_POLITE_REQUEST,
  IMPERATIVE_NEGATION_COMPLEMENT_NOUN_COPULA
);


export const PLAIN_PREDICATE_SEMANTIC_OPERATOR_TERMINAL_CLAIM: Expr = all(
  quoteBinding("unbound", "quoted_content"),
  VERBAL_CLAUSE_CHAIN_HOST,
  terminal(null),
  aggregate("plain_semantic_terminal_kinds"),
  aggregate("plain_semantic_terminal_semantic_present")
);

export const NOUN_COPULA_SEMANTIC_OPERATOR_TERMINAL_CLAIM: Expr = all(
  quoteBinding("unbound", "quoted_content"),
  host("stem_kind", "noun", "adj", "verb", "candidateSet"),
  host("source_predicate_shape", "na_adjective", "nominal", "particle_phrase", "lexical_adverb"),
  terminal(null),
  op(absolute(0), kind("copula")),
  aggregate("noun_copula_semantic_terminal_kinds"),
  aggregate("noun_copula_semantic_terminal_semantic_present"),
  aggregate("noun_copula_semantic_terminal_copula_variant")
);

export const BARE_NOMINAL_SEMANTIC_OPERATOR_TERMINAL_CLAIM: Expr = all(
  quoteBinding("unbound", "quoted_content"),
  BARE_NONVERBAL_CLAUSE_CHAIN_HOST,
  terminal(null),
  aggregate("bare_nominal_semantic_terminal_kinds"),
  aggregate("bare_nominal_semantic_terminal_semantic_present")
);

export const PREDICATE_COPULA_PROJECTION_SEMANTIC_OPERATOR_TERMINAL_CLAIM: Expr = all(
  quoteBinding("unbound", "quoted_content"),
  VERBAL_CLAUSE_CHAIN_HOST,
  terminal(null),
  aggregate("predicate_copula_projection_semantic_terminal_kinds"),
  aggregate("predicate_copula_projection_semantic_terminal_copula_present"),
  aggregate("predicate_copula_projection_semantic_terminal_semantic_present")
);

export const NOMINAL_COPULA_PROJECTION_SEMANTIC_OPERATOR_TERMINAL_CLAIM: Expr = all(
  quoteBinding("unbound", "quoted_content"),
  host("stem_kind", "adj", "verb", "candidateSet"),
  host("source_predicate_shape", "na_adjective", "nominal", "particle_phrase", "lexical_adverb"),
  terminal(null),
  aggregate("nominal_copula_projection_semantic_terminal_kinds"),
  aggregate("nominal_copula_projection_semantic_terminal_suffix_copula_present"),
  aggregate("nominal_copula_projection_semantic_terminal_semantic_present"),
  aggregate("nominal_copula_projection_semantic_terminal_copula_variant")
);


export const PLAIN_PREDICATE_NOMINALIZED_CLAIM: Expr = all(
  quoteBinding("unbound"),
  VERBAL_CLAUSE_CHAIN_HOST,
  terminal("nominalized"),
  aggregate("plain_predicate_nominalized_kinds"),
  aggregate("plain_predicate_nominalized_tense_past")
);

export const NOUN_COPULA_NOMINALIZED_CLAIM: Expr = all(
  quoteBinding("unbound"),
  host("stem_kind", "noun", "adj", "verb", "candidateSet"),
  host("source_predicate_shape", "na_adjective", "nominal", "particle_phrase", "lexical_adverb"),
  terminal("nominalized"),
  op(absolute(0), kind("copula")),
  aggregate("noun_copula_nominalized_kinds"),
  aggregate("noun_copula_nominalized_tense_past")
);

export const BARE_NOMINAL_NOMINALIZED_CLAIM: Expr = all(
  quoteBinding("unbound"),
  BARE_NONVERBAL_CLAUSE_CHAIN_HOST,
  terminal("nominalized"),
  aggregate("bare_nominal_nominalized_kinds"),
  aggregate("bare_nominal_nominalized_tense_past")
);

export const PREDICATE_COPULA_PROJECTION_NOMINALIZED_CLAIM: Expr = all(
  quoteBinding("unbound"),
  VERBAL_CLAUSE_CHAIN_HOST,
  terminal("nominalized"),
  aggregate("predicate_copula_projection_nominalized_kinds"),
  aggregate("predicate_copula_projection_nominalized_tense_past"),
  aggregate("predicate_copula_projection_nominalized_copula_present")
);

export const NOMINAL_COPULA_PROJECTION_NOMINALIZED_CLAIM: Expr = all(
  quoteBinding("unbound"),
  host("stem_kind", "noun", "adj", "verb", "candidateSet"),
  host("source_predicate_shape", "na_adjective", "nominal", "particle_phrase", "lexical_adverb"),
  terminal("nominalized"),
  aggregate("nominal_copula_projection_nominalized_kinds"),
  aggregate("nominal_copula_projection_nominalized_tense_past"),
  aggregate("nominal_copula_projection_nominalized_suffix_copula_present")
);

export const PROJECTION_SUBORDINATION_CONNECTIVE_KINDS = [
  "predicate_projection_purpose",
  "predicate_projection_tame_gerund",
  "predicate_projection_derivational_nominal_m",
  "tame_reason",
  "tame_purpose",
  "predicate_projection_degree_extent",
  "predicate_projection_quantity_extent",
  "predicate_projection_proportional_reason",
  "predicate_projection_manner_simile",
  "predicate_projection_until",
  "predicate_projection_comparison",
  "predicate_projection_intentional_purpose",
  "predicate_projection_as_far_as",
  "predicate_projection_ni_complement",
  "predicate_projection_occasion",
  "predicate_projection_manner_volitional",
  "predicate_projection_until_attributive",
  "predicate_projection_parallel_change",
  "predicate_projection_correlative_degree",
  "predicate_projection_simultaneous_time",
  "predicate_projection_additive_ue_ni",
  "predicate_projection_ue_de",
  "predicate_projection_ue_de_attributive",
  "predicate_projection_manner_simile_action",
  "predicate_projection_wish_terminal",
  "predicate_projection_ni_complement_worth",
  "predicate_projection_evaluation_extent",
  "predicate_projection_ni_complement_outcome",
  "predicate_projection_no_quote_reporting",
  "predicate_projection_ni_complement_m",
  "predicate_projection_concession_echo",
  "predicate_projection_ni_complement_cannot_bear",
  "predicate_projection_repeated_occasion",
  "predicate_projection_gatera",
  "purpose_motion",
  "bound_nominal_reason",
  "bound_nominal_listing",
  "external_nominalizer_comparison",
  "external_nominalizer_concessive",
  "external_nominalizer_additive",
  "external_nominalizer_conformity",
  "purpose_evaluation_nominalizer",
  "focus_limit_de",
  "focus_limit_nara",
  "focus_additive_negative",
  "focus_additive_denaku",
  "focus_reversal_dokoro_ka",
  "additive_besides",
  "temporal_since",
  "recent_past_bakari_ni_reason"
] as const satisfies NonNullable<ConnectivePredicateArgs["connectiveIn"]>;

export const DERIVED_MARKER_SUBORDINATION_CONNECTIVE_KINDS = [
  "origin",
  "established_premise",
  "predicate_projection_purpose_beku",
  "inevitable_reason"
] as const satisfies NonNullable<ConnectivePredicateArgs["connectiveIn"]>;

export const COMPLEMENT_INCORPORATION_CONNECTIVE_KINDS = [
  "quotative",
  "cognitive_complement",
  "request_complement",
  "wish_complement",
  "question_content",
  "question_content_alternative",
  "question_quotative"
] as const satisfies NonNullable<ConnectivePredicateArgs["connectiveIn"]>;

export const QUOTATIVE_DERIVED_MARKER_CONNECTIVE_KINDS = [
  "quoted_concessive",
  "reformulation",
  "retrospective_quotative",
  "question_reformulation",
  "reason_quoted_judgment_passive",
  "predicate_projection_quote_attributive",
  "predicate_projection_quotative_manner_simile",
  "predicate_projection_quotative_manner_simile_attributive"
] as const satisfies NonNullable<ConnectivePredicateArgs["connectiveIn"]>;


type SubordinationConnectiveKind =
  | (typeof PROJECTION_SUBORDINATION_CONNECTIVE_KINDS)[number]
  | (typeof DERIVED_MARKER_SUBORDINATION_CONNECTIVE_KINDS)[number];

type QuoteIncorporationConnectiveKind =
  | (typeof COMPLEMENT_INCORPORATION_CONNECTIVE_KINDS)[number]
  | (typeof QUOTATIVE_DERIVED_MARKER_CONNECTIVE_KINDS)[number];

const _subordinationAxesDisjoint: [
  Extract<
    (typeof PROJECTION_SUBORDINATION_CONNECTIVE_KINDS)[number],
    (typeof DERIVED_MARKER_SUBORDINATION_CONNECTIVE_KINDS)[number]
  >
] extends [never] ? true : never = true;
void _subordinationAxesDisjoint;

const _quoteIncorporationAxesDisjoint: [
  Extract<
    (typeof COMPLEMENT_INCORPORATION_CONNECTIVE_KINDS)[number],
    (typeof QUOTATIVE_DERIVED_MARKER_CONNECTIVE_KINDS)[number]
  >
] extends [never] ? true : never = true;
void _quoteIncorporationAxesDisjoint;

const _subordinationDisjointFromClauseConnective: [
  Extract<SubordinationConnectiveKind, (typeof CLAUSE_CONNECTIVE_KINDS)[number]>
] extends [never] ? true : never = true;
void _subordinationDisjointFromClauseConnective;

const _subordinationDisjointFromQuoteIncorporation: [
  Extract<SubordinationConnectiveKind, QuoteIncorporationConnectiveKind>
] extends [never] ? true : never = true;
void _subordinationDisjointFromQuoteIncorporation;

const _quoteIncorporationDisjointFromClauseConnective: [
  Extract<QuoteIncorporationConnectiveKind, (typeof CLAUSE_CONNECTIVE_KINDS)[number]>
] extends [never] ? true : never = true;
void _quoteIncorporationDisjointFromClauseConnective;

export const PROJECTION_SUBORDINATION_CLAUSE_CONNECTIVE_CLAIM: Expr = all(
  quoteBinding("unbound", "quoted_content"),
  terminal(null),
  op(
    relative(-1),
    connective({ connectiveIn: PROJECTION_SUBORDINATION_CONNECTIVE_KINDS })
  ),
  aggregate("projection_subordination_connective_prefix_kinds")
);

export const DERIVED_MARKER_SUBORDINATION_CLAUSE_CONNECTIVE_CLAIM: Expr = all(
  quoteBinding("unbound", "quoted_content"),
  terminal(null),
  op(
    relative(-1),
    connective({ connectiveIn: DERIVED_MARKER_SUBORDINATION_CONNECTIVE_KINDS })
  ),
  aggregate("derived_marker_subordination_connective_prefix_kinds")
);

export const COMPLEMENT_INCORPORATION_CLAUSE_CONNECTIVE_CLAIM: Expr = all(
  quoteBinding("unbound", "quoted_content"),
  terminal(null),
  op(
    relative(-1),
    connective({ connectiveIn: COMPLEMENT_INCORPORATION_CONNECTIVE_KINDS })
  ),
  aggregate("complement_incorporation_connective_prefix_kinds")
);

export const QUOTATIVE_DERIVED_MARKER_CLAUSE_CONNECTIVE_CLAIM: Expr = all(
  quoteBinding("unbound", "quoted_content"),
  terminal(null),
  op(
    relative(-1),
    connective({ connectiveIn: QUOTATIVE_DERIVED_MARKER_CONNECTIVE_KINDS })
  ),
  aggregate("quotative_derived_marker_connective_prefix_kinds")
);

const ZUNI_SUMU_IDIOM = negativeNecessitySumuIdiom({
  variantIn: ["zuni_sumu"],
  polarityIn: ["affirmative"],
  politeIn: [false],
  pastIn: [false]
});

export const ZUNI_SUMU_QUOTE_TTE_CLAIM: Expr = all(
  terminal(null),
  all(
    op(absolute(1), kind("negation")),
    op(absolute(2), ZUNI_SUMU_IDIOM),
    op(absolute(3), tense({ tenseIn: ["past"] }))
  ),
  any(
    all(
      quoteBinding("quoted_content"),
      host("stem_kind", "adj"),
      host("source_predicate_shape", "i_adjective"),
      projection("supports_category", "adjectival_predicate"),
      lengthEquals(5),
      op(absolute(0), postverbAuxiliary({
        auxiliaryKindIn: ["state_change"]
      })),
      op(absolute(4), connective({
        connectiveIn: ["quotative"],
        surfaceAllomorphIn: ["to"]
      }))
    ),
    all(
      quoteBinding("unbound"),
      host("stem_kind", "verb"),
      host("source_predicate_shape", "verb", "sahen_verbalization"),
      projection("supports_category", "verbal_predicate"),
      lengthEquals(5),
      any(
        all(
          op(absolute(0), voice({ voiceIn: ["passive"] })),
          op(absolute(4), connective({
            connectiveIn: ["predicate_projection_quote_attributive"]
          }))
        ),
        all(
          op(absolute(0), voice({ voiceIn: ["causative"] })),
          op(absolute(4), connective({
            connectiveIn: ["adversative"]
          }))
        )
      )
    )
  )
);

export const SOURCE_VERBAL_ADJECTIVAL_DESIDERATIVE_CLAIM: Expr = all(
  host("source_predicate_shape", "verb"),
  projection("admits_only_category", "adjectival_predicate"),
  PLAIN_TE_HOSHII_AT(absolute(0)),
  any(lengthEquals(1), all(lengthEquals(2), WISH_COMPLEMENT_AT(absolute(1))))
);

const VOLITIONAL_STEM = all(
  host("stem_kind", "verb"),
  host("stem_mood", "volitional"),
  lengthEquals(1)
);

export const VOLITIONAL_RETROSPECTIVE_QUOTATIVE_CLAIM: Expr = all(
  VOLITIONAL_STEM,
  op(
    absolute(0),
    connective({
      connectiveIn: ["retrospective_quotative"],
      retrospectiveQuotativeFlavorIn: ["direct_thought", "volitional_deliberative"]
    })
  )
);

export const CONJECTURAL_QUOTATIVE_CLAIM: Expr = all(
  host("source_predicate_shape", "i_adjective"),
  any(
    projection("supports_category", "adjectival_predicate"),
    projection("supports_category", "verbal_predicate")
  ),
  host("stem_mood", "conjectural"),
  quoteBinding("quoted_content"),
  lengthEquals(1),
  op(
    absolute(0),
    connective({
      connectiveIn: ["quotative"],
      surfaceAllomorphIn: ["to"]
    })
  )
);

const QUOTATIVE_INSISTENT_SIMPLE_HOST: Expr = all(
  host("source_predicate_shape", "verb", "i_adjective"),
  any(
    projection("supports_category", "verbal_predicate"),
    projection("supports_category", "adjectival_predicate")
  )
);

export const QUOTATIVE_INSISTENT_TERMINAL_CLAIM: Expr = all(
  quoteBinding("unbound"),
  host("stem_mood", undefined),
  lengthEquals(0),
  { kind: "sfp_effect_membership", values: ["quotative_insistent"] },
  any(
    all(terminal(null), QUOTATIVE_INSISTENT_SIMPLE_HOST),
    all(
      terminal("imperative"),
      host("source_predicate_shape", "verb"),
      projection("supports_category", "verbal_predicate")
    )
  )
);

const REINFORCED_POTENTIAL_AT = (
  selector: ProductionClaimOpSelector
): Expr => op(
  selector,
  postverbAuxiliary({
    auxiliaryKindIn: ["potential"],
    potentialCompositionIn: ["reinforce_existing"]
  })
);

export const REINFORCED_POTENTIAL_COMPOSITION_CLAIM: Expr = all(
  host("source_predicate_shape", "verb"),
  projection("supports_category", "verbal_predicate"),
  quoteBinding("unbound"),
  any(
    all(
      terminal(null),
      lengthEquals(2),
      REINFORCED_POTENTIAL_AT(absolute(0)),
      op(absolute(1), connective({ connectiveIn: ["conditional"] })),
      { kind: "sfp_presence", present: false }
    ),
    all(
      terminal("attributive"),
      lengthEquals(1),
      REINFORCED_POTENTIAL_AT(absolute(0)),
      { kind: "sfp_presence", present: false }
    ),
    all(
      terminal(null),
      lengthEquals(2),
      REINFORCED_POTENTIAL_AT(absolute(0)),
      op(absolute(1), modal({
        modalIn: ["noda"],
        politeIn: [false],
        pastIn: [false],
        inner: "absent"
      })),
      { kind: "sfp_effect_membership", values: ["ka"] }
    ),
    all(
      terminal("attributive"),
      lengthEquals(2),
      REINFORCED_POTENTIAL_AT(absolute(0)),
      op(absolute(1), quoteCarrier({
        styleIn: ["compact_toiu"],
        allomorphIn: ["toiu"]
      })),
      { kind: "sfp_presence", present: false }
    )
  )
);

export const PROPOSITION_ASSERTABILITY_KOTO_DEKIRU_CLAIM: Expr = all(
  host("source_predicate_shape", "i_adjective"),
  host("stem_mood", undefined),
  any(
    projection("supports_category", "adjectival_predicate"),
    projection("supports_category", "verbal_predicate")
  ),
  quoteBinding("unbound"),
  terminal(null),
  lengthEquals(4),
  { kind: "sfp_presence", present: false },
  op(absolute(0), quoteCarrier({
    styleIn: ["compact_toiu"],
    allomorphIn: ["toiu"]
  })),
  op(absolute(1), potentialKotoDekiru({
    particleKindIn: ["wa"],
    focusParticle: "absent",
    polarityIn: ["affirmative"],
    politeIn: [false],
    pastIn: [false]
  })),
  op(absolute(2), negation({
    chainDepthIn: [1],
    chainPastIn: [false],
    sourceSplit: "absent"
  })),
  op(absolute(3), connective({ connectiveIn: ["adversative"] }))
);

export const VOLITIONAL_WISH_COMPLEMENT_CLAIM: Expr = all(
  VOLITIONAL_STEM,
  WISH_COMPLEMENT_AT(absolute(0))
);

export const VOLITIONAL_QUOTE_ATTRIBUTIVE_CLAIM: Expr = all(
  VOLITIONAL_STEM,
  op(
    absolute(0),
    connective({
      connectiveIn: ["predicate_projection_quote_attributive"],
      quoteAttributiveFlavorIn: ["intentional_modifier", "cohortative_quote"]
    })
  )
);

export const VOLITIONAL_REQUEST_COMPLEMENT_CLAIM: Expr = all(
  VOLITIONAL_STEM,
  op(absolute(0), connective({ connectiveIn: ["request_complement"] }))
);

export const REQUEST_TERMINAL_BOUNDARY_CLAIM: Expr = all(
  terminal(null),
  projection("supports_category", "verbal_predicate"),
  op(absolute(0), requestAspect()),
  any(
    all(
      host("source_predicate_shape", "verb"),
      lengthEquals(1),
      { kind: "sfp_effect_membership", values: ["ka"] }
    ),
    all(
      host("source_predicate_shape", "verb", "sahen_verbalization"),
      lengthEquals(2),
      { kind: "sfp_presence", present: false },
      op(
        absolute(1),
        connective({
          connectiveIn: ["quotative"],
          surfaceAllomorphIn: ["to"],
          quotativeMoodIn: ["imperative"]
        })
      )
    ),
    all(
      host("source_predicate_shape", "verb", "sahen_verbalization"),
      lengthEquals(2),
      { kind: "sfp_presence", present: false },
      any(
        op(
          absolute(1),
          connective({ connectiveIn: ["wish_complement", "quoted_concessive"] })
        ),
        op(
          absolute(1),
          connective({
            connectiveIn: ["request_complement"],
            surfaceAllomorphIn: ["to"]
          })
        )
      )
    ),
    all(
      host("source_predicate_shape", "verb", "sahen_verbalization"),
      lengthEquals(2),
      { kind: "sfp_presence", present: false },
      op(absolute(0), requestAspect({ aspectIn: ["te_kudasai"] })),
      op(
        absolute(1),
        connective({
          connectiveIn: ["quotative"],
          surfaceAllomorphIn: ["other"],
          quotativeMoodIn: ["imperative"],
          quotativeClosureIn: ["reported_request"]
        })
      )
    )
  )
);

const BENEFACTIVE_NODA_TERMINAL_SFP: Expr = all(
  terminal(null),
  { kind: "sfp_presence", present: true },
  { kind: "sfp_effect_membership", values: [null, "ka"] }
);

const BENEFACTIVE_NODA_CORE_AT = (benefactiveIndex: number, nodaIndex: number): Expr => all(
  op(absolute(benefactiveIndex), benefactiveAspect({ aspectIn: ["te_kureru"] })),
  op(absolute(nodaIndex), modal({ modalIn: ["noda"] }))
);

export const BENEFACTIVE_NODA_TERMINAL_CLAIM: Expr = all(
  BENEFACTIVE_NODA_TERMINAL_SFP,
  any(
    all(
      host("source_predicate_shape", "verb", "sahen_verbalization"),
      projection("supports_category", "verbal_predicate"),
      lengthEquals(2),
      BENEFACTIVE_NODA_CORE_AT(0, 1)
    ),
    all(
      host("source_predicate_shape", "verb"),
      projection("supports_category", "verbal_predicate"),
      lengthEquals(3),
      op(absolute(0), voice({ voiceIn: ["causative"] })),
      BENEFACTIVE_NODA_CORE_AT(1, 2)
    ),
    all(
      host("source_predicate_shape", "na_adjective"),
      projection("supports_category", "adjectival_predicate"),
      lengthEquals(4),
      op(absolute(0), copulaPattern({
        variantIn: ["basic"],
        polarityIn: ["affirmative"],
        politeIn: [false]
      })),
      op(absolute(1), postverbAuxiliary({ auxiliaryKindIn: ["make_state_change"] })),
      BENEFACTIVE_NODA_CORE_AT(2, 3)
    )
  )
);

const REQUEST_COMPOSED_HOST = all(
  any(
    host("source_predicate_shape", "verb", "sahen_verbalization", "i_adjective", "na_adjective")
  ),
  any(
    projection("supports_category", "verbal_predicate"),
    projection("supports_category", "adjectival_predicate")
  )
);

const REQUEST_COMPOSED_COPULA_POSITION: Expr = any(
  kindCount(["copula"], 2, "equals", 0),
  all(
    kindCount(["copula"], 2, "equals", 1),
    op(absolute(0), copulaPattern({
      variantIn: ["basic"],
      polarityIn: ["affirmative"],
      politeIn: [false]
    }))
  )
);

const REQUEST_COMPOSED_TERMINAL_PREFIX: Expr = all(
  aggregate("request_composed_terminal_prefix_kinds"),
  aggregate("request_composed_terminal_aspects"),
  aggregate("request_composed_terminal_has_head"),
  REQUEST_COMPOSED_COPULA_POSITION
);

const REQUEST_COMPOSED_COMPLEMENT_PREFIX: Expr = all(
  aggregate("request_composed_complement_prefix_kinds"),
  aggregate("request_composed_complement_aspects"),
  aggregate("request_composed_complement_has_head"),
  REQUEST_COMPOSED_COPULA_POSITION
);

const REQUEST_COMPOSED_TERMINAL_SFP: Expr = any(
  { kind: "sfp_presence", present: false },
  { kind: "sfp_effect_membership", values: [null, "ne", "na_excl"] }
);

const REQUEST_COMPOSED_WRAPPED_TERMINAL: Expr = any(
  all(
    lengthEquals(3),
    op(absolute(0), kind("negation")),
    op(absolute(1), ...requestCommandBase()),
    op(absolute(2), requestAspect()),
    REQUEST_COMPOSED_TERMINAL_SFP
  ),
  all(
    lengthEquals(4),
    op(absolute(0), ...requestCommandBase()),
    op(absolute(1), kind("negation")),
    op(absolute(2), ...requestCommandBase()),
    op(absolute(3), requestAspect()),
    REQUEST_COMPOSED_TERMINAL_SFP
  )
);

const REQUEST_CARRIER_CHAIN_HEARSAY_MODAL: ProductionOpPredicatePattern = soudaHearsayModal({
  readingIn: ["hearsay"],
  inner: "absent"
});
const REQUEST_CARRIER_CHAIN_WAKE_MODAL: ProductionOpPredicatePattern = modal({
  modalIn: ["wake"],
  inner: "absent"
});

const REQUEST_NOMINALIZED_TERMINAL_NODA: ProductionOpPredicatePattern = modal({
  modalIn: ["noda"],
  politeIn: [false],
  pastIn: [false],
  inner: "absent"
});

export const REQUEST_ON_COMPOSED_PREDICATE_BASE_CLAIM: Expr = all(
  REQUEST_COMPOSED_HOST,
  lengthAtLeast(2),
  any(
    all(
      terminal(null),
      op(relative(-1), requestAspect()),
      REQUEST_COMPOSED_TERMINAL_PREFIX,
      REQUEST_COMPOSED_TERMINAL_SFP
    ),
    all(terminal(null), REQUEST_COMPOSED_WRAPPED_TERMINAL),
    all(
      terminal(null),
      lengthAtLeast(3),
      op(relative(-2), requestAspect()),
      any(
        op(relative(-1), connective({
          connectiveIn: ["wish_complement", "quoted_concessive"]
        })),
        op(relative(-1), connective({
          connectiveIn: ["request_complement"],
          surfaceAllomorphIn: ["to", "tte"]
        }))
      ),
      REQUEST_COMPOSED_COMPLEMENT_PREFIX,
      { kind: "sfp_presence", present: false }
    ),
    all(
      terminal(null),
      lengthAtLeast(3),
      op(relative(-2), requestAspect({ aspectIn: ["te_kudasai"] })),
      op(relative(-1), connective({
        connectiveIn: ["quotative"],
        surfaceAllomorphIn: ["other"],
        quotativeMoodIn: ["imperative"],
        quotativeClosureIn: ["reported_request"]
      })),
      REQUEST_COMPOSED_COMPLEMENT_PREFIX,
      { kind: "sfp_presence", present: false }
    ),
    all(
      any(terminal("attributive"), terminal(null)),
      lengthEquals(3),
      op(absolute(0), ...requestCommandBase()),
      op(absolute(1), requestAspect()),
      op(absolute(2), quoteCarrier({ styleIn: ["compact_toiu"] })),
      { kind: "sfp_presence", present: false }
    ),
    all(
      terminal(null),
      { kind: "sfp_presence", present: false },
      any(
        all(
          lengthEquals(2),
          op(absolute(0), requestAspect()),
          op(absolute(1), REQUEST_NOMINALIZED_TERMINAL_NODA)
        ),
        all(
          lengthEquals(3),
          op(absolute(0), requestAspect()),
          op(absolute(1), copulaPattern({
            variantIn: ["basic"],
            polarityIn: ["affirmative"],
            politeIn: [false]
          })),
          op(absolute(2), REQUEST_NOMINALIZED_TERMINAL_NODA)
        )
      )
    ),
    all(
      terminal(null),
      { kind: "sfp_presence", present: false },
      op(absolute(0), requestAspect()),
      any(
        all(
          lengthEquals(3),
          op(
            absolute(1),
            REQUEST_CARRIER_CHAIN_HEARSAY_MODAL,
            quoteCarrier({ styleIn: ["compact_toiu"] })
          ),
          op(absolute(2), kind("connective"))
        ),
        all(
          lengthEquals(4),
          op(absolute(1), quoteCarrier({ styleIn: ["compact_toiu"] })),
          op(absolute(2), REQUEST_CARRIER_CHAIN_WAKE_MODAL),
          op(absolute(3), kind("connective"))
        )
      )
    ),
    all(
      terminal(null),
      { kind: "sfp_presence", present: false },
      lengthEquals(2),
      op(absolute(0), requestAspect()),
      op(absolute(1), youdaModal({
        formIn: ["youda", "mitai"],
        terminalIn: ["attributive_na"],
        readingIn: ["likeness"],
        politeIn: [false],
        pastIn: [false],
        inner: "absent"
      }))
    )
  )
);
