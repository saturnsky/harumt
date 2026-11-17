import { conjugate, type IrregularType } from "../../../../../generator/conjugator.js";
import { type RuntimeHaruToken } from "../../../../../types/token.js";
import { type LookupTables } from "../../../../lookup-tables.js";
import { normalizeGiveRequest } from "../../../../rendering/request-normalization.js";
import { assertNever, type ConnectiveOp, type DesiderativeAspectOp, type MiseruAspectOp, type NegationOp, type PredicateQuoteCarrierOp, type ProhibitionAspectOp, type ProhibitionPayload, type RequestAspectOp } from "../grammar.js";
import { closeChainTraceAgainstText, isFutureAttributiveProjection, concatPredicatePrefix, ensureQuestionPunctuation, lemmaPredicateBase, tracedFuse, tracedSeg, type AttributiveProjectionPolicy, type BaseResult, type KoreanPredicateBase, type RenderOutcome, type RenderSuccess, type TailTraceSegment } from "./base-model.js";
import { predicateBaseInfinitiveForm, prohibitionPredicateBase, simpleStemBase } from "./base-support.js";
import { composeBaseWithBareProhibition, composeBaseWithRequestAttributiveQuote, composeBaseWithRequestComplement, composeCommittedTailTerminalDepth, composeRequestProhibitionAttributiveQuote, composeRequestProhibitionComplement, projectBaseAttributive } from "./connective-compose.js";
import { composeFinalForm } from "./final-forms.js";
import { desiderativeBaseResultForStem } from "./predicate-bases.js";

export function renderRequest(opts: {
  readonly stemLemma: string;
  readonly stemIrregular: IrregularType | null;
  readonly isVerb: boolean;
  readonly request: RequestAspectOp;
  readonly preModalNeg: NegationOp | null;
  readonly past: boolean;
  readonly formal: boolean;
  readonly isPolite: boolean;
  readonly stemSourceTokens?: readonly RuntimeHaruToken[];
}): RenderOutcome {
  const { stemLemma, stemIrregular, isVerb, request, preModalNeg, past, formal, isPolite } = opts;
  void isPolite;

  if (!isVerb) {
    return { ok: false, reason: "request on adjective stem not supported" };
  }
  if (preModalNeg !== null) {
    if (preModalNeg.chainDepth !== 1 || preModalNeg.chainPast) {
      return { ok: false, reason: "V neg + request 합성 영역 외" };
    }
    const prohibitionBase = prohibitionPredicateBase(simpleStemBase(stemLemma, stemIrregular, true));
    const prohibitionRequest = normalizeGiveRequest(
      conjugate(prohibitionBase.final.lemma, prohibitionBase.final.irregular, "아/어"),
      prohibitionBase.final.lemma,
      requestTerminalTail(request, formal)
    );
    return {
      ok: true,
      text: `${prohibitionBase.prefix}${prohibitionRequest}`,
      polite: request.aspect === "te_kudasai"
    };
  }
  if (past) {
    return { ok: false, reason: "past + request 합성 영역 외" };
  }

  const stemAe = conjugate(stemLemma, stemIrregular, "아/어");
  const requestTail = requestTerminalTail(request, formal);
  const text = normalizeGiveRequest(stemAe, stemLemma, requestTail);
  const outcome: RenderSuccess = { ok: true, text, polite: request.aspect === "te_kudasai" };
  if (opts.stemSourceTokens === undefined) {
    return outcome;
  }
  const sourceTokens = request.source.tokens;
  const teTokens = sourceTokens.length > 1 ? sourceTokens.slice(0, 1) : [];
  const requestTokens = sourceTokens.length > 1 ? sourceTokens.slice(1) : sourceTokens;
  return {
    ...outcome,
    traced: tracedFuse(
      tracedSeg(stemAe, [...opts.stemSourceTokens, ...teTokens], "lexeme", "semantic"),
      tracedSeg(` ${requestTail}`, requestTokens, "aux", "semantic"),
      text
    )
  };
}

