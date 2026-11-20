import { composePlainSelfQuestionTerminal } from "./sfp-question.js";
import { nounCopulaConnective } from "../../../../../generator/aux-map.js";
import { conjugate } from "../../../../../generator/conjugator.js";
import type { RuntimeHaruToken } from "../../../../../types/token.js";
import { hasBatchim } from "../../../../../generator/hangul.js";
import { selectParticle, type ParticleKey } from "../../../../../generator/particles.js";
import type { LookupTables } from "../../../../lookup-tables.js";
import { normalizeRequestQuotative, normalizeRequestQuoteNominal, requestQuoteAttributiveRecipe } from "../../../../rendering/request-normalization.js";
import type { ConnectiveOp, NegationOp, QuoteBoundaryFocusParticle, VolitionalAttemptFocusParticle } from "../grammar.js";
import { applyNegationChainToLemmaBase, concatPredicatePrefix, tracedCat, tracedSeg, type BaseResult, type ChainSourceTrace, type KoreanPredicateBase, type NegationLoweringOptions, type NounCopulaPredicateBase, nounCopulaFinalAllomorphHost, type RenderOutcome, type TailTraceSegment, negationLoweringOptionsWithOpFocus } from "./base-model.js";
import { applyExternalNegationDepthToPredicateBase, lowerBaseKeepingFinal, copularLemmaOfBase, negativeNounCopulaChainBase, quotePlainDeclarative } from "./base-support.js";
import { renderPredicateBaseVolitionalCohortativeAttributive, renderPredicateBaseVolitionalDeliberativeRetrospective, renderPredicateBaseVolitionalIntentAttributive, renderPredicateBaseVolitionalPurposeConnective, renderPredicateBaseVolitionalQuotative } from "./final-forms.js";
import { plainDeclarativeToPointAttributive, projectBaseNominalized } from "./predicate-base-projection.js";
import { composeNounCopulaConjectureQuestion } from "./conjecture-compose.js";
import { composeBaseWithTerminalChain } from "./predicate-terminal-compose.js";

export function copularQuoteOption(base: KoreanPredicateBase): { readonly copularLemma?: string } {
  const lemma = copularLemmaOfBase(base);
  return lemma === undefined ? {} : { copularLemma: lemma };
}

export function composeCommittedVolitionalRetrospectiveQuotative(
  baseResult: BaseResult,
  connective: ConnectiveOp,
  past: boolean,
  isPolite: boolean,
  finalNeg: NegationOp | null,
  _formal: boolean,
  _lookups: LookupTables
): RenderOutcome {
  if (!baseResult.ok) {
    return { ok: false, reason: baseResult.reason };
  }
  if (connective.connective !== "retrospective_quotative") {
    return { ok: false, reason: "volitional retrospective lowering requires retrospective quotative" };
  }
  if (connective.retrospectiveQuotativeFlavor !== "direct_thought") {
    return { ok: false, reason: "volitional retrospective lowering requires direct-thought flavor" };
  }
  if (past || isPolite || finalNeg !== null) {
    return { ok: false, reason: "volitional retrospective lowering requires an unwrapped stem" };
  }
  const purpose = renderPredicateBaseVolitionalPurposeConnective(baseResult.base);
  return purpose.ok
    ? { ...purpose, text: `${purpose.text} 생각했더니` }
    : purpose;
}

export function composeCommittedVolitionalDeliberativeRetrospectiveQuotative(
  baseResult: BaseResult,
  connective: ConnectiveOp,
  past: boolean,
  isPolite: boolean,
  finalNeg: NegationOp | null,
  _formal: boolean,
  _lookups: LookupTables
): RenderOutcome {
  if (!baseResult.ok) {
    return { ok: false, reason: baseResult.reason };
  }
  if (connective.connective !== "retrospective_quotative") {
    return { ok: false, reason: "volitional deliberative lowering requires retrospective quotative" };
  }
  if (connective.retrospectiveQuotativeFlavor !== "volitional_deliberative") {
    return { ok: false, reason: "volitional deliberative lowering requires deliberative flavor" };
  }
  if (past || isPolite || finalNeg !== null) {
    return { ok: false, reason: "volitional deliberative lowering requires an unwrapped stem" };
  }
  return renderPredicateBaseVolitionalDeliberativeRetrospective(baseResult.base);
}

