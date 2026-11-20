import type {
  AuxOpKind,
  AuxOpNode,
  AspectRenderStrategy,
  AspectOp,
  BenefactiveAspectOp,
  ConnectiveOp,
  CopulaOp,
  ForbiddenIdiomOp,
  IdiomKind,
  ModalOp,
  NegationOp,
  NegativeNecessitySumuIdiomOp,
  ObligationIdiomOp,
  PermissionIdiomOp,
  PostverbAuxiliaryOp,
  PotentialKotoGaDekiruIdiomOp,
  PredicateProjectionCarrierOp,
  PredicateQuoteCarrierOp,
  RequestAspectOp,
  AdjCopulaBridgeOp,
  ScopeBridgeOp,
  SoudaHearsayModalOp,
  TenseOp,
  VoiceOp,
  YoudaModalOp
} from "./grammar.js";
import {
  ASPECT_INVENTORY,
  ASPECT_RENDER_STRATEGY_VALUES,
  CONDITIONAL_QUOTE_ELLIPSIS_VALUES,
  BENEFACTIVE_ASPECT_VALUES,
  CONNECTIVE_SURFACE_ALLOMORPH_VALUES,
  CONNECTIVE_INVENTORY,
  COPULA_HONORIFIC_VALUES,
  COPULA_NEGATIVE_BRIDGE_FORM_VALUES,
  IDIOM_INVENTORY,
  COPULA_VARIANT_VALUES,
  MODAL_INVENTORY,
  NEGATIVE_NECESSITY_SUMU_VARIANT_VALUES,
  OBLIGATION_VARIANT_VALUES,
  POSTVERB_AUXILIARY_INVENTORY,
  POTENTIAL_KOTO_DEKIRU_PARTICLE_VALUES,
  POTENTIAL_COMPOSITION_VALUES,
  POLARITY_VALUES,
  PERMISSION_CONNECTIVE_SURFACE_VALUES,
  PERMISSION_VARIANT_VALUES,
  PREDICATE_PROJECTION_CARRIER_VALUES,
  PREDICATE_QUOTE_CARRIER_ALLOMORPH_VALUES,
  PREDICATE_QUOTE_CARRIER_STYLE_VALUES,
  QUOTATIVE_CLOSURE_VALUES,
  QUOTATIVE_MOOD_VALUES,
  REQUEST_ASPECT_VALUES,
  ADJ_COPULA_BRIDGE_FORM_VALUES,
  SCOPE_BRIDGE_FORM_VALUES,
  SCOPE_BRIDGE_HEAD_VALUES,
  SCOPE_BRIDGE_PARTICLE_VALUES,
  SOUDA_READING_VALUES,
  QUOTE_ATTRIBUTIVE_FLAVOR_VALUES,
  RETROSPECTIVE_QUOTATIVE_FLAVOR_VALUES,
  STRUCTURAL_CONTINUATION_VALUES,
  TENSE_VALUES,
  VOICE_VALUES,
  YOUDA_FORM_VALUES,
  YOUDA_READING_VALUES,
  YOUDA_TERMINAL_VALUES
} from "./grammar.js";
import { isRequestAspectOp, isRequestCommandBaseOp } from "./inspect.js";
import {
  isChainableAspectOpKind,
  isChainableIdiomOpKind
} from "./operator-head.js";
import { isPlainTeHoshiiAspect } from "./production-admission-helpers.js";

export interface ConnectivePredicateArgs {
  readonly connectiveIn?: readonly ConnectiveOp["connective"][];
  readonly connectiveNotIn?: readonly ConnectiveOp["connective"][];
  readonly surfaceAllomorphIn?: readonly ConnectiveOp["allomorph"][];
  readonly conditionalFlavor?: "present" | "absent";
  readonly conditionalQuoteEllipsisNotIn?: readonly NonNullable<
    ConnectiveOp["conditionalQuoteEllipsis"]
  >[];
  readonly quotativeClosureIn?: readonly NonNullable<ConnectiveOp["quotativeClosure"]>[];
  readonly quotativeClosureNotIn?: readonly NonNullable<ConnectiveOp["quotativeClosure"]>[];
  readonly quotativeMoodIn?: readonly NonNullable<ConnectiveOp["quotativeMood"]>[];
  readonly retrospectiveQuotativeFlavorIn?: readonly NonNullable<
    ConnectiveOp["retrospectiveQuotativeFlavor"]
  >[];
  readonly quoteAttributiveFlavorIn?: readonly NonNullable<
    ConnectiveOp["quoteAttributiveFlavor"]
  >[];
  readonly structuralContinuationNotIn?: readonly NonNullable<
    ConnectiveOp["structuralContinuation"]
  >[];
}

export interface CopulaPredicateArgs {
  readonly variantIn?: readonly CopulaOp["variant"][];
  readonly polarityIn?: readonly CopulaOp["polarity"][];
  readonly basicForm?: "absent";
  readonly negativeBridgeFormIn?: readonly (
    NonNullable<CopulaOp["negativeBridgeForm"]> | "absent"
  )[];
  readonly honorificIn?: readonly (NonNullable<CopulaOp["honorific"]> | "absent")[];
  readonly politeIn?: readonly CopulaOp["polite"][];
}

export interface IdiomKindPredicateArgs {
  readonly idiomIn?: readonly IdiomKind[];
}

export interface PermissionIdiomPredicateArgs {
  readonly variantIn?: readonly PermissionIdiomOp["variant"][];
  readonly connectiveSurfaceIn?: readonly PermissionIdiomOp["connectiveSurface"][];
}

export interface ObligationIdiomPredicateArgs {
  readonly variantIn?: readonly ObligationIdiomOp["variant"][];
  readonly polarityIn?: readonly ObligationIdiomOp["polarity"][];
  readonly politeIn?: readonly ObligationIdiomOp["polite"][];
  readonly pastIn?: readonly ObligationIdiomOp["past"][];
  readonly inner?: "absent";
}

export interface ForbiddenIdiomPredicateArgs {
  readonly polarityIn?: readonly ForbiddenIdiomOp["polarity"][];
  readonly politeIn?: readonly ForbiddenIdiomOp["polite"][];
  readonly pastIn?: readonly ForbiddenIdiomOp["past"][];
  readonly inner?: "absent";
}

export interface NegativeNecessitySumuIdiomPredicateArgs {
  readonly variantIn?: readonly NegativeNecessitySumuIdiomOp["variant"][];
  readonly polarityIn?: readonly NegativeNecessitySumuIdiomOp["polarity"][];
  readonly politeIn?: readonly NegativeNecessitySumuIdiomOp["polite"][];
  readonly pastIn?: readonly NegativeNecessitySumuIdiomOp["past"][];
}

export interface TensePredicateArgs {
  readonly tenseIn?: readonly TenseOp["tense"][];
}

export interface ModalPredicateArgs {
  readonly modalIn?: readonly ModalOp["modal"][];
  readonly politeIn?: readonly ModalOp["polite"][];
  readonly pastIn?: readonly ModalOp["past"][];
  readonly inner?: "absent";
}

export interface YoudaModalPredicateArgs {
  readonly formIn?: readonly YoudaModalOp["form"][];
  readonly terminalIn?: readonly YoudaModalOp["terminal"][];
  readonly readingIn?: readonly YoudaModalOp["reading"][];
  readonly politeIn?: readonly YoudaModalOp["polite"][];
  readonly pastIn?: readonly YoudaModalOp["past"][];
  readonly inner?: "absent";
}