export function renderRequestOnPredicateBase(
  baseResult: BaseResult,
  request: RequestAspectOp,
  lookups: LookupTables,
  options: {
    readonly directAuxiliaryImperative?: boolean;
    readonly formal?: boolean;
  } = {}
): RenderOutcome {
  if (!baseResult.ok) {
    return baseResult;
  }
  const base = baseResult.base;
  if (base.final.kind !== "lemma") {
    return { ok: false, reason: "request on non-lemma/non-verb predicate base not supported" };
  }
  if (!base.final.isVerb) {
    const stemAe = predicateBaseInfinitiveForm({ ...base, final: base.final });
    const requestTail = requestTerminalTail(request, options.formal === true);
    return {
      ok: true,
      text: concatPredicatePrefix(
        base.prefix,
        normalizeGiveRequest(stemAe, base.final.lemma, requestTail)
      ),
      polite: request.aspect === "te_kudasai"
    };
  }
  if (
    request.aspect === "te_kudasai" &&
    options.directAuxiliaryImperative === true
  ) {
    return {
      ok: true,
      text: concatPredicatePrefix(
        base.prefix,
        conjugate(base.final.lemma, base.final.irregular, options.formal === true ? "(으)십시오" : "(으)세요")
      ),
      polite: true
    };
  }
  const stemAe = conjugate(base.final.lemma, base.final.irregular, "아/어");
  if (request.aspect === "te_kudasai") {
    return {
      ok: true,
      text: concatPredicatePrefix(
        base.prefix,
        normalizeGiveRequest(stemAe, base.final.lemma, requestTerminalTail(request, options.formal === true))
      ),
      polite: true
    };
  }
  return {
    ok: true,
    text: concatPredicatePrefix(
      base.prefix,
      normalizeGiveRequest(stemAe, base.final.lemma, requestTerminalTail(request, options.formal === true))
    ),
    polite: false
  };
}

export type RequestPredicateFinalRole =
  | "request_auxiliary"
  | "lexical_benefactive_fold"
  | "direct_honorific_imperative";

export interface RequestPredicateBase {
  readonly result: BaseResult;
  readonly finalRole: RequestPredicateFinalRole | null;
}

export function buildRequestPredicateBaseResult(
  baseResult: BaseResult,
  request: RequestAspectOp,
  options: {
    readonly directAuxiliaryImperative?: boolean;
    readonly lookups: LookupTables;
  }
): BaseResult {
  return buildRequestPredicateBase(baseResult, request, options).result;
}


export function buildRequestPredicateBase(
  baseResult: BaseResult,
  request: RequestAspectOp,
  options: {
    readonly directAuxiliaryImperative?: boolean;
    readonly lookups: LookupTables;
  }
): RequestPredicateBase {
  if (!baseResult.ok) return { result: baseResult, finalRole: null };
  const base = lemmaPredicateBase(baseResult.base);
  if (base === null) {
    return {
      result: { ok: false, reason: "request carrier requires a lemma predicate base" },
      finalRole: null
    };
  }

  if (!base.final.isVerb) {
    return {
      result: {
        ok: true,
        base: {
          prefix: concatPredicatePrefix(
            base.prefix,
            `${composeFinalForm(
              base.final.lemma,
              base.final.irregular,
              false,
              false,
              false,
              false,
              options.lookups
            )} `
          ),
          final: {
            kind: "lemma",
            lemma: request.aspect === "te_kudasai" ? "주시다" : "주다",
            irregular: null,
            isVerb: true
          }
        },
        chainOnFinalSupported: true,
        interOpPastProjection: "committed"
      },
      finalRole: "request_auxiliary"
    };
  }

  if (request.aspect === "te_kudasai" && options.directAuxiliaryImperative === true) {
    return {
      result: {
        ok: true,
        base: {
          prefix: base.prefix,
          final: {
            kind: "lemma",
            lemma: `${conjugate(base.final.lemma, base.final.irregular, "(으)시")}다`,
            irregular: null,
            isVerb: true
          }
        },
        chainOnFinalSupported: true,
        interOpPastProjection: "committed"
      },
      finalRole: "direct_honorific_imperative"
    };
  }

  if (base.final.lemma.endsWith("주다")) {
    return {
      result: {
        ok: true,
        base: {
          prefix: base.prefix,
          final: {
            kind: "lemma",
            lemma: request.aspect === "te_kudasai"
              ? `${base.final.lemma.slice(0, -2)}주시다`
              : base.final.lemma,
            irregular: request.aspect === "te_kudasai" ? null : base.final.irregular,
            isVerb: true
          }
        },
        chainOnFinalSupported: true,
        interOpPastProjection: "committed"
      },
      finalRole: "lexical_benefactive_fold"
    };
  }

  return {
    result: {
      ok: true,
      base: {
        prefix: concatPredicatePrefix(
          base.prefix,
          `${conjugate(base.final.lemma, base.final.irregular, "아/어")} `
        ),
        final: {
          kind: "lemma",
          lemma: request.aspect === "te_kudasai" ? "주시다" : "주다",
          irregular: null,
          isVerb: true
        }
      },
      chainOnFinalSupported: true,
      interOpPastProjection: "committed"
    },
    finalRole: "request_auxiliary"
  };
}