export function composeCommittedVolitionalWishComplement(
  baseResult: BaseResult,
  connective: ConnectiveOp,
  past: boolean,
  isPolite: boolean,
  finalNeg: NegationOp | null,
  _formal: boolean,
  _lookups: LookupTables
): RenderOutcome {
  if (!baseResult.ok) {
    return { ok: false, reason: baseResult.reason };
  }
  if (connective.connective !== "wish_complement") {
    return { ok: false, reason: "volitional wish lowering requires wish complement" };
  }
  if (past || isPolite || finalNeg !== null) {
    return { ok: false, reason: "volitional wish lowering requires an unwrapped stem" };
  }
  return renderPredicateBaseVolitionalPurposeConnective(baseResult.base);
}

export function composeCommittedVolitionalIntentQuoteAttributive(
  baseResult: BaseResult,
  connective: ConnectiveOp,
  past: boolean,
  isPolite: boolean,
  finalNeg: NegationOp | null,
  _formal: boolean,
  _lookups: LookupTables
): RenderOutcome {
  if (!baseResult.ok) {
    return { ok: false, reason: baseResult.reason };
  }
  if (connective.connective !== "predicate_projection_quote_attributive") {
    return { ok: false, reason: "volitional quote-attributive lowering requires quote-attributive projection" };
  }
  if (connective.quoteAttributiveFlavor !== "intentional_modifier") {
    return { ok: false, reason: "volitional intent lowering requires intentional quote-attributive flavor" };
  }
  if (past || isPolite || finalNeg !== null) {
    return { ok: false, reason: "volitional quote-attributive lowering requires an unwrapped stem" };
  }
  return renderPredicateBaseVolitionalIntentAttributive(baseResult.base);
}

export function composeCommittedVolitionalCohortativeQuoteAttributive(
  baseResult: BaseResult,
  connective: ConnectiveOp,
  past: boolean,
  isPolite: boolean,
  finalNeg: NegationOp | null,
  _formal: boolean,
  _lookups: LookupTables
): RenderOutcome {
  if (!baseResult.ok) {
    return { ok: false, reason: baseResult.reason };
  }
  if (connective.connective !== "predicate_projection_quote_attributive") {
    return { ok: false, reason: "volitional cohortative lowering requires quote-attributive projection" };
  }
  if (connective.quoteAttributiveFlavor !== "cohortative_quote") {
    return { ok: false, reason: "volitional cohortative lowering requires cohortative quote-attributive flavor" };
  }
  if (past || isPolite || finalNeg !== null) {
    return { ok: false, reason: "volitional cohortative lowering requires an unwrapped stem" };
  }
  return renderPredicateBaseVolitionalCohortativeAttributive(baseResult.base);
}

export function composeCommittedVolitionalRequestComplement(
  baseResult: BaseResult,
  connective: ConnectiveOp,
  past: boolean,
  isPolite: boolean,
  finalNeg: NegationOp | null,
  _formal: boolean,
  _lookups: LookupTables
): RenderOutcome {
  if (!baseResult.ok) {
    return { ok: false, reason: baseResult.reason };
  }
  if (connective.connective !== "request_complement") {
    return { ok: false, reason: "volitional request lowering requires request complement" };
  }
  if (past || isPolite || finalNeg !== null) {
    return { ok: false, reason: "volitional request lowering requires an unwrapped stem" };
  }
  return renderPredicateBaseVolitionalQuotative(baseResult.base);
}

export function composeCommittedVolitionalReformulationQuestion(
  baseResult: BaseResult,
  connective: ConnectiveOp,
  past: boolean,
  isPolite: boolean,
  finalNeg: NegationOp | null,
  _formal: boolean,
  _lookups: LookupTables
): RenderOutcome {
  if (!baseResult.ok) {
    return { ok: false, reason: baseResult.reason };
  }
  if (
    connective.connective !== "reformulation" ||
    connective.allomorph !== "reformulation_ka"
  ) {
    return {
      ok: false,
      reason: "volitional reformulation question requires reformulation-ka"
    };
  }
  if (past || isPolite || finalNeg !== null) {
    return {
      ok: false,
      reason: "volitional reformulation question requires an unwrapped stem"
    };
  }
  const quoted = renderPredicateBaseVolitionalQuotative(baseResult.base);
  return quoted.ok
    ? { ...quoted, text: `${quoted.text} 할까` }
    : quoted;
}