export interface SoudaHearsayModalPredicateArgs {
  readonly readingIn?: readonly SoudaHearsayModalOp["reading"][];
  readonly politeIn?: readonly SoudaHearsayModalOp["polite"][];
  readonly pastIn?: readonly SoudaHearsayModalOp["past"][];
  readonly inner?: "absent";
}

export interface AdjCopulaBridgePredicateArgs {
  readonly formIn?: readonly AdjCopulaBridgeOp["form"][];
}

export interface ScopeBridgePredicateArgs {
  readonly headIn?: readonly ScopeBridgeOp["head"][];
  readonly formIn?: readonly ScopeBridgeOp["form"][];
  readonly particleIn?: readonly ScopeBridgeOp["particle"][];
  readonly polarityIn?: readonly ScopeBridgeOp["polarity"][];
  readonly chainDepthIn?: readonly ScopeBridgeOp["chainDepth"][];
  readonly politeIn?: readonly ScopeBridgeOp["polite"][];
}

export interface AspectPredicateArgs {
  readonly aspectIn?: readonly AspectOp["aspect"][];
  readonly teFocusParticle?: "absent";
  readonly teFocusTarget?: "absent";
  readonly ellipticTeIruSourceHost?: "absent";
  readonly terminalMood?: "absent";
  readonly semantic?: "absent";
  readonly semanticRenderStrategyIn?: readonly AspectRenderStrategy[];
  readonly collapsed?: "absent";
  readonly followingRareruReading?: "absent";
}

export interface BenefactiveAspectPredicateArgs {
  readonly aspectIn: readonly BenefactiveAspectOp["aspect"][];
}

export interface RequestAspectPredicateArgs {
  readonly aspectIn?: readonly RequestAspectOp["aspect"][];
}

export interface VoicePredicateArgs {
  readonly voiceIn: readonly VoiceOp["voice"][];
}

export interface PostverbAuxiliaryPredicateArgs {
  readonly auxiliaryKindIn: readonly PostverbAuxiliaryOp["auxiliary"]["kind"][];
  readonly potentialCompositionIn?: readonly NonNullable<
    PostverbAuxiliaryOp["potentialComposition"]
  >[];
}

export interface PotentialKotoDekiruPredicateArgs {
  readonly particleKindIn?: readonly PotentialKotoGaDekiruIdiomOp["particleKind"][];
  readonly focusParticle?: "absent";
  readonly polarityIn?: readonly PotentialKotoGaDekiruIdiomOp["polarity"][];
  readonly politeIn?: readonly PotentialKotoGaDekiruIdiomOp["polite"][];
  readonly pastIn?: readonly PotentialKotoGaDekiruIdiomOp["past"][];
}

export interface NegationPredicateArgs {
  readonly chainDepthIn?: readonly NegationOp["chainDepth"][];
  readonly chainPastIn?: readonly NegationOp["chainPast"][];
  readonly sourceSplit?: "absent";
}

export interface PredicateQuoteCarrierPredicateArgs {
  readonly styleIn?: readonly PredicateQuoteCarrierOp["style"][];
  readonly allomorphIn?: readonly PredicateQuoteCarrierOp["allomorph"][];
  readonly sourceTerminal?: boolean;
}

export interface PredicateProjectionCarrierPredicateArgs {
  readonly carrierIn?: readonly PredicateProjectionCarrierOp["carrier"][];
  readonly politeNotTrue?: true;
  readonly pastNotTrue?: true;
}

interface ProductionOpPredicateContract {
  readonly connective_fields: {
    readonly kind: "connective";
    readonly args: ConnectivePredicateArgs;
  };
  readonly typed_conditional_quote: {
    readonly kind: "connective";
    readonly args: Readonly<Record<never, never>>;
  };
  readonly copula_fields: {
    readonly kind: "copula";
    readonly args: CopulaPredicateArgs;
  };
  readonly tense_fields: {
    readonly kind: "tense";
    readonly args: TensePredicateArgs;
  };
  readonly modal_fields: {
    readonly kind: "modal";
    readonly args: ModalPredicateArgs;
  };
  readonly youda_modal_fields: {
    readonly kind: "modal";
    readonly args: YoudaModalPredicateArgs;
  };
  readonly souda_hearsay_modal_fields: {
    readonly kind: "modal";
    readonly args: SoudaHearsayModalPredicateArgs;
  };
  readonly adj_copula_bridge_fields: {
    readonly kind: "adjCopulaBridge";
    readonly args: AdjCopulaBridgePredicateArgs;
  };
  readonly scope_bridge_fields: {
    readonly kind: "scopeBridge";
    readonly args: ScopeBridgePredicateArgs;
  };
  readonly aspect_fields: {
    readonly kind: "aspect";
    readonly args: AspectPredicateArgs;
  };
  readonly benefactive_aspect: {
    readonly kind: "aspect";
    readonly args: BenefactiveAspectPredicateArgs;
  };
  readonly voice_fields: {
    readonly kind: "voice";
    readonly args: VoicePredicateArgs;
  };
  readonly postverb_auxiliary_fields: {
    readonly kind: "postverbAuxiliary";
    readonly args: PostverbAuxiliaryPredicateArgs;
  };
  readonly potential_koto_dekiru_fields: {
    readonly kind: "idiom";
    readonly args: PotentialKotoDekiruPredicateArgs;
  };
  readonly negation_fields: {
    readonly kind: "negation";
    readonly args: NegationPredicateArgs;
  };
  readonly predicate_quote_carrier_fields: {
    readonly kind: "predicateQuoteCarrier";
    readonly args: PredicateQuoteCarrierPredicateArgs;
  };
  readonly predicate_projection_carrier_fields: {
    readonly kind: "predicateProjectionCarrier";
    readonly args: PredicateProjectionCarrierPredicateArgs;
  };
  readonly plain_te_hoshii: {
    readonly kind: "aspect";
    readonly args: Readonly<Record<never, never>>;
  };
  readonly request_aspect: {
    readonly kind: "aspect";
    readonly args: RequestAspectPredicateArgs;
  };
  readonly request_command_base_aspect: {
    readonly kind: "aspect";
    readonly args: Readonly<Record<never, never>>;
  };
  readonly chainable_aspect: {
    readonly kind: "aspect";
    readonly args: Readonly<Record<never, never>>;
  };
  readonly chainable_idiom: {
    readonly kind: "idiom";
    readonly args: Readonly<Record<never, never>>;
  };
  readonly idiom_kind_fields: {
    readonly kind: "idiom";
    readonly args: IdiomKindPredicateArgs;
  };
  readonly permission_idiom_fields: {
    readonly kind: "idiom";
    readonly args: PermissionIdiomPredicateArgs;
  };
  readonly forbidden_idiom_fields: {
    readonly kind: "idiom";
    readonly args: ForbiddenIdiomPredicateArgs;
  };
  readonly obligation_idiom_fields: {
    readonly kind: "idiom";
    readonly args: ObligationIdiomPredicateArgs;
  };
  readonly negative_necessity_sumu_idiom_fields: {
    readonly kind: "idiom";
    readonly args: NegativeNecessitySumuIdiomPredicateArgs;
  };
}

export type ProductionOpPredicateKey = keyof ProductionOpPredicateContract;

export type ProductionOpPredicateSpec = {
  readonly [K in ProductionOpPredicateKey]: {
    readonly key: K;
    readonly args: ProductionOpPredicateContract[K]["args"];
  }
}[ProductionOpPredicateKey];