export function buildRequestQuotedPropositionBase(
  base: KoreanPredicateBase,
  mode: "request" | "prohibition",
  options: {
    readonly requestForm?: boolean;
    readonly terminalClosure?: "reported_request";
  } = {}
): BaseResult {
  const prohibitionOptions = options.requestForm === undefined
    ? {}
    : { requestForm: options.requestForm };
  const terminal = mode === "request"
    ? composeBaseWithRequestComplement(base, false, null, {})
    : composeRequestProhibitionComplement(base, "と", prohibitionOptions);
  if (!terminal.ok) {
    return { ok: false, reason: terminal.reason };
  }
  const attributive = mode === "request"
    ? composeBaseWithRequestAttributiveQuote(base, false, null, {})
    : composeRequestProhibitionAttributiveQuote(base, prohibitionOptions);
  if (!attributive.ok) {
    return { ok: false, reason: attributive.reason };
  }
  return {
    ok: true,
    base: {
      prefix: `${terminal.text} `,
      final: { kind: "lemma", lemma: "하다", irregular: "여", isVerb: true },
      policy: { kind: "quoted_proposition", attributive: attributive.text }
    },
    chainOnFinalSupported: true,
    interOpPastProjection: "committed",
    ...(mode === "request" && options.terminalClosure === "reported_request"
      ? {
        terminalRealization: {
          kind: "reported_request" as const,
          requestBase: base
        }
      }
      : {})
  };
}

export function reprojectCommandQuoteAttributiveForHeadPolicy(
  fused: RenderOutcome,
  base: KoreanPredicateBase,
  mode: "request" | "prohibition",
  attrPolicy: AttributiveProjectionPolicy,
  formal: boolean,
  options: { readonly requestForm?: boolean } = {}
): RenderOutcome | null {
  if (!isFutureAttributiveProjection(attrPolicy)) {
    return null;
  }
  if (!fused.ok) {
    return fused;
  }
  const quoted = buildRequestQuotedPropositionBase(base, mode, options);
  if (!quoted.ok) {
    return quoted;
  }
  const text = projectBaseAttributive(quoted.base, false, formal, "lexical", "default", attrPolicy);
  if (text === null) {
    return { ok: false, reason: "command quote attributive future projection failed" };
  }
  const traced = reprojectFusedQuoteTrace(fused.traced, text);
  return { ok: true, text, polite: false, ...(traced === null ? {} : { traced }) };
}

function reprojectFusedQuoteTrace(
  fusedTraced: readonly TailTraceSegment[] | undefined,
  text: string
): readonly TailTraceSegment[] | null {
  const carrier = fusedTraced?.at(-1);
  if (fusedTraced === undefined || carrier === undefined) {
    return null;
  }
  return closeChainTraceAgainstText(
    {
      prefixSegments: fusedTraced.slice(0, -1),
      finalSourceTokens: carrier.sourceTokens,
      finalKind: carrier.kind
    },
    text
  );
}

export function renderRequestAttributiveQuoteOnPredicateBase(
  baseResult: BaseResult,
  request: RequestAspectOp,
  carrier: PredicateQuoteCarrierOp,
  options: {
    readonly past?: boolean;
    readonly commandSourceTokens: readonly RuntimeHaruToken[];
  }
): RenderOutcome {
  if (!baseResult.ok) return baseResult;
  const rendered = composeBaseWithRequestAttributiveQuote(
    baseResult.base,
    options.past === true,
    null,
    {
      ...(baseResult.chainSourceTrace === undefined
        ? {}
        : {
          trace: {
            chainSourceTrace: baseResult.chainSourceTrace,
            commandTokens: options.commandSourceTokens,
            requestTokens: request.source.tokens,
            carrierTokens: carrier.source.tokens
          }
        })
    }
  );
  return rendered;
}

export function renderRequestQuestionOnPredicateBase(
  baseResult: BaseResult,
  request: RequestAspectOp,
  lookups: LookupTables,
  options: {
    readonly directAuxiliaryImperative?: boolean;
    readonly formal?: boolean;
  } = {}
): RenderOutcome {
  const rendered = renderRequestOnPredicateBase(baseResult, request, lookups, options);
  return rendered.ok
    ? { ...rendered, text: ensureQuestionPunctuation(rendered.text) }
    : rendered;
}

