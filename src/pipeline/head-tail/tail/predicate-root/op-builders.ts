import type {
  AdjCopulaBridgeOp,
  OpSource,
  AspectOp,
  ClassicalAuxResidueOp,
  ConjectureOp,
  ConnectiveOp,
  CopulaOp,
  DesireOp,
  IdiomOp,
  ModalOp,
  NegationOp,
  PoliteOp,
  PostverbAuxiliaryOp,
  PredicateProjectionCarrierOp,
  PredicateQuoteCarrierOp,
  PredicateSuffixOp,
  RequestAspectOp,
  ScopeBridgeOp,
  TenseOp,
  VoiceOp
} from "./grammar.js";

type OpInput<T> = T extends unknown
  ? Omit<T, "kind"> & { readonly kind?: never }
  : never;
type BuiltOp<K extends string, T> = Omit<T, "kind"> & { readonly kind: K };

function withKind<K extends string, const T extends object>(
  kind: K,
  input: T & { readonly kind?: never }
): BuiltOp<K, T> {
  return { ...input, kind };
}

export function createNegationOp<const T extends OpInput<NegationOp>>(input: T): BuiltOp<"negation", T> {
  return withKind("negation", input);
}

export function createTenseOp<const T extends OpInput<TenseOp>>(input: T): BuiltOp<"tense", T> {
  return withKind("tense", input);
}

export function createPoliteOp<const T extends OpInput<PoliteOp>>(input: T): BuiltOp<"polite", T> {
  return withKind("polite", input);
}

export function createClassicalAuxResidueOp<const T extends OpInput<ClassicalAuxResidueOp>>(
  input: T
): BuiltOp<"classicalAuxResidue", T> {
  return withKind("classicalAuxResidue", input);
}

export function createDesireOp<const T extends OpInput<DesireOp>>(input: T): BuiltOp<"desire", T> {
  return withKind("desire", input);
}

export function createVoiceOp<const T extends OpInput<VoiceOp>>(input: T): BuiltOp<"voice", T> {
  return withKind("voice", input);
}

export function createConjectureOp<const T extends OpInput<ConjectureOp>>(input: T): BuiltOp<"conjecture", T> {
  return withKind("conjecture", input);
}

export function createCopulaOp<const T extends OpInput<CopulaOp>>(input: T): BuiltOp<"copula", T> {
  return withKind("copula", input);
}

export function createModalOp<const T extends OpInput<ModalOp>>(input: T): BuiltOp<"modal", T> {
  return withKind("modal", input);
}

export function createScopeBridgeOp<const T extends OpInput<ScopeBridgeOp>>(input: T): BuiltOp<"scopeBridge", T> {
  return withKind("scopeBridge", input);
}

export function createAdjCopulaBridgeOp<const T extends OpInput<AdjCopulaBridgeOp>>(
  input: T
): BuiltOp<"adjCopulaBridge", T> {
  return withKind("adjCopulaBridge", input);
}

type NonRequestAspectOp = Exclude<AspectOp, RequestAspectOp>;

export function createAspectOp<const T extends OpInput<NonRequestAspectOp>>(input: T): BuiltOp<"aspect", T> {
  return withKind("aspect", input);
}

export const REQUEST_ASPECT_KIND_VALUES = ["te_kudasai", "te_kure_tanomu", "chodai"] as const;
export type RequestAspectKind = typeof REQUEST_ASPECT_KIND_VALUES[number];

export function buildRequestAspectOp(
  source: RequestAspectOp["source"],
  requestKind: RequestAspectKind
): RequestAspectOp {
  switch (requestKind) {
    case "te_kudasai":
      return withKind("aspect", {
        aspect: "te_kudasai",
        source,
        request: {
          kind: "te_kudasai",
          register: "polite",
          polite: true,
          honorific: true
        }
      });
    case "te_kure_tanomu":
      return withKind("aspect", {
        aspect: "te_kure_tanomu",
        source,
        request: {
          kind: "te_kure_tanomu",
          register: "plain",
          polite: false,
          honorific: false
        }
      });
    case "chodai":
      return withKind("aspect", {
        aspect: "te_kure_tanomu",
        source,
        request: {
          kind: "chodai",
          register: "plain",
          polite: false,
          honorific: false
        }
      });
    default:
      requestKind satisfies never;
      throw new Error(`unsupported request aspect kind: ${requestKind}`);
  }
}

export function createPostverbAuxiliaryOp<const T extends OpInput<PostverbAuxiliaryOp>>(
  input: T
): PostverbAuxiliaryOp {
  const built = withKind("postverbAuxiliary", input);
  return {
    ...built,
    potentialComposition: built.potentialComposition
  };
}

export function buildPostverbAuxiliaryOp(
  source: PostverbAuxiliaryOp["source"],
  auxiliary: PostverbAuxiliaryOp["auxiliary"],
  options: Pick<PostverbAuxiliaryOp, "hostAttach"> = {}
): PostverbAuxiliaryOp {
  return createPostverbAuxiliaryOp({ auxiliary, ...options, source });
}

export function createPredicateProjectionCarrierOp<const T extends OpInput<PredicateProjectionCarrierOp>>(
  input: T
): BuiltOp<"predicateProjectionCarrier", T> {
  return withKind("predicateProjectionCarrier", input);
}

export function buildPredicateProjectionCarrierOp(
  source: PredicateProjectionCarrierOp["source"],
  carrier: PredicateProjectionCarrierOp["carrier"],
  surface: string,
  sourceAllomorph: PredicateProjectionCarrierOp["sourceAllomorph"],
  polite = false,
  past = false
): PredicateProjectionCarrierOp {
  return createPredicateProjectionCarrierOp({
    carrier,
    sourceAllomorph,
    surface,
    source,
    polite,
    past
  });
}