type PredicateKeyForKind<K extends AuxOpKind> = {
  readonly [P in ProductionOpPredicateKey]:
    ProductionOpPredicateContract[P]["kind"] extends K ? P : never;
}[ProductionOpPredicateKey];

export type ProductionOpPredicateSpecForKind<K extends AuxOpKind> = {
  readonly [P in PredicateKeyForKind<K>]: {
    readonly key: P;
    readonly args: ProductionOpPredicateContract[P]["args"];
  }
}[PredicateKeyForKind<K>];

export type ProductionOpPredicatePattern = {
  readonly [K in AuxOpKind]: {
    readonly kind: K;
    readonly predicate?: ProductionOpPredicateSpecForKind<K>;
  }
}[AuxOpKind];

type ProductionOpPredicateBindings = {
  readonly [K in ProductionOpPredicateKey]: (
    op: Extract<AuxOpNode, { readonly kind: ProductionOpPredicateContract[K]["kind"] }>,
    args: ProductionOpPredicateContract[K]["args"]
  ) => boolean;
};

function includesIfDeclared<T>(values: readonly T[] | undefined, value: T): boolean {
  return values === undefined || values.includes(value);
}

function excludesIfDeclared<T>(values: readonly T[] | undefined, value: T): boolean {
  return values === undefined || !values.includes(value);
}

function absentIfDeclared(requirement: "absent" | undefined, value: unknown): boolean {
  return requirement !== "absent" || value === undefined;
}

const PRODUCTION_OP_PREDICATE_BINDINGS = {
  connective_fields: (op, args) =>
    includesIfDeclared(args.connectiveIn, op.connective) &&
    excludesIfDeclared(args.connectiveNotIn, op.connective) &&
    includesIfDeclared(args.surfaceAllomorphIn, op.allomorph) &&
    (args.conditionalFlavor === undefined ||
      (args.conditionalFlavor === "present"
        ? op.conditionalFlavor !== undefined
        : op.conditionalFlavor === undefined)) &&
    excludesIfDeclared(args.conditionalQuoteEllipsisNotIn, op.conditionalQuoteEllipsis) &&
    includesIfDeclared(args.quotativeClosureIn, op.quotativeClosure) &&
    excludesIfDeclared(args.quotativeClosureNotIn, op.quotativeClosure) &&
    includesIfDeclared(args.quotativeMoodIn, op.quotativeMood) &&
    includesIfDeclared(args.retrospectiveQuotativeFlavorIn, op.retrospectiveQuotativeFlavor) &&
    includesIfDeclared(args.quoteAttributiveFlavorIn, op.quoteAttributiveFlavor) &&
    excludesIfDeclared(args.structuralContinuationNotIn, op.structuralContinuation),
  typed_conditional_quote: (op) =>
    op.conditionalQuoteEllipsis !== "prohibitive_concern" &&
    (op.connective === "conditional" || op.conditionalFlavor !== undefined),
  copula_fields: (op, args) =>
    includesIfDeclared(args.variantIn, op.variant) &&
    includesIfDeclared(args.polarityIn, op.polarity) &&
    (args.basicForm !== "absent" || op.basicForm === undefined) &&
    includesIfDeclared(args.negativeBridgeFormIn, op.negativeBridgeForm ?? "absent") &&
    includesIfDeclared(args.honorificIn, op.honorific ?? "absent") &&
    includesIfDeclared(args.politeIn, op.polite),
  tense_fields: (op, args) => includesIfDeclared(args.tenseIn, op.tense),
  modal_fields: (op, args) =>
    includesIfDeclared(args.modalIn, op.modal) &&
    includesIfDeclared(args.politeIn, op.polite) &&
    includesIfDeclared(args.pastIn, op.past) &&
    (args.inner !== "absent" || op.inner === undefined),
  youda_modal_fields: (op, args) =>
    op.modal === "youda" &&
    includesIfDeclared(args.formIn, op.form) &&
    includesIfDeclared(args.terminalIn, op.terminal) &&
    includesIfDeclared(args.readingIn, op.reading) &&
    includesIfDeclared(args.politeIn, op.polite) &&
    includesIfDeclared(args.pastIn, op.past) &&
    (args.inner !== "absent" || op.inner === undefined),
  souda_hearsay_modal_fields: (op, args) =>
    op.modal === "souda_hearsay" &&
    includesIfDeclared(args.readingIn, op.reading) &&
    includesIfDeclared(args.politeIn, op.polite) &&
    includesIfDeclared(args.pastIn, op.past) &&
    (args.inner !== "absent" || op.inner === undefined),
  adj_copula_bridge_fields: (op, args) =>
    includesIfDeclared(args.formIn, op.form),
  scope_bridge_fields: (op, args) =>
    includesIfDeclared(args.headIn, op.head) &&
    includesIfDeclared(args.formIn, op.form) &&
    includesIfDeclared(args.particleIn, op.particle) &&
    includesIfDeclared(args.polarityIn, op.polarity) &&
    includesIfDeclared(args.chainDepthIn, op.chainDepth) &&
    includesIfDeclared(args.politeIn, op.polite),
  aspect_fields: (op, args) =>
    includesIfDeclared(args.aspectIn, op.aspect) &&
    absentIfDeclared(args.teFocusParticle, op.teFocusParticle) &&
    absentIfDeclared(args.teFocusTarget, op.teFocusTarget) &&
    absentIfDeclared(args.ellipticTeIruSourceHost, op.ellipticTeIruSourceHost) &&
    absentIfDeclared(args.terminalMood, op.terminalMood) &&
    absentIfDeclared(args.semantic, "semantic" in op ? op.semantic : undefined) &&
    includesIfDeclared(
      args.semanticRenderStrategyIn,
      "semantic" in op ? op.semantic?.renderStrategy : undefined
    ) &&
    absentIfDeclared(args.collapsed, "collapsed" in op ? op.collapsed : undefined) &&
    absentIfDeclared(
      args.followingRareruReading,
      "followingRareruReading" in op ? op.followingRareruReading : undefined
    ),
  benefactive_aspect: (op, args) =>
    args.aspectIn.includes(op.aspect as BenefactiveAspectOp["aspect"]),
  voice_fields: (op, args) => args.voiceIn.includes(op.voice),
  postverb_auxiliary_fields: (op, args) =>
    args.auxiliaryKindIn.includes(op.auxiliary.kind) &&
    includesIfDeclared(args.potentialCompositionIn, op.potentialComposition),
  potential_koto_dekiru_fields: (op, args) =>
    op.idiom === "potential_koto_ga_dekiru" &&
    includesIfDeclared(args.particleKindIn, op.particleKind) &&
    (args.focusParticle !== "absent" || op.focusParticle === null) &&
    includesIfDeclared(args.polarityIn, op.polarity) &&
    includesIfDeclared(args.politeIn, op.polite) &&
    includesIfDeclared(args.pastIn, op.past),
  negation_fields: (op, args) =>
    includesIfDeclared(args.chainDepthIn, op.chainDepth) &&
    includesIfDeclared(args.chainPastIn, op.chainPast) &&
    (args.sourceSplit !== "absent" || op.sourceSplit === undefined),
  predicate_quote_carrier_fields: (op, args) =>
    includesIfDeclared(args.styleIn, op.style) &&
    includesIfDeclared(args.allomorphIn, op.allomorph) &&
    (args.sourceTerminal === undefined || (op.sourceTerminal === true) === args.sourceTerminal),
  predicate_projection_carrier_fields: (op, args) =>
    includesIfDeclared(args.carrierIn, op.carrier) &&
    (args.politeNotTrue !== true || op.polite !== true) &&
    (args.pastNotTrue !== true || op.past !== true),
  plain_te_hoshii: (op) => isPlainTeHoshiiAspect(op),
  request_aspect: (op, args) =>
    isRequestAspectOp(op) && includesIfDeclared(args.aspectIn, op.aspect),
  request_command_base_aspect: (op) => isRequestCommandBaseOp(op),
  chainable_aspect: (op) => isChainableAspectOpKind(op.aspect),
  chainable_idiom: (op) => isChainableIdiomOpKind(op.idiom),
  idiom_kind_fields: (op, args) => includesIfDeclared(args.idiomIn, op.idiom),
  permission_idiom_fields: (op, args) =>
    op.idiom === "permission" &&
    includesIfDeclared(args.variantIn, op.variant) &&
    includesIfDeclared(args.connectiveSurfaceIn, op.connectiveSurface),
  obligation_idiom_fields: (op, args) =>
    op.idiom === "obligation" &&
    includesIfDeclared(args.variantIn, op.variant) &&
    includesIfDeclared(args.polarityIn, op.polarity) &&
    includesIfDeclared(args.politeIn, op.polite) &&
    includesIfDeclared(args.pastIn, op.past) &&
    (args.inner !== "absent" || op.inner === undefined),
  forbidden_idiom_fields: (op, args) =>
    op.idiom === "forbidden" &&
    includesIfDeclared(args.polarityIn, op.polarity) &&
    includesIfDeclared(args.politeIn, op.polite) &&
    includesIfDeclared(args.pastIn, op.past) &&
    (args.inner !== "absent" || op.inner === undefined),
  negative_necessity_sumu_idiom_fields: (op, args) =>
    op.idiom === "negative_necessity_sumu" &&
    includesIfDeclared(args.variantIn, op.variant) &&
    includesIfDeclared(args.polarityIn, op.polarity) &&
    includesIfDeclared(args.politeIn, op.polite) &&
    includesIfDeclared(args.pastIn, op.past)
} satisfies ProductionOpPredicateBindings;