export function renderPoliteRequestOnPredicateBase(
  baseResult: BaseResult,
  formal: boolean
): RenderOutcome {
  if (!baseResult.ok) return baseResult;
  const base = baseResult.base;
  if (base.final.kind !== "lemma") {
    return { ok: false, reason: "polite request on non-lemma predicate base not supported" };
  }
  const stemAe = conjugate(base.final.lemma, base.final.irregular, "아/어");
  return {
    ok: true,
    text: concatPredicatePrefix(
      base.prefix,
      normalizeGiveRequest(stemAe, base.final.lemma, formal ? "주십시오" : "주세요")
    ),
    polite: true
  };
}

function requestTerminalTail(request: RequestAspectOp, formal: boolean): string {
  if (request.aspect === "te_kudasai") {
    return formal ? "주십시오" : "주세요";
  }
  return formal ? "다오" : "줘";
}

export function renderRequestComplementFromStem(opts: {
  readonly stemLemma: string;
  readonly stemIrregular: IrregularType | null;
  readonly isVerb: boolean;
  readonly preNeg: NegationOp | null;
  readonly past: boolean;
  readonly connective?: ConnectiveOp;
}): RenderOutcome {
  const { stemLemma, stemIrregular, isVerb, preNeg, past } = opts;
  if (!isVerb) {
    return { ok: false, reason: "request complement on adjective stem not supported" };
  }
  return composeBaseWithRequestComplement(
    simpleStemBase(stemLemma, stemIrregular, true),
    past,
    preNeg,
    {},
    opts.connective
  );
}

export function renderRequestAttributiveQuoteFromStem(opts: {
  readonly stemLemma: string;
  readonly stemIrregular: IrregularType | null;
  readonly isVerb: boolean;
  readonly preNeg: NegationOp | null;
  readonly past: boolean;
  readonly stemSourceTokens?: readonly RuntimeHaruToken[];
  readonly requestSourceTokens?: readonly RuntimeHaruToken[];
  readonly carrierSourceTokens?: readonly RuntimeHaruToken[];
  readonly stemKoreanPrefix?: string;
}): RenderOutcome {
  const { stemLemma, stemIrregular, isVerb, preNeg, past } = opts;
  if (!isVerb) {
    return { ok: false, reason: "request attributive quote on adjective stem not supported" };
  }
  const stemPrefix = opts.stemKoreanPrefix ?? "";
  const simpleBase = simpleStemBase(stemLemma, stemIrregular, true);
  const rendered = composeBaseWithRequestAttributiveQuote(
    stemPrefix.length === 0 ? simpleBase : { ...simpleBase, prefix: stemPrefix },
    past,
    preNeg,
    {
      ...(preNeg !== null ||
        opts.stemSourceTokens === undefined ||
        opts.requestSourceTokens === undefined ||
        opts.carrierSourceTokens === undefined
        ? {}
        : {
          trace: {
            stemTokens: opts.stemSourceTokens,
            requestTokens: opts.requestSourceTokens,
            carrierTokens: opts.carrierSourceTokens
          }
        })
    }
  );
  return rendered.ok && stemPrefix.length > 0
    ? { ...rendered, stemPrefixApplied: true }
    : rendered;
}

export function prohibitionUsesRequestForm(prohibition: ProhibitionPayload | undefined): boolean {
  return prohibition === undefined || prohibition.requestTail !== "bare";
}

export function prohibitionTerminalTail(
  prohibition: ProhibitionPayload,
  formal = false
): { readonly text: string; readonly polite: boolean } {
  switch (prohibition.requestTail) {
    case "kudasai":
      return { text: formal ? "마십시오" : "마세요", polite: true };
    case "kure":
      return { text: formal ? "말아 다오" : "말아 줘", polite: false };
    case "bare":
      return { text: formal ? "마라" : "마", polite: false };
    default:
      assertNever(prohibition.requestTail);
  }
}

