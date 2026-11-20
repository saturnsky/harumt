import { potentialParticleInfix, shortNegationPrefix } from "../../../../../generator/aux-map.js";
import { conjugate, type IrregularType } from "../../../../../generator/conjugator.js";
import { hasBatchim } from "../../../../../generator/hangul.js";
import { hasAllomorphBatchim, selectParticle } from "../../../../../generator/particles.js";
import { type RuntimeHaruToken } from "../../../../../types/token.js";
import { type LookupTables } from "../../../../lookup-tables.js";
import { type PassiveClass } from "../../../../voice-class.js";
import { assertNever, type AuxOpNode, type ConjectureOp, type CopulaOp, type NegationFocusParticle, type NegationOp, type ObligationIdiomOp, type StemNode } from "../grammar.js";
import { applyNegationChainToLemmaBase, applyNegationDepthToLemmaBase, lemmaPredicateBase, type BaseResult, type BaseSourceTrace, type KoreanFinalForm, type KoreanLemmaPredicateBase, type KoreanPredicateBase, type NegationLoweringOptions, type NounCopulaPredicateBase, nounCopulaFinalAllomorphHost, type OkBaseResult, predicateBasePolicyAllomorphHost, type PassiveStemOptions, type PredicateBasePolicy, type RenderContext, type ScopeCarrierKind, type ScopeCarrierPolicy, type ScopeCarrierStyle, baseResultWithNegationFocus, type RenderFailure } from "./base-model.js";
import { allomorphReadingForRealizedText, quantityUnitPhraseReading, trailingAllomorphHostText, type AllomorphReadingSourceToken } from "../../../../rendering/allomorph-host.js";
import { nounToCopulaForm, obligationEmphasis } from "./final-forms.js";
import { obligationBodyLemmas } from "../obligation-pattern-table.js";
import { stemPrefixAllowsShortNegationSplit } from "../short-negation-policy.js";

export function nounCopulaPlainStem(noun: string, past: boolean, isBoundNoun: boolean, allomorphHost?: string): string {
  const terminal = nounToCopulaForm(noun, true, false, past, isBoundNoun, allomorphHost);
  return terminal.endsWith("다") ? terminal.slice(0, -"다".length) : terminal;
}

export function nounCopulaFocusStem(noun: string): string {
  return `${noun}이`;
}

export function nounSubjectPart(noun: string, allomorphHost?: string): string {
  return `${noun}${selectParticle(allomorphHost ?? noun, "이/가")}`;
}

export function scopeCarrierCopulaBase(
  carrier: ScopeCarrierKind,
  nounSurface: string,
  prefix: string,
  options: {
    readonly style?: ScopeCarrierStyle;
    readonly connectiveSourcePoliteness?: ScopeCarrierPolicy["connectiveSourcePoliteness"];
  } = {}
): KoreanPredicateBase {
  return {
    prefix,
    final: { kind: "boundNounCopula", nounSurface },
    policy: {
      kind: "scope_carrier",
      carrier,
      nounSurface,
      hostPrefix: prefix,
      ...(options.style === undefined ? {} : { style: options.style }),
      ...(options.connectiveSourcePoliteness === undefined
        ? {}
        : { connectiveSourcePoliteness: options.connectiveSourcePoliteness })
    }
  };
}

function scopeCarrierExternalNegativeSubject(
  base: KoreanPredicateBase,
  formal: boolean
): string | null {
  if (base.final.kind !== "nounCopula" && base.final.kind !== "boundNounCopula") {
    return null;
  }
  if (
    base.policy?.kind === "scope_carrier" &&
    base.policy.carrier === "noda" &&
    (base.final.nounSurface === "거" || base.final.nounSurface === "것")
  ) {
    return formal ? "것이" : "게";
  }
  return nounSubjectPart(base.final.nounSurface, nounCopulaFinalAllomorphHost(base.final));
}

function scopeCarrierExternalNegativeBase(
  base: KoreanPredicateBase,
  formal: boolean
): KoreanLemmaPredicateBase | null {
  if (
    base.policy?.kind === "scope_carrier" &&
    base.policy.carrier === "wake" &&
    base.policy.hostPrefix !== undefined
  ) {
    const hostPrefix = base.policy.hostPrefix;
    return {
      prefix: `${hostPrefix}것은 `,
      final: { kind: "lemma", lemma: "아니다", irregular: "아니", isVerb: false },
      policy: base.policy
    };
  }
  const subject = scopeCarrierExternalNegativeSubject(base, formal);
  if (subject === null) {
    return null;
  }
  return {
    prefix: `${base.prefix}${subject} `,
    final: { kind: "lemma", lemma: "아니다", irregular: "아니", isVerb: false },
    ...(base.policy === undefined ? {} : { policy: base.policy })
  };
}

export function negativeNounCopulaChainBase(
  final: Extract<KoreanFinalForm, { kind: "negativeNounCopula" }>,
  formal: boolean
): KoreanPredicateBase {
  const subjPart = nounSubjectPart(final.nounSurface, final.allomorphHost);
  const particle = formal ? "것은" : "건";
  if (final.chainDepth <= 0) {
    return {
      prefix: `${subjPart} `,
      final: { kind: "lemma", lemma: "아니다", irregular: "아니", isVerb: false }
    };
  }
  const idiomBase: KoreanLemmaPredicateBase = {
    prefix: `${subjPart} 아닌 ${particle} `,
    final: { kind: "lemma", lemma: "아니다", irregular: "아니", isVerb: false }
  };
  const lowered = applyNegationDepthToLemmaBase(idiomBase, final.chainDepth - 1);
  if (lowered === null) {
    return {
      prefix: `${subjPart} 아닌 ${particle} `,
      final: { kind: "lemma", lemma: "아니다", irregular: "아니", isVerb: false }
    };
  }
  return lowered;
}