export function composeBaseWithImperativeQuotative(base: KoreanPredicateBase, complementizer = "고"): RenderOutcome {
  if (base.final.kind !== "lemma") {
    return { ok: false, reason: "imperative quotative requires lemma final" };
  }
  return {
    ok: true,
    text: concatPredicatePrefix(
      base.prefix,
      conjugate(base.final.lemma, base.final.irregular, `(으)라${complementizer}`)
    ),
    polite: false
  };
}

export function composeBaseWithPredicateProjectionQuoteAttributive(
  base: KoreanPredicateBase,
  past: boolean,
  isPolite: boolean,
  preNeg: NegationOp | null,
  formal: boolean,
  lookups: LookupTables,
  options: NegationLoweringOptions
): RenderOutcome {
  const loweredBase = lowerBaseKeepingFinal(base, preNeg, formal, options);
  if (loweredBase === null) {
    return { ok: false, reason: "predicate quote attributive projection chain lowering not supported" };
  }
  const effectivePast = past || (preNeg?.chainPast ?? false);
  if (
    !effectivePast &&
    (loweredBase.final.kind === "nounCopula" || loweredBase.final.kind === "boundNounCopula")
  ) {
    const nounPhrase = `${loweredBase.prefix}${loweredBase.final.nounSurface}`;
    const quoteAttr = hasBatchim(`${loweredBase.prefix}${nounCopulaFinalAllomorphHost(loweredBase.final)}`) ? "이라는" : "라는";
    return { ok: true, text: `${nounPhrase}${quoteAttr}`, polite: isPolite };
  }
  const rendered = composeBaseWithTerminalChain(
    loweredBase,
    null,
    effectivePast,
    true,
    false,
    lookups,
    options
  );
  if (!rendered.ok) {
    return rendered;
  }
  return { ok: true, text: plainDeclarativeToPointAttributive(rendered.text), polite: isPolite };
}

export function connectiveFocusParticleSuffix(surface: string, precedingKorean: string): string {
  if (surface.endsWith("は")) return selectParticle(precedingKorean, "은/는");
  if (surface.endsWith("も")) return selectParticle(precedingKorean, "도");
  return "";
}

function nounCopulaPlainQuoteText(
  base: KoreanPredicateBase,
  past: boolean,
  preNeg: NegationOp | null,
  particle: ParticleKey = "이라고/라고"
): string | null {
  if (
    preNeg !== null ||
    past ||
    (base.final.kind !== "nounCopula" && base.final.kind !== "boundNounCopula")
  ) {
    return null;
  }
  return `${base.prefix}${base.final.nounSurface}${selectParticle(nounCopulaFinalAllomorphHost(base.final), particle)}`;
}

export function composeBaseWithQuotative(
  base: KoreanPredicateBase,
  past: boolean,
  preNeg: NegationOp | null,
  formal: boolean,
  lookups: LookupTables,
  options: NegationLoweringOptions,
  connective?: ConnectiveOp
): RenderOutcome {
  if (connective?.quoteBoundary?.koreanClauseForm === "다는 말을") {
    const clause = projectBaseCognitiveComplementClause(base, past, false, lookups);
    if (clause !== null) {
      return { ok: true, text: `${clause} 말을`, polite: false };
    }
  }
  const nominalQuote = nounCopulaPlainQuoteText(
    base,
    past,
    preNeg,
    connective?.quoteBoundary?.nominalRoleParticle
  );
  if (nominalQuote !== null) {
    return { ok: true, text: nominalQuote, polite: false };
  }
  const quoteFormal =
    base.final.kind === "lemma" && base.final.idiom?.kind === "conjecture"
      ? formal
      : true;
  const rendered = composeBaseWithTerminalChain(
    base,
    preNeg,
    past,
    quoteFormal,
    false,
    lookups,
    options
  );
  if (!rendered.ok) {
    return rendered;
  }
  return { ok: true, text: quotePlainDeclarative(rendered.text, { ...copularQuoteOption(base) }), polite: false };
}