export function productionOpPredicate<K extends AuxOpKind, P extends PredicateKeyForKind<K>>(
  kind: K,
  key: P,
  args: ProductionOpPredicateContract[P]["args"]
): ProductionOpPredicateSpecForKind<K> {
  return { key, args } as ProductionOpPredicateSpecForKind<K>;
}

export function productionOpPattern<K extends AuxOpKind, P extends PredicateKeyForKind<K>>(
  kind: K,
  key: P,
  args: ProductionOpPredicateContract[P]["args"]
): { readonly kind: K; readonly predicate: ProductionOpPredicateSpecForKind<K> } {
  return { kind, predicate: productionOpPredicate(kind, key, args) };
}

function validatePredicateArgObject(
  predicate: ProductionOpPredicateSpec,
  allowedKeys: readonly string[]
): Readonly<Record<string, unknown>> {
  const args: unknown = predicate.args;
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    throw new Error(`invalid production op predicate args: ${predicate.key}`);
  }
  for (const key of Object.keys(args)) {
    if (!allowedKeys.includes(key)) {
      throw new Error(`unknown production op predicate arg: ${predicate.key}.${key}`);
    }
  }
  return args as Readonly<Record<string, unknown>>;
}

function validatePredicateEnumArray(
  predicate: ProductionOpPredicateSpec,
  args: Readonly<Record<string, unknown>>,
  key: string,
  allowed: ReadonlySet<unknown>
): void {
  const value = args[key];
  if (value === undefined) return;
  if (!Array.isArray(value) || value.length === 0 ||
    new Set(value).size !== value.length || value.some((entry) => !allowed.has(entry))) {
    throw new Error(`invalid production op predicate arg value: ${predicate.key}.${key}`);
  }
}

export function validateProductionOpPredicate(predicate: ProductionOpPredicateSpec): void {
  switch (predicate.key) {
    case "connective_fields":
      validateConnectiveFieldsPredicate(predicate);
      return;
    case "copula_fields":
      validateCopulaFieldsPredicate(predicate);
      return;
    case "tense_fields":
      validateTenseFieldsPredicate(predicate);
      return;
    case "modal_fields":
      validateModalFieldsPredicate(predicate);
      return;
    case "youda_modal_fields":
      validateYoudaModalFieldsPredicate(predicate);
      return;
    case "souda_hearsay_modal_fields":
      validateSoudaHearsayModalFieldsPredicate(predicate);
      return;
    case "adj_copula_bridge_fields":
      validateAdjCopulaBridgeFieldsPredicate(predicate);
      return;
    case "scope_bridge_fields":
      validateScopeBridgeFieldsPredicate(predicate);
      return;
    case "aspect_fields":
      validateAspectFieldsPredicate(predicate);
      return;
    case "benefactive_aspect":
      validateBenefactiveAspectPredicate(predicate);
      return;
    case "voice_fields":
      validateVoiceFieldsPredicate(predicate);
      return;
    case "postverb_auxiliary_fields":
      validatePostverbAuxiliaryFieldsPredicate(predicate);
      return;
    case "potential_koto_dekiru_fields":
      validatePotentialKotoDekiruFieldsPredicate(predicate);
      return;
    case "negation_fields":
      validateNegationFieldsPredicate(predicate);
      return;
    case "predicate_quote_carrier_fields":
      validatePredicateQuoteCarrierFieldsPredicate(predicate);
      return;
    case "predicate_projection_carrier_fields":
      validatePredicateProjectionCarrierFieldsPredicate(predicate);
      return;
    case "typed_conditional_quote":
    case "plain_te_hoshii":
      validatePredicateArgObject(predicate, []);
      return;
    case "request_aspect":
      validateRequestAspectPredicate(predicate);
      return;
    case "request_command_base_aspect":
    case "chainable_aspect":
    case "chainable_idiom":
      validatePredicateArgObject(predicate, []);
      return;
    case "idiom_kind_fields":
      validateIdiomKindFieldsPredicate(predicate);
      return;
    case "permission_idiom_fields":
      validatePermissionIdiomFieldsPredicate(predicate);
      return;
    case "obligation_idiom_fields":
      validateObligationIdiomFieldsPredicate(predicate);
      return;
    case "forbidden_idiom_fields":
      validateForbiddenIdiomFieldsPredicate(predicate);
      return;
    case "negative_necessity_sumu_idiom_fields":
      validateNegativeNecessitySumuIdiomFieldsPredicate(predicate);
      return;
  }
}

function enumSet(values: readonly unknown[]): ReadonlySet<unknown> {
  return new Set(values);
}