export function isCopulaSupportPotentialOp(op: AuxOpNode | undefined): boolean {
  return op !== undefined &&
    op.kind === "postverbAuxiliary" &&
    op.auxiliary.kind === "potential" &&
    op.hostAttach === "copula_support";
}

export function potentialFocusInfixForBase(base: KoreanLemmaPredicateBase): string {
  return base.policy?.kind === "scope_bridge_potential_host"
    ? potentialParticleInfix(base.policy.particle, null)
    : " ";
}

export function copulaCarrierBaseForInterOp(
  base: KoreanPredicateBase,
  formal: boolean
): KoreanLemmaPredicateBase | null {
  if (base.final.kind === "lemma") {
    return { ...base, final: base.final };
  }
  if (base.final.kind === "boundNounCopula" || base.final.kind === "nounCopula") {
    const nounSurface = `${base.prefix}${base.final.nounSurface}`;
    const allomorphHost = base.final.kind === "nounCopula" && base.final.allomorphHost !== undefined
      ? `${base.prefix}${base.final.allomorphHost}`
      : undefined;
    return {
      prefix: nounSurface,
      final: { kind: "lemma", lemma: "이다", irregular: null, isVerb: false },
      ...(base.policy === undefined
        ? {
          policy: {
            kind: "noun_copula_interop" as const,
            nounSurface,
            hostPrefix: "",
            isBoundNoun: base.final.kind === "boundNounCopula" || base.final.isBoundNoun,
            ...(allomorphHost === undefined ? {} : { allomorphHost })
          }
        }
        : {
          policy: base.policy.kind === "noun_copula_interop"
            ? { ...base.policy, hostPrefix: base.prefix }
            : base.policy
        })
    };
  }
  const lowered = negativeNounCopulaChainBase(base.final, formal);
  if (lowered.final.kind !== "lemma") {
    return null;
  }
  const policy = lowered.policy ?? base.policy;
  return {
    prefix: `${base.prefix}${lowered.prefix}`,
    final: lowered.final,
    policy: policy ?? {
      kind: "negative_noun_copula_interop",
      nounSurface: base.final.nounSurface,
      conjectureSubject: `${base.prefix}${lowered.prefix}`,
      ...(base.final.allomorphHost === undefined ? {} : { allomorphHost: base.final.allomorphHost })
    }
  };
}

export function predicateBaseInfinitiveForm(base: KoreanLemmaPredicateBase): string {
  if (base.final.lemma === "이다" && base.final.irregular === null) {
    return hasAllomorphBatchim(predicateBasePolicyAllomorphHost(base).trimEnd()) ? "이어" : "여";
  }
  return conjugate(base.final.lemma, base.final.irregular, "아/어");
}

export function causativeItadakuCommitmentLemma(
  stem: StemNode,
  stemLemma: string,
  stemIrregular: IrregularType | null,
  lookups: LookupTables
): readonly [lemma: string, irregular: IrregularType | null] {
  if (stem.kind === "verb" && stem.conj === "sahen" && stemLemma.endsWith("하다")) {
    const noun = stemLemma.slice(0, -"하다".length);
    if (lookups.HUMBLE_DRIDA_SAHEN_NOUNS.has(noun)) {
      return [`${noun}드리다`, null];
    }
  }
  return [stemLemma, stemIrregular];
}

export function simpleStemBase(
  stemLemma: string,
  stemIrregular: IrregularType | null,
  isVerb: boolean
): KoreanLemmaPredicateBase {
  return {
    prefix: "",
    final: { kind: "lemma", lemma: stemLemma, irregular: stemIrregular, isVerb }
  };
}

export function prohibitionPredicateBase(
  inputBase: KoreanLemmaPredicateBase
): KoreanLemmaPredicateBase {
  return {
    prefix: `${inputBase.prefix}${conjugate(inputBase.final.lemma, inputBase.final.irregular, "지")} `,
    final: { kind: "lemma", lemma: "말다", irregular: "ㄹ", isVerb: true }
  };
}

export function simpleStemBaseResult(
  stemLemma: string,
  stemIrregular: IrregularType | null,
  isVerb: boolean
): OkBaseResult {
  const lexicalPotential = lexicalPotentialStemBase(stemLemma, stemIrregular, isVerb);
  if (lexicalPotential !== null) {
    return {
      ok: true,
      base: lexicalPotential,
      chainOnFinalSupported: false,
      finalNegationLoweringPolicy: "potential_idiom"
    };
  }
  return {
    ok: true,
    base: simpleStemBase(stemLemma, stemIrregular, isVerb),
    chainOnFinalSupported: true
  };
}

export function lexicalPotentialStemBase(
  stemLemma: string,
  stemIrregular: IrregularType | null,
  isVerb: boolean
): KoreanLemmaPredicateBase | null {
  if (!isVerb || stemIrregular !== null || !stemLemma.endsWith("수 있다")) {
    return null;
  }
  return {
    prefix: stemLemma.slice(0, -"있다".length),
    final: { kind: "lemma", lemma: "있다", irregular: null, isVerb: false },
    policy: { kind: "lexical_potential" }
  };
}

export function passiveStemOptionsForStem(stem: StemNode): PassiveStemOptions {
  if (stem.kind !== "verb" || stem.conj !== "sahen" || !stem.lemma.endsWith("하다")) {
    return {};
  }
  const semanticAnchors = stem.semanticAnchors ?? [];
  const hasSeparateSemanticAnchor = semanticAnchors.some((idx) => idx !== stem.conjugationAnchor);
  const noun = stem.lemma.slice(0, -"하다".length);
  if (noun.length > 0 && hasSeparateSemanticAnchor) {
    return { sahenCompound: true, sahenNoun: noun };
  }
  return { sahenCompound: true };
}

export function passiveStemOptionsWithClass(
  options: PassiveStemOptions | undefined,
  passiveClass: PassiveClass | undefined
): PassiveStemOptions {
  return {
    ...(options ?? {}),
    ...(passiveClass === undefined ? {} : { passiveClass })
  };
}