export function applyQuoteBoundaryFocus(
  rendered: RenderOutcome,
  focusParticle: QuoteBoundaryFocusParticle | VolitionalAttemptFocusParticle | undefined
): RenderOutcome {
  if (!rendered.ok || focusParticle === undefined) {
    return rendered;
  }
  const focus = focusParticle === "でも"
    ? selectParticle(rendered.text, "이라도/라도")
    : focusParticle === "さえ" ? "조차" : focusParticle === "も" ? "도" : "는";
  return {
    ...rendered,
    text: `${rendered.text}${focus}`
  };
}

export function applyRequestComplementQuoteFocus(
  rendered: RenderOutcome,
  connectiveOrSurface: ConnectiveOp | string
): RenderOutcome {
  if (typeof connectiveOrSurface === "string") {
    return rendered;
  }
  const boundary = connectiveOrSurface.quoteBoundary;
  if (boundary === undefined) {
    return rendered;
  }
  return boundary.koreanClauseForm === "달라는 말을"
    ? applyNominalQuoteObjectFocus(rendered, boundary.focusParticle)
    : applyQuoteBoundaryFocus(rendered, boundary.focusParticle);
}

export function applyNominalQuoteObjectFocus(
  rendered: RenderOutcome,
  focusParticle: QuoteBoundaryFocusParticle | undefined
): RenderOutcome {
  if (!rendered.ok || focusParticle === undefined || !rendered.text.endsWith("을")) {
    return rendered;
  }
  const head = rendered.text.slice(0, -"을".length);
  const focus = focusParticle === "でも"
    ? selectParticle(head, "이라도/라도")
    : focusParticle === "も" ? "도" : selectParticle(head, "은/는");
  return {
    ...rendered,
    text: `${head}${focus}`
  };
}

export function composeBaseWithCognitiveComplement(
  base: KoreanPredicateBase,
  connective: ConnectiveOp,
  past: boolean,
  preNeg: NegationOp | null,
  formal: boolean,
  lookups: LookupTables,
  options: NegationLoweringOptions
): RenderOutcome {
  const chainDepth = preNeg?.chainDepth ?? 0;
  const effectivePast = past || (preNeg?.chainPast ?? false);
  const loweredBase = chainDepth >= 1
    ? applyExternalNegationDepthToPredicateBase(base, chainDepth, formal, options)
    : base;
  if (loweredBase === null) {
    return { ok: false, reason: "cognitive complement chain lowering not supported" };
  }
  const clause = projectBaseCognitiveComplementClause(loweredBase, effectivePast, formal, lookups);
  if (clause === null) {
    return { ok: false, reason: "cognitive complement projection not supported" };
  }
  return { ok: true, text: `${clause} ${connective.cognitiveComplementParticle === "topic" ? "것은" : "것을"}`, polite: false };
}

function projectBaseCognitiveComplementClause(
  base: KoreanPredicateBase,
  past: boolean,
  formal: boolean,
  lookups: LookupTables
): string | null {
  if (base.final.kind === "negativeNounCopula") {
    const lowered = negativeNounCopulaChainBase(base.final, formal);
    return projectBaseCognitiveComplementClause(
      { prefix: `${base.prefix}${lowered.prefix}`, final: lowered.final },
      past,
      formal, lookups
    );
  }
  if (base.final.kind === "nounCopula" || base.final.kind === "boundNounCopula") {
    const noun = base.final.nounSurface;
    const host = nounCopulaFinalAllomorphHost(base.final);
    if (past) {
      const pastStem = hasBatchim(host) ? `${noun}이었다` : `${noun}였다`;
      return `${base.prefix}${pastStem}는`;
    }
    return `${base.prefix}${noun}${selectParticle(host, "이라는/라는")}`;
  }
  const rendered = composeBaseWithTerminalChain(
    base,
    null,
    past,
    true,
    false,
    lookups
  );
  if (!rendered.ok) {
    return null;
  }
  const text = rendered.text;
  if (text.endsWith("아니다")) {
    return `${text.slice(0, -"아니다".length)}아니라는`;
  }
  if (text.endsWith("이다")) {
    const stem = text.slice(0, -"이다".length);
    return `${stem}${selectParticle(stem, "이라는/라는")}`;
  }
  return `${text}는`;
}