export function createPredicateQuoteCarrierOp(
  input: Omit<PredicateQuoteCarrierOp, "kind" | "allomorph">
): PredicateQuoteCarrierOp {
  const allomorph: PredicateQuoteCarrierOp["allomorph"] =
    input.style === "compact_toiu" && input.surface === "という" ? "toiu" :
      input.style === "compact_toiu" && input.surface === "っていう" ? "tteiu" : "other";
  return withKind("predicateQuoteCarrier", { ...input, allomorph });
}

export function createPredicateSuffixOp<const T extends OpInput<PredicateSuffixOp>>(
  input: T
): BuiltOp<"predicateSuffix", T> {
  return withKind("predicateSuffix", input);
}

export function createIdiomOp<const T extends OpInput<IdiomOp>>(input: T): BuiltOp<"idiom", T> {
  return withKind("idiom", input);
}

export function createConnectiveOp(
  input: Omit<ConnectiveOp, "kind" | "allomorph"> & {
    readonly allomorph?: ConnectiveOp["allomorph"];
  }
): ConnectiveOp {
  const allomorph: ConnectiveOp["allomorph"] =
    input.allomorph ??
    (input.surface === "と" ||
      (input.connective === "question_quotative" && input.surface.endsWith("と")) ? "to" :
      input.surface === "って" ||
        (input.connective === "question_quotative" && input.surface.endsWith("って")) ? "tte" :
      input.surface === "から" ? "kara" :
      input.surface === "ば" ? "ba" : input.surface === "たら" ? "tara" :
      input.surface === "てでも" || input.surface === "ででも" ? "te_demo" : "other");
  return withKind("connective", { ...input, allomorph });
}

export function buildBoundaryConnectiveOp(
  source: ConnectiveOp["source"],
  connective: ConnectiveOp["connective"],
  surface: string,
  allomorph?: ConnectiveOp["allomorph"]
): ConnectiveOp {
  return createConnectiveOp({
    connective,
    surface,
    source,
    ...(allomorph === undefined ? {} : { allomorph })
  });
}

export function buildMatchedConnectiveOp(
  source: ConnectiveOp["source"],
  match: {
    readonly connective: ConnectiveOp["connective"];
    readonly surface: string;
    readonly surfaceAllomorph?: ConnectiveOp["allomorph"];
    readonly conditionalFlavor?: ConnectiveOp["conditionalFlavor"];
    readonly retrospectiveQuotativeFlavor?: ConnectiveOp["retrospectiveQuotativeFlavor"];
    readonly quoteAttributiveFlavor?: ConnectiveOp["quoteAttributiveFlavor"];
    readonly mood?: ConnectiveOp["quotativeMood"];
    readonly retrospectiveDiscoveryStyle?: ConnectiveOp["retrospectiveDiscoveryStyle"];
  }
): ConnectiveOp {
  return createConnectiveOp({
    connective: match.connective,
    surface: match.surface,
    ...(match.surfaceAllomorph === undefined ? {} : { allomorph: match.surfaceAllomorph }),
    source,
    ...(match.conditionalFlavor === undefined ? {} : { conditionalFlavor: match.conditionalFlavor }),
    ...(match.retrospectiveQuotativeFlavor === undefined
      ? {}
      : { retrospectiveQuotativeFlavor: match.retrospectiveQuotativeFlavor }),
    ...(match.quoteAttributiveFlavor === undefined
      ? {}
      : { quoteAttributiveFlavor: match.quoteAttributiveFlavor }),
    ...(match.mood === undefined ? {} : { quotativeMood: match.mood }),
    ...(match.retrospectiveDiscoveryStyle === undefined
      ? {}
      : { retrospectiveDiscoveryStyle: match.retrospectiveDiscoveryStyle })
  });
}

export function markConditionalQuoteMarkerContinuationOp(op: ConnectiveOp): ConnectiveOp {
  return op.connective === "conditional" && op.structuralContinuation !== "quote_marker"
    ? { ...op, structuralContinuation: "quote_marker" }
    : op;
}

export function markTerminalDiscourseHostConnectiveOp(op: ConnectiveOp): ConnectiveOp {
  return op.terminalDiscourseHost === true ? op : { ...op, terminalDiscourseHost: true };
}

export function markQuotedQuestionContextOp(op: ConnectiveOp): ConnectiveOp {
  return op.connective === "question_content" && op.quotedQuestionContext !== true
    ? { ...op, quotedQuestionContext: true }
    : op;
}

export function buildVoiceOp(
  source: OpSource,
  voice: VoiceOp["voice"],
  candidates?: VoiceOp["candidates"],
  options: { readonly honorificFormulaicConstruction?: true } = {}
): VoiceOp {
  return createVoiceOp({

    source,
    voice,
    ...(candidates === undefined ? {} : { candidates }),
    ...(options.honorificFormulaicConstruction === undefined
      ? {}
      : { honorificFormulaicConstruction: options.honorificFormulaicConstruction }),
    forcePassive: false,
    adversativePassive: false,
    adversativePassiveAgentPromoted: false
  });
}

export function buildPredicateSuffixOp(
  source: OpSource,
  suffix: PredicateSuffixOp["suffix"],
  profileId: string,
  surface: string
): PredicateSuffixOp {
  return createPredicateSuffixOp({

    suffix,
    profileId,
    surface,
    source
  });
}