export function applyExternalNegationDepthToPredicateBase(
  base: KoreanPredicateBase,
  chainDepth: number,
  formal: boolean,
  options: NegationLoweringOptions = {}
): KoreanLemmaPredicateBase | null {
  if (chainDepth < 1) {
    return lemmaPredicateBase(base);
  }
  if (base.policy?.kind === "scope_carrier" && base.policy.carrier === "wake") {
    const negativeBase = scopeCarrierExternalNegativeBase(base, formal);
    if (negativeBase !== null) {
      return chainDepth === 1
        ? negativeBase
        : applyNegationDepthToLemmaBase(negativeBase, chainDepth - 1, options);
    }
  }
  if (base.final.kind === "negativeNounCopula") {
    const lowered = negativeNounCopulaChainBase(base.final, formal);
    return applyNegationDepthToLemmaBase(
      { prefix: `${base.prefix}${lowered.prefix}`, final: lowered.final },
      chainDepth,
      options
    );
  }
  if (base.final.kind === "nounCopula" || base.final.kind === "boundNounCopula") {
    const negativeBase = scopeCarrierExternalNegativeBase(base, formal);
    if (negativeBase === null) {
      return null;
    }
    return chainDepth === 1
      ? negativeBase
      : applyNegationDepthToLemmaBase(negativeBase, chainDepth - 1, options);
  }
  return applyNegationDepthToLemmaBase(base, chainDepth, options);
}

export const NODA_CARRIER_BOUND_NOUN = "것";

export const NODA_CARRIER_BOUND_NOUN_CASUAL = "거";

export function nodaCarrierNoun(formal: boolean): string {
  return formal ? NODA_CARRIER_BOUND_NOUN : NODA_CARRIER_BOUND_NOUN_CASUAL;
}

export function nounCopulaAllomorphHost(
  nounSurface: string,
  ctx: RenderContext,
  sourceTokens?: readonly AllomorphReadingSourceToken[]
): string | undefined {
  const quantity = quantityUnitPhraseReading(ctx.precedingNumeralKorean, nounSurface);
  if (quantity !== undefined) {
    return quantity;
  }
  const head = sourceTokens?.at(-1);
  const reading = head === undefined
    ? nounSurface
    : allomorphReadingForRealizedText(nounSurface, head, { readUnitSymbol: false });
  return reading === nounSurface ? undefined : reading;
}

export function nounCopulaStemAllomorphHost(
  stem: StemNode,
  ctx: RenderContext,
  nounSurfaceOverride?: string
): string | undefined {
  const stemLemma = "lemma" in stem ? stem.lemma : undefined;
  const nounSurface = nounSurfaceOverride ?? stemLemma ?? "";
  const projected = stem.projectedHost?.segments;
  if (projected === undefined || projected.length === 0 || stemLemma === undefined || nounSurface !== stemLemma) {
    return nounCopulaAllomorphHost(nounSurface, ctx, stem.source.tokens);
  }
  const quantity = quantityUnitPhraseReading(ctx.precedingNumeralKorean, nounSurface);
  if (quantity !== undefined) {
    return quantity;
  }
  const host = trailingAllomorphHostText(projected, { tokens: stem.source.tokens });
  return host.length === 0 || host === nounSurface ? undefined : host;
}

export function nounCopulaBase(
  nounSurface: string,
  isBoundNoun: boolean,
  allomorphHost?: string
): NounCopulaPredicateBase {
  return {
    prefix: "",
    final: {
      kind: "nounCopula",
      nounSurface,
      isBoundNoun,
      ...(allomorphHost === undefined ? {} : { allomorphHost })
    }
  };
}

let _honorificNounCopulaLemma: string | undefined;
let _honorificNegativeNounCopulaLemma: string | undefined;

function honorificNounCopulaLemma(): string {
  _honorificNounCopulaLemma ??= `${conjugate("이다", null, "(으)시")}다`;
  return _honorificNounCopulaLemma;
}

function honorificNegativeNounCopulaLemma(): string {
  _honorificNegativeNounCopulaLemma ??= `${conjugate("아니다", "아니", "(으)시")}다`;
  return _honorificNegativeNounCopulaLemma;
}

export function copularLemmaOfBase(base: KoreanPredicateBase): string | undefined {
  return base.final.kind === "lemma" && base.final.copular === true ? base.final.lemma : undefined;
}

export function nounCopulaBaseForCopula(
  copula: CopulaOp | null,
  nounSurface: string,
  allomorphHost?: string
): NounCopulaPredicateBase | KoreanLemmaPredicateBase {
  if (copula?.honorific === true) {
    return copula.polarity === "negative"
      ? honorificNegativeNounCopulaBase(nounSurface, allomorphHost)
      : {
        prefix: nounSurface,
        final: {
          kind: "lemma",
          lemma: honorificNounCopulaLemma(),
          irregular: null,
          isVerb: false,
          copular: true
        }
      };
  }
  const base = nounCopulaBase(nounSurface, false, allomorphHost);
  if (copula !== null && (copula.polarity !== "affirmative" || copula.source.tokens.length > 0)) {
    return base;
  }
  return {
    ...base,
    policy: {
      kind: "noun_copula_interop",
      nounSurface,
      hostPrefix: "",
      isBoundNoun: false,
      zeroCopula: true,
      ...(allomorphHost === undefined ? {} : { allomorphHost })
    }
  };
}