export function composeBaseWithRequestComplement(
  base: KoreanPredicateBase,
  past: boolean,
  preNeg: NegationOp | null,
  options: NegationLoweringOptions,
  connectiveOrSurface: ConnectiveOp | string = "と"
): RenderOutcome {
  return applyRequestComplementQuoteFocus(
    composeBaseWithRequestComplementBody(base, past, preNeg, options, connectiveOrSurface),
    connectiveOrSurface
  );
}

function composeBaseWithRequestComplementBody(
  base: KoreanPredicateBase,
  past: boolean,
  preNeg: NegationOp | null,
  options: NegationLoweringOptions,
  connectiveOrSurface: ConnectiveOp | string = "と"
): RenderOutcome {
  const surface = typeof connectiveOrSurface === "string"
    ? connectiveOrSurface
    : connectiveOrSurface.surface;
  const nominalRequest = typeof connectiveOrSurface === "string"
    ? false
    : connectiveOrSurface.quoteBoundary?.koreanClauseForm === "달라는 말을";
  if (surface === "かと" && base.policy?.kind === "benefactive" && base.policy.requestComplementBase !== undefined) {
    return composeBaseWithRequestComplementBody(base.policy.requestComplementBase, false, null, options, connectiveOrSurface);
  }
  if (base.policy?.kind === "desire" && base.policy.requestComplementBase !== undefined) {
    if (base.policy.requestComplementMode === "prohibition") {
      return composeRequestProhibitionComplementBody(base.policy.requestComplementBase, connectiveOrSurface);
    }
    if (preNeg !== null) {
      if (preNeg.chainDepth !== 1 || preNeg.chainPast) {
        return { ok: false, reason: "request complement supports only single non-past negative desire request" };
      }
      return composeRequestProhibitionComplementBody(base.policy.requestComplementBase, connectiveOrSurface);
    }
    return composeBaseWithRequestComplementBody(base.policy.requestComplementBase, false, null, options, connectiveOrSurface);
  }
  if (base.final.kind === "nounCopula") {
    if (past || preNeg !== null) {
      return { ok: false, reason: "noun copula request complement supports only plain non-past" };
    }
    const quoted = nounCopulaConnective(
      base.final.nounSurface,
      "다고",
      false,
      nounCopulaFinalAllomorphHost(base.final)
    );
    return {
      ok: true,
      text: concatPredicatePrefix(
        base.prefix,
        nominalRequest ? `${quoted.slice(0, -"고".length)}는 말을` : quoted
      ),
      polite: false
    };
  }
  if (base.final.kind !== "lemma") {
    return { ok: false, reason: "request complement on non-lemma base not supported" };
  }
  if (past) {
    return { ok: false, reason: "past + request complement not supported" };
  }
  const effectivePreNeg = surface === "かと" && preNeg?.chainDepth === 1 && !preNeg.chainPast
    ? null
    : preNeg;
  if (effectivePreNeg !== null) {
    if (effectivePreNeg.chainDepth !== 1 || effectivePreNeg.chainPast) {
      return { ok: false, reason: "request complement supports only single non-past negative request" };
    }
    const head = conjugate(base.final.lemma, base.final.irregular, "지");
    return {
      ok: true,
      text: `${base.prefix}${head} 말아 ${nominalRequest ? "달라는 말을" : "달라고"}`,
      polite: false
    };
  }
  const lowered = applyNegationChainToLemmaBase(base, effectivePreNeg, options);
  if (lowered === null || lowered.final.kind !== "lemma") {
    return { ok: false, reason: "request complement lowering not supported" };
  }
  const head = conjugate(lowered.final.lemma, lowered.final.irregular, "아/어");
  const requestBody = nominalRequest
    ? normalizeRequestQuoteNominal(head, lowered.final.lemma)
    : normalizeRequestQuotative(head, lowered.final.lemma);
  return {
    ok: true,
    text: concatPredicatePrefix(lowered.prefix, requestBody),
    polite: false
  };
}