function validateConnectiveFieldsPredicate(predicate: ProductionOpPredicateSpec): void {
  const keys = [
    "connectiveIn", "connectiveNotIn", "surfaceAllomorphIn", "conditionalFlavor",
    "conditionalQuoteEllipsisNotIn", "quotativeClosureIn", "quotativeClosureNotIn",
    "quotativeMoodIn", "retrospectiveQuotativeFlavorIn", "quoteAttributiveFlavorIn",
    "structuralContinuationNotIn"
  ] as const;
  const args = validatePredicateArgObject(predicate, keys);
  const connectiveKinds = enumSet(CONNECTIVE_INVENTORY.map(({ kind }) => kind));
  validatePredicateEnumArray(predicate, args, "connectiveIn", connectiveKinds);
  validatePredicateEnumArray(predicate, args, "connectiveNotIn", connectiveKinds);
  validatePredicateEnumArray(
    predicate,
    args,
    "surfaceAllomorphIn",
    enumSet(CONNECTIVE_SURFACE_ALLOMORPH_VALUES)
  );
  if (args.conditionalFlavor !== undefined &&
    args.conditionalFlavor !== "present" && args.conditionalFlavor !== "absent") {
    throw new Error("invalid production op predicate arg value: connective_fields.conditionalFlavor");
  }
  validatePredicateEnumArray(
    predicate, args, "conditionalQuoteEllipsisNotIn", enumSet(CONDITIONAL_QUOTE_ELLIPSIS_VALUES)
  );
  validatePredicateEnumArray(predicate, args, "quotativeClosureIn", enumSet(QUOTATIVE_CLOSURE_VALUES));
  validatePredicateEnumArray(
    predicate, args, "quotativeClosureNotIn", enumSet(QUOTATIVE_CLOSURE_VALUES)
  );
  validatePredicateEnumArray(predicate, args, "quotativeMoodIn", enumSet(QUOTATIVE_MOOD_VALUES));
  validatePredicateEnumArray(
    predicate,
    args,
    "retrospectiveQuotativeFlavorIn",
    enumSet(RETROSPECTIVE_QUOTATIVE_FLAVOR_VALUES)
  );
  validatePredicateEnumArray(
    predicate, args, "quoteAttributiveFlavorIn", enumSet(QUOTE_ATTRIBUTIVE_FLAVOR_VALUES)
  );
  validatePredicateEnumArray(
    predicate, args, "structuralContinuationNotIn", enumSet(STRUCTURAL_CONTINUATION_VALUES)
  );
}

function validateCopulaFieldsPredicate(predicate: ProductionOpPredicateSpec): void {
  const args = validatePredicateArgObject(
    predicate,
    ["variantIn", "polarityIn", "basicForm", "negativeBridgeFormIn", "honorificIn", "politeIn"]
  );
  validatePredicateEnumArray(predicate, args, "variantIn", enumSet(COPULA_VARIANT_VALUES));
  validatePredicateEnumArray(predicate, args, "polarityIn", enumSet(POLARITY_VALUES));
  validatePredicateEnumArray(
    predicate,
    args,
    "negativeBridgeFormIn",
    enumSet(["absent", ...COPULA_NEGATIVE_BRIDGE_FORM_VALUES])
  );
  validatePredicateEnumArray(
    predicate,
    args,
    "honorificIn",
    enumSet(["absent", ...COPULA_HONORIFIC_VALUES])
  );
  validatePredicateEnumArray(predicate, args, "politeIn", enumSet([true, false]));
  if (args.basicForm !== undefined && args.basicForm !== "absent") {
    throw new Error("invalid production op predicate arg value: copula_fields.basicForm");
  }
}

function validateTenseFieldsPredicate(predicate: ProductionOpPredicateSpec): void {
  const args = validatePredicateArgObject(predicate, ["tenseIn"]);
  validatePredicateEnumArray(predicate, args, "tenseIn", enumSet(TENSE_VALUES));
}

function validateModalFieldsPredicate(predicate: ProductionOpPredicateSpec): void {
  const args = validatePredicateArgObject(
    predicate,
    ["modalIn", "politeIn", "pastIn", "inner"]
  );
  validatePredicateEnumArray(
    predicate, args, "modalIn", enumSet(MODAL_INVENTORY.map(({ modal }) => modal))
  );
  validatePredicateEnumArray(predicate, args, "politeIn", enumSet([true, false]));
  validatePredicateEnumArray(predicate, args, "pastIn", enumSet([true, false]));
  if (args.inner !== undefined && args.inner !== "absent") {
    throw new Error("invalid production op predicate arg value: modal_fields.inner");
  }
}

function validateYoudaModalFieldsPredicate(predicate: ProductionOpPredicateSpec): void {
  const args = validatePredicateArgObject(
    predicate,
    ["formIn", "terminalIn", "readingIn", "politeIn", "pastIn", "inner"]
  );
  validatePredicateEnumArray(predicate, args, "formIn", enumSet(YOUDA_FORM_VALUES));
  validatePredicateEnumArray(predicate, args, "terminalIn", enumSet(YOUDA_TERMINAL_VALUES));
  validatePredicateEnumArray(predicate, args, "readingIn", enumSet(YOUDA_READING_VALUES));
  validatePredicateEnumArray(predicate, args, "politeIn", enumSet([true, false]));
  validatePredicateEnumArray(predicate, args, "pastIn", enumSet([true, false]));
  if (args.inner !== undefined && args.inner !== "absent") {
    throw new Error("invalid production op predicate arg value: youda_modal_fields.inner");
  }
}

function validateSoudaHearsayModalFieldsPredicate(predicate: ProductionOpPredicateSpec): void {
  const args = validatePredicateArgObject(
    predicate,
    ["readingIn", "politeIn", "pastIn", "inner"]
  );
  validatePredicateEnumArray(predicate, args, "readingIn", enumSet(SOUDA_READING_VALUES));
  validatePredicateEnumArray(predicate, args, "politeIn", enumSet([true, false]));
  validatePredicateEnumArray(predicate, args, "pastIn", enumSet([true, false]));
  if (args.inner !== undefined && args.inner !== "absent") {
    throw new Error("invalid production op predicate arg value: souda_hearsay_modal_fields.inner");
  }
}

function validateAdjCopulaBridgeFieldsPredicate(predicate: ProductionOpPredicateSpec): void {
  const args = validatePredicateArgObject(predicate, ["formIn"]);
  validatePredicateEnumArray(
    predicate, args, "formIn", enumSet(ADJ_COPULA_BRIDGE_FORM_VALUES)
  );
}

function validateScopeBridgeFieldsPredicate(predicate: ProductionOpPredicateSpec): void {
  const args = validatePredicateArgObject(
    predicate,
    ["headIn", "formIn", "particleIn", "polarityIn", "chainDepthIn", "politeIn"]
  );
  validatePredicateEnumArray(predicate, args, "headIn", enumSet(SCOPE_BRIDGE_HEAD_VALUES));
  validatePredicateEnumArray(predicate, args, "formIn", enumSet(SCOPE_BRIDGE_FORM_VALUES));
  validatePredicateEnumArray(
    predicate, args, "particleIn", enumSet(SCOPE_BRIDGE_PARTICLE_VALUES)
  );
  validatePredicateEnumArray(predicate, args, "polarityIn", enumSet(POLARITY_VALUES));
  validatePredicateEnumArray(predicate, args, "politeIn", enumSet([true, false]));
  const chainDepthIn = args.chainDepthIn;
  if (chainDepthIn !== undefined && (
    !Array.isArray(chainDepthIn) || chainDepthIn.length === 0 ||
    new Set(chainDepthIn).size !== chainDepthIn.length ||
    chainDepthIn.some((entry) => !Number.isInteger(entry) || Number(entry) < 0)
  )) {
    throw new Error(
      "invalid production op predicate arg value: scope_bridge_fields.chainDepthIn"
    );
  }
}