export function nounCopulaPolarityBaseForCopula(
  copula: CopulaOp,
  nounSurface: string,
  chainDepth: number,
  allomorphHost?: string
): NounCopulaPredicateBase | KoreanLemmaPredicateBase {
  if (copula.honorific === true) {
    const base = nounCopulaBaseForCopula(copula, nounSurface, allomorphHost);
    if (copula.polarity !== "negative" || chainDepth <= 0 || base.final.kind !== "lemma") {
      return base;
    }
    return applyNegationDepthToLemmaBase(base, chainDepth) ?? base;
  }
  return copula.polarity === "negative"
    ? negativeNounCopulaBase(nounSurface, chainDepth, allomorphHost)
    : nounCopulaBaseForCopula(copula, nounSurface, allomorphHost);
}

export function nounLimitDakeCarrierBase(nounSurface: string): NounCopulaPredicateBase {
  return nounCopulaBase(`${nounSurface}만`, false);
}

export function honorificNegativeNounCopulaBase(
  nounSurface: string,
  allomorphHost?: string
): KoreanLemmaPredicateBase {
  return {
    prefix: `${nounSubjectPart(nounSurface, allomorphHost)} `,
    final: {
      kind: "lemma",
      lemma: honorificNegativeNounCopulaLemma(),
      irregular: null,
      isVerb: false,
      copular: true
    }
  };
}

export function negativeNounCopulaBase(
  nounSurface: string,
  chainDepth: number,
  allomorphHost?: string
): NounCopulaPredicateBase {
  return {
    prefix: "",
    final: {
      kind: "negativeNounCopula",
      nounSurface,
      chainDepth,
      ...(allomorphHost === undefined ? {} : { allomorphHost })
    }
  };
}

export function isBenefactiveNegativeCarrierPolicy(
  policy: PredicateBasePolicy | undefined,
  lemma: string
): policy is Extract<PredicateBasePolicy, { readonly kind: "benefactive" }> {
  return policy?.kind === "benefactive" &&
    policy.scopeBridgeNegativeAttributive === "completed" &&
    (lemma === "않다" || lemma === "없다");
}

function applyScopeTopicTerminalContraction(prefix: string, formal: boolean): string {
  if (!formal) {
    return prefix.replace(/ 것은 /gu, " 건 ");
  }
  return prefix
    .replace(/모르는 것은 /gu, "모르는 건 ")
    .replace(/없는 것은 /gu, "없는 건 ")
    .replace(/수 없는 것은 /gu, "수 없는 건 ");
}

export function applyTerminalPrefixContraction(
  base: KoreanPredicateBase,
  contraction: OkBaseResult["terminalPrefixContraction"],
  formal: boolean
): KoreanPredicateBase {
  if (contraction !== "scope_topic") {
    return base;
  }
  return {
    ...base,
    prefix: applyScopeTopicTerminalContraction(base.prefix, formal),
    final: base.final
  };
}

function applyChainCarryPrefixContraction(
  base: KoreanLemmaPredicateBase,
  contraction: OkBaseResult["chainCarryPrefixContraction"],
  formal: boolean
): KoreanLemmaPredicateBase {
  if (contraction !== "no_emphasis_limited" || formal) {
    return base;
  }
  return {
    ...base,
    prefix: base.prefix.replace(/것이기는 /gu, "것이긴 "),
    final: base.final
  };
}

function applyScopeTopicCarryContraction(
  base: KoreanLemmaPredicateBase,
  contraction: OkBaseResult["terminalPrefixContraction"],
  formal: boolean
): KoreanLemmaPredicateBase {
  if (contraction !== "scope_topic") {
    return base;
  }
  return {
    ...base,
    prefix: applyScopeTopicTerminalContraction(base.prefix, formal),
    final: base.final
  };
}

function applyNoScopeNegativeConnectiveContraction(prefix: string, formal: boolean): string {
  if (formal) {
    return prefix;
  }
  return prefix
    .replace(/ 거 $/u, " 게 ")
    .replace(/ 건 $/u, " 게 ")
    .replace(/ 것이 $/u, " 게 ")
    .replace(/ 것은 $/u, " 게 ");
}

export function applyConnectivePrefixContraction(
  base: KoreanPredicateBase,
  contraction: OkBaseResult["connectivePrefixContraction"],
  formal: boolean
): KoreanPredicateBase {
  if (contraction === "scope_topic") {
    return {
      ...base,
      prefix: applyScopeTopicTerminalContraction(base.prefix, formal),
      final: base.final
    };
  }
  if (contraction !== "no_scope_negative") return base;
  return {
    ...base,
    prefix: applyNoScopeNegativeConnectiveContraction(base.prefix, formal),
    final: base.final
  };
}

export function applyNonLastPrefixContractions(
  base: KoreanLemmaPredicateBase,
  baseResult: OkBaseResult,
  formal: boolean
): KoreanLemmaPredicateBase {
  return applyChainCarryPrefixContraction(
    applyScopeTopicCarryContraction(base, baseResult.terminalPrefixContraction, formal),
    baseResult.chainCarryPrefixContraction,
    formal
  );
}

export function quotePlainDeclarative(
  text: string,
  options: { readonly copularLemma?: string } = {}
): string {
  if (options.copularLemma !== undefined && text.endsWith(options.copularLemma)) {
    return `${text.slice(0, -"다".length)}라고`;
  }
  if (text.endsWith("아니다")) {
    return `${text.slice(0, -"아니다".length)}아니라고`;
  }
  if (text.endsWith("이다")) {
    const stem = text.slice(0, -"이다".length);
    return `${stem}${hasBatchim(stem) ? "이라고" : "라고"}`;
  }
  if (text.endsWith("거다")) {
    return `${text.slice(0, -"거다".length)}거라고`;
  }
  if (text.endsWith("지요") || text.endsWith("죠") || text.endsWith("지")) {
    return `${text}라고`;
  }
  return `${text}고`;
}

export function quotePlainDeclarativeNominal(
  text: string,
  noun: string,
  allomorphHost?: string,
  options: { readonly copularLemma?: string } = {}
): string {
  if (text === `${noun}다`) {
    return `${noun}${hasBatchim(allomorphHost ?? noun) ? "이라고" : "라고"}`;
  }
  return quotePlainDeclarative(text, options);
}