export interface RequestAttributiveQuoteTraceContext {
  readonly chainSourceTrace?: ChainSourceTrace;
  readonly stemTokens?: readonly RuntimeHaruToken[];
  readonly commandTokens?: readonly RuntimeHaruToken[];
  readonly requestTokens: readonly RuntimeHaruToken[];
  readonly carrierTokens: readonly RuntimeHaruToken[];
}

export function composeBaseWithRequestAttributiveQuote(
  base: KoreanPredicateBase,
  past: boolean,
  preNeg: NegationOp | null,
  options: NegationLoweringOptions & {
    readonly trace?: RequestAttributiveQuoteTraceContext;
  }
): RenderOutcome {
  if (base.policy?.kind === "desire" && base.policy.requestComplementBase !== undefined) {
    if (base.policy.requestComplementMode === "prohibition") {
      return composeRequestProhibitionAttributiveQuote(base.policy.requestComplementBase);
    }
    if (preNeg !== null) {
      if (preNeg.chainDepth !== 1 || preNeg.chainPast) {
        return { ok: false, reason: "request attributive quote supports only single non-past negative desire request" };
      }
      return composeRequestProhibitionAttributiveQuote(base.policy.requestComplementBase);
    }
    return composeBaseWithRequestAttributiveQuote(base.policy.requestComplementBase, false, null, options);
  }
  if (base.final.kind !== "lemma") {
    return { ok: false, reason: "request attributive quote on non-lemma base not supported" };
  }
  if (past) {
    return { ok: false, reason: "past + request attributive quote not supported" };
  }
  if (preNeg !== null) {
    if (preNeg.chainDepth !== 1 || preNeg.chainPast) {
      return { ok: false, reason: "request attributive quote supports only single non-past negative request" };
    }
    const head = conjugate(base.final.lemma, base.final.irregular, "지");
    return {
      ok: true,
      text: `${base.prefix}${head} 말아 달라는`,
      polite: false
    };
  }
  const lowered = applyNegationChainToLemmaBase(base, null, options);
  if (lowered === null || lowered.final.kind !== "lemma") {
    return { ok: false, reason: "request attributive quote lowering not supported" };
  }
  const head = conjugate(lowered.final.lemma, lowered.final.irregular, "아/어");
  const mainText = concatPredicatePrefix(lowered.prefix, head);
  const trace = options.trace;
  if (trace === undefined) {
    const recipe = requestQuoteAttributiveRecipe(mainText, lowered.final.lemma);
    return { ok: true, text: recipe.text, polite: false };
  }
  type TraceMetadata = Omit<TailTraceSegment, "text" | "sourceTokens">;
  const commandPrefix = (trace.chainSourceTrace?.prefixSegments ?? []).map((segment) => {
    const { text, sourceTokens, ...metadata } = segment;
    return { text, sources: sourceTokens, metadata };
  });
  const commandFinalSources = trace.chainSourceTrace?.finalSourceTokens ?? trace.stemTokens ?? [];
  const commandFinalMetadata: TraceMetadata = trace.chainSourceTrace === undefined
    ? { kind: "lexeme", projectionConfidence: "semantic" }
    : { kind: trace.chainSourceTrace.finalKind, projectionConfidence: "semantic" };
  const commandTokens = trace.commandTokens ?? [
    ...commandPrefix.flatMap(({ sources }) => sources),
    ...commandFinalSources
  ];
  const recipe = requestQuoteAttributiveRecipe<RuntimeHaruToken, TraceMetadata>(
    mainText,
    lowered.final.lemma,
    {
      commandSources: commandTokens,
      commandPrefix,
      commandFinalSources,
      commandFinalMetadata,
      requestSources: trace.requestTokens,
      carrierSources: trace.carrierTokens
    }
  );
  const predicateTrace: readonly TailTraceSegment[] = recipe.predicate.segments.map((segment) => ({
    ...segment.metadata,
    text: segment.text,
    sourceTokens: segment.sources
  }));
  return {
    ok: true,
    text: recipe.text,
    polite: false,
    traced: tracedCat(
      predicateTrace,
      tracedSeg(recipe.request.text, recipe.request.sources, "aux", "semantic"),
      tracedSeg(recipe.carrier.text, recipe.carrier.sources, "connective", "semantic")
    )
  };
}

