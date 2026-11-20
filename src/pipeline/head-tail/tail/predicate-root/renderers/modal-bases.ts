import { shortNegationPrefix } from "../../../../../generator/aux-map.js";
import { conjugate, type IrregularType } from "../../../../../generator/conjugator.js";
import { hasBatchim } from "../../../../../generator/hangul.js";
import { hasAllomorphBatchim, selectParticle } from "../../../../../generator/particles.js";
import { POS4, POS5A, 助動詞_ジャ, 助動詞_ダ, 助動詞_マス, 意志推量形_ } from "../../../../../types/pos.js";
import type { RuntimeHaruToken } from "../../../../../types/token.js";
import type { LookupTables } from "../../../../lookup-tables.js";
import { copulaDeMarkerRelationForToken, kaMarkerRelationForToken } from "../../../boundary/marker.js";
import { assertNever, type ConjectureOp, type HazuModalOp, type LimitNegationModalOp, type ModalOp, type NegationOp, type NodaModalOp, type RashiiModalOp, type YoudaModalOp, type SoudaHearsayModalOp, type TokoroModalOp, type TsumoriModalOp, type WakeImpossibleIdiomOp, type WakeModalOp } from "../grammar.js";
import { isAffirmativeCopulaSupportVerbToken, isCopulaJaNegativeBridgeToken } from "../classifiers/tokens.js";
import { likenessAttributiveLexicalizationBase, applyNegationChainToLemmaBase, hostProjectionSourceTrace, isTopicOrJaFusionSurfaceToken, type AttributivePastProjection, type BaseResult, type BaseSourceTrace, type ConnectiveBaseOverride, type KoreanLemmaPredicateBase, type KoreanPredicateBase, type NegationLoweringOptions, nounCopulaFinalAllomorphHost, type OkBaseResult, predicateBasePolicyAllomorphHost, type PredicateBasePolicy, type ScopeCarrierPolicy, type ScopeCarrierStyle, type TailTraceSegment, type TailTraceSegmentKind } from "./base-model.js";
import { isBenefactiveNegativeCarrierPolicy, NODA_CARRIER_BOUND_NOUN, NODA_CARRIER_BOUND_NOUN_CASUAL, nodaCarrierNoun, quotePlainDeclarativeTraceParts, scopeCarrierCopulaBase, simpleStemBase } from "./base-support.js";
import { copularQuoteOption } from "./quote-complement-compose.js";
import { composeBaseWithTerminalChain } from "./predicate-terminal-compose.js";
import { projectBaseAttributive, quotedPropositionAttributiveIsReused, projectBaseFutureAttributive } from "./predicate-base-projection.js";
import { pastNegStemAttributive } from "./final-forms.js";

const KAMO_FINAL_NEGATION_OPTIONS: NegationLoweringOptions = {
  firstNegationFinalIsVerb: false
};

function shouldFlattenNodaConnectiveToHost(
  policy: PredicateBasePolicy | undefined,
  lemma: string
): boolean {
  if (policy?.kind === "desire") {
    return true;
  }
  if (policy?.kind === "likeness" && policy.nodaConnectiveFlatten !== undefined) {
    return true;
  }
  return isBenefactiveNegativeCarrierPolicy(policy, lemma);
}

function hazuNegativeScopeNoun(modal: HazuModalOp): "리" | "리는" {
  return modal.source.tokens.some(isTopicOrJaFusionSurfaceToken)
    ? "리는"
    : "리";
}

function modalSourceTrace(
  modal: ModalOp,
  inputProjectionText: string,
  carrierPrefix: string,
  options: {
    readonly carrierSourceTokens?: readonly RuntimeHaruToken[];
    readonly finalSourceTokens?: readonly RuntimeHaruToken[];
    readonly finalKind?: TailTraceSegmentKind;
    readonly suppressCarrierBoundaryAfter?: boolean;
  } = {}
): BaseSourceTrace {
  const carrierSourceTokens = options.carrierSourceTokens ?? modal.source.tokens;
  const carrierPrefixSegments: TailTraceSegment[] = [];
  if (carrierPrefix.length > 0) {
    carrierPrefixSegments.push({
      text: carrierPrefix,
      sourceTokens: carrierSourceTokens,
      kind: "modal",
      projectionConfidence: "semantic",
      suppressBoundaryAfter: options.suppressCarrierBoundaryAfter ?? true
    });
  }
  return {
    inputProjectionText,
    carrierPrefixSegments,
    finalSourceTokens: options.finalSourceTokens ?? modal.source.tokens,
    finalKind: options.finalKind ?? "modal"
  };
}

function carrierCopulaSourceTrace(
  modal: ModalOp,
  inputProjectionText: string,
  carrierPrefix: string
): BaseSourceTrace {
  const split = splitCarrierCopulaModalSource(modal.source.tokens);
  return modalSourceTrace(modal, inputProjectionText, carrierPrefix, {
    carrierSourceTokens: split.carrierSourceTokens,
    finalSourceTokens: split.finalSourceTokens,
    suppressCarrierBoundaryAfter: !split.hasInternalBoundary
  });
}

function scopeNounCopulaNegativeSourceTrace(
  modal: ModalOp,
  inputProjectionText: string,
  nounPrefix: string,
  copulaBridgePrefix: string
): BaseSourceTrace {
  const split = splitCarrierCopulaModalSource(modal.source.tokens);
  const carrierPrefixSegments: TailTraceSegment[] = [];
  if (nounPrefix.length > 0) {
    carrierPrefixSegments.push({
      text: nounPrefix,
      sourceTokens: split.carrierSourceTokens,
      kind: "modal",
      projectionConfidence: "semantic",
      suppressBoundaryAfter: !split.hasInternalBoundary
    });
  }
  if (copulaBridgePrefix.length > 0) {
    carrierPrefixSegments.push({
      text: copulaBridgePrefix,
      sourceTokens: split.finalSourceTokens,
      kind: "aux",
      projectionConfidence: "semantic"
    });
  }
  return {
    inputProjectionText,
    carrierPrefixSegments,
    finalSourceTokens: split.finalSourceTokens,
    finalKind: "modal"
  };
}

export function splitCarrierCopulaModalSource(tokens: readonly RuntimeHaruToken[]): {
  readonly carrierSourceTokens: readonly RuntimeHaruToken[];
  readonly finalSourceTokens: readonly RuntimeHaruToken[];
  readonly hasInternalBoundary: boolean;
} {
  const copulaIndex = tokens.findIndex((token, index) => index > 0 && isCopulaCarrierTailToken(token));
  if (copulaIndex <= 0) {
    return {
      carrierSourceTokens: tokens,
      finalSourceTokens: tokens,
      hasInternalBoundary: false
    };
  }
  return {
    carrierSourceTokens: tokens.slice(0, copulaIndex),
    finalSourceTokens: tokens.slice(copulaIndex),
    hasInternalBoundary: true
  };
}

function isCopulaCarrierTailToken(token: RuntimeHaruToken): boolean {
  const form = token.dictionaryForm || token.normalizedForm || token.surface;
  return form === "だ" || form === "です" || isCopulaJaNegativeBridgeToken(token);
}