export function quotePlainDeclarativeTraceParts(
  text: string,
  options: { readonly copularLemma?: string } = {}
): {
  readonly inputProjectionText: string;
  readonly carrierPrefix: string;
} {
  if (options.copularLemma !== undefined && text.endsWith(options.copularLemma)) {
    return {
      inputProjectionText: text.slice(0, -"다".length),
      carrierPrefix: "라고"
    };
  }
  if (text.endsWith("아니다")) {
    return {
      inputProjectionText: `${text.slice(0, -"아니다".length)}아니`,
      carrierPrefix: "라고"
    };
  }
  if (text.endsWith("이다")) {
    const stem = text.slice(0, -"이다".length);
    return {
      inputProjectionText: stem,
      carrierPrefix: hasBatchim(stem) ? "이라고" : "라고"
    };
  }
  if (text.endsWith("거다")) {
    return {
      inputProjectionText: text.slice(0, -"다".length),
      carrierPrefix: "라고"
    };
  }
  if (text.endsWith("지요") || text.endsWith("죠") || text.endsWith("지")) {
    return {
      inputProjectionText: text,
      carrierPrefix: "라고"
    };
  }
  return {
    inputProjectionText: text,
    carrierPrefix: "고"
  };
}

export function conjectureBaseSourceTrace(
  base: KoreanPredicateBase,
  conjecture: ConjectureOp
): BaseSourceTrace | undefined {
  let inputProjectionText: string | null = null;
  if (base.final.kind === "lemma" && base.final.idiom?.kind === "conjecture") {
    const stem = base.final.lemma.endsWith("겠다")
      ? base.final.lemma.slice(0, -"겠다".length)
      : null;
    if (stem !== null && stem.length > 0) {
      inputProjectionText = `${base.prefix}${stem}`;
    }
  } else if (base.final.kind === "boundNounCopula") {
    const prefix = base.prefix.trimEnd();
    inputProjectionText = prefix.length === 0 ? null : prefix;
  }
  if (inputProjectionText === null) {
    return undefined;
  }
  return {
    inputProjectionText,
    carrierPrefixSegments: [],
    finalSourceTokens: conjecture.source.tokens,
    finalKind: "modal"
  };
}

function potentialCarrierFocusPrefix(
  prefix: string,
  focusParticle: NegationFocusParticle
): string {
  return `${prefix.trimEnd()}${focusParticle} `;
}

export function lowerPotentialFinalNegationBase(
  base: KoreanPredicateBase,
  chainDepth: number,
  focusParticle?: NegationFocusParticle
): KoreanLemmaPredicateBase | null {
  if (
    chainDepth < 1 ||
    base.final.kind !== "lemma" ||
    base.final.lemma !== "있다" ||
    base.final.irregular !== null ||
    base.final.isVerb
  ) {
    return null;
  }
  const negativeBase: KoreanLemmaPredicateBase = {
    prefix: focusParticle === undefined
      ? base.prefix
      : potentialCarrierFocusPrefix(base.prefix, focusParticle),
    final: { kind: "lemma", lemma: "없다", irregular: null, isVerb: false },
    ...(base.policy === undefined ? {} : { policy: base.policy })
  };
  if (chainDepth === 1) {
    return negativeBase;
  }
  return applyNegationDepthToLemmaBase(negativeBase, chainDepth - 1);
}

function lowerPotentialMothadaBase(
  inputPrefix: string,
  stemLemma: string,
  stemIrregular: IrregularType | null,
  chainDepth: number,
  focusParticle?: NegationFocusParticle
): KoreanLemmaPredicateBase | null {
  if (chainDepth < 1) return null;
  const stemAttr = conjugate(stemLemma, stemIrregular, "ㄹ/을");
  const carrierIdx = inputPrefix.lastIndexOf(`${stemAttr} 수`);
  const hostPrefix = carrierIdx >= 0 ? inputPrefix.slice(0, carrierIdx) : "";
  const mothadaBase: KoreanLemmaPredicateBase = {
    prefix: `${hostPrefix}${conjugate(stemLemma, stemIrregular, "지")}${focusParticle ?? ""} `,
    final: { kind: "lemma", lemma: "못하다", irregular: "여", isVerb: true },
    policy: { kind: "potential", stemLemma, stemIrregular }
  };
  if (chainDepth === 1) {
    return mothadaBase;
  }
  return applyNegationDepthToLemmaBase(mothadaBase, chainDepth - 1);
}

export function lowerFinalNegationForCommittedBase(
  baseRes: OkBaseResult,
  negation: NegationOp,
  formal: boolean,
  lookups: LookupTables
): KoreanLemmaPredicateBase | null {
  const focused = baseResultWithNegationFocus(baseRes, negation);
  return lowerFinalNegationDepthForCommittedBase(
    focused.ok ? focused : baseRes,
    negation.chainDepth,
    formal,
    lookups
  );
}

export function lowerFinalNegationDepthForCommittedBase(
  baseRes: OkBaseResult,
  chainDepth: number,
  formal: boolean,
  lookups: LookupTables
): KoreanLemmaPredicateBase | null {
  if (baseRes.finalNegationLoweringPolicy === "potential_idiom") {
    const potPolicy = baseRes.base.policy;
    if (
      potPolicy?.kind === "potential" &&
      potPolicy.stemLemma !== undefined &&
      potPolicy.negativeLowering !== "su_eopda" &&
      !lookups.POTENTIAL_NEGATIVE_PREFERS_SU_EOPDA.has(potPolicy.stemLemma)
    ) {
      return lowerPotentialMothadaBase(
        baseRes.base.prefix,
        potPolicy.stemLemma,
        potPolicy.stemIrregular ?? null,
        chainDepth,
        baseRes.finalNegationOptions?.firstNegationFocusParticle
      );
    }
    return lowerPotentialFinalNegationBase(
      baseRes.base,
      chainDepth,
      baseRes.finalNegationOptions?.firstNegationFocusParticle
    );
  }
  if (baseRes.finalNegationLoweringPolicy === "completion_potential") {
    return lowerCompletionPotentialFinalNegationBase(baseRes.base, chainDepth);
  }
  if (
    baseRes.finalNegationLoweringPolicy === "te_iru_negative_completion" ||
    baseRes.finalNegationLoweringPolicy === "te_iru_negative_inability" ||
    baseRes.finalNegationLoweringPolicy === "te_iru_negative_long_negation"
  ) {
    return lowerTeIruNegativeFinalNegationBase(baseRes.base, chainDepth, lookups);
  }
  if (baseRes.chainOnFinalSupported === false) {
    return null;
  }
  return applyExternalNegationDepthToPredicateBase(
    baseRes.base,
    chainDepth,
    formal,
    baseRes.finalNegationOptions
  );
}