function validateAspectFieldsPredicate(predicate: ProductionOpPredicateSpec): void {
  const args = validatePredicateArgObject(predicate, [
    "aspectIn",
    "teFocusParticle",
    "teFocusTarget",
    "ellipticTeIruSourceHost",
    "terminalMood",
    "semantic",
    "semanticRenderStrategyIn",
    "collapsed",
    "followingRareruReading"
  ]);
  validatePredicateEnumArray(
    predicate,
    args,
    "aspectIn",
    enumSet(ASPECT_INVENTORY.map(({ aspect }) => aspect))
  );
  validatePredicateEnumArray(
    predicate,
    args,
    "semanticRenderStrategyIn",
    enumSet(ASPECT_RENDER_STRATEGY_VALUES)
  );
  for (const key of [
    "teFocusParticle",
    "teFocusTarget",
    "ellipticTeIruSourceHost",
    "terminalMood",
    "semantic",
    "collapsed",
    "followingRareruReading"
  ] as const) {
    if (args[key] !== undefined && args[key] !== "absent") {
      throw new Error(`invalid production op predicate arg value: aspect_fields.${key}`);
    }
  }
}

function validateBenefactiveAspectPredicate(predicate: ProductionOpPredicateSpec): void {
  const args = validatePredicateArgObject(predicate, ["aspectIn"]);
  validatePredicateEnumArray(
    predicate, args, "aspectIn", enumSet(BENEFACTIVE_ASPECT_VALUES)
  );
  if (!Array.isArray(args.aspectIn) || args.aspectIn.length === 0) {
    throw new Error("invalid production op predicate arg value: benefactive_aspect.aspectIn");
  }
}

function validateVoiceFieldsPredicate(predicate: ProductionOpPredicateSpec): void {
  const args = validatePredicateArgObject(predicate, ["voiceIn"]);
  validatePredicateEnumArray(predicate, args, "voiceIn", enumSet(VOICE_VALUES));
  if (!Array.isArray(args.voiceIn) || args.voiceIn.length === 0) {
    throw new Error("invalid production op predicate arg value: voice_fields.voiceIn");
  }
}

function validatePostverbAuxiliaryFieldsPredicate(predicate: ProductionOpPredicateSpec): void {
  const args = validatePredicateArgObject(
    predicate,
    ["auxiliaryKindIn", "potentialCompositionIn"]
  );
  validatePredicateEnumArray(
    predicate,
    args,
    "auxiliaryKindIn",
    enumSet(POSTVERB_AUXILIARY_INVENTORY.map((entry) => entry.auxiliary))
  );
  if (!Array.isArray(args.auxiliaryKindIn) || args.auxiliaryKindIn.length === 0) {
    throw new Error(
      "invalid production op predicate arg value: postverb_auxiliary_fields.auxiliaryKindIn"
    );
  }
  validatePredicateEnumArray(
    predicate,
    args,
    "potentialCompositionIn",
    enumSet(POTENTIAL_COMPOSITION_VALUES)
  );
}

function validatePotentialKotoDekiruFieldsPredicate(predicate: ProductionOpPredicateSpec): void {
  const args = validatePredicateArgObject(
    predicate,
    ["particleKindIn", "focusParticle", "polarityIn", "politeIn", "pastIn"]
  );
  validatePredicateEnumArray(
    predicate,
    args,
    "particleKindIn",
    enumSet(POTENTIAL_KOTO_DEKIRU_PARTICLE_VALUES)
  );
  if (args.focusParticle !== undefined && args.focusParticle !== "absent") {
    throw new Error(
      "invalid production op predicate arg value: potential_koto_dekiru_fields.focusParticle"
    );
  }
  validatePredicateEnumArray(predicate, args, "polarityIn", enumSet(POLARITY_VALUES));
  validatePredicateEnumArray(predicate, args, "politeIn", enumSet([true, false]));
  validatePredicateEnumArray(predicate, args, "pastIn", enumSet([true, false]));
}

function validateNegationFieldsPredicate(predicate: ProductionOpPredicateSpec): void {
  const args = validatePredicateArgObject(
    predicate,
    ["chainDepthIn", "chainPastIn", "sourceSplit"]
  );
  if (
    args.chainDepthIn !== undefined &&
    (
      !Array.isArray(args.chainDepthIn) ||
      args.chainDepthIn.length === 0 ||
      args.chainDepthIn.some((value) => !Number.isInteger(value) || value < 1)
    )
  ) {
    throw new Error(
      "invalid production op predicate arg value: negation_fields.chainDepthIn"
    );
  }
  validatePredicateEnumArray(predicate, args, "chainPastIn", enumSet([true, false]));
  if (args.sourceSplit !== undefined && args.sourceSplit !== "absent") {
    throw new Error("invalid production op predicate arg value: negation_fields.sourceSplit");
  }
}

function validatePredicateQuoteCarrierFieldsPredicate(predicate: ProductionOpPredicateSpec): void {
  const args = validatePredicateArgObject(
    predicate,
    ["styleIn", "allomorphIn", "sourceTerminal"]
  );
  validatePredicateEnumArray(
    predicate, args, "styleIn", enumSet(PREDICATE_QUOTE_CARRIER_STYLE_VALUES)
  );
  validatePredicateEnumArray(
    predicate, args, "allomorphIn", enumSet(PREDICATE_QUOTE_CARRIER_ALLOMORPH_VALUES)
  );
  if (args.sourceTerminal !== undefined && typeof args.sourceTerminal !== "boolean") {
    throw new Error("invalid production op predicate arg value: predicate_quote_carrier_fields.sourceTerminal");
  }
}

function validatePredicateProjectionCarrierFieldsPredicate(predicate: ProductionOpPredicateSpec): void {
  const args = validatePredicateArgObject(
    predicate,
    ["carrierIn", "politeNotTrue", "pastNotTrue"]
  );
  validatePredicateEnumArray(
    predicate, args, "carrierIn", enumSet(PREDICATE_PROJECTION_CARRIER_VALUES)
  );
  for (const key of ["politeNotTrue", "pastNotTrue"] as const) {
    if (args[key] !== undefined && args[key] !== true) {
      throw new Error(`invalid production op predicate arg value: ${predicate.key}.${key}`);
    }
  }
}

function validateRequestAspectPredicate(predicate: ProductionOpPredicateSpec): void {
  const args = validatePredicateArgObject(predicate, ["aspectIn"]);
  validatePredicateEnumArray(predicate, args, "aspectIn", enumSet(REQUEST_ASPECT_VALUES));
}

function validateIdiomKindFieldsPredicate(predicate: ProductionOpPredicateSpec): void {
  const args = validatePredicateArgObject(predicate, ["idiomIn"]);
  validatePredicateEnumArray(
    predicate,
    args,
    "idiomIn",
    enumSet(IDIOM_INVENTORY.map(({ idiom }) => idiom))
  );
}

function validatePermissionIdiomFieldsPredicate(predicate: ProductionOpPredicateSpec): void {
  const args = validatePredicateArgObject(
    predicate,
    ["variantIn", "connectiveSurfaceIn"]
  );
  validatePredicateEnumArray(
    predicate,
    args,
    "variantIn",
    enumSet(PERMISSION_VARIANT_VALUES)
  );
  validatePredicateEnumArray(
    predicate,
    args,
    "connectiveSurfaceIn",
    enumSet(PERMISSION_CONNECTIVE_SURFACE_VALUES)
  );
}