export function copulaCarrierConjectureBase(
  inputBase: KoreanLemmaPredicateBase,
  conjecture: ConjectureOp,
  past = false
): OkBaseResult | null {
  if (
    inputBase.final.lemma !== "이다" ||
    inputBase.final.irregular !== null
  ) {
    return null;
  }
  if (inputBase.prefix.length === 0) {
    return null;
  }
  const batchim = hasAllomorphBatchim(predicateBasePolicyAllomorphHost(inputBase));
  const stem = past
    ? `${inputBase.prefix}${batchim ? "이었겠" : "였겠"}`
    : `${inputBase.prefix}${batchim ? "이겠" : "겠"}`;
  return {
    ok: true,
    base: {
      prefix: "",
      final: {
        kind: "lemma",
        lemma: `${stem}다`,
        irregular: null,
        isVerb: false,
        idiom: { kind: "conjecture", conjecturePolite: conjecture.polite }
      },
      ...(inputBase.policy === undefined
        ? {}
        : inputBase.policy.kind === "noun_copula_interop" || inputBase.policy.kind === "negative_noun_copula_interop"
          ? { policy: { ...inputBase.policy, conjectureHostPast: past } }
          : { policy: inputBase.policy })
    }
  };
}


function nodaCarrierBoundNounHost(base: KoreanLemmaPredicateBase): {
  readonly policy: ScopeCarrierPolicy;
  readonly hostPrefix: string;
} | null {
  const policy = base.policy;
  if (
    policy?.kind !== "scope_carrier" ||
    policy.carrier !== "noda" ||
    (policy.nounSurface !== NODA_CARRIER_BOUND_NOUN && policy.nounSurface !== NODA_CARRIER_BOUND_NOUN_CASUAL) ||
    base.final.lemma !== "이다" ||
    base.final.irregular !== null ||
    policy.hostPrefix === undefined
  ) {
    return null;
  }
  return { policy, hostPrefix: policy.hostPrefix };
}

export function nodaCarrierConjectureBase(
  inputBase: KoreanLemmaPredicateBase,
  conjecture: ConjectureOp
): OkBaseResult | null {
  const host = nodaCarrierBoundNounHost(inputBase);
  if (host === null) {
    return null;
  }
  const nominal = `${host.hostPrefix}${NODA_CARRIER_BOUND_NOUN}`;
  return {
    ok: true,
    base: {
      prefix: "",
      final: {
        kind: "lemma",
        lemma: `${nominal}이겠다`,
        irregular: null,
        isVerb: false,
        idiom: {
          kind: "conjecture",
          conjecturePolite: conjecture.polite,
          projection: "nominalized"
        }
      },
      policy: host.policy
    },
    chainOnFinalSupported: false
  };
}

export function nodaCarrierLikenessBase(
  inputBase: KoreanLemmaPredicateBase
): OkBaseResult | null {
  const host = nodaCarrierBoundNounHost(inputBase);
  if (host === null) {
    return null;
  }
  return {
    ok: true,
    base: {
      prefix: `${host.hostPrefix}${NODA_CARRIER_BOUND_NOUN} `,
      final: { kind: "lemma", lemma: "같다", irregular: null, isVerb: false },
      policy: { kind: "likeness" }
    }
  };
}

export function quotedPropositionLikenessBase(
  inputBase: KoreanPredicateBase,
  modal: YoudaModalOp | RashiiModalOp,
  formal: boolean,
  pastProjection: AttributivePastProjection
): OkBaseResult | null {
  if (
    inputBase.policy?.kind !== "quoted_proposition" ||
    inputBase.policy.attributiveQuote?.realizesInterrogativeMood !== true ||
    !quotedPropositionAttributiveIsReused(inputBase, false, "present")
  ) {
    return null;
  }
  const hostAttr = projectBaseAttributive(inputBase, false, formal, pastProjection, "default", "present");
  if (hostAttr === null) {
    return null;
  }
  const attributiveLexicalization = modal.modal === "youda"
    ? likenessAttributiveLexicalizationBase(modal, hostAttr)
    : undefined;
  return {
    ok: true,
    base: {
      prefix: `${hostAttr} 것 `,
      final: { kind: "lemma", lemma: "같다", irregular: null, isVerb: false },
      policy: {
        kind: "likeness",
        ...(attributiveLexicalization === undefined ? {} : { attributiveLexicalization })
      }
    }
  };
}

export function wakeCarrierConjectureBase(
  inputBase: KoreanPredicateBase,
  conjecture: ConjectureOp
): OkBaseResult | null {
  if (
    inputBase.policy?.kind !== "scope_carrier" ||
    inputBase.policy.carrier !== "wake" ||
    inputBase.final.kind !== "boundNounCopula"
  ) {
    return null;
  }
  const noun = inputBase.final.nounSurface;
  const stem = hasBatchim(noun) ? `${noun}이겠` : `${noun}겠`;
  return {
    ok: true,
    base: {
      prefix: inputBase.prefix,
      final: {
        kind: "lemma",
        lemma: `${stem}다`,
        irregular: null,
        isVerb: false,
        idiom: { kind: "conjecture", conjecturePolite: conjecture.polite }
      },
      policy: inputBase.policy
    },
    chainOnFinalSupported: false
  };
}

export function nodaCarrierAbsorbedByHostBoundNoun(
  inputBase: KoreanLemmaPredicateBase,
  modal: NodaModalOp
): OkBaseResult | null {
  const policy = inputBase.policy;
  if (
    policy?.kind !== "noun_copula_interop" ||
    policy.nounSurface !== NODA_CARRIER_BOUND_NOUN ||
    inputBase.final.lemma !== "이다" ||
    inputBase.final.irregular !== null
  ) {
    return null;
  }
  const hostPrefix = policy.hostPrefix;
  if (nodaCarrierHasSupportConjecture(modal)) {
    return {
      ok: true,
      base: {
        prefix: "",
        final: {
          kind: "lemma",
          lemma: `${inputBase.prefix}이겠다`,
          irregular: null,
          isVerb: false,
          idiom: {
            kind: "conjecture",
            conjecturePolite: modal.polite,
            projection: "nominalized"
          }
        },
        policy: {
          kind: "scope_carrier",
          carrier: "noda",
          nounSurface: policy.nounSurface,
          hostPrefix,
          style: "emphasis"
        }
      },
      chainOnFinalSupported: false
    };
  }
  const carrierStyle = nodaCarrierStyle(modal);
  return {
    ok: true,
    base: scopeCarrierCopulaBase(
      "noda",
      policy.nounSurface,
      hostPrefix,
      carrierStyle === undefined
        ? {}
        : { style: carrierStyle, connectiveSourcePoliteness: "preserve_when_supported" }
    )
  };
}

export function nodaCarrierKamoBase(
  inputBase: KoreanLemmaPredicateBase,
  formal: boolean,
  hostPast: boolean,
  bare: boolean
): OkBaseResult | null {
  const host = nodaCarrierBoundNounHost(inputBase);
  if (host === null) {
    return null;
  }
  const hostPrefix = host.hostPrefix;
  const emphasis = host.policy.style === "emphasis";
  const contracted =
    !emphasis && !formal && host.policy.nounSurface === NODA_CARRIER_BOUND_NOUN_CASUAL;
  let nominal: string;
  if (hostPast) {
    nominal = contracted
      ? `${hostPrefix}거였을`
      : `${hostPrefix}것이었을`;
  } else if (contracted) {
    nominal = `${hostPrefix}걸`;
  } else {
    nominal = `${hostPrefix}것일`;
  }
  return {
    ok: true,
    ...(bare ? { terminalRealization: { kind: "elided_carrier" as const } } : {}),
    base: {
      prefix: `${nominal}지도 `,
      final: { kind: "lemma", lemma: "모르다", irregular: "르", isVerb: true }
    }
  };
}