export function isRequestComplementLikeConnective(connective: ConnectiveOp): boolean {
  return connective.connective === "request_complement" ||
    connective.quoteBoundary?.koreanClauseForm === "달라고" ||
    connective.quoteBoundary?.koreanClauseForm === "달라는 말을";
}

export function composeRequestProhibitionComplement(
  base: KoreanPredicateBase,
  connectiveOrSurface: ConnectiveOp | string,
  options: { readonly requestForm?: boolean; readonly complementizer?: string } = {}
): RenderOutcome {
  return applyRequestComplementQuoteFocus(
    composeRequestProhibitionComplementBody(base, connectiveOrSurface, options),
    connectiveOrSurface
  );
}

function composeRequestProhibitionComplementBody(
  base: KoreanPredicateBase,
  connectiveOrSurface: ConnectiveOp | string,
  options: { readonly requestForm?: boolean; readonly complementizer?: string } = {}
): RenderOutcome {
  const nominalRequest = typeof connectiveOrSurface === "string"
    ? false
    : connectiveOrSurface.quoteBoundary?.koreanClauseForm === "달라는 말을";
  if (base.final.kind !== "lemma") {
    return { ok: false, reason: "prohibition request complement on non-lemma base not supported" };
  }
  const head = conjugate(base.final.lemma, base.final.irregular, "지");
  const requestForm = options.requestForm !== false;
  const body = requestForm
    ? `${head} 말아 ${nominalRequest ? "달라는 말을" : "달라고"}`
    : `${head} ${nominalRequest ? "말라는 말을" : `말라${options.complementizer ?? "고"}`}`;
  return {
    ok: true,
    text: concatPredicatePrefix(base.prefix, body),
    polite: false
  };
}

export interface ProhibitionQuoteTraceContext {
  readonly stemTokens: readonly RuntimeHaruToken[];
  readonly negativeTokens: readonly RuntimeHaruToken[];
  readonly bridgeTokens: readonly RuntimeHaruToken[];
  readonly requestTailTokens: readonly RuntimeHaruToken[];
  readonly carrierTokens: readonly RuntimeHaruToken[];
}

export function composeRequestProhibitionAttributiveQuote(
  base: KoreanPredicateBase,
  options: { readonly requestForm?: boolean; readonly trace?: ProhibitionQuoteTraceContext } = {}
): RenderOutcome {
  if (base.final.kind !== "lemma") {
    return { ok: false, reason: "prohibition request attributive quote on non-lemma base not supported" };
  }
  const head = conjugate(base.final.lemma, base.final.irregular, "지");
  const requestForm = options.requestForm !== false;
  const text = concatPredicatePrefix(base.prefix, requestForm ? `${head} 말아 달라는` : `${head} 말라는`);
  if (options.trace !== undefined && base.prefix.length === 0) {
    const trace = options.trace;
    return {
      ok: true,
      text,
      polite: false,
      traced: tracedCat(
        tracedSeg(head, [...trace.stemTokens, ...trace.negativeTokens], "lexeme", "semantic"),
        tracedSeg(requestForm ? " 말아" : " 말", trace.bridgeTokens, "aux", "semantic"),
        requestForm ? tracedSeg(" 달", trace.requestTailTokens, "aux", "semantic") : [],
        tracedSeg("라는", trace.carrierTokens, "connective", "semantic")
      )
    };
  }
  return { ok: true, text, polite: false };
}

export function composeBaseWithReformulation(
  base: KoreanPredicateBase,
  connective: ConnectiveOp,
  past: boolean,
  preNeg: NegationOp | null,
  lookups: LookupTables,
  options: NegationLoweringOptions
): RenderOutcome {
  const nominalQuote = nounCopulaPlainQuoteText(base, past, preNeg);
  if (nominalQuote !== null) {
    const nominalText = quotedDeclarativeToReformulation(nominalQuote);
    return { ok: true, text: `${nominalText}${connectiveFocusParticleSuffix(connective.surface, nominalText)}`, polite: false };
  }
  const rendered = composeBaseWithTerminalChain(
    base,
    preNeg,
    past,
    true,
    false,
    lookups,
    options
  );
  if (!rendered.ok) {
    return rendered;
  }
  const text = quotedDeclarativeToReformulation(
    quotePlainDeclarative(rendered.text, { ...copularQuoteOption(base) })
  );
  return { ok: true, text: `${text}${connectiveFocusParticleSuffix(connective.surface, text)}`, polite: false };
}