function lowerTeIruNegativeFinalNegationBase(
  base: KoreanPredicateBase,
  chainDepth: number,
  lookups: LookupTables
): KoreanLemmaPredicateBase | null {
  if (chainDepth < 1 || base.policy?.kind !== "te_iru_negative") {
    return null;
  }
  const first = teIruNegativeFirstLoweredBase(base.policy, lookups);
  if (chainDepth === 1) {
    return first;
  }
  return applyNegationDepthToLemmaBase(first, chainDepth - 1);
}

function lowerCompletionPotentialFinalNegationBase(
  base: KoreanPredicateBase,
  chainDepth: number
): KoreanLemmaPredicateBase | null {
  if (chainDepth < 1 || base.policy?.kind !== "completion_potential") {
    return null;
  }
  const first = completionPotentialFailureBase(base.policy);
  if (chainDepth === 1) {
    return first;
  }
  return applyNegationDepthToLemmaBase(first, chainDepth - 1);
}

function teIruNegativeFirstLoweredBase(
  policy: Extract<PredicateBasePolicy, { readonly kind: "te_iru_negative" }>,
  lookups: LookupTables
): KoreanLemmaPredicateBase {
  switch (policy.mode) {
    case "completion": {
      if (!stemPrefixAllowsShortNegationSplit(policy.stemPrefix)) {
        return {
          prefix: `${policy.stemPrefix ?? ""}${conjugate(policy.stemLemma, policy.stemIrregular, "지")}${policy.negativeFocusParticle ?? ""} `,
          final: { kind: "lemma", lemma: "않다", irregular: null, isVerb: false },
          policy
        };
      }
      if (policy.negativeFocusParticle !== undefined) {
        return {
          prefix: `${policy.stemPrefix ?? ""}${conjugate(policy.stemLemma, policy.stemIrregular, "지")}${policy.negativeFocusParticle} `,
          final: { kind: "lemma", lemma: "않다", irregular: null, isVerb: false },
          policy
        };
      }
      const [prefix, lemma, irregular] = shortNegationPrefix(policy.stemLemma, policy.stemIrregular, lookups);
      return {
        prefix: `${policy.stemPrefix ?? ""}${prefix}`,
        final: { kind: "lemma", lemma, irregular, isVerb: true },
        policy
      };
    }
    case "inability":
      return {
        prefix: `${policy.stemPrefix ?? ""}${conjugate(policy.stemLemma, policy.stemIrregular, "지")}${policy.negativeFocusParticle ?? ""} `,
        final: { kind: "lemma", lemma: "못하다", irregular: "여", isVerb: true },
        policy
      };
    case "long_negation":
      return {
        prefix: `${policy.stemPrefix ?? ""}${conjugate(policy.stemLemma, policy.stemIrregular, "지")}${policy.negativeFocusParticle ?? ""} `,
        final: { kind: "lemma", lemma: "않다", irregular: null, isVerb: false },
        policy
      };
    default:
      return assertNever(policy.mode);
  }
}

export function completionPotentialCompletedBase(
  policy: Extract<PredicateBasePolicy, { readonly kind: "completion_potential" }>
): KoreanLemmaPredicateBase {
  const adverb = policy.completionAdverb ?? "다";
  const sahen = completionPotentialSahenNoun(policy);
  if (sahen !== null) {
    return {
      prefix: `${policy.stemPrefix ?? ""}${sahen}${selectParticle(sahen, "을/를")} ${adverb} `,
      final: { kind: "lemma", lemma: "하다", irregular: "여", isVerb: true }
    };
  }
  return {
    prefix: `${policy.stemPrefix ?? ""}${adverb} `,
    final: {
      kind: "lemma",
      lemma: policy.stemLemma,
      irregular: policy.stemIrregular,
      isVerb: true
    }
  };
}

function completionPotentialFailureBase(
  policy: Extract<PredicateBasePolicy, { readonly kind: "completion_potential" }>
): KoreanLemmaPredicateBase {
  const adverb = policy.completionAdverb ?? "다";
  const sahen = completionPotentialSahenNoun(policy);
  if (sahen !== null) {
    return {
      prefix: `${policy.stemPrefix ?? ""}${sahen}${selectParticle(sahen, "을/를")} ${adverb} ${conjugate("하다", "여", "지")} `,
      final: { kind: "lemma", lemma: "못하다", irregular: "여", isVerb: true }
    };
  }
  return {
    prefix: `${policy.stemPrefix ?? ""}${adverb} ${conjugate(policy.stemLemma, policy.stemIrregular, "지")} `,
    final: { kind: "lemma", lemma: "못하다", irregular: "여", isVerb: true }
  };
}

function completionPotentialSahenNoun(
  policy: Extract<PredicateBasePolicy, { readonly kind: "completion_potential" }>
): string | null {
  if (policy.shortNegationPolicy !== "sahen_split" || !policy.stemLemma.endsWith("하다")) {
    return null;
  }
  const noun = policy.stemLemma.slice(0, -"하다".length);
  return noun.length === 0 ? null : noun;
}