function scopeCarrierSupportsExternalChain(base: KoreanPredicateBase): boolean {
  return base.policy?.kind === "scope_carrier" &&
    (base.final.kind === "nounCopula" || base.final.kind === "boundNounCopula");
}

export function modalFinalChainPolicy(base: KoreanPredicateBase): {
  readonly chainOnFinalSupported: boolean;
  readonly finalNegationOptions?: NegationLoweringOptions;
} {
  if (scopeCarrierSupportsExternalChain(base)) {
    return { chainOnFinalSupported: true };
  }
  if (
    base.policy?.kind === "reporting" &&
    base.final.kind === "lemma" &&
    base.final.lemma === "하다"
  ) {
    return { chainOnFinalSupported: true };
  }
  if (base.final.kind !== "lemma") {
    return { chainOnFinalSupported: false };
  }
  switch (base.final.lemma) {
    case "모르다":
      return {
        chainOnFinalSupported: true,
        finalNegationOptions: KAMO_FINAL_NEGATION_OPTIONS
      };
    case "없다":
    case "아니다":
    case "같다":
    case "보이다":
      return { chainOnFinalSupported: true };
    default:
      return { chainOnFinalSupported: false };
  }
}

function soudaHearsaySourceTrace(
  modal: SoudaHearsayModalOp,
  inputProjectionText: string,
  carrierPrefix: string
): BaseSourceTrace {
  const split = splitCarrierCopulaModalSource(modal.source.tokens);
  return {
    inputProjectionText,
    carrierPrefixSegments: [
      {
        text: carrierPrefix,
        sourceTokens: split.carrierSourceTokens,
        kind: "modal",
        projectionConfidence: "semantic",
        suppressBoundaryAfter: !split.hasInternalBoundary
      },
      {
        text: " ",
        sourceTokens: [],
        kind: "punctuation",
        projectionConfidence: "semantic"
      }
    ],
    finalSourceTokens: split.finalSourceTokens,
    finalKind: "modal"
  };
}

export function soudaHearsayBaseFromPredicateBase(
  base: KoreanPredicateBase,
  finalNeg: NegationOp | null,
  past: boolean,
  lookups: LookupTables,
  modal?: SoudaHearsayModalOp
): BaseResult {
  if (finalNeg === null && !past && base.final.kind === "nounCopula") {
    const noun = `${base.prefix}${base.final.nounSurface}`;
    const carrierPrefix = hasBatchim(`${base.prefix}${nounCopulaFinalAllomorphHost(base.final)}`) ? "이라고" : "라고";
    return {
      ok: true,
      base: {
        prefix: `${noun}${carrierPrefix} `,
        final: { kind: "lemma", lemma: "하다", irregular: "여", isVerb: true },
        policy: { kind: "reporting", family: "souda_hearsay" }
      },
      ...(modal === undefined ? {} : {
        sourceTrace: soudaHearsaySourceTrace(modal, noun, carrierPrefix)
      })
    };
  }
  const rendered = composeBaseWithTerminalChain(
    base,
    finalNeg,
    past,
    true,
    false,
    lookups
  );
  if (!rendered.ok) {
    return { ok: false, reason: `souda hearsay quote base render failed: ${rendered.reason}` };
  }
  const trace = quotePlainDeclarativeTraceParts(rendered.text, { ...copularQuoteOption(base) });
  return {
    ok: true,
    base: {
      prefix: `${trace.inputProjectionText}${trace.carrierPrefix} `,
      final: { kind: "lemma", lemma: "하다", irregular: "여", isVerb: true },
      policy: { kind: "reporting", family: "souda_hearsay" }
    },
    ...(modal === undefined ? {} : {
      sourceTrace: soudaHearsaySourceTrace(modal, trace.inputProjectionText, trace.carrierPrefix)
    })
  };
}

function limitNegationPropositionParts(
  text: string,
  formal: boolean,
  options: { readonly copularLemma?: string } = {}
): { readonly inputProjectionText: string; readonly carrierPrefix: string } {
  const quotedCopula = formal ? "라는" : "란";
  if (options.copularLemma !== undefined && text.endsWith(options.copularLemma)) {
    return { inputProjectionText: text.slice(0, -"다".length), carrierPrefix: quotedCopula };
  }
  if (text.endsWith("아니다")) {
    return { inputProjectionText: text.slice(0, -"다".length), carrierPrefix: quotedCopula };
  }
  if (text.endsWith("이다")) {
    const stem = text.slice(0, -"이다".length);
    return { inputProjectionText: stem, carrierPrefix: `${hasBatchim(stem) ? "이" : ""}${quotedCopula}` };
  }
  if (text.endsWith("거다")) {
    return { inputProjectionText: text.slice(0, -"다".length), carrierPrefix: quotedCopula };
  }
  if (text.endsWith("다")) {
    return formal
      ? { inputProjectionText: text, carrierPrefix: "는" }
      : { inputProjectionText: text.slice(0, -"다".length), carrierPrefix: "단" };
  }
  return { inputProjectionText: text, carrierPrefix: quotedCopula };
}

function limitNegationSourceTrace(
  modal: LimitNegationModalOp,
  proposition: { readonly inputProjectionText: string; readonly separableCarrier: string | null },
  scopeNoun: string
): BaseSourceTrace {
  const [quoteToken, focusToken, ...finalTokens] = modal.source.tokens;
  const scopeTokens = proposition.separableCarrier === null
    ? [quoteToken, focusToken].filter((token) => token !== undefined)
    : [focusToken].filter((token) => token !== undefined);
  return {
    inputProjectionText: proposition.inputProjectionText,
    carrierPrefixSegments: [
      ...(proposition.separableCarrier === null
        ? []
        : [{
          text: proposition.separableCarrier,
          sourceTokens: quoteToken === undefined ? [] : [quoteToken],
          kind: "modal" as const,
          projectionConfidence: "semantic" as const
        }]),
      {
        text: ` ${scopeNoun}`,
        sourceTokens: scopeTokens,
        kind: "modal",
        projectionConfidence: "semantic"
      },
      {
        text: " ",
        sourceTokens: [],
        kind: "punctuation",
        projectionConfidence: "semantic"
      }
    ],
    finalSourceTokens: finalTokens.length > 0 ? finalTokens : modal.source.tokens,
    finalKind: "modal"
  };
}