export function composeBaseWithRetrospectiveQuotative(
  base: KoreanPredicateBase,
  connective: ConnectiveOp,
  past: boolean,
  preNeg: NegationOp | null,
  formal: boolean,
  lookups: LookupTables,
  options: NegationLoweringOptions
): RenderOutcome {
  if (
    connective.retrospectiveQuotativeFlavor === "question_retrospective" &&
    preNeg === null &&
    isNounCopulaProjectableBase(base)
  ) {
    return {
      ok: true,
      text: `${composeNounCopulaConjectureQuestion(base, past, formal, false)} 싶더니`,
      polite: false
    };
  }
  const rendered = composeBaseWithTerminalChain(
    base,
    preNeg,
    past,
    true,
    false,
    lookups,
    options
  );
  if (!rendered.ok) {
    return rendered;
  }
  const quote = quotePlainDeclarative(rendered.text, { ...copularQuoteOption(base) });
  if (connective.retrospectiveQuotativeFlavor === "question_retrospective") {
    return { ok: true, text: quotedDeclarativeToChangeOfState(quote), polite: false };
  }
  if (connective.retrospectiveQuotativeFlavor === "direct_thought") {
    return { ok: true, text: `${quote} 생각했더니`, polite: false };
  }
  return { ok: false, reason: "retrospective quotative flavor is missing" };
}

export function composeBaseWithQuestionReformulation(
  base: KoreanPredicateBase,
  past: boolean,
  preNeg: NegationOp | null,
  lookups: LookupTables,
  options: NegationLoweringOptions
): RenderOutcome {
  if (!past && preNeg === null && base.final.kind === "nounCopula" && base.final.adverbialNominalFallback === true) {
    const adverbial = `${base.final.nounSurface}${selectParticle(nounCopulaFinalAllomorphHost(base.final), "이라/라")}`;
    return { ok: true, text: `${base.prefix}${adverbial} 하면`, polite: false };
  }
  const chainDepth = preNeg?.chainDepth ?? 0;
  const questionBase = chainDepth === 0
    ? base
    : applyExternalNegationDepthToPredicateBase(base, chainDepth, true, negationLoweringOptionsWithOpFocus(preNeg, options));
  if (questionBase === null) {
    return { ok: false, reason: "question reformulation chain lowering not supported" };
  }
  const question = composePlainSelfQuestionTerminal(questionBase, past || (preNeg?.chainPast ?? false), lookups);
  return { ok: true, text: `${question} 하면`, polite: false };
}

export function composeBaseWithWishComplement(
  base: KoreanPredicateBase,
  past: boolean,
  preNeg: NegationOp | null,
  formal: boolean,
  options: NegationLoweringOptions
): RenderOutcome {
  const chainDepth = preNeg?.chainDepth ?? 0;
  const effectivePast = past || (preNeg?.chainPast ?? false);
  const loweredBase = chainDepth >= 1
    ? applyExternalNegationDepthToPredicateBase(base, chainDepth, formal, options)
    : base;
  if (loweredBase === null) {
    return { ok: false, reason: "wish complement chain lowering not supported" };
  }
  const nominalized = projectBaseNominalized(loweredBase, effectivePast, formal);
  if (nominalized === null) {
    return { ok: false, reason: "wish complement nominalization not supported" };
  }
  return {
    ok: true,
    text: `${nominalized}${selectParticle(nominalized, "을/를")}`,
    polite: false
  };
}

function quotedDeclarativeToReformulation(text: string): string {
  return text.endsWith("고") ? `${text.slice(0, -1)}기보다` : `${text}기보다`;
}

function isNounCopulaProjectableBase(
  base: KoreanPredicateBase
): base is NounCopulaPredicateBase {
  return base.final.kind === "nounCopula" || base.final.kind === "negativeNounCopula";
}

function quotedDeclarativeToChangeOfState(text: string): string {
  return text.endsWith("고") ? `${text.slice(0, -1)} 싶더니` : `${text} 싶더니`;
}