export function finalNegationLoweringForcesPast(baseRes: OkBaseResult, chainDepth: number): boolean {
  if (chainDepth !== 1 || baseRes.base.policy?.kind !== "te_iru_negative") {
    return false;
  }
  return baseRes.base.policy.mode === "completion" || baseRes.base.policy.mode === "long_negation";
}

export function obligationBase(opts: {
  readonly obligation: ObligationIdiomOp;
  readonly stemLemma: string;
  readonly stemIrregular: IrregularType | null;
  readonly isVerb: boolean;
}): BaseResult {
  const { obligation, stemLemma, stemIrregular } = opts;
  if (obligation.polarity === "negative") {
    const stemAe = conjugate(stemLemma, stemIrregular, "아/어");
    const stemAeSeoneun = `${stemAe}서는`;
    const trace = bekiNegativeObligationSourceTrace(obligation, stemAe);
    return {
      ok: true,
      base: {
        prefix: `${stemAeSeoneun} 안 `,
        final: { kind: "lemma", lemma: "되다", irregular: null, isVerb: true },
        policy: {
          kind: "obligation",
          variant: obligation.variant,
          polarity: "negative",
          stemLemma,
          stemIrregular,
          isVerb: opts.isVerb
        }
      },
      ...(trace === undefined ? {} : { sourceTrace: trace })
    };
  }
  const stemAe = conjugate(stemLemma, stemIrregular, "아/어");
  const obligationCore = `${stemAe}야${obligationEmphasis(obligation.variant)}`;
  const trace = positiveObligationSourceTrace(obligation, stemAe);
  return {
    ok: true,
    base: {
      prefix: `${obligationCore} `,
      final: { kind: "lemma", lemma: "하다", irregular: "여", isVerb: true },
      policy: {
        kind: "obligation",
        variant: obligation.variant,
        polarity: "affirmative",
        stemLemma,
        stemIrregular,
        isVerb: opts.isVerb
      }
    },
    ...(trace === undefined ? {} : { sourceTrace: trace })
  };
}

function positiveObligationSourceTrace(
  obligation: ObligationIdiomOp,
  stemProjectionText: string
): BaseSourceTrace | undefined {
  const split = splitPositiveObligationSourceTokens(obligation);
  if (split === null) {
    return undefined;
  }
  return {
    inputProjectionText: stemProjectionText,
    carrierPrefixSegments: [{
      text: `야${obligationEmphasis(obligation.variant)} `,
      sourceTokens: split.carrierTokens,
      kind: "modal",
      projectionConfidence: "semantic"
    }],
    finalSourceTokens: split.finalTokens.length > 0 ? split.finalTokens : split.carrierTokens,
    finalKind: "aux"
  };
}

export function splitPositiveObligationSourceTokens(
  obligation: ObligationIdiomOp
): { readonly carrierTokens: readonly RuntimeHaruToken[]; readonly finalTokens: readonly RuntimeHaruToken[] } | null {
  const tokens = obligation.source.tokens;
  if (tokens.length === 0) {
    return null;
  }
  if (obligation.variant === "beki") {
    return {
      carrierTokens: tokens.slice(0, 1),
      finalTokens: tokens.slice(1)
    };
  }
  const bodyStart = tokens.findIndex((token, index) =>
    index > 0 &&
    (obligationBodyLemmas().has(token.dictionaryForm) ||
      token.dictionaryForm === "だめ" ||
      token.surface === "だめ" ||
      token.surface === "ダメ" ||
      token.surface === "駄目" ||
      token.surface === "なら" ||
      token.surface === "いけ")
  );
  if (bodyStart < 0) {
    return {
      carrierTokens: tokens,
      finalTokens: []
    };
  }
  return {
    carrierTokens: tokens.slice(0, bodyStart),
    finalTokens: tokens.slice(bodyStart)
  };
}

function bekiNegativeObligationSourceTrace(
  obligation: ObligationIdiomOp,
  stemProjectionText: string
): BaseSourceTrace | undefined {
  if (obligation.variant !== "beki") {
    return undefined;
  }
  const split = splitBekiNegativeSourceTokens(obligation.source.tokens);
  if (split === null) {
    return undefined;
  }
  return {
    inputProjectionText: stemProjectionText,
    carrierPrefixSegments: [
      {
        text: "서는 ",
        sourceTokens: split.carrierTokens,
        kind: "modal",
        projectionConfidence: "semantic"
      },
      {
        text: "안 ",
        sourceTokens: split.negativeTokens,
        kind: "aux",
        projectionConfidence: "semantic"
      }
    ],
    finalSourceTokens: split.negativeTokens,
    finalKind: "aux"
  };
}

function splitBekiNegativeSourceTokens(
  tokens: readonly RuntimeHaruToken[]
): { readonly carrierTokens: readonly RuntimeHaruToken[]; readonly negativeTokens: readonly RuntimeHaruToken[] } | null {
  if (tokens.length < 2) {
    return null;
  }
  const negativeStart = tokens.findIndex((token, index) =>
    index > 0 &&
    (token.dictionaryForm === "ない" ||
      token.dictionaryForm === "有る" ||
      token.surface === "ない" ||
      token.surface === "あり")
  );
  if (negativeStart <= 0) {
    return null;
  }
  return {
    carrierTokens: tokens.slice(0, negativeStart),
    negativeTokens: tokens.slice(negativeStart)
  };
}

export function lowerBaseForPredicateProjection(
  base: KoreanPredicateBase,
  preNeg: NegationOp | null,
  formal: boolean,
  options: NegationLoweringOptions
): KoreanLemmaPredicateBase | null {
  const chainDepth = preNeg?.chainDepth ?? 0;
  if (base.final.kind === "lemma") {
    return applyNegationChainToLemmaBase(base, preNeg, options);
  }
  if (chainDepth === 0) {
    return copulaCarrierBaseForInterOp(base, formal);
  }
  return chainDepth >= 1
    ? applyExternalNegationDepthToPredicateBase(base, chainDepth, formal, options)
    : lemmaPredicateBase(base);
}