export function limitNegationBaseFromPredicateBase(opts: {
  readonly modal: LimitNegationModalOp;
  readonly base: KoreanPredicateBase;
  readonly preNeg: NegationOp | null;
  readonly past: boolean;
  readonly formal: boolean;
  readonly lookups: LookupTables;
}): BaseResult {
  const scopeNoun = opts.modal.focus === "mo" ? "법도" : "법은";
  const base: KoreanPredicateBase = opts.past && opts.base.policy?.kind === "noun_copula_interop"
    ? {
      prefix: "",
      final: {
        kind: "nounCopula",
        nounSurface: opts.base.policy.nounSurface,
        isBoundNoun: opts.base.policy.isBoundNoun
      },
      policy: opts.base.policy
    }
    : opts.base;
  const parts = (() => {
    if (opts.preNeg === null && !opts.past && base.final.kind === "nounCopula") {
      const allomorphHost = `${base.prefix}${nounCopulaFinalAllomorphHost(base.final)}`;
      const quotedCopula = opts.formal ? "라는" : "란";
      return {
        ok: true as const,
        inputProjectionText: `${base.prefix}${base.final.nounSurface}`,
        carrierPrefix: `${hasBatchim(allomorphHost) ? "이" : ""}${quotedCopula}`,
        separable: true
      };
    }
    const rendered = composeBaseWithTerminalChain(base, opts.preNeg, opts.past, true, false, opts.lookups);
    if (!rendered.ok) {
      return { ok: false as const, reason: `limit negation proposition render failed: ${rendered.reason}` };
    }
    return { ok: true as const, ...limitNegationPropositionParts(rendered.text, opts.formal, { ...copularQuoteOption(base) }), separable: false };
  })();
  if (!parts.ok) {
    return parts;
  }
  const inputPrefix = opts.base.prefix;
  const projectionText = parts.inputProjectionText.startsWith(inputPrefix)
    ? parts.inputProjectionText.slice(inputPrefix.length)
    : parts.inputProjectionText;
  return {
    ok: true,
    base: {
      prefix: `${parts.inputProjectionText}${parts.carrierPrefix} ${scopeNoun} `,
      final: { kind: "lemma", lemma: "없다", irregular: null, isVerb: false }
    },
    sourceTrace: limitNegationSourceTrace(
      opts.modal,
      parts.separable
        ? { inputProjectionText: projectionText, separableCarrier: parts.carrierPrefix }
        : { inputProjectionText: `${projectionText}${parts.carrierPrefix}`, separableCarrier: null },
      scopeNoun
    )
  };
}

function soudaYotaiBaseFromStem(opts: {
  readonly modal: SoudaHearsayModalOp;
  readonly stemLemma: string;
  readonly stemIrregular: IrregularType | null;
  readonly stemKind: "verb" | "adj";
  readonly preModalNeg: NegationOp | null;
  readonly past: boolean;
  readonly pastProjection?: AttributivePastProjection;
  readonly sourceStemIsVerb?: boolean;
  readonly inputPolicy?: PredicateBasePolicy;
  readonly lookups: LookupTables;
  readonly sahenShortNegationSplit: boolean;
}): BaseResult {
  const sourceHostIsVerbal = opts.sourceStemIsVerb ?? (opts.stemKind === "verb");
  const nounCopulaHost = opts.inputPolicy?.kind === "noun_copula_interop" && opts.preModalNeg === null;
  const hostAttributive = (attrPolicy: "future" | "present"): string => modalInputStemAttributive({
    stemLemma: opts.stemLemma,
    stemIrregular: opts.stemIrregular,
    stemKind: opts.stemKind,
    past: opts.past,
    preModalNeg: opts.preModalNeg,
    attrPolicy,
    useShortHint: false,
    pastProjection: opts.pastProjection ?? "lexical",
    lookups: opts.lookups,
    sahenShortNegationSplit: opts.sahenShortNegationSplit,
    ...(opts.inputPolicy === undefined ? {} : { inputPolicy: opts.inputPolicy })
  });
  const adverbialLexicalization: KoreanLemmaPredicateBase = {
    prefix: `${hostAttributive(sourceHostIsVerbal ? "future" : "present")} `,
    final: { kind: "lemma", lemma: "듯하다", irregular: null, isVerb: false }
  };
  const yotaiPolicy = { kind: "likeness", adverbialLexicalization } as const;
  const focusNegationOptions = opts.modal.negationFocusParticle === undefined
    ? {}
    : { finalNegationOptions: { firstNegationFocusParticle: opts.modal.negationFocusParticle } };
  if (!sourceHostIsVerbal && !nounCopulaHost && opts.preModalNeg === null && !opts.past) {
    const stemForm = conjugate(opts.stemLemma, opts.stemIrregular, "아/어");
    return {
      ok: true,
      base: {
        prefix: `${stemForm} `,
        final: { kind: "lemma", lemma: "보이다", irregular: null, isVerb: true },
        policy: yotaiPolicy
      },
      sourceTrace: modalSourceTrace(opts.modal, stemForm, " "),
      ...focusNegationOptions
    };
  }
  const stemAttr = hostAttributive(nounCopulaHost ? "present" : "future");
  return {
    ok: true,
    base: {
      prefix: `${stemAttr} 것 `,
      final: { kind: "lemma", lemma: "같다", irregular: null, isVerb: false },
      policy: yotaiPolicy
    },
    sourceTrace: modalSourceTrace(opts.modal, stemAttr, " 것 "),
    ...focusNegationOptions
  };
}

function tsumoriBaseFromStem(opts: {
  readonly stemLemma: string;
  readonly stemIrregular: IrregularType | null;
  readonly stemKind: "verb" | "adj";
  readonly modal: TsumoriModalOp;
  readonly preModalNeg: NegationOp | null;
  readonly past: boolean;
  readonly pastProjection?: AttributivePastProjection;
  readonly sourceStemIsVerb?: boolean;
  readonly sourceHostHasTeIruAspect?: boolean;
  readonly lookups: LookupTables;
  readonly sahenShortNegationSplit: boolean;
}): BaseResult {
  if (opts.stemKind !== "verb" && opts.sourceStemIsVerb !== true) {
    return { ok: false, reason: "tsumori on adjective stem not supported (의도/가정 표현은 V 만)" };
  }

  const assumptionReading = opts.modal.reading === "counterfactual_assumption" ||
    opts.sourceHostHasTeIruAspect === true;
  const noun = opts.modal.reading === "counterfactual_assumption" ? "셈" : "생각";
  const sourceStemKind = opts.sourceStemIsVerb === true ? "verb" : opts.stemKind;
  const stemAttr = pastNegStemAttributive({
    stemLemma: opts.stemLemma,
    stemIrregular: opts.stemIrregular,
    stemKind: sourceStemKind,
    past: opts.past,
    preModalNeg: opts.preModalNeg,
    attrPolicy: assumptionReading ? "present" : "future",
    useShortHint: assumptionReading,
    pastProjection: opts.pastProjection ?? "lexical",
    lookups: opts.lookups,
    sahenShortNegationSplit: opts.sahenShortNegationSplit
  });

  switch (opts.modal.variant) {
    case "affirmative":
      return {
        ok: true,
        base: {
          prefix: `${stemAttr} `,
          final: { kind: "nounCopula", nounSurface: noun, isBoundNoun: false }
        },
        sourceTrace: carrierCopulaSourceTrace(opts.modal, stemAttr, ` ${noun}`)
      };
    case "topic_negative":
      return {
        ok: true,
        base: {
          prefix: `${stemAttr} ${noun}은 `,
          final: { kind: "lemma", lemma: "없다", irregular: null, isVerb: false }
        },
        sourceTrace: modalSourceTrace(opts.modal, stemAttr, ` ${noun}은 `)
      };
    case "copula_negative":
      return {
        ok: true,
        base: {
          prefix: `${stemAttr} ${noun}이 `,
          final: { kind: "lemma", lemma: "아니다", irregular: "아니", isVerb: false }
        },
        sourceTrace: scopeNounCopulaNegativeSourceTrace(opts.modal, stemAttr, ` ${noun}`, "이 ")
      };
    default:
      return assertNever(opts.modal.variant);
  }
}