function validateObligationIdiomFieldsPredicate(predicate: ProductionOpPredicateSpec): void {
  const args = validatePredicateArgObject(
    predicate,
    ["variantIn", "polarityIn", "politeIn", "pastIn", "inner"]
  );
  validatePredicateEnumArray(predicate, args, "variantIn", enumSet(OBLIGATION_VARIANT_VALUES));
  validatePredicateEnumArray(predicate, args, "polarityIn", enumSet(POLARITY_VALUES));
  validatePredicateEnumArray(predicate, args, "politeIn", enumSet([true, false]));
  validatePredicateEnumArray(predicate, args, "pastIn", enumSet([true, false]));
  if (args.inner !== undefined && args.inner !== "absent") {
    throw new Error("invalid production op predicate arg value: obligation_idiom_fields.inner");
  }
}

function validateForbiddenIdiomFieldsPredicate(predicate: ProductionOpPredicateSpec): void {
  const args = validatePredicateArgObject(
    predicate,
    ["polarityIn", "politeIn", "pastIn", "inner"]
  );
  validatePredicateEnumArray(predicate, args, "polarityIn", enumSet(POLARITY_VALUES));
  validatePredicateEnumArray(predicate, args, "politeIn", enumSet([true, false]));
  validatePredicateEnumArray(predicate, args, "pastIn", enumSet([true, false]));
  if (args.inner !== undefined && args.inner !== "absent") {
    throw new Error("invalid production op predicate arg value: forbidden_idiom_fields.inner");
  }
}

function validateNegativeNecessitySumuIdiomFieldsPredicate(predicate: ProductionOpPredicateSpec): void {
  const args = validatePredicateArgObject(
    predicate,
    ["variantIn", "polarityIn", "politeIn", "pastIn"]
  );
  validatePredicateEnumArray(
    predicate,
    args,
    "variantIn",
    enumSet(NEGATIVE_NECESSITY_SUMU_VARIANT_VALUES)
  );
  validatePredicateEnumArray(predicate, args, "polarityIn", enumSet(POLARITY_VALUES));
  validatePredicateEnumArray(predicate, args, "politeIn", enumSet([true, false]));
  validatePredicateEnumArray(predicate, args, "pastIn", enumSet([true, false]));
}

export function evaluateProductionOpPredicate(
  op: AuxOpNode,
  predicate: ProductionOpPredicateSpec
): boolean {
  const binding = PRODUCTION_OP_PREDICATE_BINDINGS[predicate.key] as (
    candidate: AuxOpNode,
    args: typeof predicate.args
  ) => boolean;
  return binding(op, predicate.args);
}

export function productionOpPredicateFields(
  predicate: ProductionOpPredicateSpec
): readonly string[] {
  switch (predicate.key) {
    case "connective_fields": {
      const args = predicate.args;
      return [
        ...(args.connectiveIn !== undefined || args.connectiveNotIn !== undefined
          ? ["connective"] : []),
        ...(args.surfaceAllomorphIn !== undefined ? ["allomorph"] : []),
        ...(args.conditionalFlavor !== undefined ? ["conditionalFlavor"] : []),
        ...(args.conditionalQuoteEllipsisNotIn !== undefined
          ? ["conditionalQuoteEllipsis"] : []),
        ...(args.quotativeClosureIn !== undefined || args.quotativeClosureNotIn !== undefined
          ? ["quotativeClosure"] : []),
        ...(args.quotativeMoodIn !== undefined ? ["quotativeMood"] : []),
        ...(args.retrospectiveQuotativeFlavorIn !== undefined
          ? ["retrospectiveQuotativeFlavor"] : []),
        ...(args.quoteAttributiveFlavorIn !== undefined ? ["quoteAttributiveFlavor"] : []),
        ...(args.structuralContinuationNotIn !== undefined
          ? ["structuralContinuation"] : [])
      ];
    }
    case "typed_conditional_quote":
      return ["connective", "conditionalFlavor", "conditionalQuoteEllipsis"];
    case "copula_fields": {
      const args = predicate.args;
      return [
        ...(args.variantIn !== undefined ? ["variant"] : []),
        ...(args.polarityIn !== undefined ? ["polarity"] : []),
        ...(args.basicForm !== undefined ? ["basicForm"] : []),
        ...(args.negativeBridgeFormIn !== undefined ? ["negativeBridgeForm"] : []),
        ...(args.honorificIn !== undefined ? ["honorific"] : []),
        ...(args.politeIn !== undefined ? ["polite"] : [])
      ];
    }
    case "tense_fields":
      return ["tense"];
    case "modal_fields": {
      const args = predicate.args;
      return [
        "modal",
        ...(args.politeIn !== undefined ? ["polite"] : []),
        ...(args.pastIn !== undefined ? ["past"] : []),
        ...(args.inner !== undefined ? ["inner"] : [])
      ];
    }
    case "youda_modal_fields": {
      const args = predicate.args;
      return [
        "modal",
        ...(args.formIn !== undefined ? ["form"] : []),
        ...(args.terminalIn !== undefined ? ["terminal"] : []),
        ...(args.readingIn !== undefined ? ["reading"] : []),
        ...(args.politeIn !== undefined ? ["polite"] : []),
        ...(args.pastIn !== undefined ? ["past"] : []),
        ...(args.inner !== undefined ? ["inner"] : [])
      ];
    }
    case "souda_hearsay_modal_fields": {
      const args = predicate.args;
      return [
        "modal",
        ...(args.readingIn !== undefined ? ["reading"] : []),
        ...(args.politeIn !== undefined ? ["polite"] : []),
        ...(args.pastIn !== undefined ? ["past"] : []),
        ...(args.inner !== undefined ? ["inner"] : [])
      ];
    }
    case "adj_copula_bridge_fields": {
      const args = predicate.args;
      return args.formIn !== undefined ? ["form"] : [];
    }
    case "scope_bridge_fields": {
      const args = predicate.args;
      return [
        ...(args.headIn !== undefined ? ["head"] : []),
        ...(args.formIn !== undefined ? ["form"] : []),
        ...(args.particleIn !== undefined ? ["particle"] : []),
        ...(args.polarityIn !== undefined ? ["polarity"] : []),
        ...(args.chainDepthIn !== undefined ? ["chainDepth"] : []),
        ...(args.politeIn !== undefined ? ["polite"] : [])
      ];
    }
    case "aspect_fields": {
      const args = predicate.args;
      return [
        ...(args.aspectIn !== undefined ? ["aspect"] : []),
        ...(args.teFocusParticle !== undefined ? ["teFocusParticle"] : []),
        ...(args.teFocusTarget !== undefined ? ["teFocusTarget"] : []),
        ...(args.ellipticTeIruSourceHost !== undefined ? ["ellipticTeIruSourceHost"] : []),
        ...(args.terminalMood !== undefined ? ["terminalMood"] : []),
        ...(
          args.semantic !== undefined || args.semanticRenderStrategyIn !== undefined
            ? ["semantic"]
            : []
        ),
        ...(args.collapsed !== undefined ? ["collapsed"] : []),
        ...(args.followingRareruReading !== undefined ? ["followingRareruReading"] : [])
      ];
    }
    case "benefactive_aspect":
      return ["aspect"];
    case "voice_fields":
      return ["voice"];
    case "postverb_auxiliary_fields": {
      const args = predicate.args;
      return [
        "auxiliary",
        ...(args.potentialCompositionIn !== undefined ? ["potentialComposition"] : [])
      ];
    }
    case "potential_koto_dekiru_fields": {
      const args = predicate.args;
      return [
        "idiom",
        ...(args.particleKindIn !== undefined ? ["particleKind"] : []),
        ...(args.focusParticle !== undefined ? ["focusParticle"] : []),
        ...(args.polarityIn !== undefined ? ["polarity"] : []),
        ...(args.politeIn !== undefined ? ["polite"] : []),
        ...(args.pastIn !== undefined ? ["past"] : [])
      ];
    }
    case "negation_fields": {
      const args = predicate.args;
      return [
        ...(args.chainDepthIn !== undefined ? ["chainDepth"] : []),
        ...(args.chainPastIn !== undefined ? ["chainPast"] : []),
        ...(args.sourceSplit !== undefined ? ["sourceSplit"] : [])
      ];
    }
    case "predicate_quote_carrier_fields": {
      const args = predicate.args;
      return [
        ...(args.styleIn !== undefined ? ["style"] : []),
        ...(args.allomorphIn !== undefined ? ["allomorph"] : []),
        ...(args.sourceTerminal !== undefined ? ["sourceTerminal"] : [])
      ];
    }
    case "predicate_projection_carrier_fields": {
      const args = predicate.args;
      return [
        ...(args.carrierIn !== undefined ? ["carrier"] : []),
        ...(args.politeNotTrue === true ? ["polite"] : []),
        ...(args.pastNotTrue === true ? ["past"] : [])
      ];
    }
    case "plain_te_hoshii":
      return ["aspect", "desiderative"];
    case "request_aspect":
      return ["aspect"];
    case "request_command_base_aspect":
    case "chainable_aspect":
      return ["aspect"];
    case "chainable_idiom":
      return ["idiom"];
    case "idiom_kind_fields":
      return ["idiom"];
    case "permission_idiom_fields": {
      const args = predicate.args;
      return [
        "idiom",
        ...(args.variantIn !== undefined ? ["variant"] : []),
        ...(args.connectiveSurfaceIn !== undefined ? ["connectiveSurface"] : [])
      ];
    }
    case "obligation_idiom_fields": {
      const args = predicate.args;
      return [
        "idiom",
        ...(args.variantIn !== undefined ? ["variant"] : []),
        ...(args.polarityIn !== undefined ? ["polarity"] : []),
        ...(args.politeIn !== undefined ? ["polite"] : []),
        ...(args.pastIn !== undefined ? ["past"] : []),
        ...(args.inner !== undefined ? ["inner"] : [])
      ];
    }
    case "forbidden_idiom_fields": {
      const args = predicate.args;
      return [
        "idiom",
        ...(args.polarityIn !== undefined ? ["polarity"] : []),
        ...(args.politeIn !== undefined ? ["polite"] : []),
        ...(args.pastIn !== undefined ? ["past"] : []),
        ...(args.inner !== undefined ? ["inner"] : [])
      ];
    }
    case "negative_necessity_sumu_idiom_fields": {
      const args = predicate.args;
      return [
        "idiom",
        ...(args.variantIn !== undefined ? ["variant"] : []),
        ...(args.polarityIn !== undefined ? ["polarity"] : []),
        ...(args.politeIn !== undefined ? ["polite"] : []),
        ...(args.pastIn !== undefined ? ["past"] : [])
      ];
    }
  }
}