export function lowerBaseKeepingFinal(
  base: KoreanPredicateBase,
  preNeg: NegationOp | null,
  formal: boolean,
  options: NegationLoweringOptions
): KoreanPredicateBase | null {
  if (base.final.kind === "lemma") {
    return applyNegationChainToLemmaBase(base, preNeg, options);
  }
  const chainDepth = preNeg?.chainDepth ?? 0;
  return chainDepth >= 1
    ? applyExternalNegationDepthToPredicateBase(base, chainDepth, formal, options)
    : base;
}

export function committedTerminalRoleBase(
  inputBaseResult: BaseResult,
  finalNeg: NegationOp | null,
  past: boolean,
  formal: boolean,
  lookups: LookupTables
): { readonly ok: true; readonly base: KoreanPredicateBase; readonly past: boolean } | RenderFailure {
  const baseResult = baseResultWithNegationFocus(inputBaseResult, finalNeg);
  if (!baseResult.ok) {
    return { ok: false, reason: baseResult.reason };
  }
  const chainDepth = finalNeg?.chainDepth ?? 0;
  const effectivePast = past || (finalNeg?.chainPast ?? false);
  if (chainDepth > 0 && baseResult.chainOnFinalSupported === false) {
    const lowered = lowerFinalNegationDepthForCommittedBase(baseResult, chainDepth, formal, lookups);
    if (lowered === null) {
      return { ok: false, reason: "terminal role frame cannot lower committed final negation" };
    }
    return {
      ok: true,
      base: applyTerminalPrefixContraction(lowered, baseResult.terminalPrefixContraction, formal),
      past: effectivePast || finalNegationLoweringForcesPast(baseResult, chainDepth)
    };
  }
  const terminalBase = applyTerminalPrefixContraction(baseResult.base, baseResult.terminalPrefixContraction, formal);
  if (chainDepth === 0) {
    return { ok: true, base: terminalBase, past: effectivePast };
  }
  if (
    chainDepth === 1 &&
    finalNeg?.preferShortNegation === true &&
    terminalBase.final.kind === "lemma"
  ) {
    const [prefix, lemma, irregular] = shortNegationPrefix(terminalBase.final.lemma, terminalBase.final.irregular, lookups);
    return {
      ok: true,
      base: {
        prefix: `${terminalBase.prefix}${prefix}`,
        final: {
          kind: "lemma",
          lemma,
          irregular,
          isVerb: terminalBase.final.isVerb
        }
      },
      past: effectivePast
    };
  }
  const lowered = applyExternalNegationDepthToPredicateBase(
    terminalBase,
    chainDepth,
    formal,
    baseResult.finalNegationOptions
  );
  if (lowered === null) {
    return { ok: false, reason: "terminal role frame cannot lower external negation depth" };
  }
  return { ok: true, base: lowered, past: effectivePast };
}

export function projectBaseAffirmativeGiFocus(
  base: KoreanPredicateBase,
  past: boolean,
  formal: boolean,
  particle: "는" | "도" | "까지" | "만"
): string | null {
  if (base.final.kind === "negativeNounCopula") {
    const lowered = negativeNounCopulaChainBase(base.final, formal);
    return projectBaseAffirmativeGiFocus({ prefix: `${base.prefix}${lowered.prefix}`, final: lowered.final }, past, formal, particle);
  }
  if (base.final.kind === "nounCopula" || base.final.kind === "boundNounCopula") {
    const stem = nounCopulaPlainStem(
      base.final.nounSurface,
      past,
      base.final.kind === "boundNounCopula" || base.final.isBoundNoun,
      nounCopulaFinalAllomorphHost(base.final)
    );
    return `${base.prefix}${stem}기${particle}`;
  }
  const final = base.final;
  if (past) {
    const stem = final.lemma === "아니다"
      ? "아니었"
      : conjugate(final.lemma, final.irregular, "았/었");
    return `${base.prefix}${stem}기${particle}`;
  }
  return `${base.prefix}${conjugate(final.lemma, final.irregular, "기")}${particle}`;
}

export function stateChangeBase(
  inputBase: KoreanLemmaPredicateBase,
  projection: "adjectival" | "adverbial"
): KoreanLemmaPredicateBase {
  const final = inputBase.final;
  if (projection === "adjectival" && final.lemma === "이다" && !final.isVerb && inputBase.prefix.length > 0) {
    const lastChar = inputBase.prefix.slice(-1);
    return {
      prefix: `${inputBase.prefix}${hasBatchim(lastChar) ? "이" : "가"} `,
      final: { kind: "lemma", lemma: "되다", irregular: null, isVerb: true },
      capabilities: { ...inputBase.capabilities, prohibitionHost: "action" },
      ...(inputBase.policy === undefined ? {} : { policy: inputBase.policy })
    };
  }
  if (projection === "adverbial" || final.isVerb) {
    return {
      prefix: `${inputBase.prefix}${conjugate(final.lemma, final.irregular, "게")} `,
      final: { kind: "lemma", lemma: "되다", irregular: null, isVerb: true },
      capabilities: { ...inputBase.capabilities, prohibitionHost: "action" },
      ...(inputBase.policy === undefined ? {} : { policy: inputBase.policy })
    };
  }
  return {
    prefix: `${inputBase.prefix}${conjugate(final.lemma, final.irregular, "아/어")}`,
    final: { kind: "lemma", lemma: "지다", irregular: null, isVerb: true },
    capabilities: { ...inputBase.capabilities, prohibitionHost: "action" },
    ...(inputBase.policy === undefined ? {} : { policy: inputBase.policy })
  };
}