export function wakeImpossibleBase(opts: {
  readonly op: WakeImpossibleIdiomOp;
  readonly inputBase: KoreanLemmaPredicateBase;
  readonly preStemNeg: NegationOp | null;
  readonly stemPast: boolean;
  readonly formal: boolean;
  readonly pastProjection: AttributivePastProjection;
}): BaseResult {
  const hostBase = applyNegationChainToLemmaBase(opts.inputBase, opts.preStemNeg);
  if (hostBase === null) {
    return { ok: false, reason: "wake impossible host negation lowering 영역 외" };
  }
  const hostPast = opts.stemPast || (opts.preStemNeg?.chainPast ?? false);
  if (hostBase.policy?.kind === "quoted_proposition" && !hostPast) {
    const label = opts.op.focus === "mo" ? "것도" : (opts.formal ? "것은" : "건");
    const quotedPrefix = `${hostBase.policy.attributive} ${label} 안 `;
    const quotedTrace = hostProjectionSourceTrace({
      hostText: hostBase.policy.attributive,
      inputPrefix: opts.inputBase.prefix,
      basePrefix: quotedPrefix,
      sourceTokens: opts.op.source.tokens,
      splitFinal: "negative_nai"
    });
    return {
      ok: true,
      base: {
        prefix: quotedPrefix,
        final: { kind: "lemma", lemma: "되다", irregular: null, isVerb: true }
      },
      chainOnFinalSupported: true,
      interOpPastProjection: "committed",
      ...(quotedTrace === undefined ? {} : { sourceTrace: quotedTrace })
    };
  }
  const projected = projectBaseFutureAttributive(
    hostBase,
    hostPast,
    opts.formal,
    opts.pastProjection
  );
  if (projected === null) {
    return { ok: false, reason: "wake impossible future attributive projection 영역 외" };
  }
  const basePrefix = `${projected} 수 `;
  const sourceTrace = hostProjectionSourceTrace({
    hostText: projected,
    inputPrefix: opts.inputBase.prefix,
    basePrefix,
    sourceTokens: opts.op.source.tokens,
    splitFinal: "negative_nai"
  });
  return {
    ok: true,
    base: {
      prefix: basePrefix,
      final: { kind: "lemma", lemma: "없다", irregular: null, isVerb: false }
    },
    chainOnFinalSupported: true,
    interOpPastProjection: "committed",
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

export function wakeExplanatoryCitationBase(opts: {
  readonly op: WakeModalOp;
  readonly inputBase: KoreanLemmaPredicateBase;
  readonly preStemNeg: NegationOp | null;
  readonly stemPast: boolean;
  readonly formal: boolean;
}): BaseResult | null {
  if (
    opts.op.variant !== "explanatory" ||
    opts.op.polarity !== "affirmative" ||
    opts.preStemNeg !== null ||
    opts.stemPast ||
    opts.inputBase.policy?.kind !== "quoted_proposition"
  ) {
    return null;
  }
  const attributive = opts.inputBase.policy.attributive;
  const noun = opts.formal ? "것" : "거";
  return {
    ok: true,
    base: scopeCarrierCopulaBase("wake", noun, `${attributive} `),
    sourceTrace: carrierCopulaSourceTrace(opts.op, attributive, ` ${noun}`)
  };
}

function modalInputStemAttributive(opts: {
  readonly stemLemma: string;
  readonly stemIrregular: IrregularType | null;
  readonly stemKind: "verb" | "adj";
  readonly past: boolean;
  readonly pastProjection?: AttributivePastProjection;
  readonly preModalNeg: NegationOp | null;
  readonly attrPolicy: "future" | "present";
  readonly useShortHint: boolean;
  readonly inputPolicy?: PredicateBasePolicy;
  readonly lookups: LookupTables;
  readonly sahenShortNegationSplit: boolean;
}): string {
  if (
    opts.inputPolicy?.kind === "noun_copula_interop" &&
    opts.preModalNeg === null
  ) {
    const noun = opts.inputPolicy.nounSurface;
    if (opts.past) {
      const pastStem = selectParticle(opts.inputPolicy.allomorphHost ?? noun, "이었/였");
      return `${pastStem}${opts.attrPolicy === "future" ? "을" : "던"}`;
    }
    return opts.attrPolicy === "future" ? "일" : "인";
  }
  return pastNegStemAttributive({
    stemLemma: opts.stemLemma,
    stemIrregular: opts.stemIrregular,
    stemKind: opts.stemKind,
    past: opts.past,
    preModalNeg: opts.preModalNeg,
    attrPolicy: opts.attrPolicy,
    useShortHint: opts.useShortHint,
    pastProjection: opts.pastProjection ?? "lexical",
    lookups: opts.lookups,
    sahenShortNegationSplit: opts.sahenShortNegationSplit
  });
}

export function nominalHostEvidentialLikenessBase(nounSurface: string, modal: ModalOp): BaseResult {
  return {
    ok: true,
    base: {
      prefix: `${nounSurface} `,
      final: { kind: "lemma", lemma: "같다", irregular: null, isVerb: false },
      policy: { kind: "likeness" }
    },
    sourceTrace: modalSourceTrace(modal, "", " ")
  };
}

export function modalBase(opts: {
  readonly modal: ModalOp;
  readonly stemLemma: string;
  readonly stemIrregular: IrregularType | null;
  readonly stemKind: "verb" | "adj";
  readonly preModalNeg: NegationOp | null;
  readonly past: boolean;
  readonly formal: boolean;
  readonly pastProjection?: AttributivePastProjection;
  readonly inputPolicy?: PredicateBasePolicy;
  readonly sourceStemIsVerb?: boolean;
  readonly sourceHostHasTeIruAspect?: boolean;
  readonly forbidShortNegation?: boolean;
  readonly preferShortLikenessNegation?: boolean;
  readonly lookups: LookupTables;
  readonly sahenShortNegationSplit: boolean;
}): BaseResult {
  const {
    modal,
    stemLemma,
    stemIrregular,
    stemKind,
    preModalNeg,
    past,
    formal,
    pastProjection = "lexical",
    inputPolicy,
    sourceStemIsVerb,
    sourceHostHasTeIruAspect = false,
    forbidShortNegation,
    preferShortLikenessNegation = false,
    lookups,
    sahenShortNegationSplit
  } = opts;
  const useShortFor = (defaultShort: boolean): boolean => !forbidShortNegation && defaultShort;
  const stemAttributive = (
    attrPolicy: "future" | "present",
    useShortHint: boolean
  ): string => modalInputStemAttributive({
    stemLemma,
    stemIrregular,
    stemKind,
    past,
    preModalNeg,
    attrPolicy,
    useShortHint,
    pastProjection,
    lookups,
    sahenShortNegationSplit,
    ...(inputPolicy === undefined ? {} : { inputPolicy })
  });
  const mb: ModalBaseContext = {
    opts,
    stemLemma,
    stemIrregular,
    stemKind,
    preModalNeg,
    past,
    formal,
    pastProjection,
    inputPolicy,
    sourceStemIsVerb,
    sourceHostHasTeIruAspect,
    preferShortLikenessNegation,
    lookups,
    sahenShortNegationSplit,
    useShortFor,
    stemAttributive
  };
  switch (modal.modal) {
    case "kamo":
      return kamoModalBase(mb, modal);
    case "hazu":
      return hazuModalBase(mb, modal);
    case "noda":
      return nodaModalBase(mb, modal);
    case "youda":
      return youdaModalBase(mb, modal);
    case "rashii":
      return rashiiModalBase(mb, modal);
    case "tsumori": {
      return tsumoriBaseFromStem({
        stemLemma,
        stemIrregular,
        stemKind,
        modal,
        preModalNeg,
        past,
        pastProjection,
        ...(sourceStemIsVerb === undefined ? {} : { sourceStemIsVerb }),
        sourceHostHasTeIruAspect,
        lookups,
        sahenShortNegationSplit
      });
    }
    case "tokoro":
      return tokoroModalBase(mb, modal);
    case "mai":
      return maiModalBase(mb, modal);
    case "wake": {
      const stemAttr = stemAttributive("present", false);
      switch (modal.variant) {
        case "explanatory":
          return {
            ok: true,
            base: scopeCarrierCopulaBase("wake", "셈", `${stemAttr} `),
            sourceTrace: carrierCopulaSourceTrace(modal, stemAttr, " 셈")
          };
        case "rhetorical_no_way": {
          const stemAttrFuture = stemAttributive("future", false);
          return {
            ok: true,
            base: {
              prefix: `${stemAttrFuture} 리 `,
              final: { kind: "lemma", lemma: "없다", irregular: null, isVerb: false }
            },
            sourceTrace: modalSourceTrace(modal, stemAttrFuture, " 리 ")
          };
        }
        case "rhetorical_possibility": {
          const stemAttrFuture = stemAttributive("future", false);
          return {
            ok: true,
            base: {
              prefix: `${stemAttrFuture} 리 `,
              final: { kind: "lemma", lemma: "있다", irregular: null, isVerb: false }
            },
            sourceTrace: modalSourceTrace(modal, stemAttrFuture, " 리 ")
          };
        }
        case "partial_negation":
          return {
            ok: true,
            base: {
              prefix: `${stemAttr} 것은 `,
              final: { kind: "lemma", lemma: "아니다", irregular: "아니", isVerb: false }
            },
            terminalPrefixContraction: "scope_topic",
            connectivePrefixContraction: "scope_topic",
            sourceTrace: modalSourceTrace(modal, stemAttr, " 것은 ")
          };
        case "weakened_partial_negation":
          return {
            ok: true,
            base: {
              prefix: `${stemAttr} 것도 `,
              final: { kind: "lemma", lemma: "아니다", irregular: "아니", isVerb: false }
            },
            sourceTrace: modalSourceTrace(modal, stemAttr, " 것도 ")
          };
      }
    }
    case "souda_hearsay":
      return soudaHearsayModalBase(mb, modal);
    case "limit_negation":
      return { ok: false, reason: "limit negation requires the composed predicate base" };
    case "mono":
      return monoModalBase(mb, modal);
    default:
      assertNever(modal);
  }
}

interface ModalBaseContext {
  readonly opts: Parameters<typeof modalBase>[0];
  readonly stemLemma: string;
  readonly stemIrregular: IrregularType | null;
  readonly stemKind: "verb" | "adj";
  readonly preModalNeg: NegationOp | null;
  readonly past: boolean;
  readonly formal: boolean;
  readonly pastProjection: AttributivePastProjection;
  readonly inputPolicy: PredicateBasePolicy | undefined;
  readonly sourceStemIsVerb: boolean | undefined;
  readonly sourceHostHasTeIruAspect: boolean;
  readonly preferShortLikenessNegation: boolean;
  readonly lookups: LookupTables;
  readonly sahenShortNegationSplit: boolean;
  readonly useShortFor: (defaultShort: boolean) => boolean;
  readonly stemAttributive: (attrPolicy: "future" | "present", useShortHint: boolean) => string;
}

function kamoModalBase(mb: ModalBaseContext, modal: Extract<ModalOp, { readonly modal: "kamo" }>): BaseResult {
  const { useShortFor, stemAttributive } = mb;
  const stemAttr = stemAttributive("future", useShortFor(true));
  return {
    ok: true,
    ...(modal.bare ? { terminalRealization: { kind: "elided_carrier" as const } } : {}),
    base: {
      prefix: `${stemAttr}지도 `,
      final: { kind: "lemma", lemma: "모르다", irregular: "르", isVerb: true }
    },
    sourceTrace: {
      inputProjectionText: stemAttr,
      carrierPrefixSegments: [
        {
          text: "지도",
          sourceTokens: modal.source.tokens.slice(0, 2),
          kind: "modal",
          projectionConfidence: "semantic"
        },
        {
          text: " ",
          sourceTokens: [],
          kind: "punctuation",
          projectionConfidence: "semantic"
        }
      ],
      finalSourceTokens: modal.source.tokens.length > 2 ? modal.source.tokens.slice(2) : modal.source.tokens,
      finalKind: "modal"
    }
  };
}

function hazuModalBase(mb: ModalBaseContext, modal: Extract<ModalOp, { readonly modal: "hazu" }>): BaseResult {
  const { stemAttributive } = mb;
  if (modal.polarity === "negative") {
    const stemAttr = stemAttributive("future", false);
    const scopeNoun = hazuNegativeScopeNoun(modal);
    const hasTopic = scopeNoun === "리는";
    return {
      ok: true,
      base: {
        prefix: `${stemAttr} ${scopeNoun} `,
        final: { kind: "lemma", lemma: "없다", irregular: null, isVerb: false }
      },
      sourceTrace: {
        inputProjectionText: stemAttr,
        carrierPrefixSegments: [
          {
            text: " 리",
            sourceTokens: modal.source.tokens.slice(0, 1),
            kind: "modal",
            projectionConfidence: "semantic",
            suppressBoundaryAfter: false
          },
          ...(hasTopic
            ? [{
              text: "는",
              sourceTokens: modal.source.tokens.slice(1, -1),
              kind: "modal" as const,
              projectionConfidence: "semantic" as const
            }]
            : []),
          {
            text: " ",
            sourceTokens: [],
            kind: "punctuation",
            projectionConfidence: "semantic"
          }
        ],
        finalSourceTokens: hasTopic
          ? modal.source.tokens.slice(-1)
          : modal.source.tokens.slice(1),
        finalKind: "modal"
      }
    };
  }
  const stemAttr = stemAttributive("future", false);
  return {
    ok: true,
    base: scopeCarrierCopulaBase("hazu", "터", `${stemAttr} `),
    sourceTrace: carrierCopulaSourceTrace(modal, stemAttr, " 터")
  };
}

function nodaModalBase(mb: ModalBaseContext, modal: Extract<ModalOp, { readonly modal: "noda" }>): BaseResult {
  const { stemLemma, stemIrregular, stemKind, preModalNeg, past, formal, inputPolicy, useShortFor, stemAttributive } = mb;
  const stemAttr = stemAttributive("present", useShortFor(true));
  const noun = nodaCarrierNoun(formal);
  const nodaModal = modal;
  const carrierStyle = nodaCarrierStyle(nodaModal);
  if (nodaCarrierHasSupportConjecture(nodaModal)) {
    return {
      ok: true,
      base: {
        prefix: "",
        final: {
          kind: "lemma",
          lemma: `${stemAttr} 것이겠다`,
          irregular: null,
          isVerb: false,
          idiom: {
            kind: "conjecture",
            conjecturePolite: modal.polite,
            projection: "nominalized",
            sourceLemma: stemLemma,
            sourceIrregular: stemIrregular
          }
        },
        policy: { kind: "scope_carrier", carrier: "noda", nounSurface: "것", style: "emphasis" }
      },
      chainOnFinalSupported: false,
      sourceTrace: modalSourceTrace(modal, stemAttr, "")
    };
  }
  const connectiveBaseOverride: { readonly connectiveBaseOverride: ConnectiveBaseOverride } | {} =
    preModalNeg === null && shouldFlattenNodaConnectiveToHost(inputPolicy, stemLemma)
      ? {
        connectiveBaseOverride: {
          base: {
            prefix: "",
            final: { kind: "lemma" as const, lemma: stemLemma, irregular: stemIrregular, isVerb: stemKind === "verb" },
            policy: inputPolicy
          },
          past,
          adversativeSurface: "のに"
        }
      }
      : {};
  const carrierOptions =
    carrierStyle === undefined
      ? {}
      : {
        style: carrierStyle,
        connectiveSourcePoliteness: "preserve_when_supported" as const
      };
  return {
    ok: true,
    base: scopeCarrierCopulaBase(
      "noda",
      noun,
      `${stemAttr} `,
      carrierOptions
    ),
    sourceTrace: carrierCopulaSourceTrace(modal, stemAttr, ` ${noun}`),
    ...connectiveBaseOverride
  };
}

function youdaModalBase(mb: ModalBaseContext, modal: Extract<ModalOp, { readonly modal: "youda" }>): BaseResult {
  const { stemLemma, stemIrregular, stemKind, preModalNeg, past, preferShortLikenessNegation, useShortFor, stemAttributive } = mb;
  const stemAttr = stemAttributive("present", useShortFor(preferShortLikenessNegation));
  const kaNoYouFlattenPolicy =
    modal.form === "youda" && modal.source.tokens.some((token, index) =>
      kaMarkerRelationForToken(token, index, ["tail_render"], {
        acceptedParticleSubtypes: ["副助詞", "終助詞", "係助詞"]
      }) !== null
    )
      ? { nodaConnectiveFlatten: "ka_no_you" as const }
      : {};
  const attributiveLexicalization = likenessAttributiveLexicalizationBase(modal, stemAttr);
  return {
    ok: true,
    base: {
      prefix: `${stemAttr} 것 `,
      final: { kind: "lemma", lemma: "같다", irregular: null, isVerb: false },
      policy: {
        kind: "likeness",
        ...kaNoYouFlattenPolicy,
        ...(attributiveLexicalization === undefined ? {} : { attributiveLexicalization }),
        ...(modal.form === "youda" && preModalNeg === null && !past && stemKind === "verb"
          ? {
            potentialObjectAttributive: {
              stemLemma,
              stemIrregular,
              stemKind
            }
          }
          : {})
      }
    },
    sourceTrace: modalSourceTrace(modal, stemAttr, " 것 ")
  };
}

function rashiiModalBase(mb: ModalBaseContext, modal: Extract<ModalOp, { readonly modal: "rashii" }>): BaseResult {
  const { preferShortLikenessNegation, useShortFor, stemAttributive } = mb;
  const stemAttr = stemAttributive("present", useShortFor(preferShortLikenessNegation));
  return {
    ok: true,
    base: {
      prefix: `${stemAttr} 것 `,
      final: { kind: "lemma", lemma: "같다", irregular: null, isVerb: false },
      policy: { kind: "likeness" }
    },
    sourceTrace: modalSourceTrace(modal, stemAttr, " 것 ")
  };
}

function tokoroModalBase(mb: ModalBaseContext, modal: Extract<ModalOp, { readonly modal: "tokoro" }>): BaseResult {
  const { stemLemma, stemIrregular, preModalNeg, past, stemAttributive } = mb;
  const tokoroCarrierOptions = carrierConnectiveSourcePolitenessOptions(modal.source);
  if (modal.reading === "place") {
    const stemAttr = stemAttributive("present", false);
    return {
      ok: true,
      base: scopeCarrierCopulaBase("tokoro", modal.nominalNoun ?? "곳", `${stemAttr} `, tokoroCarrierOptions),
      sourceTrace: carrierCopulaSourceTrace(modal, stemAttr, ` ${modal.nominalNoun ?? "곳"}`)
    };
  }
  if (modal.reading === "intention") {
    const stemAttr = stemAttributive("present", false);
    return {
      ok: true,
      base: scopeCarrierCopulaBase("tokoro", modal.nominalNoun ?? "바", `${stemAttr} `, tokoroCarrierOptions),
      sourceTrace: carrierCopulaSourceTrace(modal, stemAttr, ` ${modal.nominalNoun ?? "바"}`)
    };
  }
  if (modal.reading !== "temporal") {
    return { ok: false, reason: `tokoro reading '${modal.reading}' 영역 외` };
  }
  if (modal.variant === "almost") {
    const stemAttr = stemAttributive("future", false);
    return {
      ok: true,
      base: {
        prefix: `${stemAttr} `,
        final: { kind: "lemma", lemma: "뻔하다", irregular: "여", isVerb: false }
      }
    };
  }
  if (modal.variant === "progress_observation") {
    const stemAttr = stemAttributive("present", false);
    return {
      ok: true,
      base: scopeCarrierCopulaBase("tokoro", "중", `${stemAttr} `, tokoroCarrierOptions),
      sourceTrace: carrierCopulaSourceTrace(modal, stemAttr, " 중")
    };
  }
  if (modal.variant === "about_to") {
    const stemRyeogo = conjugate(stemLemma, stemIrregular, "(으)려는");
    return {
      ok: true,
      base: scopeCarrierCopulaBase("tokoro", "참", `${stemRyeogo} `, tokoroCarrierOptions),
      sourceTrace: carrierCopulaSourceTrace(modal, stemRyeogo, " 참")
    };
  }
  if (past && preModalNeg === null) {
    const stemJustNow = conjugate(stemLemma, stemIrregular, "ㄴ/은");
    return {
      ok: true,
      base: scopeCarrierCopulaBase("tokoro", "참", `막 ${stemJustNow} `, tokoroCarrierOptions),
      sourceTrace: carrierCopulaSourceTrace(modal, `막 ${stemJustNow}`, " 참")
    };
  }
  const stemAttr = stemAttributive("future", false);
  return {
    ok: true,
    base: scopeCarrierCopulaBase("tokoro", "참", `${stemAttr} `, tokoroCarrierOptions),
    sourceTrace: carrierCopulaSourceTrace(modal, stemAttr, " 참")
  };
}

function maiModalBase(mb: ModalBaseContext, modal: Extract<ModalOp, { readonly modal: "mai" }>): BaseResult {
  const { opts, stemLemma, stemIrregular, stemKind, preModalNeg, past, pastProjection, inputPolicy, sourceStemIsVerb, lookups, sahenShortNegationSplit } = mb;
  const sourceVerbalHost = stemKind === "verb" || sourceStemIsVerb === true;
  const alreadyNegativeScopeHost = inputPolicy?.kind === "scope_carrier" &&
    (stemLemma === "아니다" || stemLemma === "없다" || stemLemma === "않다");
  if (!sourceVerbalHost && !alreadyNegativeScopeHost) {
    return { ok: false, reason: "mai on non-verb 영역 외" };
  }
  if (past || preModalNeg !== null) {
    return { ok: false, reason: "mai with pre-modal tense/negation 영역 외" };
  }
  const [negativePrefix, negativeLemma, negativeIrregular] = alreadyNegativeScopeHost
    ? ["", stemLemma, stemIrregular] as const
    : stemKind === "adj" && sourceStemIsVerb === true
      ? ["", `${conjugate(stemLemma, stemIrregular, "지")} 않다`, null] as const
      : shortNegationPrefix(stemLemma, stemIrregular, opts.lookups, { sahenSplit: sahenShortNegationSplit });
  const stemAttr = modalInputStemAttributive({
    stemLemma: negativeLemma,
    stemIrregular: negativeIrregular,
    stemKind: sourceVerbalHost && stemKind === "verb" ? "verb" : "adj",
    past: false,
    preModalNeg: null,
    attrPolicy: "future",
    useShortHint: false,
    pastProjection,
    lookups,
    sahenShortNegationSplit,
    ...(inputPolicy === undefined ? {} : { inputPolicy })
  });
  return {
    ok: true,
    base: scopeCarrierCopulaBase("mai", "거", `${negativePrefix}${stemAttr} `),
    sourceTrace: carrierCopulaSourceTrace(modal, `${negativePrefix}${stemAttr}`, " 거")
  };
}

function soudaHearsayModalBase(mb: ModalBaseContext, modal: Extract<ModalOp, { readonly modal: "souda_hearsay" }>): BaseResult {
  const { opts, stemLemma, stemIrregular, stemKind, preModalNeg, past, pastProjection, inputPolicy, sourceStemIsVerb, lookups, sahenShortNegationSplit } = mb;
  if (modal.reading === "yotai") {
    return soudaYotaiBaseFromStem({
      modal,
      stemLemma,
      stemIrregular,
      stemKind,
      preModalNeg,
      past,
      pastProjection,
      lookups,
      sahenShortNegationSplit,
      ...(sourceStemIsVerb === undefined ? {} : { sourceStemIsVerb }),
      ...(inputPolicy === undefined ? {} : { inputPolicy })
    });
  }
  return soudaHearsayBaseFromPredicateBase(
    simpleStemBase(stemLemma, stemIrregular, stemKind === "verb"),
    preModalNeg,
    past,
    opts.lookups,
    modal
  );
}

function monoModalBase(mb: ModalBaseContext, modal: Extract<ModalOp, { readonly modal: "mono" }>): BaseResult {
  const { formal, stemAttributive } = mb;
  if (modal.reading === "admirative" || modal.reading === "habitual") {
    return { ok: false, reason: "mono admirative/habitual requires the composed predicate base" };
  }
  const stemAttr = stemAttributive("present", false);
  const noun = nodaCarrierNoun(formal);
  return {
    ok: true,
    base: scopeCarrierCopulaBase("mono", noun, `${stemAttr} `),
    sourceTrace: carrierCopulaSourceTrace(modal, stemAttr, ` ${noun}`)
  };
}

export function maiScopeCarrierBase(
  modal: Extract<ModalOp, { readonly modal: "mai" }>,
  inputBase: KoreanLemmaPredicateBase
): BaseResult | null {
  const policy = inputBase.policy;
  if (
    policy?.kind !== "scope_carrier" ||
    policy.carrier !== "wake" ||
    policy.style !== "emphasis" ||
    policy.hostPrefix === undefined
  ) {
    return null;
  }
  const negativeAttr = conjugate("아니다", "아니", "ㄹ/을");
  return {
    ok: true,
    base: scopeCarrierCopulaBase("mai", "거", `${policy.hostPrefix}것은 ${negativeAttr} `)
  };
}

function carrierCopulaHasExplicitSupport(source: ModalOp["source"]): boolean {
  const de = source.tokens[1];
  return copulaDeMarkerRelationForToken(de, 1, { consumers: ["tail_render"] }) !== null &&
    ((de!.pos & POS4) === 助動詞_ダ) &&
    isAffirmativeCopulaSupportVerbToken(source.tokens[2]);
}

function carrierConnectiveSourcePolitenessOptions(
  source: ModalOp["source"]
): { readonly connectiveSourcePoliteness: "preserve_when_supported" } | Record<string, never> {
  return carrierCopulaHasExplicitSupport(source)
    ? { connectiveSourcePoliteness: "preserve_when_supported" as const }
    : {};
}

function nodaCarrierStyle(modal: NodaModalOp): ScopeCarrierStyle | undefined {
  const de = modal.source.tokens[1];
  if (((de?.pos ?? 0) & POS4) === 助動詞_ジャ) {
    return "assertive_jya";
  }
  return carrierCopulaHasExplicitSupport(modal.source) ? "emphasis" : undefined;
}

function nodaCarrierHasSupportConjecture(modal: NodaModalOp): boolean {
  if (!carrierCopulaHasExplicitSupport(modal.source)) {
    return false;
  }
  const support = modal.source.tokens[2]!;
  const politeConjecture = modal.source.tokens[3];
  return (support.pos & POS5A) === 意志推量形_ ||
    (politeConjecture !== undefined &&
      (politeConjecture.pos & (POS4 | POS5A)) === (助動詞_マス | 意志推量形_));
}

export function tokoroBaseFromPredicateBase(opts: {
  readonly modal: TokoroModalOp;
  readonly base: KoreanPredicateBase;
  readonly preModalNeg: NegationOp | null;
  readonly past: boolean;
  readonly formal: boolean;
  readonly pastProjection: AttributivePastProjection;
}): BaseResult | null {
  const { modal, base, preModalNeg, past, formal, pastProjection } = opts;
  if (preModalNeg !== null) {
    return null;
  }
  const tokoroCarrierOptions = carrierConnectiveSourcePolitenessOptions(modal.source);
  const inputProjection = (attr: string): string =>
    attr.startsWith(base.prefix) ? attr.slice(base.prefix.length) : attr;
  if (modal.reading === "place") {
    const attr = projectBaseAttributive(base, past, formal, pastProjection);
    if (attr === null) {
      return { ok: false, reason: "tokoro place host projection 영역 외" };
    }
    return {
      ok: true,
      base: scopeCarrierCopulaBase("tokoro", modal.nominalNoun ?? "곳", `${attr} `, tokoroCarrierOptions),
      sourceTrace: carrierCopulaSourceTrace(modal, inputProjection(attr), ` ${modal.nominalNoun ?? "곳"}`)
    };
  }
  if (modal.reading === "intention") {
    const attr = projectBaseAttributive(base, past, formal, pastProjection);
    if (attr === null) {
      return { ok: false, reason: "tokoro intention host projection 영역 외" };
    }
    return {
      ok: true,
      base: scopeCarrierCopulaBase("tokoro", modal.nominalNoun ?? "바", `${attr} `, tokoroCarrierOptions),
      sourceTrace: carrierCopulaSourceTrace(modal, inputProjection(attr), ` ${modal.nominalNoun ?? "바"}`)
    };
  }
  if (modal.reading === "temporal" && modal.variant === "progress_observation") {
    const attr = projectBaseAttributive(base, past, formal, pastProjection);
    if (attr === null) {
      return { ok: false, reason: "tokoro progress host projection 영역 외" };
    }
    return {
      ok: true,
      base: scopeCarrierCopulaBase("tokoro", "중", `${attr} `, tokoroCarrierOptions),
      sourceTrace: carrierCopulaSourceTrace(modal, inputProjection(attr), " 중")
    };
  }
  return null;
}

export function monoHostPredicateBase(
  modal: Extract<ModalOp, { readonly modal: "mono" }>,
  inputBase: KoreanLemmaPredicateBase,
  preNeg: NegationOp | null
): BaseResult {
  const host = preNeg === null ? inputBase : applyNegationChainToLemmaBase(inputBase, preNeg);
  if (host === null || host.final.kind !== "lemma") {
    return { ok: false, reason: "mono host predicate base lowering 영역 외" };
  }
  if (modal.reading === "admirative") {
    return { ok: true, base: host, terminalRealization: { kind: "exclamative" } };
  }
  if (modal.reading === "habitual") {
    return {
      ok: true,
      base: {
        prefix: `${host.prefix}${conjugate(host.final.lemma, host.final.irregular, "곤")} `,
        final: { kind: "lemma", lemma: "하다", irregular: "여", isVerb: true }
      }
    };
  }
  return { ok: false, reason: "mono nominal reading uses the bound-noun carrier base" };
}