export function renderProhibition(opts: {
  readonly stemLemma: string;
  readonly stemIrregular: IrregularType | null;
  readonly isVerb: boolean;
  readonly prohibition: ProhibitionAspectOp;
  readonly preModalNeg: NegationOp | null;
  readonly past: boolean;
  readonly formal: boolean;
  readonly isPolite: boolean;
  readonly stemSourceTokens?: readonly RuntimeHaruToken[];
}): RenderOutcome {
  const { stemLemma, stemIrregular, isVerb, prohibition, preModalNeg, past, formal, isPolite } = opts;
  void isPolite;

  if (!isVerb) {
    return { ok: false, reason: "prohibition on adjective stem not supported" };
  }
  if (preModalNeg !== null) {
    return { ok: false, reason: "V neg + prohibition 합성 영역 외 (이중 부정)" };
  }
  if (past) {
    return { ok: false, reason: "past + prohibition 합성 영역 외" };
  }

  const stemJi = conjugate(stemLemma, stemIrregular, "지");
  const tail = prohibitionTerminalTail(prohibition.prohibition, formal);
  const text = `${stemJi} ${tail.text}`;
  if (opts.stemSourceTokens === undefined) {
    return { ok: true, text, polite: tail.polite };
  }
  const sourceTokens = prohibition.source.tokens;
  const bare = prohibition.prohibition.requestTail === "bare";
  const suffixTokens = bare ? sourceTokens : sourceTokens.slice(-1);
  const prefixAuxTokens = bare ? sourceTokens : sourceTokens.slice(0, -1);
  return {
    ok: true,
    text,
    polite: tail.polite,
    traced: tracedFuse(
      tracedSeg(stemJi, [...opts.stemSourceTokens, ...prefixAuxTokens], "lexeme", "semantic"),
      tracedSeg(` ${tail.text}`, suffixTokens, "aux", "semantic"),
      text
    )
  };
}

export function renderProhibitionOnPredicateBase(
  baseResult: BaseResult,
  prohibition: ProhibitionAspectOp,
  formal = false
): RenderOutcome {
  if (!baseResult.ok) {
    return baseResult;
  }
  const base = baseResult.base;
  const tail = prohibitionTerminalTail(prohibition.prohibition, formal);
  if (prohibition.prohibition.requestTail === "bare") {
    return composeBaseWithBareProhibition(base);
  }
  if (base.final.kind !== "lemma") {
    return { ok: false, reason: "prohibition on non-lemma predicate base not supported" };
  }
  return {
    ok: true,
    text: concatPredicatePrefix(base.prefix, `${conjugate(base.final.lemma, base.final.irregular, "지")} ${tail.text}`),
    polite: tail.polite
  };
}

export function renderDesiderative(opts: {
  readonly stemLemma: string;
  readonly stemIrregular: IrregularType | null;
  readonly isVerb: boolean;
  readonly desiderative: DesiderativeAspectOp;
  readonly preModalNeg: NegationOp | null;
  readonly postModalNeg: NegationOp | null;
  readonly past: boolean;
  readonly formal: boolean;
  readonly isPolite: boolean;
  readonly lookups: LookupTables;
}): RenderOutcome {
  const { stemLemma, stemIrregular, isVerb, desiderative, preModalNeg, postModalNeg, past, formal, isPolite } = opts;

  if (!isVerb) {
    return { ok: false, reason: "desiderative on adjective stem not supported" };
  }
  void desiderative;
  return composeCommittedTailTerminalDepth(
    desiderativeBaseResultForStem(stemLemma, stemIrregular, preModalNeg),
    postModalNeg?.chainDepth ?? 0,
    past || (postModalNeg?.chainPast ?? false),
    formal,
    isPolite,
    opts.lookups
  );
}

export function renderMiseru(opts: {
  readonly stemLemma: string;
  readonly stemIrregular: IrregularType | null;
  readonly isVerb: boolean;
  readonly miseru: MiseruAspectOp;
  readonly preModalNeg: NegationOp | null;
  readonly past: boolean;
  readonly formal: boolean;
  readonly isPolite: boolean;
  readonly lookups: LookupTables;
}): RenderOutcome {
  const { stemLemma, stemIrregular, isVerb, miseru, preModalNeg, past, formal, isPolite } = opts;

  if (!isVerb) {
    return { ok: false, reason: "miseru on adjective stem not supported" };
  }
  if (preModalNeg !== null) {
    return { ok: false, reason: "V neg + miseru 합성 영역 외" };
  }

  if (miseru.semantic?.reading === "volitional_showing") {
    const stemAe = conjugate(stemLemma, stemIrregular, "아/어");
    const auxFinal = past
      ? composeFinalForm("보이다", null, true, true, formal, isPolite, opts.lookups)
      : `${conjugate("보이다", null, "겠")}${formal ? (isPolite ? "습니다" : "다") : (isPolite ? "어요" : "어")}`;
    return { ok: true, text: `${stemAe} ${auxFinal}`, polite: isPolite };
  }

  const stemGo = conjugate(stemLemma, stemIrregular, "고");
  const auxFinal = composeFinalForm("보여주다", null, true, past, formal, isPolite, opts.lookups);
  return { ok: true, text: `${stemGo} ${auxFinal}`, polite: isPolite };
}