export function productionOpPredicateRequiredFields(
  predicate: ProductionOpPredicateSpec,
  observedFields?: Readonly<Record<string, unknown>>
): readonly string[] {
  const fields = productionOpPredicateFields(predicate);
  switch (predicate.key) {
    case "connective_fields":
      return fields.filter((field) =>
        field === "connective" || field === "surface" || field === "allomorph"
      );
    case "typed_conditional_quote":
      return ["connective"];
    case "copula_fields":
      return fields.filter((field) =>
        field !== "basicForm" && field !== "negativeBridgeForm" && field !== "honorific"
      );
    case "tense_fields":
    case "benefactive_aspect":
    case "voice_fields":
    case "postverb_auxiliary_fields":
      return fields;
    case "predicate_quote_carrier_fields":
      return fields.filter((field) => field !== "sourceTerminal");
    case "potential_koto_dekiru_fields":
      return observedFields?.idiom === "potential_koto_ga_dekiru"
        ? fields
        : ["idiom"];
    case "negation_fields":
      return fields.filter((field) => field !== "sourceSplit");
    case "modal_fields":
      return fields.filter((field) => field !== "inner");
    case "youda_modal_fields":
      return observedFields?.modal === "youda"
        ? fields.filter((field) => field !== "inner")
        : ["modal"];
    case "souda_hearsay_modal_fields":
      return observedFields?.modal === "souda_hearsay"
        ? fields.filter((field) => field !== "inner")
        : ["modal"];
    case "adj_copula_bridge_fields":
    case "scope_bridge_fields":
      return fields;
    case "aspect_fields":
      return fields.filter((field) => field === "aspect");
    case "predicate_projection_carrier_fields":
      return fields.filter((field) => field === "carrier");
    case "plain_te_hoshii":
      return observedFields?.aspect === "te_hoshii"
        ? ["aspect", "desiderative"]
        : ["aspect"];
    case "request_aspect":
      return ["aspect"];
    case "request_command_base_aspect":
    case "chainable_aspect":
      return ["aspect"];
    case "chainable_idiom":
      return ["idiom"];
    case "idiom_kind_fields":
      return ["idiom"];
    case "permission_idiom_fields":
      return observedFields?.idiom === "permission"
        ? productionOpPredicateFields(predicate)
        : ["idiom"];
    case "obligation_idiom_fields":
      return observedFields?.idiom === "obligation"
        ? productionOpPredicateFields(predicate).filter((field) => field !== "inner")
        : ["idiom"];
    case "forbidden_idiom_fields":
      return observedFields?.idiom === "forbidden"
        ? productionOpPredicateFields(predicate).filter((field) => field !== "inner")
        : ["idiom"];
    case "negative_necessity_sumu_idiom_fields":
      return observedFields?.idiom === "negative_necessity_sumu"
        ? productionOpPredicateFields(predicate)
        : ["idiom"];
  }
}

export function productionOpPredicateKind(
  predicate: ProductionOpPredicateSpec
): AuxOpKind {
  switch (predicate.key) {
    case "connective_fields":
    case "typed_conditional_quote":
      return "connective";
    case "copula_fields":
      return "copula";
    case "tense_fields":
      return "tense";
    case "modal_fields":
    case "youda_modal_fields":
    case "souda_hearsay_modal_fields":
      return "modal";
    case "adj_copula_bridge_fields":
      return "adjCopulaBridge";
    case "scope_bridge_fields":
      return "scopeBridge";
    case "aspect_fields":
      return "aspect";
    case "benefactive_aspect":
      return "aspect";
    case "voice_fields":
      return "voice";
    case "postverb_auxiliary_fields":
      return "postverbAuxiliary";
    case "potential_koto_dekiru_fields":
      return "idiom";
    case "negation_fields":
      return "negation";
    case "predicate_quote_carrier_fields":
      return "predicateQuoteCarrier";
    case "predicate_projection_carrier_fields":
      return "predicateProjectionCarrier";
    case "plain_te_hoshii":
    case "request_aspect":
    case "request_command_base_aspect":
    case "chainable_aspect":
      return "aspect";
    case "chainable_idiom":
    case "idiom_kind_fields":
      return "idiom";
    case "permission_idiom_fields":
    case "forbidden_idiom_fields":
    case "obligation_idiom_fields":
    case "negative_necessity_sumu_idiom_fields":
      return "idiom";
  }
}
